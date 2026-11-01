# Architecture options and recommendation (Phase 2)

- **Status:** PROPOSAL. Nothing is selected until the owner approves ADR-0002.
- **Inputs:**
  - `docs/research/2026-11-01-infrastructure-eu.md`
  - `docs/research/2026-11-01-music-catalog-providers.md`
  - `docs/research/2026-11-01-legal-platform-facts.md`
  - the domain model and visibility matrix drafts
- **Constraints:**
  - EU hosting (D-003)
  - alpha budget of about 30–60 €/month (D-010)
  - one developer working 2–3 h/day
  - low operational burden
  - authorization correctness as the #1 risk (S-02)
- Prices are research estimates from 2026-11-01, before VAT. Verify them before purchase.

---

## 1. What every option shares (stack-independent decisions)

These hold for any option. They are RECOMMENDED and approved together with ADR-0002.

| Area | Recommendation | Why |
|---|---|---|
| Language | **TypeScript** end to end | One language for UI, API and jobs; strong typing for a large domain; the best Claude Code support |
| Database | **PostgreSQL** (EU region) | Relational domain (graph, threads, catalog redirects), full-text and trigram search, durable job queues in the same DB |
| Search | Postgres FTS + `pg_trgm` + `unaccent` (handles č ć đ š ž) | No index duplication, so no privacy leaks through a search index (R-03) |
| Jobs | **pg-boss** or Graphile Worker inside Postgres | Durable cron (00:00 UTC Daily Drop), retries, idempotency, no third party and no US data path (Trigger.dev and Inngest have no EU option) |
| Authorization | One server-side **policy module** implementing the visibility matrix, with an automated authorization test suite | R-01. Postgres Row Level Security may be added later as defence in depth |
| Catalog | **MusicBrainz CC0 core** as the backbone. Phase A: on-demand API lookups through a rate-limited server client (1 req/s) that **persists every referenced entity** locally (CC0 allows this). Phase B (beta): bulk import of artists and release groups from the dumps for fast local autocomplete | Licence-clean; the alpha's tiny user count fits the API limit |
| Genres | MusicBrainz CC0 genre list + Wikidata (CC0) hierarchy and HR labels, curated by editors | C-02. Avoids non-commercial tag data |
| Artwork | **Cards must look complete without artwork.** Typographic or generated placeholders by default. Album covers (Cover Art Archive) only after legal clearance. Artist photos from Wikimedia Commons (free licences, credited) or uploaded by verified artists | Rights risk (C-01). This is also a design constraint for Phase 3 |
| Listen-out links | MusicBrainz URL relationships + plain outbound links (no Spotify or Apple API) | Spotify and Apple terms rule out API use |
| Media | Images: server-side re-encode, **EXIF/GPS strip**, signed URLs for non-public content; object storage in the **EU jurisdiction**. Video (beta wave B6): Bunny Stream or similar | T-02, T-01 |
| Push | Self-run Web Push (VAPID) with no personal content in payloads | No vendor; payloads pass through Apple, Google and Mozilla push services |
| Realtime | Server-Sent Events (SSE) with polling fallback | Enough at beta scale, simpler than WebSockets |
| i18n | HR/EN message catalogues with ICU plurals (Croatian has 3 plural forms) | §2 |
| Fonts | Self-hosted, subsetted Sora and Inter (OFL 1.1) | LG München I ruling; performance |
| Errors | **GlitchTip (EU hosting)** or Sentry EU (same SDK, so switching is easy) | Sentry keeps account data in the US; GlitchTip EU is simpler on GDPR |
| Uptime | UptimeRobot free tier | Commercial use allowed |
| Email | Scaleway TEM (EU company) *after its pricing and terms are verified*; fallback Amazon SES eu-central-1 or Mailgun EU | EU data path |
| Testing | Vitest (unit and integration), **Playwright** (E2E), axe-core (accessibility), dedicated authorization suite, i18n completeness check | §14 |
| CI | GitHub Actions on Linux runners. GitHub Free includes $12/month of compute (about 2,000 min) | Keep pipelines lean |
| Backups | Provider PITR + a **daily encrypted logical dump to a second provider** (off-system, §13) + a monthly restore drill | §13. Proposed alpha targets: **RPO ≤ 15 min** (PITR) or ≤ 24 h (off-system), **RTO ≤ 4 h** |

---

## 2. The three options

### Option A: Supabase-centric
- **Shape:**
  - Supabase Pro in Frankfurt: Postgres, Auth (email/password, Google, TOTP; passkeys in beta), Storage, Cron, Queues, Edge Functions
  - frontend on Vercel Pro (fra1) or a static host
- **Pros:**
  - least code for auth, storage and cron
  - mature dashboard
  - built-in Row Level Security
- **Cons:**
  - Authorization logic gets split between RLS SQL policies and app code. A single, testable policy module is harder to keep.
  - Contracting entity is Supabase Pte. Ltd. (Singapore). US-based subprocessors.
  - **PITR costs about $100/mo extra**, which breaks the budget. Without it there are only daily backups kept 7 days.
  - Vercel Hobby forbids commercial use, so Pro ($20) is needed.
  - Moderate lock-in (Auth, RLS, Functions).
- **Cost:** alpha about $45–50/mo (about $25 with a free static frontend). Beta about $55–90/mo, **plus about $100 if PITR**.

