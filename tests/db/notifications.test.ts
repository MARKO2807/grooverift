// Step 5.8: Activity through the real data layer (ACT-01, plan row 5.8). The writer never notifies about the own
// act, never across a block and never to or from a hidden account; reactions group into one entry per hour per
// answer; every entry is checked again at render, so content the viewer lost access to renders as nothing.
// Fixtures are fictional members with @notify.test emails and questions on dates in 1994; only those rows are
// touched and removed (notifications go with their recipients through the foreign key).
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { and, eq, inArray, or } from "drizzle-orm";
import { closeDb, db } from "@/lib/db/client";
import {
  comment,
  dailyDropAnswer,
  dailyDropQuestion,
  dailyDropTranslation,
  mute,
  notification,
  privacySettings,
  profile,
  reaction,
  user,
} from "@/lib/db/schema";
import type { Viewer } from "@/lib/authz";
import {
  createAnswer,
  createComment,
  deleteOwnAnswer,
  deleteOwnComment,
  setReaction,
} from "@/lib/data/answers";
import { loadViewer } from "@/lib/data/facts";
import {
  acceptFollowRequest,
  blockMember,
  followMember,
  unblockMember,
  unfollowMember,
} from "@/lib/data/graph";
import {
  activityFor,
  markActivityRead,
  notify,
  pruneNotifications,
  type ActivityItem,
} from "@/lib/data/notifications";
import { setProfileVisibility } from "@/lib/data/profiles";

const RUN = Date.now().toString(36);
const ids: Record<string, string> = {};
const questionIds: string[] = [];
const DAY = 10 + (Date.now() % 18); // fixed for the run
const day = (n: number) => `1994-${String((n % 12) + 1).padStart(2, "0")}-${DAY}`;

async function member(
  key: string,
  opts: { visibility?: "public" | "private"; status?: string } = {},
) {
  const [u] = await db()
    .insert(user)
    .values({
      name: `Notify ${key}`,
      email: `${key}-${RUN}@notify.test`,
      emailVerified: true,
      status: opts.status ?? "active",
    })
    .returning({ id: user.id });
  ids[key] = u!.id;
  await db()
    .insert(profile)
    .values({
      userId: u!.id,
      username: `n${key}_${RUN}`.slice(0, 30),
      displayName: `Notify ${key}`,
      visibility: opts.visibility ?? "public",
      onboardedAt: new Date(),
    });
  await db().insert(privacySettings).values({ userId: u!.id });
}
const as = (key: string): Promise<Viewer> => loadViewer({ id: ids[key]!, role: "member" });

async function question(date: string) {
  const [q] = await db()
    .insert(dailyDropQuestion)
    .values({ status: "published", publishDate: date, publishedAt: new Date() })
    .returning({ id: dailyDropQuestion.id });
  questionIds.push(q!.id);
  await db()
    .insert(dailyDropTranslation)
    .values([
      { questionId: q!.id, locale: "hr", text: `Pitanje ${date}`, review: "approved" },
      { questionId: q!.id, locale: "en", text: `Question ${date}`, review: "approved" },
    ]);
  return q!.id;
}

async function answerBy(key: string, questionId: string) {
  const r = await createAnswer(await as(key), questionId, `Odgovor ${key}`);
  if (!r.ok) throw new Error(`answer ${key}: ${r.reason}`);
  return r.id;
}

/** Entries other than the Daily Drop line (that one depends on today's real question). */
const feed = async (key: string): Promise<ActivityItem[]> =>
  (await activityFor(ids[key]!, "hr")).filter((i) => i.kind !== "drop");
const rowsFor = (key: string) =>
  db().select().from(notification).where(eq(notification.recipientId, ids[key]!));

beforeAll(async () => {
  for (const k of [
    "ana",
    "ben",
    "cara",
    "dino",
    "eva",
    "foe",
    "muted",
    "leaver",
    "fol",
    "req",
    "req2",
    "tom",
    "pru",
  ])
    await member(k);
  await member("priv", { visibility: "private" });
  await member("priv2", { visibility: "private" });
  await member("gone", { status: "deactivated" });
});

afterAll(async () => {
  if (questionIds.length) {
    const answers = await db()
      .select({ id: dailyDropAnswer.id })
      .from(dailyDropAnswer)
      .where(inArray(dailyDropAnswer.questionId, questionIds));
    const aIds = answers.map((a) => a.id);
    if (aIds.length) {
      await db().delete(comment).where(inArray(comment.answerId, aIds));
      await db().delete(reaction).where(inArray(reaction.targetId, aIds));
    }
    await db().delete(dailyDropAnswer).where(inArray(dailyDropAnswer.questionId, questionIds));
    await db().delete(dailyDropQuestion).where(inArray(dailyDropQuestion.id, questionIds));
  }
  const all = Object.values(ids);
  if (all.length) {
    await db()
      .delete(mute)
      .where(or(inArray(mute.muterId, all), inArray(mute.mutedId, all)));
    await db().delete(user).where(inArray(user.id, all));
  }
  await closeDb();
});

