// Step 5.9: safety and moderation through the real data layer (J5, D-075, plan row 5.9). Runs on a scratch
// database created and dropped by this file, because evidence_access is append-only (invariant 7) and its rows
// keep their cases: the shared development database must not collect test cases it can never delete.
//
// Covered: reports (one case per object, duplicates, priority, self and hidden targets, reporting after a block,
// copyright routed away, the moderation copy), the reporter never reaching anything a member reads, the queue and
// assignment rules with the conflict of interest, evidence logging, decisions (removal with a warning, restriction,
// suspension, ban) and their effects, notifications to the member and the reporters, appeals (one per decision, a
// different reviewer, overturning restores), DSA notices joining cases, expiry and the purge of moderation copies.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { and, eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Client, Pool } from "pg";
import { closeDb, db } from "@/lib/db/client";
import {
  contentSnapshot,
  dailyDropAnswer,
  dailyDropQuestion,
  dailyDropTranslation,
  enforcementAction,
  evidenceAccess,
  moderationCase,
  notice,
  notification,
  privacySettings,
  profile,
  report,
  user,
} from "@/lib/db/schema";
import type { Viewer } from "@/lib/authz";
import { ownerVisibleAtAll } from "@/lib/authz";
import { createAnswer, createComment, editOwnAnswer, setReaction } from "@/lib/data/answers";
import { loadOwner, loadViewer } from "@/lib/data/facts";
import { blockMember } from "@/lib/data/graph";
import {
  appealDetail,
  appealQueue,
  caseDetail,
  decideAppeal,
  decideCase,
  moderationQueue,
  purgeSnapshots,
  takeCase,
} from "@/lib/data/moderation";
import { activityFor } from "@/lib/data/notifications";
import { storeNotice } from "@/lib/data/notices";
import {
  accountHold,
  acknowledgeRestriction,
  activeRestriction,
  createReport,
  holdKind,
  liftExpiredSuspensions,
  myNotices,
  myReports,
  submitAppeal,
} from "@/lib/data/safety";

const RUN = Date.now().toString(36);
const base = process.env.DATABASE_URL!;
const scratchName = `gr_safety_${RUN}`;
const ids: Record<string, string> = {};
let qid = "";

async function admin<T>(fn: (c: Client) => Promise<T>) {
  const c = new Client({ connectionString: base });
  await c.connect();
  try {
    return await fn(c);
  } finally {
    await c.end();
  }
}

async function mk(key: string, role: "member" | "moderator" | "admin" = "member") {
  const [u] = await db()
    .insert(user)
    .values({
      name: `Safety ${key}`,
      email: `${key}-${RUN}@safety.test`,
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
      username: `s${key}_${RUN}`.slice(0, 30),
      displayName: `Safety ${key}`,
      bio: `Bio ${key}`,
      visibility: "public",
      onboardedAt: new Date(),
    });
  await db().insert(privacySettings).values({ userId: u!.id });
}
const as = (key: string, role: "member" | "moderator" | "admin" = "member"): Promise<Viewer> =>
  loadViewer({ id: ids[key]!, role });

async function answerBy(key: string, body = `Odgovor ${key}`) {
  const r = await createAnswer(await as(key), qid, body);
  if (!r.ok) throw new Error(`answer ${key}: ${r.reason}`);
  return r.id;
}

const caseFor = async (type: string, id: string) =>
  (
    await db()
      .select()
      .from(moderationCase)
      .where(and(eq(moderationCase.targetType, type), eq(moderationCase.targetId, id)))
  )[0];

