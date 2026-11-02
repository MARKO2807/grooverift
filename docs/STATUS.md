# Project status

_Last updated: 2026-11-02 (session 10)_

## Current phase
**Phase 3: UX research, information architecture and design system** (approved, D-026). Plan and step tracking: [`docs/design/phase-3-plan.md`](design/phase-3-plan.md).

| Step | Status |
|---|---|
| 3.0 Kickoff | ✅ Done |
| 3.1 UX foundations | ✅ Done ([ux-foundations](design/ux-foundations.md)) |
| 3.2 Information architecture ⛳ | ✅ Done ([information-architecture](design/information-architecture.md); decision sketches in `design/prototypes/ia/`) |
| 3.3 Key journeys | ✅ Done ([journeys](design/journeys/README.md) J1–J6; decision sketches in `design/prototypes/journeys/`) |
| 3.4 Design tokens v0.1 ⛳ | ✅ Done ([tokens](design/tokens.md); `design/tokens/`, fonts in `design/fonts/`, decision sketch in `design/prototypes/tokens/`) |
| 3.5 Prototypes ⛳ | 🔄 Direction **C "Pulse"** (D-042, D-043). Refinement: three owner review rounds in session 9 (D-046 to D-053) and, in session 10, the password rules (D-054), the wordmark accent (D-055) and the reaction (D-056), in `design/prototypes/pulse/`. States, 200 % zoom, desktop and screen reader pass remain ([prototype-directions](design/prototype-directions.md) §6, §7) |
| 3.4b Light theme tokens ⛳ (added by D-045) | ⏳ After the 3.5 refinement, before 3.6 |
| 3.6 Core components spec | ⏳ |
| 3.7 Brand derivatives ⛳ | ⏳ |
| 3.8 HR/EN copy tone guide | ⏳ |
| 3.9 Review and close | ⏳ |

## Done
- Phases 0, 1 and 2 (discovery; audit and documentation foundation; architecture and legal groundwork).
- Decisions D-001 to D-057. Key ones:
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
  - **Password rules (session 10, D-054, resolves OQ-25):** 15 characters minimum, 128 maximum, no composition rules, no expiry; a counter while typing ("Najmanje 15 znakova. Odaberi sigurnu lozinku."); Have I Been Pwned k-anonymity check with fail-open; a monthly sign-in re-check that shows a recommendation banner, not a forced change. Argon2id is R-14 (Phase 4). Counsel question C.10 added.
  - **Wordmark accent (session 10, D-055, resolves OQ-26):** a short Coral→Amber bolt under "rift", quietly alive (a glint every 5 s, a slow breath), on the standalone wordmark only; stopped by reduced-motion settings. Brief for the designer: `pulse/wordmark.html`.
  - **Reaction (session 10, D-056, resolves OQ-13):** one like-style reaction per member per answer, icon only (a small audio wave that beats when pressed), count visible to all, named "Sviđa mi se" / "Like" in notifications and for screen readers.
  - **Round 3 review (session 10, D-057):** genre colours and the one-card visibility stay; Phosphor light is the icon library (OQ-23). The wordmark bolt (D-055) is reopened: not electric enough, too far from "rift", too thick. The owner also wants more invite-current designs with taller, spiked impulses that show connection.
- Phase 2 deliverables:
  - `docs/architecture/`: domain model v0.1, visibility matrix **v0.3**, architecture options
  - `docs/research/`: EU infrastructure, catalog providers, legal and platform facts
  - `docs/security/threat-model.md` v0.1
  - `docs/legal/questions-for-counsel.md` (now includes C.9: privacy by default and dark patterns)
  - `docs/alpha-acceptance-criteria.md` (draft)
  - audit addendum §10a
  - `docs/legal/trademark-preliminary-search.md` (complete, preliminary): no identical "GrooveRift" mark (TMview, WIPO, DZIV) and no product with that name on the web. "RIFT" is crowded in classes 9/41. Owner owns `grooverift.com`.

## Next
1. **Next session starts with (D-057), clickable options first:**
   - **Wordmark bolt, new options:** closer to "rift", thinner, more electric. Placement and the reduced-motion rule from D-055 stay.
   - **Invite current, a few new designs:** taller, spiked electric impulses that clearly show two sides joining (connection).
