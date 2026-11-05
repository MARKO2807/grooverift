// Step 5.2: the data-access layer and the invariants of docs/architecture/domain-model.md, against the real
// database. Fixtures are fictional members with @data.test emails; only those rows are touched and removed.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { and, eq, inArray, like, sql } from "drizzle-orm";
import { closeDb, db } from "@/lib/db/client";
import {
  artist,
  block,
  canonicalRedirect,
  comment,
  enforcementAction,
  dailyDropAnswer,
  dailyDropQuestion,
  evidenceAccess,
  follow,
  notice,
  privacySettings,
  profile,
  rateLimitBucket,
  user,
  usernameReservation,
} from "@/lib/db/schema";
import { loadGraph, loadOwners, loadViewer } from "@/lib/data/facts";
import {
  acceptFollowRequest,
  blockMember,
  followMember,
  muteMember,
  unblockMember,
} from "@/lib/data/graph";
import { profileByUsername, usernameAvailable } from "@/lib/data/profiles";
import { addRedirect, artistsByIds, resolveCanonicalId } from "@/lib/data/catalog";
import { createAnswer, deleteOwnAnswer, visibleAnswers } from "@/lib/data/answers";
import { consume, rateKey } from "@/lib/data/rate-limit";
import { storeNotice } from "@/lib/data/notices";
import type { Viewer } from "@/lib/authz";

const RUN = Date.now().toString(36);
const ids: Record<string, string> = {};
const questionIds: string[] = [];
const artistIds: string[] = [];

async function member(
  key: string,
  opts: { visibility?: "public" | "private" | null; status?: string; onboarded?: boolean } = {},
) {
  const [u] = await db()
    .insert(user)
    .values({
      name: `Test ${key}`,
      email: `${key}-${RUN}@data.test`,
      emailVerified: true,
      status: opts.status ?? "active",
    })
    .returning({ id: user.id });
  ids[key] = u!.id;
  await db()
    .insert(profile)
    .values({
      userId: u!.id,
      username: `${key}_${RUN}`.slice(0, 30),
      displayName: `Test ${key}`,
      bio: `bio of ${key}`,
      visibility: opts.visibility === undefined ? "public" : opts.visibility,
      onboardedAt: opts.onboarded === false ? null : new Date(),
    });
  await db().insert(privacySettings).values({ userId: u!.id });
  return u!.id;
}
const asViewer = (key: string): Promise<Viewer> => loadViewer({ id: ids[key]!, role: "member" });
const uname = (key: string) => `${key}_${RUN}`.slice(0, 30);

beforeAll(async () => {
  await member("ana");
  await member("ben");
  await member("cara", { visibility: "private" });
  await member("dora", { status: "deactivated" });
  await member("eli", { onboarded: false, visibility: null });
});

afterAll(async () => {
  const all = Object.values(ids);
  if (questionIds.length) {
    await db().delete(dailyDropAnswer).where(inArray(dailyDropAnswer.questionId, questionIds));
    await db().delete(dailyDropQuestion).where(inArray(dailyDropQuestion.id, questionIds));
  }
  if (artistIds.length) {
    await db().delete(canonicalRedirect).where(inArray(canonicalRedirect.toId, artistIds));
    await db().delete(artist).where(inArray(artist.id, artistIds));
  }
  await db()
    .delete(notice)
    .where(like(notice.url, `%${RUN}%`));
  await db()
    .delete(rateLimitBucket)
    .where(eq(rateLimitBucket.key, rateKey("test", RUN)));
  if (all.length) await db().delete(user).where(inArray(user.id, all)); // cascades profile, graph, …
  await closeDb();
});

describe("facts for the policy module", () => {
  it("builds Owner from user, profile and privacy settings; unknown status fails closed", async () => {
    const owners = await loadOwners([ids.ana!, ids.cara!, ids.eli!]);
    expect(owners.get(ids.ana!)).toMatchObject({
      status: "active",
      profile: "public",
      musicDna: "everyone",
    });
    expect(owners.get(ids.cara!)!.profile).toBe("private");
    // No D-025 choice yet → treated as private with closed sections.
    expect(owners.get(ids.eli!)).toMatchObject({ profile: "private", musicDna: "everyone" });
  });

  it("reads the viewer's status fresh from the database", async () => {
    const v = await loadViewer({ id: ids.dora!, role: "member" });
    expect(v.status).toBe("deactivated");
  });
});

