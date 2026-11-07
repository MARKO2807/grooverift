// Web push (step 5.12, D-093 (1), behind the "push" flag): devices, the member's push choices, the Daily Drop
// reminder at each member's local time, and social pushes.
//
// Devices: one subscription per signed-in session ("this phone", D-071). It is written only after the member's
// own tap and the browser's permission, bound to the session (signing out removes it), and its keys are stored
// encrypted. The endpoint must be a known push service (send.ts), never an address of the member's choosing.
//
// Reminder (OQ-11): at the member's chosen local time in their IANA zone, about the newest published question
// they have not been reminded of, at most once per local day. The wall-clock comparison happens in PostgreSQL
// (`at time zone`), so daylight saving needs no special case. A reminder is claimed in the database before it is
// sent, so two workers or a retried tick never send it twice. Delivery is best effort.
//
// Social pushes: only for a new Activity entry (a grouped reaction inside its hour sends nothing more), only for
// the types the member left on (D-072 (1) defaults), never from a muted or blocked member (the caller has checked
// the block), and the payload never carries a name or text (rules.ts).
import { and, eq, inArray, isNull, lte, or, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  dailyDropReminder,
  mute,
  notificationPreference,
  profile,
  pushSubscription,
  session,
  user,
} from "@/lib/db/schema";
import { deviceLabel } from "@/lib/account/rules";
import { flagState } from "@/lib/flags";
import { openKeys, sealKeys, type SubscriptionKeys } from "@/lib/push/crypto";
import {
  MAX_FAILURES,
  PUSH_DEFAULTS,
  PUSH_TYPE_OF,
  REMINDER_WINDOW_MINUTES,
  TTL,
  reminderPayload,
  socialPayload,
  type PushLocale,
  type PushPayload,
  type PushType,
} from "@/lib/push/rules";
import { allowedEndpoint, pushConfigured, sendPush } from "@/lib/push/send";
import { latestPublished } from "./drops";

/** At most this many devices per member; turning on an eleventh drops the oldest. */
export const DEVICE_MAX = 10;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const KEY = /^[A-Za-z0-9_-]{16,128}={0,2}$/;

const asLocale = (v: string | null | undefined): PushLocale => (v === "en" ? "en" : "hr");

/** Push works at all: the flag is on and the VAPID pair is configured. */
export async function pushAvailable(): Promise<boolean> {
  if (!pushConfigured()) return false;
  return (await flagState("push")) === "on";
}

// ============================================================ devices

export type DeviceState = { on: boolean; pausedUntil: Date | null };

/** "This phone": the subscription of the current session, if any. */
export async function deviceFor(userId: string, sessionId: string): Promise<DeviceState> {
  const [row] = await db()
    .select({ pausedUntil: pushSubscription.pausedUntil })
    .from(pushSubscription)
    .where(and(eq(pushSubscription.userId, userId), eq(pushSubscription.sessionId, sessionId)));
  if (!row) return { on: false, pausedUntil: null };
  const paused = row.pausedUntil && row.pausedUntil > new Date() ? row.pausedUntil : null;
  return { on: true, pausedUntil: paused };
}

export type SubscriptionInput = { endpoint: unknown; keys: unknown };

export function validSubscription(
  input: SubscriptionInput,
): { endpoint: string; keys: SubscriptionKeys } | null {
  if (!allowedEndpoint(input.endpoint)) return null;
  const k = input.keys as Partial<SubscriptionKeys> | null | undefined;
  if (!k || typeof k !== "object") return null;
  if (typeof k.p256dh !== "string" || !KEY.test(k.p256dh)) return null;
  if (typeof k.auth !== "string" || !KEY.test(k.auth)) return null;
  return { endpoint: input.endpoint, keys: { p256dh: k.p256dh, auth: k.auth } };
}

/**
 * Turn "this phone" on: store the browser's subscription for this session. The endpoint is unique: if the same
 * browser was subscribed under another session or member, it now belongs to this one (the person holding the
 * device tapped "on"). One subscription per session; the oldest beyond DEVICE_MAX go.
 */
