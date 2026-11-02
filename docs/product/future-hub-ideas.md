# Future Hub ideas (backlog)

_Status: **DEFERRED**, not in the confirmed beta scope. Recorded on 2026-11-02 (session 11) at the owner's request. Do not implement and do not change the current Hub for these. When their time comes, define the UX, participation rules, interactions, moderation and technical requirements first, with clickable options for the owner (OQ-29)._

Both ideas belong in the **Hub**, next to Daily Drop, Weekly Poll and Did You Know?. Both must serve the GrooveRift philosophy: **Discover music. Cross boundaries. Find your people.**

## 1. Hidden Gems: lesser-known music worth hearing
**Concept:** the community finds and shares lesser-known songs and artists that deserve more attention.

Possible features (owner's list):
- Members suggest songs they consider underrated.
- Each suggestion holds the song, the artist and a short reason why it deserves attention.
- Others listen through a link to a music platform.
- Members can save suggestions for later and interact with them.
- A weekly pick of the community's most interesting finds.
- A possible link to Music DNA for personalised discovery.

**Goal:** encourage listening beyond well-known artists, algorithmic recommendations and one's own genres.

## 2. On Repeat: what is playing right now?
**Concept:** members share the song they are listening to most right now, or cannot get out of their head.

Possible features (owner's list):
- A member picks one current On Repeat song.
- It shows with the title, the artist and the album cover.
- An optional short comment.
- The Hub shows the community's current On Repeat picks.
- Members discover other members' songs and save interesting ones.
- The On Repeat song can appear on the member's profile.
- A possible link to Music DNA.

**Goal:** a simple, spontaneous, social moment that shows what members really listen to.

## Owner guidelines for later
- Match the existing GrooveRift design and behaviour.
- Hidden Gems is about **discovering underrated music**; On Repeat is about **members' current favourites**.
- No needless gamification, no point systems, no pressure to be active every day.
- Consider profiles, Music DNA, saved items (bookmarks) and musical identity.
- Use existing music integrations where possible; do not duplicate data and never host protected recordings.
- Do not duplicate features that exist elsewhere in the app.
- At implementation time, propose the best UX, participation rules, moderation and technical architecture.

## Constraints to check before design (Claude's notes)
- **New recurring programme:** the Master Prompt §6 forbids adding recurring programmes to the beta silently. A weekly Hidden Gems pick is one, so it needs an explicit owner decision on scope and wave.
- **Overlap to resolve:** On Repeat is close to the B1 "Music Moment" post type and the profile; Hidden Gems is close to B3 "Send a Recommendation", B4 Discover and catalog references. Decide which one owns what, so nothing is duplicated.
- **Artwork:** album covers depend on artwork rights; the design must work without covers (D-017). Use the generated tile by default.
- **Listening:** external links only, no audio playback in the app (CLAUDE.md, Master Prompt).
- **"Now playing" import:** reading it from Spotify is blocked for now (OQ-27); manual picks from the MusicBrainz catalogue work without that.
- **Moderation and privacy:** suggestions and comments are member content (reports, blocks, visibility per profile settings); a profile On Repeat follows the profile visibility rules.
- **Editorial load:** a weekly pick needs editors and a place in the editorial calendar (B2 tools).
