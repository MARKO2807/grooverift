# Session handoff

_Session 13, 2026-11-03. Next session: read `docs/STATUS.md`, then this file._

## Start-of-session checklist
1. `git status -sb` and `git ls-remote origin`: has the owner pushed?
2. Check-up in Croatian (Završeno / Trenutno / Odluke / Rizici / Sljedeći korak / Treba odobrenje).
3. Check that the effort setting matches the recommendation (D-008). The owner ran **xhigh** in session 9 and **Fable at high** in session 10. In sessions 11 and 12 the setting was not visible; Claude recommended High and asked the owner to check `/effort`, with no reply. Claude may also recommend a model (Fable for complex work, Opus as default); the owner prefers Opus and Fable (CLAUDE.md).

## Where we are
- **Phase 3, step 3.5: refinement of direction C.** Three owner review rounds were done in session 9. The refined prototype is `design/prototypes/pulse/`; `directions/` is the unchanged round-1 record.
- **Session 13: comment cards and 200 % text (D-073).**
  - Comments take catalogue cards (D-068). `refsEditor(k)` and `refResults(k)` serve both slots through `RS` (`ans`: `draftRefs`/`refQ`/`refOpen`; `com`: `comRefs`/`comRefQ`/`comRefOpen`, ids with the `-com` suffix). Buttons carry `data-s`. `clearRefs(k)`; `REF_MAX = 3`. Comments store `refs`; Luka's seeded comment on a1 has a card.
  - Large-text mode: the `@media (max-width: 17.5em)` blocks at the end of `style.css`. Em media queries follow the browser text size (and Chrome page zoom), so it runs on a 360 px phone from about 130 % text. Spacing tokens become px; heading tokens become `max(<normal px>, 1rem + step)`. `?lt=a|b|c` (tab bar, a chosen) and `?lth=full` (rejected full-size headings) are classes on `<html>`. The visibility comparison table has explicit ARIA roles so it can stack.
  - `tools/zoom-check.mjs [--scale=2] [--w=360] [--h=740] [--shots=<dir outside the repo>] [query ...]` uses CDP `Page.setFontSizes`; shots are the first screen and the bottom. Exit code 1 on findings.
  - `pulse/large-text.html` frames are 180×370 iframes at CSS `zoom: 2` (page zoom), which also triggers the mode; `viewer.html` links rounds 10, 11 and this page.
