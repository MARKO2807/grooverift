// Step 5.12: the pure push rules (local time in IANA zones across daylight saving, the pause, payloads without
// member content), the encryption of the subscription keys, and the push-service allowlist.
import { describe, expect, it } from "vitest";
import { openKeys, sealKeys } from "@/lib/push/crypto";
import {
  localParts,
  nextDate,
  pauseEnd,
  PUSH_DEFAULTS,
  PUSH_TYPE_OF,
  QUESTION_MAX,
  reminderPayload,
  socialPayload,
  zonedInstant,
} from "@/lib/push/rules";
import { allowedEndpoint } from "@/lib/push/send";

describe("local time in IANA zones", () => {
  it("reads the wall clock in a zone", () => {
    const at = new Date("2026-07-01T10:00:00Z");
    expect(localParts(at, "Europe/Zagreb")).toEqual({ date: "2026-07-01", time: "12:00" });
    expect(localParts(at, "America/Los_Angeles")).toEqual({ date: "2026-07-01", time: "03:00" });
    expect(localParts(at, "Asia/Tokyo")).toEqual({ date: "2026-07-01", time: "19:00" });
    expect(localParts(at, "Asia/Kolkata")).toEqual({ date: "2026-07-01", time: "15:30" });
  });

  it("turns a local date and time into the instant, summer and winter alike", () => {
    expect(zonedInstant("2026-07-01", "12:00", "Europe/Zagreb").toISOString()).toBe(
      "2026-07-01T10:00:00.000Z",
    );
    expect(zonedInstant("2026-01-15", "12:00", "Europe/Zagreb").toISOString()).toBe(
      "2026-01-15T11:00:00.000Z",
    );
    expect(zonedInstant("2026-07-01", "08:00", "America/New_York").toISOString()).toBe(
      "2026-07-01T12:00:00.000Z",
    );
    expect(zonedInstant("2026-07-01", "08:00", "Asia/Kathmandu").toISOString()).toBe(
      "2026-07-01T02:15:00.000Z",
    );
  });

  it("handles the days the clocks change", () => {
    // Europe/Zagreb: 2026-03-29 02:00 → 03:00 (no 02:30), 2026-10-25 03:00 → 02:00 (02:30 twice).
    expect(zonedInstant("2026-03-29", "08:00", "Europe/Zagreb").toISOString()).toBe(
      "2026-03-29T06:00:00.000Z",
    );
    expect(zonedInstant("2026-03-28", "08:00", "Europe/Zagreb").toISOString()).toBe(
      "2026-03-28T07:00:00.000Z",
    );
    expect(zonedInstant("2026-10-25", "08:00", "Europe/Zagreb").toISOString()).toBe(
      "2026-10-25T07:00:00.000Z",
    );
    // A skipped time lands just after the gap; a repeated one on its first pass.
    const skipped = zonedInstant("2026-03-29", "02:30", "Europe/Zagreb");
    expect(localParts(skipped, "Europe/Zagreb").date).toBe("2026-03-29");
    expect(skipped.toISOString()).toBe("2026-03-29T01:30:00.000Z");
    expect(zonedInstant("2026-10-25", "02:30", "Europe/Zagreb").toISOString()).toBe(
      "2026-10-25T00:30:00.000Z",
    );
  });

  it("counts calendar days", () => {
    expect(nextDate("2026-12-31")).toBe("2027-01-01");
    expect(nextDate("2028-02-28")).toBe("2028-02-29");
  });
});

describe("the pause (D-072 (2))", () => {
  const now = new Date("2026-07-01T16:40:00Z"); // 18:40 in Zagreb, as in the sketch
  it("pauses for one or three hours", () => {
    expect(pauseEnd("1h", now, "Europe/Zagreb").toISOString()).toBe("2026-07-01T17:40:00.000Z");
    expect(pauseEnd("3h", now, "Europe/Zagreb").toISOString()).toBe("2026-07-01T19:40:00.000Z");
  });
  it("pauses until the next 08:00 on the member's clock", () => {
    expect(pauseEnd("morning", now, "Europe/Zagreb").toISOString()).toBe(
      "2026-07-02T06:00:00.000Z",
    );
    // At 01:00 local time "until 08:00" is this morning, not a day later.
    const night = new Date("2026-07-01T23:00:00Z");
    expect(pauseEnd("morning", night, "Europe/Zagreb").toISOString()).toBe(
      "2026-07-02T06:00:00.000Z",
    );
    // Across the autumn change the next morning is still 08:00 local (now UTC+1).
    const autumn = new Date("2026-10-24T20:00:00Z");
    expect(pauseEnd("morning", autumn, "Europe/Zagreb").toISOString()).toBe(
      "2026-10-25T07:00:00.000Z",
    );
  });
});

