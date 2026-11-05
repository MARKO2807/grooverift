import "@/lib/load-env";
import { and, eq, inArray, sql } from "drizzle-orm";
import { closeDb, db } from "./client";
import {
  account,
  dailyDropQuestion,
  dailyDropTranslation,
  featureFlag,
  genre,
  memberSettings,
  musicDnaEntry,
  privacySettings,
  profile,
  user,
} from "./schema";
import { hashPassword } from "@/lib/auth/password";
import { env } from "@/lib/env";
import { seedGenres } from "./seed-genres";

// Development seed. EVERY record here is FICTIONAL (no real people, no real addresses).
// The addresses use the reserved example.test domain, which cannot receive mail.
// Refuses to run in production.
export const SEED_PASSWORD = "Prototip-lozinka-1!"; // satisfies D-061; dev only

export const SEED_USERS = [
  { email: "ana@example.test", name: "Ana Sluša", role: "member" },
  { email: "luka@example.test", name: "Luka Bas", role: "member" },
  { email: "mia@example.test", name: "Mia Mono", role: "member" },
  { email: "editor@example.test", name: "Ema Urednica", role: "editor" },
  { email: "mod@example.test", name: "Marin Moderator", role: "moderator" },
  { email: "admin@example.test", name: "Alfa Admin", role: "admin" },
] as const;

/** Seeded Music DNA genres by slug (step 5.3a). Added only to a member with no genres yet, so edits survive a re-seed. */
export const SEED_DNA: Record<string, string[]> = {
  "ana@example.test": ["jazz", "soul", "singer-songwriter", "tamburica"],
  "luka@example.test": ["techno", "drum-and-bass", "hip-hop"],
  "mia@example.test": ["metal", "punk"],
};

export const SEED_FLAGS = [
  { key: "daily_drop", state: "on", note: "Daily Drop screens (Phase 5)" },
  { key: "comments", state: "on", note: "Comments on answers" },
  {
    key: "music_dna",
    state: "on",
    note: "Music DNA editor and Spirala (step 5.3a); pause for SYS-04",
  },
  { key: "google_sign_in", state: "off", note: "Shown when GOOGLE_CLIENT_ID is set" },
  {
    key: "push",
    state: "off",
    note: "Daily Drop push and the reminder step in onboarding (step 5.12; D-093 (1))",
  },
] as const;

/**
 * SAMPLE editorial content for development (step 5.6): fixed ids so a re-seed changes nothing an editor did.
 * Three reserve questions (fewer than the JO4 minimum of seven, so the warning shows), one approved question to
 * schedule, one in review and one Croatian-only draft. Nothing is scheduled or published by the seed.
 */
export const SEED_QUESTIONS = [
  {
    n: 1,
    status: "approved",
    reserve: true,
    hr: "Koja ti je pjesma prva otvorila neki novi žanr?",
    en: "Which song first opened a new genre for you?",
  },
  {
    n: 2,
    status: "approved",
    reserve: true,
    hr: "Koji album preporučuješ nekome tko tek upoznaje tvoju omiljenu glazbu?",
    en: "Which album do you recommend to someone just getting to know your favourite music?",
  },
  {
    n: 3,
    status: "approved",
    reserve: true,
    hr: "Koji zvuk ili instrument te uvijek natjera da pojačaš glazbu?",
    en: "Which sound or instrument always makes you turn the music up?",
  },
  {
    n: 4,
    status: "approved",
    reserve: false,
    hr: "Koju pjesmu znaš napamet, a ne znaš kako?",
    en: "Which song do you know by heart without knowing how?",
  },
  {
    n: 5,
    status: "in_review",
    reserve: false,
    hr: "Koji koncert ti je ostao u sjećanju i zašto?",
    en: "Which concert stayed with you, and why?",
  },
  {
    n: 6,
    status: "draft",
    reserve: false,
    hr: "Koja pjesma najbolje opisuje tvoj tjedan?",
    en: "",
  },
] as const;
const seedQuestionId = (n: number) =>
  `00000000-0000-4000-8000-0000000560${String(n).padStart(2, "0")}`;

