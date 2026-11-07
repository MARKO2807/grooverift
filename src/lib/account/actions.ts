"use server";

import { headers } from "next/headers";
import { after } from "next/server";
import { getLocale } from "next-intl/server";
import { APIError } from "better-auth/api";
import { revalidatePath } from "next/cache";
import { redirect } from "@/i18n/navigation";
import { audit } from "@/lib/audit";
import { auth } from "@/lib/auth/auth";
import { sendMailInBackground } from "@/lib/auth/email";
import { getSession, roleOf } from "@/lib/auth/session";
import {
  accountFacts,
  deactivateAccount,
  signOutEverywhere,
  pendingDeletion,
  requestDeletion,
  restoreAccount,
} from "@/lib/data/account";
import { logDbError } from "@/lib/data/db-errors";
import { buildExport, requestExport } from "@/lib/data/export";
import { loadViewer } from "@/lib/data/facts";
import { createFeedback } from "@/lib/data/feedback";
import { processScreenshot } from "@/lib/media/process";
import { fileBytes } from "@/lib/media/upload";
import { consume } from "@/lib/data/rate-limit";
import {
  isLocale,
  isTimeZone,
  saveInterfaceLanguage,
  saveReadingLanguagesSetting,
  saveTimeZone,
  setReduceMotion,
} from "@/lib/data/settings";
import { env } from "@/lib/env";
import { exportViewFor, type ExportView } from "./export-view";
import { FEEDBACK_MAX, isDeleteChoice, isFeedbackKind, isFreshSignIn } from "./rules";

// Server actions for SET-01, SET-07, SET-09 and SET-12 (step 5.10). The member always comes from the session with
// fresh facts (loadViewer), never from the client. Deactivation and deletion need the password again (D-063 (9));
// a Google-only account confirms with a sign-in younger than 15 minutes instead. Failures are reason keys for
// the components, never exception text.

// i18n-keys: account.error.signedOut account.error.notAllowed account.error.tooMany account.error.generic
// i18n-keys: account.error.wrongPassword account.error.required account.error.staff account.error.state
// i18n-keys: account.error.reauth account.error.invalid

export type AccountFailure =
  | "signedOut"
  | "notAllowed"
  | "tooMany"
  | "generic"
  | "wrongPassword"
  | "required"
  | "staff"
  | "state"
  | "reauth"
  | "invalid"
  | "image";
export type AccountResult = { ok: true } | { ok: false; reason: AccountFailure };

/** The signed-in member with fresh facts; `allowPending` lets the grace-period screen through. */
async function current(opts: { allowPending?: boolean } = {}) {
  const session = await getSession();
  if (!session) return null;
  const viewer = await loadViewer({ id: session.user.id, role: roleOf(session) });
  const okStatus =
    viewer.status === "active" || (opts.allowPending && viewer.status === "pending_deletion");
  if (!viewer.id || !okStatus) return null;
  return { session, viewer: { ...viewer, id: viewer.id } };
}

async function guarded<T>(where: string, run: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await run();
  } catch (e) {
    // redirect() throws on purpose; let it through.
    if (e && typeof e === "object" && "digest" in e) throw e;
    logDbError(where, e);
    return fallback;
  }
}

// ============================================================ SET-09: data copy

/** "Preuzmi kopiju": asks for a copy and builds it right after the response; the worker's sweep catches leftovers. */
export async function requestExportAction(): Promise<
  { ok: true; view: ExportView } | { ok: false; reason: AccountFailure }
> {
  return guarded(
    "requestExportAction",
    async () => {
      const me = await current({ allowPending: true });
      if (!me) return { ok: false, reason: "signedOut" } as const;
      const r = await requestExport(me.viewer.id);
      if (!r.ok)
        return { ok: false, reason: r.reason === "too-many" ? "tooMany" : "generic" } as const;
      after(async () => {
        try {
          await buildExport(r.id);
        } catch (e) {
          logDbError("buildExport(after)", e);
        }
      });
      return { ok: true, view: await exportViewFor(me.viewer.id) } as const;
    },
    { ok: false, reason: "generic" } as const,
  );
}

