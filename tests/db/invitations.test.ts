// Step 5.4: invitations and onboarding against the real database. Fixtures use @join.test addresses and are
// deleted afterwards (cascade). Also exercises the Better Auth hooks: no account without the invitation cookie,
// the account from an invitation is verified at once (JO6) and the invitation is accepted (once).
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq, like } from "drizzle-orm";
import { auth } from "@/lib/auth/auth";
import { closeDb, db } from "@/lib/db/client";
import {
  genre,
  invitation,
  musicDnaEntry,
  profile,
  user,
  usernameReservation,
} from "@/lib/db/schema";
import { seedGenres } from "@/lib/db/seed-genres";
import {
  acceptInvitation,
  createInvitation,
  hashInviteToken,
  invitationByToken,
  invitationMatches,
  listInvitations,
  revokeInvitation,
} from "@/lib/data/invitations";
import { forgetGenreCatalogue, ownMusicDna, replaceDnaGenres } from "@/lib/data/music-dna";
import {
  createOnboardingProfile,
  finishOnboarding,
  onboardingState,
  saveOnboardingStep,
  saveProfileVisibility,
  usernameSuggestions,
} from "@/lib/data/onboarding";
import { INVITE_COOKIE } from "@/lib/onboarding/constants";

const RUN = Date.now().toString(36);
const mail = (k: string) => `${k}-${RUN}@join.test`;
let adminId: string;

beforeAll(async () => {
  const [a] = await db()
    .insert(user)
    .values({ name: "Join Admin", email: mail("admin"), emailVerified: true, role: "admin" })
    .returning({ id: user.id });
  adminId = a!.id;
  await seedGenres();
  forgetGenreCatalogue();
});

afterAll(async () => {
  await db()
    .delete(invitation)
    .where(like(invitation.email, `%-${RUN}@join.test`));
  await db()
    .delete(user)
    .where(like(user.email, `%-${RUN}@join.test`));
  await closeDb();
});

describe("invitations (ADM-03, R-08, review L11)", () => {
  it("stores the address normalised, keeps one open invite per address, and reports the member case", async () => {
    const a = await createInvitation({
      email: `  ${mail("One").toUpperCase()} `,
      invitedBy: adminId,
      locale: "hr",
    });
    expect(a.ok).toBe(true);
    if (!a.ok) return;
    expect(a.email).toBe(mail("one"));
    const again = await createInvitation({ email: mail("one"), invitedBy: adminId, locale: "en" });
    expect(again).toEqual({ ok: false, reason: "open" });
    const member = await createInvitation({
      email: mail("admin"),
      invitedBy: adminId,
      locale: "hr",
    });
    expect(member).toEqual({ ok: false, reason: "member" });
    const bad = await createInvitation({
      email: "not-an-address",
      invitedBy: adminId,
      locale: "hr",
    });
    expect(bad).toEqual({ ok: false, reason: "invalid" });
    // revoked → a new one may be sent
    expect(await revokeInvitation(a.id)).toBe(true);
    expect(await revokeInvitation(a.id)).toBe(false);
    const after = await createInvitation({ email: mail("one"), invitedBy: adminId, locale: "en" });
    expect(after.ok).toBe(true);
  });

  it("answers the token without a reason: unknown, revoked, expired and accepted all read the same", async () => {
    const live = await createInvitation({ email: mail("two"), invitedBy: adminId, locale: "hr" });
    if (!live.ok) throw new Error("fixture");
    expect(await invitationByToken(live.token)).toMatchObject({ usable: true, email: mail("two") });
    expect(await invitationByToken("nope")).toEqual({ usable: false });
    expect(await invitationByToken(live.token.slice(0, -1) + "x")).toEqual({ usable: false });
    expect(await invitationMatches(live.token, mail("other"))).toEqual({ usable: false });
    expect(await invitationMatches(live.token, ` ${mail("TWO")} `)).toMatchObject({ usable: true });
    await db()
      .update(invitation)
      .set({ expiresAt: new Date(Date.now() - 1000) })
      .where(eq(invitation.id, live.id));
    expect(await invitationByToken(live.token)).toEqual({ usable: false });
    expect(await acceptInvitation(live.id, adminId)).toBe(false);
    const rows = await listInvitations();
    expect(rows.find((r) => r.id === live.id)?.status).toBe("expired");
  });

  it("is accepted once, idempotently for the same member", async () => {
    const inv = await createInvitation({ email: mail("three"), invitedBy: adminId, locale: "hr" });
    if (!inv.ok) throw new Error("fixture");
    const [m] = await db()
      .insert(user)
      .values({ name: "Three", email: mail("three"), emailVerified: true })
      .returning({ id: user.id });
    expect(await acceptInvitation(inv.id, m!.id)).toBe(true);
    expect(await acceptInvitation(inv.id, m!.id)).toBe(true); // two tabs, J1 E2
    expect(await acceptInvitation(inv.id, adminId)).toBe(false); // nobody else
    expect(await invitationByToken(inv.token)).toEqual({ usable: false });
    const [row] = await db().select().from(invitation).where(eq(invitation.id, inv.id));
    expect(row!.status).toBe("accepted");
    expect(row!.acceptedUserId).toBe(m!.id);
    expect(hashInviteToken(inv.token)).toBe(row!.tokenHash);
  });
});

