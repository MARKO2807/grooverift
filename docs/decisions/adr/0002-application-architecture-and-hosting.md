# ADR-0002: Application architecture and hosting baseline

- **Status:** **Accepted** by the owner on 2026-11-01 (D-015, D-016)
- **Date:** 2026-11-01
- **Deciders:** Owner (final), Claude (proposal)

## Context
The Master Prompt §2 leaves the stack open. Phase 2 research is in `docs/research/2026-11-01-*.md`, and the full comparison is in [`../../architecture/architecture-options.md`](../../architecture/architecture-options.md). Constraints:
- EU hosting (D-003)
- alpha budget of about 30–60 €/month (D-010)
- solo developer
- authorization correctness is the top engineering risk (S-02)

## Options considered
1. **A: Supabase-centric.** Least code, but PITR costs about +$100/mo, authorization is split between RLS and app code, and lock-in is moderate.
2. **B: Single TypeScript app (Next.js) + worker on Render Frankfurt, managed Postgres with PITR, Better Auth, R2 EU.** About $22–30 for the alpha, low lock-in, one policy module.
3. **C: Hetzner + Coolify self-managed.** Cheapest and fully EU companies, but high operational risk for a solo developer.

## Proposed decision
**Option B**, with Next.js as the web framework, plus the shared decisions in §1 of the options document:
- TypeScript and PostgreSQL
- Postgres search
- pg-boss jobs
- a single authorization policy module
- MusicBrainz CC0 catalog
- artwork-optional design
- self-run Web Push
- SSE
- self-hosted fonts
- GlitchTip EU
- an EU email provider
- PITR plus off-system backups

## Consequences
- More application code than Option A, mainly auth wiring and uploads, offset by Better Auth and well-known libraries.
- Render is a US company with an EU region. Its DPA and subprocessors must be reviewed before alpha data goes in.
- The beta needs the Render Pro workspace (bandwidth limit).
- No account creation or purchase happens until Phase 4, with separate approval for each.

## Rollback / exit
The app is a standard Node service plus Postgres, so it can be containerized and moved to Fly.io, Scaleway or Hetzner with a database dump and restore. Media sits in S3-compatible storage (R2) and is portable.
