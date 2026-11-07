// Step 5.11: images through the policy. Every image is served only to viewers who may see its parent (profile
// header, live answer or comment on a published question, staff for screenshots, anyone for artist photos), the
// sweep removes what no parent references, and artist photos follow D-118 and the research's credit rules. Storage is
// a scratch folder (MEDIA_STORE=file); Wikidata and Commons are the offline stub; questions sit on dates in 1994.
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import sharp from "sharp";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { eq, inArray } from "drizzle-orm";

vi.mock("server-only", () => ({}));
const dir = mkdtempSync(path.join(tmpdir(), "gr-media-"));
process.env.MEDIA_STORE = "file";
process.env.MEDIA_DIR = dir;
process.env.CATALOG_STUB = "1";

const { closeDb, db } = await import("@/lib/db/client");
const schema = await import("@/lib/db/schema");
const { loadViewer } = await import("@/lib/data/facts");
const media = await import("@/lib/data/media");
const photos = await import("@/lib/data/artist-photos");
const feedback = await import("@/lib/data/feedback");
const { processPostImage, processProfilePhoto, processScreenshot } =
  await import("@/lib/media/process");
const { artistFromMbid } = await import("@/lib/data/catalog");
type Viewer = Awaited<ReturnType<typeof loadViewer>>;

const RUN = Date.now().toString(36);
const ids: Record<string, string> = {};
const questionIds: string[] = [];
const artistIds: string[] = [];
const ANON: Viewer = { id: null, role: "member", status: "active" };
const RADIOHEAD = "a74b1b7f-71a5-4011-9441-d0b5e4122711"; // stub: CC BY-SA 3.0 photo
const BJORK = "87c5dedd-371d-4a53-9f7f-80522fb7f3cb"; // stub: CC BY-NC (refused)
const METALLICA = "65f4f0c5-ef9e-490c-aee3-909e7ae6b2ab"; // stub: GFDL (refused)
const NIRVANA = "5b11f4ce-a62d-471e-81fc-a69a8278c7da"; // stub: no Wikidata item

async function member(key: string, visibility: "public" | "private" = "public") {
  const [u] = await db()
    .insert(schema.user)
    .values({ name: `Media ${key}`, email: `${key}-${RUN}@media.test`, emailVerified: true })
    .returning({ id: schema.user.id });
  ids[key] = u!.id;
  await db()
    .insert(schema.profile)
    .values({
      userId: u!.id,
      username: `m${key}_${RUN}`.slice(0, 30),
      displayName: `Media ${key}`,
      visibility,
      onboardedAt: new Date(),
    });
  await db().insert(schema.privacySettings).values({ userId: u!.id });
}
const as = (key: string) => loadViewer({ id: ids[key]!, role: "member" });

const jpeg = () =>
  sharp({ create: { width: 300, height: 200, channels: 3, background: "#c83c3c" } })
    .jpeg()
    .toBuffer();
async function processed(kind: "post" | "shot" | "profile") {
  const bytes = await jpeg();
  const r =
    kind === "post"
      ? await processPostImage(bytes)
      : kind === "shot"
        ? await processScreenshot(bytes)
        : await processProfilePhoto(bytes, null);
  if (!r.ok) throw new Error("fixture image failed");
  return r.image;
}

async function publishedQuestion(date: string) {
  const [q] = await db()
    .insert(schema.dailyDropQuestion)
    .values({ status: "published", publishDate: date, publishedAt: new Date() })
    .returning({ id: schema.dailyDropQuestion.id });
  questionIds.push(q!.id);
  return q!.id;
}

const keyOf = async (id: string) =>
  (await db().select().from(schema.media).where(eq(schema.media.id, id)))[0]?.storageKey;
const onDisk = (key: string) => existsSync(path.join(dir, ...key.split("/")));

beforeAll(async () => {
  for (const k of ["ana", "ben", "foe", "admin"]) await member(k);
  await member("priv", "private");
  await db().insert(schema.block).values({ blockerId: ids.ana!, blockedId: ids.foe! });
});

