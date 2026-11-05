// Profile rules shared by the data layer, the server actions and the client forms (step 5.5). Pure: no database
// import, so a client component may use it (src/lib/data pulls in `pg`, which has no browser build).

export const USERNAME_SHAPE = /^[a-z0-9_]{3,30}$/; // profile_username_shape in the database
export const BIO_MAX = 200; // plan §1.2, profile_bio_len
export const DISPLAY_NAME_MAX = 40;
export const DISPLAY_NAME_WORDS = 3; // D-085 (3): at most three words, written as typed
export const USERNAME_CHANGE_DAYS = 30; // D-069 (1)
export const USERNAME_RESERVE_DAYS = 30; // D-069 (1), U-04

export function validDisplayName(name: string): boolean {
  const trimmed = name.trim();
  if (!trimmed || trimmed.length > DISPLAY_NAME_MAX) return false;
  if (/[\p{C}]/u.test(trimmed)) return false; // control characters
  return trimmed.split(/\s+/).length <= DISPLAY_NAME_WORDS;
}

/** The bio keeps line breaks; other control characters are refused; at most BIO_MAX characters. */
export function cleanBio(raw: string): string | null {
  const text = raw.replace(/\r\n?/g, "\n").trim();
  if (text.length > BIO_MAX) return null;
  if (/[^\P{C}\n]/u.test(text)) return null;
  return text;
}

/** When the next username change is allowed (D-069: once every 30 days); null = now. */
export function nextUsernameChange(changedAt: Date | null, now = new Date()): Date | null {
  if (!changedAt) return null;
  const next = new Date(changedAt.getTime() + USERNAME_CHANGE_DAYS * 86_400_000);
  return next > now ? next : null;
}

// SET-05 sections and the audiences offered in the alpha (D-096 (5): mutuals stays in the schema, not offered).
export type PrivacySection = "musicDna" | "lists" | "dropHistory";
export const PRIVACY_SECTIONS: readonly PrivacySection[] = ["musicDna", "lists", "dropHistory"];
export const AUDIENCES = ["everyone", "followers", "me"] as const;
export type Audience = (typeof AUDIENCES)[number];