export async function saveSubscription(input: {
  userId: string;
  sessionId: string;
  endpoint: string;
  keys: SubscriptionKeys;
  userAgent?: string | null;
}): Promise<boolean> {
  if (!UUID.test(input.userId) || !UUID.test(input.sessionId)) throw new Error("bad id");
  const sealed = sealKeys(input.keys);
  const label = deviceLabel(input.userAgent);
  return db().transaction(async (tx) => {
    // An endpoint held by another member moves only with the same browser keys: the same browser subscription,
    // now in someone else's hands. Someone who merely learned the address cannot take it over (review 5.12 L1).
    const [held] = await tx
      .select({ userId: pushSubscription.userId, keys: pushSubscription.keys })
      .from(pushSubscription)
      .where(eq(pushSubscription.endpoint, input.endpoint))
      .for("update");
    if (held && held.userId !== input.userId && openKeys(held.keys)?.auth !== input.keys.auth)
      return false;
    await tx
      .delete(pushSubscription)
      .where(
        and(
          eq(pushSubscription.sessionId, input.sessionId),
          sql`${pushSubscription.endpoint} <> ${input.endpoint}`,
        ),
      );
    await tx
      .insert(pushSubscription)
      .values({
        userId: input.userId,
        sessionId: input.sessionId,
        endpoint: input.endpoint,
        keys: sealed,
        deviceLabel: label,
      })
      .onConflictDoUpdate({
        target: pushSubscription.endpoint,
        set: {
          userId: input.userId,
          sessionId: input.sessionId,
          keys: sealed,
          deviceLabel: label,
          pausedUntil: null,
          failures: 0,
          createdAt: new Date(),
        },
      });
    const rows = await tx
      .select({ id: pushSubscription.id })
      .from(pushSubscription)
      .where(eq(pushSubscription.userId, input.userId))
      .orderBy(sql`${pushSubscription.createdAt} desc`);
    const extra = rows.slice(DEVICE_MAX).map((r) => r.id);
    if (extra.length) await tx.delete(pushSubscription).where(inArray(pushSubscription.id, extra));
    return true;
  });
}

/** Turn "this phone" off. */
export async function removeSubscription(userId: string, sessionId: string): Promise<void> {
  await db()
    .delete(pushSubscription)
    .where(and(eq(pushSubscription.userId, userId), eq(pushSubscription.sessionId, sessionId)));
}

/** "Pauziraj na" (D-072 (2)); null resumes at once ("Uključi odmah"). False when this phone is not on. */
export async function setDevicePause(
  userId: string,
  sessionId: string,
  until: Date | null,
): Promise<boolean> {
  const rows = await db()
    .update(pushSubscription)
    .set({ pausedUntil: until })
    .where(and(eq(pushSubscription.userId, userId), eq(pushSubscription.sessionId, sessionId)))
    .returning({ id: pushSubscription.id });
  return rows.length > 0;
}

// ============================================================ choices

export type PushChoices = {
  types: Record<PushType, boolean>;
  reminder: { enabled: boolean; localTime: string; timeZone: string };
};

export async function pushChoices(userId: string): Promise<PushChoices> {
  const [prefs, [rem], [p]] = await Promise.all([
    db()
      .select({ type: notificationPreference.type, enabled: notificationPreference.enabled })
      .from(notificationPreference)
      .where(
        and(eq(notificationPreference.userId, userId), eq(notificationPreference.channel, "push")),
      ),
    db().select().from(dailyDropReminder).where(eq(dailyDropReminder.userId, userId)),
    db().select({ timeZone: profile.timeZone }).from(profile).where(eq(profile.userId, userId)),
  ]);
  const types = { ...PUSH_DEFAULTS };
  for (const row of prefs) if (row.type in types) types[row.type as PushType] = row.enabled;
  return {
    types,
    reminder: {
      enabled: rem?.enabled ?? false,
      localTime: (rem?.localTime ?? "12:00").slice(0, 5),
      timeZone: rem?.timeZone ?? p?.timeZone ?? "Europe/Zagreb",
    },
  };
}

export async function setPushType(userId: string, type: PushType, enabled: boolean): Promise<void> {
  await db()
    .insert(notificationPreference)
    .values({ userId, type, channel: "push", enabled })
    .onConflictDoUpdate({
      target: [
        notificationPreference.userId,
        notificationPreference.type,
        notificationPreference.channel,
      ],
      set: { enabled },
    });
}

/** SET-06: the reminder switch and time; the zone is the member's own (SET-07). */
export async function setReminder(
  userId: string,
  input: { enabled: boolean; localTime: string },
): Promise<void> {
  const [p] = await db()
    .select({ timeZone: profile.timeZone })
    .from(profile)
    .where(eq(profile.userId, userId));
  const timeZone = p?.timeZone ?? "Europe/Zagreb";
  await db()
    .insert(dailyDropReminder)
    .values({ userId, enabled: input.enabled, localTime: input.localTime, timeZone })
    .onConflictDoUpdate({
      target: dailyDropReminder.userId,
      set: {
        enabled: input.enabled,
        localTime: input.localTime,
        timeZone,
        updatedAt: new Date(),
      },
    });
}