afterAll(async () => {
  if (questionIds.length) {
    const answers = await db()
      .select({ id: schema.dailyDropAnswer.id })
      .from(schema.dailyDropAnswer)
      .where(inArray(schema.dailyDropAnswer.questionId, questionIds));
    if (answers.length)
      await db()
        .delete(schema.comment)
        .where(
          inArray(
            schema.comment.answerId,
            answers.map((a) => a.id),
          ),
        );
    await db()
      .delete(schema.dailyDropAnswer)
      .where(inArray(schema.dailyDropAnswer.questionId, questionIds));
    await db()
      .delete(schema.dailyDropQuestion)
      .where(inArray(schema.dailyDropQuestion.id, questionIds));
  }
  if (artistIds.length) {
    await db().delete(schema.artistPhoto).where(inArray(schema.artistPhoto.artistId, artistIds));
  }
  const users = Object.values(ids);
  await db().delete(schema.feedbackReport).where(inArray(schema.feedbackReport.userId, users));
  await db().delete(schema.user).where(inArray(schema.user.id, users));
  // Every media row this run made (owners set null by the cascade above, artist photos unowned): sweep by key dir.
  await media.sweepMedia(new Date(Date.now() + 2 * 60 * 60 * 1000));
  await closeDb();
  rmSync(dir, { recursive: true, force: true });
});

describe("profile photos (D-078)", () => {
  it("are seen by everyone who sees the profile header, never across a block", async () => {
    const r = await media.setProfilePhoto(await as("ana"), await processed("profile"));
    expect(r.ok).toBe(true);
    const id = r.ok ? r.photoId! : "";
    expect(await media.imageForViewer(await as("ben"), id)).not.toBeNull();
    expect(await media.imageForViewer(await as("ana"), id)).not.toBeNull();
    expect(await media.imageForViewer(ANON, id)).not.toBeNull(); // a public profile's header is public
    expect(await media.imageForViewer(await as("foe"), id)).toBeNull(); // blocked by ana
  });

  it("replacing deletes the old object at once; removing leaves nothing", async () => {
    const first = await media.setProfilePhoto(await as("ben"), await processed("profile"));
    const oldKey = await keyOf(first.ok ? first.photoId! : "");
    expect(oldKey && onDisk(oldKey)).toBe(true);
    const second = await media.setProfilePhoto(await as("ben"), await processed("profile"));
    expect(second.ok && second.photoId).toBeTruthy();
    expect(onDisk(oldKey!)).toBe(false);
    const gone = await media.setProfilePhoto(await as("ben"), null);
    expect(gone).toEqual({ ok: true, photoId: null });
    expect(await media.ownPhotoId(ids.ben!)).toBeNull();
  });

  it("a deactivated or unfinished member cannot set one", async () => {
    const v = { ...(await as("ben")), status: "deactivated" as const };
    expect((await media.setProfilePhoto(v, await processed("profile"))).ok).toBe(false);
  });
});

describe("answer and comment images (D-121)", () => {
  it("only signed-in members who may see the answer get the image", async () => {
    const q = await publishedQuestion("1994-03-01");
    const img = await media.storeMedia({
      kind: "answer_image",
      ownerId: ids.ana!,
      image: await processed("post"),
    });
    const [a] = await db()
      .insert(schema.dailyDropAnswer)
      .values({ questionId: q, authorId: ids.ana!, body: "slika", imageId: img })
      .returning({ id: schema.dailyDropAnswer.id });
    expect(await media.imageForViewer(await as("ben"), img)).not.toBeNull();
    expect(await media.imageForViewer(await as("priv"), img)).not.toBeNull();
    expect(await media.imageForViewer(ANON, img)).toBeNull(); // D-022: visitors never
    expect(await media.imageForViewer(await as("foe"), img)).toBeNull(); // blocked pair

    const cimg = await media.storeMedia({
      kind: "comment_image",
      ownerId: ids.ben!,
      image: await processed("post"),
    });
    await db()
      .insert(schema.comment)
      .values({ answerId: a!.id, authorId: ids.ben!, body: "komentar", imageId: cimg });
    expect(await media.imageForViewer(await as("ana"), cimg)).not.toBeNull();
    expect(await media.imageForViewer(ANON, cimg)).toBeNull();
    expect(await media.imageForViewer(await as("foe"), cimg)).toBeNull(); // the answer is hidden from foe

    // Removed by moderation or deleted: nobody gets it any more, the author included.
    await db()
      .update(schema.dailyDropAnswer)
      .set({ removedAt: new Date() })
      .where(eq(schema.dailyDropAnswer.id, a!.id));
    expect(await media.imageForViewer(await as("ben"), img)).toBeNull();
    expect(await media.imageForViewer(await as("ana"), img)).toBeNull();
    expect(await media.imageForViewer(await as("ana"), cimg)).toBeNull();
  });

  it("an image of a future or unpublished question is never served", async () => {
    const [q] = await db()
      .insert(schema.dailyDropQuestion)
      .values({ status: "scheduled", publishDate: "2099-01-01" })
      .returning({ id: schema.dailyDropQuestion.id });
    questionIds.push(q!.id);
    const img = await media.storeMedia({
      kind: "answer_image",
      ownerId: ids.ana!,
      image: await processed("post"),
    });
    await db()
      .insert(schema.dailyDropAnswer)
      .values({ questionId: q!.id, authorId: ids.ana!, body: "x", imageId: img });
    expect(await media.imageForViewer(await as("ana"), img)).toBeNull();
  });
});

