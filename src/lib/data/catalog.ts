// Catalogue references resolve through canonical redirects (invariant 5, C-03): Music DNA, answers and
// catalogue cards keep working after MusicBrainz merges. Step 5.3 adds the MusicBrainz client.
import { eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { artist, canonicalRedirect } from "@/lib/db/schema";

const MAX_HOPS = 8;

/** Follows redirects from `id` to the canonical id. A loop or a chain longer than MAX_HOPS returns null. */
export async function resolveCanonicalId(id: string): Promise<string | null> {
  const seen = new Set<string>([id]);
  let current = id;
  for (let hop = 0; hop < MAX_HOPS; hop++) {
    const [r] = await db()
      .select({ toId: canonicalRedirect.toId })
      .from(canonicalRedirect)
      .where(eq(canonicalRedirect.fromId, current));
    if (!r) return current;
    if (seen.has(r.toId)) return null;
    seen.add(r.toId);
    current = r.toId;
  }
  return null;
}

/**
 * Records a merge (from → to). Refuses a redirect that would close a loop or point at a missing target, so
 * chains stay resolvable (review L6). The caller is the catalogue sync in step 5.3 or an admin.
 */
export async function addRedirect(
  fromId: string,
  toId: string,
  entityType: "artist" | "genre",
  reason?: string,
): Promise<boolean> {
  if (fromId === toId) return false;
  const target = await resolveCanonicalId(toId);
  if (!target || target === fromId) return false;
  await db().insert(canonicalRedirect).values({ fromId, toId, entityType, reason });
  return true;
}

/** Artists by (possibly merged) ids, each resolved to its canonical row. Order of the input is kept. */
export async function artistsByIds(ids: readonly string[]) {
  const canonical = await Promise.all(ids.map(resolveCanonicalId));
  const wanted = [...new Set(canonical.filter((x): x is string => !!x))];
  if (!wanted.length) return [];
  const rows = await db().select().from(artist).where(inArray(artist.id, wanted));
  const byId = new Map(rows.map((r) => [r.id, r]));
  return canonical.map((c) => (c ? (byId.get(c) ?? null) : null));
}
