# UX foundations

_Phase 3, step 3.1. Version 0.1, 2026-11-01._

This document sets the ground rules for the information architecture (3.2), journeys (3.3), tokens (3.4) and prototypes (3.5). It has four parts:
1. UX principles derived from the Master Prompt and decisions
2. Member and staff archetypes (hypotheses)
3. Pattern research from comparable products and regulators
4. Accessibility requirements checklist (WCAG 2.2 AA)

**Evidence status.** GrooveRift has no users yet. The archetypes are **hypotheses** built from the Master Prompt, not research findings, and must be checked against real alpha feedback. The pattern research is desk research with cited sources; product behaviour changes often, so recheck a source before relying on a detail.

---

## 1. UX principles

Each principle traces back to a confirmed requirement. Use them to settle design arguments.

| # | Principle | In practice | Source |
|---|---|---|---|
| P1 | **Music first, person second, metrics never.** | Show what people said about music and why they match. No follower-count heroics, no scores, no percentages that pretend to be precise. | §1, §4, §15.6, R-04 |
| P2 | **Reading is participation.** | Members can read Daily Drop answers without answering, browse without posting, and leave without being nagged. Lurking is a valid way to use GrooveRift. | §5, §2 (no streaks or reactivation nagging) |
| P3 | **Honest choices, equal exits.** | Visibility choices are neutral: nothing pre-selected, equal visual weight, factual benefits and consequences for every option, no "recommended" label. The private option is just as easy to choose and to switch to later. No guilt copy, no extra confirmation for the private path. | D-024, D-025, D-030, counsel C.9 |
| P4 | **Say who will see it, before it is posted.** | Any action that publishes something beyond what the member might expect shows the audience first (for example, a private member answering a Daily Drop). | D-020, D-021 |
| P5 | **Safety is one tap away and never punishes the victim.** | Block, mute and report are reachable from every piece of content and every profile. Block confirmation explains exactly what changes, including its limits (public share links). | D-019, D-023, §12 |
| P6 | **Complete without artwork.** | Every screen looks finished with zero images: typography, the Ember accents and structure carry the design. Artwork is an enhancement, never a load-bearing element. | D-017 |
| P7 | **Calm by default, brand at the moments that matter.** | Ordinary screens (feed, messages, settings, moderation) are quiet and readable. Coral/Amber energy and Rift motifs are reserved for onboarding, Music DNA, the Daily Drop question and editorial moments. | §15.6, §15.7 |
| P8 | **Built for a mid-range phone, a small screen and a tired thumb.** | Mobile-first layouts, one-handed reach for primary actions, fast first paint, no heavy effects, graceful offline states. Desktop is an adaptation, not an afterthought. | §2, §14, §15.8 |
| P9 | **Two languages, one product.** | HR and EN are equal. Layouts survive Croatian text, which is often longer than English, and Croatian diacritics (č, ć, đ, š, ž). Member content in any language is preserved as written. | §2 |
| P10 | **Accessible is the baseline, not a mode.** | WCAG 2.2 AA from the first prototype (section 4). Accessibility fixes are never deferred to "later". | §14 |

---

## 2. Archetypes (hypotheses)

Archetypes describe **behaviours and needs**, not demographics. A real member moves between them; someone can be a Daily Visitor on weekdays and a Digger on weekends. All are adults (18+). They are deliberately not given invented names or photos.

### 2.1 Members

#### A1. The Daily Visitor
- **Behaviour:** opens GrooveRift once a day, mostly on the phone, for a few minutes. Reads the Daily Drop and a handful of answers; answers maybe two or three times a week. Rarely posts in the feed.
- **Needs:** the day's question immediately on opening; answers readable without answering first; a fast, light answer composer; an optional push notification at a time the member chooses (§5).
- **Risks for us:** feeling pressured (streaks, "you haven't answered" nudges) or lost in a busy feed.
- **Key journeys:** Daily Drop read and answer, Daily Drop push opt-in, archive browsing.
- **Design implication:** the Daily Drop must be reachable in one tap from the home screen and from the notification, and the question must stand on its own without scrolling.

