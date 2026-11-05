import { test, expect, type APIRequestContext, type Page } from "@playwright/test";
import { expectNoAxeViolations } from "./axe";
import { signIn } from "./helpers";

// IA8, U-02, U-03: an unknown profile, a future Daily Drop, a random post id and an unknown path all answer the
// same "nije dostupno" page with HTTP 404, signed in or not.
const PATHS = [
  "/@nobody-here",
  "/drop/2099-01-01",
  "/p/0f9e8d7c",
  "/nema/ovakve/stranice",
  "/@nobody-here/dna",
];

async function heading(page: Page) {
  return page.getByRole("heading", { level: 1 });
}

test.describe("SYS-01 not available", () => {
  test("every reason gives the same page and 404 for visitors", async ({ page }) => {
    for (const p of PATHS) {
      const res = await page.goto(p);
      expect(res?.status(), p).toBe(404);
      await expect(await heading(page), p).toHaveText("Ova stranica nije dostupna");
    }
    await expectNoAxeViolations(page);
  });

  test("English visitors get the same page in English", async ({ page }) => {
    const res = await page.goto("/en/@nobody-here");
    expect(res?.status()).toBe(404);
    await expect(await heading(page)).toHaveText("This page is not available");
  });

  test("members get the same page inside the app shell", async ({ page }) => {
    await signIn(page, "luka@example.test");
    for (const p of PATHS) {
      const res = await page.goto(p);
      expect(res?.status(), p).toBe(404);
      await expect(await heading(page), p).toHaveText("Ova stranica nije dostupna");
    }
    await expect(page.getByRole("navigation", { name: "Glavna navigacija" })).toHaveCount(1);
    await expectNoAxeViolations(page);
  });

  test("the visible page does not differ by reason", async ({ page }) => {
    const texts: string[] = [];
    for (const p of ["/@nobody-here", "/drop/2099-01-01", "/p/0f9e8d7c"]) {
      await page.goto(p);
      await expect(await heading(page)).toBeVisible();
      const text = await page.locator(".sys-na").innerText();
      expect(text).not.toMatch(/private|blocked|deleted|suspended|privatn|blokir|izbrisan/i);
      texts.push(text);
    }
    expect(new Set(texts).size).toBe(1);
  });
});

test.describe("private areas are never stored (ADR-0002 §3)", () => {
  async function cacheControl(request: APIRequestContext | Page, path: string) {
    const res = "goto" in request ? await request.goto(path) : await request.get(path);
    return res?.headers()["cache-control"] ?? "";
  }

  test("/me, /settings and /admin answer private, no-store", async ({ page }) => {
    await signIn(page, "luka@example.test");
    for (const p of ["/me", "/settings", "/settings/security", "/admin"]) {
      const cc = await cacheControl(page, p);
      expect(cc, p).toMatch(/no-store/);
      // Production sends "private, no-cache, no-store, …"; the dev server sends "no-store, must-revalidate".
      if (process.env.CI) expect(cc, p).toMatch(/private/);
    }
  });
});
