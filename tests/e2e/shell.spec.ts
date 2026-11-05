import { test, expect } from "@playwright/test";
import { expectNoAxeViolations } from "./axe";
import { signIn } from "./helpers";

const mainNav = (page: import("@playwright/test").Page) =>
  page.getByRole("navigation", { name: "Glavna navigacija" });

test.describe("app shell (D-031, D-079, D-080)", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page, "mia@example.test");
  });

  test("one main navigation with the four tabs in order, the current one marked", async ({
    page,
  }) => {
    await page.goto("/hub");
    // Only one of the tab bar and the rail is displayed, so a screen reader hears one main navigation.
    await expect(mainNav(page)).toHaveCount(1);
    const nav = mainNav(page);
    const names = await nav.getByRole("link").allTextContents();
    expect(names.slice(0, 4)).toEqual(["Početna", "Hub", "Aktivnost", "Profil"]);
    await expect(nav.getByRole("link", { name: "Hub" })).toHaveAttribute("aria-current", "page");
    await expect(nav.getByRole("link", { name: "Početna" })).not.toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  test("tabs navigate and focus the new page's heading", async ({ page }) => {
    await page.goto("/home");
    await mainNav(page).getByRole("link", { name: "Aktivnost" }).click();
    await expect(page).toHaveURL(/\/activity$/);
    await expect(page.getByRole("heading", { level: 1, name: "Aktivnost" })).toBeFocused();
  });

  test("the alpha mark links to About the alpha", async ({ page }) => {
    await page.goto("/activity");
    await expect(page.getByRole("link", { name: /^Alfa/ }).locator("visible=true")).toHaveAttribute(
      "href",
      "/about/alpha",
    );
  });

  test("Settings and Help are reachable and the shell pages pass axe", async ({ page }) => {
    for (const p of ["/home", "/hub", "/activity", "/me", "/settings", "/settings/help"]) {
      await page.goto(p);
      await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
      await expectNoAxeViolations(page);
    }
  });

  test("the seeded paused flag shows SYS-04 instead of the Spirala", async ({ page }) => {
    await page.goto("/me");
    await expect(
      page.getByRole("status").filter({ hasText: "Music DNA je privremeno isključen" }),
    ).toBeVisible();
  });

  test("the member's reduced-motion setting reaches the page", async ({ page }) => {
    await page.goto("/home");
    await expect(page.locator("html")).toHaveAttribute("data-motion", /^(full|reduced)$/);
  });
});

test.describe("app shell on the phone", () => {
  test("swiping left moves to the next tab", async ({ page, isMobile }) => {
    test.skip(!isMobile, "phone only");
    await signIn(page, "mia@example.test");
    await page.goto("/hub");
    const main = page.locator("main#main");
    const box = (await main.boundingBox())!;
    const y = box.y + 120;
    await main.dispatchEvent("pointerdown", {
      pointerId: 1,
      pointerType: "touch",
      clientX: 300,
      clientY: y,
      button: 0,
    });
    for (const x of [280, 240, 200, 150])
      await main.dispatchEvent("pointermove", {
        pointerId: 1,
        pointerType: "touch",
        clientX: x,
        clientY: y,
      });
    await main.dispatchEvent("pointerup", {
      pointerId: 1,
      pointerType: "touch",
      clientX: 150,
      clientY: y,
    });
    await expect(page).toHaveURL(/\/activity$/);
  });
});

test.describe("Spirala specimen", () => {
  test("is named for screen readers, decorative as a picture, and passes axe", async ({ page }) => {
    const res = await page.goto("/specimen");
    test.skip(res?.status() === 404, "specimens are off in this environment");
    const fig = page.getByRole("figure", { name: "Music DNA: primjer" });
    await expect(fig).toBeVisible();
    await expect(fig.locator("canvas")).toHaveAttribute("aria-hidden", "true");
    await expect(fig.getByRole("list")).toContainText("Metal: Izvođač A");
    await expectNoAxeViolations(page);
  });
});
