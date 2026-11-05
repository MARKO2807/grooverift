// Daily Drop editorial and publication (ADM-01, ADM-04, ADM-05, ADM-09; step 5.6, J6). Editors and admins only:
// every function that reads or writes drafts asks the policy (matrix "Editorial and staff-only"), and loadViewer
// already counts a staff role without a second factor as a member. Member-facing reads of published questions
// live elsewhere (5.7) and always ask for status = 'published'.
//
// Lifecycle (J6): draft → in_review → approved → scheduled → published, plus failed and withdrawn. Every write
// carries the version the editor saw (optimistic locking, J6 E2). Publication is idempotent by UTC date
// (invariant 4): one advisory lock per date serialises runs, a published question for the date ends the run,
// and the unique index daily_drop_one_per_date_uq is the last line.
import {
  aliasedTable,
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  inArray,
  lt,
  lte,
  max,
  sql,
  type SQL,
} from "drizzle-orm";
import { canViewStaffObject, type Viewer } from "@/lib/authz";
import { db } from "@/lib/db/client";
import {
  dailyDropQuestion as q,
  dailyDropTranslation as tr,
  featureFlag,
  publicationRun as run,
  user,
} from "@/lib/db/schema";
import {
  addDays,
  datesWithinGap,
  DROP_LOCALES,
  QUESTION_MAX,
  RESERVE_LOW,
  utcDate,
  type DropLocale,
  type DropStatus,
} from "@/lib/editorial/rules";
import { dbErrorSummary, isUniqueViolation, pgCode } from "./db-errors";

type Db = ReturnType<typeof db>;
type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
type Exec = Db | Tx;

// ============================================================ Reads

export type QuestionText = { text: string; approved: boolean } | null;
export type QuestionDetail = {
  id: string;
  status: DropStatus;
  isReserve: boolean;
  publishDate: string | null;
  publishedAt: Date | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  createdByName: string | null;
  approvedByName: string | null;
  hr: QuestionText;
  en: QuestionText;
};

/** Editors and admins with an active account (loadViewer has already applied the second-factor rule). */
export const mayEdit = (viewer: Viewer) =>
  !!viewer.id &&
  viewer.status === "active" &&
  canViewStaffObject("editorialDrafts", viewer).allowed;

async function details(where: SQL | undefined, order: SQL[], ex: Exec = db()) {
  const creator = aliasedTable(user, "creator");
  const approver = aliasedTable(user, "approver");
  const rows = await ex
    .select({
      id: q.id,
      status: q.status,
      isReserve: q.isReserve,
      publishDate: q.publishDate,
      publishedAt: q.publishedAt,
      version: q.version,
      createdAt: q.createdAt,
      updatedAt: q.updatedAt,
      createdByName: creator.name,
      approvedByName: approver.name,
    })
    .from(q)
    .leftJoin(creator, eq(creator.id, q.createdBy))
    .leftJoin(approver, eq(approver.id, q.approvedBy))
    .where(where)
    .orderBy(...order);
  const ids = rows.map((r) => r.id);
  const texts = ids.length
    ? await ex
        .select({ id: tr.questionId, locale: tr.locale, text: tr.text, review: tr.review })
        .from(tr)
        .where(inArray(tr.questionId, ids))
    : [];
  const byId = new Map<string, Partial<Record<DropLocale, QuestionText>>>();
  for (const t of texts) {
    const entry = byId.get(t.id) ?? {};
    entry[t.locale as DropLocale] = { text: t.text, approved: t.review === "approved" };
    byId.set(t.id, entry);
  }
  return rows.map((r): QuestionDetail => ({
    ...r,
    hr: byId.get(r.id)?.hr ?? null,
    en: byId.get(r.id)?.en ?? null,
  }));
}

export async function getQuestion(viewer: Viewer, id: string): Promise<QuestionDetail | null> {
  if (!mayEdit(viewer)) return null;
  const [d] = await details(eq(q.id, id), []);
  return d ?? null;
}

/** "work": drafts, in review and approved questions without a date (newest change first); "reserve": the pool. */
export async function listPool(
  viewer: Viewer,
  pool: "work" | "reserve",
): Promise<QuestionDetail[]> {
  if (!mayEdit(viewer)) return [];
  return pool === "reserve"
    ? details(and(eq(q.status, "approved"), eq(q.isReserve, true)), [asc(q.createdAt)])
    : details(
        sql`(${q.status} in ('draft', 'in_review') or (${q.status} = 'approved' and ${q.isReserve} = false))`,
        [desc(q.updatedAt)],
      );
}

