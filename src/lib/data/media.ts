// Images (step 5.11; D-078, D-118, D-120, D-121). One media row per stored object; the parent that references it
// decides who may see it, and this module asks the policy about that parent on every read (matrix §2 "media":
// follows the parent). A media id alone is worth nothing: an unreferenced row answers "not found" to everyone,
// and every refusal has the same shape, so a URL never tells whether an image exists (U-02).
import { randomUUID } from "node:crypto";
import { and, eq, inArray, isNull, lt, or, sql } from "drizzle-orm";
import {
  canViewContent,
  canViewProfileSection,
  canViewStaffObject,
  type StaffContext,
  type Viewer,
} from "@/lib/authz";
import { db, type Db } from "@/lib/db/client";
import {
  artistPhoto,
  comment,
  contentSnapshot,
  dailyDropAnswer as answer,
  dailyDropQuestion as question,
  feedbackReport,
  media,
  moderationCase,
  profile,
} from "@/lib/db/schema";
import { utcDate } from "@/lib/editorial/rules";
import type { Processed } from "@/lib/media/process";
import type { MediaKind } from "@/lib/media/rules";
import { deleteObject, getObject, putObject } from "@/lib/storage/objects";
import { loadGraph, loadGraphs, loadOwner, loadOwners } from "./facts";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isMediaId = (v: unknown): v is string => typeof v === "string" && UUID.test(v);

/** Unreferenced uploads older than this are swept (a crash between the upload and the parent write). */
const ORPHAN_GRACE_MS = 60 * 60 * 1000;

// ------------------------------------------------------------------ writes

/**
 * Stores the bytes first and the row second; if the row fails the object is removed again, so storage never holds
 * an object without a row for long (the sweep would not find it). Returns the media id.
 */
export async function storeMedia(input: {
  kind: MediaKind;
  ownerId: string | null;
  image: Processed;
  alt?: string | null;
}): Promise<string> {
  const id = randomUUID();
  const key = `${input.kind}/${id}.webp`;
  await putObject(key, input.image.bytes, input.image.contentType);
  try {
    await db()
      .insert(media)
      .values({
        id,
        kind: input.kind,
        ownerId: input.ownerId,
        storageKey: key,
        contentType: input.image.contentType,
        width: input.image.width,
        height: input.image.height,
        byteSize: input.image.bytes.length,
        alt: input.alt ?? null,
      });
  } catch (e) {
    await deleteObject(key).catch(() => undefined);
    throw e;
  }
  return id;
}

/** Removes the object and the row at once (a replaced profile photo, a removed post image). */
export async function dropMedia(ids: readonly (string | null | undefined)[]): Promise<void> {
  const list = ids.filter(isMediaId);
  if (!list.length) return;
  const rows = await db()
    .select({ id: media.id, key: media.storageKey, heldUntil: media.heldUntil })
    .from(media)
    .where(inArray(media.id, list));
  for (const r of rows) {
    if (r.heldUntil && r.heldUntil > new Date()) continue; // a moderation copy still needs it; the sweep comes later
    await deleteObject(r.key);
    await db().delete(media).where(eq(media.id, r.id));
  }
}

/** The moderation copy (D-107) keeps a reported image as long as the copy itself (content_snapshot.purge_after). */
export async function holdMedia(tx: Db, id: string | null | undefined, until: Date): Promise<void> {
  if (!isMediaId(id)) return;
  await tx
    .update(media)
    .set({ heldUntil: until })
    .where(and(eq(media.id, id), or(isNull(media.heldUntil), lt(media.heldUntil, until))));
}

/**
 * `media.sweep`: every row no parent references (and no moderation copy holds) goes, object first. Covers replaced
 * photos, deleted posts, handled screenshots and uploads whose parent write never happened. Safe to run twice.
 */
export async function sweepMedia(now: Date = new Date()): Promise<number> {
  const cutoff = new Date(now.getTime() - ORPHAN_GRACE_MS);
  const rows = await db().execute<{ id: string; storage_key: string }>(sql`
    select m.id, m.storage_key from ${media} m
    where m.created_at < ${cutoff.toISOString()}::timestamptz
      and (m.held_until is null or m.held_until < ${now.toISOString()}::timestamptz)
      and not exists (select 1 from ${profile} p where p.photo_id = m.id)
      and not exists (select 1 from ${artistPhoto} ap where ap.media_id = m.id)
      and not exists (select 1 from ${answer} a where a.image_id = m.id)
      and not exists (select 1 from ${comment} c where c.image_id = m.id)
      and not exists (select 1 from ${feedbackReport} f where f.screenshot_id = m.id)
    limit 500`);
  let n = 0;
  for (const r of rows.rows) {
    await deleteObject(r.storage_key);
    await db().delete(media).where(eq(media.id, r.id));
    n++;
  }
  return n;
}

