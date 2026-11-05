"use server";

import { cookies, headers } from "next/headers";
import { getLocale } from "next-intl/server";
import { z } from "zod";
import { APIError } from "better-auth/api";
import QRCode from "qrcode";
import { auth } from "./auth";
import { passwordMissing, PASSWORD_MAX } from "./password";
import { SETUP_DONE_COOKIE } from "./constants";
import { normalizeRecoveryCode } from "./recovery-codes";
import { audit } from "@/lib/audit";
import { redirect } from "@/i18n/navigation";
import { env } from "@/lib/env";
import { isEnabled } from "@/lib/flags";

// Server actions for the credential forms. Every form is a real <form> that posts here (Phase 3 rule),
// so Enter, password managers and progressive enhancement work. Errors come back as message keys;
// the page translates them. Nothing here trusts the client: Zod parses, Better Auth decides.

// Message keys returned by these actions (read dynamically by the forms through t(state.error)):
// i18n-keys: authErrors.generic authErrors.badCredentials authErrors.locked authErrors.lockedReset
// i18n-keys: authErrors.tooMany authErrors.emailNotVerified authErrors.banned authErrors.compromised
// i18n-keys: authErrors.policy authErrors.emailTaken authErrors.emailInvalid authErrors.nameRequired
// i18n-keys: authErrors.age18 authErrors.linkInvalid authErrors.badCode authErrors.freshSession
// i18n-keys: authErrors.required authErrors.wrongPassword authErrors.signUpClosed
export type FormState = {
  error?: string; // message key under "authErrors"
  fieldErrors?: Record<string, string>; // field name → message key under "authErrors"
  values?: Record<string, string>; // what the member typed, kept after an error (components §4.2)
  retryAfter?: number;
  ok?: boolean;
};

const emailSchema = z.string().trim().toLowerCase().email().max(254);

const strip = (code: FormDataEntryValue | null) =>
  String(code ?? "")
    .replace(/[\s-]/g, "")
    .trim();

/** Where to send the member after sign-in: only a relative path on this site (no open redirect). */
function safeReturnTo(value: FormDataEntryValue | null, fallback = "/home"): string {
  const v = String(value ?? "");
  if (!v.startsWith("/") || v.startsWith("//") || v.includes("\\") || v.includes("://"))
    return fallback;
  return v;
}

function mapError(error: unknown): FormState {
  if (error instanceof APIError) {
    const code = (error.body as { code?: string } | undefined)?.code ?? "";
    const retryAfter = (error.body as { retryAfter?: number } | undefined)?.retryAfter;
    switch (code) {
      case "SIGN_IN_LOCKED":
        return { error: "locked", retryAfter };
      case "SIGN_IN_LOCKED_RESET_REQUIRED":
        return { error: "lockedReset" };
      case "INVALID_EMAIL_OR_PASSWORD":
      case "INVALID_PASSWORD":
      case "USER_NOT_FOUND":
      case "CREDENTIAL_ACCOUNT_NOT_FOUND":
        return { error: "badCredentials" };
      case "EMAIL_NOT_VERIFIED":
        return { error: "emailNotVerified" };
      case "BANNED_USER":
        return { error: "banned" };
      case "PASSWORD_COMPROMISED":
        return { fieldErrors: { password: "compromised" } };
      case "USER_ALREADY_EXISTS":
      case "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL":
        return { fieldErrors: { email: "emailTaken" } };
      case "INVALID_TOKEN":
      case "TOKEN_EXPIRED":
        return { error: "linkInvalid" };
      case "INVALID_CODE":
      case "INVALID_TWO_FACTOR_CODE":
      case "INVALID_BACKUP_CODE":
        return { fieldErrors: { code: "badCode" } };
      case "ACCOUNT_TEMPORARILY_LOCKED":
        return { error: "locked" };
      case "SESSION_EXPIRED":
      case "FRESH_SESSION_REQUIRED":
        return { error: "freshSession" };
      case "TOO_MANY_REQUESTS":
        return { error: "tooMany" };
      default:
        if (error.status === "TOO_MANY_REQUESTS") return { error: "tooMany", retryAfter };
        return { error: "generic" };
    }
  }
  console.error("[auth action]", error);
  return { error: "generic" };
}

async function reqHeaders() {
  return await headers();
}

