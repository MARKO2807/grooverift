import { test, expect } from "@playwright/test";
import { expectNoAxeViolations } from "./axe";
import {
  SEED_PASSWORD,
  createAccountFromInvite,
  firstLink,
  lastMailTo,
  newMember,
  notice,
  signIn,
  totp,
  uniqueEmail,
  signOut,
} from "./helpers";

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
    await expect(page.getByRole("heading", { level: 1, name: "Početna" })).toBeAttached();
    await expectNoAxeViolations(page);
    await signOut(page);
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

  test("there is no open sign-up: the old page is gone and sign-in says invitation only", async ({
    page,
  }) => {
    await page.goto("/sign-in");
    await expect(page.getByText("GrooveRift radi samo uz pozivnicu.")).toBeVisible();
    const res = await page.goto("/sign-up");
    expect(res?.status()).toBe(404);
  });

  test("a refused Google sign-in is explained, never shown as the raw code (J1 E4)", async ({
    page,
  }) => {
    await page.goto(
      "/sign-in?error=INVITE_EMAIL_MISMATCH&error_description=An+invitation+for+this+address+is+required.",
    );
    await expect(page.getByText("Za taj Google račun nema GrooveRift računa.")).toBeVisible();
    await expect(page.getByText("An invitation for this address")).toHaveCount(0);
    await page.goto("/sign-in?error=something_else");
    await expect(page.locator("main").getByText("Nešto je pošlo po zlu.")).toBeVisible();
  });
});

test.describe("password reset", () => {
  test("resets the password by the emailed link; the old password and the used link stop working", async ({
    page,
  }) => {
    const email = await newMember(page, "reset");
    await signOut(page);
    await expect(page).toHaveURL(/\/$/); // the sign-out response must land before the next visit

    // The "sent" page is neutral; the link sets a new password.
    const t1 = Date.now();
    await page.goto("/reset");
    await expectNoAxeViolations(page);
    await page.getByLabel("E-pošta").fill(email);
    await page.getByRole("button", { name: "Pošalji poveznicu" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Provjeri e-poštu");
    const reset = await lastMailTo(email, t1);
    expect(reset.subject).toContain("nova lozinka");
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
    await signOut(page);
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
});

test.describe("lockout (D-077)", () => {
  test("five wrong passwords lock the pair for 15 minutes", async ({ page }) => {
    // A fresh account per run: the lock stages grow with every lock and would outlive a rerun.
    const email = uniqueEmail("lock");
    await createAccountFromInvite(page, email, "Prava-Lozinka-2026!");
    await page.goto("/home"); // not onboarded: every app route goes to the next step (J1 E8)
    await expect(page).toHaveURL(/\/join\/username$/);
    await page.context().clearCookies(); // signed out mid-onboarding; sign-in still works and resumes

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
    const email = await newMember(page, "sess", "Sesija-Lozinka-1!");

    // Two devices.
    const other = await browser.newContext();
    const otherPage = await other.newPage();
    await signIn(otherPage, email, "Sesija-Lozinka-1!");
    await expect(otherPage).toHaveURL(/\/home$/);

    await page.goto("/settings/security");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Sigurnost");
    await expect(page.getByText("Ovaj uređaj")).toBeVisible();
    await expect(page.getByRole("button", { name: /^Odjavi: / })).toHaveCount(1);
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
    test.slow(); // onboarding, the setup, then four sign-ins
    const email = await newMember(page, "totp", "Totp-Lozinka-2026!");

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
    await signOut(page);

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
    await signOut(page);
    await signIn(page, email, "Totp-Lozinka-2026!");
    await page.getByRole("button", { name: /kod za oporavak/ }).click();
    await page.getByLabel("Kod za oporavak").fill(codes[0]!);
    await page.getByRole("button", { name: "Potvrdi" }).click();
    await expect(page).toHaveURL(/\/home$/);
    await signOut(page);
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
    await signOut(page);

    await signIn(page, "admin@example.test");
    await page.goto("/admin");
    await expect(notice(page)).toContainText("dvostruku provjeru");
    await expect(page.getByRole("link", { name: "Na postavke sigurnosti" })).toBeVisible();
  });
});
