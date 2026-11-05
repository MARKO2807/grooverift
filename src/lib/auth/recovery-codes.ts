import { randomInt } from "node:crypto";

// Recovery codes (Master Prompt §3: TOTP with recovery codes). Ten codes of ten characters,
// written "xxxxx-xxxxx", from an alphabet without look-alikes (no 0/o, 1/l/i), lower case only,
// so a code can be read from paper and typed on a phone keyboard without case mistakes.
export const RECOVERY_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";
export const RECOVERY_LENGTH = 10;

export function generateRecoveryCodes(amount = 10): string[] {
  return Array.from({ length: amount }, () => {
    let s = "";
    for (let i = 0; i < RECOVERY_LENGTH; i++)
      s += RECOVERY_ALPHABET[randomInt(RECOVERY_ALPHABET.length)];
    return `${s.slice(0, 5)}-${s.slice(5)}`;
  });
}

/** What the member typed → the stored form: lower case, no spaces, one hyphen after five characters. */
export function normalizeRecoveryCode(input: string): string {
  const raw = input.toLowerCase().replace(/[\s-]/g, "");
  if (raw.length !== RECOVERY_LENGTH) return input.trim();
  return `${raw.slice(0, 5)}-${raw.slice(5)}`;
}
