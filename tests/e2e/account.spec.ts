import { execFileSync } from "node:child_process";
import { test, expect, type Page } from "@playwright/test";
import { expectNoAxeViolations } from "./axe";
import { lastFeedbackOf, makeDeletionDue, userExists, usernameOf } from "./db";
import { mailsTo, newMember, notice, signIn } from "./helpers";

// Step 5.10: settings, account and data in the browser (plan row 5.10 acceptance: export → delete → grace → purge;
// SET-01 arrangement B, SET-07, SET-09, SET-12). Each test makes its own member, so the phone and desktop runs
// never share state; the purge test erases its member for real.

const PASSWORD = "Racun-Lozinka-2026!";

/** Runs one job the way the worker would (src/run-job.ts). */
function runJob(name: "account.purge" | "account.export") {
  execFileSync(process.platform === "win32" ? "npx.cmd" : "npx", ["tsx", "src/run-job.ts", name], {
    stdio: "pipe",
    shell: process.platform === "win32",
  });
}

async function openCloseFlow(page: Page, choice: "Deaktiviraj" | "Izbriši trajno") {
  await page.goto("/settings");
  await page.getByRole("link", { name: "Deaktiviraj ili izbriši račun" }).click();
  await expect(page).toHaveURL(/\/settings\/data$/);
  await page.getByText(choice, { exact: true }).click();
  await page.getByRole("button", { name: "Nastavi" }).click();
  await expect(
    page.getByRole("heading", { name: "Želiš li prvo kopiju svojih podataka?" }),
  ).toBeFocused();
}

