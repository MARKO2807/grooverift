import { betterAuth } from "better-auth";
import { APIError } from "better-auth/api";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { nextCookies } from "better-auth/next-js";
import { admin, twoFactor } from "better-auth/plugins";
import { db } from "@/lib/db/client";
import * as schema from "@/lib/db/schema";
import { env, listFromEnv } from "@/lib/env";
import { audit } from "@/lib/audit";
import { reactivateOnSignIn } from "@/lib/data/account";
import { acceptInvitation, invitationByToken, invitationMatches } from "@/lib/data/invitations";
import { INVITE_COOKIE } from "@/lib/onboarding/constants";
import { breachedPasswordCheck } from "./breached";
import { sendMailInBackground } from "./email";
import { clearAccountLock } from "./lockout";
import { afterHook, beforeHook } from "./hooks";
import { hashPassword, PASSWORD_MAX, PASSWORD_MIN, verifyPassword } from "./password";
import { roles, ac } from "./roles";
import { generateRecoveryCodes } from "./recovery-codes";

const e = env();
// The end-to-end suite creates many accounts from one address; only its explicit flag relaxes the limits.
const limitScale = e.E2E_EMAIL_FILE === "1" ? 20 : 1; // 20 since 5.5: the suite creates about 40 accounts in 10 minutes

