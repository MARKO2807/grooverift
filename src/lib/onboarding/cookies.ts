import "server-only";
import { cookies } from "next/headers";
import { env } from "@/lib/env";
import { ADULT_COOKIE, INVITE_COOKIE } from "./constants";

// The two short-lived cookies of the pre-account steps (U-05, J1). The invite token leaves the URL on the first
// request (/invite/<token> → /join) and lives here, httpOnly, until the account exists. The 18+ answer is a flag
// that only "yes" sets (J1 E5: nothing is stored about someone who answers "no").
export { ADULT_COOKIE, INVITE_COOKIE, INVITE_COOKIE_MAX_AGE } from "./constants";

export function cookieOptions(maxAge?: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: env().NODE_ENV === "production",
    path: "/",
    ...(maxAge ? { maxAge } : {}),
  };
}

export async function inviteTokenFromCookies(): Promise<string | null> {
  return (await cookies()).get(INVITE_COOKIE)?.value ?? null;
}

export async function adultConfirmed(): Promise<boolean> {
  return (await cookies()).get(ADULT_COOKIE)?.value === "1";
}

export async function clearJoinCookies(): Promise<void> {
  const jar = await cookies();
  jar.delete(INVITE_COOKIE);
  jar.delete(ADULT_COOKIE);
}
