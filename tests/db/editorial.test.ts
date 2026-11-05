// Step 5.6 acceptance: the Daily Drop lifecycle and the publication against the real database (J6).
// Fixtures use @editorial.test addresses and dates far in the future (one random block per run), so the shared
// development database and its seeded questions are never touched, except that the "reserve empty" test parks
// other reserve questions for a moment and puts them back.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { and, desc, eq, inArray, like, sql } from "drizzle-orm";
import type { Viewer } from "@/lib/authz";
import { closeDb, db, pool } from "@/lib/db/client";
import {
  auditLog,
  dailyDropQuestion,
  dailyDropTranslation,
  featureFlag,
  publicationRun,
  user,
} from "@/lib/db/schema";
import {
  createQuestion,
  deleteQuestion,
  editorialHealth,
  getQuestion,
  listPool,
  PublicationError,
  publishForDate,
  saveQuestion,
  transition,
  withdrawQuestion,
  type EditorialResult,
} from "@/lib/data/editorial";
import { loadViewer } from "@/lib/data/facts";
import { runPublication } from "@/lib/editorial/publication";
import { addDays } from "@/lib/editorial/rules";

const RUN = Date.now().toString(36);
const mail = (k: string) => `${k}-${RUN}@editorial.test`;
// A block of 200 days somewhere in 2090–2180 that no other run uses (the date is the idempotency key).
const BASE = addDays("2090-01-01", Math.floor(Math.random() * 30_000));
let dayOffset = 0;
const nextDate = () => addDays(BASE, dayOffset++);

let editor: Viewer;
let admin: Viewer;
let member: Viewer;
const created: string[] = [];

async function mkUser(key: string, role: string, twoFactor = true) {
  const [u] = await db()
    .insert(user)
    .values({
      name: key,
      email: mail(key),
      emailVerified: true,
      role,
      twoFactorEnabled: twoFactor,
    })
    .returning({ id: user.id });
  return u!.id;
}

beforeAll(async () => {
  editor = { id: await mkUser("editor", "editor"), role: "editor", status: "active" };
  admin = { id: await mkUser("admin", "admin"), role: "admin", status: "active" };
  member = { id: await mkUser("member", "member"), role: "member", status: "active" };
  // A missing flag reads as "off", which publishes; make sure no earlier run left it paused.
  await db().insert(featureFlag).values({ key: "daily_drop", state: "on" }).onConflictDoNothing();
});

afterAll(async () => {
  if (created.length) {
    await db().delete(publicationRun).where(inArray(publicationRun.questionId, created));
    await db().delete(dailyDropQuestion).where(inArray(dailyDropQuestion.id, created));
  }
  await db()
    .delete(publicationRun)
    .where(sql`${publicationRun.publishDate} between ${BASE} and ${addDays(BASE, 200)}`);
  await db()
    .delete(user)
    .where(like(user.email, `%-${RUN}@editorial.test`));
  await closeDb();
});

function ok(r: EditorialResult): { id: string; version: number } {
  if (!r.ok) throw new Error(`expected ok, got ${r.reason}`);
  return r;
}

/** A question taken through the whole lifecycle to "approved" (both languages, self-approved per JO3). */
async function approved(
  hr = `Pitanje ${RUN}?`,
  en = `Question ${RUN}?`,
  opts: { reserve?: boolean } = {},
) {
  let r = ok(await createQuestion(editor, { hr, en }));
  created.push(r.id);
  r = ok(await transition(editor, { ...r, to: "submit" }));
  r = ok(await transition(editor, { ...r, to: "approve", checklist: true }));
  if (opts.reserve) r = ok(await transition(editor, { ...r, to: "reserve", timeless: true }));
  return r;
}

async function scheduled(date: string) {
  const r = await approved();
  return ok(await transition(editor, { ...r, to: "schedule", date }));
}

const status = async (id: string) =>
  (
    await db()
      .select({ s: dailyDropQuestion.status })
      .from(dailyDropQuestion)
      .where(eq(dailyDropQuestion.id, id))
  )[0]?.s;

/** Old reserve questions go first (oldest created_at), so the test's own reserve is used before any seeded one. */
async function makeOldest(id: string, minutes = 0) {
  await db()
    .update(dailyDropQuestion)
    .set({ createdAt: new Date(Date.UTC(1990, 0, 1, 0, minutes)) })
    .where(eq(dailyDropQuestion.id, id));
}

