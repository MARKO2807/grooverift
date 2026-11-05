# Project status

_Last updated: 2026-11-05 (session 22: **Phase 4 Foundation built, steps 4.0–4.10**; 4.11 waits for A7, 4.12 pending the owner's review)_

## Current phase
**Phase 4: Foundation, in progress (approved D-088).** Plan and step table: [`docs/phase-4-plan.md`](phase-4-plan.md). Code layout and rules: [`docs/architecture/app-structure.md`](architecture/app-structure.md). Libraries: [ADR-0003](decisions/adr/0003-application-libraries.md).

| Step | Status |
|---|---|
| 4.0 Kickoff | ✅ D-088, ADR-0003 |
| 4.1 Scaffold | ✅ Next.js 16 (App Router) at the repository root; `/` Croatian, `/en` English |
| 4.2 Quality gates and CI | ✅ lint (jsx-a11y errors), format, typecheck, Vitest, Playwright + axe-core, token and message checks, GitHub Actions, Claude hook + two review subagents |
| 4.3 Database and local environment | ✅ Docker Compose PostgreSQL 17, Drizzle, migrations 0000–0001, fictional seed, db tests |
| 4.4 Tokens and base components | ✅ generated `tokens.css` + Tailwind theme, fonts, `components.css`, button/fields/notice/toast/dialog |
| 4.5 Authentication ⛳ | ✅ built and tested; **owner review of the screens pending** |
| 4.6 Sessions and revocation | ✅ devices list, revoke one/all, password change signs others out (D-072), immediate revocation |
| 4.7 HR/EN messages | ✅ next-intl, ICU plurals, completeness check in CI |
| 4.8 Authorization policy module ⛳ | ✅ `src/lib/authz/policy.ts`, 32 tests (one per matrix row); security review run |
| 4.9 Audit log, flags, admin shell | ✅ append-only audit log, flags with `paused`, admin shell gated by role + second factor |
| 4.10 Security baseline | ✅ nonce CSP, headers, rate limits, audit in CI; error tracking waits for A7 |
| 4.11 Staging ⛳ | ⏳ **A7 (OQ-33)**: owner accounts and about $20/month |
| 4.12 Review and close | 🔄 independent security review (3 high, 6 medium, 7 low) and WCAG 2.2 AA review (3 must, 11 should) done in session 22 and **every finding fixed** (HANDOFF "Review findings"); what remains is the owner's review of the screens and the acceptance |

**Checks on 2026-11-05 (session 22, end, all green):** `npm run check` (format, lint, typecheck, tokens 180 variables / 89 contrast pairs, i18n 204 keys, 40 unit tests incl. 32 policy rows), `npm run test:db` 13 tests, `npm run test:e2e` **52 tests** on phone and desktop against the dev server and again against the production server (`npm run build` + `next start`, the CI path), axe-core clean on every screen, `npm audit --omit=dev` 0 findings, migrations current. **GitHub Actions, first hosted run (b7dac27):** checks ✅ 31 s, database ✅ 43 s, e2e ❌ (the CI-only secret was one character short of the production guard, so the server answered 500; fixed right after, 52 e2e tests re-run green locally with the exact CI values). **The next push should be the first fully green run.**

## Done
- Phases 0–3 (discovery; audit and documentation foundation; architecture and legal groundwork; UX research, IA and design system, accepted D-087).
- Decisions D-001 to D-089. Key ones for the code:
  - EU hosting, budget 30–60 €/mo; **Option B architecture + Next.js (ADR-0002)**; libraries (ADR-0003)
  - **Visibility (session 3):** blocks hide both ways (D-019); private members' replies in public threads are visible (D-020); Daily Drop answers visible to all members (D-021); signed-out visitors see the question only (D-022); DM history after a block read-only (D-023); Music DNA defaults to all members (D-024); profiles default to public via an active choice (D-025, D-030)
  - **Auth rules:** passwords 12+ with upper, lower, special (D-061); HIBP k-anonymity, fail-open (D-054); lockout 5/15 min → 15 min, 1 h, 24 h, 100 → reset (D-077); password change signs other devices out (D-072); no "remember this device" (D-076); Argon2id (R-14 → D-089)
  - **Phase 4 (session 22):** approved with a free hand (D-088); foundation decisions recorded as RECOMMENDED for the owner's objection (D-089)
  - Design: direction C "Pulse" prototype (`design/prototypes/pulse/`) is the reference; tokens (`design/tokens/tokens.json`), components spec (`docs/design/components.md`), copy guide (`docs/design/copy-guide.md`)
- Phase 3 record: [`design/phase-3-plan.md`](design/phase-3-plan.md), [`design/phase-3-review.md`](design/phase-3-review.md); every review page is linked from `design/prototypes/index.html`.

## Next
1. **Owner:** `! git push` (the CI fix) and confirm all three jobs are green at https://github.com/MARKO2807/grooverift/actions; then review the sign-in screens at http://localhost:3000 (`docker compose up -d`, `npm run db:migrate`, `npm run db:seed`, `npm run dev`; seeded members in `docs/architecture/app-structure.md`). Object to anything in D-089.
2. **Owner, A7 (OQ-33):** decide on staging, R2, error tracking, the email provider and the Google OAuth client. Claude then does 4.11 and writes the deploy runbook.
3. **Claude, next session:** act on any findings the owner raises; close 4.12 (STATUS, DECISIONS: Phase 4 accepted); then propose the Phase 5 plan (alpha vertical slice: invites, onboarding, profiles, Music DNA, Daily Drop, follow, safety).
4. Open, to raise when convenient: OQ-28 (archive depth), OQ-32 (social emails before B3), JO2–JO6 defaults, OQ-24, OQ-29; the owner's Narrator listen (`docs/design/accessibility-pass.md` §3).

## Owner actions outside Claude
- `git push` after each session (Claude's push is blocked).
- A7 accounts (OQ-33) when ready. MetaBrainz registration (D-018) before Phase 5's catalogue work.
- Start looking for an accountant and lawyer (`docs/legal/questions-for-counsel.md`). Needed before the alpha.

## Blockers
- None for Phase 4 code. Staging (4.11) waits for A7. Before the alpha: legal entity (OQ-05), moderation staffing (OQ-06), age policy (OQ-10), DPIA, legal documents.

## Top risks
1. Scope vs. capacity (A-01). Phase 5 is the largest phase; the foundation is in place to keep it to features.
2. Artwork rights; the design must work without covers or photos (D-017).
3. Authorization complexity (S-02): mitigated by the policy module and its row-by-row tests; the data-access layer (Phase 5) must call it everywhere (cross-channel checklist in the matrix §4).
4. Legal status: DSA, DPIA, age assurance (L-02, L-03, L-04); counsel C.9 still to confirm.
5. Missing production vector logo and final wordmark (B-01, X-04); interim derivatives exist (D-083).
6. Trademark: "RIFT" marks in classes 9/41; attorney assessment needed before filing or brand spend.
7. Motion before sign-in (D-085) stops only with the system reduced-motion setting; a strict WCAG 2.2.2 audit may ask for an in-page pause.
8. The first-Drop countdown with seconds (D-078): the alpha launch must be timed so the countdown matches the real first publication.
9. **New:** password composition (D-061) deviates from NIST; mitigations are built (breach check, lockout, two-factor); revisit before the alpha.
10. **New:** CI has not run on GitHub yet (needs a push); the three jobs mirror the local commands exactly.

## Code
- **Application (session 22):** see [`docs/architecture/app-structure.md`](architecture/app-structure.md). Commands: `npm run dev`, `npm run check`, `npm run test:db`, `npm run build && npm run test:e2e`, `npm run worker`, `npm run db:migrate`, `npm run db:seed`, `npm run tokens`, `npm run i18n:check`.
- **Design record (Phase 3):** `design/prototypes/pulse/` (refined direction C, the reference for look and behaviour), `design/prototypes/tools/` (zero-dependency checks: `pulse-smoke.mjs` 155/155, `a11y-check.mjs`, `zoom-check.mjs`, `smoke.mjs` 3/3), `design/tokens/` (`build.mjs`, `contrast-check.mjs` 89 pairs), `design/fonts/`, `docs/brand/derived/`.