export async function signInAction(_prev: FormState, form: FormData): Promise<FormState> {
  const parsed = z
    .object({ email: emailSchema, password: z.string().min(1).max(PASSWORD_MAX) })
    .safeParse({ email: form.get("email"), password: form.get("password") });
  const values = { email: String(form.get("email") ?? "") };
  if (!parsed.success) return { error: "badCredentials", values };
  const returnTo = safeReturnTo(form.get("returnTo"));
  const locale = await getLocale();
  let twoFactor = false;
  try {
    const res = await auth.api.signInEmail({
      body: { email: parsed.data.email, password: parsed.data.password, rememberMe: true },
      headers: await reqHeaders(),
    });
    twoFactor = "twoFactorRedirect" in res && Boolean(res.twoFactorRedirect);
  } catch (error) {
    return { ...mapError(error), values };
  }
  if (twoFactor) {
    redirect({ href: { pathname: "/sign-in/second-step", query: { returnTo } }, locale });
  }
  redirect({ href: returnTo, locale });
  return { ok: true };
}

/** Google sign-in (S-09: Better Auth links only a verified Google email to an existing account). */
export async function signInGoogleAction(form: FormData): Promise<void> {
  const returnTo = safeReturnTo(form.get("returnTo"));
  const locale = await getLocale();
  const prefix = locale === "hr" ? "" : `/${locale}`;
  const res = await auth.api.signInSocial({
    body: {
      provider: "google",
      callbackURL: `${env().APP_URL}${prefix}${returnTo}`,
      errorCallbackURL: `${env().APP_URL}${prefix}/sign-in`,
    },
    headers: await reqHeaders(),
  });
  if (res.url) redirect({ href: res.url, locale });
  redirect({ href: "/sign-in", locale });
}

export async function secondStepAction(_prev: FormState, form: FormData): Promise<FormState> {
  const recovery = form.get("recovery") === "1";
  const code = recovery
    ? normalizeRecoveryCode(String(form.get("code") ?? ""))
    : strip(form.get("code"));
  const returnTo = safeReturnTo(form.get("returnTo"));
  const locale = await getLocale();
  if (!code || (!recovery && !/^\d{6}$/.test(code)) || (recovery && code.length < 8)) {
    return { fieldErrors: { code: "badCode" } };
  }
  try {
    const h = await reqHeaders();
    if (recovery)
      await auth.api.verifyBackupCode({ body: { code, trustDevice: false }, headers: h });
    else await auth.api.verifyTOTP({ body: { code, trustDevice: false }, headers: h });
  } catch (error) {
    return mapError(error);
  }
  redirect({ href: returnTo, locale });
  return { ok: true };
}

export async function signUpAction(_prev: FormState, form: FormData): Promise<FormState> {
  const open = await isEnabled("sign_up", { role: "member" });
  if (!open) return { error: "signUpClosed" };
  const values = {
    name: String(form.get("name") ?? ""),
    email: String(form.get("email") ?? ""),
  };
  const schema = z.object({
    name: z.string().trim().min(1).max(60),
    email: emailSchema,
    password: z.string().max(PASSWORD_MAX),
    age18: z.literal("on"),
  });
  const parsed = schema.safeParse({
    name: form.get("name"),
    email: form.get("email"),
    password: form.get("password"),
    age18: form.get("age18"),
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const field = String(issue.path[0] ?? "");
      if (field === "age18") fieldErrors.age18 = "age18";
      else if (field === "email") fieldErrors.email = "emailInvalid";
      else if (field === "name") fieldErrors.name = "nameRequired";
    }
    return { fieldErrors, values };
  }
  if (passwordMissing(parsed.data.password).length) {
    return { fieldErrors: { password: "policy" }, values };
  }
  const locale = await getLocale();
  try {
    await auth.api.signUpEmail({
      body: {
        name: parsed.data.name,
        email: parsed.data.email,
        password: parsed.data.password,
        locale,
        callbackURL: `${env().APP_URL}${locale === "hr" ? "" : `/${locale}`}/verified`,
      },
      headers: await reqHeaders(),
    });
  } catch (error) {
    return { ...mapError(error), values };
  }
  redirect({ href: { pathname: "/check-email", query: { email: parsed.data.email } }, locale });
  return { ok: true };
}

