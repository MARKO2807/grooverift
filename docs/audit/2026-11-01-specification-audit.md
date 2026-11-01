# Specification audit #1: Master Prompt baseline

- **Date:** 2026-11-01
- **Phase:** 1 (Specification audit and documentation foundation)
- **Input:** `docs/product/master-prompt.txt` (SHA-256 `906801e4…a8e1`), reference mockup, symbol assets
- **Author:** Claude (Opus 5.5, high effort), for owner review

## 0. Method and limits

- Reviewed all 21 Master Prompt sections, the reference mockup and both logo files.
- **Not done yet:** no web research into provider terms, prices or law; no legal review; no prototype. Statements about third-party terms, prices and legal obligations below are **from general knowledge and must be verified** in Phase 2 or by a qualified professional. These items are marked **[VERIFY]**.
- Findings are prioritized:
  - **P0:** blocks the alpha or creates legal or safety risk
  - **P1:** must be resolved before architecture or data modeling is finalized
  - **P2:** must be resolved before the related feature is built
  - **P3:** improvement or later consideration
- Each finding names its **resolution owner**: Owner decision, Research (Claude, Phase 2), Design (Phase 3) or Legal (professional review).
- No finding below removes or reduces a confirmed feature. Where something is proposed to be built **later in the sequence**, that is an ordering choice and is labeled as such.

---

## 1. Executive summary (top 10)

| # | Finding | Priority | Resolution |
|---|---|---|---|
| A-01 | Full beta scope vs. one developer at 2–3 h/day: realistically 12–24+ months to full beta, about 4–6 months to alpha (rough estimate) | P0 | Owner awareness; strict sequencing and automation |
| L-01 | No legal entity or data controller defined; needed for privacy policy, terms and processor contracts | P0 (alpha) | Owner + Legal |
| L-02 | EU Digital Services Act obligations are not mentioned (notice-and-action, statement of reasons, contact points, T&C requirements) [VERIFY] | P0 (alpha) | Legal; built into moderation design |
| C-01 | Music metadata and artwork source undecided; artist photos carry likeness and licensing risk; provider terms may forbid caching or this use [VERIFY] | P1 | Research (Phase 2) + Owner |
| S-01 | Naming collision: "Connections" (the social relationship) vs. "Music Connections" (a compatibility mode) | P1 | Owner decision |
| S-02 | Visibility model (private accounts × blocks × Daily Drop × replies × search) not fully specified; highest authorization (BOLA) risk | P1 | Design + Owner |
| D-01 | Daily Drop push "after publication at chosen local time" breaks east of UTC: a morning push in Asia or Oceania precedes 00:00 UTC | P1 | Owner decision (rule proposed) |
| B-01 | No wordmark file and no vector logo; raster has edge artifacts; no small-size, monochrome or light variant | P1 | Owner + Design |
| T-01 | Video uploads add cost, processing and moderation risk out of proportion to an early stage | P2 | Ordering proposal (later beta wave) |
| A-07 | Moderation staffing undefined (who reviews reports in alpha, response times, backup moderator) | P0 (alpha) | Owner |

---

## 2. Scope and delivery

**A-01: Capacity vs. scope (P0).**
The confirmed beta covers auth with 2FA, profiles and privacy, Music DNA, compatibility, Daily Drop, the Community Hub with editorial workflow, feed, posts with images and video, reviews, concerts, polls, comments, mentions, follows and connections, DMs with intro requests, private recommendations, collaborative playlists, catalog with merges and suggestions, unified search, Discover, notifications (in-app, push, email), HR/EN localization, a full admin dashboard, moderation with appeals and audit, invitations, backups and DR, plus WCAG 2.2 AA throughout.
For a single developer working 2–3 h/day, even with heavy AI assistance, this is a multi-year scope in the traditional sense. With AI-assisted implementation it is plausibly **12–24+ months to full beta** and **4–6 months to a safe alpha**. This is a rough judgment, not a measured estimate.
*Recommendation:* keep the scope (confirmed), but (1) sequence strictly by dependency, (2) prefer managed services to minimize operational load, (3) automate quality gates from day one, (4) re-estimate after Phase 4 using measured velocity.

