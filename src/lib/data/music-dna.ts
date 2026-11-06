// Music DNA (step 5.3a, J2, D-078): the genre catalogue, the member's own entries and the section audience.
// Invariant 3: explicit entries change only through the member's own actions, so every write takes the member's
// own id from the session (never from the request) and touches only rows with that user_id. Writes for one member
// are serialised with an advisory lock, so two devices adding at once cannot pass the limits (J2 E3).
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { canViewProfileSection, type Viewer } from "@/lib/authz";
import { db } from "@/lib/db/client";
import { artist, genre, musicDnaEntry, privacySettings, profile } from "@/lib/db/schema";
import {
  buildGenreIndex,
  searchGenres as search,
  suggestedGenres,
  type GenreIndex,
  type GenreOption,
} from "@/lib/music/genre-search";
import { ARTIST_MAX, GENRE_MAX, GENRE_MIN, type DnaAudience } from "@/lib/music/limits";
import { catalogClient } from "@/lib/catalog/client";
import { foldName } from "@/lib/catalog/musicbrainz";
import { resolveCanonicalId } from "./catalog";
import { loadGraph, loadOwner } from "./facts";

export type Locale = "hr" | "en";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ---------------------------------------------------------------- the genre catalogue (cached per process)

type GenreRow = {
  id: string;
  slug: string;
  nameHr: string;
  nameEn: string;
  parentId: string | null;
  family: number | null;
  rank: number;
  active: boolean;
};
type Catalogue = { rows: Map<string, GenreRow>; index: Record<Locale, GenreIndex>; at: number };

const TTL_MS = 10 * 60 * 1000;
const globalCache = globalThis as unknown as { __grGenres?: Catalogue };

const nameIn = (g: GenreRow, locale: Locale) => (locale === "en" ? g.nameEn : g.nameHr);

/**
 * A genre as the member sees it. `traitKey` is the Croatian name of the genre whose Spirala traits it uses, which
 * is how src/lib/music/genre-traits.ts names them: the genre itself when it has traits, else its family.
 */
function toOption(g: GenreRow, rows: Map<string, GenreRow>, locale: Locale): GenreOption {
  const parent = g.parentId ? rows.get(g.parentId) : undefined;
  return {
    id: g.id,
    slug: g.slug,
    name: nameIn(g, locale),
    parentName: parent ? nameIn(parent, locale) : null,
    traitKey: parent ? parent.nameHr : g.family !== null ? g.nameHr : null,
    rank: g.rank,
  };
}

async function catalogue(): Promise<Catalogue> {
  const cached = globalCache.__grGenres;
  if (cached && Date.now() - cached.at < TTL_MS) return cached;
  const list = await db()
    .select({
      id: genre.id,
      slug: genre.slug,
      nameHr: genre.nameHr,
      nameEn: genre.nameEn,
      parentId: genre.parentId,
      family: genre.family,
      rank: genre.rank,
      active: genre.active,
    })
    .from(genre);
  const rows = new Map(list.map((g) => [g.id, g]));
  const active = list.filter((g) => g.active);
  const parentSlugs = new Map(
    active.flatMap((g) => {
      const p = g.parentId ? rows.get(g.parentId) : undefined;
      return p ? [[g.slug, p.slug] as const] : [];
    }),
  );
  const build = (locale: Locale) =>
    buildGenreIndex(
      active.map((g) => toOption(g, rows, locale)),
      parentSlugs,
    );
  const fresh = { rows, index: { hr: build("hr"), en: build("en") }, at: Date.now() };
  globalCache.__grGenres = fresh;
  return fresh;
}

/** Drops the cached catalogue (after a seed or an admin change, and in tests). */
export function forgetGenreCatalogue() {
  globalCache.__grGenres = undefined;
}

/** Genre search for the editor: up to 12 active genres, the member's own picks left out. */
export async function findGenres(userId: string, query: string, locale: Locale) {
  const [cat, own] = await Promise.all([catalogue(), ownGenreIds(userId)]);
  return search(cat.index[locale], query, own);
}

