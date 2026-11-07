# Application structure (Phase 4 foundation)

_Written 2026-11-05 (session 22), updated in sessions 25 (steps 5.1 and 5.2) and 28 (step 5.5). Describes the code as built; the plan is [`../phase-4-plan.md`](../phase-4-plan.md), the libraries are [ADR-0003](../decisions/adr/0003-application-libraries.md)._

## Layout

```
package.json, tsconfig.json, next.config.ts, postcss.config.mjs, eslint.config.mjs, .prettierrc.json
playwright.config.ts, vitest.config.ts, vitest.db.config.ts, drizzle.config.ts, docker-compose.yml
.env.example                      placeholders only; copy to .env.local (ignored)
.github/workflows/ci.yml          checks · database · e2e (three jobs, PostgreSQL service)
.claude/settings.json             PostToolUse hook: Prettier + typecheck after every edit
.claude/agents/                   security-reviewer.md, accessibility-reviewer.md (read-only reviewers)
scripts/tokens.mjs                design/tokens/tokens.json → src/styles/tokens.css (+ Tailwind @theme)
scripts/i18n-check.mjs            messages complete, no empty values, every key used (declare dynamic keys with // i18n-keys:)
scripts/claude-hooks/post-edit.mjs
drizzle/                          SQL migrations (0000 foundation, 0001 audit append-only, 0002 alpha model, 0003 alpha constraints,
                                  0004 invitations, 0005 profiles and search: follow_decline, pg_trgm + unaccent, search_fold(), GIN indexes) + meta
drizzle/down/                     hand-written reverts for 0002–0005 (tests/db/migrations.test.ts runs them on a scratch database)
messages/hr.json, en.json         next-intl catalogues (Croatian default; same keys in both)
public/fonts, public/icons        self-hosted Sora/Inter (OFL), brand icons (D-083), favicon.ico
src/
  proxy.ts                        next-intl locale routing + per-request nonce CSP; /@user rewrite; private, no-store on /me, /settings, /admin (no authorization here)
  lib/routing/paths.ts            the /@user rewrite and private-path rules (unit-tested)
  i18n/{routing,request,navigation}.ts
  app/[locale]/layout.tsx         <html lang>, fonts preload, skip link, NextIntlClientProvider, ToastProvider
  app/[locale]/page.tsx           PUB-01 landing (signed-in members go to /home)
  app/[locale]/legal/[doc], legal/notice, about/alpha, offline   PUB-10 drafts, PUB-11 DSA form, PUB-12, SYS-03
  app/[locale]/not-found.tsx, error.tsx, app/global-error.tsx      SYS-01 (one page, 404), SYS-02
  app/[locale]/[...rest], p/[id]  404 until their steps (B1)
  app/[locale]/drop/[date]/       HUB-02 signed in, PUB-07 with Open Graph signed out (step 5.7); a/[id] HUB-03 with comments,
                                  a/[id]/reactions POST-04; only published dates up to today open (U-03)
  app/[locale]/(app)/home, hub, hub/archive   HOME-01, HUB-01 (seven-day strip), HUB-04 (by month, jump to date)
  app/[locale]/u/[username]/      /@username (step 5.5): the profile (PROF-01/10, PUB-08, the P and B states), followers, following,
                                  drops (PROF-03), dna (PROF-04); src/lib/profile/page.ts gives the viewer and the 404 helper
  app/[locale]/specimen           dev and e2e only (E2E_SPECIMENS=1): the Spirala with fictional picks
  app/[locale]/(auth)/            sign-in, sign-in/second-step, check-email, reset, reset/sent, reset/new, verified
  app/[locale]/(auth)/join/       PUB-05 and onboarding (step 5.4): /join (invite, E1, E3), age, minor, language, account, username,
                                  reading, visibility, dna, dna-audience, how, reminder (push flag), done
  app/[locale]/invite/[token]/route.ts   the emailed link: token → httpOnly cookie → 303 /join (U-05); consumes nothing
  app/[locale]/(app)/home, hub, activity   three tabs: HOME-01, HUB-01 (5.7); ACT-01 Activity with the ACT-02 row on top (5.8)
  app/[locale]/(app)/me            the Profile tab's fixed target: redirects to /@<own username> (me/dna stays the editor)
  app/[locale]/(app)/search        DISC-05 α people search (step 5.5), private, rate-limited
  app/[locale]/(app)/activity/requests   ACT-02 follow requests
  app/[locale]/(app)/settings/profile, settings/privacy   PROF-08 (display name, bio, username change) and SET-05
  app/[locale]/(app)/settings, settings/help   minimal index and help (5.10 builds them out)
  app/[locale]/(app)/settings/    security (password, two-factor, devices), account (email)
  app/[locale]/(app)/admin/       layout gate (role + second factor), overview (ADM-01 with the Daily Drop warnings), members, flags, audit
  app/[locale]/(app)/admin/editorial/   step 5.6, editors and admins: calendar (ADM-04), drops/new and drops/[id] (ADM-05), reserve,
                                  jobs (ADM-09, "Publish now")
  app/api/auth/[...all]/route.ts  Better Auth handler
  app/manifest.ts                 web app manifest (icons any + maskable)
  components/ui/                  button, field (TextField, PasswordField, CodeField), notice, toast, dialog, form-status, icons
  components/auth/, settings/, admin/   the forms (client components with server actions)
  components/app-shell.tsx        the signed-in shell: top bar, rail (600 px+), glass tab bar (phone), swipe between tabs
  components/shell/               nav (TABS, Rail, TabBar), public-shell, alpha-mark (SYS-05), legal-links, draft-mark, swipe-tabs
  components/system/states.tsx    NotAvailable (SYS-01), FeaturePaused (SYS-04), BuildingPlaceholder
  components/motifs/              motif-lib, motif-canvas (loop, visibility, reduced motion), invite-current, spirala (+ spirala-model, pure)
  lib/music/genre-traits.ts       the traits that shape the Spirala (5.3 maps the catalogue onto them)
  lib/legal/                      notice.ts (Art. 16 validation), actions.ts (validate + audit until 5.2)
  lib/settings/motion.ts          member reduce_motion → <html data-motion>
  styles/shell.css                shell, columns, breakpoints 600/1024/1280/1600, large text (17.5em), public and system pages
  components/auth/auth-screen.tsx, locale-switch.tsx, brand/wordmark.tsx
  lib/env.ts                      Zod-validated environment (server only)
  lib/db/client.ts                one pg Pool, Drizzle with snake_case casing
  lib/db/schema/auth.ts           Better Auth tables (generated by `npx @better-auth/cli generate`; regenerate after plugin changes)
  lib/db/schema/app.ts            audit_log, feature_flag, sign_in_throttle, member_settings
  lib/db/schema/product.ts        the alpha model (plan §4): identity, profile, graph, catalogue, Music DNA, Daily Drop, content,
                                  notifications, trust and safety, operations. ONLY src/lib/data imports it (eslint rule)
  lib/data/facts.ts               loadViewer, loadOwners/loadOwner, loadGraphs/loadGraph: the facts for src/lib/authz
  lib/data/graph.ts               follow (with the seven-day wait after a decline), accept, decline (follow_decline), pending requests,
                                  unfollow, remove follower, block (removes follows both ways), unblock, mute
  lib/data/profiles.ts            profileByUsername → one "not-available" for every hidden reason, the blocker's own B state, counts per
                                  the list rule; listMembers (PROF-07), dropHistory (PROF-03), updateProfile, changeUsername (D-069),
                                  privacyState / setProfileVisibility (JO5) / setSectionAudience / setDiscoverable; peopleFor (rows the
                                  viewer may see)
  lib/data/people.ts              searchPeople: trigram + unaccent SQL that already excludes hidden and blocked members, then the policy
  lib/profile/constants.ts        pure profile rules shared with client code (name, bio, username window, audiences)
  lib/profile/actions.ts          "use server": follow, unfollow, block, unblock, accept, decline, remove follower, edit profile,
                                  change username, visibility, section audience, discoverable
  components/profile/             avatar (ring from visible genres only), profile-screen, relationship button with confirmations,
                                  profile-menu (Share, Block; Mute and Report in 5.9), person-row, row-actions, requests, list-page,
                                  people-search
  components/settings/profile-forms.tsx, privacy-rows.tsx   PROF-08 forms; SET-05 rows with their sheets
  lib/data/catalog.ts             resolveCanonicalId (redirect chains, loop refused), artistsByIds
  lib/data/editorial.ts           Daily Drop lifecycle with optimistic locking (version), listCalendar/listPool/listRuns, editorialHealth
                                  (JO4), publishForDate (advisory lock per UTC date, savepoint, reserve fallback, idempotent), staff recipients
  lib/editorial/rules.ts          pure: UTC date helpers, the 72-hour window, QUESTION_MAX, RESERVE_LOW, retry values
  lib/editorial/publication.ts    runPublication (audit + staff alert emails), dailyCheck (JO4 mail), alertMail (HR/EN)
  lib/editorial/actions.ts        "use server": create, save, the lifecycle moves, delete, withdraw (admin), Publish now
  components/admin/editorial.tsx, editorial-parts.tsx   ADM-04/05/09 forms (client) and server parts (nav, warnings, labels)
  lib/data/answers.ts             answers (one per member per question, edit, delete with placeholder), comments, the reaction,
                                  questionAnswers (the three sorts, counts of what the viewer may see), answerThread, whoReacted
  lib/data/drops.ts               published reads for members and visitors: publishedOn/ById, latest, the seven days, archive,
                                  firstDropState (countdown date only)
  lib/drop/                       rules.ts (pure: limits, sorts, page size, poll interval), actions.ts ("use server": post, edit,
                                  delete, comment, react, poll), present.ts (server: views → client props, dates)
  components/drop/                answer-card, reaction-button, composer (dock + dialog), comments, sort-control, new-answers,
                                  countdown, parts (Drop head, peeks, late line, first Drop, past list), public-drop, share-button
  lib/data/notifications.ts       Activity (5.8): notify (the one writer: never the own act, never across a block, grouping windows),
                                  activityFor (every entry re-checked at render), markActivityRead, pruneNotifications (worker),
                                  dropNotificationsBetween (called by blockMember)
  lib/data/push.ts                Push (5.12, D-117): devices bound to the session (saveSubscription, removeSubscription,
                                  setDevicePause, deviceFor), pushChoices/setPushType/setReminder, pushSocial (new Activity
                                  entries and follow requests; prefs, mute, status), remindersDue/runReminders (OQ-11, claim first)
  lib/push/                       rules.ts (pure: types, defaults, pause, zone arithmetic, payloads without names or text),
                                  crypto.ts (keys at rest, AES-256-GCM), send.ts (web-push, VAPID, push-service allowlist, test
                                  transport), actions.ts ("use server"), browser.ts (client: support, permission, subscription)
  public/sw.js                    the hand-written service worker: push and notificationclick only, no fetch handler, no cache
  lib/activity/actions.ts         "use server": markActivityReadAction (after the page rendered, never on GET)
  components/activity/            activity-list (Danas / Ovaj tjedan / Ranije by the member's local day, unread tint)
  lib/data/rate-limit.ts          the general limiter (hashed keys, fixed windows, LIMITS per scope)
  lib/data/notices.ts             DSA notice storage
  lib/data/invitations.ts         createInvitation (one open per normalised email), invitationByToken (usable or not, no reason),
                                  invitationMatches (the auth hooks), acceptInvitation (once, idempotent per member), revoke, list
  lib/data/onboarding.ts          onboardingState (the pointer), createOnboardingProfile, visibility, reading languages, DNA
                                  audience, reminder, finishOnboarding; usernameSuggestions
  lib/onboarding/                 steps.ts (pure order, progress, resume rule), constants.ts, cookies.ts (gr_invite, gr_join_adult),
                                  page.ts (stepPage: who may open a step), actions.ts ("use server"), username.ts (reserved names),
                                  invite-mail.ts (the HR/EN invitation mail)
  components/onboarding/          the step forms (account, username with the live check, reading, visibility, dna-picker,
                                  dna-audience, reminder, choice-form)
  lib/http/client-ip.ts           client IP from IP_HEADERS
  lib/db/migrate.ts, seed.ts      migrations; fictional seed (refuses production)
  lib/auth/auth.ts                Better Auth configuration (see below)
  lib/auth/actions.ts             "use server": every credential form posts here
  lib/auth/session.ts             getSession (cached per request), requireSession, requireRole (role AND second factor for staff), staffGate for pages
  lib/auth/hooks.ts               the one before/after middleware pair: password policy, sign-up only with the invitation cookie for that address + 18+, locale, closed admin endpoints + second factor + audit, lockout
  lib/auth/constants.ts           SETUP_DONE_COOKIE and the signed recovery-code marker
  components/admin/gate.tsx       adminPageGate: every admin page runs it (a layout check alone is not a guard)
  components/focus-on-navigate.tsx  navigation focuses the new page's h1
  lib/auth/lockout.ts             D-077 (pair 5/15 min → 15 min, 1 h, 24 h; account 100 → reset only); hashed keys
  lib/auth/breached.ts            HIBP k-anonymity, FAIL-OPEN with an audit event (D-054)
  lib/auth/password.ts            Argon2id (R-14); password-policy.ts is the isomorphic D-061 policy
  lib/auth/recovery-codes.ts      10 × "xxxxx-xxxxx" from an unambiguous lower-case alphabet
  lib/auth/roles.ts               member · editor · moderator · admin (Better Auth access control)
  lib/auth/email.ts               console | file | none transports until A7
  lib/authz/policy.ts             THE policy module (visibility matrix v0.3); pure, tested row by row
  lib/audit/index.ts              append-only writer; redacts credential-like keys; keyed IP hash, never a raw IP
  lib/flags/index.ts              on | off | paused (SYS-04), audience by role or user id, audited writes
  lib/admin/actions.ts            setRole, setFlag, createInvite (50/day, mails the link), revokeInvite (admin only, re-checked server-side)
  lib/auth/member-page.ts         memberPage: signed-in pages; a member who has not finished onboarding is sent to their next step
  worker.ts                       pg-boss: auth.throttle.prune and data.rate_limit.prune daily; daily_drop.publish at 00:00 UTC (retries
                                  with backoff, date from the cron tick, catch-up at start); editorial.check at 08:00 UTC (step 5.6);
                                  push.reminders every 5 minutes (step 5.12)
tests/unit/                       Vitest (policy 32, password, recovery codes, i18n)
tests/db/                         Vitest against the database (lockout, audit trigger, flags, worker, data layer and invariants, migrations up/down)
tests/e2e/                        Playwright + axe-core (landing, public pages, shell, not-available, auth flows, security headers), phone and desktop
scripts/screens.mjs               screenshot pass at 180/360/800/1366/1920 px (overflow, one h1, one main nav); output outside the repo
scripts/spirala-perf.mjs          Spirala frame times with the CPU throttled
```

