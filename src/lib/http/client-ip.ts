import { getIP } from "better-auth/api";
import { env, listFromEnv } from "@/lib/env";

/**
 * The client IP for our own rate limits (DSA notices). It uses Better Auth's resolver with the same settings as
 * `auth.ts`, so the sign-in limiter, the lockout and these limits always agree on one address.
 *
 * On Render, IP_HEADERS is `true-client-ip`: Cloudflare in front of Render overwrites it with the connecting
 * client. X-Forwarded-For is NOT usable there: Render appends to a client-supplied value instead of replacing
 * it (review 5.2 M6, verified on staging 2026-11-06). The resolver trusts a forwarded list only through
 * TRUSTED_PROXIES and otherwise refuses it, so a forged list never selects the address.
 * No resolvable address → "unknown" (one shared bucket: stricter, never looser). Locally → "127.0.0.1".
 */
export function clientIp(headers: Headers): string {
  const e = env();
  return (
    getIP(headers, {
      advanced: {
        ipAddress: {
          ipAddressHeaders: listFromEnv(e.IP_HEADERS),
          trustedProxies: listFromEnv(e.TRUSTED_PROXIES),
        },
      },
    }) ?? "unknown"
  );
}