export async function requestResetAction(_prev: FormState, form: FormData): Promise<FormState> {
  const parsed = emailSchema.safeParse(form.get("email"));
  const values = { email: String(form.get("email") ?? "") };
  if (!parsed.success) return { fieldErrors: { email: "emailInvalid" }, values };
  const locale = await getLocale();
  try {
    await auth.api.requestPasswordReset({
      body: {
        email: parsed.data,
        redirectTo: `${env().APP_URL}${locale === "hr" ? "" : `/${locale}`}/reset/new`,
      },
      headers: await reqHeaders(),
    });
  } catch (error) {
    const mapped = mapError(error);
    // The "sent" page is the same whether the account exists or not (no enumeration).
    if (mapped.error !== "tooMany") {
      await audit({ actorType: "system", action: "auth.reset.request_failed" });
    } else return { ...mapped, values };
  }
  redirect({ href: { pathname: "/reset/sent", query: { email: parsed.data } }, locale });
  return { ok: true };
}

export async function resetPasswordAction(_prev: FormState, form: FormData): Promise<FormState> {
  const token = String(form.get("token") ?? "");
  const password = String(form.get("password") ?? "");
  const locale = await getLocale();
  if (!token) return { error: "linkInvalid" };
  if (passwordMissing(password).length || password.length > PASSWORD_MAX) {
    return { fieldErrors: { password: "policy" } };
  }
  try {
    await auth.api.resetPassword({
      body: { token, newPassword: password },
      headers: await reqHeaders(),
    });
  } catch (error) {
    return mapError(error);
  }
  redirect({ href: { pathname: "/sign-in", query: { reset: "1" } }, locale });
  return { ok: true };
}

export async function resendVerificationAction(
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = emailSchema.safeParse(form.get("email"));
  if (!parsed.success) return { error: "generic" };
  const locale = await getLocale();
  try {
    await auth.api.sendVerificationEmail({
      body: {
        email: parsed.data,
        callbackURL: `${env().APP_URL}${locale === "hr" ? "" : `/${locale}`}/verified`,
      },
      headers: await reqHeaders(),
    });
  } catch (error) {
    const mapped = mapError(error);
    if (mapped.error === "tooMany") return mapped;
  }
  return { ok: true };
}

export async function signOutAction(): Promise<void> {
  const locale = await getLocale();
  try {
    await auth.api.signOut({ headers: await reqHeaders() });
  } catch {
    // already signed out
  }
  redirect({ href: "/", locale });
}

// ---- Account security (settings) ----

export async function changePasswordAction(_prev: FormState, form: FormData): Promise<FormState> {
  const current = String(form.get("current") ?? "");
  const next = String(form.get("password") ?? "");
  const revokeOthers = form.get("revokeOthers") !== "off"; // D-072: on by default
  if (!current) return { fieldErrors: { current: "required" } };
  if (passwordMissing(next).length || next.length > PASSWORD_MAX) {
    return { fieldErrors: { password: "policy" } };
  }
  const locale = await getLocale();
  try {
    const session = await auth.api.getSession({ headers: await reqHeaders() });
    await auth.api.changePassword({
      body: { currentPassword: current, newPassword: next, revokeOtherSessions: revokeOthers },
      headers: await reqHeaders(),
    });
    await audit({
      actorType: "member",
      actorId: session?.user.id,
      action: "auth.password.changed",
      metadata: { revokedOtherSessions: revokeOthers },
    });
  } catch (error) {
    const mapped = mapError(error);
    if (mapped.error === "badCredentials") return { fieldErrors: { current: "wrongPassword" } };
    return mapped;
  }
  // Better Auth re-issues the session (new cookie) and revokes the old one. A redirect makes the
  // browser load the page with the new cookie instead of re-rendering with the revoked one.
  redirect({ href: { pathname: "/settings/security", query: { changed: "1" } }, locale });
  return { ok: true };
}

export async function revokeSessionAction(_prev: FormState, form: FormData): Promise<FormState> {
  const token = String(form.get("token") ?? "");
  const all = form.get("all") === "1";
  try {
    const h = await reqHeaders();
    const session = await auth.api.getSession({ headers: h });
    if (all) await auth.api.revokeOtherSessions({ headers: h });
    else if (token) await auth.api.revokeSession({ body: { token }, headers: h });
    await audit({
      actorType: "member",
      actorId: session?.user.id,
      action: all ? "auth.sessions.revoked_others" : "auth.session.revoked",
    });
  } catch (error) {
    return mapError(error);
  }
  return { ok: true, values: { all: all ? "1" : "0" } };
}

export async function changeEmailAction(_prev: FormState, form: FormData): Promise<FormState> {
  const parsed = emailSchema.safeParse(form.get("email"));
  if (!parsed.success) return { fieldErrors: { email: "emailInvalid" } };
  const locale = await getLocale();
  try {
    await auth.api.changeEmail({
      body: {
        newEmail: parsed.data,
        callbackURL: `${env().APP_URL}${locale === "hr" ? "" : `/${locale}`}/verified`,
      },
      headers: await reqHeaders(),
    });
  } catch (error) {
    const mapped = mapError(error);
    if (mapped.fieldErrors?.email) return mapped;
    return mapped;
  }
  return { ok: true };
}

