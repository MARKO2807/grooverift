// Profiles through the policy (PROF-01, PUB-08). One shape for "not available" whatever the reason: never
// existed, deleted, deactivated, suspended, banned, private to a visitor, blocked, unfinished onboarding, or a
// reserved old username (IA8, U-02, U-04). Callers render SYS-01 with a 404 for it.
import { and, eq, gt, sql } from "drizzle-orm";
import { canViewProfileSection, type Graph, type ProfileSection, type Viewer } from "@/lib/authz";
import { db } from "@/lib/db/client";
import { profile, usernameReservation } from "@/lib/db/schema";
import { loadGraph, loadOwner } from "./facts";

export type ProfileView =
  | { kind: "not-available" }
  | {
      kind: "profile";
      /** A projection only: never the owner's status or section settings (review L3). */
      ownerId: string;
      self: boolean;
      /** The viewer's own relationship to the owner (blocked pairs never get here). */
      relation: Pick<Graph, "follows" | "followedBy">;
      username: string;
      displayName: string;
      /** Only the sections the viewer may see are present; hidden ones are omitted, not "locked" (PROF-01). */
      bio?: string | null;
      sections: Partial<Record<ProfileSection, true>>;
      /** "minimal" for signed-out visitors (PUB-08). */
      minimal: boolean;
    };

export const NOT_AVAILABLE = { kind: "not-available" } as const;

const SECTIONS: ProfileSection[] = ["bio", "musicDna", "lists", "dropHistory", "posts"];

/** Usernames are compared case-insensitively; the stored form is lower-case (profile_username_shape). */
export const normalizeUsername = (u: string) => u.trim().toLowerCase();

export async function profileByUsername(viewer: Viewer, raw: string): Promise<ProfileView> {
  const username = normalizeUsername(raw);
  if (!/^[a-z0-9_]{3,30}$/.test(username)) return NOT_AVAILABLE;
  const [row] = await db()
    .select({ userId: profile.userId, onboardedAt: profile.onboardedAt, bio: profile.bio })
    .from(profile)
    .where(sql`lower(${profile.username}) = ${username}`);
  if (!row) return NOT_AVAILABLE; // also covers reserved old usernames: no redirect (U-04)
  const owner = await loadOwner(row.userId);
  if (!owner) return NOT_AVAILABLE;
  const isSelf = viewer.id === owner.id;
  if (!row.onboardedAt && !isSelf) return NOT_AVAILABLE; // also enforced by the policy (owner.onboarded)
  const graph = await loadGraph(viewer.id, owner.id);
  const identity = canViewProfileSection("identity", viewer, owner, graph);
  if (!identity.allowed) return NOT_AVAILABLE;
  const sections: Partial<Record<ProfileSection, true>> = { identity: true };
  for (const s of SECTIONS) {
    if (canViewProfileSection(s, viewer, owner, graph).allowed) sections[s] = true;
  }
  return {
    kind: "profile",
    ownerId: owner.id,
    self: isSelf,
    relation: { follows: graph.follows, followedBy: graph.followedBy },
    username: owner.username ?? username,
    displayName: owner.displayName,
    bio: sections.bio ? row.bio : undefined,
    sections,
    minimal: identity.mode === "minimal",
  };
}

/** Is a username free to take? Taken by a profile (any case) or reserved by someone else → no (D-069). */
export async function usernameAvailable(raw: string, forUserId?: string): Promise<boolean> {
  const username = normalizeUsername(raw);
  const [taken] = await db()
    .select({ userId: profile.userId })
    .from(profile)
    .where(sql`lower(${profile.username}) = ${username}`);
  if (taken && taken.userId !== forUserId) return false;
  const [reserved] = await db()
    .select({ userId: usernameReservation.userId })
    .from(usernameReservation)
    .where(
      and(
        eq(usernameReservation.username, username),
        gt(usernameReservation.reservedUntil, new Date()),
      ),
    );
  return !reserved || reserved.userId === forUserId;
}
