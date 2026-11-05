import { test, expect } from "@playwright/test";
import { expectNoAxeViolations } from "./axe";
import { SEED_PASSWORD, firstLink, lastMailTo, notice, signIn, totp, uniqueEmail } from "./helpers";

test.describe("sign-in", () => {
  test("the sign-in page is a real form, accessible, and rejects a wrong password", async ({
    page,
  }) => {
    await page.goto("/sign-in");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Prijava");
    await expect(page.locator("form")).toHaveCount(1);
    await expect(page.getByLabel("Lozinka", { exact: true })).toHaveAttribute(
      "autocomplete",
      "current-password",
    );
    await expectNoAxeViolations(page);

    await page.getByLabel("E-pošta").fill("ana@example.test");
    await page.getByLabel("Lozinka", { exact: true }).fill("kriva-Lozinka-1!");
    await page.getByRole("button", { name: "Prijavi se" }).click();
    const alert = notice(page);
    await expect(alert).toContainText("E-pošta ili lozinka nisu točni");
    // The typed address stays (components §4.2: never clear what the member typed).
    await expect(page.getByLabel("E-pošta")).toHaveValue("ana@example.test");
  });

  test("signs a seeded member in and out", async ({ page }) => {
    await signIn(page, "ana@example.test");
    await expect(page).toHaveURL(/\/home$/);
    await expect(page.getByText("Prijavljen si kao Ana Sluša.")).toBeVisible();
    await expectNoAxeViolations(page);
    await page.getByRole("button", { name: "Odjavi se" }).click();
    await expect(page).toHaveURL(/\/$/);
    await page.goto("/home");
    await expect(page).toHaveURL(/\/sign-in\?returnTo=%2Fhome$/);
  });

  test("returns to the requested page after sign-in (same-site paths only)", async ({ page }) => {
    await page.goto("/sign-in?returnTo=/settings/security");
    await page.getByLabel("E-pošta").fill("luka@example.test");
    await page.getByLabel("Lozinka", { exact: true }).fill(SEED_PASSWORD);
    await page.getByRole("button", { name: "Prijavi se" }).click();
    await expect(page).toHaveURL(/\/settings\/security$/);
  });

  test("an unverified account cannot sign in", async ({ page }) => {
    const email = uniqueEmail("unverified");
    await page.goto("/sign-up");
    await page.getByLabel("Kako se zoveš?").fill("Test Osoba");
    await page.getByLabel("E-pošta").fill(email);
    await page.getByLabel("Lozinka", { exact: true }).fill("Nova-Lozinka-2026!");
    await page.getByLabel("Imam 18 ili više godina.").check();
    await page.getByRole("button", { name: "Napravi račun" }).click();
    await expect(page).toHaveURL(/\/check-email/);
    await signIn(page, email, "Nova-Lozinka-2026!");
    await expect(notice(page)).toContainText("Adresa još nije potvrđena");
  });
});

