import { test, expect } from "@playwright/test";
import { expectNoAxeViolations } from "./axe";

test.describe("landing (PUB-01)", () => {
  test("serves Croatian at the root", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("lang", "hr");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Svaki dan jedno pitanje za sve.",
    );
    await expect(page).toHaveTitle(/GrooveRift/);
    await expect(page.getByText("Samo uz pozivnicu.")).toBeVisible();
  });

  test("serves English under /en", async ({ page }) => {
    await page.goto("/en");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "One question a day, for everyone.",
    );
  });

  test("offers exactly one visible sign-in and the legal and notice links", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: "Prijavi se", exact: true })).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Prijavi se", exact: true }).locator("visible=true"),
    ).toHaveCount(1);
    const legal = page.getByRole("navigation", { name: "Pravne informacije" });
    for (const name of [
      "Uvjeti",
      "Privatnost",
      "Pravila zajednice",
      "Kolačići",
      "Kontakt",
      "Prijavi sadržaj",
    ])
      await expect(legal.getByRole("link", { name })).toBeVisible();
    await expect(page.getByRole("link", { name: /^Alfa/ })).toHaveAttribute("href", "/about/alpha");
  });

  test("the invite current is decorative", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("canvas.motif")).toHaveAttribute("aria-hidden", "true");
  });

  test("skip link is the first tab stop and reaches main", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: "Preskoči na sadržaj" });
    await expect(skip).toBeFocused();
    await skip.press("Enter");
    await expect(page.locator("main#main")).toBeFocused();
  });

  test("has no axe-core violations", async ({ page }) => {
    await page.goto("/");
    await expectNoAxeViolations(page);
  });

  test("does not advertise the server", async ({ request }) => {
    const res = await request.get("/");
    expect(res.headers()["x-powered-by"]).toBeUndefined();
  });
});
