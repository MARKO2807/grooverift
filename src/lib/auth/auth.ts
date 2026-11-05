import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { nextCookies } from "better-auth/next-js";
import { admin, twoFactor } from "better-auth/plugins";
import { db } from "@/lib/db/client";
import * as schema from "@/lib/db/schema";
import { env } from "@/lib/env";
import { audit } from "@/lib/audit";
import { breachedPasswordCheck } from "./breached";
import { sendMail } from "./email";
import { clearAccountLock, lockoutAfter, lockoutBefore } from "./lockout";
import { hashPassword, PASSWORD_MAX, PASSWORD_MIN, verifyPassword } from "./password";
import { roles, ac } from "./roles";

const e = env();

export const auth = betterAuth({
  appName: "GrooveRift",
  baseURL: e.APP_URL,
  secret: e.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db(), { provider: "pg", schema }),
  trustedOrigins: [e.APP_URL],

  emailAndPassword: {
    enabled: true,
    minPasswordLength: PASSWORD_MIN, // D-061; the composition rules are checked by the sign-up action
    maxPasswordLength: PASSWORD_MAX,
    requireEmailVerification: true,
    autoSignIn: false,
    password: { hash: hashPassword, verify: verifyPassword }, // Argon2id (R-14)
    resetPasswordTokenExpiresIn: 60 * 30, // 30 minutes (RESET_MIN in the prototype)
    revokeSessionsOnPasswordReset: true, // D-072
    sendResetPassword: async ({ user, url }) => {
      void sendMail({
        to: user.email,
        subject: "GrooveRift: nova lozinka / new password",
        text: `Postavi novu lozinku (vrijedi 30 minuta) / Set a new password (valid 30 minutes):\n${url}\n\nAko ovo nisi zatražio/la, zanemari poruku. / If you did not ask for this, ignore this message.`,
      });
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
      void sendMail({
        to: user.email,
        subject: "GrooveRift: potvrdi adresu / confirm your address",
        text: `Potvrdi svoju e-mail adresu / Confirm your email address:\n${url}\n\nPoveznica vrijedi 24 sata. / The link is valid for 24 hours.`,
      });
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
      // Link a Google identity to an existing email only when Google verified it (S-09).
      enabled: true,
      trustedProviders: ["google"],
      allowDifferentEmails: false,
    },
  },

  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days
    updateAge: 60 * 60 * 24, // refresh once a day
    freshAge: 60 * 15, // sensitive actions need a sign-in within 15 minutes
    cookieCache: { enabled: true, maxAge: 60 * 5 },
  },

  user: {
    additionalFields: {
      locale: { type: "string", required: false, defaultValue: "hr", input: true },
    },
    changeEmail: {
      enabled: true,
      // R-16 / D-072: the change is confirmed from the current address first (this message),
      // then Better Auth sends the verification link to the new address (emailVerification above).
      sendChangeEmailConfirmation: async ({ user, newEmail, url }) => {
        void sendMail({
          to: user.email,
          subject: "GrooveRift: potvrdi promjenu adrese / confirm the address change",
          text: `Zatražena je promjena adrese tvog računa na ${newEmail}. Ako si to ti, potvrdi:\n${url}\n\nAko to nisi ti, zanemari poruku i promijeni lozinku. / A change of your account address to ${newEmail} was requested. If that was you, confirm with the link above; if not, ignore this message and change your password.`,
        });
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
      "/sign-in/email": { window: 60, max: 10 },
      "/sign-up/email": { window: 600, max: 5 },
      "/request-password-reset": { window: 600, max: 5 },
      "/send-verification-email": { window: 600, max: 5 },
      "/two-factor/verify-totp": { window: 60, max: 5 },
      "/two-factor/verify-backup-code": { window: 60, max: 5 },
      "/get-session": false,
    },
  },

  advanced: {
    database: { generateId: "uuid" },
    useSecureCookies: e.NODE_ENV === "production",
    ipAddress: {
      ipAddressHeaders: e.IP_HEADERS.split(",")
        .map((h) => h.trim().toLowerCase())
        .filter(Boolean),
    },
  },

  hooks: {
    before: lockoutBefore,
    after: lockoutAfter,
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
        },
      },
    },
    user: {
      create: {
        after: async (user) => {
          await audit({ actorType: "member", actorId: user.id, action: "auth.user.created" });
        },
      },
    },
  },

  plugins: [
    breachedPasswordCheck(),
    twoFactor({
      issuer: "GrooveRift",
      totpOptions: { digits: 6, period: 30 },
      backupCodeOptions: { amount: 10, length: 10, storeBackupCodes: "encrypted" },
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
