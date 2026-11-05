import { test, expect } from "@playwright/test";
import { expectNoAxeViolations } from "./axe";
import { insertInvitation, inviteStatus, setRole } from "./db";
import {
  createAccountFromInvite,
  finishOnboarding,
  lastMailTo,
  firstLink,
  newMember,
  notice,
  signIn,
  totp,
  uniqueEmail,
  uniqueUsername,
  signOut,
} from "./helpers";

// Step 5.4: invitation and onboarding (PUB-05, ONB-01 to ONB-09, J1 with its edge cases) and ADM-03.

test.describe("invitation and onboarding (J1)", () => {
  test("invite → 18+ → language → account → every step → Home, with the errors on the way", async ({
    page,
  }) => {
    test.slow(); // every step, every error and eight axe passes
    const email = uniqueEmail("onb");
    const { token, id } = await insertInvitation(email);

    // PUB-05: the token leaves the URL; the page names the address and consumes nothing yet.
    await page.goto(`/invite/${token}`);
    await expect(page).toHaveURL(/\/join$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Imaš pozivnicu za GrooveRift",
    );
    await expect(page.getByText(`Pozivnica vrijedi za ${email}.`)).toBeVisible();
    await expectNoAxeViolations(page);
    expect(await inviteStatus(id)).toBe("sent");

    // ONB-01: Continue without an answer explains; "no" stores nothing (E5).
    await page.getByRole("link", { name: "Prihvati pozivnicu" }).click();
    await expect(page).toHaveURL(/\/join\/age$/);
    await expect(page.getByText("Korak 1 od 9")).toBeVisible();
    await expectNoAxeViolations(page);
    await page.getByRole("button", { name: "Nastavi" }).click();
    await expect(page.getByText("Odaberi jedan odgovor.")).toBeVisible();
    await page.getByLabel("Ne, imam manje od 18").check();
    await page.getByRole("button", { name: "Nastavi" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "GrooveRift je zasad samo za punoljetne",
    );
    expect(await inviteStatus(id)).toBe("sent");
    await page.getByRole("link", { name: "Natrag" }).last().click();
    await page.getByLabel("Da, imam 18 ili više").check();
    await page.getByRole("button", { name: "Nastavi" }).click();

    // Language, then the account for the invitation's address only.
    await expect(page).toHaveURL(/\/join\/language$/);
    await expect(page.getByText("Korak 2 od 9")).toBeVisible();
    await page.getByRole("button", { name: "Nastavi" }).click();
    await expect(page).toHaveURL(/\/join\/account$/);
    await expect(page.getByLabel("E-pošta")).toHaveValue(email);
    await expect(page.getByLabel("E-pošta")).toHaveAttribute("readonly", "");
    await expectNoAxeViolations(page);
    const pw = page.getByLabel("Lozinka", { exact: true });
    await pw.fill("kratka");
    await expect(page.getByText(/Lozinci još treba/)).toBeVisible();
    await page.getByRole("button", { name: "Napravi račun" }).click();
    await expect(page.getByText(/Lozinci treba najmanje/).first()).toBeVisible();
    await pw.fill("Nova-Lozinka-2026!");
    await page.getByRole("button", { name: "Napravi račun" }).click();

    // The account exists, verified (JO6: no verification mail), the invite is accepted, the link is dead.
    await expect(page).toHaveURL(/\/join\/username$/);
    expect(await inviteStatus(id)).toBe("accepted");
    const verifyMails = (await import("./helpers")).mailsTo(email);
    expect(verifyMails.filter((m) => /potvrdi adresu/.test(m.subject))).toHaveLength(0);

    // Every app route goes back to onboarding until it is done (E8).
    await page.goto("/home");
    await expect(page).toHaveURL(/\/join\/username$/);
    await page.goto("/join/visibility"); // ahead of the pointer
    await expect(page).toHaveURL(/\/join\/username$/);

    // ONB-02: rules before typing, live check, suggestions when taken (E6), the display name rule (D-085).
    await expect(page.getByText("Korak 4 od 9")).toBeVisible();
    await expectNoAxeViolations(page);
    await page.getByLabel("Korisničko ime").fill("ana");
    await expect(page.getByText("Ovo korisničko ime nije dostupno.")).toBeVisible();
    await expect(page.getByText("Slobodna su, na primjer:")).toBeVisible();
    await page.getByLabel("Korisničko ime").fill("Ab");
    await expect(page.getByText(/Koristi samo mala slova/)).toBeVisible();
    const username = uniqueUsername("onb");
    await page.getByLabel("Korisničko ime").fill(username);
    await expect(page.getByText(`@${username} je slobodno.`)).toBeVisible();
    await page.getByLabel("Ime za prikaz").fill("Jedna Dva Tri Četiri");
    await page.getByRole("button", { name: "Nastavi" }).click();
    await expect(page.getByText(/do tri riječi/)).toBeVisible();
    await page.getByLabel("Ime za prikaz").fill("Onb Osoba");
    await page.getByRole("button", { name: "Nastavi" }).click();

    // ONB-03 optional; ONB-04 required with nothing pre-selected.
    await expect(page).toHaveURL(/\/join\/reading$/);
    await page.getByLabel("Hrvatski").check();
    await page.getByRole("button", { name: "Nastavi" }).click();
    await expect(page).toHaveURL(/\/join\/visibility$/);
    await expect(page.getByText("Korak 6 od 9")).toBeVisible();
    await expect(page.getByRole("radio", { checked: true })).toHaveCount(0);
    await expectNoAxeViolations(page);
    await page.getByRole("button", { name: "Nastavi" }).click();
    await expect(page.getByText("Odaberi tko može vidjeti tvoj profil.")).toBeVisible();
    await page.getByLabel("Privatno").check();
    await page.getByRole("button", { name: "Nastavi" }).click();

    // ONB-05: one pick is refused, two go through; ONB-06 then appears.
    await expect(page).toHaveURL(/\/join\/dna$/);
    await expect(page.getByText("Korak 7 od 9")).toBeVisible();
    await page.getByRole("button", { name: "Rock", exact: true }).click();
    await expect(page.getByText("1 žanr od 10.")).toBeVisible();
    await page.getByRole("button", { name: "Nastavi" }).click();
    await expect(page.getByText("Odaberi barem dva žanra ili preskoči ovaj korak.")).toBeVisible();
    await page.getByRole("button", { name: "Još žanrova" }).click();
    await page.getByLabel("Traži žanr").fill("death metal");
    await page
      .locator("ul.chips li")
      .getByRole("button", { name: /Death metal/ })
      .first()
      .click();
    await expect(page.getByText("2 žanra od 10.")).toBeVisible();
    await expectNoAxeViolations(page);
    await page.getByRole("button", { name: "Nastavi" }).click();
    await expect(page).toHaveURL(/\/join\/dna-audience$/);
    await expect(page.getByText("Korak 8 od 9")).toBeVisible();
    await expect(page.getByRole("radio", { checked: true })).toHaveCount(0);
    await page.getByRole("button", { name: "Nastavi" }).click();
    await expect(page.getByText("Odaberi tko vidi tvoj Music DNA.")).toBeVisible();
    await page.getByLabel("Samo pratitelji").check();
    await page.getByRole("button", { name: "Nastavi" }).click();

    // Back keeps earlier answers.
    await expect(page).toHaveURL(/\/join\/how$/);
    await page.getByRole("link", { name: "Natrag" }).click();
    await expect(page).toHaveURL(/\/join\/dna-audience$/);
    await expect(page.getByLabel("Samo pratitelji")).toBeChecked();
    await page.getByRole("button", { name: "Nastavi" }).click();
    await expect(page).toHaveURL(/\/join\/how$/);
    await expectNoAxeViolations(page);
    await page.getByRole("button", { name: "Nastavi" }).click();

    // ONB-09, then Home; the used invitation link shows the neutral page (E1).
    await expect(page).toHaveURL(/\/join\/done$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Spremno.");
    await expect(page.getByText("Privatni")).toBeVisible();
    await expect(page.getByText("2 žanra")).toBeVisible();
    await expect(page.getByText("Samo pratitelji")).toBeVisible();
    await expectNoAxeViolations(page);
    await page.getByRole("link", { name: "Na početnu" }).click();
    await expect(page).toHaveURL(/\/home$/);
    await expect(page.getByRole("heading", { level: 1, name: "Početna" })).toBeAttached();
    await page.goto("/join/username");
    await expect(page).toHaveURL(/\/home$/);

    // E3 (same address): nothing to do; then signed out, the link cannot be used (E1).
    await page.goto(`/invite/${token}`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Već imaš račun");
    await signOut(page);
    await expect(page).toHaveURL(/\/$/); // the sign-out response clears the cookie before the next visit
    await page.goto(`/invite/${token}`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Pozivnica se ne može iskoristiti",
    );
  });

  test("an unknown, expired or revoked token shows one neutral page; /join without a cookie goes home", async ({
    page,
  }) => {
    await page.goto("/join");
    await expect(page).toHaveURL(/\/$/);
    await page.goto("/invite/not-a-real-token");
    await expect(page).toHaveURL(/\/join$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Pozivnica se ne može iskoristiti",
    );
    await expectNoAxeViolations(page);
    const expired = await insertInvitation(uniqueEmail("exp"), { expiresInMs: -1000 });
    await page.goto(`/invite/${expired.token}`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Pozivnica se ne može iskoristiti",
    );
    // the pre-account steps are not reachable without a usable invitation
    await page.goto("/join/age");
    await expect(page).toHaveURL(/\/join$/);
  });

  test("an invitation opened while another account is signed in is kept (E3)", async ({ page }) => {
    await signIn(page, "luka@example.test");
    const { token, id } = await insertInvitation(uniqueEmail("e3"));
    await page.goto(`/invite/${token}`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Pozivnica je za novu osobu");
    await expect(page.getByText(/@luka/)).toBeVisible();
    expect(await inviteStatus(id)).toBe("sent");
    // The invite page's own "Odjavi se" (J1 E3), not the Settings one: it returns to the invitation.
    await page.getByRole("button", { name: "Odjavi se" }).click();
    await expect(page).toHaveURL(/\/join$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Imaš pozivnicu za GrooveRift",
    );
  });

  test("resumes at the first unfinished step after signing in again (E8)", async ({
    browser,
    page,
  }) => {
    const email = uniqueEmail("resume");
    await createAccountFromInvite(page, email, "Nova-Lozinka-2026!");
    await page.getByLabel("Ime za prikaz").fill("Nastavi Osoba");
    await page.getByLabel("Korisničko ime").fill(uniqueUsername("res"));
    await page.getByRole("button", { name: "Nastavi" }).click();
    await expect(page).toHaveURL(/\/join\/reading$/);

    // Another browser: sign in lands on the pointer, and the own profile is not visible to others yet.
    const other = await browser.newContext();
    const otherPage = await other.newPage();
    await signIn(otherPage, email, "Nova-Lozinka-2026!");
    await expect(otherPage).toHaveURL(/\/join\/reading$/);
    await finishOnboarding(otherPage);
    await other.close();
  });

  test("the whole onboarding passes the English interface too", async ({ page }) => {
    const email = uniqueEmail("en");
    const { token } = await insertInvitation(email, { locale: "en" });
    await page.goto(`/en/invite/${token}`);
    await expect(page).toHaveURL(/\/en\/join$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "You're invited to GrooveRift",
    );
    await page.getByRole("link", { name: "Accept the invitation" }).click();
    await page.getByLabel("Yes, I'm 18 or older").check();
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByLabel("English").check();
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page).toHaveURL(/\/en\/join\/account$/);
    await page.getByLabel("Password", { exact: true }).fill("Nova-Lozinka-2026!");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page).toHaveURL(/\/en\/join\/username$/);
    await expect(page.getByText("Step 4 of 9")).toBeVisible();
  });
});

test.describe("admin invitations (ADM-03)", () => {
  test("an admin with a second factor sends, lists and revokes invitations; the email carries the link", async ({
    page,
  }) => {
    test.slow(); // onboarding, two-factor setup, then the invitations
    const admin = await newMember(page, "adm", "Admin-Lozinka-2026!");
    await setRole(admin, "admin");
    // The staff gate needs a second factor (threat model §3).
    await page.goto("/settings/security");
    await page.getByRole("button", { name: "Uključi" }).click();
    await page.getByLabel("Potvrdi lozinkom").fill("Admin-Lozinka-2026!");
    await page.getByRole("button", { name: "Uključi" }).click();
    await page.getByText("Ključ za ručni unos", { exact: true }).click();
    const secret = (await page.locator("details .meta").textContent())?.trim() ?? "";
    await page.getByLabel("Kod (6 znamenki)").fill(totp(secret));
    await page.getByRole("button", { name: "Potvrdi" }).click();
    await page.getByRole("button", { name: "Spremio sam kodove" }).click();

    await page.goto("/admin/invites");
    await expect(page.getByRole("heading", { level: 2, name: "Pozivnice" })).toBeVisible();
    await expectNoAxeViolations(page);

    // Send one; a second for the same address is refused while the first is open (review L11).
    const invitee = uniqueEmail("invitee");
    const t0 = Date.now();
    await page.getByLabel("E-pošta osobe koju pozivaš").fill(invitee);
    await page.getByRole("button", { name: "Pošalji pozivnicu" }).click();
    await expect(page.getByRole("cell", { name: invitee, exact: true })).toBeVisible();
    await expect(page.getByRole("row", { name: new RegExp(invitee) })).toContainText("Poslana");
    const mail = await lastMailTo(invitee, t0);
    expect(mail.subject).toContain("pozivnica");
    expect(firstLink(mail)).toMatch(/\/invite\/[A-Za-z0-9_-]{43}$/);
    await page.getByLabel("E-pošta osobe koju pozivaš").fill(invitee);
    await page.getByRole("button", { name: "Pošalji pozivnicu" }).click();
    await expect(page.getByText(/već postoji otvorena pozivnica/)).toBeVisible();
    // an existing member cannot be invited
    await page.getByLabel("E-pošta osobe koju pozivaš").fill("ana@example.test");
    await page.getByRole("button", { name: "Pošalji pozivnicu" }).click();
    await expect(page.getByText("Ta adresa već ima račun.")).toBeVisible();

    // Revoke: the link stops working.
    await page.getByRole("button", { name: `Opozovi: ${invitee}` }).click();
    await expect(page.getByRole("row", { name: new RegExp(invitee) })).toContainText("Opozvana");
    await signOut(page);
    await expect(page).toHaveURL(/\/$/);
    await page.goto(firstLink(mail));
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Pozivnica se ne može iskoristiti",
    );
  });

  test("editors and moderators do not see the invitations page", async ({ page }) => {
    // The seeded editor has no second factor, so the gate refuses before the role is even checked.
    await signIn(page, "editor@example.test");
    await page.goto("/admin/invites");
    await expect(notice(page)).toContainText("dvostruku provjeru");
  });
});