export const auth = betterAuth({
  appName: "GrooveRift",
  baseURL: e.APP_URL,
  secret: e.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db(), { provider: "pg", schema }),
  trustedOrigins: [e.APP_URL],

  emailAndPassword: {
    enabled: true,
    minPasswordLength: PASSWORD_MIN, // D-061; the composition rules are enforced in hooks.ts on every endpoint
    maxPasswordLength: PASSWORD_MAX,
    requireEmailVerification: true,
    autoSignIn: false,
    password: { hash: hashPassword, verify: verifyPassword }, // Argon2id (R-14)
    resetPasswordTokenExpiresIn: 60 * 30, // 30 minutes (RESET_MIN in the prototype)
    revokeSessionsOnPasswordReset: true, // D-072
    sendResetPassword: async ({ user, url }) => {
      sendMailInBackground(
        {
          to: user.email,
          subject: "GrooveRift: nova lozinka / new password",
          text: `Postavi novu lozinku (vrijedi 30 minuta) / Set a new password (valid 30 minutes):\n${url}\n\nAko zahtjev nije od tebe, zanemari poruku. / If you did not ask for this, ignore this message.`,
        },
        "reset",
      );
    },
    onPasswordReset: async ({ user }) => {
      await clearAccountLock(user.email);
      await audit({ actorType: "member", actorId: user.id, action: "auth.password.reset" });
    },
  },

  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: false,
    expiresIn: 60 * 60 * 24,
    sendVerificationEmail: async ({ user, url }) => {
      // JO6 (D-093 (5)): an account made from an email-bound invitation is verified at once (the database hook
      // below sets it), so no verification mail goes out for it. Email changes still verify the new address.
      if (user.emailVerified) return;
      sendMailInBackground(
        {
          to: user.email,
          subject: "GrooveRift: potvrdi adresu / confirm your address",
          text: `Potvrdi svoju e-mail adresu / Confirm your email address:\n${url}\n\nPoveznica vrijedi 24 sata. / The link is valid for 24 hours.`,
        },
        "verify",
      );
    },
  },

  socialProviders:
    e.GOOGLE_CLIENT_ID && e.GOOGLE_CLIENT_SECRET
      ? {
          google: {
            clientId: e.GOOGLE_CLIENT_ID,
            clientSecret: e.GOOGLE_CLIENT_SECRET,
            prompt: "select_account",
          },
        }
      : {},

  account: {
    accountLinking: {
      // Link a Google identity to an existing account only when Google verified the email (S-09):
      // no trustedProviders, so Better Auth insists on emailVerified from Google.
      enabled: true,
      allowDifferentEmails: false,
    },
  },

  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days
    updateAge: 60 * 60 * 24, // refresh once a day
    freshAge: 60 * 15, // sensitive actions need a sign-in within 15 minutes
    // No cookie cache: a revoked session must stop working at once (D-072, step 4.6), so every
    // request reads the session from the database.
    cookieCache: { enabled: false },
  },

  user: {
    additionalFields: {
      // Validated against the supported locales in hooks.ts.
      locale: { type: "string", required: false, defaultValue: "hr", input: true },
      // Account status (policy AccountStatus); never set by the member through the auth API.
      status: { type: "string", required: false, defaultValue: "active", input: false },
    },
    changeEmail: {
      enabled: true,
      // R-16 / D-072: the change is confirmed from the current address first (this message),
      // then Better Auth sends the verification link to the new address (emailVerification above).
      sendChangeEmailConfirmation: async ({ user, newEmail, url }) => {
        sendMailInBackground(
          {
            to: user.email,
            subject: "GrooveRift: potvrdi promjenu adrese / confirm the address change",
            text: `Zatražena je promjena adrese tvog računa na ${newEmail}. Ako si to ti, potvrdi:\n${url}\n\nAko to nisi ti, zanemari poruku i promijeni lozinku. / A change of your account address to ${newEmail} was requested. If that was you, confirm with the link above; if not, ignore this message and change your password.`,
          },
          "change-email",
        );
      },
    },
    deleteUser: { enabled: false }, // the deletion workflow is a Phase 5 feature (grace period, D-070)
  },

  rateLimit: {
    enabled: true,
    storage: "database",
    window: 60,
    max: 60,
    customRules: {
      "/sign-in/email": { window: 60, max: 10 * limitScale },
      "/sign-up/email": { window: 600, max: 5 * limitScale },
      "/request-password-reset": { window: 600, max: 5 * limitScale },
      "/send-verification-email": { window: 600, max: 5 * limitScale },
      "/two-factor/verify-totp": { window: 60, max: 5 * limitScale },
      "/two-factor/verify-backup-code": { window: 60, max: 5 * limitScale },
      "/get-session": false,
    },
  },

  advanced: {
    database: { generateId: "uuid" },
    useSecureCookies: e.NODE_ENV === "production",
    ipAddress: {
      ipAddressHeaders: listFromEnv(e.IP_HEADERS),
      trustedProxies: listFromEnv(e.TRUSTED_PROXIES),
    },
  },

  hooks: {
    before: beforeHook,
    after: afterHook,
  },

  databaseHooks: {
    session: {
      create: {
        after: async (session) => {
          await audit({
            actorType: "member",
            actorId: session.userId,
            action: "auth.session.created",
            targetType: "session",
            targetId: session.id,
            ip: session.ipAddress,
            userAgent: session.userAgent,
          });
          // SET-09 (step 5.10): a completed sign-in brings a deactivated account back ("Kad se opet prijaviš,
          // sve se vraća"). A member in the deletion grace period is NOT restored here: memberPage shows them
          // the choice "Vrati račun" / "Odjavi se" first.
          await reactivateOnSignIn(session.userId);
        },
      },
    },
    user: {
      create: {
        // No account without a usable invitation for that very address (step 5.4, R-08), whichever endpoint
        // creates it: email sign-up (the before hook refused earlier) or a social callback, where this is the
        // only place that knows the provider's address (J1 E4: a Google account with another address is refused
        // with INVITE_EMAIL_MISMATCH, which the callback turns into ?error= on the account step).
        // JO6: accepting an email-bound invitation counts as email verification.
        before: async (data, context) => {
          const invite = await invitationMatches(context?.getCookie(INVITE_COOKIE), data.email);
          if (!invite.usable) {
            throw new APIError("FORBIDDEN", {
              code: context?.path?.startsWith("/callback/")
                ? "INVITE_EMAIL_MISMATCH"
                : "INVITE_REQUIRED",
              message: "An invitation for this address is required.",
            });
          }
          return { data: { ...data, emailVerified: true } };
        },
        after: async (user, context) => {
          await audit({ actorType: "member", actorId: user.id, action: "auth.user.created" });
          const invite = await invitationByToken(context?.getCookie(INVITE_COOKIE));
          if (invite.usable && (await acceptInvitation(invite.id, user.id))) {
            await audit({
              actorType: "member",
              actorId: user.id,
              action: "invite.accepted",
              targetType: "invitation",
              targetId: invite.id,
            });
          }
        },
      },
    },
  },

  plugins: [
    breachedPasswordCheck(),
    twoFactor({
      issuer: "GrooveRift",
      totpOptions: { digits: 6, period: 30 },
      backupCodeOptions: {
        amount: 10,
        storeBackupCodes: "encrypted",
        customBackupCodesGenerate: generateRecoveryCodes,
      },
      // Second-factor failures also lock (10 in a row → 15 min), on top of D-077 for passwords.
      accountLockout: { enabled: true, maxFailedAttempts: 10, durationSeconds: 15 * 60 },
      // No "remember this device" (D-076): the cookie lives only as long as the challenge.
      trustDeviceMaxAge: 0,
    }),
    admin({
      defaultRole: "member",
      adminRoles: ["admin"],
      ac,
      roles,
      allowImpersonatingAdmins: false,
    }),
    nextCookies(), // must stay last
  ],
});

export type Auth = typeof auth;
export type Session = Auth["$Infer"]["Session"];