describe("unreferenced images and the sweep", () => {
  it("an upload no parent references is served to nobody and swept after an hour", async () => {
    const img = await media.storeMedia({
      kind: "answer_image",
      ownerId: ids.ana!,
      image: await processed("post"),
    });
    const key = (await keyOf(img))!;
    expect(await media.imageForViewer(await as("ana"), img)).toBeNull();
    expect(await media.sweepMedia()).toBeGreaterThanOrEqual(0);
    expect(onDisk(key)).toBe(true); // younger than an hour
    await media.sweepMedia(new Date(Date.now() + 2 * 60 * 60 * 1000));
    expect(onDisk(key)).toBe(false);
    expect(await keyOf(img)).toBeUndefined();
  });

  it("a moderation copy holds an image past the sweep and drop until the copy is purged", async () => {
    const img = await media.storeMedia({
      kind: "comment_image",
      ownerId: ids.ana!,
      image: await processed("post"),
    });
    const [snap] = await db()
      .insert(schema.contentSnapshot)
      .values({
        objectType: "comment",
        objectId: "00000000-0000-4000-8000-0000000000bb",
        content: { body: "x", imageId: img },
        purgeAfter: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      })
      .returning({ id: schema.contentSnapshot.id });
    await media.sweepMedia(new Date(Date.now() + 2 * 60 * 60 * 1000));
    expect(await keyOf(img)).toBeDefined();
    await media.dropMedia([img]); // dropMedia also leaves it to the copy
    expect(await keyOf(img)).toBeDefined();
    await db().delete(schema.contentSnapshot).where(eq(schema.contentSnapshot.id, snap!.id));
    await media.sweepMedia(new Date(Date.now() + 2 * 60 * 60 * 1000));
    expect(await keyOf(img)).toBeUndefined();
  });

  it("ids of the wrong shape and unknown ids answer null", async () => {
    expect(await media.imageForViewer(await as("ana"), "not-a-uuid")).toBeNull();
    expect(
      await media.imageForViewer(await as("ana"), "00000000-0000-4000-8000-000000000000"),
    ).toBeNull();
  });
});

describe("feedback screenshots (D-078, D-118 (6))", () => {
  it("only the sender and admins with a second factor see it; handled → deleted", async () => {
    const r = await feedback.createFeedback(ids.ben!, {
      kind: "bug",
      text: "Gumb ne radi",
      context: {},
      replyByEmail: false,
      locale: "hr",
      screenshot: await processed("shot"),
    });
    expect(r.ok).toBe(true);
    const [row] = await db()
      .select()
      .from(schema.feedbackReport)
      .where(eq(schema.feedbackReport.userId, ids.ben!));
    const shot = row!.screenshotId!;
    const admin: Viewer = { id: ids.admin!, role: "admin", status: "active", onboarded: true };
    expect(await media.imageForViewer(admin, shot)).not.toBeNull();
    expect(await media.imageForViewer(await as("ben"), shot)).not.toBeNull();
    expect(await media.imageForViewer(await as("ana"), shot)).toBeNull();
    expect(await media.imageForViewer(ANON, shot)).toBeNull();
    // A staff role without a second factor reads as a member (loadViewer, review M3).
    expect(await media.imageForViewer(await as("admin"), shot)).toBeNull();
    const key = (await keyOf(shot))!;
    await feedback.updateFeedback(ids.admin!, row!.id, { notes: "", done: true });
    expect(onDisk(key)).toBe(false);
    const [after] = await db()
      .select()
      .from(schema.feedbackReport)
      .where(eq(schema.feedbackReport.id, row!.id));
    expect(after!.screenshotId).toBeNull();
  });

  it("an open message's screenshot goes after 90 days", async () => {
    await feedback.createFeedback(ids.ana!, {
      kind: "idea",
      text: "Prijedlog",
      context: {},
      replyByEmail: false,
      locale: "hr",
      screenshot: await processed("shot"),
    });
    expect(await feedback.expireScreenshots(new Date())).toBe(0);
    const n = await feedback.expireScreenshots(new Date(Date.now() + 91 * 24 * 60 * 60 * 1000));
    expect(n).toBeGreaterThanOrEqual(1);
    const rows = await db()
      .select()
      .from(schema.feedbackReport)
      .where(eq(schema.feedbackReport.userId, ids.ana!));
    expect(rows.every((r) => r.screenshotId === null)).toBe(true);
  });
});

