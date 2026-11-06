"use server";

import { getLocale } from "next-intl/server";
import { getSession, roleOf } from "@/lib/auth/session";
import { CatalogUnavailable } from "@/lib/catalog/musicbrainz";
import { artistFromMbid } from "@/lib/data/catalog";
import { logDbError } from "@/lib/data/db-errors";
import { loadViewer } from "@/lib/data/facts";
import {
  addDnaArtist,
  addDnaGenre,
  findArtists,
  findGenres,
  type ArtistOption,
  moveDnaEntry,
  removeDnaEntry,
  setDnaAudience,
  type DnaKind,
  type Locale,
  type MusicDna,
} from "@/lib/data/music-dna";
import { consume } from "@/lib/data/rate-limit";
import { flagState } from "@/lib/flags";
import type { GenreOption } from "./genre-search";
import { ARTIST_MAX, DNA_AUDIENCES, GENRE_MAX, type DnaAudience } from "./limits";

// Server actions for the Music DNA editor (PROF-09, J2). Every action works on the signed-in member's own Music DNA
// only: the user id comes from the session, never from the client (invariant 3). Inputs are checked here; the data
// layer checks them again. Failures come back as a reason key for the editor's messages, never as an exception text.

export type DnaFailure =
  | "signedOut"
  | "notAllowed"
  | "paused"
  | "tooMany"
  | "generic"
  | "catalog"
  | "not-found"
  | "duplicate"
  | "full"
  | "minimum"
  | "stale";

export type DnaActionResult = {
  ok: boolean;
  reason?: DnaFailure;
  /** The member's Music DNA after the action (absent when the action could not run at all). */
  dna?: MusicDna;
  entryId?: string;
  removed?: { kind: DnaKind; subjectId: string; position: number };
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (v: unknown): v is string => typeof v === "string" && UUID.test(v);

/** The signed-in, active member, or the reason the action may not run. */
async function member(
  scope: "dna" | "genreSearch" | "search",
): Promise<{ userId: string; locale: Locale } | { fail: DnaFailure }> {
  const session = await getSession();
  if (!session) return { fail: "signedOut" };
  const viewer = await loadViewer({ id: session.user.id, role: roleOf(session) });
  if (viewer.status !== "active") return { fail: "notAllowed" };
  if ((await flagState("music_dna")) === "paused") return { fail: "paused" };
  const rate = await consume(scope, session.user.id);
  if (!rate.allowed) return { fail: "tooMany" };
  const locale: Locale = (await getLocale()) === "en" ? "en" : "hr";
  return { userId: session.user.id, locale };
}

async function run(
  where: string,
  scope: "dna" | "genreSearch" | "search",
  body: (m: { userId: string; locale: Locale }) => Promise<DnaActionResult>,
): Promise<DnaActionResult> {
  try {
    const m = await member(scope);
    if ("fail" in m) return { ok: false, reason: m.fail };
    return await body(m);
  } catch (e) {
    if (e instanceof CatalogUnavailable) {
      // Logged without the query or the member: only why MusicBrainz could not answer.
      console.warn(`[catalog] ${where}: ${e.message}`);
      return { ok: false, reason: "catalog" };
    }
    logDbError(where, e);
    return { ok: false, reason: "generic" };
  }
}

export async function addGenreAction(
  genreId: unknown,
  position?: unknown,
): Promise<DnaActionResult> {
  if (!isUuid(genreId)) return { ok: false, reason: "not-found" };
  const at =
    typeof position === "number" &&
    Number.isInteger(position) &&
    position >= 0 &&
    position < GENRE_MAX
      ? position
      : undefined;
  return run("addGenreAction", "dna", ({ userId, locale }) =>
    addDnaGenre(userId, genreId, locale, at),
  );
}

export async function removeDnaAction(entryId: unknown): Promise<DnaActionResult> {
  if (!isUuid(entryId)) return { ok: false, reason: "not-found" };
  return run("removeDnaAction", "dna", ({ userId, locale }) =>
    removeDnaEntry(userId, entryId, locale),
  );
}

export async function moveDnaAction(
  entryId: unknown,
  direction: unknown,
  expected: unknown,
): Promise<DnaActionResult> {
  if (
    !isUuid(entryId) ||
    (direction !== -1 && direction !== 1) ||
    !Array.isArray(expected) ||
    expected.length > 2 * GENRE_MAX ||
    !expected.every(isUuid)
  )
    return { ok: false, reason: "stale" };
  return run("moveDnaAction", "dna", ({ userId, locale }) =>
    moveDnaEntry(userId, entryId, direction, expected, locale),
  );
}

export async function setDnaAudienceAction(audience: unknown): Promise<DnaActionResult> {
  if (!DNA_AUDIENCES.includes(audience as DnaAudience)) return { ok: false, reason: "generic" };
  return run("setDnaAudienceAction", "dna", async ({ userId }) => {
    await setDnaAudience(userId, audience as DnaAudience);
    return { ok: true };
  });
}

export async function searchGenresAction(
  query: unknown,
): Promise<{ ok: boolean; reason?: DnaFailure; results?: GenreOption[] }> {
  if (typeof query !== "string") return { ok: false, reason: "generic" };
  let results: GenreOption[] = [];
  const r = await run("searchGenresAction", "genreSearch", async ({ userId, locale }) => {
    results = await findGenres(userId, query, locale);
    return { ok: true };
  });
  return r.ok ? { ok: true, results } : { ok: false, reason: r.reason };
}

/**
 * Adds an artist to the member's Music DNA. `source` "mb" is a MusicBrainz id picked from the typeahead (stored on
 * first use); "id" is our artist id, for Undo after a remove.
 */
export async function addArtistAction(
  source: unknown,
  value: unknown,
  position?: unknown,
): Promise<DnaActionResult> {
  if ((source !== "mb" && source !== "id") || !isUuid(value))
    return { ok: false, reason: "not-found" };
  const at =
    typeof position === "number" &&
    Number.isInteger(position) &&
    position >= 0 &&
    position < ARTIST_MAX
      ? position
      : undefined;
  return run("addArtistAction", "dna", async ({ userId, locale }) => {
    let artistId = value;
    if (source === "mb") {
      const ref = await artistFromMbid(value);
      if (!ref.ok) return { ok: false, reason: "not-found" };
      artistId = ref.id;
    }
    return addDnaArtist(userId, artistId, locale, at);
  });
}

export async function searchArtistsAction(
  query: unknown,
): Promise<{ ok: boolean; reason?: DnaFailure; results?: ArtistOption[] }> {
  if (typeof query !== "string" || query.length > 200) return { ok: false, reason: "generic" };
  let results: ArtistOption[] = [];
  const r = await run("searchArtistsAction", "search", async ({ userId, locale }) => {
    results = await findArtists(userId, query, locale);
    return { ok: true };
  });
  return r.ok ? { ok: true, results } : { ok: false, reason: r.reason };
}
