// One test per row of docs/architecture/visibility-matrix.md v0.3 (R-01, S-02).
import { describe, expect, it } from "vitest";
import {
  canInteract,
  canViewContent,
  canViewConversation,
  canViewPlaylist,
  canViewProfileSection,
  canViewStaffObject,
  countsTowardPublic,
  noGraph,
  relationship,
  type Graph,
  type Owner,
  type Viewer,
} from "@/lib/authz";

const owner = (over: Partial<Owner> = {}): Owner => ({
  id: "owner",
  status: "active",
  profile: "public",
  musicDna: "everyone",
  lists: "followers",
  dropHistory: "everyone",
  ...over,
});
const privateOwner = (over: Partial<Owner> = {}) =>
  owner({ profile: "private", dropHistory: "followers", ...over });

const SELF: Viewer = { id: "owner", role: "member", status: "active" };
const MEMBER: Viewer = { id: "m", role: "member", status: "active" };
const ANON: Viewer = { id: null, role: "member", status: "active" };
const MOD: Viewer = { id: "mod", role: "moderator", status: "active" };
const ADMIN: Viewer = { id: "adm", role: "admin", status: "active" };
const EDITOR: Viewer = { id: "ed", role: "editor", status: "active" };

const asFollower: Graph = { blocked: false, follows: "accepted", followedBy: false };
const asMutual: Graph = { blocked: false, follows: "accepted", followedBy: true };
const asBlocked: Graph = { blocked: true, follows: "none", followedBy: false };
const CASE = { caseId: "case-1" };

describe("§1 viewer relationships", () => {
  it("evaluates SELF, staff, ANON, BLOCKED, MUTUAL, FOLLOWER, MEMBER in that order", () => {
    expect(relationship(SELF, owner(), asBlocked)).toBe("SELF");
    expect(relationship(ADMIN, owner(), asBlocked)).toBe("ADMIN");
    expect(relationship(MOD, owner(), asMutual)).toBe("MOD");
    expect(relationship(ANON, owner(), asMutual)).toBe("ANON");
    expect(relationship(MEMBER, owner(), { ...asMutual, blocked: true })).toBe("BLOCKED");
    expect(relationship(MEMBER, owner(), asMutual)).toBe("MUTUAL");
    expect(relationship(MEMBER, owner(), asFollower)).toBe("FOLLOWER");
    expect(relationship(MEMBER, owner(), noGraph)).toBe("MEMBER");
    // A pending follow is not a follower; an editor is a member for visibility purposes.
    expect(relationship(MEMBER, owner(), { ...noGraph, follows: "pending" })).toBe("MEMBER");
    expect(relationship(EDITOR, owner(), noGraph)).toBe("MEMBER");
  });

  it("hides deactivated, suspended, banned and deleted accounts from everyone but SELF and staff", () => {
    for (const status of [
      "deactivated",
      "suspended",
      "banned",
      "pending_deletion",
      "deleted",
    ] as const) {
      const o = owner({ status });
      expect(canViewProfileSection("identity", MEMBER, o, asMutual)).toMatchObject({
        allowed: false,
        mode: "not-available",
      });
      expect(canViewProfileSection("identity", ANON, o).allowed).toBe(false);
      expect(canViewProfileSection("identity", SELF, o).allowed).toBe(true);
      expect(canViewProfileSection("identity", MOD, o).allowed).toBe(true);
      expect(canViewProfileSection("identity", ADMIN, o).allowed).toBe(true);
    }
  });
});

