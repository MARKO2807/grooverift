// Error tracking for the job worker (A7, D-111). Same options and scrubbing as the web server. Without SENTRY_DSN
// every function here is a no-op, so development, tests and CI never load or call Sentry.
import type { PgBoss } from "pg-boss";
import { sentryOptions } from "./sentry";

type SentryModule = typeof import("@sentry/nextjs");
let sentry: SentryModule | null = null;

export async function initWorkerSentry(): Promise<void> {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn || sentry) return;
  sentry = await import("@sentry/nextjs");
  sentry.init(sentryOptions(dsn, process.env.SENTRY_ENVIRONMENT ?? "staging"));
}

/** Reports an error with the job name only: job data can hold member ids and is not sent. */
export function reportWorkerError(error: unknown, job?: string): void {
  sentry?.captureException(error, job ? { tags: { job } } : undefined);
}

export async function flushWorkerSentry(): Promise<void> {
  await sentry?.flush(2_000);
}

type Handler = (...args: unknown[]) => Promise<unknown>;

/**
 * Wraps `boss.work` so a failing handler is reported before pg-boss retries it; the error is re-thrown, so retry
 * and failure handling stay exactly as they were.
 */
export function trackJobErrors(boss: PgBoss): void {
  const original = boss.work.bind(boss) as unknown as (...args: unknown[]) => Promise<string>;
  (boss as unknown as { work: (...args: unknown[]) => Promise<string> }).work = (...args) => {
    const last = args.length - 1;
    const handler = args[last] as Handler;
    const name = String(args[0]);
    args[last] = async (...jobArgs: unknown[]) => {
      try {
        return await handler(...jobArgs);
      } catch (error) {
        reportWorkerError(error, name);
        throw error;
      }
    };
    return original(...args);
  };
}
