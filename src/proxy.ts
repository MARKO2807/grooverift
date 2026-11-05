import createMiddleware from "next-intl/middleware";
import type { NextRequest } from "next/server";
import { routing } from "./i18n/routing";

// Locale routing plus the per-request Content Security Policy (step 4.10). Authorization is never
// decided here: every page and API route checks the session and the policy module server-side.
const intl = createMiddleware(routing);

/** Strict CSP with a per-request nonce; Next.js reads the header and tags its inline scripts with it. */
export function contentSecurityPolicy(nonce: string, dev: boolean): string {
  const directives = [
    "default-src 'self'",
    // 'strict-dynamic' lets scripts loaded by a nonced script run; dev needs eval for React refresh.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    `connect-src 'self'${dev ? " ws: wss:" : ""}`,
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "media-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    // Google sign-in is a form submission that redirects to Google (S-09).
    "form-action 'self' https://accounts.google.com",
    "frame-ancestors 'none'",
    ...(dev ? [] : ["upgrade-insecure-requests"]),
  ];
  return directives.join("; ");
}

export default function proxy(request: NextRequest) {
  const nonce = btoa(
    crypto.getRandomValues(new Uint8Array(16)).reduce((s, b) => s + String.fromCharCode(b), ""),
  );
  const dev = process.env.NODE_ENV !== "production";
  const csp = contentSecurityPolicy(nonce, dev);

  // Next.js picks the nonce up from the request's CSP header; next-intl forwards the request
  // headers it was given, so they are set in place before the locale handling runs.
  request.headers.set("x-nonce", nonce);
  request.headers.set("content-security-policy", csp);

  const response = intl(request);
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  // Skip API routes, Next internals and files with an extension (fonts, icons, manifest).
  matcher: "/((?!api|_next|_vercel|.*\\..*).*)",
};
