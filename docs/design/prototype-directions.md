# Prototype directions (step 3.5)

_Phase 3, step 3.5 ⛳. First round done: the owner picked **direction C "Pulse" (D-042)** with the **dock composer (D-043)**. Refinement of C is in progress: two review rounds done in session 9 (§7). The rest of the refinement list is in §6._

## 1. What was built

The comparison page is [`design/prototypes/directions/index.html`](../../design/prototypes/directions/index.html). It shows three clickable mobile prototypes side by side in iframes at 360 px or 320 px. One set of controls drives all three:
- flow: onboarding or Daily Drop
- start step
- simulated public or private profile
- width

Each direction also opens on its own, for example on a phone.

| Path | Purpose |
|---|---|
| `directions/index.html`, `compare.css` | Owner comparison page (Croatian), with explanations and scenarios |
| `directions/shared/app.js` | One state machine for J1 onboarding and J3 Daily Drop. Each direction varies through `window.GR_DIRECTION` (see the file header). |
| `directions/shared/data.js` | **Placeholder data.** Fictional members, answers, comments and email. Real artist and album names stand in for catalog references. Reactions are placeholders (OQ-13). |
| `directions/shared/base.css`, `icons.js` | Shared components on `--gr-*` tokens only, and provisional stroke icons (to be replaced in 3.6) |
| `directions/a-quiet/`, `b-cards/`, `c-pulse/` | Entry page and stylesheet for each direction |

Constraints held: D-027 (static, no dependencies), D-017 (no artwork), tokens and fonts from 3.4 only, and a wordmark approximation labeled per D-011. No native playback.

**URL parameters, for testing and for the comparison page:**
- `?flow=drop` starts signed in on Home.
- `&private=1` simulates a private profile.
- `?at=<step>` opens an onboarding step with the earlier steps filled in.
- `?flow=drop&at=drop|answer|hub|profile|activity` opens that Daily Drop screen.
- `&open=compose` (with `at=drop`) opens the composer.

## 2. Coverage

**Onboarding (J1), all steps in J1 order:**
- invite landing, 18+ (and the under-18 page), account (password or simulated Google), username (simulated availability check with suggestions), language, profile visibility, Music DNA picks, Music DNA visibility, how it works, reminder (simulated browser permission prompt, allow or block), done, Home
- "Step n of 9" counts the nine steps between the landing page and Done.
- Validation errors show inline and move focus to the first error.

**Daily Drop (J3):**
- Home card, Hub, question and answers, three sorts
- composer with catalog references, and the audience line or private-member notice (D-021)
- post, edit with the "edited" indicator, delete confirmation, one answer only (D-035)
- reactions, Read more, overflow menu (stub to J5), comments with the D-020 notice
- a "new answers" button after 20 seconds (WCAG 2.2.2)
- profile summary of the onboarding choices

**Not covered yet:** desktop, loading, offline, network error, blocked, the missing-question day (E2), archive, J4 and J5 flows, English copy.

## 3. The three directions

| | A · Quiet (`a-quiet`) | B · Cards (`b-cards`) | C · Pulse (`c-pulse`) |
|---|---|---|---|
| Idea | Typography carries the design; no cards | Structured, scannable, closest to common app patterns | Brand energy only at the signature moments (§15.7); calm elsewhere |
| Onboarding progress | Text plus a 2 px bar | Four named sections plus text | Nine short bars along the Coral→Amber gradient, plus text |
| Visibility choices | Rows with a radio circle | Cards with icon and check badge | Large tiles with icon and check badge |
| Music DNA | Chips, artist search, count | Same | Same, plus a pulse strip (one bar per pick; heights are decorative identity art, not data) |
| Daily Drop question | Large Sora title on the canvas | Amber highlight card | Largest title plus the rift line |
| Composer | "Answer" button opens a separate screen | Open inline under the question | Dock above the tab bar opens a bottom sheet |
| Sort control | Native select | Segmented control | Pills with check mark |
| Answer list | Hairline list, 16 px text | Card per answer, 14 px text | Hairline list, 18 px text, small avatar |

**Owner decision (2026-11-01): C, as Claude recommended (D-042, D-043).** Reasons:
- It is the most distinctive of the three, and it keeps motifs inside the places §15.7 allows: invite, Done, Music DNA and the Daily Drop question. The visibility step stays plain.
- The dock keeps the answer list visible (P2) and within thumb reach (P8).

In B, on a 360 px screen, the inline composer pushes every answer below the fold. That is a mild conflict with P2.

## 4. Things noticed while building

These items should be settled in the chosen direction or in step 3.8.