describe("comments (ACT-01)", () => {
  it("notify the answer's author with an excerpt and a deep link; never the own comment", async () => {
    const q = await question(day(0));
    const a = await answerBy("ana", q);
    const own = await createComment(await as("ana"), a, "Moj komentar");
    expect(own.ok).toBe(true);
    expect(await feed("ana")).toHaveLength(0);
    const c = await createComment(await as("ben"), a, "Slažem se,   ovo je  odlično");
    if (!c.ok) throw new Error("comment");
    const [item] = await feed("ana");
    expect(item).toMatchObject({
      kind: "comment",
      unread: true,
      actor: { displayName: "Notify ben" },
      excerpt: "Slažem se, ovo je odlično",
      href: `/drop/${day(0)}/a/${a}#c-${c.id}`,
    });
  });

  it("render as nothing once the comment, the answer or the question is gone", async () => {
    const q = await question(day(1));
    const a = await answerBy("cara", q);
    const c = await createComment(await as("dino"), a, "Prvi");
    if (!c.ok) throw new Error("comment");
    expect(await feed("cara")).toHaveLength(1);
    await deleteOwnComment(await as("dino"), c.id);
    expect(await feed("cara")).toHaveLength(0);

    await createComment(await as("dino"), a, "Drugi");
    expect(await feed("cara")).toHaveLength(1);
    await db()
      .update(dailyDropQuestion)
      .set({ status: "withdrawn" })
      .where(eq(dailyDropQuestion.id, q));
    expect(await feed("cara")).toHaveLength(0);
    await db()
      .update(dailyDropQuestion)
      .set({ status: "published" })
      .where(eq(dailyDropQuestion.id, q));
    expect(await feed("cara")).toHaveLength(1);
    await deleteOwnAnswer(ids.cara!, a);
    expect(await feed("cara")).toHaveLength(0);
  });

  it("hide entries from a member who was muted or deactivated since", async () => {
    const q = await question(day(2));
    const a = await answerBy("eva", q);
    await createComment(await as("muted"), a, "Bok");
    await createComment(await as("leaver"), a, "Pozdrav");
    expect(await feed("eva")).toHaveLength(2);
    await db().insert(mute).values({ muterId: ids.eva!, mutedId: ids.muted! });
    await db().update(user).set({ status: "deactivated" }).where(eq(user.id, ids.leaver!));
    expect(await feed("eva")).toHaveLength(0);
    await db().update(user).set({ status: "active" }).where(eq(user.id, ids.leaver!));
  });
});

describe("reactions grouped (plan §2)", () => {
  it("make one entry per hour per answer, listing the visible reactors", async () => {
    const q = await question(day(3));
    const a = await answerBy("tom", q);
    await setReaction(await as("ana"), a, true);
    await setReaction(await as("ben"), a, true);
    await setReaction(await as("cara"), a, true);
    expect(await rowsFor("tom")).toHaveLength(1);
    const [item] = await feed("tom");
    expect(item?.kind).toBe("reaction");
    if (item?.kind !== "reaction") throw new Error("kind");
    expect(item.actors.map((p) => p.displayName)).toEqual(["Notify cara", "Notify ben"]);
    expect(item.others).toBe(1);
    expect(item.href).toBe(`/drop/${day(3)}/a/${a}`);

    // Reactions taken back leave fewer names; none left renders nothing.
    for (const k of ["ana", "ben", "cara"]) await setReaction(await as(k), a, false);
    expect(await feed("tom")).toHaveLength(0);
  });

  it("re-open the entry inside the hour and start a new one after it", async () => {
    const q = await question(day(4));
    const a = await answerBy("pru", q);
    await setReaction(await as("ana"), a, true);
    await markActivityRead(ids.pru!, new Date());
    expect((await feed("pru"))[0]?.unread).toBe(false);
    await setReaction(await as("ben"), a, true);
    expect(await rowsFor("pru")).toHaveLength(1);
    expect((await feed("pru"))[0]?.unread).toBe(true);

    // Two hours later the window is closed: a new reaction opens a second entry.
    const past = new Date(Date.now() - 2 * 3_600_000);
    await db()
      .update(notification)
      .set({ createdAt: past })
      .where(eq(notification.recipientId, ids.pru!));
    await db()
      .update(reaction)
      .set({ createdAt: past })
      .where(and(eq(reaction.targetId, a), eq(reaction.targetType, "answer")));
    await setReaction(await as("cara"), a, true);
    const rows = await rowsFor("pru");
    expect(rows).toHaveLength(2);
    const items = (await feed("pru")).filter((i) => i.kind === "reaction");
    expect(items).toHaveLength(2);
    if (items[0]?.kind !== "reaction" || items[1]?.kind !== "reaction") throw new Error("kind");
    expect(items[0].actors.map((p) => p.displayName)).toEqual(["Notify cara"]);
    expect(items[1].actors.map((p) => p.displayName).sort()).toEqual(["Notify ana", "Notify ben"]);
  });
});