describe("editorial access (matrix: editorial and staff-only)", () => {
  it("members, moderators and staff without a second factor cannot read or write drafts", async () => {
    expect(await createQuestion(member, { hr: "x?" })).toEqual({ ok: false, reason: "forbidden" });
    const mod: Viewer = { id: member.id, role: "moderator", status: "active" };
    expect(await createQuestion(mod, { hr: "x?" })).toEqual({ ok: false, reason: "forbidden" });
    const noTwoFactor = await mkUser("editor2", "editor", false);
    const viewer = await loadViewer({ id: noTwoFactor, role: "editor" });
    expect(viewer.role).toBe("member");
    expect(await createQuestion(viewer, { hr: "x?" })).toEqual({ ok: false, reason: "forbidden" });
    const r = ok(await createQuestion(editor, { hr: `Skriveno ${RUN}?` }));
    created.push(r.id);
    expect(await getQuestion(member, r.id)).toBeNull();
    expect(await listPool(member, "work")).toEqual([]);
    expect((await getQuestion(editor, r.id))?.hr?.text).toBe(`Skriveno ${RUN}?`);
  });
});

describe("lifecycle (J6)", () => {
  it("a draft needs both languages before review (JO2), approval needs the checklist (JO3)", async () => {
    let r = ok(await createQuestion(editor, { hr: `  Samo   hrvatski ${RUN}? ` }));
    created.push(r.id);
    const d = await getQuestion(editor, r.id);
    expect(d?.hr?.text).toBe(`Samo hrvatski ${RUN}?`); // one line, trimmed
    expect(d?.en).toBeNull();
    expect(await transition(editor, { ...r, to: "submit" })).toEqual({
      ok: false,
      reason: "incomplete",
    });
    r = ok(
      await saveQuestion(editor, {
        ...r,
        texts: { hr: `Samo hrvatski ${RUN}?`, en: `Croatian only ${RUN}?` },
      }),
    );
    r = ok(await transition(editor, { ...r, to: "submit" }));
    expect(await transition(editor, { ...r, to: "approve", checklist: false })).toEqual({
      ok: false,
      reason: "invalid",
    });
    r = ok(await transition(editor, { ...r, to: "approve", checklist: true }));
    const a = await getQuestion(editor, r.id);
    expect(a?.status).toBe("approved");
    expect(a?.hr?.approved && a?.en?.approved).toBe(true);
    expect(a?.approvedByName).toBe("editor");
  });

  it("refuses empty and over-long texts", async () => {
    expect(await createQuestion(editor, { hr: "   " })).toEqual({ ok: false, reason: "invalid" });
    expect(await createQuestion(editor, { hr: "a".repeat(281) })).toEqual({
      ok: false,
      reason: "too-big",
    });
  });

  it("editing a question in review sends it back to draft; approved questions are not edited in place", async () => {
    let r = ok(await createQuestion(editor, { hr: `A ${RUN}?`, en: `A ${RUN}?` }));
    created.push(r.id);
    r = ok(await transition(editor, { ...r, to: "submit" }));
    r = ok(await saveQuestion(editor, { ...r, texts: { hr: `B ${RUN}?`, en: `B ${RUN}?` } }));
    expect(await status(r.id)).toBe("draft");
    r = ok(await transition(editor, { ...r, to: "submit" }));
    r = ok(await transition(editor, { ...r, to: "approve", checklist: true }));
    expect(await saveQuestion(editor, { ...r, texts: { hr: "C?", en: "C?" } })).toEqual({
      ok: false,
      reason: "state",
    });
    // "Back to draft" clears the approval of both languages
    r = ok(await transition(editor, { ...r, to: "toDraft" }));
    const d = await getQuestion(editor, r.id);
    expect(d?.status).toBe("draft");
    expect(d?.hr?.approved || d?.en?.approved).toBe(false);
    expect(d?.approvedByName).toBeNull();
  });

  it("optimistic locking: the second editor's save reports a conflict with the saved version (J6 E2)", async () => {
    const r = ok(await createQuestion(editor, { hr: `Prvo ${RUN}?` }));
    created.push(r.id);
    ok(await saveQuestion(editor, { ...r, texts: { hr: `Prvi urednik ${RUN}?` } }));
    const second = await saveQuestion(admin, { ...r, texts: { hr: `Drugi urednik ${RUN}?` } });
    expect(second.ok).toBe(false);
    if (second.ok || second.reason !== "conflict") throw new Error("expected a conflict");
    expect(second.current.hr?.text).toBe(`Prvi urednik ${RUN}?`);
    expect(second.current.version).toBe(r.version + 1);
    // State moves are versioned too
    expect((await transition(editor, { ...r, to: "submit" })).ok).toBe(false);
  });

  it("one question per UTC date: the second schedule fails (J6 E1); dates in the past are refused", async () => {
    const date = nextDate();
    await scheduled(date);
    const other = await approved();
    expect(await transition(editor, { ...other, to: "schedule", date })).toEqual({
      ok: false,
      reason: "date-taken",
    });
    expect(await transition(editor, { ...other, to: "schedule", date: "2020-01-01" })).toEqual({
      ok: false,
      reason: "date-past",
    });
    // unschedule gives the date up again
    const s = ok(await transition(editor, { ...other, to: "schedule", date: nextDate() }));
    const u = ok(await transition(editor, { ...s, to: "unschedule" }));
    const d = await getQuestion(editor, u.id);
    expect(d?.status).toBe("approved");
    expect(d?.publishDate).toBeNull();
  });

  it("reserve needs the timeless check (J6 E7); only questions that never went out can be deleted", async () => {
    const r = await approved();
    expect(await transition(editor, { ...r, to: "reserve", timeless: false })).toEqual({
      ok: false,
      reason: "invalid",
    });
    const res = ok(await transition(editor, { ...r, to: "reserve", timeless: true }));
    expect((await listPool(editor, "reserve")).some((x) => x.id === res.id)).toBe(true);
    expect((await listPool(editor, "work")).some((x) => x.id === res.id)).toBe(false);
    const date = nextDate();
    const s = await scheduled(date);
    expect(await deleteQuestion(editor, s)).toEqual({ ok: false, reason: "state" });
    const draft = ok(await createQuestion(editor, { hr: `Briši ${RUN}?` }));
    expect(ok(await deleteQuestion(editor, draft)).id).toBe(draft.id);
    expect(await getQuestion(editor, draft.id)).toBeNull();
  });
});

