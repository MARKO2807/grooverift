// Profiles through the policy (PROF-01, PROF-03, PROF-07, PROF-08, PROF-10, PUB-08, SET-05; steps 5.2 and 5.5).
// One shape for "not available" whatever the reason: never existed, deleted, deactivated, suspended, banned,
// private to a visitor, blocked by the owner, unfinished onboarding, or a reserved old username (IA8, U-02, U-04).
// Callers render SYS-01 with a 404 for it. The blocker's own view is the one exception (J4 B state, D-019): they
// see that they blocked this account, so they can undo it.
import { and, desc, eq, gt, inArray, isNotNull, isNull, sql } from "drizzle-orm";
import {
  canViewProfileSection,
  ownerVisibleAtAll,
  relationship,
  type Graph,
  type ProfileSection,
  type SectionVisibility,
  type Viewer,
} from "@/lib/authz";
import { db, type Db } from "@/lib/db/client";
import {
  dailyDropAnswer,
  dailyDropQuestion,
  dailyDropTranslation,
  follow,
  privacySettings,
  profile,
  user,
  usernameReservation,
} from "@/lib/db/schema";
import {
  AUDIENCES,
  BIO_MAX,
  cleanBio,
  DISPLAY_NAME_MAX,
  DISPLAY_NAME_WORDS,
  nextUsernameChange,
  PRIVACY_SECTIONS,
  USERNAME_CHANGE_DAYS,
  USERNAME_RESERVE_DAYS,
  USERNAME_SHAPE,
  validDisplayName,
  type Audience,
  type PrivacySection,
} from "@/lib/profile/constants";
import { isUniqueViolation } from "./db-errors";
import { loadGraph, loadGraphs, loadOwner, loadOwners, type OwnerRecord } from "./facts";
import { acceptAllPending, notifyAccepted, pendingRequestCount } from "./graph";

// Re-exported for the data-layer callers (onboarding, actions, tests); client code imports @/lib/profile/constants.
export {
  AUDIENCES,
  BIO_MAX,
  cleanBio,
  DISPLAY_NAME_MAX,
  DISPLAY_NAME_WORDS,
  nextUsernameChange,
  PRIVACY_SECTIONS,
  USERNAME_CHANGE_DAYS,
  USERNAME_RESERVE_DAYS,
  USERNAME_SHAPE,
  validDisplayName,
};
export type { Audience, PrivacySection };

export type Relation = Pick<Graph, "follows" | "followedBy">;

export type ProfileCounts = { followers?: number; following?: number; answers?: number };

export type ProfileView =
  | { kind: "not-available" }
  /** The viewer blocked this member (J4 B state): header only, with Unblock. */
  | { kind: "blocked-by-you"; ownerId: string; username: string; displayName: string }
  | {
      kind: "profile";
      /** A projection only: never the owner's status or section settings (review L3). */
      ownerId: string;
      self: boolean;
      /** The viewer's own relationship to the owner (blocked pairs never get here). */
      relation: Relation;
      username: string;
      displayName: string;
      /** Only the sections the viewer may see are present; hidden ones are omitted, not "locked" (PROF-01). */
      bio?: string | null;
      sections: Partial<Record<ProfileSection, true>>;
      /** "minimal" for signed-out visitors (PUB-08). */
      minimal: boolean;
      /** J4 P state: a private profile the viewer may not enter (header, bio and "Request to follow"). */
      privateToViewer: boolean;
      /** The target of the relationship button: a private profile takes a request (D-013). */
      targetPrivate: boolean;
      /** Counts only for the lists the viewer may see (D-033, U-13). */
      counts: ProfileCounts;
      /** The owner's own settings, for their own view only (audience labels, PROF-10). */
      own?: {
        visibility: "public" | "private";
        discoverable: boolean;
        musicDna: SectionVisibility;
        lists: SectionVisibility;
        dropHistory: SectionVisibility;
        pendingRequests: number;
      };
    };

export const NOT_AVAILABLE = { kind: "not-available" } as const;

const SECTIONS: ProfileSection[] = ["bio", "musicDna", "lists", "dropHistory", "posts"];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Usernames are compared case-insensitively; the stored form is lower-case (profile_username_shape). */
export const normalizeUsername = (u: string) => u.trim().toLowerCase();

async function profileRow(username: string) {
  const [row] = await db()
    .select({
      userId: profile.userId,
      onboardedAt: profile.onboardedAt,
      bio: profile.bio,
      discoverable: profile.discoverable,
    })
    .from(profile)
    .where(sql`lower(${profile.username}) = ${username}`);
  return row ?? null;
}

