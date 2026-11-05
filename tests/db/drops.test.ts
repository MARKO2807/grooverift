// Step 5.7: the Daily Drop for members through the real data layer and the policy (J3). Published reads never
// show a future, unpublished or withdrawn question (U-03); answers are visible to every signed-in member, private
// authors included (D-021), never to visitors (D-022), and never between a blocked pair (D-019); every count is a
// count of what the viewer may see (counts rule). Fixtures are fictional members with @drop.test emails and
// questions on dates in 1993; only those rows are touched and removed.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { inArray, or } from "drizzle-orm";
import { closeDb, db } from "@/lib/db/client";
import {
  comment,
  dailyDropAnswer,
  dailyDropQuestion,
  dailyDropTranslation,
  mute,
  privacySettings,
  profile,
  reaction,
  user,
} from "@/lib/db/schema";
import type { Viewer } from "@/lib/authz";
import {
  answerThread,
  createAnswer,
  createComment,
  deleteOwnAnswer,
  deleteOwnComment,
  editOwnAnswer,
  questionAnswers,
  setReaction,
  sortAnswers,
  whoReacted,
  type AnswerItem,
} from "@/lib/data/answers";
import { archive, publishedById, publishedOn, recentPublished } from "@/lib/data/drops";
import { loadViewer } from "@/lib/data/facts";
import { blockMember, followMember } from "@/lib/data/graph";
import { addDays, utcDate } from "@/lib/editorial/rules";

const RUN = Date.now().toString(36);
const ids: Record<string, string> = {};
const questionIds: string[] = [];
// A day in 1993 per run, so parallel runs and the other suites never share a date.
const day = (n: number) =>
  `1993-${String((n % 12) + 1).padStart(2, "0")}-${10 + (Date.now() % 18)}`;

async function member(
  key: string,
  opts: { visibility?: "public" | "private"; status?: string } = {},
) {
  const [u] = await db()
    .insert(user)
    .values({
      name: `Drop ${key}`,
      email: `${key}-${RUN}@drop.test`,
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
      displayName: `Drop ${key}`,
      visibility: opts.visibility ?? "public",
      onboardedAt: new Date(),
    });
  await db().insert(privacySettings).values({ userId: u!.id });
}
const as = (key: string): Promise<Viewer> => loadViewer({ id: ids[key]!, role: "member" });

