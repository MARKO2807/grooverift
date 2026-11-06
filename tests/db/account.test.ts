// Step 5.10: settings, account and data through the real data layer (SET-09, SET-12, D-063 (9), D-066, plan row
// 5.10). Runs on a scratch database created and dropped by this file: the purge deletes users, and the audit log it
// writes to is append-only.
//
// Acceptance (plan 5.10): "after purge no personal data remains in any table except audit (hashed) and moderation
// records within retention" is the last test: it scans every text, uuid and jsonb column of every table for the
// member's id, address, names, bio and words.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { and, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Client, Pool } from "pg";
import { closeDb, db } from "@/lib/db/client";
import {
  account,
  comment,
  dailyDropAnswer,
  dailyDropQuestion,
  dailyDropReminder,
  dailyDropTranslation,
  dataExportRequest,
  deletionRequest,
  featureFlag,
  follow,
  genre,
  invitation,
  memberSettings,
  musicDnaEntry,
  notification,
  notificationPreference,
  privacySettings,
  profile,
  reaction,
  session,
  user,
  usernameReservation,
  verification,
} from "@/lib/db/schema";
import type { Viewer } from "@/lib/authz";
import { ownerVisibleAtAll, relationship, noGraph } from "@/lib/authz";
import { deletionDate, EXPORT_TTL_HOURS, GRACE_DAYS } from "@/lib/account/rules";
import {
  accountFacts,
  deactivateAccount,
  pendingDeletion,
  purgeDueAccounts,
  reactivateOnSignIn,
  requestDeletion,
  restoreAccount,
} from "@/lib/data/account";
import { createAnswer, createComment, setReaction } from "@/lib/data/answers";
import {
  buildExport,
  collectMemberData,
  exportArchive,
  latestExport,
  requestExport,
  sweepExports,
} from "@/lib/data/export";
import { loadOwner, loadViewer } from "@/lib/data/facts";
import { createFeedback, feedbackDetail, feedbackQueue, updateFeedback } from "@/lib/data/feedback";
import { blockMember, followMember, muteMember } from "@/lib/data/graph";
import { createReport, holdKind } from "@/lib/data/safety";
import { saveTimeZone, setReduceMotion, settingsSummary } from "@/lib/data/settings";

const RUN = Date.now().toString(36);
const base = process.env.DATABASE_URL!;
const scratchName = `gr_account_${RUN}`;
const ids: Record<string, string> = {};
let qid = "";
let q2 = "";

async function admin<T>(fn: (c: Client) => Promise<T>) {
  const c = new Client({ connectionString: base });
  await c.connect();
  try {
    return await fn(c);
  } finally {
    await c.end();
  }
}

const email = (key: string) => `${key}-${RUN}@account.test`;
const handle = (key: string) => `a${key}_${RUN}`.slice(0, 30);

async function mk(key: string, role: "member" | "admin" = "member") {
  const [u] = await db()
    .insert(user)
    .values({
      name: `Racun ${key} ${RUN}`,
      email: email(key),
      emailVerified: true,
      role,
      twoFactorEnabled: role !== "member",
    })
    .returning({ id: user.id });
  ids[key] = u!.id;
  await db()
    .insert(profile)
    .values({
      userId: u!.id,
      username: handle(key),
      displayName: `Racun ${key} ${RUN}`,
      bio: `Biografija ${key} ${RUN}`,
      visibility: "public",
      onboardedAt: new Date(),
    });
  await db().insert(privacySettings).values({ userId: u!.id });
}
const as = (key: string): Promise<Viewer> => loadViewer({ id: ids[key]!, role: "member" });

