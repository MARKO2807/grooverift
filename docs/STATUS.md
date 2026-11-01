# Project status

_Last updated: 2026-11-01 (session 7)_

## Current phase
**Phase 3: UX research, information architecture and design system** (approved, D-026). Plan and step tracking: [`docs/design/phase-3-plan.md`](design/phase-3-plan.md).

| Step | Status |
|---|---|
| 3.0 Kickoff | ✅ Done |
| 3.1 UX foundations | ✅ Done ([ux-foundations](design/ux-foundations.md)) |
| 3.2 Information architecture ⛳ | ✅ Done ([information-architecture](design/information-architecture.md); decision sketches in `design/prototypes/ia/`) |
| 3.3 Key journeys | ✅ Done ([journeys](design/journeys/README.md) J1–J6; decision sketches in `design/prototypes/journeys/`) |
| 3.4 Design tokens v0.1 ⛳ | ✅ Done ([tokens](design/tokens.md); `design/tokens/`, fonts in `design/fonts/`, decision sketch in `design/prototypes/tokens/`) |
| 3.5 Prototypes ⛳ | ⏳ Next |
| 3.6 Core components spec | ⏳ |
| 3.7 Brand derivatives ⛳ | ⏳ |
| 3.8 HR/EN copy tone guide | ⏳ |
| 3.9 Review and close | ⏳ |

## Done
- Phases 0, 1 and 2 (discovery; audit and documentation foundation; architecture and legal groundwork).
- Decisions D-001 to D-041. Key ones:
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
- Phase 2 deliverables:
  - `docs/architecture/`: domain model v0.1, visibility matrix **v0.3**, architecture options
  - `docs/research/`: EU infrastructure, catalog providers, legal and platform facts
  - `docs/security/threat-model.md` v0.1
  - `docs/legal/questions-for-counsel.md` (now includes C.9: privacy by default and dark patterns)
  - `docs/alpha-acceptance-criteria.md` (draft)
  - audit addendum §10a
  - `docs/legal/trademark-preliminary-search.md` (complete, preliminary): no identical "GrooveRift" mark (TMview, WIPO, DZIV) and no product with that name on the web. "RIFT" is crowded in classes 9/41. Owner owns `grooverift.com`.

## Next
1. Step 3.5 ⛳: prototypes (effort: High). 2–3 genuinely different directions for onboarding and Daily Drop at mobile width, built on `design/tokens/tokens.css` and `design/fonts/fonts.css`, no artwork, placeholder data labeled. The owner picks a direction, then it is refined with key states and a desktop adaptation. Decide whether to run an informal usability check with 3–5 people.
2. Open from 3.3, to raise when convenient: JO1 "Remove follower" for private profiles (scope addition, needs owner approval). JO2–JO6 are RECOMMENDED defaults in `docs/design/journeys/README.md`.

## Owner actions outside Claude
- `git push` after each session (Claude's push is blocked).
- MetaBrainz registration (D-018), when convenient before Phase 5.
- Start looking for an accountant and lawyer (`docs/legal/questions-for-counsel.md`). Needed before the alpha.

## Blockers
- None for planning or design. Before the alpha: legal entity (OQ-05), moderation staffing (OQ-06), age policy (OQ-10), DPIA, legal documents.

## Top risks
1. Scope vs. capacity (A-01).
2. Artwork rights; the design must work without covers or photos (D-017).
3. Authorization complexity (S-02). Mitigated in part by the resolved visibility rules.
4. Legal status: DSA, DPIA, age assurance (L-02, L-03, L-04). Onboarding visibility choice is now neutral (D-030, per EDPB 03/2022); counsel C.9 still to confirm.
5. Missing production wordmark and vector logo (B-01, D-011).
6. Trademark: "RIFT" marks in classes 9/41 (gamigo EU, Meta, LOST RIFT); attorney assessment needed before filing or brand spend.

## Code
No application code. No dependencies installed.
- `design/prototypes/ia/`, `journeys/` and `tokens/` hold static decision sketches (HTML/CSS/vanilla JS, fictional data).
- `design/tokens/` holds zero-dependency Node scripts: `build.mjs` generates `tokens.css`, and `contrast-check.mjs` checks 85 pairs (all pass; output in `contrast-report.md`).
- `design/fonts/` holds self-hosted Sora/Inter WOFF2 files with OFL licenses.
- Phase 3 adds only static design files under `design/`. Stack approved (ADR-0002); libraries are confirmed in Phase 4.
