import { hash as argonHash, verify as argonVerify } from "@node-rs/argon2";

// Server only (native binary). The policy lives in password-policy.ts so the browser can read it.
export * from "./password-policy";

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
