// Step 5.7: the Daily Drop for members (J3) on the phone and the desktop. Each test publishes its own question on
// a free date in the 1980s (tests/e2e/db.ts), so the seeded reserve and the real calendar stay untouched and the
// two projects never share a question; everything is removed afterwards. Seeded members read and write; authors
// that get blocked are fictional members inserted for the test.
import { test, expect, type Page } from "@playwright/test";
import { expectNoAxeViolations } from "./axe";
import {
  insertAnswer,
  insertBlock,
  insertMember,
  insertQuestion,
  publishTestQuestion,
  publishedToday,
  removeMembers,
  removeQuestions,
  userIdOf,
} from "./db";
import { signIn } from "./helpers";

const questions: string[] = [];
const members: string[] = [];
test.afterAll(async () => {
  await removeQuestions(questions);
  await removeMembers(members);
});

async function published(text: string) {
  const q = await publishTestQuestion(text, `EN ${text}`);
  questions.push(q.id);
  return q;
}

const answers = (page: Page) => page.getByRole("list", { name: /^Odgovori/ });
const card = (page: Page, name: string) =>
  page.getByRole("article").filter({ has: page.getByRole("heading", { name: new RegExp(name) }) });

test.describe("Daily Drop question page (HUB-02, HUB-03)", () => {
  test("read, answer, edit, react and comment", async ({ page }) => {
    test.slow();
    const q = await published(`Koji album čuvaš za kišne dane? ${Date.now()}`);
    await insertAnswer("luka@example.test", q.id, "Lukin odgovor: Bitches Brew.");
    await insertAnswer("mia@example.test", q.id, "Mijin odgovor iz privatnog profila.");

    await signIn(page, "ana@example.test");
    await page.goto(`/drop/${q.date}`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(/Koji album čuvaš/);
    // D-021: the private author's answer is visible and counted.
    await expect(answers(page).getByRole("article")).toHaveCount(2);
    await expect(page.getByText("2 odgovora").first()).toBeVisible();
    await expect(page.getByText("Mijin odgovor iz privatnog profila.")).toBeVisible();
    await expectNoAxeViolations(page);

    // Answer through the dock: the audience line is tied to Post.
    await page.getByRole("button", { name: "Napiši svoj odgovor…" }).click();
    const dialog = page.getByRole("dialog", { name: "Tvoj odgovor" });
    await expect(dialog.getByText("Vidljivo svim članovima.")).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Objavi" })).toHaveAccessibleDescription(
      "Vidljivo svim članovima.",
    );
    await dialog.getByRole("button", { name: "Objavi" }).click();
    await expect(dialog.getByRole("alert")).toHaveText("Napiši nešto prije objave.");
    await dialog.getByRole("textbox").fill("Anin odgovor: Kind of Blue.");
    await dialog.getByRole("button", { name: "Objavi" }).click();
    await expect(dialog).toBeHidden();
    const mine = page.locator(".mine-wrap");
    await expect(mine.getByText("Tvoj odgovor", { exact: true })).toBeVisible();
    await expect(mine.getByText("Anin odgovor: Kind of Blue.")).toBeVisible();
    await expect(page.getByText("Tvoj odgovor je objavljen.")).toBeVisible();
    await expect(page.getByText("3 odgovora, uključujući tvoj").first()).toBeVisible();

    // Edit in place: the edited mark appears (J3).
    await mine.getByRole("button", { name: "Uredi" }).click();
    const edit = page.getByRole("dialog", { name: "Uredi odgovor" });
    await expect(edit.getByRole("textbox")).toHaveValue("Anin odgovor: Kind of Blue.");
    await edit.getByRole("textbox").fill("Anin odgovor, uređen: A Love Supreme.");
    await edit.getByRole("button", { name: "Spremi" }).click();
    await expect(mine.getByText("Anin odgovor, uređen: A Love Supreme.")).toBeVisible();
    await expect(mine.getByText("uređeno")).toBeVisible();

    // The reaction: a toggle with the count in its name; the own answer has no button.
    const luka = card(page, "Luka Bas");
    const like = luka.getByRole("button", { name: /^Sviđa mi se/ });
    await expect(like).toHaveAttribute("aria-pressed", "false");
    await like.click();
    await expect(like).toHaveAttribute("aria-pressed", "true");
    await expect(like).toHaveAccessibleName("Sviđa mi se, 1 reakcija, ti");
    await expect(mine.getByRole("button", { name: /^Sviđa mi se/ })).toHaveCount(0);

    // Comment on Luka's answer (HUB-03).
    await luka.getByRole("link", { name: /Komentiraj/ }).click();
    await expect(page).toHaveURL(new RegExp(`/drop/${q.date}/a/`));
    await expect(page.getByText("Lukin odgovor: Bitches Brew.")).toBeVisible();
    await expect(page.getByText("Još nema komentara.")).toBeVisible();
    await page.getByLabel("Tvoj komentar").fill("Slažem se, odličan izbor.");
    await page.getByRole("button", { name: "Komentiraj" }).click();
    await expect(page.getByRole("article").filter({ hasText: "Slažem se" })).toBeVisible();
    await expectNoAxeViolations(page);
    // Who reacted (POST-04).
    await page.getByRole("link", { name: "Tko je reagirao" }).click();
    await expect(page.getByRole("list", { name: "Tko je reagirao" })).toContainText("Ana Sluša");

    // Back on the question, the comment count shows and the sorts keep the list complete.
    await page.goto(`/drop/${q.date}?sort=discussed`);
    await expect(card(page, "Luka Bas").getByRole("link", { name: /1 komentar/ })).toBeVisible();
    await expect(page.getByRole("radio", { name: "Najviše rasprave" })).toBeChecked();
    await expect(answers(page).getByRole("article")).toHaveCount(2);
    await page.getByRole("radio", { name: "Najnovije" }).check();
    await expect(page).toHaveURL(/sort=recent/);
    await expect(answers(page).getByRole("article")).toHaveCount(2);

    // Delete the own answer: the slot frees up (D-035).
    await page.locator(".mine-wrap").getByRole("button", { name: "Izbriši" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Izbriši" }).click();
    await expect(page.locator(".mine-wrap")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Napiši svoj odgovor…" })).toBeVisible();
  });

  test("a private member hears who will see the answer before posting (D-021)", async ({
    page,
  }) => {
    const q = await published(`Koja pjesma te budi? ${Date.now()}`);
    await signIn(page, "mia@example.test");
    await page.goto(`/drop/${q.date}?compose=1`);
    const dialog = page.getByRole("dialog", { name: "Tvoj odgovor" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(/Tvoj profil je privatan/)).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Objavi" })).toHaveAccessibleDescription(
      /odgovore na Daily Drop vide svi članovi/,
    );
    await expect(page).toHaveURL(new RegExp(`/drop/${q.date}$`)); // ?compose=1 is not kept
  });

  test("blocked authors are hidden and not counted; private ones count (counts rule)", async ({
    page,
  }) => {
    const q = await published(`Koji koncert pamtiš? ${Date.now()}`);
    const blocked = await insertMember("blk");
    const priv = await insertMember("prv", "private");
    members.push(blocked.id, priv.id);
    await insertBlock(blocked.id, await userIdOf("luka@example.test"));
    await insertAnswer(blocked.email, q.id, "Odgovor blokiranog autora.");
    await insertAnswer(priv.email, q.id, "Odgovor privatnog autora.");

    await signIn(page, "luka@example.test");
    await page.goto(`/drop/${q.date}`);
    await expect(page.getByText("Odgovor privatnog autora.")).toBeVisible();
    await expect(page.getByText("Odgovor blokiranog autora.")).toHaveCount(0);
    await expect(page.getByText("1 odgovor", { exact: true })).toBeVisible();
    await expect(answers(page).getByRole("article")).toHaveCount(1);
  });
});

test.describe("signed out (PUB-07, D-022)", () => {
  test("a shared link shows the question and the invitation only", async ({ page }) => {
    const text = `Što slušaš kad putuješ? ${Date.now()}`;
    const q = await published(text);
    const id = await insertAnswer("luka@example.test", q.id, "Ovo ne smije procuriti.");
    await page.goto(`/drop/${q.date}`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(text);
    await expect(page.getByText("Odgovore vide članovi.")).toBeVisible();
    await expect(page.getByText("Ovo ne smije procuriti.")).toHaveCount(0);
    await expect(page.getByText("Luka")).toHaveCount(0);
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute("content", text);
    const og = await page
      .locator('meta[property^="og:"]')
      .evaluateAll((els) => els.map((e) => e.getAttribute("content") ?? "").join(" "));
    expect(og).not.toContain("Luka");
    expect(og).not.toMatch(/odgovor/i);
    await expectNoAxeViolations(page);

    // An answer link shows the same view, with no hint about its author (U-08).
    await page.goto(`/drop/${q.date}/a/${id}`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(text);
    await expect(page.getByText("Ovo ne smije procuriti.")).toHaveCount(0);
    await expect(page.getByText("Luka")).toHaveCount(0);

    // Sign-in returns to the question.
    await page.getByRole("main").getByRole("link", { name: "Prijavi se" }).click();
    await expect(page).toHaveURL(/\/sign-in\?returnTo=/);
  });

  test("scheduled, reserve and future dates are not available (U-03)", async ({ page }) => {
    const date = "2099-12-30";
    const id = await insertQuestion("scheduled", date, "Buduće pitanje");
    questions.push(id);
    for (const p of [`/drop/${date}`, "/drop/2026-13-01", "/drop/nije-datum"]) {
      const res = await page.goto(p);
      expect(res?.status(), p).toBe(404);
      await expect(page.getByText("Buduće pitanje")).toHaveCount(0);
    }
  });
});

test.describe("Home, Hub and the archive (HOME-01, HUB-01, HUB-04)", () => {
  test("the archive lists published questions and jumps to a date", async ({ page }) => {
    const q = await published(`Arhivsko pitanje ${Date.now()}`);
    await signIn(page, "ana@example.test");
    await page.goto("/hub/archive");
    await expect(
      page.getByRole("link", { name: new RegExp(`Arhivsko pitanje`) }).first(),
    ).toBeVisible();
    await page.getByLabel("Idi na datum").fill(q.date);
    await page.getByRole("button", { name: "Otvori" }).click();
    await expect(page).toHaveURL(new RegExp(`/drop/${q.date}$`));
    await page.goto("/hub/archive?date=1979-01-01");
    await expect(page.locator("main").getByRole("alert")).toHaveText(
      "Za taj datum nema objavljenog pitanja.",
    );
    await expectNoAxeViolations(page);
  });

  test("Home and Hub show today's Drop with one call to action", async ({ page }, info) => {
    // Today's date is shared by both projects and the real calendar: one project, and only on a free day.
    test.skip(info.project.name !== "desktop", "one project publishes today");
    const today = new Date().toISOString().slice(0, 10);
    test.skip(await publishedToday(today), "today already has a question");
    const { id } = await (async () => {
      const text = `Današnje testno pitanje ${Date.now()}`;
      const rowId = await insertQuestion("approved", null, text);
      questions.push(rowId);
      return { id: rowId, text };
    })();
    // Publish it for today the way the job does: status and date in one step.
    const { Client } = await import("pg");
    const client = new Client({
      connectionString:
        process.env.DATABASE_URL ?? "postgres://grooverift:grooverift@127.0.0.1:5432/grooverift",
    });
    await client.connect();
    await client.query(
      `update daily_drop_question set status = 'published', publish_date = $2, published_at = now() where id = $1`,
      [id, today],
    );
    await client.end();

    await signIn(page, "ana@example.test");
    await page.goto("/home");
    await expect(
      page.getByRole("heading", { level: 2, name: /Današnje testno pitanje/ }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Odgovori" })).toHaveAttribute(
      "href",
      `/drop/${today}?compose=1`,
    );
    await expectNoAxeViolations(page);
    await page.goto("/hub");
    const strip = page.getByRole("navigation", { name: "Zadnjih sedam dana" });
    await expect(strip.getByRole("link", { name: /^danas/ })).toHaveAttribute(
      "aria-current",
      "true",
    );
    await expect(page.getByRole("link", { name: "Prvo pročitaj odgovore" })).toBeVisible();
    await expectNoAxeViolations(page);
  });
});
