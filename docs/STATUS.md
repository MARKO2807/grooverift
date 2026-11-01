# Project status

_Last updated: 2026-11-01 (end of session 1)_

## Current phase
**Phase 2: Architecture, provider research and legal groundwork.** Almost complete; one task remains (preliminary trademark search).

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

## Next
1. **Preliminary trademark search** for "GrooveRift" (EUIPO, DZIV, TMview) via Claude in Chrome. This is the last Phase 2 task.
2. Owner: answer VQ-01 to VQ-06 (visibility). Not blocking Phase 3 start, but needed before the related screens are designed.
3. Owner approval of **Phase 3: UX research, information architecture and design system** (recommended effort: High for IA, Medium for asset work).

## Owner actions outside Claude
- `git push -u origin main` (Claude's push is blocked).
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

## Code
None. No dependencies installed. Stack approved (ADR-0002); libraries are confirmed in Phase 4.
