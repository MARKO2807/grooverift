// Writes on the social graph. Every write asks the policy first (canInteract) and keeps the invariants:
// a Mutual is derived (D-013); a block removes follows both ways in the same transaction (invariant 2, D-019).
import { and, desc, eq, gt, or, sql } from "drizzle-orm";
import { canInteract, ownerVisibleAtAll, relationship, type Viewer } from "@/lib/authz";
import { db, type Db } from "@/lib/db/client";
import { block, follow, followDecline, mute } from "@/lib/db/schema";
import { loadGraph, loadGraphs, loadOwner, loadOwners, loadViewer } from "./facts";
import { dropNotificationsBetween, notify } from "./notifications";
import { pushSocialInBackground } from "./push";

const REQUEST_PUSH_LIMIT = { limit: 1, windowSeconds: 86_400 };
import { consume } from "./rate-limit";

/** J4 E6 (review L7): after a decline, the same person may ask again after this many days. */
export const FOLLOW_DECLINE_DAYS = 7;

type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

/**
 * One lock per member pair for the transaction, taken by every graph write on that pair, so a follow and a block
 * can never interleave (review M2; the follow trigger in migration 0003 is the second line of defence).
 */
async function lockPair(tx: Tx, a: string, b: string) {
  const [x, y] = a < b ? [a, b] : [b, a];
  await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${x + ":" + y}, 0))`);
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type GraphResult =
  | { ok: true; state?: "pending" | "accepted" }
  | { ok: false; reason: "not-available" | "not-allowed" | "too-many" | "wait" };

/**
 * Follow a member: accepted at once for public profiles, a pending request for private ones. A request to someone
 * who declined one within FOLLOW_DECLINE_DAYS answers "wait" (J4 E6); the message says only that a request went
 * out recently, never that it was declined.
 */
export async function followMember(viewer: Viewer, targetId: string): Promise<GraphResult> {
  if (!UUID.test(targetId)) return { ok: false, reason: "not-available" };
  const target = await loadOwner(targetId);
  if (!viewer.id || !target) return { ok: false, reason: "not-available" };
  const graph = await loadGraph(viewer.id, targetId);
  const decision = canInteract("follow", viewer, target, graph);
  if (!decision.allowed) {
    // A blocked or hidden target looks exactly like a missing one (IA8).
    const hidden = decision.reason === "blocked" || decision.reason === "owner-hidden";
    return { ok: false, reason: hidden ? "not-available" : "not-allowed" };
  }
  if (decision.pending) {
    const since = new Date(Date.now() - FOLLOW_DECLINE_DAYS * 86_400_000);
    const [declined] = await db()
      .select({ at: followDecline.declinedAt })
      .from(followDecline)
      .where(
        and(
          eq(followDecline.ownerId, targetId),
          eq(followDecline.requesterId, viewer.id),
          gt(followDecline.declinedAt, since),
        ),
      );
    if (declined) return { ok: false, reason: "wait" };
  }
  if (!(await consume("follow", viewer.id)).allowed) return { ok: false, reason: "too-many" };
  const state = decision.pending ? "pending" : "accepted";
  const followerId = viewer.id;
  const inserted = await db().transaction(async (tx) => {
    await lockPair(tx, followerId, targetId);
    return tx
      .insert(follow)
      .values({
        followerId,
        followeeId: targetId,
        status: state,
        acceptedAt: state === "accepted" ? new Date() : null,
      })
      .onConflictDoNothing()
      .returning({ followerId: follow.followerId });
  });
  // A request is not an Activity entry: the requests row on top counts it (D-074 (5)); it may still be a push
  // under the "Pratitelji i zahtjevi" switch (step 5.12). canInteract above has ruled out a block and hidden accounts.
  if (inserted.length && state === "accepted")
    await notify({
      recipientId: targetId,
      actorId: followerId,
      type: "follow",
      targetId: followerId,
    });
  // At most one request push per pair a day (review 5.12 M1): follow, cancel, follow again must not ring the
  // owner's phone each time; the requests row in Activity still shows the request.
  if (
    inserted.length &&
    state === "pending" &&
    (await consume("pushFollowRequest", `${targetId}:${followerId}`, REQUEST_PUSH_LIMIT)).allowed
  )
    pushSocialInBackground({ recipientId: targetId, actorId: followerId, kind: "follow_request" });
  return { ok: true, state };
}

/** Unfollow, or withdraw a pending request. Silent for the other side. */
export async function unfollowMember(viewerId: string, targetId: string): Promise<void> {
  await db()
    .delete(follow)
    .where(and(eq(follow.followerId, viewerId), eq(follow.followeeId, targetId)));
}

/** Remove a follower (D-069): the follower no longer sees followers-only sections; no notification. */
export async function removeFollower(ownerId: string, followerId: string): Promise<void> {
  await db()
    .delete(follow)
    .where(and(eq(follow.followerId, followerId), eq(follow.followeeId, ownerId)));
}

/** Approve a pending request on the owner's private profile. */
export async function acceptFollowRequest(ownerId: string, followerId: string): Promise<boolean> {
  const rows = await db()
    .update(follow)
    .set({ status: "accepted", acceptedAt: new Date() })
    .where(
      and(
        eq(follow.followerId, followerId),
        eq(follow.followeeId, ownerId),
        eq(follow.status, "pending"),
      ),
    )
    .returning({ followerId: follow.followerId });
  if (rows.length)
    await notify({
      recipientId: followerId,
      actorId: ownerId,
      type: "follow_accept",
      targetId: ownerId,
    });
  return rows.length > 0;
}

/**
 * Decline a pending request (ACT-02, J4): the request disappears, the requester is not told (their button goes back
 * to "Request to follow") and may ask again after FOLLOW_DECLINE_DAYS (review L7). Idempotent.
 */
export async function declineFollowRequest(ownerId: string, followerId: string): Promise<boolean> {
  return db().transaction(async (tx) => {
    const rows = await tx
      .delete(follow)
      .where(
        and(
          eq(follow.followerId, followerId),
          eq(follow.followeeId, ownerId),
          eq(follow.status, "pending"),
        ),
      )
      .returning({ followerId: follow.followerId });
    if (!rows.length) return false;
    await tx
      .insert(followDecline)
      .values({ ownerId, requesterId: followerId })
      .onConflictDoUpdate({
        target: [followDecline.ownerId, followDecline.requesterId],
        set: { declinedAt: new Date() },
      });
    return true;
  });
}

export type PendingRequest = {
  userId: string;
  username: string;
  displayName: string;
  requestedAt: Date;
};

/**
 * The owner's open follow requests (ACT-02), newest first. A requester who became hidden in the meantime
 * (deactivated, unfinished, deleted) or who is blocked either way is left out (J4 E1, E9).
 */
export async function pendingFollowRequests(ownerId: string): Promise<PendingRequest[]> {
  const rows = await db()
    .select({ followerId: follow.followerId, createdAt: follow.createdAt })
    .from(follow)
    .where(and(eq(follow.followeeId, ownerId), eq(follow.status, "pending")))
    .orderBy(desc(follow.createdAt));
  if (!rows.length) return [];
  const ids = rows.map((r) => r.followerId);
  const viewer = await loadViewer({ id: ownerId, role: "member" });
  const [owners, graphs] = await Promise.all([loadOwners(ids), loadGraphs(ownerId, ids)]);
  return rows.flatMap((r) => {
    const o = owners.get(r.followerId);
    if (!o?.username) return [];
    const rel = relationship(viewer, o, graphs.get(r.followerId)!);
    if (rel === "BLOCKED" || !ownerVisibleAtAll(rel, o)) return [];
    return [
      { userId: o.id, username: o.username, displayName: o.displayName, requestedAt: r.createdAt },
    ];
  });
}

export async function pendingRequestCount(ownerId: string): Promise<number> {
  const [row] = await db()
    .select({ n: sql<number>`count(*)` })
    .from(follow)
    .where(and(eq(follow.followeeId, ownerId), eq(follow.status, "pending")));
  return Number(row?.n ?? 0);
}

/**
 * JO5: every pending request becomes an accepted follow (used when the profile turns public). Returns the
 * accepted followers; the caller notifies them after its transaction commits (notifyAccepted).
 */
export async function acceptAllPending(tx: Tx | Db, ownerId: string): Promise<string[]> {
  const rows = await tx
    .update(follow)
    .set({ status: "accepted", acceptedAt: new Date() })
    .where(and(eq(follow.followeeId, ownerId), eq(follow.status, "pending")))
    .returning({ followerId: follow.followerId });
  return rows.map((r) => r.followerId);
}

/** "X accepted your follow request" for each follower accepted in bulk (JO5). */
export async function notifyAccepted(
  ownerId: string,
  followerIds: readonly string[],
): Promise<void> {
  for (const followerId of followerIds)
    await notify({
      recipientId: followerId,
      actorId: ownerId,
      type: "follow_accept",
      targetId: ownerId,
    });
}

/**
 * Block (invariant 2): hides the pair from each other while signed in and removes every follow and pending
 * request between them, both ways, in one transaction. A mute of the same person is kept (it is silent and
 * one-way) but has no visible effect while the block stands.
 */
export async function blockMember(viewerId: string, targetId: string): Promise<GraphResult> {
  if (viewerId === targetId || !UUID.test(targetId)) return { ok: false, reason: "not-allowed" };
  // Same answer for an unknown id as for any hidden member: nothing to block, nothing to say (review L1).
  if (!(await loadOwner(targetId))) return { ok: true };
  await db().transaction(async (tx) => {
    await lockPair(tx, viewerId, targetId);
    await tx
      .insert(block)
      .values({ blockerId: viewerId, blockedId: targetId })
      .onConflictDoNothing();
    await tx
      .delete(follow)
      .where(
        or(
          and(eq(follow.followerId, viewerId), eq(follow.followeeId, targetId)),
          and(eq(follow.followerId, targetId), eq(follow.followeeId, viewerId)),
        ),
      );
    await dropNotificationsBetween(tx, viewerId, targetId);
  });
  return { ok: true };
}

/** Unblock: the pair can see each other again; follows do not come back (D-019). */
export async function unblockMember(viewerId: string, targetId: string): Promise<void> {
  await db()
    .delete(block)
    .where(and(eq(block.blockerId, viewerId), eq(block.blockedId, targetId)));
}

export async function muteMember(viewerId: string, targetId: string): Promise<GraphResult> {
  if (viewerId === targetId || !UUID.test(targetId)) return { ok: false, reason: "not-allowed" };
  if (!(await loadOwner(targetId))) return { ok: true }; // as blockMember (review L1)
  await db().insert(mute).values({ muterId: viewerId, mutedId: targetId }).onConflictDoNothing();
  return { ok: true };
}

export async function unmuteMember(viewerId: string, targetId: string): Promise<void> {
  await db()
    .delete(mute)
    .where(and(eq(mute.muterId, viewerId), eq(mute.mutedId, targetId)));
}
