// Moderation for staff (step 5.9; ADM-10 queue and case, ADM-11 appeals; J5, Master Prompt §12, §13, DSA Art. 17
// and 20). Only moderators and admins with a second factor reach these functions (loadViewer turns a staff role
// without one into "member", and every function here checks the role again).
//
// Rules held here:
// - A moderator works a case only once it is assigned to them (matrix: reportsCases); an admin may open any case.
// - Conflict of interest (J5 E3, rules.ts conflictOf): nobody decides a case about themselves; a moderator who
//   reported it, or whom the reported member or a reporter blocked, cannot take it; an admin may, with a stated
//   reason that goes into the audit log.
// - Every view of a case's evidence (the moderation copy, a notice's personal data) writes an evidence_access row
//   (invariant 7, append-only).
// - Reporter identities never leave this module: the case shows reports as "Report 1, 2, …".
// - A decision writes the enforcement action with its statement of reasons (R-07), applies it (content removal,
//   account status) in the same transaction, then tells the member (SAFE-05), the reporters (SAFE-04, outcome only)
//   and a notifier who left an address (DSA Art. 16(5)).
import { and, asc, desc, eq, inArray, isNotNull, isNull, lt, or, sql } from "drizzle-orm";
import type { Viewer } from "@/lib/authz";
import { canViewStaffObject } from "@/lib/authz";
import { audit } from "@/lib/audit";
import { sendMail } from "@/lib/auth/email";
import { db } from "@/lib/db/client";
import {
  appeal,
  block,
  comment,
  contentSnapshot,
  dailyDropAnswer as answer,
  dailyDropQuestion as question,
  enforcementAction,
  evidenceAccess,
  media,
  moderationCase,
  notice,
  profile,
  report,
  user,
} from "@/lib/db/schema";
import {
  appealUntil,
  conflictOf,
  endsAt,
  REASON_MAX,
  snapshotPurgeAfter,
  STATEMENT_MAX,
  validateDecision,
  type ActionKind,
  type Conflict,
  type Decision,
  type DecisionError,
  type ReportCategory,
  type Rule,
} from "@/lib/moderation/rules";
import { notifySystem } from "./notifications";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type Staff = Viewer & { id: string };
export const isModerationStaff = (v: Viewer): v is Staff =>
  !!v.id && v.status === "active" && (v.role === "moderator" || v.role === "admin");

const OPEN_STATES = ["open", "in_progress"] as const;

/** Of these members, the ones who have blocked the staff member. */
async function blockersOf(staffId: string, ids: readonly string[]): Promise<Set<string>> {
  const unique = [...new Set(ids)].filter((x) => x && x !== staffId);
  if (!unique.length) return new Set();
  const rows = await db()
    .select({ id: block.blockerId })
    .from(block)
    .where(and(eq(block.blockedId, staffId), inArray(block.blockerId, unique)));
  return new Set(rows.map((r) => r.id));
}

type CaseRow = typeof moderationCase.$inferSelect;

async function reportsOf(caseIds: readonly string[]) {
  if (!caseIds.length) return [];
  return db()
    .select({
      caseId: report.caseId,
      reporterId: report.reporterId,
      category: report.category,
      details: report.details,
      createdAt: report.createdAt,
      id: report.id,
    })
    .from(report)
    .where(inArray(report.caseId, caseIds as string[]))
    .orderBy(asc(report.createdAt));
}

async function noticesOf(caseIds: readonly string[]) {
  if (!caseIds.length) return [];
  return db()
    .select()
    .from(notice)
    .where(inArray(notice.caseId, caseIds as string[]))
    .orderBy(asc(notice.createdAt));
}

async function conflictFor(staff: Staff, c: CaseRow): Promise<Conflict> {
  const reports = await reportsOf([c.id]);
  const reporterIds = reports.map((r) => r.reporterId);
  const involved = [c.subjectUserId, ...reporterIds].filter((x): x is string => !!x);
  const blockers = await blockersOf(staff.id, involved);
  return conflictOf({
    staffId: staff.id,
    subjectId: c.subjectUserId,
    reporterIds,
    blockedStaff: blockers.size > 0,
  });
}

/** The staff role of each member (review 5.9 M3: a case about a staff member is for an admin only). */
async function staffRoles(ids: readonly (string | null)[]): Promise<Map<string, string>> {
  const unique = [...new Set(ids.filter((x): x is string => !!x))];
  if (!unique.length) return new Map();
  const rows = await db()
    .select({ id: user.id, role: user.role })
    .from(user)
    .where(inArray(user.id, unique));
  return new Map(
    rows.filter((r) => r.role && r.role !== "member").map((r) => [r.id, r.role as string]),
  );
}

async function subjectRole(c: { subjectUserId: string | null }): Promise<string | null> {
  return (await staffRoles([c.subjectUserId])).get(c.subjectUserId ?? "") ?? null;
}

/**
 * May this staff member open the case page? Never about themselves; a case about another staff member is for an admin
 * only (review 5.9 M3); admin: anything else; moderator: assigned to them, no conflict.
 */