describe("§2 profile and identity", () => {
  it("username, display name, avatar: everyone signed in; blocked → neutral not-available; ANON public only; staff yes", () => {
    const o = owner();
    for (const [v, g] of [
      [SELF, noGraph],
      [MEMBER, asMutual],
      [MEMBER, asFollower],
      [MEMBER, noGraph],
    ] as const) {
      expect(canViewProfileSection("identity", v, o, g).allowed).toBe(true);
    }
    expect(canViewProfileSection("identity", MEMBER, o, asBlocked)).toEqual({
      allowed: false,
      reason: "blocked",
      mode: "not-available",
    });
    expect(canViewProfileSection("identity", ANON, o)).toEqual({ allowed: true, mode: "minimal" });
    expect(canViewProfileSection("identity", ANON, privateOwner()).allowed).toBe(false);
    expect(canViewProfileSection("identity", MOD, o).allowed).toBe(true);
    expect(canViewProfileSection("identity", ADMIN, o).allowed).toBe(true);
  });

  it("bio: same as identity", () => {
    expect(canViewProfileSection("bio", MEMBER, owner()).allowed).toBe(true);
    expect(canViewProfileSection("bio", MEMBER, privateOwner()).allowed).toBe(true);
    expect(canViewProfileSection("bio", ANON, owner())).toEqual({ allowed: true, mode: "minimal" });
    expect(canViewProfileSection("bio", ANON, privateOwner()).allowed).toBe(false);
    expect(canViewProfileSection("bio", MEMBER, owner(), asBlocked).allowed).toBe(false);
  });

  it("Music DNA: ⚙️ for mutuals and followers, ⚙️ + 🔒 for members, never blocked or ANON, staff through a case", () => {
    const everyone = owner({ musicDna: "everyone" });
    expect(canViewProfileSection("musicDna", MEMBER, everyone).allowed).toBe(true);
    expect(canViewProfileSection("musicDna", MEMBER, everyone, asFollower).allowed).toBe(true);
    expect(canViewProfileSection("musicDna", MEMBER, everyone, asMutual).allowed).toBe(true);
    const followers = owner({ musicDna: "followers" });
    expect(canViewProfileSection("musicDna", MEMBER, followers).allowed).toBe(false);
    expect(canViewProfileSection("musicDna", MEMBER, followers, asFollower).allowed).toBe(true);
    const mutuals = owner({ musicDna: "mutuals" });
    expect(canViewProfileSection("musicDna", MEMBER, mutuals, asFollower).allowed).toBe(false);
    expect(canViewProfileSection("musicDna", MEMBER, mutuals, asMutual).allowed).toBe(true);
    const me = owner({ musicDna: "me" });
    expect(canViewProfileSection("musicDna", MEMBER, me, asMutual).allowed).toBe(false);
    expect(canViewProfileSection("musicDna", SELF, me).allowed).toBe(true);
    // 🔒: a private profile caps the section at followers even when the setting says everyone.
    expect(
      canViewProfileSection("musicDna", MEMBER, privateOwner({ musicDna: "everyone" })),
    ).toEqual({
      allowed: false,
      reason: "private",
    });
    expect(
      canViewProfileSection("musicDna", MEMBER, privateOwner({ musicDna: "everyone" }), asFollower)
        .allowed,
    ).toBe(true);
    expect(canViewProfileSection("musicDna", MEMBER, everyone, asBlocked).allowed).toBe(false);
    expect(canViewProfileSection("musicDna", ANON, everyone).allowed).toBe(false);
    expect(canViewProfileSection("musicDna", MOD, everyone)).toEqual({
      allowed: false,
      reason: "case-required",
    });
    expect(canViewProfileSection("musicDna", MOD, everyone, noGraph, CASE)).toEqual({
      allowed: true,
      mode: "case",
    });
    expect(canViewProfileSection("musicDna", ADMIN, everyone, noGraph, CASE).allowed).toBe(true);
  });

  it("followers and following lists (and counts): default followers (D-033); same columns as Music DNA", () => {
    const o = owner(); // lists: followers
    expect(canViewProfileSection("lists", MEMBER, o).allowed).toBe(false);
    expect(canViewProfileSection("lists", MEMBER, o, asFollower).allowed).toBe(true);
    expect(canViewProfileSection("lists", MEMBER, o, asMutual).allowed).toBe(true);
    expect(canViewProfileSection("lists", MEMBER, owner({ lists: "everyone" })).allowed).toBe(true);
    expect(canViewProfileSection("lists", MEMBER, o, asBlocked).allowed).toBe(false);
    expect(canViewProfileSection("lists", ANON, owner({ lists: "everyone" })).allowed).toBe(false);
    expect(canViewProfileSection("lists", ADMIN, o).allowed).toBe(false);
    expect(canViewProfileSection("lists", ADMIN, o, noGraph, CASE).allowed).toBe(true);
  });

  it("Daily Drop history: same as profile by default (D-032); public → everyone, private → followers", () => {
    expect(canViewProfileSection("dropHistory", MEMBER, owner()).allowed).toBe(true);
    expect(canViewProfileSection("dropHistory", MEMBER, privateOwner()).allowed).toBe(false);
    expect(canViewProfileSection("dropHistory", MEMBER, privateOwner(), asFollower).allowed).toBe(
      true,
    );
    expect(canViewProfileSection("dropHistory", MEMBER, owner(), asBlocked).allowed).toBe(false);
    expect(canViewProfileSection("dropHistory", ANON, owner()).allowed).toBe(false);
    expect(canViewProfileSection("dropHistory", MOD, owner(), noGraph, CASE).allowed).toBe(true);
  });

  it("posts on profile: 🔒 for members, share-link only for ANON on public posts, staff through a case", () => {
    expect(canViewProfileSection("posts", MEMBER, owner()).allowed).toBe(true);
    expect(canViewProfileSection("posts", MEMBER, privateOwner()).allowed).toBe(false);
    expect(canViewProfileSection("posts", MEMBER, privateOwner(), asFollower).allowed).toBe(true);
    expect(canViewProfileSection("posts", MEMBER, privateOwner(), asMutual).allowed).toBe(true);
    expect(canViewProfileSection("posts", MEMBER, owner(), asBlocked).allowed).toBe(false);
    expect(canViewProfileSection("posts", ANON, owner()).allowed).toBe(false); // the list; a share link is content
    expect(canViewProfileSection("posts", MOD, owner()).allowed).toBe(false);
    expect(canViewProfileSection("posts", MOD, owner(), noGraph, CASE).allowed).toBe(true);
  });

  it("email, sessions, MFA, settings: SELF only; admin sees email and status only, audited", () => {
    expect(canViewProfileSection("settings", SELF, owner()).allowed).toBe(true);
    for (const g of [asMutual, asFollower, noGraph, asBlocked]) {
      expect(canViewProfileSection("settings", MEMBER, owner(), g).allowed).toBe(false);
    }
    expect(canViewProfileSection("settings", ANON, owner()).allowed).toBe(false);
    expect(canViewProfileSection("settings", MOD, owner()).allowed).toBe(false);
    expect(canViewProfileSection("settings", ADMIN, owner())).toEqual({
      allowed: true,
      mode: "minimal",
    });
  });
});

