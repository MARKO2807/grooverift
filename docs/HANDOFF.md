# Session handoff

_Session 10, 2026-11-02 (continues session 9's agenda). Next session: read `docs/STATUS.md`, then this file._

## Start-of-session checklist
1. `git status -sb` and `git ls-remote origin`: has the owner pushed?
2. Check-up in Croatian (Završeno / Trenutno / Odluke / Rizici / Sljedeći korak / Treba odobrenje).
3. Check that the effort setting matches the recommendation (D-008). The owner ran **xhigh** in session 9 and **Fable at high** in session 10. Claude may also recommend a model (Fable for complex work, Opus as default); the owner prefers Opus and Fable (CLAUDE.md).

## Where we are
- **Phase 3, step 3.5: refinement of direction C.** Three owner review rounds were done in session 9. The refined prototype is `design/prototypes/pulse/`; `directions/` is the unchanged round-1 record.
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
  - D-052: the Music DNA colours carry meaning. The per-genre colour is `c` in `data.js`. There are no tag lists under Music DNA; a tap shows the genre, and `dna.js` `tip()` handles it.
  - D-053:
    - `D.mainGenres` holds the 20 main genres, with a "+ Još žanrova" chip for the rest.
    - Artist results show the country only, and tiles without a photo show one initial.
    - The name step asks "Kako se zoveš?", and "Prikaži" has an eye icon.
    - Profile visibility is one card. The chosen column is `.vis-opt::before`; `::after` makes the whole column clickable.
- **Session 10: password rules (D-054, OQ-25 resolved).**
  - Decision sketch `pulse/password.html` (twelve live fields; opt-in live HIBP query). The owner chose: 15 characters; a counter, no strength meter; HIBP with fail-open; a recommendation banner after a sign-in time hit (a conscious deviation from NIST's "force a change", recorded in D-054).
  - Help text "Najmanje 15 znakova. Odaberi sigurnu lozinku." The owner wrote "Odaberite" first; the "ti" form was confirmed. Note it in the 3.8 tone guide.
  - `app.js`: `PW_MIN`, `pwMeter()`, a SIMULATED `PW_BREACHED` list; `style.css`: `.pw-meter`, `.pw-count`, `.pw-track`.
  - Docs touched: DECISIONS (D-054, R-14, OQ-25), threat model §6, J1 step 3, IA PUB-02, counsel C.10, prototype-directions §7 round 4.
  - Primary sources used: NIST SP 800-63B-4 final (pages.nist.gov/800-63-4/sp800-63b.html, §3.1.1.2: 15 characters is a SHALL for single-factor; §3.2.2: 100 consecutive failures), Better Auth email-password, HIBP plugin and rate-limit docs, the HIBP API v3 page (no key, no rate limit, `Add-Padding`).
- **Open items:**
  - OQ-23: icon library. Phosphor is RECOMMENDED; `pulse/picons.js` embeds six icons as path data, with the MIT notice in `ICONS-LICENSE.md`.
  - OQ-24: the owner's music news idea, after the alpha scope.
  - OQ-26: **wordmark accent**, four sketches in `pulse/wordmark.html`; A is RECOMMENDED.
- **Verification:**
  - `node design/prototypes/tools/pulse-smoke.mjs` passes 11/11 (session 10).
  - `node design/prototypes/tools/smoke.mjs` passes 3/3.

## Next concrete tasks
1. **Continue the owner's agenda.**
   - ~~Password rules (OQ-25)~~ done in session 10 (D-054).
   - **Wordmark accent** (OQ-26): `pulse/wordmark.html`, four options, A RECOMMENDED.
   - **Reaction set** (OQ-13): explain the options and ask.
   - Round 3 feedback: the genre colours (D-052), the one-card visibility step, the Phosphor icons.
   - The owner liked: the Spirala, with genre-matched pulse speed and soft classical colours; the current under the Daily Drop name; the dock orbit; the invite current.
2. **Rest of the 3.5 refinement** (effort: High), per `prototype-directions.md` §6:
   - states: empty, loading for answers, network error with kept text, offline, blocked, missing-question day, long text and names, the sign-in screen with the breached-password banner (D-054)
   - 200 % zoom
   - desktop: rail at 600 and 1024 px, a 40 rem reading column, the sheet as a centred dialog
   - Narrator pass and Windows high-contrast check (NVDA needs owner approval to install)
   - extend `pulse-smoke.mjs` for the new states
3. **Step 3.4b ⛳: light theme tokens** (effort: High). Clickable options first. "Match system" is RECOMMENDED. Coral and Amber need darker text variants on light backgrounds. The Spirala family colours and the current also need a light-theme check.
4. When convenient, raise JO1 ("Remove follower" for private profiles, a scope addition).
5. **Offer a real-phone test:** a local web server on the owner's home network (no internet exposure, no cost), so `pulse/index.html` opens on a phone. Ask before starting it.
6. **Music DNA ideas** to raise later (RECOMMENDED, R-11 to R-13): the DNA grows from answers; a two-helix compatibility view; same picks give the same helix.

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
- **Feature items:** OQ-11, OQ-13 (reaction set), OQ-14 to OQ-18, OQ-23 (icons, Phosphor RECOMMENDED), OQ-24 (music news), OQ-26 (wordmark accent). OQ-25 resolved (D-054).
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
