import { describe, expect, it } from "vitest";
import { spiralaModel, segmentAt } from "@/components/motifs/spirala-model";
import { genreTraits } from "@/lib/music/genre-traits";

describe("Spirala model (D-048, D-052, D-067)", () => {
  const genres = ["Metal", "Jazz", "Elektronika"];
  const artists = [
    { name: "A", genres: ["Metal"] },
    { name: "B", genres: ["Jazz"] },
  ];

  it("is deterministic: the same picks give the same helix", () => {
    const a = spiralaModel(genres, artists);
    const b = spiralaModel(genres, artists);
    expect(a.seed).toBe(b.seed);
    expect(a.segs.map((s) => [s.u0, s.u1, s.ph, s.spin])).toEqual(
      b.segs.map((s) => [s.u0, s.u1, s.ph, s.spin]),
    );
    expect(a.beads).toEqual(b.beads);
  });

  it("differs when only the artists differ", () => {
    const a = spiralaModel(genres, artists);
    const b = spiralaModel(genres, [{ name: "C", genres: ["Metal"] }]);
    expect(a.seed).not.toBe(b.seed);
  });

  it("covers the whole length with one section per genre, earlier picks weighing more", () => {
    const m = spiralaModel(genres, []);
    expect(m.segs).toHaveLength(3);
    expect(m.segs[0]!.u0).toBe(0);
    expect(m.segs.at(-1)!.u1).toBeCloseTo(1);
    const len = m.segs.map((s) => s.u1 - s.u0);
    expect(len[0]).toBeGreaterThan(len[2]!);
  });

  it("places each artist as a bead inside their genre's section", () => {
    const m = spiralaModel(genres, artists);
    for (const b of m.beads) {
      const s = m.segs[b.si]!;
      expect(b.u).toBeGreaterThan(s.u0);
      expect(b.u).toBeLessThan(s.u1);
    }
    expect(m.beads[0]!.si).toBe(0);
    expect(m.beads[1]!.si).toBe(1);
  });

  it("has no sections for an empty Music DNA", () => {
    const m = spiralaModel([], []);
    expect(m.segs).toEqual([]);
    expect(m.beads).toEqual([]);
  });

  it("finds the section under a point", () => {
    const m = spiralaModel(genres, []);
    expect(segmentAt(m, 0)).toBe(0);
    expect(segmentAt(m, 0.999)).toBe(2);
  });
});

describe("genre traits", () => {
  it("marks heavy music as family 0 (the charred core, D-067 (4))", () => {
    expect(genreTraits("Metal").f).toBe(0);
    expect(genreTraits("metal").f).toBe(0);
  });
  it("lets a local genre inherit its parent's traits", () => {
    const t = genreTraits("Tamburica");
    expect(t.parent).toBe("Folk");
    expect(t.c).toBe(genreTraits("Folk").c);
  });
  it("gives an unknown genre the neutral family instead of a guessed one", () => {
    expect(genreTraits("Nepoznato").f).toBe(-1);
  });
});
