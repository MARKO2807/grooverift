import { test, expect } from "@playwright/test";
import { expectNoAxeViolations } from "./axe";

test.describe("home page", () => {
  test("serves Croatian at the root", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("lang", "hr");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Uskoro");
    await expect(page).toHaveTitle(/GrooveRift/);
  });

  test("serves English under /en", async ({ page }) => {
    await page.goto("/en");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Coming soon");
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