/** The copy step polls this while the copy is being made. */
export async function exportStatusAction(): Promise<ExportView | null> {
  return guarded(
    "exportStatusAction",
    async () => {
      const me = await current({ allowPending: true });
      if (!me) return null;
      if (!(await consume("dropPoll", me.viewer.id)).allowed) return null;
      return exportViewFor(me.viewer.id);
    },
    null,
  );
}

// ============================================================ SET-09: deactivate or delete

/**
 * The password confirmation (D-063 (9), D-070 (7)). A member with a password types it; a Google-only member
 * passes with a sign-in younger than FRESH_SIGN_IN_MINUTES (the page offers "Prijavi se ponovno" otherwise).
 */
async function confirmIdentity(
  userId: string,
  sessionCreatedAt: Date,
  password: string,
): Promise<AccountFailure | null> {
  const facts = await accountFacts(userId);
  if (!facts) return "generic";
  if (facts.isStaff) return "staff";
  if (!facts.hasPassword) return isFreshSignIn(sessionCreatedAt, new Date()) ? null : "reauth";
  if (!password) return "required";
  if (!(await consume("reauth", userId)).allowed) return "tooMany";
  try {
    await auth.api.verifyPassword({ body: { password }, headers: await headers() });
    return null;
  } catch (e) {
    if (!(e instanceof APIError)) throw e;
    // Review 5.10 L4: a stolen session must not become a password oracle. After a few wrong confirmations every
    // session of the account ends, so the next guess needs a full sign-in (and its D-077 lockout).
    if (!(await consume("reauthFail", userId)).allowed) {
      await signOutEverywhere(userId);
      await audit({ actorType: "member", actorId: userId, action: "account.reauth.locked" });
      return "signedOut";
    }
    return "wrongPassword";
  }
}

const dateOnly = (d: Date) => d.toISOString().slice(0, 10);

/** Ends the browser's cookie after the sessions are gone in the database. */
async function dropCookie() {
  try {
    await auth.api.signOut({ headers: await headers() });
  } catch {
    // the session row is already gone; the cookie is useless either way
  }
}

export async function closeAccountAction(input: {
  choice: unknown;
  password: unknown;
}): Promise<AccountResult> {
  const choice = input?.choice;
  const password = typeof input?.password === "string" ? input.password.slice(0, 200) : "";
  if (!isDeleteChoice(choice)) return { ok: false, reason: "invalid" };
  const locale = await getLocale();
  const result = await guarded<{ ok: true; date?: string } | { ok: false; reason: AccountFailure }>(
    "closeAccountAction",
    async () => {
      const me = await current();
      if (!me) return { ok: false, reason: "signedOut" };
      const failure = await confirmIdentity(me.viewer.id, me.session.session.createdAt, password);
      if (failure) {
        if (failure === "wrongPassword")
          await audit({
            actorType: "member",
            actorId: me.viewer.id,
            action: "account.reauth.failed",
          });
        return { ok: false, reason: failure };
      }
      if (choice === "deactivate") {
        const r = await deactivateAccount(me.viewer.id);
        if (!r.ok) return { ok: false, reason: r.reason === "generic" ? "generic" : r.reason };
        await dropCookie();
        return { ok: true };
      }
      const email = me.session.user.email;
      const r = await requestDeletion(me.viewer.id);
      if (!r.ok || !r.scheduledFor)
        return { ok: false, reason: !r.ok && r.reason !== "generic" ? r.reason : "generic" };
      await dropCookie();
      const day = r.scheduledFor.toLocaleDateString("hr-HR", { timeZone: "UTC" });
      const dayEn = r.scheduledFor.toLocaleDateString("en-GB", {
        timeZone: "UTC",
        day: "numeric",
        month: "long",
        year: "numeric",
      });
      sendMailInBackground(
        {
          to: email,
          subject: "GrooveRift: brisanje računa je zakazano / account deletion scheduled",
          text: `Tvoj račun je skriven i bit će izbrisan ${day}. Ako se predomisliš, prijavi se prije tog datuma i odaberi „Vrati račun”:\n${env().APP_URL}/sign-in\n\nYour account is hidden and will be deleted on ${dayEn}. If you change your mind, sign in before then and choose "Restore account":\n${env().APP_URL}/en/sign-in\n\nAko to nisi ti, odmah se prijavi, vrati račun i promijeni lozinku. / If this was not you, sign in, restore the account and change your password.`,
        },
        "deletion-scheduled",
      );
      return { ok: true, date: dateOnly(r.scheduledFor) };
    },
    { ok: false, reason: "generic" },
  );
  if (!result.ok) return result;
  redirect({
    href:
      choice === "deactivate"
        ? { pathname: "/account-closed", query: { k: "deactivated" } }
        : { pathname: "/account-closed", query: { k: "deleted", d: result.date ?? "" } },
    locale,
  });
  return { ok: true };
}

