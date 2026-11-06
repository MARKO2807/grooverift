// Safety and moderation rules (step 5.9; J5, D-075, Master Prompt §12, DSA Art. 16, 17 and 20). Pure: no
// database, no session, so every rule has a unit test (tests/unit/moderation-rules.test.ts). The data layer
// (src/lib/data/safety.ts for members, src/lib/data/moderation.ts for staff) applies them.

// ---------------------------------------------------------------- reports (SAFE-01)

/** The eleven categories (D-075; names in messages "safety.cat.*"). Order is the order on screen. */
export const REPORT_CATEGORIES = [
  "harassment",
  "hate",
  "threat",
  "sexual",
  "minor",
  "impersonation",
  "spam",
  "copyright",
  "ai_generated",
  "private_info",
  "other",
] as const;
export type ReportCategory = (typeof REPORT_CATEGORIES)[number];
export const isReportCategory = (v: unknown): v is ReportCategory =>
  typeof v === "string" && (REPORT_CATEGORIES as readonly string[]).includes(v);

/** What a member can report from the ⋯ menus in the alpha. */
export const REPORT_TARGETS = ["profile", "answer", "comment"] as const;
export type ReportTarget = (typeof REPORT_TARGETS)[number];
export const isReportTarget = (v: unknown): v is ReportTarget =>
  typeof v === "string" && (REPORT_TARGETS as readonly string[]).includes(v);

/** Copyright goes to the PUB-11 form (D-075, B6): the law asks for details about the work and the right holder. */
export const routesToNoticeForm = (c: ReportCategory) => c === "copyright";

export const DETAILS_MAX = 500;
export const APPEAL_MAX = 1000;
export const STATEMENT_MAX = 2000;
export const REASON_MAX = 500;

/** Lower is sooner. J5: threats, minors and impersonation first; a case takes its most urgent report. */
export function reportPriority(c: ReportCategory): 0 | 1 | 2 {
  if (c === "minor" || c === "threat") return 0;
  if (c === "impersonation") return 1;
  return 2;
}

/** DSA notices (PUB-11): child sexual abuse and threats first. */
export function noticePriority(c: string): 0 | 1 | 2 {
  if (c === "csam" || c === "threat") return 0;
  return 2;
}

// ---------------------------------------------------------------- decisions (ADM-10, SAFE-05)

/** The account-level consequence of a decision, mildest first (graduated, D-075 sketch). */
export const ACTION_KINDS = [
  "content_removal",
  "notice",
  "warning",
  "restriction",
  "suspension",
  "ban",
] as const;
export type ActionKind = (typeof ACTION_KINDS)[number];
export const isActionKind = (v: unknown): v is ActionKind =>
  typeof v === "string" && (ACTION_KINDS as readonly string[]).includes(v);

/** Days on offer in the decision form; a ban has no end. */
export const RESTRICTION_DAYS = [1, 3, 7] as const;
export const SUSPENSION_DAYS = [7, 14, 30] as const;

/** Community Guidelines points a decision cites (names in "safety.rule.*"; the text itself is counsel's, B.3). */
export const RULES = [
  "respect",
  "hate",
  "violence",
  "sexual",
  "adults",
  "authentic",
  "spam",
  "copyright",
  "ai",
  "privacy",
  "illegal",
] as const;
export type Rule = (typeof RULES)[number];
export const isRule = (v: unknown): v is Rule =>
  typeof v === "string" && (RULES as readonly string[]).includes(v);

/** The rule a moderator most likely cites for a report category (preselected, can be changed). */
export const RULE_FOR_CATEGORY: Record<ReportCategory, Rule> = {
  harassment: "respect",
  hate: "hate",
  threat: "violence",
  sexual: "sexual",
  minor: "adults",
  impersonation: "authentic",
  spam: "spam",
  copyright: "copyright",
  ai_generated: "ai",
  private_info: "privacy",
  other: "illegal",
};

export type Decision =
  | { outcome: "none" }
  | {
      outcome: "action";
      kind: ActionKind;
      rule: Rule;
      statement: string;
      /** Restriction and suspension only; one of the offered values. */
      days?: number;
      /** Remove the reported answer or comment as well (always true for content_removal). */
      removeContent: boolean;
    };

export type DecisionError =
  "kind" | "rule" | "statement" | "statementLong" | "days" | "removeTarget" | "subject";

/**
 * Validates a decision against the case it is for. `targetType` is the reported object ("answer", "comment",
 * "profile", or "notice" when the DSA notice could not be matched to an object); `hasSubject` says whether a member
 * stands behind the object (a notice about an outside page has none, so only "none" or a "notice" record fits).
 */
