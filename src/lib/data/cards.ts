// Catalogue cards in answers and comments (the 5.7 remainder; D-068 (6), D-119 (6), (7)). Artists only in the alpha,
// up to five per answer or comment, in the order the member chose. A card is a catalogue fact, not member content:
// it resolves through merges (invariant 5) at read time, shows the artist photo where a small tile may (D-118 (4),
// tilePhotos) and links to CAT-01. Whether the answer itself may be seen is decided by its own reader; this module
// never shows a card on its own.
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { db, type Db } from "@/lib/db/client";
import { artist, canonicalRedirect, catalogReference, dailyDropAnswer } from "@/lib/db/schema";
import { tilePhotos } from "./artist-photos";
import { knownArtistFromMbid, resolveCanonicalId } from "./catalog";

export const CARDS_MAX = 5;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type ArtistCard = { id: string; name: string; photoId: string | null };
export type CardOwner = "answer" | "comment";

/**
 * The composer's picks → our artist ids, deduplicated, at most five. A pick is "mb:<MusicBrainz id>" (just chosen
 * in the search: a stored artist or one from this process's recent search answers, never a MusicBrainz request,
 * review 5.11 M2) or "id:<artist id>" (a card the answer already had, kept when editing). A pick that cannot be
 * resolved is dropped. Null when the list is malformed.
 */
export async function artistsFromPicks(picks: unknown): Promise<string[] | null> {
  if (picks === undefined || picks === null) return [];
  if (!Array.isArray(picks) || picks.length > CARDS_MAX) return null;
  const out: string[] = [];
  for (const pick of picks) {
    if (typeof pick !== "string") return null;
    const [kind, value] = pick.split(":");
    if ((kind !== "mb" && kind !== "id") || !value || !UUID.test(value)) return null;
    let id: string | null = null;
    if (kind === "mb") id = await knownArtistFromMbid(value);
    else id = await resolveCanonicalId(value);
    if (id && !out.includes(id)) out.push(id);
  }
  return out;
}

/** Replaces the cards of one answer or comment (inside the caller's transaction when given). */
export async function setCards(
  owner: CardOwner,
  ownerId: string,
  artistIds: readonly string[],
  tx: Pick<Db, "delete" | "insert"> = db(),
): Promise<void> {
  await tx
    .delete(catalogReference)
    .where(and(eq(catalogReference.ownerType, owner), eq(catalogReference.ownerId, ownerId)));
  const list = artistIds.slice(0, CARDS_MAX);
  if (list.length)
    await tx
      .insert(catalogReference)
      .values(
        list.map((artistId, position) => ({ ownerType: owner, ownerId, artistId, position })),
      );
}

/** The cards of many answers or comments at once, in order, through merges, with photos where tiles may show them. */
export async function cardsFor(
  owner: CardOwner,
  ownerIds: readonly string[],
): Promise<Map<string, ArtistCard[]>> {
  const out = new Map<string, ArtistCard[]>();
  if (!ownerIds.length) return out;
  const refs = await db()
    .select({
      ownerId: catalogReference.ownerId,
      artistId: catalogReference.artistId,
      position: catalogReference.position,
    })
    .from(catalogReference)
    .where(
      and(eq(catalogReference.ownerType, owner), inArray(catalogReference.ownerId, [...ownerIds])),
    )
    .orderBy(asc(catalogReference.position));
  if (!refs.length) return out;
  const canonical = new Map<string, string>();
  for (const id of new Set(refs.map((r) => r.artistId)))
    canonical.set(id, (await resolveCanonicalId(id)) ?? id);
  const ids = [...new Set(canonical.values())];
  const [rows, photos] = await Promise.all([
    db().select({ id: artist.id, name: artist.name }).from(artist).where(inArray(artist.id, ids)),
    tilePhotos(ids),
  ]);
  const byId = new Map(rows.map((r) => [r.id, r]));
  for (const r of refs) {
    const a = byId.get(canonical.get(r.artistId)!);
    if (!a) continue;
    const list = out.get(r.ownerId) ?? [];
    if (!list.some((c) => c.id === a.id))
      list.push({ id: a.id, name: a.name, photoId: photos.get(a.id) ?? null });
    out.set(r.ownerId, list);
  }
  return out;
}

/**
 * Answer ids that name an artist, an id merged into it included (recursive through canonical_redirect), newest
 * answers first; for CAT-01. The caller still reads each answer through the drop policy.
 */
export async function answersNaming(artistId: string, limit = 50): Promise<string[]> {
  if (!UUID.test(artistId)) return [];
  const canonical = (await resolveCanonicalId(artistId)) ?? artistId;
  const rows = await db().execute<{ owner_id: string }>(sql`
    with recursive ids(id) as (
      select ${canonical}::uuid
      union
      select r.from_id from ${canonicalRedirect} r join ids on r.to_id = ids.id
    )
    select cr.owner_id from ${catalogReference} cr
    join ${dailyDropAnswer} a on a.id = cr.owner_id
    where cr.owner_type = 'answer' and cr.artist_id in (select id from ids)
    group by cr.owner_id, a.created_at
    order by a.created_at desc
    limit ${limit}`);
  return rows.rows.map((r) => r.owner_id);
}