// ---- Two-factor (TOTP with recovery codes) ----

export type TwoFactorState = FormState & {
  qrSvg?: string; // the TOTP URI as a QR code (SVG), rendered server-side
  secret?: string; // the Base32 key for manual entry
  backupCodes?: string[];
  step?: "verify" | "codes";
};

export async function enableTwoFactorAction(
  _prev: TwoFactorState,
  form: FormData,
): Promise<TwoFactorState> {
  const password = String(form.get("password") ?? "");
  if (!password) return { fieldErrors: { password: "required" } };
  try {
    const res = await auth.api.enableTwoFactor({
      body: { password, method: "totp", issuer: "GrooveRift" },
      headers: await reqHeaders(),
    });
    if (res.method !== "totp") return { error: "generic" };
    const qrSvg = await QRCode.toString(res.totpURI, {
      type: "svg",
      margin: 0,
      errorCorrectionLevel: "M",
    });
    const secret = new URL(res.totpURI).searchParams.get("secret") ?? "";
    return { step: "verify", qrSvg, secret, backupCodes: res.backupCodes };
  } catch (error) {
    const mapped = mapError(error);
    if (mapped.error === "badCredentials") return { fieldErrors: { password: "wrongPassword" } };
    return mapped;
  }
}

export async function verifyTwoFactorSetupAction(
  prev: TwoFactorState,
  form: FormData,
): Promise<TwoFactorState> {
  const code = strip(form.get("code"));
  if (!/^\d{6}$/.test(code)) return { ...prev, fieldErrors: { code: "badCode" } };
  const locale = await getLocale();
  try {
    const h = await reqHeaders();
    const session = await auth.api.getSession({ headers: h });
    await auth.api.verifyTOTP({ body: { code, trustDevice: false }, headers: h });
    await audit({
      actorType: "member",
      actorId: session?.user.id,
      action: "auth.two_factor.enabled",
    });
  } catch (error) {
    return { ...prev, ...mapError(error) };
  }
  // Verification signs the member in again (new session cookie), so the page is reloaded through a
  // redirect. A short-lived marker lets the security page show the recovery codes once; the
  // "I saved the codes" button clears it.
  (await cookies()).set(SETUP_DONE_COOKIE, "1", {
    httpOnly: true,
    sameSite: "lax",
    secure: env().NODE_ENV === "production",
    path: "/",
    maxAge: 120,
  });
  redirect({ href: { pathname: "/settings/security", query: { setup: "done" } }, locale });
  return { ok: true };
}

export async function acknowledgeBackupCodesAction(): Promise<void> {
  const locale = await getLocale();
  (await cookies()).delete(SETUP_DONE_COOKIE);
  redirect({ href: "/settings/security", locale });
}

export async function disableTwoFactorAction(_prev: FormState, form: FormData): Promise<FormState> {
  const password = String(form.get("password") ?? "");
  if (!password) return { fieldErrors: { password: "required" } };
  try {
    const h = await reqHeaders();
    const session = await auth.api.getSession({ headers: h });
    await auth.api.disableTwoFactor({ body: { password }, headers: h });
    await audit({
      actorType: "member",
      actorId: session?.user.id,
      action: "auth.two_factor.disabled",
    });
  } catch (error) {
    const mapped = mapError(error);
    if (mapped.error === "badCredentials") return { fieldErrors: { password: "wrongPassword" } };
    return mapped;
  }
  return { ok: true };
}

export async function regenerateBackupCodesAction(
  _prev: TwoFactorState,
  form: FormData,
): Promise<TwoFactorState> {
  const password = String(form.get("password") ?? "");
  if (!password) return { fieldErrors: { password: "required" } };
  try {
    const h = await reqHeaders();
    const session = await auth.api.getSession({ headers: h });
    const res = await auth.api.generateBackupCodes({ body: { password }, headers: h });
    await audit({
      actorType: "member",
      actorId: session?.user.id,
      action: "auth.two_factor.backup_codes_regenerated",
    });
    return { step: "codes", backupCodes: res.backupCodes, ok: true };
  } catch (error) {
    const mapped = mapError(error);
    if (mapped.error === "badCredentials") return { fieldErrors: { password: "wrongPassword" } };
    return mapped;
  }
}
