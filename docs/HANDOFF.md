# Session handoff

_Session 25, 2026-11-05 (**step 5.1 done**, D-094). The owner asked Claude to keep going with every step that needs no owner input and will review later ("nastavi sa svim sljedećim zadatcima za koje ne trebaš moju izravnu pomoć"). Next: read `docs/STATUS.md`, this file, `docs/phase-5-plan.md` §3 row 5.2 and §4, and build **step 5.2** (High: data model and data-access layer)._

## Start-of-session checklist
1. `git status -sb` and `git ls-remote origin`: has the owner pushed the session 25 commits? If yes, check the GitHub Actions result (three jobs: checks, database, e2e; the run on `9485d72` was fully green). The Actions summary page is readable in the owner's Chrome through the browser tools; logs need a sign-in.
2. Check-up in Croatian (Završeno / Trenutno / Odluke / Rizici / Sljedeći korak / Treba odobrenje).
3. Effort: session 25 ran on **Opus 5.5, Medium** (the owner switched with `/model` and `/effort`). 5.2 is a High step: recommend High (Fable or Opus) and check `/effort`.
4. Local environment: Docker Desktop must be running (`docker compose up -d`), then `npm run db:migrate`, `npm run db:seed`, `npm run dev`. `.env.local` exists on the owner's machine (ignored; a generated `BETTER_AUTH_SECRET`). Session 24 started no server. If port 3000 is busy, find it with `netstat -ano | findstr :3000` and stop it before `npm run dev`. **Start the dev server from PowerShell** (`Start-Process cmd "/c npx next dev > $env:TEMP\grooverift-dev.log 2>&1" -WindowStyle Hidden`), stop it through `Get-NetTCPConnection -LocalPort 3000` and `Stop-Process`; confirm with `netstat`. Remind the owner about an open port in every reply while one is open.

## Where we are
- **Step 5.1 is done** (session 25): the signed-in shell (`src/components/app-shell.tsx`, rail from 600 px, glass tab bar, swipe, large text, `html[data-motion]` from `member_settings.reduce_motion`), the public shell, the Spirala and the invite current on canvas (D-094 (1)), PUB-01, PUB-10 drafts, PUB-11, PUB-12, SYS-01 to SYS-05, the four tab routes as honest placeholders, minimal Settings and Help. Implementation choices are D-094; the alpha-data question is OQ-34.
- **The owner's standing instruction (session 25):** continue with the steps that need no owner input; prepare everything for the owner to check later; the owner does the registrations (`docs/ops/owner-setup-checklist.md`). ⛳ points are prepared, summarised for review and left open where they need a decision.
- **Phase 5 rules unchanged (D-092):** free hand inside the plan; stop at CLAUDE.md gates (no installs, accounts, deploys, spending).

## What step 5.2 needs (read before building)
- Plan §3 row 5.2 and §4 (entities); `docs/architecture/domain-model.md`; `docs/architecture/visibility-matrix.md` §4 checklist; `src/lib/authz/policy.ts` (the loaders build `Viewer`, `Owner`, `Graph` and the facts for it).
- **Wire the DSA notice into storage:** `src/lib/legal/actions.ts` validates and audits only; add the `notice` table and store submissions (personal data minimised, retention per B.3 once counsel answers); remove the "not stored" line from STATUS risks and D-094 (4).
- The general rate limiter for public forms and posting (the notice form has none yet).
- Profile URLs: `/@username` is rewritten to `src/app/[locale]/u/[username]`, which answers 404 today; 5.5 fills it.