beforeAll(async () => {
  await admin((c) => c.query(`create database "${scratchName}"`));
  const u = new URL(base);
  u.pathname = `/${scratchName}`;
  process.env.DATABASE_URL = u.toString();
  await closeDb();
  const pool = new Pool({ connectionString: u.toString(), max: 2 });
  await migrate(drizzle(pool), { migrationsFolder: "drizzle" });
  await pool.end();
  for (const k of ["xena", "yan", "zora", "rita", "deo", "tina", "fbm"]) await mk(k);
  await mk("boss", "admin");
  for (const [date, holder] of [
    ["1994-04-04", "a"],
    ["1994-04-05", "b"],
  ] as const) {
    const [q] = await db()
      .insert(dailyDropQuestion)
      .values({ status: "published", publishDate: date, publishedAt: new Date() })
      .returning({ id: dailyDropQuestion.id });
    if (holder === "a") qid = q!.id;
    else q2 = q!.id;
    await db()
      .insert(dailyDropTranslation)
      .values([
        { questionId: q!.id, locale: "hr", text: `Pitanje ${date}`, review: "approved" },
        { questionId: q!.id, locale: "en", text: `Question ${date}`, review: "approved" },
      ]);
  }
});

afterAll(async () => {
  await closeDb();
  await admin((c) => c.query(`drop database if exists "${scratchName}" with (force)`));
});

describe("deactivate and reactivate (SET-09)", () => {
  it("hides the account, ends every session, and the next sign-in brings it back", async () => {
    await db()
      .insert(session)
      .values({
        userId: ids.deo!,
        token: `tok-deo-${RUN}`,
        expiresAt: new Date(Date.now() + 86_400_000),
        updatedAt: new Date(),
      });
    expect(await deactivateAccount(ids.deo!)).toEqual({ ok: true });
    expect((await loadViewer({ id: ids.deo!, role: "member" })).status).toBe("deactivated");
    expect(await db().select().from(session).where(eq(session.userId, ids.deo!))).toHaveLength(0);
    // Others see nothing (matrix §1); the member themself still could (SELF).
    const owner = (await loadOwner(ids.deo!))!;
    const other = await as("yan");
    expect(ownerVisibleAtAll(relationship(other, owner, noGraph), owner)).toBe(false);
    // A second deactivation is refused; nothing is deleted meanwhile.
    expect(await deactivateAccount(ids.deo!)).toEqual({ ok: false, reason: "state" });
    expect(await reactivateOnSignIn(ids.deo!)).toBe(true);
    expect((await loadViewer({ id: ids.deo!, role: "member" })).status).toBe("active");
    expect(await reactivateOnSignIn(ids.deo!)).toBe(false);
  });

  it("is not reactivated by the password step of a 2FA account, only by the completed sign-in (review M1)", async () => {
    await db().update(user).set({ twoFactorEnabled: true }).where(eq(user.id, ids.deo!));
    expect(await deactivateAccount(ids.deo!)).toEqual({ ok: true });
    expect(await reactivateOnSignIn(ids.deo!, { firstFactorOnly: true })).toBe(false);
    expect((await loadViewer({ id: ids.deo!, role: "member" })).status).toBe("deactivated");
    expect(await reactivateOnSignIn(ids.deo!)).toBe(true);
    await db().update(user).set({ twoFactorEnabled: false }).where(eq(user.id, ids.deo!));
  });

  it("refuses staff accounts while they hold the role", async () => {
    expect(await deactivateAccount(ids.boss!)).toEqual({ ok: false, reason: "staff" });
    expect(await requestDeletion(ids.boss!)).toEqual({ ok: false, reason: "staff" });
    expect((await accountFacts(ids.boss!))?.isStaff).toBe(true);
  });
});

