# Phase 3 plan: UX research, information architecture and design system

_Approved by the owner on 2026-11-01 (D-026). Status of each step is tracked in `docs/STATUS.md`._

## Goal
Before any application code exists, define:
- how GrooveRift is organized (navigation, screens, URLs)
- how the key member and admin journeys work
- how the product looks (tokens, components, brand derivatives)

The information architecture (IA) covers the **full beta**, so the alpha does not paint the product into a corner. Prototypes cover **alpha journeys** only.

## Constraints carried into this phase
- Master Prompt §15 (confirmed brand, anti-slop, approved motifs, UX rules) and §14 (quality baseline).
- D-017: the UI must look complete without artwork. No album covers or artist photos.
- D-019 to D-025: visibility rules. These include the active onboarding choices for profile and Music DNA visibility, the pre-post notices for private members, signed-out share views, and blocked states.
- `docs/brand/README.md` §2 (measured contrast; dark text on Coral/Amber, R-09) and §4 (mockup conflicts).
- D-006 (logo derivative policy) and D-011 (interim wordmark, clearly labeled).
- WCAG 2.2 AA, HR/EN, mobile-first PWA, mid-range phone performance.

## Working decisions for this phase
- **D-027:** prototypes are static HTML/CSS in `design/prototypes/`. No build step and no dependencies.
- **D-028:** Sora and Inter are downloaded from official sources with their SIL OFL license files into `design/fonts/` and self-hosted. This confirms R-05. In Phase 4 they move into the app's public assets.
- **D-029:** raster brand derivatives are produced with built-in PowerShell/.NET only. No SVG trace in Phase 3; the vector symbol is left to a professional designer (X-04).

## Steps
⛳ = owner decision point. Claude stops and presents options before continuing.

| # | Step | Deliverables | Acceptance | Effort |
|---|---|---|---|---|
| 3.0 | Kickoff | This plan; D-026 to D-029; roadmap status corrected | Committed | Medium |
| 3.1 | UX foundations | `docs/design/ux-foundations.md`: pattern research on how comparable products handle onboarding, daily prompts, blocking and privacy choices (patterns only, no copying); 3–4 member archetypes plus admin/moderator; accessibility requirements checklist (WCAG 2.2 AA) | Sources cited; no invented user data | High |
| 3.2 | ⛳ Information architecture | `docs/design/information-architecture.md`: screen inventory for the full beta; 2–3 navigation models (mobile bottom bar, desktop rail); URL scheme reviewed for privacy leaks (D-019, D-022); per-screen state matrix (empty, loading, error, offline, blocked, private, signed-out) | Owner picks the navigation model; every confirmed beta feature has a home | High |
| 3.3 | Key journeys | `docs/design/journeys/`: Mermaid flows plus notes for onboarding (invite → 18+ → account → profile visibility D-025 → Music DNA → DNA visibility D-024 → notifications), Music DNA editing, Daily Drop (answer, private-member notice D-021, reply, react, archive, signed-out share D-022), profile (public, private, blocked), report and block (D-019, D-023), admin editorial (calendar, reserve, failure alerts, HR/EN) | Each journey covers its error and edge cases; consistent with the visibility matrix v0.2 | High |
| 3.4 | ⛳ Design tokens v0.1 | `design/tokens/` (DTCG-style JSON plus generated CSS custom properties); `docs/design/tokens.md`; a zero-dependency Node contrast-check script | Owner approves; every text/UI pair passes AA via the script, with output recorded | High |
| 3.5 | ⛳ Prototypes | `design/prototypes/`: 2–3 genuinely different directions for onboarding and Daily Drop at mobile width, using the tokens, no artwork, placeholder data clearly labeled. After the owner picks a direction, it is refined with all key states and a desktop adaptation. | Owner picks a direction; refined prototype covers empty, error and long-text states | High |
| 3.6 | Core components spec | `docs/design/components.md` plus `design/prototypes/components.html` specimen: buttons, inputs, chips, catalog card without artwork, avatar fallback, navigation, sheets/dialogs, toasts, visibility notices, empty/loading/error states, focus styles | Keyboard and focus behavior specified for each component | Medium |
| 3.7 | ⛳ Brand derivatives | `docs/brand/derived/`: cleaned PNG master (fringe removed, silhouette unchanged), favicon, apple-touch, PWA and maskable icons. **Proposals for owner review:** reduced-detail small icon, monochrome badge, light-background variant, interim wordmark (D-011). Provenance entries in `docs/brand/README.md`. | Originals untouched (SHA-256 re-verified); owner reviews each proposal | Medium |
| 3.8 | HR/EN copy tone guide | `docs/design/copy-guide.md`: voice, glossary (Mutuals/Uzajamni, whether "Daily Drop" is translated), microcopy for notices, errors and empty states, gender-neutral Croatian conventions | Owner approves glossary and tone | Medium |
| 3.9 | Review and close | Independent accessibility/UX review (subagent), all contrast checks rerun, STATUS/HANDOFF/DECISIONS updated | Owner approves IA, prototypes and tokens (roadmap Phase 3 acceptance) | High |

## Open items to raise during this phase
- Default visibility of follower lists and of the profile's Daily Drop history (proposed: followers). Needed in 3.2/3.3.
- Optional informal usability check of the prototypes with 3–5 people the owner knows, with no personal data recorded. Decide at 3.5.

## Not in this phase
Application code, npm project or dependencies, deployment, accounts, spending, changes to the logo silhouette, palette or fonts, and SVG vectorization of the symbol.