## Lessons (session 25)
- **`npm run build` while `next dev` runs breaks the dev server** (they share `.next`): flaky "document-title" axe findings followed. Stop dev, delete `.next`, start again after a build.
- **Next.js 16 renders `notFound()` through the client** (`<html id="__next_error__">` in the HTML, status 404); even a trivial `not-found.tsx` does it. Tests check in the browser, not the raw HTML (D-094 (6)).
- `noUncheckedIndexedAccess` is on: ported canvas code needs `!` on array reads.
- A max-width on `main.screen` fights the column padding (`--pad`) and squeezes forms on desktop; constrain the children (`.screen-narrow > *`).
- The locale cookie from `/en` switches every later page to English in the same browser context; scripts visit `/en` last or clear cookies.
- A rewrite in the proxy bypasses next-intl's middleware, so it must set `X-NEXT-INTL-LOCALE` itself.
- Run `node scripts/screens.mjs <scratchpad>/shots` after shell changes: it caught the 200 % zoom overflow (180 px width) that the 360 px pass missed.
- **Never put backticks inside a double-quoted `node -e` in Bash**: the shell runs them as commands. Write doc edits with the Edit tool or a script file.

## Lessons (session 24)
- New dependencies can reintroduce an advisory the project already closed through `overrides`; add the override for the new nested package (`readdir-glob` here) rather than ignoring a moderate finding. `npm install` applied the override to a freshly added package without a clean install.
- The plan file carries its own progress table (as `phase-4-plan.md`); STATUS mirrors it. Update both at a step boundary.

## Lessons (session 23)
- The global `a { color: Amber }` rule recolours anything placed inside a link: brand elements must set their own colour (`text-fg`). Check the other wordmark placements (landing, app shell) the same way when they get their final layout in 5.1.
- The auth screens match `pulse/` `data-kind="onb"` only when the top bar is **inside** the centred card (`.onb-shell` > `.onb-card` > `header.topbar` + `main.screen-onb`). Keep that structure for every onboarding screen in 5.4.
- Playwright from `node -e` with an unset env variable wrote screenshots into a stray `undefined/` folder in the repo; pass absolute paths. Screenshots belong in the scratchpad, never in the repo.
- E2e against the production build (`CI=1 PORT=3100 …`) runs fine while the dev server holds port 3000; `rate_limit` must be cleared first.

## How things work (the parts a new session needs)
- **Auth** is Better Auth 1.7 with the Drizzle adapter (`src/lib/auth/auth.ts`). `src/lib/db/schema/auth.ts` was generated by `npx @better-auth/cli@latest generate --config src/lib/auth/auth.ts --output src/lib/db/schema/auth.ts`; regenerate it after adding a plugin or a user field, then `npm run db:generate -- --name <what>` and `npm run db:migrate`. Ids are UUIDs generated by PostgreSQL.
- **Every credential form** is a client component with `useActionState` posting to `src/lib/auth/actions.ts` (a `"use server"` module: it may export only async functions; constants live in `src/lib/auth/constants.ts`). Errors are message keys under `authErrors`; dynamic keys are declared with `// i18n-keys:` comments so the catalogue check counts them as used.
- **Two Better Auth endpoints re-issue the session** (new cookie, old session deleted): `changePassword` and `verifyTOTP` during setup. A server action that calls them must end with `redirect(...)`; returning state makes Next re-render with the old cookie and the member lands on sign-in. The recovery codes after setup are shown through the `gr_2fa_setup` marker cookie (2 minutes) and `auth.api.viewBackupCodes` (server-only); the "Spremio sam kodove" button clears the marker.
- **Lockout** (`src/lib/auth/lockout.ts`): a before hook (refuse while locked) and an after hook (count or clear) on `/sign-in/email`; Better Auth's rate limiter (database storage) sits in front. Keys are keyed SHA-256 hashes of `email|ip`; the IP comes from `IP_HEADERS` (empty locally → "local"; set `x-forwarded-for` on Render).
- **The policy module** (`src/lib/authz/policy.ts`) is pure. Phase 5's data layer (step 5.2, `src/lib/data/`) loads `Viewer`, `Owner`, `Graph` and facts, then calls `canViewProfileSection`, `canViewContent`, `canViewConversation`, `canViewPlaylist`, `canViewStaffObject`, `canInteract`. Staff "through a case" decisions return `mode: "case"` only when `ctx.caseId` is given; the caller logs the access.
- **Admin pages** live under `src/app/[locale]/(app)/admin/`; every page runs `adminPageGate` itself (`requireRole("editor", "moderator", "admin")`, which also demands `twoFactorEnabled`). Seeded staff accounts see the "turn on two-step verification" notice until they enable it.
- **Messages:** `messages/hr.json` and `messages/en.json` must have the same keys; `scripts/i18n-check.mjs` also flags unused keys and understands binding names other than `t` (`const tl = await getTranslations("…")`).
- **Tokens:** edit `design/tokens/tokens.json`, run `npm run tokens`; `src/styles/tokens.css` holds the `--gr-*` variables and a Tailwind `@theme` block (colour names shortened: `bg-canvas`, `text-fg-secondary`, `text-coral`). `src/styles/components.css` ports the Phase 3 component CSS (class names match `docs/design/components.md`).
- **Tests:** `npm run test` (unit, no database), `npm run test:db` (needs PostgreSQL; touches only its own rows, never the seeded flags), `npm run test:e2e` (Playwright reuses a running dev server; CI builds and serves). The e2e suite reads security email from `.mail-outbox.jsonl` (`EMAIL_TRANSPORT=file`), creates fresh `@example.test` accounts per run and computes TOTP codes itself (`tests/e2e/helpers.ts`).
- **Worker** (`src/worker.ts`): pg-boss on the same database, one housekeeping job today; 5.6 adds the publication job keyed by UTC date, 5.10 the export and purge jobs, 5.12 the reminder scheduler.
- **CI** (`.github/workflows/ci.yml`): checks (format, lint, typecheck, tokens, i18n, unit, `npm audit --omit=dev --audit-level=high`), database (migrations current, migrate, seed, db tests), e2e (build, Playwright chromium with axe-core). The env values in the workflow are placeholders for the CI database only.