export async function seed() {
  if (env().NODE_ENV === "production") throw new Error("Refusing to seed a production database.");
  const d = db();
  const passwordHash = await hashPassword(SEED_PASSWORD);

  await d.transaction(async (tx) => {
    for (const u of SEED_USERS) {
      const [row] = await tx
        .insert(user)
        .values({ email: u.email, name: u.name, emailVerified: true, role: u.role, locale: "hr" })
        .onConflictDoUpdate({
          target: user.email,
          set: { name: u.name, role: u.role, emailVerified: true },
        })
        .returning({ id: user.id });
      const id = row!.id;
      await tx
        .insert(account)
        .values({ userId: id, accountId: id, providerId: "credential", password: passwordHash })
        .onConflictDoNothing();
      await tx.insert(memberSettings).values({ userId: id }).onConflictDoNothing();
      // A finished profile (step 5.2): username from the address, Mia private so both kinds exist.
      await tx
        .insert(profile)
        .values({
          userId: id,
          username: u.email.split("@")[0]!,
          displayName: u.name,
          visibility: u.email.startsWith("mia@") ? "private" : "public",
          onboardedAt: new Date(),
        })
        .onConflictDoNothing();
      await tx.insert(privacySettings).values({ userId: id }).onConflictDoNothing();
    }
    for (const f of SEED_FLAGS) {
      await tx
        .insert(featureFlag)
        .values({ key: f.key, state: f.state, note: f.note })
        .onConflictDoUpdate({ target: featureFlag.key, set: { state: f.state, note: f.note } });
    }
    // Retired in step 5.4: accounts come from invitations only (nothing reads this flag any more).
    await tx.delete(featureFlag).where(eq(featureFlag.key, "sign_up"));
  });

  const genres = await seedGenres(); // reference data, the same in every environment
  await d.transaction(async (tx) => {
    for (const [email, slugs] of Object.entries(SEED_DNA)) {
      const [u] = await tx.select({ id: user.id }).from(user).where(eq(user.email, email));
      if (!u) continue;
      const [has] = await tx
        .select({ id: musicDnaEntry.id })
        .from(musicDnaEntry)
        .where(and(eq(musicDnaEntry.userId, u.id), eq(musicDnaEntry.kind, "genre")))
        .limit(1);
      if (has) continue;
      const rows = await tx
        .select({ id: genre.id, slug: genre.slug })
        .from(genre)
        .where(inArray(genre.slug, slugs));
      const bySlug = new Map(rows.map((r) => [r.slug, r.id]));
      const values = slugs.flatMap((slug, position) => {
        const genreId = bySlug.get(slug);
        return genreId ? [{ userId: u.id, kind: "genre" as const, genreId, position }] : [];
      });
      if (values.length) await tx.insert(musicDnaEntry).values(values);
    }
  });

  // Sample Daily Drop questions (step 5.6), approved by the seeded editor; left alone once they exist.
  await d.transaction(async (tx) => {
    const [ed] = await tx
      .select({ id: user.id })
      .from(user)
      .where(eq(user.email, "editor@example.test"));
    for (const sq of SEED_QUESTIONS) {
      const id = seedQuestionId(sq.n);
      const approved = sq.status === "approved";
      const inserted = await tx
        .insert(dailyDropQuestion)
        .values({
          id,
          status: sq.status,
          isReserve: sq.reserve,
          createdBy: ed?.id ?? null,
          approvedBy: approved ? (ed?.id ?? null) : null,
        })
        .onConflictDoNothing()
        .returning({ id: dailyDropQuestion.id });
      if (!inserted.length) continue;
      const texts = [
        { locale: "hr", text: sq.hr },
        { locale: "en", text: sq.en },
      ].filter((t) => t.text);
      await tx.insert(dailyDropTranslation).values(
        texts.map((t) => ({
          questionId: id,
          locale: t.locale,
          text: t.text,
          review: approved ? ("approved" as const) : ("draft" as const),
          reviewedBy: approved ? (ed?.id ?? null) : null,
          reviewedAt: approved ? new Date() : null,
        })),
      );
    }
  });

  const rows = await d
    .execute<{ count: string }>(sql`select count(*)::text as count from "user"`)
    .then((r) => r.rows);
  const count = rows[0]?.count ?? "?";
  console.log(
    `seed: ${SEED_USERS.length} fictional members upserted (${count} users total), ${SEED_FLAGS.length} flags, ${genres} genres, ${SEED_QUESTIONS.length} sample questions`,
  );
}

const isCli = process.argv[1]?.endsWith("seed.ts");
if (isCli) {
  seed()
    .catch((error) => {
      console.error("seed failed:", error instanceof Error ? error.message : error);
      process.exitCode = 1;
    })
    .finally(() => closeDb());
}
