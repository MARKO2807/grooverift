# Session handoff

_Session 11, 2026-11-02. Next session: read `docs/STATUS.md`, then this file._

## Start-of-session checklist
1. `git status -sb` and `git ls-remote origin`: has the owner pushed?
2. Check-up in Croatian (Završeno / Trenutno / Odluke / Rizici / Sljedeći korak / Treba odobrenje).
3. Check that the effort setting matches the recommendation (D-008). The owner ran **xhigh** in session 9 and **Fable at high** in session 10. In session 11 the setting was not visible; Claude recommended High and asked the owner to check `/effort`, with no reply. Claude may also recommend a model (Fable for complex work, Opus as default); the owner prefers Opus and Fable (CLAUDE.md).

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
- **Session 10: wordmark accent (D-055, OQ-26 resolved).** A2: a bolt under "rift", a glint every 5 s and a breath 72–100 %, top bar only. `app.js` `bolt()`, `style.css` `.wm-bolt`; the SVG gradient id `wm-g` exists once per render (the smoke test checks duplicate ids). `wordmark.html` holds the three intensities as the designer's brief.
- **Session 10: reaction (D-056, OQ-13 resolved).** One like-style reaction, icon only (audio wave, look V3), count visible to all, name "Sviđa mi se" / "Like". The owner found the three stances unclear. `reactions.html` keeps all options (sections 1–4), the four looks (6) and the name-in-context examples (7). `app.js` `react()` and `WAVE`; `style.css` `.react-like`; `data.js` sums the old per-stance counts; `index.html` defines the shared `gr-ember` gradient. Own answers show the count without a button.
- **Session 11: bolt and invite current (D-058, answers D-057).**
  - Bolt **N2 "Nit s iskrama"**. It hangs from the baseline: `.wm-bolt { top: 0.86em; height: 0.3em }`, where the Sora baseline is 0.84 em at line-height 1 (measured), and `.wm-rift` has `line-height: 1`.
    - Stroke 1.15 px with a 0.55 px white core and a drop-shadow glow.
    - `wm-flick`, `wm-core` and `wm-spark` run on a 4.5 s cycle.
    - `app.js` has `BOLT_PTS` and `BOLT_SPARKS`; the gradient id `wm-g` still appears once per render.
  - Invite current **I4 "Grananje"**.
    - `invite-current.js` (`GR_INVITE`) holds all four variants, chosen with `data-v`. The app uses `<canvas class="ic" data-v="branch" data-key="invite">`.
    - Height 112 px. Charges travel in for 760 ms, then a branching tree flashes twice (0–90 ms, a gap, then 130–330 ms).
    - `app.js` `afterRender()` calls `INV.scan`, and navigation calls `INV.reset()`.
  - Review pages: `pulse/wordmark.html` (round 2 at the top, earlier rounds archived), `pulse/invite-current.html`, `pulse/invite-layout.html` and `pulse/round6.html`. Both mark the choice as "odabrano".
  - The owner did not take the recommendations (N3, I1); the choices were N2 and I4.
  - **D-060 (same session): round 6 review of the whole flow.**
    - New `uilang` step after `age` (ORDER and ONB). The `language` step now holds only the reading languages.
    - The invite note is `.info-stack`: the alpha note plus the PWA tip. Compact invite rules start at `max-height: 700px`, and the current is 40 px when the screen is 600 px tall or less.
    - "Kako radi" is compact rows (`.screen-how`). The Done screen has no current.
    - Tab swipe: pointer handlers in `app.js` (`TABS`, `swEnd`). `.kind-app` has `touch-action: pan-y`, and the click after a drag is swallowed.
    - Round 6 options are URL params, with the chosen defaults in `pick(..., def)`:
      - `vis`: `compact`, via `visibilityRows()`
      - `art`: `genre`, via `artistMeta()`
      - `home`: `c`, via `homeBody()` and `answerPeek()`
      - `prof`: `c`, via `profileBody()`
      - `nav`: `glass`, a class on `<html>`
    - The `dna.js` tip shows the genre only.
    - Phosphor path data added: translate, device-mobile, calendar-dots.
    - `?q=` prefills the artist search, for the review frames.
    - `?at=profile` needs `?flow=drop`.
    - Follow-up: `wm(true)` gives a larger brand name in a sentence (invite tip, 18+). The "Kako radi" Daily Drop card has a CSS orbit border (`.how-main::before`, `--how-a`).
    - Open idea from the owner: a small effect that stands for the Daily Drop on Home, in place of the current. Offer options later if useful.
  - **D-059 (same session):**
    - The invite fits one screen. The current is `data-h="56"` under the tagline: layout B, `INV_AT` in `app.js`; `?inv=a|c|d` shows the rejected layouts.
    - Branch packets are taller zigzags, and the halos are smaller.
    - Spacing uses `.screen-invite`, with a `max-height: 600px` rule.
    - In an iframe, `app.js` posts `{ gr: "fit", over }` to the parent; `invite-layout.html` uses it.
    - In standalone mode at 320×568 the two-line prototype note leaves only about 2 px to spare. Keep that in mind if the invite grows.
  - Still open from D-058: should the Daily Drop current also get the taller, spiked look? It currently keeps the low one. Ask during the states round if relevant.