function mayOpen(staff: Staff, c: CaseRow, conflict: Conflict, staffSubject: boolean): boolean {
  if (conflict === "self") return false;
  if (staff.role === "admin") return true;
  if (conflict || staffSubject) return false;
  return canViewStaffObject("reportsCases", staff, { assigned: c.assigneeId === staff.id }).allowed;
}

async function logEvidence(
  staffId: string,
  caseId: string,
  objectType: string,
  objectId: string | null,
  reason: string,
) {
  await db()
    .insert(evidenceAccess)
    .values({ caseId, accessorId: staffId, objectType, objectId, reason: reason.slice(0, 200) });
}

// ============================================================ Queue (ADM-10)

export type QueueItem = {
  id: string;
  targetType: string;
  priority: number;
  state: CaseRow["state"];
  createdAt: Date;
  decidedAt: Date | null;
  outcome: string | null;
  reports: number;
  categories: ReportCategory[];
  noticeCategories: string[];
  assignee: "me" | "other" | null;
  conflict: Conflict;
  canOpen: boolean;
  canTake: boolean;
};

/** Open cases by priority (threats, minors, impersonation first) and age; or the latest decided ones. */
export async function moderationQueue(
  staff: Viewer,
  scope: "open" | "closed" = "open",
): Promise<QueueItem[] | null> {
  if (!isModerationStaff(staff)) return null;
  const rows =
    scope === "open"
      ? await db()
          .select()
          .from(moderationCase)
          .where(inArray(moderationCase.state, [...OPEN_STATES]))
          .orderBy(asc(moderationCase.priority), asc(moderationCase.createdAt))
          .limit(200)
      : await db()
          .select()
          .from(moderationCase)
          .where(inArray(moderationCase.state, ["decided", "closed"]))
          .orderBy(desc(moderationCase.decidedAt))
          .limit(100);
  const ids = rows.map((r) => r.id);
  const [reports, notices] = await Promise.all([reportsOf(ids), noticesOf(ids)]);
  const involved = [
    ...rows.map((r) => r.subjectUserId),
    ...reports.map((r) => r.reporterId),
  ].filter((x): x is string => !!x);
  const [blockers, roles] = await Promise.all([
    blockersOf(staff.id, involved),
    staffRoles(rows.map((r) => r.subjectUserId)),
  ]);
  // Review 5.9 L2: a case about the staff member is not listed for them at all (its counts and timing could point at
  // the reporter).
  return rows
    .filter((c) => c.subjectUserId !== staff.id)
    .map((c) => {
      const rs = reports.filter((r) => r.caseId === c.id);
      const reporterIds = rs.map((r) => r.reporterId);
      const conflict = conflictOf({
        staffId: staff.id,
        subjectId: c.subjectUserId,
        reporterIds,
        blockedStaff: [c.subjectUserId, ...reporterIds].some((x) => !!x && blockers.has(x)),
      });
      const assignee = c.assigneeId ? (c.assigneeId === staff.id ? "me" : "other") : null;
      const open = c.state === "open" || c.state === "in_progress";
      const staffSubject = roles.has(c.subjectUserId ?? "");
      const canTake =
        open &&
        assignee !== "me" &&
        conflict !== "self" &&
        (staff.role === "admin" || (conflict === null && !staffSubject && assignee === null));
      return {
        id: c.id,
        targetType: c.targetType,
        priority: c.priority,
        state: c.state,
        createdAt: c.createdAt,
        decidedAt: c.decidedAt,
        outcome: c.outcome,
        reports: rs.length,
        categories: [...new Set(rs.map((r) => r.category))],
        noticeCategories: [
          ...new Set(notices.filter((n) => n.caseId === c.id).map((n) => n.category)),
        ],
        assignee,
        conflict,
        canOpen: open
          ? mayOpen(staff, c, conflict, staffSubject)
          : staff.role === "admin" && conflict !== "self",
        canTake,
      };
    });
}

export type TakeResult = { ok: true } | { ok: false; reason: "forbidden" | "gone" };

