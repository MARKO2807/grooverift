# Project status

_Last updated: 2026-11-03 (session 15)_

## Current phase
**Phase 3: UX research, information architecture and design system** (approved, D-026). Plan and step tracking: [`docs/design/phase-3-plan.md`](design/phase-3-plan.md).

| Step | Status |
|---|---|
| 3.0 Kickoff | ✅ Done |
| 3.1 UX foundations | ✅ Done ([ux-foundations](design/ux-foundations.md)) |
| 3.2 Information architecture ⛳ | ✅ Done ([information-architecture](design/information-architecture.md); decision sketches in `design/prototypes/ia/`) |
| 3.3 Key journeys | ✅ Done ([journeys](design/journeys/README.md) J1–J6; decision sketches in `design/prototypes/journeys/`) |
| 3.4 Design tokens v0.1 ⛳ | ✅ Done ([tokens](design/tokens.md); `design/tokens/`, fonts in `design/fonts/`, decision sketch in `design/prototypes/tokens/`) |
| 3.5 Prototypes ⛳ | 🔄 Direction **C "Pulse"** (D-042, D-043). Refinement: three owner review rounds in session 9 (D-046 to D-053) and, in session 10, the password rules (D-054), the wordmark accent (D-055) and the reaction (D-056); in session 11, the redone wordmark bolt, the new invite current, the one-screen invite (D-058, D-059) the round 6 review (D-060) the follow-ups (D-061, D-062) and round 7 (D-063); in session 12, the key states and every settings flow (round 10, D-070; notifications look D-071); in session 13, comment cards and 200 % text (D-073); in session 14, round 12a: other members' profiles, lists and follow requests (D-074); in session 15, round 12b: member safety (D-075). All in `design/prototypes/pulse/`. Rounds 12c–12d, desktop and the screen reader pass remain ([prototype-directions](design/prototype-directions.md) §6, §7) |
| ~~3.4b Light theme tokens~~ | ❌ Cancelled by D-063: dark only |
| 3.6 Core components spec | ⏳ |
| 3.7 Brand derivatives ⛳ | ⏳ |
| 3.8 HR/EN copy tone guide | ⏳ |
| 3.9 Review and close | ⏳ |