describe("publication (J6, invariant 4)", () => {
  it("the job runs twice → one published row and one run (E3)", async () => {
    const date = nextDate();
    const s = await scheduled(date);
    const first = await publishForDate(date);
    const second = await publishForDate(date);
    expect(first).toMatchObject({
      status: "published",
      questionId: s.id,
      usedReserve: false,
      attempt: 1,
    });
    expect(second).toEqual({ status: "already", date, questionId: s.id });
    const live = await db()
      .select({ id: dailyDropQuestion.id })
      .from(dailyDropQuestion)
      .where(
        and(eq(dailyDropQuestion.publishDate, date), eq(dailyDropQuestion.status, "published")),
      );
    expect(live).toHaveLength(1);
    const runs = await db()
      .select()
      .from(publicationRun)
      .where(eq(publicationRun.publishDate, date));
    expect(runs).toHaveLength(1);
    expect(runs[0]!.status).toBe("succeeded");
  });

  it("concurrent runs for one date publish once (the advisory lock)", async () => {
    const date = nextDate();
    const s = await scheduled(date);
    const results = await Promise.all([
      publishForDate(date),
      publishForDate(date),
      publishForDate(date),
    ]);
    expect(results.filter((r) => r.status === "published")).toHaveLength(1);
    expect(results.filter((r) => r.status === "already")).toHaveLength(2);
    expect(await status(s.id)).toBe("published");
  });

  it("no scheduled question → the oldest reserve is used", async () => {
    const reserve = await approved(`Rezerva ${RUN}?`, `Reserve ${RUN}?`, { reserve: true });
    await makeOldest(reserve.id);
    const date = nextDate();
    const out = await publishForDate(date);
    expect(out).toMatchObject({ status: "published", questionId: reserve.id, usedReserve: true });
    const d = await getQuestion(editor, reserve.id);
    expect(d?.publishDate).toBe(date);
    expect((await listPool(editor, "reserve")).some((x) => x.id === reserve.id)).toBe(false);
  });

  it("translation missing on the day → the reserve is used and the question returns to approved without a date (E4)", async () => {
    const date = nextDate();
    const s = await scheduled(date);
    // The English translation loses its approval (cannot happen through the editor; the run must still cope).
    await db()
      .update(dailyDropTranslation)
      .set({ review: "draft" })
      .where(and(eq(dailyDropTranslation.questionId, s.id), eq(dailyDropTranslation.locale, "en")));
    const reserve = await approved(`Rezerva E4 ${RUN}?`, `Reserve E4 ${RUN}?`, { reserve: true });
    await makeOldest(reserve.id);
    const t0 = new Date();
    const out = await runPublication(date, { trigger: "schedule" });
    expect(out).toMatchObject({
      status: "published",
      questionId: reserve.id,
      usedReserve: true,
      skippedQuestionId: s.id,
    });
    const skipped = await getQuestion(editor, s.id);
    expect(skipped?.status).toBe("approved");
    expect(skipped?.publishDate).toBeNull();
    // staff are told (audit records the alert; the test transport sends nothing)
    const alerts = await db()
      .select({ meta: auditLog.metadata })
      .from(auditLog)
      .where(and(eq(auditLog.action, "editorial.alert"), sql`${auditLog.at} >= ${t0}`));
    expect(alerts.some((a) => a.meta.kind === "question_skipped" && a.meta.date === date)).toBe(
      true,
    );
  });

  it("reserve empty → the run fails with no_question and a critical alert goes out", async () => {
    const date = nextDate();
    const parked = await db()
      .update(dailyDropQuestion)
      .set({ isReserve: false })
      .where(and(eq(dailyDropQuestion.status, "approved"), eq(dailyDropQuestion.isReserve, true)))
      .returning({ id: dailyDropQuestion.id });
    try {
      const t0 = new Date();
      const out = await runPublication(date, { trigger: "schedule" });
      expect(out).toMatchObject({ status: "empty", attempt: 1 });
      const [r] = await db()
        .select()
        .from(publicationRun)
        .where(eq(publicationRun.publishDate, date));
      expect(r).toMatchObject({ status: "failed", error: "no_question" });
      const alerts = await db()
        .select({ meta: auditLog.metadata })
        .from(auditLog)
        .where(and(eq(auditLog.action, "editorial.alert"), sql`${auditLog.at} >= ${t0}`));
      expect(alerts.some((a) => a.meta.kind === "no_question" && a.meta.date === date)).toBe(true);
      // "Publish now" later with a new reserve question fills the date (attempt 2)
      const reserve = await approved(`Kasno ${RUN}?`, `Late ${RUN}?`, { reserve: true });
      const now = await runPublication(date, { trigger: "manual", actorId: editor.id });
      expect(now).toMatchObject({ status: "published", questionId: reserve.id, attempt: 2 });
    } finally {
      if (parked.length)
        await db()
          .update(dailyDropQuestion)
          .set({ isReserve: true })
          .where(
            inArray(
              dailyDropQuestion.id,
              parked.map((p) => p.id),
            ),
          );
    }
  });

  it("an error rolls back, is recorded, is thrown for the retry; the last retry marks the question failed", async () => {
    const date = nextDate();
    const s = await scheduled(date);
    const boom = () => {
      throw new Error("simulated outage");
    };
    await expect(publishForDate(date, { faultForTest: boom })).rejects.toBeInstanceOf(
      PublicationError,
    );
    expect(await status(s.id)).toBe("scheduled");
    await expect(publishForDate(date, { faultForTest: boom, final: true })).rejects.toThrow(
      /attempt 2/,
    );
    expect(await status(s.id)).toBe("failed");
    const runs = await db()
      .select()
      .from(publicationRun)
      .where(eq(publicationRun.publishDate, date))
      .orderBy(desc(publicationRun.attempt));
    expect(runs.map((r) => r.status)).toEqual(["failed", "failed"]);
    expect(runs[0]!.error).not.toContain("simulated"); // no free text from the error reaches the table
    // "Publish now" retries the failed question for its date
    const out = await publishForDate(date);
    expect(out).toMatchObject({ status: "published", questionId: s.id, attempt: 3 });
  });

  it("paused Daily Drop: nothing is published and no reserve is used (E9)", async () => {
    const date = nextDate();
    const reserve = await approved(`Pauza ${RUN}?`, `Pause ${RUN}?`, { reserve: true });
    await makeOldest(reserve.id, 1);
    const [before] = await db().select().from(featureFlag).where(eq(featureFlag.key, "daily_drop"));
    await db()
      .update(featureFlag)
      .set({ state: "paused" })
      .where(eq(featureFlag.key, "daily_drop"));
    try {
      expect(await publishForDate(date)).toMatchObject({ status: "paused" });
      expect(await status(reserve.id)).toBe("approved");
    } finally {
      await db()
        .update(featureFlag)
        .set({ state: before?.state ?? "on" })
        .where(eq(featureFlag.key, "daily_drop"));
    }
  });
});

