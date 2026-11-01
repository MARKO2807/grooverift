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
| D-010 | 2026-11-01 | Alpha infrastructure budget ceiling: about 30–60 €/month (resolves OQ-03). Development before the alpha targets about 0 €. | CONFIRMED | Owner |
| D-011 | 2026-11-01 | Wordmark: Claude produces a clearly labeled interim vector wordmark (Sora-based, per "Rift emphasis") for owner review; a professional designer produces the final vector wordmark and symbol before public launch (resolves OQ-04; see X-04). | CONFIRMED | Owner |
| D-012 | 2026-11-01 | The mutual social relationship is named **"Mutuals"** (HR: **„Uzajamni”**). The compatibility mode keeps its confirmed name "Music Connections". In code, use `mutual`, never `connection`, for the relationship (resolves OQ-01). | CONFIRMED | Owner |
| D-013 | 2026-11-01 | A Mutual = mutual follow (A follows B and B follows A); there is no separate connection request. Private accounts still require follow approval. Intro requests (§8) remain the path for non-mutuals (resolves OQ-02). | CONFIRMED | Owner |
| D-014 | 2026-11-01 | Phase 2 (architecture, provider research, legal groundwork) approved. Approval covers research and documents only. Stack and provider choices still need separate owner approval via ADRs. | CONFIRMED | Owner |
| D-015 | 2026-11-01 | Architecture **Option B**: a single TypeScript app + worker on a managed EU PaaS (Render, Frankfurt), managed Postgres with PITR, Better Auth, R2 EU, plus the shared baseline in architecture-options §1 ([ADR-0002](adr/0002-application-architecture-and-hosting.md) Accepted; resolves OQ-19). Accounts and purchases still need separate approval in Phase 4. | CONFIRMED | Owner |
| D-016 | 2026-11-01 | Web framework: **Next.js (App Router)**. Personalized responses are never publicly cached (resolves OQ-20). | CONFIRMED | Owner |
| D-017 | 2026-11-01 | Artwork policy: the UI must look complete without artwork. No album covers or artist photos from unlicensed sources until legal clearance. Free-licence Wikimedia Commons photos (credited), artist-uploaded photos and placeholders are allowed (resolves OQ-21). | CONFIRMED | Owner |
| D-018 | 2026-11-01 | Register with MetaBrainz (Stealth Start-Up, $0) before alpha API use. The owner does the registration. Budget the Bronze tier ($100/mo) for public launch or monetization (resolves OQ-22). | CONFIRMED | Owner |
| D-019 | 2026-11-01 | **Blocks hide content both ways while signed in.** When A blocks B, B (signed in) cannot see A's profile, posts or answers, and A is removed from B's feed, search, Discover and compatibility suggestions. B sees a neutral "profile not available" state. The block flow tells A that public content is still reachable through public share links when signed out, and that a private profile is the stronger option. Shared threads keep placeholders for other members (resolves VQ-01). | CONFIRMED | Owner |
| D-020 | 2026-11-01 | A private-account member's reply or comment in a public thread is visible to **everyone who can see the thread**. A clear notice is shown before posting. The rest of the private profile stays private (resolves VQ-02). | CONFIRMED | Owner |
| D-021 | 2026-11-01 | **Daily Drop answers are visible to all signed-in members**, including answers by private-account members. A notice is shown before answering ("your answer will be visible to all members, even though your profile is private"). Such answers count in "Most Discussed" and in answer counts like any member-visible answer. The aggregated Daily Drop history **on the profile** still follows the profile's privacy settings. Blocks (D-019) still apply. Anonymous visitors: see D-022 (resolves VQ-03). | CONFIRMED | Owner |
| D-022 | 2026-11-01 | Signed-out visitors opening a Daily Drop share link see **the question and an invitation to join only**. Answers are members-only during the beta. Open Graph previews contain the question only. Revisit before public launch (resolves VQ-04). | CONFIRMED | Owner |
| D-023 | 2026-11-01 | After a block, **existing DM history stays read-only for both participants**. No new messages can be sent. Either participant can delete the conversation on their own side only. Messages remain reportable after the block (resolves VQ-05). | CONFIRMED | Owner |
| D-024 | 2026-11-01 | Default Music DNA visibility is **all signed-in members**, set through an **active choice** in onboarding. ~~The recommended option is highlighted with its reason (discovery, compatibility), and the member confirms it.~~ Presentation amended by D-030. Never visible to signed-out visitors. Per-section settings remain adjustable (resolves VQ-06). | CONFIRMED | Owner |
| D-025 | 2026-11-01 | **Profiles default to public** for adult members, set through an **active choice** in onboarding ~~with "Public" highlighted as recommended and its benefits explained~~ (presentation amended by D-030). The owner's goal is that most accounts are public. The private option is always available, equally easy to select and to switch to later, with no dark patterns (DSA Art. 25, GDPR Art. 25(2); see counsel question C.9). Handling of minors is deferred to OQ-10; the owner decides when it comes up and expects not to admit minors. | CONFIRMED | Owner |
| D-026 | 2026-11-01 | Phase 3 (UX research, information architecture and design system) approved as planned in [`docs/design/phase-3-plan.md`](../design/phase-3-plan.md). Approval covers design work and documents only: no application code, dependencies, deployment or spending. | CONFIRMED | Owner |
| D-027 | 2026-11-01 | Phase 3 prototypes are static HTML/CSS in `design/prototypes/`, with no build step and no dependencies. | CONFIRMED | Owner |
| D-028 | 2026-11-01 | Sora and Inter are downloaded from official sources with their SIL OFL license files into `design/fonts/` and self-hosted (confirms R-05). | CONFIRMED | Owner |
| D-029 | 2026-11-01 | Raster logo derivatives are produced with built-in PowerShell/.NET only. No SVG trace in Phase 3; the vector symbol is left to a professional designer (X-04). | CONFIRMED | Owner |
| D-030 | 2026-11-01 | **Neutral active choice for visibility in onboarding** (amends the presentation in D-024 and D-025). Profile visibility and Music DNA visibility are chosen with **nothing pre-selected**, options of **equal visual weight**, no "recommended" label, and factual text for each option covering both benefits and consequences (for example, that public profiles can be found through Discover and compatibility). No extra confirmation step for the more private choice. Changeable at any time. Reason: [EDPB Guidelines 03/2022 v2.0](https://www.edpb.europa.eu/our-work-tools/our-documents/guidelines/guidelines-032022-deceptive-design-patterns-social-media_en) state that if one option is highlighted, "the highlighted one needs to be the most restrictive regarding data processing" (Deceptive Snugness), and that a confirmation pop-up only for the private choice is "Longer than necessary". The owner's goal that most accounts are public stays, pursued through honest explanation. Counsel question C.9 remains open to confirm. | CONFIRMED | Owner |
| D-031 | 2026-11-01 | **Navigation model A** (resolves IA Q1): mobile bottom bar Home · Hub · Discover · Activity · Profile; Messages as a top-bar icon on Home; Create is contextual; the desktop rail uses the same order plus Messages. Alpha shows Home · Hub · Activity · Profile; Discover is added in B4 and the Messages icon in B3, without moving existing tabs. Labels are provisional until the copy guide (3.8). See [`information-architecture.md`](../design/information-architecture.md) §4. | CONFIRMED | Owner |
| D-032 | 2026-11-01 | Default visibility of the **Daily Drop answer history on the profile** is **same as profile**: public profile → all signed-in members; private profile → followers. Individual answers on the question page remain visible to all members (D-021). The onboarding "Public" option text must state this (D-030). Members can change it in privacy settings (resolves IA Q2). | CONFIRMED | Owner |
| D-033 | 2026-11-01 | Default visibility of **followers and following lists, including their counts**, is **followers**. Reason: the lists expose other members' relationships (including private members), and requiring a follow makes viewing visible to the profile owner. Members can change it in privacy settings; a private profile caps it at followers (resolves IA Q3). | CONFIRMED | Owner |
| D-034 | 2026-11-01 | **Onboarding visibility steps are required** (resolves JQ1). The profile visibility step has no Skip; Continue without a choice shows an inline error. Until a choice is made the account is treated as private and not discoverable (GDPR Art. 25(2)). The Music DNA visibility step is shown only if the member added Music DNA in onboarding; otherwise the choice is asked the first time Music DNA is added, and the section is "only me" until then. Presentation stays neutral per D-030. See [J1](../design/journeys/j1-onboarding.md). | CONFIRMED | Owner |
| D-035 | 2026-11-01 | **One top-level Daily Drop answer per member per question**, editable and deletable, with an edited indicator. Replies are unlimited (resolves OQ-12 part 1, JQ2). See [J3](../design/journeys/j3-daily-drop.md). | CONFIRMED | Owner |
| D-036 | 2026-11-01 | **Archived Daily Drop questions stay open for new answers.** Every answer shows its date in a neutral way; there is **no "late" label** (resolves OQ-12 part 2, JQ3; replaces "labeled late" in OQ-12 and IA HUB-03, consistent with ux-foundations §3.2). | CONFIRMED | Owner |
| D-037 | 2026-11-01 | **Daily Drop question suggestions (B2): the submitter gets a private notification only if their suggestion is published** (possibly edited). No status list and no rejection messages. The submission copy says so honestly. No public credit for submitters unless the owner approves it later (resolves IA Q7, JQ4). | CONFIRMED | Owner |
| D-038 | 2026-11-01 | **Primary actions use a solid Coral fill with Void Black text** (TQ1). Amber is reserved for Daily Drop and discovery highlights, links and the focus ring. The Coral→Amber gradient is not used on buttons; it stays for brand moments. Confirms R-09. See [tokens](../design/tokens.md). | CONFIRMED | Owner |
| D-039 | 2026-11-01 | **Neutral surfaces are cool-tinted toward Void Black** (TQ2): `neutral.900` #12151C, `850` #191D26, `800` #222733; text #F1F3F7 / #A9AFBC. | CONFIRMED | Owner |
| D-040 | 2026-11-01 | **Error and warning states reuse Coral and Amber** (TQ3); no separate signal hues. States are never color-only: icon + text + border (WCAG 1.4.1). Destructive buttons are outlined with an icon, not filled, so they never look like the primary action. Success uses a single green (#5ED39A) with an icon. | CONFIRMED | Owner |
| D-041 | 2026-11-01 | **Medium shape** (TQ4): controls 10 px, cards 12 px, sheets 20 px, chips as pills. | CONFIRMED | Owner |
| D-042 | 2026-11-01 | **Prototype direction C "Pulse"** for onboarding and the Daily Drop (step 3.5). Brand energy only at the signature moments: rift line on the invite, Done and the Daily Drop question; Music DNA pulse strip (one bar per pick, decorative heights, never data) next to Music DNA; display type for these moments. Everything else stays calm, and answers are a readable hairline list. Rejected: A "Quiet" (too little brand energy), B "Cards" (inline composer hides answers; generic). See [`prototype-directions.md`](../design/prototype-directions.md). | CONFIRMED | Owner |
| D-043 | 2026-11-01 | **Daily Drop answers are written from a dock** above the tab bar that opens a bottom sheet with the question repeated. The answer list stays visible and within thumb reach (P2, P8). Rejected: separate compose screen; inline composer under the question. | CONFIRMED | Owner |
| D-044 | 2026-11-01 | **No external usability check in Phase 3.** The owner reviews the refined prototypes personally (resolves the 3.5 open item in the Phase 3 plan). | CONFIRMED | Owner |
| D-045 | 2026-11-01 | **Light theme as a member setting; dark stays the default** (dark-first, §15.2). The light theme must look as good as the dark one and pass the same WCAG 2.2 AA contrast checks. Coral and Amber need accessible light-background variants for text (Coral on white 3.06, Amber on white 1.50), so the brand primitives stay untouched. Light tokens are designed in step 3.4b (owner decision point) before the component spec. A "match system" option is RECOMMENDED for 3.4b. Alpha inclusion is decided with the alpha scope. Replaces "light theme DEFERRED" in `tokens.md` §9. | CONFIRMED | Owner |
| D-046 | 2026-11-01 | **Onboarding refinements (step 3.5, owner review).** (1) Music DNA step: 24 widely known genres shown, more through search; **2 to 10 genres are required**, so the step can no longer be skipped and Music DNA visibility is always asked (D-034's condition no longer arises). Artists stay optional, up to 10 (prototype default). (2) Artist search should show photos where lawful: MusicBrainz for the catalog, Wikidata P18 and Wikimedia Commons for free-licence photos **with credit**, a generated tile otherwise (applies D-017). (3) The profile and Music DNA visibility steps must fit one phone screen without scrolling (target 360×640). Profile visibility is shown as two equal option columns over one comparison, which keeps D-030 neutral. (4) The age step is centred. | CONFIRMED | Owner |
| D-047 | 2026-11-01 | **Daily Drop heading.** The name stays **"Daily Drop"** (alternatives considered: "Drop dana", "The Drop", "Daily Rift"). The name sits on top, the date below it in style A ("Nedjelja, 1. studenoga"), with no middle-dot separators; the live current follows. The primary action reads "Odgovori" and is centred. The sort filters stay in one row, also at 320 px. | CONFIRMED | Owner |
| D-048 | 2026-11-01 | **Music DNA visual: "Spirala"**, a living double helix. Each genre is one section, coloured by genre family (warm colours derived from Ember, used only for Music DNA), joined to the next by a glowing knot. Section length grows with pick order and with the member's artists; artists appear as beads on the strands. Traits per genre set height, twist, speed and behaviour. It is seeded by the member's genres and artists, so every member gets their own helix. **No trait words** ("Energija", "Ritam", "Raspon") anywhere. Rejected: "Konstelacija" (too busy), "Signal" (closest to the equalizer cliché). The trait table in `data.js` is a design placeholder. | CONFIRMED | Owner |
| D-049 | 2026-11-01 | **Motifs stay alive after their intro**: the current (invite, Done, Daily Drop heading), the Music DNA helix, and a small charge that circles the answer field in the dock (extends the D-042 placements to the dock). A **"Smanji pokrete" app setting** and the OS reduced-motion setting stop all motif motion. That setting is the WCAG 2.2.2 pause mechanism, so it must be easy to find in settings. Animation runs only while on screen. Replaces the earlier under-5-second burst rule. | CONFIRMED | Owner |
| D-050 | 2026-11-01 | **The brand name in running UI text is set like the wordmark**: lowercase "grooverift" in Sora bold with "rift" in Coral. Copy avoids declined forms of the name where it can (for example "srce zajednice" rather than "srce GrooveRifta"). | CONFIRMED | Owner |
| D-051 | 2026-11-01 | **No minors: 18+ for the alpha and the beta**, as in the Master Prompt. Admitting 16–17-year-olds would need counsel, real age assurance, private-by-default profiles for minors, and changes to Discover, compatibility, messaging and moderation (DSA Art. 28 and the Commission guidelines of July 2025; Croatian digital consent age 16). Any change is a new owner decision. | CONFIRMED | Owner |

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
| ~~OQ-01~~ | ~~Relationship naming~~ | Resolved → D-012 | S-01 |
| ~~OQ-02~~ | ~~Connection semantics~~ | Resolved → D-013 | S-03 |
| ~~OQ-03~~ | ~~Monthly infrastructure budget ceiling for the alpha~~ | Resolved → D-010 | T-07, T-08 |
| ~~OQ-04~~ | ~~Wordmark approach~~ | Resolved → D-011 | B-01 |

### Needed to close Phase 2
| ID | Question | Recommendation | Ref |
|---|---|---|---|
| ~~OQ-19 – OQ-22~~ | ~~Architecture, framework, artwork, MetaBrainz~~ | Resolved → D-015 – D-018 | |
| ~~VQ-01 – VQ-06~~ | ~~Visibility questions~~ | Resolved → D-019 – D-024 (plus D-025, profile default) | S-02 |

### Needed before the alpha (do not block planning or development)
| ID | Question | Recommendation | Ref |
|---|---|---|---|
| OQ-05 | Legal entity / data controller (individual, *obrt*, *d.o.o.*) | Consult an accountant or lawyer; Claude prepares a question list | L-01 |
| OQ-06 | Who moderates in the alpha, and is there a backup person? | Owner plus one named backup, or an explicit best-effort notice | A-07 |
| OQ-07 | Alpha feature scope | See audit A-02 | A-02 |
| OQ-08 | Is Daily Drop push part of the alpha? | Yes if Phase 4 timing allows; otherwise early beta | A-02, T-04 |
| OQ-09 | Alpha data carries over into the beta? | Yes, no reset | A-05 |
| OQ-10 | Age policy implementation. The owner confirmed 18+ only (D-051); what remains is how the 18+ gate is implemented and defended. | 18+ attestation, no DOB stored; counsel confirms | L-04 |

### Needed before the related feature is built
| ID | Question | Recommendation | Ref |
|---|---|---|---|
| OQ-11 | Daily Drop push rule east of UTC | Notify about the latest published, un-notified question at the chosen local time | D-01 |
| ~~OQ-12~~ | ~~One top-level Daily Drop answer per member per question? Answers to archived questions?~~ | Resolved → D-035, D-036 | S-04 |
| OQ-13 | Reaction set | 3–5 fixed, music-flavored | S-05 |
| OQ-14 | Poll votes private (aggregates only)? | Yes | S-06 |
| OQ-15 | Username change limits | Once per 30 days, old handle reserved 30–90 days | S-07 |
| OQ-16 | Editorial content requires both HR and EN before scheduling? | Yes | S-11 |
| OQ-17 | Video upload limits and sequencing in a later beta wave | Later beta wave; limits defined in Phase 2 | T-01 |
| OQ-18 | Which external listening services to link | Decide after C-01 research | C-05 |
| OQ-23 | Icon library for the product (the Master Prompt names none) | Choose in step 3.6 (for example Lucide or Phosphor, both open licences); installing it needs owner approval | 3.5 |
| OQ-24 | Owner idea (session 9): music news, for example popular concerts in Croatia | Not in the Master Prompt, which forbids adding recurring programs silently. Revisit after the alpha scope (OQ-07); needs a source and rights check | — |

---

## 4. Recommended, pending approval

| ID | Recommendation | Ref |
|---|---|---|
| R-01 | Single server-side authorization policy module plus a visibility matrix plus an automated authorization test suite | S-02 |
| R-02 | Passkeys (WebAuthn) for admins and moderators in addition to TOTP | S-10 |
| R-03 | PostgreSQL full-text/trigram search first; no separate search engine until measured need | T-03 |
| R-04 | Rule-based, explainable compatibility; no percentages, no ML in beta | S-13 |
| R-05 | ~~Self-hosted, subsetted Sora and Inter fonts (no Google Fonts CDN)~~ Confirmed → D-028 | B-05, L-06 |
| R-06 | Cookieless or server-side aggregate analytics | L-06 |
| R-07 | Moderation actions always produce a DSA-style statement of reasons | L-02 |
| R-08 | Email-bound, single-use, expiring invites | S-08 |
| R-09 | ~~Text on Coral or Amber fills uses Void Black, never white~~ Confirmed → D-038 (token `color.text.on-accent`) | B-03 |
| R-10 | Native Claude Code orchestration; reconsider a GSD Core pilot after Phase 4 | P-01 |

---

## 5. Deferred

| ID | Item | Until |
|---|---|---|
| X-01 | Stack, hosting and provider selection | Phase 2 (owner approval) |
| X-02 | GSD Core or other orchestration framework evaluation | After Phase 4 |
| X-03 | Professional trademark clearance | Before public launch (preliminary search in Phase 2) |
| X-04 | Professionally designed vector wordmark and symbol | Before public launch |