export async function profileByUsername(viewer: Viewer, raw: string): Promise<ProfileView> {
  const username = normalizeUsername(raw);
  if (!USERNAME_SHAPE.test(username)) return NOT_AVAILABLE;
  const row = await profileRow(username);
  if (!row) return NOT_AVAILABLE; // also covers reserved old usernames: no redirect (U-04)
  const owner = await loadOwner(row.userId);
  if (!owner) return NOT_AVAILABLE;
  const isSelf = viewer.id === owner.id;
  if (!row.onboardedAt && !isSelf) return NOT_AVAILABLE; // also enforced by the policy (owner.onboarded)
  const graph = await loadGraph(viewer.id, owner.id);
  const rel = relationship(viewer, owner, graph);
  if (rel === "BLOCKED" && graph.blockedByViewer && ownerVisibleAtAll("MEMBER", owner)) {
    // The blocker sees their own block (and nothing else); the blocked side gets "not available" below.
    return {
      kind: "blocked-by-you",
      ownerId: owner.id,
      username: owner.username ?? username,
      displayName: owner.displayName,
    };
  }
  const identity = canViewProfileSection("identity", viewer, owner, graph);
  if (!identity.allowed) return NOT_AVAILABLE;
  const sections: Partial<Record<ProfileSection, true>> = { identity: true };
  for (const s of SECTIONS) {
    if (canViewProfileSection(s, viewer, owner, graph).allowed) sections[s] = true;
  }
  const counts = await profileCounts(owner.id, {
    lists: !!sections.lists,
    answers: !!sections.dropHistory,
  });
  const privateToViewer =
    !isSelf && rel !== "ANON" && owner.profile === "private" && !sections.posts;
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
    privateToViewer,
    targetPrivate: owner.profile === "private",
    counts,
    own: isSelf
      ? {
          visibility: owner.profile,
          discoverable: row.discoverable,
          musicDna: owner.musicDna,
          lists: owner.lists,
          dropHistory: owner.dropHistory,
          pendingRequests: await pendingRequestCount(owner.id),
        }
      : undefined,
  };
}

/** Counts (D-033, U-13): pending requests never count; only answers that are visible to members count (D-021). */
async function profileCounts(
  ownerId: string,
  want: { lists: boolean; answers: boolean },
): Promise<ProfileCounts> {
  const out: ProfileCounts = {};
  if (want.lists) {
    const [row] = await db()
      .select({
        followers: sql<number>`(select count(*) from ${follow} where ${follow.followeeId} = ${ownerId} and ${follow.status} = 'accepted')`,
        following: sql<number>`(select count(*) from ${follow} where ${follow.followerId} = ${ownerId} and ${follow.status} = 'accepted')`,
      })
      .from(sql`(select 1) as one`);
    out.followers = Number(row?.followers ?? 0);
    out.following = Number(row?.following ?? 0);
  }
  if (want.answers) out.answers = await answerCount(ownerId);
  return out;
}

async function answerCount(ownerId: string): Promise<number> {
  const [row] = await db()
    .select({ n: sql<number>`count(*)` })
    .from(dailyDropAnswer)
    .innerJoin(dailyDropQuestion, eq(dailyDropQuestion.id, dailyDropAnswer.questionId))
    .where(
      and(
        eq(dailyDropAnswer.authorId, ownerId),
        isNull(dailyDropAnswer.deletedAt),
        isNull(dailyDropAnswer.removedAt),
        eq(dailyDropQuestion.status, "published"),
      ),
    );
  return Number(row?.n ?? 0);
}

// ---------------------------------------------------------------- people as rows (lists, requests, search)

/** One person in a list or a search result: what the viewer may know about them, with the viewer's relation. */
export type Person = {
  id: string;
  username: string;
  displayName: string;
  self: boolean;
  relation: Relation;
  /** The relationship button says "Request to follow" for a private profile. */
  targetPrivate: boolean;
};

/**
 * Turns member ids into rows the viewer may see: hidden members (deactivated, unfinished, deleted) and anyone
 * blocked either way are dropped silently, so a list never reveals them (matrix §4, D-019). Order is kept.
 */
