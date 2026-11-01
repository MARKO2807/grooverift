# Session handoff

_Session 9, 2026-11-01. Next session: read `docs/STATUS.md`, then this file._

## Start-of-session checklist
1. `git status -sb` and `git ls-remote origin`: has the owner pushed?
2. Check-up in Croatian (Završeno / Trenutno / Odluke / Rizici / Sljedeći korak / Treba odobrenje).
3. Check that the effort setting matches the recommendation (D-008). The owner ran **xhigh** in session 9.

## Where we are
- **Phase 3, step 3.5: refinement of direction C.** Two owner review rounds were done in session 9. The refined prototype is `design/prototypes/pulse/`; `directions/` is the unchanged round-1 record.
- **Review entry points:**
  - `pulse/viewer.html`: phone frame, jump to any screen, device sizes, live catalog, catalog failure, "Smanji pokrete", private profile.
  - `pulse/choices.html`: Spirala gallery of eight fictional members, a genre playground, and the current, orbit and calm comparison.
- **Architecture of `pulse/`:**
  - `app.js` is the C-only state machine for J1 and J3.
  - `current.js`:
    - draws the current (canvas)
    - draws the dock orbit
    - defines `GR_MOTION` (the "Smanji pokrete" flag; `?calm=1`, or the switch on the Profile screen, plus the OS reduced-motion setting)
  - `dna.js` is the Spirala. `GR_DNA.setSource()` feeds the picks, and `refresh()` crossfades after a change.
  - `catalog.js` holds the offline list with Levenshtein typo tolerance. With `?live=1` it uses MusicBrainz, then Wikidata SPARQL (P434 to P18), then the Commons imageinfo API (thumbnail plus author and licence).
  - Canvases re-mount on every `render()`. A key-based `played` set stops intros from replaying on re-render, and `reset()` is called on navigation.
- **Decisions this session** (details in `DECISIONS.md` and `prototype-directions.md` §7):
  - D-046: 24 genres plus search, 2–10 required, so no skip and Music DNA visibility is always asked. Artist photos come only from Commons with credit. The visibility steps fit 360×640.
  - D-047: name "Daily Drop" kept; date below the name in style A; no middle dots; centred "Odgovori".
  - D-048: Music DNA "Spirala", living, unique per member, family colours derived from Ember; no trait words.
  - D-049: motifs stay alive; the "Smanji pokrete" setting is the WCAG 2.2.2 pause mechanism. This extends the motif placements to the dock field.
  - D-050: the brand name in UI text is set like the wordmark.
  - D-051: 18+ only for the alpha and the beta.
- **New open items:**
  - OQ-23: icon library, decided in 3.6.
  - OQ-24: the owner's music news idea, after the alpha scope.
- **Verification:**
  - `node design/prototypes/tools/pulse-smoke.mjs` passes 9/9.
  - `node design/prototypes/tools/smoke.mjs` passes 3/3.

## Next concrete tasks
1. **Fold in the owner's feedback on round 2.** These were rebuilt after "looks bad" feedback, so ask about them first:
   - the new current
   - the orbit
   - the Spirala
   - the visibility columns
2. **Rest of the 3.5 refinement** (effort: High), per `prototype-directions.md` §6:
   - states: empty, loading for answers, network error with kept text, offline, blocked, missing-question day, long text and names
   - 200 % zoom
   - desktop: rail at 600 and 1024 px, a 40 rem reading column, the sheet as a centred dialog
   - Narrator pass and Windows high-contrast check (NVDA needs owner approval to install)
   - extend `pulse-smoke.mjs` for the new states
3. **Step 3.4b ⛳: light theme tokens** (effort: High). Clickable options first. "Match system" is RECOMMENDED. Coral and Amber need darker text variants on light backgrounds. The Spirala family colours and the current also need a light-theme check.
4. When convenient, raise JO1 ("Remove follower" for private profiles, a scope addition).

## Open owner questions
- **From 3.5 (copy, for 3.8):**
  - reply naming (*komentar* vs. *odgovor*)
  - Public option wording vs. the separate Music DNA choice
  - equal-weight reminder buttons (RECOMMENDED)
  - the visibility step now uses short table labels
- **From 3.4b (upcoming):** light palette options, and whether "match system" is offered.
- **From 3.3:**
  - JO1: Remove follower (OPEN).
  - JO2–JO6: RECOMMENDED defaults.
- **IA leftovers:** Q4 (alpha people search) and Q5 (signed-out playlists).
- **Pre-alpha:** OQ-05 to OQ-10. OQ-10 is now only about implementing the 18+ gate.
- **Feature items:** OQ-11, OQ-13 (reaction set), OQ-14 to OQ-18, OQ-23, OQ-24.
- **Counsel question B.5:** DSA Art. 16 notice form for non-members (PUB-11).

## Notes
- **Research docs:** they are subagent output. Re-check prices and terms before any purchase.
- **Live catalog:**
  - MusicBrainz, the Wikidata query service and the Commons API all send CORS headers.
  - MusicBrainz rate-limits to about 1 request per second and sometimes answers "busy". `catalog.js` spaces its requests 1.1 s apart.
  - Never put the owner's email in a User-Agent or any other request field. It happened once in a curl test this session; use a neutral app name.
- **PDFs:** `pdftoppm` is not installed. A zero-dependency Node `zlib` text extraction worked for the EDPB PDF.
- **Shell:**
  - Single quotes inside `node -e '...'` break on apostrophes.
  - Long Bash heredocs with non-ASCII text fail; write scripts with the Write tool into the session scratchpad.
  - In JS `String.replace`, `$$` in the replacement string becomes `$`. Use `split().join()` when the text contains `$$`.
  - Chrome `--screenshot` needs an absolute output path.
  - Rewriting JSON with `JSON.stringify` reformats `contrast-pairs.json`; insert text instead.
- **Headless Chrome:**
  - Windows will not render a window narrower than about 500 px; use iframes (`pulse-shots.mjs`) or CDP `Emulation.setDeviceMetricsOverride`, which the smoke test uses.
  - Virtual-time screenshots do not advance canvas or CSS animations reliably. Use real-time CDP captures for motion.
- **Tools:** git, Node 22.12, npm, Docker, Chrome (headless screenshots and CDP work). Not installed: Python (only the Windows Store stub), ImageMagick, Inkscape, potrace, pnpm, `gh`, Mermaid CLI.
- **TMview/EUIPO block automated browsing.** Never try to bypass it.