#### A2. The Digger
- **Behaviour:** deep listener and writer. Curates Music DNA carefully, writes long Daily Drop answers and reviews, posts concert experiences, builds playlists, suggests catalog corrections.
- **Needs:** rich but quick catalog search with references (artist, album, track); good long-text reading and writing; external listening links; an editable, honest Music DNA; Discover that goes beyond the obvious.
- **Risks for us:** catalog gaps or wrong metadata; long text that is hard to read on a phone; feeling that discovery is just "more of the same".
- **Key journeys:** Music DNA editing, catalog search and reference insertion, reviews, playlists, catalog suggestions.
- **Design implication:** text-first cards with a strong type hierarchy; the catalog card must look complete without a cover image.

#### A3. The Connector
- **Behaviour:** here to find people. Follows actively, looks at compatibility explanations (Music Twins, Explorers, Connections), sends recommendations, uses DMs with Mutuals, collaborates on playlists.
- **Needs:** understandable reasons why someone matches; easy follow and follow-back; clear status for Mutuals and intro requests; private recommendations with a personal note.
- **Risks for us:** feeling like a dating app or a numbers game; unwanted contact if limits are weak.
- **Key journeys:** Discover people, profile viewing, follow and Mutuals, intro requests, Send a Recommendation, DMs.
- **Design implication:** compatibility is explained in words, not scores (R-04). Contact affordances always respect privacy, blocks and interaction limits.

#### A4. The Careful Member
- **Behaviour:** privacy-conscious, possibly after bad experiences elsewhere. Chooses a private profile or narrows Music DNA visibility. Reads more than posts, but answers the Daily Drop. Uses mute and block without hesitation.
- **Needs:** to understand exactly who sees what *before* posting (D-020, D-021); block and report that work quickly and predictably; no surprises in notifications, search or share links; easy data export and deletion.
- **Risks for us:** any leak or surprise destroys trust permanently. A privacy choice that feels pushed towards "public" is both a trust problem and a legal one (C.9).
- **Key journeys:** onboarding visibility choices, pre-post notices, block/mute/report, privacy settings, export and deletion.
- **Design implication:** this archetype is the **acceptance test for every visibility-related screen**. If the Careful Member could be surprised, the screen is not done.

#### A5. The Artist or Music Professional (beta, secondary)
- **Behaviour:** a genuine musician, band member, promoter or writer. May be manually verified (§11). Shares own releases and concerts transparently, within rate limits, and joins discussions as a member.
- **Needs:** a verification path; clear rules on self-promotion; the same safety tools as everyone, possibly more often.
- **Risks for us:** promotion drowning out conversation; impersonation of real artists.
- **Key journeys:** verification request, posting with promotion disclosure, impersonation reports (as a target).
- **Design implication:** verification is a quiet identity signal, never a rank or a reward.

### 2.2 Staff

#### S1. The Editor
- **Behaviour:** plans and writes the Daily Drop, Weekly Poll and Did You Know? in HR and EN, reviews member question suggestions, keeps a reserve of approved Daily Drop questions. Works mostly on desktop, occasionally on the phone.
- **Needs:** a calendar that shows gaps at a glance; draft → review → approve → schedule states that cannot be confused; HR/EN side by side; fact-check notes and sources for Did You Know?; a clear alert when publishing fails or the reserve is low.
- **Risks for us:** a missed or duplicated Daily Drop, publishing an untranslated or unreviewed item, a fact error.
- **Key journeys:** admin editorial (calendar, reserve, failure alerts, HR/EN workflow).

#### S2. The Moderator
- **Behaviour:** reviews reports, often under time pressure, with a small team (OQ-06). Sometimes on the phone.
- **Needs:** a queue ordered by severity (impersonation and threats first); just enough context, never full DM browsing (§8); a statement of reasons with every action (R-07); an audit trail; protection from unnecessary exposure to harmful content (blurred by default).
- **Risks for us:** over-exposure to sensitive data; inconsistent decisions; moderator burnout.
- **Key journeys:** moderation queue, case review, action with statement of reasons, appeals.

#### S3. The Administrator (owner)
- **Behaviour:** manages invitations, roles, verification, feature flags and feedback triage. Strong authentication is mandatory.
- **Needs:** fast invitation management (email-bound, single-use, expiring, R-08); clear role boundaries; operational alerts.
- **Key journeys:** invitations, roles, feedback triage, feature flags.

### 2.3 Context dimensions to design for
- **Language:** HR and EN interface. Member content in any language.
- **Device:** a mid-range Android phone on mobile data is the baseline; iPhone Safari PWA (push only when installed to the Home Screen, iOS 16.4+) and desktop browsers are also supported.
- **Accessibility:** screen reader users (TalkBack, VoiceOver, NVDA), low vision and zoom, colour vision deficiency, motor impairments (one hand, tremor), cognitive load and fatigue, vestibular sensitivity (reduced motion).
- **Situational:** one-handed use, bright sunlight, interruptions, slow or no connectivity.