export async function peopleFor(viewer: Viewer, ids: readonly string[]): Promise<Person[]> {
  if (!ids.length) return [];
  const [owners, graphs] = await Promise.all([loadOwners(ids), loadGraphs(viewer.id, ids)]);
  const out: Person[] = [];
  for (const id of ids) {
    const o = owners.get(id);
    if (!o?.username) continue;
    const g = graphs.get(id)!;
    if (!canViewProfileSection("identity", viewer, o, g).allowed) continue;
    out.push(person(viewer, o, g));
  }
  return out;
}

function person(viewer: Viewer, o: OwnerRecord, g: Graph): Person {
  return {
    id: o.id,
    username: o.username!,
    displayName: o.displayName,
    self: viewer.id === o.id,
    relation: { follows: g.follows, followedBy: g.followedBy },
    targetPrivate: o.profile === "private",
  };
}

export type ListKind = "followers" | "following";

export type ListView =
  | { kind: "not-available" }
  | {
      kind: "list";
      ownerId: string;
      username: string;
      displayName: string;
      self: boolean;
      /** The owner's profile is private: on the own followers list each row offers "Remove follower" (D-069). */
      ownerPrivate: boolean;
      which: ListKind;
      counts: { followers: number; following: number };
      people: Person[];
    };

/**
 * PROF-07: the followers or following list of `raw`'s owner, if the viewer may see the lists section (D-033).
 * Pending requests are never listed; people the viewer may not see are left out, and the counts shown are the
 * owner's real counts, which may differ from the rows (U-13: the viewer learns nothing about hidden members).
 */
export async function listMembers(viewer: Viewer, raw: string, which: ListKind): Promise<ListView> {
  const username = normalizeUsername(raw);
  if (!USERNAME_SHAPE.test(username)) return NOT_AVAILABLE;
  const row = await profileRow(username);
  if (!row) return NOT_AVAILABLE;
  const owner = await loadOwner(row.userId);
  if (!owner?.username) return NOT_AVAILABLE;
  const graph = await loadGraph(viewer.id, owner.id);
  if (!canViewProfileSection("lists", viewer, owner, graph).allowed) return NOT_AVAILABLE;
  const rows =
    which === "followers"
      ? await db()
          .select({ id: follow.followerId })
          .from(follow)
          .where(and(eq(follow.followeeId, owner.id), eq(follow.status, "accepted")))
          .orderBy(desc(follow.acceptedAt), desc(follow.createdAt))
      : await db()
          .select({ id: follow.followeeId })
          .from(follow)
          .where(and(eq(follow.followerId, owner.id), eq(follow.status, "accepted")))
          .orderBy(desc(follow.acceptedAt), desc(follow.createdAt));
  const counts = await profileCounts(owner.id, { lists: true, answers: false });
  return {
    kind: "list",
    ownerId: owner.id,
    username: owner.username,
    displayName: owner.displayName,
    self: viewer.id === owner.id,
    ownerPrivate: owner.profile === "private",
    which,
    counts: { followers: counts.followers ?? 0, following: counts.following ?? 0 },
    people: await peopleFor(
      viewer,
      rows.map((r) => r.id),
    ),
  };
}

// ---------------------------------------------------------------- Daily Drop history (PROF-03)

export type HistoryItem = {
  answerId: string;
  date: string; // publish date, YYYY-MM-DD
  question: string;
  text: string;
  language: string | null;
  createdAt: Date;
};

export type HistoryView = { items: HistoryItem[]; total: number };

/**
 * The aggregated Daily Drop history on a profile (D-032): only when the viewer may see the section, answers on
 * published questions that are neither deleted nor removed, newest first. The question text comes in the viewer's
 * language, else the other one (both are approved before publication, JO2).
 */
