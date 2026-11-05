// Step 5.5: profiles, lists, follow requests, username change, privacy settings and people search through the
// real data layer and the policy. The authorization suite walks every profile section × relationship (matrix
// §2 rows) and the search test proves it never returns a blocked, non-discoverable, unfinished or deleted member.
// Fixtures are fictional members with @prof.test emails; only those rows are touched and removed.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq, inArray, sql } from "drizzle-orm";
import { closeDb, db } from "@/lib/db/client";
import {
  dailyDropAnswer,
  dailyDropQuestion,
  dailyDropTranslation,
  followDecline,
  privacySettings,
  profile,
  user,
  usernameReservation,
} from "@/lib/db/schema";
import type { Viewer } from "@/lib/authz";
import { loadViewer } from "@/lib/data/facts";
import {
  acceptFollowRequest,
  blockMember,
  declineFollowRequest,
  followMember,
  pendingFollowRequests,
  removeFollower,
  unblockMember,
  unfollowMember,
} from "@/lib/data/graph";
import { searchPeople } from "@/lib/data/people";
import {
  changeUsername,
  dropHistory,
  listMembers,
  privacyState,
  profileByUsername,
  setDiscoverable,
  setProfileVisibility,
  setSectionAudience,
  updateProfile,
  usernameAvailable,
} from "@/lib/data/profiles";

const RUN = Date.now().toString(36);
const ids: Record<string, string> = {};
const uname = (key: string) => `${key}_${RUN}`.slice(0, 30);
const questionIds: string[] = [];

async function member(
  key: string,
  opts: {
    visibility?: "public" | "private";
    status?: string;
    onboarded?: boolean;
    discoverable?: boolean;
    role?: "member" | "moderator" | "admin";
    twoFactor?: boolean;
    displayName?: string;
    musicDna?: "everyone" | "followers" | "mutuals" | "me";
    lists?: "everyone" | "followers" | "mutuals" | "me";
    dropHistory?: "everyone" | "followers" | "mutuals" | "me";
  } = {},
) {
  const [u] = await db()
    .insert(user)
    .values({
      name: opts.displayName ?? `Prof ${key}`,
      email: `${key}-${RUN}@prof.test`,
      emailVerified: true,
      status: opts.status ?? "active",
      role: opts.role ?? "member",
      twoFactorEnabled: opts.twoFactor ?? false,
    })
    .returning({ id: user.id });
  ids[key] = u!.id;
  await db()
    .insert(profile)
    .values({
      userId: u!.id,
      username: uname(key),
      displayName: opts.displayName ?? `Prof ${key}`,
      bio: `bio of ${key}`,
      visibility: opts.visibility ?? "public",
      discoverable: opts.discoverable ?? true,
      onboardedAt: opts.onboarded === false ? null : new Date(),
    });
  await db()
    .insert(privacySettings)
    .values({
      userId: u!.id,
      musicDna: opts.musicDna ?? "everyone",
      lists: opts.lists ?? "everyone",
      dropHistory: opts.dropHistory ?? "everyone",
    });
  return u!.id;
}
const viewer = (key: string, role: "member" | "moderator" | "admin" = "member"): Promise<Viewer> =>
  loadViewer({ id: ids[key]!, role });

beforeAll(async () => {
  await member("pub"); // public owner, everything "everyone"
  await member("priv", { visibility: "private" }); // private owner
  await member("strict", { musicDna: "me", lists: "followers", dropHistory: "followers" });
  await member("viewer"); // a plain member
  await member("fan"); // follows pub and priv (accepted)
  await member("mut"); // mutual with pub
  await member("foe"); // blocked by pub
  await member("blocker"); // blocks pub
  await member("gone", { status: "deactivated" });
  await member("fresh", { onboarded: false });
  await member("shy", { discoverable: false, displayName: "Željko Šimunić" });
  await member("zeljko", { displayName: "Željko Đurić" });
  await member("mod", { role: "moderator", twoFactor: true });
  await member("admin", { role: "admin", twoFactor: true });
  await member("renamer");
  await member("other");

  const fan = await viewer("fan");
  const mut = await viewer("mut");
  const pub = await viewer("pub");
  await followMember(fan, ids.pub!);
  await followMember(fan, ids.strict!);
  expect(await followMember(fan, ids.priv!)).toEqual({ ok: true, state: "pending" });
  await acceptFollowRequest(ids.priv!, ids.fan!);
  await followMember(mut, ids.pub!);
  await followMember(pub, ids.mut!);
  await blockMember(ids.pub!, ids.foe!);
  await blockMember(ids.blocker!, ids.pub!);
});