test.describe("sign-up, verification and reset", () => {
  test("creates an account, confirms the address by the emailed link, then resets the password", async ({
    page,
  }) => {
    const email = uniqueEmail("new");
    const t0 = Date.now();
    await page.goto("/sign-up");
    await expectNoAxeViolations(page);

    // Password policy feedback (D-061) appears as one line while typing.
    const pw = page.getByLabel("Lozinka", { exact: true });
    await pw.fill("kratka");
    await expect(page.getByText(/Lozinci još treba/)).toBeVisible();
    await pw.fill("Nova-Lozinka-2026!");
    await expect(page.getByText("Lozinka zadovoljava sva pravila.")).toBeVisible();

    await page.getByLabel("Kako se zoveš?").fill("Nova Osoba");
    await page.getByLabel("E-pošta").fill(email);
    await page.getByLabel("Imam 18 ili više godina.").check();
    await page.getByRole("button", { name: "Napravi račun" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Provjeri e-poštu");

    const mail = await lastMailTo(email, t0);
    expect(mail.subject).toContain("potvrdi adresu");
    await page.goto(firstLink(mail));
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Adresa je potvrđena");

    await signIn(page, email, "Nova-Lozinka-2026!");
    await expect(page).toHaveURL(/\/home$/);
    await page.getByRole("button", { name: "Odjavi se" }).click();

    // Reset: the "sent" page is neutral; the link sets a new password; the old one stops working.
    const t1 = Date.now();
    await page.goto("/reset");
    await page.getByLabel("E-pošta").fill(email);
    await page.getByRole("button", { name: "Pošalji poveznicu" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Provjeri e-poštu");
    const reset = await lastMailTo(email, t1);
    await page.goto(firstLink(reset));
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Postavi novu lozinku");
    await page.getByLabel("Nova lozinka").fill("Druga-Lozinka-2026!");
    await page.getByRole("button", { name: "Spremi lozinku" }).click();
    await expect(page).toHaveURL(/\/sign-in\?reset=1$/);
    await expect(notice(page)).toContainText("Lozinka je promijenjena");

    await signIn(page, email, "Nova-Lozinka-2026!");
    await expect(notice(page)).toContainText("nisu točni");
    await signIn(page, email, "Druga-Lozinka-2026!");
    await expect(page).toHaveURL(/\/home$/);

    // A used reset link cannot be used again (R-08).
    await page.getByRole("button", { name: "Odjavi se" }).click();
    await page.goto(firstLink(reset));
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Ova poveznica više ne vrijedi",
    );
  });

  test("the sent page looks the same for an unknown address", async ({ page }) => {
    await page.goto("/reset");
    await page.getByLabel("E-pošta").fill("nobody-" + Date.now() + "@example.test");
    await page.getByRole("button", { name: "Pošalji poveznicu" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Provjeri e-poštu");
  });

  test("rejects a breached password at sign-up", async ({ page }) => {
    // "Password123!" is in the HIBP corpus. If the API is unreachable the check fails open (D-054),
    // so this test is skipped when the sign-up succeeds without an error.
    await page.goto("/sign-up");
    await page.getByLabel("Kako se zoveš?").fill("Test");
    await page.getByLabel("E-pošta").fill(uniqueEmail("hibp"));
    await page.getByLabel("Lozinka", { exact: true }).fill("Password123!");
    await page.getByLabel("Imam 18 ili više godina.").check();
    await page.getByRole("button", { name: "Napravi račun" }).click();
    const err = page.getByText(/curenjima podataka/);
    const sent = page.getByRole("heading", { level: 1, name: "Provjeri e-poštu" });
    await expect(err.or(sent)).toBeVisible();
    test.skip(await sent.isVisible(), "HIBP unreachable: fail-open (D-054)");
  });
});

test.describe("lockout (D-077)", () => {
  test("five wrong passwords lock the pair for 15 minutes", async ({ page }) => {
    // A fresh account per run: the lock stages grow with every lock and would outlive a rerun.
    const email = uniqueEmail("lock");
    const t0 = Date.now();
    await page.goto("/sign-up");
    await page.getByLabel("Kako se zoveš?").fill("Zaključana Osoba");
    await page.getByLabel("E-pošta").fill(email);
    await page.getByLabel("Lozinka", { exact: true }).fill("Prava-Lozinka-2026!");
    await page.getByLabel("Imam 18 ili više godina.").check();
    await page.getByRole("button", { name: "Napravi račun" }).click();
    await page.goto(firstLink(await lastMailTo(email, t0)));

    for (let i = 0; i < 5; i++) {
      await signIn(page, email, `Kriva-Lozinka-${i}!`);
      await expect(notice(page)).toBeVisible();
      await page.waitForTimeout(400); // under the 10-per-minute rate limit on /sign-in/email
    }
    await signIn(page, email, "Prava-Lozinka-2026!");
    await expect(notice(page)).toContainText("Previše pokušaja prijave");
  });
});

test.describe("sessions and two-factor", () => {
  test("lists devices, changes the password and signs other devices out (D-072)", async ({
    browser,
    page,
  }) => {
    const email = uniqueEmail("sess");
    const t0 = Date.now();
    await page.goto("/sign-up");
    await page.getByLabel("Kako se zoveš?").fill("Sesija Test");
    await page.getByLabel("E-pošta").fill(email);
    await page.getByLabel("Lozinka", { exact: true }).fill("Sesija-Lozinka-1!");
    await page.getByLabel("Imam 18 ili više godina.").check();
    await page.getByRole("button", { name: "Napravi račun" }).click();
    await page.goto(firstLink(await lastMailTo(email, t0)));

    // Two devices.
    await signIn(page, email, "Sesija-Lozinka-1!");
    const other = await browser.newContext();
    const otherPage = await other.newPage();
    await signIn(otherPage, email, "Sesija-Lozinka-1!");
    await expect(otherPage).toHaveURL(/\/home$/);

    await page.goto("/settings/security");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Sigurnost");
    await expect(page.getByText("Ovaj uređaj")).toBeVisible();
    await expect(page.getByRole("button", { name: "Odjavi", exact: true })).toHaveCount(1);
    await expectNoAxeViolations(page);

    await page.getByLabel("Trenutačna lozinka").fill("Sesija-Lozinka-1!");
    await page.getByLabel("Nova lozinka").fill("Sesija-Lozinka-2!");
    await expect(page.getByLabel("Odjavi sve druge uređaje")).toBeChecked();
    await page.getByRole("button", { name: "Promijeni lozinku" }).click();
    await expect(notice(page).getByText("Lozinka je promijenjena.").first()).toBeVisible();

    await otherPage.goto("/home");
    await expect(otherPage).toHaveURL(/\/sign-in/);
    await other.close();
  });

  test("enables TOTP with recovery codes; the second step is required at sign-in", async ({
    page,
  }) => {
    const email = uniqueEmail("totp");
    const t0 = Date.now();
    await page.goto("/sign-up");
    await page.getByLabel("Kako se zoveš?").fill("Dva Faktora");
    await page.getByLabel("E-pošta").fill(email);
    await page.getByLabel("Lozinka", { exact: true }).fill("Totp-Lozinka-2026!");
    await page.getByLabel("Imam 18 ili više godina.").check();
    await page.getByRole("button", { name: "Napravi račun" }).click();
    await page.goto(firstLink(await lastMailTo(email, t0)));
    await signIn(page, email, "Totp-Lozinka-2026!");

    await page.goto("/settings/security");
    await page.getByRole("button", { name: "Uključi" }).click();
    await page.getByLabel("Potvrdi lozinkom").fill("Totp-Lozinka-2026!");
    await page.getByRole("button", { name: "Uključi" }).click();
    await expect(page.getByRole("img", { name: "Ključ za ručni unos" })).toBeVisible();
    await page.getByText("Ključ za ručni unos", { exact: true }).click();
    const secret = (await page.locator("details .meta").textContent())?.trim() ?? "";
    expect(secret.length).toBeGreaterThan(10);
    await page.getByLabel("Kod (6 znamenki)").fill(totp(secret));
    await page.getByRole("button", { name: "Potvrdi" }).click();
    await expect(page.getByRole("heading", { name: "Kodovi za oporavak" })).toBeVisible();
    const codes = await page.locator(".code-list li").allTextContents();
    expect(codes).toHaveLength(10);
    await expectNoAxeViolations(page);

    await page.getByRole("button", { name: "Spremio sam kodove" }).click();
    await expect(page).toHaveURL(/\/settings\/security$/);
    await expect(page.getByText("Uključeno. Pri prijavi tražimo kod iz aplikacije.")).toBeVisible();
    await page.goto("/home");
    await page.getByRole("button", { name: "Odjavi se" }).click();

    // Sign-in now asks for the second step; a wrong code fails, the app code passes.
    await signIn(page, email, "Totp-Lozinka-2026!");
    await expect(page).toHaveURL(/\/sign-in\/second-step/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Još jedan korak");
    await expectNoAxeViolations(page);
    await page.getByLabel("Kod (6 znamenki)").fill("000000");
    await page.getByRole("button", { name: "Potvrdi" }).click();
    await expect(page.getByText("Kod nije točan")).toBeVisible();
    await page.getByLabel("Kod (6 znamenki)").fill(totp(secret).replace(/^(\d{3})/, "$1 "));
    await page.getByRole("button", { name: "Potvrdi" }).click();
    await expect(page).toHaveURL(/\/home$/);

    // A recovery code works once.
    await page.getByRole("button", { name: "Odjavi se" }).click();
    await signIn(page, email, "Totp-Lozinka-2026!");
    await page.getByRole("button", { name: /kod za oporavak/ }).click();
    await page.getByLabel("Kod za oporavak").fill(codes[0]!);
    await page.getByRole("button", { name: "Potvrdi" }).click();
    await expect(page).toHaveURL(/\/home$/);
    await page.getByRole("button", { name: "Odjavi se" }).click();
    await signIn(page, email, "Totp-Lozinka-2026!");
    await page.getByRole("button", { name: /kod za oporavak/ }).click();
    await page.getByLabel("Kod za oporavak").fill(codes[0]!);
    await page.getByRole("button", { name: "Potvrdi" }).click();
    await expect(page.getByText("Kod nije točan")).toBeVisible();
  });
});

test.describe("admin shell (4.9)", () => {
  test("a member cannot open /admin; staff without a second factor is told why", async ({
    page,
  }) => {
    await signIn(page, "ana@example.test");
    await page.goto("/admin");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Nemaš pristup");
    await page.goto("/home");
    await page.getByRole("button", { name: "Odjavi se" }).click();

    await signIn(page, "admin@example.test");
    await page.goto("/admin");
    await expect(notice(page)).toContainText("dvostruku provjeru");
    await expect(page.getByRole("link", { name: "Na postavke sigurnosti" })).toBeVisible();
  });
});
