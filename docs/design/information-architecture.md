# Information architecture

_Phase 3, step 3.2. Version 0.2, 2026-11-01. Status: navigation model and profile defaults **CONFIRMED** by the owner (D-031 to D-033). Remaining open items are listed in §7._

Interactive decision sketches used for these choices: `design/prototypes/ia/` (open `index.html`; fictional data, provisional colors).

This document defines how GrooveRift is organized for the **full beta**:
1. IA rules
2. Screen inventory (every screen, its route, its delivery wave and the features it hosts)
3. Feature traceability: every confirmed beta feature has a home
4. Navigation models (2–3 options for the owner)
5. URL scheme and privacy review
6. Per-screen state matrix
7. Open items and owner decisions

Inputs: Master Prompt §2–§15, visibility matrix v0.2, domain model v0.1, `ux-foundations.md` (principles P1–P10, §3.5 navigation research, §4.3 accessibility), roadmap Phases 5 and 7.

**Wave labels.** `α` = proposed alpha scope (roadmap Phase 5 / audit A-02; the alpha scope itself is still OPEN, OQ-07). `B1`–`B6` = beta waves from the roadmap. Every item is mandatory for the full beta regardless of wave.

**Labels are provisional.** Screen and tab names in English and Croatian are working names until the copy glossary (step 3.8).

---

## 1. IA rules

| # | Rule | Why |
|---|---|---|
| IA1 | The **Home feed is the landing screen** for signed-in members, with today's Daily Drop pinned at the top. | §6: "The feed remains the principal homepage"; Daily Drop is prominently surfaced. |
| IA2 | The **Community Hub is a dedicated destination** with archives for Daily Drop, Weekly Poll and Did You Know?. | §6 (dedicated Hub with archives). |
| IA3 | **At most 5 bottom destinations, no "More" tab. Create is contextual, not a tab.** | `ux-foundations.md` §3.5 (Material 3, Apple HIG). |
| IA4 | **Navigation stays the same shape from alpha to beta where possible.** A tab may be added when its wave ships, but existing tabs do not move. | Alpha testers should not have to relearn the app; WCAG 3.2.3. |
| IA5 | **One URL per object, in every language.** Route segments are English; the interface language comes from the account setting, not the URL. | Shareable links work across HR/EN; the URL does not reveal the sharer's language. |
| IA6 | **Owner-only areas live under `/me/` and `/settings/`.** These routes never contain another member's identifier and are never shared-cached. | Simplifies the authorization test suite (R-01) and cache rules (D-016). |
| IA7 | **Staff tools live under `/admin/`** with their own navigation and role-filtered sections. Members never see links to them. | §13 least privilege; separate mental model for staff. |
| IA8 | **"Not available" looks the same for every reason**: never existed, deleted, deactivated, suspended, private (to signed-out visitors), blocked (D-019), unpublished. | Prevents enumeration and stops a block or private account from being inferred. |
| IA9 | **Help, feedback and "report a problem" are always in the same place**: the Profile menu on mobile, the rail footer on desktop. | WCAG 2.2 SC 3.2.6 Consistent Help; alpha feedback (§2A.7). |
| IA10 | **Safety actions are reachable from every content item and every profile** through the same overflow menu (⋯): Mute, Block, Report, plus Share where allowed. | P5; §12. |

---

## 2. Screen inventory (full beta)

Routes use these placeholders: `<id>` is an opaque, non-sequential public ID; `<date>` is a UTC date `YYYY-MM-DD`; `<week>` is an ISO week `YYYY-Www`. "Sheet" means a bottom sheet on mobile or a dialog on desktop. Each sheet also has a route when it needs to be deep-linkable.

### 2.1 Public and signed-out (PUB)
| ID | Screen | Route | Wave | Notes |
|---|---|---|---|---|
| PUB-01 | Landing | `/` (signed out) | α | Name, tagline, "invite-only" explanation, Sign in. No waitlist: not a confirmed feature. |
| PUB-02 | Sign in | `/signin` | α | Email and password, Google. Links to reset. |
| PUB-03 | Second-factor challenge | `/signin/verify` | α | TOTP or recovery code; mandatory for staff (passkeys per R-02 if approved). |
| PUB-04 | Password reset (request, new password) | `/reset`, `/reset/new` | α | Token handling per §5.3. |
| PUB-05 | Invite acceptance and account creation | `/invite/<token>` → `/join` | α | Leads into onboarding (ONB). |
| PUB-06 | Email verification | `/verify/<token>` → clean URL | α | |
| PUB-07 | Daily Drop share view | `/drop/<date>` (signed out) | α | **Question and join invitation only** (D-022). |
| PUB-08 | Public profile, minimal | `/@<username>` (signed out) | α | Public profiles only: username, display name, avatar, bio. No lists, DNA or history. |
| PUB-09 | Public post share view | `/p/<id>` (signed out) | B1 | Public author only: post body, catalog card, external links. No comments, reactions or reactor names. |
| PUB-10 | Legal and policy pages | `/legal/terms`, `/legal/privacy`, `/legal/guidelines`, `/legal/cookies`, `/legal/contact` | α | Content needs counsel (OQ-05, DPIA). |
| PUB-11 | Notice form for illegal content and copyright | `/legal/notice` | α (illegal content), B6 (copyright workflow) | DSA Art. 16 notice-and-action must be usable by anyone, including non-members. **Counsel to confirm scope** (new item for `questions-for-counsel.md`). |
| PUB-12 | About the alpha | `/about/alpha` | α | Known limitations, feedback channel, data handling, reset/carry-over policy (§2A.3). |

