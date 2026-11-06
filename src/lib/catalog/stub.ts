// A fixed, offline stand-in for MusicBrainz (CATALOG_STUB=1): end-to-end tests and work without the network.
// It answers through the real client (createMusicBrainzClient with this `fetch`), so parsing, caching and errors
// take the same path as production. SAMPLE data: facts trimmed from MusicBrainz (CC0); the ids of Let 3 and Low are
// made up, so never copy these rows into a real database.
//
// - A query containing "katalog-kvar" answers 503 every time: the "Katalog trenutačno ne radi." state.
// - "Nirvana" returns two artists with the same name: the typeahead shows country and years for both (D-060 (2)).
// - The lookup of OLD_LOW_MBID answers with the Low entry: a merged artist (J2 E4).

type A = {
  id: string;
  name: string;
  "sort-name": string;
  disambiguation?: string;
  country?: string;
  "life-span"?: { begin?: string; end?: string };
  tags?: { name: string; count: number }[];
};

export const OLD_LOW_MBID = "00000000-0000-4000-8000-00000000c0de";

const ARTISTS: A[] = [
  {
    id: "5b11f4ce-a62d-471e-81fc-a69a8278c7da",
    name: "Nirvana",
    "sort-name": "Nirvana",
    disambiguation: "1980s–1990s US grunge band",
    country: "US",
    "life-span": { begin: "1987", end: "1994-04-05" },
    tags: [
      { name: "grunge", count: 68 },
      { name: "alternative rock", count: 30 },
      { name: "rock", count: 26 },
    ],
  },
  {
    id: "9282c8b4-ca0b-4c6b-b7e3-4f7762dfc4d6",
    name: "Nirvana",
    "sort-name": "Nirvana",
    disambiguation: "60s band from the UK",
    country: "GB",
    "life-span": { begin: "1965" },
    tags: [
      { name: "psychedelic pop", count: 3 },
      { name: "rock", count: 2 },
    ],
  },
  {
    id: "a74b1b7f-71a5-4011-9441-d0b5e4122711",
    name: "Radiohead",
    "sort-name": "Radiohead",
    country: "GB",
    "life-span": { begin: "1991" },
    tags: [
      { name: "alternative rock", count: 40 },
      { name: "art rock", count: 20 },
      { name: "electronic", count: 9 },
    ],
  },
  {
    id: "87c5dedd-371d-4a53-9f7f-80522fb7f3cb",
    name: "Björk",
    "sort-name": "Björk",
    country: "IS",
    "life-span": { begin: "1965-11-21" },
    tags: [
      { name: "electronic", count: 20 },
      { name: "art pop", count: 18 },
    ],
  },
  {
    id: "65f4f0c5-ef9e-490c-aee3-909e7ae6b2ab",
    name: "Metallica",
    "sort-name": "Metallica",
    country: "US",
    "life-span": { begin: "1981-10-28" },
    tags: [
      { name: "thrash metal", count: 50 },
      { name: "heavy metal", count: 40 },
    ],
  },
  {
    id: "e0a5a8bd-8c9d-4b49-9b3a-5d0b9cf6a0a1",
    name: "Let 3",
    "sort-name": "Let 3",
    disambiguation: "Croatian rock band",
    country: "HR",
    "life-span": { begin: "1987" },
    tags: [{ name: "rock", count: 5 }],
  },
  {
    id: "c6a3e2a4-6c5b-4a51-8fd6-2a0b3c3d6e7f",
    name: "Low",
    "sort-name": "Low",
    disambiguation: "US slowcore band",
    country: "US",
    "life-span": { begin: "1993", end: "2022" },
    tags: [
      { name: "slowcore", count: 12 },
      { name: "indie rock", count: 6 },
    ],
  },
];

const fold = (s: string) =>
  s.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase().replace(/\\(.)/g, "$1").trim();

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

/** A `fetch` that answers MusicBrainz search and lookup URLs from the list above. */
export const stubFetch: typeof fetch = async (input) => {
  const url = new URL(
    typeof input === "string" ? input : input instanceof URL ? input.href : input.url,
  );
  const path = url.pathname.replace(/^.*\/ws\/2/, "");
  if (path === "/artist") {
    const q = fold(url.searchParams.get("query") ?? "");
    if (q.includes("katalog-kvar")) return json({ error: "stub outage" }, 503);
    const hits = ARTISTS.filter((a) => fold(a.name).includes(q) || q.includes(fold(a.name)));
    return json({ artists: hits.map((a) => ({ ...a, score: 100 })) });
  }
  const m = /^\/artist\/([0-9a-f-]{36})$/.exec(path);
  if (m) {
    const id = m[1] === OLD_LOW_MBID ? ARTISTS.find((a) => a.name === "Low")!.id : m[1];
    const a = ARTISTS.find((x) => x.id === id);
    return a ? json(a) : json({ error: "Not Found" }, 404);
  }
  if (path === "/genre/all") return json({ "genre-count": 0, genres: [] });
  return json({ error: "Not Found" }, 404);
};
