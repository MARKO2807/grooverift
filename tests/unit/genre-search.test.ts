import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  MAIN_GENRE_SLUGS,
  SUGGESTED_GENRE_SLUGS,
  buildGenreIndex,
  fold,
  searchGenres,
  suggestedGenres,
  type GenreOption,
} from "@/lib/music/genre-search";
import { GENRE_TRAITS, genreColour, genreTraits } from "@/lib/music/genre-traits";

type Row = [string, string, string, number | null, string | null, number];
const rows = (
  JSON.parse(readFileSync("src/lib/db/seed-data/genres.json", "utf8")) as { rows: Row[] }
).rows;

describe("genre seed file (step 5.3a)", () => {
  const bySlug = new Map(rows.map((r) => [r[0], r]));

  it("has unique slugs and parents that are genres with their own traits", () => {
    expect(bySlug.size).toBe(rows.length);
    const traitNames = new Set(GENRE_TRAITS.map((t) => t.n));
    for (const [, , , family, parent] of rows) {
      if (parent === null) continue;
      const p = bySlug.get(parent)!;
      expect(traitNames.has(p[1])).toBe(true);
      expect(family).toBe(p[3]);
    }
  });

  it("contains every main and suggested genre and every genre with traits", () => {
    for (const s of [...MAIN_GENRE_SLUGS, ...SUGGESTED_GENRE_SLUGS])
      expect(bySlug.has(s)).toBe(true);
    const hrNames = new Set(rows.map((r) => r[1]));
    for (const t of GENRE_TRAITS) expect(hrNames.has(t.n)).toBe(true);
  });

  it("no longer defaults unmatched genres to Folk (plan 5.3): they have no family", () => {
    expect(bySlug.get("aak")!.slice(3, 5)).toEqual([null, null]);
    expect(bySlug.get("zouglou")![4]).toBeNull();
    // Folk by keyword stays Folk.
    expect(bySlug.get("tamburica")![4]).toBe("folk");
  });
});

const opt = (
  slug: string,
  name: string,
  rank: number,
  parentName: string | null = null,
): GenreOption => ({
  id: slug,
  slug,
  name,
  parentName,
  traitKey: parentName,
  rank,
});

describe("genre search", () => {
  const index = buildGenreIndex(
    [
      opt("metal", "Metal", 1090),
      opt("death-metal", "Death metal", 60, "Metal"),
      opt("djent", "Djent", 20, "Metal"),
      opt("hip-hop", "Rap", 1098),
      opt("classical", "Klasična", 1095),
      opt("baroque", "Baroque", 40, "Klasična"),
      opt("pop", "Pop", 1100),
    ],
    new Map([
      ["death-metal", "metal"],
      ["djent", "metal"],
      ["baroque", "classical"],
    ]),
  );

  it("folds accents and đ", () => {
    expect(fold("Klasična")).toBe("klasicna");
    expect(fold("Đuro")).toBe("duro");
  });

  it("ranks exact, then starts-with, then word start, then contains, then family", () => {
    expect(searchGenres(index, "metal").map((g) => g.slug)).toEqual([
      "metal",
      "death-metal",
      "djent",
    ]);
    expect(searchGenres(index, "hip hop")[0]!.slug).toBe("hip-hop");
    expect(searchGenres(index, "klasicna").map((g) => g.slug)).toEqual(["classical", "baroque"]);
  });

  it("leaves out picked genres and shows suggestions for an empty query", () => {
    expect(searchGenres(index, "metal", new Set(["metal"])).map((g) => g.slug)).toEqual([
      "death-metal",
      "djent",
    ]);
    expect(suggestedGenres(index).map((g) => g.slug)).toEqual([
      "pop",
      "hip-hop",
      "classical",
      "metal",
    ]);
    expect(searchGenres(index, "   ").map((g) => g.slug)).toEqual([
      "pop",
      "hip-hop",
      "classical",
      "metal",
    ]);
  });
});

describe("genre traits with a trait key", () => {
  it("uses the family's traits under the genre's own name, and neutral for no family", () => {
    const dm = genreTraits("Death metal", "Metal");
    expect(dm).toMatchObject({ n: "Death metal", f: 0, parent: "Metal" });
    expect(genreTraits("Aak", null).f).toBe(-1);
    expect(genreColour("Electronic", "Elektronika")).toBe(genreTraits("Elektronika").c);
  });
});