describe("after publishing (J6, D-101)", () => {
  it("a published question is never edited, not even for a typo", async () => {
    const date = nextDate();
    await scheduled(date);
    const pub = await publishForDate(date);
    if (pub.status !== "published") throw new Error("not published");
    const d = (await getQuestion(editor, pub.questionId))!;
    expect(
      await saveQuestion(editor, {
        id: d.id,
        version: d.version,
        texts: { hr: "Ispravak?", en: "Fix?" },
      }),
    ).toEqual({ ok: false, reason: "state" });
    expect(await transition(editor, { id: d.id, version: d.version, to: "toDraft" })).toEqual({
      ok: false,
      reason: "state",
    });
    expect((await getQuestion(editor, d.id))?.hr?.text).toBe(d.hr?.text);
  });

  it("only an admin withdraws a published question; its date is free again", async () => {
    const date = nextDate();
    const s = await scheduled(date);
    await publishForDate(date);
    const d = (await getQuestion(editor, s.id))!;
    expect(await withdrawQuestion(editor, d)).toEqual({ ok: false, reason: "forbidden" });
    ok(await withdrawQuestion(admin, d));
    expect(await status(s.id)).toBe("withdrawn");
    // the nightly job never refills the date from the reserve (review 5.6 #2) and records no run
    const runsBefore = (
      await db().select().from(publicationRun).where(eq(publicationRun.publishDate, date))
    ).length;
    expect(await publishForDate(date)).toEqual({ status: "withdrawn", date, questionId: s.id });
    expect(
      (await db().select().from(publicationRun).where(eq(publicationRun.publishDate, date))).length,
    ).toBe(runsBefore);
    // an editor may schedule a replacement on purpose (the unique index covers scheduled and published only)
    const r = await scheduled(date);
    expect(await publishForDate(date)).toMatchObject({ status: "published", questionId: r.id });
  });

  it("'Publish now' may fill a withdrawn date from the reserve", async () => {
    const date = nextDate();
    const s = await scheduled(date);
    await publishForDate(date);
    ok(await withdrawQuestion(admin, (await getQuestion(editor, s.id))!));
    const reserve = await approved(`Zamjena ${RUN}?`, `Replacement ${RUN}?`, { reserve: true });
    await makeOldest(reserve.id, -10); // older than any reserve left by the tests above
    expect(await publishForDate(date, { allowRefill: true })).toMatchObject({
      status: "published",
      questionId: reserve.id,
      usedReserve: true,
    });
  });
});

