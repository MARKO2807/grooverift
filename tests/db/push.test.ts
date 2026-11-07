// Step 5.12: web push through the real data layer. The Daily Drop reminder at each member's local time across
// zones and daylight saving (OQ-11), at most once a day and never twice for one question; devices bound to their
// session; the pause; delivery outcomes; social pushes only for new entries, only for the switched-on types, never
// from a muted member; and no payload ever carries a name or member text. The transport is replaced, so nothing
// leaves the machine. Fixtures are fictional members with @push.test emails and one question in 1995; only those
// rows are touched, and the "push" flag is put back as it was.
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  // Shape-valid VAPID values: the replaced transport never uses them, pushConfigured() only needs them set.
  process.env.VAPID_PUBLIC_KEY ??= "B".repeat(87);
  process.env.VAPID_PRIVATE_KEY ??= "p".repeat(43);
});

import { and, eq, inArray } from "drizzle-orm";
import { closeDb, db } from "@/lib/db/client";
import {
  dailyDropQuestion,
  dailyDropReminder,
  dailyDropTranslation,
  featureFlag,
  mute,
  notificationPreference,
  privacySettings,
  profile,
  pushSubscription,
  session,
  user,
} from "@/lib/db/schema";
import { loadViewer } from "@/lib/data/facts";
import { followMember, unfollowMember } from "@/lib/data/graph";
import { notify } from "@/lib/data/notifications";
import {
  deviceFor,
  pushChoices,
  pushSocial,
  remindersDue,
  removeSubscription,
  runReminders,
  saveSubscription,
  setDevicePause,
  setPushType,
  setReminder,
} from "@/lib/data/push";
import { openKeys } from "@/lib/push/crypto";
import type { PushPayload } from "@/lib/push/rules";
import { setTransportForTests, type SendOutcome } from "@/lib/push/send";

const RUN = Date.now().toString(36);
const ids: Record<string, string> = {};
const sessions: Record<string, string> = {};
const questionIds: string[] = [];
const OLD = new Date("1990-01-01T00:00:00Z"); // before every simulated "now", including 1995
const DAY = String(10 + (Date.now() % 18)).padStart(2, "0");
const QDATE = `1995-06-${DAY}`;
let flagBefore: typeof featureFlag.$inferSelect | undefined;

type Sent = { endpoint: string; payload: PushPayload; ttl: number };
const sent: Sent[] = [];
let outcome: (endpoint: string) => SendOutcome = () => "sent";

const KEYS = {
  p256dh: "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM",
  auth: "tBHItJI5svbpez7KI4CCXg",
};
const endpointOf = (key: string) => `https://fcm.googleapis.com/fcm/send/${key}-${RUN}`;

async function member(
  key: string,
  opts: {
    zone?: string;
    time?: string;
    status?: string;
    onboarded?: boolean;
    visibility?: "public" | "private";
    device?: boolean;
  } = {},
) {
  const [u] = await db()
    .insert(user)
    .values({
      name: `Push ${key}`,
      email: `${key}-${RUN}@push.test`,
      emailVerified: true,
      status: opts.status ?? "active",
      locale: "hr",
    })
    .returning({ id: user.id });
  ids[key] = u!.id;
  await db()
    .insert(profile)
    .values({
      userId: u!.id,
      username: `p${key}_${RUN}`.slice(0, 30),
      displayName: `Push ${key}`,
      visibility: opts.visibility ?? "public",
      timeZone: opts.zone ?? "Europe/Zagreb",
      onboardedAt: opts.onboarded === false ? null : new Date(),
    });
  await db().insert(privacySettings).values({ userId: u!.id });
  const [s] = await db()
    .insert(session)
    .values({
      userId: u!.id,
      token: `push-${key}-${RUN}`,
      expiresAt: new Date(Date.now() + 30 * 86_400_000),
      updatedAt: new Date(),
    })
    .returning({ id: session.id });
  sessions[key] = s!.id;
  if (opts.time)
    await db()
      .insert(dailyDropReminder)
      .values({
        userId: u!.id,
        enabled: true,
        localTime: opts.time,
        timeZone: opts.zone ?? "Europe/Zagreb",
        updatedAt: OLD,
      });
  if (opts.device !== false)
    await saveSubscription({
      userId: u!.id,
      sessionId: s!.id,
      endpoint: endpointOf(key),
      keys: KEYS,
      userAgent: "Mozilla/5.0 (Linux; Android 14) Chrome/130.0 Mobile Safari/537.36",
    });
}

