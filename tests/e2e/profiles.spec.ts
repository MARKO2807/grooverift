import {
  expect,
  test,
  type Browser,
  type BrowserContextOptions,
  type Page,
} from "@playwright/test";
import { expectNoAxeViolations } from "./axe";
import {
  createAccountFromInvite,
  finishOnboarding,
  signIn,
  uniqueEmail,
  uniqueUsername,
} from "./helpers";

// Step 5.5: profiles, follow and people search (J4 E1–E11, D-074, D-069, D-093 (3)). Every test creates its own
// members through the real onboarding, so the phone and desktop runs never share state; two browser contexts
// stand in for two people.

const PASSWORD = "Nova-Lozinka-2026!";

type Member = { email: string; username: string; displayName: string };

async function makeMember(
  page: Page,
  prefix: string,
  opts: { visibility?: "Javno" | "Privatno"; displayName?: string } = {},
): Promise<Member> {
  const email = uniqueEmail(prefix);
  const username = uniqueUsername(prefix);
  const displayName = opts.displayName ?? `Test ${prefix}`;
  await createAccountFromInvite(page, email, PASSWORD);
  await finishOnboarding(page, { username, displayName, visibility: opts.visibility ?? "Javno" });
  return { email, username, displayName };
}

/** A second person in their own context (same device options as the test's project). */
async function secondPerson(browser: Browser, contextOptions: BrowserContextOptions) {
  const context = await browser.newContext(contextOptions);
  return { context, page: await context.newPage() };
}

const toast = (page: Page, text: string | RegExp) =>
  page.getByRole("status").filter({ hasText: text }).first();
const relation = (page: Page, name: string | RegExp) =>
  page.getByRole("button", { name, exact: typeof name === "string" });

