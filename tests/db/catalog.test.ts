// Step 5.3b: MusicBrainz artists in the database (persisting with the external id, merges as redirects, deletions
// as unavailable) and artists in a Music DNA (cap, duplicates through redirects, Undo position, J2 E4 collapse).
// MusicBrainz itself is replaced by a fake `fetch` with ids made up for this run, so nothing here touches the
// network or a real artist row.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq, inArray, or } from "drizzle-orm";
import { setCatalogClient } from "@/lib/catalog/client";
import { CatalogUnavailable, createMusicBrainzClient } from "@/lib/catalog/musicbrainz";
import { closeDb, db } from "@/lib/db/client";
import {
  artist,
  canonicalRedirect,
  externalId,
  musicDnaEntry,
  privacySettings,
  profile,
  user,
} from "@/lib/db/schema";
import { seedGenres } from "@/lib/db/seed-genres";
import { addRedirect, artistFromMbid, artistPage } from "@/lib/data/catalog";
import {
  addDnaArtist,
  findArtists,
  forgetGenreCatalogue,
  moveDnaEntry,
  ownMusicDna,
  removeDnaEntry,
} from "@/lib/data/music-dna";

const RUN = Date.now().toString(36);
const users: string[] = [];
const mb: string[] = Array.from({ length: 14 }, () => randomUUID());
const OLD = mb[12]!; // merged into mb[0]
const GONE = mb[13]!;
let down = false;
let requests = 0;

const name = (i: number) => (i === 1 || i === 2 ? `Twin ${RUN}` : `Artist ${i} ${RUN}`);
const raw = (i: number) => ({
  id: mb[i],
  name: name(i),
  "sort-name": name(i),
  disambiguation: i === 1 ? "the first one" : i === 2 ? "the second one" : undefined,
  country: i === 1 ? "HR" : i === 2 ? "GB" : "US",
  "life-span": { begin: "1990", end: i === 2 ? "2001" : undefined },
  tags: [
    { name: "jazz", count: 9 },
    { name: "not a genre", count: 8 },
    { name: "rock", count: 5 },
    { name: "pop", count: 1 },
  ],
  score: 100,
});

const fakeFetch: typeof fetch = async (input) => {
  requests++;
  if (down) return new Response("{}", { status: 503 });
  const url = new URL(String(input));
  if (url.pathname.endsWith("/artist")) {
    const q = url.searchParams.get("query") ?? "";
    const hits = mb
      .slice(0, 12)
      .flatMap((_, i) =>
        q.includes("Twin") && (i === 1 || i === 2)
          ? [raw(i)]
          : q.includes(`Artist ${i} `)
            ? [raw(i)]
            : [],
      );
    return Response.json({ artists: hits });
  }
  const id = url.pathname.split("/").pop()!;
  if (id === GONE) return Response.json({ error: "Not Found" }, { status: 404 });
  const i = id === OLD ? 0 : mb.indexOf(id);
  return i >= 0 ? Response.json(raw(i)) : Response.json({}, { status: 404 });
};

async function member(key: string) {
  const [u] = await db()
    .insert(user)
    .values({ name: `Cat ${key}`, email: `${key}-${RUN}@catalog.test`, emailVerified: true })
    .returning({ id: user.id });
  users.push(u!.id);
  await db()
    .insert(profile)
    .values({
      userId: u!.id,
      username: `c${key}_${RUN}`.slice(0, 30),
      displayName: `Cat ${key}`,
      visibility: "public",
      onboardedAt: new Date(),
    });
  await db().insert(privacySettings).values({ userId: u!.id });
  return u!.id;
}

async function idFor(i: number) {
  const r = await artistFromMbid(mb[i]!);
  if (!r.ok) throw new Error(`artist ${i} not stored`);
  return r.id;
}

beforeAll(async () => {
  await seedGenres();
  forgetGenreCatalogue();
  setCatalogClient(
    createMusicBrainzClient({ contact: "test", fetch: fakeFetch, gapMs: 0, sleep: async () => {} }),
  );
});

afterAll(async () => {
  setCatalogClient(undefined);
  if (users.length) await db().delete(user).where(inArray(user.id, users));
  const rows = await db().select({ id: artist.id }).from(artist).where(inArray(artist.mbid, mb));
  const ids = rows.map((r) => r.id);
  if (ids.length) {
    await db()
      .delete(canonicalRedirect)
      .where(or(inArray(canonicalRedirect.fromId, ids), inArray(canonicalRedirect.toId, ids)));
    await db().delete(externalId).where(inArray(externalId.entityId, ids));
    await db().delete(artist).where(inArray(artist.id, ids));
  }
  await closeDb();
});