/** "Prijavi se ponovno" for a Google-only member whose sign-in is older than 15 minutes. */
export async function reauthAction(): Promise<void> {
  const locale = await getLocale();
  await dropCookie();
  redirect({
    href: { pathname: "/sign-in", query: { returnTo: "/settings/data" } },
    locale,
  });
}

/** "Vrati račun" on the grace-period screen. */
export async function restoreAccountAction(): Promise<AccountResult> {
  const locale = await getLocale();
  const ok = await guarded(
    "restoreAccountAction",
    async () => {
      const me = await current({ allowPending: true });
      if (!me || me.viewer.status !== "pending_deletion") return false;
      if (!(await pendingDeletion(me.viewer.id))) return false;
      return restoreAccount(me.viewer.id);
    },
    false,
  );
  if (!ok) return { ok: false, reason: "state" };
  redirect({ href: { pathname: "/home", query: { restored: "1" } }, locale });
  return { ok: true };
}

// ============================================================ SET-07 and Pristupačnost

async function settingsMember() {
  const me = await current();
  if (!me || me.viewer.onboarded === false) return null;
  if (!(await consume("settings", me.viewer.id)).allowed) return "tooMany" as const;
  return me;
}

export async function setLanguageAction(value: unknown): Promise<AccountResult> {
  if (!isLocale(value)) return { ok: false, reason: "invalid" };
  return guarded<AccountResult>(
    "setLanguageAction",
    async () => {
      const me = await settingsMember();
      if (!me) return { ok: false, reason: "signedOut" } as const;
      if (me === "tooMany") return { ok: false, reason: "tooMany" } as const;
      await saveInterfaceLanguage(me.viewer.id, value);
      return { ok: true } as const;
    },
    { ok: false, reason: "generic" } as const,
  );
}

export async function setReadingLanguagesAction(values: unknown): Promise<AccountResult> {
  const langs = Array.isArray(values)
    ? values.filter((v): v is string => typeof v === "string")
    : [];
  return guarded<AccountResult>(
    "setReadingLanguagesAction",
    async () => {
      const me = await settingsMember();
      if (!me) return { ok: false, reason: "signedOut" } as const;
      if (me === "tooMany") return { ok: false, reason: "tooMany" } as const;
      await saveReadingLanguagesSetting(me.viewer.id, langs);
      return { ok: true } as const;
    },
    { ok: false, reason: "generic" } as const,
  );
}

export async function setTimeZoneAction(value: unknown): Promise<AccountResult> {
  if (!isTimeZone(value)) return { ok: false, reason: "invalid" };
  return guarded<AccountResult>(
    "setTimeZoneAction",
    async () => {
      const me = await settingsMember();
      if (!me) return { ok: false, reason: "signedOut" } as const;
      if (me === "tooMany") return { ok: false, reason: "tooMany" } as const;
      await saveTimeZone(me.viewer.id, value);
      return { ok: true } as const;
    },
    { ok: false, reason: "generic" } as const,
  );
}