export type RunRow = {
  id: string;
  publishDate: string;
  attempt: number;
  status: "running" | "succeeded" | "failed";
  usedReserve: boolean;
  error: string | null;
  questionId: string | null;
  startedAt: Date;
  finishedAt: Date | null;
};

const runColumns = {
  id: run.id,
  publishDate: run.publishDate,
  attempt: run.attempt,
  status: run.status,
  usedReserve: run.usedReserve,
  error: run.error,
  questionId: run.questionId,
  startedAt: run.startedAt,
  finishedAt: run.finishedAt,
};

/** The calendar (ADM-04): questions that own or owned a date in [from, to], and every run for those dates. */
export async function listCalendar(
  viewer: Viewer,
  from: string,
  to: string,
): Promise<{ questions: QuestionDetail[]; runs: RunRow[] }> {
  if (!mayEdit(viewer)) return { questions: [], runs: [] };
  const [questions, runs] = await Promise.all([
    details(and(gte(q.publishDate, from), lte(q.publishDate, to)), [asc(q.publishDate)]),
    db()
      .select(runColumns)
      .from(run)
      .where(and(gte(run.publishDate, from), lte(run.publishDate, to)))
      .orderBy(asc(run.publishDate), asc(run.attempt)),
  ]);
  return { questions, runs };
}

/** ADM-09: the most recent publication runs, newest first. */
export async function listRuns(viewer: Viewer, limit = 60): Promise<RunRow[]> {
  if (!mayEdit(viewer)) return [];
  return db()
    .select(runColumns)
    .from(run)
    .orderBy(desc(run.publishDate), desc(run.attempt))
    .limit(limit);
}

/** Both languages present and approved (JO2, invariant 8), as a SQL condition on a question id column. */
const completeSql = (idColumn: typeof q.id) =>
  sql`(select count(*) from ${tr} where ${tr.questionId} = ${idColumn} and ${tr.review} = 'approved' and char_length(${tr.text}) > 0) = 2`;

export type EditorialHealth = {
  today: string;
  todayPublished: boolean;
  /** The last run for today failed and today has no question (members see "on its way", J6). */
  todayFailed: { attempt: number; error: string | null } | null;
  reserve: number;
  reserveLow: boolean;
  /** JO4: dates going live within 72 hours that have no scheduled question. */
  gaps: string[];
  /** Dates in the last seven days that were filled from the reserve. */
  reserveUsed: string[];
  /** Questions still scheduled for a date before today: the run for that date never happened (review 5.6 #7). */
  stale: string[];
  paused: boolean;
};

/** The warnings for ADM-01, the calendar and the daily staff check (JO4, J6). No member data. */
export async function editorialHealth(now: Date = new Date()): Promise<EditorialHealth> {
  const today = utcDate(now);
  const gapDates = datesWithinGap(now);
  const d = db();
  const [[reserveRow], live, todayRuns, used, [flag], stale] = await Promise.all([
    d
      .select({ n: count() })
      .from(q)
      .where(and(eq(q.status, "approved"), eq(q.isReserve, true), completeSql(q.id))),
    d
      .select({ date: q.publishDate, status: q.status })
      .from(q)
      .where(
        and(
          inArray(q.status, ["scheduled", "published"]),
          gte(q.publishDate, today),
          lte(q.publishDate, gapDates.at(-1) ?? today),
        ),
      ),
    d
      .select({ attempt: run.attempt, status: run.status, error: run.error })
      .from(run)
      .where(eq(run.publishDate, today))
      .orderBy(desc(run.attempt))
      .limit(1),
    d
      .selectDistinct({ date: run.publishDate })
      .from(run)
      .where(
        and(
          eq(run.status, "succeeded"),
          eq(run.usedReserve, true),
          gte(run.publishDate, addDays(today, -6)),
        ),
      )
      .orderBy(desc(run.publishDate)),
    d
      .select({ state: featureFlag.state })
      .from(featureFlag)
      .where(eq(featureFlag.key, "daily_drop")),
    d
      .select({ date: q.publishDate })
      .from(q)
      .where(and(eq(q.status, "scheduled"), lt(q.publishDate, today)))
      .orderBy(asc(q.publishDate)),
  ]);
  const owned = new Set(live.map((r) => r.date));
  const todayPublished = live.some((r) => r.date === today && r.status === "published");
  const last = todayRuns[0];
  const reserve = reserveRow?.n ?? 0;
  return {
    today,
    todayPublished,
    todayFailed:
      !todayPublished && last?.status === "failed"
        ? { attempt: last.attempt, error: last.error }
        : null,
    reserve,
    reserveLow: reserve < RESERVE_LOW,
    gaps: gapDates.filter((date) => !owned.has(date)),
    reserveUsed: used.map((r) => r.date),
    stale: stale.flatMap((r) => (r.date ? [r.date] : [])),
    paused: flag?.state === "paused",
  };
}

