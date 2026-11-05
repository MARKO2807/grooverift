# Project status

_Last updated: 2026-11-05 (session 24: **Phase 5 approved by the owner, D-092**; alpha scope decisions D-093; step 5.0 done; next is step 5.1, the app shell and public pages, in a fresh session)_

## Current phase
**Phase 5: Alpha vertical slice, IN PROGRESS (approved D-092, 2026-11-05, with a free hand as in D-088).** Plan and step acceptance: [`docs/phase-5-plan.md`](phase-5-plan.md). Scope decisions: D-093 (push in the alpha behind a flag; live MusicBrainz lookups; people search on the Profile tab; seven-day strip plus the full archive; JO2–JO6). Code layout and rules: [`docs/architecture/app-structure.md`](architecture/app-structure.md). Step 4.11 (staging) stays deferred until A7 (OQ-33) and is done in whichever step is current when A7 arrives.

| Step | Status |
|---|---|
| 5.0 Kickoff | ✅ plan approved (D-092), decisions D-093, `web-push` 3.6 and `archiver` 8 installed with types, `readdir-glob` minimatch override (audit 0 findings), OQ-07/08/16/28 closed |
| 5.1 App shell and public pages | ⏳ **next** (Medium): tab bar, rail, desktop columns, large text, motion rules, the Spirala component, landing, legal placeholders, DSA notice form, about-the-alpha, "nije dostupno", error, offline, paused |
| 5.2 Data model and data-access layer ⛳ | ⏳ High |
| 5.3 Catalogue and Music DNA | ⏳ needs the owner's MetaBrainz registration and the project mailbox (A4) |
| 5.4 Invitations and onboarding ⛳ | ⏳ |
| 5.5 Profiles, follow and people search | ⏳ |
| 5.6 Daily Drop editorial ⛳ | ⏳ High |
| 5.7 Daily Drop for members ⛳ | ⏳ |
| 5.8 Activity | ⏳ |
| 5.9 Safety and moderation ⛳ | ⏳ High |
| 5.10 Settings, account and data ⛳ | ⏳ High |
| 5.11 Images | ⏳ waits for A7 (`sharp`, `@aws-sdk/client-s3` approved for then) |
| 5.12 Push and PWA | ⏳ High, behind a flag (D-093 (1)) |
| 5.13 Copy and owner review ⛳ | ⏳ |
| 5.14 Review and close | ⏳ High |

**Checks on 2026-11-05 (session 24, after the installs, all green):** `npm run check` (format, lint, typecheck, tokens 180 variables / 89 contrast pairs, i18n 204 keys, 40 unit tests), `npm audit` 0 findings (with and without dev). E2e and db suites were not rerun (no code changed); the last green runs are session 23's (52 e2e on the production build) and GitHub Actions on `9485d72` (checks, database, e2e all ✅).

## Done
- Phases 0–4 (discovery; audit and documentation foundation; architecture and legal groundwork; UX research, IA and design system, accepted D-087; Foundation, accepted D-091).
- Decisions D-001 to D-093. Key ones for the code:
  - EU hosting, budget 30–60 €/mo; **Option B architecture + Next.js (ADR-0002)**; libraries (ADR-0003)
  - **Visibility (session 3):** blocks hide both ways (D-019); private members' replies in public threads are visible (D-020); Daily Drop answers visible to all members (D-021); signed-out visitors see the question only (D-022); DM history after a block read-only (D-023); Music DNA defaults to all members (D-024); profiles default to public via an active choice (D-025, D-030)
  - **Auth rules:** passwords 12+ with upper, lower, special (D-061); HIBP k-anonymity, fail-open (D-054); lockout 5/15 min → 15 min, 1 h, 24 h, 100 → reset (D-077); password change signs other devices out (D-072); no "remember this device" (D-076); Argon2id (R-14 → D-089)
  - **Phase 4:** approved with a free hand (D-088); foundation decisions (D-089) and review fixes (D-090) confirmed; phase accepted (D-091)
  - **Phase 5:** approved with a free hand (D-092); alpha scope decisions (D-093)
  - Design: direction C "Pulse" prototype (`design/prototypes/pulse/`) is the reference; tokens (`design/tokens/tokens.json`), components spec (`docs/design/components.md`), copy guide (`docs/design/copy-guide.md`)
- Phase 3 record: [`design/phase-3-plan.md`](design/phase-3-plan.md), [`design/phase-3-review.md`](design/phase-3-review.md); every review page is linked from `design/prototypes/index.html`. Phase 4 record: [`phase-4-plan.md`](phase-4-plan.md).

