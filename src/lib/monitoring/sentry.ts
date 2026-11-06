// Error tracking (A7, D-111): Sentry, EU data region (Frankfurt). Server and worker only: no browser SDK, no
// session replay, no performance tracing. Events carry no personal data (threat model: logs and error tracking
// hold no message bodies or private content): no IP, user, cookies, headers, request bodies or query strings,
// no breadcrumbs (they can echo log lines), and secrets in URL paths are cut before sending.
import type { ErrorEvent, NodeOptions } from "@sentry/nextjs";

/** Path segments that are credentials: the invitation token, the password-reset token, the export id. */
const SECRET_PATH = /\/(invite|reset-password|export)\/[^/?#]+/g;

export function scrubUrl(url: string | undefined): string | undefined {
  if (!url) return url;
  const noQuery = url.split(/[?#]/)[0]!;
  return noQuery.replace(SECRET_PATH, "/$1/[redacted]");
}

export function scrubEvent(event: ErrorEvent): ErrorEvent {
  delete event.user;
  delete event.breadcrumbs;
  if (event.request) {
    event.request = { method: event.request.method, url: scrubUrl(event.request.url) };
  }
  if (event.transaction) event.transaction = scrubUrl(event.transaction);
  return event;
}

export function sentryOptions(dsn: string, environment: string): NodeOptions {
  return {
    dsn,
    environment,
    // Collect nothing about the person or the request; beforeSend scrubs again in case a default changes.
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      httpBodies: [],
      urlQueryParams: false,
    },
    tracesSampleRate: 0,
    maxBreadcrumbs: 0,
    beforeSend: (event) => scrubEvent(event),
  };
}