1. **Copy: "answer" and "reply" are both "odgovor" in Croatian.** The prototypes use *komentar / Komentiraj* for replies. Glossary decision in 3.8.
2. **Copy: Public option text vs. a separate Music DNA choice.** IA §7 requires the Public option to say that Music DNA is visible to all members, but ONB-06 then lets the member narrow it. The prototype adds "Music DNA možeš suziti u sljedećim koracima". Final wording in 3.8.
3. **Reminder buttons have equal weight** ("Not now" and "Turn on", both secondary). This applies the P3 spirit to an opt-in permission. RECOMMENDED.
4. **Password rule shown as "at least 15 characters".** Confirmed by D-054 (session 10) together with the counter and the breached-password check.
5. **Contrast pair for C, done.** `gradient.brand` as an indicator on `bg.canvas` (6.35) and `bg.surface` (5.97) was added to `contrast-pairs.json`. The check now runs 87/87 pass.

## 5. Verification (2026-11-01)

- **Headless Chrome screenshots** at 360 px and 320 px of these screens in all three directions:
  - invite, visibility, Music DNA, username, Done
  - Home (public and private)
  - question, composer (private), comments
- **Comparison page** screenshot at 1280 px.
- **Automated smoke test** (Chrome DevTools Protocol, Node 22, no dependencies): `node design/prototypes/tools/smoke.mjs`. Screenshots: `design/prototypes/tools/shots.mjs`. The smoke test walks the whole onboarding and Daily Drop path in each direction and checks:
  - errors and focus
  - nothing pre-selected
  - username suggestions, two "Nirvana" results, Back keeps the picks
  - simulated permission block
  - private notice tied to the Post button
  - post, edit, delete, sort, reactions, Read more, menu, comments, tabs
  - no duplicate IDs

  **Result: all three pass, with no JS exceptions or console errors.**
- **Not done:** a real screen reader pass, real devices, Windows high-contrast mode. These are planned for the refined direction and step 3.9.

## 6. Owner decisions and next steps

| ID | Decision |
|---|---|
| D-042 | Direction C "Pulse". Motifs stay at the invite, Done, the Daily Drop question and Music DNA. |
| D-043 | Dock composer with a bottom sheet. |
| D-044 | No external usability check; the owner reviews personally. |
| D-045 | Light theme as a member setting, dark default. Designed in step 3.4b. |

**Refinement of C, remaining after session 9** (done items are in §7):
- **Session 12 update:** the key states below (empty, loading, error with Retry and kept text, offline, blocked, the missing-question day, long text) and every settings flow are done in round 10 (D-070, `pulse/round10.html`). The rest of this list still stands.
- Key states:
  - empty: no answers yet, no follows
  - loading skeletons for answers (the artist search already has them)
  - network error with Retry and kept text (E9, JR4)
  - offline (E10)
  - blocked placeholders (D-019)
  - the missing-question day (J3 E2)
  - long text and long Croatian names
- ~~200 % text zoom (320 px reflow is done).~~ Done in session 13 (D-073): a large-text mode, review page `pulse/large-text.html`, check `tools/zoom-check.mjs` (49 screens pass at 100, 150 and 200 %, and at 320 px).
- ~~Desktop adaptation: rail (D-031) at 600 px and 1024 px, a reading column of 40 rem, and the sheet as a centered dialog on wide screens.~~ Built in session 17 up to 1920 px (D-079, D-080; see §7, "Desktop").
- Screen reader pass (Narrator is built into Windows; NVDA would need installing, which needs owner approval) and a Windows high-contrast check.
- ~~"Smanji pokrete" in the real settings structure~~ Done by D-063 (Settings screen).
- ~~Catalogue cards in the comment form (D-068)~~ Done in session 13.

## 7. Refinement of C (session 9)

The refined prototype lives in [`design/prototypes/pulse/`](../../design/prototypes/pulse/). `directions/` stays unchanged as the record of round 1. The owner reviews in `pulse/viewer.html`, which has a phone frame, a jump to any screen, device sizes and switches. On a phone, `pulse/index.html` opens directly. `pulse/choices.html` shows a Music DNA gallery, a playground and the motion.

| File | Purpose |
|---|---|
| `app.js` | State machine for J1 and J3, direction C only |
| `current.js` | The "struja" motif and the orbit round the answer field; also `GR_MOTION` ("Smanji pokrete") |
| `dna.js` | Generative Music DNA "Spirala" (D-048) |
| `catalog.js` | Artist search: offline list with typo tolerance, or live (`?live=1`) MusicBrainz + Wikidata + Commons |
| `data.js` | **Placeholder data**: fictional members and answers; real artist names as catalog stand-ins; genre traits are design placeholders |
| `style.css`, `icons.js` | Styles on `--gr-*` tokens; provisional icons (OQ-23) |
| `viewer.html`, `choices.html` | Owner review pages (Croatian) |

**URL parameters:** `?at=<step>`, `?flow=drop&at=drop|answer|hub|profile|activity`, `&open=compose`, `&private=1`, `?at=dna&picks=1` (DNA step pre-filled), `?live=1` (real catalog), `?catalog=fail` (catalog outage), `?calm=1` (start with "Smanji pokrete" on).

### Round 1: owner review of C

