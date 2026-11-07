// Push rules (step 5.12), pure: the notification types and their defaults (D-072 (1)), the device pause
// (D-072 (2)), the local-time arithmetic for IANA zones, and the payloads. A payload never carries member content:
// no answer or comment text, no names (plan row 5.12; matrix §4). The Daily Drop reminder carries the question,
// which is editorial content, and every tap opens a page that checks access again.

export const PUSH_TYPES = ["comment", "reaction", "follow"] as const;
export type PushType = (typeof PUSH_TYPES)[number];
export const isPushType = (v: unknown): v is PushType =>
  typeof v === "string" && (PUSH_TYPES as readonly string[]).includes(v);

/** D-072 (1): once a member allows notifications, comments and followers are on, reactions off. */
export const PUSH_DEFAULTS: Record<PushType, boolean> = {
  comment: true,
  reaction: false,
  follow: true,
};

/** The Activity notification types that become a push, and under which switch ("follow" covers requests too). */
export const PUSH_TYPE_OF: Record<string, PushType | undefined> = {
  comment: "comment",
  reaction: "reaction",
  follow: "follow",
  follow_request: "follow",
  follow_accept: "follow",
};

// ------------------------------------------------------------------ pause

export const PAUSES = ["1h", "3h", "morning"] as const;
export type Pause = (typeof PAUSES)[number];
export const isPause = (v: unknown): v is Pause =>
  typeof v === "string" && (PAUSES as readonly string[]).includes(v);
/** "Do sutra u 8:00" (D-072 (2)): the next 08:00 on the member's own clock. */
export const MORNING = "08:00";

/** The wall clock in `timeZone` at `instant`: date (YYYY-MM-DD) and time (HH:MM). */
export function localParts(instant: Date, timeZone: string): { date: string; time: string } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(instant);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    time: `${get("hour")}:${get("minute")}`,
  };
}

/** Minutes the zone is ahead of UTC at `instant` (DST included). */
function offsetMinutes(instant: Date, timeZone: string): number {
  const { date, time } = localParts(instant, timeZone);
  const asUtc = Date.parse(`${date}T${time}:00Z`);
  const whole = Math.floor(instant.getTime() / 60_000) * 60_000;
  return Math.round((asUtc - whole) / 60_000);
}

/**
 * The instant at which the wall clock in `timeZone` shows `date` `time`. A time that does not exist (the hour
 * skipped when clocks go forward) resolves to the moment just after the gap; a repeated hour to its first pass.
 */
export function zonedInstant(date: string, time: string, timeZone: string): Date {
  const naive = Date.parse(`${date}T${time}:00Z`);
  let guess = naive - offsetMinutes(new Date(naive), timeZone) * 60_000;
  // Two corrections settle every real zone, including a DST change between the guess and the answer.
  for (let i = 0; i < 2; i++) {
    const next = naive - offsetMinutes(new Date(guess), timeZone) * 60_000;
    if (next === guess) break;
    guess = next;
  }
  const found = localParts(new Date(guess), timeZone);
  // The time does not exist that day (the clocks jumped over it): the same distance after the jump.
  if (found.date !== date || found.time !== time) return new Date(guess + 3_600_000);
  const earlier = guess - 3_600_000;
  const back = localParts(new Date(earlier), timeZone);
  if (back.date === date && back.time === time) return new Date(earlier);
  return new Date(guess);
}

/** The next day after `date` (YYYY-MM-DD), calendar arithmetic only. */
export function nextDate(date: string): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

/** When a pause chosen at `now` ends. */
export function pauseEnd(choice: Pause, now: Date, timeZone: string): Date {
  if (choice === "1h") return new Date(now.getTime() + 3_600_000);
  if (choice === "3h") return new Date(now.getTime() + 3 * 3_600_000);
  const today = localParts(now, timeZone);
  const atToday = zonedInstant(today.date, MORNING, timeZone);
  return atToday > now ? atToday : zonedInstant(nextDate(today.date), MORNING, timeZone);
}

// ------------------------------------------------------------------ the reminder window

/** A reminder is sent from its local time until this many minutes later (a worker restart may delay a tick). */
export const REMINDER_WINDOW_MINUTES = 90;
/** The worker looks every five minutes, so a reminder lands within five minutes of the chosen time. */
export const REMINDER_TICK = "*/5 * * * *";

// ------------------------------------------------------------------ payloads

export type PushLocale = "hr" | "en";
export type PushPayload = { title: string; body: string; url: string; tag: string };

const COPY: Record<PushLocale, Record<"reminder" | PushType | "follow_request", string>> = {
  hr: {
    reminder: "Daily Drop je stigao",
    comment: "Novi komentar na tvoj odgovor",
    reaction: "Nove reakcije na tvoj odgovor",
    follow: "Imaš novog pratitelja",
    follow_request: "Netko te želi pratiti",
  },
  en: {
    reminder: "The Daily Drop is here",
    comment: "A new comment on your answer",
    reaction: "New reactions to your answer",
    follow: "You have a new follower",
    follow_request: "Someone wants to follow you",
  },
};
const ACCEPTED: Record<PushLocale, string> = {
  hr: "Prihvaćen je tvoj zahtjev za praćenje",
  en: "Your follow request was accepted",
};
/** The question in the reminder is cut to keep the payload small and the lock screen calm. */
export const QUESTION_MAX = 160;

const prefix = (locale: PushLocale) => (locale === "en" ? "/en" : "");

function clip(text: string, max: number): string {
  const t = text.replace(/\s+/g, " ").trim();
  return t.length <= max ? t : `${t.slice(0, max - 1).trimEnd()}…`;
}

/** The Daily Drop reminder: the question (editorial) and a link to its page. One per day, so one tag. */
export function reminderPayload(
  locale: PushLocale,
  question: { date: string; text: string },
): PushPayload {
  return {
    title: COPY[locale].reminder,
    body: clip(question.text, QUESTION_MAX),
    url: `${prefix(locale)}/drop/${question.date}`,
    tag: "daily-drop",
  };
}

/**
 * A social push: a fixed sentence per kind, never a name or text (the lock screen may be seen by others, and a
 * name is not ours to show outside the app). The tap opens Activity, which checks every entry again.
 */
export function socialPayload(
  locale: PushLocale,
  kind: "comment" | "reaction" | "follow" | "follow_request" | "follow_accept",
): PushPayload {
  const body = kind === "follow_accept" ? ACCEPTED[locale] : COPY[locale][kind];
  return { title: "GrooveRift", body, url: `${prefix(locale)}/activity`, tag: `activity-${kind}` };
}

/** How long a push service keeps an undelivered message (seconds). A reminder after six hours is stale. */
export const TTL: Record<"reminder" | "social", number> = {
  reminder: 6 * 3600,
  social: 24 * 3600,
};

/** Consecutive failed deliveries after which a subscription is dropped (404 and 410 drop it at once). */
export const MAX_FAILURES = 5;
