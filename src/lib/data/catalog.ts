// Catalogue references resolve through canonical redirects (invariant 5, C-03): Music DNA, answers and
// catalogue cards keep working after MusicBrainz merges. Step 5.3b persists every referenced artist from the
// MusicBrainz client (src/lib/catalog) with its external id, and records merges as redirects.
import { eq, inArray } from "drizzle-orm";
import { catalogClient } from "@/lib/catalog/client";
import type { MbArtist } from "@/lib/catalog/musicbrainz";
import { db } from "@/lib/db/client";
import { artist, canonicalRedirect, externalId } from "@/lib/db/schema";

const MAX_HOPS = 8;

/** Follows redirects from `id` to the canonical id. A loop or a chain longer than MAX_HOPS returns null. */
export async function resolveCanonicalId(id: string): Promise<string | null> {
  const seen = new Set<string>([id]);
  let current = id;
  for (let hop = 0; hop < MAX_HOPS; hop++) {
    const [r] = await db()
      .select({ toId: canonicalRedirect.toId })
      .from(canonicalRedirect)
      .where(eq(canonicalRedirect.fromId, current));
    if (!r) return current;
    if (seen.has(r.toId)) return null;
    seen.add(r.toId);
    current = r.toId;
  }
  return null;
}

/**
 * Records a merge (from → to). Refuses a redirect that would close a loop or point at a missing target, so
 * chains stay resolvable (review L6). The caller is the catalogue sync in step 5.3 or an admin.
 */
export async function addRedirect(
  fromId: string,
  toId: string,
  entityType: "artist" | "genre",
  reason?: string,
): Promise<boolean> {
  if (fromId === toId) return false;
  const target = await resolveCanonicalId(toId);
  if (!target || target === fromId) return false;
  await db().insert(canonicalRedirect).values({ fromId, toId, entityType, reason });
  return true;
}

/** Artists by (possibly merged) ids, each resolved to its canonical row. Order of the input is kept. */
export async function artistsByIds(ids: readonly string[]) {
  const canonical = await Promise.all(ids.map(resolveCanonicalId));
  const wanted = [...new Set(canonical.filter((x): x is string => !!x))];
  if (!wanted.length) return [];
  const rows = await db().select().from(artist).where(inArray(artist.id, wanted));
  const byId = new Map(rows.map((r) => [r.id, r]));
  return canonical.map((c) => (c ? (byId.get(c) ?? null) : null));
}

// ---------------------------------------------------------------- MusicBrainz artists (step 5.3b)

const PROVIDER = "musicbrainz";
/** A stored artist is refreshed from MusicBrainz when it is older than this and someone references it again. */
const RESYNC_MS = 30 * 24 * 60 * 60 * 1000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Stores (or refreshes) one MusicBrainz artist with its external id and returns our artist id. Safe to run twice
 * at once: the unique MusicBrainz id decides, the second writer updates the same row.
 */
export async function upsertMbArtist(a: MbArtist): Promise<string> {
  return db().transaction(async (tx) => {
    const now = new Date();
    const [row] = await tx
      .insert(artist)
      .values({
        mbid: a.mbid,
        name: a.name,
        sortName: a.sortName,
        disambiguation: a.disambiguation,
        country: a.country,
        beginYear: a.beginYear,
        endYear: a.endYear,
        availability: "available",
        lastSyncedAt: now,
      })
      .onConflictDoUpdate({
        target: artist.mbid,
        set: {
          name: a.name,
          sortName: a.sortName,
          disambiguation: a.disambiguation,
          country: a.country,
          beginYear: a.beginYear,
          endYear: a.endYear,
          availability: "available",
          lastSyncedAt: now,
        },
      })
      .returning({ id: artist.id });
    await tx
      .insert(externalId)
      .values({
        entityType: "artist",
        entityId: row!.id,
        provider: PROVIDER,
        externalId: a.mbid,
        lastSyncedAt: now,
      })
      .onConflictDoUpdate({
        target: [externalId.provider, externalId.entityType, externalId.externalId],
        set: { lastSyncedAt: now },
      });
    return row!.id;
  });
}

async function storedByMbid(mbid: string) {
  const [row] = await db()
    .select({ id: artist.id, lastSyncedAt: artist.lastSyncedAt, availability: artist.availability })
    .from(artist)
    .where(eq(artist.mbid, mbid));
  return row;
}

export type ArtistRef = { ok: true; id: string } | { ok: false; reason: "not-found" };

/**
 * Our artist id for a MusicBrainz id the member picked, storing the artist on first use. A fresh stored row needs
 * no request; an artist from a recent search answer needs none either; otherwise one lookup. A merged id records
 * the redirect from the old row (invariant 5, J2 E4); a deleted one marks the stored row unavailable (J2 E5) and
 * is refused. Throws CatalogUnavailable when MusicBrainz cannot answer.
 */
export async function artistFromMbid(mbid: string): Promise<ArtistRef> {
  if (!UUID.test(mbid)) return { ok: false, reason: "not-found" };
  const id = mbid.toLowerCase();
  const stored = await storedByMbid(id);
  if (
    stored &&
    stored.availability === "available" &&
    stored.lastSyncedAt &&
    Date.now() - stored.lastSyncedAt.getTime() < RESYNC_MS
  ) {
    const canonical = await resolveCanonicalId(stored.id);
    return canonical ? { ok: true, id: canonical } : { ok: false, reason: "not-found" };
  }
  const client = catalogClient();
  const recent = client.recent(id);
  if (recent) return { ok: true, id: await upsertMbArtist(recent) };
  const found = await client.lookupArtist(id);
  if (found.kind === "gone") {
    if (stored)
      await db()
        .update(artist)
        .set({ availability: "unavailable", lastSyncedAt: new Date() })
        .where(eq(artist.id, stored.id));
    return { ok: false, reason: "not-found" };
  }
  const target = await upsertMbArtist(found.artist);
  if (found.kind === "redirected" && stored && stored.id !== target) {
    const [existing] = await db()
      .select({ fromId: canonicalRedirect.fromId })
      .from(canonicalRedirect)
      .where(eq(canonicalRedirect.fromId, stored.id));
    if (!existing) await addRedirect(stored.id, target, "artist", "musicbrainz merge");
  }
  return { ok: true, id: target };
}

/** CAT-01: one artist by our id (following redirects), with its MusicBrainz id; null when unknown. */
export async function artistPage(id: string) {
  if (!UUID.test(id)) return null;
  const canonical = await resolveCanonicalId(id);
  if (!canonical) return null;
  const [row] = await db()
    .select({
      id: artist.id,
      mbid: artist.mbid,
      name: artist.name,
      disambiguation: artist.disambiguation,
      country: artist.country,
      beginYear: artist.beginYear,
      endYear: artist.endYear,
      availability: artist.availability,
    })
    .from(artist)
    .where(eq(artist.id, canonical));
  return row ? { ...row, redirectedFrom: canonical !== id ? id : null } : null;
}
