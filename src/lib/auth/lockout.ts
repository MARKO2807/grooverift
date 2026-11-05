import { createHash } from "node:crypto";
import { and, eq, lt, or, sql } from "drizzle-orm";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db/client";
import { signInThrottle } from "@/lib/db/schema";
import { env } from "@/lib/env";

// Sign-in lockout (D-077, NIST SP 800-63B-4 §3.2.2):
// - per (account, device/IP) pair: 5 failures within 15 minutes lock the pair for 15 min, then 1 h, then 24 h;
// - per account: 100 consecutive failures in total, then only a password reset unlocks it.
// Keys are keyed SHA-256 hashes, so the table never stores an email or an IP in clear.
// Better Auth's own rate limiter (3 requests / 10 s on /sign-in/email) throttles bursts in front of this.

export const PAIR_WINDOW_MS = 15 * 60 * 1000;
export const PAIR_MAX_FAILURES = 5;
export const PAIR_LOCK_MS = [15 * 60 * 1000, 60 * 60 * 1000, 24 * 60 * 60 * 1000] as const;
export const ACCOUNT_MAX_FAILURES = 100;

const SIGN_IN_PATHS = new Set(["/sign-in/email"]);

const keyOf = (scope: "pair" | "account", parts: string[]) =>
  createHash("sha256")
    .update(`${env().BETTER_AUTH_SECRET}:throttle:${scope}:${parts.join("|")}`)
    .digest("hex");

export const normalizeEmail = (email: string) => email.trim().toLowerCase();

/** The client IP from the configured proxy headers; "local" when none applies. */
export function clientIp(headers: Headers | undefined): string {
  if (!headers) return "local";
  const names = env()
    .IP_HEADERS.split(",")
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
  for (const name of names) {
    const value = headers.get(name);
    if (value) return value.split(",")[0]!.trim();
  }
  return "local";
}

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

/** Records one failed sign-in; returns the lock that it caused, if any. */
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

  // Pair counter: 5 failures within a 15-minute window → lock; the stage grows with each lock.
  const [pair] = await d.select().from(signInThrottle).where(eq(signInThrottle.key, pairKey));
  let failures = 1;
  let stage = pair?.stage ?? 0;
  let windowStartedAt = now;
  if (pair) {
    const inWindow = now.getTime() - pair.windowStartedAt.getTime() < PAIR_WINDOW_MS;
    failures = inWindow ? pair.failures + 1 : 1;
    windowStartedAt = inWindow ? pair.windowStartedAt : now;
  }
  let lockedUntil: Date | null = null;
  if (failures >= PAIR_MAX_FAILURES) {
    const ms = PAIR_LOCK_MS[Math.min(stage, PAIR_LOCK_MS.length - 1)]!;
    lockedUntil = new Date(now.getTime() + ms);
    stage += 1;
    failures = 0;
    windowStartedAt = now;
  }
  await d
    .insert(signInThrottle)
    .values({
      key: pairKey,
      scope: "pair",
      failures,
      stage,
      windowStartedAt,
      lockedUntil,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: signInThrottle.key,
      set: { failures, stage, windowStartedAt, lockedUntil, updatedAt: now },
    });

  if (lockedUntil) return { locked: true, until: lockedUntil, reason: "pair" };
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

/** Before hook: refuse a sign-in while the pair or the account is locked. */
export const lockoutBefore = createAuthMiddleware(async (ctx) => {
  if (!SIGN_IN_PATHS.has(ctx.path)) return;
  const email = (ctx.body as { email?: string } | undefined)?.email;
  if (!email) return;
  const state = await lockState(email, clientIp(ctx.headers));
  if (state.locked) throw lockoutError(state);
});

/** After hook: count the failure or clear the counters on success. */
export const lockoutAfter = createAuthMiddleware(async (ctx) => {
  if (!SIGN_IN_PATHS.has(ctx.path)) return;
  const email = (ctx.body as { email?: string } | undefined)?.email;
  if (!email) return;
  const ip = clientIp(ctx.headers);
  const returned = ctx.context.returned;
  const failed = returned instanceof APIError;
  if (!failed) {
    await recordSuccess(email, ip);
    return;
  }
  if (returned.status === "TOO_MANY_REQUESTS") return; // already locked: do not count again
  const state = await recordFailure(email, ip);
  await audit({
    actorType: "system",
    action: state.locked ? "auth.sign_in.locked" : "auth.sign_in.failed",
    ip,
    userAgent: ctx.headers?.get("user-agent"),
    metadata: state.locked ? { reason: state.reason, until: state.until.toISOString() } : {},
  });
});