2. **Rest of the step 3.5 refinement** (effort: High). Task list: `docs/design/prototype-directions.md` §6.
   - Key states: empty, loading, network error, offline, blocked, missing-question day, long text. Also the sign-in screen with the breached-password banner (D-054) and the HIBP-unreachable path.
   - 200 % zoom and the desktop adaptation.
   - Screen reader (Narrator) and high-contrast checks.
3. **Step 3.4b ⛳: light theme tokens** (effort: High). Clickable options first, then the owner decides.
4. Open, to raise when convenient:
   - JO1 "Remove follower" for private profiles (scope addition, needs owner approval). JO2–JO6 are RECOMMENDED defaults in `docs/design/journeys/README.md`.
   - OQ-23: icon library, chosen in 3.6 (Phosphor RECOMMENDED; six icons already in the prototype).
   - OQ-24: music news idea, after the alpha scope.

## Owner actions outside Claude
- `git push` after each session (Claude's push is blocked).
- Review the refined prototype yourself (D-044): `design/prototypes/pulse/viewer.html`. Open `pulse/index.html` on a phone too.
- MetaBrainz registration (D-018), when convenient before Phase 5.
- Start looking for an accountant and lawyer (`docs/legal/questions-for-counsel.md`). Needed before the alpha.

## Blockers
- None for planning or design. Before the alpha: legal entity (OQ-05), moderation staffing (OQ-06), age policy (OQ-10), DPIA, legal documents.

## Top risks
1. Scope vs. capacity (A-01). The light theme (D-045) adds design and test work for every component. Living motifs (D-049) and the generative Music DNA (D-048) need care for performance and battery on real phones.
2. Artwork rights; the design must work without covers or photos (D-017).
3. Authorization complexity (S-02). Mitigated in part by the resolved visibility rules.
4. Legal status: DSA, DPIA, age assurance (L-02, L-03, L-04). Onboarding visibility choice is now neutral (D-030, per EDPB 03/2022); counsel C.9 still to confirm.
5. Missing production wordmark and vector logo (B-01, D-011). The wordmark accent is being redone (D-055 reopened by D-057).
6. Trademark: "RIFT" marks in classes 9/41 (gamigo EU, Meta, LOST RIFT); attorney assessment needed before filing or brand spend.

## Code
No application code. No dependencies installed.
- `design/prototypes/ia/`, `journeys/` and `tokens/` hold static decision sketches (HTML/CSS/vanilla JS, fictional data).
- `design/prototypes/directions/` holds the step 3.5 round-1 prototypes: three directions on a shared engine, plus a comparison page (unchanged record).
- `design/prototypes/pulse/` holds the refined direction C. It includes `wordmark.html` (D-055 options and live-bolt intensities; the bolt is reopened by D-057), `password.html` (the D-054 decision sketch; its live HIBP check is opt-in and off by default), `reactions.html` (the D-056 decision sketch) and `picons.js` (six Phosphor icons, MIT, see `ICONS-LICENSE.md`). It is canvas-drawn (current, orbit, Music DNA Spirala) and uses no libraries. `viewer.html` and `choices.html` are the owner review pages. With `?live=1`, the artist search queries MusicBrainz, Wikidata and Wikimedia Commons from the browser, read-only.
- `design/prototypes/tools/` holds zero-dependency Node scripts that drive headless Chrome:
  - `smoke.mjs` checks `directions/` and passes 3/3.
  - `pulse-smoke.mjs` checks `pulse/` and passes 14/14 (session 10 added: the password page, counter and breach rejection; the live bolt and its reduced-motion stop; the reactions page and the single icon-only reaction in the flow).
  - `shots.mjs` and `pulse-shots.mjs` take screenshots.
- `design/tokens/` holds zero-dependency Node scripts: `build.mjs` generates `tokens.css`, and `contrast-check.mjs` checks 87 pairs (all pass; output in `contrast-report.md`).
- `design/fonts/` holds self-hosted Sora/Inter WOFF2 files with OFL licenses.
- Phase 3 adds only static design files under `design/`. Stack approved (ADR-0002); libraries are confirmed in Phase 4.
