# Session handoff

_Session 5, 2026-11-01. Next session: read `docs/STATUS.md`, then this file._

## Start-of-session checklist
1. `git status -sb` and `git ls-remote origin`: has the owner pushed?
2. Check-up in Croatian (Završeno / Trenutno / Odluke / Rizici / Sljedeći korak / Treba odobrenje).
3. Check the effort setting matches the recommendation (D-008).

## Where we are
- **Phase 3 is approved (D-026).** Steps 3.0, 3.1 and **3.2 are done**. The plan with steps 3.0 to 3.9 and the owner decision points (⛳) is in `docs/design/phase-3-plan.md`.
- **Step 3.2 output:** `docs/design/information-architecture.md` v0.2:
  - full-beta screen inventory with IDs (PUB, ONB, HOME, POST, HUB, DISC, CAT, PROF, ACT, MSG, PL, SAFE, SET, ADM, SYS) and a wave per screen
  - feature traceability table (every confirmed feature → screens)
  - navigation model A (D-031)
  - route map and URL privacy rules U-01 to U-16 (RECOMMENDED)
  - per-screen state matrix
- **Decisions this session:**
  - D-031: navigation model A
  - D-032: profile Daily Drop history defaults to "same as profile"
  - D-033: follower/following lists and their counts default to followers
  - Visibility matrix bumped to v0.3.
- **Decision sketches:** `design/prototypes/ia/` (`index.html`, `q1-navigation.html`, `q2-drop-history.html`, `q3-follower-lists.html`, shared `ia.css` and `profile-sim.js`):
  - static HTML and vanilla JS, fictional data, provisional colors and system fonts
  - `profile-sim.js` encodes the matrix rules for one fictional profile and is reusable for 3.3
  - Scripts were syntax-checked and exercised with Node against a stub DOM. The owner viewed them in their browser; Claude did not screenshot them.
- **Owner preference (reinforced):** for every decision the owner wants a **literal, clickable example** (HTML they can open), then a detailed plain-language explanation of the differences with concrete scenarios, then AskUserQuestion. Build the examples up front for all options.
- Session 5 ran without switching to high effort. The owner cancelled `/effort` and asked to proceed.
- **Owner goal:** most accounts should be public (D-025). Since D-030 this is pursued only through honest explanation: nothing pre-selected, equal weight, no "recommended" label. Counsel C.9 is still open.

## Next concrete tasks
1. **Step 3.3: key journeys** (effort: High). Mermaid flows plus notes in `docs/design/journeys/`, referencing IA screen IDs:
   - onboarding (ONB-01–09; the visibility step cannot be skipped, so an account without a choice is treated as private: open recommendation; Public/Private option text per IA §7 "Consequence for onboarding copy")
   - Music DNA editing
   - Daily Drop (answer, private-member notice D-021, reply, react, archive, signed-out share D-022)
   - profile states (public, private, blocked)
   - report and block (D-019, D-023)
   - admin editorial
2. Consider clickable journey sketches for any owner choice in 3.3, per the preference above.

## Open owner questions
- **IA leftovers:**
  - Q4: alpha people search by name. RECOMMENDED yes; decide with OQ-07.
  - Q5: signed-out view of public playlists. RECOMMENDED members-only.
  - Q7: status updates for question suggestions. Decide in 3.3.
- **Pre-alpha items:** OQ-05 to OQ-10. The owner wants to be asked about minors (OQ-10) when it becomes relevant.
- **Feature items:** OQ-11 to OQ-18.
- **New counsel question B.5:** DSA Art. 16 notice form for non-members (PUB-11).

## Notes
- Research docs are subagent output. Re-check prices and terms before any purchase. The 3.1 pattern research mixes official and secondary sources (labelled).
- PDFs: `pdftoppm` is not installed. A zero-dependency Node `zlib` text extraction worked for the EDPB PDF.
- Shell: single quotes inside `node -e '...'` break on apostrophes. Write longer Node scripts to the session scratchpad instead.
- Tools: git, Node 22.12, npm, Docker. Not installed: Python (only the Windows Store stub), ImageMagick, Inkscape, potrace, pnpm, `gh`.
- **TMview/EUIPO block automated browsing.** Never try to bypass it.