## Rules that the code enforces

1. **Authorization is server-side and in one place.** Pages and actions call `getSession`/`requireSession`/`requireRole`; object decisions go through `src/lib/authz`. The proxy only routes locales. Staff roles need a second factor (`requireRole`). **Product tables are read and written only in `src/lib/data`** (ESLint `no-restricted-imports` outside it), which builds the policy facts and returns one "not-available" shape for every hidden reason.
2. **Credential forms are real `<form>` elements** posting to server actions (`useActionState`); errors come back as message keys, the typed values stay, focus moves to the error notice.
3. **Sessions:** 30 days, refreshed daily, `freshAge` 15 min for sensitive endpoints, **no cookie cache** (a revoked session stops at once). Better Auth re-issues the session after a password change and after two-factor setup, so those actions end with a redirect (the page must load with the new cookie).
4. **Email:** verification required before sign-in, except that an account made from an email-bound invitation is verified at once (JO6, step 5.4) and gets no verification mail; reset links 30 min single use; the email change is confirmed from the current address first (`sendChangeEmailConfirmation`), then the new address verifies. Production refuses to start without a transport (A7).
5. **Audit:** sign-in failures and locks, sessions created, users created, password reset/changed, two-factor enabled/disabled/codes regenerated, role changes, flag changes, breach-check skips. `audit_log` rejects UPDATE/DELETE/TRUNCATE (trigger).
6. **Personal data:** the audit log stores a keyed hash of the IP and a trimmed user agent; `sign_in_throttle` keys are hashes; the devices list shows a derived label, never the raw user agent.
7. **Headers:** CSP with a per-request nonce (`script-src 'self' 'nonce-…' 'strict-dynamic'`; `form-action` allows Google for sign-in), `frame-ancestors 'none'`, nosniff, referrer policy, COOP, permissions policy, HSTS in production. Signed-in pages are dynamic (`no-store`).
8. **Tokens and messages are generated or checked:** `npm run tokens` after editing `tokens.json`; CI fails on a stale `tokens.css`, on missing or unused message keys, and on a schema change without a migration.

## Running locally

See `README.md` (Setup). Seeded members (all fictional, `@example.test`): ana, luka, mia (members), editor, mod, admin; password `Prototip-lozinka-1!`. There is no open sign-up: a new member needs an invitation (`/admin/invites` as a seeded admin with a second factor, or a row inserted the way `tests/e2e/db.ts` does it); the link is printed by the console mail transport. The e2e suite reads security email from `.mail-outbox.jsonl` (file transport).

## Known gaps carried into Phase 5 and A7

- Email provider, error tracking, R2 and staging (A7).
- Dialog component is built but unused yet.
- The 404 page renders through the client in Next.js 16 (D-094 (6)).
