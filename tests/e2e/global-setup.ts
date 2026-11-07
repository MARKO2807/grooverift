// Clears the rate-limit tables before a run, so repeated local runs (and the two projects, phone and desktop,
// which share one client IP) do not lock each other out. Turns the "push" flag on for the whole run when a VAPID
// pair is configured (step 5.12), so every test sees the same onboarding (with the reminder step) and Settings
// (with Obavijesti), and puts the flag back afterwards. Touches nothing else. Uses the same DATABASE_URL as the
// app under test; the CI database is a throwaway service container.
import { config } from "dotenv";
import { Client } from "pg";

async function withClient<T>(run: (client: Client) => Promise<T>): Promise<T> {
  const url =
    process.env.DATABASE_URL ?? "postgres://grooverift:grooverift@127.0.0.1:5432/grooverift";
  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    return await run(client);
  } finally {
    await client.end();
  }
}

export default async function globalSetup() {
  config({ path: ".env.local", quiet: true });
  // Only ever a local or CI database: this run deletes rows and flips a flag (review 5.12 L4).
  const host = new URL(
    process.env.DATABASE_URL ?? "postgres://grooverift:grooverift@127.0.0.1:5432/grooverift",
  ).hostname;
  if (!process.env.CI && !["127.0.0.1", "localhost", "::1", "[::1]"].includes(host))
    throw new Error(`end-to-end tests refuse a non-local database (${host})`);
  const push = !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
  const before = await withClient(async (client) => {
    await client.query("delete from rate_limit");
    await client.query("delete from rate_limit_bucket");
    if (!push) return null;
    const row = (
      await client.query<{ state: string }>("select state from feature_flag where key = 'push'")
    ).rows[0];
    await client.query(
      "insert into feature_flag (key, state) values ('push', 'on') on conflict (key) do update set state = 'on'",
    );
    return row?.state ?? "off";
  });
  return async () => {
    if (before === null) return;
    await withClient((client) =>
      client.query("update feature_flag set state = $1 where key = 'push'", [before]),
    );
  };
}
