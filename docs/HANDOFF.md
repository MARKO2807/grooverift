# Session handoff

_Session 2, 2026-11-01. Next session: read `docs/STATUS.md`, then this file._

## Start-of-session checklist
1. `git status -sb` and `git ls-remote origin`: has the owner pushed?
2. Check-up in Croatian (Završeno / Trenutno / Odluke / Rizici / Sljedeći korak / Treba odobrenje).
3. Check the effort setting matches the recommendation (D-008).

## Where we are
- **Phase 2 is complete.** The trademark search is done (preliminary; see `docs/legal/trademark-preliminary-search.md`).
- Session 2 ran on **medium** effort.
- Claude in Chrome works once the owner is signed in to claude.ai in Chrome with the same account as Claude Code.
- **TMview/EUIPO block automated browsing** after a burst of queries (WAF "Problem detected" page). Never try to bypass it; ask the owner to search manually.

## Next concrete tasks
1. Walk the owner through VQ-01 to VQ-06 (`docs/architecture/visibility-matrix.md` §5). The owner wants this **before** Phase 3.
2. Propose **Phase 3** (UX/IA/design system) for approval. Key constraints:
   - D-017: the UI must look complete without artwork
   - contrast rules (dark text on Coral/Amber)
   - the mockup conflict list in `docs/brand/README.md` §4
   - D-011: interim wordmark (labelled)
   - D-006: logo derivative policy

## Open owner questions
VQ-01 to VQ-06 (`docs/architecture/visibility-matrix.md` §5). Pre-alpha items: OQ-05 to OQ-10. Feature items: OQ-11 to OQ-18.

## Notes
- Research docs are subagent output; re-check prices and terms before purchases.
- Tools: git, Node 22.12, npm, Docker. Python, pnpm and `gh` are not installed.