/** Of everyone due in the database, only this suite's members, by key. */
async function due(now: string, questionId = "00000000-0000-4000-8000-000000000001") {
  const rows = await remindersDue(new Date(now), questionId);
  const byId = Object.fromEntries(Object.entries(ids).map(([k, v]) => [v, k]));
  return rows
    .map((r) => byId[r.userId])
    .filter(Boolean)
    .sort();
}

const sentTo = (key: string) => sent.filter((s) => s.endpoint === endpointOf(key));

beforeAll(async () => {
  [flagBefore] = await db().select().from(featureFlag).where(eq(featureFlag.key, "push"));
  await db()
    .insert(featureFlag)
    .values({ key: "push", state: "on", audience: {} })
    .onConflictDoUpdate({ target: featureFlag.key, set: { state: "on" } });
  setTransportForTests(async (target, payload, opts) => {
    sent.push({ endpoint: target.endpoint, payload, ttl: opts.ttl });
    return outcome(target.endpoint);
  });

  await member("zg", { zone: "Europe/Zagreb", time: "12:00" });
  await member("la", { zone: "America/Los_Angeles", time: "07:00" });
  await member("tokyo", { zone: "Asia/Tokyo", time: "07:00" });
  await member("kolkata", { zone: "Asia/Kolkata", time: "12:00" });
  await member("dst", { zone: "Europe/Zagreb", time: "08:00" });
  await member("nodevice", { zone: "Europe/Zagreb", time: "12:00", device: false });
  await member("fresh", { zone: "Europe/Zagreb", time: "12:00", onboarded: false });
  await member("away", { zone: "Europe/Zagreb", time: "12:00", status: "deactivated" });
  await member("author");
  await member("actor");
  await member("priv", { visibility: "private" });
});

afterAll(async () => {
  setTransportForTests(null);
  if (questionIds.length)
    await db().delete(dailyDropQuestion).where(inArray(dailyDropQuestion.id, questionIds));
  const all = Object.values(ids);
  if (all.length) {
    await db().delete(mute).where(inArray(mute.muterId, all));
    await db().delete(user).where(inArray(user.id, all));
  }
  if (flagBefore)
    await db()
      .update(featureFlag)
      .set({ state: flagBefore.state })
      .where(eq(featureFlag.key, "push"));
  else await db().delete(featureFlag).where(eq(featureFlag.key, "push"));
  await closeDb();
});