**A-02: Alpha scope proposal (P1, Owner decision).**
Proposed alpha feature set, as coherent end-to-end journeys:
- Invite-only signup (email+password and Google), email verification, optional TOTP 2FA for members and mandatory strong auth for admins
- 18+ attestation, onboarding, profile (public/private), initial Music DNA
- Daily Drop: read, answer, reply, react, archive, answer history on profile, sorting
- Follow
- Block, mute and report
- Data export and account deletion
- Admin: invitations, Daily Drop editorial calendar and reserve, moderation queue, audit log, feedback and bug reports, feature flags

*Excluded from alpha* (built later, still mandatory for beta): feed and posts, DMs, playlists, Discover, compatibility, Weekly Poll and Did You Know?, push notifications.
*Open question:* should push for Daily Drop be in the alpha? It is the signature feature, but it carries iOS limitations (T-04).

**A-03: Feature-flag strategy (P2).** Needed to keep incomplete features dark in alpha and beta (§2A.4). Use a simple server-side flag table with audit logging, not a third-party flag service at this scale. RECOMMENDED.

**A-04: Success metrics undefined (P3).** §1 defers numeric targets. For the alpha, define 3–5 qualitative acceptance criteria plus a few privacy-conscious metrics (for example, the share of testers who answered at least 3 Daily Drops, crash-free sessions, report turnaround time). To be proposed in Phase 2.

**A-05: Alpha → beta data continuity (P2, Owner).** §2A.3 says "do not unexpectedly discard real participant data". Recommendation: alpha data **carries over** into the beta (no reset). The migration discipline required for that is a good habit anyway. Testers must be told this explicitly.

**A-06: Feedback channel (P3).** The in-app bug and feedback reporter with optional screenshots is a beta admin feature (§13). Screenshots can capture other members' data, so treat them as sensitive: restricted access and retention limits.

**A-07: Moderation staffing (P0 for alpha, Owner).** Who moderates in the alpha: only the owner? What response time is promised for reports, especially severe threats? Who covers when the owner is unavailable? A one-person operation needs (1) clear severity tiers, (2) the ability to quickly suspend accounts or hide content, (3) a documented emergency path. Even a small alpha needs a named backup person or an explicit "best effort" statement to testers.

---

## 3. Legal, privacy and compliance

> None of the following is legal advice. Items marked [VERIFY] need a qualified professional.

**L-01: Legal entity and data controller (P0 for alpha, Owner + Legal).** A privacy policy must name the controller and contact details. Processor agreements (DPAs) with hosting, email and analytics vendors are signed by the controller. The choice between a private individual, *obrt* and *d.o.o.* affects liability, taxes and how processors contract. Planning and development do not need this resolved. **Inviting real testers does.**

**L-02: EU Digital Services Act (P0 for alpha, Legal) [VERIFY].** GrooveRift hosts user content, so the DSA applies, likely as an "online platform". Commonly cited obligations:
- notice-and-action mechanism (Art. 16)
- statement of reasons for moderation decisions (Art. 17)
- single points of contact (Art. 11–12)
- T&C transparency about moderation (Art. 14)
- internal complaint handling (Art. 20)

Micro and small enterprises are exempted from some online-platform obligations (Art. 19), but **not** from the hosting-level ones. Much of §12 (reporting, appeals, explanations, audit trail) already aligns. *Recommendation:* design moderation data so that every enforcement action generates a statement of reasons, and get the exact applicable obligation set confirmed by counsel.

