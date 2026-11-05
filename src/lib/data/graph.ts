// Writes on the social graph. Every write asks the policy first (canInteract) and keeps the invariants:
// a Mutual is derived (D-013); a block removes follows both ways in the same transaction (invariant 2, D-019).
import { and, eq, or, sql } from "drizzle-orm";
import { canInteract, type Viewer } from "@/lib/authz";
import { db, type Db } from "@/lib/db/client";
import { block, follow, mute } from "@/lib/db/schema";
import { loadGraph, loadOwner } from "./facts";
import { consume } from "./rate-limit";

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
  | { ok: false; reason: "not-available" | "not-allowed" };

/** Follow a member: accepted at once for public profiles, a pending request for private ones. */
export async function followMember(viewer: Viewer, targetId: string): Promise<GraphResult> {
  const target = await loadOwner(targetId);
  if (!viewer.id || !target) return { ok: false, reason: "not-available" };
  const graph = await loadGraph(viewer.id, targetId);
  const decision = canInteract("follow", viewer, target, graph);
  if (!decision.allowed) {
    // A blocked or hidden target looks exactly like a missing one (IA8).
    const hidden = decision.reason === "blocked" || decision.reason === "owner-hidden";
    return { ok: false, reason: hidden ? "not-available" : "not-allowed" };
  }
  if (!(await consume("follow", viewer.id)).allowed) return { ok: false, reason: "not-allowed" };
  const state = decision.pending ? "pending" : "accepted";
  const followerId = viewer.id;
  await db().transaction(async (tx) => {
    await lockPair(tx, followerId, targetId);
    await tx
      .insert(follow)
      .values({
        followerId,
        followeeId: targetId,
        status: state,
        acceptedAt: state === "accepted" ? new Date() : null,
      })
      .onConflictDoNothing();
  });
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
  return rows.length > 0;
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