afterAll(async () => {
  if (questionIds.length) {
    await db().delete(dailyDropAnswer).where(inArray(dailyDropAnswer.questionId, questionIds));
    await db().delete(dailyDropQuestion).where(inArray(dailyDropQuestion.id, questionIds));
  }
  const all = Object.values(ids);
  await db().delete(usernameReservation).where(inArray(usernameReservation.userId, all));
  if (all.length) await db().delete(user).where(inArray(user.id, all)); // cascades the rest
  await closeDb();
});

const SECTIONS = ["bio", "musicDna", "lists", "dropHistory", "posts"] as const;

async function sectionsFor(v: Viewer, owner: string) {
  const p = await profileByUsername(v, uname(owner));
  if (p.kind !== "profile") return p.kind;
  return SECTIONS.filter((s) => p.sections[s]).join(",");
}

describe("authorization suite: profile sections × relationship through the data layer", () => {
  it("public owner: member, follower and mutual see every section; the visitor sees the minimal header", async () => {
    expect(await sectionsFor(await viewer("viewer"), "pub")).toBe(
      "bio,musicDna,lists,dropHistory,posts",
    );
    expect(await sectionsFor(await viewer("fan"), "pub")).toBe(
      "bio,musicDna,lists,dropHistory,posts",
    );
    expect(await sectionsFor(await viewer("mut"), "pub")).toBe(
      "bio,musicDna,lists,dropHistory,posts",
    );
    const anon = await profileByUsername(await loadViewer(null), uname("pub"));
    expect(anon.kind).toBe("profile");
    if (anon.kind === "profile") {
      expect(anon.minimal).toBe(true);
      expect(anon.sections).toEqual({ identity: true, bio: true });
      expect(anon.counts).toEqual({});
    }
  });

  it("self sees everything plus the own settings; others never get the owner's settings", async () => {
    const self = await profileByUsername(await viewer("pub"), uname("pub"));
    expect(self.kind).toBe("profile");
    if (self.kind === "profile") {
      expect(self.self).toBe(true);
      expect(self.own).toMatchObject({ visibility: "public", musicDna: "everyone" });
      expect(self.counts).toEqual({ followers: 2, following: 1, answers: 0 });
    }
    const other = await profileByUsername(await viewer("viewer"), uname("pub"));
    if (other.kind === "profile") expect(other.own).toBeUndefined();
  });

  it("private owner: the member gets the P state (header and bio, no counts); the follower gets the sections", async () => {
    const p = await profileByUsername(await viewer("viewer"), uname("priv"));
    expect(p.kind).toBe("profile");
    if (p.kind === "profile") {
      expect(p.privateToViewer).toBe(true);
      expect(p.targetPrivate).toBe(true);
      expect(p.sections).toEqual({ identity: true, bio: true });
      expect(p.counts).toEqual({});
      expect(p.bio).toBe("bio of priv");
    }
    expect(await sectionsFor(await viewer("fan"), "priv")).toBe(
      "bio,musicDna,lists,dropHistory,posts",
    );
    const f = await profileByUsername(await viewer("fan"), uname("priv"));
    if (f.kind === "profile") {
      expect(f.privateToViewer).toBe(false);
      expect(f.counts).toEqual({ followers: 1, following: 0, answers: 0 });
    }
    expect((await profileByUsername(await loadViewer(null), uname("priv"))).kind).toBe(
      "not-available",
    );
  });

  it("section settings: 'me' hides from followers too, 'followers' hides from plain members (D-024, D-033)", async () => {
    expect(await sectionsFor(await viewer("viewer"), "strict")).toBe("bio,posts");
    expect(await sectionsFor(await viewer("fan"), "strict")).toBe("bio,lists,dropHistory,posts");
    const v = await profileByUsername(await viewer("viewer"), uname("strict"));
    if (v.kind === "profile") expect(v.counts).toEqual({}); // no numbers without the list (U-13)
  });

  it("blocks: the blocked side gets 'not available'; the blocker gets their own block state (D-019)", async () => {
    expect((await profileByUsername(await viewer("foe"), uname("pub"))).kind).toBe("not-available");
    const mine = await profileByUsername(await viewer("pub"), uname("foe"));
    expect(mine.kind).toBe("blocked-by-you");
    expect(await sectionsFor(await viewer("blocker"), "pub")).toBe("blocked-by-you");
    expect((await profileByUsername(await viewer("pub"), uname("blocker"))).kind).toBe(
      "not-available",
    );
  });

  it("deactivated and unfinished owners are 'not available' to members; staff with a second factor see identity and bio only", async () => {
    expect(await sectionsFor(await viewer("viewer"), "gone")).toBe("not-available");
    expect(await sectionsFor(await viewer("viewer"), "fresh")).toBe("not-available");
    expect(await sectionsFor(await viewer("mod", "moderator"), "gone")).toBe("bio");
    expect(await sectionsFor(await viewer("admin", "admin"), "pub")).toBe("bio");
    expect(await sectionsFor(await viewer("admin", "admin"), "priv")).toBe("bio");
  });

  it("the Music DNA and history readers answer null for a hidden section (matrix §4)", async () => {
    const { musicDnaFor } = await import("@/lib/data/music-dna");
    expect(await musicDnaFor(await viewer("viewer"), ids.strict!, "hr")).toBeNull();
    expect(await musicDnaFor(await viewer("fan"), ids.pub!, "hr")).not.toBeNull();
    expect(await dropHistory(await viewer("viewer"), ids.strict!, "hr")).toBeNull();
    expect(await dropHistory(await viewer("foe"), ids.pub!, "hr")).toBeNull();
    expect(await dropHistory(await loadViewer(null), ids.pub!, "hr")).toBeNull();
  });
});

