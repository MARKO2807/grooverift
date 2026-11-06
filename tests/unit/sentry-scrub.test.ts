import type { ErrorEvent } from "@sentry/nextjs";
import { describe, expect, it } from "vitest";
import { scrubEvent, scrubUrl, sentryOptions } from "@/lib/monitoring/sentry";

describe("Sentry events carry no personal data (A7, D-111)", () => {
  it("cuts query strings and secret path segments", () => {
    expect(scrubUrl("https://x.test/invite/AbC_123-xyz")).toBe("https://x.test/invite/[redacted]");
    expect(scrubUrl("https://x.test/en/invite/tok?utm=1")).toBe(
      "https://x.test/en/invite/[redacted]",
    );
    expect(scrubUrl("https://x.test/api/auth/reset-password/tok?callbackURL=%2Freset")).toBe(
      "https://x.test/api/auth/reset-password/[redacted]",
    );
    expect(scrubUrl("https://x.test/api/export/uuid-1?exp=1&sig=abc")).toBe(
      "https://x.test/api/export/[redacted]",
    );
    expect(scrubUrl("https://x.test/@ana#answers")).toBe("https://x.test/@ana");
    expect(scrubUrl(undefined)).toBeUndefined();
  });

  it("drops the user, breadcrumbs and everything in the request but method and url", () => {
    const event = {
      type: undefined,
      user: { id: "u1", email: "ana@example.test", ip_address: "203.0.113.9" },
      breadcrumbs: [{ message: "[mail] to: ana@example.test" }],
      transaction: "GET /invite/secret",
      request: {
        method: "POST",
        url: "https://x.test/api/auth/sign-in/email?x=1",
        cookies: { session: "s" },
        headers: { cookie: "s", "x-forwarded-for": "203.0.113.9" },
        data: { email: "ana@example.test", password: "Lozinka-2024" },
        query_string: "x=1",
      },
    } as unknown as ErrorEvent;
    const out = scrubEvent(event);
    expect(out.user).toBeUndefined();
    expect(out.breadcrumbs).toBeUndefined();
    expect(out.transaction).toBe("GET /invite/[redacted]");
    expect(out.request).toEqual({ method: "POST", url: "https://x.test/api/auth/sign-in/email" });
    expect(JSON.stringify(out)).not.toMatch(/ana@|203\.0\.113|Lozinka|session/);
  });

  it("collects nothing by default and samples no traces", () => {
    const o = sentryOptions("https://key@o1.ingest.de.sentry.io/1", "staging");
    expect(o.dataCollection).toEqual({
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      httpBodies: [],
      urlQueryParams: false,
    });
    expect(o.tracesSampleRate).toBe(0);
    expect(o.maxBreadcrumbs).toBe(0);
    expect(o.environment).toBe("staging");
  });
});
