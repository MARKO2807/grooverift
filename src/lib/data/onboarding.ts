// Onboarding state and writes (ONB-02 to ONB-09, J1; step 5.4). Everything here is the member's own data, keyed
// by the session's user id. Until `profile.onboarded_at` is set the member is hidden from everyone else and cannot
// write (policy fact `onboarded`, D-095 (3)); `profile.onboarding_step` names the next step to show, so a member
// who closes the browser resumes where they left off (J1 E8). Nothing is stored before the account exists.
import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  dailyDropReminder,
  memberSettings,
  musicDnaEntry,
  privacySettings,
  profile,
  user,
  usernameReservation,
} from "@/lib/db/schema";
import type { DnaAudience } from "@/lib/music/limits";
import { isUniqueViolation } from "./db-errors";
import { normalizeUsername, usernameAvailable } from "./profiles";

/** The steps after the account exists, in order. `onboarding_step` holds one of these (null = finished). */
export const PROFILE_STEPS = [
  "username",
  "reading",
  "visibility",
  "dna",
  "dnaAudience",
  "how",
  "reminder",
] as const;
export type ProfileStep = (typeof PROFILE_STEPS)[number];
const isProfileStep = (s: unknown): s is ProfileStep => PROFILE_STEPS.includes(s as ProfileStep);

export type OnboardingState = {
  onboarded: boolean;
  /** The step to show next; "username" until the profile row exists. */
  step: ProfileStep;
  hasProfile: boolean;
  /** True when the member picked at least one genre (decides whether ONB-06 is shown, D-034). */
  hasPicks: boolean;
  username: string | null;
  displayName: string | null;
  readingLanguages: string[];
  visibility: "public" | "private" | null;
  dnaAudience: DnaAudience | "mutuals";
  reminder: { enabled: boolean; localTime: string; timeZone: string } | null;
  locale: string;
};

export async function onboardingState(userId: string): Promise<OnboardingState> {
  const [row] = await db()
    .select({
      locale: user.locale,
      username: profile.username,
      displayName: profile.displayName,
      onboardedAt: profile.onboardedAt,
      step: profile.onboardingStep,
      readingLanguages: profile.readingLanguages,
      visibility: profile.visibility,
      dnaAudience: privacySettings.musicDna,
      remEnabled: dailyDropReminder.enabled,
      remTime: dailyDropReminder.localTime,
      remZone: dailyDropReminder.timeZone,
      picks: sql<number>`(select count(*) from ${musicDnaEntry} where ${musicDnaEntry.userId} = ${user.id} and ${musicDnaEntry.kind} = 'genre')`,
    })
    .from(user)
    .leftJoin(profile, eq(profile.userId, user.id))
    .leftJoin(privacySettings, eq(privacySettings.userId, user.id))
    .leftJoin(dailyDropReminder, eq(dailyDropReminder.userId, user.id))
    .where(eq(user.id, userId));
  const hasProfile = !!row?.username;
  return {
    onboarded: !!row?.onboardedAt,
    step: hasProfile && isProfileStep(row?.step) ? row!.step : "username",
    hasProfile,
    hasPicks: Number(row?.picks ?? 0) > 0,
    username: row?.username ?? null,
    displayName: row?.displayName ?? null,
    readingLanguages: row?.readingLanguages ?? [],
    visibility: row?.visibility ?? null,
    dnaAudience: row?.dnaAudience ?? "me",
    reminder:
      row?.remEnabled === null || row?.remEnabled === undefined
        ? null
        : { enabled: row.remEnabled, localTime: row.remTime!, timeZone: row.remZone! },
    locale: row?.locale ?? "hr",
  };
}

export const USERNAME_SHAPE = /^[a-z0-9_]{3,30}$/; // profile_username_shape in the database
export const DISPLAY_NAME_MAX = 40;
export const DISPLAY_NAME_WORDS = 3; // D-085 (3): at most three words, written as typed

export type CreateProfileResult = { ok: true } | { ok: false; reason: "taken" | "invalid" };

/**
 * ONB-02: creates the profile with the username and display name, the privacy row (Music DNA "only me" until the
 * member chooses, D-034) and the member settings; the account's `name` becomes the display name. Creating twice
 * for the same member is a no-op (the second tab lands on the next step). A taken or reserved username answers
 * "taken" (J1 E6: taken and reserved are not distinguished).
 */
export async function createOnboardingProfile(
  userId: string,
  input: { username: string; displayName: string; locale: string },
): Promise<CreateProfileResult> {
  const username = normalizeUsername(input.username);
  const displayName = input.displayName.trim().replace(/\s+/g, " ");
  if (!USERNAME_SHAPE.test(username) || !validDisplayName(displayName))
    return { ok: false, reason: "invalid" };
  if (!(await usernameAvailable(username, userId))) return { ok: false, reason: "taken" };
  try {
    await db().transaction(async (tx) => {
      const inserted = await tx
        .insert(profile)
        .values({
          userId,
          username,
          displayName,
          interfaceLocale: input.locale,
          onboardingStep: "reading",
        })
        .onConflictDoNothing({ target: profile.userId })
        .returning({ userId: profile.userId });
      if (!inserted.length) return; // already created (two tabs): keep what the first tab wrote
      await tx.insert(privacySettings).values({ userId, musicDna: "me" }).onConflictDoNothing();
      await tx.insert(memberSettings).values({ userId }).onConflictDoNothing();
      await tx
        .update(user)
        .set({ name: displayName, updatedAt: new Date() })
        .where(eq(user.id, userId));
    });
  } catch (e) {
    if (isUniqueViolation(e)) return { ok: false, reason: "taken" };
    throw e;
  }
  return { ok: true };
}

