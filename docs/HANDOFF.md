# Session handoff

_Session 7, 2026-11-01. Next session: read `docs/STATUS.md`, then this file._

## Start-of-session checklist
1. `git status -sb` and `git ls-remote origin`: has the owner pushed?
2. Check-up in Croatian (Završeno / Trenutno / Odluke / Rizici / Sljedeći korak / Treba odobrenje).
3. Check that the effort setting matches the recommendation (D-008).

## Where we are
- **Phase 3 is approved (D-026).** Steps 3.0 to **3.4 are done**. The plan with steps 3.0 to 3.9 and the owner decision points (⛳) is in `docs/design/phase-3-plan.md`.
- **Step 3.4 output:**
  - `docs/design/tokens.md`: roles, rules, type ramp, space, focus, motion, breakpoints, contrast results.
  - `design/tokens/`:
    - `tokens.json` (source of truth, DTCG draft syntax)
    - generated `tokens.css` (134 `--gr-*` variables plus a reduced-motion block)
    - `build.mjs`, `contrast-check.mjs`, `lib.mjs`, `contrast-pairs.json`
    - recorded `contrast-report.md`: 85/85 pairs pass. The tightest pair is `border.strong` on `bg.high` at 3.48. All 18 option combinations also pass. A negative test with white on-accent text failed as expected.
  - `design/fonts/`: Sora and Inter variable WOFF2 (latin and latin-ext, including Inter italic) from the Google Fonts distribution, with `OFL.txt` from the `google/fonts` repo, SHA-256 in the README and `fonts.css`. D-028 is now implemented.
  - `design/prototypes/tokens/`: clickable decision sketch. `?compare=tq1..tq4` opens a given comparison. `options.json` and the generated `options.css` are kept only for this sketch.
- **Decisions this session** (all as recommended): D-038 Coral primary action with Void text (R-09 confirmed); D-039 cool neutrals; D-040 errors and warnings reuse Coral and Amber, destructive buttons are outlined; D-041 medium shape.
- **Visual verification:** Claude screenshotted the sketch with headless Chrome (`chrome.exe --headless=new --screenshot`, works locally, no extension needed). The page was also opened in the owner's browser.
- The owner did not raise effort this session either. Do not nag about it.

## Next concrete tasks
1. **Step 3.5 ⛳: prototypes** (effort: High):
   - 2–3 genuinely different directions for onboarding (J1) and Daily Drop (J3) at 360 px width, in `design/prototypes/`.
   - Use only `design/fonts/fonts.css` and `design/tokens/tokens.css` (semantic tokens, no raw hex).
   - No artwork; placeholder data labeled.
   - `design/prototypes/journeys/drop-sim.js` may be reusable.
   - Build clickable versions of every direction first (owner preference), then ask.
   - After the pick: key states (empty, error, long text, 320 px reflow) and a desktop adaptation.
   - Decide at 3.5 whether to do an informal usability check with 3–5 people (no personal data).
2. Raise **JO1** ("Remove follower" for private profiles, a scope addition) when convenient.

## Open owner questions
- **From 3.4:** light theme is DEFERRED (RECOMMENDED; dark-first per 15.2). Not explicitly confirmed by the owner.
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
  - Long Bash heredocs containing non-ASCII text can fail.
  - Write longer Node scripts to the session scratchpad with the Write tool instead.
- Tools: git, Node 22.12, npm, Docker, Chrome (headless screenshots work). Not installed: Python (only the Windows Store stub), ImageMagick, Inkscape, potrace, pnpm, `gh`, Mermaid CLI.
- **TMview/EUIPO block automated browsing.** Never try to bypass it.