// ------------------------------------------------------------------ reads

export type ServedImage = {
  bytes: Buffer;
  contentType: string;
  /** "public" only for artist photos (anyone may see them); everything else is private to the viewer's browser. */
  cache: "public" | "private";
};

type Access = { allowed: boolean; cache: "public" | "private" };
const NO: Access = { allowed: false, cache: "private" };

async function profilePhotoAccess(viewer: Viewer, id: string): Promise<Access> {
  const [p] = await db()
    .select({ userId: profile.userId })
    .from(profile)
    .where(eq(profile.photoId, id));
  if (!p) return NO;
  const owner = await loadOwner(p.userId);
  if (!owner) return NO;
  const graph = await loadGraph(viewer.id, owner.id);
  // D-078: seen by everyone who sees the profile (its header), blocked pairs and hidden accounts excluded.
  return {
    allowed: canViewProfileSection("identity", viewer, owner, graph).allowed,
    cache: "private",
  };
}

async function artistPhotoAccess(id: string): Promise<Access> {
  const [a] = await db()
    .select({ hiddenAt: artistPhoto.hiddenAt, status: artistPhoto.status })
    .from(artistPhoto)
    .where(eq(artistPhoto.mediaId, id));
  return a && a.status === "ok" && !a.hiddenAt ? { allowed: true, cache: "public" } : NO;
}

/** A live answer on a published question that the viewer may see (D-021, D-022: never visitors). */
async function answerVisible(viewer: Viewer, answerId: string): Promise<boolean> {
  const [row] = await db()
    .select({ authorId: answer.authorId, status: question.status, date: question.publishDate })
    .from(answer)
    .innerJoin(question, eq(question.id, answer.questionId))
    .where(and(eq(answer.id, answerId), isNull(answer.deletedAt), isNull(answer.removedAt)));
  if (!row?.authorId || row.status !== "published" || !row.date || row.date > utcDate())
    return false;
  const author = await loadOwner(row.authorId);
  if (!author) return false;
  const graph = await loadGraph(viewer.id, author.id);
  if (!canViewContent("dropAnswer", viewer, { author }, graph).allowed) return false;
  return canViewContent("media", viewer, { author, parentVisible: true }, graph).allowed;
}

async function answerImageAccess(viewer: Viewer, id: string): Promise<Access> {
  const [a] = await db().select({ id: answer.id }).from(answer).where(eq(answer.imageId, id));
  if (!a) return NO;
  return { allowed: await answerVisible(viewer, a.id), cache: "private" };
}

async function commentImageAccess(viewer: Viewer, id: string): Promise<Access> {
  const [c] = await db()
    .select({ answerId: comment.answerId, authorId: comment.authorId })
    .from(comment)
    .where(and(eq(comment.imageId, id), isNull(comment.deletedAt), isNull(comment.removedAt)));
  if (!c?.authorId) return NO;
  if (!(await answerVisible(viewer, c.answerId))) return NO;
  const [owners, graphs] = await Promise.all([
    loadOwners([c.authorId]),
    loadGraphs(viewer.id, [c.authorId]),
  ]);
  const author = owners.get(c.authorId);
  if (!author) return NO;
  const graph = graphs.get(c.authorId);
  const sees = canViewContent("comment", viewer, { author, threadVisible: true }, graph).allowed;
  return {
    allowed:
      sees && canViewContent("media", viewer, { author, parentVisible: true }, graph).allowed,
    cache: "private",
  };
}

async function screenshotAccess(viewer: Viewer, id: string): Promise<Access> {
  const [f] = await db()
    .select({ userId: feedbackReport.userId })
    .from(feedbackReport)
    .where(eq(feedbackReport.screenshotId, id));
  if (!f) return NO;
  const own = !!viewer.id && viewer.id === f.userId;
  return {
    allowed: canViewStaffObject("feedbackScreenshot", viewer, { own }).allowed,
    cache: "private",
  };
}

/**
 * Staff reading a reported image through its case (ADM-10): the case's moderation copy must name this image, and
 * the viewer must be allowed into the case. Opening the case already logged the evidence access (D-107).
 */
