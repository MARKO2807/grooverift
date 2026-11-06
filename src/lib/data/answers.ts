// Daily Drop answers, comments and the reaction (HUB-02, HUB-03, POST-04; steps 5.2 and 5.7, J3).
// Step 5.2 holds the invariant (one answer per member per question among non-deleted answers, D-035) and the
// visibility rule (D-021: every signed-in member, private authors included; blocked pairs hidden both ways;
// visitors never, D-022). Step 5.7 adds editing, comments, the reaction, the sorts, placeholders and mutes.
//
// Every read starts from a published question (status = 'published', U-03) and asks the policy per author;
// every count is a count of what the viewer may see (D-021 counts rule, U-13), so a hidden or blocked member's
// content never shows up in a number either. Writes take the member from the caller's fresh Viewer (loadViewer)
// and check the target again here.
import { and, asc, desc, eq, inArray, isNotNull, isNull, lte } from "drizzle-orm";
import { canViewContent, type Graph, type Viewer } from "@/lib/authz";
import { db } from "@/lib/db/client";
import {
  comment,
  dailyDropAnswer as answer,
  dailyDropQuestion as question,
  follow,
  mute,
  reaction,
} from "@/lib/db/schema";
import { utcDate } from "@/lib/editorial/rules";
import { isUniqueViolation, SafeDbError } from "./db-errors";
import { loadGraphs, loadOwners, type OwnerRecord } from "./facts";
import { notify } from "./notifications";
import { consume } from "./rate-limit";
import { activeRestriction } from "./safety";

export const ANSWER_MAX = 1500; // plan §1.2
export const COMMENT_MAX = 750; // plan §1.2

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type AnswerResult =
  | { ok: true; id: string }
  | {
      ok: false;
      reason: "not-available" | "already-answered" | "not-allowed" | "too-many" | "restricted";
    };
export type WriteResult =
  { ok: true } | { ok: false; reason: "not-available" | "not-allowed" | "too-many" | "restricted" };

/** Only an active member who finished onboarding writes (fresh facts from loadViewer); see also restricted(). */
const mayWrite = (viewer: Viewer): viewer is Viewer & { id: string } =>
  !!viewer.id && viewer.status === "active" && viewer.onboarded !== false;

/** SAFE-07: a posting restriction refuses new answers, edits and comments while it lasts (deleting stays). */
const restricted = async (viewerId: string) => !!(await activeRestriction(viewerId));

async function isPublished(questionId: string): Promise<boolean> {
  if (!UUID.test(questionId)) return false;
  const [q] = await db()
    .select({ status: question.status, date: question.publishDate })
    .from(question)
    .where(eq(question.id, questionId));
  return q?.status === "published" && !!q.date && q.date <= utcDate();
}

/** The live answer (not deleted, not removed) on a published question, with its author. */
async function liveAnswer(answerId: string) {
  if (!UUID.test(answerId)) return null;
  const [row] = await db()
    .select({
      id: answer.id,
      questionId: answer.questionId,
      authorId: answer.authorId,
      status: question.status,
      date: question.publishDate,
    })
    .from(answer)
    .innerJoin(question, eq(question.id, answer.questionId))
    .where(and(eq(answer.id, answerId), isNull(answer.deletedAt), isNull(answer.removedAt)));
  if (!row?.authorId || row.status !== "published" || !row.date || row.date > utcDate())
    return null;
  return { ...row, authorId: row.authorId };
}

/** Can the viewer see this live answer (D-021, blocks both ways, hidden authors)? */
async function canSeeAnswer(viewer: Viewer, authorId: string): Promise<boolean> {
  const [owners, graphs] = await Promise.all([
    loadOwners([authorId]),
    loadGraphs(viewer.id, [authorId]),
  ]);
  const author = owners.get(authorId);
  if (!author) return false;
  return canViewContent("dropAnswer", viewer, { author }, graphs.get(authorId)).allowed;
}

const clean = (body: unknown) =>
  typeof body === "string" ? body.replace(/\r\n?/g, "\n").trim() : "";

