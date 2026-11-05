// The one server-side authorization policy (R-01, audit S-02). It implements
// docs/architecture/visibility-matrix.md v0.3 row by row. It is pure: callers (data access in
// Phase 5) load the facts and pass them in, so every channel (API, search, notifications, share
// previews, caches, exports) asks the same function. tests/unit/policy.test.ts has a test per row.

import type { Role } from "@/lib/auth/roles";

// ---- Facts ----
export type AccountStatus =
  "active" | "deactivated" | "suspended" | "banned" | "pending_deletion" | "deleted";

export type ProfileVisibility = "public" | "private";
/** Per-section settings (matrix §2 "⚙️"): everyone (signed-in members) · followers · mutuals only · only me. */
export type SectionVisibility = "everyone" | "followers" | "mutuals" | "me";

export type Viewer = {
  /** null when signed out (ANON) */
  id: string | null;
  role: Role;
  status?: AccountStatus;
  /** False while the member has not finished onboarding: they may read but not write (step 5.2 review M4). */
  onboarded?: boolean;
};

export type Owner = {
  id: string;
  status: AccountStatus;
  profile: ProfileVisibility;
  musicDna: SectionVisibility;
  lists: SectionVisibility;
  dropHistory: SectionVisibility;
  /** False until onboarding is finished: the member is hidden from others like a deactivated account. */
  onboarded?: boolean;
};

export type Graph = {
  /** A Block in either direction between viewer and owner. */
  blocked: boolean;
  /** viewer → owner follow state */
  follows: "none" | "pending" | "accepted";
  /** owner → viewer is an accepted follow */
  followedBy: boolean;
};

/** Staff acting through a case (📄 in the matrix): the case id is logged with the access. */
export type StaffContext = { caseId?: string };

export type Relationship =
  "SELF" | "BLOCKED" | "MUTUAL" | "FOLLOWER" | "MEMBER" | "ANON" | "MOD" | "ADMIN";

export const noGraph: Graph = { blocked: false, follows: "none", followedBy: false };

export function isStaff(role: Role): boolean {
  return role === "moderator" || role === "admin";
}

/** Matrix §1: evaluated in this order; Block wins over everything except SELF and staff-through-a-case. */
export function relationship(viewer: Viewer, owner: Owner, graph: Graph): Relationship {
  if (viewer.id && viewer.id === owner.id) return "SELF";
  if (viewer.role === "admin") return "ADMIN";
  if (viewer.role === "moderator") return "MOD";
  if (!viewer.id) return "ANON";
  if (graph.blocked) return "BLOCKED";
  if (graph.follows === "accepted" && graph.followedBy) return "MUTUAL";
  if (graph.follows === "accepted") return "FOLLOWER";
  return "MEMBER";
}

/** Matrix §1: deactivated, suspended, banned and deleted accounts are invisible to non-staff. */
export function ownerVisibleAtAll(rel: Relationship, owner: Owner): boolean {
  if (owner.status === "active" && owner.onboarded !== false) return true;
  return rel === "SELF" || rel === "MOD" || rel === "ADMIN";
}

/** Can the viewer see the profile at all (🔒 column): public profile, or an approved follower. */
function lockOpen(rel: Relationship, owner: Owner): boolean {
  if (rel === "SELF" || rel === "MUTUAL" || rel === "FOLLOWER") return true;
  if (rel === "MEMBER") return owner.profile === "public";
  return false;
}

/** ⚙️ section setting evaluated for a member-side relationship (never for ANON or BLOCKED). */
function sectionOpen(rel: Relationship, setting: SectionVisibility): boolean {
  switch (setting) {
    case "everyone":
      return rel === "MEMBER" || rel === "FOLLOWER" || rel === "MUTUAL";
    case "followers":
      return rel === "FOLLOWER" || rel === "MUTUAL";
    case "mutuals":
      return rel === "MUTUAL";
    case "me":
      return false;
  }
}

// ---- Decisions ----
export type Decision =
  | { allowed: true; mode?: "minimal" | "preview" | "read-only" | "case" }
  | { allowed: false; reason: Reason; mode?: "not-available" | "placeholder" | "hidden" };

export type Reason =
  | "anon"
  | "blocked"
  | "private"
  | "setting"
  | "owner-hidden"
  | "not-owner"
  | "not-participant"
  | "case-required"
  | "role"
  | "status"
  | "never";

const allow = (mode?: Extract<Decision, { allowed: true }>["mode"]): Decision =>
  mode ? { allowed: true, mode } : { allowed: true };
