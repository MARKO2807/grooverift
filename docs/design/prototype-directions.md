# Prototype directions (step 3.5)

_Phase 3, step 3.5 ⛳, first round. Status: **OPEN**. The three directions are built and waiting for the owner's pick. After the pick, the chosen direction is refined (§6)._

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

**Claude's recommendation: C.** Reasons:
- It is the most distinctive of the three, and it keeps motifs inside the places §15.7 allows: invite, Done, Music DNA and the Daily Drop question. The visibility step stays plain.
- The dock keeps the answer list visible (P2) and within thumb reach (P8).

In B, on a 360 px screen, the inline composer pushes every answer below the fold. That is a mild conflict with P2.

## 4. Things noticed while building

These items should be settled in the chosen direction or in step 3.8.

1. **Copy: "answer" and "reply" are both "odgovor" in Croatian.** The prototypes use *komentar / Komentiraj* for replies. Glossary decision in 3.8.
2. **Copy: Public option text vs. a separate Music DNA choice.** IA §7 requires the Public option to say that Music DNA is visible to all members, but ONB-06 then lets the member narrow it. The prototype adds "Music DNA možeš suziti u sljedećim koracima". Final wording in 3.8.
3. **Reminder buttons have equal weight** ("Not now" and "Turn on", both secondary). This applies the P3 spirit to an opt-in permission. RECOMMENDED.
4. **Password rule shown as "at least 15 characters".** Placeholder, following NIST SP 800-63B-4 for single-factor passwords. To confirm with the Phase 4 library choice.
5. **Contrast pairs to add if B or C is chosen:**
   - B: `border.strong` and `action.primary` on `highlight.bg`
   - C: `gradient.brand` as an indicator on `bg.canvas`
   - All are expected to pass. Run `contrast-check.mjs` after adding them.

## 5. Verification (2026-11-01)

- **Headless Chrome screenshots** at 360 px and 320 px of these screens in all three directions:
  - invite, visibility, Music DNA, username, Done
  - Home (public and private)
  - question, composer (private), comments
- **Comparison page** screenshot at 1280 px.
- **Automated smoke test** (Chrome DevTools Protocol, Node 22, no dependencies; script kept outside the repo). It walks the whole onboarding and Daily Drop path in each direction and checks:
  - errors and focus
  - nothing pre-selected
  - username suggestions, two "Nirvana" results, Back keeps the picks
  - simulated permission block
  - private notice tied to the Post button
  - post, edit, delete, sort, reactions, Read more, menu, comments, tabs
  - no duplicate IDs

  **Result: all three pass, with no JS exceptions or console errors.**
- **Not done:** a real screen reader pass, real devices, Windows high-contrast mode. These are planned for the refined direction and step 3.9.

## 6. After the pick

Refine the chosen direction:
- key states: empty, loading, error, offline, blocked, long text, the missing-question day, 320 px reflow
- a desktop adaptation (rail per D-031, breakpoints from 3.4)
- the informal usability check, if the owner approves it

Record the outcome here and in `DECISIONS.md`.
