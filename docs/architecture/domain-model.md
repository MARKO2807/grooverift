# Domain model: draft v0.1 (stack-agnostic)

- **Status:** DRAFT for owner review (Phase 2).
- Not a database schema. It names the entities, relationships and invariants that any stack must support.
- Entity names are English. User-facing names are localized separately.

## Conventions
- **IDs:** every entity has an internal, non-sequential, stable ID (e.g. UUIDv7). External provider IDs are **never** used as primary or foreign keys.
- **Timestamps:** stored in UTC. Member-facing local times use IANA time zone names (e.g. `Europe/Zagreb`), never fixed offsets.
- **Soft vs. hard delete:** content gets `deleted_at` plus a scheduled purge. Personal data is erased or anonymized per the deletion workflow (audit S-17). Deleted content is never served to members.
- **Edited content:** `edited_at` is shown as an "edited" indicator. Edit history is not exposed publicly. Whether to retain it internally for moderation is OPEN (privacy trade-off).
- **Localization:** editorial entities have per-locale translation rows (`en`, `hr`) with their own review status.
- **Terminology:** the mutual relationship is a **Mutual** (D-012), never a "connection". "Music Connections" is only the compatibility mode.

---

## 1. Identity and access
| Entity | Key fields / notes |
|---|---|
| **Account** | email (unique, normalized), email_verified_at, password_hash (nullable if Google-only), status (`active`, `deactivated`, `suspended`, `banned`, `pending_deletion`, `deleted`), ui_locale, age_attested_at, created_at |
| **AuthIdentity** | account, provider (`google`), provider_subject (unique per provider). Linked only after verified-email proof (S-09). |
| **Session** | account, created_at, last_seen_at, device label, revoked_at. Members can list and revoke sessions. |
| **MfaFactor** | account, type (`totp`, `passkey`), secret or credential (encrypted), created_at |
| **RecoveryCode** | account, hash, used_at |
| **RoleAssignment** | account, role (`moderator`, `editor`, `admin`), granted_by, granted_at. Permissions derive from roles. Privileged roles require strong MFA. |
| **Invitation** | email, token_hash, inviter, status (`sent`, `accepted`, `expired`, `revoked`), expires_at, accepted_account |
| **InviteQuota** | account, granted_by, total, used. Invitation phase 2. |

## 2. Profile and preferences
| Entity | Notes |
|---|---|
| **Profile** | account (1:1), username (case-insensitive unique), display_name, bio, avatar (media), visibility (`public`, `private`; default `public` via an active onboarding choice, D-025), discoverable (bool), verified_artist (via Verification) |
| **UsernameReservation** | old username, account, released_at. Prevents impersonation after a change (S-07). |
| **PrivacySettings** | per-section visibility for Music DNA, Daily Drop history and lists of followers/following; mention policy; DM and intro-request policy; interaction limits |
| **NotificationPreferences** | per notification type × channel (in-app, push, email) |
| **DailyDropReminder** | enabled, local_time, time_zone (IANA), last_notified_question. Push rule per D-01. |
| **DiscoveryPreferences** | adventurousness level, preferred discovery languages, not-interested signals |
| **Verification** | account, kind (`artist`, `band`, `professional`), evidence notes (admin-only), verified_by, linked catalog artist (optional, S-15) |

## 3. Social graph
| Entity | Notes |
|---|---|
| **Follow** | follower, followee, status (`pending`, `accepted`). Pending applies only to private accounts. |
| **Mutual** (derived) | exists iff both directions are `accepted` (D-013). It is a derived view, not stored separately. Losing either follow ends the Mutual. |
| **Block** | blocker, blocked. Enforced in both directions for interaction (see visibility matrix). |
| **Mute** | muter, muted. One-directional and silent. |
| **InteractionLimit** | account, scope (`non_mutuals`), applies_to (replies, mentions, DMs/intros), expires_at |

