# Phase 4 plan: Foundation (PROPOSED)

_Drafted 2026-11-05 at the end of Phase 3 (step 3.9). **Status: PROPOSED, not approved.** Phase 4 starts only after the owner approves Phase 3 acceptance and this plan (CLAUDE.md approval gates). Roadmap scope: [`roadmap.md`](roadmap.md) "Phase 4: Foundation"._

## Goal
A running, empty, well-guarded application on the approved stack (ADR-0002), with no product features beyond sign-in. The product screens come in Phase 5. Phase 4 builds:
- the scaffold and the quality gates (lint, types, tests, CI)
- authentication and sessions
- the authorization policy module with its test suite
- HR/EN messages
- the design tokens as code
- the audit log, feature flags and an admin shell
- the security baseline

## Approvals this plan asks for
Each item is a separate yes/no for the owner; nothing is installed or created before it is approved.

| # | What | Why now | Cost |
|---|---|---|---|
| A1 | **Start Phase 4** | Roadmap order; Phase 3 closed | — |
| A2 | **Libraries** (confirming the proposal in `architecture/architecture-options.md` §3; one ADR, 0003). The full list is below the table. | ADR-0002 says libraries are confirmed in Phase 4 | Free, open source |
| A3 | **Install them** (npm, from the public registry; lockfile committed) | CLAUDE.md: installing needs approval | Free |
| A4 | **GitHub Actions CI** on the existing repository | Roadmap acceptance: CI green | GitHub Free minutes (about 2,000 min/month included) |
| A5 | **Docker Desktop** locally, for PostgreSQL in a container (if not already installed) | Local database that matches production | Free for personal use; check the licence terms for a company |
| A6 | **Claude Code hooks and two review subagents** in `.claude/` (format and typecheck after edits; a security reviewer and an accessibility reviewer) | Roadmap deliverable | Free |
| A7 | **Later in the phase, separately:** staging on Render Frankfurt, R2 (EU), error tracking (GlitchTip EU or Sentry EU), email (Scaleway TEM or fallback). These create external accounts and cost money. | Roadmap: "staging environment (if approved and budgeted)" | About $20/month for staging (estimate; verify before purchase) |

**A2, the proposed libraries:**
- **Framework and language:** Next.js (App Router), TypeScript strict
- **Data:** Drizzle ORM and Zod
- **Auth and jobs:** Better Auth; pg-boss
- **Messages:** next-intl
- **UI:** Tailwind CSS generated from `design/tokens/tokens.json`, plus accessible primitives (Radix UI or React Aria, to compare in the ADR); Phosphor icons (D-057)
- **Tests:** Vitest, Playwright, axe-core
- **Lint and format:** ESLint and Prettier, or Biome (to compare in the ADR)

RECOMMENDED: approve A1 to A6 together; A7 when the staging step comes.

## Steps
⛳ = owner decision point.

| # | Step | Deliverables | Acceptance |
|---|---|---|---|
| 4.0 | ⛳ Kickoff | This plan approved; ADR-0003 (libraries, with the alternatives compared); D-numbers | Owner approves A1–A6 |
| 4.1 | Scaffold | Next.js app in `app/` (or `apps/web/`), TypeScript strict, path layout, `.env.example` (no secrets), README for running locally | `npm run dev` serves an empty page in HR |
| 4.2 | Quality gates and CI | Lint, format, typecheck, Vitest, Playwright with axe-core; GitHub Actions running them on every push and PR; Claude hooks and review subagents (A6) | CI green on an empty app; a failing test fails CI |
| 4.3 | Database and local environment | Docker Compose with PostgreSQL 17; Drizzle schema and migrations for users, sessions, audit log, feature flags; seed script with fictional data only | Migrations run up and down locally; no real personal data anywhere |
| 4.4 | Design tokens and base components in code | `tokens.json` → CSS variables and Tailwind theme (same build as `design/tokens/`); self-hosted Sora and Inter (D-028); the component contract of `docs/design/components.md` for the pieces sign-in needs (button, field, notice, toast, dialog, top bar); the Phase 3 accessibility rules (components §3.2, §4.9, phase-3-review §5) | Contrast check runs in CI; axe-core clean on the built pages; keyboard and focus as specified |
| 4.5 | ⛳ Authentication | Better Auth: email and password (D-054 and D-061 rules, the breached-password check), Google, email verification, password reset (D-076 flow), TOTP with recovery codes, lockout (D-077); strong auth for admin roles; Argon2id (R-14) | Auth test suite passes; the threat model's auth items checked; owner reviews the sign-in screens |
| 4.6 | Sessions and revocation | Session list, sign out of one or all devices, other devices signed out on a password change by default (D-072) | Tests for revocation |
| 4.7 | HR/EN messages | next-intl with ICU plurals (Croatian three forms); the copy guide's glossary (D-084) as the source; a completeness check in CI | Missing or unused keys fail CI |
| 4.8 | ⛳ Authorization policy module | One server-side module implementing `architecture/visibility-matrix.md` (R-01), with a test per row of the matrix: blocks both ways (D-019), private profiles, signed-out visitors (D-022), Music DNA visibility, lists (D-033) | Authorization suite green; an independent subagent review (High effort) |
| 4.9 | Audit log, feature flags, admin shell | Append-only audit log for security and moderation events; feature flags (also "paused feature", SYS-04); an admin shell with roles and no product tools yet | Role checks tested; audit entries for sign-in, lockout, role change |
| 4.10 | Security baseline | Security headers and CSP, rate limiting (sign-in, reset, invite), error tracking without personal data (A7), dependency audit in CI | Headers checked by a test; rate limits tested |
| 4.11 | ⛳ Staging (if A7 approved) | Render Frankfurt web + Postgres, R2 EU, reproducible deploy from `main`, secrets only in the provider | A clean deploy from scratch works twice |
| 4.12 | Review and close | Independent security review (subagent), STATUS/HANDOFF/DECISIONS | Roadmap acceptance: CI green, auth and authorization tests pass, accessibility baseline checks pass, staging reproducible, security review done |

## Carried over from Phase 3
- The prototype `design/prototypes/pulse/` is the reference for look and behaviour, not code to copy. The mockup is inspiration, not a feature spec.
- The Phase 3 accessibility rules that the app must keep: `docs/design/phase-3-review.md` §5.
- Brand assets for the app: `docs/brand/derived/icons/` (favicon, apple-touch, PWA any and maskable, the notification badge). The wordmark is interim until X-04.
- Open items that do not block Phase 4:
  - OQ-28 (archive depth)
  - OQ-32 (opt-in social emails, before B3)
  - JO2–JO6 (RECOMMENDED journey defaults)
  - the owner's Narrator listen
  - counsel questions (before the alpha, not before Phase 4)

## Not in this phase
Product features (Daily Drop, profiles, Music DNA, follows, moderation tools): Phase 5. Public deployment, inviting users, spending beyond A7, legal documents.

## Effort
High for 4.0, 4.5, 4.8, 4.10 and 4.12 (auth, authorization, security). Medium for the rest. Claude recommends Fable or Opus at High for the auth and authorization steps.