// ============================================================ Answer writes

export async function createAnswer(
  viewer: Viewer,
  questionId: string,
  body: string,
): Promise<AnswerResult> {
  if (!mayWrite(viewer)) return { ok: false, reason: "not-allowed" };
  if (!(await isPublished(questionId))) return { ok: false, reason: "not-available" };
  const text = clean(body);
  if (!text || text.length > ANSWER_MAX) return { ok: false, reason: "not-allowed" };
  if (await restricted(viewer.id)) return { ok: false, reason: "restricted" };
  if (!(await consume("post", viewer.id)).allowed) return { ok: false, reason: "too-many" };
  try {
    const [row] = await db()
      .insert(answer)
      .values({ questionId, authorId: viewer.id, body: text })
      .returning({ id: answer.id });
    return { ok: true, id: row!.id };
  } catch (e) {
    if (isUniqueViolation(e)) return { ok: false, reason: "already-answered" };
    throw new SafeDbError("createAnswer", e);
  }
}

/** Edit in place by the author (J3 "Edit in place, edited indicator after save"); archive questions too (D-036). */
export async function editOwnAnswer(
  viewer: Viewer,
  answerId: string,
  body: string,
): Promise<WriteResult> {
  if (!mayWrite(viewer)) return { ok: false, reason: "not-allowed" };
  const live = await liveAnswer(answerId);
  if (!live || live.authorId !== viewer.id) return { ok: false, reason: "not-available" };
  const text = clean(body);
  if (!text || text.length > ANSWER_MAX) return { ok: false, reason: "not-allowed" };
  if (await restricted(viewer.id)) return { ok: false, reason: "restricted" };
  if (!(await consume("contentEdit", viewer.id)).allowed) return { ok: false, reason: "too-many" };
  const rows = await db()
    .update(answer)
    .set({ body: text, editedAt: new Date() })
    .where(
      and(
        eq(answer.id, answerId),
        eq(answer.authorId, viewer.id),
        isNull(answer.deletedAt),
        isNull(answer.removedAt),
      ),
    )
    .returning({ id: answer.id });
  return rows.length ? { ok: true } : { ok: false, reason: "not-available" };
}

/**
 * Soft delete by the author: the slot frees up, so the member may answer again (D-035). An answer removed by
 * moderation cannot be deleted to free the slot (review L2). Replies keep a placeholder (J3 E5); the reactions on
 * the answer go with it, since nobody can see them any more.
 */
export async function deleteOwnAnswer(viewerId: string, answerId: string): Promise<boolean> {
  if (!UUID.test(answerId)) return false;
  return db().transaction(async (tx) => {
    const rows = await tx
      .update(answer)
      .set({ deletedAt: new Date() })
      .where(
        and(
          eq(answer.id, answerId),
          eq(answer.authorId, viewerId),
          isNull(answer.deletedAt),
          isNull(answer.removedAt),
        ),
      )
      .returning({ id: answer.id });
    if (!rows.length) return false;
    await tx
      .delete(reaction)
      .where(and(eq(reaction.targetType, "answer"), eq(reaction.targetId, answerId)));
    return true;
  });
}

// ============================================================ Comment writes

/**
 * A comment on a visible, live answer (J3 "Can reply?"): not blocked with the answer's author (the policy hides
 * the answer then), the question published. Comments are flat under the answer in the alpha.
 */
export async function createComment(
  viewer: Viewer,
  answerId: string,
  body: string,
): Promise<AnswerResult> {
  if (!mayWrite(viewer)) return { ok: false, reason: "not-allowed" };
  const live = await liveAnswer(answerId);
  if (!live || !(await canSeeAnswer(viewer, live.authorId)))
    return { ok: false, reason: "not-available" };
  const text = clean(body);
  if (!text || text.length > COMMENT_MAX) return { ok: false, reason: "not-allowed" };
  if (await restricted(viewer.id)) return { ok: false, reason: "restricted" };
  if (!(await consume("post", viewer.id)).allowed) return { ok: false, reason: "too-many" };
  let id: string;
  try {
    const [row] = await db()
      .insert(comment)
      .values({ answerId, authorId: viewer.id, body: text })
      .returning({ id: comment.id });
    id = row!.id;
  } catch (e) {
    throw new SafeDbError("createComment", e);
  }
  // Never about the own answer, never across a block (notify checks both).
  await notify({ recipientId: live.authorId, actorId: viewer.id, type: "comment", targetId: id });
  return { ok: true, id };
}