## 4. Music catalog
| Entity | Notes |
|---|---|
| **Artist** | canonical name, sort name, disambiguation, availability_status |
| **ReleaseGroup** | an "album" as a concept (album, EP, single, compilation); artists (credited) |
| **Release** | a specific edition (remaster, deluxe, live, regional), date, release group |
| **Recording** | a track as a distinct recording (live or remaster is a different recording where appropriate) |
| **ExternalId** | entity type and ID, provider, external_id, last_synced_at. Many per entity. |
| **CanonicalRedirect** | merged_from → merged_into, merged_by, reason. **All references resolve through redirects** so Music DNA, reviews, playlists and posts survive merges (C-03). |
| **Genre** | hierarchical (parent), stable slug, translations (en, hr), active flag (C-02) |
| **ExternalLink** | entity, service (e.g. Spotify, Apple Music, Bandcamp), URL, source (`provider`, `admin`, `member_suggested`), status |
| **CatalogSuggestion** | submitter, type (`add`, `correct`, `duplicate`), payload, sources, status, reviewer |

## 5. Music DNA and compatibility
| Entity | Notes |
|---|---|
| **MusicDnaEntry** | account, subject (artist or genre; later possibly a release), source (`explicit`, `accepted_suggestion`), position, created_at. **Explicit entries are never changed automatically** (§4). |
| **MusicDnaSuggestion** | account, proposed change, reason, status (`pending`, `accepted`, `dismissed`) |
| **CompatibilityResult** (computed, cacheable) | pair, mode (`twins`, `explorers`, `music_connections`), human-readable reasons, computed_at. No numeric score is exposed (R-04). It must be recomputed or invalidated when Music DNA, blocks or privacy settings change. |

## 6. Content
| Entity | Notes |
|---|---|
| **Post** | author, kind (`standard`, `music_moment`, `ask_for_music`, `concert`, `review`), body, language, content_warning, spoiler, topic, edited_at, deleted_at, moderation_state |
| **ConcertDetails** | post (1:1), artist ref, venue, date |
| **ReviewDetails** | post (1:1), catalog ref (release group or recording), rating 1–5 (nullable) |
| **CatalogReference** | owner (post, answer, comment, recommendation), entity ref (resolved via redirects) |
| **Media** | owner, kind (`image`, `video`), status (`processing`, `ready`, `rejected`), alt_text, sensitive flag, storage key. EXIF and GPS are stripped (T-02). No audio. |
| **Comment** | target (post or Daily Drop answer), parent (for replies), author, body, edited_at, deleted_at |
| **Reaction** | target, reactor, kind (fixed set, S-05). Unique per (target, reactor, kind). |
| **Mention** | source content, mentioned account. Subject to mention policy, blocks and rate limits. |
| **Hashtag / Topic** | hashtags are free-form and moderated; topics are a curated list (New Releases, Album Reviews, Concerts, Recommendations…) |
| **SavedItem** | account, target. **Private to the owner.** |
| **MemberPoll** | post (1:1), options (limited count), closes_at |
| **MemberPollVote** | poll, voter, option. One active vote per member, changeable until close. Individual votes are private (S-06). |

## 7. Daily Drop and editorial
| Entity | Notes |
|---|---|
| **DailyDropQuestion** | publish_date (UTC date, **unique**: the idempotency key), status (`draft`, `in_review`, `approved`, `scheduled`, `published`, `failed`), is_reserve, translations, published_at |
| **DailyDropAnswer** | question, author, body, catalog refs, edited_at, deleted_at. Unique (question, author) for top-level answers (D-035). Answers to archived questions are allowed and show their date; there is no late flag (D-036). |
| **QuestionSuggestion** | submitter, text, status, reviewer notes, resulting question (optional; used only to send the private notification on publish, D-037) |
| **WeeklyPoll** | week (ISO week, unique), publish_at, options, translations, status. Votes are private, aggregates are public. |
| **WeeklyPollVote** | poll, voter, option |
| **DidYouKnowPost** | publish_at, translations, public sources, **internal fact-check notes (editor-only)**, certainty qualifier, status |
| **EditorialTranslation** | parent, locale, text, review status, reviewer |
| **PublicationJob** | target, scheduled_for, attempt count, status, idempotency key, last_error. Admin alerts on failure (D-02). |