/** Take a case (assign to self). Admins may take over a case assigned to someone else, or one they are involved in. */
export async function takeCase(staff: Viewer, caseId: string): Promise<TakeResult> {
  if (!isModerationStaff(staff) || !UUID.test(caseId)) return { ok: false, reason: "forbidden" };
  const [c] = await db().select().from(moderationCase).where(eq(moderationCase.id, caseId));
  if (!c || !(OPEN_STATES as readonly string[]).includes(c.state))
    return { ok: false, reason: "gone" };
  const conflict = await conflictFor(staff, c);
  const staffSubject = !!(await subjectRole(c));
  if (conflict === "self" || ((conflict || staffSubject) && staff.role !== "admin"))
    return { ok: false, reason: "forbidden" };
  if (c.assigneeId && c.assigneeId !== staff.id && staff.role !== "admin")
    return { ok: false, reason: "forbidden" };
  const taken = await db().transaction(async (tx) => {
    // Review 5.9 L3: the assignment is checked again in the write, so two moderators racing never both "win".
    const rows = await tx
      .update(moderationCase)
      .set({ assigneeId: staff.id, state: "in_progress", updatedAt: new Date() })
      .where(
        and(
          eq(moderationCase.id, caseId),
          inArray(moderationCase.state, [...OPEN_STATES]),
          staff.role === "admin"
            ? undefined
            : or(isNull(moderationCase.assigneeId), eq(moderationCase.assigneeId, staff.id)),
        ),
      )
      .returning({ id: moderationCase.id });
    if (!rows.length) return false;
    await tx
      .update(report)
      .set({ status: "in_review" })
      .where(and(eq(report.caseId, caseId), eq(report.status, "open")));
    await tx
      .update(notice)
      .set({ status: "in_review" })
      .where(and(eq(notice.caseId, caseId), eq(notice.status, "received")));
    return true;
  });
  if (!taken) return { ok: false, reason: "gone" };
  await audit({
    actorType: "staff",
    actorId: staff.id,
    action: "moderation.case.taken",
    targetType: "moderation_case",
    targetId: caseId,
    metadata: conflict ? { conflict } : {},
  });
  return { ok: true };
}

/** Give the case back to the queue (only the assignee, or an admin). */
export async function releaseCase(staff: Viewer, caseId: string): Promise<boolean> {
  if (!isModerationStaff(staff) || !UUID.test(caseId)) return false;
  const rows = await db()
    .update(moderationCase)
    .set({ assigneeId: null, state: "open", updatedAt: new Date() })
    .where(
      and(
        eq(moderationCase.id, caseId),
        eq(moderationCase.state, "in_progress"),
        staff.role === "admin" ? undefined : eq(moderationCase.assigneeId, staff.id),
      ),
    )
    .returning({ id: moderationCase.id });
  return rows.length > 0;
}

// ============================================================ Case (ADM-10)

export type CaseDetail = {
  id: string;
  state: CaseRow["state"];
  targetType: string;
  targetId: string | null;
  priority: number;
  createdAt: Date;
  outcome: string | null;
  decidedAt: Date | null;
  decidedByMe: boolean;
  assignee: "me" | "other" | null;
  conflict: Conflict;
  subject: { id: string; username: string | null; displayName: string; status: string } | null;
  /** Numbered, without the reporter (the reporter is never shown, not even to staff, in the alpha). */
  reports: { n: number; category: ReportCategory; details: string | null; createdAt: Date }[];
  notices: {
    id: string;
    category: string;
    url: string;
    explanation: string;
    notifierName: string | null;
    notifierEmail: string | null;
    createdAt: Date;
  }[];
  snapshots: { objectType: string; content: Record<string, unknown>; capturedAt: Date }[];
  current: {
    state: "live" | "deleted" | "removed" | "missing";
    edited: boolean;
    href: string | null;
    /** D-121 (4): the live answer or comment still shows an image (ADM-10 offers "remove only the image"). */
    hasImage?: boolean;
  };
  /** Earlier decisions about the same member (graduated consequences). */
  history: {
    id: string;
    kind: ActionKind;
    rule: string | null;
    createdAt: Date;
    endsAt: Date | null;
    revokedAt: Date | null;
  }[];
  actions: { id: string; kind: ActionKind; rule: string | null; statement: string }[];
};

async function currentState(c: CaseRow): Promise<CaseDetail["current"]> {
  const missing = { state: "missing" as const, edited: false, href: null };
  if (!c.targetId) return missing;
  if (c.targetType === "profile") {
    const [p] = await db()
      .select({ username: profile.username, status: user.status })
      .from(profile)
      .innerJoin(user, eq(user.id, profile.userId))
      .where(eq(profile.userId, c.targetId));
    return p ? { state: "live", edited: false, href: `/@${p.username}` } : missing;
  }
  if (c.targetType === "answer") {
    const [a] = await db()
      .select({
        deletedAt: answer.deletedAt,
        removedAt: answer.removedAt,
        editedAt: answer.editedAt,
        imageId: answer.imageId,
        date: question.publishDate,
      })
      .from(answer)
      .innerJoin(question, eq(question.id, answer.questionId))
      .where(eq(answer.id, c.targetId));
    if (!a) return missing;
    return {
      state: a.removedAt ? "removed" : a.deletedAt ? "deleted" : "live",
      edited: !!a.editedAt && a.editedAt > c.createdAt,
      href: a.date ? `/drop/${a.date}/a/${c.targetId}` : null,
      hasImage: !!a.imageId,
    };
  }
  if (c.targetType === "comment") {
    const [x] = await db()
      .select({
        deletedAt: comment.deletedAt,
        removedAt: comment.removedAt,
        answerId: comment.answerId,
        imageId: comment.imageId,
        date: question.publishDate,
      })
      .from(comment)
      .innerJoin(answer, eq(answer.id, comment.answerId))
      .innerJoin(question, eq(question.id, answer.questionId))
      .where(eq(comment.id, c.targetId));
    if (!x) return missing;
    return {
      state: x.removedAt ? "removed" : x.deletedAt ? "deleted" : "live",
      edited: false,
      href: x.date ? `/drop/${x.date}/a/${x.answerId}#c-${c.targetId}` : null,
      hasImage: !!x.imageId,
    };
  }
  return missing;
}