## Lessons (session 22)
- **Never edit UTF-8 files with PowerShell `Get-Content`/`Set-Content`:** Windows PowerShell 5.1 decodes as the ANSI code page and writes a BOM, which double-encoded `messages/*.json` (č → "ÄŤ") and broke `package.json` for Turbopack. Use the Write/Edit tools or Node; strip a BOM with `[System.IO.File]::ReadAllBytes`. ASCII-only files (`.env.example`, test setup) survive `-Encoding ascii`.
- `localhost` resolves to `::1` on this machine while the container publishes on `127.0.0.1` only: every local `DATABASE_URL` uses `127.0.0.1`.
- The Claude PostToolUse hook typechecks after every edit, so a batch of new files produces transient errors until the last file lands; they clear on their own.
- A `"use server"` file may export only async functions (constants and re-exports break the build).
- `@node-rs/argon2` is native: nothing imported by a client component may import it (hence `password-policy.ts`).
- The HIBP plugin shipped with Better Auth fails closed; the project's own plugin (`breached.ts`) fails open per D-054.
- Better Auth recovery codes are mixed-case by default; the project generates lower-case codes so phone keyboards do not break them.
- `next-intl`'s middleware forwards the request headers it was given: set `x-nonce` and the CSP on `request.headers` in place before calling it (wrapping the request in a new `Request` returned 404s).
- Playwright: scope `getByRole("alert")` to `main` (the Next.js dev overlay adds its own) and wait for the sign-in action's redirect before the next `goto` (the `signIn` helper does); the lockout test must create its own account because lock stages outlive a rerun.
- `npm overrides` for nested dependencies usually apply only after a clean install (`rm node_modules package-lock.json`); session 24's override applied on a plain `npm install` because the package was new.
- **Start the dev server from PowerShell, not from the Bash tool:** a server started with `( VAR=1 npx next dev & )` in Git Bash did not receive the inline variables. `$env:X="1"; Start-Process cmd "/c npx next dev"` works and the server can be checked with a throwaway route.
- **Deleting a route directory while `next dev` runs** left Turbopack in a reload loop. Stop the server, delete `.next`, start again.
- `next build` evaluates the auth module with `NODE_ENV=production`; start-up-only guards must skip `NEXT_PHASE=phase-production-build`.
- Playwright against the production server (CI mode) runs with `CI=1 PORT=3100 APP_URL=http://localhost:3100 PLAYWRIGHT_BASE_URL=http://localhost:3100` after `npm run build`; the tests must not hard-code the port.
- **CI values must satisfy the production guards** (`src/lib/env.ts`): `BETTER_AUTH_SECRET` needs 43+ characters and the file mail transport needs `E2E_EMAIL_FILE=1`. A guard failure shows as a 500 on every page and "Timed out waiting 120000ms from config.webServer" in Playwright; the server's own output is piped into the CI log.
- The e2e suite needs `E2E_EMAIL_FILE=1` on the server and a cleared `rate_limit` table between runs (`docker compose exec -T postgres psql -U grooverift -d grooverift -c "delete from rate_limit;"`).

