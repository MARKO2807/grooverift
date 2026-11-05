# Project status

_Last updated: 2026-11-05 (session 28: **step 5.5 done**, D-098; continuing with 5.6 under the standing instruction of session 25)_

## Current phase
**Phase 5: Alpha vertical slice, IN PROGRESS (approved D-092, 2026-11-05, with a free hand as in D-088).** Plan and step acceptance: [`docs/phase-5-plan.md`](phase-5-plan.md). Scope decisions: D-093 (push in the alpha behind a flag; live MusicBrainz lookups; people search on the Profile tab; seven-day strip plus the full archive; JO2–JO6). Code layout and rules: [`docs/architecture/app-structure.md`](architecture/app-structure.md). Step 4.11 (staging) stays deferred until A7 (OQ-33) and is done in whichever step is current when A7 arrives.

| Step | Status |
|---|---|
| 5.0 Kickoff | ✅ plan approved (D-092), decisions D-093, `web-push` 3.6 and `archiver` 8 installed with types, `readdir-glob` minimatch override (audit 0 findings), OQ-07/08/16/28 closed |
| 5.1 App shell and public pages | ✅ session 25: tab bar, rail, columns, large text, motion; Spirala and invite current on canvas (D-094); PUB-01, PUB-10 drafts, PUB-11 (validates and audits, stores from 5.2), PUB-12, SYS-01–05 |
| 5.2 Data model and data-access layer ⛳ | ✅ session 25 (D-095): schema and migrations (down tested), `src/lib/data`, rate limiter, notices stored; independent review: 1 high, 6 medium fixed or carried (`docs/security/review-5.2-data-layer.md`; L4, L7, L8 closed in 5.5); **owner review open** |
| 5.3 Catalogue and Music DNA | 🔶 **5.3a done** (session 26, D-096): 2,210 genres seeded (families reviewed, 586 "no family"), editor `/me/dna`, audience sheet, Spirala on the profile; **5.3b** (artist lookup, typeahead, CAT-01) waits for A4 |
| 5.4 Invitations and onboarding ⛳ | ✅ session 27 (D-097): invitations only (the `sign_up` flag retired), ADM-03 at `/admin/invites`, `/invite/<token>` → cookie → `/join` (U-05), ONB-01–09 with progress and resume, JO6, review L11 closed; **owner walks the flow** |
| 5.5 Profiles, follow and people search | ✅ **session 28 (D-098):** `/@username` for every member (PROF-01/10, the P and B states, PUB-08), counts per the list rule, lists with "Ukloni pratitelja", follow / request / cancel / unfollow with confirmations, ACT-02, `follow_decline` (L7), `/settings/profile` with the username change (L8), `/settings/privacy` (SET-05, JO5), people search `/search` on `pg_trgm` + `unaccent` (migration 0005), `Viewer.status` required (L4); ⛳ points in D-098 (8), (3), (1) for the owner |
| 5.6 Daily Drop editorial ⛳ | ⏳ High |
| 5.7 Daily Drop for members ⛳ | ⏳ |
| 5.8 Activity | ⏳ |
| 5.9 Safety and moderation ⛳ | ⏳ High (Mute and Report join the profile's ⋯ menu here) |
| 5.10 Settings, account and data ⛳ | ⏳ High |
| 5.11 Images | ⏳ waits for A7 (`sharp`, `@aws-sdk/client-s3` approved for then) |
| 5.12 Push and PWA | ⏳ High, behind a flag (D-093 (1)); the onboarding reminder step already exists behind the `push` flag |
| 5.13 Copy and owner review ⛳ | ⏳ |
| 5.14 Review and close | ⏳ High |

**Checks on 2026-11-05 (session 25, after step 5.1, all green):** `npm run check` (format, lint, typecheck, tokens 180 / 89 pairs, i18n 327 keys, 59 unit tests); e2e **101 passed** on the dev server and **101 passed** on the production build (`CI=1 PORT=3100`); `scripts/screens.mjs` 80 views (180/360/800/1366/1920 px) with no sideways scroll, one h1, one visible main navigation; Spirala at 360 px with the CPU 4x slower: median 16.7 ms, p95 33.4 ms per frame.

**Checks after step 5.2 (session 25, all green):** `npm run check` (61 unit tests, i18n 328 keys); `npm run test:db` **38 passed** (data layer, invariants, review fixes, migrations up-down-up on a scratch database); e2e **101 passed** on the dev server; `db:generate` reports no schema drift.

**Checks after step 5.3a (session 26, all green):** `npm run check` (68 unit tests, i18n 393 keys); `npm run test:db` **46 passed**; e2e **103 passed** in the full run on the dev server (the TOTP test flaky once under load); `dna.spec.ts` 4/4.

**Checks after step 5.4 (session 27):** `npm run check` (74 unit tests, i18n 578 keys); `npm run test:db` **55 passed** (invitations: normalisation, one open per address, token answers without a reason, accept once; the Better Auth hooks: no account without the invitation cookie, verified at once, accepted in the same request; onboarding writes; migrations 0002–0004 up-down-up); e2e **117 passed, 1 skipped** (the HIBP test skips when the service fails open) in 4.1 min on the dev server, no "Failed to find Server Action" left; production build and e2e (`CI=1 PORT=3100`) **117 passed, 1 skipped** in 47 s (a stale `next start` from session 26 had to be stopped first; HANDOFF lesson).

**Checks after step 5.5 (session 28):** `npm run check` (78 unit tests, i18n 760 keys, no schema drift); `npm run test:db` **74 passed** (new `profiles.test.ts`, 19: every profile section × relationship through the data layer, the B state, lists and pending requests, decline and the seven-day wait, remove follower, JO5, section audiences, edit profile, username change with the reservation, people search never returning a blocked, non-discoverable, unfinished or deleted member, the history and the counts rule; migrations 0002–0005 up-down-up); e2e **131 passed, 1 skipped** in 4.9 min on Playwright's own dev server (new `profiles.spec.ts`: J4 public and private flows, E1, E2, E5, E6, E7, E10, JO5, PUB-08, the search) and **131 passed, 1 skipped** in 45 s on the production build (`CI=1 PORT=3100`); `scripts/screens.mjs` **120 views** (nine new profile, search and settings views) with no sideways scroll, one h1, one visible main navigation, after three layout fixes at 180 px and the two-column desktop split. Two earlier full runs failed for one reason outside the code: a hand-started dev server that had survived its "stop" (HANDOFF lesson).

## Done
- Phases 0–4 (discovery; audit and documentation foundation; architecture and legal groundwork; UX research, IA and design system, accepted D-087; Foundation, accepted D-091).
- Decisions D-001 to D-098. Key ones for the code:
  - EU hosting, budget 30–60 €/mo; **Option B architecture + Next.js (ADR-0002)**; libraries (ADR-0003)
  - **Visibility (session 3):** blocks hide both ways (D-019); private members' replies in public threads are visible (D-020); Daily Drop answers visible to all members (D-021); signed-out visitors see the question only (D-022); DM history after a block read-only (D-023); Music DNA defaults to all members (D-024); profiles default to public via an active choice (D-025, D-030)
  - **Auth rules:** passwords 12+ with upper, lower, special (D-061); HIBP k-anonymity, fail-open (D-054); lockout 5/15 min → 15 min, 1 h, 24 h, 100 → reset (D-077); password change signs other devices out (D-072); no "remember this device" (D-076); Argon2id (R-14 → D-089); **accounts from invitations only, verified at once (D-097, JO6)**
  - **Phase 4:** approved with a free hand (D-088); foundation decisions (D-089) and review fixes (D-090) confirmed; phase accepted (D-091)
  - **Phase 5:** approved with a free hand (D-092); alpha scope decisions (D-093); implementation choices D-094 (5.1), D-095 (5.2), D-096 (5.3a), D-097 (5.4), D-098 (5.5)
  - Design: direction C "Pulse" prototype (`design/prototypes/pulse/`) is the reference; tokens (`design/tokens/tokens.json`), components spec (`docs/design/components.md`), copy guide (`docs/design/copy-guide.md`)
- Phase 3 record: [`design/phase-3-plan.md`](design/phase-3-plan.md), [`design/phase-3-review.md`](design/phase-3-review.md); every review page is linked from `design/prototypes/index.html`. Phase 4 record: [`phase-4-plan.md`](phase-4-plan.md).

## Next
1. **Owner:** `! git push` (the session 28 commit).
2. **Claude (standing instruction from session 25: continue without waiting):** step **5.6** (Daily Drop editorial and publication, High), then 5.7, 5.8, 5.9, 5.10, 5.12 (flagged) in plan order; **5.3b** (artist lookup) as soon as A4 is done. Each ⛳ point is prepared for the owner's review, not decided.
3. **Owner, when back:** walk ⛳ 5.4 and 5.5 on the running app (sign in as `ana@example.test`; open `/@luka`, follow, open `/@mia` for the P state, search for "Zeljko"-style names, try `/settings/profile` and `/settings/privacy`, block and unblock someone from the ⋯ menu; D-098 lists the choices and the three ⛳ points); review ⛳ 5.2 (D-095), 5.1 and 5.3a (D-096); `! git push`.
4. **Owner, when convenient:** `docs/ops/owner-setup-checklist.md` (project mailbox and MetaBrainz for 5.3b; A7 accounts; counsel). OQ-34 (alpha data after the alpha) before invitations.
5. Open, to raise when convenient: OQ-06, OQ-24, OQ-29, OQ-32, OQ-34; the owner's Narrator listen; counsel questions (B.3, B.5, C.9, C.10).

## Owner actions outside Claude
- `git push` after each session (Claude's push is blocked).
- MetaBrainz registration and the project mailbox before 5.3b (D-092). A7 accounts (OQ-33) when ready. Step by step: `docs/ops/owner-setup-checklist.md`.
- Start looking for an accountant and lawyer (`docs/legal/questions-for-counsel.md`). Needed before the alpha (legal pages are placeholders until then; no invite goes out while they are).

## Blockers
- None for 5.6. 5.3b needs A4 (owner). 5.11, real push tests and the Google path of onboarding (J1 E4) need A7. Before the alpha: legal entity (OQ-05), moderation staffing (OQ-06), age policy (OQ-10), DPIA, legal documents.

## Top risks
1. Scope vs. capacity (A-01). Phase 5 has fourteen steps; one step per session, flags for anything unfinished, no step starts before the previous one is green.
2. Artwork rights; the design must work without covers or photos (D-017). Images wait for A7 (5.11).
3. Authorization complexity (S-02): the data-access layer (5.2) must call the policy module everywhere; independent review of 5.2 and the matrix §4 checklist. 5.5 added the second channel (search) with a SQL filter plus a policy re-check; the 5.9 review covers 5.2–5.9.
4. Legal status: DSA, DPIA, age assurance (L-02, L-03, L-04); counsel C.9 still to confirm. Retention periods (90-day moderation copy, 30-day deletion grace) need counsel (B.3).
5. Missing production vector logo and final wordmark (B-01, X-04); interim derivatives exist (D-083).
6. Trademark: "RIFT" marks in classes 9/41; attorney assessment needed before filing or brand spend.
7. Motion before sign-in (D-085) stops only with the system reduced-motion setting; a strict WCAG 2.2.2 audit may ask for an in-page pause.
8. The first-Drop countdown with seconds (D-078): the alpha launch must be timed so the countdown matches the real first publication; the first question is scheduled before any invite.
9. Password composition (D-061) deviates from NIST; mitigations are built; revisit before the alpha.
10. No staging yet (4.11 deferred): the Render client-IP header, the email provider and R2 are unverified until A7; the first deploy must follow the runbook §1 checks before any invite goes out. **New in 5.5:** migration 0005 runs `CREATE EXTENSION pg_trgm` and `unaccent`; Render's managed PostgreSQL allows both, but the first deploy must confirm the application role may create them (else run them once as the database owner before the migration).
11. iOS Web Push needs an installed PWA over HTTPS and a real-device check (T-04); push is flagged (D-093 (1)) so the alpha can ship without it.
12. The Spirala port: measured in 5.1 (D-094), within budget at 4x CPU throttle; recheck on a real mid-range phone with staging.
13. The 404 page renders through the client in Next.js 16 (status 404 is right; without JavaScript the page is blank). Revisit with `global-not-found` or a framework update (D-094 (6)).
14. The client IP behind Render must be checked with a forged `X-Forwarded-For` on the first deploy (review 5.2 M6, runbook §6); lockout and every rate limit depend on it.
15. The invitation link is the only secret of an account's creation (R-08): it is single-use, 14 days, bound to the address and sent by plain-text mail; once A7 picks a provider, check that the provider does not rewrite or prefetch links in a way that drops the token (the handler consumes nothing on GET, so a scanner's visit is harmless).
16. The e2e suite walks the real onboarding for every fresh member (about 15 s each; 5.5 added nine members per project); the Playwright timeout is 120 s, the longest tests are marked slow, and the e2e-only rate-limit scale is 20. Watch the CI duration; a `quick` helper that inserts an onboarded member directly is the fallback.
17. **New:** the seven-day wait after a declined request (D-098 (4)) tells a persistent requester that "a request went out recently"; it never says "declined", but a requester who never sent one in the last week could infer a decline. J4 E6 accepted this trade-off (RECOMMENDED); revisit if testers notice.

## Code
- **Application (session 22):** see [`docs/architecture/app-structure.md`](architecture/app-structure.md). Commands: `npm run dev`, `npm run check`, `npm run test:db`, `npm run build && npm run test:e2e`, `npm run worker`, `npm run db:migrate`, `npm run db:seed`, `npm run tokens`, `npm run i18n:check`. New dependencies (session 24, unused until 5.10 and 5.12): `web-push`, `archiver`. No new dependencies in 5.5.
- **Design record (Phase 3):** `design/prototypes/pulse/` (refined direction C, the reference for look and behaviour), `design/prototypes/tools/` (zero-dependency checks: `pulse-smoke.mjs` 155/155, `a11y-check.mjs`, `zoom-check.mjs`, `smoke.mjs` 3/3), `design/tokens/` (`build.mjs`, `contrast-check.mjs` 89 pairs), `design/fonts/`, `docs/brand/derived/`.