describe("invariant 2: a block removes follows both ways and hides the pair", () => {
  it("follow, block, and the graph after it", async () => {
    const ana = await asViewer("ana");
    const ben = await asViewer("ben");
    expect(await followMember(ana, ids.ben!)).toEqual({ ok: true, state: "accepted" });
    expect(await followMember(ben, ids.ana!)).toEqual({ ok: true, state: "accepted" });
    let g = await loadGraph(ids.ana!, ids.ben!);
    expect(g).toEqual({ blocked: false, follows: "accepted", followedBy: true }); // a Mutual

    expect(await blockMember(ids.ben!, ids.ana!)).toEqual({ ok: true });
    const rows = await db()
      .select()
      .from(follow)
      .where(
        sql`(${follow.followerId} = ${ids.ana} and ${follow.followeeId} = ${ids.ben}) or (${follow.followerId} = ${ids.ben} and ${follow.followeeId} = ${ids.ana})`,
      );
    expect(rows).toEqual([]);
    g = await loadGraph(ids.ana!, ids.ben!);
    expect(g.blocked).toBe(true);

    // The blocked side cannot follow again and sees "not available", not "blocked" (IA8).
    expect(await followMember(ana, ids.ben!)).toEqual({ ok: false, reason: "not-available" });
    expect((await profileByUsername(ana, uname("ben"))).kind).toBe("not-available");
    expect((await profileByUsername(ben, uname("ana"))).kind).toBe("not-available");

    await unblockMember(ids.ben!, ids.ana!);
    expect((await loadGraph(ids.ana!, ids.ben!)).follows).toBe("none"); // follows do not come back
  });

  it("a private profile gets a pending request until the owner accepts", async () => {
    const ana = await asViewer("ana");
    expect(await followMember(ana, ids.cara!)).toEqual({ ok: true, state: "pending" });
    expect((await loadGraph(ids.ana!, ids.cara!)).follows).toBe("pending");
    expect(await acceptFollowRequest(ids.cara!, ids.ana!)).toBe(true);
    expect((await loadGraph(ids.ana!, ids.cara!)).follows).toBe("accepted");
  });

  it("the database refuses following or blocking oneself", async () => {
    await expect(
      db().insert(block).values({ blockerId: ids.ana!, blockedId: ids.ana! }),
    ).rejects.toThrow();
  });
});

describe("profiles: one 'not available' for every reason (IA8, U-02, U-04)", () => {
  it("public profile: members see sections, visitors the minimal view", async () => {
    const ben = await asViewer("ben");
    const p = await profileByUsername(ben, uname("ana").toUpperCase());
    expect(p.kind).toBe("profile");
    if (p.kind === "profile") {
      expect(p.sections.musicDna).toBe(true);
      expect(p.minimal).toBe(false);
    }
    const anon = await loadViewer(null);
    const v = await profileByUsername(anon, uname("ana"));
    expect(v.kind).toBe("profile");
    if (v.kind === "profile") {
      expect(v.minimal).toBe(true);
      expect(v.sections.musicDna).toBeUndefined();
      expect(v.sections.lists).toBeUndefined();
    }
  });

  it("private to visitors, deactivated, unfinished onboarding, unknown and malformed all look the same", async () => {
    const anon = await loadViewer(null);
    const ben = await asViewer("ben");
    for (const [viewer, name] of [
      [anon, uname("cara")],
      [ben, uname("dora")],
      [ben, uname("eli")],
      [ben, `nobody_${RUN}`],
      [ben, "../etc"],
    ] as const) {
      expect(await profileByUsername(viewer, name), name).toEqual({ kind: "not-available" });
    }
  });

  it("a private profile shows its header to members but not its sections", async () => {
    const ben = await asViewer("ben");
    const p = await profileByUsername(ben, uname("cara"));
    expect(p.kind).toBe("profile");
    if (p.kind === "profile") {
      expect(p.sections.identity).toBe(true);
      expect(p.sections.musicDna).toBeUndefined();
      expect(p.sections.posts).toBeUndefined();
    }
  });

  it("usernames are unique without regard to case and reservations hold for 30 days (D-069)", async () => {
    await expect(
      db()
        .insert(profile)
        .values({ userId: ids.dora!, username: uname("ana"), displayName: "x" }),
    ).rejects.toThrow();
    expect(await usernameAvailable(uname("ana"))).toBe(false);
    const old = `old_${RUN}`.slice(0, 30);
    await db()
      .insert(usernameReservation)
      .values({ username: old, userId: ids.ana!, reservedUntil: new Date(Date.now() + 86400_000) });
    expect(await usernameAvailable(old)).toBe(false);
    expect(await usernameAvailable(old, ids.ana!)).toBe(true);
    expect((await profileByUsername(await asViewer("ben"), old)).kind).toBe("not-available");
  });
});