### 2.2 Onboarding (ONB), all α
Order and edge cases are designed in step 3.3. This is the inventory only.

| ID | Screen | Notes |
|---|---|---|
| ONB-01 | 18+ attestation | No date of birth stored (OQ-10 recommendation). |
| ONB-02 | Username and display name | Availability check, impersonation rules. |
| ONB-03 | Language | Interface language; preferred discovery languages (optional). The language switcher is also available on every onboarding screen. |
| ONB-04 | Profile visibility | **Neutral active choice** (D-025, D-030). Cannot be skipped (open recommendation for 3.3). |
| ONB-05 | Music DNA picks | Genres, then artist typeahead; about 5–10; visible Skip. |
| ONB-06 | Music DNA visibility | Neutral active choice (D-024, D-030). |
| ONB-07 | How GrooveRift works | Daily Drop and compatibility in two or three sentences each. Optional extra guidance. |
| ONB-08 | Daily Drop reminder | Opt-in, local time, time zone. The browser push permission prompt appears **only after an explicit tap** (§14 clear permission prompts). |
| ONB-09 | Done | Lands on Home with today's Drop at the top. |

### 2.3 Home and posts (HOME, POST)
| ID | Screen | Route | Wave | Notes |
|---|---|---|---|---|
| HOME-01 | Home: For You | `/` (signed in) | α (reduced), B1 (full) | Today's Drop pinned at the top. Weekly Poll and Did You Know? appear as labeled editorial cards. Composer entry. **Alpha version:** today's Drop, answers from people you follow, recent Drops (no feed exists before B1). |
| HOME-02 | Home: Following | `/following` | B1 | Chronological. Second tab within Home, not a bottom destination. |
| POST-01 | Post detail with comments | `/p/<id>` | B1 | Comments, replies, reactions, poll, catalog cards, external links, spoilers, content warnings. |
| POST-02 | Comment deep link | `/p/<id>/c/<id>` | B1 | Target for notifications; opens the thread scrolled to the comment. |
| POST-03 | Composer (new and edit) | `/compose`, `/p/<id>/edit` (sheet) | B1 | Types: standard, Music Moment, Ask for Music, Concert Experience, Review (1–5 optional + text). Attachments: images (B1), short video (B6), member poll, catalog references. Options: content warning, spoiler, topic, hashtags, mentions, language. **Audience line** above the Post button ("Visible to: everyone / your followers"), P4. No saved drafts. |
| POST-04 | Who reacted | sheet | B1 | Filtered by blocks. |
| POST-05 | Media viewer | overlay | B1 | Alt text available; sensitive media stays blurred until revealed. |
| POST-06 | Topic | `/topic/<slug>` | B1 | Curated topics (New Releases, Album Reviews, Concerts, Recommendations). |
| POST-07 | Hashtag | `/tag/<tag>` | B1 | |
| POST-08 | Saved | `/me/saved` | B1 | **Owner only.** Posts, answers, Did You Know? posts, recommendations saved from the inbox. |

### 2.4 Daily Drop and Community Hub (HUB)
| ID | Screen | Route | Wave | Notes |
|---|---|---|---|---|
| HUB-01 | Hub home | `/hub` | α (Daily Drop only), B2 (full) | Today's Drop, this week's Weekly Poll, latest Did You Know?, archive links, "Suggest a question". |
| HUB-02 | Daily Drop: question and answers | `/drop/<date>` | α | Readable without answering (P2). Sort: For You, Recent, Most Discussed. Answer composer with the **private-member notice** (D-021). "New answers" button instead of auto-insert (WCAG 2.2.2). |
| HUB-03 | Answer with replies | `/drop/<date>/a/<id>` | α | Replies, reactions, edit/delete own, "edited" indicator. Late answers labeled (OQ-12). |
| HUB-04 | Daily Drop archive | `/hub/drops` | α | Browse by month; jump to date. Only published dates exist. |
| HUB-05 | Weekly Poll | `/poll/<week>` | B2 | Vote, results after voting or close, discussion. |
| HUB-06 | Weekly Poll archive | `/hub/polls` | B2 | |
| HUB-07 | Did You Know? post | `/dyk/<id>` | B2 | Public sources, certainty qualifier for disputed claims, discussion. Internal fact-check notes never appear here. |
| HUB-08 | Did You Know? archive | `/hub/did-you-know` | B2 | |
| HUB-09 | Suggest a Daily Drop question | `/hub/suggest` (sheet) | B2 | Rate-limited. Copy states that editors review and may edit; no voting. Whether the submitter sees a status: OPEN (3.3). |

