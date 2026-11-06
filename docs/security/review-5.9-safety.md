# Security review: steps 5.2–5.9 (step 5.9 in depth)

_Session 32, 2026-11-07. Independent review by a read-only security-reviewer agent (plan row 5.9 acceptance: "an independent security review of 5.2–5.9"), on the uncommitted 5.9 working tree. Owner request in the same session: harden the app against experienced attackers and bots. Fixes by Claude in the same session; each fix has a test._

## Scope
Member safety and moderation (`src/lib/data/safety.ts`, `moderation.ts`, `notices.ts`, `notifications.ts`, `src/lib/moderation/*`, `src/lib/safety/actions.ts`, the SAFE and ADM pages, migration 0007, the new worker jobs), regression context for 5.2–5.8 (policy, facts, graph, drops, editorial, invitations, onboarding, auth), and an app-wide pass: headers and CSP, cookies, CSRF posture, auth rate limits, dependencies, enumeration by bots.

## Dependencies
`npm audit --omit=dev`: 0 vulnerabilities. Next.js 16.4.5 (bundled React 19.3 canary), React 19.3.1, Better Auth 1.7.17: all newer than the fixes for the December 2025 React Server Components RCE and DoS advisories (Next 16.0.7 and 16.0.10) and the middleware-bypass advisory (Next 15.2.3). Authorization never relies on `src/proxy.ts`.

## Findings and fixes

| # | Severity | Finding | Fix | Test |
|---|---|---|---|---|
| M1 | Medium | **Open redirect through a TAB in `returnTo`.** The checks refused `//`, `\` and `://` but not `/\t/evil.example`, which browsers parse as `//evil.example`. It affected sign-in, the second step, the sign-in actions and the new `/account-status`. | One helper `safeReturnTo` in `src/lib/routing/paths.ts`: no control characters, spaces or backslashes, and the value must keep our origin when parsed against a dummy base. Used in all five places. | `tests/unit/moderation-rules.test.ts` (tab, newline, backslash, `//`, absolute URLs, `javascript:`) |
| M2 | Medium | **Appeals skipped the conflict-of-interest and assignment rules**, so a moderator who could not take a case could still read its evidence and decide its appeal. | `appealGuard`: an appeal follows the case rules (never one's own; a moderator not on their own decision, not on a case they are involved in, not on a case about staff; an involved admin gives an audited reason). | `safety.test.ts` "M2" |
| M3 | Medium | **A moderator could suspend or ban staff, including the only admin**, who would then be locked out with nobody to review the appeal. | A case about a staff member is for an admin only (queue, take, open, decide). An admin account is never suspended or banned from inside the app (error `staffSubject`); Better Auth's emergency lock remains. | `safety.test.ts` "M3" |
| M4 | Medium | **Reports could target objects the reporter cannot see, and "Moje prijave" showed the reported member's live handle**, so a blocked person who knew an id could follow the other's username changes. | `resolveTarget` asks the policy whether the reporter can see the object now (a block either way still allows a report, J5 E2). The handle is stored on the report at creation (`report.target_handle`, migration 0007) and never looked up live. | `safety.test.ts` "M4" |
| L1 | Low | Suspended or banned staff kept admin write access (`requireRole` did not read the status). | `requireRole` reads the status fresh and refuses staff power unless active. | covered by existing staff tests |
| L2 | Low | Staff saw cases and appeals about themselves in the queue and the counts (timing could point at the reporter); "involved" said why. | Cases and appeals about the staff member are not listed or counted for them; the conflict line no longer says why. | `safety.test.ts` |
| L3 | Low | Assignment was checked before the row lock; two moderators taking a case could both "win". | `takeCase` writes only where unassigned (or already theirs) and checks the row count; `decideCase` re-reads the assignee under `FOR UPDATE`. | `safety.test.ts` |
| L4 | Low | A malformed `%` sequence in a DSA notice URL threw and the notice failed. | `parseContentUrl` returns null (reviewed by hand). | unit |
| L5 | Low | A notice-only case view left no `evidence_access` row. | One "case" row per case view, plus one per copy and per notice with personal data. | `safety.test.ts` |
| L6 | Low | Evidence could be purged while an appeal was still open. | `purgeSnapshots` keeps the copies of any case with an open appeal. | `safety.test.ts` "M2" |

## Info (no change, recorded)
- Held (suspended or banned) members can still change their email, password and second factor through Better Auth and reach `/settings/security` and `/settings/account`. **Intended:** they keep control of their own account during a hold (and deletion arrives in 5.10).
- `/account-status` is now in `PRIVATE_PATH` (no-store), as defence in depth.
- A report about an unknown id answers "not available" without spending the rate limit; ids are random UUIDs, so guessing is impractical.
- The conflict rule covers staff who **were blocked by** a party (the plan's wording), not staff who blocked someone themselves.
- Review 5.2 L10 is closed here differently than planned (D-107 (6)): suspension and ban use `user.status` and keep the session for the reasons and the appeal; the status is read fresh everywhere.
- Review 5.2 M6 (the leftmost `X-Forwarded-For` on Render) stays open for the first deploy (runbook §1).

## What the review found solid
The reporter is never revealed (no reporter id or name on any member page, action result, Activity entry or URL; staff see numbered reports); notices, reports, appeals and acknowledgements are scoped to their member on the server; staff actions check role, second factor and fresh status; suspending or banning needs a sign-in within 15 minutes; advisory locks, partial unique indexes and `FOR UPDATE` cover the races; the posting restriction is enforced in the data layer; every member write checks the status; `memberPage` and `profileViewer` cover every app page; all raw SQL is parameterised; logs follow the `SafeDbError` pattern; every new page is dynamic. App-wide: nonce plus `strict-dynamic` CSP, `frame-ancestors 'none'`, HSTS in production, secure cookies with no cookie cache, Better Auth rate limits and lockout, origin checks on server actions and auth routes.
