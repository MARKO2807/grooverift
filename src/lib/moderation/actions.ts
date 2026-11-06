"use server";

import type { Session } from "@/lib/auth/auth";
import { Forbidden, requireRole, roleOf, Unauthenticated } from "@/lib/auth/session";
import type { Viewer } from "@/lib/authz";
import { logDbError } from "@/lib/data/db-errors";
import { loadViewer } from "@/lib/data/facts";
import {
  decideAppeal,
  decideCase,
  releaseCase,
  takeCase,
  type AppealDecision,
} from "@/lib/data/moderation";
import { consume } from "@/lib/data/rate-limit";
import { isActionKind, isRule, type Decision, type DecisionError } from "@/lib/moderation/rules";

// Staff actions for ADM-10 and ADM-11 (step 5.9). The role and the second factor are checked here on every call
// (requireRole), then again in the data layer (isModerationStaff on fresh facts); the UI only hides. Suspending or
// banning an account also needs a recent sign-in (plan §1.1 Admin: sensitive actions re-authenticated, freshAge).

// i18n-keys: moderation.error.forbidden moderation.error.override moderation.error.decided moderation.error.kind
// i18n-keys: moderation.error.rule moderation.error.statement moderation.error.statementLong moderation.error.days
// i18n-keys: moderation.error.removeTarget moderation.error.subject moderation.error.fresh moderation.error.tooMany
// i18n-keys: moderation.error.generic moderation.error.text moderation.error.gone moderation.error.staffSubject

export type ModerationFailure =
  | DecisionError
  | "forbidden"
  | "override"
  | "decided"
  | "fresh"
  | "tooMany"
  | "generic"
  | "text"
  | "gone"
  | "staffSubject";
export type ModerationResult = { ok: true } | { ok: false; reason: ModerationFailure };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** The session must be this recent to suspend or ban (Better Auth freshAge, src/lib/auth/auth.ts). */
const FRESH_MS = 15 * 60_000;

type StaffCall = { session: Session; viewer: Viewer } | { fail: "tooMany" };

async function staff(): Promise<StaffCall> {
  const session = await requireRole("moderator", "admin");
  const viewer = await loadViewer({ id: session.user.id, role: roleOf(session) });
  if (!(await consume("moderation", session.user.id)).allowed) return { fail: "tooMany" };
  return { session, viewer };
}

async function run(
  where: string,
  body: () => Promise<ModerationResult>,
): Promise<ModerationResult> {
  try {
    return await body();
  } catch (e) {
    if (e instanceof Unauthenticated || e instanceof Forbidden)
      return { ok: false, reason: "forbidden" };
    logDbError(where, e);
    return { ok: false, reason: "generic" };
  }
}

export async function takeCaseAction(caseId: string): Promise<ModerationResult> {
  if (typeof caseId !== "string" || !UUID.test(caseId)) return { ok: false, reason: "forbidden" };
  return run("takeCase", async () => {
    const s = await staff();
    if ("fail" in s) return { ok: false, reason: s.fail };
    const r = await takeCase(s.viewer, caseId);
    return r.ok ? { ok: true } : { ok: false, reason: r.reason };
  });
}

export async function releaseCaseAction(caseId: string): Promise<ModerationResult> {
  if (typeof caseId !== "string" || !UUID.test(caseId)) return { ok: false, reason: "forbidden" };
  return run("releaseCase", async () => {
    const s = await staff();
    if ("fail" in s) return { ok: false, reason: s.fail };
    return (await releaseCase(s.viewer, caseId))
      ? { ok: true }
      : { ok: false, reason: "forbidden" };
  });
}

export type DecisionInput = {
  outcome: unknown;
  kind?: unknown;
  rule?: unknown;
  statement?: unknown;
  days?: unknown;
  removeContent?: unknown;
  override?: unknown;
};

/** Turns the form's values into a Decision, or null when the shape is wrong (validated again in the data layer). */
function parseDecision(input: DecisionInput): Decision | null {
  if (input?.outcome === "none") return { outcome: "none" };
  if (input?.outcome !== "action") return null;
  if (!isActionKind(input.kind) || !isRule(input.rule)) return null;
  const days = typeof input.days === "number" ? input.days : Number(input.days);
  return {
    outcome: "action",
    kind: input.kind,
    rule: input.rule,
    statement: typeof input.statement === "string" ? input.statement : "",
    days: Number.isFinite(days) ? days : undefined,
    removeContent: input.removeContent === true,
  };
}

export async function decideCaseAction(
  caseId: string,
  input: DecisionInput,
): Promise<ModerationResult> {
  if (typeof caseId !== "string" || !UUID.test(caseId)) return { ok: false, reason: "forbidden" };
  const decision = parseDecision(input);
  if (!decision) return { ok: false, reason: "kind" };
  return run("decideCase", async () => {
    const s = await staff();
    if ("fail" in s) return { ok: false, reason: s.fail };
    if (
      decision.outcome === "action" &&
      (decision.kind === "suspension" || decision.kind === "ban")
    ) {
      const signedInAt = new Date(s.session.session.createdAt).getTime();
      if (!Number.isFinite(signedInAt) || Date.now() - signedInAt > FRESH_MS)
        return { ok: false, reason: "fresh" };
    }
    const override = typeof input.override === "string" ? input.override : undefined;
    const r = await decideCase(s.viewer, caseId, decision, override);
    return r.ok ? { ok: true } : { ok: false, reason: r.reason };
  });
}

export async function decideAppealAction(
  appealId: string,
  outcome: AppealDecision,
  text: string,
  override?: string,
): Promise<ModerationResult> {
  if (typeof appealId !== "string" || !UUID.test(appealId))
    return { ok: false, reason: "forbidden" };
  if (outcome !== "upheld" && outcome !== "overturned") return { ok: false, reason: "forbidden" };
  return run("decideAppeal", async () => {
    const s = await staff();
    if ("fail" in s) return { ok: false, reason: s.fail };
    const r = await decideAppeal(
      s.viewer,
      appealId,
      outcome,
      text,
      typeof override === "string" ? override : undefined,
    );
    return r.ok ? { ok: true } : { ok: false, reason: r.reason };
  });
}
