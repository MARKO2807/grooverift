import { describe, expect, it } from "vitest";
import {
  RECOVERY_ALPHABET,
  generateRecoveryCodes,
  normalizeRecoveryCode,
} from "@/lib/auth/recovery-codes";

describe("recovery codes", () => {
  it("generates ten distinct lower-case codes without look-alike characters", () => {
    const codes = generateRecoveryCodes();
    expect(codes).toHaveLength(10);
    expect(new Set(codes).size).toBe(10);
    for (const c of codes) {
      expect(c).toMatch(/^[a-z0-9]{5}-[a-z0-9]{5}$/);
      for (const ch of c.replace("-", "")) expect(RECOVERY_ALPHABET).toContain(ch);
    }
    expect(RECOVERY_ALPHABET).not.toMatch(/[01lio]/);
  });

  it("accepts the code as typed: spaces, hyphens and capitals (WCAG 3.3.8)", () => {
    expect(normalizeRecoveryCode("abcde-fghjk")).toBe("abcde-fghjk");
    expect(normalizeRecoveryCode("ABCDE FGHJK")).toBe("abcde-fghjk");
    expect(normalizeRecoveryCode(" abcdefghjk ")).toBe("abcde-fghjk");
    expect(normalizeRecoveryCode("abc")).toBe("abc");
  });
});
