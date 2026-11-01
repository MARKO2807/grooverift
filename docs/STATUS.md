# Project status

_Last updated: 2026-11-01 (session 4)_

## Current phase
**Phase 3: UX research, information architecture and design system** (approved, D-026). Plan and step tracking: [`docs/design/phase-3-plan.md`](design/phase-3-plan.md).

| Step | Status |
|---|---|
| 3.0 Kickoff | ✅ Done |
| 3.1 UX foundations | ⏳ Next |
| 3.2 Information architecture ⛳ | ⏳ |
| 3.3 Key journeys | ⏳ |
| 3.4 Design tokens v0.1 ⛳ | ⏳ |
| 3.5 Prototypes ⛳ | ⏳ |
| 3.6 Core components spec | ⏳ |
| 3.7 Brand derivatives ⛳ | ⏳ |
| 3.8 HR/EN copy tone guide | ⏳ |
| 3.9 Review and close | ⏳ |

## Done
- Phases 0, 1 and 2 (discovery; audit and documentation foundation; architecture and legal groundwork).
- Decisions D-001 to D-029. Key ones:
  - EU hosting, budget 30–60 €/mo
  - Mutuals naming and semantics
  - **Option B architecture + Next.js (ADR-0002 Accepted)**
  - artwork-optional UI
  - MetaBrainz registration
  - **Visibility (session 3):** blocks hide both ways (D-019); private members' replies in public threads are visible (D-020); Daily Drop answers visible to all members, including private accounts (D-021); signed-out visitors see the Daily Drop question only (D-022); DM history after a block is read-only for both (D-023); Music DNA defaults to all members (D-024); **profiles default to public** via an active onboarding choice (D-025)
  - **Phase 3 (session 4):** approved (D-026); static HTML prototypes (D-027); self-hosted Sora/Inter with OFL licenses (D-028); raster logo derivatives via built-in .NET, no SVG trace (D-029)
- Phase 2 deliverables:
  - `docs/architecture/`: domain model v0.1, visibility matrix **v0.2**, architecture options
  - `docs/research/`: EU infrastructure, catalog providers, legal and platform facts
  - `docs/security/threat-model.md` v0.1
  - `docs/legal/questions-for-counsel.md` (now includes C.9: privacy by default and dark patterns)
  - `docs/alpha-acceptance-criteria.md` (draft)
  - audit addendum §10a
  - `docs/legal/trademark-preliminary-search.md` (complete, preliminary): no identical "GrooveRift" mark (TMview, WIPO, DZIV) and no product with that name on the web. "RIFT" is crowded in classes 9/41. Owner owns `grooverift.com`.

## Next
1. Step 3.1: UX foundations (effort: High).
2. Step 3.2: information architecture, then the owner picks a navigation model.

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
4. Legal status: DSA, DPIA, age assurance (L-02, L-03, L-04). Public-by-default needs a compliant onboarding choice (counsel C.9).
5. Missing production wordmark and vector logo (B-01, D-011).
6. Trademark: "RIFT" marks in classes 9/41 (gamigo EU, Meta, LOST RIFT); attorney assessment needed before filing or brand spend.

## Code
None. No dependencies installed. Phase 3 adds only static design files (HTML/CSS, fonts, images) under `design/`. Stack approved (ADR-0002); libraries are confirmed in Phase 4.