beforeAll(async () => {
  await admin((c) => c.query(`create database "${scratchName}"`));
  const u = new URL(base);
  u.pathname = `/${scratchName}`;
  process.env.DATABASE_URL = u.toString();
  await closeDb();
  const pool = new Pool({ connectionString: u.toString(), max: 2 });
  await migrate(drizzle(pool), { migrationsFolder: "drizzle" });
  await pool.end();
  for (const k of ["ana", "ben", "cara", "dino", "eva", "fran", "gina", "hana", "ivo", "jura"])
    await mk(k);
  await mk("mod", "moderator");
  await mk("mod2", "moderator");
  await mk("boss", "admin");
  const [q] = await db()
    .insert(dailyDropQuestion)
    .values({ status: "published", publishDate: "1993-03-03", publishedAt: new Date() })
    .returning({ id: dailyDropQuestion.id });
  qid = q!.id;
  await db()
    .insert(dailyDropTranslation)
    .values([
      { questionId: qid, locale: "hr", text: "Pitanje", review: "approved" },
      { questionId: qid, locale: "en", text: "Question", review: "approved" },
    ]);
});

afterAll(async () => {
  await closeDb();
  await admin((c) => c.query(`drop database if exists "${scratchName}" with (force)`));
});

describe("reports (SAFE-01)", () => {
  it("one case per object; a second reporter joins it; a repeat by the same reporter adds nothing", async () => {
    const a = await answerBy("ana");
    expect(
      await createReport(await as("ben"), {
        targetType: "answer",
        targetId: a,
        category: "spam",
        details: "  link na piratsku kopiju  ",
      }),
    ).toEqual({ ok: true });
    expect(
      (
        await createReport(await as("ben"), {
          targetType: "answer",
          targetId: a,
          category: "spam",
          details: "",
        })
      ).ok,
    ).toBe(true);
    // A threat raises the case to the top priority (J5: threats, minors, impersonation first).
    await createReport(await as("cara"), {
      targetType: "answer",
      targetId: a,
      category: "threat",
      details: "",
    });
    const c = await caseFor("answer", a);
    expect(c?.priority).toBe(0);
    expect(c?.subjectUserId).toBe(ids.ana);
    const reports = await db().select().from(report).where(eq(report.caseId, c!.id));
    expect(reports).toHaveLength(2);
    expect(reports.find((r) => r.reporterId === ids.ben)?.details).toBe("link na piratsku kopiju");
    const snaps = await db()
      .select()
      .from(contentSnapshot)
      .where(eq(contentSnapshot.caseId, c!.id));
    expect(snaps).toHaveLength(1);
    expect(snaps[0]!.content.body).toBe("Odgovor ana");
  });

  it("refuses the own content, a missing object, copyright (PUB-11 form) and over-long details", async () => {
    const a = await answerBy("dino");
    const dino = await as("dino");
    expect(
      (
        await createReport(dino, {
          targetType: "answer",
          targetId: a,
          category: "spam",
          details: "",
        })
      ).ok,
    ).toBe(false);
    const eva = await as("eva");
    expect(
      await createReport(eva, {
        targetType: "answer",
        targetId: "00000000-0000-4000-8000-000000000000",
        category: "spam",
        details: "",
      }),
    ).toEqual({ ok: false, reason: "not-available" });
    expect(
      await createReport(eva, {
        targetType: "answer",
        targetId: a,
        category: "copyright",
        details: "",
      }),
    ).toEqual({ ok: false, reason: "copyright" });
    expect(
      await createReport(eva, {
        targetType: "answer",
        targetId: a,
        category: "spam",
        details: "x".repeat(501),
      }),
    ).toEqual({ ok: false, reason: "not-allowed" });
  });

  it("allows reporting a profile after blocking it (J5 E2)", async () => {
    await blockMember(ids.eva!, ids.fran!);
    expect(
      await createReport(await as("eva"), {
        targetType: "profile",
        targetId: ids.fran!,
        category: "impersonation",
        details: "",
      }),
    ).toEqual({ ok: true });
    const c = await caseFor("profile", ids.fran!);
    expect(c?.priority).toBe(1);
  });

  it("the reporter sees status only, and their own reports only", async () => {
    const mine = await myReports(ids.ben!);
    expect(mine.length).toBeGreaterThan(0);
    expect(mine[0]).toMatchObject({ status: "received", outcome: null, targetType: "answer" });
    expect(await myReports(ids.cara!, mine[0]!.id)).toEqual([]);
  });
});