describe("lists (PROF-07) and requests (ACT-02)", () => {
  it("lists hide people the viewer may not see and never list pending requests", async () => {
    const list = await listMembers(await viewer("viewer"), uname("pub"), "followers");
    expect(list.kind).toBe("list");
    if (list.kind === "list") {
      expect(list.counts).toEqual({ followers: 2, following: 1 });
      expect(list.people.map((p) => p.username).sort()).toEqual(
        [uname("fan"), uname("mut")].sort(),
      );
      expect(list.people.find((p) => p.username === uname("mut"))?.relation).toEqual({
        follows: "none",
        followedBy: false,
      });
    }
    // The blocked side sees nothing of pub's lists; a list of a private owner is closed to non-followers.
    expect((await listMembers(await viewer("foe"), uname("pub"), "followers")).kind).toBe(
      "not-available",
    );
    expect((await listMembers(await viewer("viewer"), uname("priv"), "followers")).kind).toBe(
      "not-available",
    );
    // A pending requester is not in the owner's list, but a member blocked by the viewer is dropped from it.
    const other = await viewer("other");
    expect(await followMember(other, ids.priv!)).toEqual({ ok: true, state: "pending" });
    const own = await listMembers(await viewer("priv"), uname("priv"), "followers");
    if (own.kind === "list") {
      expect(own.ownerPrivate).toBe(true);
      expect(own.people.map((p) => p.username)).toEqual([uname("fan")]);
    }
    await unfollowMember(ids.other!, ids.priv!);
  });

  it("decline: the request disappears silently and a new one must wait seven days (J4 E6, L7)", async () => {
    const other = await viewer("other");
    expect(await followMember(other, ids.priv!)).toEqual({ ok: true, state: "pending" });
    expect((await pendingFollowRequests(ids.priv!)).map((r) => r.username)).toEqual([
      uname("other"),
    ]);
    expect(await declineFollowRequest(ids.priv!, ids.other!)).toBe(true);
    expect(await pendingFollowRequests(ids.priv!)).toEqual([]);
    expect(await followMember(other, ids.priv!)).toEqual({ ok: false, reason: "wait" });
    // Eight days later the request goes through again; a public target is never held back.
    await db()
      .update(followDecline)
      .set({ declinedAt: new Date(Date.now() - 8 * 86_400_000) })
      .where(eq(followDecline.requesterId, ids.other!));
    expect(await followMember(other, ids.priv!)).toEqual({ ok: true, state: "pending" });
    await unfollowMember(ids.other!, ids.priv!);
    expect(await followMember(other, ids.pub!)).toEqual({ ok: true, state: "accepted" });
    await unfollowMember(ids.other!, ids.pub!);
  });

  it("a requester who got blocked or hidden is left out of the owner's requests (E1, E9)", async () => {
    const other = await viewer("other");
    await db().delete(followDecline).where(eq(followDecline.requesterId, ids.other!));
    expect(await followMember(other, ids.priv!)).toEqual({ ok: true, state: "pending" });
    await blockMember(ids.priv!, ids.other!); // removes the request too (invariant 2)
    expect(await pendingFollowRequests(ids.priv!)).toEqual([]);
    expect((await profileByUsername(other, uname("priv"))).kind).toBe("not-available");
    await unblockMember(ids.priv!, ids.other!);
  });

  it("remove follower (D-069): the person drops back to the non-follower view, no trace", async () => {
    const other = await viewer("other");
    expect(await followMember(other, ids.priv!)).toEqual({ ok: true, state: "pending" });
    await acceptFollowRequest(ids.priv!, ids.other!);
    expect(await sectionsFor(other, "priv")).toBe("bio,musicDna,lists,dropHistory,posts");
    await removeFollower(ids.priv!, ids.other!);
    expect(await sectionsFor(other, "priv")).toBe("bio");
    expect(await followMember(other, ids.priv!)).toEqual({ ok: true, state: "pending" });
    await unfollowMember(ids.other!, ids.priv!);
  });
});