/** Soft delete of an own comment. Comments are flat, so nothing hangs on them and no placeholder is needed. */
export async function deleteOwnComment(viewer: Viewer, commentId: string): Promise<WriteResult> {
  if (!mayWrite(viewer)) return { ok: false, reason: "not-allowed" };
  if (!UUID.test(commentId)) return { ok: false, reason: "not-available" };
  if (!(await consume("contentEdit", viewer.id)).allowed) return { ok: false, reason: "too-many" };
  const rows = await db()
    .update(comment)
    .set({ deletedAt: new Date() })
    .where(
      and(
        eq(comment.id, commentId),
        eq(comment.authorId, viewer.id),
        isNull(comment.deletedAt),
        isNull(comment.removedAt),
      ),
    )
    .returning({ id: comment.id });
  return rows.length ? { ok: true } : { ok: false, reason: "not-available" };
}

// ============================================================ The reaction (D-056)

export type ReactionResult =
  | { ok: true; reacted: boolean; count: number }
  | { ok: false; reason: "not-available" | "not-allowed" | "too-many" };

/** One reaction per member and answer, a toggle. Not on the own answer (its count shows without a button). */
export async function setReaction(
  viewer: Viewer,
  answerId: string,
  on: boolean,
): Promise<ReactionResult> {
  if (!mayWrite(viewer)) return { ok: false, reason: "not-allowed" };
  const live = await liveAnswer(answerId);
  if (!live || live.authorId === viewer.id || !(await canSeeAnswer(viewer, live.authorId)))
    return { ok: false, reason: "not-available" };
  if (!(await consume("react", viewer.id)).allowed) return { ok: false, reason: "too-many" };
  if (on) {
    const added = await db()
      .insert(reaction)
      .values({ targetType: "answer", targetId: answerId, userId: viewer.id })
      .onConflictDoNothing()
      .returning({ userId: reaction.userId });
    // Grouped: at most one Activity entry per hour per answer (plan §2); the own answer never reaches here.
    if (added.length)
      await notify({
        recipientId: live.authorId,
        actorId: viewer.id,
        type: "reaction",
        targetId: answerId,
      });
  } else
    await db()
      .delete(reaction)
      .where(
        and(
          eq(reaction.targetType, "answer"),
          eq(reaction.targetId, answerId),
          eq(reaction.userId, viewer.id),
        ),
      );
  const counted = await reactionsFor(viewer, [answerId]);
  return { ok: true, reacted: on, count: counted.get(answerId)?.count ?? 0 };
}

/** Visible reactors per answer: hidden accounts and anyone blocked with the viewer do not count (POST-04). */
async function reactionsFor(viewer: Viewer, answerIds: readonly string[]) {
  const out = new Map<string, { count: number; reacted: boolean; userIds: string[] }>();
  if (!answerIds.length) return out;
  const rows = await db()
    .select({ targetId: reaction.targetId, userId: reaction.userId, at: reaction.createdAt })
    .from(reaction)
    .where(and(eq(reaction.targetType, "answer"), inArray(reaction.targetId, [...answerIds])))
    .orderBy(desc(reaction.createdAt));
  const ids = rows.map((r) => r.userId);
  const [owners, graphs] = await Promise.all([loadOwners(ids), loadGraphs(viewer.id, ids)]);
  for (const r of rows) {
    const o = owners.get(r.userId);
    if (!o || !visibleMember(viewer, o, graphs.get(r.userId))) continue;
    const e = out.get(r.targetId) ?? { count: 0, reacted: false, userIds: [] };
    e.count += 1;
    e.userIds.push(r.userId);
    if (r.userId === viewer.id) e.reacted = true;
    out.set(r.targetId, e);
  }
  return out;
}

