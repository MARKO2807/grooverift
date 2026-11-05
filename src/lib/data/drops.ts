// Daily Drop questions as members and visitors see them (HOME-01, HUB-01, HUB-02, HUB-04, PUB-07; step 5.7, J3).
// Every read asks for status = 'published' and a publish date no later than today (UTC): drafts, the reserve,
// scheduled, failed and withdrawn questions and every future date answer "not available" (U-03). The question is
// content for everyone once published (matrix §2, D-022), so these reads need no viewer.
import { and, asc, desc, eq, gte, inArray, isNotNull, lte, min } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { dailyDropQuestion as q, dailyDropTranslation as tr } from "@/lib/db/schema";
import { addDays, isIsoDate, utcDate, type DropLocale } from "@/lib/editorial/rules";

export type PublishedQuestion = { id: string; date: string; text: string };

const live = (today: string) =>
  and(eq(q.status, "published"), isNotNull(q.publishDate), lte(q.publishDate, today));

/** Question texts in the viewer's language, else the other one (both are approved before publication, JO2). */
async function withTexts(
  rows: { id: string; date: string | null }[],
  locale: DropLocale,
): Promise<PublishedQuestion[]> {
  if (!rows.length) return [];
  const texts = await db()
    .select({ id: tr.questionId, locale: tr.locale, text: tr.text })
    .from(tr)
    .where(
      inArray(
        tr.questionId,
        rows.map((r) => r.id),
      ),
    );
  const text = (id: string) =>
    texts.find((t) => t.id === id && t.locale === locale)?.text ??
    texts.find((t) => t.id === id)?.text ??
    "";
  return rows.map((r) => ({ id: r.id, date: r.date!, text: text(r.id) }));
}

/** The published question for a UTC date, or null (unknown, unpublished or future dates alike). */
export async function publishedOn(
  date: string,
  locale: DropLocale,
  now: Date = new Date(),
): Promise<PublishedQuestion | null> {
  if (!isIsoDate(date)) return null;
  const rows = await db()
    .select({ id: q.id, date: q.publishDate })
    .from(q)
    .where(and(live(utcDate(now)), eq(q.publishDate, date)));
  return (await withTexts(rows, locale))[0] ?? null;
}

/** A published question by id (the composer carries the id, J3 E1), with its date. */
export async function publishedById(
  id: string,
  locale: DropLocale,
  now: Date = new Date(),
): Promise<PublishedQuestion | null> {
  const rows = await db()
    .select({ id: q.id, date: q.publishDate })
    .from(q)
    .where(and(live(utcDate(now)), eq(q.id, id)));
  return (await withTexts(rows, locale))[0] ?? null;
}

/** The newest published question (today's, or the last one before it when today's is late, J3 E2). */
export async function latestPublished(
  locale: DropLocale,
  now: Date = new Date(),
): Promise<PublishedQuestion | null> {
  const rows = await db()
    .select({ id: q.id, date: q.publishDate })
    .from(q)
    .where(live(utcDate(now)))
    .orderBy(desc(q.publishDate))
    .limit(1);
  return (await withTexts(rows, locale))[0] ?? null;
}

/** The newest published date only (the "new Daily Drop is out" check, J3 E1). */
export async function latestPublishedDate(now: Date = new Date()): Promise<string | null> {
  const [row] = await db()
    .select({ date: q.publishDate })
    .from(q)
    .where(live(utcDate(now)))
    .orderBy(desc(q.publishDate))
    .limit(1);
  return row?.date ?? null;
}

/** HUB-01 strip: the published questions of the last `days` UTC days, oldest first (D-093 (4)). */
export async function recentPublished(
  locale: DropLocale,
  days = 7,
  now: Date = new Date(),
): Promise<PublishedQuestion[]> {
  const today = utcDate(now);
  const rows = await db()
    .select({ id: q.id, date: q.publishDate })
    .from(q)
    .where(and(live(today), gte(q.publishDate, addDays(today, -(days - 1)))))
    .orderBy(asc(q.publishDate));
  return withTexts(rows, locale);
}

/** HUB-04: every published question, newest first. The archive starts with the first question (D-078). */
export async function archive(
  locale: DropLocale,
  now: Date = new Date(),
): Promise<PublishedQuestion[]> {
  const rows = await db()
    .select({ id: q.id, date: q.publishDate })
    .from(q)
    .where(live(utcDate(now)))
    .orderBy(desc(q.publishDate));
  return withTexts(rows, locale);
}

/**
 * Before the first Daily Drop (D-078 (8)): whether any question was ever published, and the earliest scheduled
 * date from today on, for the countdown. Only the date is returned, never the text of a scheduled question.
 */
export async function firstDropState(
  now: Date = new Date(),
): Promise<{ started: boolean; nextDate: string | null }> {
  const today = utcDate(now);
  const [published] = await db().select({ id: q.id }).from(q).where(live(today)).limit(1);
  if (published) return { started: true, nextDate: null };
  const [next] = await db()
    .select({ date: min(q.publishDate) })
    .from(q)
    .where(and(eq(q.status, "scheduled"), gte(q.publishDate, today)));
  return { started: false, nextDate: next?.date ?? null };
}
