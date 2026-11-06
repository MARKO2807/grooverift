// Activity (ACT-01, step 5.8): the one place that writes in-app notifications, and the one read that renders them.
//
// Write (notify): never about the recipient's own act, never across a block (either way), never to or from a
// hidden account; reactions and repeated follows are grouped into one entry per window (plan §2: at most one
// reaction entry per hour per answer). A notification row stores only ids, never content.
//
// Read (activityFor): every row is checked again at render (matrix §4, JR1): the actor must still be visible to
// the recipient (not blocked either way, not hidden, not muted), and the target must still exist and still be
// the recipient's (a deleted comment, a deleted or removed answer, an unfollow or a withdrawn question render as
// nothing). The deep links are re-authorized by the pages they open.
import { and, desc, eq, gte, inArray, isNull, lte, sql } from "drizzle-orm";
import { relationship, ownerVisibleAtAll, type Graph } from "@/lib/authz";
import { db, type Db } from "@/lib/db/client";
import {
  comment,
  dailyDropAnswer as answer,
  dailyDropQuestion as question,
  follow,
  mute,
  notification,
  reaction,
} from "@/lib/db/schema";
import { utcDate } from "@/lib/editorial/rules";
import { publishedOn } from "./drops";
import { loadGraphs, loadOwners, loadViewer, type OwnerRecord } from "./facts";

export const NOTIFICATION_TYPES = ["comment", "reaction", "follow", "follow_accept"] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

/** How long a group stays open: a new event inside the window marks the entry unread instead of adding one. */
export const GROUP_WINDOW_MS: Partial<Record<NotificationType, number>> = {
  reaction: 60 * 60_000, // plan §2: one reaction entry per hour per answer
  follow: 24 * 60 * 60_000, // follow, unfollow, follow again: one entry a day
  follow_accept: 24 * 60 * 60_000,
};

/** Activity shows the last 30 days (older rows are pruned by the worker), at most this many entries. */
export const ACTIVITY_DAYS = 30;
export const ACTIVITY_LIMIT = 100;
/** A comment excerpt in Activity; the full text is one tap away. */
export const EXCERPT_MAX = 90;

type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

export type NotifyInput = {
  recipientId: string;
  actorId: string;
  type: NotificationType;
  targetId: string;
};

const TARGET_TYPE: Record<NotificationType, string> = {
  comment: "comment",
  reaction: "answer",
  follow: "user",
  follow_accept: "user",
};

const groupKeyOf = (n: NotifyInput) =>
  n.type === "reaction"
    ? `reaction:${n.targetId}`
    : n.type === "follow" || n.type === "follow_accept"
      ? `${n.type}:${n.actorId}`
      : null;

/** May `actorId` notify `recipientId` at all? Not the same person, no block either way, both visible. */
async function mayNotify(recipientId: string, actorId: string): Promise<boolean> {
  if (recipientId === actorId) return false;
  const [owners, graphs] = await Promise.all([
    loadOwners([recipientId, actorId]),
    loadGraphs(recipientId, [actorId]),
  ]);
  const recipient = owners.get(recipientId);
  const actor = owners.get(actorId);
  if (!recipient || !actor) return false;
  if (recipient.status !== "active" || recipient.onboarded === false) return false;
  const g = graphs.get(actorId);
  if (!g || g.blocked) return false;
  return actor.status === "active" && actor.onboarded !== false;
}

/**
 * The notification writer. Returns whether a row was written or re-opened. Errors are logged without content and
 * never fail the act that caused them (a comment is posted even if its notification cannot be written).
 */
export async function notify(input: NotifyInput): Promise<boolean> {
  try {
    if (!(await mayNotify(input.recipientId, input.actorId))) return false;
    const groupKey = groupKeyOf(input);
    const window = GROUP_WINDOW_MS[input.type];
    return await db().transaction(async (tx: Tx) => {
      if (groupKey && window) {
        // One writer per recipient and group at a time, so two reactions in the same second make one entry.
        await tx.execute(
          sql`select pg_advisory_xact_lock(hashtextextended(${input.recipientId + ":" + groupKey}, 0))`,
        );
        const since = new Date(Date.now() - window);
        const reopened = await tx
          .update(notification)
          .set({ readAt: null })
          .where(
            and(
              eq(notification.recipientId, input.recipientId),
              eq(notification.groupKey, groupKey),
              gte(notification.createdAt, since),
            ),
          )
          .returning({ id: notification.id });
        if (reopened.length) return true;
      }
      await tx.insert(notification).values({
        recipientId: input.recipientId,
        type: input.type,
        actorId: input.actorId,
        targetType: TARGET_TYPE[input.type],
        targetId: input.targetId,
        groupKey,
      });
      return true;
    });
  } catch (error) {
    console.error("[notify] failed:", input.type, error instanceof Error ? error.name : "unknown");
    return false;
  }
}