/** A member whose content the viewer may see at all: active, onboarded, not blocked either way (or the viewer). */
function visibleMember(viewer: Viewer, o: OwnerRecord, g: Graph | undefined): boolean {
  return canViewContent("reactions", viewer, { author: o, threadVisible: true }, g).allowed;
}

/** POST-04: who reacted to an answer the viewer can see, newest first, filtered by blocks and hidden accounts. */
export async function whoReacted(viewer: Viewer, answerId: string): Promise<string[] | null> {
  if (!viewer.id) return null;
  const live = await liveAnswer(answerId);
  if (!live || !(await canSeeAnswer(viewer, live.authorId))) return null;
  return (await reactionsFor(viewer, [answerId])).get(answerId)?.userIds ?? [];
}

// ============================================================ Reads

export type Author = { id: string; username: string; displayName: string };

export type AnswerView = {
  kind: "answer";
  id: string;
  author: Author;
  body: string;
  language: string | null;
  createdAt: Date;
  editedAt: Date | null;
  mine: boolean;
  /** The viewer muted the author: collapsed with "Show" (SAFE-03); the author is never told. */
  muted: boolean;
  /** The viewer follows the author (For You puts these first, plan §1.2). */
  followed: boolean;
  reactions: number;
  reacted: boolean;
  comments: number;
};
/** A deleted or removed answer that still has replies the viewer can see (J3 E5, E6): only a placeholder. */
export type AnswerPlaceholder = {
  kind: "gone";
  id: string;
  createdAt: Date;
  comments: number;
  removed: boolean;
};
export type AnswerItem = AnswerView | AnswerPlaceholder;

export type Sort = "foryou" | "recent" | "discussed";
export const SORTS: readonly Sort[] = ["foryou", "recent", "discussed"];

type Row = typeof answer.$inferSelect;

/** Visible comments per answer, as the viewer may see them (blocked pairs and hidden accounts excluded). */
async function commentCounts(viewer: Viewer, answerIds: readonly string[]) {
  const out = new Map<string, number>();
  if (!answerIds.length) return out;
  const rows = await db()
    .select({ answerId: comment.answerId, authorId: comment.authorId })
    .from(comment)
    .where(
      and(
        inArray(comment.answerId, [...answerIds]),
        isNull(comment.deletedAt),
        isNull(comment.removedAt),
        isNotNull(comment.authorId),
      ),
    );
  const ids = rows.map((r) => r.authorId!);
  const [owners, graphs] = await Promise.all([loadOwners(ids), loadGraphs(viewer.id, ids)]);
  for (const r of rows) {
    const o = owners.get(r.authorId!);
    if (!o) continue;
    const d = canViewContent(
      "comment",
      viewer,
      { author: o, threadVisible: true },
      graphs.get(r.authorId!),
    );
    if (d.allowed) out.set(r.answerId, (out.get(r.answerId) ?? 0) + 1);
  }
  return out;
}

async function mutedBy(viewerId: string | null, ids: readonly string[]): Promise<Set<string>> {
  if (!viewerId || !ids.length) return new Set();
  const rows = await db()
    .select({ id: mute.mutedId })
    .from(mute)
    .where(and(eq(mute.muterId, viewerId), inArray(mute.mutedId, [...new Set(ids)])));
  return new Set(rows.map((r) => r.id));
}

async function followedBy(viewerId: string | null, ids: readonly string[]): Promise<Set<string>> {
  if (!viewerId || !ids.length) return new Set();
  const rows = await db()
    .select({ id: follow.followeeId })
    .from(follow)
    .where(
      and(
        eq(follow.followerId, viewerId),
        eq(follow.status, "accepted"),
        inArray(follow.followeeId, [...new Set(ids)]),
      ),
    );
  return new Set(rows.map((r) => r.id));
}

