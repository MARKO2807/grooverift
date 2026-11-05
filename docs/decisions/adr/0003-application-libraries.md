# ADR-0003: Application libraries for the Phase 4 foundation

- **Status:** **Accepted** by the owner on 2026-11-05 (D-088: Phase 4 approved with a free hand on libraries; the owner joins when an account, key or token is needed)
- **Date:** 2026-11-05
- **Deciders:** Owner (final), Claude (proposal and selection within the free hand)

## Context
ADR-0002 fixed the architecture (Option B: one TypeScript app on Next.js, PostgreSQL, Better Auth, pg-boss, Render Frankfurt, R2 EU) and left the supporting libraries to Phase 4. `docs/phase-4-plan.md` A2 listed the proposal and asked for two comparisons: accessible UI primitives (Radix UI or React Aria) and the lint toolchain (ESLint and Prettier, or Biome). Constraints that decide:

- WCAG 2.2 AA is a baseline requirement (CLAUDE.md); the Phase 3 rules in `docs/design/components.md` §3.2 and `docs/design/phase-3-review.md` §5 must survive in code.
- HR and EN with Croatian plural forms (Master Prompt §2, D-084 glossary).
- Solo developer with Claude Code: fewer tools, well-known defaults, no bespoke build steps.
- Authorization correctness is the top engineering risk (S-02, R-01): a SQL-first ORM with typed migrations and a single policy module.
- Argon2id for passwords (R-14).
- No money and no accounts for this ADR: everything is free and open source.

## Options considered

### Accessible UI primitives
1. **React Aria Components** (Adobe, Apache-2.0). Headless components with the ARIA patterns, keyboard and focus management built in, locale-aware (date, number and text direction), works with Tailwind through render props and `data-*` state attributes. Larger API; some components are client-only.
2. **Radix UI primitives** (MIT). Popular, small API, good dialog and menu patterns. Weaker on forms, no built-in locale handling, several primitives expect their own composition model; the project moved slower in 2025.
3. **No library, hand-written primitives.** Full control, but every pattern (dialog focus trap, menu roving tabindex, listbox) must be written and tested by one developer.

### Lint and format
1. **ESLint with `eslint-config-next` plus Prettier.** The Next.js config brings `@next/eslint-plugin-next`, `react-hooks` and **`jsx-a11y`**, which checks the accessibility rules we must keep. Prettier formats TypeScript, CSS, JSON and Markdown.
2. **Biome.** One fast tool for lint and format, but its Next.js and React Hooks rule coverage lags `eslint-config-next`, and its accessibility rules are a subset of `jsx-a11y`.

### Other choices made in this ADR
- **PostgreSQL driver:** `pg` (node-postgres), because pg-boss requires it and Drizzle supports it, so one pool serves the ORM, Better Auth (through the Drizzle adapter) and the job queue. `postgres` (postgres.js) was the alternative; two drivers would mean two pools.
- **Password hashing:** `@node-rs/argon2` (prebuilt binaries, no native build) plugged into Better Auth's `password.hash` and `password.verify` (R-14). The alternative `argon2` package compiles with node-gyp, which is fragile on Windows and in CI.
- **TypeScript:** 5.x. The TypeScript 7 line (the native compiler) was published in 2026 but is not yet the version Next.js 16 and `typescript-eslint` are tested against.
- **Tailwind CSS 4:** CSS-first configuration (`@theme`) that can read our generated `--gr-*` custom properties, so the token build stays the single source and the design tokens are not duplicated into a JavaScript config.

## Decision
| Area | Library | Version at selection |
|---|---|---|
| Framework | Next.js (App Router), React | 16.4, 19.3 |
| Language | TypeScript strict | 5.9 |
| Data | Drizzle ORM, drizzle-kit, `pg` | 0.45, 0.31, 8.23 |
| Validation | Zod | 4.6 |
| Auth | Better Auth (+ drizzle adapter, `twoFactor`, `admin`, `haveIBeenPwned`, `nextCookies`), `@node-rs/argon2` | 1.7, 2.2 |
| Jobs | pg-boss | 12 |
| Messages | next-intl (ICU plurals; Croatian one/few/other) | 4.14 |
| Styling | Tailwind CSS 4 with `@tailwindcss/postcss`; tokens from `design/tokens/tokens.json` | 4.3 |
| UI primitives | **React Aria Components** | 1.22 |
| Icons | `@phosphor-icons/react` (D-057, light weight) | 2.1 |
| Unit tests | Vitest | 5.1 |
| End-to-end and accessibility | Playwright, `@axe-core/playwright` | 1.64, 4.14 |
| Lint and format | **ESLint 10 with `eslint-config-next` (incl. `jsx-a11y`), Prettier 3** | 10, 16.4, 3.9 |

React Aria Components wins the primitives comparison on accessibility and locale support, which are both baseline requirements. ESLint plus Prettier wins the toolchain comparison because of `jsx-a11y` and the Next.js rules; speed is not a concern at this project size.

## Consequences
- Lockfile committed; dependency audit runs in CI (step 4.10).
- All of the above are free and open source (MIT, Apache-2.0 or ISC); no accounts.
- React Aria Components is a client-side library; server components wrap it. Bundle size is watched on the sign-in pages (Phase 6 performance budget).
- `@node-rs/argon2` ships platform binaries; Render's Linux x64 and the Windows development machine are both covered.
- Tailwind 4 requires Node 20+ and modern browsers (Safari 16.4+, Chrome 111+, Firefox 128+), consistent with the PWA target.
- Follow-ups: ADR for the email provider and error tracking when A7 is approved; `web-push` and `sharp` come with the features that need them (Phase 5).

## Rollback / exit
Every library is replaceable in isolation: React Aria for Radix or hand-written primitives (components are wrapped once in `src/components/ui`), Drizzle for another SQL-first ORM (the schema is plain SQL in migrations), Better Auth for another session-based auth library (tables are plain, passwords are Argon2id hashes that any library can verify), ESLint for Biome (one config file). None of them owns data in a proprietary format.
