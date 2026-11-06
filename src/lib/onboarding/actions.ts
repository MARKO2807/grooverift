"use server";

import { cookies, headers } from "next/headers";
import { getLocale } from "next-intl/server";
import { APIError } from "better-auth/api";
import { z } from "zod";
import { redirect } from "@/i18n/navigation";
import { locales } from "@/i18n/routing";
import { audit } from "@/lib/audit";
import type { FormState } from "@/lib/auth/actions";
import { auth } from "@/lib/auth/auth";
import { passwordMissing, PASSWORD_MAX } from "@/lib/auth/password-policy";
import { getSession, roleOf } from "@/lib/auth/session";
import { logDbError } from "@/lib/data/db-errors";
import { loadViewer } from "@/lib/data/facts";
import { accountExists, invitationByToken } from "@/lib/data/invitations";
import { CatalogUnavailable } from "@/lib/catalog/musicbrainz";
import { artistFromMbid } from "@/lib/data/catalog";
import { replaceDnaArtists, replaceDnaGenres } from "@/lib/data/music-dna";
import {
  createOnboardingProfile,
  finishOnboarding,
  onboardingState,
  PROFILE_STEPS,
  READING_LANGUAGES,
  REMINDER_TIMES,
  saveDnaAudience,
  saveOnboardingStep,
  saveProfileVisibility,
  saveReadingLanguages,
  saveReminder,
  usernameSuggestions,
  USERNAME_SHAPE,
  validDisplayName,
  type OnboardingState,
  type ProfileStep,
} from "@/lib/data/onboarding";
import { normalizeUsername, usernameAvailable } from "@/lib/data/profiles";
import { consume } from "@/lib/data/rate-limit";
import { env } from "@/lib/env";
import { flagState } from "@/lib/flags";
import { ARTIST_MAX, DNA_AUDIENCES, GENRE_MAX, type DnaAudience } from "@/lib/music/limits";
import {
  ADULT_COOKIE,
  adultConfirmed,
  clearJoinCookies,
  cookieOptions,
  inviteTokenFromCookies,
} from "./cookies";
import { isReservedUsername } from "./username";
import { DONE_PATH, nextStep, PATHS, reachable, type Step } from "./steps";

// Server actions for the invitation and onboarding steps (PUB-05, ONB-01 to ONB-09, J1; step 5.4). The steps
// before the account keep nothing on the server (two cookies carry the invite token and the 18+ answer); every
// step after it writes the signed-in member's own rows through src/lib/data/onboarding and moves the pointer
// that resumes onboarding (J1 E8). Errors come back as message keys under "authErrors".

// i18n-keys: authErrors.inviteInvalid authErrors.accountExists authErrors.usernameTaken authErrors.usernameInvalid
// i18n-keys: authErrors.displayNameInvalid authErrors.chooseVisibility authErrors.chooseAudience authErrors.dnaCount
// i18n-keys: authErrors.timeZoneInvalid authErrors.notOnboarding

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function reqHeaders() {
  return await headers();
}

export async function reminderShown(): Promise<boolean> {
  return (await flagState("push")) === "on";
}

// ---------------------------------------------------------------- before the account

/** ONB-01: "yes" sets the flag and continues; "no" stores nothing and explains (J1 E5). */
export async function ageAction(form: FormData): Promise<void> {
  const locale = await getLocale();
  const jar = await cookies();
  if (form.get("age") === "adult") {
    jar.set(ADULT_COOKIE, "1", cookieOptions());
    redirect({ href: PATHS.language, locale });
  }
  jar.delete(ADULT_COOKIE);
  if (form.get("age") === "minor") redirect({ href: "/join/minor", locale });
  redirect({ href: { pathname: PATHS.age, query: { e: "1" } }, locale });
}

/** The interface language (D-060 (a)): the choice becomes the URL locale; next-intl remembers it in its cookie. */
export async function languageAction(form: FormData): Promise<void> {
  const chosen = String(form.get("locale") ?? "");
  const locale = (locales as readonly string[]).includes(chosen) ? chosen : await getLocale();
  redirect({ href: PATHS.account, locale });
}