const deny = (reason: Reason, mode?: Extract<Decision, { allowed: false }>["mode"]): Decision =>
  mode ? { allowed: false, reason, mode } : { allowed: false, reason };

/** 📄 cells: staff only through a case, and the access is logged by the caller with the case id. */
function throughCase(ctx: StaffContext | undefined): Decision {
  return ctx?.caseId ? allow("case") : deny("case-required");
}

// ---- §2 Profile and identity ----
export type ProfileSection =
  | "identity" // username, display name, avatar
  | "bio"
  | "musicDna"
  | "lists" // followers and following lists, including their counts (D-033)
  | "dropHistory" // the aggregated Daily Drop history on the profile (D-032)
  | "posts"
  | "settings"; // email, sessions, MFA, settings

export function canViewProfileSection(
  section: ProfileSection,
  viewer: Viewer,
  owner: Owner,
  graph: Graph = noGraph,
  ctx?: StaffContext,
): Decision {
  const rel = relationship(viewer, owner, graph);
  if (!ownerVisibleAtAll(rel, owner)) {
    return rel === "ANON" ? deny("anon", "not-available") : deny("owner-hidden", "not-available");
  }
  if (rel === "SELF") return allow();

  // Staff: identity and bio plainly; sections only through a case; settings: admin sees email and status only.
  if (rel === "ADMIN" || rel === "MOD") {
    switch (section) {
      case "identity":
      case "bio":
        return allow();
      case "settings":
        return rel === "ADMIN" ? allow("minimal") : deny("role");
      default:
        return throughCase(ctx);
    }
  }

  if (section === "settings") return deny("not-owner");

  if (rel === "BLOCKED") return deny("blocked", "not-available"); // D-019: neutral "not available"

  if (rel === "ANON") {
    // Signed-out visitors: minimal public profile only (identity and bio of public profiles), nothing else (D-022).
    if ((section === "identity" || section === "bio") && owner.profile === "public")
      return allow("minimal");
    return deny("anon", "not-available");
  }

  switch (section) {
    case "identity":
      return allow();
    case "bio":
      return allow();
    case "posts":
      return lockOpen(rel, owner) ? allow() : deny("private");
    case "musicDna":
      return decideSection(rel, owner, owner.musicDna);
    case "lists":
      return decideSection(rel, owner, owner.lists);
    case "dropHistory":
      return decideSection(rel, owner, owner.dropHistory);
    default:
      return deny("never");
  }
}

/** ⚙️ + 🔒: the section setting, capped at followers when the profile is private (matrix §2 defaults). */
function decideSection(rel: Relationship, owner: Owner, setting: SectionVisibility): Decision {
  if (!lockOpen(rel, owner)) return deny("private");
  return sectionOpen(rel, setting) ? allow() : deny("setting");
}

// ---- §2 Content ----
export type ContentKind =
  | "post"
  | "comment"
  | "dropQuestion"
  | "dropAnswer"
  | "reactions"
  | "pollVote"
  | "pollAggregates"
  | "savedItem"
  | "media";

export type ContentFacts = {
  /** The author (owner) of the object. For a comment: the comment's author; the thread's own visibility is `threadVisible`. */
  author: Owner;
  /** For comments and reactions: whether the viewer can see the thread or target the object sits in. */
  threadVisible?: boolean;
  /** For polls: the viewer already voted, or the poll is closed. */
  votedOrClosed?: boolean;
  /** For media: the parent object is public (a share preview may load it signed out). */
  parentPublic?: boolean;
  /** For media: the viewer may see the parent object (decided by the caller through this policy). */
  parentVisible?: boolean;
};