## Review findings (session 22, end): pointers
The security review (3 high, 6 medium, 7 low) and the WCAG 2.2 AA review (3 must, 11 should, 7 nice) of the foundation were fixed in `b7dac27` (D-090). The full list is in git history (`git show 9485d72:docs/HANDOFF.md`, "Review findings") and the rules that changed are in D-090 and `docs/security/threat-model.md` §6. **Left open on purpose:** CSP `style-src 'unsafe-inline'` (D-089 (12), Phase 6), `report-to` for CSP, SHA-pinned GitHub actions, the Render client-IP header to confirm on the first deploy (runbook §1), `aria-current` on the admin nav, `dialog.tsx` unused until a flow needs it.

## Phase 3 record (pointers)
The design phase's full session notes live in git history (`git show 5c09880:docs/HANDOFF.md`) and in `docs/design/phase-3-plan.md`, `docs/design/phase-3-review.md`, `docs/design/prototype-directions.md` §7 and `docs/decisions/DECISIONS.md` (D-026 to D-087). The prototype `design/prototypes/pulse/` is the reference for look and behaviour; its checks (`pulse-smoke.mjs` 155/155, `a11y-check.mjs`, `zoom-check.mjs`) still run and must stay green when the prototype changes. Owner rules kept: one hub for every review page (`design/prototypes/index.html`), full `file:///` URLs when pointing the owner at a page, every open point as a survey with the example inside the question, ask before anything that touches a strict Master Prompt rule, port rule for `serve.mjs` and the dev server.

## Open items for the owner
- A4: MetaBrainz registration and the project mailbox (before 5.3).
- A7 / OQ-33 (staging, R2, error tracking, email provider, Google OAuth client).
- OQ-06 (who moderates, response time for the alpha notice), OQ-24, OQ-29, OQ-32; the Narrator listen; counsel questions (B.3 retention periods, B.5, C.9, C.10).

## Notes
- **Research docs** are subagent output. Re-check prices and terms before any purchase.
- **Live catalog:** MusicBrainz, Wikidata and Commons send CORS headers; MusicBrainz rate-limits to about 1 request per second and requires a User-Agent with contact information. Never put the owner's personal email in a User-Agent or any request field; the project mailbox goes into `MUSICBRAINZ_CONTACT` (5.3).
- **Shell:** single quotes inside `node -e '...'` break on apostrophes; `git commit -m @'...'@` breaks in PowerShell 5.1 when the message contains double quotes (use `git commit -F <file>`); long Bash heredocs with non-ASCII text fail (write scripts with the Write tool); `npx tsx` scripts must live inside the repo to resolve `node_modules`, and top-level `await` needs a `.mts` file.
- **Headless Chrome:** CDP capture pattern in `design/prototypes/tools/pulse-smoke.mjs`; Windows will not render a window narrower than about 500 px (use `Emulation.setDeviceMetricsOverride`).
- **Tools:** git, Node 22.12, npm 10.9, Docker 28, Chrome, Playwright chromium (installed). Not installed: Python (Store stub only), ImageMagick, Inkscape, pnpm, `gh`, Mermaid CLI.
- **TMview/EUIPO block automated browsing.** Never try to bypass it.