### 2.5 Discover, search and catalog (DISC, CAT)
| ID | Screen | Route | Wave | Notes |
|---|---|---|---|---|
| DISC-01 | Discover home | `/discover` | B4 | Sections for People, Music, Discussions; adventurousness control; reasons on every suggestion; "Not interested". |
| DISC-02 | Discover People | `/discover/people` | B4 | Music Twins, Music Explorers, Music Connections with human-readable reasons (R-04, no percentages). |
| DISC-03 | Discover Music | `/discover/music` | B4 | |
| DISC-04 | Discover Discussions | `/discover/discussions` | B4 | Topic trending with anti-gaming. |
| DISC-05 | Search | `/search?q=&type=` | α (people by name/username only, **proposed**), B4 (unified) | Types: people, artists, albums, songs, discussions. Filters. Privacy-enforced results. |
| CAT-01 | Artist | `/artist/<id>` | α (minimal: name, disambiguation, external links), B5 (full) | Discussions and answers referencing the artist; verified account link (S-15); unavailable state. |
| CAT-02 | Album (release group) | `/album/<id>` | B1 | Editions (remaster, deluxe, live), tracks, reviews, external links. |
| CAT-03 | Track (recording) | `/track/<id>` | B1 | External links; "Add to playlist" (B5); "Send to a Mutual" (B3). |
| CAT-04 | Genre | `/genre/<slug>` | B4 | |
| CAT-05 | Suggest or correct catalog data | `/catalog/suggest` (sheet) | B5 | Add, correct, flag a duplicate; sources required. |

### 2.6 Profiles and Music DNA (PROF)
| ID | Screen | Route | Wave | Notes |
|---|---|---|---|---|
| PROF-01 | Profile | `/@<username>` | α | Header: avatar fallback (no photo needed, D-017), display name, @username, verified badge, bio. Relationship button (Follow / Requested / Following / Mutual). Mutual-only actions: Message, Send a recommendation (B3). Non-mutual: Intro request (B3). Overflow ⋯: Share, Mute, Block, Report. Sections the viewer may not see are **omitted**, not shown locked. |
| PROF-02 | How you match | section of PROF-01 | B4 | Only for the viewer; cites **only Music DNA items the viewer is allowed to see** (§5.4 L-07). |
| PROF-03 | Daily Drop history | `/@<username>/drops` | α | Links to each question and discussion. Visibility per §7 Q2. |
| PROF-04 | Music DNA | `/@<username>/dna` | α | Per-section visibility (D-024). |
| PROF-05 | Posts and reviews | `/@<username>` (default tab) | B1 | Private authors: followers only. |
| PROF-06 | Playlists | `/@<username>/playlists` | B5 | Public playlists only, plus private ones the viewer contributes to. |
| PROF-07 | Followers, Following | `/@<username>/followers`, `/@<username>/following` | α | Visibility per §7 Q3. Counts follow the same rule as the lists. |
| PROF-08 | Edit profile | `/settings/profile` | α | Display name, bio, avatar. |
| PROF-09 | Music DNA editor | `/me/dna` | α | Add, remove, reorder. Suggestions (B4) appear as proposals that need explicit confirmation (§4). |
| PROF-10 | Own profile entry | Profile tab → `/@<own username>` | α | Same layout as PROF-01 plus Edit. The Profile menu holds: Music DNA, Saved, Playlists, Invites, Settings, Help and feedback, Admin (staff only). |

### 2.7 Activity, messages and recommendations (ACT, MSG)
| ID | Screen | Route | Wave | Notes |
|---|---|---|---|---|
| ACT-01 | Activity (notifications) | `/activity` | α | Replies, mentions, reactions (grouped), new followers, follow requests, playlist invites, moderation notices, system notices. Filters: All, Mentions, Requests. Visibility re-checked at render. |
| ACT-02 | Follow requests | `/activity/requests` | α | For private accounts: approve or decline. |
| MSG-01 | Messages inbox | `/messages` | B3 | Segments: Conversations, Requests (intro requests), Recommendations. |
| MSG-02 | Conversation | `/messages/<id>` | B3 | Report a message. Blocked state: **read-only for both**, delete my side (D-023). |
| MSG-03 | New message | `/messages/new` (sheet) | B3 | Pick a Mutual. |
| MSG-04 | Intro request: send | sheet from PROF-01 | B3 | Rate-limited, one pending per pair, recipient opt-out respected. |
| MSG-05 | Intro request: review | `/messages/requests/<id>` | B3 | Accept, decline, report, block. |
| MSG-06 | Send a recommendation | sheet from CAT-01/02/03 or PROF-01 | B3 | Choose a Mutual, optional personal message, external links. |
| MSG-07 | Received recommendation | `/messages/recommendations/<id>` | B3 | Save, dismiss, respond. Owner only. |

### 2.8 Playlists (PL), B5
| ID | Screen | Route | Notes |
|---|---|---|---|
| PL-01 | Playlist | `/playlist/<id>` | Tracks with external links, contributors, visibility. Contributors remove only their own tracks. |
| PL-02 | Create or edit playlist | sheet | Name, description, public/private. |
| PL-03 | Contributors | sheet | Invite Mutuals; owner removes contributors; delete playlist with collaborator notice. |
| PL-04 | My playlists | `/me/playlists` | Owned and contributing. |
| PL-05 | Add to playlist | sheet from CAT-03 | |

### 2.9 Safety and account standing (SAFE)
| ID | Screen | Route | Wave | Notes |
|---|---|---|---|---|
| SAFE-01 | Report | sheet | α | Category (incl. impersonation, copyright, AI-generated, minor) → details → submit → optional block. |
| SAFE-02 | Block confirmation | sheet | α | Explains two-way hiding and its limits (D-019); no notification to the blocked person. |
| SAFE-03 | Mute | toast with Undo | α | Silent, one-directional. |
| SAFE-04 | My reports | `/me/reports` | α | Status of own reports only. |
| SAFE-05 | Notices and statement of reasons | `/me/notices/<id>` | α | R-07. Entry to appeal. |
| SAFE-06 | Appeal | `/me/notices/<id>/appeal` | α (basic), B6 (full) | |
| SAFE-07 | Account restricted or suspended | full-screen state | α | What is limited, until when, why, how to appeal. |
| SAFE-08 | Blocked and muted accounts | `/settings/privacy/blocked` | α | Unblock, unmute. |
| SAFE-09 | Interaction limits | `/settings/privacy/limits` | B3 | Temporary limits for non-mutuals. |

