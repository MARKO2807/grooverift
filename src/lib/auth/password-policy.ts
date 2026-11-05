import { z } from "zod";

// ---- Policy (D-061): 12 to 128 characters, an upper-case letter, a lower-case letter and a special character ----
// Isomorphic: the sign-up form reads it in the browser for the one-line meter (D-062); the server re-checks.
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