export async function dropHistory(
  viewer: Viewer,
  ownerId: string,
  locale: "hr" | "en",
  limit = 20,
): Promise<HistoryView | null> {
  if (!UUID.test(ownerId)) return null;
  const owner = await loadOwner(ownerId);
  if (!owner) return null;
  const graph = await loadGraph(viewer.id, owner.id);
  const d = canViewProfileSection("dropHistory", viewer, owner, graph);
  if (!d.allowed || d.mode === "case") return null;
  const rows = await db()
    .select({
      answerId: dailyDropAnswer.id,
      questionId: dailyDropAnswer.questionId,
      date: dailyDropQuestion.publishDate,
      text: dailyDropAnswer.body,
      language: dailyDropAnswer.language,
      createdAt: dailyDropAnswer.createdAt,
    })
    .from(dailyDropAnswer)
    .innerJoin(dailyDropQuestion, eq(dailyDropQuestion.id, dailyDropAnswer.questionId))
    .where(
      and(
        eq(dailyDropAnswer.authorId, ownerId),
        isNull(dailyDropAnswer.deletedAt),
        isNull(dailyDropAnswer.removedAt),
        eq(dailyDropQuestion.status, "published"),
        isNotNull(dailyDropQuestion.publishDate),
      ),
    )
    .orderBy(desc(dailyDropQuestion.publishDate), desc(dailyDropAnswer.createdAt))
    .limit(limit);
  const total = await answerCount(ownerId);
  if (!rows.length) return { items: [], total };
  const texts = await db()
    .select({
      questionId: dailyDropTranslation.questionId,
      locale: dailyDropTranslation.locale,
      text: dailyDropTranslation.text,
    })
    .from(dailyDropTranslation)
    .where(
      inArray(
        dailyDropTranslation.questionId,
        rows.map((r) => r.questionId),
      ),
    );
  const question = (id: string) =>
    texts.find((t) => t.questionId === id && t.locale === locale)?.text ??
    texts.find((t) => t.questionId === id)?.text ??
    "";
  return {
    total,
    items: rows.map((r) => ({
      answerId: r.answerId,
      date: r.date!,
      question: question(r.questionId),
      text: r.text,
      language: r.language,
      createdAt: r.createdAt,
    })),
  };
}

// ---------------------------------------------------------------- the own profile: edit (PROF-08)

export type OwnProfile = {
  username: string;
  displayName: string;
  bio: string;
  usernameChangedAt: Date | null;
  /** When the next username change is allowed (D-069: once every 30 days); null = now. */
  usernameNextAt: Date | null;
};

export async function ownProfile(userId: string): Promise<OwnProfile | null> {
  const [row] = await db()
    .select({
      username: profile.username,
      displayName: profile.displayName,
      bio: profile.bio,
      usernameChangedAt: profile.usernameChangedAt,
    })
    .from(profile)
    .where(eq(profile.userId, userId));
  if (!row) return null;
  return {
    username: row.username,
    displayName: row.displayName,
    bio: row.bio ?? "",
    usernameChangedAt: row.usernameChangedAt,
    usernameNextAt: nextUsernameChange(row.usernameChangedAt),
  };
}

export type EditResult = { ok: true } | { ok: false; reason: "invalid" | "not-found" };

/** PROF-08: display name and bio; the account's `name` follows the display name. */
export async function updateProfile(
  userId: string,
  input: { displayName: string; bio: string },
): Promise<EditResult> {
  const displayName = input.displayName.trim().replace(/\s+/g, " ");
  const bio = cleanBio(input.bio);
  if (!validDisplayName(displayName) || bio === null) return { ok: false, reason: "invalid" };
  return db().transaction(async (tx) => {
    const rows = await tx
      .update(profile)
      .set({ displayName, bio: bio || null, updatedAt: new Date() })
      .where(eq(profile.userId, userId))
      .returning({ userId: profile.userId });
    if (!rows.length) return { ok: false, reason: "not-found" } as const;
    await tx
      .update(user)
      .set({ name: displayName, updatedAt: new Date() })
      .where(eq(user.id, userId));
    return { ok: true } as const;
  });
}

export type UsernameChangeResult =
  | { ok: true; username: string }
  | { ok: false; reason: "invalid" | "taken" | "too-soon" | "same" | "not-found"; nextAt?: Date };

type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

/**
 * D-069 and U-04 (review L8): at most once every USERNAME_CHANGE_DAYS; the old handle is reserved for the member
 * for USERNAME_RESERVE_DAYS (upserted: a name that was reserved before can be reserved again) and answers "not
 * available" meanwhile. The check and the claim run in one transaction under a lock on the new name, and the
 * unique index on lower(username) is the last line of defence. A reserved name may be taken back by its own
 * former owner (the reservation is theirs).
 */
