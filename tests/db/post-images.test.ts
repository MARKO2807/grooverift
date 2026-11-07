// Step 5.11, D-120 and D-121: member images in answers and comments through the data layer. One image per post,
// replace and remove on edit, deleted with the post and with the account, in the data copy, reported to the top of
// the queue, removed alone by a moderator and put back when the appeal is overturned. Storage is a scratch folder
// (MEDIA_STORE=file); questions sit on dates in 1994 that no other suite uses.
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import sharp from "sharp";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { and, eq, gte, inArray, lte } from "drizzle-orm";

const dir = mkdtempSync(path.join(tmpdir(), "gr-post-img-"));
process.env.MEDIA_STORE = "file";
process.env.MEDIA_DIR = dir;
process.env.CATALOG_STUB = "1";

const { closeDb, db } = await import("@/lib/db/client");
const schema = await import("@/lib/db/schema");
const { loadViewer } = await import("@/lib/data/facts");
const answers = await import("@/lib/data/answers");
const media = await import("@/lib/data/media");
const safety = await import("@/lib/data/safety");
const moderation = await import("@/lib/data/moderation");
const account = await import("@/lib/data/account");
const { collectMemberData } = await import("@/lib/data/export");
const { processPostImage } = await import("@/lib/media/process");
const { artistsFromPicks } = await import("@/lib/data/cards");

const RUN = Date.now().toString(36);
const ids: Record<string, string> = {};
const questionIds: string[] = [];

async function member(key: string, role: "member" | "admin" = "member") {
  const [u] = await db()
    .insert(schema.user)
    .values({
      name: `Pi ${key}`,
      email: `${key}-${RUN}@post-images.test`,
      emailVerified: true,
      role,
      twoFactorEnabled: role !== "member",
    })
    .returning({ id: schema.user.id });
  ids[key] = u!.id;
  await db()
    .insert(schema.profile)
    .values({
      userId: u!.id,
      username: `pi${key}_${RUN}`.slice(0, 30),
      displayName: `Pi ${key}`,
      visibility: "public",
      onboardedAt: new Date(),
    });
  await db().insert(schema.privacySettings).values({ userId: u!.id });
}
const as = (key: string, role: "member" | "admin" = "member") =>
  loadViewer({ id: ids[key]!, role });

async function image(colour = "#3c78c8") {
  const bytes = await sharp({
    create: { width: 640, height: 480, channels: 3, background: colour },
  })
    .jpeg()
    .toBuffer();
  const r = await processPostImage(bytes);
  if (!r.ok) throw new Error("fixture image failed");
  return { image: r.image, alt: null as string | null };
}

async function question(date: string) {
  const [q] = await db()
    .insert(schema.dailyDropQuestion)
    .values({ status: "published", publishDate: date, publishedAt: new Date() })
    .returning({ id: schema.dailyDropQuestion.id });
  questionIds.push(q!.id);
  return q!.id;
}

const keyOf = async (id: string | null | undefined) =>
  id
    ? (await db().select().from(schema.media).where(eq(schema.media.id, id)))[0]?.storageKey
    : undefined;
const onDisk = (key: string | undefined) => !!key && existsSync(path.join(dir, ...key.split("/")));
const imageOf = async (answerId: string) =>
  (
    await db()
      .select({ imageId: schema.dailyDropAnswer.imageId })
      .from(schema.dailyDropAnswer)
      .where(eq(schema.dailyDropAnswer.id, answerId))
  )[0]?.imageId ?? null;

async function cleanQuestions() {
  if (questionIds.length) {
    const rows = await db()
      .select({ id: schema.dailyDropAnswer.id })
      .from(schema.dailyDropAnswer)
      .where(inArray(schema.dailyDropAnswer.questionId, questionIds));
    if (rows.length)
      await db()
        .delete(schema.comment)
        .where(
          inArray(
            schema.comment.answerId,
            rows.map((r) => r.id),
          ),
        );
    await db()
      .delete(schema.dailyDropAnswer)
      .where(inArray(schema.dailyDropAnswer.questionId, questionIds));
    await db()
      .delete(schema.dailyDropQuestion)
      .where(inArray(schema.dailyDropQuestion.id, questionIds));
  }
  questionIds.length = 0;
}