/** Turns answer rows into what the viewer may see: views, placeholders, or nothing. */
async function present(viewer: Viewer, rows: Row[]): Promise<AnswerItem[]> {
  const authorIds = rows.filter((r) => r.authorId).map((r) => r.authorId!);
  const ids = rows.map((r) => r.id);
  const [owners, graphs, comments, reactions, muted, followed] = await Promise.all([
    loadOwners(authorIds),
    loadGraphs(viewer.id, authorIds),
    commentCounts(viewer, ids),
    reactionsFor(viewer, ids),
    mutedBy(viewer.id, authorIds),
    followedBy(viewer.id, authorIds),
  ]);
  const out: AnswerItem[] = [];
  for (const r of rows) {
    const n = comments.get(r.id) ?? 0;
    const author = r.authorId ? owners.get(r.authorId) : undefined;
    const gone = !!r.deletedAt || !!r.removedAt || !author;
    if (gone) {
      // A placeholder only where other members' replies hang on it (Master Prompt §3: no anonymous full posts).
      if (n > 0)
        out.push({
          kind: "gone",
          id: r.id,
          createdAt: r.createdAt,
          comments: n,
          removed: !!r.removedAt,
        });
      continue;
    }
    const d = canViewContent("dropAnswer", viewer, { author }, graphs.get(author.id));
    if (!d.allowed || !author.username) continue; // blocked pairs and hidden accounts: nothing at all (D-019)
    const re = reactions.get(r.id);
    out.push({
      kind: "answer",
      id: r.id,
      author: { id: author.id, username: author.username, displayName: author.displayName },
      body: r.body,
      language: r.language,
      createdAt: r.createdAt,
      editedAt: r.editedAt,
      mine: viewer.id === author.id,
      muted: muted.has(author.id),
      followed: followed.has(author.id),
      reactions: re?.count ?? 0,
      reacted: re?.reacted ?? false,
      comments: n,
    });
  }
  return out;
}

const newest = (a: AnswerItem, b: AnswerItem) => b.createdAt.getTime() - a.createdAt.getTime();

/**
 * The three sorts (plan §1.2): For You = people the viewer follows first, then the rest by Recent (no scoring, no
 * reaction counts in the order, §5); Recent = newest first (late answers to older questions surface, D-036); Most
 * Discussed = visible comments, ties by Recent. The list is always complete; only the order changes.
 */
export function sortAnswers(items: AnswerItem[], sort: Sort): AnswerItem[] {
  const list = [...items];
  if (sort === "recent") return list.sort(newest);
  if (sort === "discussed") return list.sort((a, b) => b.comments - a.comments || newest(a, b));
  const f = (x: AnswerItem) => (x.kind === "answer" && x.followed ? 0 : 1);
  return list.sort((a, b) => f(a) - f(b) || newest(a, b));
}

export type QuestionAnswers = {
  /** The viewer's own answer (pinned at the top, D-035), if any. */
  mine: AnswerView | null;
  /** Everyone else's answers and placeholders, in the requested order. */
  items: AnswerItem[];
  /** Answers the viewer can see, the own one included (D-021 counts rule). Placeholders do not count. */
  count: number;
};

/** HUB-02: a published question's answers as the viewer may see them. Visitors and unpublished questions: none. */
export async function questionAnswers(
  viewer: Viewer,
  questionId: string,
  sort: Sort = "foryou",
): Promise<QuestionAnswers> {
  const empty: QuestionAnswers = { mine: null, items: [], count: 0 };
  if (!viewer.id || !(await isPublished(questionId))) return empty;
  const rows = await db()
    .select()
    .from(answer)
    .where(eq(answer.questionId, questionId))
    .orderBy(desc(answer.createdAt));
  const all = await present(viewer, rows);
  const mine = (all.find((a) => a.kind === "answer" && a.mine) as AnswerView | undefined) ?? null;
  const others = all.filter((a) => a !== mine);
  return {
    mine,
    items: sortAnswers(others, sort),
    count: all.filter((a) => a.kind === "answer").length,
  };
}