// ============================================================ delivery

type Target = {
  id: string;
  endpoint: string;
  keys: string;
  failures: number;
  pausedUntil: Date | null;
  expiresAt: Date;
};

/** Every device of the member that may receive now: not paused, its session still valid. */
async function targetsOf(userIds: string[], now: Date): Promise<Map<string, Target[]>> {
  const out = new Map<string, Target[]>();
  if (!userIds.length) return out;
  const rows = await db()
    .select({
      id: pushSubscription.id,
      userId: pushSubscription.userId,
      endpoint: pushSubscription.endpoint,
      keys: pushSubscription.keys,
      failures: pushSubscription.failures,
      pausedUntil: pushSubscription.pausedUntil,
      expiresAt: session.expiresAt,
    })
    .from(pushSubscription)
    .innerJoin(session, eq(session.id, pushSubscription.sessionId))
    .where(
      and(
        inArray(pushSubscription.userId, userIds),
        or(isNull(pushSubscription.pausedUntil), lte(pushSubscription.pausedUntil, now)),
      ),
    );
  for (const r of rows) {
    // The session's expiry is compared in JavaScript, the way the auth library wrote and reads it.
    if (r.expiresAt <= now) continue;
    const list = out.get(r.userId) ?? [];
    list.push(r);
    out.set(r.userId, list);
  }
  return out;
}

/** Send one payload to the given devices; drop the gone ones, count failures. Returns how many were delivered. */
async function deliver(
  targets: Target[],
  payload: PushPayload,
  opts: { ttl: number; urgency: "normal" | "high"; topic?: string },
): Promise<number> {
  let sent = 0;
  for (const t of targets) {
    const keys = openKeys(t.keys);
    const outcome = keys ? await sendPush({ endpoint: t.endpoint, keys }, payload, opts) : "gone";
    if (outcome === "sent") {
      sent++;
      await db()
        .update(pushSubscription)
        .set({ lastSuccessAt: new Date(), failures: 0 })
        .where(eq(pushSubscription.id, t.id));
    } else if (outcome === "gone" || t.failures + 1 >= MAX_FAILURES) {
      await db().delete(pushSubscription).where(eq(pushSubscription.id, t.id));
    } else {
      await db()
        .update(pushSubscription)
        .set({ failures: sql`${pushSubscription.failures} + 1` })
        .where(eq(pushSubscription.id, t.id));
    }
  }
  return sent;
}

export type SocialKind = "comment" | "reaction" | "follow" | "follow_request" | "follow_accept";

/**
 * A social push for a new Activity entry (or a follow request). The caller has already decided that the actor
 * may notify the recipient (not the own act, no block, both visible); this adds the member's switch for the type
 * and the mute. Never throws.
 */
export async function pushSocial(input: {
  recipientId: string;
  actorId: string;
  kind: SocialKind;
}): Promise<number> {
  try {
    const type = PUSH_TYPE_OF[input.kind];
    if (!type || !(await pushAvailable())) return 0;
    const now = new Date();
    const [[pref], [muted], [u], targets] = await Promise.all([
      db()
        .select({ enabled: notificationPreference.enabled })
        .from(notificationPreference)
        .where(
          and(
            eq(notificationPreference.userId, input.recipientId),
            eq(notificationPreference.type, type),
            eq(notificationPreference.channel, "push"),
          ),
        ),
      db()
        .select({ id: mute.mutedId })
        .from(mute)
        .where(and(eq(mute.muterId, input.recipientId), eq(mute.mutedId, input.actorId))),
      db()
        .select({ locale: user.locale, status: user.status })
        .from(user)
        .where(eq(user.id, input.recipientId)),
      targetsOf([input.recipientId], now),
    ]);
    if (!(pref?.enabled ?? PUSH_DEFAULTS[type])) return 0;
    if (muted || !u || u.status !== "active") return 0;
    const list = targets.get(input.recipientId) ?? [];
    if (!list.length) return 0;
    return await deliver(list, socialPayload(asLocale(u.locale), input.kind), {
      ttl: TTL.social,
      urgency: "normal",
    });
  } catch (error) {
    console.error("[push] social failed:", error instanceof Error ? error.name : "unknown");
    return 0;
  }
}

