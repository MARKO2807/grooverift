# Project status

_Last updated: 2026-11-01 (session 1)_

## Current phase
**Phase 2: Architecture, provider research and legal groundwork** (approved, D-014). The core research and the architecture proposal are done; the owner's decision is pending.

## Done
- Phase 0 (discovery) and Phase 1 (audit and documentation foundation).
- Decisions D-001 to D-014 (incl. EU hosting, budget, Mutuals naming and semantics, interim wordmark).
- Phase 2 so far:
  - Draft domain model (`docs/architecture/domain-model.md`) and visibility matrix (`docs/architecture/visibility-matrix.md`).
  - Research: EU infrastructure, music catalog providers, legal and platform fact check (`docs/research/`).
  - Architecture comparison (`docs/architecture/architecture-options.md`) and **ADR-0002 (Proposed): Option B**.
  - Audit addendum §10a.

## In progress / waiting on owner
- Push to GitHub: **not done yet**. Claude's push is blocked by the permission classifier; the owner runs `git push -u origin main`.
- Owner decisions: OQ-19 to OQ-22 (architecture, framework, artwork policy, MetaBrainz), VQ-01 to VQ-06 (visibility).

## Remaining Phase 2 work
- Initial threat model.
- Legal question list for counsel and an accountant (consolidated from the research).
- Preliminary trademark search (EUIPO, DZIV) via the browser.
- Finalize ADR-0002 and the related ADRs after owner approval.
- Alpha acceptance criteria draft.

## Blockers
- None for planning. Before the alpha: legal entity (OQ-05), moderation staffing (OQ-06), DPIA, legal documents.

## Top risks
1. Scope vs. capacity (A-01).
2. Artwork rights: the design must work without covers or photos (C-01).
3. Authorization complexity (S-02).
4. Legal status: DSA platform status, DPIA, age assurance (L-02, L-03, L-04).
5. Missing production wordmark and vector logo (B-01).

## Code
None. No dependencies installed. Stack proposed (ADR-0002), not approved.