export async function changeUsername(
  userId: string,
  raw: string,
  reserved: (u: string) => boolean = () => false,
): Promise<UsernameChangeResult> {
  const username = normalizeUsername(raw);
  if (!USERNAME_SHAPE.test(username) || reserved(username)) return { ok: false, reason: "invalid" };
  try {
    return await db().transaction(async (tx) => {
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtextextended(${"username:" + username}, 0))`,
      );
      const [current] = await tx
        .select({ username: profile.username, changedAt: profile.usernameChangedAt })
        .from(profile)
        .where(eq(profile.userId, userId))
        .for("update");
      if (!current) return { ok: false, reason: "not-found" } as const;
      if (current.username === username) return { ok: false, reason: "same" } as const;
      const nextAt = nextUsernameChange(current.changedAt);
      if (nextAt) return { ok: false, reason: "too-soon", nextAt } as const;
      if (!(await usernameFree(tx, username, userId)))
        return { ok: false, reason: "taken" } as const;
      const now = new Date();
      await tx
        .update(profile)
        .set({ username, usernameChangedAt: now, updatedAt: now })
        .where(eq(profile.userId, userId));
      const until = new Date(now.getTime() + USERNAME_RESERVE_DAYS * 86_400_000);
      await tx
        .insert(usernameReservation)
        .values({ username: current.username, userId, reservedUntil: until })
        .onConflictDoUpdate({
          target: usernameReservation.username,
          set: { userId, reservedUntil: until, createdAt: now },
        });
      // Taking back an own reserved name ends that reservation.
      await tx
        .delete(usernameReservation)
        .where(
          and(eq(usernameReservation.username, username), eq(usernameReservation.userId, userId)),
        );
      return { ok: true, username } as const;
    });
  } catch (e) {
    if (isUniqueViolation(e)) return { ok: false, reason: "taken" };
    throw e;
  }
}

async function usernameFree(tx: Tx | Db, username: string, forUserId?: string): Promise<boolean> {
  const [taken] = await tx
    .select({ userId: profile.userId })
    .from(profile)
    .where(sql`lower(${profile.username}) = ${username}`);
  if (taken && taken.userId !== forUserId) return false;
  const [reserved] = await tx
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

/** Is a username free to take? Taken by a profile (any case) or reserved by someone else → no (D-069). */
export async function usernameAvailable(raw: string, forUserId?: string): Promise<boolean> {
  return usernameFree(db(), normalizeUsername(raw), forUserId);
}

// ---------------------------------------------------------------- privacy settings (SET-05)

export type PrivacyState = {
  visibility: "public" | "private";
  discoverable: boolean;
  musicDna: SectionVisibility;
  lists: SectionVisibility;
  dropHistory: SectionVisibility;
  pendingRequests: number;
};

export async function privacyState(userId: string): Promise<PrivacyState | null> {
  const [row] = await db()
    .select({
      visibility: profile.visibility,
      discoverable: profile.discoverable,
      musicDna: privacySettings.musicDna,
      lists: privacySettings.lists,
      dropHistory: privacySettings.dropHistory,
    })
    .from(profile)
    .leftJoin(privacySettings, eq(privacySettings.userId, profile.userId))
    .where(eq(profile.userId, userId));
  if (!row) return null;
  return {
    visibility: row.visibility ?? "private",
    discoverable: row.discoverable,
    musicDna: row.musicDna ?? "me",
    lists: row.lists ?? "me",
    dropHistory: row.dropHistory ?? "me",
    pendingRequests: await pendingRequestCount(userId),
  };
}

/**
 * SET-05 profile visibility (D-025, D-030, R-15, JO5). To private: followers stay. To public: every pending
 * request is accepted in the same transaction (the member saw the count first; the caller passes `acceptPending`
 * only after that). Returns how many were accepted.
 */
export async function setProfileVisibility(
  userId: string,
  visibility: "public" | "private",
  opts: { acceptPending: boolean } = { acceptPending: true },
): Promise<{ ok: boolean; accepted: number }> {
  const result = await db().transaction(async (tx) => {
    const rows = await tx
      .update(profile)
      .set({ visibility, updatedAt: new Date() })
      .where(and(eq(profile.userId, userId), isNotNull(profile.onboardedAt)))
      .returning({ userId: profile.userId });
    if (!rows.length) return { ok: false, accepted: [] as string[] };
    const accepted =
      visibility === "public" && opts.acceptPending ? await acceptAllPending(tx, userId) : [];
    return { ok: true, accepted };
  });
  await notifyAccepted(userId, result.accepted);
  return { ok: result.ok, accepted: result.accepted.length };
}

export async function setSectionAudience(
  userId: string,
  section: PrivacySection,
  audience: Audience,
): Promise<void> {
  const set = { [section]: audience, updatedAt: new Date() };
  await db()
    .insert(privacySettings)
    .values({ userId, [section]: audience })
    .onConflictDoUpdate({ target: privacySettings.userId, set });
}

/** D-093 (3): whether the member appears in people search. */
export async function setDiscoverable(userId: string, discoverable: boolean): Promise<void> {
  await db()
    .update(profile)
    .set({ discoverable, updatedAt: new Date() })
    .where(eq(profile.userId, userId));
}