describe("delete with the grace period (SET-09, D-063 (9))", () => {
  it("schedules the purge 30 days out, hides the account, and a restore puts everything back", async () => {
    const now = new Date("2026-11-07T10:00:00Z");
    const r = await requestDeletion(ids.tina!, now);
    expect(r).toEqual({ ok: true, scheduledFor: deletionDate(now) });
    expect(deletionDate(now).getTime() - now.getTime()).toBe(GRACE_DAYS * 86_400_000);
    expect(await holdKind(ids.tina!)).toBe("deletion");
    expect((await pendingDeletion(ids.tina!))?.scheduledFor).toEqual(deletionDate(now));
    // One open request only.
    expect((await requestDeletion(ids.tina!, now)).ok).toBe(false);
    // Nothing is purged before the date.
    expect(await purgeDueAccounts(new Date(now.getTime() + 29 * 86_400_000))).toBe(0);
    expect(await restoreAccount(ids.tina!, new Date(now.getTime() + 86_400_000))).toBe(true);
    expect((await loadViewer({ id: ids.tina!, role: "member" })).status).toBe("active");
    expect(await pendingDeletion(ids.tina!)).toBeNull();
    expect(await holdKind(ids.tina!)).toBeNull();
    // A restored member is untouched by a later purge run.
    expect(await purgeDueAccounts(new Date(now.getTime() + 40 * 86_400_000))).toBe(0);
    expect(await loadOwner(ids.tina!)).not.toBeNull();
  });

  it("cannot be restored once the date has passed (the purge owns it)", async () => {
    const now = new Date("2026-10-01T10:00:00Z");
    expect((await requestDeletion(ids.rita!, now)).ok).toBe(true);
    expect(await restoreAccount(ids.rita!, new Date(now.getTime() + 31 * 86_400_000))).toBe(false);
    expect(await purgeDueAccounts(new Date(now.getTime() + 31 * 86_400_000))).toBe(1);
    expect(await loadOwner(ids.rita!)).toBeNull();
    const [req] = await db()
      .select()
      .from(deletionRequest)
      .where(eq(deletionRequest.userId, ids.rita!));
    expect(req?.completedAt).not.toBeNull();
    // Running again does nothing.
    expect(await purgeDueAccounts(new Date(now.getTime() + 32 * 86_400_000))).toBe(0);
  });
});

describe("the data copy (D-066, plan §1.2)", () => {
  it("builds a ZIP for the owner only, once at a time, and drops it after 24 hours", async () => {
    const zora = await as("zora");
    await createAnswer(zora, qid, `Zorin odgovor ${RUN}`);
    const first = await requestExport(ids.zora!);
    expect(first.ok).toBe(true);
    const again = await requestExport(ids.zora!);
    expect(again.ok && first.ok && again.id === first.id).toBe(true);
    if (!first.ok) return;
    const t0 = new Date();
    expect(await buildExport(first.id, t0)).toBe("ready");
    // A second build of the same request claims nothing.
    expect(await buildExport(first.id, t0)).toBeNull();
    const copy = await exportArchive(ids.zora!, first.id, t0);
    expect(copy?.archive.subarray(0, 2).toString()).toBe("PK");
    expect(await exportArchive(ids.yan!, first.id, t0)).toBeNull();
    expect((await latestExport(ids.zora!, t0))?.status).toBe("ready");
    const later = new Date(t0.getTime() + (EXPORT_TTL_HOURS + 1) * 3_600_000);
    expect(await exportArchive(ids.zora!, first.id, later)).toBeNull();
    expect((await sweepExports(later)).expired).toBe(1);
    const [row] = await db()
      .select()
      .from(dataExportRequest)
      .where(eq(dataExportRequest.id, first.id));
    expect(row?.status).toBe("expired");
    expect(row?.archive).toBeNull();
    expect(await latestExport(ids.zora!, later)).toBeNull();
  });

  it("holds the member's own data and never who reported them", async () => {
    // yan reports zora's answer; zora's copy must not name yan anywhere.
    const [a] = await db()
      .select({ id: dailyDropAnswer.id })
      .from(dailyDropAnswer)
      .where(eq(dailyDropAnswer.authorId, ids.zora!));
    expect(
      (
        await createReport(await as("yan"), {
          targetType: "answer",
          targetId: a!.id,
          category: "spam",
          details: `Prijava od yana ${RUN}`,
        })
      ).ok,
    ).toBe(true);
    const files = (await collectMemberData(ids.zora!))!;
    expect(Object.keys(files).sort()).toEqual(
      [
        "account.json",
        "answers.json",
        "blocks.json",
        "comments.json",
        "decisions.json",
        "feedback.json",
        "follows.json",
        "music-dna.json",
        "mutes.json",
        "notices.json",
        "profile.json",
        "reactions.json",
        "reports.json",
        "settings.json",
      ].sort(),
    );
    const text = JSON.stringify(files);
    expect(text).toContain(`Zorin odgovor ${RUN}`);
    expect(text).toContain(email("zora"));
    expect(text).not.toContain(ids.yan!);
    expect(text).not.toContain(handle("yan"));
    expect(text).not.toContain(`Prijava od yana ${RUN}`);
  });
});