/**
 * The case page. Null when the staff member may not open it (or it does not exist). Every call logs the evidence it
 * returns (one row per moderation copy, one per notice with personal data).
 */
export async function caseDetail(staff: Viewer, caseId: string): Promise<CaseDetail | null> {
  if (!isModerationStaff(staff) || !UUID.test(caseId)) return null;
  const [c] = await db().select().from(moderationCase).where(eq(moderationCase.id, caseId));
  if (!c) return null;
  const conflict = await conflictFor(staff, c);
  const open = (OPEN_STATES as readonly string[]).includes(c.state);
  const staffSubject = !!(await subjectRole(c));
  const allowed = open
    ? mayOpen(staff, c, conflict, staffSubject)
    : conflict !== "self" && (staff.role === "admin" || c.decidedBy === staff.id);
  if (!allowed) return null;

  const [reports, notices, snapshots, subjectRows, actions, current] = await Promise.all([
    reportsOf([c.id]),
    noticesOf([c.id]),
    db()
      .select()
      .from(contentSnapshot)
      .where(eq(contentSnapshot.caseId, c.id))
      .orderBy(asc(contentSnapshot.capturedAt)),
    c.subjectUserId
      ? db()
          .select({
            id: user.id,
            name: user.name,
            status: user.status,
            username: profile.username,
            displayName: profile.displayName,
          })
          .from(user)
          .leftJoin(profile, eq(profile.userId, user.id))
          .where(eq(user.id, c.subjectUserId))
      : Promise.resolve([]),
    db()
      .select()
      .from(enforcementAction)
      .where(eq(enforcementAction.caseId, c.id))
      .orderBy(asc(enforcementAction.createdAt)),
    currentState(c),
  ]);
  const history = c.subjectUserId
    ? await db()
        .select()
        .from(enforcementAction)
        .where(
          and(
            eq(enforcementAction.subjectUserId, c.subjectUserId),
            or(isNull(enforcementAction.caseId), sql`${enforcementAction.caseId} <> ${c.id}`),
          ),
        )
        .orderBy(desc(enforcementAction.createdAt))
        .limit(20)
    : [];

  // Review 5.9 L5: one row for the case view itself, then one per moderation copy and per notice with personal data.
  await logEvidence(staff.id, c.id, "case", c.id, "case");
  for (const s of snapshots) await logEvidence(staff.id, c.id, s.objectType, s.objectId, "case");
  for (const n of notices)
    if (n.notifierName || n.notifierEmail)
      await logEvidence(staff.id, c.id, "notice", n.id, "case");

  const s = subjectRows[0];
  return {
    id: c.id,
    state: c.state,
    targetType: c.targetType,
    targetId: c.targetId,
    priority: c.priority,
    createdAt: c.createdAt,
    outcome: c.outcome,
    decidedAt: c.decidedAt,
    decidedByMe: c.decidedBy === staff.id,
    assignee: c.assigneeId ? (c.assigneeId === staff.id ? "me" : "other") : null,
    conflict,
    subject: s
      ? {
          id: s.id,
          username: s.username,
          displayName: s.displayName ?? s.name,
          status: s.status,
        }
      : null,
    reports: reports.map((r, i) => ({
      n: i + 1,
      category: r.category,
      details: r.details,
      createdAt: r.createdAt,
    })),
    notices: notices.map((n) => ({
      id: n.id,
      category: n.category,
      url: n.url,
      explanation: n.explanation,
      notifierName: n.notifierName,
      notifierEmail: n.notifierEmail,
      createdAt: n.createdAt,
    })),
    snapshots: snapshots.map((x) => ({
      objectType: x.objectType,
      content: x.content,
      capturedAt: x.capturedAt,
    })),
    current,
    history: history.map((h) => ({
      id: h.id,
      kind: h.kind,
      rule: h.ruleRef,
      createdAt: h.createdAt,
      endsAt: h.endsAt,
      revokedAt: h.revokedAt,
    })),
    actions: actions.map((a) => ({
      id: a.id,
      kind: a.kind,
      rule: a.ruleRef,
      statement: a.statementOfReasons,
    })),
  };
}

export type DecideResult =
  | { ok: true; actionId: string | null }
  | {
      ok: false;
      reason: "forbidden" | "override" | "decided" | "staffSubject" | DecisionError;
    };

const NOTIFIER_MAIL = {
  action: {
    subject: "GrooveRift: odluka o tvojoj prijavi / decision on your notice",
    text: "Pregledali smo sadržaj koji si prijavio/la i poduzeli mjere prema Pravilima zajednice i zakonu. Odluku je donijela osoba iz tima, bez automatskog odlučivanja.\n\nWe reviewed the content you reported and took action under our Community Guidelines and the law. A person on our team decided, without automated decision-making.",
  },
  none: {
    subject: "GrooveRift: odluka o tvojoj prijavi / decision on your notice",
    text: "Pregledali smo sadržaj koji si prijavio/la. Nismo pronašli da krši zakon ni Pravila zajednice, pa ostaje dostupan. Odluku je donijela osoba iz tima, bez automatskog odlučivanja. Ako se ne slažeš, odgovori na ovu poruku.\n\nWe reviewed the content you reported and did not find that it breaks the law or our Community Guidelines, so it stays available. A person on our team decided, without automated decision-making. If you disagree, reply to this message.",
  },
};

