# ADR-0001: Repository documentation as the durable project memory

- **Status:** Accepted
- **Date:** 2026-11-01
- **Deciders:** Owner (approved with Phase 1), Claude (proposal)

## Context
GrooveRift is built by one developer over many short Claude Code sessions (about 2–3 h/day). Chat context is lost between sessions and can be compacted. The Master Prompt (§0.7, §16.E, §20, §21.6) requires durable, human-readable project memory that does not rely on chat history or a framework's private memory.

## Options considered
1. **Chat history only:** zero effort, but not durable and not verifiable. Rejected.
2. **Third-party orchestration framework memory (e.g. GSD Core):** structured, but adds dependencies and opaque state, and was not evaluated. Deferred (X-02).
3. **Plain Markdown in the repo, versioned with git:** durable, reviewable, diffable and tool-independent.

## Decision
Option 3. Structure:

| Path | Role | Update cadence |
|---|---|---|
| `CLAUDE.md` | Working rules auto-loaded by Claude Code | When rules change |
| `docs/product/master-prompt.txt` | Authoritative baseline (verbatim, hashed) | Only with an owner-approved new version |
| `docs/STATUS.md` | Done / current / next / blockers / risks | Every milestone or session |
| `docs/HANDOFF.md` | Exact state for the next session | End of every session |
| `docs/decisions/DECISIONS.md` | Decision log, open questions, recommendations | Whenever a decision is made |
| `docs/decisions/adr/` | Full records for significant decisions | Per decision |
| `docs/roadmap.md` | Phases, deliverables, acceptance criteria, gates | Per phase |
| `docs/audit/` | Dated specification and readiness audits | Per audit |
| `docs/brand/` | Brand baseline, contrast, asset provenance, sources | When assets change |

Additional documents (test plan, security/privacy checklist, threat model, runbooks, DR plan) are created in the phase where they first have real content.

The Claude Code auto-memory (outside the repo) may hold only owner preferences such as language and working style. Project facts belong in the repo.

## Consequences
- Every session starts by reading STATUS and HANDOFF and checking git. Every session ends by updating them.
- No secrets or personal user data in docs.
- Small documentation overhead per session, in exchange for continuity and auditability.

## Rollback / exit
Docs are plain Markdown. Any future tool can read or import them.