async function question(
  date: string | null,
  status: "published" | "scheduled" | "withdrawn" | "approved" = "published",
) {
  const [q] = await db()
    .insert(dailyDropQuestion)
    .values({ status, publishDate: date, publishedAt: status === "published" ? new Date() : null })
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

const answerOf = (items: AnswerItem[], key: string) =>
  items.find((a) => a.kind === "answer" && a.author.id === ids[key]);

beforeAll(async () => {
  for (const k of ["ana", "ben", "cara", "dino", "eva", "foe", "fan"]) await member(k);
  await member("priv", { visibility: "private" });
  await member("gone", { status: "deactivated" });
  await blockMember(ids.ana!, ids.foe!); // ana blocks foe: hidden both ways
  await followMember(await as("fan"), ids.cara!); // fan follows cara (public: accepted at once)
  await db().insert(mute).values({ muterId: ids.fan!, mutedId: ids.dino! });
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

describe("published reads (U-03)", () => {
  it("open only published questions dated up to today, in the viewer's language", async () => {
    const d = day(0);
    const id = await question(d);
    expect((await publishedOn(d, "hr"))?.text).toBe(`Pitanje ${d}`);
    expect((await publishedOn(d, "en"))?.text).toBe(`Question ${d}`);
    expect((await publishedById(id, "hr"))?.date).toBe(d);
    expect(await publishedOn("1993-02-30", "hr")).toBeNull(); // not a date
    expect(await publishedOn("not-a-date", "hr")).toBeNull();
    expect((await archive("hr")).some((q) => q.id === id)).toBe(true);
  });

  it("never open a scheduled, withdrawn, undated or future question", async () => {
    const d = day(1);
    const scheduled = await question(d, "scheduled");
    const withdrawn = await question(day(2), "withdrawn");
    const reserve = await question(null, "approved");
    const future = addDays(utcDate(), 400);
    const ahead = await question(future); // cannot happen in the product; the read still refuses it
    for (const id of [scheduled, withdrawn, reserve, ahead])
      expect(await publishedById(id, "hr")).toBeNull();
    expect(await publishedOn(d, "hr")).toBeNull();
    expect(await publishedOn(future, "hr")).toBeNull();
    const all = await archive("hr");
    expect(all.some((q) => [scheduled, withdrawn, reserve, ahead].includes(q.id))).toBe(false);
    expect(await createAnswer(await as("ana"), ahead, "x")).toEqual({
      ok: false,
      reason: "not-available",
    });
    expect((await recentPublished("hr", 7)).some((q) => q.id === ahead)).toBe(false);
  });
});

describe("answers on the question page (D-021, D-019, D-022)", () => {
  let qid = "";
  beforeAll(async () => {
    qid = await question(day(3));
    for (const k of ["ben", "cara", "dino", "priv", "foe"])
      expect((await createAnswer(await as(k), qid, `Odgovor ${k}`)).ok).toBe(true);
    await db()
      .insert(dailyDropAnswer)
      .values({ questionId: qid, authorId: ids.gone!, body: "Deaktiviran" });
  });

  it("show a private author's answer to every member and count it (counts rule)", async () => {
    const r = await questionAnswers(await as("eva"), qid);
    expect(answerOf(r.items, "priv")).toBeTruthy();
    expect(r.count).toBe(5); // ben, cara, dino, priv, foe; the deactivated author is hidden
    expect(answerOf(r.items, "gone")).toBeUndefined();
  });

  it("hide a blocked pair's answers both ways and leave them out of the count", async () => {
    const ana = await questionAnswers(await as("ana"), qid);
    expect(answerOf(ana.items, "foe")).toBeUndefined();
    expect(ana.count).toBe(4);
    expect((await createAnswer(await as("ana"), qid, "Ana")).ok).toBe(true);
    const foe = await questionAnswers(await as("foe"), qid);
    expect(answerOf(foe.items, "ana")).toBeUndefined();
    expect(foe.mine?.body).toBe("Odgovor foe");
    expect(foe.count).toBe(5); // own + ben, cara, dino, priv
    const eva = await questionAnswers(await as("eva"), qid);
    expect(eva.count).toBe(6); // others see both
  });

  it("show visitors nothing", async () => {
    const r = await questionAnswers(await loadViewer(null), qid);
    expect(r).toEqual({ mine: null, items: [], count: 0 });
  });

  it("pin the own answer and mark muted and followed authors", async () => {
    const fan = await questionAnswers(await as("fan"), qid);
    expect(fan.mine).toBeNull();
    const dino = answerOf(fan.items, "dino");
    expect(dino?.kind === "answer" && dino.muted).toBe(true);
    const cara = answerOf(fan.items, "cara");
    expect(cara?.kind === "answer" && cara.followed).toBe(true);
    // For You: followed authors first (cara), then the rest by Recent.
    expect(fan.items[0]?.kind === "answer" && fan.items[0].author.id).toBe(ids.cara);
    const ben = await questionAnswers(await as("ben"), qid);
    expect(ben.mine?.body).toBe("Odgovor ben");
    expect(answerOf(ben.items, "ben")).toBeUndefined(); // pinned, not repeated in the list
  });

  it("let the author edit in place and nobody else", async () => {
    const r = await questionAnswers(await as("ben"), qid);
    const id = r.mine!.id;
    expect(await editOwnAnswer(await as("cara"), id, "Tuđe")).toEqual({
      ok: false,
      reason: "not-available",
    });
    expect(await editOwnAnswer(await as("ben"), id, "x".repeat(1501))).toEqual({
      ok: false,
      reason: "not-allowed",
    });
    expect(await editOwnAnswer(await as("ben"), id, "  Uređeno  ")).toEqual({ ok: true });
    const after = await questionAnswers(await as("ben"), qid);
    expect(after.mine?.body).toBe("Uređeno");
    expect(after.mine?.editedAt).toBeInstanceOf(Date);
  });
});

describe("comments, the reaction and placeholders", () => {
  let qid = "";
  let caraAnswer = "";
  beforeAll(async () => {
    qid = await question(day(4));
    const c = await createAnswer(await as("cara"), qid, "Carin odgovor");
    if (!c.ok) throw new Error("setup");
    caraAnswer = c.id;
  });

  it("count comments the viewer may see and leave a placeholder for a blocked pair (D-019)", async () => {
    expect((await createComment(await as("ben"), caraAnswer, "Ben komentira")).ok).toBe(true);
    expect((await createComment(await as("foe"), caraAnswer, "Foe komentira")).ok).toBe(true);
    expect((await createComment(await as("ana"), caraAnswer, "x".repeat(751))).ok).toBe(false);
    const eva = await answerThread(await as("eva"), caraAnswer);
    expect(eva?.comments.filter((c) => c.kind === "comment")).toHaveLength(2);
    const ana = await answerThread(await as("ana"), caraAnswer);
    expect(ana?.comments.map((c) => c.kind)).toEqual(["comment", "unavailable"]);
    expect(ana?.answer.kind === "answer" && ana.answer.comments).toBe(1);
    const evaList = await questionAnswers(await as("eva"), qid);
    expect(answerOf(evaList.items, "cara")?.comments).toBe(2);
    expect(await answerThread(await loadViewer(null), caraAnswer)).toBeNull();
  });

  it("refuse a comment from a blocked pair on the other's answer", async () => {
    const r = await createAnswer(await as("ana"), qid, "Anin odgovor");
    if (!r.ok) throw new Error("setup");
    expect(await createComment(await as("foe"), r.id, "Ne smije")).toEqual({
      ok: false,
      reason: "not-available",
    });
    expect(await answerThread(await as("foe"), r.id)).toBeNull(); // E13
  });

  it("delete only the own comment", async () => {
    const r = await createComment(await as("dino"), caraAnswer, "Dino");
    if (!r.ok) throw new Error("setup");
    expect((await deleteOwnComment(await as("ben"), r.id)).ok).toBe(false);
    expect((await deleteOwnComment(await as("dino"), r.id)).ok).toBe(true);
    const t = await answerThread(await as("eva"), caraAnswer);
    expect(t?.comments.some((c) => c.id === r.id)).toBe(false);
  });

  it("toggle one reaction, never on the own answer, and count only visible reactors (D-056)", async () => {
    expect(await setReaction(await as("cara"), caraAnswer, true)).toEqual({
      ok: false,
      reason: "not-available",
    });
    expect(await setReaction(await as("ben"), caraAnswer, true)).toEqual({
      ok: true,
      reacted: true,
      count: 1,
    });
    expect((await setReaction(await as("ben"), caraAnswer, true)).ok).toBe(true); // idempotent
    expect(await setReaction(await as("foe"), caraAnswer, true)).toEqual({
      ok: true,
      reacted: true,
      count: 2,
    });
    const eva = answerOf((await questionAnswers(await as("eva"), qid)).items, "cara");
    expect(eva?.kind === "answer" && eva.reactions).toBe(2);
    const ana = answerOf((await questionAnswers(await as("ana"), qid)).items, "cara");
    expect(ana?.kind === "answer" && ana.reactions).toBe(1); // foe is blocked for ana
    expect(await whoReacted(await as("ana"), caraAnswer)).toEqual([ids.ben]);
    expect(await whoReacted(await loadViewer(null), caraAnswer)).toBeNull();
    expect(await setReaction(await as("ben"), caraAnswer, false)).toEqual({
      ok: true,
      reacted: false,
      count: 1,
    });
  });

  it("keep replies readable under a deleted answer, and nothing when nobody replied (E5)", async () => {
    expect(await deleteOwnAnswer(ids.cara!, caraAnswer)).toBe(true);
    const eva = await questionAnswers(await as("eva"), qid);
    const gone = eva.items.find((a) => a.id === caraAnswer);
    expect(gone).toMatchObject({ kind: "gone", removed: false, comments: 2 });
    expect(eva.count).toBe(1); // only ana's answer counts; the placeholder does not
    const thread = await answerThread(await as("eva"), caraAnswer);
    expect(thread?.answer.kind).toBe("gone");
    expect(thread?.comments).toHaveLength(2);
    const reactions = await db()
      .select()
      .from(reaction)
      .where(inArray(reaction.targetId, [caraAnswer]));
    expect(reactions).toHaveLength(0); // the reactions went with the answer
    expect((await createAnswer(await as("cara"), qid, "Novi odgovor")).ok).toBe(true); // D-035
    const lone = await createAnswer(await as("eva"), qid, "Samo");
    if (!lone.ok) throw new Error("setup");
    await deleteOwnAnswer(ids.eva!, lone.id);
    const after = await questionAnswers(await as("ben"), qid);
    expect(after.items.some((a) => a.id === lone.id)).toBe(false);
    expect(await createComment(await as("ben"), caraAnswer, "Na izbrisani")).toEqual({
      ok: false,
      reason: "not-available",
    });
  });
});

describe("the three sorts (plan §1.2)", () => {
  const view = (id: string, at: number, comments: number, followed = false): AnswerItem => ({
    kind: "answer",
    id,
    author: { id, username: id, displayName: id },
    body: id,
    language: null,
    createdAt: new Date(at),
    editedAt: null,
    mine: false,
    muted: false,
    followed,
    reactions: 99 - comments, // reactions never decide the order (§5)
    reacted: false,
    comments,
  });
  const items = [view("a", 1, 3), view("b", 2, 0, true), view("c", 3, 3), view("d", 4, 1)];
  it("Recent is newest first", () => {
    expect(sortAnswers(items, "recent").map((a) => a.id)).toEqual(["d", "c", "b", "a"]);
  });
  it("Most Discussed orders by comments, ties by Recent, and keeps the quiet ones", () => {
    expect(sortAnswers(items, "discussed").map((a) => a.id)).toEqual(["c", "a", "d", "b"]);
  });
  it("For You puts followed authors first, then Recent", () => {
    expect(sortAnswers(items, "foryou").map((a) => a.id)).toEqual(["b", "d", "c", "a"]);
  });
});
