import { test, expect, type Page } from "@playwright/test";
import { expectNoAxeViolations } from "./axe";
import { setRole } from "./db";
import { newMember, notice, signIn, totp } from "./helpers";

// Step 5.6: the Daily Drop editorial screens (ADM-04, ADM-05, ADM-09; J6). The publication itself (the job,
// the reserve, the retries) is covered by tests/db/editorial.test.ts; nothing here publishes, so the shared
// development database keeps its seeded questions.

/** The staff gate needs a second factor (threat model §3). */
async function enableTwoFactor(page: Page, password: string) {
  await page.goto("/settings/security");
  await page.getByRole("button", { name: "Uključi" }).click();
  await page.getByLabel("Potvrdi lozinkom").fill(password);
  await page.getByRole("button", { name: "Uključi" }).click();
  await page.getByText("Ključ za ručni unos", { exact: true }).click();
  const secret = (await page.locator("details .meta").textContent())?.trim() ?? "";
  await page.getByLabel("Kod (6 znamenki)").fill(totp(secret));
  await page.getByRole("button", { name: "Potvrdi" }).click();
  await page.getByRole("button", { name: "Spremio sam kodove" }).click();
}

/** A UTC date far in the future that no other run picks (the date is unique per question). */
const farDate = () =>
  new Date(Date.UTC(2100, 0, 1) + Math.floor(Math.random() * 36_500) * 86_400_000)
    .toISOString()
    .slice(0, 10);

/** No sideways scroll at 360 px and at 180 px (a 360 px phone at 200 % zoom, D-073); tables scroll inside. */
async function expectNoSidewaysScroll(page: Page) {
  const size = page.viewportSize();
  for (const width of [180, 360]) {
    await page.setViewportSize({ width, height: 800 });
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, `sideways scroll at ${width} px`).toBeLessThanOrEqual(0);
  }
  if (size) await page.setViewportSize(size);
}

const state = (page: Page) => page.locator(".set-row").filter({ hasText: "Stanje" });

