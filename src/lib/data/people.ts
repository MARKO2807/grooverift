// People search (DISC-05 α, D-093 (3)): by display name or @username, trigram similarity with unaccent so "Zeljko"
// finds "Željko" (migration 0005: search_fold(), GIN indexes). The SQL already keeps out everyone the result must
// never contain (not discoverable, unfinished onboarding, not active, blocked either way, the viewer); the rows are
// then passed through the policy once more (peopleFor), so a future change of the query cannot leak a member.
import { sql } from "drizzle-orm";
import type { Viewer } from "@/lib/authz";
import { db } from "@/lib/db/client";
import { peopleFor, type Person } from "./profiles";

export const SEARCH_MIN = 2;
export const SEARCH_MAX = 50;
export const SEARCH_LIMIT = 20;

/** The query as the index sees it: lower-case, diacritics folded, a leading "@" dropped, only safe characters. */
export function foldQuery(raw: string): string {
  return raw
    .trim()
    .replace(/^@/, "")
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}_ ]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, SEARCH_MAX);
}

export async function searchPeople(viewer: Viewer, raw: string): Promise<Person[]> {
  const q = foldQuery(raw);
  if (!viewer.id || q.length < SEARCH_MIN) return [];
  const viewerId = viewer.id;
  const rows = await db().execute<{ user_id: string }>(sql`
    select p.user_id
    from profile p
    join "user" u on u.id = p.user_id
    where p.onboarded_at is not null
      and p.discoverable
      and u.status = 'active'
      and p.user_id <> ${viewerId}::uuid
      and (
        p.username like ${q + "%"}
        or ' ' || search_fold(p.display_name) like ${"% " + q + "%"}
        or p.username % ${q}
        or search_fold(p.display_name) % ${q}
      )
      and not exists (
        select 1 from "block" b
        where (b.blocker_id = ${viewerId}::uuid and b.blocked_id = p.user_id)
           or (b.blocker_id = p.user_id and b.blocked_id = ${viewerId}::uuid)
      )
    order by greatest(similarity(p.username, ${q}), similarity(search_fold(p.display_name), ${q})) desc,
             p.username asc
    limit ${SEARCH_LIMIT}
  `);
  const ids = rows.rows.map((r) => r.user_id);
  return peopleFor(viewer, ids);
}