## Next
1. **Owner:** `! git push` (`0131cb6` the proposed plan + the session 24 docs and install commit).
2. **Claude, next session (fresh):** **step 5.1, app shell and public pages** (Medium effort). Port the shell from `design/prototypes/pulse/` (`app.js`, `style.css`, `dna.js` for the Spirala, the icons map) onto the Phase 4 component contract; build PUB-01, PUB-10 placeholders, PUB-11, PUB-12, SYS-01–05; screenshot pass at 360/800/1366/1920 px; axe clean; the no-store and 404-for-everything tests. Then STATUS/HANDOFF and a commit; step 5.2 (High) in the session after.
3. **Owner, before step 5.3:** register with MetaBrainz (Stealth Start-Up, $0, D-018) and create the project mailbox on grooverift.com for the MusicBrainz User-Agent (A4, D-092); tell Claude the address.
4. **Owner, A7 (OQ-33):** staging, R2, error tracking, the email provider and the Google OAuth client whenever ready. Claude then does 4.11 (runbook: `docs/ops/deploy-runbook.md`) and 5.11.
5. Open, to raise when convenient: OQ-06 (moderation staffing and response time for the alpha notice), OQ-24, OQ-29, OQ-32; the owner's Narrator listen (`docs/design/accessibility-pass.md` §3); counsel questions (B.3 retention periods, B.5, C.9, C.10).

## Owner actions outside Claude
- `git push` after each session (Claude's push is blocked).
- MetaBrainz registration and the project mailbox before 5.3 (D-092). A7 accounts (OQ-33) when ready.
- Start looking for an accountant and lawyer (`docs/legal/questions-for-counsel.md`). Needed before the alpha (legal pages are placeholders until then; no invite goes out while they are).

## Blockers
- None for 5.1 and 5.2. 5.3 needs A4 (owner). 5.11 and real push tests need A7. Before the alpha: legal entity (OQ-05), moderation staffing (OQ-06), age policy (OQ-10), DPIA, legal documents.

## Top risks
1. Scope vs. capacity (A-01). Phase 5 has fourteen steps; one step per session, flags for anything unfinished, no step starts before the previous one is green.
2. Artwork rights; the design must work without covers or photos (D-017). Images wait for A7 (5.11).
3. Authorization complexity (S-02): the data-access layer (5.2) must call the policy module everywhere; independent review of 5.2 and the matrix §4 checklist.
4. Legal status: DSA, DPIA, age assurance (L-02, L-03, L-04); counsel C.9 still to confirm. Retention periods (90-day moderation copy, 30-day deletion grace) need counsel (B.3).
5. Missing production vector logo and final wordmark (B-01, X-04); interim derivatives exist (D-083).
6. Trademark: "RIFT" marks in classes 9/41; attorney assessment needed before filing or brand spend.
7. Motion before sign-in (D-085) stops only with the system reduced-motion setting; a strict WCAG 2.2.2 audit may ask for an in-page pause.
8. The first-Drop countdown with seconds (D-078): the alpha launch must be timed so the countdown matches the real first publication; the first question is scheduled before any invite.
9. Password composition (D-061) deviates from NIST; mitigations are built; revisit before the alpha.
10. No staging yet (4.11 deferred): the Render client-IP header, the email provider and R2 are unverified until A7; the first deploy must follow the runbook §1 checks before any invite goes out.
11. **New:** iOS Web Push needs an installed PWA over HTTPS and a real-device check (T-04); push is flagged (D-093 (1)) so the alpha can ship without it.
12. **New:** the Spirala port (`dna.js`) must stay smooth on a mid-range phone; measured in 5.1, simplified with the owner's knowledge if the frame budget is missed.

## Code
- **Application (session 22):** see [`docs/architecture/app-structure.md`](architecture/app-structure.md). Commands: `npm run dev`, `npm run check`, `npm run test:db`, `npm run build && npm run test:e2e`, `npm run worker`, `npm run db:migrate`, `npm run db:seed`, `npm run tokens`, `npm run i18n:check`. New dependencies (session 24, unused until 5.10 and 5.12): `web-push`, `archiver`.
- **Design record (Phase 3):** `design/prototypes/pulse/` (refined direction C, the reference for look and behaviour), `design/prototypes/tools/` (zero-dependency checks: `pulse-smoke.mjs` 155/155, `a11y-check.mjs`, `zoom-check.mjs`, `smoke.mjs` 3/3), `design/tokens/` (`build.mjs`, `contrast-check.mjs` 89 pairs), `design/fonts/`, `docs/brand/derived/`.