function mapSignUpError(error: unknown): FormState {
  if (error instanceof APIError) {
    const code = (error.body as { code?: string } | undefined)?.code ?? "";
    switch (code) {
      case "PASSWORD_COMPROMISED":
        return { fieldErrors: { password: "compromised" } };
      case "PASSWORD_POLICY":
        return { fieldErrors: { password: "policy" } };
      case "INVITE_REQUIRED":
      case "INVITE_EMAIL_MISMATCH":
        return { error: "inviteInvalid" };
      case "TOO_MANY_REQUESTS":
        return { error: "tooMany" };
      default:
        if (error.status === "TOO_MANY_REQUESTS") return { error: "tooMany" };
    }
  }
  console.error("[join action]", error instanceof Error ? error.message : error);
  return { error: "generic" };
}

/**
 * /join/account with a password: the address is the invitation's, the account is verified at once (JO6, the auth
 * database hook) and the invitation is accepted in the same hook; then the member is signed in and continues.
 */
export async function createAccountAction(_prev: FormState, form: FormData): Promise<FormState> {
  const locale = await getLocale();
  if (await getSession()) redirect({ href: PATHS.username, locale });
  const invite = await invitationByToken(await inviteTokenFromCookies());
  if (!invite.usable) return { error: "inviteInvalid" };
  if (!(await adultConfirmed())) redirect({ href: PATHS.age, locale });
  const password = String(form.get("password") ?? "");
  if (!password) return { fieldErrors: { password: "required" } };
  if (password.length > PASSWORD_MAX || passwordMissing(password).length)
    return { fieldErrors: { password: "policy" } };
  if (await accountExists(invite.email)) return { error: "accountExists" };
  try {
    const h = await reqHeaders();
    const body = {
      email: invite.email,
      password,
      name: invite.email.split("@")[0]!.slice(0, 40), // replaced by the display name on the next step
      locale,
      age18: true, // read by the before hook (hooks.ts): the 18+ confirmation is enforced on the API too
      callbackURL: `${env().APP_URL}${locale === "hr" ? "" : `/${locale}`}/verified`,
    };
    await auth.api.signUpEmail({ body, headers: h });
    await auth.api.signInEmail({
      body: { email: invite.email, password, rememberMe: true },
      headers: h,
    });
  } catch (error) {
    return mapSignUpError(error);
  }
  await clearJoinCookies();
  redirect({ href: PATHS.username, locale });
  return { ok: true };
}

/** Google on /join/account (S-09): the callback lands on the username step; a refused address comes back with ?error=. */
export async function joinWithGoogleAction(): Promise<void> {
  const locale = await getLocale();
  const prefix = locale === "hr" ? "" : `/${locale}`;
  if (!(await adultConfirmed())) redirect({ href: PATHS.age, locale });
  const res = await auth.api.signInSocial({
    body: {
      provider: "google",
      callbackURL: `${env().APP_URL}${prefix}${PATHS.username}`,
      errorCallbackURL: `${env().APP_URL}${prefix}${PATHS.account}`,
    },
    headers: await reqHeaders(),
  });
  if (res.url) redirect({ href: res.url, locale });
  redirect({ href: PATHS.account, locale });
}

/** J1 E3: another account is signed in; sign out here and come back to the invitation (nothing consumed). */
export async function signOutToJoinAction(): Promise<void> {
  const locale = await getLocale();
  try {
    await auth.api.signOut({ headers: await reqHeaders() });
  } catch {
    // already signed out
  }
  redirect({ href: "/join", locale });
}

// ---------------------------------------------------------------- after the account

type Member = { userId: string; locale: "hr" | "en"; state: OnboardingState; reminder: boolean };

/**
 * The signed-in, not yet onboarded member at a step they may be on. A finished member goes Home; a step ahead of
 * the pointer goes to the pointer (J1 E8); a signed-out request goes to the invitation page.
 */
async function member(step: Step): Promise<Member> {
  const locale = (await getLocale()) === "en" ? "en" : "hr";
  const session = await getSession();
  if (!session) redirect({ href: "/join", locale });
  const viewer = await loadViewer({ id: session!.user.id, role: roleOf(session) });
  if (viewer.status !== "active") redirect({ href: "/home", locale });
  const [state, reminder] = await Promise.all([onboardingState(session!.user.id), reminderShown()]);
  if (state.onboarded) redirect({ href: "/home", locale });
  const ctx = { hasPicks: state.hasPicks, reminder };
  if (!reachable(step, state.step, ctx)) redirect({ href: PATHS[state.step], locale });
  return { userId: session!.user.id, locale, state, reminder };
}