/** The main genres and the suggestions (D-062), unfiltered: the editor leaves out what the member has picked. */
export async function genreSuggestions(locale: Locale) {
  const cat = await catalogue();
  return suggestedGenres(cat.index[locale], new Set(), 32);
}

async function ownGenreIds(userId: string): Promise<Set<string>> {
  const rows = await db()
    .select({ id: musicDnaEntry.genreId })
    .from(musicDnaEntry)
    .where(and(eq(musicDnaEntry.userId, userId), eq(musicDnaEntry.kind, "genre")));
  return new Set(rows.map((r) => r.id).filter((x): x is string => !!x));
}

// ---------------------------------------------------------------- reading a Music DNA

export type DnaGenre = GenreOption & { entryId: string };
export type DnaArtist = {
  entryId: string;
  id: string;
  /** The MusicBrainz id (null only for artists not from MusicBrainz). */
  mbid: string | null;
  name: string;
  disambiguation: string | null;
  /** J2 E5: still listed, labelled "No longer available from the source". */
  unavailable: boolean;
};
export type MusicDna = { genres: DnaGenre[]; artists: DnaArtist[] };

async function readDna(userId: string, locale: Locale): Promise<MusicDna> {
  const [cat, entries] = await Promise.all([
    catalogue(),
    db()
      .select({
        entryId: musicDnaEntry.id,
        kind: musicDnaEntry.kind,
        genreId: musicDnaEntry.genreId,
        artistId: musicDnaEntry.artistId,
      })
      .from(musicDnaEntry)
      .where(eq(musicDnaEntry.userId, userId))
      .orderBy(asc(musicDnaEntry.position), asc(musicDnaEntry.createdAt)),
  ]);
  const genres: DnaGenre[] = [];
  for (const e of entries) {
    const g = e.kind === "genre" && e.genreId ? cat.rows.get(e.genreId) : undefined;
    if (g) genres.push({ ...toOption(g, cat.rows, locale), entryId: e.entryId });
  }
  // J2 E4: an entry follows a merge to the canonical artist; two entries that now name the same artist show once,
  // at the higher position. The rows themselves are never rewritten (invariant 3).
  const artistEntries = entries.filter((e) => e.kind === "artist" && e.artistId);
  const canonical = await Promise.all(artistEntries.map((e) => resolveCanonicalId(e.artistId!)));
  const canonicalOf = new Map(
    artistEntries.map((e, i) => [e.entryId, canonical[i] ?? e.artistId!]),
  );
  const artistIds = [...new Set(canonicalOf.values())];
  const found = artistIds.length
    ? await db()
        .select({
          id: artist.id,
          mbid: artist.mbid,
          name: artist.name,
          disambiguation: artist.disambiguation,
          availability: artist.availability,
        })
        .from(artist)
        .where(inArray(artist.id, artistIds))
    : [];
  const byId = new Map(found.map((a) => [a.id, a]));
  const shown = new Set<string>();
  const artists: DnaArtist[] = artistEntries.flatMap((e) => {
    const id = canonicalOf.get(e.entryId)!;
    if (shown.has(id)) return [];
    shown.add(id);
    const a = byId.get(id);
    return a
      ? [
          {
            entryId: e.entryId,
            id: a.id,
            mbid: a.mbid,
            name: a.name,
            disambiguation: a.disambiguation,
            unavailable: a.availability === "unavailable",
          },
        ]
      : [];
  });
  return { genres, artists };
}

/** The member's own Music DNA (the editor and their own profile). */
export function ownMusicDna(userId: string, locale: Locale): Promise<MusicDna> {
  return readDna(userId, locale);
}

/**
 * Someone's Music DNA as `viewer` may see it (PROF-01, step 5.5): null when the section is hidden from them, for
 * whatever reason (the policy decides; the caller omits the section, never shows it locked).
 */
