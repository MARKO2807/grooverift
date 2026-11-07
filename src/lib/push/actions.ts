"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { getSession, roleOf } from "@/lib/auth/session";
import { logDbError } from "@/lib/data/db-errors";
import { loadViewer } from "@/lib/data/facts";
import { REMINDER_TIMES } from "@/lib/data/onboarding";
import {
  pushAvailable,
  removeSubscription,
  saveSubscription,
  setDevicePause,
  setPushType,
  setReminder,
  validSubscription,
} from "@/lib/data/push";
import { consume } from "@/lib/data/rate-limit";
import { settingsSummary } from "@/lib/data/settings";
import { isPause, isPushType, pauseEnd } from "./rules";

// Server actions for push (step 5.12): "this phone" on and off, the pause, the type switches and the reminder.
// The member and the session always come from the session cookie, never from the client; the subscription the
// browser hands over is validated (a known push service, well-formed keys) before it is stored. Failures are
// reason keys for the components, never exception text.

// i18n-keys: push.error.signedOut push.error.unavailable push.error.tooMany push.error.generic push.error.invalid
// i18n-keys: push.error.notOn

export type PushFailure = "signedOut" | "unavailable" | "tooMany" | "generic" | "invalid" | "notOn";
export type PushResult = { ok: true } | { ok: false; reason: PushFailure };

/** The signed-in, active member and their session id; onboarding members are allowed (ONB-08 turns push on). */
async function me(): Promise<{ userId: string; sessionId: string } | PushFailure> {
  const session = await getSession();
  if (!session) return "signedOut";
  // Staff acting as a member never bind their own browser to that member's pushes (review 5.12 M2).
  if (session.session.impersonatedBy) return "unavailable";
  const viewer = await loadViewer({ id: session.user.id, role: roleOf(session) });
  if (!viewer.id || viewer.status !== "active") return "signedOut";
  if (!(await pushAvailable())) return "unavailable";
  if (!(await consume("push", viewer.id)).allowed) return "tooMany";
  return { userId: viewer.id, sessionId: session.session.id };
}

async function run(where: string, body: () => Promise<PushResult>): Promise<PushResult> {
  try {
    return await body();
  } catch (e) {
    logDbError(where, e);
    return { ok: false, reason: "generic" };
  }
}

const done = (): PushResult => {
  revalidatePath("/settings/notifications");
  return { ok: true };
};

/** "Obavijesti na ovom mobitelu" on: the browser's subscription, after the member's tap and permission. */
export async function subscribeAction(input: unknown): Promise<PushResult> {
  return run("subscribeAction", async () => {
    const m = await me();
    if (typeof m === "string") return { ok: false, reason: m };
    const sub = validSubscription((input ?? {}) as { endpoint: unknown; keys: unknown });
    if (!sub) return { ok: false, reason: "invalid" };
    const saved = await saveSubscription({
      userId: m.userId,
      sessionId: m.sessionId,
      ...sub,
      userAgent: (await headers()).get("user-agent"),
    });
    if (!saved) return { ok: false, reason: "invalid" };
    return done();
  });
}

/** "This phone" off. The browser's own subscription is removed by the component as well. */
export async function unsubscribeAction(): Promise<PushResult> {
  return run("unsubscribeAction", async () => {
    const session = await getSession();
    if (!session) return { ok: false, reason: "signedOut" };
    // Turning off always works, even with the flag off or the limit reached: it only removes.
    await removeSubscription(session.user.id, session.session.id);
    return done();
  });
}

/** "Pauziraj na" 1 h, 3 h or until 08:00 on the member's clock; null is "Uključi odmah". */
export async function pauseAction(choice: unknown): Promise<PushResult> {
  return run("pauseAction", async () => {
    if (choice !== null && !isPause(choice)) return { ok: false, reason: "invalid" };
    const m = await me();
    if (typeof m === "string") return { ok: false, reason: m };
    const tz = (await settingsSummary(m.userId))?.timeZone ?? "Europe/Zagreb";
    const until = choice === null ? null : pauseEnd(choice, new Date(), tz);
    if (!(await setDevicePause(m.userId, m.sessionId, until)))
      return { ok: false, reason: "notOn" };
    return done();
  });
}

export async function setPushTypeAction(type: unknown, enabled: unknown): Promise<PushResult> {
  return run("setPushTypeAction", async () => {
    if (!isPushType(type) || typeof enabled !== "boolean") return { ok: false, reason: "invalid" };
    const m = await me();
    if (typeof m === "string") return { ok: false, reason: m };
    await setPushType(m.userId, type, enabled);
    return done();
  });
}

export async function setReminderAction(enabled: unknown, localTime: unknown): Promise<PushResult> {
  return run("setReminderAction", async () => {
    if (typeof enabled !== "boolean") return { ok: false, reason: "invalid" };
    if (!(REMINDER_TIMES as readonly unknown[]).includes(localTime))
      return { ok: false, reason: "invalid" };
    const m = await me();
    if (typeof m === "string") return { ok: false, reason: m };
    await setReminder(m.userId, { enabled, localTime: localTime as string });
    return done();
  });
}