export function validDisplayName(name: string): boolean {
  const trimmed = name.trim();
  if (!trimmed || trimmed.length > DISPLAY_NAME_MAX) return false;
  if (/[\p{C}]/u.test(trimmed)) return false; // control characters
  return trimmed.split(/\s+/).length <= DISPLAY_NAME_WORDS;
}

/** Up to three free usernames near `base` (J1 E6), checked against profiles and reservations in one query each. */
export async function usernameSuggestions(base: string, forUserId?: string): Promise<string[]> {
  const stem =
    normalizeUsername(base)
      .replace(/[^a-z0-9_]/g, "")
      .slice(0, 24) || "rift";
  const year = new Date().getUTCFullYear();
  const candidates = [
    `${stem}_${year % 100}`,
    `${stem}${Math.floor(10 + Math.random() * 90)}`,
    `${stem}_rift`,
    `${stem}${Math.floor(100 + Math.random() * 900)}`,
    `${stem}_${Math.floor(10 + Math.random() * 90)}`,
  ].filter((c) => USERNAME_SHAPE.test(c));
  const unique = [...new Set(candidates)];
  const [taken, reserved] = await Promise.all([
    db()
      .select({ u: sql<string>`lower(${profile.username})` })
      .from(profile)
      .where(sql`lower(${profile.username}) in ${unique}`),
    db()
      .select({ u: usernameReservation.username, userId: usernameReservation.userId })
      .from(usernameReservation)
      .where(
        and(
          inArray(usernameReservation.username, unique),
          sql`${usernameReservation.reservedUntil} > now()`,
        ),
      ),
  ]);
  const blocked = new Set([
    ...taken.map((t) => t.u),
    ...reserved.filter((r) => r.userId !== forUserId).map((r) => r.u),
  ]);
  return unique.filter((c) => !blocked.has(c)).slice(0, 3);
}

async function requireProfile(userId: string) {
  const [row] = await db()
    .select({ userId: profile.userId, onboardedAt: profile.onboardedAt })
    .from(profile)
    .where(eq(profile.userId, userId));
  return row ?? null;
}

/** Moves the pointer to the next step. Never moves it back and never past the finish. */
export async function saveOnboardingStep(userId: string, next: ProfileStep): Promise<void> {
  await db()
    .update(profile)
    .set({ onboardingStep: next, updatedAt: new Date() })
    .where(and(eq(profile.userId, userId), sql`${profile.onboardedAt} is null`));
}

export const READING_LANGUAGES = ["hr", "en"] as const;

/** ONB-03: the optional reading languages. The interface language lives on `user.locale` (set at sign-up). */
export async function saveReadingLanguages(userId: string, languages: string[]): Promise<boolean> {
  if (!(await requireProfile(userId))) return false;
  const clean = READING_LANGUAGES.filter((l) => languages.includes(l));
  await db()
    .update(profile)
    .set({ readingLanguages: clean, updatedAt: new Date() })
    .where(eq(profile.userId, userId));
  return true;
}

/** ONB-04 (D-025, D-030, D-034): the active choice. Discoverable follows the choice until the member changes it. */
export async function saveProfileVisibility(
  userId: string,
  visibility: "public" | "private",
): Promise<boolean> {
  if (!(await requireProfile(userId))) return false;
  await db()
    .update(profile)
    .set({ visibility, discoverable: visibility === "public", updatedAt: new Date() })
    .where(eq(profile.userId, userId));
  return true;
}

export async function saveDnaAudience(userId: string, audience: DnaAudience): Promise<void> {
  await db()
    .insert(privacySettings)
    .values({ userId, musicDna: audience })
    .onConflictDoUpdate({
      target: privacySettings.userId,
      set: { musicDna: audience, updatedAt: new Date() },
    });
}

export const REMINDER_TIMES = [
  "07:00",
  "08:00",
  "09:00",
  "12:00",
  "17:00",
  "20:00",
  "22:00",
] as const;
export const REMINDER_DEFAULT_TIME = "12:00"; // D-086 (3)

/** ONB-08: the reminder preference (the push subscription itself is step 5.12). Zones are IANA names only. */
export async function saveReminder(
  userId: string,
  input: { enabled: boolean; localTime: string; timeZone: string },
): Promise<void> {
  await db()
    .insert(dailyDropReminder)
    .values({
      userId,
      enabled: input.enabled,
      localTime: input.localTime,
      timeZone: input.timeZone,
    })
    .onConflictDoUpdate({
      target: dailyDropReminder.userId,
      set: {
        enabled: input.enabled,
        localTime: input.localTime,
        timeZone: input.timeZone,
        updatedAt: new Date(),
      },
    });
}

/** ONB-09: the required steps are done; the member becomes visible per their choices. Idempotent. */
export async function finishOnboarding(userId: string): Promise<boolean> {
  const rows = await db()
    .update(profile)
    .set({ onboardedAt: new Date(), onboardingStep: null, updatedAt: new Date() })
    .where(
      and(
        eq(profile.userId, userId),
        sql`${profile.onboardedAt} is null`,
        sql`${profile.visibility} is not null`,
      ),
    )
    .returning({ userId: profile.userId });
  if (rows.length) return true;
  const row = await requireProfile(userId);
  return !!row?.onboardedAt;
}