describe("§2 content", () => {
  const pub = { author: owner() };
  const priv = { author: privateOwner() };

  it("post (public author): everyone signed in; blocked hidden; ANON preview; staff yes", () => {
    expect(canViewContent("post", SELF, pub).allowed).toBe(true);
    expect(canViewContent("post", MEMBER, pub, asMutual).allowed).toBe(true);
    expect(canViewContent("post", MEMBER, pub, asFollower).allowed).toBe(true);
    expect(canViewContent("post", MEMBER, pub).allowed).toBe(true);
    expect(canViewContent("post", MEMBER, pub, asBlocked)).toMatchObject({
      allowed: false,
      mode: "hidden",
    });
    expect(canViewContent("post", ANON, pub)).toEqual({ allowed: true, mode: "preview" });
    expect(canViewContent("post", MOD, pub).allowed).toBe(true);
  });

  it("post (private author): SELF, mutuals and followers; members, blocked and ANON no; staff through a case", () => {
    expect(canViewContent("post", SELF, priv).allowed).toBe(true);
    expect(canViewContent("post", MEMBER, priv, asMutual).allowed).toBe(true);
    expect(canViewContent("post", MEMBER, priv, asFollower).allowed).toBe(true);
    expect(canViewContent("post", MEMBER, priv).allowed).toBe(false);
    expect(canViewContent("post", MEMBER, priv, asBlocked).allowed).toBe(false);
    expect(canViewContent("post", ANON, priv).allowed).toBe(false);
    expect(canViewContent("post", MOD, priv).allowed).toBe(false);
    expect(canViewContent("post", MOD, priv, noGraph, CASE).allowed).toBe(true);
  });

  it("comment or reply: follows the thread, also for private authors (D-020); blocked → placeholder; ANON no", () => {
    const inThread = { author: privateOwner(), threadVisible: true };
    expect(canViewContent("comment", MEMBER, inThread).allowed).toBe(true);
    expect(canViewContent("comment", MEMBER, { ...inThread, threadVisible: false }).allowed).toBe(
      false,
    );
    expect(canViewContent("comment", MEMBER, inThread, asBlocked)).toMatchObject({
      allowed: false,
      mode: "placeholder",
    });
    expect(canViewContent("comment", ANON, inThread).allowed).toBe(false);
    expect(canViewContent("comment", MOD, inThread).allowed).toBe(true);
    expect(
      canViewContent("comment", MOD, { ...inThread, threadVisible: false }, noGraph, CASE).allowed,
    ).toBe(true);
    // A hidden author's comment leaves a placeholder (S-17).
    expect(
      canViewContent("comment", MEMBER, {
        author: owner({ status: "suspended" }),
        threadVisible: true,
      }),
    ).toMatchObject({ allowed: false, mode: "placeholder" });
  });

  it("Daily Drop question: everyone, including blocked; ANON sees question + invitation only (D-022)", () => {
    expect(canViewContent("dropQuestion", MEMBER, pub, asBlocked).allowed).toBe(true);
    expect(canViewContent("dropQuestion", ANON, pub)).toEqual({ allowed: true, mode: "preview" });
    expect(canViewContent("dropQuestion", MOD, pub).allowed).toBe(true);
  });

  it("Daily Drop answer: all signed-in members for public and private authors (D-021); blocked and ANON no", () => {
    for (const f of [pub, priv]) {
      expect(canViewContent("dropAnswer", SELF, f).allowed).toBe(true);
      expect(canViewContent("dropAnswer", MEMBER, f, asMutual).allowed).toBe(true);
      expect(canViewContent("dropAnswer", MEMBER, f).allowed).toBe(true);
      expect(canViewContent("dropAnswer", MEMBER, f, asBlocked).allowed).toBe(false);
      expect(canViewContent("dropAnswer", ANON, f).allowed).toBe(false);
      expect(canViewContent("dropAnswer", MOD, f).allowed).toBe(true);
    }
  });

  it("reactions (who reacted): own, members; blocked filtered; ANON no", () => {
    expect(canViewContent("reactions", MEMBER, { ...pub, threadVisible: true }).allowed).toBe(true);
    expect(canViewContent("reactions", MEMBER, pub, asBlocked).allowed).toBe(false);
    expect(canViewContent("reactions", MEMBER, pub).allowed).toBe(false); // thread fact missing → deny
    expect(canViewContent("reactions", ANON, pub).allowed).toBe(false);
    expect(canViewContent("reactions", ADMIN, pub).allowed).toBe(true);
  });

  it("member poll votes: own only; staff through a case; aggregates after voting or close", () => {
    expect(canViewContent("pollVote", SELF, pub).allowed).toBe(true);
    expect(canViewContent("pollVote", MEMBER, pub, asMutual).allowed).toBe(false);
    expect(canViewContent("pollVote", ANON, pub).allowed).toBe(false);
    expect(canViewContent("pollVote", MOD, pub).allowed).toBe(false);
    expect(canViewContent("pollVote", MOD, pub, noGraph, CASE).allowed).toBe(true);
    expect(canViewContent("pollAggregates", MEMBER, { ...pub, votedOrClosed: false }).allowed).toBe(
      false,
    );
    expect(canViewContent("pollAggregates", MEMBER, { ...pub, votedOrClosed: true }).allowed).toBe(
      true,
    );
    expect(
      canViewContent("pollAggregates", MEMBER, { ...pub, votedOrClosed: true }, asBlocked).allowed,
    ).toBe(false);
    expect(canViewContent("pollAggregates", ANON, { ...pub, votedOrClosed: true }).allowed).toBe(
      false,
    );
    expect(canViewContent("pollAggregates", ADMIN, pub).allowed).toBe(true);
  });

  it("saved items: owner only, not even admins", () => {
    expect(canViewContent("savedItem", SELF, pub).allowed).toBe(true);
    expect(canViewContent("savedItem", MEMBER, pub, asMutual).allowed).toBe(false);
    expect(canViewContent("savedItem", ADMIN, pub, noGraph, CASE).allowed).toBe(false);
  });

  it("media URLs follow the parent object", () => {
    expect(canViewContent("media", ANON, { ...pub, parentPublic: true }).allowed).toBe(true);
    expect(canViewContent("media", ANON, { ...pub, parentPublic: false }).allowed).toBe(false);
    expect(
      canViewContent("media", MEMBER, { ...pub, parentPublic: false }, asBlocked).allowed,
    ).toBe(false);
    expect(
      canViewContent("media", MEMBER, { ...pub, parentPublic: false, parentVisible: true }).allowed,
    ).toBe(true);
    expect(canViewContent("media", MEMBER, { ...pub, parentPublic: false }).allowed).toBe(false); // parent fact missing → deny
    expect(canViewContent("media", MOD, { ...pub, parentPublic: false }).allowed).toBe(false);
    expect(
      canViewContent("media", MOD, { ...pub, parentPublic: false }, noGraph, CASE).allowed,
    ).toBe(true);
    // Step 5.11: staff who see the parent the ordinary way (an answer on the Drop page) see its image too.
    expect(
      canViewContent("media", MOD, { ...pub, parentPublic: false, parentVisible: true }).allowed,
    ).toBe(true);
  });

  it("counts and ranking use only member-visible content (D-021)", () => {
    expect(countsTowardPublic("dropAnswer", privateOwner())).toBe(true);
    expect(countsTowardPublic("post", privateOwner())).toBe(false);
    expect(countsTowardPublic("post", owner())).toBe(true);
    expect(countsTowardPublic("dropAnswer", owner({ status: "suspended" }))).toBe(false);
  });
});

