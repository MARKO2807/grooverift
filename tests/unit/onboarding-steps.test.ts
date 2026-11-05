// Step 5.4: the pure step order (J1): numbering that never jumps, conditional steps, Back that keeps to its side
// of the account boundary, and the resume rule (a step ahead of the pointer is not reachable).
import { describe, expect, it } from "vitest";
import {
  nextPath,
  nextStep,
  prevStep,
  progress,
  reachable,
  shown,
  STEPS,
} from "@/lib/onboarding/steps";
import { isReservedUsername } from "@/lib/onboarding/username";

const all = { hasPicks: true, reminder: true };
const none = { hasPicks: false, reminder: false };

describe("onboarding steps", () => {
  it("counts every step whether or not it is shown; the reminder step only while push exists", () => {
    expect(progress("age", { reminder: true })).toEqual({ n: 1, total: 10 });
    expect(progress("reminder", { reminder: true })).toEqual({ n: 10, total: 10 });
    expect(progress("how", { reminder: false })).toEqual({ n: 9, total: 9 });
    expect(progress("dnaAudience", { reminder: false }).n).toBe(8); // counted even when skipped (D-034)
  });

  it("shows the DNA audience only after a pick and the reminder only with the push flag", () => {
    expect(shown("dnaAudience", none)).toBe(false);
    expect(shown("dnaAudience", { ...none, hasPicks: true })).toBe(true);
    expect(shown("reminder", none)).toBe(false);
    expect(shown("reminder", all)).toBe(true);
    for (const s of STEPS)
      if (s !== "dnaAudience" && s !== "reminder") expect(shown(s, none)).toBe(true);
  });

  it("walks forward over the steps that are shown and ends at Done", () => {
    expect(nextStep("dna", none)).toBe("how");
    expect(nextStep("dna", all)).toBe("dnaAudience");
    expect(nextStep("how", none)).toBeNull();
    expect(nextStep("how", all)).toBe("reminder");
    expect(nextPath("how", none)).toBe("/join/done");
    expect(nextPath("account", none)).toBe("/join/username");
  });

  it("never goes back across the account boundary", () => {
    expect(prevStep("username", all)).toBeNull();
    expect(prevStep("account", all)).toBe("language");
    expect(prevStep("age", all)).toBeNull();
    expect(prevStep("how", none)).toBe("dna"); // the audience step is skipped both ways
    expect(prevStep("how", all)).toBe("dnaAudience");
  });

  it("lets a member revisit earlier steps but not run ahead of the pointer (J1 E8)", () => {
    expect(reachable("username", "visibility", none)).toBe(true);
    expect(reachable("visibility", "visibility", none)).toBe(true);
    expect(reachable("dna", "visibility", none)).toBe(false);
    expect(reachable("dnaAudience", "how", none)).toBe(false); // not shown without picks
    expect(reachable("dnaAudience", "how", all)).toBe(true);
  });
});

describe("reserved usernames", () => {
  it("refuses staff, brand and system names, and allows ordinary ones", () => {
    for (const r of ["admin", "grooverift", "grooverift_hr", "support", "dailydrop", "admin_ana"])
      expect(isReservedUsername(r)).toBe(true);
    for (const ok of ["ana", "luka_bas", "mia2026", "riftfan"])
      expect(isReservedUsername(ok)).toBe(false);
  });
});
