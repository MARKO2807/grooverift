// Member safety (step 5.9; J5, D-075, SAFE-01 to SAFE-08). Reports, the member's own reports and notices, the
// basic appeal, posting restrictions and account holds, and the block and mute lists.
//
// Rules held here:
// - The reporter is never revealed: nothing a member can read (their notices, their reports, Activity) carries a
//   reporter id or name; only staff reach the report rows, through a case (src/lib/data/moderation.ts).
// - A report is about something the reporter can see, or could see before a block (J5 E2). Hidden accounts and
//   missing objects answer "not available" like everywhere else (IA8).
// - Every report joins the one open case for its object (J5 E4) and leaves a moderation copy of the object at the
//   moment of the report (J5 E9), kept under the retention rule in rules.ts.
import { and, asc, desc, eq, gt, inArray, isNull, lte, sql } from "drizzle-orm";
import { canViewContent, canViewProfileSection, type Viewer } from "@/lib/authz";
import { db } from "@/lib/db/client";
import {
  appeal,
  block,
  comment,
  contentSnapshot,
  dailyDropAnswer as answer,
  dailyDropQuestion as question,
  enforcementAction,
  moderationCase,
  mute,
  notice,
  profile,
  report,
  user,
} from "@/lib/db/schema";
import { utcDate } from "@/lib/editorial/rules";
import {
  APPEAL_MAX,
  DETAILS_MAX,
  memberReportStatus,
  reportPriority,
  routesToNoticeForm,
  SNAPSHOT_DAYS,
  type ActionKind,
  type MemberReportStatus,
  type ReportCategory,
  type ReportTarget,
  type Rule,
} from "@/lib/moderation/rules";
import { isUniqueViolation, SafeDbError } from "./db-errors";
import { loadGraph, loadOwner, loadViewer, type OwnerRecord } from "./facts";
import { consume } from "./rate-limit";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Who may file a report: signed in, active, finished onboarding. A posting restriction does not stop reports. */
const mayReport = (v: Viewer): v is Viewer & { id: string } =>
  !!v.id && v.status === "active" && v.onboarded !== false;

// ============================================================ Reports (SAFE-01)

export type Resolved = {
  ownerId: string;
  objectType: ReportTarget;
  objectId: string;
  content: Record<string, unknown>;
};

/**
 * The object behind a report, when it may be reported: it exists and is live, its author is an active member who
 * finished onboarding, it is not the reporter's own, and the reporter can see it now (review 5.9 M4: no reports,
 * and so no handle in "Moje prijave", for what the reporter may not see). A block between the two does not stop a
 * report (J5 E2). `reporterId` null: a DSA notice from anyone, checked by a person instead.
 */
export async function resolveTarget(
  reporterId: string | null,
  type: ReportTarget,
  id: string,
): Promise<Resolved | null> {
  if (!UUID.test(id)) return null;
  let ownerId: string | null = null;
  let content: Record<string, unknown> = {};
  let threadAuthorId: string | null = null;
  if (type === "profile") {
    ownerId = id;
    const [p] = await db()
      .select({ username: profile.username, displayName: profile.displayName, bio: profile.bio })
      .from(profile)
      .where(eq(profile.userId, id));
    if (!p) return null;
    content = { username: p.username, displayName: p.displayName, bio: p.bio ?? "" };
  } else if (type === "answer") {
    const [a] = await db()
      .select({
        authorId: answer.authorId,
        body: answer.body,
        status: question.status,
        date: question.publishDate,
      })
      .from(answer)
      .innerJoin(question, eq(question.id, answer.questionId))
      .where(and(eq(answer.id, id), isNull(answer.deletedAt), isNull(answer.removedAt)));
    if (!a || a.status !== "published" || !a.date || a.date > utcDate()) return null;
    ownerId = a.authorId;
    content = { body: a.body, date: a.date };
  } else {
    const [c] = await db()
      .select({
        authorId: comment.authorId,
        body: comment.body,
        answerId: comment.answerId,
        answerAuthorId: answer.authorId,
        status: question.status,
        date: question.publishDate,
      })
      .from(comment)
      .innerJoin(answer, eq(answer.id, comment.answerId))
      .innerJoin(question, eq(question.id, answer.questionId))
      .where(and(eq(comment.id, id), isNull(comment.deletedAt), isNull(comment.removedAt)));
    if (!c || c.status !== "published" || !c.date || c.date > utcDate()) return null;
    ownerId = c.authorId;
    threadAuthorId = c.answerAuthorId;
    content = { body: c.body, date: c.date, answerId: c.answerId };
  }
  if (!ownerId || ownerId === reporterId) return null;
  const owner = await loadOwner(ownerId);
  if (!owner?.username || owner.status !== "active" || owner.onboarded === false) return null;
  if (reporterId && !(await reporterCanSee(reporterId, type, owner, threadAuthorId))) return null;
  if (type !== "profile") content = { ...content, username: owner.username };
  return { ownerId, objectType: type, objectId: id, content };
}

