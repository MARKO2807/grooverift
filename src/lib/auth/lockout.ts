import { createHash } from "node:crypto";
import { and, eq, lt, or, sql } from "drizzle-orm";
import { APIError, createAuthMiddleware, getIP } from "better-auth/api";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db/client";
import { signInThrottle } from "@/lib/db/schema";
import { env } from "@/lib/env";

// Sign-in lockout (D-077, NIST SP 800-63B-4 §3.2.2):
// - per (account, device/IP) pair: 5 failures within 15 minutes lock the pair for 15 min, then 1 h, then 24 h;
// - per account: 100 consecutive failures in total, then only a password reset unlocks it.
// Keys are keyed SHA-256 hashes, so the table never stores an email or an IP in clear.
// Better Auth's own rate limiter (10 requests / minute on /sign-in/email) throttles bursts in front of this.
// The IP comes from Better Auth's own resolver (advanced.ipAddress), so the limiter and the lockout agree.

export const PAIR_WINDOW_MS = 15 * 60 * 1000;
export const PAIR_MAX_FAILURES = 5;
export const PAIR_LOCK_MS = [15 * 60 * 1000, 60 * 60 * 1000, 24 * 60 * 60 * 1000] as const;
export const ACCOUNT_MAX_FAILURES = 100;

const SIGN_IN_PATHS = new Set(["/sign-in/email"]);
/** Failures that say nothing about the password: not counted (an unverified member retrying, a ban). */
const NOT_A_GUESS = new Set(["EMAIL_NOT_VERIFIED", "BANNED_USER", "TOO_MANY_REQUESTS"]);

const keyOf = (scope: "pair" | "account", parts: string[]) =>
  createHash("sha256")
    .update(`${env().BETTER_AUTH_SECRET}:throttle:${scope}:${parts.join("|")}`)
    .digest("hex");

export const normalizeEmail = (email: string) => email.trim().toLowerCase();

export type LockState =
  { locked: true; until: Date; reason: "pair" | "account" } | { locked: false };

export async function lockState(email: string, ip: string, now = new Date()): Promise<LockState> {
  const pairKey = keyOf("pair", [normalizeEmail(email), ip]);
  const accountKey = keyOf("account", [normalizeEmail(email)]);
  const rows = await db()
    .select()
    .from(signInThrottle)
    .where(or(eq(signInThrottle.key, pairKey), eq(signInThrottle.key, accountKey)));
  const account = rows.find((r) => r.scope === "account");
  if (account && account.failures >= ACCOUNT_MAX_FAILURES) {
    return {
      locked: true,
      until: new Date(now.getTime() + 365 * 24 * 3600 * 1000),
      reason: "account",
    };
  }
  const pair = rows.find((r) => r.scope === "pair");
  if (pair?.lockedUntil && pair.lockedUntil > now) {
    return { locked: true, until: pair.lockedUntil, reason: "pair" };
  }
  return { locked: false };
}

/** Records one failed sign-in; returns the lock that it caused, if any. Both counters are atomic
 *  (one upsert each), so parallel guesses cannot be lost (TOCTOU). */
export async function recordFailure(
  email: string,
  ip: string,
  now = new Date(),
): Promise<LockState> {
  const pairKey = keyOf("pair", [normalizeEmail(email), ip]);
  const accountKey = keyOf("account", [normalizeEmail(email)]);
  const d = db();

  // Account counter: consecutive failures, never windowed (reset only by success or password reset).
  await d
    .insert(signInThrottle)
    .values({
      key: accountKey,
      scope: "account",
      failures: 1,
      windowStartedAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: signInThrottle.key,
      set: { failures: sql`${signInThrottle.failures} + 1`, updatedAt: now },
    });

  // Pair counter: one atomic upsert decides window, count, lock and stage in the database.
  const windowStart = new Date(now.getTime() - PAIR_WINDOW_MS);
  const [row] = await d
    .insert(signInThrottle)
    .values({
      key: pairKey,
      scope: "pair",
      failures: 1,
      stage: 0,
      windowStartedAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: signInThrottle.key,
      set: {
        // Inside the window the count grows; outside it starts again at 1.
        failures: sql`case when ${signInThrottle.windowStartedAt} > ${windowStart} then ${signInThrottle.failures} + 1 else 1 end`,
        windowStartedAt: sql`case when ${signInThrottle.windowStartedAt} > ${windowStart} then ${signInThrottle.windowStartedAt} else ${now} end`,
        updatedAt: now,
      },
    })
    .returning();
  if (!row) return lockState(email, ip, now);

  if (row.failures >= PAIR_MAX_FAILURES) {
    const ms = PAIR_LOCK_MS[Math.min(row.stage, PAIR_LOCK_MS.length - 1)]!;
    const lockedUntil = new Date(now.getTime() + ms);
    await d
      .update(signInThrottle)
      .set({ failures: 0, stage: row.stage + 1, windowStartedAt: now, lockedUntil, updatedAt: now })
      .where(eq(signInThrottle.key, pairKey));
    return { locked: true, until: lockedUntil, reason: "pair" };
  }
  return lockState(email, ip, now);
}