**L-03: GDPR documentation (P0 for alpha, Legal + Claude drafts).**
- A records-of-processing document (Art. 30).
- A DPIA is advisable: the platform profiles members (Music DNA, compatibility, recommendations), handles DMs and serves a global audience. Whether it is strictly required is a legal judgment [VERIFY].
- Lawful bases per processing purpose.
- Vendor DPAs and transfer assessments (EU hosting reduces but does not eliminate this).
- Data subject request handling.
- Breach notification procedure (72 h).

Claude can draft templates. Counsel must review them.

**L-04: Age 18+ (P1, Owner + Legal).** §3 requires a "lawful, proportionate" implementation with no unsupported verification claims. *Recommendation:* a self-declared 18+ attestation at signup, with **no full date of birth stored** (data minimization). The invite system adds a soft human check. Terms must state the age rule, and reports of minors must lead to account action. Confirm adequacy with counsel [VERIFY].

**L-05: Legal documents (P0 for alpha, Legal).** Needed: Terms of Service including the content license (§11), Privacy Policy, Community Guidelines (including the human-created-content rule from §7), Cookie/storage notice, copyright and takedown policy, and an alpha tester notice (incomplete software, data handling, carry-over policy). Croatian e-commerce law likely also requires provider identification details on the site [VERIFY].

**L-06: Cookies and analytics consent (P2).** Prefer **cookieless, self-hosted or server-side aggregate analytics** and strictly necessary cookies only. That may avoid a consent banner entirely [VERIFY]. Self-host fonts: loading Google Fonts from Google's CDN has been ruled a GDPR violation in at least one German court case.

**L-07: Copyright (P2).** Takedown procedure for uploads (§11). The EU DSM Directive Art. 17 obligations target large content-sharing services and are unlikely to apply at beta scale [VERIFY], but a clear takedown flow is required regardless.

**L-08: Trademark (P2, before public launch; cheap to do early).** Search EUIPO (eSearch) and the Croatian DZIV database for "GrooveRift" and similar marks in Nice classes 9, 38, 41, 42 and 45. Domain ownership is not a trademark right. Claude can do a preliminary search via the browser in Phase 2. Professional clearance is still required.

**L-09: Accessibility law (P3) [VERIFY].** Check whether the European Accessibility Act applies to a free social service. WCAG 2.2 AA is the target regardless.

---

## 4. Catalog, music data and rights

**C-01: Metadata and artwork provider (P1, Research + Owner) [VERIFY].** This decision shapes the onboarding and Music DNA UX, the data model and legal exposure.
- **MusicBrainz:** core data is CC0. Rate-limited public API (about 1 req/s); a self-hosted mirror is possible. Good canonical IDs (MBIDs) for artist, release group, release and recording, which helps with the remaster, live and deluxe distinctions in §10. **No artist photos.** Cover Art Archive images carry third-party rights.
- **Spotify Web API:** rich data and images, but developer terms have historically restricted caching, mixing with other data and some use cases, and access policies for new apps have tightened [VERIFY current terms].
- **Apple Music (MusicKit), Deezer, Discogs, Last.fm:** each has different terms, attribution rules and image rights [VERIFY].

*Likely recommendation for Phase 2 to validate:* MusicBrainz as the canonical identity backbone, plus a licensed provider for artwork and external links if terms permit, with artist imagery only where explicitly licensed and tasteful text or monogram fallbacks otherwise. **Owner decision needed after research.**

**C-02: Genre taxonomy (P1, Design + Owner).** Onboarding asks for genres, but no taxonomy is defined. Requirements: curated, HR/EN translated, hierarchical (e.g. Metal → Black Metal), stable IDs, admin-editable. Sources to evaluate: MusicBrainz genres plus editorial curation.

**C-03: Canonical identity and merges (P1, architecture).** §10 requires preserving Music DNA, reviews, playlists and links across merges. Use internal stable IDs with a merge/redirect table, so external IDs are never foreign keys. Design in Phase 2.

**C-04: Unavailable or removed catalog items (P2).** Define how a "no longer available" item renders, and what metadata is lawful to retain [VERIFY per provider].