describe("invariant 4: one live Daily Drop question per UTC date", () => {
  it("a second scheduled or published question on the same date is refused; failed ones give the date up", async () => {
    const date = `2099-0${(Number.parseInt(RUN.slice(-1), 36) % 9) + 1}-15`;
    const [a] = await db()
      .insert(dailyDropQuestion)
      .values({ publishDate: date, status: "published", publishedAt: new Date() })
      .returning({ id: dailyDropQuestion.id });
    questionIds.push(a!.id);
    await expect(
      db().insert(dailyDropQuestion).values({ publishDate: date, status: "scheduled" }),
    ).rejects.toThrow();
    const [f] = await db()
      .insert(dailyDropQuestion)
      .values({ publishDate: date, status: "failed" })
      .returning({ id: dailyDropQuestion.id });
    questionIds.push(f!.id);
    await expect(
      db().insert(dailyDropQuestion).values({ publishDate: null, status: "published" }),
    ).rejects.toThrow(); // a live question needs its date
  });
});

describe("invariant (D-035): one answer per member per question among non-deleted answers", () => {
  it("answers once, refuses a second, allows again after deleting", async () => {
    const [q] = await db()
      .insert(dailyDropQuestion)
      .values({
        status: "published",
        publishDate: `2098-01-${10 + (Date.now() % 18)}`,
        publishedAt: new Date(),
      })
      .returning({ id: dailyDropQuestion.id });
    questionIds.push(q!.id);
    const ana = await asViewer("ana");
    const first = await createAnswer(ana, q!.id, "Prvi odgovor");
    expect(first.ok).toBe(true);
    expect(await createAnswer(ana, q!.id, "Drugi")).toEqual({
      ok: false,
      reason: "already-answered",
    });
    if (first.ok) expect(await deleteOwnAnswer(ids.ana!, first.id)).toBe(true);
    expect((await createAnswer(ana, q!.id, "Novi")).ok).toBe(true);

    // A deactivated member cannot answer; a draft question is not available.
    expect(await createAnswer(await asViewer("dora"), q!.id, "x")).toEqual({
      ok: false,
      reason: "not-allowed",
    });
    const [d] = await db()
      .insert(dailyDropQuestion)
      .values({ status: "draft" })
      .returning({ id: dailyDropQuestion.id });
    questionIds.push(d!.id);
    expect(await createAnswer(ana, d!.id, "x")).toEqual({ ok: false, reason: "not-available" });
  });

  it("answers are visible to every member (D-021) except across a block", async () => {
    const [q] = await db()
      .insert(dailyDropQuestion)
      .values({
        status: "published",
        publishDate: `2097-02-${10 + (Date.now() % 18)}`,
        publishedAt: new Date(),
      })
      .returning({ id: dailyDropQuestion.id });
    questionIds.push(q!.id);
    expect((await createAnswer(await asViewer("cara"), q!.id, "Privatna autorica")).ok).toBe(true);
    const ben = await asViewer("ben");
    expect((await visibleAnswers(ben, q!.id)).length).toBe(1); // private author, still visible (D-021)
    await blockMember(ids.cara!, ids.ben!);
    expect((await visibleAnswers(ben, q!.id)).length).toBe(0);
    expect((await visibleAnswers(await loadViewer(null), q!.id)).length).toBe(0); // visitors never (D-022)
    await unblockMember(ids.cara!, ids.ben!);
  });
});