/** Can the reporter see the object now, through the one policy? A block either way counts as "could see" (J5 E2). */
async function reporterCanSee(
  reporterId: string,
  type: ReportTarget,
  owner: OwnerRecord,
  threadAuthorId: string | null,
): Promise<boolean> {
  const viewer = await loadViewer({ id: reporterId, role: "member" });
  const graph = await loadGraph(reporterId, owner.id);
  if (graph.blocked) return true;
  if (type === "profile") return canViewProfileSection("identity", viewer, owner, graph).allowed;
  if (type === "answer")
    return canViewContent("dropAnswer", viewer, { author: owner }, graph).allowed;
  if (!threadAuthorId) return false;
  const threadOwner = await loadOwner(threadAuthorId);
  if (!threadOwner) return false;
  const threadGraph = await loadGraph(reporterId, threadAuthorId);
  const threadVisible = canViewContent(
    "dropAnswer",
    viewer,
    { author: threadOwner },
    threadGraph,
  ).allowed;
  return canViewContent("comment", viewer, { author: owner, threadVisible }, graph).allowed;
}

type Tx = Parameters<Parameters<ReturnType<typeof db>["transaction"]>[0]>[0];

/**
 * The open case for an object (J5 E4), created when there is none, with the moderation copy of the object (J5 E9).
 * The caller holds the per-object advisory lock (caseLock) inside its transaction.
 */
export async function openCaseFor(tx: Tx, target: Resolved, priority: number): Promise<string> {
  let [open] = await tx
    .select({ id: moderationCase.id, priority: moderationCase.priority })
    .from(moderationCase)
    .where(
      and(
        eq(moderationCase.targetType, target.objectType),
        eq(moderationCase.targetId, target.objectId),
        inArray(moderationCase.state, ["open", "in_progress"]),
      ),
    );
  if (!open) {
    [open] = await tx
      .insert(moderationCase)
      .values({
        subjectUserId: target.ownerId,
        targetType: target.objectType,
        targetId: target.objectId,
        priority,
      })
      .returning({ id: moderationCase.id, priority: moderationCase.priority });
  } else if (priority < open.priority) {
    await tx
      .update(moderationCase)
      .set({ priority, updatedAt: new Date() })
      .where(eq(moderationCase.id, open.id));
  }
  const caseId = open!.id;
  const [snap] = await tx
    .select({ id: contentSnapshot.id })
    .from(contentSnapshot)
    .where(and(eq(contentSnapshot.caseId, caseId), eq(contentSnapshot.objectId, target.objectId)));
  if (!snap)
    await tx.insert(contentSnapshot).values({
      caseId,
      objectType: target.objectType,
      objectId: target.objectId,
      authorId: target.ownerId,
      content: target.content,
      // Not purged while the case is open (purgeSnapshots skips open cases); reset at the decision.
      purgeAfter: new Date(Date.now() + SNAPSHOT_DAYS * 86_400_000),
    });
  return caseId;
}