/**
 * ADM-10: decide a case. `override` is the stated reason an admin gives for deciding a case they are involved in
 * (conflictOf "involved"); it is required then, and audited. The case must still be open (two staff deciding at
 * once: the second gets "decided").
 */
export async function decideCase(
  staff: Viewer,
  caseId: string,
  decision: Decision,
  override?: string,
): Promise<DecideResult> {
  if (!isModerationStaff(staff) || !UUID.test(caseId)) return { ok: false, reason: "forbidden" };
  const [c] = await db().select().from(moderationCase).where(eq(moderationCase.id, caseId));
  if (!c) return { ok: false, reason: "forbidden" };
  if (!(OPEN_STATES as readonly string[]).includes(c.state))
    return { ok: false, reason: "decided" };
  const conflict = await conflictFor(staff, c);
  const role = await subjectRole(c);
  if (conflict === "self") return { ok: false, reason: "forbidden" };
  if (staff.role !== "admin" && (conflict || role || c.assigneeId !== staff.id))
    return { ok: false, reason: "forbidden" };
  const overrideReason = (override ?? "").trim().slice(0, REASON_MAX);
  if (conflict === "involved" && !overrideReason) return { ok: false, reason: "override" };
  const bad = validateDecision(decision, c.targetType, !!c.subjectUserId);
  if (bad) return { ok: false, reason: bad };
  // Review 5.9 M3: an admin account is never suspended or banned from inside the app (that would lock the only admin
  // out with nobody to review the appeal); the Better Auth emergency lock stays for that.
  if (
    role === "admin" &&
    decision.outcome === "action" &&
    (decision.kind === "suspension" || decision.kind === "ban")
  )
    return { ok: false, reason: "staffSubject" };

  const now = new Date();
  const result = await db().transaction(async (tx) => {
    // The row lock makes a second, concurrent decision wait and then see the case decided.
    const [locked] = await tx
      .select({ state: moderationCase.state, assigneeId: moderationCase.assigneeId })
      .from(moderationCase)
      .where(eq(moderationCase.id, caseId))
      .for("update");
    if (!locked || !(OPEN_STATES as readonly string[]).includes(locked.state)) return null;
    // Review 5.9 L3: the assignment is checked again under the lock.
    if (staff.role !== "admin" && locked.assigneeId !== staff.id) return "forbidden" as const;

    let actionId: string | null = null;
    let until: Date | null = null;
    if (decision.outcome === "action") {
      const removes =
        decision.kind === "content_removal" ||
        (decision.removeContent && (c.targetType === "answer" || c.targetType === "comment"));
      until = appealUntil(now);
      // D-121 (4): only the image goes; the moderation copy still names it, so it stays as evidence.
      let removedImageId: string | null = null;
      if (!removes && decision.removeImage && c.targetId) {
        const target =
          c.targetType === "answer" ? answer : c.targetType === "comment" ? comment : null;
        if (target) {
          const [row] = await tx
            .update(target)
            .set({ imageId: null })
            .where(and(eq(target.id, c.targetId), isNotNull(target.imageId)))
            .returning({ id: target.id });
          if (row) {
            const snap = await tx
              .select({ imageId: sql<string | null>`${contentSnapshot.content}->>'imageId'` })
              .from(contentSnapshot)
              .where(eq(contentSnapshot.caseId, caseId));
            removedImageId = snap.find((x) => x.imageId)?.imageId ?? null;
          }
        }
      }
      const [a] = await tx
        .insert(enforcementAction)
        .values({
          caseId,
          subjectUserId: c.subjectUserId,
          kind: decision.kind,
          targetType: c.targetType,
          targetId: c.targetId,
          statementOfReasons: decision.statement.trim().slice(0, STATEMENT_MAX),
          ruleRef: decision.rule,
          startsAt: now,
          endsAt: endsAt(decision.kind, decision.days, now),
          decidedBy: staff.id,
          appealUntil: until,
          removesContent: removes,
          removedImageId,
        })
        .returning({ id: enforcementAction.id });
      actionId = a!.id;
      if (removes && c.targetId) {
        if (c.targetType === "answer")
          await tx
            .update(answer)
            .set({ removedAt: now })
            .where(and(eq(answer.id, c.targetId), isNull(answer.removedAt)));
        else
          await tx
            .update(comment)
            .set({ removedAt: now })
            .where(and(eq(comment.id, c.targetId), isNull(comment.removedAt)));
      }
      if (decision.kind === "suspension" && c.subjectUserId)
        await tx
          .update(user)
          .set({ status: "suspended" })
          .where(and(eq(user.id, c.subjectUserId), eq(user.status, "active")));
      if (decision.kind === "ban" && c.subjectUserId)
        await tx
          .update(user)
          .set({ status: "banned" })
          .where(and(eq(user.id, c.subjectUserId), inArray(user.status, ["active", "suspended"])));
    }
    const outcome = decision.outcome;
    await tx
      .update(moderationCase)
      .set({
        state: "closed",
        outcome,
        decidedBy: staff.id,
        decidedAt: now,
        assigneeId: staff.id,
        updatedAt: now,
      })
      .where(eq(moderationCase.id, caseId));
    await tx
      .update(report)
      .set({ status: outcome === "action" ? "resolved" : "dismissed" })
      .where(eq(report.caseId, caseId));
    await tx
      .update(notice)
      .set({ status: outcome === "action" ? "actioned" : "rejected", decidedAt: now })
      .where(eq(notice.caseId, caseId));
    await tx
      .update(contentSnapshot)
      .set({ purgeAfter: snapshotPurgeAfter(now, until) })
      .where(eq(contentSnapshot.caseId, caseId));
    return { actionId };
  });
  if (!result) return { ok: false, reason: "decided" };
  if (result === "forbidden") return { ok: false, reason: "forbidden" };

  await audit({
    actorType: "staff",
    actorId: staff.id,
    action: "moderation.case.decided",
    targetType: "moderation_case",
    targetId: caseId,
    metadata: {
      outcome: decision.outcome,
      ...(decision.outcome === "action"
        ? { kind: decision.kind, rule: decision.rule, days: decision.days ?? null }
        : {}),
      ...(overrideReason ? { conflict, overrideReason } : {}),
    },
  });
  await tellEveryone(caseId, c.subjectUserId, decision.outcome, result.actionId);
  return { ok: true, actionId: result.actionId };
}