describe("queue, assignment and conflict of interest (ADM-10, J5 E3)", () => {
  it("a moderator sees the queue but opens a case only after taking it; every view is logged", async () => {
    const a = await answerBy("gina");
    await createReport(await as("hana"), {
      targetType: "answer",
      targetId: a,
      category: "harassment",
      details: "",
    });
    const c = (await caseFor("answer", a))!;
    const mod = await as("mod", "moderator");
    const q = await moderationQueue(mod);
    const row = q!.find((x) => x.id === c.id)!;
    expect(row).toMatchObject({ canOpen: false, canTake: true, conflict: null });
    expect(await caseDetail(mod, c.id)).toBeNull();
    expect(await takeCase(mod, c.id)).toEqual({ ok: true });
    const detail = await caseDetail(mod, c.id);
    expect(detail?.reports).toHaveLength(1);
    // The case never carries a reporter id or name, not even for staff.
    expect(JSON.stringify(detail)).not.toContain(ids.hana!);
    expect(JSON.stringify(detail)).not.toContain(`shana_${RUN}`);
    const logged = await db()
      .select()
      .from(evidenceAccess)
      .where(and(eq(evidenceAccess.caseId, c.id), eq(evidenceAccess.accessorId, ids.mod!)));
    expect(logged.length).toBeGreaterThan(0);
    // A second moderator cannot take or open it while it is assigned.
    const mod2 = await as("mod2", "moderator");
    expect(await takeCase(mod2, c.id)).toEqual({ ok: false, reason: "forbidden" });
    expect(await caseDetail(mod2, c.id)).toBeNull();
  });

  it("a moderator who reported, or whom a party blocked, cannot take the case; nobody decides their own", async () => {
    const a = await answerBy("ivo");
    await createReport(await as("mod"), {
      targetType: "answer",
      targetId: a,
      category: "spam",
      details: "",
    });
    const c = (await caseFor("answer", a))!;
    expect(await takeCase(await as("mod", "moderator"), c.id)).toEqual({
      ok: false,
      reason: "forbidden",
    });
    // The subject blocks mod2: mod2 is out too.
    await blockMember(ids.ivo!, ids.mod2!);
    const mod2 = await as("mod2", "moderator");
    expect((await moderationQueue(mod2))!.find((x) => x.id === c.id)?.conflict).toBe("involved");
    expect(await takeCase(mod2, c.id)).toEqual({ ok: false, reason: "forbidden" });
    // An admin may decide an involved case only with a stated reason.
    await blockMember(ids.ivo!, ids.boss!);
    const boss = await as("boss", "admin");
    expect(await decideCase(boss, c.id, { outcome: "none" })).toEqual({
      ok: false,
      reason: "override",
    });
    expect((await decideCase(boss, c.id, { outcome: "none" }, "Nema drugog moderatora.")).ok).toBe(
      true,
    );
    // A report about the admin themselves: never theirs to decide, not even with a reason.
    await createReport(await as("jura"), {
      targetType: "profile",
      targetId: ids.boss!,
      category: "other",
      details: "",
    });
    const own = (await caseFor("profile", ids.boss!))!;
    expect(await caseDetail(boss, own.id)).toBeNull();
    expect(await decideCase(boss, own.id, { outcome: "none" }, "ipak")).toEqual({
      ok: false,
      reason: "forbidden",
    });
  });
});

