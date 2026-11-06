# Deploy runbook: staging on Render (step 4.11, A7 / OQ-33)

_Written 2026-11-05 (session 22) so the owner can create the external accounts in one sitting. Nothing below exists yet; every step that creates an account or costs money is the owner's (CLAUDE.md approval gates). Prices are estimates from the Phase 2 research: verify in the dashboard before confirming._

## 0. What the code already expects

| Variable | Where it is read | Staging value |
|---|---|---|
| `APP_URL` | Better Auth base URL, email links, CSRF origin | `https://<service>.onrender.com` (later `https://staging.grooverift.com`) |
| `DATABASE_URL` | Drizzle, Better Auth, pg-boss | from the Render database |
| `BETTER_AUTH_SECRET` | sessions, TOTP secret encryption, audit IP hash | 32+ random bytes, which is **at least 43 characters** once encoded (the production guard in `src/lib/env.ts` refuses shorter values and the server answers 500); **the same value on web and worker** |
| `IP_HEADERS` | lockout and rate limits (`src/lib/auth/lockout.ts`, Better Auth) | `true-client-ip` (set by Cloudflare in front of Render). **Not** `x-forwarded-for`: Render appends to a client-supplied value, so every request carried a list and Better Auth resolved no IP at all (review 5.2 M6, staging 2026-11-06) |
| `EMAIL_TRANSPORT`, `EMAIL_FROM` | `src/lib/auth/email.ts` | a real provider (see §3); production refuses `console` |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google sign-in appears only when both exist | from §4 |

`render.yaml` at the repository root declares the web service, the worker and the PostgreSQL 17 database in Frankfurt.

## 1. Render (web + worker + Postgres), about $14 + $6 per month

1. Create the Render account with the owner's email; enable two-factor on it (it holds the production database).
2. Dashboard → **New → Blueprint** → connect `MARKO2807/grooverift` → Render reads `render.yaml` and proposes three resources in Frankfurt. Confirm.
3. Until the email provider exists (§3), set `EMAIL_TRANSPORT=none` and `EMAIL_FROM=GrooveRift <no-reply@grooverift.com>` on the web service and the worker: the server starts but sends no mail, which is acceptable only while nobody can sign up. Then in the web service's **Environment** set `EMAIL_TRANSPORT`, `EMAIL_FROM` (§3) and, when ready, the Google keys (§4). Generate `BETTER_AUTH_SECRET` locally in a separate terminal (never in a chat): `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` (44 characters) and paste the same value into the web service and the worker. Render's own `generateValue` gave only 32 hex characters on 2026-11-06, which the production guard refuses.
4. First deploy: build runs `npm ci && npm run build`, the pre-deploy command runs the migrations and upserts the genre list (`npm run db:seed-genres`, reference data, idempotent, D-096), then `npm run start`. The worker starts `npm run worker`; it publishes the Daily Drop at 00:00 UTC and mails the staff alerts (step 5.6), so it needs the same `EMAIL_TRANSPORT` and `EMAIL_FROM` as the web service. Check after the first deploy: the worker log says `[worker] started`, and ADM-09 (`/admin/editorial/jobs`) shows a run for today once a question is scheduled or in the reserve.
5. Check: open `https://<service>.onrender.com/` (Croatian landing), `/en`, `/sign-in`; response headers carry the CSP and `Strict-Transport-Security`. `/api/auth/get-session` returns `null`.
6. **Do not seed staging with `npm run db:seed`** unless the fictional accounts are wanted there. Sign-up is by invitation only (D-097), so the first admin comes from a one-off script in the Render shell of the web service (both commands refuse once any admin exists):
   1. `npm run admin:bootstrap -- invite <owner address>` prints an invitation link (Croatian, 14 days); it is not emailed.
   2. Open the link, sign up, finish onboarding, enable two-factor.
   3. `npm run admin:bootstrap -- promote <owner address>` gives that account the admin role. Both steps are written to the audit log as system actions.
7. Acceptance for 4.11: a clean deploy from the blueprint must work twice. The first was staging (session 34, D-110); **the second is the creation of production from the same `render.yaml` (owner, D-115)**, not a teardown of staging. When production is created, follow this runbook from §1 without manual steps that are not written here, then run the §6 client-IP checklist; anything done by hand that the runbook lacks is added to it before the deploy counts.
8. Review Render's DPA and subprocessor list (ADR-0002 consequence) before any real person's data enters staging.

## 2. Cloudflare R2 (EU jurisdiction), about $0–1 per month

**Done in session 35 (D-113).** As built: Cloudflare account on the project mailbox → R2 Object Storage → "Add R2 subscription" (a card is required; $0 due, billed only above the free tier) → add a budget alert ($1) → **Create bucket** `grooverift-staging-media`, **Specify jurisdiction → EU** (the bucket list may not show it at first; refresh), Standard class, public access and r2.dev off → **Manage API Tokens → Create Account API token** `grooverift-staging`, Object Read & Write, **this bucket only**, TTL forever, no IP filter; copy the keys at once and the **EU** endpoint (`https://<account-id>.eu.r2.cloudflarestorage.com`). On Render, web **and** worker: `R2_ENDPOINT` (EU endpoint; the env guard refuses others), `R2_BUCKET`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, then Save, rebuild and deploy. Check: type `npm run r2:test` in the web service shell (PUT 200, GET 200, DELETE 204, GET after delete 404, OK).