**C-05: External listening links (P2).** Decide which services to link (Spotify, Apple Music, YouTube Music, Deezer, Bandcamp…) and how to obtain links lawfully (provider APIs, link aggregators [VERIFY terms], or member-submitted links with moderation).

---

## 5. Product specification gaps and ambiguities

**S-01: "Connections" naming collision (P1, Owner).** "Music Connections" is a compatibility mode (§4), while "connections" is also the mutual social relationship that unlocks DMs, playlists and recommendations (§8, §9). Users and code will confuse them.
*Options:*
- (a) Rename the social relationship to "Friends" or "Mutuals".
- (b) Rename the compatibility mode, e.g. "Music Kin" or "Common Ground". This changes a confirmed name.
- (c) Keep both and disambiguate via UI copy.

*Recommendation:* (a). The relationship name is not a confirmed brand term, so the confirmed names stay intact.

**S-02: Visibility and authorization matrix (P1, Design + Owner).** Needs explicit rules for:
- Daily Drop answers by private accounts: visible only to approved followers? Do they count in "Most Discussed"?
- Replies by a private account inside a public thread.
- Blocked users in threads (§8: "preserve public thread structure"): rendered as "content unavailable"?
- Music DNA per-section visibility.
- Search results respecting all of the above.
- Notifications and emails must never reveal private content.

*Recommendation:* write one visibility matrix (actor × object × relationship → allowed actions), implement it as a single server-side policy module and back it with an automated authorization test suite. This is the **#1 engineering risk area**.

**S-03: Follow vs. connection semantics (P1, Owner).** Is a "connection" a mutual follow, or a separate request and accept action? Private accounts need follow approval anyway. *Recommendation:* a connection = mutual follow (both follow each other), with no separate request flow. It is simpler and needs fewer notifications.

**S-04: Daily Drop answer rules (P2, Owner).**
- One top-level answer per member per question (editable and deletable)? *Recommended: yes.*
- Can members answer **archived** questions? §5 says "fully interactive archive". *Recommended: yes*, with a "late answer" date shown.
- Maximum answer length and whether images are allowed in answers. §5 says "text-first with optional catalog references". *Recommended:* text plus catalog references, no image uploads in answers.

**S-05: Reactions (P2, Owner/Design).** The reaction set is undefined. *Recommendation:* a small, fixed, music-flavored set (3–5) and no public reaction leaderboards. Reaction counts must not dominate ranking (§5).

**S-06: Poll vote privacy (P2, Owner).** For member polls and the Weekly Poll, are individual votes visible to others? "No anonymous participation" applies to posts and comments. *Recommendation:* votes are private and only aggregates are shown. This is safer and standard.

**S-07: Username change policy (P2, Owner).** "Controlled occasional changes": *recommended* at most once per 30 days, with the old handle reserved for 30–90 days against impersonation.

**S-08: Invitation mechanics (P1, Owner).** *Recommendation:* email-bound, single-use, expiring invite tokens (e.g. 14 days). The admin sees status (sent, accepted, expired, revoked). Phase-2 member quotas use the same mechanism.

**S-09: Account linking (P1, security).** Email+password and Google on the same email address: link only after verified-email proof, to prevent account-takeover through unverified provider emails.

**S-10: Admin strong authentication (P2, RECOMMENDED).** Mandatory TOTP is the floor. *Recommendation:* **passkeys (WebAuthn)** for admins and moderators, because they are phishing-resistant.

**S-11: Editorial localization rule (P2, Owner).** Must every Daily Drop have approved HR **and** EN versions before scheduling? *Recommendation:* yes for Daily Drop, Weekly Poll and Did You Know?. A publication that is missing a translation blocks scheduling and alerts the admin.

**S-12: Post language and discovery preference (P2, Design).** "Preferred discovery language" needs a post-language signal. *Options:* the author picks it on posting, the author's profile language is the default, or automatic detection. *Recommendation:* lightweight automatic detection with author override.

