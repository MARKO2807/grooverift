# Session handoff

_Session 4, 2026-11-01. Next session: read `docs/STATUS.md`, then this file._

## Start-of-session checklist
1. `git status -sb` and `git ls-remote origin`: has the owner pushed?
2. Check-up in Croatian (Završeno / Trenutno / Odluke / Rizici / Sljedeći korak / Treba odobrenje).
3. Check the effort setting matches the recommendation (D-008).

## Where we are
- **Phase 3 is approved (D-026).** Steps 3.0 (kickoff) and 3.1 (UX foundations: `docs/design/ux-foundations.md`) are done. The plan with steps 3.0 to 3.9 and the owner decision points (⛳) is in `docs/design/phase-3-plan.md`.
- Phase 3 working decisions: static HTML/CSS prototypes in `design/prototypes/` (D-027); Sora and Inter from official sources with OFL licenses in `design/fonts/` (D-028; not downloaded yet, do it at step 3.4/3.5); raster logo derivatives via built-in PowerShell/.NET, no SVG trace (D-029).
- Session 4 ran on **high** effort (the owner switched to high at the start).
- **Owner goal:** most accounts should be public (D-025). Since D-030 this is pursued **only through honest explanation**: the onboarding visibility choices (profile, Music DNA) have nothing pre-selected, equal visual weight, no "recommended" label and no confirmation step only on Private. Source: EDPB Guidelines 03/2022 v2.0 (Deceptive Snugness, Longer than necessary), quotes verified in `ux-foundations.md` §3.4. Counsel C.9 still open.
- Open recommendation for 3.3: the onboarding visibility step cannot be skipped; accounts without a choice are treated as private (GDPR Art. 25(2)).
- The owner prefers decisions as **interactive choice questions** (AskUserQuestion), with a recommendation, after a plain-language explanation with examples.
- Claude in Chrome works once the owner is signed in to claude.ai in Chrome with the same account as Claude Code. Useful for screenshotting prototypes at mobile widths.
- **TMview/EUIPO block automated browsing** after a burst of queries. Never try to bypass it; ask the owner to search manually.

## Next concrete tasks
1. **Step 3.2: information architecture**: full-beta screen inventory, 2–3 navigation models for the owner to choose from, URL privacy review, per-screen state matrix. Ask the owner about the default visibility of follower lists and of the profile's Daily Drop history (proposed: followers).

## Open owner questions
Pre-alpha items: OQ-05 to OQ-10 (the owner wants to be asked about minors / OQ-10 when it becomes relevant). Feature items: OQ-11 to OQ-18. Still proposed, not confirmed: default visibility of follower lists and the profile's Daily Drop history (followers).

## Notes
- Research docs are subagent output; re-check prices and terms before purchases. The 3.1 pattern research mixes official and secondary sources (labelled).
- PDFs: `pdftoppm` is not installed, so the Read tool cannot render PDF pages. A zero-dependency Node `zlib` text extraction worked for the EDPB PDF (text has spacing artefacts; normalize whitespace before searching).
- Tools: git, Node 22.12, npm, Docker. Python (only the Windows Store stub), ImageMagick, Inkscape, potrace, pnpm and `gh` are not installed. `convert` on PATH is the Windows disk tool, not ImageMagick.
