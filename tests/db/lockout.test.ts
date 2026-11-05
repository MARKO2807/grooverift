import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { closeDb, db } from "@/lib/db/client";
import { signInThrottle } from "@/lib/db/schema";
import {
  ACCOUNT_MAX_FAILURES,
  PAIR_LOCK_MS,
  PAIR_MAX_FAILURES,
  PAIR_WINDOW_MS,
  clearAccountLock,
  lockState,
  recordFailure,
  recordSuccess,
} from "@/lib/auth/lockout";

afterAll(() => closeDb());

const email = `lock-${Date.now()}@example.test`;
const ip = "198.51.100.7";

beforeEach(async () => {
  await db().delete(signInThrottle);
});

describe("sign-in lockout (D-077)", () => {
  it("locks the pair after five failures within 15 minutes, for 15 min, then 1 h, then 24 h", async () => {
    const t0 = new Date("2026-11-05T10:00:00Z");
    for (let i = 1; i < PAIR_MAX_FAILURES; i++) {
      const s = await recordFailure(email, ip, t0);
      expect(s.locked).toBe(false);
    }
    const first = await recordFailure(email, ip, t0);
    expect(first).toMatchObject({ locked: true, reason: "pair" });
    if (first.locked) expect(first.until.getTime() - t0.getTime()).toBe(PAIR_LOCK_MS[0]);

    // Still locked a minute later; free after the lock ends.
    expect((await lockState(email, ip, new Date(t0.getTime() + 60_000))).locked).toBe(true);
    const t1 = new Date(t0.getTime() + PAIR_LOCK_MS[0] + 1000);
    expect((await lockState(email, ip, t1)).locked).toBe(false);

    // The second lock lasts one hour, the third 24 hours.
    let s = { locked: false } as Awaited<ReturnType<typeof recordFailure>>;
    for (let i = 0; i < PAIR_MAX_FAILURES; i++) s = await recordFailure(email, ip, t1);
    expect(s.locked && s.until.getTime() - t1.getTime()).toBe(PAIR_LOCK_MS[1]);
    const t2 = new Date(t1.getTime() + PAIR_LOCK_MS[1] + 1000);
    for (let i = 0; i < PAIR_MAX_FAILURES; i++) s = await recordFailure(email, ip, t2);
    expect(s.locked && s.until.getTime() - t2.getTime()).toBe(PAIR_LOCK_MS[2]);
  });

  it("forgets failures that fall outside the 15-minute window", async () => {
    const t0 = new Date("2026-11-05T10:00:00Z");
    for (let i = 1; i < PAIR_MAX_FAILURES; i++) await recordFailure(email, ip, t0);
    const later = new Date(t0.getTime() + PAIR_WINDOW_MS + 1000);
    const s = await recordFailure(email, ip, later);
    expect(s.locked).toBe(false);
  });

  it("counts another IP separately but the account total together", async () => {
    const t0 = new Date("2026-11-05T10:00:00Z");
    for (let i = 1; i < PAIR_MAX_FAILURES; i++) await recordFailure(email, ip, t0);
    const other = await recordFailure(email, "198.51.100.8", t0);
    expect(other.locked).toBe(false);
    const rows = await db().select().from(signInThrottle);
    const account = rows.find((r) => r.scope === "account");
    expect(account?.failures).toBe(PAIR_MAX_FAILURES);
    expect(rows.filter((r) => r.scope === "pair")).toHaveLength(2);
  });

  it("a success clears both counters", async () => {
    const t0 = new Date("2026-11-05T10:00:00Z");
    for (let i = 0; i < PAIR_MAX_FAILURES; i++) await recordFailure(email, ip, t0);
    expect((await lockState(email, ip, t0)).locked).toBe(true);
    await recordSuccess(email, ip);
    expect((await lockState(email, ip, t0)).locked).toBe(false);
    expect(await db().select().from(signInThrottle)).toHaveLength(0);
  });

  it("100 consecutive failures lock the account until a password reset", async () => {
    const t0 = new Date("2026-11-05T10:00:00Z");
    // Spread across many IPs so no single pair lock interferes with the count.
    for (let i = 0; i < ACCOUNT_MAX_FAILURES; i++) {
      await recordFailure(email, `203.0.113.${i % 250}`, new Date(t0.getTime() + i * 1000));
    }
    const s = await lockState(email, "203.0.113.250", new Date(t0.getTime() + 200_000));
    expect(s).toMatchObject({ locked: true, reason: "account" });
    await clearAccountLock(email);
    expect((await lockState(email, "203.0.113.250")).locked).toBe(false);
  });

  it("normalises the address (case and spaces)", async () => {
    const t0 = new Date("2026-11-05T10:00:00Z");
    for (let i = 0; i < PAIR_MAX_FAILURES; i++)
      await recordFailure(` ${email.toUpperCase()} `, ip, t0);
    expect((await lockState(email, ip, t0)).locked).toBe(true);
  });
});