/** After a decision: the member (SAFE-05), each reporter (outcome only, E8: none if deleted), notifiers by mail. */
async function tellEveryone(
  caseId: string,
  subjectId: string | null,
  outcome: "action" | "none",
  actionId: string | null,
) {
  if (actionId && subjectId)
    await notifySystem({ recipientId: subjectId, type: "moderation", targetId: actionId });
  const reports = await db()
    .select({ id: report.id, reporterId: report.reporterId })
    .from(report)
    .where(and(eq(report.caseId, caseId), isNotNull(report.reporterId)));
  for (const r of reports)
    await notifySystem({ recipientId: r.reporterId!, type: "report_update", targetId: r.id });
  const notices = await db()
    .select({ id: notice.id, email: notice.notifierEmail })
    .from(notice)
    .where(and(eq(notice.caseId, caseId), isNotNull(notice.notifierEmail)));
  for (const n of notices) {
    try {
      await sendMail({ to: n.email!, ...NOTIFIER_MAIL[outcome] });
    } catch (error) {
      console.error("[notice mail]", error instanceof Error ? error.name : "unknown");
      await audit({ actorType: "system", action: "mail.failed", metadata: { kind: "notice" } });
    }
  }
}

// ============================================================ Appeals (ADM-11)

export type AppealItem = {
  id: string;
  createdAt: Date;
  actionId: string;
  kind: ActionKind;
  rule: string | null;
  decidedAt: Date;
  /** The staff member decided the original action: a different reviewer is better (where possible). */
  ownDecision: boolean;
  /** The staff member may not review it (own decision as a moderator, involved, or about another staff member). */
  self: boolean;
};

export async function appealQueue(staff: Viewer): Promise<AppealItem[] | null> {
  if (!isModerationStaff(staff)) return null;
  const rows = await db()
    .select({ ap: appeal, a: enforcementAction })
    .from(appeal)
    .innerJoin(enforcementAction, eq(enforcementAction.id, appeal.actionId))
    .where(eq(appeal.status, "open"))
    .orderBy(asc(appeal.createdAt))
    .limit(200);
  const out: AppealItem[] = [];
  for (const { ap, a } of rows) {
    if (a.subjectUserId === staff.id) continue; // never listed for the member it is about (review 5.9 L2)
    const guard = await appealGuard(staff, a);
    out.push({
      id: ap.id,
      createdAt: ap.createdAt,
      actionId: a.id,
      kind: a.kind,
      rule: a.ruleRef,
      decidedAt: a.createdAt,
      ownDecision: a.decidedBy === staff.id,
      self: !guard.allowed,
    });
  }
  return out;
}

export type AppealDetail = {
  id: string;
  text: string;
  status: "open" | "upheld" | "overturned";
  createdAt: Date;
  outcomeText: string | null;
  ownDecision: boolean;
  /** "involved": an admin reviews only with a stated reason. */
  conflict: Conflict;
  action: {
    id: string;
    kind: ActionKind;
    rule: string | null;
    statement: string;
    createdAt: Date;
    endsAt: Date | null;
    revokedAt: Date | null;
    caseId: string | null;
  };
  subject: { username: string | null; displayName: string; status: string } | null;
  snapshots: { objectType: string; content: Record<string, unknown>; capturedAt: Date }[];
};