## Done
- Phases 0, 1 and 2 (discovery; audit and documentation foundation; architecture and legal groundwork).
- Decisions D-001 to D-074. Key ones:
  - EU hosting, budget 30–60 €/mo
  - Mutuals naming and semantics
  - **Option B architecture + Next.js (ADR-0002 Accepted)**
  - artwork-optional UI
  - MetaBrainz registration
  - **Visibility (session 3):** blocks hide both ways (D-019); private members' replies in public threads are visible (D-020); Daily Drop answers visible to all members, including private accounts (D-021); signed-out visitors see the Daily Drop question only (D-022); DM history after a block is read-only for both (D-023); Music DNA defaults to all members (D-024); **profiles default to public** via an active onboarding choice (D-025)
  - **Phase 3 (session 4):** approved (D-026); static HTML prototypes (D-027); self-hosted Sora/Inter with OFL licenses (D-028); raster logo derivatives via built-in .NET, no SVG trace (D-029); **neutral active choice for profile and Music DNA visibility** in onboarding: nothing pre-selected, equal weight, no "recommended" label, per EDPB Guidelines 03/2022 (D-030, amends D-024/D-025 presentation)
  - **IA (session 5):** navigation model A, Home · Hub · Discover · Activity · Profile with Messages as a top-bar icon (D-031); profile Daily Drop history defaults to "same as profile" (D-032); follower/following lists and counts default to followers (D-033)
  - **Journeys (session 6):** onboarding visibility steps are required, and Music DNA visibility is asked only once DNA exists (D-034); one top-level Daily Drop answer per member, editable (D-035); archived questions stay open, answers show a neutral date, no "late" label (D-036); question suggesters get a private notification only if published (D-037). OQ-12 resolved.
  - **Tokens (session 7):** Coral primary action with Void Black text, confirming R-09 (D-038); cool neutral surfaces (D-039); errors and warnings reuse Coral and Amber, never color-only (D-040); medium shape (D-041). Sora and Inter self-hosted per D-028.
  - **Prototypes (session 8):** direction **C "Pulse"**: brand motifs only at the invite, Done, Music DNA and the Daily Drop question (D-042); answers written from a **dock** that opens a bottom sheet (D-043); no external usability check, the owner reviews personally (D-044); **light theme as a member setting, dark default**, designed in new step 3.4b (D-045).
  - **Refinement (session 9):**
    - 2 to 10 genres required in onboarding; artist photos only from free-licence Commons with credit; the visibility steps fit one phone screen (D-046)
    - the name stays "Daily Drop", with the date below it (D-047)
    - Music DNA is the living **"Spirala"**, unique per member, with no trait words (D-048)
    - motifs stay alive, with a **"Smanji pokrete"** setting (D-049)
    - the brand name in text is set like the wordmark (D-050)
    - **18+ only** (D-051)
    - Music DNA colours carry meaning (rap blue, jazz green and so on), and there are no tag lists under it (D-052)
    - 20 main genres plus a "+ Još žanrova" chip; artists show the country only; "Kako se zoveš?"; profile visibility is one card (D-053)
  - **Password rules (session 10, D-054, resolves OQ-25; amended by D-061 to 12 characters plus composition rules):** 15 characters minimum, 128 maximum, no composition rules, no expiry; a counter while typing ("Najmanje 15 znakova. Odaberi sigurnu lozinku."); Have I Been Pwned k-anonymity check with fail-open; a monthly sign-in re-check that shows a recommendation banner, not a forced change. Argon2id is R-14 (Phase 4). Counsel question C.10 added.
  - **Wordmark accent (session 10, D-055, resolves OQ-26):** a short Coral→Amber bolt under "rift", quietly alive (a glint every 5 s, a slow breath), on the standalone wordmark only; stopped by reduced-motion settings. Brief for the designer: `pulse/wordmark.html`.
  - **Reaction (session 10, D-056, resolves OQ-13):** one like-style reaction per member per answer, icon only (a small audio wave that beats when pressed), count visible to all, named "Sviđa mi se" / "Like" in notifications and for screen readers.
  - **Round 3 review (session 10, D-057):** genre colours and the one-card visibility stay; Phosphor light is the icon library (OQ-23). The wordmark bolt (D-055) is reopened: not electric enough, too far from "rift", too thick. The owner also wants more invite-current designs with taller, spiked impulses that show connection.
  - **Bolt and invite current (session 11, D-058):**
    - The wordmark bolt is now **N2 "Nit s iskrama"**: a hairline that hangs from the baseline of "rift", with a white-hot core and a soft glow. It flickers every 4.5 s and throws three small sparks.
    - The invite has a new current, **I4 "Grananje"**: 112 px tall, and a branching discharge flashes twice where the two sides meet.
    - Sketches: `pulse/wordmark.html` and `pulse/invite-current.html`.
  - **Invite on one screen (session 11, D-059):**
    - The whole invite fits the viewport with no scrolling.
    - The I4 current is 56 px and sits under the tagline (layout B).
    - The impulses are taller and the collision halo is smaller.
    - Sketch: `pulse/invite-layout.html`.
  - **Round 6 (session 11, D-060):**
    - The interface language is asked right after 18+ (HR/EN). The 18+ copy is softer.
    - The invite has a PWA tip. "Kako radi" fits one screen, and "Spremno" has no current.
    - Swipe between tabs.
    - Visibility is two short rows. Artist results show genres.
    - Home shows the question with the first two answers and no current.
    - The profile has the Music DNA on top. The tab bar is glass.
    - Sketch: `pulse/round6.html`.
  - **Passwords and languages (session 11, D-061):**
    - Passwords need 12+ characters plus an upper-case letter, a lower-case letter and a special character. The owner chose this knowing it deviates from NIST, and it is recorded in the threat model.
    - English comes first on the language step. The reading languages are English and Hrvatski, both selected by default.
    - The Daily Drop page has no current under the question.
  - **Owner review after D-061 (session 11, D-062):**
    - One red-to-green line under the password says what is missing. The terms are two centred lines.
    - The 20 main genres are the most popular, in order. A picked genre takes its own colour, with no dot.
    - Genre search covers the MusicBrainz list (about 2,200 genres), with a parent family from Wikidata.
    - The "Kako radi" cards fill the screen.
    - Research on artist search and Spotify: `docs/research/2026-11-02-artist-search-genres-spotify.md`. Spotify sign-in is deferred (OQ-27).
  - **Round 7 (session 11, D-063):**
    - **Dark only:** no light theme (replaces D-045; step 3.4b cancelled).
    - Invite: edge-to-edge current, new lead, a PWA line. Genre search in a two-column grid. Reminder: compact time row and an "add to home screen" card. Done: "Sad si dio Rifta." Clearer glass tab bar. No current on the Hub.
    - Settings screen from a gear on the profile; "Smanji pokrete" moves into it. Research: `docs/research/2026-11-02-settings-benchmark.md`.
    - **Choices (D-064):** the "Strujica" Daily Drop name; Home E with a single "Odgovori" button and a soft invite ring; the Hub with the last seven days, this week's programme (B2) and the archives; the notification question "Koja pjesma najbolje govori tko si?"; the globe icon.
    - **Settings (D-065):** no data-download row, delete at the very bottom, a quiet status mark on top; four arrangements in `pulse/round8.html`. Globe is the language icon. **Chosen (D-066):** B, the profile card on top; the data copy is offered inside the delete flow.
    - **Ideas backlog:** `docs/product/backlog.md` lists every idea outside the confirmed scope.
    - **Round 9 (D-067):** "Dodaj app", the sample address you@therift.com, a three-word capitalised display name, darker and livelier heavy genres in the Spirala, "Odustani" and a living field for comments, all Settings sub-screens. Chosen (D-068): a short 18+ confirmation, faces for "all answers", answers only on past days, Activity by day, three-column profile counts, comments as text plus catalogue cards (images from B1).
    - **D-069:** @username changes once every 30 days, old name reserved 30 days; "Ukloni pratitelja" for private profiles (JO1, approved); naming odgovor / komentar / reakcija.
    - **Round 10 (session 12, D-070):** loading cards that breathe, an offline bar, empty states with an icon and a title, one line when the question is late, privacy as rows with a sheet, deactivate or delete in short steps, a log-out confirmation. **No social emails in the alpha** (OQ-32, deferred; security and account emails stay). Built from confirmed rules: errors with Retry and kept text, blocks, long names, sign-in, the D-054 banner, the grace-period screen, username, password, email and 2FA screens. Sketch: `pulse/round10.html`. **D-071:** the notifications screen has one switch for this phone on top, the types below (`pulse/round11.html`). **D-072:** reactions off by default, a pause (1 h, 3 h, until 08:00) added to the alpha, R-15 to R-18 confirmed (followers stay when going private, notice to the old email, password change signs out other devices, silent unblock).
    - **Large text (session 13, D-073):** a large-text mode for 200 % text: spacing stops growing, layouts stack, the tab bar shows only the open tab's label, and headings grow by a step over body text (the owner accepted the strict WCAG 1.4.4 reading as a risk). Comments now take catalogue cards (D-068). Review page `pulse/large-text.html`.
    - **Round 12a (session 14, D-074):** another member's profile (public, private, verified), the answer history, the follower lists with "Ukloni pratitelja" (⋯ per row) and follow requests (one row on top of Activity, a requests screen). Who sees what follows J4 and D-033. **Naming change (amends D-012):** the mutual relationship is „Povezani” / "Connected"; code keeps `mutual`. Review page `pulse/round12a.html`.
    - **Round 12b (sessions 14–15, D-075):** member safety: report (a bottom sheet, 11 categories, 3 steps), block with the fact list in a sheet, **mute after a short confirmation** then Undo (the owner's one deviation from the recommendations), muted and blocked content in lists and threads, the real block and mute lists, a status hub with notices (labelled statement of reasons, DSA Art. 17), a basic appeal and my reports, the restricted (reason at the composer and dock only) and suspended screens. Owner addition: a quiet "Utišano" chip on a muted member's profile, viewer only. Review page `pulse/round12b.html`.
    - **OPEN (OQ-28):** how far back the archives reach. The Master Prompt asks for a permanent archive, so a seven-day limit would change confirmed scope.
- Phase 2 deliverables:
  - `docs/architecture/`: domain model v0.1, visibility matrix **v0.3**, architecture options
  - `docs/research/`: EU infrastructure, catalog providers, legal and platform facts
  - `docs/security/threat-model.md` v0.1
  - `docs/legal/questions-for-counsel.md` (now includes C.9: privacy by default and dark patterns)
  - `docs/alpha-acceptance-criteria.md` (draft)
  - audit addendum §10a
  - `docs/legal/trademark-preliminary-search.md` (complete, preliminary): no identical "GrooveRift" mark (TMview, WIPO, DZIV) and no product with that name on the web. "RIFT" is crowded in classes 9/41. Owner owns `grooverift.com`.

## Next
1. **Rest of the step 3.5 refinement** (effort: High). Task list: `docs/design/prototype-directions.md` §6.
   - The desktop adaptation: rail at 600 and 1024 px, a 40 rem reading column, the sheet as a centred dialog. (200 % text and the comment cards are done, session 13.)
   - Screen reader (Narrator) and high-contrast checks.
2. **Round 12, all remaining alpha screens (owner: "sve"),** one group at a time, each as a round page and a survey: ~~(a) other members' profiles and lists~~ (done, D-074); ~~(b) member safety~~ (done, D-075); **(c) signed-out and sign-in next** (PUB-01, PUB-03, PUB-04, PUB-06, PUB-07, PUB-08); (d) the rest (PROF-09 DNA editor, PROF-08 photo, SET-12 feedback form, SYS-02, SYS-04, the Hub before the first Drop).
3. **OQ-28:** archive depth (permanent archive is confirmed scope; RECOMMENDED: the seven-day strip as the entry, the full archive one tap deeper).
4. Open, to raise when convenient:
   - JO2–JO6 are RECOMMENDED defaults in `docs/design/journeys/README.md` (JO1 approved, D-069).
   - OQ-32: opt-in social emails, deferred by the owner; decide before DMs (B3) or the beta.
   - OQ-24: music news idea, after the alpha scope.
   - OQ-29: Hub ideas Hidden Gems and On Repeat (backlog, `docs/product/future-hub-ideas.md`; not now).

## Owner actions outside Claude
- `git push` after each session (Claude's push is blocked).
- Terminal display options (shorter output, focus view, Ctrl+O): `docs/claude-code-tips.md`.
- Review the refined prototype yourself (D-044): `design/prototypes/pulse/viewer.html`. Open `pulse/index.html` on a phone too.
- MetaBrainz registration (D-018), when convenient before Phase 5.
- Start looking for an accountant and lawyer (`docs/legal/questions-for-counsel.md`). Needed before the alpha.

## Blockers
- None for planning or design. Before the alpha: legal entity (OQ-05), moderation staffing (OQ-06), age policy (OQ-10), DPIA, legal documents.

## Top risks
1. Scope vs. capacity (A-01). Dropping the light theme (D-063) removes a second set of design and contrast tests. Living motifs (D-049) and the generative Music DNA (D-048) need care for performance and battery on real phones.
2. Artwork rights; the design must work without covers or photos (D-017).
3. Authorization complexity (S-02). Mitigated in part by the resolved visibility rules.
4. Legal status: DSA, DPIA, age assurance (L-02, L-03, L-04). Onboarding visibility choice is now neutral (D-030, per EDPB 03/2022); counsel C.9 still to confirm.
5. Missing production wordmark and vector logo (B-01, D-011). The wordmark accent brief is settled again (D-058, bolt N2).
6. Trademark: "RIFT" marks in classes 9/41 (gamigo EU, Meta, LOST RIFT); attorney assessment needed before filing or brand spend.
7. Accessibility interpretation: large-text headings grow by a step, not to 200 % (D-073, owner-accepted). Confirm in the 3.9 accessibility review.

## Code
No application code. No dependencies installed.
- `design/prototypes/ia/`, `journeys/` and `tokens/` hold static decision sketches (HTML/CSS/vanilla JS, fictional data).
- `design/prototypes/directions/` holds the step 3.5 round-1 prototypes: three directions on a shared engine, plus a comparison page (unchanged record).
- `design/prototypes/pulse/` holds the refined direction C. It includes `wordmark.html` (the D-058 bolt options, with the D-055 rounds archived), `invite-current.html` and `invite-current.js` (the D-058 invite current; the app uses variant I4 "branch"), `invite-layout.html` (the D-059 layouts in phone frames), `round6.html` (the D-060 options in phone frames), `password.html` (the D-054 decision sketch; its live HIBP check is opt-in and off by default), `reactions.html` (the D-056 decision sketch) and `picons.js` (six Phosphor icons, MIT, see `ICONS-LICENSE.md`). It is canvas-drawn (current, orbit, Music DNA Spirala) and uses no libraries. `viewer.html` and `choices.html` are the owner review pages. With `?live=1`, the artist search queries MusicBrainz, Wikidata and Wikimedia Commons from the browser, read-only.
- `design/prototypes/tools/` holds zero-dependency Node scripts that drive headless Chrome:
  - `smoke.mjs` checks `directions/` and passes 3/3.
  - `pulse-smoke.mjs` checks `pulse/` and passes 82/82 (session 15).
  - `zoom-check.mjs` checks 75 screens at a raised browser text size (`--scale=2` by default) for sideways scrolling, clipped text and oversized bars; all pass at 200 % (session 15); in session 13 also at 100 and 150 %, and at 320 px.
    - Session 10 added: the password page, counter and breach rejection; the live bolt and its reduced-motion stop; the reactions page and the single icon-only reaction in the flow.
    - Session 11 added: wordmark round 2; the invite current page, also under reduced motion; the I4 invite canvas, the bolt sparks and the flicker motion rule in the flow; that the invite fits the screen; the four invite layouts at 360×640 and 320×568; the language step, the softer 18+ copy, "Kako radi" fitting the screen, the tab swipe, the round 6 page and the D-060 defaults.
  - `shots.mjs` and `pulse-shots.mjs` take screenshots.
- `design/tokens/` holds zero-dependency Node scripts: `build.mjs` generates `tokens.css`, and `contrast-check.mjs` checks 87 pairs (all pass; output in `contrast-report.md`).
- `design/fonts/` holds self-hosted Sora/Inter WOFF2 files with OFL licenses.
- Phase 3 adds only static design files under `design/`. Stack approved (ADR-0002); libraries are confirmed in Phase 4.
