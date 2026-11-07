// Pure rules for the account and data flows (step 5.10; SET-09, SET-12, D-063 (9), D-066, D-070 (7), D-109).
// No database, no clock of its own: callers pass `now`, so the dates are testable.

/** D-063 (9): 30 days to change one's mind (counsel B.3 to confirm). */
export const GRACE_DAYS = 30;
/** Plan §1.2: the data copy is downloadable for 24 hours. */
export const EXPORT_TTL_HOURS = 24;
/** A copy larger than this fails instead of filling the database (alpha accounts are far below it). */
export const EXPORT_MAX_BYTES = 25 * 1024 * 1024; // step 5.11: room for the member's images (20 MB budget)
/** A request still "requested" or "building" after this long is retried by the worker's sweep. */
export const EXPORT_STALE_MINUTES = 5;
/** After this many failed builds the request is marked failed and the member may ask again. */
export const EXPORT_MAX_ATTEMPTS = 3;
/** The password confirmation may also be a recent sign-in (Google-only accounts), as Better Auth's freshAge. */
export const FRESH_SIGN_IN_MINUTES = 15;

export const FEEDBACK_KINDS = ["bug", "idea", "other"] as const;
export type FeedbackKind = (typeof FEEDBACK_KINDS)[number];
export const FEEDBACK_MAX = 2000;
export const FEEDBACK_NOTES_MAX = 2000;
/** The technical details a member may send with feedback, each one untickable (D-078). */
export const FEEDBACK_CONTEXT_KEYS = ["screen", "version", "device", "time"] as const;
export type FeedbackContextKey = (typeof FEEDBACK_CONTEXT_KEYS)[number];
const CONTEXT_VALUE_MAX = 200;

export const isFeedbackKind = (v: unknown): v is FeedbackKind =>
  typeof v === "string" && (FEEDBACK_KINDS as readonly string[]).includes(v);

/** Keeps only the known keys with short string values; anything else the client sends is dropped. */
export function cleanFeedbackContext(input: unknown): Partial<Record<FeedbackContextKey, string>> {
  const out: Partial<Record<FeedbackContextKey, string>> = {};
  if (!input || typeof input !== "object") return out;
  for (const key of FEEDBACK_CONTEXT_KEYS) {
    const v = (input as Record<string, unknown>)[key];
    if (typeof v === "string" && v.trim())
      out[key] = v
        .replace(/[\u0000-\u001f\u007f]/g, " ")
        .trim()
        .slice(0, CONTEXT_VALUE_MAX);
  }
  return out;
}

/** The moment the purge may run for a request made at `requestedAt`. */
export function deletionDate(requestedAt: Date): Date {
  return new Date(requestedAt.getTime() + GRACE_DAYS * 86_400_000);
}

export function exportExpiry(readyAt: Date): Date {
  return new Date(readyAt.getTime() + EXPORT_TTL_HOURS * 3_600_000);
}

/** A sign-in counts as a confirmation while it is younger than FRESH_SIGN_IN_MINUTES. */
export function isFreshSignIn(sessionCreatedAt: Date, now: Date): boolean {
  const age = now.getTime() - sessionCreatedAt.getTime();
  return age >= 0 && age <= FRESH_SIGN_IN_MINUTES * 60_000;
}

/**
 * A short, human device label from a user agent (never the raw string on screen). Shared by the sessions list
 * and the feedback details.
 */
export function deviceLabel(ua: string | null | undefined): string | null {
  if (!ua) return null;
  const os = /Windows/.test(ua)
    ? "Windows"
    : /iPhone|iPad/.test(ua)
      ? "iOS"
      : /Android/.test(ua)
        ? "Android"
        : /Mac OS/.test(ua)
          ? "macOS"
          : /Linux/.test(ua)
            ? "Linux"
            : "";
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /Firefox\//.test(ua)
      ? "Firefox"
      : /Chrome\//.test(ua)
        ? "Chrome"
        : /Safari\//.test(ua)
          ? "Safari"
          : "";
  return [browser, os].filter(Boolean).join(" · ") || null;
}

/** The confirmation word for the delete dialog is not used: D-070 (7) chose the password step (sketch B). */
export type DeleteChoice = "deactivate" | "delete";
export const isDeleteChoice = (v: unknown): v is DeleteChoice =>
  v === "deactivate" || v === "delete";
