// A fixed, offline stand-in for MusicBrainz (CATALOG_STUB=1): end-to-end tests and work without the network.
// It answers through the real client (createMusicBrainzClient with this `fetch`), so parsing, caching and errors
// take the same path as production. SAMPLE data: facts trimmed from MusicBrainz (CC0); the ids of Let 3 and Low are
// made up, so never copy these rows into a real database.
//
// - A query containing "katalog-kvar" answers 503 every time: the "Katalog trenutačno ne radi." state.
// - "Nirvana" returns two artists with the same name: the typeahead shows country and years for both (D-060 (2)).
// - The lookup of OLD_LOW_MBID answers with the Low entry: a merged artist (J2 E4).
// - Artist photos (step 5.11): Radiohead has a CC BY-SA 3.0 photo, Björk a non-commercial one (refused, D-118 (3)),
//   Metallica a GFDL-only one (refused); the others have no Wikidata item. The photo is a generated square, and the
//   author and file names are invented.

type A = {
  id: string;
  name: string;
  "sort-name": string;
  disambiguation?: string;
  country?: string;
  "life-span"?: { begin?: string; end?: string };
  tags?: { name: string; count: number }[];
  /** The Wikidata item, answered as a url-rel (inc=url-rels). */
  wikidata?: string;
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
    wikidata: "Q900001",
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
    wikidata: "Q900002",
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
    wikidata: "Q900003",
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
    if (!a) return json({ error: "Not Found" }, 404);
    const { wikidata, ...rest } = a;
    if (!url.searchParams.get("inc")?.includes("url-rels")) return json(rest);
    const relations = wikidata
      ? [{ type: "wikidata", url: { resource: `https://www.wikidata.org/wiki/${wikidata}` } }]
      : [];
    return json({ ...rest, relations });
  }
  if (path === "/genre/all") return json({ "genre-count": 0, genres: [] });
  return json({ error: "Not Found" }, 404);
};

// ------------------------------------------------------------------ Wikidata and Commons (step 5.11)

const PHOTOS: Record<
  string,
  { file: string; licence: string; licenceUrl: string; artist: string }
> = {
  Q900001: {
    file: "File:Stub Radiohead live.jpg",
    licence: "CC BY-SA 3.0",
    licenceUrl: "https://creativecommons.org/licenses/by-sa/3.0",
    artist: '<a href="//commons.wikimedia.org/wiki/User:Stub">Stub Fotograf</a>',
  },
  Q900002: {
    file: "File:Stub Bjork.jpg",
    licence: "CC BY-NC 2.0",
    licenceUrl: "https://creativecommons.org/licenses/by-nc/2.0",
    artist: "Stub",
  },
  Q900003: {
    file: "File:Stub Metallica.jpg",
    licence: "GFDL",
    licenceUrl: "https://www.gnu.org/copyleft/fdl.html",
    artist: "Stub",
  },
};

/** A `fetch` for the Commons client: Wikidata claims, Commons imageinfo and the thumbnail, all invented. */
export const commonsStubFetch: typeof fetch = async (input) => {
  const url = new URL(
    typeof input === "string" ? input : input instanceof URL ? input.href : input.url,
  );
  if (url.hostname === "www.wikidata.org") {
    const photo = PHOTOS[url.searchParams.get("entity") ?? ""];
    return json({
      claims: photo
        ? { P18: [{ rank: "normal", mainsnak: { datavalue: { value: photo.file.slice(5) } } }] }
        : {},
    });
  }
  if (url.hostname === "commons.wikimedia.org") {
    const title = url.searchParams.get("titles") ?? "";
    const photo = Object.values(PHOTOS).find((p) => p.file === title);
    if (!photo) return json({ query: { pages: [{ title, missing: true }] } });
    const slug = encodeURIComponent(title.slice(5).replace(/ /g, "_"));
    return json({
      query: {
        pages: [
          {
            title,
            imageinfo: [
              {
                thumburl: `https://upload.wikimedia.org/stub/${slug}`,
                descriptionurl: `https://commons.wikimedia.org/wiki/File:${slug}`,
                mime: "image/jpeg",
                extmetadata: {
                  LicenseShortName: { value: photo.licence },
                  LicenseUrl: { value: photo.licenceUrl },
                  Artist: { value: photo.artist },
                },
              },
            ],
          },
        ],
      },
    });
  }
  if (url.hostname === "upload.wikimedia.org") {
    const { default: sharp } = await import("sharp");
    const bytes = await sharp({
      create: { width: 600, height: 800, channels: 3, background: { r: 64, g: 92, b: 160 } },
    })
      .jpeg()
      .toBuffer();
    return new Response(new Uint8Array(bytes), { headers: { "content-type": "image/jpeg" } });
  }
  return json({ error: "Not Found" }, 404);
};