**S-13: Compatibility algorithm (P2, Design).** Must be explainable (§4). *Recommendation:* rule-based overlap and contrast over artists and genres, with human-readable reasons ("You both love Massive Attack and Portishead; they also explore Afrobeat"). No ML in beta, no percentages.

**S-14: Feed and Discover ranking (P2, Design).** With 10–200 users, "For You" needs simple, transparent heuristics: followed people, Music DNA overlap, editorial boosts, recency, and a deliberate "new or quiet member" boost (§5). Every ranked item should be explainable.

**S-15: Artist verification linkage (P3).** Should a verified artist account link to the canonical catalog artist? *Recommended: optional link*, managed by admins.

**S-16: Data export format (P2).** *Recommendation:* a machine-readable JSON archive plus uploaded media, generated asynchronously, with a download link that expires.

**S-17: Deletion placeholders (P2, Legal).** Define what remains in a thread after account deletion: for example "[deleted]" with no text or author, while replies by others survive. Erasure from backups happens through bounded backup retention [VERIFY with counsel].

---

## 6. Daily Drop specifics

**D-01: Push timing east of UTC (P1, Owner).** The question publishes at 00:00 UTC, which is 01:00–02:00 in Croatia but 09:00 in Tokyo and 13:00–14:00 in New Zealand and Kiribati. A member in UTC+9 who picks 08:00 for the notification is notified **before** the new question exists.
*Recommended rule:* "Each day at your chosen local time, notify about the **latest published** question you haven't been notified about yet." East of UTC this means the push may refer to the question of "yesterday UTC", which is still the newest question. In the UI, the question date is always the UTC date.

**D-02: Publication reliability (P1, architecture).** The idempotency key is the UTC date. A scheduler with missed-run detection, safe retry and fallback to the approved reserve sends an admin alert if the reserve falls below N questions (e.g. 14). Requires a durable job system (Phase 2 decision).

**D-03: Question suggestions (P3).** Member suggestions go into an admin review queue with rate limits, and suggestions are never auto-published (§5). Already clear in the spec. Implement in a beta wave.

---

## 7. Technical risks

**T-01: Video uploads (P2, ordering).** Transcoding, storage, bandwidth and moderation of video (including illegal content) are the costliest parts of UGC. *Recommendation:* images in the first posts wave, video in a later beta wave via a managed video or transcoding service in the EU, with strict limits (duration and size to be decided). Still mandatory for beta; only the sequencing changes.

**T-02: Media safety (P1).** Strip EXIF and **GPS metadata** from all images (privacy), validate by magic bytes and not by extension, re-encode server-side, scan for malware, store in a non-public bucket with signed URLs where privacy requires it. Hash matching against known illegal content is an option to evaluate [VERIFY availability and obligations].

**T-03: Search access control (P1).** A separate search engine (Meilisearch, Typesense, Elastic…) duplicates data and risks privacy leaks through the index. *Recommendation:* start with PostgreSQL full-text and trigram search, using query-time authorization. Revisit only if it is measurably insufficient.

**T-04: PWA push limits (P2) [VERIFY].** iOS and iPadOS support Web Push only for PWAs **installed to the Home Screen** (iOS 16.4+). Onboarding must explain how to install the app, and notifications must remain best effort (§5 already says this).

**T-05: Realtime (P2, architecture).** DMs and notifications need near-real-time delivery. Options: polling, Server-Sent Events, WebSockets or a managed realtime service. Decide in Phase 2. SSE or polling is likely sufficient for beta scale.

**T-06: Scheduling and jobs (P1, architecture).** Needed for Daily Drop and editorial publishing, per-timezone push fan-out, data exports, deletion workflows, media processing, emails and backup verification. Needs a durable queue with retries, idempotency and monitoring.