beforeAll(async () => {
  // A run that stopped half way leaves its questions; these dates belong to this file only.
  const stale = await db()
    .select({ id: schema.dailyDropQuestion.id })
    .from(schema.dailyDropQuestion)
    .where(
      and(
        gte(schema.dailyDropQuestion.publishDate, "1994-04-01"),
        lte(schema.dailyDropQuestion.publishDate, "1994-04-30"),
      ),
    );
  questionIds.push(...stale.map((q) => q.id));
  await cleanQuestions();
  for (const k of ["ana", "ben", "cara", "gone"]) await member(k);
  await member("adm1", "admin");
  await member("adm2", "admin");
});

afterAll(async () => {
  const users = Object.values(ids);
  // Decided cases stay (evidence_access is append-only and points at them); their subject is set null below.
  const cases = await db()
    .select({ id: schema.moderationCase.id })
    .from(schema.moderationCase)
    .where(inArray(schema.moderationCase.subjectUserId, users));
  const caseIds = cases.map((c) => c.id);
  if (caseIds.length) {
    await db().delete(schema.report).where(inArray(schema.report.caseId, caseIds));
    // The copies go, so their images can be swept.
    await db()
      .delete(schema.contentSnapshot)
      .where(inArray(schema.contentSnapshot.caseId, caseIds));
  }
  await cleanQuestions();
  await db().delete(schema.notification).where(inArray(schema.notification.recipientId, users));
  await db().delete(schema.deletionRequest).where(inArray(schema.deletionRequest.userId, users));
  await db().delete(schema.user).where(inArray(schema.user.id, users));
  await media.sweepMedia(new Date(Date.now() + 2 * 60 * 60 * 1000));
  await closeDb();
  rmSync(dir, { recursive: true, force: true });
});

describe("answers and comments with an image (D-121)", () => {
  it("one image per answer: shown with its size and description, replaced, described and removed on edit", async () => {
    const q = await question("1994-04-01");
    const first = await image();
    first.alt = "Ploča na gramofonu";
    const r = await answers.createAnswer(await as("ana"), q, "Moja ploča", first);
    expect(r.ok).toBe(true);
    const id = r.ok ? r.id : "";
    const view = await answers.questionAnswers(await as("ben"), q, "recent");
    const seen = view.items.find((a) => a.kind === "answer" && a.id === id);
    expect(seen?.kind === "answer" && seen.image).toMatchObject({
      width: 640,
      height: 480,
      alt: "Ploča na gramofonu",
    });

    const oldKey = await keyOf(await imageOf(id));
    expect(
      await answers.editOwnAnswer(await as("ana"), id, "Druga", { replace: await image("#000") }),
    ).toEqual({ ok: true });
    expect(onDisk(oldKey)).toBe(false);
    const second = await imageOf(id);
    expect(second).not.toBeNull();

    expect(await answers.editOwnAnswer(await as("ana"), id, "Druga", { alt: "Novi opis" })).toEqual(
      {
        ok: true,
      },
    );
    const [m] = await db().select().from(schema.media).where(eq(schema.media.id, second!));
    expect(m!.alt).toBe("Novi opis");

    expect(await answers.editOwnAnswer(await as("ana"), id, "Bez slike", { remove: true })).toEqual(
      {
        ok: true,
      },
    );
    expect(await imageOf(id)).toBeNull();
    expect(await keyOf(second)).toBeUndefined();
  });

  it("someone else cannot edit the image, and a failed post stores nothing", async () => {
    const q = await question("1994-04-02");
    const r = await answers.createAnswer(await as("ana"), q, "Prvi", await image());
    const id = r.ok ? r.id : "";
    expect((await answers.editOwnAnswer(await as("ben"), id, "Tuđe", { remove: true })).ok).toBe(
      false,
    );
    expect(await imageOf(id)).not.toBeNull();
    // A second answer to the same question is refused before anything is stored (D-035).
    const before = (await media.ownImages(ids.ana!)).length;
    const again = await answers.createAnswer(await as("ana"), q, "Drugi", await image());
    expect(again).toEqual({ ok: false, reason: "already-answered" });
    expect((await media.ownImages(ids.ana!)).length).toBe(before);
  });

  it("deleting the answer or the comment deletes its image", async () => {
    const q = await question("1994-04-03");
    const a = await answers.createAnswer(await as("ben"), q, "Odgovor", await image());
    const answerId = a.ok ? a.id : "";
    const aKey = await keyOf(await imageOf(answerId));
    const c = await answers.createComment(await as("cara"), answerId, "Komentar", await image());
    expect(c.ok).toBe(true);
    const [row] = await db()
      .select({ imageId: schema.comment.imageId })
      .from(schema.comment)
      .where(eq(schema.comment.id, c.ok ? c.id : ""));
    const cKey = await keyOf(row!.imageId);
    const thread = await answers.answerThread(await as("ana"), answerId);
    const com = thread?.comments.find((x) => x.kind === "comment");
    expect(com?.kind === "comment" && com.image).toBeTruthy();

    expect(await answers.deleteOwnComment(await as("cara"), c.ok ? c.id : "")).toEqual({
      ok: true,
    });
    expect(onDisk(cKey)).toBe(false);
    expect(await answers.deleteOwnAnswer(ids.ben!, answerId)).toBe(true);
    expect(onDisk(aKey)).toBe(false);
  });
});