The owner asked for:
- **Invite:** a living pulse, ideally an electric current.
- **Age:** a centred step.
- **Profile and Music DNA visibility:** fit the phone screen with no scrolling.
- **Genres:** 2 to 10, chosen from about 20 popular ones.
- **Music DNA:** a "brutal", unique visual.
- **Artist search:** good, with photos and many bands.
- **How it works:** more dynamic.
- **Reminder:** short, and it must say this is the main feature.
- **Done:** livelier, with a less monotonous summary.
- **Daily Drop:**
  - name and date apart, without middle dots
  - a centred "Odgovori" with a live current
  - filters in one row
  - slightly bigger author line
  - a better divider between answers
  - less uniform answers
  - a subtle current round the answer field

**What was built:**
- **Current.** A canvas Coral→Amber arc. The two halves run in and collide, charges flow from both ends, and the middle pulses when they meet.
- **Profile visibility.** Two equal option columns over a six-row comparison. The chosen column lights up, and rows that differ are emphasised. It fits 360×640, which the smoke test checks. The texts required by IA §7 are kept.
- **Genres and artists:**
  - 24 genres plus "Još žanrova" search (Croatian genres such as Klapa and Tamburica included); 2–10 genres required (D-046).
  - Artist search tolerates typos ("metalica" finds Metallica).
  - Live mode was tested: MusicBrainz returned Metallica and Let 3 with credited Commons photos, and Haustor without a photo, so it got a generated tile.
  - Picked artists show as portraits.
  - A catalog outage shows a Retry state, and the picks are kept.
- **How it works.** Animated cards for:
  - Daily Drop
  - Weekly Poll
  - Did You Know?
  - Ljudi po ukusu (people by taste)

  The first three are confirmed for the beta in the Master Prompt. Whether they are in the alpha depends on OQ-07.
- **Reminder.** "Ne propusti Daily Drop" with a notification preview.
  - The community line is positive and does not shame "Ne sada" (DSA Art. 25, EDPB dark-pattern guidance).
  - The two buttons keep equal weight.
- **Done.** Music DNA card and four fact tiles.
- **Daily Drop:**
  - a gradient "Daily Drop" name, with the date below
  - a live current under the name
  - a centred "Odgovori" button and a quieter "Prvo pročitaj odgovore" link
  - avatar stack and count
  - one-row filters (tighter at 320 px)
  - soft answer cards
  - 40 px avatars ringed in the member's Music DNA colours
  - catalog cards with a generated tile
  - commenter avatars on the comments button

### Round 2: owner decisions and changes

- **Decisions:**
  - date style A and name kept (D-047)
  - Music DNA "Spirala", smarter, unique and alive (D-048)
  - motifs stay alive, with a "Smanji pokrete" setting (D-049)
  - brand name set like the wordmark in text (D-050)
  - 18+ only (D-051)
- **Feedback:** the first current and the dock spark "looked bad". The current was rebuilt with smooth noise, bloom, flowing charges and discharge arcs. The SVG dash became a canvas orbit with a fading tail.
- **Removed:**
  - the trait words "Energija / Ritam / Raspon"
  - the "Svaki dan" badge
  - the four other date styles and the three name candidates
  - the "Konstelacija" and "Signal" variants
- **Profile visibility polished:**
  - full-height option columns with an icon badge
  - Da/Ne with icons
  - shared values in a quieter style
- **Brand name in text** (D-050): the invite, "Kako grooverift radi" and the notification preview.
- **Genre chips** show their Music DNA colour dot when picked; profile tags show it too.

### Round 3: owner feedback on round 2 (2026-11-02)

The owner said the Spirala and the current were "super", and that the Spirala reads best with many genres.

**Changes:**
- **Colours with a meaning** (D-052):
  - rap is blue, jazz green, blues steel blue, techno cyan and classical ivory
  - similar lightness, so a helix stays calm
  - strands use the same hue in two lightnesses
- **No tags under Music DNA.** A tap on a section shows the genre and its artists; screen readers get the list as text.
- **20 main genres** with a "+ Još žanrova" chip (D-053).
- **Artists:**
  - results show the country only
  - one initial on tiles without a photo
  - live mode still shows real Commons photos with credit
- **Profile visibility** is one card; the chosen column lights up from top to bottom and the whole column is a tap target.
- **Copy and controls:** "Kako se zoveš?", and an eye icon for show password.
- **How it works:** icons from **Phosphor** (light weight, MIT), embedded as path data in `picons.js` (OQ-23).
- **Current:** softer glow where the charges collide.
- **Wordmark:** four sketches with an electric accent in `pulse/wordmark.html` (OQ-26).

**Explained to the owner, no change:**
- The reaction chips "Isto / Novo mi je / Dobar izbor" are placeholders for OQ-13.
- What Home and Hub hold (IA HOME-01, HUB-01, D-031).

### Round 4: password rules (2026-11-02, session 10)