describe("the reminder at the member's local time (OQ-11)", () => {
  it("is due from the chosen time for the window, in every zone", async () => {
    // 12:00 in Zagreb (summer, UTC+2) is 10:00 UTC.
    expect(await due("2026-07-01T09:58:00Z")).not.toContain("zg");
    expect(await due("2026-07-01T10:02:00Z")).toContain("zg");
    expect(await due("2026-07-01T11:29:00Z")).toContain("zg");
    expect(await due("2026-07-01T11:31:00Z")).not.toContain("zg");
    // 07:00 in Los Angeles (UTC−7) is 14:00 UTC; 07:00 in Tokyo is 22:00 UTC the day before.
    expect(await due("2026-07-01T14:03:00Z")).toContain("la");
    expect(await due("2026-06-30T22:01:00Z")).toContain("tokyo");
    // A half-hour zone: 12:00 in Kolkata (UTC+5:30) is 06:30 UTC.
    expect(await due("2026-07-01T06:29:00Z")).not.toContain("kolkata");
    expect(await due("2026-07-01T06:31:00Z")).toContain("kolkata");
  });

  it("follows daylight saving through the zone, not a fixed offset", async () => {
    // 08:00 in Zagreb: 07:00 UTC on Saturday 2026-03-28 (CET), 06:00 UTC on Sunday 2026-03-29 (CEST).
    expect(await due("2026-03-28T06:01:00Z")).not.toContain("dst");
    expect(await due("2026-03-28T07:01:00Z")).toContain("dst");
    expect(await due("2026-03-29T05:59:00Z")).not.toContain("dst");
    expect(await due("2026-03-29T06:01:00Z")).toContain("dst");
    // Autumn: Sunday 2026-10-25 back to CET, 08:00 is 07:00 UTC again.
    expect(await due("2026-10-25T06:01:00Z")).not.toContain("dst");
    expect(await due("2026-10-25T07:01:00Z")).toContain("dst");
  });

  it("never without a device, before onboarding is finished, or for an inactive account", async () => {
    const list = await due("2026-07-01T10:02:00Z");
    expect(list).toContain("zg");
    expect(list).not.toContain("nodevice");
    expect(list).not.toContain("fresh");
    expect(list).not.toContain("away");
  });

  it("not once already sent today or about the same question, nor when switched on after today's time", async () => {
    const q = "00000000-0000-4000-8000-0000000000aa";
    await db()
      .update(dailyDropReminder)
      .set({ lastRemindedOn: "2026-07-01" })
      .where(eq(dailyDropReminder.userId, ids.zg!));
    expect(await due("2026-07-01T10:02:00Z", q)).not.toContain("zg");
    expect(await due("2026-07-02T10:02:00Z", q)).toContain("zg"); // the next local day
    await db()
      .update(dailyDropReminder)
      .set({ lastNotifiedQuestionId: q })
      .where(eq(dailyDropReminder.userId, ids.zg!));
    expect(await due("2026-07-02T10:02:00Z", q)).not.toContain("zg");
    // Turned on (or the time changed) at 13:00 local for 12:00: starts the next day.
    await db()
      .update(dailyDropReminder)
      .set({
        lastNotifiedQuestionId: null,
        lastRemindedOn: null,
        updatedAt: new Date("2026-07-01T11:00:00Z"),
      })
      .where(eq(dailyDropReminder.userId, ids.zg!));
    expect(await due("2026-07-01T11:05:00Z", q)).not.toContain("zg");
    expect(await due("2026-07-02T10:02:00Z", q)).toContain("zg");
    await db()
      .update(dailyDropReminder)
      .set({ updatedAt: OLD })
      .where(eq(dailyDropReminder.userId, ids.zg!));
  });

  it("runs end to end once: the newest published question, in the member's language, claimed before sending", async () => {
    const [q] = await db()
      .insert(dailyDropQuestion)
      .values({ status: "published", publishDate: QDATE, publishedAt: OLD })
      .returning({ id: dailyDropQuestion.id });
    questionIds.push(q!.id);
    await db()
      .insert(dailyDropTranslation)
      .values([
        {
          questionId: q!.id,
          locale: "hr",
          text: "Koja te pjesma vrati u ljeto?",
          review: "approved",
        },
        { questionId: q!.id, locale: "en", text: "Which song takes you back?", review: "approved" },
      ]);
    sent.length = 0;
    const now = new Date(`${QDATE}T10:05:00Z`); // 12:05 in Zagreb (CEST)
    const first = await runReminders(now);
    expect(first.delivered).toBeGreaterThanOrEqual(1);
    expect(sentTo("zg")).toHaveLength(1);
    expect(sentTo("zg")[0]!.payload).toEqual({
      title: "Daily Drop je stigao",
      body: "Koja te pjesma vrati u ljeto?",
      url: `/drop/${QDATE}`,
      tag: "daily-drop",
    });
    expect(sentTo("nodevice")).toHaveLength(0);
    // A second tick (or a second worker) in the same window sends nothing more.
    await runReminders(new Date(`${QDATE}T10:10:00Z`));
    expect(sentTo("zg")).toHaveLength(1);
    // Nor the next day while no newer question is out (never the same question twice).
    await runReminders(new Date(`1995-06-${String(Number(DAY) + 1)}T10:05:00Z`));
    expect(sentTo("zg")).toHaveLength(1);
  });

  it("a paused device gets nothing; the reminder may still come later inside the window", async () => {
    await db()
      .update(dailyDropReminder)
      .set({ lastRemindedOn: null, lastNotifiedQuestionId: null })
      .where(eq(dailyDropReminder.userId, ids.zg!));
    await setDevicePause(ids.zg!, sessions.zg!, new Date(`${QDATE}T10:30:00Z`));
    sent.length = 0;
    await runReminders(new Date(`${QDATE}T10:05:00Z`));
    expect(sentTo("zg")).toHaveLength(0);
    await runReminders(new Date(`${QDATE}T10:35:00Z`));
    expect(sentTo("zg")).toHaveLength(1);
    await setDevicePause(ids.zg!, sessions.zg!, null);
  });
});

