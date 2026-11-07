// Artist photos (step 5.11, D-118): Wikidata P18 → Commons → our storage, with the credit and the admin hide.
// The photo job (`catalog.photos`) picks artists without a photo record and those due for their 30-day check; a
// member's request never waits for Wikimedia, and searches never fetch photos (MusicBrainz allows one request per
// second, D-118 (4)). Only public domain, CC0, CC BY and CC BY-SA are kept (D-118 (3)); anything else, no P18, a
// watermarked file, a required attribution without an author, or a failed download leaves the generated tile.
// The credit follows docs/legal/research/E-copyright-music-trademarks.md ("Build requirements"): author or the
// licensor's attribution, title, licence with version and port, Commons link, the modification note, and a licence
// snapshot kept as evidence. Hiding deletes our copy at once and the photo is never fetched again while hidden
// (D-118 (5), research item 10); showing it again lets the next job fetch it anew.
import { and, asc, eq, inArray, isNotNull, isNull, lte, or, sql } from "drizzle-orm";
import { audit } from "@/lib/audit";
import { CatalogUnavailable } from "@/lib/catalog/musicbrainz";
import { CommonsUnavailable } from "@/lib/catalog/commons";
import { catalogClient, commonsClient } from "@/lib/catalog/client";
import { db } from "@/lib/db/client";
import { artist, artistPhoto } from "@/lib/db/schema";
import { processArtistPhoto } from "@/lib/media/process";
import {
  acceptLicence,
  ARTIST_PHOTO_REFRESH_DAYS,
  cropForbidden,
  photoTitle,
  plainText,
  safeLicenceUrl,
  tileSafe,
} from "@/lib/media/rules";
import { dropMedia, storeMedia } from "./media";

const DAY = 24 * 60 * 60 * 1000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type ArtistPhoto = {
  mediaId: string;
  /** What the credit names: the licensor's own attribution text if given, else the author. */
  by: string | null;
  title: string | null;
  creditLine: string | null;
  licence: string;
  licenceUrl: string | null;
  filePageUrl: string;
};

/** Photos for the given artists that may be shown (kept, not hidden), with their credit. */
export async function artistPhotos(ids: readonly string[]): Promise<Map<string, ArtistPhoto>> {
  const list = [...new Set(ids.filter((i) => UUID.test(i)))];
  const out = new Map<string, ArtistPhoto>();
  if (!list.length) return out;
  const rows = await db()
    .select()
    .from(artistPhoto)
    .where(
      and(
        inArray(artistPhoto.artistId, list),
        eq(artistPhoto.status, "ok"),
        isNull(artistPhoto.hiddenAt),
        isNotNull(artistPhoto.mediaId),
      ),
    );
  for (const r of rows) {
    if (!r.mediaId || !r.licence || !r.filePageUrl) continue;
    out.set(r.artistId, {
      mediaId: r.mediaId,
      by: r.attribution ?? r.author,
      title: r.title,
      creditLine: r.creditLine,
      licence: r.licence,
      licenceUrl: r.licenceUrl,
      filePageUrl: r.filePageUrl,
    });
  }
  return out;
}

export async function photoOfArtist(id: string): Promise<ArtistPhoto | null> {
  return (await artistPhotos([id])).get(id) ?? null;
}

/**
 * Photos for small tiles (Music DNA, search, onboarding, cards): only those whose licence needs no credit next to
 * them (public domain, CC0) or allows the credit one tap away (4.0); CC 2.x/3.0 photos show on the artist page only
 * (RECOMMENDED option B, research E item 13). Artist id → media id.
 */
export async function tilePhotos(ids: readonly string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  for (const [id, p] of await artistPhotos(ids)) if (tileSafe(p.licence)) out.set(id, p.mediaId);
  return out;
}

/** For admins on CAT-01: whether there is a photo record that could be hidden or shown, and its state. */
export async function artistPhotoAdmin(
  id: string,
): Promise<{ hidden: boolean; reason: string | null; hasPhoto: boolean } | null> {
  if (!UUID.test(id)) return null;
  const [r] = await db().select().from(artistPhoto).where(eq(artistPhoto.artistId, id));
  if (!r) return null;
  return { hidden: !!r.hiddenAt, reason: r.hiddenReason, hasPhoto: r.status === "ok" };
}

/** Commons file pages only, as https (the credit links there, D-118 (2)). */
function filePage(raw: string): string | null {
  try {
    const u = new URL(raw.startsWith("//") ? `https:${raw}` : raw);
    return u.hostname === "commons.wikimedia.org"
      ? `https://commons.wikimedia.org${u.pathname}`
      : null;
  } catch {
    return null;
  }
}