/** Kept from step 5.2 (tests): the live answers a viewer may see, newest first. */
export async function visibleAnswers(viewer: Viewer, questionId: string) {
  const { mine, items } = await questionAnswers(viewer, questionId, "recent");
  return [...(mine ? [mine] : []), ...items]
    .filter((a): a is AnswerView => a.kind === "answer")
    .sort(newest);
}

/**
 * The "New answers" check (J3 E3): how many answers the viewer can see now. Cheap enough for a minute's poll in
 * the alpha; nothing is inserted above the reading position, the page only offers a button.
 */
export async function visibleAnswerCount(viewer: Viewer, questionId: string): Promise<number> {
  return (await questionAnswers(viewer, questionId, "recent")).count;
}

export type CommentItem =
  | {
      kind: "comment";
      id: string;
      author: Author;
      body: string;
      createdAt: Date;
      editedAt: Date | null;
      mine: boolean;
      muted: boolean;
    }
  /** Blocked pair or a hidden account: "This comment isn't available" (D-019, S-17). */
  | { kind: "unavailable"; id: string };

export type AnswerThread = {
  questionId: string;
  date: string;
  answer: AnswerItem;
  comments: CommentItem[];
};

/**
 * HUB-03: one answer with its comments, oldest first. Null when the viewer may not see the answer (blocked
 * author, hidden account, unpublished question; J3 E13 answers "not available" like a missing one).
 */
export async function answerThread(viewer: Viewer, answerId: string): Promise<AnswerThread | null> {
  if (!viewer.id || !UUID.test(answerId)) return null;
  const [row] = await db()
    .select({ a: answer, status: question.status, date: question.publishDate })
    .from(answer)
    .innerJoin(question, eq(question.id, answer.questionId))
    .where(and(eq(answer.id, answerId), lte(question.publishDate, utcDate())));
  if (!row || row.status !== "published" || !row.date) return null;
  const [item] = await present(viewer, [row.a]);
  if (!item) return null;
  const rows = await db()
    .select()
    .from(comment)
    .where(
      and(eq(comment.answerId, answerId), isNull(comment.deletedAt), isNull(comment.removedAt)),
    )
    .orderBy(asc(comment.createdAt));
  const ids = rows.filter((r) => r.authorId).map((r) => r.authorId!);
  const [owners, graphs, muted] = await Promise.all([
    loadOwners(ids),
    loadGraphs(viewer.id, ids),
    mutedBy(viewer.id, ids),
  ]);
  const comments: CommentItem[] = [];
  for (const c of rows) {
    const o = c.authorId ? owners.get(c.authorId) : undefined;
    if (!o) continue; // purged authors: the row is only kept for counts, nothing to show
    const d = canViewContent(
      "comment",
      viewer,
      { author: o, threadVisible: true },
      graphs.get(o.id),
    );
    if (!d.allowed || !o.username) {
      if (d.mode === "placeholder") comments.push({ kind: "unavailable", id: c.id });
      continue;
    }
    comments.push({
      kind: "comment",
      id: c.id,
      author: { id: o.id, username: o.username, displayName: o.displayName },
      body: c.body,
      createdAt: c.createdAt,
      editedAt: c.editedAt,
      mine: viewer.id === o.id,
      muted: muted.has(o.id),
    });
  }
  return { questionId: row.a.questionId, date: row.date, answer: item, comments };
}

/** The question an answer belongs to (for links like /drop/<date>/a/<id>), only when published. */
export async function answerDate(answerId: string): Promise<string | null> {
  if (!UUID.test(answerId)) return null;
  const [row] = await db()
    .select({ date: question.publishDate, status: question.status })
    .from(answer)
    .innerJoin(question, eq(question.id, answer.questionId))
    .where(eq(answer.id, answerId));
  return row?.status === "published" && row.date && row.date <= utcDate() ? row.date : null;
}

/** Peeks on Home (HOME-01): the first answers in the For You order, never the viewer's own, never muted ones. */
export function peeks(items: AnswerItem[], n = 2): AnswerView[] {
  return items
    .filter((a): a is AnswerView => a.kind === "answer" && !a.mine && !a.muted)
    .slice(0, n);
}
