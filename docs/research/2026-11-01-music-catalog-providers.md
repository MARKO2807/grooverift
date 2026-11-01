# Research: music catalog and artwork providers (2026-11-01)

> **Provenance:** web research by a Claude research subagent on 2026-11-01, mostly from official terms pages (URLs inline). It has not been re-verified by the main session and is **not legal advice**. Labels: **Verified** (read on the official page), **Secondary** (third-party source), **Inference** (reasoning) and **Unverified** (page was blocked or unreachable).

## Summary table
| Provider | Data licence | Images | Commercial use | Fit for GrooveRift |
|---|---|---|---|---|
| **MusicBrainz** | Core data **CC0**. Tags, ratings and annotations are **CC BY-NC-SA** | none | Paid supporter tiers expected for companies (see below) | ✅ **Canonical backbone** |
| **Cover Art Archive** | n/a | **No licence granted.** "Use at your own risk" | unclear | ⚠️ Legal question |
| **Spotify Web API** | Restrictive: no databases, temporary caching only, no profiling, no side-by-side with other services | temporary only | Limited. New apps capped at 5 users; Extended Quota needs **≥250k MAU** and a registered organisation | ❌ |
| **Apple MusicKit** | Purpose-limited to the user's Apple Music subscription | Artwork may not be used apart from playback or playlists | No monetization | ❌ |
| **Deezer** | "Strictly non-commercial". API reportedly closed to new apps (secondary) | rights reserved | ❌ | ❌ |
| **Discogs** | CC0 plus "Restricted Data" (unverified, page returned 403) | restricted, non-commercial | ❌ | ❌ |
| **Last.fm** | Non-commercial without an agreement; 100 MB cache cap | **excluded from licence** | ❌ | ❌ |
| **TheAudioDB / Fanart.tv** | fan-created, no image licence | unlicensed | ❌ | ❌ |
| **Odesli / song.link** | Terms behind a login (unverified) | n/a | Unknown | ⚠️ only with written terms |
| **Wikidata** | **CC0** | via Commons | ✅ | ✅ genre hierarchy and labels |
| **Wikimedia Commons** | per-file licence | CC BY / BY-SA / PD, with attribution; personality rights still apply | ✅ with care | ✅ artist photos (filtered) |

## MusicBrainz details (verified)
- **Licences** ([data license](https://musicbrainz.org/doc/About/Data_License)): core entities (artists, release groups, releases, recordings, labels, genres, relationships, URLs) are **CC0**. Supplementary data (tags, ratings, annotations, edit history, search indexes) is **CC BY-NC-SA 3.0**.
- **Genres:** the genre list is CC0. Genre-to-entity assignments come from **tags**, which are supplementary (non-commercial). **Inference:** don't copy tag associations commercially without a licence. Let members or editors assign genres instead.
- **Identifiers:** ISRC lookup, barcodes on releases, URL relationships for external links. Live and remix versions are separate recordings, which fits audit C-03.
- **API rate limit** ([rate limiting](https://musicbrainz.org/doc/MusicBrainz_API/Rate_Limiting)): about **1 request/second per IP**, and a meaningful User-Agent is required.
- **Commercial use:** the API docs point commercial users to MetaBrainz plans. The [supporter tiers](https://metabrainz.org/supporters/account-type) are:
  - **Stealth Start-Up: $0** (not yet publicly offering services)
  - Bronze: $100/mo
  - Silver: $600/mo
  - Gold: $1,250/mo
  - Unicorn: $2,000/mo

  The [Social Contract](https://metabrainz.org/social-contract) is non-binding and says companies may use the data free of charge.
- **Mirror:** full dumps twice a week. The Live Data Feed requires signup, and its packets are CC BY-NC-SA.

## Recommended combination (inference, for owner and legal review)
1. **MusicBrainz core (CC0)** as the canonical backbone, mapped to our own IDs. Register with MetaBrainz: Stealth Start-Up ($0) for the closed alpha and beta, and budget **Bronze ($100/mo) once public or monetized**.
2. **Genres:** the CC0 MusicBrainz genre list plus **Wikidata** (CC0) for hierarchy and Croatian labels. Genre assignment to artists comes from members and editors.
3. **Album covers:** Cover Art Archive images, **only after legal clearance**. The EU has no fair use, so the quotation exception is a question for a lawyer.
4. **Listen-out links:** MusicBrainz URL relationships (CC0). Plain outbound links require no streaming-provider API. Odesli only with written commercial terms.
5. **Artist images:** a generated placeholder by default. Wikimedia Commons via Wikidata P18, filtered to free licences, with credit and self-hosting. Verified artists upload their own photos under the terms of service.
6. **Avoid** Spotify, Apple, Deezer, Last.fm, Discogs restricted data, TheAudioDB and Fanart.tv as catalog or image sources. Spotify may be considered later only as an optional, user-authorised import.

## Questions for counsel
1. Can album covers (CAA or others) be displayed in the EU and Croatia under the quotation exception (InfoSoc Art. 5(3)(d) and the Croatian copyright act ZAPSP)? Does the answer change with monetization?
2. MetaBrainz commercial tier obligations and timing.
3. Do stored Spotify, Apple or Deezer IDs and URLs from MusicBrainz breach those services' "no database" terms or sui generis database rights?
4. Using streaming-service names and logos on "listen on" buttons without an API agreement (trademarks).
5. CC BY-SA photos: share-alike scope when cropping or resizing, and personality rights under Croatian law.
6. Odesli terms, once obtained.

## Not verified
Discogs, Fanart.tv and Odesli terms; the version date of Apple's license agreement; whether Spotify's endpoint changes after March 2026 were finalised.
