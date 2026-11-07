"use server";

import { getSession, roleOf } from "@/lib/auth/session";
import type { Viewer } from "@/lib/authz";
import { logDbError } from "@/lib/data/db-errors";
import { loadViewer } from "@/lib/data/facts";
import { muteMember, unmuteMember } from "@/lib/data/graph";
import { consume } from "@/lib/data/rate-limit";
import { acknowledgeRestriction, createReport, submitAppeal } from "@/lib/data/safety";
import { APPEAL_MAX, DETAILS_MAX, isReportCategory, isReportTarget } from "@/lib/moderation/rules";

// Server actions for member safety (step 5.9; SAFE-01, SAFE-03, SAFE-06, SAFE-07). The member comes from the
// session with fresh facts, never from the client; every id is checked for shape here and again in the data layer.
// A hidden or blocked target answers like a missing one (IA8). Failures are reason keys, never exception text.

// i18n-keys: safety.error.signedOut safety.error.notAllowed safety.error.notAvailable safety.error.tooMany
// i18n-keys: safety.error.generic safety.error.invalid safety.error.closed safety.error.exists safety.error.copyright

export type SafetyFailure =
  | "signedOut"
  | "notAllowed"
  | "notAvailable"
  | "tooMany"
  | "generic"
  | "invalid"
  | "closed"
  | "exists"
  | "copyright";
export type SafetyResult = { ok: true } | { ok: false; reason: SafetyFailure };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function signedIn(): Promise<Viewer | null> {
  const session = await getSession();
  if (!session) return null;
  return loadViewer({ id: session.user.id, role: roleOf(session) });
}

const activeMember = (v: Viewer | null): v is Viewer & { id: string } =>
  !!v?.id && v.status === "active" && v.onboarded !== false;

async function guarded(where: string, run: () => Promise<SafetyResult>): Promise<SafetyResult> {
  try {
    return await run();
  } catch (e) {
    logDbError(where, e);
    return { ok: false, reason: "generic" };
  }
}

/** SAFE-01: send a report about a profile, an answer or a comment. */
export async function reportAction(input: {
  targetType: unknown;
  targetId: unknown;
  category: unknown;
  details: unknown;
  /** D-121 (4): the report is about the post's image. */
  aboutImage?: unknown;
}): Promise<SafetyResult> {
  const { targetType, targetId, category } = input ?? {};
  const details = typeof input?.details === "string" ? input.details : "";
  if (!isReportTarget(targetType) || typeof targetId !== "string" || !UUID.test(targetId))
    return { ok: false, reason: "notAvailable" };
  if (!isReportCategory(category)) return { ok: false, reason: "invalid" };
  if (details.trim().length > DETAILS_MAX) return { ok: false, reason: "invalid" };
  return guarded("reportAction", async () => {
    const viewer = await signedIn();
    if (!viewer) return { ok: false, reason: "signedOut" };
    if (!activeMember(viewer)) return { ok: false, reason: "notAllowed" };
    const r = await createReport(viewer, {
      targetType,
      targetId,
      category,
      details,
      aboutImage: input.aboutImage === true,
    });
    if (r.ok) return { ok: true };
    const reason: SafetyFailure =
      r.reason === "too-many"
        ? "tooMany"
        : r.reason === "copyright"
          ? "copyright"
          : r.reason === "not-allowed"
            ? "notAllowed"
            : "notAvailable";
    return { ok: false, reason };
  });
}

async function muteToggle(targetId: unknown, on: boolean): Promise<SafetyResult> {
  if (typeof targetId !== "string" || !UUID.test(targetId))
    return { ok: false, reason: "notAvailable" };
  return guarded(on ? "muteAction" : "unmuteAction", async () => {
    const viewer = await signedIn();
    if (!viewer) return { ok: false, reason: "signedOut" };
    if (!activeMember(viewer) || viewer.id === targetId) return { ok: false, reason: "notAllowed" };
    if (!(await consume("safety", viewer.id)).allowed) return { ok: false, reason: "tooMany" };
    if (on) {
      const r = await muteMember(viewer.id, targetId);
      if (!r.ok) return { ok: false, reason: "notAllowed" };
    } else await unmuteMember(viewer.id, targetId);
    return { ok: true };
  });
}

/** SAFE-03: mute (one-way, silent) and its Undo. */
export async function muteAction(targetId: string): Promise<SafetyResult> {
  return muteToggle(targetId, true);
}
export async function unmuteAction(targetId: string): Promise<SafetyResult> {
  return muteToggle(targetId, false);
}

/** SAFE-06: a basic appeal. Allowed while suspended or banned (DSA Art. 20). */
export async function appealAction(actionId: unknown, text: unknown): Promise<SafetyResult> {
  if (typeof actionId !== "string" || !UUID.test(actionId))
    return { ok: false, reason: "notAvailable" };
  if (typeof text !== "string" || !text.trim() || text.trim().length > APPEAL_MAX)
    return { ok: false, reason: "invalid" };
  return guarded("appealAction", async () => {
    const viewer = await signedIn();
    if (!viewer?.id) return { ok: false, reason: "signedOut" };
    const r = await submitAppeal(viewer.id, actionId, text);
    if (r.ok) return { ok: true };
    const reason: SafetyFailure =
      r.reason === "too-many"
        ? "tooMany"
        : r.reason === "not-available"
          ? "notAvailable"
          : r.reason;
    return { ok: false, reason };
  });
}

/** SAFE-07: "Nastavi" on the restriction screen. */
export async function acknowledgeRestrictionAction(actionId: unknown): Promise<SafetyResult> {
  if (typeof actionId !== "string" || !UUID.test(actionId))
    return { ok: false, reason: "notAvailable" };
  return guarded("acknowledgeRestriction", async () => {
    const viewer = await signedIn();
    if (!viewer?.id) return { ok: false, reason: "signedOut" };
    if (!(await consume("safety", viewer.id)).allowed) return { ok: false, reason: "tooMany" };
    await acknowledgeRestriction(viewer.id, actionId);
    return { ok: true };
  });
}