describe("§2 messaging, recommendations, playlists", () => {
  it("DM: participants; read-only for both after a block (D-023); others no; staff through a case", () => {
    expect(canViewConversation("dm", MEMBER, { participant: true, blocked: false })).toEqual({
      allowed: true,
    });
    expect(canViewConversation("dm", MEMBER, { participant: true, blocked: true })).toEqual({
      allowed: true,
      mode: "read-only",
    });
    expect(canViewConversation("dm", MEMBER, { participant: false, blocked: false }).allowed).toBe(
      false,
    );
    expect(canViewConversation("dm", ANON, { participant: false, blocked: false }).allowed).toBe(
      false,
    );
    expect(canViewConversation("dm", MOD, { participant: false, blocked: false }).allowed).toBe(
      false,
    );
    expect(
      canViewConversation("dm", MOD, { participant: false, blocked: false }, CASE).allowed,
    ).toBe(true);
    expect(
      canViewConversation("dm", EDITOR, { participant: false, blocked: false }, CASE).allowed,
    ).toBe(false);
  });

  it("intro requests and recommendations: sender and recipient only; staff through a case", () => {
    for (const kind of ["introRequest", "recommendation"] as const) {
      expect(canViewConversation(kind, MEMBER, { participant: true, blocked: false }).allowed).toBe(
        true,
      );
      expect(
        canViewConversation(kind, MEMBER, { participant: false, blocked: false }).allowed,
      ).toBe(false);
      expect(
        canViewConversation(kind, ADMIN, { participant: false, blocked: false }, CASE).allowed,
      ).toBe(true);
    }
  });

  it("playlists: public for everyone signed in except blocked; private for owner and contributors", () => {
    expect(
      canViewPlaylist(MEMBER, { visibility: "public", role: "none", blocked: false }).allowed,
    ).toBe(true);
    expect(
      canViewPlaylist(MEMBER, { visibility: "public", role: "none", blocked: true }).allowed,
    ).toBe(false);
    expect(
      canViewPlaylist(ANON, { visibility: "public", role: "none", blocked: false }).allowed,
    ).toBe(false);
    expect(
      canViewPlaylist(MEMBER, { visibility: "private", role: "none", blocked: false }).allowed,
    ).toBe(false);
    expect(
      canViewPlaylist(MEMBER, { visibility: "private", role: "contributor", blocked: false })
        .allowed,
    ).toBe(true);
    expect(
      canViewPlaylist(MEMBER, { visibility: "private", role: "owner", blocked: false }).allowed,
    ).toBe(true);
    expect(
      canViewPlaylist(MOD, { visibility: "private", role: "none", blocked: false }).allowed,
    ).toBe(false);
    expect(
      canViewPlaylist(MOD, { visibility: "private", role: "none", blocked: false }, CASE).allowed,
    ).toBe(true);
    expect(
      canViewPlaylist(MOD, { visibility: "public", role: "none", blocked: false }).allowed,
    ).toBe(true);
  });
});