## 8. Messaging and recommendations
| Entity | Notes |
|---|---|
| **Conversation** | participants (1:1 in beta), created_at |
| **Message** | conversation, sender, body, created_at, edited or deleted state. **Access only for participants**; moderators only via a case (see the matrix). |
| **IntroRequest** | from, to, message, status (`pending`, `accepted`, `declined`, `expired`). Rate-limited. Recipients can opt out. |
| **Recommendation** | sender, recipient, catalog ref, personal message, external links, status (`new`, `saved`, `dismissed`, `responded`) |

## 9. Playlists
| Entity | Notes |
|---|---|
| **Playlist** | owner, name, description, visibility (`public`, `private`) |
| **PlaylistContributor** | playlist, account, invited_by, status. Must be a Mutual of the owner at invite time (OPEN: what happens if the Mutual relationship later ends). |
| **PlaylistTrack** | playlist, recording ref, added_by, position. A contributor can remove only their own tracks; the owner can remove any. |

## 10. Notifications
| Entity | Notes |
|---|---|
| **Notification** | recipient, type, actor, target, created_at, read_at. **Visibility is re-checked at render time.** |
| **PushSubscription** | account, endpoint, keys (encrypted), user agent label, created_at, last_success_at |
| **EmailDelivery** (log) | recipient, template, status. No message bodies are stored in logs. |

## 11. Trust and safety
| Entity | Notes |
|---|---|
| **Report** | reporter, target (any content, profile, message), category (including `impersonation`, `copyright`, `ai_generated`, `minor`), details, status |
| **ModerationCase** | groups reports, assignee, priority, state, deadline |
| **EnforcementAction** | case, subject, action (`notice`, `warning`, `restriction`, `suspension`, `ban`, `content_removal`), duration, **statement_of_reasons** (R-07), decided_by |
| **Appeal** | action, appellant, text, status, reviewer (a different person than the original decider where possible) |
| **EvidenceAccess** | case, accessor, object, reason, timestamp. Required for any DM or private-content access. |
| **AuditLog** | actor, action, target, metadata (redacted), timestamp. Append-only. |
| **CopyrightNotice** | notifier, work, target, status, counter-notice |

## 12. Operations and data rights
| Entity | Notes |
|---|---|
| **FeatureFlag** | key, state, audience (roles or accounts), changed_by (audited) |
| **FeedbackReport** | reporter, kind (`bug`, `feedback`), text, screenshot (sensitive, restricted), status, triage notes |
| **DataExportRequest** | account, status, file location, expires_at |
| **DeletionRequest** | account, requested_at, scheduled_for (grace period, OPEN), completed_at, steps log |

---

## Key invariants (must be enforced in code and covered by tests)
1. A Mutual exists only if both follows are `accepted`. DMs, playlist invites and recommendations require a Mutual, except for intro requests.
2. A Block in either direction prevents follows, mentions, DMs, intro requests, recommendations, playlist invites and replies between the pair. Creating a Block removes existing follows in both directions.
3. Explicit Music DNA entries are never modified without member confirmation.
4. Exactly one published Daily Drop per UTC date. Publication is idempotent.
5. Every catalog reference resolves through `CanonicalRedirect`.
6. Private-to-owner objects (SavedItem, notification and privacy settings, sessions, recommendations received) are never returned to anyone else.
7. Every moderator or admin access to private content creates an `EvidenceAccess` or `AuditLog` record.
8. Editorial content is not schedulable without approved `en` and `hr` translations (pending OQ-16).
