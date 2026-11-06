// Step 5.8: Activity (ACT-01) on the phone and the desktop. Ana comments on and reacts to Luka's answer on a test
// question in the 1980s (tests/e2e/db.ts); Luka finds both in Activity, tinted until seen, and the comment entry
// opens the answer at the comment. The entries are told apart by the answer's id, so the two projects and earlier
// runs never mix. The data layer's rules (blocks, grouping, re-checks) are in tests/db/notifications.test.ts.
import { test, expect } from "@playwright/test";
import { expectNoAxeViolations } from "./axe";
import { insertAnswer, publishTestQuestion, removeQuestions } from "./db";
import { signIn, signOut } from "./helpers";

const questions: string[] = [];
test.afterAll(async () => {
  await removeQuestions(questions);
});

test("comments and reactions on the own answer show up in Activity (ACT-01)", async ({ page }) => {
  test.slow();
  const stamp = Date.now().toString(36);
  const q = await publishTestQuestion(`Koja ploča te prati od djetinjstva? ${stamp}`);
  questions.push(q.id);
  const answerId = await insertAnswer("luka@example.test", q.id, `Lukin odgovor ${stamp}`);
  const commentText = `Ana piše Luki ${stamp}`;

  // Ana reacts and comments.
  await signIn(page, "ana@example.test");
  await page.goto(`/drop/${q.date}/a/${answerId}`);
  await page.getByRole("button", { name: /^Sviđa mi se/ }).click();
  await expect(page.getByRole("button", { name: /^Sviđa mi se/ })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.getByLabel("Tvoj komentar").fill(commentText);
  await page.getByRole("button", { name: "Komentiraj" }).click();
  await expect(page.getByRole("article").filter({ hasText: commentText })).toBeVisible();
  await signOut(page);

  // Luka sees both, unread, in today's group.
  await signIn(page, "luka@example.test");
  // The tab carries the unread count (D-104): visible digits, and the name says how many are new.
  await page.goto("/home");
  await expect(page.getByRole("link", { name: /^Aktivnost ?, [0-9]+ nov/ })).toBeVisible();
  await page.goto("/activity");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Aktivnost");
  const today = page.getByRole("region", { name: "Danas" });
  const commentHref = `a[href*="${answerId}#c-"]`;
  const commentEntry = today.locator(commentHref);
  const tinted = today.locator(".act-new").filter({ has: page.locator(commentHref) });
  const reactionEntry = today.locator(`a[href$="/a/${answerId}"]`);
  await expect(commentEntry).toContainText(`Ana Sluša komentira tvoj odgovor: „${commentText}”`);
  await expect(commentEntry).toContainText(", novo");
  await expect(reactionEntry).toContainText("Ana Sluša reagira na tvoj odgovor.");
  await expect(tinted).toHaveCount(1);
  await expectNoAxeViolations(page);

  // Seen once shown: after a reload the tint is gone.
  await expect
    .poll(async () => {
      await page.reload();
      return tinted.count();
    })
    .toBe(0);

  // The entry opens the answer at the comment (re-authorized by the answer page, JR1).
  await commentEntry.click();
  await expect(page).toHaveURL(new RegExp(`/drop/${q.date}/a/${answerId}#c-`));
  await expect(page.getByRole("article").filter({ hasText: commentText })).toBeVisible();
});