describe("moderation of images (D-121 (4))", () => {
  it("an image report goes to the top, the copy keeps the image, and 'remove only the image' is undone by an overturned appeal", async () => {
    const q = await question("1994-04-04");
    const a = await answers.createAnswer(await as("ana"), q, "Tekst ostaje", await image());
    const answerId = a.ok ? a.id : "";
    const imageId = (await imageOf(answerId))!;
    expect(
      await safety.createReport(await as("ben"), {
        targetType: "answer",
        targetId: answerId,
        category: "sexual",
        details: "",
        aboutImage: true,
      }),
    ).toEqual({ ok: true });
    const [c] = await db()
      .select()
      .from(schema.moderationCase)
      .where(
        and(
          eq(schema.moderationCase.targetType, "answer"),
          eq(schema.moderationCase.targetId, answerId),
        ),
      );
    expect(c!.priority).toBe(0);
    const [rep] = await db().select().from(schema.report).where(eq(schema.report.caseId, c!.id));
    expect(rep!.details).toBe(safety.IMAGE_REPORT_TAG);

    const adm1 = await as("adm1", "admin");
    const detail = await moderation.caseDetail(adm1, c!.id);
    expect(detail?.snapshots[0]?.content.imageId).toBe(imageId);
    expect(detail?.current.hasImage).toBe(true);

    const decided = await moderation.decideCase(adm1, c!.id, {
      outcome: "action",
      kind: "warning",
      rule: "respect",
      statement: "Slika krši Pravila zajednice.",
      removeContent: false,
      removeImage: true,
    });
    expect(decided.ok).toBe(true);
    expect(await imageOf(answerId)).toBeNull();
    // Gone for members, kept for the case.
    expect(await media.imageForViewer(await as("ben"), imageId)).toBeNull();
    expect(await media.imageForViewer(adm1, imageId, { caseId: c!.id })).not.toBeNull();
    expect(await media.imageForViewer(await as("ben"), imageId, { caseId: c!.id })).toBeNull();
    await media.sweepMedia(new Date(Date.now() + 2 * 60 * 60 * 1000));
    expect(await keyOf(imageId)).toBeDefined();
    // The text is still there for everyone.
    const view = await answers.questionAnswers(await as("ben"), q, "recent");
    expect(view.items.some((x) => x.kind === "answer" && x.id === answerId)).toBe(true);

    const [action] = await db()
      .select()
      .from(schema.enforcementAction)
      .where(eq(schema.enforcementAction.caseId, c!.id));
    expect(action!.removedImageId).toBe(imageId);
    const appealed = await safety.submitAppeal(ids.ana!, action!.id, "Slika je moja fotografija.");
    expect(appealed.ok).toBe(true);
    const [ap] = await db()
      .select()
      .from(schema.appeal)
      .where(eq(schema.appeal.actionId, action!.id));
    const overturned = await moderation.decideAppeal(
      await as("adm2", "admin"),
      ap!.id,
      "overturned",
      "Slika ne krši pravila.",
    );
    expect(overturned.ok).toBe(true);
    expect(await imageOf(answerId)).toBe(imageId);
    expect(await media.imageForViewer(await as("ben"), imageId)).not.toBeNull();
  });
});