describe("decisions and their effects (SAFE-05, SAFE-07)", () => {
  it("removal with a warning: the answer is removed, the member gets the reasons, reporters get the outcome", async () => {
    const c = (
      await db().select().from(moderationCase).where(eq(moderationCase.subjectUserId, ids.ana!))
    )[0]!;
    const boss = await as("boss", "admin");
    expect(
      await decideCase(boss, c.id, {
        outcome: "action",
        kind: "warning",
        rule: "spam",
        statement: "Odgovor vodi na piratsku kopiju albuma.",
        removeContent: true,
      }),
    ).toMatchObject({ ok: true });
    const [a] = await db()
      .select()
      .from(dailyDropAnswer)
      .where(eq(dailyDropAnswer.id, c.targetId!));
    expect(a?.removedAt).not.toBeNull();
    // A second decision on the same case: already decided.
    expect(await decideCase(boss, c.id, { outcome: "none" })).toEqual({
      ok: false,
      reason: "decided",
    });
    const [n] = await myNotices(ids.ana!);
    expect(n).toMatchObject({
      kind: "warning",
      removesContent: true,
      rule: "spam",
      source: "report",
      appealOpen: true,
    });
    expect(n!.item?.text).toBe("Odgovor ana");
    // The reported member never sees who reported (plan row 5.9 acceptance).
    const memberSide = JSON.stringify([
      await myNotices(ids.ana!),
      await activityFor(ids.ana!, "hr"),
    ]);
    for (const k of ["ben", "cara"]) {
      expect(memberSide).not.toContain(ids[k]!);
      expect(memberSide).not.toContain(`s${k}_${RUN}`);
    }
    expect((await activityFor(ids.ana!, "hr")).some((i) => i.kind === "moderation")).toBe(true);
    const benSide = await activityFor(ids.ben!, "hr");
    expect(benSide.find((i) => i.kind === "report_update")).toMatchObject({ detail: "action" });
    expect((await myReports(ids.ben!))[0]).toMatchObject({ status: "done", outcome: "action" });
  });

  it("a restriction refuses answers, edits and comments, shows once, and leaves reactions alone", async () => {
    const a = await answerBy("jura");
    const other = await answerBy("hana", "Drugi odgovor");
    await createReport(await as("gina"), {
      targetType: "answer",
      targetId: a,
      category: "harassment",
      details: "",
    });
    const c = (await caseFor("answer", a))!;
    const boss = await as("boss", "admin");
    expect(
      (
        await decideCase(boss, c.id, {
          outcome: "action",
          kind: "restriction",
          rule: "respect",
          statement: "Ponovljeno vrijeđanje.",
          days: 3,
          removeContent: false,
        })
      ).ok,
    ).toBe(true);
    const jura = await as("jura");
    expect(await editOwnAnswer(jura, a, "nova verzija")).toEqual({
      ok: false,
      reason: "restricted",
    });
    expect(await createComment(jura, other, "komentar")).toEqual({
      ok: false,
      reason: "restricted",
    });
    expect((await setReaction(jura, other, true)).ok).toBe(true);
    const r = await activeRestriction(ids.jura!);
    expect(r).not.toBeNull();
    expect(await holdKind(ids.jura!)).toBe("restriction");
    await acknowledgeRestriction(ids.jura!, r!.id);
    expect(await holdKind(ids.jura!)).toBeNull();
  });

  it("a suspension hides the member and holds them on the status screen until it ends", async () => {
    await createReport(await as("ben"), {
      targetType: "profile",
      targetId: ids.dino!,
      category: "threat",
      details: "",
    });
    const c = (await caseFor("profile", ids.dino!))!;
    const boss = await as("boss", "admin");
    expect(
      (
        await decideCase(boss, c.id, {
          outcome: "action",
          kind: "suspension",
          rule: "violence",
          statement: "Prijetnja drugom članu.",
          days: 7,
          removeContent: false,
        })
      ).ok,
    ).toBe(true);
    const dino = (await loadOwner(ids.dino!))!;
    expect(dino.status).toBe("suspended");
    expect(ownerVisibleAtAll("MEMBER", dino)).toBe(false);
    expect(await holdKind(ids.dino!)).toBe("suspension");
    const hold = await accountHold(ids.dino!);
    expect(hold?.kind).toBe("suspension");
    expect(hold?.notice?.rule).toBe("violence");
    // Not lifted before its end; lifted after (the worker job and the next page view both call this).
    expect(await liftExpiredSuspensions(ids.dino!)).toBe(0);
    expect(await liftExpiredSuspensions(ids.dino!, new Date(Date.now() + 8 * 86_400_000))).toBe(1);
    expect((await loadOwner(ids.dino!))!.status).toBe("active");
  });

  it("refuses a malformed decision (no statement, days not offered, removal on a profile)", async () => {
    await createReport(await as("cara"), {
      targetType: "profile",
      targetId: ids.gina!,
      category: "spam",
      details: "",
    });
    const c = (await caseFor("profile", ids.gina!))!;
    const boss = await as("boss", "admin");
    const base = { outcome: "action", rule: "spam", removeContent: false } as const;
    expect(await decideCase(boss, c.id, { ...base, kind: "warning", statement: "  " })).toEqual({
      ok: false,
      reason: "statement",
    });
    expect(
      await decideCase(boss, c.id, { ...base, kind: "restriction", statement: "x", days: 2 }),
    ).toEqual({ ok: false, reason: "days" });
    expect(
      await decideCase(boss, c.id, { ...base, kind: "content_removal", statement: "x" }),
    ).toEqual({ ok: false, reason: "removeTarget" });
    expect(await decideCase(await as("ana"), c.id, { outcome: "none" })).toEqual({
      ok: false,
      reason: "forbidden",
    });
  });
});