type ActionRow = typeof enforcementAction.$inferSelect;

/**
 * May this staff member review the appeal (review 5.9 M2: the case rules hold for appeals too)? Never their own; a
 * moderator not on their own decision, not on a case they are involved in and not about another staff member; an
 * admin may, and gives a stated reason when involved.
 */
async function appealGuard(
  staff: Staff,
  a: ActionRow,
): Promise<{ allowed: boolean; conflict: Conflict }> {
  if (a.subjectUserId === staff.id) return { allowed: false, conflict: "self" };
  const [c] = a.caseId
    ? await db().select().from(moderationCase).where(eq(moderationCase.id, a.caseId))
    : [];
  const conflict = c ? await conflictFor(staff, c) : null;
  if (conflict === "self") return { allowed: false, conflict };
  if (staff.role === "admin") return { allowed: true, conflict };
  const staffSubject = !!(await subjectRole(a));
  return { allowed: !conflict && !staffSubject && a.decidedBy !== staff.id, conflict };
}

export async function appealDetail(staff: Viewer, appealId: string): Promise<AppealDetail | null> {
  if (!isModerationStaff(staff) || !UUID.test(appealId)) return null;
  const [row] = await db()
    .select({ ap: appeal, a: enforcementAction })
    .from(appeal)
    .innerJoin(enforcementAction, eq(enforcementAction.id, appeal.actionId))
    .where(eq(appeal.id, appealId));
  if (!row) return null;
  const guard = await appealGuard(staff, row.a);
  if (!guard.allowed) return null;
  const { ap, a } = row;
  const [subject] = a.subjectUserId
    ? await db()
        .select({
          name: user.name,
          status: user.status,
          username: profile.username,
          displayName: profile.displayName,
        })
        .from(user)
        .leftJoin(profile, eq(profile.userId, user.id))
        .where(eq(user.id, a.subjectUserId))
    : [];
  const snapshots = a.caseId
    ? await db().select().from(contentSnapshot).where(eq(contentSnapshot.caseId, a.caseId))
    : [];
  for (const s of snapshots)
    await logEvidence(staff.id, a.caseId!, s.objectType, s.objectId, "appeal");
  return {
    id: ap.id,
    text: ap.text,
    status: ap.status,
    createdAt: ap.createdAt,
    outcomeText: ap.outcomeText,
    ownDecision: a.decidedBy === staff.id,
    conflict: guard.conflict,
    action: {
      id: a.id,
      kind: a.kind,
      rule: a.ruleRef,
      statement: a.statementOfReasons,
      createdAt: a.createdAt,
      endsAt: a.endsAt,
      revokedAt: a.revokedAt,
      caseId: a.caseId,
    },
    subject: subject
      ? {
          username: subject.username,
          displayName: subject.displayName ?? subject.name,
          status: subject.status,
        }
      : null,
    snapshots: snapshots.map((x) => ({
      objectType: x.objectType,
      content: x.content,
      capturedAt: x.capturedAt,
    })),
  };
}

export type AppealDecision = "upheld" | "overturned";
export type AppealDecideResult =
  { ok: true } | { ok: false; reason: "forbidden" | "decided" | "text" | "override" };

/** The account status a member should have from the actions still in force (used after a revocation). */
async function recomputeStatus(
  tx: Parameters<Parameters<ReturnType<typeof db>["transaction"]>[0]>[0],
  userId: string,
  now: Date,
) {
  const active = await tx
    .select({ kind: enforcementAction.kind })
    .from(enforcementAction)
    .where(
      and(
        eq(enforcementAction.subjectUserId, userId),
        inArray(enforcementAction.kind, ["suspension", "ban"]),
        isNull(enforcementAction.revokedAt),
        or(
          isNull(enforcementAction.endsAt),
          sql`${enforcementAction.endsAt} > ${now.toISOString()}::timestamptz`,
        ),
      ),
    );
  const next = active.some((a) => a.kind === "ban")
    ? "banned"
    : active.some((a) => a.kind === "suspension")
      ? "suspended"
      : "active";
  await tx
    .update(user)
    .set({ status: next })
    .where(and(eq(user.id, userId), inArray(user.status, ["active", "suspended", "banned"])));
}

/**
 * ADM-11: decide an appeal. Overturned: the action is revoked, removed content comes back, the account status is
 * recomputed. The member is told with the reviewer's reasons (DSA Art. 20(5)).
 */
