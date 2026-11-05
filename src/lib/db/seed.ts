import "@/lib/load-env";
import { and, eq, inArray, sql } from "drizzle-orm";
import { closeDb, db } from "./client";
import {
  account,
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
  { key: "sign_up", state: "on", note: "Open sign-up form (development only; invites in Phase 5)" },
] as const;

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

  const rows = await d
    .execute<{ count: string }>(sql`select count(*)::text as count from "user"`)
    .then((r) => r.rows);
  const count = rows[0]?.count ?? "?";
  console.log(
    `seed: ${SEED_USERS.length} fictional members upserted (${count} users total), ${SEED_FLAGS.length} flags, ${genres} genres`,
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
