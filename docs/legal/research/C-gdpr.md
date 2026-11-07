# Research C: data protection (GDPR), questions C.1 to C.11

- **Date:** 2026-11-07
- **Prepared by Claude under D-123. This is research, not legal advice; the owner decides and carries the residual risk.**
- **Scope:** `docs/legal/questions-for-counsel.md` section C only. The DPIA and the records of processing are drafted later; this file answers the questions and states what those documents must contain.
- **Labels:** RECOMMENDED means Claude's proposal, never a decision. "Needs owner survey" marks a point that would change a confirmed product decision.

## How currency was checked (as of 2026-11-07)

| Source | Check | Result |
|---|---|---|
| GDPR (Regulation (EU) 2016/679) | EUR-Lex text fetched today | No amendment in force. **Pending, not law:** Omnibus IV (May 2025, Art. 30(5) threshold 250 → 750) and the Digital Omnibus (Nov 2025; Council mandate reported 21 Oct 2026, keeps the definition of personal data, drops moving cookie rules into GDPR Art. 88a, lengthens the breach deadline). Trilogues not concluded. Secondary sources only (IAPP, legal blogs); medium confidence on the status. |
| ePrivacy Directive 2002/58/EC Art. 5(3) | EUR-Lex | Unchanged. |
| Zakon o elektroničkim komunikacijama (ZEK) | Consolidated text on zakon.hr (NN 76/22, 14/24, 45/26; in force from 7 May 2026; database current to NN 125/26), fetched today | Art. 43(4) transposes ePD Art. 5(3) (quoted in C.7). Verify against Narodne novine before quoting in a document. |
| Zakon o provedbi Opće uredbe o zaštiti podataka (NN 42/18) | zakon.hr, fetched today | One version only (NN 42/18). Relevant: Art. 19 (digital consent age 16). No DPIA, retention or small-controller rules. |
| AZOP Art. 35(4) list (13 Dec 2018) | EDPB-hosted PDF read in full | 13 items; still the list referenced by the EDPB. AZOP says it is not exhaustive. No newer list found. |
| EDPB guidelines | EDPB pages and PDFs | 03/2022 v2.0 adopted 14 Feb 2023; 9/2022 v2.0 (final, page dated 4 Apr 2023); 2/2023 v2.0 adopted 7 Oct 2024; 05/2020 v1.1; 2/2019 v2.0; 8/2020 v2.0. 1/2024 (legitimate interest) still shown as the consultation version; no final version found. |
| EU-US DPF (Decision (EU) 2023/1795) | Searches for curia and press | Upheld by the General Court in **T-553/23 Latombe** (3 Sep 2025). Appeal **C-703/25 P** filed 31 Oct 2025, **pending**; no Advocate General opinion or hearing found. The curia case page could not be read (redirect), so this is medium confidence. |

---

## C.1 DPIA for Music DNA and compatibility

**Question.** Is a DPIA required for Music DNA profiling and compatibility matching (AZOP list items 1 and 10)?

**Short answer.** For what is built (members pick genres and artists, the profile shows them, no matching), a DPIA is **probably not mandatory** but is prudent. **Before compatibility suggestions ship, a DPIA is required in practice**: compatibility is profiling of "personal preferences, interests" (AZOP item 1, WP248 criterion 1) combined with comparing datasets across members and, later, Daily Drop answers and follows (AZOP item 10, WP248 criterion 6), and music taste can indirectly reveal religious or political views (WP248 criterion 4). RECOMMENDED: one DPIA for the whole service before the first invite, with a compatibility section completed before that feature is switched on.

**Analysis.**
- GDPR Art. 35(1) requires a DPIA where processing "is likely to result in a high risk"; Art. 35(3)(a) names "systematic and extensive evaluation of personal aspects ... based on automated processing, including profiling, ... on which decisions are based that produce legal effects ... or similarly significantly affect". Compatibility does not lead to such decisions (see C.3), so Art. 35(3)(a) alone is not triggered.
- AZOP's list (Art. 35(4)) is broader. Item 1: "systematic and extensive profiling ... to bring conclusions that are of significant influence or may affect an individual ... (e.g. ... personal preferences, interests, ... behavior)". Item 10: "linking, comparing or verifying multi-source matching". Displaying a member's own choices is not profiling under Art. 4(4) (no evaluation or prediction). Computing "Music Twins / Explorers / Connections" is evaluation and prediction of preferences, so item 1 is arguably met ("may affect an individual" is a low bar). Item 10 depends on reading "multi-source": if compatibility combines Music DNA with Daily Drop answers, follows or reading languages, it compares datasets collected for different purposes, which WP248 criterion 6 treats as a risk indicator.
- WP248 rule of thumb: two criteria usually mean a DPIA. Plausibly met: (1) evaluation/profiling of preferences, (6) matching datasets, and partially (4) sensitive or highly personal data. Not met in the alpha: large scale, vulnerable subjects (18+), innovative technology, systematic monitoring, preventing a right or service.
- **Special-category risk.** CJEU C-184/20 *OT* (paras 123–128) and C-252/21 *Meta v Bundeskartellamt* (paras 68–73) hold that data capable of indirectly revealing a special category is covered by Art. 9. Genres such as gospel, worship, nasheed, Christian metal or overtly political scenes can reveal religious belief or political opinion. Displaying a choice the member made deliberately is defensible (Art. 9(2)(a) explicit consent, or arguably 9(2)(e) for data the member makes visible; *Meta* paras 77–84 require a clear, informed choice to make data public, and "all signed-in members of an invite-only community" is not clearly "public"). **Matching on such genres is the riskier step.**
- DPO: Art. 37(1)(b) needs "large scale" regular and systematic monitoring as a core activity. Not met with 10–20 testers; revisit for the beta.

