import "@/lib/load-env";
import { PgBoss } from "pg-boss";
import { pruneThrottle } from "@/lib/auth/lockout";
import { audit } from "@/lib/audit";
import { closeDb } from "@/lib/db/client";
import { pruneRateLimits } from "@/lib/data/rate-limit";
import { env } from "@/lib/env";

// The job worker (ADR-0002: pg-boss on the same PostgreSQL). Phase 4 runs one housekeeping job;
// Phase 5 adds the Daily Drop publication (idempotent by UTC date) and push delivery.
// Usage: npm run worker   (a separate process from the web server on Render)

export const JOBS = {
  pruneThrottle: "auth.throttle.prune",
  pruneRateLimits: "data.rate_limit.prune",
} as const;

export async function startWorker(): Promise<PgBoss> {
  const boss = new PgBoss({ connectionString: env().DATABASE_URL, schema: "pgboss" });
  boss.on("error", (error) => console.error("[worker]", error));
  await boss.start();

  await boss.createQueue(JOBS.pruneThrottle);
  await boss.work(JOBS.pruneThrottle, async () => {
    await pruneThrottle();
    await audit({ actorType: "system", action: "auth.throttle.pruned" });
  });
  // Once a day at 03:30 UTC; the schedule is idempotent across restarts.
  await boss.schedule(JOBS.pruneThrottle, "30 3 * * *", {}, { tz: "UTC" });

  // The general rate limiter's old windows (step 5.2), daily at 03:40 UTC.
  await boss.createQueue(JOBS.pruneRateLimits);
  await boss.work(JOBS.pruneRateLimits, async () => {
    await pruneRateLimits();
  });
  await boss.schedule(JOBS.pruneRateLimits, "40 3 * * *", {}, { tz: "UTC" });

  console.log("[worker] started");
  return boss;
}

const isCli = process.argv[1]?.endsWith("worker.ts");
if (isCli) {
  startWorker()
    .then((boss) => {
      const stop = async () => {
        await boss.stop({ graceful: true, timeout: 10_000 });
        await closeDb();
        process.exit(0);
      };
      process.on("SIGINT", stop);
      process.on("SIGTERM", stop);
    })
    .catch((error) => {
      console.error("[worker] failed to start:", error instanceof Error ? error.message : error);
      process.exitCode = 1;
    });
}
