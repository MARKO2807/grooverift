# Deploy runbook: staging on Render (step 4.11, A7 / OQ-33)

_Written 2026-11-05 (session 22) so the owner can create the external accounts in one sitting. Nothing below exists yet; every step that creates an account or costs money is the owner's (CLAUDE.md approval gates). Prices are estimates from the Phase 2 research: verify in the dashboard before confirming._

## 0. What the code already expects

| Variable | Where it is read | Staging value |
|---|---|---|
| `APP_URL` | Better Auth base URL, email links, CSRF origin | `https://<service>.onrender.com` (later `https://staging.grooverift.com`) |
| `DATABASE_URL` | Drizzle, Better Auth, pg-boss | from the Render database |
| `BETTER_AUTH_SECRET` | sessions, TOTP secret encryption, audit IP hash | 32+ random bytes; **the same value on web and worker** |
| `IP_HEADERS` | lockout and rate limits (`src/lib/auth/lockout.ts`, Better Auth) | `x-forwarded-for` (Render sets it; it replaces client values) |
| `EMAIL_TRANSPORT`, `EMAIL_FROM` | `src/lib/auth/email.ts` | a real provider (see §3); production refuses `console` |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google sign-in appears only when both exist | from §4 |

`render.yaml` at the repository root declares the web service, the worker and the PostgreSQL 17 database in Frankfurt.

## 1. Render (web + worker + Postgres), about $14 + $6 per month

1. Create the Render account with the owner's email; enable two-factor on it (it holds the production database).
2. Dashboard → **New → Blueprint** → connect `MARKO2807/grooverift` → Render reads `render.yaml` and proposes three resources in Frankfurt. Confirm.
3. In the web service's **Environment** set `EMAIL_TRANSPORT`, `EMAIL_FROM` (§3) and, when ready, the Google keys (§4). Copy the generated `BETTER_AUTH_SECRET` into the worker's environment (same value).
4. First deploy: build runs `npm ci && npm run build`, the pre-deploy command runs the migrations, then `npm run start`. The worker starts `npm run worker`.
5. Check: open `https://<service>.onrender.com/` (Croatian landing), `/en`, `/sign-in`; response headers carry the CSP and `Strict-Transport-Security`. `/api/auth/get-session` returns `null`.
6. **Do not seed staging with `npm run db:seed`** unless the fictional accounts are wanted there; create the first admin by signing up, verifying the address, enabling two-factor, then setting the role with a one-off SQL statement in the Render shell: `update "user" set role = 'admin' where email = '<owner address>';` (audited manually in DECISIONS when done).
7. Acceptance for 4.11: delete the three resources and recreate them from the blueprint once more; a clean deploy must work twice.
8. Review Render's DPA and subprocessor list (ADR-0002 consequence) before any real person's data enters staging.

## 2. Cloudflare R2 (EU jurisdiction), about $0–1 per month

Needed by Phase 5 (avatars and media), not by Phase 4. When created: a bucket with **jurisdiction = EU**, an API token scoped to that bucket, and the variables `R2_ACCOUNT_ID`, `R2_BUCKET`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` (the code for uploads arrives with the feature and will read them).

## 3. Transactional email (security and account messages only, OQ-32)

Options from the Phase 2 research: Scaleway Transactional Email (EU, pay per message) or a fallback such as Brevo (EU). Steps: create the account; add the sending domain (`grooverift.com`) with SPF, DKIM and DMARC records; create an API key; then Claude adds the provider transport to `src/lib/auth/email.ts` (one function) and sets `EMAIL_TRANSPORT=<provider>`, `EMAIL_FROM=GrooveRift <no-reply@grooverift.com>` plus the provider's key variable. Until then staging cannot send verification mail, so sign-up on staging stays off (`sign_up` flag off by default).

## 4. Google sign-in (free)

Google Cloud Console → a project "GrooveRift" → OAuth consent screen (external, app name GrooveRift, support email, privacy policy URL once it exists) → Credentials → OAuth client (Web): authorised redirect URIs `https://<service>.onrender.com/api/auth/callback/google` and `http://localhost:3000/api/auth/callback/google`. Put the client id and secret in Render (and in `.env.local` for development). Better Auth links a Google identity to an existing account only when Google has verified the email (S-09, `trustedProviders: ["google"]`).

## 5. Error tracking (GlitchTip EU or Sentry EU), $0–15 per month

Create the project, copy the DSN. Claude then adds the SDK with `sendDefaultPii: false`, scrubbing of request bodies and cookies, and the DSN as `SENTRY_DSN` (the same variable name works for GlitchTip). No personal data in events (threat model: logs and error tracking carry no message bodies or private content).

## 6. After everything is set

Claude: close step 4.11 (STATUS, DECISIONS: the chosen providers as a decision), add the provider transports, run the clean-deploy-twice check, and note the monthly cost against D-010.
