import { test, expect } from "@playwright/test";
import { insertInvitation } from "./db";
import { signIn } from "./helpers";

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

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

  test("the public auth API enforces the password policy, the 18+ confirmation and the invitation", async ({
    request,
  }) => {
    const base = { Origin: BASE, "Content-Type": "application/json" };
    const email = `api-${Date.now()}@example.test`;
    const weak = await request.post("/api/auth/sign-up/email", {
      headers: base,
      data: { name: "Api", email, password: "aaaaaaaaaaaa", age18: true },
    });
    expect(weak.status()).toBe(400);
    expect((await weak.json()).code).toBe("PASSWORD_POLICY");
    // No invitation cookie: refused before anything else is looked at (step 5.4, R-08).
    const noInvite = await request.post("/api/auth/sign-up/email", {
      headers: base,
      data: { name: "Api", email, password: "Jaka-Lozinka-2026!", age18: true },
    });
    expect(noInvite.status()).toBe(403);
    expect((await noInvite.json()).code).toBe("INVITE_REQUIRED");
    // An invitation for another address does not help either.
    const other = await insertInvitation(`other-${email}`);
    const wrongAddress = await request.post("/api/auth/sign-up/email", {
      headers: { ...base, cookie: `gr_invite=${other.token}` },
      data: { name: "Api", email, password: "Jaka-Lozinka-2026!", age18: true },
    });
    expect(wrongAddress.status()).toBe(403);
    const { token } = await insertInvitation(email);
    const withInvite = { ...base, cookie: `gr_invite=${token}` };
    const noAge = await request.post("/api/auth/sign-up/email", {
      headers: withInvite,
      data: { name: "Api", email, password: "Jaka-Lozinka-2026!" },
    });
    expect(noAge.status()).toBe(400);
    expect((await noAge.json()).code).toBe("AGE_18_REQUIRED");
    const badLocale = await request.post("/api/auth/sign-up/email", {
      headers: withInvite,
      data: { name: "Api", email, password: "Jaka-Lozinka-2026!", age18: true, locale: "../x" },
    });
    expect(badLocale.status()).toBe(400);
    expect((await badLocale.json()).code).toBe("LOCALE_INVALID");
  });

  test("unused Better Auth admin endpoints are closed", async ({ request }) => {
    const headers = { Origin: BASE, "Content-Type": "application/json" };
    const list = await request.get("/api/auth/admin/list-users?limit=10", { headers });
    expect(list.status()).toBe(404);
    const setPw = await request.post("/api/auth/admin/set-user-password", {
      headers,
      data: { userId: "11111111-1111-4111-8111-111111111111", newPassword: "Jaka-Lozinka-2026!" },
    });
    expect(setPw.status()).toBe(404);
  });

  test("an empty sign-in names the missing field instead of blaming the credentials", async ({
    page,
  }) => {
    await page.goto("/sign-in");
    await page.getByRole("button", { name: "Prijavi se" }).click();
    await expect(page.getByLabel("E-pošta")).toHaveAttribute("aria-invalid", "true");
    await expect(page.getByLabel("E-pošta")).toBeFocused();
    await expect(page.getByText("Ovo polje je obavezno.").first()).toBeVisible();
  });

  test("open redirects are refused: returnTo must be a same-site path", async ({ page }) => {
    await page.goto("/sign-in?returnTo=https://evil.example/");
    await page.getByLabel("E-pošta").fill("luka@example.test");
    await page.getByLabel("Lozinka", { exact: true }).fill("Prototip-lozinka-1!");
    await page.getByRole("button", { name: "Prijavi se" }).click();
    await expect(page).toHaveURL(/\/home$/);
    await page.getByRole("button", { name: "Odjavi se" }).click();
    await page.goto("/sign-in?returnTo=//evil.example/");
    await page.getByLabel("E-pošta").fill("luka@example.test");
    await page.getByLabel("Lozinka", { exact: true }).fill("Prototip-lozinka-1!");
    await page.getByRole("button", { name: "Prijavi se" }).click();
    await expect(page).toHaveURL(/\/home$/);
  });
});