describe("§2 editorial and staff-only", () => {
  it("published editorial: everyone; drafts, schedule and fact-check notes: editor and admin", () => {
    expect(canViewStaffObject("publishedEditorial", ANON).allowed).toBe(true);
    for (const o of ["editorialDrafts", "factCheckNotes"] as const) {
      expect(canViewStaffObject(o, MEMBER).allowed).toBe(false);
      expect(canViewStaffObject(o, EDITOR).allowed).toBe(true);
      expect(canViewStaffObject(o, MOD).allowed).toBe(false);
      expect(canViewStaffObject(o, ADMIN).allowed).toBe(true);
    }
  });

  it("reports and cases: reporter own status only; moderator assigned; admin all; editor no", () => {
    expect(canViewStaffObject("reportsCases", MEMBER, { own: true })).toEqual({
      allowed: true,
      mode: "minimal",
    });
    expect(canViewStaffObject("reportsCases", MEMBER, { own: false }).allowed).toBe(false);
    expect(canViewStaffObject("reportsCases", EDITOR).allowed).toBe(false);
    expect(canViewStaffObject("reportsCases", MOD, { assigned: true }).allowed).toBe(true);
    expect(canViewStaffObject("reportsCases", MOD, { assigned: false }).allowed).toBe(false);
    expect(canViewStaffObject("reportsCases", ADMIN).allowed).toBe(true);
  });

  it("reporter identity: never to members or editors; audit log: admin read-only; feedback screenshots: own or admin", () => {
    expect(canViewStaffObject("reporterIdentity", MEMBER, { own: true }).allowed).toBe(false);
    expect(canViewStaffObject("reporterIdentity", EDITOR).allowed).toBe(false);
    expect(canViewStaffObject("reporterIdentity", MOD).allowed).toBe(true);
    expect(canViewStaffObject("auditLog", MOD).allowed).toBe(false);
    expect(canViewStaffObject("auditLog", ADMIN)).toEqual({ allowed: true, mode: "read-only" });
    expect(canViewStaffObject("feedbackScreenshot", MEMBER, { own: true }).allowed).toBe(true);
    expect(canViewStaffObject("feedbackScreenshot", MOD).allowed).toBe(false);
    expect(canViewStaffObject("feedbackScreenshot", ADMIN)).toEqual({
      allowed: true,
      mode: "minimal",
    });
  });
});

