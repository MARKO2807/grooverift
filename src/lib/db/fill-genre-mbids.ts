// `npm run catalog:genre-mbids`: fills `genre.mbid` from MusicBrainz's genre list by English name (step 5.3b,
// D-096 (3)). Reference data, safe to run again: it only sets an empty mbid, never changes names, families or
// `active`, and never deletes. About 22 requests at one per second. Needs MUSICBRAINZ_CONTACT.
import "@/lib/load-env";
import { and, eq, isNull, sql } from "drizzle-orm";
import { createMusicBrainzClient } from "@/lib/catalog/musicbrainz";
import { closeDb, db } from "@/lib/db/client";
import { genre } from "@/lib/db/schema";
import { env } from "@/lib/env";

async function main() {
  const client = createMusicBrainzClient({ contact: env().MUSICBRAINZ_CONTACT });
  if (!client.configured) throw new Error("MUSICBRAINZ_CONTACT is not set.");
  const list = await client.allGenres();
  console.log(`MusicBrainz genres: ${list.length}`);
  let filled = 0;
  for (const g of list) {
    const r = await db()
      .update(genre)
      .set({ mbid: g.mbid })
      .where(and(isNull(genre.mbid), eq(sql`lower(${genre.nameEn})`, g.name.toLowerCase())))
      .returning({ id: genre.id });
    filled += r.length;
  }
  const [left] = await db()
    .select({ n: sql<number>`count(*)::int` })
    .from(genre)
    .where(isNull(genre.mbid));
  console.log(`Filled ${filled}; genres still without a MusicBrainz id: ${left?.n ?? 0}.`);
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => closeDb());