describe("account creation through Better Auth (hooks)", () => {
  const password = "Pozivnica-lozinka-2026!";
  const signUp = (email: string, cookie?: string) =>
    auth.api.signUpEmail({
      body: { email, password, name: "Nova", locale: "hr", age18: true } as never,
      headers: new Headers(cookie ? { cookie: `${INVITE_COOKIE}=${cookie}` } : {}),
    });

  it("refuses a sign-up without an invitation cookie and with a cookie for another address", async () => {
    await expect(signUp(mail("four"))).rejects.toMatchObject({ body: { code: "INVITE_REQUIRED" } });
    const inv = await createInvitation({ email: mail("five"), invitedBy: adminId, locale: "hr" });
    if (!inv.ok) throw new Error("fixture");
    await expect(signUp(mail("four"), inv.token)).rejects.toMatchObject({
      body: { code: "INVITE_REQUIRED" },
    });
    const [none] = await db()
      .select({ id: user.id })
      .from(user)
      .where(eq(user.email, mail("four")));
    expect(none).toBeUndefined();
  });

  it("creates a verified account from the invitation and accepts it in the same request (JO6)", async () => {
    const inv = await createInvitation({ email: mail("six"), invitedBy: adminId, locale: "hr" });
    if (!inv.ok) throw new Error("fixture");
    await signUp(mail("six"), inv.token);
    const [u] = await db()
      .select({ id: user.id, verified: user.emailVerified })
      .from(user)
      .where(eq(user.email, mail("six")));
    expect(u?.verified).toBe(true);
    const [row] = await db().select().from(invitation).where(eq(invitation.id, inv.id));
    expect(row!.status).toBe("accepted");
    expect(row!.acceptedUserId).toBe(u!.id);
    // the same token cannot open a second account
    await expect(signUp(mail("seven"), inv.token)).rejects.toMatchObject({
      body: { code: "INVITE_REQUIRED" },
    });
    // a signed-in session is possible at once (no verification step)
    const res = await auth.api.signInEmail({
      body: { email: mail("six"), password },
      headers: new Headers(),
    });
    expect(res.user.id).toBe(u!.id);
  });
});