describe("devices", () => {
  it("bind to the session: signing out removes the subscription", async () => {
    expect((await deviceFor(ids.la!, sessions.la!)).on).toBe(true);
    await db().delete(session).where(eq(session.id, sessions.la!));
    const left = await db()
      .select()
      .from(pushSubscription)
      .where(eq(pushSubscription.userId, ids.la!));
    expect(left).toHaveLength(0);
  });

  it("store the keys encrypted and a device name, never the user agent", async () => {
    const [row] = await db()
      .select()
      .from(pushSubscription)
      .where(eq(pushSubscription.userId, ids.tokyo!));
    expect(row!.keys).not.toContain(KEYS.auth);
    expect(openKeys(row!.keys)).toEqual(KEYS);
    expect(row!.deviceLabel).toBe("Chrome · Android");
  });

  it("move to whoever turns them on: the same browser endpoint is one subscription", async () => {
    await saveSubscription({
      userId: ids.kolkata!,
      sessionId: sessions.kolkata!,
      endpoint: endpointOf("tokyo"),
      keys: KEYS,
    });
    const rows = await db()
      .select({ userId: pushSubscription.userId })
      .from(pushSubscription)
      .where(eq(pushSubscription.endpoint, endpointOf("tokyo")));
    expect(rows).toEqual([{ userId: ids.kolkata }]);
    // One subscription per session: the member's own earlier one for this session went.
    const own = await db()
      .select({ endpoint: pushSubscription.endpoint })
      .from(pushSubscription)
      .where(eq(pushSubscription.sessionId, sessions.kolkata!));
    expect(own).toEqual([{ endpoint: endpointOf("tokyo") }]);
  });

  it("never move to someone who only knows the address (other keys)", async () => {
    const taken = await saveSubscription({
      userId: ids.author!,
      sessionId: sessions.author!,
      endpoint: endpointOf("tokyo"),
      keys: { ...KEYS, auth: "AAAAAAAAAAAAAAAAAAAAAA" },
    });
    expect(taken).toBe(false);
    const [row] = await db()
      .select({ userId: pushSubscription.userId })
      .from(pushSubscription)
      .where(eq(pushSubscription.endpoint, endpointOf("tokyo")));
    expect(row?.userId).toBe(ids.kolkata);
  });

  it("pause and resume only this device; turning off removes it", async () => {
    const until = new Date(Date.now() + 3_600_000);
    expect(await setDevicePause(ids.dst!, sessions.dst!, until)).toBe(true);
    expect((await deviceFor(ids.dst!, sessions.dst!)).pausedUntil?.getTime()).toBe(until.getTime());
    expect(await setDevicePause(ids.dst!, sessions.dst!, null)).toBe(true);
    await removeSubscription(ids.dst!, sessions.dst!);
    expect((await deviceFor(ids.dst!, sessions.dst!)).on).toBe(false);
    expect(await setDevicePause(ids.dst!, sessions.dst!, until)).toBe(false);
  });

  it("are dropped when the push service says gone, or after repeated failures", async () => {
    await member("gone1");
    await member("flaky");
    sent.length = 0;
    outcome = (e) => (e === endpointOf("gone1") ? "gone" : "failed");
    await pushSocial({ recipientId: ids.gone1!, actorId: ids.actor!, kind: "comment" });
    expect((await deviceFor(ids.gone1!, sessions.gone1!)).on).toBe(false);
    for (let i = 0; i < 4; i++)
      await pushSocial({ recipientId: ids.flaky!, actorId: ids.actor!, kind: "comment" });
    expect((await deviceFor(ids.flaky!, sessions.flaky!)).on).toBe(true);
    await pushSocial({ recipientId: ids.flaky!, actorId: ids.actor!, kind: "comment" });
    expect((await deviceFor(ids.flaky!, sessions.flaky!)).on).toBe(false);
    outcome = () => "sent";
  });
});