test.describe("profiles and following (J4)", () => {
  test("public profile: follow, the chips, counts and lists, mutual, unfollow with confirmation", async ({
    page,
    browser,
    contextOptions,
  }) => {
    test.slow();
    const a = await makeMember(page, "pa", { displayName: "Ana Dugačkoprezime" });
    const other = await secondPerson(browser, contextOptions);
    const b = await makeMember(other.page, "pb");

    // B opens A: Follow acts at once on a public profile (D-013).
    await other.page.goto(`/@${a.username}`);
    await expect(other.page.getByRole("heading", { level: 1 })).toHaveText(a.displayName);
    await expect(other.page.getByText("Javni profil")).toHaveCount(0); // only the owner sees that line
    await expectNoAxeViolations(other.page);
    await relation(other.page, "Prati").click();
    await expect(relation(other.page, /^Pratiš/)).toBeVisible();
    await expect(toast(other.page, `Pratiš @${a.username}`)).toBeVisible();
    await expect(other.page.getByRole("link", { name: /^1\s*pratitelj$/ })).toBeVisible();

    // B's own following list names A with the same button; A's followers list names B.
    await other.page.goto(`/@${b.username}/following`);
    await expect(other.page.getByRole("link", { name: /Prati\s*1/ })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(other.page.getByRole("link", { name: new RegExp(a.displayName) })).toBeVisible();
    await expectNoAxeViolations(other.page);

    // A sees "Prati te" by B's name; following back makes a Mutual, shown as "Povezani" (D-074 (2)).
    await page.goto(`/@${b.username}`);
    await expect(page.getByText("Prati te")).toBeVisible();
    await relation(page, "Prati").click();
    await expect(page.getByText("Povezani")).toBeVisible();
    await expect(relation(page, /^Pratiš, povezani/)).toBeVisible();
    await expectNoAxeViolations(page);

    // Unfollow is a confirmed action; the chip goes away for both (E7).
    await relation(page, /^Pratiš, povezani/).click();
    const dialog = page.getByRole("dialog");
    await expect(
      dialog.getByRole("heading", { name: `Prestati pratiti @${b.username}?` }),
    ).toBeVisible();
    await dialog.getByRole("button", { name: "Odustani" }).click();
    await expect(dialog).toHaveCount(0);
    await expect(relation(page, /^Pratiš, povezani/)).toBeVisible();
    await relation(page, /^Pratiš, povezani/).click();
    await page.getByRole("dialog").getByRole("button", { name: "Prestani pratiti" }).click();
    await expect(relation(page, "Prati")).toBeVisible();
    await expect(page.getByText("Povezani")).toHaveCount(0);
    await expect(page.getByText("Prati te")).toBeVisible();
    await other.context.close();
  });

  test("private profile: request, cancel (E5), accept, remove follower (E2), decline and the seven-day wait (E6)", async ({
    page,
    browser,
    contextOptions,
  }) => {
    test.slow();
    const owner = await makeMember(page, "po", { visibility: "Privatno" });
    const other = await secondPerson(browser, contextOptions);
    const req = await makeMember(other.page, "pr");

    // The P state: header and bio, "Request to follow", no sections, no counts (D-074 (3)).
    await other.page.goto(`/@${owner.username}`);
    await expect(other.page.getByText("Ovaj profil je privatan.")).toBeVisible();
    await expect(other.page.getByRole("heading", { name: "Music DNA" })).toHaveCount(0);
    await expect(other.page.getByRole("link", { name: /pratitelj/ })).toHaveCount(0);
    await expectNoAxeViolations(other.page);
    await relation(other.page, "Zatraži praćenje").click();
    await expect(relation(other.page, /^Zatraženo/)).toBeVisible();

    // E5: the requester cancels through a confirmation; the owner's requests screen is empty.
    await relation(other.page, /^Zatraženo/).click();
    await other.page.getByRole("dialog").getByRole("button", { name: "Povuci zahtjev" }).click();
    await expect(relation(other.page, "Zatraži praćenje")).toBeVisible();
    await page.goto("/activity/requests");
    await expect(page.getByText("Nema novih zahtjeva.")).toBeVisible();
    await expectNoAxeViolations(page);

    // A new request shows on Activity with its count and on ACT-02; accepting follows at once.
    await relation(other.page, "Zatraži praćenje").click();
    await expect(relation(other.page, /^Zatraženo/)).toBeVisible();
    await page.goto("/activity");
    await expect(page.getByRole("link", { name: /Zahtjevi za praćenje/ })).toContainText("1 osoba");
    await page.getByRole("link", { name: /Zahtjevi za praćenje/ }).click();
    await expect(page).toHaveURL(/\/activity\/requests$/);
    await expect(page.getByRole("link", { name: new RegExp(req.displayName) })).toBeVisible();
    await expectNoAxeViolations(page);
    await page.getByRole("button", { name: "Prihvati" }).click();
    await expect(page.locator(".req-done")).toContainText(
      `Prihvaćeno. ${req.displayName} te sada prati.`,
    );
    await other.page.reload();
    await expect(relation(other.page, /^Pratiš/)).toBeVisible();
    await expect(other.page.getByText("Ovaj profil je privatan.")).toHaveCount(0);
    // The owner skipped Music DNA in onboarding, so that section stays "only me" (D-034); the history opens.
    await expect(other.page.getByRole("heading", { name: "Daily Drop odgovori" })).toBeVisible();
    await expect(other.page.getByRole("link", { name: /^1\s*pratitelj$/ })).toBeVisible();

    // E2: the owner removes the follower from the own followers list (⋯ → confirm); no notification.
    await page.goto(`/@${owner.username}/followers`);
    await expect(page.getByText("pratitelja možeš ukloniti bez blokiranja")).toBeVisible();
    await page.getByRole("button", { name: `Više opcija: ${req.displayName}` }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Ukloni pratitelja" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Ukloni" }).click();
    await expect(toast(page, "Uklonjeno iz pratitelja.")).toBeVisible();
    await expect(page.getByRole("link", { name: new RegExp(req.displayName) })).toHaveCount(0);
    await other.page.reload();
    await expect(relation(other.page, "Zatraži praćenje")).toBeVisible();
    await expect(other.page.getByText("Ovaj profil je privatan.")).toBeVisible();

    // Decline: the requester's button simply returns to "Request"; a new request waits seven days (E6).
    await relation(other.page, "Zatraži praćenje").click();
    await expect(relation(other.page, /^Zatraženo/)).toBeVisible();
    await page.goto("/activity/requests");
    await page.getByRole("button", { name: "Odbij" }).click();
    await expect(page.getByText("Nema novih zahtjeva.")).toBeVisible();
    await other.page.reload();
    await expect(relation(other.page, "Zatraži praćenje")).toBeVisible();
    await relation(other.page, "Zatraži praćenje").click();
    await expect(toast(other.page, "Zahtjev je nedavno poslan.")).toBeVisible();
    await expect(relation(other.page, "Zatraži praćenje")).toBeVisible();
    await other.context.close();
  });

  test("block (E1) and the blocker's view with Unblock; the blocked side sees 'not available'", async ({
    page,
    browser,
    contextOptions,
  }) => {
    test.slow();
    const owner = await makeMember(page, "pk", { visibility: "Privatno" });
    const other = await secondPerson(browser, contextOptions);
    const req = await makeMember(other.page, "pq");
    await other.page.goto(`/@${owner.username}`);
    await relation(other.page, "Zatraži praćenje").click();
    await expect(relation(other.page, /^Zatraženo/)).toBeVisible();

    // The owner blocks from the ⋯ menu on the requester's profile, with the facts in the confirmation (D-075).
    await page.goto(`/@${req.username}`);
    await page.getByRole("button", { name: `Više opcija: profil ${req.displayName}` }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Blokiraj" }).click();
    const confirm = page.getByRole("dialog");
    await expect(confirm.getByText("Praćenja i zahtjevi između vas se uklanjaju")).toBeVisible();
    await confirm.getByRole("button", { name: "Blokiraj" }).click();
    await expect(toast(page, `@${req.username} je na popisu blokiranih`)).toBeVisible();

    // E1: the pending request is gone; the blocked side gets SYS-01 with 404 and finds nothing in search.
    await page.goto("/activity/requests");
    await expect(page.getByText("Nema novih zahtjeva.")).toBeVisible();
    const res = await other.page.goto(`/@${owner.username}`);
    expect(res?.status()).toBe(404);
    await expect(other.page.getByRole("heading", { level: 1 })).toHaveText(
      "Ova stranica nije dostupna",
    );
    await other.page.goto(`/search?q=${owner.username}`);
    await expect(other.page.getByRole("heading", { level: 2 })).toBeVisible(); // results rendered
    await expect(
      other.page.getByRole("link", { name: new RegExp(`@${owner.username}`) }),
    ).toHaveCount(0);

    // The blocker sees their own block state and can undo it (D-019); follows do not come back.
    await page.goto(`/@${req.username}`);
    await expect(page.getByText("Ovaj račun je na tvom popisu blokiranih")).toBeVisible();
    await expectNoAxeViolations(page);
    await page.getByRole("button", { name: "Odblokiraj" }).click();
    await expect(toast(page, "Blokada je uklonjena.")).toBeVisible();
    await expect(relation(page, "Prati")).toBeVisible();
    await other.page.goto(`/@${owner.username}`);
    await expect(relation(other.page, "Zatraži praćenje")).toBeVisible();
    await other.context.close();
  });

  test("privacy settings (E3 with JO5, E4), edit profile and the username change (E10)", async ({
    page,
    browser,
    contextOptions,
  }) => {
    test.slow();
    const owner = await makeMember(page, "ps", { visibility: "Privatno" });
    const other = await secondPerson(browser, contextOptions);
    await makeMember(other.page, "pt");
    await other.page.goto(`/@${owner.username}`);
    await relation(other.page, "Zatraži praćenje").click();
    await expect(relation(other.page, /^Zatraženo/)).toBeVisible();

    // E3 / JO5: switching to public shows the pending count first; Continue accepts them.
    await page.goto("/settings/privacy");
    await expectNoAxeViolations(page);
    await page.getByRole("button", { name: /Vidljivost profila/ }).click();
    const sheet = page.getByRole("dialog");
    await sheet.getByLabel("Javno").check();
    await sheet.getByRole("button", { name: "Spremi" }).click();
    await expect(sheet.getByText("1 zahtjev čeka")).toBeVisible();
    await sheet.getByRole("button", { name: "Nastavi i prihvati" }).click();
    await expect(toast(page, "Profil je javan, 1 zahtjev je prihvaćen")).toBeVisible();
    await expect(page.getByRole("button", { name: /Vidljivost profila/ })).toContainText("Javno");
    await other.page.reload();
    await expect(relation(other.page, /^Pratiš/)).toBeVisible();

    // E4: back to private keeps the follower; the section audience sheet works the same way.
    await page.getByRole("button", { name: /Vidljivost profila/ }).click();
    await page.getByRole("dialog").getByLabel("Privatno").check();
    await page.getByRole("dialog").getByRole("button", { name: "Spremi" }).click();
    await expect(toast(page, "Profil je Privatno")).toBeVisible();
    await page.getByRole("button", { name: /Music DNA/ }).click();
    await page.getByRole("dialog").getByLabel("Samo ja").check();
    await page.getByRole("dialog").getByRole("button", { name: "Spremi" }).click();
    await expect(page.getByRole("button", { name: /Music DNA/ })).toContainText("Samo ja");
    await other.page.reload();
    await expect(relation(other.page, /^Pratiš/)).toBeVisible();
    await expect(other.page.getByRole("heading", { name: "Music DNA" })).toHaveCount(0);
    await expect(other.page.getByRole("heading", { name: "Daily Drop odgovori" })).toBeVisible();

    // PROF-08: display name and bio; the own profile shows them with the audience lines.
    await page.goto("/settings/profile");
    // axe with the page scrolled to its end: the fixed phone tab bar must not sit over a field (target-size).
    await page.getByRole("button", { name: "Promijeni korisničko ime" }).scrollIntoViewIfNeeded();
    await expectNoAxeViolations(page);
    await page.getByLabel("Ime za prikaz").fill("Novo Ime");
    await page.getByLabel(/^Bio/).fill("Slušam sve, osim kad spavam.");
    await page.getByRole("button", { name: "Spremi" }).click();
    await expect(page.getByText("Spremljeno.")).toBeVisible();
    await page.goto("/me");
    await expect(page).toHaveURL(new RegExp(`/@${owner.username}$`));
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Novo Ime");
    await expect(page.getByText("Slušam sve, osim kad spavam.")).toBeVisible();
    await expect(page.getByText("Privatni profil")).toBeVisible();
    await expectNoAxeViolations(page);

    // E10: the new handle is live at once; the old URL answers "not available"; a second change must wait.
    const renamed = uniqueUsername("pn");
    await page.goto("/settings/profile");
    await page.getByLabel("Novo korisničko ime").fill(renamed);
    await page.getByRole("button", { name: "Promijeni korisničko ime" }).click();
    await expect(page.getByText(`Tvoj profil je sada na @${renamed}.`)).toBeVisible();
    await expect(page.getByText("Sljedeća promjena moguća je od")).toBeVisible();
    const old = await other.page.goto(`/@${owner.username}`);
    expect(old?.status()).toBe(404);
    await other.page.goto(`/@${renamed}`);
    await expect(other.page.getByRole("heading", { level: 1 })).toHaveText("Novo Ime");
    await expect(relation(other.page, /^Pratiš/)).toBeVisible();
    await page.getByLabel("Novo korisničko ime").fill(uniqueUsername("px"));
    await page.getByRole("button", { name: "Promijeni korisničko ime" }).click();
    await expect(page.getByText("najviše jednom u 30 dana")).toBeVisible();
    await other.context.close();
  });

  test("people search finds members by name or @username without diacritics (DISC-05 α)", async ({
    page,
  }) => {
    test.slow();
    await makeMember(page, "pz");
    await page.goto("/me");
    await page.getByRole("searchbox", { name: "Pronađi ljude" }).fill("Ana Slusa");
    await page.getByRole("button", { name: "Traži" }).click();
    await expect(page).toHaveURL(/\/search\?q=Ana\+Slusa$/);
    await expect(page.getByRole("link", { name: /Ana Sluša/ })).toBeVisible();
    await expectNoAxeViolations(page);
    await page.goto("/search?q=@mia");
    await expect(page.getByRole("link", { name: /Mia Mono/ })).toBeVisible(); // private: listed, P state when opened
    await expect(page.getByRole("button", { name: "Zatraži praćenje" })).toBeVisible();
    await page.goto("/search?q=x");
    await expect(page.getByText("Upiši barem 2 znaka.")).toBeVisible();
    await page.goto("/search?q=nitkotakav");
    await expect(page.getByText("Nitko s tim imenom.")).toBeVisible();
  });
});

test.describe("PUB-08: the minimal public profile for visitors", () => {
  test("a public profile shows the header only; a private one is 'not available' (U-02)", async ({
    page,
  }) => {
    await page.goto("/@ana");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Ana Sluša");
    await expect(page.getByText("@ana")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Music DNA" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: /pratitelj/ })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Prijavi se" }).first()).toBeVisible();
    await expectNoAxeViolations(page);
    const res = await page.goto("/@mia");
    expect(res?.status()).toBe(404);
    const list = await page.goto("/@ana/followers");
    expect(list?.status()).toBe(404);
  });

  test("the Profile tab lands on the own profile and the old /me keeps working as its entry", async ({
    page,
  }) => {
    await signIn(page, "luka@example.test");
    await page.goto("/me");
    await expect(page).toHaveURL(/\/@luka$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Luka Bas");
    await expect(page.getByRole("link", { name: "Uredi profil" })).toHaveAttribute(
      "href",
      /\/settings\/profile$/,
    );
    await expect(
      page
        .getByRole("navigation", { name: "Glavna navigacija" })
        .getByRole("link", { name: "Profil" }),
    ).toHaveAttribute("aria-current", "page");
  });
});
