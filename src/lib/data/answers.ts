// Daily Drop answers (HUB-02, HUB-03). Step 5.2 holds the invariant (one answer per member per question among
// non-deleted answers, D-035) and the visibility rule (D-021: every signed-in member, blocked pairs hidden);
// step 5.7 adds editing, comments, reactions, the sorts and pagination.
import { and, desc, eq, isNotNull, isNull } from "drizzle-orm";
import { canViewContent, type Viewer } from "@/lib/authz";
import { db } from "@/lib/db/client";
import { dailyDropAnswer, dailyDropQuestion } from "@/lib/db/schema";
import { isUniqueViolation, SafeDbError } from "./db-errors";
import { loadGraphs, loadOwners } from "./facts";
import { consume } from "./rate-limit";

export const ANSWER_MAX = 1500; // plan §1.2

export type AnswerResult =
  | { ok: true; id: string }
  | { ok: false; reason: "not-available" | "already-answered" | "not-allowed" | "too-many" };

async function isPublished(questionId: string): Promise<boolean> {
  const [q] = await db()
    .select({ status: dailyDropQuestion.status })
    .from(dailyDropQuestion)
    .where(eq(dailyDropQuestion.id, questionId));
  return q?.status === "published";
}

export async function createAnswer(
  viewer: Viewer,
  questionId: string,
  body: string,
): Promise<AnswerResult> {
  // Only an active member who finished onboarding writes (fresh facts from loadViewer); restrictions come in 5.9.
  if (!viewer.id || viewer.status !== "active" || viewer.onboarded === false)
    return { ok: false, reason: "not-allowed" };
  if (!(await isPublished(questionId))) return { ok: false, reason: "not-available" };
  const text = body.trim();
  if (!text || text.length > ANSWER_MAX) return { ok: false, reason: "not-allowed" };
  if (!(await consume("post", viewer.id)).allowed) return { ok: false, reason: "too-many" };
  try {
    const [row] = await db()
      .insert(dailyDropAnswer)
      .values({ questionId, authorId: viewer.id, body: text })
      .returning({ id: dailyDropAnswer.id });
    return { ok: true, id: row!.id };
  } catch (e) {
    if (isUniqueViolation(e)) return { ok: false, reason: "already-answered" };
    throw new SafeDbError("createAnswer", e);
  }
}

/**
 * Soft delete by the author: the slot frees up, so the member may answer again (D-035). An answer removed by
 * moderation cannot be deleted to free the slot (review L2).
 */
export async function deleteOwnAnswer(viewerId: string, answerId: string): Promise<boolean> {
  const rows = await db()
    .update(dailyDropAnswer)
    .set({ deletedAt: new Date() })
    .where(
      and(
        eq(dailyDropAnswer.id, answerId),
        eq(dailyDropAnswer.authorId, viewerId),
        isNull(dailyDropAnswer.deletedAt),
        isNull(dailyDropAnswer.removedAt),
      ),
    )
    .returning({ id: dailyDropAnswer.id });
  return rows.length > 0;
}

/**
 * The answers a viewer may see on a published question, newest first. Unpublished questions show nothing (U-03);
 * hidden authors, purged authors and blocked pairs are left out.
 */
export async function visibleAnswers(viewer: Viewer, questionId: string) {
  if (!(await isPublished(questionId))) return [];
  const rows = await db()
    .select()
    .from(dailyDropAnswer)
    .where(
      and(
        eq(dailyDropAnswer.questionId, questionId),
        isNull(dailyDropAnswer.deletedAt),
        isNull(dailyDropAnswer.removedAt),
        isNotNull(dailyDropAnswer.authorId),
      ),
    )
    .orderBy(desc(dailyDropAnswer.createdAt));
  const authorIds = rows.map((r) => r.authorId!);
  const [owners, graphs] = await Promise.all([
    loadOwners(authorIds),
    loadGraphs(viewer.id, authorIds),
  ]);
  return rows.filter((r) => {
    const author = owners.get(r.authorId!);
    if (!author) return false;
    return canViewContent("dropAnswer", viewer, { author }, graphs.get(r.authorId!)).allowed;
  });
}