export async function musicDnaFor(
  viewer: Viewer,
  ownerId: string,
  locale: Locale,
): Promise<MusicDna | null> {
  if (!UUID.test(ownerId)) return null;
  const owner = await loadOwner(ownerId);
  if (!owner) return null;
  const graph = await loadGraph(viewer.id, owner.id);
  const d = canViewProfileSection("musicDna", viewer, owner, graph);
  if (!d.allowed || d.mode === "case") return null; // staff case access goes through the case view (5.9)
  return readDna(ownerId, locale);
}

// ---------------------------------------------------------------- the audience of the section

export type DnaAudienceState = {
  audience: DnaAudience | "mutuals";
  /** A private profile caps every section at followers (matrix §2), whatever the setting says. */
  profilePrivate: boolean;
};

export async function dnaAudience(userId: string): Promise<DnaAudienceState> {
  const [row] = await db()
    .select({ audience: privacySettings.musicDna, visibility: profile.visibility })
    .from(privacySettings)
    .leftJoin(profile, eq(profile.userId, privacySettings.userId))
    .where(eq(privacySettings.userId, userId));
  // No row reads as the narrowest setting (fail closed, as loadOwners does).
  return { audience: row?.audience ?? "me", profilePrivate: row?.visibility !== "public" };
}

export async function setDnaAudience(userId: string, audience: DnaAudience): Promise<void> {
  await db()
    .insert(privacySettings)
    .values({ userId, musicDna: audience })
    .onConflictDoUpdate({
      target: privacySettings.userId,
      set: { musicDna: audience, updatedAt: new Date() },
    });
}

// ---------------------------------------------------------------- changing a Music DNA

export type DnaKind = "genre" | "artist";
export type DnaWrite =
  | { ok: true; dna: MusicDna; entryId?: string }
  | {
      ok: false;
      reason: "not-found" | "duplicate" | "full" | "minimum" | "stale";
      dna: MusicDna;
      /** For "duplicate": the existing entry, so the editor can move focus to it (J2). */
      entryId?: string;
    };

type Tx = Parameters<Parameters<ReturnType<typeof db>["transaction"]>[0]>[0];