describe("appeals (SAFE-06, ADM-11)", () => {
  it("one appeal per decision; the deciding moderator cannot review it; overturning restores", async () => {
    // A moderator decides a removal on hana's answer; hana appeals.
    const a = await answerBy("fran");
    await createReport(await as("ivo"), {
      targetType: "answer",
      targetId: a,
      category: "hate",
      details: "",
    });
    const c = (await caseFor("answer", a))!;
    const mod = await as("mod", "moderator");
    expect((await takeCase(mod, c.id)).ok).toBe(true);
    expect(
      (
        await decideCase(mod, c.id, {
          outcome: "action",
          kind: "content_removal",
          rule: "hate",
          statement: "Napad na skupinu ljudi.",
          removeContent: true,
        })
      ).ok,
    ).toBe(true);
    const [n] = await myNotices(ids.fran!);
    expect(await submitAppeal(ids.fran!, n!.id, "")).toEqual({ ok: false, reason: "invalid" });
    expect(await submitAppeal(ids.ivo!, n!.id, "nije moje")).toEqual({
      ok: false,
      reason: "not-available",
    });
    expect(await submitAppeal(ids.fran!, n!.id, "Kritizirao sam pjesmu, ne ljude.")).toEqual({
      ok: true,
    });
    expect(await submitAppeal(ids.fran!, n!.id, "opet")).toEqual({ ok: false, reason: "exists" });

    const ap = (await appealQueue(mod))!.find((x) => x.actionId === n!.id)!;
    expect(ap.ownDecision).toBe(true);
    expect(await appealDetail(mod, ap.id)).toBeNull();
    expect(await decideAppeal(mod, ap.id, "upheld", "ostaje")).toEqual({
      ok: false,
      reason: "forbidden",
    });
    // mod2 is out: a reporter of this case (ivo) blocked them earlier (review 5.9 M2); a third moderator reviews.
    expect(await appealDetail(await as("mod2", "moderator"), ap.id)).toBeNull();
    await mk("mod3", "moderator");
    const mod3 = await as("mod3", "moderator");
    expect((await appealDetail(mod3, ap.id))?.text).toContain("pjesmu");
    expect(await decideAppeal(mod3, ap.id, "overturned", "Kritika pjesme je dopuštena.")).toEqual({
      ok: true,
    });
    const [after] = await myNotices(ids.fran!);
    expect(after!.revokedAt).not.toBeNull();
    expect(after!.appeal).toMatchObject({ status: "overturned" });
    const [row] = await db().select().from(dailyDropAnswer).where(eq(dailyDropAnswer.id, a));
    expect(row?.removedAt).toBeNull();
    expect((await activityFor(ids.fran!, "hr")).some((i) => i.kind === "appeal")).toBe(true);
  });

  it("overturning a ban restores the account", async () => {
    await createReport(await as("ana"), {
      targetType: "profile",
      targetId: ids.hana!,
      category: "spam",
      details: "",
    });
    const c = (await caseFor("profile", ids.hana!))!;
    const boss = await as("boss", "admin");
    expect(
      (
        await decideCase(boss, c.id, {
          outcome: "action",
          kind: "ban",
          rule: "spam",
          statement: "Račun služi samo za reklame.",
          removeContent: false,
        })
      ).ok,
    ).toBe(true);
    expect((await loadOwner(ids.hana!))!.status).toBe("banned");
    expect(await holdKind(ids.hana!)).toBe("ban");
    const [n] = await myNotices(ids.hana!);
    expect((await submitAppeal(ids.hana!, n!.id, "Nisam spam.")).ok).toBe(true);
    const ap = (await appealQueue(boss))!.find((x) => x.actionId === n!.id)!;
    expect(await decideAppeal(boss, ap.id, "overturned", "Pogrešna procjena.")).toEqual({
      ok: true,
    });
    expect((await loadOwner(ids.hana!))!.status).toBe("active");
  });
});

