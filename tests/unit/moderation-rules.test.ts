// Step 5.9: the pure safety and moderation rules (src/lib/moderation/rules.ts).
import { describe, expect, it } from "vitest";
import {
  APPEAL_DAYS,
  appealUntil,
  conflictOf,
  endsAt,
  memberReportStatus,
  noticePriority,
  parseContentUrl,
  REPORT_CATEGORIES,
  reportPriority,
  routesToNoticeForm,
  RULE_FOR_CATEGORY,
  snapshotPurgeAfter,
  validateDecision,
} from "@/lib/moderation/rules";

const A = "11111111-1111-4111-8111-111111111111";
const C = "22222222-2222-4222-8222-222222222222";
const HOSTS = ["grooverift.com"];

describe("report categories and priority (J5, D-075)", () => {
  it("has the eleven categories, each with a rule", () => {
    expect(REPORT_CATEGORIES).toHaveLength(11);
    for (const c of REPORT_CATEGORIES) expect(RULE_FOR_CATEGORY[c]).toBeTruthy();
  });
  it("puts threats and minors first, impersonation next", () => {
    expect(reportPriority("threat")).toBe(0);
    expect(reportPriority("minor")).toBe(0);
    expect(reportPriority("impersonation")).toBe(1);
    expect(reportPriority("spam")).toBe(2);
    expect(noticePriority("csam")).toBe(0);
    expect(noticePriority("fraud")).toBe(2);
  });
  it("routes copyright to the PUB-11 form", () => {
    expect(routesToNoticeForm("copyright")).toBe(true);
    expect(routesToNoticeForm("hate")).toBe(false);
  });
});

describe("decisions (ADM-10, R-07)", () => {
  const act = (extra: object) =>
    ({
      outcome: "action",
      kind: "warning",
      rule: "respect",
      statement: "Razlog.",
      removeContent: false,
      ...extra,
    }) as const;
  it("needs a rule, a statement and an offered duration", () => {
    expect(validateDecision({ outcome: "none" }, "answer", true)).toBeNull();
    expect(validateDecision(act({}), "answer", true)).toBeNull();
    expect(validateDecision(act({ statement: " " }), "answer", true)).toBe("statement");
    expect(validateDecision(act({ statement: "x".repeat(2001) }), "answer", true)).toBe(
      "statementLong",
    );
    expect(validateDecision(act({ rule: "nope" }), "answer", true)).toBe("rule");
    expect(validateDecision(act({ kind: "restriction", days: 2 }), "answer", true)).toBe("days");
    expect(validateDecision(act({ kind: "restriction", days: 3 }), "answer", true)).toBeNull();
    expect(validateDecision(act({ kind: "suspension", days: 14 }), "profile", true)).toBeNull();
  });
  it("removes only answers and comments", () => {
    expect(validateDecision(act({ kind: "content_removal" }), "profile", true)).toBe(
      "removeTarget",
    );
    expect(validateDecision(act({ removeContent: true }), "comment", true)).toBeNull();
  });
  it("without a member behind the object only a note fits", () => {
    expect(validateDecision(act({}), "notice", false)).toBe("subject");
    expect(validateDecision(act({ kind: "notice" }), "notice", false)).toBeNull();
  });
  it("ends restrictions and suspensions after their days; appeals stay open six months", () => {
    const now = new Date("2026-11-06T10:00:00Z");
    expect(endsAt("restriction", 3, now)?.toISOString()).toBe("2026-11-09T10:00:00.000Z");
    expect(endsAt("ban", undefined, now)).toBeNull();
    expect(APPEAL_DAYS).toBeGreaterThanOrEqual(182); // DSA Art. 20(1): at least six months
    const until = appealUntil(now);
    expect(snapshotPurgeAfter(now, until).getTime()).toBe(until.getTime());
    expect(snapshotPurgeAfter(now, null).getTime()).toBe(now.getTime() + 90 * 86_400_000);
  });
});

describe("conflict of interest (J5 E3)", () => {
  it("never the own case; reporters and blocked staff are involved", () => {
    expect(conflictOf({ staffId: "s", subjectId: "s", reporterIds: [], blockedStaff: false })).toBe(
      "self",
    );
    expect(
      conflictOf({ staffId: "s", subjectId: "x", reporterIds: ["s"], blockedStaff: false }),
    ).toBe("involved");
    expect(
      conflictOf({ staffId: "s", subjectId: "x", reporterIds: [null], blockedStaff: true }),
    ).toBe("involved");
    expect(
      conflictOf({ staffId: "s", subjectId: "x", reporterIds: ["y"], blockedStaff: false }),
    ).toBe(null);
  });
});

describe("what the reporter sees (SAFE-04)", () => {
  it("three states and only whether action was taken", () => {
    expect(memberReportStatus("open")).toEqual({ status: "received", outcome: null });
    expect(memberReportStatus("in_review")).toEqual({ status: "review", outcome: null });
    expect(memberReportStatus("resolved")).toEqual({ status: "done", outcome: "action" });
    expect(memberReportStatus("dismissed")).toEqual({ status: "done", outcome: "none" });
  });
});

describe("notice URLs (PUB-11 → case)", () => {
  it("recognises our answers, comments and profiles on our host only", () => {
    expect(parseContentUrl(`https://grooverift.com/drop/2026-11-01/a/${A}`, HOSTS)).toEqual({
      type: "answer",
      id: A,
    });
    expect(
      parseContentUrl(`https://grooverift.com/en/drop/2026-11-01/a/${A}#c-${C}`, HOSTS),
    ).toEqual({ type: "comment", id: C, answerId: A });
    expect(parseContentUrl("https://grooverift.com/@mia_vinyl", HOSTS)).toEqual({
      type: "profile",
      username: "mia_vinyl",
    });
    expect(parseContentUrl("https://GrooveRift.com/u/Mia_Vinyl/", HOSTS)).toEqual({
      type: "profile",
      username: "mia_vinyl",
    });
    expect(parseContentUrl(`https://evil.example/drop/2026-11-01/a/${A}`, HOSTS)).toBeNull();
    expect(parseContentUrl("https://grooverift.com/settings", HOSTS)).toBeNull();
    expect(parseContentUrl("not a url", HOSTS)).toBeNull();
  });
});

describe("safeReturnTo (review 5.9 M1: no open redirect)", () => {
  it("keeps paths on this site and refuses everything that could leave it", async () => {
    const { safeReturnTo } = await import("@/lib/routing/paths");
    expect(safeReturnTo("/drop/2026-11-01?sort=recent#c-1")).toBe(
      "/drop/2026-11-01?sort=recent#c-1",
    );
    expect(safeReturnTo("/en/@mia")).toBe("/en/@mia");
    for (const bad of [
      "//evil.example",
      "/\t/evil.example",
      "/\n/evil.example",
      String.raw`/\evil.example`,
      String.raw`/\/evil.example`,
      "https://evil.example",
      "/%09/evil.example".replace("%09", "\t"),
      " /home",
      "javascript:alert(1)",
      "",
      undefined,
      42,
    ])
      expect(safeReturnTo(bad)).toBe("/home");
  });
});