test.describe("Settings (SET-01, SET-07, About)", () => {
  test("the profile card, the status line, the groups, Smanji pokrete and the region", async ({
    page,
  }) => {
    test.slow();
    await newMember(page, "set", PASSWORD);
    await page.goto("/settings");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Postavke");
    await expect(page.getByRole("link", { name: /Uredi profil/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /Račun je u redu/ })).toBeVisible();
    for (const g of ["Račun", "Privatnost", "Aplikacija", "Pomoć i informacije"])
      await expect(page.getByRole("heading", { level: 2, name: g, exact: true })).toBeVisible();
    await expectNoAxeViolations(page);

    // "Smanji pokrete" is a real switch; the page follows at once and after a reload.
    const sw = page.getByRole("switch", { name: "Smanji pokrete" });
    await expect(sw).toHaveAttribute("aria-checked", "false");
    await sw.click();
    await expect(sw).toHaveAttribute("aria-checked", "true");
    await expect(page.locator("html")).toHaveAttribute("data-motion", "reduced");
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-motion", "reduced");
    await page.getByRole("switch", { name: "Smanji pokrete" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-motion", "full");

    // SET-07: the time zone saves at once and shows on the Settings row.
    await page.getByRole("link", { name: /Jezik i regija/ }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Jezik i regija");
    await page.getByLabel("Vremenska zona").selectOption("Europe/London");
    await expect(page.getByText("Spremljeno.")).toBeVisible();
    await expectNoAxeViolations(page);
    await page.goto("/settings");
    await expect(page.getByRole("link", { name: /Jezik i regija/ })).toContainText("London");

    await page.goto("/settings/about");
    await expect(page.getByRole("heading", { name: "Licence" })).toBeVisible();
    await expectNoAxeViolations(page);
    await page.goto("/settings/account");
    await expect(page.getByRole("link", { name: /Korisničko ime/ })).toBeVisible();
    await expectNoAxeViolations(page);
  });
});

test.describe("Feedback (SET-12)", () => {
  test("asks for the type and the message, lists the details, and reaches the team", async ({
    page,
  }) => {
    test.slow();
    const email = await newMember(page, "fb", PASSWORD);
    await page.goto("/settings/help");
    await page.getByRole("button", { name: "Pošalji" }).click();
    await expect(page.getByText("Odaberi o čemu se radi.")).toBeVisible();
    await expect(page.getByText("Ovo polje je obavezno.")).toBeVisible();
    // axe with the page scrolled to its end: the fixed phone tab bar must not sit over a control (target-size).
    await page.getByRole("button", { name: "Pošalji" }).scrollIntoViewIfNeeded();
    await expectNoAxeViolations(page);

    await page.getByText("Nešto ne radi", { exact: true }).click();
    await page.getByLabel("Poruka").fill("Gumb za odgovor ponekad ne reagira.");
    await page.getByText("Što šaljemo uz poruku").click();
    const device = page.getByRole("checkbox", { name: /Preglednik i uređaj/ });
    await expect(device).toBeChecked();
    await device.uncheck();
    await page.getByRole("checkbox", { name: /Odgovor mi može stići na/ }).uncheck();
    await page.getByRole("button", { name: "Pošalji" }).click();
    await expect(page.getByText("Hvala, poruka je stigla timu.")).toBeFocused();

    const row = await lastFeedbackOf(email);
    expect(row?.kind).toBe("bug");
    expect(row?.text).toBe("Gumb za odgovor ponekad ne reagira.");
    expect(row?.reply_by_email).toBe(false);
    expect(Object.keys(row?.context ?? {}).sort()).toEqual(["screen", "time", "version"]);
  });
});

test.describe("Deactivate (SET-09)", () => {
  test("hides the account at once; the next sign-in brings it back", async ({ page }) => {
    test.slow();
    const email = await newMember(page, "deact", PASSWORD);
    const username = await usernameOf(email);
    await openCloseFlow(page, "Deaktiviraj");
    await page.getByRole("button", { name: "Nastavi" }).click();
    await expect(page.getByRole("heading", { name: "Deaktiviraj račun" })).toBeFocused();
    await expectNoAxeViolations(page);
    await page.getByLabel("Za potvrdu upiši lozinku").fill(PASSWORD);
    await page.getByRole("button", { name: "Deaktiviraj", exact: true }).click();
    await expect(page).toHaveURL(/\/account-closed\?k=deactivated/);
    await expect(page.getByRole("heading", { name: "Račun je deaktiviran" })).toBeVisible();

    // Signed out, and the profile answers "not available" like any missing one.
    expect((await page.goto(`/@${username}`))?.status()).toBe(404);
    await signIn(page, email, PASSWORD);
    await expect(page).toHaveURL(/\/home$/);
    expect((await page.goto(`/@${username}`))?.status()).toBe(200);
  });
});

test.describe("Export → delete → grace → purge (plan 5.10 acceptance)", () => {
  test("the data copy, the password, the grace screen with Vrati račun, and the purge", async ({
    page,
  }) => {
    test.slow();
    const email = await newMember(page, "del", PASSWORD);
    const username = await usernameOf(email);
    await openCloseFlow(page, "Izbriši trajno");
    await expect(page.getByText("Korak 1 od 3")).toBeVisible();
    await expectNoAxeViolations(page);

    // The copy is built on the server; the step polls and then offers the ZIP.
    await page.getByRole("button", { name: "Preuzmi kopiju" }).click();
    await expect(page.getByText("Kopija je spremna")).toBeVisible({ timeout: 30_000 });
    const download = page.waitForEvent("download");
    await page.getByRole("link", { name: "Preuzmi ZIP" }).click();
    expect((await download).suggestedFilename()).toMatch(
      /^grooverift-data-\d{4}-\d{2}-\d{2}\.zip$/,
    );

    await page.getByRole("button", { name: "Nastavi" }).click();
    await expect(page.getByRole("heading", { name: /^Izbriši račun / })).toBeFocused();
    await page.getByRole("button", { name: "Izbriši račun" }).click();
    await expect(page.getByText("Ovo polje je obavezno.")).toBeVisible();
    await page.getByLabel("Za potvrdu upiši lozinku").fill("Kriva-Lozinka-2026!");
    await page.getByRole("button", { name: "Izbriši račun" }).click();
    await expect(page.getByText("Lozinka nije točna.")).toBeVisible();
    await page.getByLabel("Za potvrdu upiši lozinku").fill(PASSWORD);
    const before = Date.now();
    await page.getByRole("button", { name: "Izbriši račun" }).click();
    await expect(page).toHaveURL(/\/account-closed\?k=deleted&d=\d{4}-\d{2}-\d{2}/);
    await expect(page.getByRole("heading", { name: /^Brisanje je zakazano za / })).toBeVisible();
    await expect
      .poll(() => mailsTo(email).filter((m) => Date.parse(m.at) >= before - 1000).length)
      .toBeGreaterThan(0);
    expect((await page.goto(`/@${username}`))?.status()).toBe(404);

    // Signing in during the grace period: the choice first, nothing restored by itself.
    await signIn(page, email, PASSWORD);
    await expect(page).toHaveURL(/\/account-deletion$/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Račun se briše");
    await expectNoAxeViolations(page);
    await page.goto("/home");
    await expect(page).toHaveURL(/\/account-deletion$/);
    await page.getByRole("button", { name: "Vrati račun" }).click();
    await expect(page).toHaveURL(/\/home\?restored=1$/);
    await expect(notice(page).getByText("Račun je vraćen. Sve je kako je bilo.")).toBeVisible();
    expect((await page.goto(`/@${username}`))?.status()).toBe(200);

    // Delete again, skip the copy, let the grace period pass, run the purge.
    await openCloseFlow(page, "Izbriši trajno");
    await page.getByRole("button", { name: "Nastavi" }).click();
    await page.getByLabel("Za potvrdu upiši lozinku").fill(PASSWORD);
    await page.getByRole("button", { name: "Izbriši račun" }).click();
    await expect(page).toHaveURL(/\/account-closed/);
    await makeDeletionDue(email);
    runJob("account.purge");
    expect(await userExists(email)).toBe(false);
    expect((await page.goto(`/@${username}`))?.status()).toBe(404);
    await signIn(page, email, PASSWORD);
    await expect(page).toHaveURL(/\/sign-in/);
    await expect(notice(page).first()).toBeVisible();
  });
});