describe("artist photos (D-118, research E.2)", () => {
  async function artistId(mbid: string) {
    const r = await artistFromMbid(mbid);
    if (!r.ok) throw new Error("stub artist missing");
    artistIds.push(r.id);
    await db().delete(schema.artistPhoto).where(eq(schema.artistPhoto.artistId, r.id));
    return r.id;
  }

  it("keeps a CC BY-SA photo with its credit and licence snapshot, public to everyone", async () => {
    const id = await artistId(RADIOHEAD);
    expect(await photos.refreshArtistPhoto(id)).toBe("stored");
    const p = await photos.photoOfArtist(id);
    expect(p).toMatchObject({
      by: "Stub Fotograf",
      licence: "CC BY-SA 3.0",
      licenceUrl: "https://creativecommons.org/licenses/by-sa/3.0",
      title: "Stub Radiohead live",
    });
    expect(p!.filePageUrl).toMatch(/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/);
    expect(await media.imageForViewer(ANON, p!.mediaId)).toMatchObject({ cache: "public" });
    const [row] = await db()
      .select()
      .from(schema.artistPhoto)
      .where(eq(schema.artistPhoto.artistId, id));
    expect(row!.snapshot).toMatchObject({ licenceShortName: "CC BY-SA 3.0", modified: true });
    // CC 3.0 stays off small tiles (RECOMMENDED option B): the artist page only.
    expect((await photos.tilePhotos([id])).has(id)).toBe(false);
    // Same file on the next check: kept, no new object.
    expect(await photos.refreshArtistPhoto(id)).toBe("kept");
  });

  it("refuses non-commercial, GFDL-only and missing photos (the tile stays)", async () => {
    for (const mbid of [BJORK, METALLICA, NIRVANA]) {
      const id = await artistId(mbid);
      expect(await photos.refreshArtistPhoto(id)).toBe("none");
      expect(await photos.photoOfArtist(id)).toBeNull();
    }
  });

  it("hiding deletes our copy at once, survives the refresh, and showing fetches it anew", async () => {
    const id = await artistId(RADIOHEAD);
    await photos.refreshArtistPhoto(id);
    const before = (await photos.photoOfArtist(id))!;
    const key = (await keyOf(before.mediaId))!;
    expect(await photos.setArtistPhotoHidden(ids.admin!, id, true, "")).toEqual({
      ok: false,
      reason: "invalid",
    });
    expect(await photos.setArtistPhotoHidden(ids.admin!, id, true, "Pogrešna osoba")).toEqual({
      ok: true,
    });
    expect(onDisk(key)).toBe(false);
    expect(await photos.photoOfArtist(id)).toBeNull();
    expect(await media.imageForViewer(ANON, before.mediaId)).toBeNull();
    expect(await photos.refreshArtistPhoto(id)).toBe("hidden");
    expect(await photos.photoOfArtist(id)).toBeNull();
    expect(await photos.setArtistPhotoHidden(ids.admin!, id, false)).toEqual({ ok: true });
    expect(await photos.refreshArtistPhoto(id)).toBe("stored");
    expect(await photos.photoOfArtist(id)).not.toBeNull();
  });

  it("a notice saying 'not this person' hides the photo at once", async () => {
    const id = await artistId(RADIOHEAD);
    await photos.refreshArtistPhoto(id);
    expect(await photos.hidePhotoOnNotice(id, "00000000-0000-4000-8000-0000000000aa")).toBe(true);
    expect(await photos.photoOfArtist(id)).toBeNull();
    expect((await photos.artistPhotoAdmin(id))?.hidden).toBe(true);
  });
});
