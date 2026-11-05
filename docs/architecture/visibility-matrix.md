# Visibility and authorization matrix: draft v0.3

- **Status:** DRAFT v0.3. Owner answered VQ-01 to VQ-06 on 2026-11-01 (D-019 to D-025) and confirmed the profile-section defaults in step 3.2 (D-032, D-033). Further changes need owner review.
- Addresses audit finding S-02, the **#1 engineering risk**.
- This matrix will become the specification for a single server-side policy module and an automated authorization test suite (R-01). Every API, search query, notification, email, share preview, cache and export must go through the same policy.
- **Implemented (session 22, step 4.8):** `src/lib/authz/policy.ts` is that module (pure functions over facts the data layer loads) and `tests/unit/policy.test.ts` has one test per row below. Changing a cell here means changing the test and the function together.

## 1. Viewer relationships
Evaluated in this order. The first match wins for **Block**, and the most permissive non-block relationship applies otherwise.

| Code | Viewer is… |
|---|---|
| `SELF` | the owner of the object |
| `BLOCKED` | in a Block with the owner, **either direction** |
| `MUTUAL` | a Mutual of the owner (D-013) |
| `FOLLOWER` | an approved follower (not mutual) |
| `MEMBER` | any other signed-in member in good standing |
| `ANON` | not signed in (share-link previews only, §11) |
| `MOD` / `ADMIN` | staff role, acting **through a case** or an audited admin function, never by browsing |

Deactivated, suspended, banned and deleted accounts are invisible to all non-staff viewers. Their content is hidden as well, except for thread placeholders (S-17).

## 2. Matrix

Legend: ✅ allowed · ❌ denied · 🔒 only if the profile is public or the viewer is an approved follower · ⚙️ depends on the owner's setting · 📄 only via an open case, logged

### Profile and identity
| Object | SELF | MUTUAL | FOLLOWER | MEMBER | BLOCKED | ANON | MOD/ADMIN |
|---|---|---|---|---|---|---|---|
| Username, display name, avatar | ✅ | ✅ | ✅ | ✅ | ❌ neutral "not available" state (D-019) | ✅ public profiles only, minimal | ✅ |
| Bio | ✅ | ✅ | ✅ | ✅ | ❌ | public profiles only | ✅ |
| Music DNA (each section) | ✅ | ⚙️ | ⚙️ | ⚙️ + 🔒 | ❌ | ❌ | 📄 |
| Followers and following lists | ✅ | ⚙️ | ⚙️ | ⚙️ + 🔒 | ❌ | ❌ | 📄 |
| Daily Drop answer history | ✅ | ⚙️ | ⚙️ | ⚙️ + 🔒 | ❌ | ❌ | 📄 |
| Posts on profile | ✅ | ✅ | ✅ | 🔒 | ❌ | public posts via share link only | 📄 |
| Email, sessions, MFA, settings | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | Admin: email and status only, audited |

`⚙️` options per section: everyone (signed-in members) · followers · mutuals only · only me. **Defaults:**
- Profile: chosen by the member in onboarding through a neutral active choice: nothing pre-selected, equal weight, no "recommended" label (D-025 as amended by D-030). The owner's goal is that most accounts are public. Private is always available.
- Music DNA: everyone, set by an active onboarding choice (D-024). Never visible to `ANON`.
- Daily Drop history (the aggregated list on the profile): **same as profile** (D-032). Public profile → everyone (signed-in members); private profile → followers. Individual answers on the question page follow D-021.
- Followers and following lists, **including their counts**: **followers** (D-033). Counts are shown only to viewers who may see the list.
- A private profile caps everything **on the profile** at followers. Exceptions: replies in public threads (D-020) and Daily Drop answers on the question page (D-021).

### Content
| Object | SELF | MUTUAL / FOLLOWER | MEMBER | BLOCKED | ANON | MOD/ADMIN |
|---|---|---|---|---|---|---|
| Post (public author) | ✅ | ✅ | ✅ | ❌ | share-link preview | ✅ (public) |
| Post (private author) | ✅ | ✅ | ❌ | ❌ | ❌ | 📄 |
| Comment or reply | ✅ | follows the thread | follows the thread, **also for private authors** with a pre-post notice (D-020) | ❌ hidden (placeholder) | ❌ | ✅ / 📄 |
| Daily Drop question | ✅ | ✅ | ✅ | ✅ | ✅ question + join invitation only (D-022) | ✅ |
| Daily Drop answer (public author) | ✅ | ✅ | ✅ | ❌ | ❌ (D-022) | ✅ |
| Daily Drop answer (private author) | ✅ | ✅ | ✅ with a pre-answer notice (D-021) | ❌ | ❌ (D-022) | ✅ |
| Reactions (who reacted) | ✅ own | ✅ | ✅ | filtered | ❌ | ✅ |
| Member poll votes (individual) | ✅ own | ❌ | ❌ | ❌ | ❌ | 📄 |
| Poll aggregates | after voting or close | same | same | ❌ | ❌ | ✅ |
| Saved items | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ (not even admins) |
| Media file URLs | follows the parent object; **signed, short-lived URLs** for non-public parents | | | | | |

