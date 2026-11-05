# Key journeys

_Phase 3, step 3.3. Version 0.2, 2026-11-01. Status: owner decisions JQ1–JQ4 **CONFIRMED** (D-034 to D-037). Remaining RECOMMENDED and OPEN items are listed below._

This folder describes how members and staff move through GrooveRift's most important flows, step by step. It includes the failures and edge cases. Each journey references screen IDs from [`../information-architecture.md`](../information-architecture.md) and checks its visibility behaviour against [`../../architecture/visibility-matrix.md`](../../architecture/visibility-matrix.md) (v0.3).

| # | Journey | Main actors | Waves |
|---|---|---|---|
| J1 | [Invitation and onboarding](j1-onboarding.md) | Invited adult | α |
| J2 | [Music DNA editing](j2-music-dna-editing.md) | Member | α (B4 suggestions, B5 catalog suggestions) |
| J3 | [Daily Drop](j3-daily-drop.md) | Member, signed-out visitor | α (B2 question suggestions) |
| J4 | [Profile states and following](j4-profile-states.md) | Viewer, profile owner | α |
| J5 | [Report, mute and block](j5-report-block.md) | Member, moderator | α (B3 messages) |
| J6 | [Admin editorial](j6-admin-editorial.md) | Editor, admin | α (B2 Weekly Poll, Did You Know?, suggestions) |

## Conventions
- **Diagrams** are Mermaid `flowchart` blocks. They render on GitHub. They have not been render-checked locally, because no Mermaid tool is installed (Phase 3 adds no dependencies).
- **Node labels** start with the screen ID where one exists, for example `HUB-02`. Rounded nodes are screens, diamonds are decisions, and hexagons are server-side checks or jobs.
- **Status labels:** CONFIRMED (owner decision on record), RECOMMENDED (proposed here, not yet approved), OPEN (needs a decision), DEFERRED.
- **Copy** in this folder is working text that explains intent. Final HR/EN wording comes in step 3.8.
- **Policy check** means the server-side policy module (R-01) decides. The interface never decides visibility on its own.

## Rules that apply to every journey
| # | Rule | Source |
|---|---|---|
| JR1 | Every request is authorized on the server, including deep links from notifications, emails and share links. If access is lost between the notification and the tap, the member sees SYS-01 Not available. | R-01, U-14 |
| JR2 | Every "cannot see this" outcome uses SYS-01, whatever the reason. A blocked member cannot tell a block from a deleted account. | IA8, U-02, D-019 |
| JR3 | An action that publishes to a wider audience than the member might expect shows that audience **before** posting. This is an inline notice next to the button, not a pop-up. | P4, D-020, D-021 |
| JR4 | Failed submissions keep the typed text on screen with Retry. Nothing a member wrote is lost to a network error while the page is open. There are no saved drafts. | IA §6.1 E/O, §2 |
| JR5 | Status messages ("Answer posted", "Blocked") are announced through a live region without moving focus. When a step changes the whole screen, focus moves to the new heading. | WCAG 4.1.3, 2.4.3 |
| JR6 | No streaks, no "you haven't answered" nudges, no guilt copy, and no confirmation step only on the private choice. | §2, P2, P3, D-030 |
| JR7 | Rate limits explain themselves with a calm message ("You can do this again in a few minutes"). They never reveal detection details. | §12 |

## Owner decisions (resolved)
Clickable examples for every option: [`design/prototypes/journeys/`](../../../design/prototypes/journeys/index.html).

| # | Question | Journey | Options | Outcome |
|---|---|---|---|---|
| JQ1 | Can the visibility steps in onboarding be skipped? | J1 | Required, no Skip · Skippable (Skip = private / only me) | **CONFIRMED: required** (D-034). Until a choice is made, the account is treated as private and not discoverable. |
| JQ2 | How many top-level answers can a member give to one Daily Drop question? (OQ-12, part 1) | J3 | One, editable · Several | **CONFIRMED: one, editable** (D-035). Replies are unlimited. |
| JQ3 | How do answers to older questions in the archive behave? (OQ-12, part 2) | J3 | Open, with the date shown neutrally · Open, with a "late" label · Closed for new answers | **CONFIRMED: open, neutral date** (D-036). Resolves the conflict between OQ-12 ("labeled late") and `ux-foundations.md` §3.2 (avoid lateness labels). |
| JQ4 | What does a member learn after suggesting a Daily Drop question? (IA Q7) | J3, J6 | Nothing after "Thanks" · A private notification only if it is published · A status list in the profile menu | **CONFIRMED: notification only if published** (D-037). |

## Other open items raised in this step
| # | Item | Status |
|---|---|---|
| JO1 | **Remove follower** action for private profiles. Without it, the only way to drop an approved follower is a block. Small addition to J4 and PROF-07. | **CONFIRMED (D-069):** added to J4 and PROF-07; no notification to the removed follower |
| JO2 | OQ-16: editorial content needs approved HR **and** EN before scheduling. J6 is drawn this way. | **CONFIRMED (D-093, session 24)** |
| JO3 | Editorial review by a second person. A small alpha team may have one editor. J6 allows self-approval with a checklist in the alpha and asks for a different reviewer in the beta where possible. | **CONFIRMED (D-093)** |
| JO4 | Reserve low-water mark of 7 approved reserve questions, and a 72-hour gap alert. | **CONFIRMED (D-093)**, values tunable in ADM-17 |
| JO5 | When a private profile switches to public, pending follow requests are accepted. The member sees how many before confirming and can review them first. | **CONFIRMED (D-093)** |
| JO6 | Accepting an email-bound invite counts as email verification, so the member is not asked to verify the same address twice (WCAG 3.3.7). | **CONFIRMED (D-093)**, invites are email-bound per R-08 |