async function caseImageAccess(viewer: Viewer, id: string, ctx: StaffContext): Promise<Access> {
  if (!ctx.caseId || !UUID.test(ctx.caseId) || !viewer.id) return NO;
  const [c] = await db()
    .select({ assigneeId: moderationCase.assigneeId })
    .from(moderationCase)
    .where(eq(moderationCase.id, ctx.caseId));
  if (!c) return NO;
  const allowed = canViewStaffObject("reportsCases", viewer, {
    assigned: c.assigneeId === viewer.id,
  });
  if (!allowed.allowed || allowed.mode === "minimal") return NO;
  const [snap] = await db()
    .select({ id: contentSnapshot.id })
    .from(contentSnapshot)
    .where(
      and(
        eq(contentSnapshot.caseId, ctx.caseId),
        sql`${contentSnapshot.content}->>'imageId' = ${id}`,
      ),
    );
  return snap ? { allowed: true, cache: "private" } : NO;
}

/**
 * The bytes of an image the viewer may see, or null for every other case (unknown id, unreferenced, hidden,
 * removed, blocked, a visitor where only members may look). `ctx.caseId` lets staff read a reported image that is
 * no longer live through its case.
 */
export async function imageForViewer(
  viewer: Viewer,
  id: string,
  ctx: StaffContext = {},
): Promise<ServedImage | null> {
  if (!isMediaId(id)) return null;
  const [m] = await db()
    .select({ kind: media.kind, key: media.storageKey, contentType: media.contentType })
    .from(media)
    .where(eq(media.id, id));
  if (!m) return null;
  let access: Access = NO;
  switch (m.kind as MediaKind) {
    case "profile_photo":
      access = await profilePhotoAccess(viewer, id);
      break;
    case "artist_photo":
      access = await artistPhotoAccess(id);
      break;
    case "answer_image":
      access = await answerImageAccess(viewer, id);
      break;
    case "comment_image":
      access = await commentImageAccess(viewer, id);
      break;
    case "feedback_screenshot":
      access = await screenshotAccess(viewer, id);
      break;
  }
  if (!access.allowed && ctx.caseId && (m.kind === "answer_image" || m.kind === "comment_image"))
    access = await caseImageAccess(viewer, id, ctx);
  if (!access.allowed) return null;
  const obj = await getObject(m.key);
  if (!obj) return null;
  return { bytes: obj.bytes, contentType: m.contentType, cache: access.cache };
}

/** Width, height and description of images, for layout (no layout shift) and the text alternative. */
export type ImageMeta = { id: string; width: number; height: number; alt: string | null };

export async function imageMeta(
  ids: readonly (string | null | undefined)[],
): Promise<Map<string, ImageMeta>> {
  const list = [...new Set(ids.filter(isMediaId))];
  const out = new Map<string, ImageMeta>();
  if (!list.length) return out;
  const rows = await db()
    .select({ id: media.id, width: media.width, height: media.height, alt: media.alt })
    .from(media)
    .where(inArray(media.id, list));
  for (const r of rows) out.set(r.id, r);
  return out;
}

// ------------------------------------------------------------------ the profile photo (PROF-08, D-078)

/**
 * Sets (or with null removes) the member's profile photo; the old one is deleted at once. Only an active member
 * who finished onboarding changes it (the caller passes a fresh Viewer).
 */
export async function setProfilePhoto(
  viewer: Viewer,
  image: Processed | null,
): Promise<{ ok: true; photoId: string | null } | { ok: false }> {
  if (!viewer.id || viewer.status !== "active" || viewer.onboarded === false) return { ok: false };
  const [before] = await db()
    .select({ photoId: profile.photoId })
    .from(profile)
    .where(eq(profile.userId, viewer.id));
  if (!before) return { ok: false };
  const photoId = image
    ? await storeMedia({ kind: "profile_photo", ownerId: viewer.id, image })
    : null;
  await db()
    .update(profile)
    .set({ photoId, updatedAt: new Date() })
    .where(eq(profile.userId, viewer.id));
  await dropMedia([before.photoId]);
  return { ok: true, photoId };
}

/** The member's own photo id (settings, the edit page). */
export async function ownPhotoId(userId: string): Promise<string | null> {
  const [r] = await db()
    .select({ photoId: profile.photoId })
    .from(profile)
    .where(eq(profile.userId, userId));
  return r?.photoId ?? null;
}