/** One writer per reported object at a time, so concurrent reports and notices still make one case. */
export async function caseLock(tx: Tx, type: string, id: string): Promise<void> {
  await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`case:${type}:${id}`}, 0))`);
}

export type ReportInput = {
  targetType: ReportTarget;
  targetId: string;
  category: ReportCategory;
  details: string;
};
export type ReportResult =
  { ok: true } | { ok: false; reason: "not-available" | "not-allowed" | "too-many" | "copyright" };

/**
 * SAFE-01: file a report. Idempotent per reporter and object while their earlier report is open (a second tap
 * answers "received" again). The case, the report and the moderation copy are written in one transaction under a
 * per-object lock, so two reports at once still make one case.
 */
export async function createReport(viewer: Viewer, input: ReportInput): Promise<ReportResult> {
  if (!mayReport(viewer)) return { ok: false, reason: "not-allowed" };
  if (routesToNoticeForm(input.category)) return { ok: false, reason: "copyright" };
  const details = typeof input.details === "string" ? input.details.trim() : "";
  if (details.length > DETAILS_MAX) return { ok: false, reason: "not-allowed" };
  const target = await resolveTarget(viewer.id, input.targetType, input.targetId);
  if (!target) return { ok: false, reason: "not-available" };
  if (!(await consume("report", viewer.id)).allowed) return { ok: false, reason: "too-many" };
  const reporterId = viewer.id;
  const priority = reportPriority(input.category);
  try {
    await db().transaction(async (tx) => {
      await caseLock(tx, target.objectType, target.objectId);
      const [already] = await tx
        .select({ id: report.id })
        .from(report)
        .where(
          and(
            eq(report.reporterId, reporterId),
            eq(report.targetType, target.objectType),
            eq(report.targetId, target.objectId),
            inArray(report.status, ["open", "in_review"]),
          ),
        );
      if (already) return;
      const caseId = await openCaseFor(tx, target, priority);
      await tx.insert(report).values({
        reporterId,
        targetType: target.objectType,
        targetId: target.objectId,
        targetOwnerId: target.ownerId,
        targetHandle: String((target.content as { username?: string }).username ?? "") || null,
        category: input.category,
        details: details || null,
        caseId,
      });
    });
  } catch (e) {
    if (isUniqueViolation(e)) return { ok: true }; // a parallel duplicate from the same reporter
    throw new SafeDbError("createReport", e);
  }
  return { ok: true };
}

// ============================================================ My reports (SAFE-04)

export type MyReport = {
  id: string;
  category: ReportCategory;
  targetType: ReportTarget;
  /** The handle of the reported member, when they still have one. Nothing else about them. */
  handle: string | null;
  createdAt: Date;
  status: MemberReportStatus;
  outcome: "action" | "none" | null;
};

/** The member's own reports, newest first: status only, never what was decided about the other person. */
export async function myReports(viewerId: string, id?: string): Promise<MyReport[]> {
  const rows = await db()
    .select({
      id: report.id,
      category: report.category,
      targetType: report.targetType,
      status: report.status,
      createdAt: report.createdAt,
      handle: report.targetHandle,
    })
    .from(report)
    .where(
      and(eq(report.reporterId, viewerId), id && UUID.test(id) ? eq(report.id, id) : undefined),
    )
    .orderBy(desc(report.createdAt))
    .limit(100);
  return rows.map((r) => ({
    id: r.id,
    category: r.category,
    targetType: r.targetType as ReportTarget,
    handle: r.handle,
    createdAt: r.createdAt,
    ...memberReportStatus(r.status),
  }));
}

// ============================================================ Notices and decisions (SAFE-05)

export type MemberNotice = {
  id: string;
  kind: ActionKind;
  removesContent: boolean;
  rule: Rule | null;
  statement: string;
  createdAt: Date;
  endsAt: Date | null;
  appealUntil: Date | null;
  revokedAt: Date | null;
  /** SAFE-06: an appeal can be sent now (no appeal yet, not revoked, inside the window). */
  appealOpen: boolean;
  /** The member's own content as it was reported (the moderation copy); null when there is none or it was purged. */
  item: { type: ReportTarget; text: string; date: string | null } | null;
  /** How the case started: a member's report, a DSA notice, or staff on their own (never who). */
  source: "report" | "notice" | "staff";
  appeal: {
    status: "open" | "upheld" | "overturned";
    createdAt: Date;
    decidedAt: Date | null;
    outcomeText: string | null;
  } | null;
};

/** Every decision about the member, newest first, or one of them. Only the member's own (subject) rows. */
export async function myNotices(viewerId: string, id?: string): Promise<MemberNotice[]> {
  if (id !== undefined && !UUID.test(id)) return [];
  const rows = await db()
    .select({ a: enforcementAction, targetType: moderationCase.targetType })
    .from(enforcementAction)
    .leftJoin(moderationCase, eq(moderationCase.id, enforcementAction.caseId))
    .where(
      and(
        eq(enforcementAction.subjectUserId, viewerId),
        id ? eq(enforcementAction.id, id) : undefined,
      ),
    )
    .orderBy(desc(enforcementAction.createdAt))
    .limit(100);
  if (!rows.length) return [];
  const caseIds = rows.map((r) => r.a.caseId).filter((x): x is string => !!x);
  const actionIds = rows.map((r) => r.a.id);
  const [snaps, appeals, reported, noticed] = await Promise.all([
    caseIds.length
      ? db()
          .select({
            caseId: contentSnapshot.caseId,
            objectType: contentSnapshot.objectType,
            objectId: contentSnapshot.objectId,
            content: contentSnapshot.content,
          })
          .from(contentSnapshot)
          .where(inArray(contentSnapshot.caseId, caseIds))
      : [],
    db().select().from(appeal).where(inArray(appeal.actionId, actionIds)),
    caseIds.length
      ? db()
          .select({ caseId: report.caseId })
          .from(report)
          .where(inArray(report.caseId, caseIds))
          .groupBy(report.caseId)
      : [],
    caseIds.length
      ? db().select({ caseId: notice.caseId }).from(notice).where(inArray(notice.caseId, caseIds))
      : [],
  ]);
  const withReports = new Set(reported.map((r) => r.caseId));
  const withNotice = new Set(noticed.map((r) => r.caseId));
  return rows.map(({ a }) => {
    const snap = snaps.find(
      (s) => s.caseId === a.caseId && (!a.targetId || s.objectId === a.targetId),
    );
    const ap = appeals.find((x) => x.actionId === a.id);
    // Only the member's own words go back to them; a profile copy shows the bio they wrote.
    const text = snap
      ? String((snap.content as { body?: string; bio?: string }).body ?? snap.content.bio ?? "")
      : "";
    return {
      id: a.id,
      kind: a.kind,
      removesContent: a.removesContent,
      rule: (a.ruleRef as Rule | null) ?? null,
      statement: a.statementOfReasons,
      createdAt: a.createdAt,
      endsAt: a.endsAt,
      appealUntil: a.appealUntil,
      revokedAt: a.revokedAt,
      appealOpen: !ap && !a.revokedAt && !!a.appealUntil && a.appealUntil.getTime() > Date.now(),
      item: snap
        ? {
            type: snap.objectType as ReportTarget,
            text,
            date: (snap.content as { date?: string }).date ?? null,
          }
        : null,
      source:
        a.caseId && withReports.has(a.caseId)
          ? "report"
          : a.caseId && withNotice.has(a.caseId)
            ? "notice"
            : "staff",
      appeal: ap
        ? {
            status: ap.status,
            createdAt: ap.createdAt,
            decidedAt: ap.decidedAt,
            outcomeText: ap.outcomeText,
          }
        : null,
    };
  });
}

export type AppealResult =
  | { ok: true }
  | { ok: false; reason: "not-available" | "closed" | "exists" | "invalid" | "too-many" };

/**
 * SAFE-06, a basic appeal: one per decision, by the member it is about, inside the appeal window. Suspended and
 * banned members may appeal (DSA Art. 20), so this asks only for the signed-in member's own id.
 */
export async function submitAppeal(
  viewerId: string,
  actionId: string,
  text: string,
): Promise<AppealResult> {
  if (!UUID.test(actionId)) return { ok: false, reason: "not-available" };
  const body = typeof text === "string" ? text.replace(/\r\n?/g, "\n").trim() : "";
  if (!body || body.length > APPEAL_MAX) return { ok: false, reason: "invalid" };
  const [a] = await db()
    .select({ until: enforcementAction.appealUntil, revokedAt: enforcementAction.revokedAt })
    .from(enforcementAction)
    .where(and(eq(enforcementAction.id, actionId), eq(enforcementAction.subjectUserId, viewerId)));
  if (!a) return { ok: false, reason: "not-available" };
  if (a.revokedAt || !a.until || a.until.getTime() <= Date.now())
    return { ok: false, reason: "closed" };
  if (!(await consume("appeal", viewerId)).allowed) return { ok: false, reason: "too-many" };
  try {
    await db().insert(appeal).values({ actionId, appellantId: viewerId, text: body });
  } catch (e) {
    if (isUniqueViolation(e)) return { ok: false, reason: "exists" };
    throw new SafeDbError("submitAppeal", e);
  }
  return { ok: true };
}

// ============================================================ Restrictions and holds (SAFE-07)

/** An active posting restriction (answers, edits and comments are refused while it lasts). */
export async function activeRestriction(
  userId: string,
  now = new Date(),
): Promise<{ id: string; endsAt: Date } | null> {
  const [r] = await db()
    .select({ id: enforcementAction.id, endsAt: enforcementAction.endsAt })
    .from(enforcementAction)
    .where(
      and(
        eq(enforcementAction.subjectUserId, userId),
        eq(enforcementAction.kind, "restriction"),
        isNull(enforcementAction.revokedAt),
        lte(enforcementAction.startsAt, now),
        gt(enforcementAction.endsAt, now),
      ),
    )
    .orderBy(desc(enforcementAction.endsAt))
    .limit(1);
  return r?.endsAt ? { id: r.id, endsAt: r.endsAt } : null;
}

/**
 * Lifts a suspension that has run out, for one member or for everyone (the worker). An account is suspended while
 * some suspension on it is neither revoked nor ended; a ban has no end and is lifted only by an appeal.
 */
export async function liftExpiredSuspensions(userId?: string, now = new Date()): Promise<number> {
  const rows = await db()
    .update(user)
    .set({ status: "active" })
    .where(
      and(
        eq(user.status, "suspended"),
        userId ? eq(user.id, userId) : undefined,
        sql`not exists (select 1 from ${enforcementAction} e where e.subject_user_id = ${user.id}
              and e.kind in ('suspension', 'ban') and e.revoked_at is null
              and (e.ends_at is null or e.ends_at > ${now.toISOString()}::timestamptz))`,
      ),
    )
    .returning({ id: user.id });
  return rows.length;
}

export type AccountHold =
  | { kind: "suspension" | "ban"; notice: MemberNotice | null }
  | { kind: "restriction"; notice: MemberNotice | null };

/**
 * What the SAFE-07 full screen shows, if anything: a suspension or a ban (no entry to the app until it ends), or a
 * restriction the member has not yet acknowledged ("Nastavi" once). A suspension that ran out is lifted here.
 */
export async function accountHold(userId: string): Promise<AccountHold | null> {
  const [u] = await db().select({ status: user.status }).from(user).where(eq(user.id, userId));
  if (!u) return null;
  if (u.status === "suspended" && (await liftExpiredSuspensions(userId))) u.status = "active";
  if (u.status === "suspended" || u.status === "banned") {
    const kind = u.status === "banned" ? "ban" : "suspension";
    const [a] = await db()
      .select({ id: enforcementAction.id })
      .from(enforcementAction)
      .where(
        and(
          eq(enforcementAction.subjectUserId, userId),
          eq(enforcementAction.kind, kind),
          isNull(enforcementAction.revokedAt),
        ),
      )
      .orderBy(desc(enforcementAction.createdAt))
      .limit(1);
    const [notice] = a ? await myNotices(userId, a.id) : [];
    return { kind, notice: notice ?? null };
  }
  const now = new Date();
  const [r] = await db()
    .select({ id: enforcementAction.id })
    .from(enforcementAction)
    .where(
      and(
        eq(enforcementAction.subjectUserId, userId),
        eq(enforcementAction.kind, "restriction"),
        isNull(enforcementAction.revokedAt),
        isNull(enforcementAction.acknowledgedAt),
        gt(enforcementAction.endsAt, now),
      ),
    )
    .orderBy(asc(enforcementAction.createdAt))
    .limit(1);
  if (!r) return null;
  const [notice] = await myNotices(userId, r.id);
  return { kind: "restriction", notice: notice ?? null };
}

/** "Nastavi" on the restriction screen: the member saw it, so it is not shown again. */
export async function acknowledgeRestriction(userId: string, actionId: string): Promise<void> {
  if (!UUID.test(actionId)) return;
  await db()
    .update(enforcementAction)
    .set({ acknowledgedAt: new Date() })
    .where(
      and(
        eq(enforcementAction.id, actionId),
        eq(enforcementAction.subjectUserId, userId),
        eq(enforcementAction.kind, "restriction"),
      ),
    );
}

/** The account status summary for SET (SAFE-04/05 hub): an active restriction, open decisions, reports. */
export async function statusSummary(userId: string) {
  const [restriction, notices, reports] = await Promise.all([
    activeRestriction(userId),
    myNotices(userId),
    myReports(userId),
  ]);
  return { restriction, notices, reports };
}

// ============================================================ Block and mute lists (SAFE-08)

export type ListedPerson = { id: string; username: string; displayName: string };

/** The member's blocks and mutes, newest first. Accounts without a profile any more are left out. */
export async function blockedAndMuted(
  viewerId: string,
): Promise<{ blocked: ListedPerson[]; muted: ListedPerson[] }> {
  const [b, m] = await Promise.all([
    db()
      .select({ id: block.blockedId, username: profile.username, displayName: profile.displayName })
      .from(block)
      .innerJoin(profile, eq(profile.userId, block.blockedId))
      .where(eq(block.blockerId, viewerId))
      .orderBy(desc(block.createdAt)),
    db()
      .select({ id: mute.mutedId, username: profile.username, displayName: profile.displayName })
      .from(mute)
      .innerJoin(profile, eq(profile.userId, mute.mutedId))
      .where(eq(mute.muterId, viewerId))
      .orderBy(desc(mute.createdAt)),
  ]);
  return { blocked: b, muted: m };
}

/** Has the viewer muted this member? (The "Utišano" chip on the profile, D-075; only the viewer sees it.) */
export async function isMuted(viewerId: string | null, targetId: string): Promise<boolean> {
  if (!viewerId || !UUID.test(targetId)) return false;
  const [row] = await db()
    .select({ id: mute.mutedId })
    .from(mute)
    .where(and(eq(mute.muterId, viewerId), eq(mute.mutedId, targetId)));
  return !!row;
}

/** Counts for the Settings row (SAFE-08). */
export async function blockMuteCounts(viewerId: string) {
  const [[b], [m]] = await Promise.all([
    db()
      .select({ n: sql<number>`count(*)` })
      .from(block)
      .where(eq(block.blockerId, viewerId)),
    db()
      .select({ n: sql<number>`count(*)` })
      .from(mute)
      .where(eq(mute.muterId, viewerId)),
  ]);
  return { blocked: Number(b?.n ?? 0), muted: Number(m?.n ?? 0) };
}

/**
 * The cheap check behind every app page (memberPage): does the member have to see the SAFE-07 screen first?
 * A suspension that ran out is lifted here; a restriction counts only until it is acknowledged.
 */
export async function holdKind(
  userId: string,
): Promise<"suspension" | "ban" | "restriction" | null> {
  const [u] = await db().select({ status: user.status }).from(user).where(eq(user.id, userId));
  if (!u) return null;
  if (u.status === "suspended" && !(await liftExpiredSuspensions(userId))) return "suspension";
  if (u.status === "banned") return "ban";
  const [r] = await db()
    .select({ id: enforcementAction.id })
    .from(enforcementAction)
    .where(
      and(
        eq(enforcementAction.subjectUserId, userId),
        eq(enforcementAction.kind, "restriction"),
        isNull(enforcementAction.revokedAt),
        isNull(enforcementAction.acknowledgedAt),
        gt(enforcementAction.endsAt, new Date()),
      ),
    )
    .limit(1);
  return r ? "restriction" : null;
}
