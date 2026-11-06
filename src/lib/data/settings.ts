// Settings that are not profile or privacy (step 5.10): SET-01 summary lines, SET-07 language and region, and
// "Smanji pokrete" (D-049, D-063 (9): moved to Settings under Pristupačnost). Every write is the member's own.
import { eq } from "drizzle-orm";
import { locales, type Locale } from "@/i18n/routing";
import { db } from "@/lib/db/client";
import { dailyDropReminder, memberSettings, privacySettings, profile, user } from "@/lib/db/schema";
import { READING_LANGUAGES } from "./onboarding";

const ZONES = new Set(Intl.supportedValuesOf("timeZone"));
export const isTimeZone = (tz: unknown): tz is string => typeof tz === "string" && ZONES.has(tz);
export const isLocale = (v: unknown): v is Locale =>
  typeof v === "string" && (locales as readonly string[]).includes(v);

export type SettingsSummary = {
  displayName: string;
  username: string;
  visibility: "public" | "private" | null;
  musicDna: "everyone" | "followers" | "mutuals" | "me";
  locale: Locale;
  readingLanguages: string[];
  timeZone: string;
  reduceMotion: boolean;
};

/** What the SET-01 rows say about the member's current choices. */
export async function settingsSummary(userId: string): Promise<SettingsSummary | null> {
  const [row] = await db()
    .select({
      displayName: profile.displayName,
      username: profile.username,
      visibility: profile.visibility,
      musicDna: privacySettings.musicDna,
      locale: user.locale,
      readingLanguages: profile.readingLanguages,
      timeZone: profile.timeZone,
      reduceMotion: memberSettings.reduceMotion,
    })
    .from(profile)
    .innerJoin(user, eq(user.id, profile.userId))
    .leftJoin(privacySettings, eq(privacySettings.userId, profile.userId))
    .leftJoin(memberSettings, eq(memberSettings.userId, profile.userId))
    .where(eq(profile.userId, userId));
  if (!row) return null;
  return {
    ...row,
    musicDna: row.musicDna ?? "me",
    locale: isLocale(row.locale) ? row.locale : "hr",
    reduceMotion: !!row.reduceMotion,
  };
}

/** SET-07: the interface language, on the account (emails) and the profile alike. */
export async function saveInterfaceLanguage(userId: string, locale: Locale): Promise<void> {
  await db().transaction(async (tx) => {
    await tx.update(user).set({ locale }).where(eq(user.id, userId));
    await tx
      .update(profile)
      .set({ interfaceLocale: locale, updatedAt: new Date() })
      .where(eq(profile.userId, userId));
  });
}

/** SET-07: reading languages, any of the supported ones, none is allowed (nothing is hidden by them). */
export async function saveReadingLanguagesSetting(userId: string, langs: string[]): Promise<void> {
  const clean = READING_LANGUAGES.filter((l) => langs.includes(l));
  await db()
    .update(profile)
    .set({ readingLanguages: clean, updatedAt: new Date() })
    .where(eq(profile.userId, userId));
}

/** SET-07: the time zone, for the reminder too (OQ-11: an IANA zone, never a fixed offset). */
export async function saveTimeZone(userId: string, timeZone: string): Promise<boolean> {
  if (!isTimeZone(timeZone)) return false;
  await db().transaction(async (tx) => {
    await tx
      .update(profile)
      .set({ timeZone, updatedAt: new Date() })
      .where(eq(profile.userId, userId));
    await tx
      .update(dailyDropReminder)
      .set({ timeZone, updatedAt: new Date() })
      .where(eq(dailyDropReminder.userId, userId));
  });
  return true;
}

/** "Smanji pokrete" (D-049): on top of the system setting, which always applies as well. */
export async function setReduceMotion(userId: string, on: boolean): Promise<void> {
  await db()
    .insert(memberSettings)
    .values({ userId, reduceMotion: on })
    .onConflictDoUpdate({
      target: memberSettings.userId,
      set: { reduceMotion: on, updatedAt: new Date() },
    });
}