describe("onboarding writes (ONB-02 to ONB-09)", () => {
  let id: string;
  beforeAll(async () => {
    const [u] = await db()
      .insert(user)
      .values({ name: "Onb", email: mail("onb"), emailVerified: true })
      .returning({ id: user.id });
    id = u!.id;
  });

  it("starts at the username step, hidden from everyone (no profile)", async () => {
    const s = await onboardingState(id);
    expect(s).toMatchObject({
      onboarded: false,
      step: "username",
      hasProfile: false,
      hasPicks: false,
    });
  });

  it("creates the profile once; taken, reserved and shaped-wrong usernames are refused", async () => {
    const taken = `taken_${RUN}`;
    await db()
      .insert(usernameReservation)
      .values({
        username: `held_${RUN}`,
        userId: adminId,
        reservedUntil: new Date(Date.now() + 86_400_000),
      });
    expect(
      await createOnboardingProfile(id, { username: "Ab", displayName: "X", locale: "hr" }),
    ).toEqual({
      ok: false,
      reason: "invalid",
    });
    expect(
      await createOnboardingProfile(id, {
        username: taken,
        displayName: "Jedan Dva Tri Četiri",
        locale: "hr",
      }),
    ).toEqual({ ok: false, reason: "invalid" });
    expect(
      await createOnboardingProfile(id, {
        username: `held_${RUN}`,
        displayName: "Onb",
        locale: "hr",
      }),
    ).toEqual({
      ok: false,
      reason: "taken",
    });
    expect(
      await createOnboardingProfile(id, {
        username: taken.toUpperCase(),
        displayName: "  Onb   Osoba ",
        locale: "en",
      }),
    ).toEqual({ ok: true });
    const [p] = await db().select().from(profile).where(eq(profile.userId, id));
    expect(p).toMatchObject({
      username: taken,
      displayName: "Onb Osoba",
      onboardingStep: "reading",
      visibility: null,
    });
    const [u] = await db().select({ name: user.name }).from(user).where(eq(user.id, id));
    expect(u!.name).toBe("Onb Osoba");
    const s = await onboardingState(id);
    expect(s).toMatchObject({ step: "reading", hasProfile: true, dnaAudience: "me" });
    // second tab: a no-op, the first answer stands
    expect(
      await createOnboardingProfile(id, {
        username: `other_${RUN}`,
        displayName: "Drugi",
        locale: "hr",
      }),
    ).toEqual({ ok: true });
    const [again] = await db()
      .select({ username: profile.username })
      .from(profile)
      .where(eq(profile.userId, id));
    expect(again!.username).toBe(taken);
    // another member cannot take it, in any case
    const sugg = await usernameSuggestions(taken);
    expect(sugg.length).toBeGreaterThan(0);
    expect(sugg).not.toContain(taken);
    await db()
      .delete(usernameReservation)
      .where(eq(usernameReservation.username, `held_${RUN}`));
  });

  it("cannot finish before the visibility choice; finishing is idempotent and freezes the pointer", async () => {
    expect(await finishOnboarding(id)).toBe(false);
    expect(await saveProfileVisibility(id, "private")).toBe(true);
    const [p] = await db().select().from(profile).where(eq(profile.userId, id));
    expect(p).toMatchObject({ visibility: "private", discoverable: false });
    expect(await finishOnboarding(id)).toBe(true);
    expect(await finishOnboarding(id)).toBe(true);
    await saveOnboardingStep(id, "dna");
    const s = await onboardingState(id);
    expect(s.onboarded).toBe(true);
    const [after] = await db()
      .select({ step: profile.onboardingStep })
      .from(profile)
      .where(eq(profile.userId, id));
    expect(after!.step).toBeNull();
  });

  it("replaces the genre picks in one go and refuses a single pick or an unknown id", async () => {
    const rows = await db()
      .select({ id: genre.id })
      .from(genre)
      .where(eq(genre.active, true))
      .limit(3);
    const ids = rows.map((r) => r.id);
    expect(await replaceDnaGenres(id, [ids[0]!], "hr")).toEqual({ ok: false, reason: "count" });
    expect(
      await replaceDnaGenres(id, [ids[0]!, "00000000-0000-4000-8000-000000000000"], "hr"),
    ).toEqual({
      ok: false,
      reason: "not-found",
    });
    const first = await replaceDnaGenres(id, [ids[1]!, ids[0]!], "hr");
    expect(first.ok).toBe(true);
    expect((await ownMusicDna(id, "hr")).genres.map((g) => g.id)).toEqual([ids[1], ids[0]]);
    const second = await replaceDnaGenres(id, [ids[2]!, ids[0]!, ids[1]!], "hr");
    expect(second.ok).toBe(true);
    expect((await ownMusicDna(id, "hr")).genres.map((g) => g.id)).toEqual([ids[2], ids[0], ids[1]]);
    expect((await onboardingState(id)).hasPicks).toBe(true);
    expect(await replaceDnaGenres(id, [], "hr")).toMatchObject({ ok: true });
    const left = await db()
      .select({ id: musicDnaEntry.id })
      .from(musicDnaEntry)
      .where(eq(musicDnaEntry.userId, id));
    expect(left).toHaveLength(0);
  });
});
