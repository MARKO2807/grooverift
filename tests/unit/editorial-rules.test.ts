// Step 5.6: the pure editorial rules (UTC dates, the JO4 window, the corrections limit).
import { describe, expect, it } from "vitest";
import {
  addDays,
  correctionAllowed,
  datesWithinGap,
  editDistance,
  goLiveAt,
  isIsoDate,
  utcDate,
} from "@/lib/editorial/rules";

describe("UTC dates (J6 E5, E6)", () => {
  it("accepts only real calendar dates", () => {
    expect(isIsoDate("2026-11-05")).toBe(true);
    expect(isIsoDate("2028-02-29")).toBe(true);
    expect(isIsoDate("2026-02-29")).toBe(false);
    expect(isIsoDate("2026-13-01")).toBe(false);
    expect(isIsoDate("5.11.2026.")).toBe(false);
    expect(isIsoDate(null)).toBe(false);
  });

  it("counts days in UTC across month, year and daylight-saving changes", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-28", 2)).toBe("2026-03-30"); // EU clocks move on 29 March
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    // 23:30 in Zagreb on 4 November is still 4 November in UTC… and 00:30 is 4 November 23:30 UTC
    expect(utcDate(new Date("2026-11-05T00:30:00+01:00"))).toBe("2026-11-04");
    expect(goLiveAt("2026-11-05").toISOString()).toBe("2026-11-05T00:00:00.000Z");
  });
});

describe("JO4 gap window (72 hours)", () => {
  it("from noon UTC, the next three midnights", () => {
    expect(datesWithinGap(new Date("2026-11-05T12:00:00Z"))).toEqual([
      "2026-11-06",
      "2026-11-07",
      "2026-11-08",
    ]);
  });

  it("exactly at midnight, the midnight 72 hours later still counts; today never does", () => {
    expect(datesWithinGap(new Date("2026-11-05T00:00:00Z"))).toEqual([
      "2026-11-06",
      "2026-11-07",
      "2026-11-08",
    ]);
    // one second before midnight: the midnight 72 h + 1 s away is outside
    expect(datesWithinGap(new Date("2026-11-04T23:59:59Z"))).toEqual([
      "2026-11-05",
      "2026-11-06",
      "2026-11-07",
    ]);
  });
});

describe("corrections after publishing (J6)", () => {
  it("measures edits by code point", () => {
    expect(editDistance("pitanje", "pitanje")).toBe(0);
    expect(editDistance("Koja pjesma?", "Koja pjesma!")).toBe(1);
    expect(editDistance("čćš", "ccs")).toBe(3);
    expect(editDistance("", "abc")).toBe(3);
  });

  it("allows a typo fix and refuses a change of meaning", () => {
    const q = "Koja ti je pjesma otvorila neki novi žanr?";
    expect(correctionAllowed(q, "Koja ti je pjesma otvorila neki novi žanr ?")).toBe(true);
    expect(correctionAllowed(q, "Koja ti je pjesma otvorila neki nov žanr?")).toBe(true);
    expect(correctionAllowed(q, "Koji ti je album zatvorio neki stari žanr?")).toBe(false);
    expect(correctionAllowed(q, "Koju pjesmu nikad ne bi preslušao/la?")).toBe(false);
  });
});
