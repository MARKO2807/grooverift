# Project status

_Last updated: 2026-11-01 (session 2)_

## Current phase
**Phase 2: Architecture, provider research and legal groundwork.** Almost complete. The preliminary trademark search is PARTIAL and waiting on the owner's manual checks.

## Done
- Phase 0 (discovery) and Phase 1 (audit and documentation foundation).
- Decisions D-001 to D-018. Key ones:
  - EU hosting, budget 30–60 €/mo
  - Mutuals naming and semantics
  - **Option B architecture + Next.js (ADR-0002 Accepted)**
  - artwork-optional UI
  - MetaBrainz registration
- Phase 2 deliverables:
  - `docs/architecture/`: domain model v0.1, visibility matrix v0.1, architecture options
  - `docs/research/`: EU infrastructure, catalog providers, legal and platform facts
  - `docs/security/threat-model.md` v0.1
  - `docs/legal/questions-for-counsel.md`
  - `docs/alpha-acceptance-criteria.md` (draft)
  - audit addendum §10a
  - `docs/legal/trademark-preliminary-search.md` (**partial**): no identical "GrooveRift" mark in TMview; "RIFT" is crowded in classes 9/41. The EUIPO firewall blocked further automated browsing.

## Next
1. **Owner:** finish the manual trademark checks (`docs/legal/trademark-preliminary-search.md` §4) and paste the results. Claude records them and revises §3.
2. Owner: answer VQ-01 to VQ-06 (visibility) **before Phase 3 starts** (owner's choice, session 2).
3. Owner approval of **Phase 3: UX research, information architecture and design system** (recommended effort: High for IA, Medium for asset work).

## Owner actions outside Claude
- `git push` after each session (Claude's push is blocked).
- MetaBrainz registration (D-018), when convenient before Phase 5.
- Start looking for an accountant and lawyer (`docs/legal/questions-for-counsel.md`). Needed before the alpha.

## Blockers
- None for planning or design. Before the alpha: legal entity (OQ-05), moderation staffing (OQ-06), DPIA, legal documents.

## Top risks
1. Scope vs. capacity (A-01).
2. Artwork rights; the design must work without covers or photos (D-017).
3. Authorization complexity (S-02).
4. Legal status: DSA, DPIA, age assurance (L-02, L-03, L-04).
5. Missing production wordmark and vector logo (B-01, D-011).
6. Trademark: "RIFT" marks in classes 9/41 (gamigo EU, Meta, LOST RIFT); attorney assessment needed before filing or brand spend.

## Code
None. No dependencies installed. Stack approved (ADR-0002); libraries are confirmed in Phase 4.