describe("§3 interaction permissions", () => {
  it("follow: members not blocked; a private target makes the follow pending", () => {
    expect(canInteract("follow", MEMBER, owner())).toEqual({ allowed: true });
    expect(canInteract("follow", MEMBER, privateOwner())).toEqual({ allowed: true, pending: true });
    expect(canInteract("follow", MEMBER, owner(), asBlocked).allowed).toBe(false);
    expect(canInteract("follow", ANON, owner()).allowed).toBe(false);
    expect(canInteract("follow", SELF, owner()).allowed).toBe(false);
    expect(canInteract("follow", MEMBER, owner(), { ...noGraph, follows: "pending" }).allowed).toBe(
      false,
    );
  });

  it("reply or comment: can view the thread; not blocked with the thread or parent author; owner limits", () => {
    expect(canInteract("reply", MEMBER, owner(), noGraph, { canViewTarget: true }).allowed).toBe(
      true,
    );
    expect(canInteract("reply", MEMBER, owner(), noGraph, { canViewTarget: false }).allowed).toBe(
      false,
    );
    expect(
      canInteract("reply", MEMBER, owner(), noGraph, {
        canViewTarget: true,
        blockedWithParent: true,
      }).allowed,
    ).toBe(false);
    expect(
      canInteract("reply", MEMBER, owner(), noGraph, { canViewTarget: true, limited: true }),
    ).toEqual({
      allowed: false,
      reason: "limit",
    });
    expect(
      canInteract("reply", MEMBER, owner(), asMutual, { canViewTarget: true, limited: true })
        .allowed,
    ).toBe(true);
  });

  it("mention: members, subject to the target's policy and blocks", () => {
    expect(canInteract("mention", MEMBER, owner()).allowed).toBe(true);
    expect(canInteract("mention", MEMBER, owner(), noGraph, { targetAllows: false }).allowed).toBe(
      false,
    );
    expect(canInteract("mention", MEMBER, owner(), asBlocked).allowed).toBe(false);
  });

  it("react: can view the target and not blocked", () => {
    expect(canInteract("react", MEMBER, owner(), noGraph, { canViewTarget: true }).allowed).toBe(
      true,
    );
    expect(canInteract("react", MEMBER, owner(), asBlocked, { canViewTarget: true }).allowed).toBe(
      false,
    );
    expect(
      canInteract("react", MEMBER, privateOwner(), noGraph, { canViewTarget: false }).allowed,
    ).toBe(false);
  });

  it("DM, recommendations and playlist invites need a Mutual; intro requests need the recipient's opt-in", () => {
    expect(canInteract("dm", MEMBER, owner(), asFollower).allowed).toBe(false);
    expect(canInteract("dm", MEMBER, owner(), asMutual).allowed).toBe(true);
    expect(canInteract("dm", MEMBER, owner(), asMutual, { targetAllows: false }).allowed).toBe(
      false,
    );
    expect(canInteract("sendRecommendation", MEMBER, owner(), asFollower).allowed).toBe(false);
    expect(canInteract("sendRecommendation", MEMBER, owner(), asMutual).allowed).toBe(true);
    expect(canInteract("inviteToPlaylist", MEMBER, owner(), noGraph).allowed).toBe(false);
    expect(canInteract("inviteToPlaylist", MEMBER, owner(), asMutual).allowed).toBe(true);
    expect(
      canInteract("introRequest", MEMBER, owner(), noGraph, { targetAllows: true }).allowed,
    ).toBe(true);
    expect(
      canInteract("introRequest", MEMBER, owner(), noGraph, { targetAllows: false }).allowed,
    ).toBe(false);
    expect(
      canInteract("introRequest", MEMBER, owner(), noGraph, {
        targetAllows: true,
        pendingExists: true,
      }),
    ).toEqual({
      allowed: false,
      reason: "pending",
    });
    expect(canInteract("dm", MEMBER, owner(), { ...asMutual, blocked: true }).allowed).toBe(false);
  });

  it("vote in poll: can view the poll, one active vote, before close", () => {
    expect(canInteract("votePoll", MEMBER, owner(), noGraph, { canViewTarget: true }).allowed).toBe(
      true,
    );
    expect(
      canInteract("votePoll", MEMBER, owner(), noGraph, {
        canViewTarget: true,
        alreadyVotedOrClosed: true,
      }),
    ).toEqual({ allowed: false, reason: "voted" });
    expect(canInteract("votePoll", ANON, owner(), noGraph, { canViewTarget: true }).allowed).toBe(
      false,
    );
  });

  it("no interaction from or with a non-active account", () => {
    expect(canInteract("follow", { ...MEMBER, status: "suspended" }, owner()).allowed).toBe(false);
    expect(canInteract("follow", MEMBER, owner({ status: "deactivated" })).allowed).toBe(false);
  });
});

describe("unfinished onboarding (step 5.2 review M4)", () => {
  const fresh = {
    id: "o",
    status: "active",
    profile: "public",
    musicDna: "everyone",
    lists: "everyone",
    dropHistory: "everyone",
    onboarded: false,
  } as const;
  it("hides the member from others but not from themselves or staff", () => {
    expect(
      canViewProfileSection("identity", { id: "v", role: "member", status: "active" }, fresh)
        .allowed,
    ).toBe(false);
    expect(
      canViewProfileSection("identity", { id: "o", role: "member", status: "active" }, fresh)
        .allowed,
    ).toBe(true);
    expect(
      canViewProfileSection("identity", { id: "a", role: "admin", status: "active" }, fresh)
        .allowed,
    ).toBe(true);
  });
  it("refuses interactions both ways", () => {
    const active = { ...fresh, id: "v", onboarded: true };
    expect(
      canInteract("follow", { id: "v", role: "member", status: "active" }, fresh).allowed,
    ).toBe(false);
    expect(
      canInteract("follow", { id: "o", role: "member", status: "active", onboarded: false }, active)
        .allowed,
    ).toBe(false);
  });
});
