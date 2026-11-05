// Daily Drop editorial rules (step 5.6, J6). A pure module: client components may import it, unlike
// src/lib/data (session 28 lesson). Dates are UTC calendar dates as "YYYY-MM-DD" strings throughout; the
// publication is always at 00:00 UTC (J6 E5, E6) and only the local hint changes with the editor's zone.

/** daily_drop_translation_len (migration 0002). */
export const QUESTION_MAX = 280;
/** JO4 (D-093 (5)): warn when fewer reserve questions than this are left (tunable in ADM-17 later). */
export const RESERVE_LOW = 7;
/** JO4: warn when a date whose publication falls in the next 72 hours has no question. */
export const GAP_HOURS = 72;
/** The calendar shows this many days from today, plus a few past days for context. */
export const CALENDAR_DAYS = 28;
export const CALENDAR_PAST_DAYS = 3;
/** pg-boss retries after a failed run: with backoff from 45 s this spreads over roughly 10 to 20 minutes (J6). */
export const PUBLISH_RETRY_LIMIT = 4;
export const PUBLISH_RETRY_DELAY_SECONDS = 45;

export type DropLocale = "hr" | "en";
export const DROP_LOCALES: readonly DropLocale[] = ["hr", "en"];

export type DropStatus =
  "draft" | "in_review" | "approved" | "scheduled" | "published" | "failed" | "withdrawn";

/** JO3: in the alpha the editor may approve their own question after ticking every item. */
export const APPROVE_CHECKLIST = ["same", "spelling", "open", "safe"] as const;
/** J6 E7: a reserve question must not depend on its date. */
export const RESERVE_CHECKLIST = ["timeless"] as const;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** A real calendar date in "YYYY-MM-DD" form (rejects 2026-02-30). */
export function isIsoDate(value: unknown): value is string {
  if (typeof value !== "string" || !ISO_DATE.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

export const utcDate = (at: Date = new Date()) => at.toISOString().slice(0, 10);

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** The instant a date's question goes live. */
export const goLiveAt = (date: string) => new Date(`${date}T00:00:00Z`);

/** Dates whose 00:00 UTC falls within (now, now + GAP_HOURS]: the ones an editor must fill soon (JO4). */
export function datesWithinGap(now: Date = new Date(), hours = GAP_HOURS): string[] {
  const out: string[] = [];
  const limit = now.getTime() + hours * 3_600_000;
  for (let date = addDays(utcDate(now), 1); goLiveAt(date).getTime() <= limit;) {
    out.push(date);
    date = addDays(date, 1);
  }
  return out;
}

/** Text as stored: trimmed, inner whitespace kept (line breaks are not part of a question). */
export const cleanQuestion = (text: unknown) =>
  typeof text === "string" ? text.replace(/\s+/g, " ").trim() : "";

/** Levenshtein distance between two strings, by code point. */
export function editDistance(a: string, b: string): number {
  const x = [...a];
  const y = [...b];
  if (!x.length) return y.length;
  if (!y.length) return x.length;
  let prev = Array.from({ length: y.length + 1 }, (_, i) => i);
  for (let i = 1; i <= x.length; i++) {
    const cur = [i];
    for (let j = 1; j <= y.length; j++) {
      cur[j] = Math.min(
        prev[j]! + 1,
        cur[j - 1]! + 1,
        prev[j - 1]! + (x[i - 1] === y[j - 1] ? 0 : 1),
      );
    }
    prev = cur;
  }
  return prev[y.length]!;
}

/**
 * Corrections after publishing (J6): a typo fix only. A meaning-changing edit under existing answers is refused;
 * the guard is a size limit on the change (at most 5 characters or 10% of the text, whichever is larger),
 * RECOMMENDED in D-100. The editor also confirms that the meaning stays the same.
 */
export function correctionAllowed(before: string, after: string): boolean {
  const limit = Math.max(5, Math.ceil(before.length * 0.1));
  return editDistance(before, after) <= limit;
}
