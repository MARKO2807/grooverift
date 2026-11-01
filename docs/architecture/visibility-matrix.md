# Visibility and authorization matrix: draft v0.1

- **Status:** DRAFT for owner review (Phase 2).
- Addresses audit finding S-02, the **#1 engineering risk**.
- This matrix will become the specification for a single server-side policy module and an automated authorization test suite (R-01). Every API, search query, notification, email, share preview, cache and export must go through the same policy.

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
| Username, display name, avatar | ✅ | ✅ | ✅ | ✅ | ❌ (VQ-01) | ✅ public profiles only, minimal | ✅ |
| Bio | ✅ | ✅ | ✅ | ✅ | ❌ | public profiles only | ✅ |
| Music DNA (each section) | ✅ | ⚙️ | ⚙️ | ⚙️ + 🔒 | ❌ | ❌ | 📄 |
| Followers and following lists | ✅ | ⚙️ | ⚙️ | ⚙️ + 🔒 | ❌ | ❌ | 📄 |
| Daily Drop answer history | ✅ | ⚙️ | ⚙️ | ⚙️ + 🔒 | ❌ | ❌ | 📄 |
| Posts on profile | ✅ | ✅ | ✅ | 🔒 | ❌ | public posts via share link only | 📄 |
| Email, sessions, MFA, settings | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | Admin: email and status only, audited |

`⚙️` options per section: everyone · followers · mutuals only · only me. **Proposed defaults:**
- Music DNA: everyone (core to discovery)
- Lists and Daily Drop history: followers
- A private profile caps everything at followers.

### Content
| Object | SELF | MUTUAL / FOLLOWER | MEMBER | BLOCKED | ANON | MOD/ADMIN |
|---|---|---|---|---|---|---|
| Post (public author) | ✅ | ✅ | ✅ | ❌ | share-link preview | ✅ (public) |
| Post (private author) | ✅ | ✅ | ❌ | ❌ | ❌ | 📄 |
| Comment or reply | ✅ | follows the thread | follows the thread | ❌ hidden (placeholder) | ❌ | ✅ / 📄 |
| Daily Drop answer (public author) | ✅ | ✅ | ✅ | ❌ | ❌ (VQ-04) | ✅ |
| Daily Drop answer (private author) | ✅ | ✅ | ❌ (VQ-03) | ❌ | ❌ | 📄 |
| Reactions (who reacted) | ✅ own | ✅ | ✅ | filtered | ❌ | ✅ |
| Member poll votes (individual) | ✅ own | ❌ | ❌ | ❌ | ❌ | 📄 |
| Poll aggregates | after voting or close | same | same | ❌ | ❌ | ✅ |
| Saved items | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ (not even admins) |
| Media file URLs | follows the parent object; **signed, short-lived URLs** for non-public parents | | | | | |

### Messaging, recommendations, playlists
| Object | Participant / owner | Contributor | Other member | BLOCKED | MOD/ADMIN |
|---|---|---|---|---|---|
| DM conversation and messages | ✅ | n/a | ❌ | ❌ (no new messages; existing history kept for the non-blocking party, VQ-05) | 📄 **reported messages + bounded context only**, logged |
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

## 5. Open visibility questions for the owner
| ID | Question | Recommendation |
|---|---|---|
| VQ-01 | When A blocks B, can B (signed in) still see A's public profile and posts? §8 requires filtering only for the blocker. | **No**: hide both ways while signed in, and tell the blocker this is not absolute, since B can sign out and view public share links. |
| VQ-02 | A private-account member replies in a public thread. Who sees the reply? | Everyone who can see the thread, with a clear notice to the private member before posting. This keeps threads coherent (the X-style alternative breaks threads). |
| VQ-03 | Daily Drop answers from private accounts: are they visible only to followers, and do they count in "Most Discussed"? | Followers only. Counts and ranking use publicly visible content only. |
| VQ-04 | Should signed-out visitors see Daily Drop questions and public answers via share links? | Question only, plus an invitation to join. Answers are members-only during beta. |
| VQ-05 | After a block, does existing DM history remain visible? | Yes, read-only for both, with no new messages. Either party can delete it on their own side. |
| VQ-06 | Default Music DNA visibility for new members | Everyone (signed-in members), adjustable in onboarding |