/** Editors and admins who receive the staff alert email (J6 E8). Active accounts only; no member data. */
export async function staffAlertRecipients(): Promise<{ email: string; locale: DropLocale }[]> {
  const rows = await db()
    .select({ email: user.email, locale: user.locale, banned: user.banned })
    .from(user)
    .where(and(inArray(user.role, ["editor", "admin"]), eq(user.status, "active")));
  return rows
    .filter((r) => !r.banned)
    .map((r) => ({ email: r.email, locale: r.locale === "en" ? "en" : "hr" }));
}

// ============================================================ Writes

export type EditorialFail =
  | "forbidden"
  | "not-found"
  | "state"
  | "incomplete"
  | "invalid"
  | "date-taken"
  | "date-past"
  | "too-big";
export type EditorialResult =
  | { ok: true; id: string; version: number }
  | { ok: false; reason: EditorialFail }
  | { ok: false; reason: "conflict"; current: QuestionDetail };

const FORBIDDEN = { ok: false, reason: "forbidden" } as const;
const fail = (reason: EditorialFail) => ({ ok: false, reason }) as const;

type Texts = Partial<Record<DropLocale, string>>;

/** Text as stored: one line, trimmed; refuses anything over QUESTION_MAX. */
function cleanTexts(texts: Texts): Record<DropLocale, string> | null {
  const out = { hr: "", en: "" };
  for (const locale of DROP_LOCALES) {
    const text = (texts[locale] ?? "").replace(/\s+/g, " ").trim();
    if ([...text].length > QUESTION_MAX) return null;
    out[locale] = text;
  }
  return out;
}

/** Why a versioned update matched nothing: gone, changed by someone else (with the saved state), or wrong state. */
async function explain(ex: Exec, id: string, version: number): Promise<EditorialResult> {
  const [current] = await details(eq(q.id, id), [], ex);
  if (!current) return fail("not-found");
  if (current.version !== version) return { ok: false, reason: "conflict", current };
  return fail("state");
}

const bumped = { version: sql`${q.version} + 1`, updatedAt: sql`now()` };

/** One versioned state change: matches only the version the editor saw and one of the allowed states. */
async function change(
  ex: Exec,
  id: string,
  version: number,
  from: DropStatus[],
  set: Partial<typeof q.$inferInsert>,
  extra?: SQL,
): Promise<EditorialResult> {
  const [row] = await ex
    .update(q)
    .set({ ...set, ...bumped })
    .where(and(eq(q.id, id), eq(q.version, version), inArray(q.status, from), extra))
    .returning({ id: q.id, version: q.version });
  return row ? { ok: true, ...row } : explain(ex, id, version);
}

async function writeTexts(tx: Tx, id: string, texts: Record<DropLocale, string>) {
  for (const locale of DROP_LOCALES) {
    const text = texts[locale];
    if (text) {
      await tx
        .insert(tr)
        .values({ questionId: id, locale, text, review: "draft" })
        .onConflictDoUpdate({
          target: [tr.questionId, tr.locale],
          set: { text, review: "draft", reviewedBy: null, reviewedAt: null },
        });
    } else {
      await tx.delete(tr).where(and(eq(tr.questionId, id), eq(tr.locale, locale)));
    }
  }
}

