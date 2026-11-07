// SET-12 feedback and bug reports and ADM-15 (step 5.10; Master Prompt §13, D-078 (5), IA SET-12).
// Separate from abuse reports: nothing here reaches the moderation queue. The member's address is shown to staff
// only when they ticked "reply by email". Staff reach this through staffGate("admin") pages and actions.
import { and, desc, eq, isNotNull, lt, or, sql } from "drizzle-orm";
import { audit } from "@/lib/audit";
import {
  cleanFeedbackContext,
  FEEDBACK_MAX,
  FEEDBACK_NOTES_MAX,
  type FeedbackKind,
} from "@/lib/account/rules";
import { db } from "@/lib/db/client";
import { feedbackReport as feedback, profile, user } from "@/lib/db/schema";
import type { Processed } from "@/lib/media/process";
import { SCREENSHOT_DAYS } from "@/lib/media/rules";
import { dropMedia, storeMedia } from "./media";
import { consume } from "./rate-limit";

export type FeedbackInput = {
  kind: FeedbackKind;
  text: string;
  context: unknown;
  replyByEmail: boolean;
  locale: string;
  /** Step 5.11 (D-078): the optional screenshot, already re-encoded (src/lib/media/process.ts). */
  screenshot?: Processed | null;
};

export type FeedbackResult = { ok: true } | { ok: false; reason: "invalid" | "too-many" };

export async function createFeedback(
  userId: string,
  input: FeedbackInput,
): Promise<FeedbackResult> {
  const text = input.text.replace(/\r\n?/g, "\n").trim();
  if (!text || text.length > FEEDBACK_MAX) return { ok: false, reason: "invalid" };
  if (!(await consume("feedback", userId)).allowed) return { ok: false, reason: "too-many" };
  const screenshotId = input.screenshot
    ? await storeMedia({ kind: "feedback_screenshot", ownerId: userId, image: input.screenshot })
    : null;
  const [row] = await db()
    .insert(feedback)
    .values({
      userId,
      kind: input.kind,
      text,
      context: cleanFeedbackContext(input.context),
      replyByEmail: input.replyByEmail,
      locale: input.locale === "en" ? "en" : "hr",
      screenshotId,
    })
    .returning({ id: feedback.id });
  await audit({
    actorType: "member",
    actorId: userId,
    action: "feedback.sent",
    targetType: "feedback_report",
    targetId: row!.id,
    metadata: { kind: input.kind, screenshot: !!screenshotId },
  });
  return { ok: true };
}

export type FeedbackRow = {
  id: string;
  kind: FeedbackKind;
  excerpt: string;
  status: "new" | "done";
  createdAt: Date;
  username: string | null;
};

/** ADM-15: newest first, the open ones on top. */
export async function feedbackQueue(
  status: "new" | "done" | "all" = "new",
): Promise<FeedbackRow[]> {
  const rows = await db()
    .select({
      id: feedback.id,
      kind: feedback.kind,
      text: feedback.text,
      status: feedback.status,
      createdAt: feedback.createdAt,
      username: profile.username,
    })
    .from(feedback)
    .leftJoin(profile, eq(profile.userId, feedback.userId))
    .where(status === "all" ? undefined : eq(feedback.status, status))
    .orderBy(sql`${feedback.status} = 'done'`, desc(feedback.createdAt))
    .limit(200);
  return rows.map((r) => ({
    id: r.id,
    kind: r.kind as FeedbackKind,
    excerpt: r.text.length > 140 ? `${r.text.slice(0, 140)}…` : r.text,
    status: r.status === "done" ? "done" : "new",
    createdAt: r.createdAt,
    username: r.username,
  }));
}

export async function feedbackCounts(): Promise<{ open: number }> {
  const [row] = await db()
    .select({ n: sql<number>`count(*)::int` })
    .from(feedback)
    .where(eq(feedback.status, "new"));
  return { open: row?.n ?? 0 };
}

export type FeedbackDetail = {
  id: string;
  kind: FeedbackKind;
  text: string;
  status: "new" | "done";
  createdAt: Date;
  context: Record<string, string>;
  locale: string;
  username: string | null;
  /** Only when the member ticked "reply by email". */
  replyTo: string | null;
  notes: string;
  handledAt: Date | null;
  /** The screenshot's media id (served to admins only through /api/media), until handled or 90 days. */
  screenshotId: string | null;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function feedbackDetail(id: string): Promise<FeedbackDetail | null> {
  if (!UUID.test(id)) return null;
  const [r] = await db()
    .select({
      f: feedback,
      username: profile.username,
      email: user.email,
    })
    .from(feedback)
    .leftJoin(profile, eq(profile.userId, feedback.userId))
    .leftJoin(user, eq(user.id, feedback.userId))
    .where(eq(feedback.id, id));
  if (!r) return null;
  return {
    id: r.f.id,
    kind: r.f.kind as FeedbackKind,
    text: r.f.text,
    status: r.f.status === "done" ? "done" : "new",
    createdAt: r.f.createdAt,
    context: r.f.context,
    locale: r.f.locale,
    username: r.username,
    replyTo: r.f.replyByEmail ? r.email : null,
    notes: r.f.triageNotes ?? "",
    handledAt: r.f.handledAt,
    screenshotId: r.f.screenshotId,
  };
}

/** ADM-15: notes and "handled" (or reopened). Audited without the notes' text. */
export async function updateFeedback(
  staffId: string,
  id: string,
  input: { notes: string; done: boolean },
): Promise<boolean> {
  if (!UUID.test(id)) return false;
  const notes = input.notes.trim();
  if (notes.length > FEEDBACK_NOTES_MAX) return false;
  const [before] = await db()
    .select({ screenshotId: feedback.screenshotId })
    .from(feedback)
    .where(eq(feedback.id, id));
  const rows = await db()
    .update(feedback)
    .set({
      // D-118 (6): the screenshot goes as soon as the message is handled (reopening does not bring it back).
      ...(input.done ? { screenshotId: null } : {}),
      triageNotes: notes || null,
      status: input.done ? "done" : "new",
      handledBy: input.done ? staffId : null,
      handledAt: input.done ? new Date() : null,
    })
    .where(and(eq(feedback.id, id)))
    .returning({ id: feedback.id });
  if (!rows.length) return false;
  if (input.done) await dropMedia([before?.screenshotId]);
  await audit({
    actorType: "staff",
    actorId: staffId,
    action: input.done ? "feedback.done" : "feedback.reopened",
    targetType: "feedback_report",
    targetId: id,
  });
  return true;
}

/**
 * D-118 (6): screenshots of handled messages and every screenshot older than 90 days are removed (the worker runs
 * this daily; `media.sweep` would catch an object left behind). Returns how many went.
 */
export async function expireScreenshots(now: Date = new Date()): Promise<number> {
  const cutoff = new Date(now.getTime() - SCREENSHOT_DAYS * 24 * 60 * 60 * 1000);
  const rows = await db()
    .select({ id: feedback.id, screenshotId: feedback.screenshotId })
    .from(feedback)
    .where(
      and(
        isNotNull(feedback.screenshotId),
        or(eq(feedback.status, "done"), lt(feedback.createdAt, cutoff)),
      ),
    );
  for (const r of rows) {
    await db().update(feedback).set({ screenshotId: null }).where(eq(feedback.id, r.id));
    await dropMedia([r.screenshotId]);
  }
  return rows.length;
}
