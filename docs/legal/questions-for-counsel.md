# Questions for professional advisers

- **Status:** prepared by Claude (Phase 2) from the audit and research.
- **Purpose:** to make a paid consultation efficient. This is **not legal advice**. Answers should be recorded as decisions in `docs/decisions/DECISIONS.md`.
- **Context to give the adviser:** GrooveRift is a free, invite-only, 18+ music-first social network run from Croatia. It has user posts, images, short videos (later), comments, DMs and editorial content. It is hosted in the EU (Render Frankfurt, a US company). There is no payment in beta; premium may come later. The closed alpha has 10–20 testers.

## A. Accountant / company formation (needed before the alpha)
1. Which legal form fits: individual, *obrt* or *d.o.o.* (or *j.d.o.o.*)? Consider liability for user content, cost and later monetization.
2. Can a free, non-revenue service operate as an individual or *obrt* during alpha and beta? When must it change?
3. VAT implications of foreign SaaS invoices (Render, Cloudflare, etc.) for each form.
4. Does the legal form affect "micro/small enterprise" status under the DSA (Recommendation 2003/361/EC)?

## B. Lawyer: platform regulation (DSA)
1. With a human-curated invite gate, is GrooveRift an "online platform" (DSA Art. 3(i), recital 14) or only a hosting service? Does this change with member invite quotas (invitation phase 2)?
2. Confirm micro/small enterprise status and therefore the Art. 19 exemption.
3. Minimum content for the Art. 11/12 contact points, the Art. 14 terms, the Art. 16 notice-and-action flow and the Art. 17 statement of reasons.
4. Art. 18 (suspected serious crime): the process and which Croatian authority to notify.

## C. Lawyer: data protection (GDPR)
1. Is a DPIA required for Music DNA profiling and compatibility matching (AZOP list items 1 and 10)? Will you review our DPIA draft?
2. Lawful basis per purpose: contract vs. legitimate interest vs. consent (recommendations, compatibility, analytics, push, emails).
3. Art. 22 risk for compatibility suggestions and feed ranking.
4. DM access only for reported messages: is the design adequate? What retention for moderation evidence?
5. Account deletion: keeping thread placeholders, backup retention as the erasure mechanism, legal exceptions.
6. US-owned processors with EU regions (Render, Cloudflare, possibly Sentry): is an SCC/DPF reliance plus a transfer assessment enough?
7. Do we need cookie consent if we use only strictly necessary cookies and cookieless server-side analytics?
8. Breach notification procedure and the records of processing (Art. 30) template.

## D. Lawyer: age
1. Is 18+ self-declaration plus a human invite gate defensible for alpha and beta? What changes at public launch (Commission Art. 28 guidelines, July 2025)?
2. Can we avoid storing date of birth?
3. Procedure when a minor is reported.

## E. Lawyer: copyright, music data, trademarks
1. **Album covers:** can they be displayed under the quotation exception (InfoSoc Art. 5(3)(d), ZAPSP)? Does this change with monetization?
2. Artist photos from Wikimedia Commons (CC BY/BY-SA): share-alike scope for crops; personality rights in Croatia.
3. Storing Spotify, Apple and Deezer IDs or URLs from MusicBrainz: any breach of their terms or EU database rights?
4. Service names and logos on "listen on" buttons without API agreements.
5. MetaBrainz commercial tier: obligations and timing.
6. DSM Art. 17 / ZAPSP: are we an online content-sharing service provider? Do short user videos with background music need ZAMP licensing or another approach?
7. Content licence wording in the ToS (members keep ownership; limited licence to GrooveRift).
8. **Trademark "GrooveRift":** clearance search and filing strategy (EUIPO vs. national; Nice classes 9, 38, 41, 42, 45). Domain ownership ≠ trademark. See `docs/legal/trademark-preliminary-search.md`: no identical mark found so far, but "RIFT" is crowded in classes 9/41 (e.g. gamigo EUIPO 010026284, LOST RIFT WIPO 1889700, Meta "RIFT" registrations). Ask for a likelihood-of-confusion assessment.

## F. Lawyer: documents to draft or review before the alpha
Terms of Service · Privacy Policy · Community Guidelines (including the human-created content rule) · Copyright and takedown policy · Alpha tester notice (incomplete software, data carry-over) · provider identification (ZET čl. 6) · DPIA · records of processing.

## G. Other
1. Does the European Accessibility Act apply if DMs count as interpersonal communications, or once paid features exist?
2. Croatian consumer law implications for a future premium tier.
