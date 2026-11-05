// Direct database access for the end-to-end suite (step 5.4): invitations are created by admins with a second
// factor in the product, so the tests insert their own rows the way the data layer does (SHA-256 of the token).
// Uses the same DATABASE_URL as the app under test (see global-setup.ts); touches only its own rows.
import { createHash, randomBytes } from "node:crypto";
import { config } from "dotenv";
import { Client } from "pg";

config({ path: ".env.local", quiet: true });
const url =
  process.env.DATABASE_URL ?? "postgres://grooverift:grooverift@127.0.0.1:5432/grooverift";

async function query<T extends Record<string, unknown>>(sql: string, params: unknown[] = []) {
  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    return (await client.query<T>(sql, params)).rows;
  } finally {
    await client.end();
  }
}

/** A sent invitation for `email`; returns the raw token (the part that goes into the link). */
export async function insertInvitation(
  email: string,
  opts: { locale?: "hr" | "en"; expiresInMs?: number } = {},
): Promise<{ token: string; id: string }> {
  const token = randomBytes(32).toString("base64url");
  const hash = createHash("sha256").update(token).digest("hex");
  const expires = new Date(Date.now() + (opts.expiresInMs ?? 14 * 86_400_000));
  const [row] = await query<{ id: string }>(
    `insert into invitation (email, token_hash, locale, expires_at) values ($1, $2, $3, $4) returning id`,
    [email.trim().toLowerCase(), hash, opts.locale ?? "hr", expires],
  );
  return { token, id: row!.id };
}

export const inviteStatus = async (id: string) =>
  (await query<{ status: string }>(`select status from invitation where id = $1`, [id]))[0]?.status;

/** Staff roles are given by an admin in the product; the suite sets one directly to test the admin screens. */
export async function setRole(email: string, role: "member" | "editor" | "moderator" | "admin") {
  await query(`update "user" set role = $2 where email = $1`, [email.toLowerCase(), role]);
}

export async function flagStateOf(key: string) {
  return (await query<{ state: string }>(`select state from feature_flag where key = $1`, [key]))[0]
    ?.state;
}

export async function setFlagState(key: string, state: "on" | "off" | "paused") {
  await query(
    `insert into feature_flag (key, state) values ($1, $2) on conflict (key) do update set state = excluded.state`,
    [key, state],
  );
}