describe("DSA notices (PUB-11 → ADM-10)", () => {
  it("a notice about one of our answers joins that answer's case; an outside URL opens its own", async () => {
    const a = await answerBy("eva", "Sporan sadržaj");
    await createReport(await as("ben"), {
      targetType: "answer",
      targetId: a,
      category: "private_info",
      details: "",
    });
    const before = (await caseFor("answer", a))!;
    await storeNotice(
      {
        category: "privacy",
        url: `http://localhost:3000/drop/1993-03-03/a/${a}`,
        explanation: "Objavljena je moja adresa.",
        name: "Ime Prezime",
        email: "notifier@example.test",
      },
      null,
    );
    const [n1] = await db().select().from(notice).where(eq(notice.caseId, before.id));
    expect(n1).toBeDefined();
    const outside = await storeNotice(
      {
        category: "fraud",
        url: "https://elsewhere.example/page",
        explanation: "Prijevara.",
        name: "A",
        email: "a@example.test",
      },
      null,
    );
    const [n2] = await db().select().from(notice).where(eq(notice.id, outside));
    const own = (
      await db().select().from(moderationCase).where(eq(moderationCase.id, n2!.caseId!))
    )[0]!;
    expect(own).toMatchObject({ targetType: "notice", subjectUserId: null });
    // Without a member behind it, only a record ("notice") or "none" fits.
    const boss = await as("boss", "admin");
    expect(
      await decideCase(boss, own.id, {
        outcome: "action",
        kind: "warning",
        rule: "illegal",
        statement: "x",
        removeContent: false,
      }),
    ).toEqual({ ok: false, reason: "subject" });
    expect(
      (
        await decideCase(boss, own.id, {
          outcome: "action",
          kind: "notice",
          rule: "illegal",
          statement: "Vanjska stranica, nije naš sadržaj.",
          removeContent: false,
        })
      ).ok,
    ).toBe(true);
    const [decided] = await db().select().from(notice).where(eq(notice.id, outside));
    expect(decided?.status).toBe("actioned");
  });
});

describe("housekeeping", () => {
  it("purges moderation copies of decided cases after their date, never of open ones", async () => {
    const far = new Date(Date.now() + 400 * 86_400_000);
    const open = await db()
      .select({ id: contentSnapshot.id })
      .from(contentSnapshot)
      .innerJoin(moderationCase, eq(moderationCase.id, contentSnapshot.caseId))
      .where(inArray(moderationCase.state, ["open", "in_progress"]));
    expect(open.length).toBeGreaterThan(0);
    const purged = await purgeSnapshots(far);
    expect(purged).toBeGreaterThan(0);
    const left = await db().select({ id: contentSnapshot.id }).from(contentSnapshot);
    expect(left.map((x) => x.id).sort()).toEqual(open.map((x) => x.id).sort());
  });

  it("system notices are written without an actor", async () => {
    const rows = await db()
      .select()
      .from(notification)
      .where(eq(notification.recipientId, ids.ana!));
    const sys = rows.filter((r) => r.type === "moderation");
    expect(sys.length).toBeGreaterThan(0);
    expect(sys.every((r) => r.actorId === null)).toBe(true);
    const actions = await db()
      .select()
      .from(enforcementAction)
      .where(eq(enforcementAction.subjectUserId, ids.ana!));
    expect(actions[0]?.appealUntil?.getTime()).toBeGreaterThan(Date.now() + 180 * 86_400_000);
  });
});