describe("social pushes", () => {
  it("follow the D-072 defaults and the member's switches", async () => {
    expect((await pushChoices(ids.author!)).types).toEqual({
      comment: true,
      reaction: false,
      follow: true,
    });
    sent.length = 0;
    expect(
      await pushSocial({ recipientId: ids.author!, actorId: ids.actor!, kind: "comment" }),
    ).toBe(1);
    expect(
      await pushSocial({ recipientId: ids.author!, actorId: ids.actor!, kind: "reaction" }),
    ).toBe(0);
    await setPushType(ids.author!, "reaction", true);
    await setPushType(ids.author!, "comment", false);
    expect(
      await pushSocial({ recipientId: ids.author!, actorId: ids.actor!, kind: "reaction" }),
    ).toBe(1);
    expect(
      await pushSocial({ recipientId: ids.author!, actorId: ids.actor!, kind: "comment" }),
    ).toBe(0);
    await setPushType(ids.author!, "comment", true);
  });

  it("never from a muted member, never while paused, nothing while the flag is off", async () => {
    await db().insert(mute).values({ muterId: ids.author!, mutedId: ids.actor! });
    expect(
      await pushSocial({ recipientId: ids.author!, actorId: ids.actor!, kind: "comment" }),
    ).toBe(0);
    await db()
      .delete(mute)
      .where(and(eq(mute.muterId, ids.author!), eq(mute.mutedId, ids.actor!)));
    await setDevicePause(ids.author!, sessions.author!, new Date(Date.now() + 3_600_000));
    expect(
      await pushSocial({ recipientId: ids.author!, actorId: ids.actor!, kind: "comment" }),
    ).toBe(0);
    await setDevicePause(ids.author!, sessions.author!, null);
    await db().update(featureFlag).set({ state: "off" }).where(eq(featureFlag.key, "push"));
    expect(
      await pushSocial({ recipientId: ids.author!, actorId: ids.actor!, kind: "comment" }),
    ).toBe(0);
    await db().update(featureFlag).set({ state: "on" }).where(eq(featureFlag.key, "push"));
  });

  it("go out for a new Activity entry only, not for a re-opened group", async () => {
    sent.length = 0;
    await setPushType(ids.author!, "reaction", true);
    const target = "00000000-0000-4000-8000-0000000000bb";
    await notify({
      recipientId: ids.author!,
      actorId: ids.actor!,
      type: "reaction",
      targetId: target,
    });
    await vi.waitFor(() => expect(sentTo("author")).toHaveLength(1));
    // The same answer within the hour re-opens the entry: no second push.
    await notify({
      recipientId: ids.author!,
      actorId: ids.actor!,
      type: "reaction",
      targetId: target,
    });
    await new Promise((r) => setTimeout(r, 300));
    expect(sentTo("author")).toHaveLength(1);
  });

  it("a follow request to a private profile is a push under the followers switch", async () => {
    sent.length = 0;
    const r = await followMember(await loadViewer({ id: ids.actor!, role: "member" }), ids.priv!);
    expect(r).toMatchObject({ ok: true, state: "pending" });
    await vi.waitFor(() => expect(sentTo("priv")).toHaveLength(1));
    expect(sentTo("priv")[0]!.payload.body).toBe("Netko te želi pratiti");
    // Cancel and ask again: no second push the same day (review 5.12 M1); the request itself is there.
    await unfollowMember(ids.actor!, ids.priv!);
    const again = await followMember(
      await loadViewer({ id: ids.actor!, role: "member" }),
      ids.priv!,
    );
    expect(again).toMatchObject({ ok: true, state: "pending" });
    await new Promise((r) => setTimeout(r, 300));
    expect(sentTo("priv")).toHaveLength(1);
  });

  it("never carry a name, a username or any member text", async () => {
    const all = JSON.stringify(sent.map((s) => s.payload));
    for (const k of Object.keys(ids)) {
      expect(all).not.toContain(`Push ${k}`);
      expect(all).not.toContain(`p${k}_${RUN}`);
    }
    for (const s of sent)
      expect(s.payload.url).toMatch(/^\/(en\/)?(activity|drop\/\d{4}-\d{2}-\d{2})$/);
  });
});

describe("choices", () => {
  it("the reminder takes the member's own time zone and a time from the list", async () => {
    await setReminder(ids.author!, { enabled: true, localTime: "20:00" });
    expect((await pushChoices(ids.author!)).reminder).toEqual({
      enabled: true,
      localTime: "20:00",
      timeZone: "Europe/Zagreb",
    });
    const prefs = await db()
      .select()
      .from(notificationPreference)
      .where(eq(notificationPreference.userId, ids.author!));
    expect(prefs.every((p) => p.channel === "push")).toBe(true);
  });
});