describe("privacy settings (SET-05)", () => {
  it("switching to public accepts the pending requests (JO5); switching to private keeps followers (R-15)", async () => {
    const other = await viewer("other");
    expect(await followMember(other, ids.priv!)).toEqual({ ok: true, state: "pending" });
    expect((await privacyState(ids.priv!))?.pendingRequests).toBe(1);
    expect(await setProfileVisibility(ids.priv!, "public", { acceptPending: true })).toEqual({
      ok: true,
      accepted: 1,
    });
    expect(await sectionsFor(other, "priv")).toBe("bio,musicDna,lists,dropHistory,posts");
    expect(await setProfileVisibility(ids.priv!, "private")).toEqual({ ok: true, accepted: 0 });
    expect(await sectionsFor(other, "priv")).toBe("bio,musicDna,lists,dropHistory,posts");
    await unfollowMember(ids.other!, ids.priv!);
    expect(await sectionsFor(other, "priv")).toBe("bio");
  });

  it("section audiences and discoverability are per member and take effect at once", async () => {
    await setSectionAudience(ids.pub!, "musicDna", "me");
    expect(await sectionsFor(await viewer("viewer"), "pub")).toBe("bio,lists,dropHistory,posts");
    await setSectionAudience(ids.pub!, "musicDna", "everyone");
    await setDiscoverable(ids.pub!, false);
    expect((await privacyState(ids.pub!))?.discoverable).toBe(false);
    await setDiscoverable(ids.pub!, true);
    // An unfinished member cannot flip the visibility through settings.
    expect(await setProfileVisibility(ids.fresh!, "public")).toEqual({ ok: false, accepted: 0 });
  });
});