describe("settings (SET-01, SET-07, Pristupačnost)", () => {
  it("saves the time zone for the reminder too, and the motion switch", async () => {
    await db().insert(dailyDropReminder).values({ userId: ids.yan!, enabled: true });
    expect(await saveTimeZone(ids.yan!, "America/New_York")).toBe(true);
    expect(await saveTimeZone(ids.yan!, "Mars/Olympus")).toBe(false);
    const [r] = await db()
      .select()
      .from(dailyDropReminder)
      .where(eq(dailyDropReminder.userId, ids.yan!));
    expect(r?.timeZone).toBe("America/New_York");
    await setReduceMotion(ids.yan!, true);
    const s = await settingsSummary(ids.yan!);
    expect(s?.timeZone).toBe("America/New_York");
    expect(s?.reduceMotion).toBe(true);
    await setReduceMotion(ids.yan!, false);
    expect((await settingsSummary(ids.yan!))?.reduceMotion).toBe(false);
  });
});

describe("feedback (SET-12, ADM-15)", () => {
  it("keeps only the known details, shows the address only when a reply was asked for", async () => {
    expect(
      await createFeedback(ids.fbm!, {
        kind: "bug",
        text: "  Gumb ne radi  ",
        context: { screen: "Početna", device: "Chrome · Android", evil: "x".repeat(50) },
        replyByEmail: false,
        locale: "hr",
      }),
    ).toEqual({ ok: true });
    expect(
      await createFeedback(ids.fbm!, {
        kind: "idea",
        text: "Tamna tema je super",
        context: null,
        replyByEmail: true,
        locale: "en",
      }),
    ).toEqual({ ok: true });
    expect(
      (
        await createFeedback(ids.fbm!, {
          kind: "bug",
          text: "   ",
          context: {},
          replyByEmail: false,
          locale: "hr",
        })
      ).ok,
    ).toBe(false);
    const open = await feedbackQueue("new");
    const bug = open.find((x) => x.kind === "bug" && x.username === handle("fbm"))!;
    const idea = open.find((x) => x.kind === "idea" && x.username === handle("fbm"))!;
    const d1 = (await feedbackDetail(bug.id))!;
    expect(d1.text).toBe("Gumb ne radi");
    expect(d1.context).toEqual({ screen: "Početna", device: "Chrome · Android" });
    expect(d1.replyTo).toBeNull();
    expect((await feedbackDetail(idea.id))!.replyTo).toBe(email("fbm"));
    expect(await updateFeedback(ids.boss!, bug.id, { notes: "Popravljeno", done: true })).toBe(
      true,
    );
    expect((await feedbackQueue("new")).some((x) => x.id === bug.id)).toBe(false);
    expect((await feedbackDetail(bug.id))!.status).toBe("done");
  });
});