describe("MusicBrainz artists in the database", () => {
  it("stores an artist once, with its external id, and reuses the stored row without a request", async () => {
    const before = requests;
    const a = await idFor(3);
    const b = await idFor(3);
    expect(a).toBe(b);
    expect(requests - before).toBe(1);
    const [ext] = await db().select().from(externalId).where(eq(externalId.entityId, a));
    expect(ext).toMatchObject({ provider: "musicbrainz", entityType: "artist", externalId: mb[3] });
    expect(await artistPage(a)).toMatchObject({ name: name(3), country: "US", beginYear: 1990 });
  });

  it("adds an artist from the last search without another request", async () => {
    const u = await member("search");
    const found = await findArtists(u, `Artist 4 ${RUN}`, "hr");
    expect(found).toHaveLength(1);
    const before = requests;
    await idFor(4);
    expect(requests).toBe(before);
  });

  it("shows main genres from our catalogue, and country and years only for same names (D-060 (2))", async () => {
    const u = await member("meta");
    const twins = await findArtists(u, `Twin ${RUN}`, "en");
    expect(twins.map((t) => t.sameName)).toEqual([true, true]);
    expect(twins[0]).toMatchObject({ genres: ["Jazz", "Rock"], country: "Croatia", years: "1990" });
    expect(twins[1]).toMatchObject({ country: "United Kingdom", years: "1990–2001" });
    const [single] = await findArtists(u, `Artist 5 ${RUN}`, "hr");
    expect(single).toMatchObject({ sameName: false, genres: ["Jazz", "Rock"] });
  });

  it("records a merge as a redirect and resolves the old row to the new one (invariant 5)", async () => {
    // The old id was stored before the merge.
    const [old] = await db()
      .insert(artist)
      .values({ mbid: OLD, name: `Old ${RUN}`, lastSyncedAt: new Date(0) })
      .returning({ id: artist.id });
    const r = await artistFromMbid(OLD);
    expect(r.ok).toBe(true);
    const target = await idFor(0);
    if (r.ok) expect(r.id).toBe(target);
    expect((await artistPage(old!.id))?.id).toBe(target);
    expect((await artistPage(old!.id))?.redirectedFrom).toBe(old!.id);
  });

  it("marks an artist gone from the source unavailable and refuses to add it (J2 E5)", async () => {
    const [row] = await db()
      .insert(artist)
      .values({ mbid: GONE, name: `Gone ${RUN}`, lastSyncedAt: new Date(0) })
      .returning({ id: artist.id });
    expect(await artistFromMbid(GONE)).toEqual({ ok: false, reason: "not-found" });
    expect((await artistPage(row!.id))?.availability).toBe("unavailable");
  });

  it("throws CatalogUnavailable when MusicBrainz cannot answer", async () => {
    down = true;
    try {
      await expect(artistFromMbid(mb[11]!)).rejects.toBeInstanceOf(CatalogUnavailable);
    } finally {
      down = false;
    }
  });
});

describe("artists in a Music DNA", () => {
  it("adds in order, refuses duplicates and caps at ten; artists have no minimum", async () => {
    const u = await member("cap");
    for (let i = 0; i < 10; i++) {
      const r = await addDnaArtist(u, await idFor(i), "hr");
      expect(r.ok).toBe(true);
    }
    const dup = await addDnaArtist(u, await idFor(0), "hr");
    expect(dup).toMatchObject({ ok: false, reason: "duplicate" });
    expect(dup.entryId).toBeTruthy();
    expect(await addDnaArtist(u, await idFor(10), "hr")).toMatchObject({
      ok: false,
      reason: "full",
    });
    const dna = await ownMusicDna(u, "hr");
    expect(dna.artists.map((a) => a.mbid)).toEqual(mb.slice(0, 10));
    // Remove everything: allowed (J2 E6).
    for (const a of dna.artists) expect((await removeDnaEntry(u, a.entryId, "hr")).ok).toBe(true);
    expect((await ownMusicDna(u, "hr")).artists).toEqual([]);
  });

  it("Undo puts the artist back where it was, and moves follow the shown order", async () => {
    const u = await member("undo");
    for (const i of [3, 4, 5]) await addDnaArtist(u, await idFor(i), "hr");
    const shown = (await ownMusicDna(u, "hr")).artists;
    const rm = await removeDnaEntry(u, shown[1]!.entryId, "hr");
    expect(rm.removed).toMatchObject({ kind: "artist", position: 1 });
    await addDnaArtist(u, rm.removed!.subjectId, "hr", rm.removed!.position);
    const back = (await ownMusicDna(u, "hr")).artists;
    expect(back.map((a) => a.mbid)).toEqual([mb[3], mb[4], mb[5]]);
    const moved = await moveDnaEntry(
      u,
      back[2]!.entryId,
      -1,
      back.map((a) => a.entryId),
      "hr",
    );
    expect(moved.dna.artists.map((a) => a.mbid)).toEqual([mb[3], mb[5], mb[4]]);
  });

  it("an entry follows a merge; two entries for the merged artists show once, at the higher place (J2 E4)", async () => {
    const u = await member("merge");
    const [a] = await db()
      .insert(artist)
      .values({ name: `Merged away ${RUN}`, mbid: null })
      .returning({ id: artist.id });
    const target = await idFor(6);
    await addDnaArtist(u, await idFor(7), "hr");
    await addDnaArtist(u, a!.id, "hr");
    await addDnaArtist(u, target, "hr");
    expect(await addRedirect(a!.id, target, "artist", "test merge")).toBe(true);
    const dna = await ownMusicDna(u, "hr");
    expect(dna.artists.map((x) => x.id)).toEqual([await idFor(7), target]);
    // Adding the merged-away artist again is a duplicate of the canonical one.
    expect(await addDnaArtist(u, a!.id, "hr")).toMatchObject({ ok: false, reason: "duplicate" });
    // The member's own rows are untouched (invariant 3): three entries remain.
    const rows = await db().select().from(musicDnaEntry).where(eq(musicDnaEntry.userId, u));
    expect(rows).toHaveLength(3);
    await db().delete(canonicalRedirect).where(eq(canonicalRedirect.fromId, a!.id));
    await db().delete(musicDnaEntry).where(eq(musicDnaEntry.userId, u));
    await db().delete(artist).where(eq(artist.id, a!.id));
  });

  it("never touches another member's entries (invariant 3)", async () => {
    const owner = await member("own");
    const other = await member("oth");
    await addDnaArtist(owner, await idFor(8), "hr");
    const entry = (await ownMusicDna(owner, "hr")).artists[0]!;
    expect((await removeDnaEntry(other, entry.entryId, "hr")).ok).toBe(false);
    expect((await ownMusicDna(owner, "hr")).artists).toHaveLength(1);
  });
});