describe("invariant 5: catalogue references resolve through redirects", () => {
  it("follows a chain and refuses a loop", async () => {
    const rows = await db()
      .insert(artist)
      .values([{ name: `A ${RUN}` }, { name: `B ${RUN}` }, { name: `C ${RUN}` }])
      .returning({ id: artist.id });
    const [a, b, c] = rows.map((r) => r.id);
    artistIds.push(a!, b!, c!);
    await db()
      .insert(canonicalRedirect)
      .values([
        { fromId: a!, toId: b!, entityType: "artist" },
        { fromId: b!, toId: c!, entityType: "artist" },
      ]);
    expect(await resolveCanonicalId(a!)).toBe(c);
    expect((await artistsByIds([a!, c!])).map((x) => x?.id)).toEqual([c, c]);
    await db().insert(canonicalRedirect).values({ fromId: c!, toId: a!, entityType: "artist" });
    expect(await resolveCanonicalId(a!)).toBeNull();
    await db()
      .delete(canonicalRedirect)
      .where(inArray(canonicalRedirect.fromId, [a!, b!, c!]));
  });
});

describe("invariant 7: the evidence access log is append-only", () => {
  it("rejects update and delete", async () => {
    const [row] = await db()
      .insert(evidenceAccess)
      .values({ accessorId: ids.ana!, objectType: "test", reason: `test ${RUN}` })
      .returning({ id: evidenceAccess.id });
    await expect(
      db().update(evidenceAccess).set({ reason: "x" }).where(eq(evidenceAccess.id, row!.id)),
    ).rejects.toThrow();
    await expect(
      db().delete(evidenceAccess).where(eq(evidenceAccess.id, row!.id)),
    ).rejects.toThrow();
  });
});

describe("account status values", () => {
  it("the database refuses an unknown status", async () => {
    await expect(
      db().update(user).set({ status: "superuser" }).where(eq(user.id, ids.ana!)),
    ).rejects.toThrow();
  });
});

describe("general rate limiter", () => {
  it("counts within a window, refuses above the limit and starts a new window", async () => {
    const lim = { limit: 2, windowSeconds: 60 };
    const t0 = new Date("2030-01-01T00:00:00Z");
    expect((await consume("test", RUN, lim, t0)).allowed).toBe(true);
    expect((await consume("test", RUN, lim, new Date(t0.getTime() + 1000))).allowed).toBe(true);
    const third = await consume("test", RUN, lim, new Date(t0.getTime() + 2000));
    expect(third.allowed).toBe(false);
    expect(third.retryAfterSeconds).toBeGreaterThan(0);
    expect((await consume("test", RUN, lim, new Date(t0.getTime() + 61_000))).allowed).toBe(true);
    // The key never holds the subject in clear.
    const [row] = await db()
      .select()
      .from(rateLimitBucket)
      .where(eq(rateLimitBucket.key, rateKey("test", RUN)));
    expect(row!.key).not.toContain(RUN);
  });
});

describe("DSA notices are stored (PUB-11)", () => {
  it("keeps what Art. 16(2) asks for", async () => {
    const id = await storeNotice(
      {
        category: "fraud",
        url: `https://grooverift.com/@x?${RUN}`,
        explanation: "Opis.",
        name: "Ime",
        email: "i@example.test",
      },
      null,
    );
    const [row] = await db()
      .select()
      .from(notice)
      .where(and(eq(notice.id, id)));
    expect(row).toMatchObject({ category: "fraud", status: "received", notifierName: "Ime" });
  });
});