describe("edit profile (PROF-08) and the username change (D-069, L8)", () => {
  it("validates the display name and the bio; the account name follows", async () => {
    expect(
      await updateProfile(ids.renamer!, { displayName: "Four Words Are Many", bio: "" }),
    ).toEqual({
      ok: false,
      reason: "invalid",
    });
    expect(await updateProfile(ids.renamer!, { displayName: "Ok", bio: "x".repeat(201) })).toEqual({
      ok: false,
      reason: "invalid",
    });
    expect(
      await updateProfile(ids.renamer!, { displayName: "Nova  Osoba", bio: " dva\r\nretka " }),
    ).toEqual({
      ok: true,
    });
    const [row] = await db()
      .select({ name: user.name, bio: profile.bio, dn: profile.displayName })
      .from(user)
      .innerJoin(profile, eq(profile.userId, user.id))
      .where(eq(user.id, ids.renamer!));
    expect(row).toEqual({ name: "Nova Osoba", dn: "Nova Osoba", bio: "dva\nretka" });
  });

  it("changes once, reserves the old name for its owner, refuses a second change for 30 days", async () => {
    const oldName = uname("renamer");
    const fresh = `nova_${RUN}`.slice(0, 30);
    expect(await changeUsername(ids.renamer!, "Admin", (u) => u === "admin")).toEqual({
      ok: false,
      reason: "invalid",
    });
    expect(await changeUsername(ids.renamer!, oldName)).toEqual({ ok: false, reason: "same" });
    expect(await changeUsername(ids.renamer!, uname("pub"))).toEqual({
      ok: false,
      reason: "taken",
    });
    expect(await changeUsername(ids.renamer!, fresh.toUpperCase())).toEqual({
      ok: true,
      username: fresh,
    });
    // The old handle answers "not available" to everyone and is free for nobody but its former owner (U-04).
    expect((await profileByUsername(await viewer("viewer"), oldName)).kind).toBe("not-available");
    expect(await usernameAvailable(oldName)).toBe(false);
    expect(await usernameAvailable(oldName, ids.renamer!)).toBe(true);
    expect(await changeUsername(ids.other!, oldName)).toEqual({ ok: false, reason: "taken" });
    // Once every 30 days.
    const again = await changeUsername(ids.renamer!, `treca_${RUN}`.slice(0, 30));
    expect(again.ok).toBe(false);
    if (!again.ok) {
      expect(again.reason).toBe("too-soon");
      expect(again.nextAt!.getTime()).toBeGreaterThan(Date.now());
    }
    // After the window the former owner takes the old name back and the reservation ends.
    await db()
      .update(profile)
      .set({ usernameChangedAt: new Date(Date.now() - 31 * 86_400_000) })
      .where(eq(profile.userId, ids.renamer!));
    expect(await changeUsername(ids.renamer!, oldName)).toEqual({ ok: true, username: oldName });
    const rows = await db()
      .select({ u: usernameReservation.username })
      .from(usernameReservation)
      .where(eq(usernameReservation.userId, ids.renamer!));
    expect(rows.map((r) => r.u)).toEqual([fresh]); // the name just given up is reserved; the retaken one is not
  });

  it("an expired reservation held by someone else can be reserved again (upsert, L8)", async () => {
    const stale = `stale_${RUN}`.slice(0, 30);
    await db()
      .insert(usernameReservation)
      .values({
        username: stale,
        userId: ids.other!,
        reservedUntil: new Date(Date.now() - 86_400_000),
      });
    await db()
      .update(profile)
      .set({ username: stale, usernameChangedAt: null })
      .where(eq(profile.userId, ids.renamer!));
    // renamer gives `stale` up: the row that other left behind is taken over.
    expect(await changeUsername(ids.renamer!, uname("renamer"))).toEqual({
      ok: true,
      username: uname("renamer"),
    });
    const [res] = await db()
      .select({ userId: usernameReservation.userId })
      .from(usernameReservation)
      .where(eq(usernameReservation.username, stale));
    expect(res?.userId).toBe(ids.renamer);
  });
});

