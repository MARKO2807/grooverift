// Step 5.3a: the genre catalogue and the Music DNA data layer against the real database. Fixtures are fictional
// members with @dna.test emails; deleting them removes their entries (cascade). The genre table is reference data
// and is (re)seeded idempotently, never deleted.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq, inArray } from "drizzle-orm";
import { closeDb, db } from "@/lib/db/client";
import { genre, musicDnaEntry, privacySettings, profile, user } from "@/lib/db/schema";
import { seedGenres } from "@/lib/db/seed-genres";
import { loadViewer } from "@/lib/data/facts";
import {
  addDnaGenre,
  dnaAudience,
  findGenres,
  forgetGenreCatalogue,
  genreSuggestions,
  moveDnaEntry,
  musicDnaFor,
  ownMusicDna,
  removeDnaEntry,
  setDnaAudience,
} from "@/lib/data/music-dna";

const RUN = Date.now().toString(36);
const ids: Record<string, string> = {};
const g: Record<string, string> = {};

async function member(key: string) {
  const [u] = await db()
    .insert(user)
    .values({ name: `Dna ${key}`, email: `${key}-${RUN}@dna.test`, emailVerified: true })
    .returning({ id: user.id });
  ids[key] = u!.id;
  await db()
    .insert(profile)
    .values({
      userId: u!.id,
      username: `${key}_${RUN}`.slice(0, 30),
      displayName: `Dna ${key}`,
      visibility: "public",
      onboardedAt: new Date(),
    });
  await db().insert(privacySettings).values({ userId: u!.id });
  return u!.id;
}

beforeAll(async () => {
  await seedGenres();
  forgetGenreCatalogue();
  const rows = await db()
    .select({ id: genre.id, slug: genre.slug })
    .from(genre)
    .where(
      inArray(genre.slug, [
        "jazz",
        "metal",
        "death-metal",
        "pop",
        "rock",
        "hip-hop",
        "techno",
        "house",
        "funk",
        "soul",
        "blues",
        "punk",
      ]),
    );
  for (const r of rows) g[r.slug] = r.id;
  await member("owner");
  await member("other");
});

afterAll(async () => {
  await db()
    .delete(user)
    .where(inArray(user.id, Object.values(ids)));
  await closeDb();
});

const order = async (userId: string) => (await ownMusicDna(userId, "hr")).genres.map((x) => x.slug);

describe("genre catalogue", () => {
  it("seeds idempotently with families and parents", async () => {
    const before = await db().select({ id: genre.id }).from(genre);
    await seedGenres();
    const after = await db().select({ id: genre.id }).from(genre);
    expect(after.length).toBe(before.length);
    expect(after.length).toBeGreaterThan(2000);
    const [dm] = await db().select().from(genre).where(eq(genre.slug, "death-metal"));
    expect(dm!.parentId).toBe(g["metal"]);
    expect(dm!.family).toBe(0);
  });

  it("searches by name, alias and family, in the member's language, leaving out their picks", async () => {
    const owner = ids["owner"]!;
    const hr = await findGenres(owner, "hip hop", "hr");
    expect(hr[0]!.slug).toBe("hip-hop");
    expect(hr[0]!.name).toBe("Rap");
    const en = await findGenres(owner, "hip hop", "en");
    expect(en[0]!.name).toBe("Hip hop");
    const metal = await findGenres(owner, "death met", "hr");
    expect(metal[0]).toMatchObject({ slug: "death-metal", parentName: "Metal", traitKey: "Metal" });
    const klasicna = await findGenres(owner, "klasicna", "hr");
    expect(klasicna[0]!.slug).toBe("classical");
    const sugg = await genreSuggestions("hr");
    expect(sugg.slice(0, 3).map((x) => x.slug)).toEqual(["pop", "rock", "hip-hop"]);
  });
});

