import { env, listFromEnv } from "@/lib/env";

/**
 * The client IP for rate limits, from the headers named in IP_HEADERS (in order of trust). Locally the list is
 * empty and every request shares "local". X-Forwarded-For style lists take the first entry, which Render sets
 * from the connecting client (runbook §1 confirms this on the first deploy).
 */
export function clientIp(headers: Headers): string {
  for (const name of listFromEnv(env().IP_HEADERS)) {
    const value = headers.get(name);
    if (value) return value.split(",")[0]!.trim();
  }
  return "local";
}