async function lockMember(tx: Tx, userId: string) {
  await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${"dna:" + userId}, 0))`);
}

async function orderedIds(tx: Tx, userId: string, kind: DnaKind) {
  return tx
    .select({
      id: musicDnaEntry.id,
      genreId: musicDnaEntry.genreId,
      artistId: musicDnaEntry.artistId,
    })
    .from(musicDnaEntry)
    .where(and(eq(musicDnaEntry.userId, userId), eq(musicDnaEntry.kind, kind)))
    .orderBy(asc(musicDnaEntry.position), asc(musicDnaEntry.createdAt));
}

/** Writes positions 0..n-1 in the given order (only rows that moved). */
async function renumber(tx: Tx, userId: string, ids: readonly string[]) {
  if (!ids.length) return;
  const values = sql.join(
    ids.map((id, i) => sql`(${id}::uuid, ${i}::int)`),
    sql`, `,
  );
  await tx.execute(sql`
    update music_dna_entry e set position = v.pos
    from (values ${values}) as v(id, pos)
    where e.id = v.id and e.user_id = ${userId} and e.position is distinct from v.pos`);
}

/**
 * Adds a genre at the end, or at `position` (Undo after a remove puts it back where it was). Refuses an unknown or
 * inactive genre, a duplicate (after following redirects, invariant 5) and an eleventh genre.
 */
export async function addDnaGenre(
  userId: string,
  genreId: string,
  locale: Locale,
  position?: number,
): Promise<DnaWrite> {
  const target = UUID.test(genreId) ? await resolveCanonicalId(genreId) : null;
  const cat = await catalogue();
  const g = target ? cat.rows.get(target) : undefined;
  const result = await db().transaction(async (tx) => {
    await lockMember(tx, userId);
    if (!g || !g.active) return { ok: false as const, reason: "not-found" as const };
    const current = await orderedIds(tx, userId, "genre");
    const dup = current.find((e) => e.genreId === g.id);
    if (dup) return { ok: false as const, reason: "duplicate" as const, entryId: dup.id };
    if (current.length >= GENRE_MAX) return { ok: false as const, reason: "full" as const };
    const at = Math.max(0, Math.min(position ?? current.length, current.length));
    const [row] = await tx
      .insert(musicDnaEntry)
      .values({ userId, kind: "genre", genreId: g.id, position: current.length })
      .returning({ id: musicDnaEntry.id });
    const ids = current.map((e) => e.id);
    ids.splice(at, 0, row!.id);
    await renumber(tx, userId, ids);
    return { ok: true as const, entryId: row!.id };
  });
  return { ...result, dna: await readDna(userId, locale) };
}

/**
 * Onboarding (ONB-05, step 5.4): the member's genre picks written in one go, in the order picked, replacing what the
 * step saved before (Back and forth keeps earlier answers). Unknown or inactive ids are refused as a whole; the
 * count must be 0 (nothing kept) or between the minimum and the maximum. Artists are untouched (5.3b).
 */
export async function replaceDnaGenres(
  userId: string,
  genreIds: readonly string[],
  locale: Locale,
): Promise<{ ok: true; dna: MusicDna } | { ok: false; reason: "not-found" | "count" }> {
  const unique = [...new Set(genreIds)];
  if (unique.length && (unique.length < GENRE_MIN || unique.length > GENRE_MAX))
    return { ok: false, reason: "count" };
  const cat = await catalogue();
  const rows = unique.map((id) => (UUID.test(id) ? cat.rows.get(id) : undefined));
  if (rows.some((g) => !g || !g.active)) return { ok: false, reason: "not-found" };
  await db().transaction(async (tx) => {
    await lockMember(tx, userId);
    await tx
      .delete(musicDnaEntry)
      .where(and(eq(musicDnaEntry.userId, userId), eq(musicDnaEntry.kind, "genre")));
    if (rows.length) {
      await tx
        .insert(musicDnaEntry)
        .values(
          rows.map((g, position) => ({ userId, kind: "genre" as const, genreId: g!.id, position })),
        );
    }
  });
  return { ok: true, dna: await readDna(userId, locale) };
}

/**
 * Removes one of the member's own entries. A genre cannot go below two (D-078 (2): D-046 holds after onboarding).
 * Returns what was removed so the editor can offer Undo.
 */
export async function removeDnaEntry(
  userId: string,
  entryId: string,
  locale: Locale,
): Promise<DnaWrite & { removed?: { kind: DnaKind; subjectId: string; position: number } }> {
  if (!UUID.test(entryId))
    return { ok: false, reason: "not-found", dna: await readDna(userId, locale) };
  const result = await db().transaction(async (tx) => {
    await lockMember(tx, userId);
    const [entry] = await tx
      .select({
        kind: musicDnaEntry.kind,
        genreId: musicDnaEntry.genreId,
        artistId: musicDnaEntry.artistId,
      })
      .from(musicDnaEntry)
      .where(and(eq(musicDnaEntry.id, entryId), eq(musicDnaEntry.userId, userId)));
    if (!entry) return { ok: false as const, reason: "not-found" as const };
    const list = await orderedIds(tx, userId, entry.kind);
    if (entry.kind === "genre" && list.length <= GENRE_MIN)
      return { ok: false as const, reason: "minimum" as const };
    const position = list.findIndex((e) => e.id === entryId);
    await tx
      .delete(musicDnaEntry)
      .where(and(eq(musicDnaEntry.id, entryId), eq(musicDnaEntry.userId, userId)));
    await renumber(
      tx,
      userId,
      list.filter((e) => e.id !== entryId).map((e) => e.id),
    );
    return {
      ok: true as const,
      removed: {
        kind: entry.kind,
        subjectId: (entry.kind === "genre" ? entry.genreId : entry.artistId)!,
        position,
      },
    };
  });
  return { ...result, dna: await readDna(userId, locale) };
}

/**
 * Moves an entry one place up (-1) or down (+1). `expected` is the order the editor showed; when it no longer
 * matches (another device changed the list) the move is refused as "stale" and the current order returned (J2 E3).
 */
export async function moveDnaEntry(
  userId: string,
  entryId: string,
  direction: -1 | 1,
  expected: readonly string[],
  locale: Locale,
): Promise<DnaWrite> {
  if (!UUID.test(entryId) || expected.some((id) => !UUID.test(id)))
    return { ok: false, reason: "stale", dna: await readDna(userId, locale) };
  const result = await db().transaction(async (tx) => {
    await lockMember(tx, userId);
    const [entry] = await tx
      .select({ kind: musicDnaEntry.kind })
      .from(musicDnaEntry)
      .where(and(eq(musicDnaEntry.id, entryId), eq(musicDnaEntry.userId, userId)));
    if (!entry) return { ok: false as const, reason: "stale" as const };
    const ids = (await orderedIds(tx, userId, entry.kind)).map((e) => e.id);
    if (ids.length !== expected.length || ids.some((id, i) => id !== expected[i]))
      return { ok: false as const, reason: "stale" as const };
    const i = ids.indexOf(entryId);
    const j = i + direction;
    if (j < 0 || j >= ids.length) return { ok: true as const };
    [ids[i], ids[j]] = [ids[j]!, ids[i]!];
    await renumber(tx, userId, ids);
    return { ok: true as const };
  });
  return { ...result, dna: await readDna(userId, locale) };
}

// ---------------------------------------------------------------- artists (step 5.3b)

/**
 * Adds an artist (our id, already stored from MusicBrainz) at the end, or at `position` (Undo). Refuses an unknown
 * artist, a duplicate after following redirects (invariant 5) and an eleventh artist. Artists have no minimum
 * (J2 E6).
 */
export async function addDnaArtist(
  userId: string,
  artistId: string,
  locale: Locale,
  position?: number,
): Promise<DnaWrite> {
  const target = UUID.test(artistId) ? await resolveCanonicalId(artistId) : null;
  const [row] = target
    ? await db().select({ id: artist.id }).from(artist).where(eq(artist.id, target))
    : [];
  const result = await db().transaction(async (tx) => {
    await lockMember(tx, userId);
    if (!row) return { ok: false as const, reason: "not-found" as const };
    const current = await orderedIds(tx, userId, "artist");
    const canonical = await Promise.all(current.map((e) => resolveCanonicalId(e.artistId!)));
    const dupAt = canonical.findIndex((c, i) => (c ?? current[i]!.artistId) === row.id);
    if (dupAt >= 0)
      return { ok: false as const, reason: "duplicate" as const, entryId: current[dupAt]!.id };
    if (current.length >= ARTIST_MAX) return { ok: false as const, reason: "full" as const };
    const at = Math.max(0, Math.min(position ?? current.length, current.length));
    const [inserted] = await tx
      .insert(musicDnaEntry)
      .values({ userId, kind: "artist", artistId: row.id, position: current.length })
      .returning({ id: musicDnaEntry.id });
    const ids = current.map((e) => e.id);
    ids.splice(at, 0, inserted!.id);
    await renumber(tx, userId, ids);
    return { ok: true as const, entryId: inserted!.id };
  });
  return { ...result, dna: await readDna(userId, locale) };
}

/**
 * Onboarding (ONB-05, step 5.3b): the member's artist picks (our ids, already stored from MusicBrainz) in one go, in
 * pick order, replacing what the step saved before. Unknown ids are refused as a whole; at most ARTIST_MAX.
 */
export async function replaceDnaArtists(
  userId: string,
  artistIds: readonly string[],
): Promise<{ ok: true } | { ok: false; reason: "not-found" | "count" }> {
  const unique = [...new Set(artistIds)];
  if (unique.length > ARTIST_MAX) return { ok: false, reason: "count" };
  if (unique.some((id) => !UUID.test(id))) return { ok: false, reason: "not-found" };
  const found = unique.length
    ? await db().select({ id: artist.id }).from(artist).where(inArray(artist.id, unique))
    : [];
  if (found.length !== unique.length) return { ok: false, reason: "not-found" };
  await db().transaction(async (tx) => {
    await lockMember(tx, userId);
    await tx
      .delete(musicDnaEntry)
      .where(and(eq(musicDnaEntry.userId, userId), eq(musicDnaEntry.kind, "artist")));
    if (unique.length) {
      await tx.insert(musicDnaEntry).values(
        unique.map((artistId, position) => ({
          userId,
          kind: "artist" as const,
          artistId,
          position,
        })),
      );
    }
  });
  return { ok: true };
}

/**
 * MusicBrainz tags that name one of our main genres differently (our list keeps "Alternative" and "Film music" as
 * main genres, D-062). Used only when the tag itself is not one of our genres.
 */
const TAG_ALIASES: Record<string, string> = {
  "alternative rock": "alternative",
  soundtrack: "film music",
  "film score": "film music",
};

/** One typeahead result (D-060 (2)): the main genres, and country and years only when names repeat (J2 E8). */
export type ArtistOption = {
  mbid: string;
  name: string;
  /** Up to two genre names from our catalogue, in the member's language. */
  genres: string[];
  /** The country's name in the member's language. */
  country: string | null;
  years: string | null;
  disambiguation: string | null;
  /** Another result has the same name: show country, years and the disambiguation. */
  sameName: boolean;
  /** Already in the member's Music DNA. */
  picked: boolean;
};

const regionNames: Partial<Record<Locale, Intl.DisplayNames>> = {};
function countryName(code: string | null, locale: Locale): string | null {
  if (!code) return null;
  try {
    regionNames[locale] ??= new Intl.DisplayNames([locale], { type: "region" });
    return regionNames[locale]!.of(code) ?? code;
  } catch {
    return code;
  }
}

/**
 * Artist search for the editor, through the MusicBrainz client (queue, cache). Throws CatalogUnavailable when the
 * catalogue cannot answer; the action turns that into "Katalog trenutačno ne radi.".
 */
export async function findArtists(
  userId: string,
  query: string,
  locale: Locale,
): Promise<ArtistOption[]> {
  const [cat, found, own] = await Promise.all([
    catalogue(),
    catalogClient().searchArtists(query, 8),
    db()
      .select({ mbid: artist.mbid })
      .from(musicDnaEntry)
      .innerJoin(artist, eq(artist.id, musicDnaEntry.artistId))
      .where(and(eq(musicDnaEntry.userId, userId), eq(musicDnaEntry.kind, "artist"))),
  ]);
  const byEnglish = new Map<string, GenreRow>();
  for (const g of cat.rows.values()) if (g.active) byEnglish.set(g.nameEn.toLowerCase(), g);
  const ownIds = new Set(own.map((r) => r.mbid));
  const names = new Map<string, number>();
  for (const a of found) names.set(foldName(a.name), (names.get(foldName(a.name)) ?? 0) + 1);
  return found.map((a) => {
    const genres: string[] = [];
    for (const t of a.tags) {
      const g = byEnglish.get(t.name) ?? byEnglish.get(TAG_ALIASES[t.name] ?? "");
      if (g && !genres.includes(nameIn(g, locale))) genres.push(nameIn(g, locale));
      if (genres.length === 2) break;
    }
    const years = a.beginYear
      ? a.endYear
        ? `${a.beginYear}–${a.endYear}`
        : String(a.beginYear)
      : null;
    return {
      mbid: a.mbid,
      name: a.name,
      genres,
      country: countryName(a.country, locale),
      years,
      disambiguation: a.disambiguation,
      sameName: (names.get(foldName(a.name)) ?? 0) > 1,
      picked: ownIds.has(a.mbid),
    };
  });
}

export const DNA_LIMITS = { GENRE_MIN, GENRE_MAX, ARTIST_MAX } as const;
