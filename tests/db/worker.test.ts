import { afterAll, describe, expect, it } from "vitest";
import { closeDb, db } from "@/lib/db/client";
import { signInThrottle } from "@/lib/db/schema";
import { pruneThrottle, recordFailure } from "@/lib/auth/lockout";
import { JOBS, startWorker } from "@/worker";

afterAll(() => closeDb());

describe("worker and housekeeping", () => {
  it("prunes stale throttle rows but keeps active locks", async () => {
    await db().delete(signInThrottle);
    const old = new Date(Date.now() - 2 * 60 * 60 * 1000);
    await recordFailure("stale@example.test", "203.0.113.1", old); // one failure two hours ago
    for (let i = 0; i < 5; i++) await recordFailure("locked@example.test", "203.0.113.2"); // locked now
    await pruneThrottle();
    const rows = await db().select().from(signInThrottle);
    const pairs = rows.filter((r) => r.scope === "pair");
    expect(pairs).toHaveLength(1);
    expect(pairs[0]!.lockedUntil).not.toBeNull();
  });

  it("starts pg-boss, registers the schedule and stops cleanly", async () => {
    const boss = await startWorker();
    const schedules = await boss.getSchedules();
    expect(schedules.some((s) => s.name === JOBS.pruneThrottle && s.cron === "30 3 * * *")).toBe(
      true,
    );
    await boss.stop({ graceful: false, timeout: 2000 });
  });
});
