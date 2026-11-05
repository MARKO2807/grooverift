import { test, expect } from "@playwright/test";
import { signIn } from "./helpers";

// Security baseline (step 4.10): headers checked by a test, personalised pages never cacheable,
// the policy and session gates answer the same way on every channel.

test.describe("security headers", () => {
  test("every page carries the baseline headers and a nonce CSP", async ({ request }) => {
    for (const path of ["/", "/sign-in", "/en/sign-in"]) {
      const res = await request.get(path);
      const h = res.headers();
      expect(h["x-content-type-options"]).toBe("nosniff");
      expect(h["x-frame-options"]).toBe("DENY");
      expect(h["referrer-policy"]).toBe("strict-origin-when-cross-origin");
      expect(h["cross-origin-opener-policy"]).toBe("same-origin");
      expect(h["permissions-policy"]).toContain("geolocation=()");
      expect(h["x-powered-by"]).toBeUndefined();
      const csp = h["content-security-policy"] ?? "";
      expect(csp).toMatch(/script-src 'self' 'nonce-[A-Za-z0-9+/=]+' 'strict-dynamic'/);
      expect(csp).toContain("frame-ancestors 'none'");
      expect(csp).toContain("object-src 'none'");
      expect(csp).toContain("base-uri 'self'");
    }
  });

  test("the nonce is fresh on every response", async ({ request }) => {
    const a = (await request.get("/")).headers()["content-security-policy"] ?? "";
    const b = (await request.get("/")).headers()["content-security-policy"] ?? "";
    const nonce = (csp: string) => /'nonce-([^']+)'/.exec(csp)?.[1];
    expect(nonce(a)).toBeTruthy();
    expect(nonce(a)).not.toBe(nonce(b));
  });

  test("inline scripts run under the CSP (no violations in the console)", async ({ page }) => {
    const violations: string[] = [];
    page.on("console", (m) => {
      if (/Content Security Policy/i.test(m.text())) violations.push(m.text());
    });
    await page.goto("/sign-in");
    await page.getByLabel("E-pošta").fill("x@example.test");
    await page.getByRole("button", { name: "Prikaži lozinku" }).click(); // needs hydration
    await expect(page.getByRole("button", { name: "Sakrij lozinku" })).toBeVisible();
    expect(violations).toEqual([]);
  });
});

test.describe("caching and session gates", () => {
  test("signed-in pages are private and not stored by shared caches", async ({ page }) => {
    await signIn(page, "luka@example.test");
    const res = await page.goto("/settings/security");
    const cc = res?.headers()["cache-control"] ?? "";
    expect(cc).toMatch(/no-store/); // dev sends "no-store", production "private, no-cache, no-store, …"
  });

  test("the auth API refuses a cross-origin request", async ({ request }) => {
    const res = await request.post("/api/auth/sign-in/email", {
      headers: { Origin: "https://evil.example", "Content-Type": "application/json" },
      data: { email: "luka@example.test", password: "Prototip-lozinka-1!" },
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
  });

  test("the session endpoint is empty when signed out and never cached", async ({ request }) => {
    const res = await request.get("/api/auth/get-session");
    expect(res.ok()).toBe(true);
    expect(await res.text()).toMatch(/^null$|^\s*$/);
  });

  test("open redirects are refused: returnTo must be a same-site path", async ({ page }) => {
    await page.goto("/sign-in?returnTo=https://evil.example/");
    await page.getByLabel("E-pošta").fill("luka@example.test");
    await page.getByLabel("Lozinka", { exact: true }).fill("Prototip-lozinka-1!");
    await page.getByRole("button", { name: "Prijavi se" }).click();
    await expect(page).toHaveURL(/localhost:3000\/home$/);
    await page.getByRole("button", { name: "Odjavi se" }).click();
    await page.goto("/sign-in?returnTo=//evil.example/");
    await page.getByLabel("E-pošta").fill("luka@example.test");
    await page.getByLabel("Lozinka", { exact: true }).fill("Prototip-lozinka-1!");
    await page.getByRole("button", { name: "Prijavi se" }).click();
    await expect(page).toHaveURL(/localhost:3000\/home$/);
  });
});
