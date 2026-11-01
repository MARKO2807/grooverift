# Research: EU infrastructure options (2026-11-01)

> **Provenance:** web research by a Claude research subagent on 2026-11-01 from official pricing and docs pages (URLs inline). The main session has not re-verified the figures independently. Prices change, so re-check them before any purchase or ADR. **[Inference]** marks reasoning that the provider page does not state. All cost totals are **estimates**.

## Integrated platforms
- **Supabase** ([pricing](https://supabase.com/pricing), [backups](https://supabase.com/docs/guides/platform/backups), [regions](https://supabase.com/docs/guides/platform/regions))
  - **EU regions:** Frankfurt, Ireland, Paris and Stockholm. London and Zurich are offered too, but are not in the EU.
  - **Free plan:** pauses after 1 week of inactivity and has **no automatic backups**.
  - **Pro plan ($25/mo):** 8 GB disk, 100 GB storage, 250 GB egress, 100k MAU, **daily backups kept 7 days**, never paused. Includes $10 in compute credits (covers Micro).
  - **PITR:** about **$100/mo** for 7 days of history, and needs at least the Small compute add-on.
  - **Auth:** TOTP MFA is included. Passkeys are in **beta** ([changelog 2026-05](https://supabase.com/changelog/46458-passkeys-for-supabase-auth-beta)).
  - **Jobs:** Cron can run every second ([docs](https://supabase.com/docs/guides/cron)); the timezone is not stated. Queues use pgmq ([docs](https://supabase.com/docs/guides/queues)).
  - **DPA:** includes the SCCs ([DPA](https://supabase.com/legal/dpa)). The contracting entity is Supabase Pte. Ltd. (Singapore).
- **Appwrite Cloud:** Frankfurt region. Pro price not shown on its page. Not Postgres-first, so a weaker fit.

## App hosting
| Provider | EU | Pricing | Notes |
|---|---|---|---|
| Vercel ([pricing](https://vercel.com/pricing), [regions](https://vercel.com/docs/regions)) | fra1, cdg1, dub1, arn1 | Hobby is **non-commercial**. Pro $20 per seat | Functions default to iad1 (US) and must be pinned to the EU |
| Render ([pricing](https://render.com/pricing.md), [regions](https://render.com/docs/regions)) | Frankfurt | Web service $7 (512 MB) or $25 (2 GB). Pro workspace $25. Hobby includes only 5 GB bandwidth | Region is fixed at creation |
| Fly.io ([pricing](https://docs.fly.io/about/pricing)) | ams, arn, cdg, fra | shared-1x 512 MB about $3.69 | More hands-on |
| Railway ([pricing](https://railway.com/pricing)) | EU West | Hobby $5 including usage | Backups not described |
| Hetzner Cloud ([page](https://www.hetzner.com/cloud/cost-optimized)) | DE, FI | CX23 €5.99, CX33 €8.99, 20 TB traffic | **Shown as "currently unavailable" at fetch time.** Self-managed |
| Coolify ([pricing](https://coolify.io/pricing/)) | runs on your VPS | Free to self-host | |
| Scaleway Serverless Containers | FR, NL, PL **[Inference]** | Pay-per-use with a free allowance | Pricing page returned 403 |
| Cloudflare Workers ([pricing](https://developers.cloudflare.com/workers/platform/pricing/)) | Global edge | $5 minimum | No EU-only compute shown |

## Managed Postgres
- **Neon** ([pricing](https://neon.com/pricing)): AWS Frankfurt. Launch plan is pay-per-use ($0.106 per CU-hour, $0.35/GB-month) with up to 7 days of restore history.
- **Render Postgres** ([backups](https://render.com/docs/postgresql-backups)): $6/mo (256 MB) or $19/mo (1 GB). PITR covers **3 days on Hobby and 7 days on Pro**. The Free tier has no backups.
- **Fly Managed Postgres** ([docs](https://docs.fly.io/mpg)): Basic $38/mo, with high availability and backups.
- **Scaleway Managed DB:** about €11/mo for DB-DEV-S, from search snippets only (**unverified**).
- **Aiven:** the cheap plans can't choose a region.
- **Hetzner:** no first-party managed Postgres. Ubicloud (third party) offers one on Hetzner hardware.

## Object storage
- **Cloudflare R2** ([pricing](https://developers.cloudflare.com/r2/pricing/), [EU jurisdiction](https://developers.cloudflare.com/r2/reference/data-location/)): $0.015/GB-month, 10 GB free, **no egress fees**. The EU jurisdiction setting is fixed when the bucket is created.
- **Hetzner Object Storage:** €6.49/mo including 1 TB stored and 1 TB egress.
- **Bunny Storage:** $0.01–0.02/GB, with EU locations.

## Transactional email
| Provider | EU posture | Price |
|---|---|---|
| Scaleway TEM | EU company | about €0.25 per 1,000 (page returned 403, **unverified**) |
| Brevo | French company (EU hosting not confirmed on its own pages) | 300/day free |
| Mailgun ([pricing](https://www.mailgun.com/pricing/)) | EU sending option | 100/day free, $15 for 10k |
| Amazon SES ([pricing](https://aws.amazon.com/ses/pricing/)) | eu-central-1 | about $0.16 per 1,000 |
| Postmark | Data location not stated | $15 for 10k |
| Resend | Sends from the EU, but **account data stays in the US** | 3k/mo free |

## Jobs
- **pg-boss** ([GitHub](https://github.com/timgit/pg-boss)) and **Graphile Worker** ([site](https://worker.graphile.org/)) run inside Postgres: cron, retries, dead-letter handling, no third party. **[Inference]** Either is enough for the 00:00 UTC Daily Drop job.
- **Trigger.dev:** data in us-east-1, no EU option. **Inngest:** no EU option.

## Errors and monitoring
- **Sentry:** EU storage in Frankfurt, but account data and cron check-ins stay in the US. Free tier: 5k errors.
- **GlitchTip:** EU (Germany) hosting. Free up to 1k events/mo, or self-hosted.
- **UptimeRobot:** free tier has 50 monitors and allows commercial use.

## Video (later)
- **Bunny Stream:** encoding free, delivery from $0.005/GB.
- **Cloudflare Stream:** about $5 per 1,000 minutes stored and $1 per 1,000 minutes delivered.
- **Mux:** EU data location not shown.

## Auth (if not Supabase)
- **Better Auth:** passkeys and TOTP plugins; data stays in our own database. **Auth.js joined Better Auth in September 2025** and now gets security fixes only.
- **Lucia:** **deprecated** in March 2025.
- **Clerk:** no MFA or passkeys on the free plan; no EU residency stated.
- **Zitadel Cloud:** EU residency available. Free up to 100 daily active users.

## Stack bundles (estimates, before VAT)
| Bundle | Alpha | ~1000-user beta | PITR | Ops burden | Lock-in |
|---|---|---|---|---|---|
| **A: Supabase Pro (Frankfurt) + Vercel Pro fra1** | about $45–50 (about $25 with a free static frontend host) | about $55–90 | +about $100/mo | lowest | moderate (Auth, RLS, Functions) |
| **B: Render Frankfurt (web, worker, Postgres) + Better Auth + R2 EU** | about $22–30 | about $90–130 | included (3–7 days) | low | low |
| **C: Hetzner VPS + Coolify + self-run Postgres** | about €15–20 | about €30–50 | DIY (WAL-G or pgBackRest) | **high** | lowest |

## Gaps
Scaleway pages returned 403. Not verified: Brevo's EU hosting, Fly MPG's PITR, Supabase Cron's timezone, Dokploy pricing, Mux's EU region. Hetzner's DPA was not verified on its site **[Inference: commonly available]**.