**Sources.** GDPR Arts. 4(4), 9, 35, 37 ([EUR-Lex](https://eur-lex.europa.eu/eli/reg/2016/679/oj)); [AZOP Art. 35(4) list](https://www.edpb.europa.eu/system/files/decisions/list_of_the_types_of_processing_for_dpia_croatia_35_4.pdf); [WP248 rev.01](https://ec.europa.eu/newsroom/article29/items/611236/en); CJEU C-184/20 (ECLI:EU:C:2022:601), C-252/21 (ECLI:EU:C:2023:537).

**Confidence.** Medium. The item-1 and item-10 wording is vague; AZOP has not published guidance applying it to recommender features.

**Residual risk.** Low for the alpha without matching. Medium if compatibility ships without a DPIA (an Art. 35 breach is a fine category under Art. 83(4) even when nothing goes wrong).

**Gap against what is built.** No DPIA exists. Music DNA genres are not classified for sensitivity. Nothing in the code computes compatibility yet, so the gap is documentation only.

**What the DPIA must say (Art. 35(7)).** (a) Systematic description: data (Music DNA, answers, follows, reading languages), purposes (display, compatibility, later For You ranking), recipients, retention, systems (Render, R2, Sentry). (b) Necessity and proportionality: why each input is needed, why no numeric score is shown (R-04), opt-in or opt-out, visibility respected, blocks excluded. (c) Risks: inference of religion or politics, unwanted discovery by a harasser, profile exposure to all members, chilling effect. (d) Measures: sensitive-genre handling, opt-out or opt-in, human-readable reasons, no push on score changes (Master Prompt §4), block and privacy filters, deletion and retention. Also: views of testers (Art. 35(9), "where appropriate"), review date, and the decision that prior consultation (Art. 36) is not needed because residual risk is not high.

**Owner decision or action.** Approve "one DPIA before the first invite, compatibility section before compatibility ships" (RECOMMENDED). Decide how sensitive genres are treated in matching: RECOMMENDED exclude them from compatibility reasons, or cover them with explicit consent at the compatibility opt-in.

**Free official channel.** AZOP accepts written enquiries free of charge ([azop.hr](https://azop.hr)); a short question "does compatibility matching among 20 invited adults fall under items 1 and 10?" is a reasonable use. Prior consultation (Art. 36) is only needed if the DPIA ends with high residual risk.

---

## C.2 Lawful basis per purpose

**Question.** Contract, legitimate interest or consent for recommendations, compatibility, analytics, push and emails?

**Short answer.** Core service (account, profile, Music DNA display, Daily Drop, comments, follows, Activity, export, deletion): **contract, Art. 6(1)(b)**. Security, abuse prevention, error tracking, breached-password check, audit log: **legitimate interest, Art. 6(1)(f)** (Recital 49). DSA notice-and-action and statements of reasons: **legal obligation, Art. 6(1)(c)**. Push: **at the member's request** (contract), withdrawable on the device card. Compatibility suggestions: **consent through an explicit opt-in is the safest**; legitimate interest with an easy opt-out is defensible but weaker. Analytics: legitimate interest only if aggregate and server-side (see C.7). No marketing email exists, so no consent for email is needed.

**Analysis.**
- EDPB 2/2019 (paras 30–33, 57) and CJEU *Meta* (C-252/21, paras 97–104) read "necessary for the performance of a contract" strictly: personalisation is necessary only if it is objectively indispensable to the service the member signed up for. *Meta* held that personalised content on a general social network was not shown to be necessary. GrooveRift's displayed Music DNA is the content the member chose to publish, so contract works. Compatibility is advertised as a core feature (Master Prompt §4), which helps a contract argument, but a regulator could say the network functions without it.
- Legitimate interest needs the three-step test (*Meta* para 106; EDPB 1/2024 draft): a real interest, necessity, and balancing with reasonable expectations. It triggers the Art. 21 right to object, which must be "explicitly brought to the attention" of the member, "clearly and separately" (Art. 21(4)).
- Consent (Art. 4(11), 7; EDPB 05/2020) must be freely given and as easy to withdraw as to give; it also doubles as Art. 9(2)(a) explicit consent if sensitive genres are used.
- The Master Prompt (§4) speaks of "discovery opt-outs", which fits legitimate interest plus an objection switch. Switching to opt-in would change that baseline: **needs owner survey**.
- Invitations: the invitee's address comes from the admin, not the invitee, so Art. 14 applies (information within a month and at the first communication, Art. 14(3)(b)). Basis: legitimate interest.
- Google sign-in: Google is a separate controller for its account; GrooveRift receives email and name under contract.

**Sources.** GDPR Arts. 6, 7, 9, 13, 14, 21 and Recitals 47, 49; [EDPB 2/2019](https://www.edpb.europa.eu/our-work-tools/our-documents/guidelines/guidelines-22019-processing-personal-data-under-article-61b_en); [EDPB 05/2020](https://edpb.europa.eu/sites/default/files/files/file1/edpb_guidelines_202005_consent_en.pdf); [EDPB 1/2024 (consultation version)](https://www.edpb.europa.eu/our-work-tools/documents/public-consultations/2024/guidelines-12024-processing-personal-data-based_en); [EDPB 8/2020](https://edpb.europa.eu/system/files/2021-04/edpb_guidelines_082020_on_the_targeting_of_social_media_users_en.pdf); CJEU C-252/21.

**Confidence.** High for the core service, security and DSA items; medium for compatibility (no case law on taste matching between consenting adults).

**Residual risk.** Low if the bases below are stated per purpose. Medium if compatibility runs on contract alone with no opt-out.

**Gap against what is built.** The Privacy Policy is a placeholder with a draft mark (`src/app/[locale]/legal/[doc]/page.tsx`). The invitation email (`src/lib/onboarding/invite-mail.ts`) carries no Art. 14 notice and no link to the Privacy Policy. No compatibility switch exists (feature not built).

**What the Privacy Policy and records must say.** A table: purpose → data → basis → retention → recipients, with the legitimate interest named for each 6(1)(f) line and the Art. 21 objection right stated separately. RECOMMENDED basis map:

| Purpose | Basis |
|---|---|
| Account, sign-in (incl. Google), sessions, profile, Music DNA display, Daily Drop, comments, reactions, follows, blocks, mutes, Activity | 6(1)(b) |
| Push reminders and social pushes (member turns them on) | 6(1)(b), stopped by the device switch |
| Account and security emails | 6(1)(b); security notices 6(1)(f) |
| Invitations (invitee address) | 6(1)(f), Art. 14 notice in the email |
| Rate limits, lockout, audit log (keyed IP hash), HIBP check, Sentry | 6(1)(f) + Art. 32 |
| Reports, cases, statements of reasons, appeals | 6(1)(c) (DSA Arts. 16, 17) and 6(1)(f) |
| DSA notices from non-members, outcome email | 6(1)(c) |
| Data copy, deletion, rights requests | 6(1)(c) (Arts. 15, 17, 20) |
| Feedback and screenshot | 6(1)(f); reply email by the member's tick |
| Compatibility suggestions (planned) | RECOMMENDED 6(1)(a) opt-in (+ 9(2)(a) if sensitive genres used); alternative 6(1)(f) + opt-out |
| Aggregate usage statistics (planned) | 6(1)(f), no terminal access |
| Artist photos of real people (Wikimedia) | 6(1)(f), Art. 14(5)(b) via the Privacy Policy |

**Owner decision or action.** Choose the compatibility basis: opt-in consent (RECOMMENDED) or opt-out legitimate interest (Master Prompt baseline). **Needs owner survey** before compatibility is built. Approve adding an Art. 14 line to the invitation email.

**Free official channel.** AZOP written enquiry on the compatibility basis, if the owner wants certainty before the beta.

---

## C.3 Art. 22 for compatibility suggestions and feed ranking

**Question.** Do compatibility suggestions or feed ranking fall under Art. 22?

**Short answer.** **No**, as designed. Art. 22 covers decisions "based solely on automated processing, including profiling, which produces legal effects ... or similarly significantly affects" the person. Suggesting people with similar taste, or ordering a feed, does not decide access to anything. It would change if an automated score gated DMs or intro requests, or if automated moderation applied sanctions without a person.

**Analysis.**
- WP251 rev.01 (pp. 21–22) treats "similarly significant" effects as ones that significantly affect circumstances, behaviour or choices, have a prolonged impact, or lead to exclusion or discrimination; ordinary personalised recommendations generally do not reach that level.
- CJEU C-634/21 *SCHUFA* (7 Dec 2023) widened "decision" to a score that plays a determining role in someone else's decision. No third party relies on GrooveRift's compatibility to grant or refuse anything.
- Moderation is human (D-107: "a person decided"); restrictions, suspensions and bans are not automated. Rate limits are not decisions about a person.
- Transparency still applies: Art. 13(2)(f) logic information is mandatory only for Art. 22 decisions, but Art. 5(1)(a) fairness and the Master Prompt's "honest compatibility explanations" call for plain reasons. DSA Art. 27 (recommender transparency) is in the online-platform section, from which micro and small enterprises are exempt (Art. 19); section B covers that status.
- If For You (B1) ranks by Music DNA, that is profiling under 6(1)(f); offer a non-personalised order as the objection mechanism (Art. 21).

**Sources.** GDPR Art. 22, 13(2)(f), 21; [WP251 rev.01](https://ec.europa.eu/newsroom/article29/items/612053/en); CJEU C-634/21 (ECLI:EU:C:2023:957); DSA (Regulation (EU) 2022/2065) Arts. 19, 27.

**Confidence.** High for compatibility and chronological feeds; medium for future ranking that could demote people.

**Residual risk.** Low.

**Gap against what is built.** None today. D-109 (9) found an onboarding line (ONB-03) claiming reading languages raise answers in "Za tebe" while For You orders by follows only: an inaccurate processing statement (Art. 5(1)(a)). Fix in the 5.13 copy pass.

**What the Privacy Policy and DPIA must say.** "We do not make decisions about you based solely on automated processing." Describe what compatibility uses and that reasons are shown instead of scores; how ranking works; how to switch off personalisation. DPIA: list the design limits that keep Art. 22 out (no gating of DMs by score; human moderation).

**Owner decision or action.** Keep the rule "no automated gating or sanctions" as a design constraint (RECOMMENDED).

**Free official channel.** Not needed.

---

## C.4 DM access only for reported messages; moderation evidence retention

**Question.** Is "reported messages plus bounded context only" adequate? What retention for moderation evidence?

**Short answer.** The design is **adequate and close to best practice**: no routine browsing, role-based access, `EvidenceAccess` logging, reporter-selected messages plus bounded context. Strongest form: the reporter selects the messages to send, and context is a fixed small number of messages around them in that conversation only. The built moderation-copy rule (kept while a case is open, then 90 days after the decision or until the 183-day appeal window ends, whichever is later) is **proportionate**. RECOMMENDED: keep the case record without content longer (3 years) and delete the content copy on the existing schedule.

**Analysis.**
- Art. 5(1)(c) minimisation and Art. 32 access control support "only what was reported". Master Prompt §: "only relevant reported messages and necessary context ... role-based access and audit logs".
- Confidentiality of communications: since the EECC (Directive (EU) 2018/1972), number-independent interpersonal communications services fall under ePD Art. 5(1) and ZEK Art. 43, unless messaging is a minor ancillary feature (EECC Art. 2(7)). Whether social-network DMs qualify is debated. A copy forwarded by a participant who received it is the recipient's own disclosure, not interception by the provider, which is the safest position. **Do not** scan DM content automatically.
- Retention: DSA Art. 20(1) needs at least six months for appeals (built: 183 days). Art. 17(3)(e) GDPR permits keeping data "for the establishment, exercise or defence of legal claims"; the Croatian general limitation for damages is 3 years from knowledge, 5 years at most (Zakon o obveznim odnosima, Art. 230). Keeping full content that long is disproportionate; keeping the decision record (rule, statement of reasons, dates, pseudonymous ids) is proportionate.
- DSA Art. 18 (suspected serious crime) can justify longer retention of a specific case; record that as an exception.

**Sources.** GDPR Arts. 5(1)(c), 17(3)(e), 32; ePD Art. 5(1); Directive (EU) 2018/1972 Art. 2(5), 2(7); ZEK Art. 43; DSA Arts. 17, 18, 20; [ZOO Art. 230](https://www.zakon.hr/z/75/Zakon-o-obveznim-odnosima).

**Confidence.** Medium (the ePrivacy status of social-network DMs is unsettled; the retention periods are judgement, not rules).

**Residual risk.** Low with the RECOMMENDED limits.

**Gap against what is built.** DMs are not built. Reports, cases, decisions and DSA notices (notifier name and email, `src/lib/data/notices.ts`) have **no retention limit**; only the content copy is purged (`moderation.purge`).

**What the Privacy Policy and records must say.** Staff never read DMs except reported messages and limited context, for an open case, logged; what the moderation copy contains; the periods; that reporters are not revealed to the reported member; DSA notifier data and its period.

**Owner decision or action.** Approve: content copy as built; case records 3 years after the final decision, then anonymised; DSA notifier data 6 months after the outcome mail (RECOMMENDED).

**Free official channel.** AZOP enquiry if DMs are built with any automated scanning (not planned).

---

## C.5 Account deletion: placeholders, backups, exceptions

**Question.** Keeping thread placeholders, backup retention as the erasure mechanism, legal exceptions.

**Short answer.** **Placeholders without an author and without text are fine** (they are not personal data once nothing links them to the member). **Bounded backup retention is the accepted mechanism** for erasure from backups, if the period is short, documented, and a restore re-applies completed purges. The **30-day grace period** is proportionate (EDPB 03/2022 para 162) and stays within the one-month response time (Art. 12(3)). Exceptions under Art. 17(3) must be narrow and named: legal claims (moderation records), legal obligation (deletion evidence), and security logs only under a fixed short period.

**Analysis.**
- EDPB 03/2022 para 160–161: erasure means the information can no longer be perceived "without disproportionate effort"; anonymisation is an alternative. Para 162: "any grace period ... needs to be proportionate"; para 163: Art. 17(3) exceptions "have to be interpreted narrowly" and retained data must not be visible to other users.
- Small community caveat: in a 20-person alpha, an empty placeholder in a thread can still be attributed by memory or by replies quoting the member. Replies by others are their own data; the placeholder itself carries no data. Residual risk accepted.
- Backups: no EDPB rule requires editing backups; the practice is short rotation, restricted access, and on restore re-running deletions before going live. Render PITR covers 3 days (Hobby) or 7 days (Pro) per `docs/research/2026-11-01-infrastructure-eu.md`; an off-system daily dump is an acceptance criterion (`docs/alpha-acceptance-criteria.md`).
- The kept "completed deletion request (id and dates)" is a good deletion ledger for re-applying purges after a restore, and is accountability evidence (Art. 5(2)).
- The audit log keeps the pseudonymous id, keyed IP hash and user agent after purge. That is defensible under 6(1)(f) for security only with a fixed period; today there is none.
- Suspended or banned members erase through the privacy contact (D-109 (7)); that contact must exist in the Privacy Policy.

**Sources.** GDPR Arts. 5(1)(e), 5(2), 12(3), 17; [EDPB 03/2022 v2.0](https://www.edpb.europa.eu/our-work-tools/our-documents/guidelines/guidelines-032022-deceptive-design-patterns-social-media_en) paras 158–166; Recital 26.

**Confidence.** High for placeholders and grace period; medium for backup practice (no binding text).

**Residual risk.** Low once the audit retention and restore step exist.

**Gap against what is built.** No audit-log retention job (`src/worker.ts` has none). No documented restore step that re-applies purges. Off-system dump status not verified here. Invitations to a deleted member's address are deleted, but expired or revoked invitations of people who never joined are kept forever.

**What the Privacy Policy and records must say.** What is deleted, what stays (empty placeholder, moderation records without the member's id, audit entries for N months, the deletion record), why (Art. 17(3) ground), backup period ("removed from backups within N days"), the grace period and how to cancel it.

**Owner decision or action.** Approve audit retention 12 months (RECOMMENDED), backup ceiling 30 days, and a restore runbook step "re-run `account.purge` for every completed deletion before reopening".

**Free official channel.** Not needed.

---

## C.6 US-owned processors with EU regions

**Question.** Render, Cloudflare, Sentry: is SCC/DPF reliance plus a transfer assessment enough?

**Short answer.** **Yes.** Contracting with a US company is a transfer even when data sits in Frankfurt (the importer is the US entity, and remote access from the US is possible). Where the processor is **DPF-certified**, the adequacy decision (2023/1795) covers the transfer and **no transfer impact assessment is legally required**. Keep the **SCCs (2021/914) in each DPA as the fallback** because the DPF faces a pending appeal (C-703/25 P). A one-page transfer note per vendor is RECOMMENDED, not required.

**Analysis.**
- Render: DPF-certified since 6 Jan 2025 (Render changelog); its DPA references the DPF and the 2021 SCCs. Sentry (Functional Software, Inc.): states DPF self-certification and offers an EU data region (chosen, D-111). Cloudflare: DPF-certified per its own statements (verify on the DPF list). ZeptoMail (Zoho): EU data centre, but Zoho group support may access from India (no adequacy), so SCCs in Zoho's DPA apply; verify. Google sign-in: Google is a separate controller; Google LLC is DPF-certified. Browser push services (Google, Apple, Mozilla, Microsoft) receive an encrypted payload (RFC 8291) with no names (D-119 (2)); they see only delivery metadata; name them as recipients.
- The General Court upheld the DPF in T-553/23 (3 Sep 2025). Appeal pending; if the Court of Justice annuls it, SCCs plus an assessment under EDPB Recommendations 01/2020 become necessary for US processors. The data volume and sensitivity here are low, encryption at rest is in place, and Sentry receives no user data (D-111), which keeps that fallback easy.
- HIBP: see C.10 (no personal data transferred).

**Sources.** GDPR Arts. 28, 44–46; [Decision (EU) 2023/1795](https://eur-lex.europa.eu/eli/dec_impl/2023/1795/oj); [SCC Decision (EU) 2021/914](https://eur-lex.europa.eu/eli/dec_impl/2021/914/oj); CJEU C-311/18 *Schrems II*; [DPF list](https://www.dataprivacyframework.gov/list); [Render DPF](https://render.com/changelog/render-achieves-certification-under-the-eu-us-data-privacy-framework), [Render DPA](https://render.com/dpa); [Sentry privacy](https://sentry.io/trust/privacy/); [Latombe appeal record](https://digitalpolicyalert.org/event/35459-latombe-filed-appeal-against-general-court-dismissal-of-challenge-to-european-unionunited-states-data-protection-framework-adequacy-decision-in-latombe-v-commission).

**Confidence.** High on the legal mechanism; medium on each vendor's current listing (checked through vendor pages, not the DPF list itself).

**Residual risk.** Low now; medium if C-703/25 P annuls the DPF (then a transfer note per vendor is needed within weeks).

**Gap against what is built.** No record that each DPA was accepted (Render, Cloudflare, Sentry, ZeptoMail are click-through or account-level). Vendors' DPF listings not verified on dataprivacyframework.gov.

**What the Privacy Policy and records must say.** Each processor, its role, location of storage, the transfer mechanism (DPF, SCCs fallback), and how to get a copy of the safeguards (Art. 13(1)(f)). Records: Art. 30(1)(d) and (e).

**Owner decision or action.** Check each vendor on the DPF list and save the DPA versions (PDF) in a private place outside the repo; accept DPF + SCC reliance (RECOMMENDED). Watch C-703/25 P.

**Free official channel.** Not needed.

---

## C.7 Cookie consent with strictly necessary cookies and cookieless analytics

**Question.** Is consent needed with only strictly necessary cookies and cookieless server-side analytics?

**Short answer.** **No banner is needed for what is built**: the session cookie, `gr_invite` (one day), `gr_join_adult` (session), the `gr-swipe` sessionStorage item and the service worker registered when a member turns on push are all "strictly necessary ... to provide the service explicitly requested". A cookie and storage notice is still needed (transparency, Art. 13). **"Cookieless" analytics is not automatically outside ePrivacy**: EDPB 2/2023 says collecting IP, user agent or other identifiers that the browser sends can be "gaining access". RECOMMENDED: if analytics are added, count events from the app's own database (answers per day, sign-ins), with no client script, no identifiers and no fingerprinting; then no terminal access happens at all.

**Analysis.**
- ZEK Art. 43(4) (current consolidated text): storage or access in the user's terminal equipment is allowed only with consent after "jasnu i potpunu obavijest ... osobito o svrhama obrade", but this "ne može spriječiti tehničku pohranu podataka ili pristup podacima isključivo u svrhu obavljanja prijenosa komunikacija ..., ili, ako je to nužno, radi pružanja usluga informacijskog društva na izričit zahtjev krajnjeg korisnika". Same as ePD Art. 5(3).
- EDPB 2/2023 v2.0: Art. 5(3) covers any "information", not only personal data (para 9–12); JavaScript that makes the browser send information is access (para 33); HTTP headers, user agent and IP can fall in scope when used to collect information (paras 42–43, 55); purely local use that never leaves the device is not access (para 44). The guidelines expressly do not decide exemptions (para 4, 56).
- The Digital Omnibus proposal included an exemption for aggregate audience measurement; it is pending and the Council mandate reportedly moves cookie rules back to ePrivacy. Not law as of today.
- Enforcement: AZOP enforces GDPR aspects; a 2019 HAKOM decision under the old ZEK found storing cookies without consent unlawful (secondary source). No 2025–2026 AZOP cookie guidance found.
- `gr-swipe` is set by our own script and read locally to animate the next page; it never leaves the device (para 44), and it serves the requested navigation. Low risk.

**Sources.** ePD Art. 5(3) ([EUR-Lex](https://eur-lex.europa.eu/eli/dir/2002/58/oj)); [ZEK consolidated](https://www.zakon.hr/z/182/Zakon-o-elektroni%C4%8Dkim-komunikacijama) Art. 43(4); [EDPB 2/2023 v2.0](https://www.edpb.europa.eu/system/files/documents/2024-10/edpb_guidelines_202302_technical_scope_art_53_eprivacydirective_v2_en_0.pdf); CJEU C-673/17 *Planet49*; [Hrčak paper on ZEK Art. 43(4)](https://hrcak.srce.hr/file/459843) (secondary).

**Confidence.** High for strictly necessary items; medium for any future analytics.

**Residual risk.** Low.

**Gap against what is built.** The cookie page is a placeholder. No inventory of storage items is published.

**What the cookie notice must say.** A table: name, set by, purpose, duration, strictly necessary (session; `gr_invite`; `gr_join_adult`; `gr-swipe`; service worker only after turning on push; no third-party cookies; fonts self-hosted). State that there is no analytics or advertising, and that a banner will appear if that ever changes.

**Owner decision or action.** Confirm "no client-side analytics" as the default (RECOMMENDED). Any client-side analytics later needs a consent banner and a survey.

**Free official channel.** AZOP enquiry only if client-side analytics are planned.

---

## C.8 Breach notification procedure and the Art. 30 template

**Question.** Breach notification procedure and the records of processing template.

**Short answer.** A short written procedure is needed now: **record every breach** (Art. 33(5)); **notify AZOP within 72 hours** of becoming aware unless "unlikely to result in a risk" (Art. 33(1)), in phases if facts are incomplete (Art. 33(4)); **tell affected members without undue delay** if the risk is high (Art. 34). **Records of processing are required**: the under-250 exemption (Art. 30(5)) does not apply because processing is not occasional.

**Analysis.**
- EDPB 9/2022 v2.0 (final) and the endorsed WP250: "aware" means reasonable certainty that a breach occurred; a short investigation is allowed. EDPB 01/2021 gives worked examples (ransomware, exfiltration, misdirected email) useful for a solo operator.
- Processors must tell the controller "without undue delay" (Art. 33(2)); check that each DPA says so.
- Breach communications to members must be plain, not downplay (EDPB 03/2022 paras 88–98: no "special categories" jargon, no blaming a processor).
- The owner is the only operator; the procedure must work for one person (OQ-06).
- Pending, not law: the Digital Omnibus would raise the notification threshold and lengthen the deadline. Plan for 72 hours.

**Sources.** GDPR Arts. 4(12), 30, 33, 34; [EDPB 9/2022](https://www.edpb.europa.eu/our-work-tools/our-documents/guidelines/guidelines-92022-personal-data-breach-notification-under_en); [EDPB 01/2021](https://edpb.europa.eu/system/files/2022-01/edpb_guidelines_012021_pdbnotification_adopted_en.pdf); [EDPB 03/2022](https://www.edpb.europa.eu/our-work-tools/our-documents/guidelines/guidelines-032022-deceptive-design-patterns-social-media_en) use case 2c.

**Confidence.** High.

**Residual risk.** Low once written; medium today (no procedure, no register).

**Gap against what is built.** No breach procedure, no breach register, no record of processing. Sentry alerts and the audit log exist as detection inputs.

**What the procedure must contain.** (1) Triggers (Sentry spike, audit anomalies, vendor notice, member report). (2) Contain (rotate secrets, revoke sessions, switch off flags). (3) Assess risk with the EDPB 01/2021 factors (type, volume, ease of identification, severity, special characteristics). (4) Clock: note the "aware" time; AZOP form within 72 h. (5) Members if high risk: email and in-app notice, plain language, what happened, likely consequences, what we did, what they can do, contact. (6) Register entry for every breach, including those not notified, with reasons. (7) Lessons and fixes.

**Records of processing template (Art. 30(1)).** Controller name and contact (once OQ-05 decides the legal form); per processing activity: purpose; categories of data subjects (members, invitees, DSA notifiers, people in artist photos, people in screenshots); categories of data; recipients (processors, push services, AZOP or authorities on request); transfers and safeguards; retention (the table below); general description of Art. 32 measures (TLS, encryption at rest, Argon2id, authz policy module, keyed IP hashes, least privilege, MFA for staff). Add, as good practice, the lawful basis and DPIA reference per activity.

**Owner decision or action.** Approve that Claude drafts the procedure and the register alongside the DPIA (RECOMMENDED).

**Free official channel.** AZOP publishes the breach notification form on azop.hr; AZOP can be asked whether a borderline incident needs notification.

---

## C.9 Privacy by default and deceptive design

**Question.** Is the neutral active choice for profile and Music DNA visibility compliant with GDPR Art. 25(2) and DSA Art. 25? Wording limits for benefits? Does storing "public" count as the individual's intervention? Is the D-021 notice enough? (The D-076 wall sub-question was withdrawn, D-085.)

**Short answer.** **Yes, defensible.** Art. 25(2) forbids making data accessible to "an indefinite number of natural persons" **without the individual's intervention**. A required step with nothing pre-selected, equal weight, and a member who must actively pick is that intervention. The built step is required and the column has no default (`visibility` nullable; a member who has not chosen is not onboarded and is hidden), so nothing is public by default. **Benefits may be described if equally factual for both options**; no emotional steering. The D-021 notice is acceptable if shown **before each answer** by a private-account member, in plain words, with the option not to answer.

**Analysis.**
- EDPB 03/2022 para 54/57: all options need not look the same, but "if controllers decide to highlight one option more than the other(s), the highlighted one needs to be the most restrictive". Para 49: a confirmation pop-up only for the private choice is *Longer than necessary*. D-030 complies with both.
- Para 43 and Annex 4.3.1 (*Emotional Steering*): wording that gives "a highly positive outlook, making users feel good, safe or rewarded", or a highly negative one, is unfair. Para 136: where a provider deviates from the most protective setting, users "need to know what the default setting is, that there are less invasive options available and where ... to make changes".
- Wording limits (RECOMMENDED): same length and tone for each option; each lists what others can see and who; benefits stated as facts ("others can find you through Discover"), consequences stated as facts ("any signed-in member can see your answers history"); no "most people choose", no exclamation marks, no social-proof counts, no imagery of crowds versus loneliness; say "you can change this any time in Privatnost" on both.
- DSA Art. 25 applies to online platforms; Art. 19 exempts micro and small enterprises (status in section B). GDPR fairness (Art. 5(1)(a)) covers the same ground anyway.
- D-021: a private profile signals a restrictive preference; making that member's answers visible to all members overrides it for one context. Fairness requires the member to know before posting (para 136 logic). A one-time notice risks being forgotten; a short line at every composer is safer.

**Sources.** GDPR Arts. 5(1)(a), 25(2); [EDPB 03/2022 v2.0](https://www.edpb.europa.eu/our-work-tools/our-documents/guidelines/guidelines-032022-deceptive-design-patterns-social-media_en) paras 43–49, 54–57, 136, Annex I; DSA Arts. 19, 25.

**Confidence.** High for the active choice; medium for D-021 (depends on how visible the notice is).

**Residual risk.** Low.

**Gap against what is built.** Verify in the 5.13 copy pass that the visibility texts meet the wording limits above and that the D-021 notice appears at every composer of a private-account member, not only once.

**What the Privacy Policy must say.** Who sees what by default (nothing until you choose), the private-account exception for Daily Drop answers and public-thread replies (D-020, D-021), and where to change it.

**Owner decision or action.** None beyond approving the wording check. Changing D-021 to followers-only would be a product change: **needs owner survey** only if the owner wants the safer option.

**Free official channel.** Not needed.

---

## C.10 Breached-password check (HIBP)

**Question.** Confirm that sending a 5-character SHA-1 prefix is no transfer of personal data; suggest wording.

**Short answer.** **Confirmed with high-medium confidence.** The first five hexadecimal characters of a SHA-1 hash are shared by roughly a thousand known passwords and by an unknown number of other strings; the request comes from our server, not the member's IP, and carries no email or account. HIBP cannot identify the member with means reasonably likely to be used, so for HIBP this is not personal data, and Chapter V does not apply. Mention it in the Privacy Policy anyway.

**Analysis.**
- Identifiability is judged from the recipient's means "reasonably likely to be used" (Recital 26; CJEU C-582/14 *Breyer*). CJEU C-413/23 P *EDPS v SRB* (4 Sep 2025) confirmed that pseudonymised data may not be personal data for a recipient who cannot re-identify. HIBP holds no key to link a prefix to anyone.
- On our side, computing the hash is processing of the password (personal data) under 6(1)(f) and Art. 32 (security of credentials).
- The monthly sign-in re-check is the same operation; the banner result is stored only as a flag.

**Sources.** GDPR Recital 26, Arts. 4(1), 32; CJEU C-582/14 (ECLI:EU:C:2016:779); CJEU C-413/23 P (4 Sep 2025); [HIBP API v3, Pwned Passwords](https://haveibeenpwned.com/API/v3#PwnedPasswords).

**Confidence.** Medium-high (strong reasoning, no ruling on this exact service).

**Residual risk.** Very low.

**Gap against what is built.** None in code (D-054). Policy wording missing.

**What the Privacy Policy must say (RECOMMENDED English draft, to be translated).** "When you set or change your password, and at most once a month when you sign in, our server checks whether it appears in known data leaks. We send only the first five characters of a one-way code (SHA-1 hash) of your password to the Have I Been Pwned service. Your password, your email address and your IP address are never sent, and the service cannot tell who asked. If your password is found, we ask you to choose another one when you set it, or recommend changing it when you sign in."

**Owner decision or action.** Approve the wording.

**Free official channel.** Not needed.

---

## C.11 Feedback screenshots

**Question.** Is "deleted when handled, at most 90 days" adequate, and what should the Privacy Policy say?

**Short answer.** **Adequate.** Screenshots can show other members' data, so short retention, team-only access and deletion on handling are the right measures. The open gap is the **message text**: today it is kept until the account is deleted. RECOMMENDED: delete feedback text 12 months after it is marked handled.

**Analysis.**
- People in a screenshot are data subjects whose data the team receives indirectly; Art. 14 information is given through the Privacy Policy under the disproportionate-effort exception (Art. 14(5)(b)), with the safeguard of short retention.
- Minimisation (Art. 5(1)(c)) and storage limitation (Art. 5(1)(e)) favour the 90-day cap. A screenshot showing another member's private content does not widen anyone's access beyond the team.
- If a screenshot reveals abuse, the member should use a report; staff should not turn feedback into evidence silently.

**Sources.** GDPR Arts. 5(1)(c), 5(1)(e), 14(5)(b); D-078, D-109 (6), D-118.

**Confidence.** High.

**Residual risk.** Low.

**Gap against what is built.** Screenshot upload waits for 5.11; its purge job must ship with it. No retention for handled feedback text.

**What the Privacy Policy must say.** "You can attach a screenshot to feedback. It may show other members' names or posts; only our team sees it, and we delete it when we have dealt with your message, at the latest 90 days after you sent it. The message itself is deleted 12 months after we close it, or when you delete your account." The upload screen should repeat the first sentence.

**Owner decision or action.** Approve the 12-month text retention (RECOMMENDED).

**Free official channel.** Not needed.

---

## Summary for the owner

| # | Short answer | Confidence | Owner action |
|---|---|---|---|
| C.1 | DPIA prudent now, required in practice before compatibility | Medium | Approve one DPIA before first invite; decide sensitive-genre handling |
| C.2 | Contract for core, legitimate interest for security, legal obligation for DSA; compatibility best as opt-in consent | High / medium | **Needs owner survey:** compatibility opt-in vs opt-out |
| C.3 | No Art. 22 decision as designed | High | Keep "no automated gating or sanctions" |
| C.4 | DM design adequate; content copy period proportionate; case records need a limit | Medium | Approve 3-year case records, 6-month notifier data |
| C.5 | Placeholders, 30-day grace and bounded backups are fine | High / medium | Approve 12-month audit retention, 30-day backup ceiling, restore re-purge |
| C.6 | DPF + SCC fallback is enough; watch C-703/25 P | High / medium | Verify DPF listings, save DPAs |
| C.7 | No banner for what is built; "cookieless" analytics is not automatically exempt | High / medium | Keep analytics server-side from own DB |
| C.8 | Procedure, register and Art. 30 records are required | High | Approve drafting with the DPIA |
| C.9 | Neutral active choice is compliant; wording limits apply | High / medium | Copy check in 5.13 |
| C.10 | HIBP prefix is not personal data for HIBP | Medium-high | Approve wording |
| C.11 | 90-day screenshot rule adequate; text needs a limit | High | Approve 12-month text retention |

## Proposed retention table (all RECOMMENDED unless marked built)

| Data category | Period | Legal basis | Source / reason |
|---|---|---|---|
| Account, profile, settings, Music DNA, answers, comments, reactions, follows, blocks, mutes, member images | Life of the account; purged 30 days after a deletion request (built) | 6(1)(b) | Art. 5(1)(e), 17; EDPB 03/2022 para 162 |
| Sessions | 30 days rolling (built); expired rows deleted within 7 days (verify Better Auth cleanup) | 6(1)(b), 6(1)(f) | Art. 5(1)(e) |
| Push subscriptions | With the session (built); dropped on 404/410 (built) | 6(1)(b) | D-117 |
| Activity entries | 30 days (built) | 6(1)(b) | D-103 (step 5.8) |
| Data copy (ZIP) | 24 hours (built) | 6(1)(c) | Arts. 15, 20 |
| Invitations (invitee email) | Delete 30 days after expiry or revocation; on acceptance keep only the link to the account | 6(1)(f) | Art. 5(1)(e); today kept indefinitely |
| Moderation content copy | Open case, then 90 days after decision or end of 183-day appeal window, whichever later (built) | 6(1)(c), 6(1)(f) | DSA Art. 20(1); Art. 17(3)(e) |
| Reports, cases, decisions, appeals (no content) | 3 years after the final decision, then anonymised | 6(1)(f), 17(3)(e) | ZOO Art. 230 (3-year subjective limitation) |
| DSA notices (notifier name, email) | 6 months after the outcome mail | 6(1)(c) | DSA Art. 16(5); minimisation |
| Evidence access log (DM and private content) | Same as the case record | 6(1)(f) | Accountability, Art. 5(2) |
| Audit log (pseudonymous id, keyed IP hash, user agent) | 12 months; staff moderation and admin actions with the case record | 6(1)(f) | Recital 49, Art. 32 |
| Rate-limit and lockout counters | Daily prune (built) | 6(1)(f) | Recital 49 |
| Completed deletion record (id, dates, no email) | 3 years | 6(1)(c)/(f) | Art. 5(2); restore re-purge ledger |
| Feedback screenshot | Until handled, max 90 days (decided, D-118) | 6(1)(f) | Art. 5(1)(c) |
| Feedback text | 12 months after handled, or account deletion | 6(1)(f) | Art. 5(1)(e) |
| Sentry error events | Plan retention, at most 90 days (verify setting) | 6(1)(f) | Art. 32 |
| Render and ZeptoMail logs | Provider retention (verify; note in records) | 6(1)(f) | Art. 28 |
| Database backups (PITR and off-system dump) | At most 30 days | 6(1)(f) | Art. 32(1)(c); restore re-applies purges |
| Artist photos (people in Wikimedia images) | While the artist is in the catalogue; refreshed every 30 days (D-118); hidden photos stay hidden | 6(1)(f) | Art. 14(5)(b) |
| Alpha data carried to the beta | As account data (D-119 (5)) with a 30-day notice | 6(1)(b) | Art. 13(3) |

## Concrete product gaps

1. **Privacy Policy and cookie page are placeholders** (`src/app/[locale]/legal/[doc]/page.tsx`); Art. 13 information must exist before the first invite.
2. **Invitation email has no Art. 14 notice** (`src/lib/onboarding/invite-mail.ts`): add who we are, why we have the address, the 14-day validity, deletion after expiry, and a Privacy Policy link.
3. **No audit-log retention** (no job in `src/worker.ts`).
4. **No retention for invitations** of people who never joined.
5. **No retention for reports, cases, decisions, appeals and DSA notifier data** (only the content copy is purged).
6. **No retention for handled feedback text**; the screenshot purge must ship with the screenshot in 5.11.
7. **No DPIA, no records of processing, no breach procedure or register.**
8. **DPAs and DPF listings not recorded** for Render, Cloudflare, Sentry, ZeptoMail.
9. **Restore runbook lacks a re-purge step**; off-system dump status to verify.
10. **Expired sessions cleanup** to verify (Better Auth).
11. **ONB-03 inaccurate claim** about reading languages in "Za tebe" (D-109 (9)).
12. **Before compatibility ships:** opt-in or opt-out switch with Art. 21 wording, sensitive-genre rule, DPIA section.
13. **Before DMs ship:** reporter-selected messages plus fixed context, `EvidenceAccess` per view, no DM text in logs, Sentry, push or Activity.
14. **D-021 notice visibility** at every composer for private-account members (5.13 copy check).
15. **Privacy contact** for rights requests (including suspended and banned members, D-109 (7)) must be named in the Privacy Policy once OQ-05 settles the legal entity.