export function validateDecision(
  d: Decision,
  targetType: string,
  hasSubject: boolean,
): DecisionError | null {
  if (d.outcome === "none") return null;
  if (!isActionKind(d.kind)) return "kind";
  if (!isRule(d.rule)) return "rule";
  const text = d.statement.trim();
  if (!text) return "statement";
  if (text.length > STATEMENT_MAX) return "statementLong";
  // A DSA notice about something that is not one of our objects: only a record of what was done ("notice").
  if (!hasSubject) return d.kind === "notice" && !d.removeContent ? null : "subject";
  const content = targetType === "answer" || targetType === "comment";
  if ((d.kind === "content_removal" || d.removeContent) && !content) return "removeTarget";
  if (d.kind === "restriction" && !RESTRICTION_DAYS.includes(d.days as never)) return "days";
  if (d.kind === "suspension" && !SUSPENSION_DAYS.includes(d.days as never)) return "days";
  return null;
}

/** When the consequence ends (null: no end, or nothing that lasts). */
export function endsAt(kind: ActionKind, days: number | undefined, from: Date): Date | null {
  if ((kind === "restriction" || kind === "suspension") && days)
    return new Date(from.getTime() + days * 86_400_000);
  return null;
}

/** DSA Art. 20(1): an internal complaint can be lodged for at least six months after the decision. */
export const APPEAL_DAYS = 183;
export const appealUntil = (from: Date) => new Date(from.getTime() + APPEAL_DAYS * 86_400_000);

/** J5 E9: the moderation copy of reported content is kept 90 days, and at least as long as an appeal is open. */
export const SNAPSHOT_DAYS = 90;
export function snapshotPurgeAfter(decidedAt: Date, appealDeadline: Date | null): Date {
  const base = decidedAt.getTime() + SNAPSHOT_DAYS * 86_400_000;
  return new Date(Math.max(base, appealDeadline?.getTime() ?? 0));
}

// ---------------------------------------------------------------- conflict of interest (J5 E3, RECOMMENDED)

export type Conflict = "self" | "involved" | null;

/**
 * Can this staff member decide the case? "self": the case is about them (never, not even an admin). "involved":
 * they reported it, or the reported member or a reporter blocked them; a moderator cannot take the case, an admin
 * may only with a stated reason (the alpha has one admin, D-106 notes; the reason is audited).
 */
export function conflictOf(input: {
  staffId: string;
  subjectId: string | null;
  reporterIds: readonly (string | null)[];
  /** Everyone involved in the case (subject, reporters) who has blocked this staff member. */
  blockedStaff: boolean;
}): Conflict {
  if (input.subjectId && input.subjectId === input.staffId) return "self";
  if (input.reporterIds.includes(input.staffId)) return "involved";
  if (input.blockedStaff) return "involved";
  return null;
}

// ---------------------------------------------------------------- what the reporter sees (SAFE-04)

export type MemberReportStatus = "received" | "review" | "done";

/** The reporter sees three states and, at the end, only whether action was taken (never which). */
export function memberReportStatus(status: "open" | "in_review" | "resolved" | "dismissed"): {
  status: MemberReportStatus;
  outcome: "action" | "none" | null;
} {
  if (status === "resolved") return { status: "done", outcome: "action" };
  if (status === "dismissed") return { status: "done", outcome: "none" };
  return { status: status === "in_review" ? "review" : "received", outcome: null };
}

// ---------------------------------------------------------------- DSA notices (PUB-11 → ADM-10)

export type ContentRef =
  | { type: "answer"; id: string }
  | { type: "comment"; id: string; answerId: string }
  | { type: "profile"; username: string };

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const ANSWER_PATH = new RegExp(`^(?:/(?:hr|en))?/drop/\\d{4}-\\d{2}-\\d{2}/a/(${UUID})/?$`, "i");
const PROFILE_PATH = /^(?:\/(?:hr|en))?\/(?:@|u\/)([a-z0-9_]{3,30})\/?$/i;
const COMMENT_HASH = new RegExp(`^#c-(${UUID})$`, "i");

/**
 * Which object of ours a notice's URL points at, when it is one: an answer, a comment (the answer URL with
 * #c-<id>) or a profile. Only our own host counts (`hosts`); anything else is reviewed by hand.
 */
export function parseContentUrl(raw: string, hosts: readonly string[]): ContentRef | null {
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    return null;
  }
  if (!hosts.includes(u.host.toLowerCase())) return null;
  let path: string;
  try {
    path = decodeURIComponent(u.pathname);
  } catch {
    return null; // a malformed %-sequence (review 5.9 L4): reviewed by hand, never a failed notice
  }
  const a = ANSWER_PATH.exec(path);
  if (a) {
    const c = COMMENT_HASH.exec(u.hash);
    return c
      ? { type: "comment", id: c[1]!.toLowerCase(), answerId: a[1]!.toLowerCase() }
      : { type: "answer", id: a[1]!.toLowerCase() };
  }
  const p = PROFILE_PATH.exec(path);
  return p ? { type: "profile", username: p[1]!.toLowerCase() } : null;
}
