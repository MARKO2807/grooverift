import { APIError, createAuthMiddleware, getSessionFromCtx } from "better-auth/api";
import { audit } from "@/lib/audit";
import { isEnabled } from "@/lib/flags";
import { locales } from "@/i18n/routing";
import { lockoutAfter, lockoutBefore } from "./lockout";
import { passwordMissing, PASSWORD_MAX } from "./password-policy";

// Better Auth takes ONE before and ONE after middleware; these compose the project's rules so that
// the public API routes enforce them too, not only the server actions (security review M1, M4):
// - D-061 password policy on every endpoint that sets a password
// - sign-up only while the `sign_up` flag is on and with the 18+ confirmation (D-051)
// - `locale` limited to the supported locales
// - Better Auth's admin endpoints need a second factor, and only the ones a screen uses are open;
//   every admin call is audited
// - the D-077 lockout

const PASSWORD_PATHS: Record<string, "password" | "newPassword"> = {
  "/sign-up/email": "password",
  "/change-password": "newPassword",
  "/reset-password": "newPassword",
  "/admin/set-user-password": "newPassword",
};

/** Admin endpoints a screen actually uses; everything else answers 404 until a screen needs it. */
const OPEN_ADMIN_PATHS = new Set(["/admin/set-role", "/admin/has-permission"]);

type HookCtx = Parameters<Parameters<typeof createAuthMiddleware>[0]>[0];
const body = (ctx: HookCtx) => (ctx.body ?? {}) as Record<string, unknown>;

export const beforeHook = createAuthMiddleware(async (ctx) => {
  // 1. Password policy wherever a password is set.
  const field = PASSWORD_PATHS[ctx.path];
  if (field) {
    const password = body(ctx)[field];
    if (
      typeof password !== "string" ||
      password.length > PASSWORD_MAX ||
      passwordMissing(password).length
    ) {
      throw new APIError("BAD_REQUEST", {
        code: "PASSWORD_POLICY",
        message:
          "The password needs 12 to 128 characters with an upper-case and a lower-case letter and a special character.",
      });
    }
  }

  // 2. Sign-up gate and the 18+ confirmation.
  if (ctx.path === "/sign-up/email") {
    if (!(await isEnabled("sign_up", { role: "member" }))) {
      throw new APIError("FORBIDDEN", { code: "SIGN_UP_CLOSED", message: "Sign-up is closed." });
    }
    if (body(ctx).age18 !== true) {
      throw new APIError("BAD_REQUEST", {
        code: "AGE_18_REQUIRED",
        message: "Confirm that you are 18 or older.",
      });
    }
  }

  // 3. Locale is a supported locale.
  if (ctx.path === "/sign-up/email" || ctx.path === "/update-user") {
    const locale = body(ctx).locale;
    if (locale !== undefined && !(locales as readonly string[]).includes(String(locale))) {
      throw new APIError("BAD_REQUEST", { code: "LOCALE_INVALID", message: "Unsupported locale." });
    }
  }

  // 4. Admin endpoints: second factor required, and only the endpoints a screen uses.
  if (ctx.path.startsWith("/admin/")) {
    if (!OPEN_ADMIN_PATHS.has(ctx.path)) {
      throw new APIError("NOT_FOUND", { code: "ADMIN_ENDPOINT_CLOSED", message: "Not found." });
    }
    const session = await getSessionFromCtx(ctx);
    if (!session?.user.twoFactorEnabled) {
      throw new APIError("FORBIDDEN", {
        code: "TWO_FACTOR_REQUIRED",
        message: "Staff actions need two-step verification.",
      });
    }
  }

  // 5. Lockout.
  await lockoutBefore(ctx as never);
});

export const afterHook = createAuthMiddleware(async (ctx) => {
  await lockoutAfter(ctx as never);

  if (ctx.path.startsWith("/admin/")) {
    const session = ctx.context.session ?? (await getSessionFromCtx(ctx));
    const failed = ctx.context.returned instanceof APIError;
    await audit({
      actorType: "staff",
      actorId: session?.user.id ?? null,
      action: `admin.api${ctx.path.replaceAll("/", ".")}${failed ? ".failed" : ""}`,
      targetType: "user",
      targetId: typeof body(ctx).userId === "string" ? (body(ctx).userId as string) : null,
    });
  }
});