/** ADM-05: a new draft in one or both languages (J6 "write in HR or EN first"). */
export async function createQuestion(viewer: Viewer, texts: Texts): Promise<EditorialResult> {
  if (!mayEdit(viewer)) return FORBIDDEN;
  const clean = cleanTexts(texts);
  if (!clean) return fail("too-big");
  if (!clean.hr && !clean.en) return fail("invalid");
  return db().transaction(async (tx) => {
    const [row] = await tx
      .insert(q)
      .values({ createdBy: viewer.id })
      .returning({ id: q.id, version: q.version });
    await writeTexts(tx, row!.id, clean);
    return { ok: true as const, ...row! };
  });
}

/** Saves the texts of a draft or a question in review (which then returns to draft). Unchanged texts are a no-op. */
export async function saveQuestion(
  viewer: Viewer,
  input: { id: string; version: number; texts: Texts },
): Promise<EditorialResult> {
  if (!mayEdit(viewer)) return FORBIDDEN;
  const clean = cleanTexts(input.texts);
  if (!clean) return fail("too-big");
  if (!clean.hr && !clean.en) return fail("invalid");
  return db().transaction(async (tx) => {
    const [current] = await details(eq(q.id, input.id), [], tx);
    if (!current) return fail("not-found");
    if (current.version !== input.version)
      return { ok: false as const, reason: "conflict" as const, current };
    if (current.status !== "draft" && current.status !== "in_review") return fail("state");
    if ((current.hr?.text ?? "") === clean.hr && (current.en?.text ?? "") === clean.en)
      return { ok: true as const, id: current.id, version: current.version };
    const result = await change(tx, input.id, input.version, ["draft", "in_review"], {
      status: "draft",
    });
    if (result.ok) await writeTexts(tx, input.id, clean);
    return result;
  });
}

export type Transition =
  | { to: "submit" }
  | { to: "requestChanges" }
  | { to: "approve"; checklist: boolean }
  | { to: "schedule"; date: string }
  | { to: "unschedule" }
  | { to: "reserve"; timeless: boolean }
  | { to: "unreserve" }
  | { to: "toDraft" };

/** The lifecycle moves of J6 for one question, each against the version the editor saw. */
export async function transition(
  viewer: Viewer,
  input: { id: string; version: number } & Transition,
  now: Date = new Date(),
): Promise<EditorialResult> {
  if (!mayEdit(viewer)) return FORBIDDEN;
  const { id, version } = input;
  const hasBoth = sql`(select count(*) from ${tr} where ${tr.questionId} = ${q.id} and char_length(${tr.text}) > 0) = 2`;
  try {
    return await db().transaction(async (tx): Promise<EditorialResult> => {
      switch (input.to) {
        case "submit": {
          const r = await change(tx, id, version, ["draft"], { status: "in_review" }, hasBoth);
          return r.ok || r.reason !== "state" ? r : fail("incomplete");
        }
        case "requestChanges":
          return change(tx, id, version, ["in_review"], { status: "draft" });
        case "approve": {
          if (!input.checklist) return fail("invalid");
          const r = await change(
            tx,
            id,
            version,
            ["in_review"],
            { status: "approved", approvedBy: viewer.id },
            hasBoth,
          );
          if (!r.ok) return r.reason === "state" ? fail("incomplete") : r;
          await tx
            .update(tr)
            .set({ review: "approved", reviewedBy: viewer.id, reviewedAt: now })
            .where(eq(tr.questionId, id));
          return r;
        }
        case "schedule": {
          if (input.date < utcDate(now)) return fail("date-past");
          const r = await change(
            tx,
            id,
            version,
            ["approved"],
            { status: "scheduled", publishDate: input.date, isReserve: false },
            completeSql(q.id),
          );
          return r.ok || r.reason !== "state" ? r : fail("incomplete");
        }
        case "unschedule":
          return change(tx, id, version, ["scheduled"], { status: "approved", publishDate: null });
        case "reserve":
          if (!input.timeless) return fail("invalid");
          return change(tx, id, version, ["approved"], { isReserve: true }, completeSql(q.id));
        case "unreserve":
          return change(tx, id, version, ["approved"], { isReserve: false });
        case "toDraft": {
          const r = await change(tx, id, version, ["approved", "scheduled", "failed"], {
            status: "draft",
            publishDate: null,
            isReserve: false,
            approvedBy: null,
          });
          if (r.ok)
            await tx
              .update(tr)
              .set({ review: "draft", reviewedBy: null, reviewedAt: null })
              .where(eq(tr.questionId, id));
          return r;
        }
      }
    });
  } catch (error) {
    if (isUniqueViolation(error)) return fail("date-taken"); // J6 E1: one question per UTC date
    throw error;
  }
}