export function canViewContent(
  kind: ContentKind,
  viewer: Viewer,
  facts: ContentFacts,
  graph: Graph = noGraph,
  ctx?: StaffContext,
): Decision {
  const { author } = facts;
  const rel = relationship(viewer, author, graph);
  const staff = rel === "MOD" || rel === "ADMIN";

  // The Daily Drop question is content for everyone; a signed-out visitor sees question + invitation only (D-022).
  if (kind === "dropQuestion") return rel === "ANON" ? allow("preview") : allow();

  // Saved items are private to their owner, not even admins (matrix §2).
  if (kind === "savedItem") return rel === "SELF" ? allow() : deny("never");

  // Individual poll votes: own only; staff through a case.
  if (kind === "pollVote") {
    if (rel === "SELF") return allow();
    if (staff) return throughCase(ctx);
    return deny("never");
  }

  if (kind === "pollAggregates") {
    if (rel === "ANON" || rel === "BLOCKED") return deny(rel === "ANON" ? "anon" : "blocked");
    if (staff) return allow();
    return facts.votedOrClosed ? allow() : deny("setting");
  }

  if (!ownerVisibleAtAll(rel, author)) {
    // S-17: hidden accounts leave placeholders in threads.
    return kind === "comment"
      ? deny("owner-hidden", "placeholder")
      : deny("owner-hidden", "hidden");
  }
  if (rel === "SELF") return allow();

  if (kind === "media") {
    // Follows the parent object: the caller decides the parent first and passes the result;
    // non-public parents are served through signed, short-lived URLs (caller).
    if (facts.parentPublic) return allow();
    if (staff) return throughCase(ctx);
    if (rel === "ANON" || rel === "BLOCKED") return deny(rel === "ANON" ? "anon" : "blocked");
    return facts.parentVisible === true ? allow() : deny("private");
  }

  switch (kind) {
    case "post": {
      const publicAuthor = author.profile === "public";
      if (staff) return publicAuthor ? allow() : throughCase(ctx);
      if (rel === "BLOCKED") return deny("blocked", "hidden");
      if (rel === "ANON") return publicAuthor ? allow("preview") : deny("anon");
      if (publicAuthor) return allow();
      return rel === "MUTUAL" || rel === "FOLLOWER" ? allow() : deny("private");
    }
    case "comment": {
      // Follows the thread, also for private authors (D-020); blocked → placeholder; ANON never.
      if (staff) return facts.threadVisible ? allow() : throughCase(ctx);
      if (rel === "BLOCKED") return deny("blocked", "placeholder");
      if (rel === "ANON") return deny("anon");
      return facts.threadVisible ? allow() : deny("private");
    }
    case "dropAnswer": {
      // D-021: visible to all signed-in members, also from private authors; ANON never (D-022).
      if (staff) return allow();
      if (rel === "ANON") return deny("anon");
      if (rel === "BLOCKED") return deny("blocked", "hidden");
      return allow();
    }
    case "reactions": {
      if (staff) return allow();
      if (rel === "ANON") return deny("anon");
      if (rel === "BLOCKED") return deny("blocked", "hidden"); // filtered out of "who reacted"
      // Default-deny: a caller that forgets the thread fact must not leak "who reacted".
      return facts.threadVisible === true ? allow() : deny("private");
    }
    default:
      return deny("never");
  }
}

/** Counts and ranking (D-021): only content visible to all signed-in members contributes to public counts. */
export function countsTowardPublic(kind: ContentKind, author: Owner): boolean {
  if (author.status !== "active") return false;
  if (kind === "dropAnswer" || kind === "comment" || kind === "dropQuestion") return true;
  if (kind === "post") return author.profile === "public";
  return false;
}

// ---- §2 Messaging, recommendations, playlists ----
export type ConversationFacts = {
  participant: boolean; // viewer is a participant (sender or recipient)
  blocked: boolean; // a Block between the participants
};

export function canViewConversation(
  kind: "dm" | "introRequest" | "recommendation",
  viewer: Viewer,
  facts: ConversationFacts,
  ctx?: StaffContext,
): Decision {
  if (!viewer.id) return deny("anon");
  if (facts.participant) {
    // D-023: after a block the history stays, read-only for both.
    return kind === "dm" && facts.blocked ? allow("read-only") : allow();
  }
  if (isStaff(viewer.role)) return throughCase(ctx); // reported messages + bounded context only
  return deny("not-participant");
}

export type PlaylistFacts = {
  visibility: "public" | "private";
  role: "owner" | "contributor" | "none";
  blocked: boolean; // between viewer and the playlist owner
};

export function canViewPlaylist(
  viewer: Viewer,
  facts: PlaylistFacts,
  ctx?: StaffContext,
): Decision {
  if (facts.role === "owner" || facts.role === "contributor") return allow();
  if (isStaff(viewer.role)) return facts.visibility === "public" ? allow() : throughCase(ctx);
  if (!viewer.id) return deny("anon");
  if (facts.blocked) return deny("blocked", "not-available");
  return facts.visibility === "public" ? allow() : deny("private");
}

// ---- §2 Editorial and staff-only ----
export type StaffObject =
  | "publishedEditorial"
  | "editorialDrafts"
  | "factCheckNotes"
  | "reportsCases"
  | "reporterIdentity"
  | "auditLog"
  | "feedbackScreenshot";

