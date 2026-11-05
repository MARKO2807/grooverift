import { expect, test, type Page } from "@playwright/test";
import { expectNoAxeViolations } from "./axe";
import { newMember } from "./helpers";

// Step 5.3a: the Music DNA editor (PROF-09, J2, D-078) on a fresh member, so runs never share state.

const rows = (page: Page) =>
  page.getByRole("list", { name: "Žanrovi, redoslijed" }).getByRole("listitem");
const live = (page: Page) => page.locator(".dna-editor [role=status]");

async function addGenre(page: Page, query: string, name: RegExp) {
  if (await page.getByRole("button", { name: "Dodaj žanr" }).isVisible())
    await page.getByRole("button", { name: "Dodaj žanr" }).click();
  await page.getByLabel("Traži žanr").fill(query);
  await page.locator("#genre-results").getByRole("button", { name }).first().click();
}

test.describe("Music DNA editor", () => {
  test("add, search, reorder, remove with Undo, the minimum and the audience", async ({ page }) => {
    await newMember(page, "dna");
    await page.goto("/me");
    await expect(
      page.getByText("Još nema žanrova. Dodaj ih da nastane tvoja Spirala."),
    ).toBeVisible();
    await page.getByRole("link", { name: "Uredi Music DNA" }).click();
    await expect(page).toHaveURL(/\/me\/dna$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Uredi Music DNA");
    await expectNoAxeViolations(page);

    // Suggestions before typing: the main genres (D-062).
    await page.getByRole("button", { name: "Dodaj žanr" }).click();
    await expect(page.getByLabel("Traži žanr")).toBeFocused();
    const suggestions = page.getByRole("group", { name: "Prijedlozi" });
    await suggestions.getByRole("button", { name: /^Rock/ }).click();
    await expect(live(page)).toHaveText("Dodano: Rock.");
    await expect(rows(page)).toHaveCount(1);

    // Search finds a subgenre by its family and shows the family next to it.
    await addGenre(page, "death met", /^Death metal, Metal/);
    await expect(rows(page).nth(1)).toContainText("Death metal · Metal");
    // Aliases: "hip hop" finds Rap.
    await page.getByLabel("Traži žanr").fill("hip hop");
    await expect(
      page.locator("#genre-results").getByRole("button", { name: /^Rap/ }).first(),
    ).toBeVisible();

    // At two genres, Remove explains the minimum instead of removing (D-078 (2)).
    // aria-disabled keeps it focusable and a press explains why (force: Playwright waits for "enabled").
    await page.getByRole("button", { name: "Ukloni Rock" }).click({ force: true });
    await expect(page.getByRole("alert").filter({ hasText: "najmanje dva žanra" })).toBeVisible();
    await expect(rows(page)).toHaveCount(2);

    await addGenre(page, "pop", /^Pop/);
    await expect(rows(page)).toHaveCount(3);

    // Move up: the order changes, it is announced, focus stays on the moved item.
    await page.getByRole("button", { name: "Pomakni Pop gore" }).click();
    await expect(rows(page).nth(1)).toContainText("Pop");
    await expect(live(page)).toHaveText("Pop je sada na 2. mjestu.");
    await expect(page.getByRole("button", { name: "Pomakni Pop gore" })).toBeFocused();

    // Remove with Undo puts it back where it was.
    await page.getByRole("button", { name: "Ukloni Rock" }).click();
    await expect(rows(page)).toHaveCount(2);
    await page.locator(".toast").getByRole("button", { name: "Poništi" }).click();
    await expect(rows(page)).toHaveCount(3);
    await expect(rows(page).first()).toContainText("Rock");

    // The audience sheet (SET-05 for this section).
    await page.getByRole("button", { name: "Promijeni tko vidi Music DNA" }).click();
    const dialog = page.getByRole("dialog", { name: "Tko vidi tvoj Music DNA?" });
    await expect(dialog).toBeVisible();
    await expectNoAxeViolations(page);
    await dialog.getByText("Samo pratitelji").click();
    await dialog.getByRole("button", { name: "Spremi" }).click();
    await expect(dialog).toBeHidden();
    await expect(page.locator(".aud-line")).toContainText("samo pratitelji");

    // Everything was saved: a reload shows the same order and audience, and the profile draws the Spirala.
    await page.reload();
    await expect(rows(page)).toHaveCount(3);
    // axe with the rows and the closed add panel (the open panel scrolls under the fixed tab bar on the phone).
    await expectNoAxeViolations(page);
    await expect(rows(page).nth(0)).toContainText("Rock");
    await expect(rows(page).nth(1)).toContainText("Pop");
    await expect(rows(page).nth(2)).toContainText("Death metal");
    await expect(page.locator(".aud-line")).toContainText("samo pratitelji");
    await page.goto("/me");
    await expect(page.getByRole("figure", { name: "3 žanra, 0 izvođača" })).toBeVisible();
  });

  test("at ten genres the add button gives way to the limit", async ({ page }) => {
    await newMember(page, "dnacap");
    await page.goto("/me/dna");
    await page.getByRole("button", { name: "Dodaj žanr" }).click();
    const suggestions = page.getByRole("group", { name: "Prijedlozi" });
    for (let i = 1; i <= 10; i++) {
      await suggestions.getByRole("button").first().click();
      await expect(rows(page)).toHaveCount(i);
    }
    await expect(page.getByText("Najviše 10 žanrova. Ukloni jedan da dodaš drugi.")).toBeVisible();
    await expect(page.getByLabel("Traži žanr")).toHaveCount(0);
    await expect(page.locator(".dna-sec .count").first()).toHaveText("10/10");
  });
});
