# GrooveRift

> Where musical worlds collide.
> Discover music. Cross boundaries. Find your people.

GrooveRift is a music-first social platform (mobile-first PWA, English and Croatian) built around musical identity, discovery, thoughtful conversation and authentic community, with no native streaming.

## Project status

**Phase 4: Foundation.** The application scaffold exists on the approved stack (ADR-0002, ADR-0003): Next.js (App Router), TypeScript, PostgreSQL with Drizzle, Better Auth, next-intl, Tailwind from the design tokens. No product features yet. See [`docs/STATUS.md`](docs/STATUS.md).

## Where to start

| Document | Purpose |
|---|---|
| [`docs/product/master-prompt.txt`](docs/product/master-prompt.txt) | Authoritative product baseline (Master Prompt) |
| [`docs/STATUS.md`](docs/STATUS.md) | Current state: done / current / next / blockers / risks |
| [`docs/HANDOFF.md`](docs/HANDOFF.md) | Session-to-session handoff notes |
| [`docs/decisions/DECISIONS.md`](docs/decisions/DECISIONS.md) | Decision register (confirmed / open / recommended / deferred) |
| [`docs/roadmap.md`](docs/roadmap.md) | Phased roadmap with approval gates |
| [`docs/audit/`](docs/audit/) | Specification audits |
| [`docs/brand/`](docs/brand/) | Confirmed brand baseline and source assets with provenance |
| [`CLAUDE.md`](CLAUDE.md) | Working rules for Claude Code sessions |

## Setup (local development)

Requirements: Node 22+, npm 10+, Docker Desktop (for PostgreSQL).

```
npm ci                          # dependencies (lockfile)
cp .env.example .env.local      # then set BETTER_AUTH_SECRET (see the comment in the file)
docker compose up -d            # PostgreSQL 17 on localhost:5432
npm run db:migrate              # apply migrations
npm run db:seed                 # fictional seed data (never real people)
npm run dev                     # http://localhost:3000 (Croatian), /en (English)
```

Checks (all of them run in CI on every push and pull request):

```
npm run check                   # format, lint, typecheck, tokens, messages, unit tests
npm run test:db                 # database-backed tests (needs DATABASE_URL)
npm run build && npm run test:e2e   # Playwright with axe-core (CI=1 serves the production build)
```

Design tokens: edit `design/tokens/tokens.json`, then `npm run tokens` (CI fails if `src/styles/tokens.css` is stale). Messages: `messages/hr.json` and `messages/en.json` must have the same keys and every key must be used (`npm run i18n:check`).

Claude Code: `.claude/settings.json` runs Prettier and the typecheck after every edit; `.claude/agents/` holds the security and accessibility reviewers.

## License

Proprietary. All rights reserved. This repository is private.
