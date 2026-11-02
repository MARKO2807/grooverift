# Research: artist search, the genre list and Spotify (2026-11-02)

> **Provenance:** checked by the main session on 2026-11-02 (session 11) after the owner asked for "an excellent artist database or API", "truly the 20 most popular genres", a "very large genre database" and a check of the Spotify API. Labels: **Verified** (read on the official page that day), **Secondary** (third-party report), **Inference** (reasoning) and **Unverified**. Not legal advice. It builds on [2026-11-01-music-catalog-providers.md](2026-11-01-music-catalog-providers.md), which stays the provider comparison.

## 1. Artist search
- **MusicBrainz stays the catalogue** (ADR-0002, CC0 core data). **Verified:** the [statistics page](https://musicbrainz.org/statistics), last updated 2026-11-01, lists 3,029,782 artists, 5,896,149 releases and 40,786,058 recordings.
- **The live API is not enough for type-ahead.** It allows about one request a second per IP ([rate limiting](https://musicbrainz.org/doc/MusicBrainz_API/Rate_Limiting)). That is fine for the prototype (`?live=1`) but not for many members typing at once. **Inference, RECOMMENDED for Phase 4:**
  1. Mirror the core data from the twice-weekly dumps.
  2. Build our own search index, for example PostgreSQL with `pg_trgm` and `unaccent`. It should cover names, artist aliases (localised spellings such as "Bjork" for "Björk") and sort names.
  3. Rank results by a popularity signal. Otherwise "Nirvana" from 1960s London ranks as high as the grunge band.
  - Hosting and the index engine need owner approval (infrastructure).
- **Popularity signals:**
  - [ListenBrainz popularity API](https://listenbrainz.readthedocs.io/en/latest/users/api/popularity.html) (MetaBrainz) returns total listens and unique listeners per artist. Its data licence is **Unverified**: the data page did not show licence text. Check it before use.
  - **Wikidata sitelinks** (the number of Wikipedia articles about an item, CC0) is a rough, legally simple fallback. The prototype already uses it for genres (§2).
- **Telling artists apart:** use the MusicBrainz disambiguation comment, the country and the main genre (D-060 shows the genre). This is already in the prototype.
- **Images:** unchanged. Use a generated tile by default. In live mode, use Wikimedia Commons photos with credit.

## 2. Genres
### The 20 shown first (D-062)
There is no single published global top-20 genre ranking. Each study uses its own categories. The order below combines two sources:
- **1 to 10 (Secondary):** IFPI *Engaging with Music 2022*, a global listener survey, as reported by [Dancehall Mag](https://dancehallmag.com/?p=61369):
  1. Pop
  2. Rock
  3. Hip-hop/rap
  4. Dance/electronic
  5. Latin
  6. Classical/opera
  7. R&B
  8. Soundtracks
  9. Country
  10. Reggae

  The 2023 and 2025 IFPI PDFs could not be read in this session (one was over the size limit).
- **11 to 20 (Inference):** chosen with care, not taken from a source. The basis was Luminate's 2025 US core genres (rap and R&B, rock, pop, country, Latin; [AP via WTOP](https://wtop.com/national/2026/01/music-streams-hit-5-trillion-in-2025-christian-rock-and-latin-lead-growth-in-the-us/)), K-pop's global reach and the European club scene:
  - Metal
  - Indie
  - Jazz
  - K-pop
  - Soul
  - Blues
  - Folk
  - Punk
  - House
  - Techno
- **Moved from the main chips to search:** Trap, Nu metal, Funk and Kantautorska (from D-053). Each still has its own colour and Music DNA behaviour.
- **RECOMMENDED after launch:** reorder the main chips by what GrooveRift members actually pick, possibly per interface language.

### The full list for "Traži žanr"
- **Verified:** MusicBrainz has 2,220 genres (`genre-count` from `/ws/2/genre/all`). The list is CC0.
- **Verified:** the MusicBrainz web service does not return relationships between genres. `inc=genre-rels` returns only the name.
- **Verified:** Wikidata (CC0) links 2,182 items to a MusicBrainz genre ID (P8052). It holds 1,846 "subclass of" (P279) edges between such genres.
- **The prototype build** (`design/prototypes/tools/build-genres.mjs`, output `pulse/genres-mb.js`):
  - **The list:** 2,178 genres. The ones equal to a main genre are left out, as are non-music entries such as speech and ASMR.
  - **Parent family:** taken from, in this order:
    1. exceptions
    2. keyword rules (a "death metal" is metal)
    3. the nearest family ancestor in the Wikidata hierarchy
    4. folk and world keywords
    5. Folk, for about 580 mostly regional traditional styles
  - **What the parent does:** it gives the genre its colour and its behaviour in the Music DNA. Search shows it next to the genre ("Heavy metal · Metal").
  - **Search order:** within each match group, genres with more Wikipedia articles (Wikidata sitelinks) come first. So "metal" lists Heavy, Black and Death metal before Pop metal.
- **Requests:**
  - 25 to MusicBrainz, one a second.
  - 3 queries to Wikidata.
  - User-Agent "GrooveRift-prototype/0.1 ( https://github.com/MARKO2807/grooverift )". No personal data was sent.
- **Phase 4:**
  - Mirror the genre relationships from the MusicBrainz dumps, where they exist in the database, or keep using Wikidata.
  - Add Croatian labels from Wikidata.
  - Let editors fix wrong parents.

## 3. Spotify
- **Verified ([quota modes](https://developer.spotify.com/documentation/web-api/concepts/quota-modes)):**
  - A new app runs in development mode: at most **5 Spotify users**, each added to an allowlist by hand, and the app owner needs **Premium**.
  - Since **15 May 2025** extended quota is open only to **organisations** (a registered business with a launched service in key Spotify markets) with at least **250,000 monthly active users**. Review takes up to six weeks.
- **Verified ([Developer Policy](https://developer.spotify.com/policy)):**
  - III.13 bans analysing Spotify content for any purpose, including "building profiles of users".
  - I.1.2 requires deleting a member's Spotify data when they disconnect.
  - **Verified ([Developer Terms](https://developer.spotify.com/terms)):** IV.3.1.1 bans storing Spotify content indefinitely or compiling databases of it.
- **Inference:**
  - **"Prijava preko Spotifyja" is not possible for the alpha or beta.** Five allowlisted users is not a product, and GrooveRift will not have 250k MAU for a long time.
  - Even with access, importing top artists into the Music DNA and using it for compatibility looks like "building profiles of users". It would need legal review.
  - Plain sign-in alone adds little over email and Google.
- **Recorded as OQ-27 (DEFERRED).** Revisit once GrooveRift is a registered organisation near 250k MAU, with legal review of III.13.
  - **Possible alternative:** an optional, member-authorised import from ListenBrainz, an open service that runs no quota programme. Its licence and terms must be checked first.

## Not verified
- The ListenBrainz data licence.
- The ranking inside IFPI's 2023 and 2025 reports.
- Whether MusicBrainz dumps carry genre-to-genre relationships in a form we can mirror.
