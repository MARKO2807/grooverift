# GrooveRift roadmap

Every phase ends with an **owner approval gate**. Approval of one phase does not authorize the next. Durations are deliberately omitted until velocity is measured (re-estimate after Phase 4). All confirmed beta features remain mandatory. Wave ordering is a sequencing choice, not a scope reduction.

| Phase | Name | Status |
|---|---|---|
| 0 | Discovery and briefing | ✅ Done (2026-11-01) |
| 1 | Specification audit and documentation foundation | ✅ Done (2026-11-01) |
| 2 | Architecture, provider research and legal groundwork | ✅ Done (2026-11-01) |
| 3 | UX research, information architecture and design system | ✅ Done (2026-11-05, D-087; [plan](design/phase-3-plan.md), [closing review](design/phase-3-review.md)) |
| 4 | Foundation (repo tooling, CI, auth, i18n, security baseline, admin shell) | ⏳ Plan PROPOSED ([phase-4-plan](phase-4-plan.md)), awaiting owner approval |
| 5 | Alpha vertical slice | ⏳ |
| 6 | Alpha hardening and operational readiness | ⏳ |
| **G-A** | **Gate: closed technical alpha invitations** | ⏳ |
| 7 | Beta waves B1–B6 (all remaining confirmed features) | ⏳ |
| 8 | Full-beta QA and hardening | ⏳ |
| **G-B** | **Gate: invite-only beta** | ⏳ |
| 9 | Beta operation, invitation phase 2, readiness review | ⏳ |
| **G-P** | **Gate: public launch** | ⏳ |

---

## Phase 1: Specification audit and documentation foundation
- **Deliverables:** git repo and remote, `CLAUDE.md`, docs structure (ADR-0001), brand baseline with provenance and contrast, specification audit, decision register, this roadmap.
- **Acceptance:** owner has reviewed the audit, answered or deferred the Phase-2-blocking open questions (OQ-01–OQ-04), and approved Phase 2.
- **Not included:** code, packages, stack decision, spending.

## Phase 2: Architecture, provider research and legal groundwork
- **Deliverables:**
  - 2–3 architecture options covering frontend/PWA, backend, data, auth, realtime, jobs, search, storage/media, notifications, hosting (EU), CI/CD, monitoring and testing, with cost ranges and lock-in analysis
  - catalog/metadata provider research with terms verified (C-01)
  - initial domain model and visibility matrix draft (S-02)
  - initial threat model
  - RPO/RTO proposal
  - preliminary trademark search
  - legal question list for counsel and an accountant
  - ADRs for the approved choices
- **Acceptance:** stack and providers approved by the owner via ADRs; open legal items have named owners.
- **Risks:** provider terms are unclear or restrictive; free tiers are insufficient for backups.

## Phase 3: UX research, information architecture and design system
- **Deliverables:**
  - IA and navigation for the full beta (so the alpha does not paint into a corner)
  - key journeys: onboarding, Music DNA, Daily Drop, profile, report/block, admin editorial
  - 2–3 genuinely different prototypes for onboarding and Daily Drop
  - design tokens (type scale, neutrals, surfaces, states, spacing, motion, reduced motion)
  - core components spec
  - brand derivatives: cleaned masters, favicon and PWA icons, proposals for the SVG, monochrome badge and interim wordmark
  - HR/EN copy tone guide
- **Acceptance:** owner approves the IA, prototypes and tokens; the accessibility contrast checks pass.

## Phase 4: Foundation
- **Deliverables:**
  - project scaffold on the approved stack
  - lint, format, typecheck and tests wired in, with CI on GitHub Actions
  - Claude hooks and review subagents
  - local Docker environment
  - auth (email+password, Google, email verification, recovery, TOTP; strong auth for admins)
  - sessions and revocation
  - i18n HR/EN
  - authorization policy module with tests
  - audit log, feature flags, admin shell with roles
  - security headers, rate limiting, error tracking
  - staging environment (if approved and budgeted)
- **Acceptance:** CI green, auth and authorization tests pass, accessibility baseline checks pass, staging deploy reproducible, security review by an independent subagent.

## Phase 5: Alpha vertical slice (scope per OQ-07)
- **Deliverables (proposed):**
  - invites, 18+ attestation, onboarding, profiles (public/private), Music DNA with the catalog
  - Daily Drop: answers, replies, reactions, sorting, archive, history; editorial calendar, reserve and failure alerts
  - follow; block, mute and report; moderation queue with statement of reasons
  - feedback and bug reports
  - data export and deletion
  - Daily Drop push (if OQ-08 = yes)
- **Acceptance:** end-to-end tests for every journey, authorization test suite green, WCAG 2.2 AA audit of alpha screens, HR/EN complete.

## Phase 6: Alpha hardening and operational readiness
- **Deliverables:**
  - threat model review
  - backups with a **performed restore drill**
  - incident response runbook, rollback procedure, monitoring and alerts
  - legal documents reviewed by counsel; alpha tester notice
  - acceptance criteria report
- **Gate G-A:** the owner approves the invite list and rollout.

## Phase 7: Beta waves (all mandatory before G-B)
- **B1: Feed and posts.** For You and Following feeds; text and image posts; comments, replies, reactions, mentions, hashtags and topics; spoilers and content warnings; saved items; catalog cards and external links; Music Moment, Ask for Music, Concert Experience, reviews; member polls; Hub surfacing.
- **B2: Editorial Hub.** Weekly Poll, Did You Know? with sources and fact-check notes, editorial calendar for all programs, HR/EN workflow, member question suggestions.
- **B3: Social graph and messaging.** Mutual connections, private-account approvals, DMs and intro requests, interaction limits, Send a Recommendation, notifications (in-app, push, opt-in email), followed threads.
- **B4: Discovery and compatibility.** Discover (people, music, discussions), unified search, adventurousness control, not-interested feedback, Music Twins, Explorers and Connections with explanations, topic trending with anti-gaming, Music DNA suggestions with confirmation.
- **B5: Playlists, catalog and artists.** Collaborative playlists, catalog suggestions, corrections, merges and unavailable items, artist verification, organic promotion rules.
- **B6: Media and moderation completion.** Short video uploads, full moderation (appeals, progressive enforcement, impersonation priority, DM evidence access with audit), copyright takedown, invitation phase 2 quotas, privacy-aware analytics, operational status page.

## Phase 8: Full-beta QA and hardening
Security review, performance on mid-range phones, accessibility audit, localization review, editorial scheduling and recovery tests, DR drill, load sanity check.
- **Gate G-B:** formal beta readiness review against the confirmed scope.

## Phase 9: Beta operation and public-launch readiness
Measurable launch criteria (defined with the owner), professional trademark and legal clearance, readiness review.
- **Gate G-P:** public launch approval by the owner.

## Future ideas (backlog, not in the confirmed scope)
Owner ideas recorded for later. None of them is scheduled; each needs an explicit owner decision on scope and wave first.
- **All ideas in one list:** [`product/backlog.md`](product/backlog.md).
- **Hub expansion (session 11, OQ-29):** **Hidden Gems** (members share underrated songs and artists, with a weekly community pick) and **On Repeat** (the song a member plays most right now). Details and constraints: [`product/future-hub-ideas.md`](product/future-hub-ideas.md).
- **Music news (session 9, OQ-24):** for example popular concerts in Croatia. Needs a source and rights check.
