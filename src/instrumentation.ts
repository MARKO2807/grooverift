// Next.js instrumentation: starts Sentry on the Node.js server when SENTRY_DSN is set (A7, D-111). Without the DSN
// (development, CI) nothing is loaded. Options and scrubbing: src/lib/monitoring/sentry.ts.
import type { Instrumentation } from "next";

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || !process.env.SENTRY_DSN) return;
  const Sentry = await import("@sentry/nextjs");
  const { sentryOptions } = await import("@/lib/monitoring/sentry");
  Sentry.init(sentryOptions(process.env.SENTRY_DSN, process.env.SENTRY_ENVIRONMENT ?? "staging"));
}

export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  if (process.env.NEXT_RUNTIME !== "nodejs" || !process.env.SENTRY_DSN) return;
  const Sentry = await import("@sentry/nextjs");
  Sentry.captureRequestError(error, request, context);
};
