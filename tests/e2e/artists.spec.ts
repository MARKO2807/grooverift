import { expect, test, type Page } from "@playwright/test";
import { expectNoAxeViolations } from "./axe";
import { createAccountFromInvite, newMember, uniqueEmail, uniqueUsername } from "./helpers";

// Step 5.3b: artists in the Music DNA editor (J2, D-060 (2)), CAT-01, and the catalogue failure state (D-078), with
// the catalogue stubbed (CATALOG_STUB=1, src/lib/catalog/stub.ts): no request ever reaches MusicBrainz.

const rows = (page: Page) =>
  page.getByRole("list", { name: "Izvođači, redoslijed" }).getByRole("listitem");
const live = (page: Page) => page.locator(".dna-editor > [role=status]");
const results = (page: Page) => page.getByRole("list", { name: "Izvođači iz kataloga" });

test.describe("Artists in Music DNA", () => {
  test("search, same-name results, add, reorder, remove with Undo, the artist page", async ({
    page,
  }) => {
    test.slow();
    await newMember(page, "art");
    await page.goto("/me/dna");
    await expect(page.getByText("Još nema izvođača. Neobavezno.")).toBeVisible();

    await page.getByRole("button", { name: "Dodaj izvođača" }).click();
    await expect(page.getByLabel("Traži izvođača")).toBeFocused();
    await expect(results(page)).toContainText("Upiši barem dva slova.");

    // Two artists named Nirvana: country, years and the description tell them apart (D-060 (2), J2 E8).
    await page.getByLabel("Traži izvođača").fill("Nirvana");
    const nirvana = results(page).getByRole("button", { name: /^Nirvana/ });
    await expect(nirvana).toHaveCount(2);
    await expect(nirvana.first()).toContainText("Grunge");
    await expect(nirvana.first()).toContainText("1987–1994");
    await expect(nirvana.first()).toContainText("1980s–1990s US grunge band");
    await expect(nirvana.nth(1)).toContainText("1965");
    await expectNoAxeViolations(page);
    await nirvana.first().click();
    await expect(live(page)).toHaveText("Dodano: Nirvana.");
    await expect(rows(page)).toHaveCount(1);
    await expect(rows(page).first()).toContainText("1980s–1990s US grunge band");
    // The same result is now marked as added and does nothing.
    await expect(nirvana.first()).toHaveAttribute("aria-disabled", "true");

    // A single artist shows only its main genres.
    await page.getByLabel("Traži izvođača").fill("Radiohead");
    const radiohead = results(page).getByRole("button", { name: /^Radiohead/ });
    await expect(radiohead).toContainText("Alternativa, Art rock");
    await expect(radiohead).not.toContainText("1991");
    await radiohead.click();
    await expect(rows(page)).toHaveCount(2);

    // Move up keeps focus on the moved item.
    await page.getByRole("button", { name: "Pomakni Radiohead gore" }).click();
    await expect(rows(page).first()).toContainText("Radiohead");
    await expect(live(page)).toHaveText("Radiohead je sada na 1. mjestu.");

    // Remove with Undo puts it back at the same place.
    await page.getByRole("button", { name: "Ukloni Radiohead" }).click();
    await expect(rows(page)).toHaveCount(1);
    await page.getByRole("button", { name: "Poništi" }).click();
    await expect(live(page)).toHaveText("Vraćeno: Radiohead.");
    await expect(rows(page).first()).toContainText("Radiohead");

    // Artists have no minimum (J2 E6): both can go.
    await page.getByRole("button", { name: "Ukloni Radiohead" }).click();
    await expect(rows(page)).toHaveCount(1);

    // The catalogue failing: the message, Retry, and the Music DNA untouched (D-078).
    await page.getByLabel("Traži izvođača").fill("katalog-kvar");
    await expect(results(page)).toContainText("Katalog trenutačno ne radi.");
    await expect(results(page).getByRole("button", { name: "Pokušaj ponovno" })).toBeVisible();
    await expect(rows(page)).toHaveCount(1);

    // The profile's Music DNA page links the artist to CAT-01 (the profile block shows once there are genres).
    await page.getByRole("button", { name: "Dodaj žanr" }).click();
    const suggestions = page.getByRole("group", { name: "Prijedlozi" });
    await suggestions.getByRole("button", { name: /^Rock/ }).click();
    await expect(
      page.getByRole("list", { name: "Žanrovi, redoslijed" }).getByRole("listitem"),
    ).toHaveCount(1);
    await suggestions.getByRole("button", { name: /^Pop/ }).click();
    await expect(
      page.getByRole("list", { name: "Žanrovi, redoslijed" }).getByRole("listitem"),
    ).toHaveCount(2);
    await page.goto("/me");
    await page.getByRole("link", { name: "Cijeli Music DNA" }).click();
    await page.getByRole("link", { name: "Nirvana" }).click();
    await expect(page).toHaveURL(/\/artist\/[0-9a-f-]{36}$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Nirvana");
    await expect(page.getByText("1980s–1990s US grunge band")).toBeVisible();
    await expect(page.getByRole("link", { name: /Pogledaj na MusicBrainzu/ })).toHaveAttribute(
      "href",
      "https://musicbrainz.org/artist/5b11f4ce-a62d-471e-81fc-a69a8278c7da",
    );
    await expectNoAxeViolations(page);
  });

  test("onboarding: artists picked with the genres, saved only on Continue (ONB-05)", async ({
    page,
  }) => {
    test.slow();
    await createAccountFromInvite(page, uniqueEmail("artonb"), "Nova-Lozinka-2026!");
    await page.getByLabel("Ime za prikaz").fill("Testna Osoba");
    await page.getByLabel("Korisničko ime").fill(uniqueUsername("ao"));
    await page.getByRole("button", { name: "Nastavi" }).click();
    await page.getByRole("button", { name: "Nastavi" }).click(); // reading languages
    await page.getByLabel("Javno").check();
    await page.getByRole("button", { name: "Nastavi" }).click();
    await expect(page).toHaveURL(/\/join\/dna$/);

    await page.getByRole("button", { name: /^Rock/ }).click();
    await page.getByRole("button", { name: /^Pop/ }).click();
    await page.getByLabel("Traži izvođača").fill("Björk");
    await results(page)
      .getByRole("button", { name: /^Björk/ })
      .click();
    const picked = page.getByRole("list", { name: "Odabrani izvođači" });
    await expect(picked).toContainText("Björk");
    await page.getByLabel("Traži izvođača").fill("Let 3");
    await results(page)
      .getByRole("button", { name: /^Let 3/ })
      .click();
    await picked.getByRole("button", { name: "Ukloni Björk" }).click();
    await expect(picked.getByRole("listitem")).toHaveCount(1);
    await expectNoAxeViolations(page);
    await page.getByRole("button", { name: "Nastavi" }).click();
    await expect(page).toHaveURL(/\/join\/dna-audience$/);

    // Back: the step shows what was saved.
    await page.goto("/join/dna");
    await expect(page.getByRole("list", { name: "Odabrani izvođači" })).toContainText("Let 3");
    await expect(page.getByRole("list", { name: "Odabrani izvođači" })).not.toContainText("Björk");
  });

  test("an unknown artist page is not found", async ({ page }) => {
    await newMember(page, "art404");
    const res = await page.goto("/artist/00000000-0000-4000-8000-000000000000");
    expect(res?.status()).toBe(404);
  });
});
