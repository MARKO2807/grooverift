# Session handoff

_Session 6, 2026-11-01. Next session: read `docs/STATUS.md`, then this file._

## Start-of-session checklist
1. `git status -sb` and `git ls-remote origin`: has the owner pushed?
2. Check-up in Croatian (Završeno / Trenutno / Odluke / Rizici / Sljedeći korak / Treba odobrenje).
3. Check that the effort setting matches the recommendation (D-008).

## Where we are
- **Phase 3 is approved (D-026).** Steps 3.0 to **3.3 are done**. The plan with steps 3.0 to 3.9 and the owner decision points (⛳) is in `docs/design/phase-3-plan.md`.
- **Step 3.3 output:** `docs/design/journeys/`:
  - `README.md`: index, cross-journey rules JR1–JR7, resolved owner decisions, open items JO1–JO6
  - J1 onboarding, J2 Music DNA editing, J3 Daily Drop, J4 profile states and following, J5 report/mute/block, J6 admin editorial
  - Each journey has Mermaid flows, visibility checks against matrix v0.3, edge cases, accessibility notes and open items.
  - Mermaid passed a home-made bracket and keyword lint (`14 blocks, 0 problems`). After the push, the owner confirmed that the flows render on GitHub.
- **Decisions this session** (all as recommended):
  - D-034: onboarding visibility steps are required. Music DNA visibility is asked in onboarding only if DNA was added; otherwise it is asked the first time DNA is added ("only me" until then).
  - D-035: one top-level Daily Drop answer per member per question, editable.
  - D-036: archived questions stay open; answers show a neutral date; no "late" label. This resolved a conflict between OQ-12 and `ux-foundations.md` §3.2.
  - D-037: question suggesters (B2) get a private notification only if their suggestion is published.
  - OQ-12 is resolved. Follow-up edits: IA v0.3 (ONB-04, ONB-06, HUB-03, HUB-09, Q7), `ux-foundations.md` §3.4, and domain model (DailyDropAnswer, QuestionSuggestion).
- **Decision sketches:** `design/prototypes/journeys/`:
  - `index.html` and `jq1`–`jq4`, which use `../ia/ia.css` plus `journeys.css`
  - `drop-sim.js` is a reusable Daily Drop page simulator and may help in 3.5
  - Scripts were exercised with Node against a stub DOM. The page was opened in the owner's browser. Claude did not screenshot it.
- The owner again cancelled `/effort` and asked to proceed on the current setting. Do not nag about it.

## Next concrete tasks
1. **Step 3.4 ⛳: design tokens v0.1** (effort: High):
   - `design/tokens/`: DTCG-style JSON plus generated CSS custom properties
   - `docs/design/tokens.md`
   - a zero-dependency Node contrast-check script, with its output recorded
   - Inputs: `docs/brand/README.md` §2 (measured contrast, R-09 dark text on Coral/Amber) and `ux-foundations.md` §4.1–4.2 (focus token, 44 px targets, reduced motion).
   - D-028 font download (Sora and Inter from official sources with OFL licences into `design/fonts/`) fits here or in 3.5.
   - For the owner's choice, build clickable token specimens of each option first (owner preference).
2. Raise **JO1** ("Remove follower" for private profiles, a scope addition) with the owner when convenient.

## Open owner questions
- **From 3.3:**
  - JO1: Remove follower (OPEN).
  - JO2: HR and EN both required before scheduling (= OQ-16, RECOMMENDED).
  - JO3: editor self-approval in the alpha (RECOMMENDED).
  - JO4: reserve low-water mark 7, gap alert at 72 hours (RECOMMENDED).
  - JO5: accept pending requests when switching to public (RECOMMENDED).
  - JO6: invite acceptance counts as email verification (RECOMMENDED).
- **IA leftovers:**
  - Q4: alpha people search by name. RECOMMENDED yes; decide with OQ-07.
  - Q5: signed-out view of public playlists. RECOMMENDED members-only.
- **Pre-alpha items:** OQ-05 to OQ-10. The owner wants to be asked about minors (OQ-10) when it becomes relevant.
- **Feature items:** OQ-11, OQ-13 to OQ-18.
- **Counsel question B.5:** DSA Art. 16 notice form for non-members (PUB-11).

## Notes
- Research docs are subagent output. Re-check prices and terms before any purchase.
- PDFs: `pdftoppm` is not installed. A zero-dependency Node `zlib` text extraction worked for the EDPB PDF.
- Shell:
  - Single quotes inside `node -e '...'` break on apostrophes.
  - A long Bash heredoc containing non-ASCII text failed to parse this session.
  - Write longer Node scripts to the session scratchpad with the Write tool instead.
- Tools: git, Node 22.12, npm, Docker. Not installed: Python (only the Windows Store stub), ImageMagick, Inkscape, potrace, pnpm, `gh`, Mermaid CLI.
- **TMview/EUIPO block automated browsing.** Never try to bypass it.