export function canViewStaffObject(
  object: StaffObject,
  viewer: Viewer,
  facts: { own?: boolean; assigned?: boolean } = {},
): Decision {
  const role = viewer.role;
  if (object === "publishedEditorial") return allow();
  if (!viewer.id) return deny("anon");
  switch (object) {
    case "editorialDrafts":
    case "factCheckNotes":
      return role === "editor" || role === "admin" ? allow() : deny("role");
    case "reportsCases":
      if (role === "admin") return allow();
      if (role === "moderator") return facts.assigned ? allow() : deny("role");
      return facts.own ? allow("minimal") : deny("role"); // reporter: own report status only
    case "reporterIdentity":
      return role === "moderator" || role === "admin" ? allow() : deny("never");
    case "auditLog":
      return role === "admin" ? allow("read-only") : deny("role");
    case "feedbackScreenshot":
      if (facts.own) return allow();
      return role === "admin" ? allow("minimal") : deny("role");
  }
}

// ---- §3 Interaction permissions ----
export type Interaction =
  | "follow"
  | "reply"
  | "mention"
  | "react"
  | "dm"
  | "introRequest"
  | "sendRecommendation"
  | "inviteToPlaylist"
  | "votePoll";

export type InteractionFacts = {
  /** The viewer can view the target (thread, poll, post) per the content rules. */
  canViewTarget?: boolean;
  /** Blocked with the thread author OR the parent author (reply rule). */
  blockedWithParent?: boolean;
  /** Target's opt-in for intro requests; DM policy; mention policy. */
  targetAllows?: boolean;
  /** A pending request already exists for this pair (intro requests). */
  pendingExists?: boolean;
  /** Owner interaction limits apply to the viewer (non-mutual scope). */
  limited?: boolean;
  /** One active vote exists / the poll is closed. */
  alreadyVotedOrClosed?: boolean;
};

export type InteractionDecision =
  | { allowed: true; pending?: boolean }
  | { allowed: false; reason: Reason | "limit" | "policy" | "pending" | "voted" };

export function canInteract(
  action: Interaction,
  viewer: Viewer,
  target: Owner,
  graph: Graph = noGraph,
  facts: InteractionFacts = {},
): InteractionDecision {
  if (!viewer.id) return { allowed: false, reason: "anon" };
  if (viewer.status && viewer.status !== "active") return { allowed: false, reason: "status" };
  if (viewer.onboarded === false) return { allowed: false, reason: "status" };
  const rel = relationship(viewer, target, graph);
  if (rel === "SELF" && action !== "votePoll" && action !== "react") {
    return { allowed: false, reason: "not-owner" };
  }
  if (target.status !== "active" || target.onboarded === false)
    return { allowed: false, reason: "owner-hidden" };
  if (graph.blocked) return { allowed: false, reason: "blocked" };
  const mutual = rel === "MUTUAL";

  switch (action) {
    case "follow":
      if (graph.follows !== "none") return { allowed: false, reason: "pending" };
      return target.profile === "private" ? { allowed: true, pending: true } : { allowed: true };
    case "reply":
      if (!facts.canViewTarget) return { allowed: false, reason: "private" };
      if (facts.blockedWithParent) return { allowed: false, reason: "blocked" };
      if (facts.limited && !mutual) return { allowed: false, reason: "limit" };
      return { allowed: true };
    case "mention":
      if (facts.targetAllows === false) return { allowed: false, reason: "policy" };
      return { allowed: true };
    case "react":
      if (!facts.canViewTarget) return { allowed: false, reason: "private" };
      return { allowed: true };
    case "dm":
      if (!mutual) return { allowed: false, reason: "policy" };
      if (facts.targetAllows === false) return { allowed: false, reason: "policy" };
      return { allowed: true };
    case "introRequest":
      if (facts.targetAllows !== true) return { allowed: false, reason: "policy" };
      if (facts.pendingExists) return { allowed: false, reason: "pending" };
      if (facts.limited && !mutual) return { allowed: false, reason: "limit" };
      return { allowed: true };
    case "sendRecommendation":
      if (!mutual) return { allowed: false, reason: "policy" };
      if (facts.targetAllows === false) return { allowed: false, reason: "policy" };
      return { allowed: true };
    case "inviteToPlaylist":
      return mutual ? { allowed: true } : { allowed: false, reason: "policy" };
    case "votePoll":
      if (!facts.canViewTarget) return { allowed: false, reason: "private" };
      if (facts.alreadyVotedOrClosed) return { allowed: false, reason: "voted" };
      return { allowed: true };
  }
}
