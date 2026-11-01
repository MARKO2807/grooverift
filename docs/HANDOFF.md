# Session handoff

_End of session 1, 2026-11-01. Next session: read `docs/STATUS.md`, then this file._

## Start-of-session checklist
1. `git status -sb` and `git ls-remote origin`: has the owner pushed? If `origin` is still empty, remind them: `! git push -u origin main`.
2. Check-up in Croatian (Završeno / Trenutno / Odluke / Rizici / Sljedeći korak / Treba odobrenje).
3. Check the effort setting matches the recommendation (D-008).

## Where we are
- Phase 2 is done except the **preliminary trademark search**.
- The owner wants an explicit reminder whenever a new session is advisable.
- Effort was set to **high** during session 1.

## Next concrete task
**Preliminary trademark search "GrooveRift"** via Claude in Chrome (D-007; load the `anthropic-skills:chrome-browser` skill first):
- EUIPO eSearch, TMview (covers DZIV and other national offices), WIPO Global Brand Database
- Exact match plus similar marks ("Groove Rift", "Grooverift", "Rift" + music) in Nice classes 9, 38, 41, 42 and 45
- Record findings in `docs/legal/trademark-preliminary-search.md`, with the clear caveat that this is not clearance.

Then propose **Phase 3** (UX/IA/design system) for approval. Key Phase 3 constraints:
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
