# External accounts and services: inventory

_Written 2026-11-06 (session 35) at the owner's request, so every account the project depends on is listed in one place. **No passwords, tokens, recovery codes or personal addresses belong in this file** (CLAUDE.md). Store those in a password manager; this file only says which account exists, what it signs in with and where its secrets live. Keep it current whenever an account is added, renamed or closed._

**Legend.** "Project mailbox" = `dev@grooverift.com` (Zoho Mail Lite EU, D-108), the role address meant for project accounts. "Owner's personal Google" = the owner's own Gmail / Google account (address deliberately not written here). "?" = not recorded in the repository; the owner fills it in their password manager.

## 1. Accounts

| # | Service | What it is for | Signs in with | Plan and cost | Region | Secrets it produced, and where they live | Decision |
|---|---|---|---|---|---|---|---|
| 1 | **GitHub** | Source code, private repo `MARKO2807/grooverift`, GitHub Actions CI | GitHub user `MARKO2807` (sign-in email ?) | Free | n/a | none in the app | D-004 |
| 2 | **Domain `grooverift.com`** | The domain; DNS for mail and later the app | Registrar ? | ? per year | n/a | none | ? (registrar not recorded) |
| 3 | **Netlify** | DNS hosting for `grooverift.com` (NS1 name servers): MX, SPF, DKIM, DMARC, ZeptoMail bounce CNAME | ? | Free (DNS) | n/a | none | D-108, D-110 |
| 4 | **Zoho Mail Lite (zoho.eu)** | The project mailbox `dev@grooverift.com`; recovery address for infrastructure accounts | Project mailbox | Paid (Mail Lite), billed to the owner as an individual | EU | mailbox password, second factor, backup codes (password manager) | D-108 |
| 5 | **Zoho CPaaS / ZeptoMail (cpaas.zoho.eu)** | App mail: invitations, password resets, security notices, staff alerts; sender `no-reply@grooverift.com`, agent `mail_agent_1` | The Zoho EU account (same Zoho login as the mailbox, to be confirmed by the owner) | Prepaid credits (expire after 6 months), **auto top-up off** | EU | `ZEPTOMAIL_TOKEN` (Render web + worker) | D-110 |
| 6 | **MetaBrainz** | Permission to use MusicBrainz data commercially (step 5.3b) | Project mailbox | Stealth Start-Up, $0, **pending** (development use allowed) | n/a | none (`MUSICBRAINZ_CONTACT` is just the mailbox address) | D-018, D-108 |
| 7 | **Render** | Staging hosting: web `grooverift-staging`, worker `grooverift-staging-worker`, PostgreSQL `grooverift-staging-db`; blueprint `grooverift-staging` | Owner's address (which one ?), second factor on; GitHub access limited to the `grooverift` repo | About $20/month; pipeline minutes spend limit $0 | Frankfurt | `BETTER_AUTH_SECRET` (generated locally, set on web + worker), database URL (Render manages it) | D-110 |
| 8 | **Sentry** | Error tracking, organisation `grooverift`, project `grooverift-staging` | Project mailbox | Developer (free, after a 14-day trial), no card | EU (Frankfurt) | `SENTRY_DSN` (Render web + worker) | D-111 |
| 9 | **Google Cloud / Google Auth Platform** | "Nastavi s Google računom": project `grooverift`, OAuth client "GrooveRift staging", audience Testing | Owner's personal Google | Free; **no billing, $300 trial not taken** | n/a | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` (Render web only, `.env.local`) | D-112 |
| 10 | **Cloudflare** (R2 Object Storage) | Images and later data copies (step 5.11): bucket `grooverift-staging-media`, private | Project mailbox | R2 pay-as-you-go, $0 inside the free tier; **owner's card on file**; budget alert $1 recommended | EU jurisdiction | `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` (token `grooverift-staging`, this bucket only; Render web + worker); `R2_ENDPOINT`, `R2_BUCKET` are not secret | D-113 |

## 2. Accounts inside GrooveRift staging (`https://grooverift-staging.onrender.com`)

| Account | Role | Signs in with | Notes |
|---|---|---|---|
| Owner's admin | admin | Project mailbox + password + second factor (authenticator app) | made with `npm run admin:bootstrap` (D-110); recovery codes in the password manager |
| Owner's test member `@marko` | member | Owner's personal Google only (no password) | made through an invitation in session 35 (D-112); must stay a Google "test user" while the audience is Testing |

Local development accounts (`*@example.test`, seeded by `npm run db:seed`) are fictional and exist only on the owner's machine.

## 3. Where the secrets live

| Place | Holds |
|---|---|
| Render → `grooverift-staging` → Environment | `BETTER_AUTH_SECRET`, `EMAIL_TRANSPORT`, `EMAIL_FROM`, `ZEPTOMAIL_API_URL`, `ZEPTOMAIL_TOKEN`, `SENTRY_DSN`, `SENTRY_ENVIRONMENT`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `R2_ENDPOINT`, `R2_BUCKET`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `IP_HEADERS` |
| Render → `grooverift-staging-worker` → Environment | the same secret, email, Sentry and R2 values (no Google keys) |
| `C:\Users\marko\Desktop\GrooveRift\.env.local` (ignored by git, this machine only) | local `BETTER_AUTH_SECRET`, `MUSICBRAINZ_CONTACT`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, local database and mail settings |
| The owner's password manager (recommended) | every login above, second-factor backup codes, and a copy of each secret that cannot be shown again (Google client secret, ZeptoMail token, R2 secret access key) |

## 4. The owner's tidy-up checklist

For each row of §1:
- [ ] The login (email or user name) is written in the password manager, with the password.
- [ ] Second factor is on, and its backup codes are stored. Priority: Zoho (it is the recovery address of the others), GitHub, Render, Cloudflare (card on file), Google, Sentry.
- [ ] The recovery email is the project mailbox where the service allows it (not a personal address), except Google, which stays on the personal account (D-112).
- [ ] The billing contact and card (if any) are known: Zoho Mail Lite, ZeptoMail credits, Render, Cloudflare, the domain.
- [ ] Fill the "?" cells above in the password manager (domain registrar and renewal date, Netlify login, GitHub email, which address Render uses).

Later, when the legal entity exists (OQ-05): move billing and ownership of every paid account to it.
