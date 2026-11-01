# Session handoff

_Session 3, 2026-11-01. Next session: read `docs/STATUS.md`, then this file._

## Start-of-session checklist
1. `git status -sb` and `git ls-remote origin`: has the owner pushed?
2. Check-up in Croatian (Završeno / Trenutno / Odluke / Rizici / Sljedeći korak / Treba odobrenje).
3. Check the effort setting matches the recommendation (D-008).

## Where we are
- **Phase 2 is complete**, including the visibility questions (D-019 to D-025, visibility matrix v0.2).
- Session 3 ran on **high** effort.
- **Owner goal:** most accounts should be public, for more participation and content (D-025). Design onboarding and privacy UX around this, but without dark patterns: the private option must stay equally easy (counsel question C.9).
- The owner prefers decisions presented as **interactive choice questions** (AskUserQuestion), one option per question with a recommendation, after a plain-language explanation with examples.
- Claude in Chrome works once the owner is signed in to claude.ai in Chrome with the same account as Claude Code.
- **TMview/EUIPO block automated browsing** after a burst of queries (WAF "Problem detected" page). Never try to bypass it; ask the owner to search manually.

## Next concrete tasks
1. Propose **Phase 3** (UX/IA/design system) for approval. Key constraints:
   - D-017: the UI must look complete without artwork
   - D-019 to D-025: visibility rules, including the onboarding choices for profile and Music DNA visibility (active choice, public recommended) and the pre-post notices for private members (D-020, D-021)
   - contrast rules (dark text on Coral/Amber)
   - the mockup conflict list in `docs/brand/README.md` §4
   - D-011: interim wordmark (labelled)
   - D-006: logo derivative policy

## Open owner questions
Pre-alpha items: OQ-05 to OQ-10 (the owner wants to be asked about minors / OQ-10 when it becomes relevant). Feature items: OQ-11 to OQ-18. Still proposed, not confirmed: default visibility of follower lists and the profile's Daily Drop history (followers).

## Notes
- Research docs are subagent output; re-check prices and terms before purchases.
- Tools: git, Node 22.12, npm, Docker. Python, pnpm and `gh` are not installed.
