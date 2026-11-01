# Session handoff

_Session 1, 2026-11-01. Read `docs/STATUS.md` first._

## State
- Phase 2 is in progress (approved). Effort: **high** (set by the owner).
- All commits are **local only**. Claude's `git push` was denied by the auto-mode classifier, so the owner pushes with `! git push -u origin main`. Check `git status -sb` and `git ls-remote origin` at the start of the session.
- Tools: git 2.56, Node 22.12, npm 10.9, Docker 28. Python, pnpm and `gh` are not installed.
- Root originals are git-ignored on purpose; the tracked copies are in `docs/`.

## Waiting on owner
1. OQ-19 to OQ-22: architecture option B, Next.js, artwork policy, MetaBrainz registration.
2. VQ-01 to VQ-06 in `docs/architecture/visibility-matrix.md`.
3. Push to GitHub.

## Next concrete steps
1. After the owner decides: set ADR-0002 to Accepted (or revise), and record D-0xx entries.
2. Remaining Phase 2 work: threat model v0.1, legal question list (consolidate the "lawyer" sections in `docs/research/`), preliminary trademark search via Claude in Chrome (D-007), alpha acceptance criteria.
3. Then propose Phase 3 (UX and design system). Note the new constraint: **cards must look complete without artwork**.

## Notes
- Research docs are subagent output and not re-verified line by line. Re-check prices and terms before any purchase.
- Consider a fresh session before Phase 3; this session carries a lot of research context.
