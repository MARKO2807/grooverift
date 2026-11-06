import { NextResponse, type NextRequest } from "next/server";
import { locales } from "@/i18n/routing";
import { env } from "@/lib/env";
import { INVITE_COOKIE, INVITE_COOKIE_MAX_AGE, cookieOptions } from "@/lib/onboarding/cookies";

export const dynamic = "force-dynamic";

/**
 * PUB-05, U-05: the emailed link. The token moves from the URL into an httpOnly cookie on this first request and
 * the browser is sent to the clean /join, which reads the cookie and answers with the invitation, the E3 pages or
 * the one neutral "cannot be used" page (J1 E1). Nothing is consumed here, so a link scanner's GET changes nothing.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ locale: string; token: string }> },
) {
  const { locale, token } = await params;
  const prefix =
    (locales as readonly string[]).includes(locale) && locale !== "hr" ? `/${locale}` : "";
  // APP_URL, not request.url: behind a proxy (Render) request.url carries the internal host (localhost:10000).
  const response = NextResponse.redirect(new URL(`${prefix}/join`, env().APP_URL), 303);
  if (/^[A-Za-z0-9_-]{1,128}$/.test(token)) {
    response.cookies.set(INVITE_COOKIE, token, cookieOptions(INVITE_COOKIE_MAX_AGE));
  }
  response.headers.set("Referrer-Policy", "no-referrer");
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