describe("the data copy and the purge (D-121)", () => {
  it("the copy holds the member's images; the purge deletes them", async () => {
    const q = await question("1994-04-05");
    const a = await answers.createAnswer(await as("gone"), q, "Zbogom", await image());
    expect(a.ok).toBe(true);
    const imageId = (await imageOf(a.ok ? a.id : ""))!;
    const key = await keyOf(imageId);
    const files = (await collectMemberData(ids.gone!))!;
    expect(Buffer.isBuffer(files[`images/${imageId}.webp`])).toBe(true);
    expect(files["images.json"]).toEqual([
      expect.objectContaining({ file: `images/${imageId}.webp`, kind: "answer_image" }),
    ]);

    expect((await account.requestDeletion(ids.gone!)).ok).toBe(true);
    await account.purgeDueAccounts(new Date(Date.now() + 31 * 24 * 60 * 60 * 1000));
    expect(onDisk(key)).toBe(false);
    expect(await keyOf(imageId)).toBeUndefined();
  });
});

describe("artist cards (the 5.7 remainder, D-119 (6), (7))", () => {
  const RADIOHEAD = "a74b1b7f-71a5-4011-9441-d0b5e4122711";
  const BJORK = "87c5dedd-371d-4a53-9f7f-80522fb7f3cb";

  it("picks resolve to our artists, at most five, no duplicates; malformed lists are refused", async () => {
    const ids1 = await artistsFromPicks([`mb:${RADIOHEAD}`, `mb:${RADIOHEAD}`, `mb:${BJORK}`]);
    expect(ids1).toHaveLength(2);
    expect(await artistsFromPicks([`id:${ids1![0]}`])).toEqual([ids1![0]]);
    expect(await artistsFromPicks(["mb:not-an-id"])).toBeNull();
    expect(await artistsFromPicks(new Array(6).fill(`mb:${RADIOHEAD}`))).toBeNull();
    expect(await artistsFromPicks(undefined)).toEqual([]);
  });

  it("cards show on the answer and comment, change on edit, and CAT-01 lists only answers the viewer may see", async () => {
    const q = await question("1994-04-06");
    const [radiohead, bjork] = (await artistsFromPicks([`mb:${RADIOHEAD}`, `mb:${BJORK}`]))!;
    const a = await answers.createAnswer(await as("ana"), q, "Kid A", null, [radiohead!, bjork!]);
    const answerId = a.ok ? a.id : "";
    let view = await answers.questionAnswers(await as("ben"), q, "recent");
    let seen = view.items.find((x) => x.kind === "answer" && x.id === answerId);
    expect(seen?.kind === "answer" && seen.artists.map((c) => c.name)).toEqual([
      "Radiohead",
      "Björk",
    ]);

    await answers.editOwnAnswer(await as("ana"), answerId, "Kid A", { artists: [bjork!] });
    view = await answers.questionAnswers(await as("ben"), q, "recent");
    seen = view.items.find((x) => x.kind === "answer" && x.id === answerId);
    expect(seen?.kind === "answer" && seen.artists.map((c) => c.name)).toEqual(["Björk"]);

    const c = await answers.createComment(await as("ben"), answerId, "Da!", null, [radiohead!]);
    const thread = await answers.answerThread(await as("ana"), answerId);
    const com = thread?.comments.find((x) => x.kind === "comment" && x.id === (c.ok ? c.id : ""));
    expect(com?.kind === "comment" && com.artists.map((x) => x.name)).toEqual(["Radiohead"]);

    expect(
      (await answers.answersMentioning(await as("ben"), bjork!)).map((m) => m.answer.id),
    ).toContain(answerId);
    expect(
      await answers.answersMentioning({ id: null, role: "member", status: "active" }, bjork!),
    ).toEqual([]);
    await db().insert(schema.block).values({ blockerId: ids.ana!, blockedId: ids.cara! });
    expect(
      (await answers.answersMentioning(await as("cara"), bjork!)).map((m) => m.answer.id),
    ).not.toContain(answerId);
    await db()
      .delete(schema.block)
      .where(and(eq(schema.block.blockerId, ids.ana!), eq(schema.block.blockedId, ids.cara!)));
  });
});