describe("the purge (plan 5.10 acceptance)", () => {
  it("leaves no personal data in any table except the audit log and moderation records", async () => {
    const x = ids.xena!;
    const xena = await as("xena");
    const yan = await as("yan");
    const zora = await as("zora");

    // Everything a member leaves behind.
    const [g] = await db()
      .insert(genre)
      .values({ slug: `g-${RUN}`, nameHr: "Žanr", nameEn: "Genre" })
      .returning({ id: genre.id });
    await db()
      .insert(musicDnaEntry)
      .values({ userId: x, kind: "genre", genreId: g!.id, position: 0 });
    await db().insert(memberSettings).values({ userId: x, reduceMotion: true });
    await db().insert(dailyDropReminder).values({ userId: x, enabled: true });
    await db()
      .insert(notificationPreference)
      .values({ userId: x, type: "comment", channel: "push", enabled: true });
    await db()
      .insert(usernameReservation)
      .values({
        username: `old_${RUN}`,
        userId: x,
        reservedUntil: new Date(Date.now() + 86_400_000),
      });
    await db().insert(account).values({
      userId: x,
      accountId: x,
      providerId: "credential",
      password: "argon2-hash-placeholder",
      updatedAt: new Date(),
    });
    await db()
      .insert(session)
      .values({
        userId: x,
        token: `tok-x-${RUN}`,
        expiresAt: new Date(Date.now() + 86_400_000),
        ipAddress: "203.0.113.7",
        userAgent: "Xena-Agent",
        updatedAt: new Date(),
      });
    await db()
      .insert(verification)
      .values({
        identifier: `change-email:${email("xena")}`,
        value: x,
        expiresAt: new Date(Date.now() + 86_400_000),
      });
    await db()
      .insert(invitation)
      .values({
        email: email("xena"),
        tokenHash: `hash-${RUN}`,
        status: "accepted",
        expiresAt: new Date(Date.now() + 86_400_000),
        acceptedUserId: x,
        acceptedAt: new Date(),
      });
    await db()
      .insert(featureFlag)
      .values({ key: `flag_${RUN}`, state: "on", audience: { userIds: [x, ids.yan!] } });
    expect((await followMember(xena, ids.yan!)).ok).toBe(true);
    expect((await followMember(yan, x)).ok).toBe(true);
    expect((await blockMember(x, ids.deo!)).ok).toBe(true);
    expect((await muteMember(x, ids.tina!)).ok).toBe(true);

    // An answer with a reply from someone else (keeps a placeholder) and one without (goes entirely).
    const kept = await createAnswer(xena, qid, `Xenin zadrzani odgovor ${RUN}`);
    const gone = await createAnswer(xena, q2, `Xenin obrisani odgovor ${RUN}`);
    if (!kept.ok || !gone.ok) throw new Error("answers");
    const yanComment = await createComment(yan, kept.id, `Yanov komentar ${RUN}`);
    expect(yanComment.ok).toBe(true);
    expect((await createComment(xena, kept.id, `Xenin vlastiti komentar ${RUN}`)).ok).toBe(true);
    expect((await setReaction(yan, kept.id, true)).ok).toBe(true);
    // Xena's words under someone else's answer, and her reaction to it.
    const [zAnswer] = await db()
      .select({ id: dailyDropAnswer.id })
      .from(dailyDropAnswer)
      .where(eq(dailyDropAnswer.authorId, ids.zora!));
    expect((await createComment(xena, zAnswer!.id, `Xenin komentar kod Zore ${RUN}`)).ok).toBe(
      true,
    );
    expect((await setReaction(xena, zAnswer!.id, true)).ok).toBe(true);
    // Reports both ways: Xena reports Zora; Zora reports Xena's profile (a moderation record).
    expect(
      (
        await createReport(xena, {
          targetType: "answer",
          targetId: zAnswer!.id,
          category: "harassment",
          details: `Xenina prijava ${RUN}`,
        })
      ).ok,
    ).toBe(true);
    expect(
      (
        await createReport(zora, {
          targetType: "profile",
          targetId: x,
          category: "spam",
          details: "",
        })
      ).ok,
    ).toBe(true);
    await createFeedback(x, {
      kind: "other",
      text: `Xenina povratna ${RUN}`,
      context: {},
      replyByEmail: true,
      locale: "hr",
    });
    const ex = await requestExport(x);
    if (ex.ok) await buildExport(ex.id);

    // Delete, then let the grace period pass.
    const now = new Date();
    expect((await requestDeletion(x, now)).ok).toBe(true);
    expect(await db().select().from(session).where(eq(session.userId, x))).toHaveLength(0);
    expect(await purgeDueAccounts(new Date(now.getTime() + (GRACE_DAYS + 1) * 86_400_000))).toBe(1);

    // The placeholder: empty body, no author, Yan's comment still there; the other answer is gone.
    const [ph] = await db().select().from(dailyDropAnswer).where(eq(dailyDropAnswer.id, kept.id));
    expect(ph).toMatchObject({ body: "", authorId: null });
    expect(ph?.deletedAt).not.toBeNull();
    expect(
      await db()
        .select()
        .from(comment)
        .where(and(eq(comment.answerId, kept.id), eq(comment.authorId, ids.yan!))),
    ).toHaveLength(1);
    expect(
      await db().select().from(dailyDropAnswer).where(eq(dailyDropAnswer.id, gone.id)),
    ).toHaveLength(0);
    expect(
      await db()
        .select()
        .from(reaction)
        .where(and(eq(reaction.targetType, "answer"), eq(reaction.targetId, kept.id))),
    ).toHaveLength(0);
    expect(await db().select().from(follow).where(eq(follow.followeeId, x))).toHaveLength(0);
    expect(await db().select().from(notification).where(eq(notification.actorId, x))).toHaveLength(
      0,
    );
    const [flag] = await db()
      .select()
      .from(featureFlag)
      .where(eq(featureFlag.key, `flag_${RUN}`));
    expect(flag?.audience.userIds).toEqual([ids.yan]);

    // The scan: every text-like column of every table, for every trace of Xena.
    const needles = [
      x,
      email("xena"),
      handle("xena"),
      `Racun xena ${RUN}`,
      `Biografija xena ${RUN}`,
      `Xenin zadrzani odgovor ${RUN}`,
      `Xenin obrisani odgovor ${RUN}`,
      `Xenin vlastiti komentar ${RUN}`,
      `Xenin komentar kod Zore ${RUN}`,
      `Xenina povratna ${RUN}`,
      `old_${RUN}`,
      "Xena-Agent",
      "203.0.113.7",
    ];
    // Allowed to keep a trace, each with its reason (plan §1.2, counsel B.3):
    //   audit_log: append-only, the pseudonymous id and a keyed IP hash under the audit retention;
    //   deletion_request: the completed request (an id and dates, the proof the purge ran);
    //   report, moderation_case: moderation records within retention (the reported handle and object id, and the
    //   words of Xena's own report about someone else, without her as reporter); content_snapshot: the moderation
    //   copy of what was reported (here her profile), purged by its own date (SNAPSHOT_DAYS, checked below).
    const allowed = new Set([
      "audit_log",
      "deletion_request",
      "report",
      "moderation_case",
      "content_snapshot",
    ]);
    const cols = (
      await db().execute<{ table_name: string; column_name: string }>(sql`
        select c.table_name, c.column_name from information_schema.columns c
        join information_schema.tables t on t.table_name = c.table_name and t.table_schema = c.table_schema
        where c.table_schema = 'public' and t.table_type = 'BASE TABLE'
          and c.udt_name in ('text', 'varchar', 'uuid', 'jsonb', 'json', '_text')
          and c.table_name not like '\\_\\_%'`)
    ).rows;
    const hits: string[] = [];
    for (const { table_name, column_name } of cols) {
      // The audit log may keep the pseudonymous ids only; its metadata and user agent are scanned (review L1).
      if (table_name === "audit_log" && (column_name === "actor_id" || column_name === "target_id"))
        continue;
      if (table_name !== "audit_log" && allowed.has(table_name)) continue;
      for (const n of needles) {
        const r = await db().execute<{ n: number }>(
          sql`select count(*)::int as n from ${sql.identifier(table_name)} where ${sql.identifier(column_name)}::text ilike ${`%${n}%`}`,
        );
        if (r.rows[0]!.n > 0) hits.push(`${table_name}.${column_name} ∋ ${n}`);
      }
    }
    expect(hits).toEqual([]);

    // The moderation copy keeps no author id and goes on its own date, within the retention.
    const snaps = await db().execute<{ author_id: string | null; days: number }>(
      sql`select author_id, extract(epoch from purge_after - captured_at) / 86400 as days
          from content_snapshot where object_id = ${x}`,
    );
    expect(snaps.rows.length).toBe(1);
    expect(snaps.rows[0]!.author_id).toBeNull();
    expect(Math.round(Number(snaps.rows[0]!.days))).toBeLessThanOrEqual(90);

    // The moderation records that remain carry no reporter or subject id of Xena.
    const reports = await db().execute<{
      reporter_id: string | null;
      target_owner_id: string | null;
    }>(
      sql`select reporter_id, target_owner_id from report where details = ${`Xenina prijava ${RUN}`} or target_id = ${x}`,
    );
    expect(reports.rows.length).toBe(2);
    // The handle of the purged member is gone from reports about them (review M2).
    const handles = await db().execute<{ n: number }>(
      sql`select count(*)::int as n from report where target_handle = ${handle("xena")}`,
    );
    expect(handles.rows[0]!.n).toBe(0);
    for (const r of reports.rows) {
      expect(r.reporter_id).not.toBe(x);
      expect(r.target_owner_id).not.toBe(x);
    }
  });
});
