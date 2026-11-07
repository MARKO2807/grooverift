import "@/lib/load-env";
import { purgeDueAccounts } from "@/lib/data/account";
import { sweepExports } from "@/lib/data/export";
import { runReminders } from "@/lib/data/push";
import { closeDb } from "@/lib/db/client";

// Runs one housekeeping job once, outside pg-boss: for the owner (no need to wait for the worker's schedule) and
// for the end-to-end suite (the purge after a grace period it shortened). Same functions the worker calls.
// Usage: npm run job -- account.purge | account.export | push.reminders

const JOBS: Record<string, () => Promise<unknown>> = {
  "account.purge": () => purgeDueAccounts(),
  "account.export": () => sweepExports(),
  "push.reminders": () => runReminders().then((r) => console.log(r)),
};

async function main() {
  const name = process.argv[2] ?? "";
  const job = JOBS[name];
  if (!job) {
    console.error(`unknown job "${name}"; one of: ${Object.keys(JOBS).join(", ")}`);
    process.exitCode = 2;
    return;
  }
  console.log(`${name}:`, JSON.stringify(await job()));
}

main()
  .catch((error) => {
    console.error("job failed:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => closeDb());