Decision sketch `pulse/password.html`: twelve live copies of the account field, one rule set each, with an example row that fills them all. Simulated apart from an opt-in live HIBP range query from the browser. Sources: NIST SP 800-63B-4 §3.1.1.2 and §3.2.2 (final text, August 2025), Better Auth email-password, HIBP plugin and rate-limit docs, the HIBP API page.

**Owner choices (D-054):** 15 characters; a counter instead of a strength meter; HIBP with fail-open; a recommendation banner, not a forced change, after a sign-in time hit. Help text "Najmanje 15 znakova. Odaberi sigurnu lozinku." (the owner first wrote "Odaberite"; the "ti" form was confirmed for consistency with the rest of the app, to be recorded in the 3.8 tone guide).

**Changes in `pulse/`:**
- the account step shows the counter and bar under the password field, and the check mark at 15
- a password from the sketch's breached list is rejected after "Napravi račun" with the reason (simulated list, marked in `app.js`)
- the sign-in banner is not in the flow prototype, because J1 and J3 have no sign-in screen; it belongs to the states round (§6)

**Wordmark accent (D-055, same session):** the owner chose A ("definitivno A, samo da je malo živa, jako suptilno"). `wordmark.html` gained a section with three intensities of a live bolt (a glint every 9, 5 or 3 s; the stronger two also breathe). The owner chose **A2** (glint every 5 s, breath 72–100 % over 4 s) and the bolt **only on the standalone wordmark**, not on the brand name in sentences. Applied to the top bar in `app.js` (`bolt()`) and `style.css` (`.wm-bolt`, `wm-glint`, `wm-breathe`); both stop under `html[data-motion="reduced"]` and `prefers-reduced-motion`, and the smoke test checks that in every run.

**Reactions (D-056, same session):** `reactions.html` showed the set (three stances, one reaction, four), single vs. multiple, text vs. icon, and who sees counts. The owner did not find the three stances clear ("ovo ne razumijem") and chose one like-style reaction, single per member, icon only, counts visible to all, and asked that both the icon and the count look good. Section 6 then offered four looks (calm bolt, bolt with spark, wave, portal): the owner chose **V3, the audio wave**. Section 7 showed where the name appears (notification, Activity, who-reacted, screen reader) after the owner asked for an example: the owner chose **"Sviđa mi se" / "Like"**. Applied in `app.js` (`react()`, `WAVE`, a press class for the beat), `style.css` (`.react-like`, `gr-beat`, `gr-bump`), `data.js` (one reaction; the old per-stance counts are summed) and a shared `gr-ember` gradient in `index.html`.

### Round 5: wordmark bolt and invite current (2026-11-02, session 11)

The owner's D-057 requests, answered with clickable options first.

**Wordmark bolt (D-058).** The owner had said "ne djeluje dovoljno electric, previše je udaljena od rift, malo predebela".
- Measured in Chrome: the Sora baseline sits 0.84 em from the top at line-height 1, and "rift" has no descender. The A2 bolt therefore hung about 4–9 px below the letters in the top bar.
- `wordmark.html` gained four hairline bolts that hang from the baseline (`top: 0.86em`), each with a white-hot core, a soft glow and a flicker in place of the breath:
  - N1: a plain thread
  - N2: a thread with sparks
  - N3: a crackle that re-forms the shape (JS)
  - N4: two interwoven threads

  Today's A2 is shown for comparison, and round 1 moved to an archive section.
- The owner chose **N2**. It is applied in `app.js` (`bolt()`, `BOLT_PTS`, `BOLT_SPARKS`) and `style.css` (`.wm-bolt`, `wm-flick`, `wm-core`, `wm-spark`). `.wm-rift` gets `line-height: 1` so that the baseline offset holds. In forced colours the bolt is a plain `CanvasText` line without the core or sparks.

**Invite current (D-058).**
- `invite-current.html` and `invite-current.js` show four taller variants (112 px) in the invite hero at phone width, next to today's current:
  - I1: impulse collision
  - I2: arc across a gap
  - I3: heartbeat
  - I4: branching discharge
- The engine reuses the helpers and `GR_MOTION` from `current.js`. A tap triggers a meeting, and "Ponovi dolazak" replays the arrival. Under reduced motion each variant draws one still frame that already shows the joined state.
- The owner chose **I4**. The invite screen now uses `<canvas class="ic" data-v="branch" data-key="invite">`. `app.js` calls `GR_INVITE.scan()` after each render and `GR_INVITE.reset()` on navigation, like the other motifs, so the arrival plays once per visit. The engine also drops canvases that were removed from the page. The other three variants stay in the file as the decision record.

**Invite on one screen (D-059, same session).**
- The owner reviewed I4 in the app. The 112 px canvas took almost a quarter of the screen. The impulses should be taller while they travel, the collision halo smaller, and the whole invite should fit the viewport.
- The changes:
  - `invite-current.js` takes a per-canvas height (`data-h`). Branch packets are sharp zigzags (17 points, alternating signs, up to 0.3 h), and the halos are smaller.
  - `style.css` has `.screen-invite` spacing and a `max-height: 600px` rule.
  - `app.js` has `INV_AT` (`?inv=a|b|c|d`). In an iframe it posts `{ gr: "fit", over }` to the parent page after each render.
