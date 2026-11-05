// Path rules used by src/proxy.ts; kept free of Next.js imports so unit tests can load them.

/** `/@<username>` and `/en/@<username>` (PROF-01, PUB-08). A folder named `@…` is a parallel-route slot in the
 *  App Router, so the profile route lives at `/[locale]/u/[username]` and the public URL is rewritten to it. */
const PROFILE_PATH = /^(?:\/(en|hr))?\/@([^/]+)(\/.*)?$/;

/** Private areas never enter a shared or browser cache (ADR-0002 §3, plan 5.1): the member's own pages, settings,
 *  admin, and since 5.5 the people search and Activity. Pages there are dynamic, so Next already sends no-store;
 *  the header is set here too so the rule holds whatever a page declares. */
const PRIVATE_PATH = /^(?:\/(?:en|hr))?\/(?:me|settings|admin|search|activity)(?:\/|$)/;

export function profileRewrite(pathname: string): string | null {
  const m = PROFILE_PATH.exec(pathname);
  if (!m) return null;
  return `/${m[1] ?? "hr"}/u/${m[2]}${m[3] ?? ""}`;
}

export const isPrivatePath = (pathname: string) => PRIVATE_PATH.test(pathname);
