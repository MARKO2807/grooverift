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

// ---- Safety and moderation (step 5.9) ----

/**
 * A moderation decision about a member written straight into the database (the decision flow itself is tested
 * through ADM-10 in safety.spec.ts): a restriction or a suspension for `days`, with the account status a suspension
 * sets. Returns the action id.
 */
export async function insertEnforcement(
  userId: string,
  kind: "restriction" | "suspension",
  days: number,
  statement: string,
): Promise<string> {
  const [row] = await query<{ id: string }>(
    `insert into enforcement_action (subject_user_id, kind, statement_of_reasons, rule_ref, ends_at, appeal_until)
     values ($1, $2, $3, 'respect', now() + ($4 || ' days')::interval, now() + interval '183 days') returning id`,
    [userId, kind, statement, String(days)],
  );
  if (kind === "suspension")
    await query(`update "user" set status = 'suspended' where id = $1`, [userId]);
  return row!.id;
}

export async function usernameOf(email: string): Promise<string> {
  const [row] = await query<{ username: string }>(
    `select p.username from profile p join "user" u on u.id = p.user_id where u.email = $1`,
    [email.toLowerCase()],
  );
  if (!row) throw new Error(`no profile for ${email}`);
  return row.username;
}

/** The moderation case for a reported object (the queue rows carry no content to find it by). */
export async function caseIdFor(targetId: string): Promise<string> {
  const [row] = await query<{ id: string }>(
    `select id from moderation_case where target_id = $1 order by created_at desc limit 1`,
    [targetId],
  );
  if (!row) throw new Error(`no case for ${targetId}`);
  return row.id;
}

/** Test cleanup: cases cannot be deleted (evidence_access keeps them), so open ones about test objects are closed. */
export async function closeCasesFor(targetIds: string[]) {
  if (!targetIds.length) return;
  await query(
    `update moderation_case set state = 'closed', outcome = 'none', decided_at = now() where target_id = any($1::uuid[]) and state in ('open', 'in_progress')`,
    [targetIds],
  );
}
