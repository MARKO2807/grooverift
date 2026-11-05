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

// ---- Daily Drop (step 5.7) ----
// Questions are published by the worker or "Objavi sada" in the product; the suite inserts its own published
// questions on dates in the 1980s (never today, never the future, so the seeded reserve and the real calendar are
// untouched) and removes them with everything that hangs on them.

/** A published question on a free date in the 1980s; returns its id and date. */
export async function publishTestQuestion(
  hr: string,
  en = hr,
): Promise<{ id: string; date: string }> {
  for (let attempt = 0; attempt < 20; attempt++) {
    const d = new Date(Date.UTC(1980, 0, 1) + Math.floor(Math.random() * 3650) * 86_400_000);
    const date = d.toISOString().slice(0, 10);
    try {
      const [row] = await query<{ id: string }>(
        `insert into daily_drop_question (publish_date, status, published_at) values ($1, 'published', now()) returning id`,
        [date],
      );
      await query(
        `insert into daily_drop_translation (question_id, locale, text, review) values ($1, 'hr', $2, 'approved'), ($1, 'en', $3, 'approved')`,
        [row!.id, hr, en],
      );
      return { id: row!.id, date };
    } catch {
      // the date is taken by another run; try another
    }
  }
  throw new Error("no free test date");
}

/** A question in another state (scheduled, approved reserve) on a date, for the "not available" checks. */
export async function insertQuestion(
  status: "scheduled" | "approved" | "withdrawn",
  date: string | null,
  text: string,
): Promise<string> {
  const [row] = await query<{ id: string }>(
    `insert into daily_drop_question (publish_date, status) values ($1, $2) returning id`,
    [date, status],
  );
  await query(
    `insert into daily_drop_translation (question_id, locale, text, review) values ($1, 'hr', $2, 'approved'), ($1, 'en', $2, 'approved')`,
    [row!.id, text],
  );
  return row!.id;
}

/** Removes test questions with their answers, comments and reactions. */
export async function removeQuestions(ids: string[]) {
  if (!ids.length) return;
  await query(
    `delete from reaction where target_id in (select id from daily_drop_answer where question_id = any($1::uuid[]))`,
    [ids],
  );
  await query(
    `delete from comment where answer_id in (select id from daily_drop_answer where question_id = any($1::uuid[]))`,
    [ids],
  );
  await query(`delete from daily_drop_answer where question_id = any($1::uuid[])`, [ids]);
  await query(`delete from daily_drop_question where id = any($1::uuid[])`, [ids]);
}

export async function userIdOf(email: string): Promise<string> {
  const [row] = await query<{ id: string }>(`select id from "user" where email = $1`, [
    email.toLowerCase(),
  ]);
  if (!row) throw new Error(`no user ${email}`);
  return row.id;
}

/** An answer written straight into the database (other members' content for the reader's view). */
export async function insertAnswer(
  email: string,
  questionId: string,
  body: string,
): Promise<string> {
  const [row] = await query<{ id: string }>(
    `insert into daily_drop_answer (question_id, author_id, body) values ($1, $2, $3) returning id`,
    [questionId, await userIdOf(email), body],
  );
  return row!.id;
}

/**
 * A fictional, onboarded member with no password (they never sign in): an author whose content the tests block
 * or count. Removed with removeMembers.
 */
export async function insertMember(key: string, visibility: "public" | "private" = "public") {
  const suffix = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const username = `${key}_${suffix}`.slice(0, 30);
  const [row] = await query<{ id: string }>(
    `insert into "user" (name, email, email_verified, status) values ($1, $2, true, 'active') returning id`,
    [`E2E ${key}`, `${username}@e2e-drop.test`],
  );
  await query(
    `insert into profile (user_id, username, display_name, visibility, onboarded_at) values ($1, $2, $3, $4, now())`,
    [row!.id, username, `E2E ${key}`, visibility],
  );
  await query(`insert into privacy_settings (user_id) values ($1)`, [row!.id]);
  return { id: row!.id, username, email: `${username}@e2e-drop.test` };
}

export async function removeMembers(ids: string[]) {
  if (ids.length) await query(`delete from "user" where id = any($1::uuid[])`, [ids]);
}

/** A block straight into the database (the product's Block flow is tested on profiles). */
export async function insertBlock(blockerId: string, blockedId: string) {
  await query(`insert into block (blocker_id, blocked_id) values ($1, $2) on conflict do nothing`, [
    blockerId,
    blockedId,
  ]);
}

export const publishedToday = async (date: string) =>
  (
    await query<{ id: string }>(
      `select id from daily_drop_question where publish_date = $1 and status in ('scheduled', 'published')`,
      [date],
    )
  ).length > 0;