export async function setReduceMotionAction(on: unknown): Promise<AccountResult> {
  if (typeof on !== "boolean") return { ok: false, reason: "invalid" };
  const r = await guarded<AccountResult>(
    "setReduceMotionAction",
    async () => {
      const me = await settingsMember();
      if (!me) return { ok: false, reason: "signedOut" } as const;
      if (me === "tooMany") return { ok: false, reason: "tooMany" } as const;
      await setReduceMotion(me.viewer.id, on);
      return { ok: true } as const;
    },
    { ok: false, reason: "generic" } as const,
  );
  // The root layout reads the setting into <html data-motion>; refresh every page that rendered it.
  if (r.ok) revalidatePath("/", "layout");
  return r;
}

// ============================================================ SET-02: Google sign-in

export async function linkGoogleAction(): Promise<void> {
  const locale = await getLocale();
  const me = await current();
  const e = env();
  if (!me || !e.GOOGLE_CLIENT_ID) {
    redirect({ href: "/settings/account", locale });
    return;
  }
  const prefix = locale === "hr" ? "" : `/${locale}`;
  const res = await auth.api.linkSocialAccount({
    body: {
      provider: "google",
      callbackURL: `${e.APP_URL}${prefix}/settings/account?linked=1`,
      errorCallbackURL: `${e.APP_URL}${prefix}/settings/account?linked=0`,
    },
    headers: await headers(),
  });
  await audit({ actorType: "member", actorId: me.viewer.id, action: "auth.google.link.started" });
  redirect({ href: res.url, locale });
}

/** Unlinking is allowed only while a password remains, so the member never loses every way in. */
export async function unlinkGoogleAction(): Promise<AccountResult> {
  return guarded<AccountResult>(
    "unlinkGoogleAction",
    async () => {
      const me = await current();
      if (!me) return { ok: false, reason: "signedOut" } as const;
      const facts = await accountFacts(me.viewer.id);
      if (!facts?.googleAccountId) return { ok: false, reason: "state" } as const;
      if (!facts.hasPassword) return { ok: false, reason: "notAllowed" } as const;
      await auth.api.unlinkAccount({
        body: { accountId: facts.googleAccountId },
        headers: await headers(),
      });
      await audit({ actorType: "member", actorId: me.viewer.id, action: "auth.google.unlinked" });
      revalidatePath("/[locale]/settings/account", "page");
      return { ok: true } as const;
    },
    { ok: false, reason: "generic" } as const,
  );
}

// ============================================================ SET-12: feedback

export async function sendFeedbackAction(
  input: {
    kind: unknown;
    text: unknown;
    context: unknown;
    replyByEmail: unknown;
  },
  /** Step 5.11 (D-078): the optional screenshot as "screenshot" in a FormData (files cannot travel in plain objects). */
  files?: FormData,
): Promise<AccountResult> {
  const text = typeof input?.text === "string" ? input.text : "";
  if (!isFeedbackKind(input?.kind)) return { ok: false, reason: "required" };
  if (!text.trim()) return { ok: false, reason: "required" };
  if (text.trim().length > FEEDBACK_MAX) return { ok: false, reason: "invalid" };
  const locale = await getLocale();
  const kind = input.kind;
  return guarded<AccountResult>(
    "sendFeedbackAction",
    async () => {
      const me = await current();
      if (!me) return { ok: false, reason: "signedOut" } as const;
      let screenshot = null;
      const file = files instanceof FormData ? files.get("screenshot") : null;
      if (file instanceof File && file.size > 0) {
        if (!(await consume("upload", me.viewer.id)).allowed)
          return { ok: false, reason: "tooMany" } as const;
        const bytes = await fileBytes(file);
        if (typeof bytes === "string") return { ok: false, reason: "image" } as const;
        const processed = await processScreenshot(bytes);
        if (!processed.ok) return { ok: false, reason: "image" } as const;
        screenshot = processed.image;
      }
      const r = await createFeedback(me.viewer.id, {
        kind,
        text,
        context: input.context,
        replyByEmail: input.replyByEmail === true,
        locale,
        screenshot,
      });
      if (!r.ok)
        return { ok: false, reason: r.reason === "too-many" ? "tooMany" : "invalid" } as const;
      return { ok: true } as const;
    },
    { ok: false, reason: "generic" } as const,
  );
}