/** After a successful save: the pointer moves forward (never back) and the member goes to the next shown step. */
async function advance(m: Member, from: Step, hasPicks = m.state.hasPicks): Promise<never> {
  const ctx = { hasPicks, reminder: m.reminder };
  const next = nextStep(from, ctx);
  if (next) {
    // Only move the pointer forward: a member revisiting an earlier step keeps their further progress.
    const order: readonly string[] = PROFILE_STEPS;
    if (order.indexOf(next) > order.indexOf(m.state.step)) {
      await saveOnboardingStep(m.userId, next as ProfileStep);
    }
    redirect({ href: PATHS[next], locale: m.locale });
  }
  await finishOnboarding(m.userId);
  await audit({ actorType: "member", actorId: m.userId, action: "onboarding.finished" });
  redirect({ href: DONE_PATH, locale: m.locale });
  throw new Error("unreachable");
}

export async function usernameAction(_prev: FormState, form: FormData): Promise<FormState> {
  const m = await member("username");
  const values = {
    displayName: String(form.get("displayName") ?? ""),
    username: String(form.get("username") ?? ""),
  };
  const username = normalizeUsername(values.username);
  const fieldErrors: Record<string, string> = {};
  if (!validDisplayName(values.displayName)) fieldErrors.displayName = "displayNameInvalid";
  if (!USERNAME_SHAPE.test(username)) fieldErrors.username = "usernameInvalid";
  else if (isReservedUsername(username)) fieldErrors.username = "usernameTaken";
  if (Object.keys(fieldErrors).length) return { fieldErrors, values };
  if (m.state.hasProfile) {
    // Two tabs (J1 E2): the profile exists; the first tab's answer stands.
    await advance(m, "username");
  }
  try {
    const result = await createOnboardingProfile(m.userId, {
      username,
      displayName: values.displayName,
      locale: m.locale,
    });
    if (!result.ok) {
      return {
        fieldErrors: { username: result.reason === "taken" ? "usernameTaken" : "usernameInvalid" },
        values,
      };
    }
  } catch (e) {
    logDbError("usernameAction", e);
    return { error: "generic", values };
  }
  await audit({ actorType: "member", actorId: m.userId, action: "onboarding.profile.created" });
  return advance(m, "username");
}

export type UsernameCheck = {
  ok: boolean;
  state?: "free" | "taken" | "invalid";
  suggestions?: string[];
};

/** The live availability check on ONB-02 (WCAG 3.3.3): taken and reserved read the same (J1 E6). */
export async function checkUsernameAction(raw: unknown): Promise<UsernameCheck> {
  const session = await getSession();
  if (!session || typeof raw !== "string") return { ok: false };
  const rate = await consume("username", session.user.id);
  if (!rate.allowed) return { ok: false };
  const username = normalizeUsername(raw.slice(0, 40));
  if (!USERNAME_SHAPE.test(username)) return { ok: true, state: "invalid" };
  try {
    if (!isReservedUsername(username) && (await usernameAvailable(username, session.user.id)))
      return { ok: true, state: "free" };
    return {
      ok: true,
      state: "taken",
      suggestions: await usernameSuggestions(username, session.user.id),
    };
  } catch (e) {
    logDbError("checkUsernameAction", e);
    return { ok: false };
  }
}

export async function readingAction(_prev: FormState, form: FormData): Promise<FormState> {
  const m = await member("reading");
  const chosen = form.getAll("reading").map(String);
  try {
    await saveReadingLanguages(
      m.userId,
      chosen.filter((l) => (READING_LANGUAGES as readonly string[]).includes(l)),
    );
  } catch (e) {
    logDbError("readingAction", e);
    return { error: "generic" };
  }
  return advance(m, "reading");
}

