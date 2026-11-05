import { describe, expect, it } from "vitest";
import {
  PASSWORD_MIN,
  hashPassword,
  passwordMissing,
  passwordSchema,
  verifyPassword,
} from "@/lib/auth/password";

describe("password policy (D-061)", () => {
  it("requires 12 characters, upper, lower and a special character", () => {
    expect(passwordMissing("")).toEqual(["len", "up", "low", "sym"]);
    expect(passwordMissing("lozinkalozinka")).toEqual(["up", "sym"]);
    expect(passwordMissing("LOZINKA-LOZINKA")).toEqual(["low"]);
    expect(passwordMissing("Lozinka-2024")).toEqual([]);
    expect(passwordMissing("Kratka-1!")).toEqual(["len"]);
  });

  it("counts characters, not bytes (Croatian letters count once)", () => {
    expect(passwordMissing("Čćžšđ-čćžšđČ")).toEqual([]);
    expect(PASSWORD_MIN).toBe(12);
  });

  it("validates through the Zod schema", () => {
    expect(passwordSchema.safeParse("Lozinka-2024").success).toBe(true);
    expect(passwordSchema.safeParse("lozinka").success).toBe(false);
    expect(passwordSchema.safeParse("A!".repeat(70)).success).toBe(false); // 140 > 128
  });
});

describe("Argon2id hashing (R-14)", () => {
  it("produces an argon2id hash that verifies and rejects a wrong password", async () => {
    const hash = await hashPassword("Lozinka-2024");
    expect(hash.startsWith("$argon2id$")).toBe(true);
    expect(hash).toMatch(/m=19456,t=2,p=1/);
    expect(await verifyPassword({ hash, password: "Lozinka-2024" })).toBe(true);
    expect(await verifyPassword({ hash, password: "Lozinka-2025" })).toBe(false);
    expect(await verifyPassword({ hash: "not-a-hash", password: "x" })).toBe(false);
  });
});
