// The general rate limiter for non-auth routes (plan 5.2): fixed windows in PostgreSQL, one atomic statement per
// check, keys hashed with the server secret so the table never holds an IP, email or user id in clear.
import { createHmac } from "node:crypto";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { env } from "@/lib/env";
import { rateLimitBucket } from "@/lib/db/schema";

export type Limit = { limit: number; windowSeconds: number };

/** The limits in one place, as plan §1.2 sets them (tunable in ADM-17 later). */
export const LIMITS = {
  notice: { limit: 5, windowSeconds: 3600 }, // per client IP; DSA notices from anyone
  post: { limit: 30, windowSeconds: 3600 }, // answers and comments together
  report: { limit: 10, windowSeconds: 86400 },
  follow: { limit: 60, windowSeconds: 3600 },
  search: { limit: 2, windowSeconds: 1 }, // catalogue typeahead
  invite: { limit: 50, windowSeconds: 86400 }, // per admin
  dna: { limit: 300, windowSeconds: 3600 }, // Music DNA changes per member (step 5.3a)
  genreSearch: { limit: 8, windowSeconds: 1 }, // genre typeahead per member (in-memory list, debounced)
  username: { limit: 30, windowSeconds: 60 }, // the live username check in onboarding (step 5.4)
  people: { limit: 30, windowSeconds: 60 }, // people search per member (step 5.5, D-093 (3))
  profileEdit: { limit: 20, windowSeconds: 3600 }, // profile, username and privacy changes per member (step 5.5)
  graph: { limit: 120, windowSeconds: 3600 }, // unfollow, cancel, accept, decline, remove, block, unblock per member
  editorial: { limit: 300, windowSeconds: 3600 }, // editor and admin writes in ADM-04/05/09 (step 5.6)
} as const satisfies Record<string, Limit>;
export type LimitScope = keyof typeof LIMITS;

export const rateKey = (scope: string, subject: string) =>
  createHmac("sha256", env().BETTER_AUTH_SECRET).update(`rl:${scope}:${subject}`).digest("hex");

export type RateResult = { allowed: boolean; remaining: number; retryAfterSeconds: number };

/**
 * Counts one use of `scope` by `subject` (a user id or a client IP) and says whether it is within the limit.
 * The window restarts when it has passed. Concurrent calls are serialised by the row (INSERT … ON CONFLICT).
 */
export async function consume(
  scope: LimitScope | string,
  subject: string,
  limit?: Limit,
  now = new Date(),
): Promise<RateResult> {
  limit ??= LIMITS[scope as LimitScope];
  if (!limit) throw new Error(`rate limit: unknown scope "${scope}"`);
  const key = rateKey(scope, subject);
  const windowStartFloor = new Date(now.getTime() - limit.windowSeconds * 1000);
  const [row] = await db()
    .insert(rateLimitBucket)
    .values({ key, windowStart: now, count: 1 })
    .onConflictDoUpdate({
      target: rateLimitBucket.key,
      set: {
        count: sql`case when ${rateLimitBucket.windowStart} <= ${windowStartFloor.toISOString()}::timestamptz then 1 else ${rateLimitBucket.count} + 1 end`,
        windowStart: sql`case when ${rateLimitBucket.windowStart} <= ${windowStartFloor.toISOString()}::timestamptz then ${now.toISOString()}::timestamptz else ${rateLimitBucket.windowStart} end`,
      },
    })
    .returning({ count: rateLimitBucket.count, windowStart: rateLimitBucket.windowStart });
  const count = row!.count;
  const resetAt = row!.windowStart.getTime() + limit.windowSeconds * 1000;
  return {
    allowed: count <= limit.limit,
    remaining: Math.max(0, limit.limit - count),
    retryAfterSeconds:
      count <= limit.limit ? 0 : Math.max(1, Math.ceil((resetAt - now.getTime()) / 1000)),
  };
}

/** Deletes windows that ended long ago (worker housekeeping). */
export async function pruneRateLimits(olderThanSeconds = 86400 * 2, now = new Date()) {
  const cutoff = new Date(now.getTime() - olderThanSeconds * 1000);
  await db().execute(
    sql`delete from rate_limit_bucket where window_start < ${cutoff.toISOString()}::timestamptz`,
  );
}