describe("people search (DISC-05 α, D-093 (3))", () => {
  it("finds by name or username without regard to diacritics, never the viewer", async () => {
    const v = await viewer("viewer");
    const byName = await searchPeople(v, "zeljko dur");
    expect(byName.map((p) => p.username)).toEqual([uname("zeljko")]);
    expect(byName[0]).toMatchObject({
      displayName: "Željko Đurić",
      self: false,
      targetPrivate: false,
    });
    const byHandle = await searchPeople(v, `@${uname("priv").slice(0, 8)}`);
    expect(byHandle.map((p) => p.username)).toContain(uname("priv")); // private profiles appear (header only)
    expect((await searchPeople(v, uname("viewer"))).map((p) => p.username)).not.toContain(
      uname("viewer"),
    );
    expect(await searchPeople(v, "z")).toEqual([]); // below the minimum
    expect(await searchPeople(await loadViewer(null), "zeljko")).toEqual([]); // visitors never search
  });

  it("never returns a blocked (either way), non-discoverable, unfinished or deactivated member", async () => {
    const all = async (v: Viewer) => (await searchPeople(v, `_${RUN}`)).map((p) => p.username);
    const seen = await all(await viewer("viewer"));
    expect(seen).not.toContain(uname("shy")); // discoverable = false (also not by name)
    expect((await searchPeople(await viewer("viewer"), "Šimunić")).length).toBe(0);
    expect(seen).not.toContain(uname("fresh"));
    expect(seen).not.toContain(uname("gone"));
    expect(seen).toContain(uname("pub"));
    expect(await all(await viewer("foe"))).not.toContain(uname("pub")); // pub blocked foe
    expect(await all(await viewer("blocker"))).not.toContain(uname("pub")); // blocker blocked pub
    expect(await all(await viewer("pub"))).not.toContain(uname("foe"));
    expect(await all(await viewer("pub"))).not.toContain(uname("blocker"));
    // A deleted account (status) is gone as well.
    await db().update(user).set({ status: "deleted" }).where(eq(user.id, ids.zeljko!));
    expect(await searchPeople(await viewer("viewer"), "zeljko")).toEqual([]);
    await db().update(user).set({ status: "active" }).where(eq(user.id, ids.zeljko!));
  });
});

describe("Daily Drop history on the profile (PROF-03, D-032)", () => {
  it("lists published, non-deleted answers newest first with the question in the viewer's language; counts follow the list rule", async () => {
    const day = 10 + (Number.parseInt(RUN.slice(-2), 36) % 17);
    const [q] = await db()
      .insert(dailyDropQuestion)
      .values({ status: "published", publishDate: `2097-03-${day}`, publishedAt: new Date() })
      .returning({ id: dailyDropQuestion.id });
    questionIds.push(q!.id);
    await db()
      .insert(dailyDropTranslation)
      .values([
        { questionId: q!.id, locale: "hr", text: "Koji album?", review: "approved" },
        { questionId: q!.id, locale: "en", text: "Which album?", review: "approved" },
      ]);
    await db()
      .insert(dailyDropAnswer)
      .values({ questionId: q!.id, authorId: ids.strict!, body: "Kind of Blue", language: "hr" });
    const h = await dropHistory(await viewer("fan"), ids.strict!, "en");
    expect(h?.total).toBe(1);
    expect(h?.items[0]).toMatchObject({ question: "Which album?", text: "Kind of Blue" });
    expect(await dropHistory(await viewer("viewer"), ids.strict!, "hr")).toBeNull();
    const seenByFan = await profileByUsername(await viewer("fan"), uname("strict"));
    if (seenByFan.kind === "profile") expect(seenByFan.counts.answers).toBe(1);
    const seenByMember = await profileByUsername(await viewer("viewer"), uname("strict"));
    if (seenByMember.kind === "profile") expect(seenByMember.counts.answers).toBeUndefined();
    // A soft-deleted answer leaves the list and the count.
    await db()
      .update(dailyDropAnswer)
      .set({ deletedAt: new Date() })
      .where(sql`${dailyDropAnswer.questionId} = ${q!.id}`);
    expect((await dropHistory(await viewer("fan"), ids.strict!, "hr"))?.total).toBe(0);
  });
});
