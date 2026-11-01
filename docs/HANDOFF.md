# Session handoff

_Session 8, 2026-11-01. Next session: read `docs/STATUS.md`, then this file._

## Start-of-session checklist
1. `git status -sb` and `git ls-remote origin`: has the owner pushed?
2. Check-up in Croatian (Završeno / Trenutno / Odluke / Rizici / Sljedeći korak / Treba odobrenje).
3. Check that the effort setting matches the recommendation (D-008).

## Where we are
- **Phase 3 is approved (D-026).** Steps 3.0 to 3.4 are done. **Step 3.5 first round is done**: the owner picked direction **C "Pulse"**. The plan is in `docs/design/phase-3-plan.md`. It now includes step **3.4b, light theme tokens**.
- **Step 3.5 output** (details in `docs/design/prototype-directions.md`):
  - `design/prototypes/directions/index.html` is the owner comparison page. It drives three iframes (flow, start step, public or private profile, 360 or 320 px).
  - `shared/app.js` is one state machine for J1 and J3. Directions vary through `window.GR_DIRECTION`: progress, composer, sort, footBack, motif, homeActions.
  - `shared/data.js` holds the fictional placeholder data. `shared/base.css` holds token-only components. Each direction has its own folder (`a-quiet`, `b-cards`, `c-pulse`) with `index.html` and `style.css`.
  - URL parameters: `?flow=drop`, `&private=1`, `?at=<step>`, `&open=compose`.
  - `design/prototypes/tools/smoke.mjs` is an end-to-end check over the Chrome DevTools Protocol (Node 22 global WebSocket, no dependencies). **All three directions pass.**
  - `design/prototypes/tools/shots.mjs` takes side-by-side screenshots through an iframe harness. New headless Chrome on Windows will not render narrower than about 500 px, so a direct 360 px window shows a cropped desktop layout.
- **Decisions this session:**
  - D-042 direction C, motifs limited to the invite, Done, Music DNA and the Daily Drop question
  - D-043 dock composer with a bottom sheet
  - D-044 no external usability check; the owner reviews personally
  - D-045 light theme as a member setting, dark default, designed in 3.4b
- `contrast-pairs.json` gained `gradient.brand` as an indicator on canvas and surface. The check now passes **87/87**, and the report is regenerated.
- The owner raised effort to **xhigh** this session.

## Next concrete tasks
1. **Step 3.5 refinement of C** (effort: High). Full list in `prototype-directions.md` §6:
   - Decide where the refined prototype lives. Keep `directions/c-pulse/`, or promote it and keep A and B as a record.
   - States: empty, loading, network error with kept text, offline, blocked placeholders, the missing-question day (J3 E2), long text, catalog search failure, 320 px and 200 % zoom.
   - Desktop: rail per D-031 at 600 and 1024 px, a 40 rem reading column, the sheet as a centered dialog.
   - Copy items for 3.8: "answer" vs. "reply" (both "odgovor"; the prototype uses *komentar*), and the Public option text vs. the separate Music DNA choice.
   - Extend `smoke.mjs` for the new states. Screen reader check with Narrator (built in). NVDA would need owner approval to install.
2. **Step 3.4b ⛳: light theme tokens** (effort: High). Coral (3.06 on white) and Amber (1.50 on white) need darker text variants for light backgrounds. The brand primitives stay unchanged.
   - Build clickable options first, per the owner's preference for decisions.
   - "Match system" setting: RECOMMENDED.
   - The owner wants it to look "brutalno dobro" with correct contrast.
3. Raise **JO1** ("Remove follower" for private profiles, a scope addition) when convenient.

## Open owner questions
- **From 3.5 (copy, for 3.8):** reply naming (*komentar* vs. *odgovor*); Public option wording vs. the narrower Music DNA choice; equal-weight reminder buttons (RECOMMENDED).
- **From 3.4b (upcoming):** light palette options, and whether "match system" is offered.
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
- **Feature items:** OQ-11, OQ-13 (reaction set; the prototype uses placeholders "Isto", "Novo mi je", "Dobar izbor") to OQ-18.
- **Counsel question B.5:** DSA Art. 16 notice form for non-members (PUB-11).

## Notes
- Research docs are subagent output. Re-check prices and terms before any purchase.
- PDFs: `pdftoppm` is not installed. A zero-dependency Node `zlib` text extraction worked for the EDPB PDF.
- Shell:
  - Single quotes inside `node -e '...'` break on apostrophes.
  - Long Bash heredocs containing non-ASCII text can fail.
  - Write longer Node scripts to the session scratchpad with the Write tool instead.
  - Chrome `--screenshot` needs an absolute output path.
  - Rewriting JSON with `JSON.stringify` reformats `contrast-pairs.json`. Insert text instead.
- Tools: git, Node 22.12, npm, Docker, Chrome (headless screenshots and CDP work). Not installed: Python (only the Windows Store stub), ImageMagick, Inkscape, potrace, pnpm, `gh`, Mermaid CLI.
- **TMview/EUIPO block automated browsing.** Never try to bypass it.
