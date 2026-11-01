# CLAUDE.md: GrooveRift working rules

This file is loaded into every Claude Code session. Keep it short. Detailed rules live in `docs/`.

## Source of truth
1. `docs/product/master-prompt.txt` is the authoritative product baseline. Do not re-read it in full every session. Read only the relevant sections.
2. `docs/decisions/DECISIONS.md` and the ADRs in `docs/decisions/adr/` record approved decisions made after the Master Prompt. If they conflict with the Master Prompt, the newer **owner-approved** decision wins. Otherwise, raise the conflict with the owner and do not pick one silently.
3. The repository is the project memory, not chat history. Never claim progress, files or test results that you have not verified in the repo.

## Language
- **Communicate with the owner in Croatian**: explanations, questions, updates, recommendations.
- **English** for code, identifiers, comments, documentation in `docs/`, commit messages, PR text and technical terminology.

## Approval gates (non-negotiable)
- Work only inside the currently approved phase (see `docs/STATUS.md`). Starting a new phase requires explicit owner approval.
- Explicit approval is also required before: installing dependencies, plugins or MCP servers, selecting or changing the stack or providers, deploying, spending money, creating external accounts or infrastructure, inviting users, destructive migrations, or changing confirmed scope, brand or UX baselines.
- Never silently drop, simplify or reinterpret confirmed features. Label items as CONFIRMED / RECOMMENDED / OPEN / DEFERRED.

## Session protocol
- **Start:** read `docs/STATUS.md` and `docs/HANDOFF.md`, check `git status` and `git log -5`, then give a short check-up in Croatian: Završeno / Trenutno / Odluke / Rizici / Sljedeći korak / Treba odobrenje.
- **During:** work in small, reviewable steps and coherent commits. Report the actual commands run and their results. Mark mock or placeholder data explicitly.
- **End of a milestone or session:** update `STATUS.md` and `HANDOFF.md` (and `DECISIONS.md` if decisions were made), then commit. Keep secrets and personal data out of all docs.
- **Always explicitly tell the owner when it is time for a fresh session** (phase or milestone boundaries, heavy context), after STATUS and HANDOFF are committed. Suggest `/compact` when continuity matters more. Use qualitative judgment; do not invent token percentages.
- `git push` is done by the owner (`! git push`) unless they grant permission otherwise.

## Model and effort policy
- Default for routine work: **Medium** effort. Recommend **High** for architecture, data modeling, auth/authz, privacy/deletion, DMs and moderation evidence, uploads, search access control, migrations, scheduling, threat modeling and security reviews.
- Model: Claude may also recommend a model switch, for example Fable for complex or high-stakes work and Opus as the default. The owner prefers to stay on **Opus and Fable**, so do not push Haiku.
- After recommending an effort (or model) change, **check whether the owner actually switched** (via `/effort` output in the session). If not, say so casually in Croatian, for example: *„Ej, preporučio sam ti high effort, a vidim da je još medium. Želiš li svejedno nastaviti?”* If the setting is not visible, ask. Do not nag after the owner declines.

## Approved stack (ADR-0002)
TypeScript, Next.js (App Router), PostgreSQL, Better Auth, pg-boss, Render (Frankfurt), R2 (EU jurisdiction), MusicBrainz CC0 catalog. Details: `docs/architecture/architecture-options.md`. Libraries are confirmed in Phase 4.

## Engineering guardrails
- Security, privacy (GDPR, DSA), accessibility (WCAG 2.2 AA), performance and maintainability are baseline requirements.
- Authorization is enforced server-side for every object. Private profiles, blocks, DMs, saved items, moderation evidence and admin notes must never leak through APIs, caches, search, notifications, URLs or logs.
- Never commit secrets. Never paste credentials or real user data into prompts or third-party tools.
- No native audio playback or streaming. The mockup is inspiration, not a feature spec.

## Design guardrails
- Brand is confirmed: Ember palette (#FF586B Coral, #FFCB69 Amber, #0B0D12 Void Black), Sora (headings) and Inter (UI/body), "Rift emphasis" wordmark, Rift Pulse symbol. See `docs/brand/README.md`.
- Anti-AI-slop: no decorative HUDs, glow everywhere, fake metrics or filler features. Every element must earn its place.
- Original brand files in `docs/brand/source/` are never overwritten. Derivatives go in separate folders with provenance notes. Changes to the logo silhouette require owner approval.

## Project isolation
GrooveRift is a separate project. Do not import assumptions, branding or credentials from BARE, BarelyWrong or any other project.

## Orchestration
Native Claude Code first: the main session acts as orchestrator. Use subagents only for isolated research or independent review. No third-party orchestration frameworks (for example GSD Core) without owner approval.