type Outcome = "stored" | "kept" | "none" | "failed" | "hidden";

const nextCheck = (now: Date) => new Date(now.getTime() + ARTIST_PHOTO_REFRESH_DAYS * DAY);

async function recordNone(artistId: string, now: Date, oldMedia: string | null) {
  const values = {
    status: "none",
    mediaId: null,
    commonsFile: null,
    author: null,
    attribution: null,
    title: null,
    creditLine: null,
    licence: null,
    licenceUrl: null,
    filePageUrl: null,
    snapshot: null,
    checkedAt: now,
    refreshAfter: nextCheck(now),
    failures: 0,
  };
  await db()
    .insert(artistPhoto)
    .values({ artistId, ...values })
    .onConflictDoUpdate({ target: artistPhoto.artistId, set: values });
  await dropMedia([oldMedia]);
}

async function recordFailure(artistId: string, now: Date, failures: number, exists: boolean) {
  // 1 h, 2 h, 4 h … up to a week; an existing photo stays as it is meanwhile.
  const wait = Math.min(2 ** failures * 60 * 60 * 1000, 7 * DAY);
  const refreshAfter = new Date(now.getTime() + wait);
  if (exists)
    await db()
      .update(artistPhoto)
      .set({ failures: failures + 1, refreshAfter, checkedAt: now })
      .where(eq(artistPhoto.artistId, artistId));
  else
    await db()
      .insert(artistPhoto)
      .values({ artistId, status: "none", refreshAfter, checkedAt: now, failures: 1 })
      .onConflictDoNothing();
}

/** Checks one artist against Wikidata and Commons and stores, keeps or clears its photo. */
export async function refreshArtistPhoto(
  artistId: string,
  now: Date = new Date(),
): Promise<Outcome> {
  const [a] = await db()
    .select({ mbid: artist.mbid, availability: artist.availability })
    .from(artist)
    .where(eq(artist.id, artistId));
  const [prev] = await db().select().from(artistPhoto).where(eq(artistPhoto.artistId, artistId));
  const oldMedia = prev?.mediaId ?? null;
  if (prev?.hiddenAt) {
    // Hidden: nothing is fetched until an admin shows it again (D-118 (5)).
    await db()
      .update(artistPhoto)
      .set({ checkedAt: now, refreshAfter: nextCheck(now) })
      .where(eq(artistPhoto.artistId, artistId));
    return "hidden";
  }
  if (!a?.mbid || a.availability !== "available") {
    await recordNone(artistId, now, oldMedia);
    return "none";
  }
  try {
    const qid = await catalogClient().wikidataId(a.mbid);
    const file = qid ? await commonsClient().imageFile(qid) : null;
    const info = file ? await commonsClient().fileInfo(file) : null;
    const licence = acceptLicence(info?.licenceShort);
    const page = info ? filePage(info.filePageUrl) : null;
    const author = plainText(info?.artistHtml);
    const attribution = plainText(info?.attributionHtml);
    const usable =
      !!info &&
      licence.ok &&
      !!page &&
      !cropForbidden(info.restrictions) &&
      // A licence that requires attribution needs someone to name (research item 7).
      !(info.attributionRequired && !author && !attribution);
    if (!usable || !info || !licence.ok || !page) {
      await recordNone(artistId, now, oldMedia);
      return "none";
    }
    const credit = {
      status: "ok",
      commonsFile: info.file,
      author,
      attribution,
      title: photoTitle(info.objectName, info.file),
      creditLine: plainText(info.creditHtml),
      licence: licence.short,
      licenceUrl: safeLicenceUrl(info.licenceUrl),
      filePageUrl: page,
      snapshot: {
        file: info.file,
        filePage: page,
        licenceShortName: info.licenceShort,
        licenceUrl: info.licenceUrl,
        artist: author,
        attribution,
        attributionRequired: info.attributionRequired,
        credit: plainText(info.creditHtml),
        objectName: plainText(info.objectName),
        restrictions: info.restrictions,
        usageTerms: plainText(info.usageTerms),
        revisionTimestamp: info.timestamp,
        sha1: info.sha1,
        retrievedAt: now.toISOString(),
        modified: true,
      },
      checkedAt: now,
      refreshAfter: nextCheck(now),
      failures: 0,
    };
    if (
      prev?.status === "ok" &&
      prev.mediaId &&
      prev.commonsFile === info.file &&
      prev.snapshot?.sha1 === info.sha1
    ) {
      // Same file and revision: only the credit may have changed (an author's name, a licence fix).
      await db().update(artistPhoto).set(credit).where(eq(artistPhoto.artistId, artistId));
      return "kept";
    }
    const processed = await processArtistPhoto(await commonsClient().download(info.thumbUrl));
    if (!processed.ok) {
      await recordNone(artistId, now, oldMedia);
      return "none";
    }
    const mediaId = await storeMedia({
      kind: "artist_photo",
      ownerId: null,
      image: processed.image,
    });
    await db()
      .insert(artistPhoto)
      .values({ artistId, mediaId, ...credit })
      .onConflictDoUpdate({ target: artistPhoto.artistId, set: { mediaId, ...credit } });
    await dropMedia([oldMedia]);
    return "stored";
  } catch (e) {
    if (e instanceof CatalogUnavailable || e instanceof CommonsUnavailable) {
      await recordFailure(artistId, now, prev?.failures ?? 0, !!prev);
      return "failed";
    }
    throw e;
  }
}

