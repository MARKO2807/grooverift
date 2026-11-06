import "@/lib/load-env";
import { flushWorkerSentry, initWorkerSentry, reportWorkerError } from "./worker";

// One-off check that SENTRY_DSN works from a deployed service (D-111): `npm run sentry:test` in the Render shell
// sends one test error with the same options and scrubbing as the worker, then waits for delivery.
async function main(): Promise<number> {
  if (!process.env.SENTRY_DSN) {
    console.error("SENTRY_DSN is not set.");
    return 1;
  }
  await initWorkerSentry();
  reportWorkerError(new Error("GrooveRift Sentry test (safe to resolve)"), "sentry-test");
  await flushWorkerSentry();
  console.log("Test error sent: look in Sentry → Issues.");
  return 0;
}

main().then((code) => process.exit(code));