- **Session 10: round 3 review (D-057).** Genre colours stay; the one-card visibility stays; Phosphor light is the icon library (OQ-23 resolved, install approval in 3.6). The wordmark bolt was reopened and new invite-current designs were requested; both were answered in session 11 (D-058).
- **Open items:**
  - OQ-24: the owner's music news idea, after the alpha scope.
- **Verification:**
  - `node design/prototypes/tools/pulse-smoke.mjs` passes 21/21 (session 11).
  - `node design/prototypes/tools/smoke.mjs` passes 3/3.

## Next concrete tasks
1. **Rest of the 3.5 refinement** (effort: High), per `prototype-directions.md` §6. The owner liked the Spirala (genre-matched pulse speed, soft classical colours), the current under the Daily Drop name and the dock orbit; keep them.
   - states: empty, loading for answers, network error with kept text, offline, blocked, missing-question day, long text and names, the sign-in screen with the breached-password banner (D-054)
   - 200 % zoom
   - desktop: rail at 600 and 1024 px, a 40 rem reading column, the sheet as a centred dialog
   - Narrator pass and Windows high-contrast check (NVDA needs owner approval to install)
   - extend `pulse-smoke.mjs` for the new states
2. **Step 3.4b ⛳: light theme tokens** (effort: High). Clickable options first. "Match system" is RECOMMENDED. Coral and Amber need darker text variants on light backgrounds. The Spirala family colours, the current, the invite discharge and the bolt glow also need a light-theme check.
3. When convenient, raise JO1 ("Remove follower" for private profiles, a scope addition).
4. **Offer a real-phone test:** a local web server on the owner's home network (no internet exposure, no cost), so `pulse/index.html` opens on a phone. Ask before starting it.
5. **Music DNA ideas** to raise later (RECOMMENDED, R-11 to R-13): the DNA grows from answers; a two-helix compatibility view; same picks give the same helix.

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
- **Feature items:** OQ-11, OQ-14 to OQ-18, OQ-23 (icons, Phosphor RECOMMENDED), OQ-24 (music news). OQ-13, OQ-25 and OQ-26 resolved (D-056, D-054, D-058).
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
  - `git commit -m @'...'@` breaks in PowerShell 5.1 when the message contains double quotes (the text is split into pathspecs). Write the message to a scratchpad file and use `git commit -F <file>`.
  - Long Bash heredocs with non-ASCII text fail; write scripts with the Write tool into the session scratchpad.
  - In JS `String.replace`, `$$` in the replacement string becomes `$`. Use `split().join()` when the text contains `$$`.
  - Chrome `--screenshot` needs an absolute output path.
  - Rewriting JSON with `JSON.stringify` reformats `contrast-pairs.json`; insert text instead.
- **Headless Chrome:**
  - A reusable real-time capture script pattern: open a CDP target, call `Emulation.setDeviceMetricsOverride`, navigate, then `Page.captureScreenshot` at fixed delays. The session 11 copy lived in the scratchpad; `pulse-smoke.mjs` has the same CDP helpers.
  - Windows will not render a window narrower than about 500 px; use iframes (`pulse-shots.mjs`) or CDP `Emulation.setDeviceMetricsOverride`, which the smoke test uses.
  - Virtual-time screenshots do not advance canvas or CSS animations reliably. Use real-time CDP captures for motion.
- **Tools:** git, Node 22.12, npm, Docker, Chrome (headless screenshots and CDP work). Not installed: Python (only the Windows Store stub), ImageMagick, Inkscape, potrace, pnpm, `gh`, Mermaid CLI.
- **TMview/EUIPO block automated browsing.** Never try to bypass it.