## 3. Transactional email (security and account messages only, OQ-32)

**Chosen: ZeptoMail (Zoho, EU data centre), D-110.** The project already runs its mailbox on Zoho Mail EU (D-108) and the ZeptoMail DNS records were added then. Scaleway TEM stays the fallback. Steps:
1. Sign in to ZeptoMail with the Zoho EU account (the console host must be `zeptomail.zoho.eu`; if it opens on `.com`, stop: the data must stay in the EU).
2. Domains: `grooverift.com` must show SPF and DKIM verified (added in D-108). Add a DMARC record if none exists yet (`_dmarc`, start with `p=none`).
3. Mail Agents: one agent "grooverift-staging". In its settings, **turn off open and click tracking** (one-time links must not be rewritten).
4. Mail Agent → SMTP/API → API: copy the **API host** shown in the sample (the EU host) and create a **Send Mail token**.
5. On Render, web service and worker: `EMAIL_TRANSPORT=zeptomail`, `EMAIL_FROM=GrooveRift <no-reply@grooverift.com>`, `ZEPTOMAIL_API_URL=<the host, e.g. https://api.zeptomail.eu>`, `ZEPTOMAIL_TOKEN=<the token>` (never in a chat or a commit).
6. Check: request a password reset for the admin account on staging; the mail arrives, the sender shows GrooveRift, SPF/DKIM/DMARC pass in the headers.

## 4. Google sign-in (free)

**Done in session 35 (D-112).** As built: Google Cloud Console → new project "GrooveRift" (no organisation; do not take the $300 trial, it opens billing) → **Google Auth Platform** → Get started (app name GrooveRift, support email, audience **External**, contact the project mailbox) → **Branding**: home, `/legal/privacy`, `/legal/terms` on the staging host, authorised domain `grooverift-staging.onrender.com` (Save stays grey until the domain of those links is listed), **no logo** (it triggers app verification) → **Audience**: keep **Testing**, add every Google address that will sign in as a test user → **Data Access**: `openid`, `userinfo.email`, `userinfo.profile` → **Clients** → Create client (Web application, "GrooveRift staging"), no JavaScript origins, redirect URIs `https://grooverift-staging.onrender.com/api/auth/callback/google` and `http://localhost:3000/api/auth/callback/google`; copy the secret at once (Google shows it only then). Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` on the **web service** (Save, rebuild and deploy) and in `.env.local`. Check: the staging sign-in page payload carries `googleEnabled":true`. Better Auth links a Google identity to an existing account only when Google has verified the email and the addresses match (S-09, `allowDifferentEmails: false`). Before the alpha: switch the audience to "In production" (owner) and, with the real domain, add it to the authorised domains and redirect URIs.

## 5. Error tracking (GlitchTip EU or Sentry EU), $0–15 per month

Create the project, copy the DSN. Claude then adds the SDK with `sendDefaultPii: false`, scrubbing of request bodies and cookies, and the DSN as `SENTRY_DSN` (the same variable name works for GlitchTip). No personal data in events (threat model: logs and error tracking carry no message bodies or private content).

## 6. After everything is set

Claude: close step 4.11 (STATUS, DECISIONS: the chosen providers as a decision), add the provider transports, run the clean-deploy-twice check, and note the monthly cost against D-010.

**Client-IP check (review 5.2 M6), before any invite:** send a request with a forged `X-Forwarded-For: 203.0.113.9` and confirm in a throwaway debug log (removed afterwards) that `src/lib/http/client-ip.ts` sees the real client address, not the forged one. If Render appends instead of replacing, switch to the entry the proxy appended (rightmost) or to a header the edge overwrites. Lockout and every rate limit depend on it.

**Done on staging (session 36, D-114).** Finding: Render appends to a client-supplied `X-Forwarded-For`, so the header was always a list, Better Auth resolved no IP (`session.ip_address` empty, the log warning "could not determine a client IP") and every client shared one bucket. Fix: `IP_HEADERS=true-client-ip`. **Repeat on every new Render environment (production too):**
1. Ten failed sign-ins to `/api/auth/sign-in/email` with an unknown address, each with a different forged `True-Client-IP`: the eleventh must be `429` (the forged value is ignored). A forged `X-Forwarded-For` must also get `429`; a forged `CF-Connecting-IP` gets `403` from Cloudflare.
2. Sign in once, then in the web service Shell: `node -e "const {Client}=require('pg');const c=new Client({connectionString:process.env.DATABASE_URL});c.connect().then(()=>c.query('select ip_address, created_at from session order by created_at desc limit 5')).then(r=>{console.table(r.rows);return c.end()})"`. The newest row must show an address, never `''`.
3. Logs: no "could not determine a client IP" after the deploy.
