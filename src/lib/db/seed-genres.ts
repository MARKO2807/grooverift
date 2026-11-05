import "@/lib/load-env";
import { readFileSync } from "node:fs";
import { sql } from "drizzle-orm";
import { closeDb, db } from "./client";
import { genre } from "./schema";

// The reference genre table (step 5.3a, D-096). Unlike the development seed this runs in every environment: the
// genre list is product data, not fictional members. Idempotent: rows are matched on the slug; names, family,
// parent and rank follow the file, while `active` (an admin may switch a genre off) and `mbid` (filled by the
// catalogue sync, A4) are left alone. Genres are never deleted here (Music DNA entries reference them).

type Row = [
  slug: string,
  nameHr: string,
  nameEn: string,
  family: number | null,
  parent: string | null,
  rank: number,
];

export function genreSeedRows(): Row[] {
  const file = new URL("./seed-data/genres.json", import.meta.url);
  return (JSON.parse(readFileSync(file, "utf8")) as { rows: Row[] }).rows;
}

const BATCH = 500;

export async function seedGenres(rows: Row[] = genreSeedRows()): Promise<number> {
  const d = db();
  await d.transaction(async (tx) => {
    for (let i = 0; i < rows.length; i += BATCH) {
      const chunk = rows.slice(i, i + BATCH);
      await tx
        .insert(genre)
        .values(
          chunk.map(([slug, nameHr, nameEn, family, , rank]) => ({
            slug,
            nameHr,
            nameEn,
            family,
            rank,
          })),
        )
        .onConflictDoUpdate({
          target: genre.slug,
          set: {
            nameHr: sql`excluded.name_hr`,
            nameEn: sql`excluded.name_en`,
            family: sql`excluded.family`,
            rank: sql`excluded.rank`,
          },
        });
    }
    // Parents by slug, in one statement per batch (a parent is always a genre with its own traits).
    for (let i = 0; i < rows.length; i += BATCH) {
      const chunk = rows.slice(i, i + BATCH);
      const values = sql.join(
        chunk.map(([slug, , , , parent]) => sql`(${slug}, ${parent}::text)`),
        sql`, `,
      );
      await tx.execute(sql`
        update genre g set parent_id = p.id
        from (values ${values}) as v(slug, parent)
        left join genre p on p.slug = v.parent
        where g.slug = v.slug and g.parent_id is distinct from p.id`);
    }
  });
  return rows.length;
}

const isCli = process.argv[1]?.endsWith("seed-genres.ts");
if (isCli) {
  seedGenres()
    .then((n) => console.log(`seed-genres: ${n} genres upserted`))
    .catch((error) => {
      console.error("seed-genres failed:", error instanceof Error ? error.message : error);
      process.exitCode = 1;
    })
    .finally(() => closeDb());
}
