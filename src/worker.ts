import "@/lib/load-env";
import { PgBoss, type JobWithMetadata } from "pg-boss";
import { pruneThrottle } from "@/lib/auth/lockout";
import { audit } from "@/lib/audit";
import { closeDb } from "@/lib/db/client";
import { purgeDueAccounts } from "@/lib/data/account";
import { sweepExports } from "@/lib/data/export";
import { purgeSnapshots } from "@/lib/data/moderation";
import { pruneNotifications } from "@/lib/data/notifications";
import { liftExpiredSuspensions } from "@/lib/data/safety";
import { pruneRateLimits } from "@/lib/data/rate-limit";
import { dailyCheck, runPublication } from "@/lib/editorial/publication";
import {
  isIsoDate,
  PUBLISH_RETRY_DELAY_SECONDS,
  PUBLISH_RETRY_LIMIT,
  utcDate,
} from "@/lib/editorial/rules";
import { env } from "@/lib/env";

// The job worker (ADR-0002: pg-boss on the same PostgreSQL). Housekeeping since Phase 4; the Daily Drop
// publication (idempotent by UTC date, step 5.6) and its daily look ahead; push delivery comes in 5.12.
// Usage: npm run worker   (a separate process from the web server on Render)

export const JOBS = {
  pruneThrottle: "auth.throttle.prune",
  pruneRateLimits: "data.rate_limit.prune",
  publishDrop: "daily_drop.publish",
  editorialCheck: "editorial.check",
  pruneNotifications: "activity.prune",
  liftSuspensions: "moderation.lift",
  purgeSnapshots: "moderation.purge",
  purgeAccounts: "account.purge",
  sweepExports: "account.export",
} as const;

type PublishData = { date?: string };

/**
 * The UTC date a publication job is for: the date it carries, else the date of the cron tick that created it
 * (plus a minute, in case the tick lands a moment before midnight). Never the worker's clock at run time: a
 * worker a few seconds behind the database would otherwise compute yesterday and do nothing, and a retry
 * keeps the date of its first run.
 */
export function publishDateOf(data: PublishData | null | undefined, createdOn: Date): string {
  if (isIsoDate(data?.date)) return data.date;
  return utcDate(new Date(createdOn.getTime() + 60_000));
}

export async function startWorker(opts: { catchUp?: boolean } = {}): Promise<PgBoss> {
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

  // Activity entries older than 30 days are never shown (step 5.8), so they go; daily at 03:50 UTC.
  await boss.createQueue(JOBS.pruneNotifications);
  await boss.work(JOBS.pruneNotifications, async () => {
    await pruneNotifications();
  });
  await boss.schedule(JOBS.pruneNotifications, "50 3 * * *", {}, { tz: "UTC" });

  // Step 5.9: a suspension that ran out is lifted every 15 minutes (the member's own next page view lifts it too),
  // so their content comes back for others without waiting for them to return.
  await boss.createQueue(JOBS.liftSuspensions);
  await boss.work(JOBS.liftSuspensions, async () => {
    const n = await liftExpiredSuspensions();
    if (n)
      await audit({ actorType: "system", action: "moderation.suspension.lifted", metadata: { n } });
  });
  await boss.schedule(JOBS.liftSuspensions, "*/15 * * * *", {}, { tz: "UTC" });

  // J5 E9: moderation copies of decided cases go after their purge date (90 days, longer while an appeal is
  // possible); daily at 04:00 UTC.
  await boss.createQueue(JOBS.purgeSnapshots);
  await boss.work(JOBS.purgeSnapshots, async () => {
    const n = await purgeSnapshots();
    if (n)
      await audit({ actorType: "system", action: "moderation.snapshots.purged", metadata: { n } });
  });
  await boss.schedule(JOBS.purgeSnapshots, "0 4 * * *", {}, { tz: "UTC" });

  // Step 5.10 (SET-09): accounts whose 30-day grace period ended are erased, hourly, so the deletion lands within
  // the hour of the date the member was shown. Each purge is its own transaction and audited.
  await boss.createQueue(JOBS.purgeAccounts);
  await boss.work(JOBS.purgeAccounts, async () => {
    await purgeDueAccounts();
  });
  await boss.schedule(JOBS.purgeAccounts, "15 * * * *", {}, { tz: "UTC" });

  // Data copies (D-066): builds left behind by the web process, and the 24-hour expiry of ready copies.
  await boss.createQueue(JOBS.sweepExports);
  await boss.work(JOBS.sweepExports, async () => {
    const r = await sweepExports();
    if (r.built || r.expired)
      await audit({ actorType: "system", action: "account.export.swept", metadata: r });
  });
  await boss.schedule(JOBS.sweepExports, "*/5 * * * *", {}, { tz: "UTC" });

  // The Daily Drop at 00:00 UTC (J6). The run itself is idempotent by date, so a duplicate job, a restart or
  // "Publish now" at the same moment cannot publish twice. A failed run throws, and pg-boss retries it with
  // backoff; the last retry marks the scheduled question failed and emails staff.
  const retry = {
    retryLimit: PUBLISH_RETRY_LIMIT,
    retryDelay: PUBLISH_RETRY_DELAY_SECONDS,
    retryBackoff: true,
  };
  await boss.createQueue(JOBS.publishDrop, { ...retry, retryDelayMax: 600 });
  await boss.updateQueue(JOBS.publishDrop, retry); // an existing queue keeps its first options otherwise
  await boss.work(
    JOBS.publishDrop,
    { includeMetadata: true },
    async (jobs: JobWithMetadata<PublishData>[]) => {
      for (const job of jobs) {
        await runPublication(publishDateOf(job.data, job.createdOn), {
          trigger: "schedule",
          final: job.retryCount >= PUBLISH_RETRY_LIMIT,
        });
      }
    },
  );
  await boss.schedule(JOBS.publishDrop, "0 0 * * *", {}, { tz: "UTC" });

  // JO4 look ahead once a day at 08:00 UTC: an email only when a date within 72 hours is empty or the reserve
  // is low (ADM-01 shows the same warnings at any time).
  await boss.createQueue(JOBS.editorialCheck);
  await boss.work(JOBS.editorialCheck, async () => {
    await dailyCheck();
  });
  await boss.schedule(JOBS.editorialCheck, "0 8 * * *", {}, { tz: "UTC" });

  // Catch up after downtime over midnight: a cron tick missed while the worker was down is not replayed, so
  // today's publication is queued at start (a no-op when today is published, and never refills a withdrawn date).
  // On a standard queue singletonKey alone does not deduplicate; with singletonSeconds it holds one job per key
  // per UTC day slot, so restarts on an empty day do not repeat the critical email (review 5.6 #2).
  if (opts.catchUp ?? true) {
    const today = utcDate();
    await boss.send(
      JOBS.publishDrop,
      { date: today },
      { singletonKey: `publish:${today}`, singletonSeconds: 86_400 },
    );
  }

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
