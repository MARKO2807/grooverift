# Project status

_Last updated: 2026-11-01 (session 3)_

## Current phase
**Phase 2: Architecture, provider research and legal groundwork.** All deliverables complete and the visibility questions are resolved. Phase 3 needs owner approval.

## Done
- Phase 0 (discovery) and Phase 1 (audit and documentation foundation).
- Decisions D-001 to D-025. Key ones:
  - EU hosting, budget 30–60 €/mo
  - Mutuals naming and semantics
  - **Option B architecture + Next.js (ADR-0002 Accepted)**
  - artwork-optional UI
  - MetaBrainz registration
  - **Visibility (session 3):** blocks hide both ways (D-019); private members' replies in public threads are visible (D-020); Daily Drop answers visible to all members, including private accounts (D-021); signed-out visitors see the Daily Drop question only (D-022); DM history after a block is read-only for both (D-023); Music DNA defaults to all members (D-024); **profiles default to public** via an active onboarding choice (D-025)
- Phase 2 deliverables:
  - `docs/architecture/`: domain model v0.1, visibility matrix **v0.2**, architecture options
  - `docs/research/`: EU infrastructure, catalog providers, legal and platform facts
  - `docs/security/threat-model.md` v0.1
  - `docs/legal/questions-for-counsel.md` (now includes C.9: privacy by default and dark patterns)
  - `docs/alpha-acceptance-criteria.md` (draft)
  - audit addendum §10a
  - `docs/legal/trademark-preliminary-search.md` (complete, preliminary): no identical "GrooveRift" mark (TMview, WIPO, DZIV) and no product with that name on the web. "RIFT" is crowded in classes 9/41. Owner owns `grooverift.com`.

## Next
1. Owner approval of **Phase 3: UX research, information architecture and design system** (recommended effort: High for IA, Medium for asset work).

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
None. No dependencies installed. Stack approved (ADR-0002); libraries are confirmed in Phase 4.