---

## 3. Pattern research

Desk research, 2026-11-01. It describes behaviour and principles only; nothing here is a layout to copy. Several official help centres (X, Instagram, Discord, BeReal) refused automated fetching, so some claims rest on secondary sources, which are labelled **[secondary]**. Claims that could not be checked are marked **[unverified]**. The EDPB quotations were verified by Claude against the official PDF.

Verdicts: **Adopt** (use as is), **Adapt** (use with changes), **Avoid**.

### 3.1 Taste onboarding (Music DNA, step 3.3)
| Pattern | Who and source | Verdict for GrooveRift |
|---|---|---|
| Minimum-pick artist picker | Spotify asks new users to "choose five or more artists" ([Spotify newsroom, 2018](https://newsroom.spotify.com/2018-08-27/5-things-free-users-need-to-be-taking-advantage-of-on-spotify/)). Community answers say it cannot be redone ([community thread](https://community.spotify.com/t5/Your-Library/Redo-the-onboarding/td-p/4997715)) **[secondary]**. | **Adapt.** About 5 picks fits our 5–10 range, but Music DNA stays editable at any time (§4). |
| Genres first, then artists | Apple Music: like or love genres, then artists ([Apple support](https://support.apple.com/en-afri/guide/apple-vision-pro/devc97adcae/26/visionos/26)). | **Adapt.** A genre step and then an artist step works with text chips. Replace hidden gestures (double-tap, pinch) with visible, labelled states. |
| Say what the picks affect | Deezer: Flow "only knows what artists you picked when you signed up" ([Deezer help](https://support.deezer.com/hc/articles/115004367189)). | **Adopt.** One plain sentence: what the picks influence (Music DNA, Discover, compatibility) and that they can be changed later. |
| Hard minimum before continuing | Pinterest requires topics before the home feed **[secondary]** ([Sprout Social](https://sproutsocial.com/insights/how-to-create-pinterest-account/)). | **Avoid.** Use a soft target ("about 5") and a visible Skip. Forced picks produce junk data. |
| Curated starter bundles | Bluesky starter packs ([Bluesky blog, 2024-06-26](https://bsky.social/about/blog/06-26-2024-starter-packs)). | **Adapt.** Text-only "starter sets" of genres can speed up picking, but only as editable suggestions, never auto-follows. |

**Without artwork** (D-017), typeahead search, grouping by genre and clear selected states do the work that images do elsewhere.

### 3.2 Daily prompts (Daily Drop, steps 3.3 and 3.5)
| Pattern | Who and source | Verdict |
|---|---|---|
| Post-to-see gate, lateness label, push that cannot be disabled | BeReal: late posts are visible to friends as late ([BeReal help](https://help.bereal.com/hc/articles/7350386715165)); friends' posts hidden until you post ([eSafety](https://www.esafety.gov.au/key-topics/esafety-guide/bereal)) **[secondary]**. | **Avoid.** Contradicts "read without answering" (§5) and the ban on nagging (§2). |
| Predictable release and a browsable archive | Wordle releases daily and keeps an archive ([NYT help](https://thenewyorktimeshelpcenter.helpjuice.com/24611727334932-Wordle)). | **Adopt** the predictable release and the archive. **Avoid** the streak counter. Our release is 00:00 UTC worldwide; the optional push arrives at the member's chosen local time after publication (§5). |
| Recurring discussion threads | Reddit scheduled posts ([r/modnews, 2020](https://www.reddit.com/r/modnews/comments/hvblq6/)). | **Adopt.** The Daily Drop is a readable thread; answering is optional. |
| Prompt answers on the profile | Hinge prompts **[secondary]**. | **Adapt (idea, not scope).** Profiles already show Daily Drop history (§3). Pinning a favourite answer would be new scope and needs owner approval. |
| Streaks as addictive design | The Commission's Digital Fairness Fitness Check (2024) lists streaks among addictive-design concerns, per a law-firm summary ([Osborne Clarke](https://www.osborneclarke.com/insights/digital-fairness-act-unpacked-addictive-design)) **[secondary]**. | Supports the existing no-streak rule (§2). |

### 3.3 Block, mute and report (steps 3.3 and 3.6)
| Pattern | Who and source | Verdict |
|---|---|---|
| Two-way block, but the blocked person is told and blocks are public | Bluesky ([AT Protocol blog, 2023-06-08](https://atproto.com/blog/block-implementation)). | **Adapt.** Keep the two-way hiding (D-019). Do not reveal the block: our neutral "profile not available" state and private, server-side blocks are stronger. |
| Block and report as separate tools; report ends with self-help | Mastodon ([docs](https://docs.joinmastodon.org/user/moderating/); [3.5 release](https://blog.joinmastodon.org/2022/03/mastodon-3.5/)). | **Adopt.** The report flow collects category, note and evidence, then offers mute or block as an optional last step. |
| Blocked users can still view public posts | X since November 2024 ([TechCrunch, 2024-11-03](https://techcrunch.com/2024/11/03/x-updates-block-feature-letting-blocked-users-see-your-public-posts)). | **Avoid.** Widely criticised as enabling stalking. |
| No notification on block | Instagram ([archived help page, 2023](https://webarchive.archive.unhcr.org/20230630023428mp_/https://help.instagram.com/426700567389543)). | **Adopt.** Blocking someone's future accounts as well is **DEFERRED** (it needs identity linkage). |
| A quiet tier below block | Discord "Ignore", February 2025 ([Discord support](https://support.discord.com/hc/en-us/articles/28084948873623)). | **Adopt** three tiers: **mute** (quiet, one-way), **block** (two-way, private), **report** (to moderators). |

Block confirmation copy (to write in 3.8): state the consequences factually, say the other person is not notified, mention the public-share-link limit (D-019), and offer "Also report" as an optional checkbox.

### 3.4 Privacy choice in onboarding (step 3.3)
- **Products:**
  - Threads asks for public or private during setup ([Instagram help](https://help.instagram.com/225222310104065)).
  - Mastodon has "locked" accounts with manual follower approval ([docs](https://docs.joinmastodon.org/user/profile/)).
  - Bluesky has no private accounts ([Bluesky docs](https://bsky.network/docs/about-bluesky-content/visibility-preferences/)).
  - Instagram's earlier public-by-default setting for child accounts contributed to the Irish DPC's €405m decision, which found infringements including GDPR Art. 25 ([DPC summary, 2022](https://www.dataprotection.ie/sites/default/files/uploads/2022-09/Decision%20IN-20-7-4%20Instagram%20Children%27s%20data%20Summary.pdf)).
- **GDPR Art. 25(2):** by default, personal data must not be made accessible to an indefinite number of people "without the individual's intervention" ([EUR-Lex](https://eur-lex.europa.eu/eli/reg/2016/679/oj)).
- **[EDPB Guidelines 03/2022 v2.0](https://www.edpb.europa.eu/our-work-tools/our-documents/guidelines/guidelines-032022-deceptive-design-patterns-social-media_en)** (adopted 14 February 2023, per the PDF's version history). Verified quotations:
  - *Deceptive Snugness:* "Respecting the principle of data protection by design and default does not mean that all options on offer need to look exactly the same. However, if controllers decide to highlight one option more than the other(s), the highlighted one needs to be the most restrictive regarding data processing."
  - *Longer than necessary:* showing "a pop-in or pop-up window asking users to confirm their decision when they choose a restrictive option (e.g. choosing to make their profiles private)" is a deceptive pattern.
- **DSA Art. 25** ([EUR-Lex](https://eur-lex.europa.eu/eli/reg/2022/2065/oj)) bans interfaces that "materially distort or impair" free and informed decisions. Art. 25(3) names "giving more prominence to certain choices" among the practices the Commission may issue guidance on. Art. 25(2) defers to the GDPR where it applies, so the EDPB guidance is the closest reference.

**Outcome:** the owner adopted a **neutral active choice** (D-030). Remaining counsel question: C.9.

**RECOMMENDED (to confirm in 3.3):** the visibility step in onboarding cannot be skipped. Any account that has not made the choice is treated as private until it does, which follows GDPR Art. 25(2).

### 3.5 Mobile navigation (step 3.2)
- **Material 3 / Android:** a navigation bar holds "three to five" top-level destinations; large screens use a navigation rail ([Android developers](https://developer.android.com/design/ui/mobile/guides/layout-and-content/layout-and-nav-patterns)).
- **Apple HIG:** tab bars are for navigation, not actions. Avoid the overflow "More" tab ([Apple HIG](https://developer.apple.com/design/human-interface-guidelines/tab-bars)) **[read via search index]**.
- **Comparable apps** keep 4–5 bottom slots and move the rest into the top bar or a profile hub. Examples: Instagram moved Create out of the bar and added DMs ([Engadget, 2025](https://www.engadget.com/instagram-tests-new-layout-that-puts-the-spotlight-on-reels-and-dms-215407062.html)); Discord has Notifications and Messages as tabs ([Discord blog, 2023](https://discord.com/blog/improving-our-mobile-experience)). Exact current tab sets for Threads, Bluesky and Reddit are **[unverified]**.
- **Implication for 3.2:** at most 5 bottom destinations, no "More" tab, Create is contextual rather than a tab. Navigation options are presented in 3.2.

### 3.6 Takeaways
1. Visibility choices are neutral (D-030): nothing pre-selected, equal weight, factual text, no confirmation only on Private.
2. Music DNA onboarding: genres, then artist typeahead; soft target of about 5–10; visible Skip; editable later; one sentence on what the picks affect.
3. Daily Drop: readable without answering, predictable release, browsable archive. No gate, lateness label, streak or nagging.
4. Safety in three tiers: mute, block (two-way, private, neutral "profile not available"), report ending with an optional block. No notification to the blocked person.
5. Navigation: at most 5 bottom destinations, no "More" tab, contextual Create.

---

## 4. Accessibility requirements checklist (WCAG 2.2 AA)

Target: **WCAG 2.2 Level AA** (§14, §15.8). Source: [W3C WCAG 2.2](https://www.w3.org/TR/WCAG22/) (W3C Recommendation, first published 2023-10-05). The list below groups the success criteria by where they bite in GrooveRift. It does not replace the standard. Criteria new in 2.2 are marked **(2.2)**. Success criterion 4.1.1 Parsing is obsolete in WCAG 2.2.

### 4.1 Visual design and tokens (step 3.4)
| SC | Requirement | GrooveRift application |
|---|---|---|
| 1.4.3 Contrast (Minimum) | Text 4.5:1; large text 3:1 | Every text/surface token pair is checked by script. Dark text on Coral/Amber fills (R-09). |
| 1.4.11 Non-text Contrast | UI components and meaningful graphics 3:1 | Input borders, chip outlines, toggles, focus rings, icon-only buttons and selected states against their surfaces. |
| 1.4.1 Use of Color | Colour is not the only signal | Selected chips, error fields, reactions and "private" indicators also use text, an icon or a shape. |
| 2.4.7 Focus Visible | Keyboard focus is visible | A dedicated focus token, visible on Void Black, on surfaces and on Coral/Amber fills. |
| 2.4.11 Focus Not Obscured (Minimum) **(2.2)** | Focused element not fully hidden | Sticky headers, the bottom navigation bar, toasts and the keyboard must not cover the focused element. |
| 1.4.4 Resize Text | 200% text without loss | Type tokens in `rem`; no fixed-height text containers. |
| 1.4.10 Reflow | No 2D scrolling at 320 CSS px | Prototypes are tested at 320 px width. Long usernames, URLs and Croatian words wrap. |
| 1.4.12 Text Spacing | Survives increased spacing | No clipped text in chips, buttons or cards. |
| 2.3.1 Three Flashes | No flashing content | Brand "electric" motifs never flash. |
| (beyond AA) | Respect `prefers-reduced-motion` | Every motion token has a reduced-motion equivalent (2.3.3 is AAA, but we commit to it). |

### 4.2 Touch, pointer and input (steps 3.5, 3.6)
| SC | Requirement | GrooveRift application |
|---|---|---|
| 2.5.8 Target Size (Minimum) **(2.2)** | At least 24×24 CSS px, or enough spacing | Our own token target is **44×44 px** for primary controls (platform guidance); 24 px is the hard floor for dense inline controls such as reactions. |
| 2.5.7 Dragging Movements **(2.2)** | Single-pointer alternative to dragging | Playlist reordering and any swipe-to-act gesture have button alternatives. |
| 2.5.1 Pointer Gestures | No path-based or multi-touch-only gestures | Swipe between feeds or tabs also works with taps. |
| 2.5.2 Pointer Cancellation | Activate on up-event | Standard buttons; no actions on touch-down. |
| 2.5.3 Label in Name | Visible label is in the accessible name | Icon buttons with visible text keep that text in their names; matters for voice control in HR and EN. |
| 2.5.4 Motion Actuation | No shake-to-act without an alternative | Not planned; keep it that way. |
| 1.3.4 Orientation | Portrait and landscape | The PWA manifest must not lock orientation. |

### 4.3 Structure, navigation and screen readers (steps 3.2, 3.6)
| SC | Requirement | GrooveRift application |
|---|---|---|
| 1.3.1 Info and Relationships | Semantics match visuals | Headings per screen, lists for feeds and answers, `<nav>` landmarks, real form labels. |
| 2.4.1 Bypass Blocks | Skip repeated content | Skip link to main content on desktop; landmarks everywhere. |
| 2.4.2 Page Titled | Unique titles | Every route sets a localized title, including client-side navigation. |
| 2.4.3 Focus Order | Logical order | Dialogs and sheets trap focus while open and return it on close. |
| 2.4.6 Headings and Labels | Descriptive | "Answers (24)", not "More". |
| 3.2.3 Consistent Navigation | Same order across screens | Navigation from 3.2 is identical on every screen of the same type. |
| 3.2.4 Consistent Identification | Same function, same name | One name per action in each language (copy glossary, 3.8). |
| 3.2.6 Consistent Help **(2.2)** | Help in the same place | Help, feedback and "report a problem" links are always in the same location. |
| 4.1.2 Name, Role, Value | Custom controls are accessible | Chips are toggle buttons (`aria-pressed`); tabs are tabs; reactions announce their state and count. |
| 4.1.3 Status Messages | Announced without focus change | "Answer posted", "Blocked", "Saved", and new-content indicators use live regions. |
| 2.2.2 Pause, Stop, Hide | Control over auto-updating content | Feeds and answer lists never auto-insert content above the reading position; show a "new answers" button instead. |
| 1.1.1 Non-text Content | Text alternatives | Member images need alt text (prompted, not forced in the alpha); decorative brand art is hidden from assistive technology. |
| 3.1.1 / 3.1.2 Language of Page / Parts | `lang` attributes | The interface sets `lang="hr"` or `lang="en"`. **OPEN:** member content may be in any language; consider an optional per-post language field so screen readers pronounce it correctly. |

### 4.4 Forms, authentication and errors (steps 3.3, 3.6)
| SC | Requirement | GrooveRift application |
|---|---|---|
| 3.3.1 Error Identification | Errors described in text | Inline errors linked to fields; also announced. |
| 3.3.2 Labels or Instructions | Clear labels | Username rules, password rules and the 18+ attestation are explained before input. |
| 3.3.3 Error Suggestion | Suggest a fix | "That username is taken. Try …" |
| 3.3.4 Error Prevention (Legal, Financial, Data) | Reversible or confirmed | Account deletion, data export and block have confirmation steps with clear consequences. |
| 3.3.7 Redundant Entry **(2.2)** | Do not ask twice | Onboarding never re-asks data already given at signup or in the invite. |
| 3.3.8 Accessible Authentication (Minimum) **(2.2)** | No cognitive test to log in | Paste allowed in password and TOTP fields; password managers supported (`autocomplete`); no CAPTCHA puzzles without an alternative. |
| 1.3.5 Identify Input Purpose | `autocomplete` tokens | Email, username, new-password, current-password, one-time-code. |
| 3.2.2 On Input | No surprise context changes | Selecting a chip or toggle never navigates away. |
| 2.2.1 Timing Adjustable | Time limits adjustable | Sessions, OTP and invite expiry are communicated; no hidden timeouts that discard text being written. |

### 4.5 Media (beta wave B6)
| SC | Requirement | GrooveRift application |
|---|---|---|
| 1.2.1 / 1.2.2 / 1.2.5 | Alternatives, captions, audio description for prerecorded media | Short video uploads need a captions path before B6 ships. To be designed with B6. |

### 4.6 How we will check
- **Phase 3:** a contrast script on every token pair (3.4); manual keyboard and screen-reader passes on the prototypes (NVDA + Chrome on Windows; TalkBack on Android if the owner has a device); a 320 px reflow check; an independent accessibility/UX review subagent (3.9).
- **Phase 4 onwards:** automated checks in CI (tool chosen in Phase 4), plus manual audits of alpha screens before G-A (roadmap Phase 5 acceptance).