describe("blocks (D-019, J5)", () => {
  it("never notify across a block, either way, and remove earlier entries both ways", async () => {
    const q = await question(day(5));
    const a = await answerBy("foe", q);
    await createComment(await as("dino"), a, "Prije blokiranja");
    await followMember(await as("foe"), ids.dino!);
    expect(await feed("foe")).toHaveLength(1);
    expect(await feed("dino")).toHaveLength(1);
    await blockMember(ids.dino!, ids.foe!);
    expect(await rowsFor("foe")).toHaveLength(0);
    expect((await rowsFor("dino")).filter((r) => r.actorId === ids.foe)).toHaveLength(0);
    for (const [to, from] of [
      ["foe", "dino"],
      ["dino", "foe"],
    ] as const)
      expect(
        await notify({ recipientId: ids[to]!, actorId: ids[from]!, type: "comment", targetId: a }),
      ).toBe(false);
    await unblockMember(ids.dino!, ids.foe!);
  });

  it("never notify the own act, a hidden recipient or from a hidden actor", async () => {
    const target = ids.ana!;
    expect(
      await notify({ recipientId: target, actorId: target, type: "follow", targetId: target }),
    ).toBe(false);
    expect(
      await notify({ recipientId: ids.gone!, actorId: target, type: "follow", targetId: target }),
    ).toBe(false);
    expect(
      await notify({
        recipientId: target,
        actorId: ids.gone!,
        type: "follow",
        targetId: ids.gone!,
      }),
    ).toBe(false);
  });
});

describe("follows (ACT-01, ACT-02)", () => {
  it("a public follow is one entry that disappears after an unfollow; refollowing in a day adds none", async () => {
    await followMember(await as("fol"), ids.ben!);
    let items = (await feed("ben")).filter((i) => i.kind === "follow");
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ actor: { displayName: "Notify fol" } });
    await unfollowMember(ids.fol!, ids.ben!);
    expect((await feed("ben")).filter((i) => i.kind === "follow")).toHaveLength(0);
    await followMember(await as("fol"), ids.ben!);
    items = (await feed("ben")).filter((i) => i.kind === "follow");
    expect(items).toHaveLength(1);
    expect((await rowsFor("ben")).filter((r) => r.type === "follow")).toHaveLength(1);
  });

  it("a request makes no entry (the requests row counts it); accepting tells the requester", async () => {
    const r = await followMember(await as("req"), ids.priv!);
    expect(r).toMatchObject({ ok: true, state: "pending" });
    expect(await feed("priv")).toHaveLength(0);
    await acceptFollowRequest(ids.priv!, ids.req!);
    const items = await feed("req");
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      kind: "follow_accept",
      actor: { displayName: "Notify priv" },
    });
  });

  it("turning public accepts the pending requests and tells each requester (JO5)", async () => {
    await followMember(await as("req2"), ids.priv2!);
    const res = await setProfileVisibility(ids.priv2!, "public", { acceptPending: true });
    expect(res.accepted).toBe(1);
    expect((await feed("req2")).map((i) => i.kind)).toEqual(["follow_accept"]);
  });
});

describe("read state and housekeeping", () => {
  it("marks entries up to the given time as read and prunes rows older than 30 days", async () => {
    await followMember(await as("eva"), ids.cara!);
    const before = (await feed("cara")).filter((i) => i.unread);
    expect(before.length).toBeGreaterThan(0);
    await markActivityRead(ids.cara!, new Date(Date.now() - 3_600_000));
    expect((await feed("cara")).filter((i) => i.unread)).toHaveLength(before.length);
    await markActivityRead(ids.cara!, new Date());
    expect((await feed("cara")).filter((i) => i.unread)).toHaveLength(0);

    const old = new Date(Date.now() - 31 * 86_400_000);
    await db()
      .update(notification)
      .set({ createdAt: old })
      .where(eq(notification.recipientId, ids.cara!));
    expect(await pruneNotifications()).toBeGreaterThan(0);
    expect(await rowsFor("cara")).toHaveLength(0);
  });
});
