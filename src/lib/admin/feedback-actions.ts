"use server";

import { revalidatePath } from "next/cache";
import { Forbidden, requireRole, Unauthenticated } from "@/lib/auth/session";
import { logDbError } from "@/lib/data/db-errors";
import { updateFeedback } from "@/lib/data/feedback";
import { consume } from "@/lib/data/rate-limit";

// ADM-15 (step 5.10): an admin with a second factor notes and closes feedback. Role and factor are checked on every
// call (requireRole); the UI only hides.

// i18n-keys: admin.feedback.error.forbidden admin.feedback.error.generic admin.feedback.error.tooMany

export type FeedbackActionResult =
  { ok: true } | { ok: false; reason: "forbidden" | "generic" | "tooMany" };

export async function updateFeedbackAction(input: {
  id: unknown;
  notes: unknown;
  done: unknown;
}): Promise<FeedbackActionResult> {
  try {
    const session = await requireRole("admin");
    if (!(await consume("moderation", session.user.id)).allowed)
      return { ok: false, reason: "tooMany" };
    if (typeof input?.id !== "string" || typeof input.done !== "boolean")
      return { ok: false, reason: "generic" };
    const notes = typeof input.notes === "string" ? input.notes : "";
    const ok = await updateFeedback(session.user.id, input.id, { notes, done: input.done });
    if (!ok) return { ok: false, reason: "generic" };
    revalidatePath("/[locale]/admin/feedback", "page");
    return { ok: true };
  } catch (e) {
    if (e instanceof Unauthenticated || e instanceof Forbidden)
      return { ok: false, reason: "forbidden" };
    logDbError("updateFeedbackAction", e);
    return { ok: false, reason: "generic" };
  }
}