**T-07: Backups and restore (P0 for alpha).** §13 requires encrypted, off-system, tested restores. Free database tiers often lack backups. Define RPO and RTO in Phase 2. *Suggestion for alpha:* RPO ≤ 24 h, RTO ≤ 8 h, with a documented restore drill performed before invitations.

**T-08: Operational load for a solo developer (P1).** Prefer managed services with EU regions, error tracking and uptime alerts. Keep a single deployable app if possible, to avoid a distributed system to babysit.

**T-09: Local environment (P3).** On Windows: git 2.56, Node 22.12, npm 10.9 and Docker 28 are present. Python and the GitHub CLI are not. A Docker-based local Postgres is the likely setup. Installing a package manager (e.g. pnpm) requires approval in Phase 4.

---

## 8. Brand and design

**B-01: Missing production wordmark (P1, Owner).** The wordmark exists only in the mockup raster. §15.3 forbids approximating it with an ordinary font except as a clearly labeled stopgap. *Options:*
- (a) Commission a designer to produce the vector wordmark and symbol.
- (b) Claude recreates the wordmark in Sora-based vector form, labeled as an approximation, for owner approval.
- (c) Use the symbol only until (a) is done.

*Recommendation:* (b) as a labeled interim, then (a) before public launch.

**B-02: Vector symbol and size variants (P1).** Plan for Phase 3:
- cleaned raster masters (fringe removed)
- an SVG trace proposal (approval needed)
- favicon, PWA and maskable icons
- an Android monochrome badge proposal (approval needed)
- a light-background variant for emails and OAuth consent screens (approval needed)

All derivatives get provenance entries in `docs/brand/README.md`.

**B-03: Contrast rules (P1, measured).** White on Coral is 3.06:1 (large text only) and white on Amber is 1.50:1 (fails). Text on brand fills must be dark. See `docs/brand/README.md` §2.

**B-04: Mockup conflicts (P1).** Play buttons and waveform player, percentages, the fake match statistic, real artist photos and incomplete navigation. Documented in `docs/brand/README.md` §4. None of them will be implemented as shown.

**B-05: Fonts (P3).** Sora and Inter are SIL OFL licensed [VERIFY current license files]. Self-host them as subsetted WOFF2 with Latin Extended coverage, which Croatian needs (č, ć, đ, š, ž).

---

## 9. Process and tooling

**P-01: Orchestration (RECOMMENDED).** Native Claude Code first:
- `CLAUDE.md` (done in Phase 1)
- project subagents for independent review (`security-privacy-reviewer`, `a11y-ux-reviewer`, `qa-tester`), introduced in Phase 4 once code exists
- hooks for lint, typecheck and tests
- skills for `/checkup` and `/handoff`

Evaluate a GSD Core pilot only after Phase 4, and only if a concrete need appears.

**P-02: Documentation set.** Phase 1 creates STATUS, HANDOFF, DECISIONS and ADRs, the roadmap, brand and audit documents. The test plan, security/privacy checklist and runbooks are created in the phase where they first have real content (Phases 2, 4 and 6), so they don't start out as empty placeholders.

**P-03: CI (Phase 4).** GitHub Actions on the private repo. Free minutes for private repos are limited [VERIFY current quota]; keep pipelines lean.

---

## 10. Items confirmed as consistent (no action)

- No native audio, groups, member drafts or scheduling, anonymous participation, paid features or streak mechanics: consistent across §2, §7 and §18.
- Weekly Poll vs. member polls are clearly separated (§6, §7).
- Only Daily Drop gets an editorial push (§5, §6, §18).
- Human-created content rule with proportionate enforcement (§7).
- The alpha does not reduce beta scope (§2A, §18).

## 11. Next actions

1. Owner answers to the open questions in `docs/decisions/DECISIONS.md` §3 (priority order given there).
2. Phase 2 (after approval): comparative architecture recommendation, provider research (catalog, hosting, email, jobs, monitoring) with EU and GDPR notes, cost ranges, a preliminary trademark search and the visibility-matrix draft.
