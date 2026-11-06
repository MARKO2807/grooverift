import { afterAll, describe, expect, it } from "vitest";
import { closeDb, db } from "@/lib/db/client";
import { signInThrottle } from "@/lib/db/schema";
import { pruneThrottle, recordFailure } from "@/lib/auth/lockout";
import { JOBS, publishDateOf, startWorker } from "@/worker";

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
    const boss = await startWorker({ catchUp: false }); // no publication against the dev database
    const schedules = await boss.getSchedules();
    expect(schedules.some((s) => s.name === JOBS.pruneThrottle && s.cron === "30 3 * * *")).toBe(
      true,
    );
    // Step 5.6: the Daily Drop at 00:00 UTC and the JO4 look ahead at 08:00 UTC
    expect(schedules.some((s) => s.name === JOBS.publishDrop && s.cron === "0 0 * * *")).toBe(true);
    expect(schedules.some((s) => s.name === JOBS.editorialCheck && s.cron === "0 8 * * *")).toBe(
      true,
    );
    // Step 5.8: Activity entries older than 30 days are pruned at 03:50 UTC
    expect(
      schedules.some((s) => s.name === JOBS.pruneNotifications && s.cron === "50 3 * * *"),
    ).toBe(true);
    // Step 5.9: expired suspensions every 15 minutes, moderation copies daily at 04:00 UTC
    expect(
      schedules.some((s) => s.name === JOBS.liftSuspensions && s.cron === "*/15 * * * *"),
    ).toBe(true);
    expect(schedules.some((s) => s.name === JOBS.purgeSnapshots && s.cron === "0 4 * * *")).toBe(
      true,
    );
    // Step 5.10: the account purge hourly, the data-copy sweep every five minutes.
    expect(schedules.some((s) => s.name === JOBS.purgeAccounts && s.cron === "15 * * * *")).toBe(
      true,
    );
    expect(schedules.some((s) => s.name === JOBS.sweepExports && s.cron === "*/5 * * * *")).toBe(
      true,
    );
    await boss.stop({ graceful: false, timeout: 2000 });
  });

  it("takes the publication date from the cron tick, never from the worker's clock at run time (step 5.6)", () => {
    // the tick a moment before midnight (database clock) still means the new day
    expect(publishDateOf({}, new Date("2026-11-05T23:59:58Z"))).toBe("2026-11-06");
    expect(publishDateOf({}, new Date("2026-11-06T00:00:02Z"))).toBe("2026-11-06");
    // a retry 20 minutes later keeps the date of its job
    expect(publishDateOf(undefined, new Date("2026-11-06T00:00:00Z"))).toBe("2026-11-06");
    // the catch-up job carries its date
    expect(publishDateOf({ date: "2026-11-04" }, new Date("2026-11-06T10:00:00Z"))).toBe(
      "2026-11-04",
    );
    expect(publishDateOf({ date: "nonsense" }, new Date("2026-11-06T10:00:00Z"))).toBe(
      "2026-11-06",
    );
  });
});