describe("payloads", () => {
  it("the reminder carries the question and its page, nothing about a member", () => {
    const p = reminderPayload("hr", { date: "2026-07-01", text: "Koja te pjesma vrati u ljeto?" });
    expect(p).toEqual({
      title: "Daily Drop je stigao",
      body: "Koja te pjesma vrati u ljeto?",
      url: "/drop/2026-07-01",
      tag: "daily-drop",
    });
    expect(reminderPayload("en", { date: "2026-07-01", text: "Q" }).url).toBe(
      "/en/drop/2026-07-01",
    );
  });

  it("a long question is cut", () => {
    const p = reminderPayload("en", { date: "2026-07-01", text: "x".repeat(400) });
    expect(p.body.length).toBe(QUESTION_MAX);
    expect(p.body.endsWith("…")).toBe(true);
  });

  it("social pushes are fixed sentences that open Activity", () => {
    for (const kind of [
      "comment",
      "reaction",
      "follow",
      "follow_request",
      "follow_accept",
    ] as const) {
      for (const locale of ["hr", "en"] as const) {
        const p = socialPayload(locale, kind);
        expect(p.title).toBe("GrooveRift");
        expect(p.url).toBe(locale === "en" ? "/en/activity" : "/activity");
        expect(p.body).not.toMatch(/@|\{|\}/);
        expect(Object.keys(p).sort()).toEqual(["body", "tag", "title", "url"]);
      }
    }
  });

  it("defaults and type mapping follow D-072 (1)", () => {
    expect(PUSH_DEFAULTS).toEqual({ comment: true, reaction: false, follow: true });
    expect(PUSH_TYPE_OF.follow_request).toBe("follow");
    expect(PUSH_TYPE_OF.follow_accept).toBe("follow");
    expect(PUSH_TYPE_OF.moderation).toBeUndefined();
  });
});

describe("subscription keys at rest", () => {
  const keys = {
    p256dh:
      "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM",
    auth: "tBHItJI5svbpez7KI4CCXg",
  };
  it("round-trips and never stores the keys in clear", () => {
    const sealed = sealKeys(keys);
    expect(sealed.startsWith("v1.")).toBe(true);
    expect(sealed).not.toContain(keys.auth);
    expect(openKeys(sealed)).toEqual(keys);
    expect(sealKeys(keys)).not.toBe(sealed); // a fresh nonce every time
  });
  it("refuses tampered or foreign values", () => {
    const sealed = sealKeys(keys);
    const flipped = sealed.slice(0, -2) + (sealed.endsWith("A") ? "BB" : "AA");
    expect(openKeys(flipped)).toBeNull();
    expect(openKeys("v2.abc")).toBeNull();
    expect(openKeys("garbage")).toBeNull();
  });
});

describe("push service allowlist", () => {
  it("accepts the browsers' push services", () => {
    for (const ok of [
      "https://fcm.googleapis.com/fcm/send/abc:def",
      "https://web.push.apple.com/QK0abc",
      "https://updates.push.services.mozilla.com/wpush/v2/gAAA",
      "https://wns2-db5p.notify.windows.com/w/?token=abc",
    ])
      expect(allowedEndpoint(ok)).toBe(true);
  });
  it("refuses anything else, so the server never posts to an address of the member's choosing", () => {
    for (const bad of [
      "http://fcm.googleapis.com/fcm/send/abc",
      "https://fcm.googleapis.com.evil.test/x",
      "https://evilpush.apple.com.attacker.test/",
      "https://127.0.0.1/push",
      "https://localhost/x",
      "https://fcm.googleapis.com:8443/x",
      "https://user:pw@fcm.googleapis.com/x",
      `https://fcm.googleapis.com/${"a".repeat(1100)}`,
      "javascript:alert(1)",
      42,
      null,
    ])
      expect(allowedEndpoint(bad)).toBe(false);
  });
});
