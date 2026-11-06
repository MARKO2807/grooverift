import { test, expect, type Browser, type Page } from "@playwright/test";
import { expectNoAxeViolations } from "./axe";
import {
  caseIdFor,
  closeCasesFor,
  insertAnswer,
  insertEnforcement,
  insertMember,
  publishTestQuestion,
  removeMembers,
  removeQuestions,
  setRole,
  userIdOf,
  usernameOf,
} from "./db";
import { newMember, totp } from "./helpers";

// Step 5.9: member safety and moderation in the browser (J5, D-075; plan row 5.9 acceptance): report → block →
// both sides' views; the moderator's decision; the reported member's statement of reasons and appeal; the
// reporter never named on any page the reported member can open; mute with the chip and SAFE-08; the SAFE-07
// screens. Decided cases stay in the development database (evidence_access is append-only and keeps them); they
// sit in "Odlučeno", never in the open queue.

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

async function memberPage(browser: Browser, prefix: string, password?: string) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const email = await newMember(page, prefix, password);
  return { ctx, page, email, username: await usernameOf(email) };
}

const questions: string[] = [];
const fictional: string[] = [];
const reported: string[] = [];
test.afterAll(async () => {
  // Each step on its own, so one failure never leaves test questions on Home for the other specs.
  await closeCasesFor(reported).catch(() => {});
  await removeQuestions(questions);
  await removeMembers(fictional);
});

test.describe("report, block and the moderation decision (J5)", () => {
  test("report → block → both sides; the decision reaches the member with reasons and an appeal; the reporter is never named", async ({
    browser,
  }) => {
    test.slow(); // three onboarded people and a second factor
    const q = await publishTestQuestion(`Koji ti album najviše znači? ${Date.now()}`);
    questions.push(q.id);
    const author = await memberPage(browser, "sauth");
    const reporter = await memberPage(browser, "srep");
    const body = `Sporan odgovor ${Date.now()}`;
    const answerId = await insertAnswer(author.email, q.id, body);
    reported.push(answerId);

    // SAFE-01: the reporter opens ⋯ on the answer and reports it in three steps.
    const r = reporter.page;
    await r.goto(`/drop/${q.date}`);
    const card = r.locator("article.ans").filter({ hasText: body });
    await card.getByRole("button", { name: /Više opcija za odgovor/ }).click();
    await r.getByRole("button", { name: "Prijavi odgovor" }).click();
    await expect(r.getByText("Prijava · korak 1 od 3")).toBeVisible();
    await expectNoAxeViolations(r);
    await r.getByRole("button", { name: "Nastavi" }).click();
    await expect(r.getByRole("dialog").getByRole("alert")).toContainText(
      "Odaberi što nije u redu.",
    );
    await r.getByText("Spam ili prijevara", { exact: true }).click();
    await r.getByRole("button", { name: "Nastavi" }).click();
    await expect(r.getByText("Prijava · korak 2 od 3")).toBeVisible();
    await expect(r.getByText(`Odgovor @${author.username}`)).toBeVisible();
    await r.getByLabel(/Detalji/).fill("Poveznica na piratsku kopiju.");
    await r.getByRole("button", { name: "Pošalji prijavu" }).click();
    await expect(r.getByText("Prijava je primljena.")).toBeVisible();

    // From the last step: block, with the facts and the confirmation (SAFE-02).
    await r.getByRole("button", { name: `Blokiraj @${author.username}` }).click();
    await expect(r.getByText("Praćenje prestaje u oba smjera, a zahtjevi se brišu.")).toBeVisible();
    await r.getByRole("button", { name: "Blokiraj", exact: true }).click();
    await expect(r.getByRole("status")).toContainText(`Blokirano. @${author.username}`);
    await r.reload();
    await expect(r.getByText(body)).toHaveCount(0);

    // The other side: the reporter's profile is "not available" to the blocked author (D-019).
    await author.page.goto(`/@${reporter.username}`);
    await expect(author.page.getByRole("heading", { level: 1 })).toHaveText(
      "Ova stranica nije dostupna",
    );

    // SAFE-04: the reporter sees the status of the report.
    await r.goto("/settings/status/reports");
    await expect(r.getByText("Spam ili prijevara")).toBeVisible();
    await expectNoAxeViolations(r);

    // ADM-10: a fictional admin (the "Marko Admin" rule: never the owner's accounts) decides.
    const staffPassword = "Moderator-Lozinka-2026!";
    const staff = await memberPage(browser, "sadm", staffPassword);
    await setRole(staff.email, "admin");
    await enableTwoFactor(staff.page, staffPassword);
    const s = staff.page;
    await s.goto("/admin/moderation");
    await expect(s.getByRole("heading", { level: 2, name: "Moderacija" })).toBeVisible();
    // On the phone, rows scrolled under the fixed tab bar count as covered targets for axe (target-size); the
    // queue is checked at the desktop size, the case page below at both.
    if ((s.viewportSize()?.width ?? 0) >= 600) await expectNoAxeViolations(s);
    await s.goto("/admin/moderation");
    const caseId = await caseIdFor(answerId);
    await s.locator(`a[href$="/admin/moderation/cases/${caseId}"]`).click();
    await expect(s.getByText(body)).toBeVisible();
    await expect(s.getByText("Prijavitelji se ne prikazuju ni moderatorima.")).toBeVisible();
    await expect(s.locator("main")).not.toContainText(reporter.username);
    await s.getByText("Poduzmi mjeru").click();
    await s.getByLabel("Mjera").selectOption("warning");
    await s.getByLabel("Pravilo").selectOption("spam");
    await s.getByLabel("Obrazloženje za člana").fill("Odgovor vodi na piratsku kopiju albuma.");
    await expectNoAxeViolations(s);
    await s.getByRole("button", { name: "Donesi odluku" }).click();
    await expect(s.getByText("Poduzete mjere").first()).toBeVisible();

    // SAFE-05: the author reads the decision from Activity, with the labelled sections and no reporter.
    const a = author.page;
    await a.goto("/activity");
    await a.getByRole("link", { name: /Odluka moderacije/ }).click();
    await expect(a.getByRole("heading", { level: 2 })).toHaveText(
      "Odgovor je uklonjen, uz upozorenje",
    );
    for (const label of ["Što", "Pravilo", "Odluka", "Kako je odlučeno", "Žalba"])
      await expect(a.locator("dt", { hasText: new RegExp(`^${label}$`) })).toBeVisible();
    await expect(a.getByText("Tko je prijavio, ne otkrivamo.", { exact: false })).toBeVisible();
    const html = await a.content();
    expect(html).not.toContain(reporter.username);
    expect(html).not.toContain(reporter.email);
    expect(html).not.toContain(await userIdOf(reporter.email));
    await expectNoAxeViolations(a);

    // SAFE-06: the basic appeal.
    await a
      .getByLabel("Zašto misliš da je odluka pogrešna?")
      .fill("Poveznica je bila na službeni izvor.");
    await a.getByRole("button", { name: "Pošalji žalbu" }).click();
    await expect(a.getByText(/Žalba je poslana/).first()).toBeVisible();

    // The reporter learns only that action was taken.
    await r.goto("/settings/status/reports");
    await r.locator(".set-link").filter({ hasText: "Spam ili prijevara" }).first().click();
    await expect(r.getByText("Poduzete su mjere").first()).toBeVisible();

    for (const p of [author, reporter, staff]) await p.ctx.close();
  });
});

