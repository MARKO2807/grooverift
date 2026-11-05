import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

// Locale routing only. Authorization is never decided here: every page and API route
// checks the session and the policy module server-side (CLAUDE.md engineering guardrails).
export default createMiddleware(routing);

export const config = {
  // Skip API routes, Next internals and files with an extension (fonts, icons, manifest).
  matcher: "/((?!api|_next|_vercel|.*\\..*).*)",
};
