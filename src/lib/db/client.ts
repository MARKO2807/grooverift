import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";
import { env } from "@/lib/env";

export type Db = NodePgDatabase<typeof schema>;

// One pool per process, created on first use so that importing modules (CLI, tests, build)
// does not open a connection. pg-boss shares the same connection string (ADR-0003).
const globalForDb = globalThis as unknown as { __grPool?: Pool; __grDb?: Db };

export function pool(): Pool {
  if (!globalForDb.__grPool) {
    globalForDb.__grPool = new Pool({
      connectionString: env().DATABASE_URL,
      max: 10,
      idleTimeoutMillis: 30_000,
      statement_timeout: 15_000,
    });
  }
  return globalForDb.__grPool;
}

export function db(): Db {
  if (!globalForDb.__grDb) globalForDb.__grDb = drizzle(pool(), { schema, casing: "snake_case" });
  return globalForDb.__grDb;
}

export async function closeDb() {
  await globalForDb.__grPool?.end();
  globalForDb.__grPool = undefined;
  globalForDb.__grDb = undefined;
}