/** A block removes every notification between the pair, both ways (J5: "removed or rendered without details"). */
export async function dropNotificationsBetween(tx: Tx | Db, a: string, b: string): Promise<void> {
  await tx.delete(notification).where(
    sql`(${notification.recipientId} = ${a} and ${notification.actorId} = ${b})
       or (${notification.recipientId} = ${b} and ${notification.actorId} = ${a})`,
  );
}

/** Mark everything the viewer has seen as read: rows up to `upTo` (the newest entry the page showed). */
export async function markActivityRead(viewerId: string, upTo: Date): Promise<void> {
  await db()
    .update(notification)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(notification.recipientId, viewerId),
        isNull(notification.readAt),
        lte(notification.createdAt, upTo),
      ),
    );
}

/** Housekeeping (worker): rows older than ACTIVITY_DAYS are never shown, so they are deleted. */
export async function pruneNotifications(now = new Date()): Promise<number> {
  const before = new Date(now.getTime() - ACTIVITY_DAYS * 86_400_000);
  const rows = await db()
    .delete(notification)
    .where(lte(notification.createdAt, before))
    .returning({ id: notification.id });
  return rows.length;
}

// ============================================================ Read

export type Person = { username: string; displayName: string };

export type ActivityItem =
  | {
      kind: "comment";
      id: string;
      at: Date;
      unread: boolean;
      actor: Person;
      excerpt: string;
      href: string;
    }
  | {
      kind: "reaction";
      id: string;
      at: Date;
      unread: boolean;
      /** The newest visible reactors in this group, at most two named; `others` counts the rest. */
      actors: Person[];
      others: number;
      href: string;
    }
  | { kind: "follow" | "follow_accept"; id: string; at: Date; unread: boolean; actor: Person }
  | { kind: "drop"; id: string; at: Date; unread: false; question: string; href: string };

const excerpt = (body: string) => {
  const flat = body.replace(/\s+/g, " ").trim();
  return flat.length > EXCERPT_MAX ? `${flat.slice(0, EXCERPT_MAX - 1).trimEnd()}…` : flat;
};

/**
 * ACT-01 for the viewer: the last ACTIVITY_DAYS days, newest first, every row re-checked (see the file header).
 * Today's published Daily Drop joins as one line at its publication time (never tinted, it is not stored).
 * The read uses the member-side relationship even for staff: Activity is the member's own view.
 */
