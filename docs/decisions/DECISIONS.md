# Decision register

Status labels: **CONFIRMED** (owner-approved), **RECOMMENDED** (proposed, awaiting approval), **OPEN** (needs a decision), **DEFERRED** (explicitly postponed).

The Master Prompt (`docs/product/master-prompt.txt`) remains the baseline. This register records decisions made **after** it, plus open questions. Significant architectural decisions get a full ADR in `adr/`.

---

## 1. Decision log (chronological)

| ID | Date | Decision | Status | Source |
|---|---|---|---|---|
| D-001 | 2026-11-01 | The Master Prompt (SHA-256 `906801e4…a8e1`) is the authoritative product baseline. | CONFIRMED | Owner briefing |
| D-002 | 2026-11-01 | Communication with the owner is in Croatian. Code, docs, commits and technical terms are in English. | CONFIRMED | Owner |
| D-003 | 2026-11-01 | Application hosting and personal data storage must be in the EU. | CONFIRMED | Owner |
| D-004 | 2026-11-01 | Source code lives in a private GitHub repo: `MARKO2807/grooverift`, default branch `main`. No license file (proprietary). | CONFIRMED | Owner |
| D-005 | 2026-11-01 | The repository docs are the durable project memory. See [ADR-0001](adr/0001-repository-documentation-as-project-memory.md). | CONFIRMED (Phase 1 approval) | Owner |
| D-006 | 2026-11-01 | The owner allows converting and modifying the supplied logo files. Policy: format, size and cleanup changes are free. Vectorization, small-size, monochrome and light variants, and any wordmark recreation need owner review before use. Originals are never overwritten. | CONFIRMED | Owner |
| D-007 | 2026-11-01 | The Claude in Chrome extension may be used (research, GitHub web tasks). No credentials are entered by Claude. Purchases and account creation still need explicit approval. | CONFIRMED | Owner |
| D-008 | 2026-11-01 | Effort policy: Medium for routine work, High for high-stakes work. Claude verifies whether a recommended switch happened and nudges casually if not. | CONFIRMED | Owner |
| D-009 | 2026-11-01 | Phase 1 (specification audit and documentation foundation) approved. | CONFIRMED | Owner |

---

## 2. Confirmed baseline (summary pointer)

Not repeated here. See the Master Prompt:
- §1: name, domain, tagline, vision
- §2–2A: PWA, HR/EN, full beta scope, closed alpha
- §3–13: features
- §14: quality requirements
- §15: brand
- §18: exclusions

Brand specifics with measured contrast: `docs/brand/README.md`.

---

## 3. Open questions, prioritized

Each question references the finding in [`../audit/2026-11-01-specification-audit.md`](../audit/2026-11-01-specification-audit.md).

### Needed before Phase 2 is finalized
| ID | Question | Recommendation | Ref |
|---|---|---|---|
| OQ-01 | Rename the social relationship "connections" to avoid a collision with the "Music Connections" compatibility mode? | Rename the relationship (e.g. "Mutuals" / „Uzajamni”, or "Friends"); keep the confirmed mode names | S-01 |
| OQ-02 | Is a connection = mutual follow, or a separate request/accept? | Mutual follow | S-03 |
| OQ-03 | Monthly infrastructure budget ceiling for the alpha | About 30–60 €/month (estimate to be verified) | T-07, T-08 |
| OQ-04 | Wordmark: Claude-made labeled interim vs. designer vs. symbol-only | Labeled interim now, designer before public launch | B-01 |

### Needed before the alpha (do not block planning or development)
| ID | Question | Recommendation | Ref |
|---|---|---|---|
| OQ-05 | Legal entity / data controller (individual, *obrt*, *d.o.o.*) | Consult an accountant or lawyer; Claude prepares a question list | L-01 |
| OQ-06 | Who moderates in the alpha, and is there a backup person? | Owner plus one named backup, or an explicit best-effort notice | A-07 |
| OQ-07 | Alpha feature scope | See audit A-02 | A-02 |
| OQ-08 | Is Daily Drop push part of the alpha? | Yes if Phase 4 timing allows; otherwise early beta | A-02, T-04 |
| OQ-09 | Alpha data carries over into the beta? | Yes, no reset | A-05 |
| OQ-10 | Age policy implementation | 18+ attestation, no DOB stored; counsel confirms | L-04 |

### Needed before the related feature is built
| ID | Question | Recommendation | Ref |
|---|---|---|---|
| OQ-11 | Daily Drop push rule east of UTC | Notify about the latest published, un-notified question at the chosen local time | D-01 |
| OQ-12 | One top-level Daily Drop answer per member per question? Answers to archived questions? | Yes / yes (labeled late) | S-04 |
| OQ-13 | Reaction set | 3–5 fixed, music-flavored | S-05 |
| OQ-14 | Poll votes private (aggregates only)? | Yes | S-06 |
| OQ-15 | Username change limits | Once per 30 days, old handle reserved 30–90 days | S-07 |
| OQ-16 | Editorial content requires both HR and EN before scheduling? | Yes | S-11 |
| OQ-17 | Video upload limits and sequencing in a later beta wave | Later beta wave; limits defined in Phase 2 | T-01 |
| OQ-18 | Which external listening services to link | Decide after C-01 research | C-05 |

---

## 4. Recommended, pending approval

| ID | Recommendation | Ref |
|---|---|---|
| R-01 | Single server-side authorization policy module plus a visibility matrix plus an automated authorization test suite | S-02 |
| R-02 | Passkeys (WebAuthn) for admins and moderators in addition to TOTP | S-10 |
| R-03 | PostgreSQL full-text/trigram search first; no separate search engine until measured need | T-03 |
| R-04 | Rule-based, explainable compatibility; no percentages, no ML in beta | S-13 |
| R-05 | Self-hosted, subsetted Sora and Inter fonts (no Google Fonts CDN) | B-05, L-06 |
| R-06 | Cookieless or server-side aggregate analytics | L-06 |
| R-07 | Moderation actions always produce a DSA-style statement of reasons | L-02 |
| R-08 | Email-bound, single-use, expiring invites | S-08 |
| R-09 | Text on Coral or Amber fills uses Void Black, never white | B-03 |
| R-10 | Native Claude Code orchestration; reconsider a GSD Core pilot after Phase 4 | P-01 |

---

## 5. Deferred

| ID | Item | Until |
|---|---|---|
| X-01 | Stack, hosting and provider selection | Phase 2 (owner approval) |
| X-02 | GSD Core or other orchestration framework evaluation | After Phase 4 |
| X-03 | Professional trademark clearance | Before public launch (preliminary search in Phase 2) |
| X-04 | Professionally designed vector wordmark and symbol | Before public launch |