### Messaging, recommendations, playlists
| Object | Participant / owner | Contributor | Other member | BLOCKED | MOD/ADMIN |
|---|---|---|---|---|---|
| DM conversation and messages | ✅ | n/a | ❌ | ❌ no new messages; existing history stays **read-only for both**, each can delete their own side, still reportable (D-023) | 📄 **reported messages + bounded context only**, logged |
| Intro request | sender and recipient | n/a | ❌ | cannot be sent | 📄 |
| Recommendation | sender and recipient | n/a | ❌ | cannot be sent | 📄 |
| Playlist (public) | ✅ manage | ✅ add/remove own tracks | ✅ view | ❌ | ✅ |
| Playlist (private) | ✅ manage | ✅ | ❌ | ❌ | 📄 |

### Editorial and staff-only
| Object | Members | Editor | Moderator | Admin |
|---|---|---|---|---|
| Published Daily Drop, Weekly Poll, Did You Know? | ✅ | ✅ | ✅ | ✅ |
| Drafts, schedule, reserve questions | ❌ | ✅ | ❌ | ✅ |
| Fact-check notes (internal) | ❌ | ✅ | ❌ | ✅ |
| Reports and cases | reporter: own report status only | ❌ | ✅ assigned | ✅ |
| Reporter identity | ❌ (never revealed to the reported member) | ❌ | ✅ | ✅ |
| Audit log | ❌ | ❌ | ❌ | ✅ read-only |
| Feedback screenshots | own | ❌ | ❌ | ✅ restricted |

## 3. Interaction permissions
| Action | Required relationship | Additional checks |
|---|---|---|
| Follow | MEMBER (not BLOCKED) | Private target → `pending` |
| Reply or comment | can view the thread | Owner interaction limits; not BLOCKED with the thread author **or** the parent author |
| Mention | MEMBER | Mention policy of the target; blocks; mass-mention rate limit |
| React | can view the target | not BLOCKED |
| DM | MUTUAL | not BLOCKED; recipient DM policy |
| Intro request | MEMBER | recipient opt-in; rate limit; one pending per pair |
| Send recommendation | MUTUAL | not BLOCKED; recipient policy; rate limit |
| Invite to playlist | MUTUAL | not BLOCKED |
| Vote in poll | can view the poll | one active vote; before close |

## 4. Cross-channel enforcement checklist
The same policy decision must apply to every channel:
- [ ] API responses (lists **and** single-object endpoints, i.e. no ID guessing)
- [ ] Search results and autocomplete
- [ ] Feeds, Discover, compatibility suggestions
- [ ] Notifications (re-checked at render), push payloads (**no private content in push bodies**) and emails
- [ ] Share links and Open Graph previews (public objects only)
- [ ] Media URLs (signed and expiring for non-public objects)
- [ ] Caches and CDN (no shared caching of personalized or private responses)
- [ ] Counts and aggregates (must not leak the existence of hidden content where that matters)
- [ ] Logs and error tracking (no message bodies or private content)
- [ ] Data exports (only the requester's own data plus what is lawful)

## 5. Visibility questions (resolved 2026-11-01)
| ID | Question | Owner decision |
|---|---|---|
| VQ-01 | When A blocks B, can B (signed in) still see A's public profile and posts? | **No**, hidden both ways while signed in; the blocker is told it is not absolute (D-019). As recommended. |
| VQ-02 | A private-account member replies in a public thread. Who sees the reply? | Everyone who can see the thread, with a pre-post notice (D-020). As recommended. |
| VQ-03 | Daily Drop answers from private accounts: who sees them, and do they count in "Most Discussed"? | **All signed-in members**, with a pre-answer notice; they count like any member-visible answer (D-021). **Differs from the recommendation** (followers only), to support the owner's goal of more visible participation. |
| VQ-04 | Should signed-out visitors see Daily Drop questions and public answers via share links? | Question and join invitation only; answers members-only during beta (D-022). As recommended. |
| VQ-05 | After a block, does existing DM history remain visible? | Yes, read-only for both; each can delete their own side (D-023). As recommended. |
| VQ-06 | Default Music DNA visibility for new members | All signed-in members, via an active onboarding choice (D-024). As recommended. |
| (new) | Default profile visibility | Public for adults, via an active onboarding choice; private always available (D-025). |

**Counts and ranking rule (from D-021):** answer counts and "Most Discussed" use only content visible to all signed-in members. Followers-only content (e.g. posts by private authors) never contributes to public counts.
