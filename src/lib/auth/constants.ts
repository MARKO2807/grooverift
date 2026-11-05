import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "@/lib/env";

// Shared names and helpers (a "use server" module may export only async functions, so they live here).
export const SETUP_DONE_COOKIE = "gr_2fa_setup";
const SETUP_MARKER_MS = 120_000;

/** `<expires>.<hmac>` bound to the session token: only the session that finished the two-factor
 *  setup can read its recovery codes, and only for two minutes. */
export function signSetupMarker(sessionToken: string, now = Date.now()): string {
  const expires = String(now + SETUP_MARKER_MS);
  const mac = createHmac("sha256", env().BETTER_AUTH_SECRET)
    .update(`2fa-setup:${sessionToken}:${expires}`)
    .digest("base64url");
  return `${expires}.${mac}`;
}

export function verifySetupMarker(
  value: string | undefined,
  sessionToken: string,
  now = Date.now(),
) {
  if (!value) return false;
  const [expires, mac] = value.split(".");
  if (!expires || !mac || Number(expires) < now) return false;
  const expected = createHmac("sha256", env().BETTER_AUTH_SECRET)
    .update(`2fa-setup:${sessionToken}:${expires}`)
    .digest("base64url");
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