/** Fire and forget from a request: the act that caused it never waits for or fails with the push. */
export function pushSocialInBackground(input: Parameters<typeof pushSocial>[0]): void {
  void pushSocial(input);
}

// ============================================================ the Daily Drop reminder

export type DueReminder = { userId: string; locale: PushLocale; localDate: string };

/**
 * Members whose reminder is due at `now` for question `questionId` (OQ-11): the reminder is on, the member is
 * active and onboarded, has at least one device, has not had a reminder on this local date nor one about this
 * question, the local clock is inside [localTime, localTime + window), and the choice was not made after today's
 * time had already passed (turning it on at 14:00 for 12:00 starts tomorrow).
 */
export async function remindersDue(now: Date, questionId: string): Promise<DueReminder[]> {
  if (!UUID.test(questionId)) return [];
  const local = sql`(${now.toISOString()}::timestamptz at time zone ${dailyDropReminder.timeZone})`;
  const localDate = sql`(${local})::date`;
  const slot = sql`(${localDate} + ${dailyDropReminder.localTime})`;
  const changed = sql`(${dailyDropReminder.updatedAt} at time zone ${dailyDropReminder.timeZone})`;
  const rows = await db()
    .select({
      userId: dailyDropReminder.userId,
      locale: user.locale,
      localDate: sql<string>`to_char(${localDate}, 'YYYY-MM-DD')`,
    })
    .from(dailyDropReminder)
    .innerJoin(user, eq(user.id, dailyDropReminder.userId))
    .innerJoin(profile, eq(profile.userId, dailyDropReminder.userId))
    .where(
      and(
        eq(dailyDropReminder.enabled, true),
        // A zone PostgreSQL does not know would fail the whole query for everyone (review 5.12 L2).
        sql`${dailyDropReminder.timeZone} in (select name from pg_timezone_names)`,
        eq(user.status, "active"),
        sql`${profile.onboardedAt} is not null`,
        sql`${dailyDropReminder.lastNotifiedQuestionId} is distinct from ${questionId}::uuid`,
        sql`(${dailyDropReminder.lastRemindedOn} is null or ${dailyDropReminder.lastRemindedOn} < ${localDate})`,
        sql`${local} >= ${slot}`,
        sql`${local} < ${slot} + make_interval(mins => ${REMINDER_WINDOW_MINUTES})`,
        sql`${changed} <= ${slot}`,
        sql`exists (select 1 from ${pushSubscription} where ${pushSubscription.userId} = ${dailyDropReminder.userId})`,
      ),
    );
  return rows.map((r) => ({
    userId: r.userId,
    locale: asLocale(r.locale),
    localDate: r.localDate,
  }));
}

/** Claim one reminder before sending it; false when another run already did. */
async function claimReminder(r: DueReminder, questionId: string): Promise<boolean> {
  const rows = await db()
    .update(dailyDropReminder)
    .set({ lastRemindedOn: r.localDate, lastNotifiedQuestionId: questionId })
    .where(
      and(
        eq(dailyDropReminder.userId, r.userId),
        sql`${dailyDropReminder.lastNotifiedQuestionId} is distinct from ${questionId}::uuid`,
        sql`(${dailyDropReminder.lastRemindedOn} is null or ${dailyDropReminder.lastRemindedOn} < ${r.localDate}::date)`,
      ),
    )
    .returning({ userId: dailyDropReminder.userId });
  return rows.length > 0;
}

/** The worker tick: every due reminder about the newest published question. */
export async function runReminders(
  now: Date = new Date(),
): Promise<{ due: number; delivered: number }> {
  if (!(await pushAvailable())) return { due: 0, delivered: 0 };
  const latest = {
    hr: await latestPublished("hr", now),
    en: await latestPublished("en", now),
  };
  const question = latest.hr;
  if (!question) return { due: 0, delivered: 0 };
  const due = await remindersDue(now, question.id);
  const targets = await targetsOf(
    due.map((d) => d.userId),
    now,
  );
  let delivered = 0;
  for (const r of due) {
    const list = targets.get(r.userId) ?? [];
    if (!list.length) continue; // paused or only expired sessions: maybe later inside the window
    if (!(await claimReminder(r, question.id))) continue;
    const q = latest[r.locale] ?? question;
    delivered += await deliver(list, reminderPayload(r.locale, q), {
      ttl: TTL.reminder,
      urgency: "normal",
      topic: "daily-drop",
    });
  }
  return { due: due.length, delivered };
}
