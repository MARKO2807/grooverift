import type { BetterAuthPlugin } from "better-auth";
import { APIError } from "better-auth/api";
import { isPasswordCompromised } from "better-auth/plugins/haveibeenpwned";
import { getCurrentAuthEndpointContext } from "@better-auth/core/context";
import { audit } from "@/lib/audit";

// Breached-password check (D-054): Have I Been Pwned range API, k-anonymity (5-char SHA-1 prefix,
// Add-Padding). Unlike the stock plugin this one FAILS OPEN: if the service cannot be reached the
// password is accepted and an audit event records that the check was skipped, so the next sign-in
// can re-check (D-054). A compromised password is rejected with the code PASSWORD_COMPROMISED.
const PATHS = ["/sign-up/email", "/change-password", "/reset-password", "/admin/set-user-password"];

export const breachedPasswordCheck = (): BetterAuthPlugin => ({
  id: "grooverift-breached-password",
  init(ctx) {
    const originalHash = ctx.password.hash;
    return {
      context: {
        password: {
          ...ctx.password,
          async hash(password: string) {
            const c = getCurrentAuthEndpointContext();
            if (!c.path || !PATHS.includes(c.path)) return originalHash(password);
            let compromised = false;
            try {
              compromised = await isPasswordCompromised(password);
            } catch (error) {
              await audit({
                actorType: "system",
                action: "auth.breach_check.skipped",
                metadata: {
                  path: c.path,
                  reason: error instanceof Error ? error.message : "unknown",
                },
              });
              return originalHash(password);
            }
            if (compromised) {
              throw APIError.from("BAD_REQUEST", {
                code: "PASSWORD_COMPROMISED",
                message: "The password appears in a known data breach. Choose a different one.",
              });
            }
            return originalHash(password);
          },
        },
      },
    };
  },
});