- **Session 12: round 10, key states and settings flows (D-070, OQ-32).**
  - Review page: `pulse/round10.html` (8 choice sections, then "Napravljeno bez izbora"; 43 frames). The owner took every recommendation except notifications: no social emails in the alpha (OQ-32), so the notifications are push only and "Sažetak tjedna" is gone. Round 11 (`pulse/round11.html`, D-071) chose the look: `ntf=d`, one "this phone" switch on top (`st.pushDev`, action `push-dev`) over the types in `fieldset.ntf-types`. `?ntf=c|e|f` show the other looks. D-072 added the pause (`st.pause`, actions `pause` and `pause-end`, `&pause=1h|3h|am` in the URL; the sketch clock is a fixed 18:40) and confirmed R-15 to R-18.
  - **Owner rule (session 12):** every open point goes to the owner as a survey (AskUserQuestion) with the example and the reason inside the question.
  - URL options in `app.js` (Round 10 block after `addDays`): `?state=loading|error|empty|nodrop|blocked|long`, `?net=off`, `?ld`, `?off`, `?emp`, `?nd`, `?prv`, `?ntf`, `?del`, `?out`, `?bl=1`, `?uc=locked`, `?at=signin` (`&pw=breached`, `&acct=pending`), `?at=pending`, `?flow=drop&at=member&as=blocker|blocked`, `?flow=drop&pw=breached`, `&step=copy|confirm|done` on the delete sub-screen, `&show=logout`, `&show=posterr`.
  - New screens: `signin`, `pending`, `member`. New sub-screens: `email`, `password`, `username`, `twofa`; `privacy`, `notifications` and `delete` are now functions (`privacyBody`, `notifBody`, `deleteBody`; the old one-page delete is `SUB.deleteA`).
  - `st.histVis` holds the answer-history setting (`st.hist` is the navigation history; do not reuse it).
  - Helpers: `skel()`, `skelDrop()`, `loadErr()`, `netHint()`, `netBanner()`, `emptyBox()`, `noDropBlock()`, `dropList()`, `pwBanner()`, `subRow()`, `signedIn()`, `signOut()`. Offline settings render inside `<fieldset disabled>`. `icons.js` gained `offline`.
  - Copy rule kept: no gendered past tense or pronouns for members ("Odjava je uspjela", "Ta osoba ne dobije obavijest").
  - Phone server: `serve.mjs` ran on port 8080 this session (see the closing check in the session report).
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
  - **D-063 (same session): round 7.**
    - Dark only: D-045 is superseded and step 3.4b is cancelled. Keep forced colours and reduced motion working.
    - Invite: `invCur(h, 'inv-wide')` runs edge to edge; three lines in `.info-stack` (alpha, PWA, home screen). Short screens (≤700 px) shrink the info box; ≤600 px hides the eyebrow. Fits 360×640 and 320×568 (tested).
    - `picons.js` gained 12 Phosphor light icons (list in `ICONS-LICENSE.md`). The language step uses `globe-hemisphere-east`.
    - Genre search: `genreChip(name, fam, tile)` renders tiles in `.g-grid`; `updateDnaStep` now updates every `[data-a="genre"]`.
    - Reminder: `NOTIF_QS` / `?nq=1..4` (the example question is separate from `D.drop.question`), `.rem-row` with `.rem-time`, and the `.install` card. Done: `.lead-done`.
    - Round 7 URL options: `?ddn=none|a..e` (living name, `ddName()`), `?home=c..g`, `?hub=a..e` (`hubBody()`, `hubProgramme()`, `st.hubDay`), `?nq=1..4`.
  - **D-067 (same session): round 9.** `nameFix()` (three words, capitals), `dna.js` heavy family block (`CHAR`, glow, sparks; family 0 only), comment form `.live-field` and `com-cancel`, `SUB` sub-screens via screen `setsub` (`?flow=drop&at=setsub&s=<key>`, `swRow`/`row`/`grp` helpers, `data-a="sw"` toggles). Options: `?age18=a|b|c` (`&show=age18` opens it on `at=age`), `?all=a..d`, `?past=a..c` (`&day=<iso>` on the Hub), `?act=a..c`, `?prow=a..d`. `pastDrops` have fictional `n`, `c`, `r` counts. Tests: `pulse-smoke.mjs` 24/24.
  - **D-069 (same session):** OQ-15 settled (30 days / 30 days; update the Račun sub-screen note, which still cites OQ-15), JO1 "Ukloni pratitelja" approved (prototype it on the followers list when PROF-07 is sketched), naming odgovor / komentar / reakcija confirmed.
  - **D-068 (same session): round 9 choices, now the defaults:** `age18=a`, `all=c`, `past=a`, `act=a`, `prow=b`. OQ-31 resolved: comments are text plus catalogue cards; **to do:** add the catalogue-card picker to the comment form (reuse the answer composer's `refsEditor` pattern).
  - **D-066 (same session):** settings default is `set=b` (profile card `.set-me`); the data copy lives inside the delete flow (OQ-30 resolved).
  - **D-065 (same session): Settings round 8.** `?set=a..d` (`SET_AT`, now default b), `setRow()`, `setStatus()`, `settingsBody()`; d filters rows through `#f-setq` (`st.setQ`). No export row; `.set-delete` sits under Log out; status pill `.set-status` on top. OQ-30 was resolved by D-066. Backlog of all ideas: `docs/product/backlog.md`. Rule from the owner: always ask before anything that touches a strict Master Prompt rule.
  - **D-064 (same session): round 7 choices, now the defaults.** `ddn=c` (Strujica), `home=e` with `teaserActions(true)` (one `.btn-invite` button with a soft ring, no read link), `hub=e` (seven-day strip plus `hubProgramme()`), `nq=2`, the globe icon. OQ-28 (archive depth) is OPEN and conflicts with the confirmed permanent archive; do not limit the archive without an owner decision.
    - Settings: screen `settings` (`?flow=drop&at=settings`), `SET_GROUPS()`, `settingsBody()`; gear in the profile top bar. The profile no longer has the motion switch.
    - `D.pastDrops` has seven days; Home shows three. Archive rows say that old questions are still open for answers (D-036).
    - Tests: `pulse-smoke.mjs` 22/22 (adds settings, reminder, done, Hub, Home E and round 7 page checks); `smoke.mjs` 3/3.
  - **D-062 (same session): owner review after D-061.**
    - Password: `pwMeter()` now renders one line, `#pw-need` (`.pw-need`, `.ok` when all rules are met). It is in the input's `aria-describedby` via `field({ desc })`. It is hidden while `#err-pw` shows, and `clearErr` now runs before the re-render. The `.pw-rules` list is gone.
    - Terms: `.fine-terms` holds two block spans. The visibility table has no top border on `thead td`.
    - Genres: `D.mainGenres` is the new top 20 in popularity order. New traits: K-pop, Latino, Country and Filmska glazba. `D.genreAlias` and `D.genreSuggest` are in `data.js`.
    - `genres-mb.js` (generated by `tools/build-genres.mjs` from MusicBrainz and Wikidata, both CC0) holds `[name, parent, rank]` and is loaded before `data.js`. `D.moreGenres` adds four Croatian names. The fetched source files are not in the repo; the script header has the queries.
    - `genrePool()` and `genreHits()` rank search results. `genreChip(name, fam)` shows the family in results. The chip colour is `--g`, with `.ck` as the tick, and `.gdot` is no longer used on chips. `.chips-genres .chip` grows to fill each row.
    - "Kako radi": `.how-fill` cards flex to fill the height, capped at 9.5 rem, from 701 px high.
    - Tests: `pulse-smoke.mjs` 21/21 with new checks for the password line, the terms, the table, the genre order, search, aliases and the chip colour; `smoke.mjs` 3/3.
  - **Phone testing:** `design/prototypes/tools/serve.mjs [port]` is a read-only LAN server (GET and HEAD only, serves only `design/`). Open it only when the owner asks. While it is open, remind the owner in every reply, and confirm with netstat or curl once it is closed (memory: port-close-reminder). In session 11 it ran on 8080 and was closed and verified.
  - **D-061 (same session):**
    - Passwords use `PW_MIN = 12` and `PW_RULES` (len, up, low, sym), with `pwMissing()` and a ticked list in `.pw-rules`.
    - `PW_BREACHED` (SIMULATED) now holds rule-passing patterns such as "Lozinka2024!".
    - `READ_LANGS` is English and Hrvatski, both preselected. EN is listed first on `uilang`.
    - The drop page head has no current.
    - `viewer.html` lists the new steps (Jezik, Jezici čitanja, Aktivnost).
    - `password.html` is unchanged; it is the D-054 record.
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
  - `node design/prototypes/tools/pulse-smoke.mjs` passes 46/46 (session 13).
  - `node design/prototypes/tools/zoom-check.mjs` passes 49/49 at 200 % (also `--scale=1.5`, `--scale=1`, `--w=320 --h=568`).
  - `node design/prototypes/tools/smoke.mjs` passes 3/3.

## Next concrete tasks
1. **Rest of the 3.5 refinement** (effort: High), per `prototype-directions.md` §6. The owner liked the Spirala (genre-matched pulse speed, soft classical colours), the current under the Daily Drop name and the dock orbit; keep them. The key states are done (D-070).
   - desktop: rail at 600 and 1024 px, a 40 rem reading column, the sheet as a centred dialog
   - Narrator pass and Windows high-contrast check (NVDA needs owner approval to install)
   - extend `pulse-smoke.mjs` for the new states
   - 200 % text and the comment cards are done (session 13, D-073); re-run `zoom-check.mjs` after layout changes.
2. **Round 12: all remaining alpha screens (owner chose "sve").** Go group by group, each with a `pulse/round12*.html` page and a survey: (a) other profiles and lists, (b) member safety, (c) signed-out and sign-in, (d) the rest and system screens. The exact screen IDs are in STATUS "Next". Settings are done (D-070 to D-072). New screens must pass `zoom-check.mjs`.
3. **OQ-28 (archive depth):** raise with options in design; the confirmed scope is a permanent archive. Step 3.4b is cancelled (D-063, dark only).
4. JO1 "Ukloni pratitelja" is approved (D-069); add it when the followers list (PROF-07) is sketched.
5. **Real-phone test:** `design/prototypes/tools/serve.mjs` serves the prototypes read-only on the home network. Start it only when the owner asks, and follow the port rule.
6. **Music DNA ideas** to raise later (RECOMMENDED, R-11 to R-13): the DNA grows from answers; a two-helix compatibility view; same picks give the same helix.

## Open owner questions
- **From 3.5 (copy, for 3.8):**
  - reply naming (*komentar* vs. *odgovor*)
  - Public option wording vs. the separate Music DNA choice
  - equal-weight reminder buttons (RECOMMENDED)
  - the visibility step now uses short table labels
- **From round 7:** OQ-28, archive depth. From the settings research: whether Music DNA personalisation needs a consent toggle (counsel), and muted words (scope, later).
- **From 3.3:**
  - JO1: Remove follower (approved, D-069).
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