### Option B: Single TypeScript app on a managed EU PaaS ⭐ recommended
- **Shape:**
  - one full-stack TypeScript web app (UI + API) and one worker process (pg-boss jobs, media processing, push fan-out), both from the same codebase
  - **Render, Frankfurt:** web service + worker + managed Postgres **with PITR included** (3 days on Hobby, 7 on Pro)
  - auth via **Better Auth** (TOTP, passkeys, Google; data in our own Postgres)
  - Cloudflare R2 with EU jurisdiction for media and off-system backups
- **Pros:**
  - All business rules, including authorization, live in one TypeScript codebase with one policy module and one test suite.
  - PITR is within budget.
  - **Low lock-in:** everything is a standard Docker-able Node app plus Postgres, so it can move to Fly, Scaleway or Hetzner later.
  - Auth data stays in our database.
- **Cons:**
  - More code for us to write: auth wiring, upload handling, cron.
  - Render is a US company with an EU region (SCCs/DPF), the same as most options.
  - The Hobby workspace includes only 5 GB of bandwidth, so the beta needs the Pro workspace.
- **Cost:** alpha **about $22–30/mo**. Beta about $90–130/mo.
- **Alternative inside B:** Neon Frankfurt (pay-per-use, 7-day restore) instead of Render Postgres.

### Option C: EU-sovereign self-managed
- **Shape:**
  - Hetzner Cloud VPS + Coolify, Postgres in a container on the same server
  - Hetzner Object Storage, plus the same app as Option B
- **Pros:**
  - cheapest (alpha about €15–20/mo, beta about €30–50/mo)
  - fully EU companies
  - lowest lock-in
- **Cons:**
  - **We operate the database:** patching, PITR (WAL-G or pgBackRest), failover and restore drills. For a solo developer this risks data loss and eats development time.
  - Cost-optimized Hetzner servers were marked "unavailable" at research time.
- **Use:** a good **future migration target** if Option B costs grow. Not recommended for the start.

### Comparison
| Criterion | A: Supabase | **B: TS app + Render** | C: Hetzner self-managed |
|---|---|---|---|
| Authorization in one testable place | ⚠️ split between RLS and code | ✅ | ✅ |
| PITR within budget | ❌ (+$100) | ✅ | ⚠️ DIY |
| Ops burden | ✅ lowest | ✅ low | ❌ high |
| Lock-in | ⚠️ moderate | ✅ low | ✅ lowest |
| Code to write | ✅ least | ⚠️ more | ⚠️ more + ops |
| EU data residency | ✅ (non-EU company) | ✅ (non-EU company) | ✅✅ EU company |
| Alpha cost | ~$45–50 | **~$22–30** | ~€15–20 |
| Beta cost (~1000 users) | ~$55–90 (+PITR) | ~$90–130 | ~€30–50 |

**Recommendation: Option B.** It is the only option that is both within budget **with** point-in-time recovery and keeps the riskiest logic (authorization and privacy) in one testable place, while staying portable.

---

## 3. Sub-decision: web framework (within Option B)

| Option | Pros | Cons |
|---|---|---|
| **Next.js (App Router)** ⭐ | Server rendering for share previews and fast first load; largest ecosystem; mature i18n (`next-intl`) and PWA patterns; excellent Claude Code proficiency; runs as a standalone Node server (no Vercel needed) | The most complex of the three; caching semantics need discipline (private data must never be cached publicly); some features are optimized for Vercel |
| SvelteKit | Smaller bundles and a simpler mental model, which helps performance on mid-range phones | Smaller ecosystem; fewer ready accessible components |
| React Router v7 (framework mode) | Simple loader/action model; React ecosystem | Smaller community than Next.js for this kind of app |

**Recommendation: Next.js**, with a strict rule that all personalized responses are uncached and every data access goes through the policy module. SvelteKit is a reasonable alternative if the owner prefers lighter bundles over ecosystem size.

Supporting libraries (proposed, to be confirmed in Phase 4):
- **Data:** Drizzle ORM (SQL-first, typed migrations), Zod (validation)
- **Auth:** Better Auth
- **Jobs and push:** pg-boss, `web-push`
- **Images:** sharp
- **UI:** Tailwind CSS driven by our design tokens, Radix-style accessible primitives
- **i18n:** next-intl
- **Testing:** Vitest, Playwright, axe-core

---

## 4. Cost summary (estimates; verify before purchase)
| Item | Alpha (/mo) | Beta ~1000 users (/mo) |
|---|---|---|
| Render web + worker | $14 | $32 (1-CPU web + worker) |
| Render Postgres | $6 | $19 |
| Render Pro workspace | n/a | $25 |
| R2 (media + backups) | ~$0–1 | ~$2–5 |
| Email | ~€0–1 | ~€2–5 |
| GlitchTip / UptimeRobot | $0 | $0–15 |
| **Total** | **~$22–30** ✅ within D-010 | **~$90–130** |
| Later: MetaBrainz commercial tier | $0 (Stealth Start-Up, to confirm) | $0 → **$100** when public or monetized |
| Later: video (wave B6) | n/a | usage-based, Bunny Stream is cents per GB |

## 5. Scaling path
Single app + worker → scale web instances horizontally → add a read replica if needed → move heavy jobs (media, catalog import) to a dedicated worker → migrate to Option C infrastructure if cost-driven. No architectural rewrite is needed at the expected beta scale.
