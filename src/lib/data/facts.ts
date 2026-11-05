// Loaders that build the facts for the policy module (src/lib/authz/policy.ts): Viewer, Owner and Graph.
// Every product read starts here, so the same rules hold for pages, actions, search, notifications and exports
// (visibility matrix §4). Batch loaders exist so lists never call the database once per row.
import { and, eq, inArray, or } from "drizzle-orm";
import type { Role } from "@/lib/auth/roles";
import type { AccountStatus, Graph, Owner, Viewer } from "@/lib/authz";
import { db } from "@/lib/db/client";
import { block, follow, privacySettings, profile, user } from "@/lib/db/schema";

const STATUSES: readonly AccountStatus[] = [
  "active",
  "deactivated",
  "suspended",
  "banned",
  "pending_deletion",
  "deleted",
];
export const asStatus = (s: string | null | undefined): AccountStatus =>
  STATUSES.includes(s as AccountStatus) ? (s as AccountStatus) : "deleted"; // unknown fails closed

/**
 * The signed-in viewer (or the anonymous one). Status, second factor and onboarding are read fresh, not from the
 * session cache. Pages pass `{ id: session.user.id, role: roleOf(session) }` (src/lib/auth/session.ts).
 * A staff role without a second factor counts as a member here, as staffGate does for pages (review M3).
 */
export async function loadViewer(who: { id: string; role: Role } | null): Promise<Viewer> {
  if (!who) return { id: null, role: "member" };
  const [row] = await db()
    .select({
      status: user.status,
      twoFactor: user.twoFactorEnabled,
      onboardedAt: profile.onboardedAt,
    })
    .from(user)
    .leftJoin(profile, eq(profile.userId, user.id))
    .where(eq(user.id, who.id));
  const role: Role = who.role !== "member" && !row?.twoFactor ? "member" : who.role;
  return {
    id: who.id,
    role,
    status: asStatus(row?.status),
    onboarded: !!row?.onboardedAt,
  };
}

export type OwnerRecord = Owner & { username: string | null; displayName: string };

/**
 * Owners by id. A member who has not finished onboarding is hidden from everyone else (onboarded: false, review
 * M4); a missing profile or privacy row also reads as private with every section closed (fail closed).
 */
export async function loadOwners(ids: readonly string[]): Promise<Map<string, OwnerRecord>> {
  const unique = [...new Set(ids)];
  const out = new Map<string, OwnerRecord>();
  if (!unique.length) return out;
  const rows = await db()
    .select({
      id: user.id,
      status: user.status,
      name: user.name,
      username: profile.username,
      displayName: profile.displayName,
      onboardedAt: profile.onboardedAt,
      visibility: profile.visibility,
      musicDna: privacySettings.musicDna,
      lists: privacySettings.lists,
      dropHistory: privacySettings.dropHistory,
    })
    .from(user)
    .leftJoin(profile, eq(profile.userId, user.id))
    .leftJoin(privacySettings, eq(privacySettings.userId, user.id))
    .where(inArray(user.id, unique));
  for (const r of rows) {
    out.set(r.id, {
      id: r.id,
      status: asStatus(r.status),
      profile: r.visibility ?? "private",
      musicDna: r.musicDna ?? "me",
      lists: r.lists ?? "me",
      dropHistory: r.dropHistory ?? "me",
      onboarded: !!r.onboardedAt,
      username: r.username,
      displayName: r.displayName ?? r.name,
    });
  }
  return out;
}

export async function loadOwner(id: string): Promise<OwnerRecord | null> {
  return (await loadOwners([id])).get(id) ?? null;
}

const NO_GRAPH: Graph = { blocked: false, follows: "none", followedBy: false };

/** The graph between one viewer and many owners: blocks in either direction and follows both ways. */
export async function loadGraphs(
  viewerId: string | null,
  ownerIds: readonly string[],
): Promise<Map<string, Graph>> {
  const out = new Map<string, Graph>();
  const others = [...new Set(ownerIds)].filter((o) => o !== viewerId);
  for (const o of ownerIds) out.set(o, { ...NO_GRAPH });
  if (!viewerId || !others.length) return out;
  const [blocks, follows] = await Promise.all([
    db()
      .select({ blockerId: block.blockerId, blockedId: block.blockedId })
      .from(block)
      .where(
        or(
          and(eq(block.blockerId, viewerId), inArray(block.blockedId, others)),
          and(eq(block.blockedId, viewerId), inArray(block.blockerId, others)),
        ),
      ),
    db()
      .select({
        followerId: follow.followerId,
        followeeId: follow.followeeId,
        status: follow.status,
      })
      .from(follow)
      .where(
        or(
          and(eq(follow.followerId, viewerId), inArray(follow.followeeId, others)),
          and(eq(follow.followeeId, viewerId), inArray(follow.followerId, others)),
        ),
      ),
  ]);
  for (const b of blocks) {
    const other = b.blockerId === viewerId ? b.blockedId : b.blockerId;
    out.get(other)!.blocked = true;
  }
  for (const f of follows) {
    if (f.followerId === viewerId) out.get(f.followeeId)!.follows = f.status;
    else if (f.status === "accepted") out.get(f.followerId)!.followedBy = true;
  }
  return out;
}

export async function loadGraph(viewerId: string | null, ownerId: string): Promise<Graph> {
  return (await loadGraphs(viewerId, [ownerId])).get(ownerId) ?? { ...NO_GRAPH };
}