### 2.10 Settings and data (SET)
| ID | Screen | Route | Wave | Notes |
|---|---|---|---|---|
| SET-01 | Settings index | `/settings` | α | |
| SET-02 | Account | `/settings/account` | α | Email, password, linked Google account. |
| SET-03 | Username change | `/settings/account/username` | α | Limits per OQ-15. |
| SET-04 | Security | `/settings/security` | α | 2FA, recovery codes, sessions and devices (revoke). |
| SET-05 | Privacy | `/settings/privacy` | α | Profile visibility, per-section visibility (Music DNA, Daily Drop history, lists), discoverability, mention policy (B1), DM and intro policy (B3). Same neutral wording as onboarding. |
| SET-06 | Notifications | `/settings/notifications` | α | Daily Drop reminder time and time zone; per type × channel; followed threads (B3); push per device. |
| SET-07 | Language and region | `/settings/language` | α | Interface language, discovery languages, time zone. |
| SET-08 | Discovery | `/settings/discovery` | B4 | Adventurousness, "not interested" list, discoverability. |
| SET-09 | Your data | `/settings/data` | α | Export, deactivate, delete (with grace period, OPEN). |
| SET-10 | Verification request | `/settings/verification` | B5 | **RECOMMENDED** home for artist/band/professional verification requests; admins verify manually (§3, §11). |
| SET-11 | Invites | `/me/invites` | B6 | Invitation phase 2: quota, sent invites, revoke unused. |
| SET-12 | Help and feedback | `/help`, `/feedback` | α | Bug report or feedback, optional screenshot; separate from abuse reports (§13). |

### 2.11 Staff area (ADM)
Desktop-first, usable on mobile. Each section is visible only to the roles that can use it.

| ID | Screen | Route | Roles | Wave |
|---|---|---|---|---|
| ADM-01 | Overview and alerts | `/admin` | all staff | α |
| ADM-02 | Members (search, status, roles) | `/admin/members`, `/admin/members/<id>` | admin | α |
| ADM-03 | Invitations | `/admin/invites` | admin | α (phase 1), B6 (quotas) |
| ADM-04 | Editorial calendar | `/admin/editorial` | editor, admin | α |
| ADM-05 | Daily Drop editor and reserve | `/admin/editorial/drops/<id>`, `/admin/editorial/reserve` | editor, admin | α |
| ADM-06 | Weekly Poll editor | `/admin/editorial/polls/<id>` | editor, admin | B2 |
| ADM-07 | Did You Know? editor with sources and fact-check notes | `/admin/editorial/dyk/<id>` | editor, admin | B2 |
| ADM-08 | Question suggestions | `/admin/editorial/suggestions` | editor, admin | B2 |
| ADM-09 | Publication jobs and failures | `/admin/editorial/jobs` | editor, admin | α |
| ADM-10 | Moderation queue and case | `/admin/moderation`, `/admin/moderation/<id>` | moderator, admin | α |
| ADM-11 | Appeals | `/admin/moderation/appeals` | moderator, admin | α (basic), B6 |
| ADM-12 | Copyright notices | `/admin/copyright` | moderator, admin | B6 |
| ADM-13 | Verification queue | `/admin/verification` | admin | B5 |
| ADM-14 | Catalog suggestions, merges, unavailable items | `/admin/catalog` | admin (catalog role OPEN) | B5 |
| ADM-15 | Feedback and bug reports | `/admin/feedback` | admin | α |
| ADM-16 | Analytics (privacy-aware aggregates) | `/admin/analytics` | admin | B6 |
| ADM-17 | Feature flags and configuration | `/admin/flags` | admin | α |
| ADM-18 | Audit log | `/admin/audit` | admin (read-only) | α |