describe("Music DNA writes", () => {
  it("adds in order, refuses duplicates and unknown genres, and caps at ten", async () => {
    const u = ids["owner"]!;
    expect((await addDnaGenre(u, g["jazz"]!, "hr")).ok).toBe(true);
    expect((await addDnaGenre(u, g["death-metal"]!, "hr")).ok).toBe(true);
    const dup = await addDnaGenre(u, g["jazz"]!, "hr");
    expect(dup).toMatchObject({ ok: false, reason: "duplicate" });
    expect(dup.entryId).toBeTruthy();
    expect(await addDnaGenre(u, "00000000-0000-4000-8000-000000000000", "hr")).toMatchObject({
      ok: false,
      reason: "not-found",
    });
    expect(await addDnaGenre(u, "not-a-uuid", "hr")).toMatchObject({
      ok: false,
      reason: "not-found",
    });
    expect(await order(u)).toEqual(["jazz", "death-metal"]);

    for (const s of ["pop", "rock", "hip-hop", "techno", "house", "funk", "soul", "blues"])
      expect((await addDnaGenre(u, g[s]!, "hr")).ok).toBe(true);
    const full = await addDnaGenre(u, g["punk"]!, "hr");
    expect(full).toMatchObject({ ok: false, reason: "full" });
    expect(full.dna.genres).toHaveLength(10);
  });

  it("concurrent adds cannot pass the cap (J2 E3)", async () => {
    const u = await member("race");
    const slugs = Object.keys(g);
    const results = await Promise.all(slugs.map((s) => addDnaGenre(u, g[s]!, "hr")));
    expect(results.filter((r) => r.ok)).toHaveLength(10);
    expect((await ownMusicDna(u, "hr")).genres).toHaveLength(10);
  });

  it("removes with an Undo position, keeps positions compact, and never goes below two genres", async () => {
    const u = ids["owner"]!;
    const dna = await ownMusicDna(u, "hr");
    const pop = dna.genres.find((x) => x.slug === "pop")!;
    const r = await removeDnaEntry(u, pop.entryId, "hr");
    expect(r.ok).toBe(true);
    expect(r.removed).toMatchObject({ kind: "genre", subjectId: g["pop"], position: 2 });
    const positions = await db()
      .select({ p: musicDnaEntry.position })
      .from(musicDnaEntry)
      .where(eq(musicDnaEntry.userId, u))
      .orderBy(musicDnaEntry.position);
    expect(positions.map((x) => x.p)).toEqual([...Array(9).keys()]);
    // Undo puts it back at the same place.
    expect((await addDnaGenre(u, g["pop"]!, "hr", 2)).ok).toBe(true);
    expect((await order(u))[2]).toBe("pop");

    // Down to two, then the minimum holds.
    for (const e of (await ownMusicDna(u, "hr")).genres.slice(2))
      expect((await removeDnaEntry(u, e.entryId, "hr")).ok).toBe(true);
    const last = (await ownMusicDna(u, "hr")).genres;
    expect(last).toHaveLength(2);
    expect(await removeDnaEntry(u, last[0]!.entryId, "hr")).toMatchObject({
      ok: false,
      reason: "minimum",
    });
  });

  it("moves only against the order the editor saw (J2 E3)", async () => {
    const u = ids["owner"]!;
    await addDnaGenre(u, g["pop"]!, "hr");
    const [a, b, c] = (await ownMusicDna(u, "hr")).genres;
    const seen = [a!.entryId, b!.entryId, c!.entryId];
    expect((await moveDnaEntry(u, c!.entryId, -1, seen, "hr")).ok).toBe(true);
    expect(await order(u)).toEqual([a!.slug, c!.slug, b!.slug]);
    // The same move again with the old order is stale and changes nothing.
    const stale = await moveDnaEntry(u, c!.entryId, -1, seen, "hr");
    expect(stale).toMatchObject({ ok: false, reason: "stale" });
    expect(stale.dna.genres.map((x) => x.slug)).toEqual([a!.slug, c!.slug, b!.slug]);
    // At the edge nothing moves.
    const now = (await ownMusicDna(u, "hr")).genres.map((x) => x.entryId);
    expect((await moveDnaEntry(u, now[0]!, -1, now, "hr")).ok).toBe(true);
    expect((await ownMusicDna(u, "hr")).genres.map((x) => x.entryId)).toEqual(now);
  });

  it("never touches another member's entries (invariant 3)", async () => {
    const owner = ids["owner"]!;
    const other = ids["other"]!;
    const target = (await ownMusicDna(owner, "hr")).genres[0]!;
    expect(await removeDnaEntry(other, target.entryId, "hr")).toMatchObject({
      ok: false,
      reason: "not-found",
    });
    const seen = (await ownMusicDna(owner, "hr")).genres.map((x) => x.entryId);
    expect(await moveDnaEntry(other, target.entryId, 1, seen, "hr")).toMatchObject({
      ok: false,
      reason: "stale",
    });
    expect((await ownMusicDna(owner, "hr")).genres.map((x) => x.entryId)).toEqual(seen);
  });
});

describe("Music DNA audience", () => {
  it("follows the section setting through the policy", async () => {
    const owner = ids["owner"]!;
    const viewer = await loadViewer({ id: ids["other"]!, role: "member" });
    const anon = await loadViewer(null);
    expect(await musicDnaFor(viewer, owner, "hr")).not.toBeNull();
    expect(await musicDnaFor(anon, owner, "hr")).toBeNull(); // signed-out visitors never (D-022)
    await setDnaAudience(owner, "me");
    expect(await dnaAudience(owner)).toEqual({ audience: "me", profilePrivate: false });
    expect(await musicDnaFor(viewer, owner, "hr")).toBeNull();
    const self = await loadViewer({ id: owner, role: "member" });
    expect(await musicDnaFor(self, owner, "hr")).not.toBeNull();
    await setDnaAudience(owner, "followers");
    expect(await musicDnaFor(viewer, owner, "hr")).toBeNull(); // not a follower
    expect(await musicDnaFor(viewer, "not-a-uuid", "hr")).toBeNull();
  });
});
