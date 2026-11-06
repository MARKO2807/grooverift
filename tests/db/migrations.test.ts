// Step 5.2 acceptance: the migrations go up, the 5.2 ones come down again, and up once more, on a scratch
// database created for this test and dropped afterwards. The shared development database is never touched.
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Client, Pool } from "pg";

const base = process.env.DATABASE_URL!;
const scratchName = `gr_migrations_${Date.now().toString(36)}`;
const scratchUrl = (() => {
  const u = new URL(base);
  u.pathname = `/${scratchName}`;
  return u.toString();
})();
const DOWN = [
  "0008_account_data",
  "0007_moderation",
  "0006_editorial",
  "0005_profiles_search",
  "0004_invitations",
  "0003_alpha_constraints",
  "0002_alpha_model",
];

async function admin<T>(fn: (c: Client) => Promise<T>) {
  const c = new Client({ connectionString: base });
  await c.connect();
  try {
    return await fn(c);
  } finally {
    await c.end();
  }
}

let pool: Pool;
beforeAll(async () => {
  await admin((c) => c.query(`create database "${scratchName}"`));
  pool = new Pool({ connectionString: scratchUrl, max: 2 });
});

afterAll(async () => {
  await pool?.end();
  await admin((c) => c.query(`drop database if exists "${scratchName}" with (force)`));
});

const tables = async () =>
  (
    await pool.query<{ t: string }>(
      "select table_name as t from information_schema.tables where table_schema = 'public' order by 1",
    )
  ).rows.map((r) => r.t);

describe("migrations up and down", () => {
  it("up, down to the foundation, up again", async () => {
    const db = drizzle(pool);
    await migrate(db, { migrationsFolder: "./drizzle" });
    const full = await tables();
    expect(full).toEqual(
      expect.arrayContaining(["profile", "follow", "daily_drop_question", "notice"]),
    );

    const dropStatuses = async () =>
      (
        await pool.query<{ v: string }>("select unnest(enum_range(null::drop_status))::text as v")
      ).rows.map((r) => r.v);
    expect(await dropStatuses()).toContain("withdrawn");
    for (const name of DOWN) {
      await pool.query(readFileSync(`./drizzle/down/${name}.down.sql`, "utf8"));
      // 0006 rebuilds the enum without 'withdrawn' and keeps the one-question-per-date index (step 5.6).
      if (name === "0006_editorial") {
        expect(await dropStatuses()).not.toContain("withdrawn");
        const idx = await pool.query(
          "select 1 from pg_indexes where indexname = 'daily_drop_one_per_date_uq'",
        );
        expect(idx.rowCount).toBe(1);
      }
    }
    // Forget the reverted migrations in drizzle's journal (the newest entries, one per down file).
    await pool.query(
      `delete from drizzle.__drizzle_migrations where id in (select id from drizzle.__drizzle_migrations order by created_at desc limit ${DOWN.length})`,
    );
    const foundation = await tables();
    expect(foundation).not.toContain("profile");
    expect(foundation).toEqual(expect.arrayContaining(["user", "audit_log", "feature_flag"]));
    const status = await pool.query(
      "select 1 from information_schema.columns where table_name = 'user' and column_name = 'status'",
    );
    expect(status.rowCount).toBe(0);

    await migrate(db, { migrationsFolder: "./drizzle" });
    expect(await tables()).toEqual(full);
  });
});
