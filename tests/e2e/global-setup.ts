// Clears the rate-limit tables before a run, so repeated local runs (and the two projects, phone and desktop,
// which share one client IP) do not lock each other out. Touches nothing else. Uses the same DATABASE_URL as
// the app under test; the CI database is a throwaway service container.
import { config } from "dotenv";
import { Client } from "pg";

export default async function globalSetup() {
  config({ path: ".env.local", quiet: true });
  const url =
    process.env.DATABASE_URL ?? "postgres://grooverift:grooverift@127.0.0.1:5432/grooverift";
  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    await client.query("delete from rate_limit");
    await client.query("delete from rate_limit_bucket");
  } finally {
    await client.end();
  }
}