Sensitive staff actions (opening DM evidence, changing roles, viewing a member's email) require **step-up re-authentication** and a stated reason, which is logged (`EvidenceAccess`, `AuditLog`).

### 2.12 System states (SYS)
| ID | Screen | Notes |
|---|---|---|
| SYS-01 | Not available | One page for every "not available" reason (IA8). HTTP 404. |
| SYS-02 | Something went wrong | Retry, link to status/help. No technical details or IDs that reveal data. |
| SYS-03 | Offline | Shown when a page is not cached. |
| SYS-04 | Feature paused | Incident response can switch a feature off (§13). Explains briefly; no blame; points to Home. |
| SYS-05 | Alpha marker | Persistent, unobtrusive "Alpha" label in the top bar or rail, linking to PUB-12 (§2A.3). |

---

## 3. Feature traceability

Every confirmed beta feature from the Master Prompt and decisions, mapped to its screens. If a feature has no row here, it has no home. That would be a defect in this document.

| Source | Feature | Home |
|---|---|---|
| §3 | Email/password, Google, verification, recovery | PUB-02, PUB-04, PUB-06, SET-02 |
| §3 | Optional member 2FA; mandatory strong auth for staff | PUB-03, SET-04, ADM step-up |
| §3 | Session management and revocation | SET-04 |
| §3 | 18+ only | ONB-01 |
| §3 | @username separate from display name; controlled changes | ONB-02, SET-03 |
| §3 | Public/private profile; follower approvals | ONB-04, SET-05, ACT-02 |
| §3 | Granular Music DNA visibility; discovery preferences | ONB-06, SET-05, SET-08 |
| §3, §11 | Manual verification of artists and professionals | SET-10, ADM-13, PROF-01 badge |
| §3 | Optional understated participation badges | PROF-01 (if introduced; no new badge types without approval) |
| §3, §5 | Daily Drop answer history on profile | PROF-03 |
| §3 | Edit/delete posts, comments, answers; edited indicator | POST-01, POST-03, HUB-03 |
| §3 | Deactivate, export, delete | SET-09 |
| §3 | Block, mute, report | SAFE-01–03, SAFE-08, overflow ⋯ everywhere |
| §3 | Guided, skippable onboarding | ONB-01–09 |
| §4 | Music DNA management; suggestions only with confirmation | PROF-09 |
| §4 | Music Twins, Explorers, Connections with explanations | DISC-02, PROF-02 |
| §5 | One global question at 00:00 UTC; read without answering | HUB-02, HOME-01 |
| §5 | Text answers with catalog references; replies; reactions | HUB-02, HUB-03 |
| §5 | Permanent archive | HUB-04 |
| §5 | Sorting: For You, Recent, Most Discussed | HUB-02 |
| §5 | Member question suggestions | HUB-09, ADM-08 |
| §5 | Daily Drop push at local time | ONB-08, SET-06 |
| §5, §6 | Editorial continuity: failures, retries, reserve, alerts | ADM-01, ADM-05, ADM-09 |
| §6 | Community Hub with archives | HUB-01, HUB-04, HUB-06, HUB-08 |
| §6 | Weekly Poll | HUB-05, ADM-06, HOME-01 card |
| §6 | Did You Know? with sources and qualifiers | HUB-07, ADM-07, HOME-01 card |
| §6 | Editorial drafts, review, scheduling, HR/EN, calendar, fact-check notes | ADM-04–ADM-09 |
| §7 | For You and Following feeds | HOME-01, HOME-02 |
| §7 | Text, image and short video posts; Music Moment | POST-03, POST-05 |
| §7 | Writing prompts, hashtags, curated topics | POST-03, POST-06, POST-07 |
| §7 | Comments, replies, reactions | POST-01, POST-02, POST-04 |
| §7 | Ask for Music, Concert Experience, reviews (1–5) | POST-03, POST-01, CAT-02 |
| §7 | Spoiler tags, content warnings, blurred previews | POST-03, POST-01, POST-05 |
| §7 | Private Saved | POST-08 |
| §7 | Catalog cards and external listening links | POST-01, CAT-01–03 |
| §7 | Member polls | POST-03, POST-01 |
| §8 | Follow and Mutuals (D-012, D-013) | PROF-01, PROF-07 |
| §8 | DMs between Mutuals | MSG-01–03 |
| §8 | Intro requests | MSG-04, MSG-05 |
| §8 | Interaction limits | SAFE-09 |
| §8 | @mentions and mention controls | POST-03, SET-05, ACT-01 |
| §8 | Send a Recommendation | MSG-06, MSG-07 |
| §8 | In-app, push and email notifications; followed threads | ACT-01, SET-06 |
| §9 | Collaborative playlists | PL-01–PL-05, PROF-06 |
| §10 | Catalog suggestions, corrections, merges, unavailable items | CAT-05, ADM-14, CAT-01–03 states |
| §10 | Discover People, Music, Discussions; adventurousness; not interested | DISC-01–04, SET-08 |
| §10 | Unified search with filters | DISC-05 |
| §11 | Organic artist promotion (identified, rate-limited) | POST-03 (label), PROF-01 badge |
| §11 | Privacy-respecting share links and previews | PUB-07–09, §5 |
| §11, §12 | Copyright reporting and takedown | PUB-11, SAFE-01, ADM-12 |
| §12 | Guidelines, categories, human review, appeals, audit | PUB-10, SAFE-01–07, ADM-10, ADM-11, ADM-18 |
| §12 | Impersonation category with priority | SAFE-01, ADM-10 |
| §12 | Progressive enforcement with explanations | SAFE-05, SAFE-07, ADM-10 |
| §13 | Member admin, roles, verification | ADM-02, ADM-13 |
| §13 | Invitations phase 1 and 2 | ADM-03, SET-11, PUB-05 |
| §13 | Privacy-aware analytics, flags, status, alerts | ADM-01, ADM-16, ADM-17, SYS-04 |
| §13 | Beta feedback and bug reports | SET-12, ADM-15 |
| §2A | Alpha clearly labeled; limitations and data handling | SYS-05, PUB-12 |
| §2 | HR/EN interface | ONB-03, SET-07, language switcher on public pages |
| §2 | PWA offline caching; optional push | SYS-03, §6 offline column, SET-06 |

---

## 4. Navigation models

All three models share these elements:
- **Mobile (narrow screens):** bottom bar with icons **and** text labels (labels always visible; P10). Top app bar per screen.
- **Desktop:** a left navigation rail with the same destinations in the same order (WCAG 3.2.3), plus items that live in the mobile top bar. A right-hand context column appears on wide screens only where it helps (for example, today's Drop next to the feed). Exact breakpoints are set with the tokens in step 3.4.
- **Create** is contextual: "+" in the Home top bar and on the desktop rail, "Answer" on the Daily Drop, "New playlist" in playlists.
- **Search** sits at the top of Discover and in the desktop top bar.
- **Staff** reach `/admin` from the Profile menu. Nothing appears in the bar.
- **Tapping the active tab** returns to that tab's root and scrolls to the top. Browser Back always works.
- **Badges** are dots, not numbers. The accessible name includes the state ("Activity, new items"). This follows P1 (metrics never).

### Model A: Hub and Activity tabs (CONFIRMED, D-031)
```
Mobile bottom bar
┌────────┬────────┬──────────┬──────────┬─────────┐
│  Home  │  Hub   │ Discover │ Activity │ Profile │
└────────┴────────┴──────────┴──────────┴─────────┘
Home top bar:   [symbol]  Home            [+]  [Messages •]

Desktop rail
  Home · Hub · Discover · Activity · Messages · Profile
  [ Create post ]
  ── footer: Settings · Help and feedback · Alpha
```
- **Alpha:** Home · Hub · Activity · Profile (4 tabs). Discover is added in B4 at its fixed position, and the Messages icon appears in B3. Nothing moves.
- **For:** the Daily Drop and the Hub are always one tap away (signature experience, §6 dedicated Hub). Follow requests and replies, which matter from the alpha onward, are prominent. DMs are limited to Mutuals, so for many members the inbox will be quiet. One tap from Home is proportionate.
- **Against:** Messages are one level deeper than in DM-centric apps. Home and Hub overlap during the alpha (both show today's Drop) until the feed arrives in B1.

### Model B: Messages tab
```
Mobile bottom bar
┌────────┬────────┬──────────┬──────────┬─────────┐
│  Home  │  Hub   │ Discover │ Messages │ Profile │
└────────┴────────┴──────────┴──────────┴─────────┘
Top bar on every top-level screen:   [Notifications •]
```
- **Alpha:** Home · Hub · Profile plus the bell (3 tabs). Messages arrives in B3 and Discover in B4. The bar changes shape twice.
- **For:** conversations and received recommendations are one tap away. This is the familiar pattern of many social apps.
- **Against:** the tab is empty for new members without Mutuals. Follow requests and replies hide behind a small bell. The bar changes during the beta (IA4).

### Model C: Calm four
```
Mobile bottom bar
┌────────┬──────────┬─────────┬─────────┐
│  Home  │ Discover │  Inbox  │ Profile │
└────────┴──────────┴─────────┴─────────┘
Home top segments:  For You · Following · Hub
Inbox segments:     Activity · Messages
```
- **Alpha:** Home · Inbox · Profile (3 tabs). Discover is added in B4.
- **For:** larger touch targets, the calmest bar, the most room for longer Croatian labels. Fewer places to look.
- **Against:** the Hub becomes a segment inside Home, which weakens the "dedicated Hub". Home mixes feeds and the editorial Hub in one control. The Inbox mixes private messages with reactions, so an important DM or follow request can get lost.

Models B and C are kept below for the record. They were not chosen.

### Why A was recommended and chosen
1. It is the only model where the bar stays stable from alpha to beta. Tabs are only added, never moved.
2. It gives the confirmed priorities (§15.8: Daily Drop, Discover, conversations, Music DNA, Hub) a clear place without a "More" tab.
3. It matches GrooveRift's social shape: DMs are gated to Mutuals, while replies, follows and requests reach everyone.

---

## 5. URL scheme and privacy review

### 5.1 Route map
```
/                         Landing (signed out) or Home (signed in)
/following                Home: Following feed
/hub                      Community Hub
/hub/drops | /hub/polls | /hub/did-you-know | /hub/suggest
/drop/<date>              Daily Drop question and answers
/drop/<date>/a/<id>       Answer with replies
/poll/<week>              Weekly Poll
/dyk/<id>                 Did You Know?
/p/<id>  /p/<id>/c/<id>  /p/<id>/edit  /compose
/topic/<slug>  /tag/<tag>
/discover  /discover/people  /discover/music  /discover/discussions
/search?q=&type=
/artist/<id>  /album/<id>  /track/<id>  /genre/<slug>  /catalog/suggest
/@<username>  /@<username>/drops  /@<username>/dna  /@<username>/followers
/@<username>/following  /@<username>/playlists
/playlist/<id>
/activity  /activity/requests
/messages  /messages/new  /messages/<id>  /messages/requests/<id>
/messages/recommendations/<id>
/me/saved  /me/dna  /me/playlists  /me/reports  /me/notices/<id>  /me/invites
/settings/...             (see SET-*)
/help  /feedback  /about/alpha  /legal/...
/signin  /signin/verify  /reset  /join  /invite/<token>  /verify/<token>
/admin/...                (staff only)
```
Catalog URLs may append a readable slug (`/artist/<id>/<slug>`). The ID is authoritative; a wrong slug redirects to the right one.

### 5.2 Privacy findings and rules
Each rule is RECOMMENDED unless it restates a confirmed decision.

| # | Risk | Rule |
|---|---|---|
| U-01 | Sequential or guessable IDs let people walk through objects (BOLA, §14). | All object IDs in URLs are opaque and non-sequential. **IDs are not secrets:** every request is authorized server-side through the policy module (R-01). Phase 4 note: UUIDv7 embeds its creation time. That is acceptable for public content, but use a random public ID if creation time should not leak (for example for conversations). |
| U-02 | Different responses for "private", "blocked" and "does not exist" reveal that an account exists or that someone blocked you. | IA8: one "Not available" page and one HTTP status (404) for all of them, including for signed-out visitors. Response time and size must not differ in an obvious way. |
| U-03 | Unpublished Daily Drops could be guessed by date (`/drop/<future date>`). | Unpublished, scheduled, reserve and failed questions return Not available. Open Graph previews exist only for published questions. The same applies to Weekly Polls by week. |
| U-04 | Old usernames could be used to track someone who changed their handle, or redirect to them. | **No redirect from an old username** to the new one. The old handle shows Not available during its reservation period (OQ-15). Posts use `/p/<id>`, not `/@user/p/<id>`, so post links survive a username change without exposing it. |
| U-05 | Tokens in URLs (invite, email verification, password reset) leak through browser history, logs and the `Referer` header. | On first load, the server exchanges the token for a short-lived, httpOnly cookie and redirects to a clean URL (`/join`, `/reset/new`). Those pages send `Referrer-Policy: no-referrer`. Token paths are redacted in logs. Tokens are single-use and expiring (R-08). |
| U-06 | Search queries in URLs (`?q=`) end up in server logs and analytics. | Keep `?q=` (Back button, shareable searches, accessibility), but **strip query strings from access logs and analytics**. Never put search terms in error reports. |
| U-07 | DM URLs could reveal who talks to whom (browser history, shared devices). | Conversations use opaque IDs (`/messages/<id>`), never usernames. The page title is "Messages · GrooveRift"; the other person's name is in the heading, not the title. |
| U-08 | Signed-out share links can expose more than intended. | Signed-out views follow the matrix only: Daily Drop question and join invitation (D-022); minimal public profile; public posts without comments or reactors. Open Graph tags carry the same minimum. **Nothing from a private author is ever in OG tags.** |
| U-09 | Search engines index member pages of an invite-only beta. | `noindex` on everything except landing, legal and `/about` pages during the beta. Revisit at public launch (together with D-022). |
| U-10 | Owner-only pages leaking through caching or shared URLs. | IA6: `/me/*` and `/settings/*` have no other member's ID in the route, send `Cache-Control: private, no-store`, and are covered by authorization tests. |
| U-11 | The service worker (offline cache) keeps private content on shared devices. | The offline cache holds the app shell, the last-viewed Daily Drop question, and public catalog pages only. **DMs, Saved, settings, notifications and other members' non-public content are never written to the offline cache.** All caches are cleared on sign-out. |
| U-12 | Compatibility explanations and "people who like this artist" could reveal Music DNA the viewer may not see. | Reasons cite **only items visible to that viewer** under the owner's DNA settings. Members who are not discoverable are never listed. Counts never include hidden members. |
| U-13 | Counts can leak hidden content (follower counts of private accounts, answer counts). | Counts follow the visibility of the list they summarize. Answer counts and Most Discussed use only member-visible content (matrix §5 counts rule). |
| U-14 | Push payloads and notification deep links expose private content. | Push bodies carry no private content (matrix §4). Deep links are re-authorized when opened; if access was lost, the member sees Not available. |
| U-15 | `/admin` URLs shared by mistake. | The route prefix is not secret. Every staff route is role-checked server-side, never cached, and `noindex`. Evidence pages require step-up and are logged. |
| U-16 | The locale in the URL reveals the sharer's language and splits links. | No locale prefix in app routes (IA5). Public pages render in the viewer's language (account or browser setting), with a visible switcher. |

---

## 6. Per-screen state matrix

### 6.1 State patterns
| Code | State | Pattern |
|---|---|---|
| **L** | Loading | Content-shaped placeholders, no shimmer animation when reduced motion is on. Screen title and navigation render immediately. Announce "Loading" politely only if it takes longer than about a second. |
| **E** | Error | Inline message near the failed part, with Retry. Already-loaded content stays visible. Whole-page failure → SYS-02. Failed submissions keep the typed text on screen. |
| **O** | Offline | Banner "You're offline", plus the cached copy with its time if one exists (U-11), otherwise SYS-03. Actions that need the network are disabled with a reason; typed text stays in memory while the page is open (no saved drafts, §2). |
| **N** | Not available | SYS-01 (IA8). |
| **P** | Private | Profile header (name, @username, avatar, bio) plus "This account is private. Follow to request access." Hidden sections are omitted. |
| **B** | Blocked | For the blocked side: N. For the blocker: the profile shows "You blocked this account" with Unblock; content in shared threads appears as a placeholder for both. |
| **S** | Signed out | Redirect to sign in with return path, unless the screen has a defined signed-out view (PUB-07–09). |

### 6.2 Matrix for member screens
| Screen | Empty | L | E | O | Blocked | Private | Signed out |
|---|---|---|---|---|---|---|---|
| HOME-01 Home | No follows yet: today's Drop plus "Find people through Daily Drop answers" (alpha) or Discover suggestions (B4). Never fake activity. | L | E per card | cached Drop question | blocked authors filtered out | private authors' posts only for their followers | PUB-01 |
| HOME-02 Following | "Follow people to see their posts here" + link to Discover | L | E | cached copy | filtered | followers only | S |
| HUB-01 Hub | Before the first Drop: "The first Daily Drop arrives at 00:00 UTC" with local time | L | E per program | cached | n/a | n/a | S |
| HUB-02 Daily Drop | No answers: "Be the first, or come back later" (no pressure copy, P2) | L | E; publish failure → reserve shown, never an empty day | question cached; answers need network | blocked members' answers hidden; replies in shared threads become placeholders | private members' answers visible to all members (D-021); answer composer shows the notice | PUB-07 (question + join) |
| HUB-03 Answer | No replies: reply prompt | L | E | cached if visited | N if the answer author blocked you, or you blocked them | visible (D-021) | S |
| HUB-04 Archive | Not possible after day 1 | L | E | cached list | n/a | n/a | S |
| HUB-05 Weekly Poll | No votes: results hidden until you vote or it closes | L | E; vote failure keeps the selection | read-only cache | n/a | n/a | S |
| HUB-07 Did You Know? | n/a | L | E | cached | n/a | n/a | S |
| POST-01 Post | No comments: comment prompt | L | E | cached if visited | N | followers only; replies by private members visible in public threads (D-020) | PUB-09 (public author) or N |
| POST-03 Composer | n/a | upload progress per file | E keeps text and media | Post disabled, text kept in memory | can't mention or reply to blocked accounts | audience line shows "Visible to your followers" | S |
| POST-08 Saved | "Save posts and answers to find them here" | L | E | never cached (U-11) | blocked items show placeholders | items you lost access to show placeholders | S |
| DISC-01–04 Discover | Too little Music DNA: "Add a few artists to get suggestions" | L | E | needs network | blocked accounts never suggested | non-discoverable members never suggested | S |
| DISC-05 Search | No results: spelling hint + "Suggest a missing artist" (B5) | L | E | needs network | blocked accounts excluded | private profiles appear (header only) if discoverable | S |
| CAT-01–03 Catalog | No discussion yet: "Start one" | L | E | public pages cached | blocked members' content filtered | private authors' content filtered | S |
| CAT unavailable | "No longer available from the source", history kept (§10) | | | | | | |
| PROF-01 Profile | No posts or answers: neutral text, no "inactive" label (§3) | L | E | own profile cached | B | P | PUB-08 (public) or N |
| PROF-03 Drop history | "No answers yet" | L | E | own only | N | P; per-section setting | N |
| PROF-04 Music DNA | Self: "Add artists"; others: section omitted | L | E | own only | N | P; per-section setting | N |
| PROF-07 Lists | "No followers yet" (self only) | L | E | n/a | N | P; per-section setting | N |
| PROF-09 DNA editor | Picks from onboarding or "Start with a genre" | L | E keeps edits | disabled | n/a | n/a | S |
| ACT-01 Activity | "Replies, mentions and follows show up here" | L | E | never cached | items from blocked accounts removed | n/a | S |
| MSG-01 Inbox | No Mutuals: "Messages are for Mutuals. You can send an intro request from a profile." | L | E | never cached | read-only conversations (D-023) marked | n/a | S |
| MSG-02 Conversation | New: who you're messaging and that it's private | L | E; failed send kept with Retry | never cached | read-only for both, delete my side, still reportable (D-023) | n/a | S |
| PL-01 Playlist | No tracks: "Add the first track" | L | E | public playlists cached | N | private: owner and contributors only, otherwise N | public playlist minimal or N (**OPEN**, §7 Q5) |
| SET-* Settings | n/a | L | E keeps unsaved input | read-only | n/a | n/a | S |
| SAFE-07 Restricted | n/a | n/a | E | cached notice | n/a | n/a | S |

Admin screens follow the same L, E and O patterns. Staff areas are **never** offline-cached. Empty states in staff screens state facts ("No open cases"), never celebrate.

---

## 7. Open items and owner decisions

| # | Question | Options | Recommendation |
|---|---|---|---|
| Q1 ⛳ | Navigation model | A (Hub + Activity), B (Messages tab), C (Calm four) | **CONFIRMED: A** (D-031) |
| Q2 ⛳ | Default visibility of the **Daily Drop history on the profile** (PROF-03) | Same as profile · Followers · Mutuals | **CONFIRMED: same as profile** (D-032). Public profile → all signed-in members; private profile → followers. Individual answers stay visible to all members on the question page (D-021); this setting covers only the aggregated list. |
| Q3 ⛳ | Default visibility of **follower and following lists** (PROF-07), including their counts | All members · Followers · Mutuals · Only me | **CONFIRMED: followers** (D-033). Lists expose third parties' relationships, and requiring a follow makes viewing visible to the owner. |
| Q4 | Alpha people search by name/username (DISC-05, α) so testers can find each other | Yes / no (Daily Drop answers only) | RECOMMENDED: yes. Decide with OQ-07 alpha scope. |
| Q5 | Signed-out view of public playlists | Minimal public view / members only | RECOMMENDED: members only during the beta (consistent with D-022) |
| Q6 | Counsel: DSA Art. 16 notice form for non-members (PUB-11) | | Added as B.5 in `questions-for-counsel.md` |
| Q7 | Status updates for question suggestions (HUB-09) | | OPEN: decide in 3.3 |

**Consequence for onboarding copy (3.3, 3.8).** Because of D-030, D-032 and D-033, the factual text of the "Public" option must say that all members can see the profile, Music DNA and Daily Drop answer history, and that follower lists are visible to followers. The "Private" option must say that Daily Drop answers remain visible to all members on the question page (D-021). Example wording is in `design/prototypes/ia/q2-drop-history.html`; final copy comes in step 3.8.