export async function decideAppeal(
  staff: Viewer,
  appealId: string,
  outcome: AppealDecision,
  text: string,
  override?: string,
): Promise<AppealDecideResult> {
  if (!isModerationStaff(staff) || !UUID.test(appealId)) return { ok: false, reason: "forbidden" };
  if (outcome !== "upheld" && outcome !== "overturned") return { ok: false, reason: "forbidden" };
  const reasons = typeof text === "string" ? text.trim() : "";
  if (!reasons || reasons.length > STATEMENT_MAX) return { ok: false, reason: "text" };
  const [row] = await db()
    .select({ ap: appeal, a: enforcementAction })
    .from(appeal)
    .innerJoin(enforcementAction, eq(enforcementAction.id, appeal.actionId))
    .where(eq(appeal.id, appealId));
  if (!row) return { ok: false, reason: "forbidden" };
  const guard = await appealGuard(staff, row.a);
  if (!guard.allowed) return { ok: false, reason: "forbidden" };
  const overrideReason = (override ?? "").trim().slice(0, REASON_MAX);
  if (guard.conflict === "involved" && !overrideReason) return { ok: false, reason: "override" };
  const now = new Date();
  const done = await db().transaction(async (tx) => {
    const updated = await tx
      .update(appeal)
      .set({ status: outcome, reviewerId: staff.id, decidedAt: now, outcomeText: reasons })
      .where(and(eq(appeal.id, appealId), eq(appeal.status, "open")))
      .returning({ id: appeal.id });
    if (!updated.length) return false;
    if (outcome === "overturned") {
      const a = row.a;
      await tx
        .update(enforcementAction)
        .set({ revokedAt: now })
        .where(and(eq(enforcementAction.id, a.id), isNull(enforcementAction.revokedAt)));
      if (a.removesContent && a.targetId) {
        if (a.targetType === "answer")
          await tx.update(answer).set({ removedAt: null }).where(eq(answer.id, a.targetId));
        else if (a.targetType === "comment")
          await tx.update(comment).set({ removedAt: null }).where(eq(comment.id, a.targetId));
      }
      // D-121 (4): an overturned image removal puts the image back if it is still kept.
      if (a.removedImageId && a.targetId) {
        const [kept] = await tx
          .select({ id: media.id })
          .from(media)
          .where(eq(media.id, a.removedImageId));
        const target =
          a.targetType === "answer" ? answer : a.targetType === "comment" ? comment : null;
        if (kept && target)
          await tx
            .update(target)
            .set({ imageId: kept.id })
            .where(and(eq(target.id, a.targetId), isNull(target.imageId)));
      }
      if (a.subjectUserId && (a.kind === "suspension" || a.kind === "ban"))
        await recomputeStatus(tx, a.subjectUserId, now);
    }
    return true;
  });
  if (!done) return { ok: false, reason: "decided" };
  await audit({
    actorType: "staff",
    actorId: staff.id,
    action: "moderation.appeal.decided",
    targetType: "appeal",
    targetId: appealId,
    metadata: {
      outcome,
      ownDecision: row.a.decidedBy === staff.id,
      ...(overrideReason ? { conflict: guard.conflict, overrideReason } : {}),
    },
  });
  if (row.ap.appellantId)
    await notifySystem({ recipientId: row.ap.appellantId, type: "appeal", targetId: row.a.id });
  return { ok: true };
}

// ============================================================ Overview and housekeeping

/** ADM-01: what waits for moderation. */
export async function moderationCounts(staffId?: string): Promise<{
  open: number;
  urgent: number;
  appeals: number;
}> {
  // Review 5.9 L2: cases and appeals about the staff member themselves are not counted for them.
  const notMine = staffId
    ? or(isNull(moderationCase.subjectUserId), sql`${moderationCase.subjectUserId} <> ${staffId}`)
    : undefined;
  const [[c], [u], [a]] = await Promise.all([
    db()
      .select({ n: sql<number>`count(*)` })
      .from(moderationCase)
      .where(and(inArray(moderationCase.state, [...OPEN_STATES]), notMine)),
    db()
      .select({ n: sql<number>`count(*)` })
      .from(moderationCase)
      .where(
        and(
          inArray(moderationCase.state, [...OPEN_STATES]),
          eq(moderationCase.priority, 0),
          notMine,
        ),
      ),
    db()
      .select({ n: sql<number>`count(*)` })
      .from(appeal)
      .innerJoin(enforcementAction, eq(enforcementAction.id, appeal.actionId))
      .where(
        and(
          eq(appeal.status, "open"),
          staffId
            ? or(
                isNull(enforcementAction.subjectUserId),
                sql`${enforcementAction.subjectUserId} <> ${staffId}`,
              )
            : undefined,
        ),
      ),
  ]);
  return { open: Number(c?.n ?? 0), urgent: Number(u?.n ?? 0), appeals: Number(a?.n ?? 0) };
}

/** J5 E9: moderation copies of decided cases go after their purge date (never while a case is open). */
export async function purgeSnapshots(now = new Date()): Promise<number> {
  const rows = await db()
    .delete(contentSnapshot)
    .where(
      and(
        lt(contentSnapshot.purgeAfter, now),
        or(
          isNull(contentSnapshot.caseId),
          sql`${contentSnapshot.caseId} in (select id from ${moderationCase} where state in ('decided', 'closed'))`,
        ),
        // Review 5.9 L6: an appeal still open keeps its evidence, whatever the date.
        sql`not exists (select 1 from ${appeal} ap join ${enforcementAction} ea on ea.id = ap.action_id
              where ea.case_id = ${contentSnapshot.caseId} and ap.status = 'open')`,
      ),
    )
    .returning({ id: contentSnapshot.id });
  return rows.length;
}

export type { Rule };