describe("publication under contention (review 5.6)", () => {
  it("a reserve held by another transaction is retried, not reported as empty", async () => {
    const date = nextDate();
    const reserve = await approved(`Zauzeto ${RUN}?`, `Busy ${RUN}?`, { reserve: true });
    const client = await pool().connect();
    try {
      await client.query("begin");
      await client.query(
        "select id from daily_drop_question where status = 'approved' and is_reserve for update",
      );
      await expect(publishForDate(date)).rejects.toThrow(/reserve_busy/);
      await client.query("rollback");
    } finally {
      client.release();
    }
    const [r] = await db()
      .select()
      .from(publicationRun)
      .where(eq(publicationRun.publishDate, date));
    expect(r).toMatchObject({ status: "failed", error: "reserve_busy" });
    expect(await status(reserve.id)).toBe("approved");
  });
});

describe("health (ADM-01, JO4)", () => {
  it("reports gaps within 72 hours and the reserve count", async () => {
    const day = addDays(BASE, 150); // far past the dates the other tests use
    const at = new Date(`${day}T12:00:00Z`);
    const h = await editorialHealth(at);
    expect(h.today).toBe(day);
    // From noon, the next three midnights fall within 72 hours and nothing is scheduled for them.
    expect(h.gaps).toEqual([addDays(day, 1), addDays(day, 2), addDays(day, 3)]);
    expect(h.todayPublished).toBe(false);
    expect(h.reserveLow).toBe(h.reserve < 7);
    await scheduled(addDays(day, 2));
    expect((await editorialHealth(at)).gaps).toEqual([addDays(day, 1), addDays(day, 3)]);
    // a question still scheduled for a past date (its run never happened) is reported (review 5.6 #7)
    expect((await editorialHealth(new Date(`${addDays(day, 5)}T12:00:00Z`))).stale).toContain(
      addDays(day, 2),
    );
  });
});