- `invite-layout.html` shows four layouts in phone frames at three sizes, with a fit check under each. The owner chose **B**: 56 px under the tagline, now the default.

**Verification:** `pulse-smoke.mjs` passes 19/19 after D-059 (17/17 after D-058; new runs: wordmark round 2, the invite page, the invite page under reduced motion; the flow now checks the I4 canvas, the three sparks and that the flicker follows the motion setting; after D-059 the flow also checks that the invite fits, and two runs check all four layouts at 360×640 and 320×568). `smoke.mjs` passes 3/3. Real-time CDP frames at 390 px confirm the invite discharge and the top-bar bolt, with no JS errors.

### Round 6: owner review of the whole flow (2026-11-02, session 11)

The owner's list, in order. **Direct** items change the prototype; **options** items get clickable examples first.

| # | Feedback | How it is handled |
|---|---|---|
| 1 | Profile visibility step ("Tko vidi tvoj profil"): try another layout, for example two rows instead of two columns. This revisits the one-card layout that D-053 and D-057 confirmed. | Options |
| 2 | Artist picker: show artists without their country? The owner is unsure ("hmmm?"). | Options |
| 3 | "Kako radi" step: the current in the Daily Drop illustration looks bad; the page must fit 100vh without scrolling. | Direct |
| 4 | "Spremno" (Done): drop the current at the top. The logo and the Music DNA are enough effects. | Direct |
| 5 | Home: maybe drop the current on the Daily Drop too; the owner wants a few examples, perhaps in a different order. | Options |
| 6 | Profile page: a few examples. | Options |
| 7 | Bottom navigation: good as it is, but show different background styles, for example a "glass" look like Instagram's current one. | Options |
| 8 | Swipe between the main tabs as well as tapping them, like Instagram. | Direct |
| 9 | Ask for the interface language right after the 18+ step: English and Croatian only at first. A simple page like the 18+ one, perhaps with a language icon. | Direct |
| 10 | The 18+ step feels like signing up for an adult site. Soften it (design or an extra sentence); the 18+ rule (D-051) stays. | Direct, wording options if needed |
| 11 | Invite: under the alpha note, recommend adding a home-screen shortcut, because the app is a PWA. | Direct; the invite must still fit one screen (D-059) |

**Outcome (D-060).**
- Direct items 3, 4 and 8 to 11 are applied.
- Options items, from `round6.html`:
  - visibility C (two short rows)
  - artist line C (genre)
  - Home C with the name and date of B
  - profile C (Music DNA on top) with a genre-only tap tip
  - glass tab bar, about 20 % clearer
- Notes for later:
  - The invite fit check at 320×568 runs in a frame. The standalone prototype note takes a line that the real app does not have.
  - "Kako radi" fits 360×640 and 375×667; at 320×568 it scrolls.
- Follow-up (same session):
  - The brand name in the invite PWA tip and in the 18+ sentence is larger (`wm(true)`, `.wm-lg`, primary colour, no bolt).
  - The Daily Drop card on "Kako radi" has a living border: a Coral→Amber charge circles the edge (CSS `@property` angle on a conic gradient), and the icon tile is filled with the brand gradient. It stops under reduced motion and is hidden in forced colours.
- D-061 (same session):
  - Password composition rules with a ticked list (12+ characters, upper, lower, special).
  - EN listed first, and both reading languages preselected.
  - No current on the Daily Drop page.
  - `viewer.html` updated.
- D-063 (same session, round 7):
  - Dark only (step 3.4b cancelled).
  - Invite: edge-to-edge current, new lead, PWA line. Language step: globe icon. Genre search: two-column grid, new hint lines.
  - Reminder: compact time row, personal example question, "add to home screen" card. Done: "Sad si dio Rifta." Clearer glass tab bar. No current on the Hub.
  - Settings screen (gear on the profile), "Smanji pokrete" under Pristupačnost.
  - Options compared in `pulse/round7.html`.
- D-064 (same session): the owner chose the "Strujica" name, Home E with one "Odgovori" button (soft invite ring), the Hub with seven days plus this week's programme, notification question 2 and the globe icon. Archive depth is OPEN (OQ-28).
- D-062 (same session, owner review after D-061):
  - One password line under the field, red with the missing rules and green when done.
  - Terms in two centred lines. No stray line in the visibility comparison table.
  - The 20 most popular genres, in order, in full-width rows. A picked genre takes its own colour, with no dot.
  - Genre search covers the MusicBrainz list with Wikidata families and popularity ranking.
  - The "Kako radi" cards fill the screen with larger icons.
  - Research: `docs/research/2026-11-02-artist-search-genres-spotify.md`.
- Verification: `pulse-smoke.mjs` 21/21; `smoke.mjs` 3/3.

### Rounds 10, 11 and 13 (sessions 12 and 13)