describe("security review 5.9 fixes", () => {
  it("M3: a case about staff is for an admin only, and an admin is never suspended or banned in the app", async () => {
    await mk("boss2", "admin");
    await createReport(await as("ana"), {
      targetType: "profile",
      targetId: ids.mod2!,
      category: "other",
      details: "",
    });
    const aboutMod = (await caseFor("profile", ids.mod2!))!;
    const mod = await as("mod", "moderator");
    expect(await takeCase(mod, aboutMod.id)).toEqual({ ok: false, reason: "forbidden" });
    expect(await caseDetail(mod, aboutMod.id)).toBeNull();
    expect((await caseDetail(await as("boss", "admin"), aboutMod.id))?.id).toBe(aboutMod.id);

    await createReport(await as("ben"), {
      targetType: "profile",
      targetId: ids.boss2!,
      category: "spam",
      details: "",
    });
    const aboutAdmin = (await caseFor("profile", ids.boss2!))!;
    expect(
      await decideCase(await as("boss", "admin"), aboutAdmin.id, {
        outcome: "action",
        kind: "ban",
        rule: "spam",
        statement: "x",
        removeContent: false,
      }),
    ).toEqual({ ok: false, reason: "staffSubject" });
    expect((await loadOwner(ids.boss2!))!.status).toBe("active");
  });

  it("M2: a moderator involved in a case cannot review its appeal", async () => {
    const a = await answerBy("cara", "Još jedan sporan odgovor");
    await createReport(await as("mod2"), {
      targetType: "answer",
      targetId: a,
      category: "spam",
      details: "",
    });
    const c = (await caseFor("answer", a))!;
    const boss = await as("boss", "admin");
    expect(
      (
        await decideCase(boss, c.id, {
          outcome: "action",
          kind: "warning",
          rule: "spam",
          statement: "Spam.",
          removeContent: false,
        })
      ).ok,
    ).toBe(true);
    const [n] = (await myNotices(ids.cara!)).filter((x) => x.kind === "warning");
    expect((await submitAppeal(ids.cara!, n!.id, "Nije spam.")).ok).toBe(true);
    const mod2 = await as("mod2", "moderator");
    const ap = (await appealQueue(mod2))!.find((x) => x.actionId === n!.id)!;
    expect(ap.self).toBe(true);
    expect(await appealDetail(mod2, ap.id)).toBeNull();
    expect(await decideAppeal(mod2, ap.id, "overturned", "x")).toEqual({
      ok: false,
      reason: "forbidden",
    });
    // L6: the evidence of a case with an open appeal is never purged.
    await purgeSnapshots(new Date(Date.now() + 400 * 86_400_000));
    const left = await db()
      .select({ id: contentSnapshot.id })
      .from(contentSnapshot)
      .where(eq(contentSnapshot.caseId, c.id));
    expect(left.length).toBe(1);
  });

  it("M4: the report keeps the handle of its time; a later rename is never revealed", async () => {
    await createReport(await as("gina"), {
      targetType: "profile",
      targetId: ids.ivo!,
      category: "spam",
      details: "",
    });
    await db()
      .update(profile)
      .set({ username: `renamed_${RUN}`.slice(0, 30) })
      .where(eq(profile.userId, ids.ivo!));
    const mine = await myReports(ids.gina!);
    const r = mine.find((x) => x.targetType === "profile")!;
    expect(r.handle).toBe(`sivo_${RUN}`.slice(0, 30));
    expect(JSON.stringify(mine)).not.toContain("renamed_");
  });
});
