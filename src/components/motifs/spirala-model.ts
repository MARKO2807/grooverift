// The Spirala's deterministic model (ported from design/prototypes/pulse/dna.js `model`). Pure, no DOM:
// the same genres and artists always give the same helix (unit-tested).
import { genreTraits, type GenreTraits } from "@/lib/music/genre-traits";
import { AMBER, hash, hex, noise, rng, type RGB } from "./motif-lib";

export type SpiralaArtist = { name: string; genres: string[] };

export type Segment = {
  g: GenreTraits & { parent?: string };
  u0: number;
  u1: number;
  col: RGB;
  amp: number;
  ph: number;
  lambda: number;
  spin: number;
  bpm: number;
};
export type Bead = { si: number; u: number; strand: 0 | 1; col: RGB };
export type SpiralaModel = {
  segs: Segment[];
  beads: Bead[];
  seed: number;
  n1: (x: number) => number;
  n2: (x: number) => number;
};

export function spiralaModel(genres: string[], artists: SpiralaArtist[]): SpiralaModel {
  const gs = genres.map(genreTraits);
  const seed = hash(genres.join("|") + "#" + artists.map((a) => a.name).join("|"));
  const R = rng(seed);
  const fits = (a: SpiralaArtist, g: GenreTraits & { parent?: string }) =>
    a.genres.includes(g.n) || (!!g.parent && a.genres.includes(g.parent));
  // Earlier picks weigh more; every artist adds weight to their genre.
  const wts = gs.map((g, i) =>
    Math.min(
      2.4,
      1 + Math.max(0, 0.45 - i * 0.12) + 0.25 * artists.filter((a) => fits(a, g)).length,
    ),
  );
  const tot = wts.reduce((s, x) => s + x, 0) || 1;
  let acc = 0;
  const segs: Segment[] = gs.map((g, i) => {
    const w = wts[i]!;
    const s: Segment = {
      g,
      u0: acc / tot,
      u1: (acc + w) / tot,
      col: g.c ? hex(g.c) : AMBER,
      amp: 0.9 + R() * 0.2,
      ph: R() * Math.PI * 2,
      lambda: 64 - 36 * g.t + (R() * 8 - 4),
      spin: (0.5 + 1.7 * g.t) * (R() < 0.5 ? 1 : -1) * (0.85 + R() * 0.3),
      bpm: 84 + 70 * g.t,
    };
    acc += w;
    return s;
  });
  const beads: Bead[] = [];
  for (const a of artists) {
    let si = segs.findIndex((s) => fits(a, s.g));
    if (si < 0) si = Math.floor(R() * segs.length);
    const s = segs[si];
    if (!s) continue;
    beads.push({
      si,
      u: s.u0 + (0.22 + R() * 0.56) * (s.u1 - s.u0),
      strand: R() < 0.5 ? 0 : 1,
      col: s.col,
    });
  }
  return { segs, beads, seed, n1: noise(seed), n2: noise(seed ^ 0x2f) };
}

export function segmentAt(m: SpiralaModel, u: number, hint = 0): number {
  let i = hint;
  while (i < m.segs.length - 1 && u > m.segs[i]!.u1) i++;
  return i;
}