export async function visibilityAction(_prev: FormState, form: FormData): Promise<FormState> {
  const m = await member("visibility");
  const v = form.get("visibility");
  if (v !== "public" && v !== "private") return { fieldErrors: { visibility: "chooseVisibility" } };
  try {
    await saveProfileVisibility(m.userId, v);
  } catch (e) {
    logDbError("visibilityAction", e);
    return { error: "generic" };
  }
  await audit({
    actorType: "member",
    actorId: m.userId,
    action: "onboarding.visibility.chosen",
    metadata: { visibility: v },
  });
  return advance(m, "visibility");
}

/** ONB-05: the picks arrive as repeated `genre` fields in pick order; Skip (or no picks) keeps nothing. */
// i18n-keys: authErrors.catalogDown
export async function dnaAction(_prev: FormState, form: FormData): Promise<FormState> {
  const m = await member("dna");
  const skip = form.get("skip") === "1";
  const ids = skip
    ? []
    : form
        .getAll("genre")
        .map(String)
        .filter((id) => UUID.test(id));
  // Artists travel as MusicBrainz ids in pick order (step 5.3b); each is stored on first use.
  const mbids = skip
    ? []
    : [
        ...new Set(
          form
            .getAll("artist")
            .map(String)
            .filter((id) => UUID.test(id)),
        ),
      ];
  if (ids.length > GENRE_MAX) return { fieldErrors: { genres: "dnaCount" } };
  if (ids.length === 1) return { fieldErrors: { genres: "dnaCount" } };
  if (mbids.length > ARTIST_MAX) return { error: "generic" };
  if ((await flagState("music_dna")) === "paused" && (ids.length || mbids.length))
    return { error: "generic" };
  try {
    const artistIds: string[] = [];
    for (const mbid of mbids) {
      const ref = await artistFromMbid(mbid);
      if (ref.ok) artistIds.push(ref.id); // an artist gone from the source is left out
    }
    const result = await replaceDnaGenres(m.userId, ids, m.locale);
    if (!result.ok)
      return { fieldErrors: { genres: result.reason === "count" ? "dnaCount" : "generic" } };
    const artists = await replaceDnaArtists(m.userId, artistIds);
    if (!artists.ok) return { error: "generic" };
  } catch (e) {
    if (e instanceof CatalogUnavailable) {
      console.warn(`[catalog] dnaAction: ${e.message}`);
      return { error: "catalogDown" };
    }
    logDbError("dnaAction", e);
    return { error: "generic" };
  }
  return advance(m, "dna", ids.length > 0 || mbids.length > 0);
}

/** ONB-05 while Music DNA is paused (SYS-04): continue without picks; the pointer still moves on. */
export async function skipDnaAction(): Promise<void> {
  const m = await member("dna");
  await advance(m, "dna", false);
}

export async function dnaAudienceAction(_prev: FormState, form: FormData): Promise<FormState> {
  const m = await member("dnaAudience");
  const a = form.get("audience");
  if (!DNA_AUDIENCES.includes(a as DnaAudience))
    return { fieldErrors: { audience: "chooseAudience" } };
  try {
    await saveDnaAudience(m.userId, a as DnaAudience);
  } catch (e) {
    logDbError("dnaAudienceAction", e);
    return { error: "generic" };
  }
  return advance(m, "dnaAudience");
}

export async function howAction(): Promise<void> {
  const m = await member("how");
  await advance(m, "how");
}

const zones = new Set(Intl.supportedValuesOf("timeZone"));

export async function reminderAction(_prev: FormState, form: FormData): Promise<FormState> {
  const m = await member("reminder");
  const enabled = form.get("reminder") === "on";
  const parsed = z
    .object({
      localTime: z.enum(REMINDER_TIMES),
      timeZone: z.string().refine((tz) => zones.has(tz)),
    })
    .safeParse({
      localTime: form.get("localTime") ?? "12:00",
      timeZone: form.get("timeZone") || "Europe/Zagreb",
    });
  if (!parsed.success) return { fieldErrors: { timeZone: "timeZoneInvalid" } };
  try {
    await saveReminder(m.userId, { enabled, ...parsed.data });
  } catch (e) {
    logDbError("reminderAction", e);
    return { error: "generic" };
  }
  return advance(m, "reminder");
}