export async function activityFor(viewerId: string, locale: "hr" | "en"): Promise<ActivityItem[]> {
  const since = new Date(Date.now() - ACTIVITY_DAYS * 86_400_000);
  const rows = await db()
    .select()
    .from(notification)
    .where(and(eq(notification.recipientId, viewerId), gte(notification.createdAt, since)))
    .orderBy(desc(notification.createdAt))
    .limit(ACTIVITY_LIMIT);

  const byType = (t: NotificationType) => rows.filter((r) => r.type === t && r.targetId);
  const commentIds = byType("comment").map((r) => r.targetId!);
  const reactionAnswerIds = byType("reaction").map((r) => r.targetId!);

  // Comments and the answers they hang on, only while both are live, the answer is the viewer's own and its
  // question is published (status and date: a withdrawn question renders nothing, U-03).
  const today = utcDate();
  const comments = commentIds.length
    ? await db()
        .select({
          id: comment.id,
          body: comment.body,
          answerId: comment.answerId,
          date: question.publishDate,
        })
        .from(comment)
        .innerJoin(answer, eq(answer.id, comment.answerId))
        .innerJoin(question, eq(question.id, answer.questionId))
        .where(
          and(
            inArray(comment.id, commentIds),
            isNull(comment.deletedAt),
            isNull(comment.removedAt),
            eq(answer.authorId, viewerId),
            isNull(answer.deletedAt),
            isNull(answer.removedAt),
            eq(question.status, "published"),
            lte(question.publishDate, today),
          ),
        )
    : [];
  const commentById = new Map(comments.map((c) => [c.id, c]));

  const answers = reactionAnswerIds.length
    ? await db()
        .select({ id: answer.id, date: question.publishDate })
        .from(answer)
        .innerJoin(question, eq(question.id, answer.questionId))
        .where(
          and(
            inArray(answer.id, reactionAnswerIds),
            eq(answer.authorId, viewerId),
            isNull(answer.deletedAt),
            isNull(answer.removedAt),
            eq(question.status, "published"),
            lte(question.publishDate, today),
          ),
        )
    : [];
  const answerDate = new Map(answers.map((a) => [a.id, a.date]));
  const reactions = answers.length
    ? await db()
        .select({ answerId: reaction.targetId, userId: reaction.userId, at: reaction.createdAt })
        .from(reaction)
        .where(
          and(
            eq(reaction.targetType, "answer"),
            inArray(
              reaction.targetId,
              answers.map((a) => a.id),
            ),
          ),
        )
        .orderBy(desc(reaction.createdAt))
    : [];

  // Everyone who appears: actors of rows and every reactor.
  const people = [
    ...new Set([
      ...rows.filter((r) => r.actorId).map((r) => r.actorId!),
      ...reactions.map((r) => r.userId),
    ]),
  ].filter((id) => id !== viewerId);
  const [viewer, owners, graphs, muted, followRows] = await Promise.all([
    loadViewer({ id: viewerId, role: "member" }),
    loadOwners(people),
    loadGraphs(viewerId, people),
    people.length
      ? db()
          .select({ id: mute.mutedId })
          .from(mute)
          .where(and(eq(mute.muterId, viewerId), inArray(mute.mutedId, people)))
          .then((r) => new Set(r.map((x) => x.id)))
      : Promise.resolve(new Set<string>()),
    people.length
      ? db()
          .select({ from: follow.followerId, to: follow.followeeId })
          .from(follow)
          .where(
            and(
              eq(follow.status, "accepted"),
              sql`((${follow.followeeId} = ${viewerId} and ${inArray(follow.followerId, people)})
                or (${follow.followerId} = ${viewerId} and ${inArray(follow.followeeId, people)}))`,
            ),
          )
      : Promise.resolve([] as { from: string; to: string }[]),
  ]);

  /** A person the viewer may be told about: visible, not blocked either way, not muted, with a handle. */
  const visible = (id: string | null): (OwnerRecord & { username: string }) | null => {
    if (!id) return null;
    const o = owners.get(id);
    const g: Graph | undefined = graphs.get(id);
    if (!o?.username || !g || g.blocked || muted.has(id)) return null;
    if (!ownerVisibleAtAll(relationship(viewer, o, g), o)) return null;
    return o as OwnerRecord & { username: string };
  };
  const person = (o: OwnerRecord & { username: string }): Person => ({
    username: o.username,
    displayName: o.displayName,
  });
  const followsMe = new Set(followRows.filter((f) => f.to === viewerId).map((f) => f.from));
  const iFollow = new Set(followRows.filter((f) => f.from === viewerId).map((f) => f.to));

  const items: ActivityItem[] = [];
  for (const r of rows) {
    const unread = !r.readAt;
    const type = r.type as NotificationType;
    if (type === "comment") {
      const c = commentById.get(r.targetId ?? "");
      const actor = visible(r.actorId);
      if (!c || !actor || !c.date) continue;
      items.push({
        kind: "comment",
        id: r.id,
        at: r.createdAt,
        unread,
        actor: person(actor),
        excerpt: excerpt(c.body),
        href: `/drop/${c.date}/a/${c.answerId}#c-${c.id}`,
      });
    } else if (type === "reaction") {
      const date = answerDate.get(r.targetId ?? "");
      if (!date) continue;
      // The group: reactions that arrived from just before this entry until its window closed.
      const from = r.createdAt.getTime() - 60_000;
      const to = r.createdAt.getTime() + GROUP_WINDOW_MS.reaction!;
      const who = reactions
        .filter((x) => x.answerId === r.targetId && x.at.getTime() >= from && x.at.getTime() < to)
        .map((x) => visible(x.userId))
        .filter((o): o is OwnerRecord & { username: string } => !!o);
      if (!who.length) continue;
      items.push({
        kind: "reaction",
        id: r.id,
        at: r.createdAt,
        unread,
        actors: who.slice(0, 2).map(person),
        others: who.length - Math.min(2, who.length),
        href: `/drop/${date}/a/${r.targetId}`,
      });
    } else if (type === "follow" || type === "follow_accept") {
      const actor = visible(r.actorId);
      if (!actor) continue;
      // Still true? An unfollow (or a removed follower) since then renders nothing.
      const holds = type === "follow" ? followsMe.has(actor.id) : iFollow.has(actor.id);
      if (!holds) continue;
      items.push({ kind: type, id: r.id, at: r.createdAt, unread, actor: person(actor) });
    }
  }

  // Today's Daily Drop (published, dated today) as one untinted line at 00:00 UTC.
  const drop = await publishedOn(today, locale);
  if (drop?.text) {
    const at = new Date(`${drop.date}T00:00:00Z`);
    const line: ActivityItem = {
      kind: "drop",
      id: `drop-${drop.id}`,
      at,
      unread: false,
      question: drop.text,
      href: `/drop/${drop.date}`,
    };
    const i = items.findIndex((x) => x.at < at);
    items.splice(i === -1 ? items.length : i, 0, line);
  }
  return items;
}
