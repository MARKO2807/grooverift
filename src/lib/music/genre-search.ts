// Genre search for the Music DNA editor (D-062 (6), ported from design/prototypes/pulse/app.js `genreHits`).
// Pure: the data layer loads the genre table once and passes it in, so this runs in unit tests without a database.
// Matches the name, the start of any word, other spellings (aliases) and the parent family, so "metal" also finds
// "Djent" and "klasična" finds "Baroque". Ranked: exact, starts with (name or alias), a word starts with, contains,
// parent; inside each group better-known genres first (rank), then by name.

export type GenreOption = {
  id: string;
  slug: string;
  /** In the member's language. */
  name: string;
  /** The family's name in the member's language, shown next to a subgenre ("Death metal · Metal"). */
  parentName: string | null;
  /** The genre whose Spirala traits this one uses (src/lib/music/genre-traits.ts); null = no family. */
  traitKey: string | null;
  rank: number;
};

/** D-062 (4): the 20 main genres, in order. */
export const MAIN_GENRE_SLUGS = [
  "pop",
  "rock",
  "hip-hop",
  "electronic",
  "latin",
  "classical",
  "r-and-b",
  "film-music",
  "country",
  "reggae",
  "metal",
  "indie",
  "jazz",
  "k-pop",
  "soul",
  "blues",
  "folk",
  "punk",
  "house",
  "techno",
] as const;

/** Shown in "add a genre" before anything is typed, after the main genres the member has not picked. */
export const SUGGESTED_GENRE_SLUGS = [
  "trap",
  "alternative",
  "funk",
  "drum-and-bass",
  "disco",
  "grunge",
  "nu-metal",
  "singer-songwriter",
  "afrobeats",
  "gospel",
  "hard-rock",
  "lo-fi",
] as const;

/** Other words members type for a genre (search only), by slug. Both languages, since members mix them. */
export const GENRE_ALIASES: Record<string, readonly string[]> = {
  "hip-hop": ["hip hop", "hip-hop", "hiphop", "rap"],
  electronic: ["electronic", "edm", "dance", "elektronska", "elektronika"],
  classical: ["classical", "klasika", "klasična"],
  "film-music": ["soundtrack", "film", "score", "filmska"],
  latin: ["latin", "latino", "latinoamerička"],
  "singer-songwriter": ["singer-songwriter", "kantautor", "kantautorska"],
  alternative: ["alternative", "alternativa", "alternativni rock"],
  "drum-and-bass": ["drum and bass", "dnb", "drum & bass"],
  folk: ["narodna", "etno", "world"],
  country: ["kantri"],
};

export const SEARCH_LIMIT = 12;
export const QUERY_MAX = 60;

/** Lower case, đ → d, accents removed: "Klasična" and "klasicna" match. */
export const fold = (s: string) =>
  s.toLowerCase().replace(/đ/g, "d").normalize("NFD").replace(/[̀-ͯ]/g, "");

type Indexed = {
  g: GenreOption;
  k: string;
  words: string[];
  al: string[];
  pk: string;
  pal: string[];
};

export type GenreIndex = {
  all: Indexed[];
  bySlug: Map<string, GenreOption>;
  parentSlug: Map<string, string>;
};

/** `parentSlugs` maps a genre's slug to its family's slug, for alias matches on the family. */
export function buildGenreIndex(
  genres: readonly GenreOption[],
  parentSlugs: ReadonlyMap<string, string> = new Map(),
): GenreIndex {
  const bySlug = new Map(genres.map((g) => [g.slug, g]));
  const all = genres.map((g) => {
    const ps = parentSlugs.get(g.slug);
    return {
      g,
      k: fold(g.name),
      words: fold(g.name).split(/[\s\-/&]+/),
      al: (GENRE_ALIASES[g.slug] ?? []).map(fold),
      pk: g.parentName ? fold(g.parentName) : "",
      pal: ps ? (GENRE_ALIASES[ps] ?? []).map(fold) : [],
    };
  });
  return { all, bySlug, parentSlug: new Map(parentSlugs) };
}

function matchRank(x: Indexed, q: string): number {
  if (x.k === q || x.al.includes(q)) return 0;
  if (x.k.startsWith(q) || x.al.some((a) => a.startsWith(q))) return 1;
  if (x.words.some((w) => w.startsWith(q))) return 2;
  if (x.k.includes(q)) return 3;
  if (x.pk && (x.pk.startsWith(q) || x.pal.some((a) => a.startsWith(q)))) return 4;
  return 9;
}

/** Up to `limit` genres for `query`, leaving out `exclude` (ids already in the member's Music DNA). */
export function searchGenres(
  index: GenreIndex,
  query: string,
  exclude: ReadonlySet<string> = new Set(),
  limit = SEARCH_LIMIT,
): GenreOption[] {
  const q = fold(query.trim().slice(0, QUERY_MAX));
  if (!q) return suggestedGenres(index, exclude, limit);
  return index.all
    .filter((x) => !exclude.has(x.g.id))
    .map((x) => [matchRank(x, q), x] as const)
    .filter(([r]) => r < 9)
    .sort(([ra, a], [rb, b]) => ra - rb || b.g.rank - a.g.rank || a.k.localeCompare(b.k, "en"))
    .slice(0, limit)
    .map(([, x]) => x.g);
}

/** Before anything is typed: the main genres, then the suggestions, without the picked ones. */
export function suggestedGenres(
  index: GenreIndex,
  exclude: ReadonlySet<string> = new Set(),
  limit = SEARCH_LIMIT,
): GenreOption[] {
  return [...MAIN_GENRE_SLUGS, ...SUGGESTED_GENRE_SLUGS]
    .map((s) => index.bySlug.get(s))
    .filter((g): g is GenreOption => !!g && !exclude.has(g.id))
    .slice(0, limit);
}