test.describe("Daily Drop editorial (J6)", () => {
  test("an editor writes, resolves a conflict, approves with the checklist, schedules, unschedules and deletes", async ({
    page,
  }) => {
    test.slow(); // onboarding, two-factor setup, then the editor
    const password = "Urednik-Lozinka-2026!";
    const email = await newMember(page, "ed", password);
    await setRole(email, "editor");
    await enableTwoFactor(page, password);

    // ADM-04: the calendar with the JO4 warnings, reached from the admin menu
    await page.goto("/admin");
    await page.getByRole("link", { name: "Uredništvo" }).click();
    await expect(page.getByRole("heading", { level: 2, name: "Urednički kalendar" })).toBeVisible();
    await expect(page.getByRole("table", { name: "Daily Drop po UTC datumima" })).toBeVisible();
    await expectNoAxeViolations(page);
    await expectNoSidewaysScroll(page);

    // ADM-05: a new question in Croatian only; review needs both languages (JO2)
    await page.getByRole("link", { name: "Novo pitanje" }).click();
    await page.getByRole("button", { name: "Spremi nacrt" }).click();
    await expect(notice(page)).toContainText("barem na jednom jeziku");
    const hr = `Koja ti pjesma uvijek popravi dan? ${Date.now()}`;
    await page.getByLabel("Hrvatski").fill(hr);
    await page.getByRole("button", { name: "Spremi nacrt" }).click();
    await expect(page.getByText("Nacrt je spremljen.")).toBeVisible();
    await expect(state(page)).toContainText("Nacrt");
    await expect(page.getByText("Na pregled može tek kad su napisana oba jezika.")).toBeVisible();
    await expectNoAxeViolations(page);
    const url = page.url();

    // J6 E2: the same draft open twice; the second save sees the first and keeps both texts in view
    const other = await page.context().newPage();
    await other.goto(url);
    await page.getByLabel("English").fill("Which song always fixes your day?");
    await page.getByRole("button", { name: "Spremi", exact: true }).click();
    await expect(page.getByText("Spremljeno.").first()).toBeVisible();
    await other.getByLabel("English").fill("Which song always makes your day?");
    await other.getByRole("button", { name: "Spremi", exact: true }).click();
    await expect(
      other.getByRole("heading", { name: "Netko je u međuvremenu promijenio ovo pitanje" }),
    ).toBeVisible();
    await expect(other.getByText("Which song always fixes your day?")).toBeVisible();
    await expect(other.getByLabel("English")).toHaveValue("Which song always makes your day?");
    await expectNoAxeViolations(other);
    await other.getByRole("button", { name: "Spremi moju verziju preko spremljene" }).click();
    await expect(other.getByText("Spremljeno.").first()).toBeVisible();
    await other.close();
    await page.reload();
    await expect(page.getByLabel("English")).toHaveValue("Which song always makes your day?");

    // Review, then approval with the JO3 checklist
    await page.getByRole("button", { name: "Pošalji na pregled" }).click();
    await expect(state(page)).toContainText("Na pregledu");
    await page.getByRole("button", { name: "Odobri" }).click();
    await expect(page.getByText("Označi sve stavke popisa prije odobrenja.")).toBeVisible();
    for (const item of [
      "Hrvatska i engleska verzija znače isto.",
      "Pravopis i interpunkcija su provjereni u oba jezika.",
      "Pitanje je otvoreno: svatko može odgovoriti, bez točnog i netočnog odgovora.",
      "Ne spominje privatne osobe i nikoga ne vrijeđa.",
    ])
      await page.getByLabel(item).check();
    await page.getByRole("button", { name: "Odobri" }).click();
    await expect(state(page)).toContainText("Odobreno");
    await expectNoSidewaysScroll(page); // the longest form: schedule, reserve, back to draft, delete

    // Schedule for a UTC date; the page then reads "Zakazano" with the date
    const date = farDate();
    await page.getByLabel("Datum objave (UTC)").fill(date);
    await expect(page.getByText(/^kod tebe: /).first()).toBeVisible(); // J6 E5 local hint
    await page.getByRole("button", { name: "Zakaži" }).click();
    await expect(state(page)).toContainText(`Zakazano · ${date} UTC`);
    await expect(page.getByLabel("Hrvatski")).toHaveCount(0); // a scheduled question is not edited
    await expectNoAxeViolations(page);

    // Clean up through the product: off the date, then delete
    await page.getByRole("button", { name: "Makni s datuma" }).click();
    await expect(state(page)).toContainText("Odobreno");
    await page.getByRole("button", { name: "Obriši pitanje" }).click();
    await expect(page.getByText("Potvrdi radnju kvačicom.")).toBeVisible();
    await page.getByLabel("Obriši ovo pitanje zauvijek.").check();
    await page.getByRole("button", { name: "Obriši pitanje" }).click();
    await expect(page.getByText("Pitanje je obrisano.")).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "Urednički kalendar" })).toBeVisible();

    // The reserve and the publishing pages render for the editor (nothing is published here)
    await page.getByRole("link", { name: "Rezerva" }).click();
    await expect(page.getByRole("heading", { level: 2, name: "Rezerva" })).toBeVisible();
    await expectNoAxeViolations(page);
    await page.getByRole("link", { name: "Objave" }).click();
    await expect(page.getByRole("heading", { level: 2, name: "Objave" })).toBeVisible();
    await expectNoAxeViolations(page);
  });

  test("members never reach the editorial pages; a draft id answers the staff gate", async ({
    page,
  }) => {
    await signIn(page, "ana@example.test");
    for (const path of [
      "/admin/editorial",
      "/admin/editorial/reserve",
      "/admin/editorial/jobs",
      "/admin/editorial/drops/00000000-0000-4000-8000-000000056001",
    ]) {
      await page.goto(path);
      await expect(notice(page)).toContainText("za osoblje");
      await expect(page.getByText("Koja ti je pjesma prva otvorila")).toHaveCount(0);
    }
  });
});