/** Deletes a question that never went out (draft, in review, approved without a date). */
export async function deleteQuestion(
  viewer: Viewer,
  input: { id: string; version: number },
): Promise<EditorialResult> {
  if (!mayEdit(viewer)) return FORBIDDEN;
  try {
    const [row] = await db()
      .delete(q)
      .where(
        and(
          eq(q.id, input.id),
          eq(q.version, input.version),
          inArray(q.status, ["draft", "in_review", "approved"]),
        ),
      )
      .returning({ id: q.id, version: q.version });
    return row ? { ok: true, ...row } : explain(db(), input.id, input.version);
  } catch (error) {
    if (pgCode(error) === "23503") return fail("state"); // a publication run refers to it
    throw error;
  }
}

/** Admin only, for severe errors (J6): the question and its answers disappear for members; nothing is deleted. */
export async function withdrawQuestion(
  viewer: Viewer,
  input: { id: string; version: number },
): Promise<EditorialResult> {
  if (!mayEdit(viewer) || viewer.role !== "admin") return FORBIDDEN;
  return change(db(), input.id, input.version, ["published"], { status: "withdrawn" });
}

// ============================================================ Publication

export type PublishTrigger = "schedule" | "manual";
export type PublishOutcome =
  | {
      status: "published";
      date: string;
      questionId: string;
      usedReserve: boolean;
      /** J6 E4: the scheduled question was incomplete and went back to approved without a date. */
      skippedQuestionId: string | null;
      runId: string;
      attempt: number;
    }
  | { status: "already"; date: string; questionId: string }
  /** An admin withdrew the date's question; only "Publish now" may fill the date again (review 5.6 #2). */
  | { status: "withdrawn"; date: string; questionId: string }
  | { status: "paused"; date: string; runId: string; attempt: number }
  | {
      status: "empty";
      date: string;
      skippedQuestionId: string | null;
      runId: string;
      attempt: number;
    };

/** A run that hit an error: recorded in publication_run; pg-boss retries the job (the message has no content). */
export class PublicationError extends Error {
  constructor(
    readonly date: string,
    readonly attempt: number,
    summary: string,
  ) {
    super(`publication of ${date} failed (attempt ${attempt}): ${summary}`);
    this.name = "PublicationError";
  }
}

/** Complete reserve questions exist but another transaction holds them: retry, do not report "empty" (review 5.6 #3). */
class ReserveBusy extends Error {
  constructor() {
    super("reserve_busy");
  }
}

/** Marks the scheduled question of a date failed (the last retry); also used when the run failed outside its savepoint. */
export async function markScheduledFailed(date: string, ex: Exec = db()): Promise<void> {
  await ex
    .update(q)
    .set({ status: "failed", ...bumped })
    .where(and(eq(q.publishDate, date), eq(q.status, "scheduled")));
}

async function publishQuestion(tx: Tx, id: string, date: string) {
  await tx
    .update(q)
    .set({ status: "published", publishDate: date, publishedAt: sql`now()`, ...bumped })
    .where(eq(q.id, id));
}

/**
 * Publishes the Daily Drop for one UTC date (J6 "Publication at 00:00 UTC"). Safe to call any number of times
 * from the job, its retries and "Publish now": the first caller under the date's advisory lock publishes, the
 * rest find the published question and stop. Order: the scheduled question (or a failed one for the date) if
 * both languages are approved; otherwise the oldest complete reserve question (E4); none → "empty". While the
 * daily_drop flag is paused nothing is published and no reserve is used (E9). An error rolls the publication
 * back to a savepoint, is recorded on the run and is thrown for the retry; on the final retry the scheduled
 * question becomes "failed". A date whose question an admin withdrew stays empty unless "Publish now" fills it.
 */