/** A successful sign-in clears the pair and the account counters. */
export async function recordSuccess(email: string, ip: string): Promise<void> {
  const pairKey = keyOf("pair", [normalizeEmail(email), ip]);
  const accountKey = keyOf("account", [normalizeEmail(email)]);
  await db()
    .delete(signInThrottle)
    .where(or(eq(signInThrottle.key, pairKey), eq(signInThrottle.key, accountKey)));
}

/** A completed password reset clears the account counter (D-077: the 100-failure lock ends only this way). */
export async function clearAccountLock(email: string): Promise<void> {
  await db()
    .delete(signInThrottle)
    .where(eq(signInThrottle.key, keyOf("account", [normalizeEmail(email)])));
}

/** Housekeeping for a job: rows whose lock expired and whose window is stale. */
export async function pruneThrottle(now = new Date()): Promise<void> {
  const stale = new Date(now.getTime() - PAIR_WINDOW_MS);
  await db()
    .delete(signInThrottle)
    .where(
      and(
        eq(signInThrottle.scope, "pair"),
        lt(signInThrottle.updatedAt, stale),
        or(sql`${signInThrottle.lockedUntil} is null`, lt(signInThrottle.lockedUntil, now)),
      ),
    );
}

export const lockoutError = (state: Extract<LockState, { locked: true }>) => {
  const retryAfter = Math.max(1, Math.ceil((state.until.getTime() - Date.now()) / 1000));
  return new APIError(
    "TOO_MANY_REQUESTS",
    {
      code: state.reason === "account" ? "SIGN_IN_LOCKED_RESET_REQUIRED" : "SIGN_IN_LOCKED",
      message:
        state.reason === "account"
          ? "Too many failed sign-ins. Reset your password to continue."
          : "Too many failed sign-ins. Try again later.",
      retryAfter,
      until: state.until.toISOString(),
    },
    { "Retry-After": String(retryAfter) },
  );
};

type HookCtx = Parameters<Parameters<typeof createAuthMiddleware>[0]>[0];

/** The email of a sign-in request, only when it is a plain string (hooks run before validation). */
function signInEmail(ctx: HookCtx): string | null {
  if (!SIGN_IN_PATHS.has(ctx.path)) return null;
  const email = (ctx.body as { email?: unknown } | undefined)?.email;
  return typeof email === "string" && email.trim() ? email : null;
}

/** The same client IP Better Auth's limiter uses; "unknown" when no trusted header carries one. */
export function requestIp(ctx: HookCtx): string {
  if (!ctx.headers) return "unknown";
  return getIP(ctx.headers, ctx.context.options) ?? "unknown";
}

/** Before hook: refuse a sign-in while the pair or the account is locked. */
export const lockoutBefore = createAuthMiddleware(async (ctx) => {
  const email = signInEmail(ctx);
  if (!email) return;
  const state = await lockState(email, requestIp(ctx));
  if (state.locked) throw lockoutError(state);
});

/** After hook: count the failure or clear the counters on success. */
export const lockoutAfter = createAuthMiddleware(async (ctx) => {
  const email = signInEmail(ctx);
  if (!email) return;
  const ip = requestIp(ctx);
  const returned = ctx.context.returned;
  const failed = returned instanceof APIError;
  if (!failed) {
    await recordSuccess(email, ip);
    return;
  }
  const code = (returned.body as { code?: string } | undefined)?.code ?? "";
  if (returned.status === "TOO_MANY_REQUESTS" || NOT_A_GUESS.has(code)) return;
  const state = await recordFailure(email, ip);
  await audit({
    actorType: "system",
    action: state.locked ? "auth.sign_in.locked" : "auth.sign_in.failed",
    ip,
    userAgent: ctx.headers?.get("user-agent"),
    metadata: state.locked ? { reason: state.reason, until: state.until.toISOString() } : {},
  });
});
