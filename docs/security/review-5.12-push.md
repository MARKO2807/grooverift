# Security review: step 5.12 (web push and the service worker)

_Session 38, 2026-11-07. Independent review by a read-only security-reviewer agent on the uncommitted step 5.12 changes. Push scheduling is on the High list of the plan (§8); the review was run before closing the step. Fixes by Claude in the same session; each fix has a test or is covered by one. No High or Critical findings._

## Scope
`src/lib/data/push.ts` (devices, choices, reminders, social pushes), `src/lib/push/*` (actions, send with the endpoint allowlist, crypto, rules, browser), the hooks in `notify()` and `followMember`, `public/sw.js` and its headers, migration 0009, the worker job `push.reminders`, SET-06 and ONB-08, the CI VAPID step and `tests/e2e/global-setup.ts`.

## Findings and fixes

| # | Severity | Finding | Fix | Test |
|---|---|---|---|---|
| M1 | Medium | **Follow-request push spam.** Requests were pushed without grouping, and follow → cancel → follow is not limited per pair, so one account could ring a private member's phone up to 60 times an hour, without a name to block. | At most one request push per pair a day (`consume("pushFollowRequest", "<owner>:<requester>", 1/day)`); the request itself still shows in Activity. | `push.test.ts` "a follow request …" (cancel and ask again → still one push) |
| M2 | Medium | **An admin impersonating a member could bind their own browser to the member's pushes** (Better Auth's admin plugin keeps `impersonateUsers`). | The push actions answer "unavailable" for an impersonation session. Whether impersonation should exist at all is raised with the owner (not in the threat model). | action guard (`session.impersonatedBy`) |
| L1 | Low | Someone who knew another member's endpoint could submit it with other keys and silently break that member's push. | An endpoint held by another member moves only with the same browser `auth` key (the same subscription in someone else's hands); otherwise refused. | `push.test.ts` "never move to someone who only knows the address" |
| L2 | Low | A time zone known to Node but not to PostgreSQL would make the reminder query fail for everyone. | The query keeps only zones in `pg_timezone_names`. | covered by the reminder tests |
| L3 | Low | `safePath("/.//evil.com")` in the service worker returned `//evil.com`; safe only because the click handler checks again. | The parsed path may not start with `//`. | `push.spec.ts` serves the worker; logic reviewed |
| L4 | Low | The e2e global setup deletes rows and flips the push flag on whatever database `.env.local` names. | Refuses a non-local database unless `CI` is set. | global setup guard |
| — | Process | Migration 0009 began with `DELETE FROM push_subscription` (a destructive statement, though the table could hold no rows). | Removed; the NOT NULL column needs no backfill because nothing was ever stored before this step. | migrations up-down-up |

## Checked and found fine (reviewer)
User and session always come from the cookie (no cookie cache); every device query is filtered by user and session. The session foreign key with `ON DELETE CASCADE` ends a device on sign-out, on "sign out other devices", on deactivation and on the purge; expired sessions are skipped at delivery. `pushSocial` needs an active recipient and no mute; `notify` → `mayNotify` covers blocks both ways and hidden accounts; requests go through `canInteract`. Payloads are fixed sentences without names or member text; the reminder carries the editorial question only. SSRF: anchored https host allowlist, no port, no userinfo, checked again at send; web-push does not follow redirects. Inputs validated, `push` rate limit, parameterised SQL. Logs carry the status code and the push-service host only. AES-256-GCM with a random IV, HKDF with domain separation, a version prefix; unreadable keys drop the subscription. The reminder claim is an atomic conditional update (at most one per question and per local date). The page is dynamic; `sw.js` has no fetch handler, `no-cache` and its own CSP. Placeholders only in `.env.example` and `render.yaml`; the CI VAPID pair is made per run and never printed.
