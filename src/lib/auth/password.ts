import { hash as argonHash, verify as argonVerify } from "@node-rs/argon2";
import { z } from "zod";

// ---- Hashing (R-14): Argon2id with the OWASP 2024 minimum (m=19 MiB, t=2, p=1) ----
const ARGON2 = {
  algorithm: 2, // Algorithm.Argon2id (a const enum; the literal avoids the isolatedModules limit)
  memoryCost: 19 * 1024, // KiB
  timeCost: 2,
  parallelism: 1,
  outputLen: 32,
} as const;

export async function hashPassword(password: string): Promise<string> {
  return argonHash(password, ARGON2);
}

export async function verifyPassword(data: { hash: string; password: string }): Promise<boolean> {
  try {
    return await argonVerify(data.hash, data.password);
  } catch {
    return false;
  }
}

// ---- Policy (D-061): 12 to 128 characters, an upper-case letter, a lower-case letter and a special character ----
export const PASSWORD_MIN = 12;
export const PASSWORD_MAX = 128;

export type PasswordRule = "len" | "up" | "low" | "sym";

/** Rules the password does not yet satisfy, in display order (empty when the password passes). */
export function passwordMissing(password: string): PasswordRule[] {
  const missing: PasswordRule[] = [];
  if ([...password].length < PASSWORD_MIN) missing.push("len");
  if (!/\p{Lu}/u.test(password)) missing.push("up");
  if (!/\p{Ll}/u.test(password)) missing.push("low");
  if (!/[^\p{L}\p{N}\s]/u.test(password)) missing.push("sym");
  return missing;
}

export const passwordSchema = z
  .string()
  .max(PASSWORD_MAX)
  .refine((p) => passwordMissing(p).length === 0, { message: "PASSWORD_POLICY" });