export async function publishForDate(
  date: string,
  opts: {
    final?: boolean;
    /** "Publish now": a staff member may fill a date whose question was withdrawn; the job never does. */
    allowRefill?: boolean;
    faultForTest?: () => void;
  } = {},
): Promise<PublishOutcome> {
  let failure: PublicationError | null = null;
  const outcome = await db().transaction(async (tx): Promise<PublishOutcome | null> => {
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtextextended(${`daily_drop:${date}`}, 0))`,
    );
    const [live] = await tx
      .select({ id: q.id })
      .from(q)
      .where(and(eq(q.publishDate, date), eq(q.status, "published")));
    if (live) return { status: "already", date, questionId: live.id };
    if (!opts.allowRefill) {
      const [withdrawn] = await tx
        .select({ id: q.id })
        .from(q)
        .where(and(eq(q.publishDate, date), eq(q.status, "withdrawn")))
        .limit(1);
      // An editor may schedule a new question for that date on purpose; only the reserve fallback is held back.
      const [planned] = withdrawn
        ? await tx
            .select({ id: q.id })
            .from(q)
            .where(and(eq(q.publishDate, date), inArray(q.status, ["scheduled", "failed"])))
            .limit(1)
        : [];
      if (withdrawn && !planned) return { status: "withdrawn", date, questionId: withdrawn.id };
    }

    const [last] = await tx
      .select({ n: max(run.attempt) })
      .from(run)
      .where(eq(run.publishDate, date));
    const attempt = (last?.n ?? 0) + 1;
    const [started] = await tx
      .insert(run)
      .values({ publishDate: date, attempt })
      .returning({ id: run.id });
    const runId = started!.id;
    const finish = (set: Partial<typeof run.$inferInsert>) =>
      tx
        .update(run)
        .set({ ...set, finishedAt: sql`now()` })
        .where(eq(run.id, runId));

    const [flag] = await tx
      .select({ state: featureFlag.state })
      .from(featureFlag)
      .where(eq(featureFlag.key, "daily_drop"));
    if (flag?.state === "paused") {
      await finish({ status: "failed", error: "paused" });
      return { status: "paused", date, runId, attempt };
    }

    try {
      const picked = await tx.transaction(async (sp) => {
        let skipped: string | null = null;
        const [candidate] = await sp
          .select({ id: q.id, complete: sql<boolean>`${completeSql(q.id)}` })
          .from(q)
          .where(and(eq(q.publishDate, date), inArray(q.status, ["scheduled", "failed"])))
          .orderBy(sql`case when ${q.status} = 'scheduled' then 0 else 1 end`, asc(q.updatedAt))
          .limit(1)
          .for("update");
        opts.faultForTest?.();
        if (candidate?.complete) {
          await publishQuestion(sp, candidate.id, date);
          return { questionId: candidate.id, usedReserve: false, skipped };
        }
        if (candidate) {
          await sp
            .update(q)
            .set({ status: "approved", publishDate: null, isReserve: false, ...bumped })
            .where(eq(q.id, candidate.id));
          skipped = candidate.id;
        }
        const [reserve] = await sp
          .select({ id: q.id })
          .from(q)
          .where(and(eq(q.status, "approved"), eq(q.isReserve, true), completeSql(q.id)))
          .orderBy(asc(q.createdAt))
          .limit(1)
          .for("update", { skipLocked: true });
        if (!reserve) {
          const [busy] = await sp
            .select({ n: count() })
            .from(q)
            .where(and(eq(q.status, "approved"), eq(q.isReserve, true), completeSql(q.id)));
          if ((busy?.n ?? 0) > 0) throw new ReserveBusy();
          return { questionId: null, usedReserve: false, skipped };
        }
        await publishQuestion(sp, reserve.id, date);
        return { questionId: reserve.id, usedReserve: true, skipped };
      });
      if (!picked.questionId) {
        await finish({ status: "failed", error: "no_question" });
        return { status: "empty", date, skippedQuestionId: picked.skipped, runId, attempt };
      }
      await finish({
        status: "succeeded",
        questionId: picked.questionId,
        usedReserve: picked.usedReserve,
      });
      return {
        status: "published",
        date,
        questionId: picked.questionId,
        usedReserve: picked.usedReserve,
        skippedQuestionId: picked.skipped,
        runId,
        attempt,
      };
    } catch (error) {
      const summary = error instanceof ReserveBusy ? error.message : dbErrorSummary(error);
      await finish({ status: "failed", error: summary.slice(0, 200) });
      if (opts.final) await markScheduledFailed(date, tx);
      failure = new PublicationError(date, attempt, summary);
      return null;
    }
  });
  if (failure) throw failure;
  return outcome!;
}
