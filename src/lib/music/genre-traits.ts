// Genre traits that shape the Spirala (D-048, D-052, D-067 (4)). Ported from design/prototypes/pulse/data.js.
// Step 5.3 maps the CC0 genre catalogue onto these families (the D-062 mapping, reviewed there); until then this
// table covers the main genres the prototype used. A genre without a family gets the neutral traits below
// (plan 5.3: "no family" with a neutral colour instead of defaulting to Folk).
//
// f  family: 0 heavy (charred core, D-067), 1 rock, 2 pop, 3 hip-hop/R&B, 4 electronic, 5 soul/jazz/latin,
//    6 roots/acoustic/classical, -1 none
// e  energy (section height)   t tempo (twist and spin)   j jaggedness (electric edge)   s swing
// w  warmth                     k behaviour                 c colour (meaningful, D-052)

export type GenreBehaviour = "drive" | "sine" | "swing" | "burst" | "saw" | "square" | "swell";
export type GenreTraits = {
  n: string;
  f: number;
  e: number;
  t: number;
  j: number;
  s: number;
  w: number;
  k: GenreBehaviour;
  c: string;
};

export const GENRE_TRAITS: readonly GenreTraits[] = [
  { n: "Rock", f: 1, e: 0.75, t: 0.6, j: 0.55, s: 0.2, w: 0.18, k: "drive", c: "#FF586B" },
  { n: "Pop", f: 2, e: 0.6, t: 0.6, j: 0.12, s: 0.2, w: 0.55, k: "sine", c: "#FF84B8" },
  { n: "K-pop", f: 2, e: 0.7, t: 0.68, j: 0.2, s: 0.25, w: 0.5, k: "sine", c: "#C88BFF" },
  { n: "Latino", f: 5, e: 0.7, t: 0.62, j: 0.2, s: 0.8, w: 0.66, k: "swing", c: "#FF8A3D" },
  { n: "Rap", f: 3, e: 0.72, t: 0.5, j: 0.45, s: 0.7, w: 0.32, k: "burst", c: "#4F8CFF" },
  { n: "Trap", f: 3, e: 0.78, t: 0.35, j: 0.6, s: 0.62, w: 0.28, k: "burst", c: "#6E7CFF" },
  { n: "Metal", f: 0, e: 1, t: 0.85, j: 1, s: 0.08, w: 0, k: "saw", c: "#E23B55" },
  { n: "Nu metal", f: 0, e: 0.95, t: 0.6, j: 0.85, s: 0.35, w: 0.05, k: "saw", c: "#EC4F63" },
  { n: "Punk", f: 0, e: 0.95, t: 0.95, j: 0.8, s: 0.1, w: 0.08, k: "saw", c: "#FF5A78" },
  { n: "Grunge", f: 0, e: 0.8, t: 0.5, j: 0.7, s: 0.22, w: 0.1, k: "drive", c: "#C95B6E" },
  { n: "Indie", f: 1, e: 0.5, t: 0.55, j: 0.35, s: 0.3, w: 0.3, k: "drive", c: "#FF8F8A" },
  { n: "Alternativa", f: 1, e: 0.6, t: 0.55, j: 0.45, s: 0.3, w: 0.22, k: "drive", c: "#FF7480" },
  {
    n: "Elektronika",
    f: 4,
    e: 0.62,
    t: 0.62,
    j: 0.35,
    s: 0.25,
    w: 0.48,
    k: "square",
    c: "#5ACFE3",
  },
  { n: "Techno", f: 4, e: 0.82, t: 0.78, j: 0.42, s: 0.04, w: 0.42, k: "square", c: "#27BFD6" },
  { n: "House", f: 4, e: 0.72, t: 0.66, j: 0.25, s: 0.3, w: 0.5, k: "square", c: "#3DD6B4" },
  { n: "Drum & bass", f: 4, e: 0.9, t: 1, j: 0.6, s: 0.4, w: 0.4, k: "burst", c: "#47AEF7" },
  { n: "R&B", f: 3, e: 0.45, t: 0.4, j: 0.1, s: 0.6, w: 0.62, k: "sine", c: "#8F86FF" },
  { n: "Soul", f: 5, e: 0.5, t: 0.4, j: 0.1, s: 0.62, w: 0.78, k: "sine", c: "#FFB45A" },
  { n: "Funk", f: 5, e: 0.75, t: 0.55, j: 0.3, s: 0.9, w: 0.7, k: "swing", c: "#FF9845" },
  { n: "Disco", f: 2, e: 0.72, t: 0.66, j: 0.2, s: 0.5, w: 0.6, k: "square", c: "#E58CF2" },
  { n: "Jazz", f: 5, e: 0.45, t: 0.5, j: 0.2, s: 1, w: 0.85, k: "swing", c: "#3FC98A" },
  { n: "Blues", f: 5, e: 0.45, t: 0.35, j: 0.3, s: 0.75, w: 0.8, k: "swing", c: "#7F9DCB" },
  { n: "Reggae", f: 6, e: 0.45, t: 0.35, j: 0.15, s: 0.8, w: 0.72, k: "swing", c: "#93CF57" },
  { n: "Country", f: 6, e: 0.5, t: 0.5, j: 0.2, s: 0.45, w: 0.88, k: "drive", c: "#D9894F" },
  { n: "Folk", f: 6, e: 0.3, t: 0.4, j: 0.15, s: 0.35, w: 0.92, k: "swell", c: "#D8B06E" },
  { n: "Kantautorska", f: 6, e: 0.25, t: 0.3, j: 0.1, s: 0.4, w: 0.95, k: "swell", c: "#E7C48D" },
  { n: "Klasična", f: 6, e: 0.4, t: 0.3, j: 0.05, s: 0.5, w: 1, k: "swell", c: "#F2E5C6" },
  {
    n: "Filmska glazba",
    f: 6,
    e: 0.45,
    t: 0.35,
    j: 0.08,
    s: 0.4,
    w: 0.96,
    k: "swell",
    c: "#C7B8E8",
  },
];

/** Local genres that inherit a parent's traits (prototype `moreGenres`; the CC0 list joins them in 5.3). */
const CHILDREN: Record<string, string> = {
  Zabavna: "Pop",
  Etno: "Folk",
  Tamburica: "Folk",
  Šansona: "Kantautorska",
};

/** Neutral traits for a genre with no family: calm, mid height, a grey that sits on the dark surface. */
const NEUTRAL: Omit<GenreTraits, "n"> = {
  f: -1,
  e: 0.5,
  t: 0.45,
  j: 0.2,
  s: 0.35,
  w: 0.5,
  k: "drive",
  c: "#9AA0AE",
};

const BY_NAME = new Map(GENRE_TRAITS.map((g) => [g.n.toLowerCase(), g]));

export function genreTraits(name: string): GenreTraits & { parent?: string } {
  const own = BY_NAME.get(name.toLowerCase());
  if (own) return own;
  const parent = CHILDREN[name];
  const p = parent ? BY_NAME.get(parent.toLowerCase()) : undefined;
  if (p) return { ...p, n: name, parent: p.n };
  return { ...NEUTRAL, n: name };
}