describe("step 5.2 review fixes", () => {
  it("H1: deleting an account keeps other members' comments and the moderation record", async () => {
    const gone = await member("gone");
    const [q] = await db()
      .insert(dailyDropQuestion)
      .values({
        status: "published",
        publishDate: `2096-03-${10 + (Date.now() % 18)}`,
        publishedAt: new Date(),
      })
      .returning({ id: dailyDropQuestion.id });
    questionIds.push(q!.id);
    const a = await createAnswer(await asViewer("gone"), q!.id, "Odgovor");
    expect(a.ok).toBe(true);
    if (!a.ok) return;
    await db().insert(comment).values({ answerId: a.id, authorId: ids.ben!, body: "Komentar" });
    const [act] = await db()
      .insert(enforcementAction)
      .values({ subjectUserId: gone, kind: "warning", statementOfReasons: "Test" })
      .returning({ id: enforcementAction.id });
    await db().delete(user).where(eq(user.id, gone));
    delete ids.gone;
    const [answer] = await db().select().from(dailyDropAnswer).where(eq(dailyDropAnswer.id, a.id));
    expect(answer!.authorId).toBeNull();
    const [kept] = await db()
      .select()
      .from(enforcementAction)
      .where(eq(enforcementAction.id, act!.id));
    expect(kept!.subjectUserId).toBeNull();
    await db().delete(comment).where(eq(comment.answerId, a.id));
    await db().delete(enforcementAction).where(eq(enforcementAction.id, act!.id));
  });

  it("M2: the database refuses a follow between a blocked pair", async () => {
    await blockMember(ids.ana!, ids.ben!);
    await expect(
      db()
        .insert(follow)
        .values({ followerId: ids.ben!, followeeId: ids.ana!, status: "accepted" }),
    ).rejects.toThrow();
    await unblockMember(ids.ana!, ids.ben!);
  });

  it("M3: a staff role without a second factor is a member for the policy", async () => {
    expect((await loadViewer({ id: ids.ana!, role: "moderator" })).role).toBe("member");
    await db().update(user).set({ twoFactorEnabled: true }).where(eq(user.id, ids.ana!));
    expect((await loadViewer({ id: ids.ana!, role: "moderator" })).role).toBe("moderator");
    await db().update(user).set({ twoFactorEnabled: false }).where(eq(user.id, ids.ana!));
  });

  it("M4: an unfinished member is hidden and cannot write", async () => {
    const eli = await asViewer("eli");
    expect(eli.onboarded).toBe(false);
    expect((await followMember(await asViewer("ana"), ids.eli!)).ok).toBe(false);
    expect((await followMember(eli, ids.ana!)).ok).toBe(false);
    const [q] = await db()
      .insert(dailyDropQuestion)
      .values({
        status: "published",
        publishDate: `2095-04-${10 + (Date.now() % 18)}`,
        publishedAt: new Date(),
      })
      .returning({ id: dailyDropQuestion.id });
    questionIds.push(q!.id);
    expect(await createAnswer(eli, q!.id, "x")).toEqual({ ok: false, reason: "not-allowed" });
  });

  it("L1: block and mute answer the same for an unknown id", async () => {
    const unknown = "00000000-0000-4000-8000-000000000000";
    expect(await blockMember(ids.ana!, unknown)).toEqual({ ok: true });
    expect(await muteMember(ids.ana!, unknown)).toEqual({ ok: true });
  });

  it("L2 and L9: a removed answer cannot be deleted to free the slot; unpublished questions show nothing", async () => {
    const [q] = await db()
      .insert(dailyDropQuestion)
      .values({
        status: "published",
        publishDate: `2094-05-${10 + (Date.now() % 18)}`,
        publishedAt: new Date(),
      })
      .returning({ id: dailyDropQuestion.id });
    questionIds.push(q!.id);
    const a = await createAnswer(await asViewer("ben"), q!.id, "Uklonjen");
    if (!a.ok) throw new Error("answer");
    await db()
      .update(dailyDropAnswer)
      .set({ removedAt: new Date() })
      .where(eq(dailyDropAnswer.id, a.id));
    expect(await deleteOwnAnswer(ids.ben!, a.id)).toBe(false);
    await db()
      .update(dailyDropQuestion)
      .set({ status: "failed" })
      .where(eq(dailyDropQuestion.id, q!.id));
    expect(await visibleAnswers(await asViewer("ana"), q!.id)).toEqual([]);
  });

  it("L6: a redirect that would close a loop is refused when written", async () => {
    const rows = await db()
      .insert(artist)
      .values([{ name: `X ${RUN}` }, { name: `Y ${RUN}` }])
      .returning({ id: artist.id });
    const [x, y] = rows.map((r) => r.id);
    artistIds.push(x!, y!);
    expect(await addRedirect(x!, y!, "artist")).toBe(true);
    expect(await addRedirect(y!, x!, "artist")).toBe(false);
    await db().delete(canonicalRedirect).where(eq(canonicalRedirect.fromId, x!));
  });
});