Recorded in `DECISIONS.md` (D-070 to D-073) and `HANDOFF.md`; sketches `pulse/round10.html`, `pulse/round11.html`, `pulse/large-text.html`.

### Round 12a: other members' profiles, lists and follow requests (2026-11-03, session 14)

- Scope: PROF-01 (public, private, verified), PROF-03, PROF-07 with "Ukloni pratitelja" (D-069), ACT-02. Sketch `pulse/round12a.html`: seven choice sections and a "Napravljeno bez izbora" part (states of the button, the confirmations, who sees what, the requests screen, the lists, the own profile).
- Rules applied without a choice (J4, D-013, D-019, D-032, D-033): hidden sections are omitted, never locked; counts show only to viewers who may see the list; the P state shows the header, the bio and "Zatraži praćenje"; unfollow, cancel and remove are confirmed; decline and remove are silent; a name in an answer or comment opens the profile; requests exist only while the profile is private.
- Owner choices (D-074): wide button under the header (A); "Pratiš" plus a relationship chip (B); the quiet block for private profiles (A); history as question plus first lines (C); requests as one row on top of Activity (A); lists as two tabs on one screen (A); remove a follower through ⋯ per row (B, against the recommendation). Naming: „Povezani” / "Connected" replaces „Uzajamni” / "Mutuals" (amends D-012; Claude flagged the closeness to "Music Connections").
- Verification: `pulse-smoke.mjs` 64/64 (19 new runs), `zoom-check.mjs` 60/60 at 200 % (11 new screens), `smoke.mjs` 3/3.

### Round 12b: member safety (2026-11-03, session 14 overnight; decided in session 15, D-075)

- Scope: SAFE-01 report, SAFE-02 block, SAFE-03 mute, SAFE-04 my reports, SAFE-05 notices with a statement of reasons, SAFE-06 basic appeal, SAFE-07 restricted or suspended, SAFE-08 the real lists; the answer and profile menus wired to them. Sketch `pulse/round12b.html`: five choice sections and a "Napravljeno bez izbora" part (report steps, menus, after a block, the status hub, SAFE-07).
- Rules applied without a choice (J5, D-019, D-072, R-07, Master Prompt §12): mute is one-way and silent, with a collapsed row and "Prikaži"; block hides both ways, ends follows both ways, cancels requests, sends nothing; a report has categories (impersonation and minors prioritised, copyright to PUB-11), is reviewed by a person and never names the reporter; every decision carries what, rule, decision, how it was decided and the appeal (DSA Art. 17); enforcement is progressive (notice, warning, restriction, suspension); a restricted member keeps reading, reacting and following.
- Options for the owner (D-075): report sheet vs. screen; block sheet with facts vs. short dialog; mute at once vs. confirmation; statement as sections vs. letter; restriction at the composer only vs. plus a bar.
- Owner choices (session 15, D-075 CONFIRMED): the recommendations everywhere except mute, which asks first (`mute=b`: a short "Utišati @ime?" dialog, then the toast with Undo; the same when mute is offered at the end of a report). Owner addition: a dashed "Utišano" chip by the handle on a muted member's profile, visible to the viewer only (`.rel-chip.is-muted`, screen readers hear "Utišano, vidiš samo ti"). Defaults in `app.js`: `rep=a`, `blk=a`, `mute=b`, `sor=a`, `rst=a`.
- Verification: `pulse-smoke.mjs` 82/82 (18 round 12b runs), `zoom-check.mjs` 75/75 at 200 % (15 round 12b screens), `smoke.mjs` 3/3.

### Round 12c: signed-out visitors and sign-in (2026-11-03, session 15; decided the same day, D-076 and D-077)

- Scope: PUB-01 landing, PUB-02 sign-in states (wrong password, lockout, return to shared content), PUB-03 second factor, PUB-04 password reset (request, sent, new password, expired link), PUB-06 email verification, PUB-07 the Daily Drop share view, PUB-08 the minimal public profile, SYS-01 for a visitor, and the invite that cannot be used (J1 E1). Sketch `pulse/round12c.html`: five choice sections and a "Napravljeno bez izbora" part (19 frames). Note: the STATUS list for this group used the IA numbers loosely; the IA numbers above are the right ones.
- Rules applied without a choice (D-022, IA8, U-05, U-08, R-08, Master Prompt §3): a visitor sees the question and the invitation only, with no answers, names or counts, and an answer link shows the same view; the public profile is name, handle, avatar and bio with no hint of hidden parts; private, blocked, unknown and unpublished all show one "nije dostupno" page; no waitlist and no open registration; reset, verification and invite links are single-use and short-lived, and the "cannot be used" page never says why; the reset "sent" page reads the same whether the account exists; a new password signs out other devices; the DSA Art. 16 notice form is linked from every signed-out page.
- Prototype notes: screens use `kind: 'pub'` (wordmark, Alfa tag, language button, no tabs). `st.pubRet` is where the visitor came from and `st.ret` is applied by `signedIn()`. Option a of the shell shrinks the top-bar button at 200 % text and hides the Alfa tag there (`:has`), which is one argument for option b.
- Options for the owner (D-076): landing quiet, with the current or with today's question; sign-in in the top bar or the foot; share view with or without an introduction; after a new password, signed in or back to sign-in; second factor with or without "remember this device"; and, added after the first review, a sign-in wall for visitors (none, a dismissable sheet, or an undismissable blurred dialog).
- Owner choices (D-076 CONFIRMED): `land=b` (the invite current on the landing), `pub=b`, `share=a` with no current under the date, `reset=b`, `tfa=a`, `wall=hard` after five seconds (Claude recommended no wall; the risks are recorded in D-076). `?wallnow=1` opens the wall at once for the frames. Lockout limit: D-077 (5 failures → 15 min, then 1 h, then 24 h; 100 per account in total).
- Verification: `pulse-smoke.mjs` 107/107 (25 round 12c runs), `zoom-check.mjs` 93/93 at 200 % (18 round 12c screens), `smoke.mjs` 3/3.