/**
 * `catalog.photos`: new artists first (no record yet), then those due. At most `limit` per run, one after the
 * other, so MusicBrainz sees one request per second from the shared client queue.
 */
export async function refreshArtistPhotos(
  limit = 15,
  now: Date = new Date(),
): Promise<Record<Outcome, number>> {
  const counts: Record<Outcome, number> = { stored: 0, kept: 0, none: 0, failed: 0, hidden: 0 };
  if (!catalogClient().configured || !commonsClient().configured) return counts;
  const due = await db()
    .select({ id: artist.id })
    .from(artist)
    .leftJoin(artistPhoto, eq(artistPhoto.artistId, artist.id))
    .where(
      and(
        isNotNull(artist.mbid),
        or(isNull(artistPhoto.artistId), lte(artistPhoto.refreshAfter, now)),
      ),
    )
    .orderBy(sql`${artistPhoto.artistId} is not null`, asc(artist.createdAt))
    .limit(limit);
  for (const { id } of due) counts[await refreshArtistPhoto(id, now)]++;
  return counts;
}

// ------------------------------------------------------------------ hiding (D-118 (5), research items 9 and 10)

export type HideResult = { ok: true } | { ok: false; reason: "invalid" | "not-found" };

async function hide(artistId: string, by: string | null, why: string) {
  const [prev] = await db()
    .select({ mediaId: artistPhoto.mediaId })
    .from(artistPhoto)
    .where(and(eq(artistPhoto.artistId, artistId), eq(artistPhoto.status, "ok")));
  if (!prev) return false;
  // The copy goes at once; the credit and the snapshot stay as the record of what was shown.
  await db()
    .update(artistPhoto)
    .set({ hiddenAt: new Date(), hiddenBy: by, hiddenReason: why, mediaId: null })
    .where(eq(artistPhoto.artistId, artistId));
  await dropMedia([prev.mediaId]);
  return true;
}

/** "Sakrij fotografiju" / "Vrati fotografiju": admin only (the caller checks the role), audited, reversible. */
export async function setArtistPhotoHidden(
  actorId: string,
  artistId: string,
  hidden: boolean,
  reason?: string,
): Promise<HideResult> {
  if (!UUID.test(artistId)) return { ok: false, reason: "not-found" };
  const why = (reason ?? "").replace(/\s+/g, " ").trim();
  if (hidden) {
    if (!why || why.length > 500) return { ok: false, reason: "invalid" };
    if (!(await hide(artistId, actorId, why))) return { ok: false, reason: "not-found" };
  } else {
    // Shown again: the next photo job fetches the file anew (refresh_after now).
    const rows = await db()
      .update(artistPhoto)
      .set({ hiddenAt: null, hiddenBy: null, hiddenReason: null, refreshAfter: new Date() })
      .where(eq(artistPhoto.artistId, artistId))
      .returning({ id: artistPhoto.artistId });
    if (!rows.length) return { ok: false, reason: "not-found" };
  }
  await audit({
    actorType: "staff",
    actorId,
    action: hidden ? "catalog.artist_photo.hidden" : "catalog.artist_photo.shown",
    targetType: "artist",
    targetId: artistId,
    metadata: hidden ? { reason: why } : {},
  });
  return { ok: true };
}

/**
 * A notice about an artist photo saying "this is not this person" or "I am the photographer" hides it at once,
 * pending review (research item 9): the harm of a wrong or unlicensed photo outweighs a few hours of the tile.
 */
export async function hidePhotoOnNotice(artistId: string, noticeId: string): Promise<boolean> {
  if (!UUID.test(artistId)) return false;
  const done = await hide(artistId, null, `notice ${noticeId}`);
  if (done)
    await audit({
      actorType: "system",
      action: "catalog.artist_photo.hidden",
      targetType: "artist",
      targetId: artistId,
      metadata: { notice: noticeId },
    });
  return done;
}