test.describe("mute and the lists (SAFE-03, SAFE-08)", () => {
  test("mute asks first, shows the quiet chip only to the viewer, and is undone from Settings", async ({
    page,
  }) => {
    test.slow();
    const target = await insertMember("smute");
    fictional.push(target.id);
    await newMember(page, "smuter");
    await page.goto(`/@${target.username}`);
    await page.getByRole("button", { name: /Više opcija: profil/ }).click();
    await page.getByRole("button", { name: `Utišaj @${target.username}` }).click();
    await expect(page.getByRole("heading", { name: `Utišati @${target.username}?` })).toBeVisible();
    await page.getByRole("button", { name: "Utišaj", exact: true }).click();
    await expect(page.getByRole("status")).toContainText("Ta osoba to ne zna.");
    await expect(page.getByText("Utišano, vidiš samo ti")).toBeAttached();

    await page.goto("/settings/blocked");
    await expect(page.locator(".bl-row .set-d", { hasText: `@${target.username}` })).toBeVisible();
    await expectNoAxeViolations(page);
    await page.getByRole("button", { name: `Poništi utišavanje @${target.username}` }).click();
    await expect(page.getByRole("status")).toContainText("Utišavanje je poništeno.");
    await page.goto(`/@${target.username}`);
    await expect(page.getByText("Utišano, vidiš samo ti")).toHaveCount(0);
  });
});

test.describe("restriction and suspension screens (SAFE-07)", () => {
  test("a restriction shows once with Nastavi, then only where posting happens", async ({
    page,
  }) => {
    test.slow();
    const q = await publishTestQuestion(`Prva ploča koju si kupio? ${Date.now()}`);
    questions.push(q.id);
    const email = await newMember(page, "srst");
    await insertEnforcement(await userIdOf(email), "restriction", 3, "Ponovljeno vrijeđanje.");
    await page.goto("/home");
    await expect(page).toHaveURL(/\/account-status/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Objavljivanje je ograničeno do",
    );
    await expectNoAxeViolations(page);
    await page.getByRole("button", { name: "Nastavi" }).click();
    await expect(page).toHaveURL(/\/home$/);
    await page.goto(`/drop/${q.date}`);
    await expect(page.locator(".rst-hint")).toContainText("Objavljivanje je ograničeno do");
    await page.locator(".rst-hint").getByRole("link", { name: "Zašto?" }).click();
    await expect(page.getByText("Ponovljeno vrijeđanje.")).toBeVisible();
  });

  test("a suspension is a full screen with the reasons and the appeal, and no way into the app", async ({
    page,
  }) => {
    test.slow();
    const email = await newMember(page, "ssus");
    await insertEnforcement(await userIdOf(email), "suspension", 7, "Prijetnja drugom članu.");
    await page.goto("/hub");
    await expect(page).toHaveURL(/\/account-status/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Račun je suspendiran do");
    await expect(page.getByText("Prijetnja drugom članu.")).toBeVisible();
    await expectNoAxeViolations(page);
    await page.goto("/settings/status");
    await expect(page).toHaveURL(/\/account-status/);
    await page
      .getByLabel("Zašto misliš da je odluka pogrešna?")
      .fill("Bila je to šala među prijateljima.");
    await page.getByRole("button", { name: "Pošalji žalbu" }).click();
    await expect(page.getByText(/Žalba je poslana/).first()).toBeVisible();
    await page.getByRole("button", { name: "Odjavi se" }).click();
    await expect(page).not.toHaveURL(/\/account-status/);
  });
});