### Round 12d: the rest of the alpha screens (2026-11-03, session 16)

- Scope: PROF-09 the Music DNA editor (J2), PROF-08 edit profile with a photo, SET-12 help and feedback, SYS-02 something went wrong, SYS-04 a paused feature (J6 E9), HUB-01 and HOME-01 before the first Daily Drop, and the J1 E3/E4 invite cases (invite opened while signed in; Google address differs). Sketch `pulse/round12d.html`: eight choice sections (19 frames) and a "Napravljeno bez izbora" part (28 frames).
- Rules applied without a choice (J2, D-017, D-024, D-046, D-052, IA §6, Master Prompt §4 and §13): only the member changes their Music DNA, every change saves at once and is announced, Remove has Undo, Move up / Move down are buttons named with the item and focus stays on the moved item, no duplicates, caps of 10 genres and 10 artists, the audience in words with "Promijeni" (the SET-05 sheet); the photo is optional, sits inside the genre ring, is seen by everyone who sees the profile, EXIF is stripped, JPG/PNG/WebP up to 5 MB; feedback is separate from abuse reports, the screenshot is optional and sensitive (audit A-06), what is sent is listed before sending, reply by email is a ticked choice; SYS-02 offers Retry and help with no technical details; SYS-04 is brief, blames no one and points Home, and no reminder is sent while paused; before the first Drop the Hub and Home name the date and the local time (00:00 UTC) and what can be done meanwhile, and the archive starts with the first question.
- Options for the owner: (1) editor shape: rows with Move up / Move down / Remove (A, RECOMMENDED) or chips as in onboarding (B); (2) at least two genres always (A, RECOMMENDED, D-046) or the list may be emptied (B, J2 E6); (3) photo through a sheet with gallery, camera and remove (A, RECOMMENDED) or straight to the picker (B); (4) a crop step with zoom (A, RECOMMENDED) or auto-centred (B); (5) feedback as one form with the type on top and the technical details listed (A, RECOMMENDED), two rows with their own forms (B) or one form without technical details (C); (6) SYS-02 inside the shell (A, RECOMMENDED), bare (B) or inside the shell with a support code (C); (7) a paused Daily Drop with the question still readable (A, RECOMMENDED) or the card alone (B); (8) before the first Drop a calm card with the local time (A, RECOMMENDED), with a countdown (B) or with the current (C).
- Owner choices (same day, D-078 CONFIRMED): A for (1) to (7); for (8) **B, a countdown with seconds** (against the recommendation; under reduced motion minutes only, once a minute; hidden from screen readers). Additions: "Katalog trenutačno ne radi.", the photo limit 5 MB, toasts with a button 5 s and without 2 s (the owner's first wish was 2 s for all; Claude flagged WCAG 2.2.1 and J2 for the Undo). Defaults in `app.js`: `dnae=a`, `dnamin=a`, `photo=a`, `crop=a`, `fb=a`, `fail=a`, `paused=a`, `first=b`.
- Prototype notes: the editor is the settings sub-screen `dna` (`?flow=drop&at=setsub&s=dna`), reached from the profile ("Uredi Music DNA" under the Spirala) and from "Uredi profil"; in the sketch the chosen photo is read into memory only and never leaves the browser; `?pic=sample` is the stand-in picture. The three states are `?state=first|paused|fail`.
- Verification: `pulse-smoke.mjs` 135/135 (28 round 12d runs), `zoom-check.mjs` 123/123 at 200 % (29 round 12d screens; also at 100 % and at 320 px), `smoke.mjs` unchanged.

### Desktop: the rail, the columns, cards and dialogs (2026-11-03, session 17; D-079 and D-080)

- Scope: the desktop adaptation of direction C from §6, up to 1920 px. Breakpoints from `tokens.md` §7 (medium 600 px, expanded 1024 px, wide 1280 px) plus 1600 px for Full HD; the rail from IA §4 and D-031; the reading column `size.content-max` 40 rem (44 rem from 1024 px, 48 rem from 1600 px); sheets as dialogs per IA §3; help and the alpha mark in the rail footer (IA9, SYS-05). Review page `pulse/desktop.html`: every main screen at 1920×1080 (33 frames), 1366×800 (6), 1024×768 (4), 800×800 (4) and at the 600 / 599 px edge (4); 51 in all, each the real prototype at a real window size shown scaled down, with a link to the full size.
- First pass (D-079, survey): a collapsed 80 px rail on 600 to 1023 px, the wordmark and the alpha mark in the wide rail from 1024 px with the page title in the top bar, and no context column. The owner took all three recommendations, then asked for the whole desktop at once with a free hand (D-080): built from the phone, every size adapted, no further questions, up to at least 1920 px.
- What changes by width (nothing below 600 px):
  - **600 px:** signed-in screens get the collapsed rail (icon over label, Postavke, Pomoć and Alfa in the footer; Settings and Help are marked there, not Profile) instead of the tab bar, and the content sits in a column with the phone's own paddings around it, so the geometry inside stays the phone's. Onboarding, sign-in and the account pages become one centred card (34 rem, 36 rem from 1600 px) with the button under the form. Visitors get "Prijavi se" in the top bar and no sticky foot. Every sheet opens as a centred dialog over the content area with the same markup, order, focus and Escape; toasts sit above the dock. A skip link is the first focusable element; a mouse drag never switches tabs while a touch swipe still does.
  - **1024 px:** the rail has labels and the wordmark; the top bar is the page header ("Početna" on Home). Larger section titles, question and name, more room between sections; the visitor landing becomes a landing page with a larger hero and three feature cards.
  - **1280 px:** two columns wherever the content has two parts: Home (the Daily Drop left; "from people you follow" and the past days right, sticky), the Hub (the day and its question left; this week and the archives right), the own and other members' profiles (the Spirala across the top, capped at 60 rem; identity, counts and buttons left and sticky; artists and answers right), the settings sub-screens (the 18 rem settings list left with the open row marked and no back arrow; the detail right). The question page, Activity, comments, lists and the settings home stay one column; the question page keeps the composer dock at the foot as on the phone (the owner rejected a dock card on the right). System pages (something went wrong, a paused feature) sit in the middle of the window.
  - **1600 px (Full HD, the owner's screen):** a 106.25 % root (17 px at the default setting, still following the browser text size), so everything is about 6 % larger (type, spacing, columns, the rail); 50 + 26 rem columns, a 50 rem single column, a 38 rem onboarding card, a larger question and countdown. The owner reviewed the 1920 px frames and asked for exactly this: fill the space, a little larger, not more.
- Prototype notes: everything is CSS in the "Desktop" block of `style.css`, keyed on the viewport, `html[data-kind]` (app, onb, bare, pub) and `#app[data-screen]`; the only JS is the settings split (the list is rendered beside the detail from 1280 px, re-rendered on a change across the breakpoint) and the wrappers `.home-side`, `.hub-side`, `.pf-main` / `.pf-side`, `.pm-main` / `.pm-side` (`display: contents` on the phone, grid items on desktop). The rail's wordmark uses its own gradient id. `viewer.html` offers tablet and desktop sizes.
- Verification: `pulse-smoke.mjs` has eleven desktop runs (the rail and its order, the skip link, Settings and Help marked, mouse drag vs. touch swipe, the two-column Home, Hub, profiles and member profile, the dock at the foot, the compose sheet, the answer menu and the mute dialog as dialogs, the settings split, 1366 one-column geometry, 1024 one column with the dock at the foot, 800 collapsed, 599 unchanged, the onboarding card, the visitor landing, the page's frame count). `zoom-check.mjs` no longer counts the rail as a bar over the content; run at 360 px at 200 % and at 1920×1080 at 100 % and 200 %, 1366×800, 800×800 and 600×800 at 100 %.

### Verification (session 9)

- `node design/prototypes/tools/pulse-smoke.mjs`: **all 10 runs pass**, with no JS exceptions or console errors.
  - The whole flow runs at 360×640 and 320×568, with OS reduced motion, and with the in-app setting.
  - Also checked: catalog failure, the helix, the Daily Drop heading, and the three review pages (viewer, choices, wordmark).
  - The flow checks that the two visibility steps fit 360×640 and that the filters fit one row. It also checks the 2–10 genre rule, the 20 main genres and the more chip, typo search with country-only results, the eye icon, library icons, no tags under Music DNA, the orbit, the motion switch and the wordmark in text.
- The original `smoke.mjs` still passes for `directions/` (3/3).
- Visual checks with headless Chrome at real speed (CDP frames over time) and with `tools/pulse-shots.mjs`.
- Live catalog checked once from headless Chrome (MusicBrainz, Wikidata SPARQL and the Commons API all allow CORS).
- **Not done yet:** screen reader, Windows high contrast, real phones, 200 % zoom, desktop layout.
