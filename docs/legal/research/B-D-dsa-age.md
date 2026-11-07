# Legal research: B (DSA) and D (age)

- **Date:** 2026-11-07
- **Scope:** `docs/legal/questions-for-counsel.md` sections B.1–B.5 and D.1–D.3.
- **Status:** Prepared by Claude under D-123. This is research, not legal advice; the owner decides and carries the residual risk.
- **Labels:** every recommendation is RECOMMENDED, not decided. Points that touch a strict Master Prompt rule (18+, invite-only) are marked **needs owner survey**.

## How the sources were checked (2026-11-07)

- **DSA text:** Regulation (EU) 2022/2065, read on EUR-Lex (OJ L 277, 27.10.2022): recitals 13, 14 and 56, and Articles 3, 11, 12, 14–20, 23, 24, 28 and 53. No amending act was found. The Commission's Article 91 review is in progress, and no adopted change affects small providers. → <https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32022R2065>
- **Croatian implementing act:** *Zakon o provedbi Uredbe (EU) 2022/2065* (NN 67/2025), in force since 17 April 2025, read on Narodne novine. The zakon.hr consolidated page lists no amendments. → <https://narodne-novine.nn.hr/clanci/sluzbeni/2025_04_67_857.html>
- **HAKOM notification notice:** published 29 July 2025 (e-Pružatelj DSA). → <https://www.hakom.hr/hr/informacija-o-nacinu-podnosenja-obavijesti-o-pruzanju-usluga-posredovanja/12197>
- **Commission Art. 28 guidelines:** OJ C/2025/5519, adopted 14 July 2025. The Commission page was last updated 22 April 2026, and no revised text was found. Paragraph 92 says the guidelines are reviewed "at the latest after a period of 12 months", so a revision may appear soon. → <https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=OJ:C_202505519>
- **Art. 18 contact points:** the Commission's list (list updated 25 September 2026, page updated 6 October 2026) and the Board's *Good practices … under Article 18 DSA* (adopted 25 September 2026). → <https://digital-strategy.ec.europa.eu/en/library/points-contact-notifying-suspected-criminal-offences>, <https://digital-strategy.ec.europa.eu/en/library/european-board-digital-services-adopts-good-practices-notify-suspected-criminal-offences-under>
- **EU age verification and the EU KIDS Act:** the age verification solution became "feature ready" on 15 April 2026. The EU KIDS Act is a Commission proposal of 17 September 2026 and is not law. → <https://digital-strategy.ec.europa.eu/en/policies/eu-age-verification>, <https://digital-strategy.ec.europa.eu/en/news/eu-kids-act-restrict-social-media-platforms-access-children-eu>
- **Croatian digital consent age:** *Zakon o provedbi Opće uredbe o zaštiti podataka* (NN 42/18), Art. 19, read on zakon.hr (database updated 5 November 2026). → <https://www.zakon.hr/z/1023/Zakon-o-provedbi-Op%C4%87e-uredbe-o-za%C5%A1titi-podataka>
- **Code compared:** `src/components/legal/notice-form.tsx`, `src/lib/legal/notice.ts`, `src/lib/moderation/rules.ts`, `src/lib/data/moderation.ts` (`NOTIFIER_MAIL`, `tellEveryone`), `src/components/safety/notice-view.tsx`, `src/lib/onboarding/{actions,cookies}.ts`, the database schema and `messages/en.json`.
- **Earlier research:** `docs/research/2026-11-01-legal-platform-facts.md` is confirmed on the Art. 19 exemption, Art. 15(2) and the consent age of 16. It is superseded on three points: (a) Croatia now has an implementing act and a mandatory HAKOM notification; (b) the Art. 18 contact point is now published; (c) the EU KIDS Act proposal and the EU age verification app are new.

---

## B.1 Online platform or only a hosting service?

**Question.** With a human-curated invite gate, is GrooveRift an "online platform" (Art. 3(i), recital 14) or only a hosting service? Does this change with member invite quotas?

**Short answer.**
- **Content visible only to members:** while staff hand-pick every invitee, this content is very likely **not** "disseminated to the public".
- **Public parts:** the public profile (PUB-08: name, handle, avatar and bio, visible to signed-out visitors) **is** user content disseminated to the public. This makes GrooveRift an online platform for those parts.
- **Practical effect:** because of the Art. 19 exemption (B.2), the label changes little today.
- **Member invite quotas:** these keep a human selection, but the argument weakens as invitations become easy and plentiful.

**Analysis.**
- **Definitions.** Art. 3(i) defines an online platform as a hosting service that "stores and disseminates information to the public" at the request of a recipient. Art. 3(k) defines dissemination to the public as making information available "to a potentially unlimited number of third parties".
- **Recital 14** says: "where access to information requires registration or admittance to a group of recipients of the service, that information should be considered to be disseminated to the public only where recipients of the service seeking to access the information are automatically registered or admitted without a human decision or selection of whom to grant access."
- **Staff invitations.** A staff member decides on each invitee, so the members-only answers, comments and Music DNA fit the recital's carve-out.
- **Public profiles.** These are reachable without any gate. The public bio is information provided by the member and shown to anyone at the member's request. That is dissemination to the public.
- **The "ancillary feature" exception.** Art. 3(i) also excludes a "minor and purely ancillary feature" that cannot be used without the principal service. A public profile page is arguably part of the core social service, not an ancillary feature, so the exception should not be relied on.
- **DMs.** Recital 14 places interpersonal communication (private messaging between a finite number of people chosen by the sender) outside the online-platform definition. DMs remain hosting.
- **The Daily Drop share view (PUB-07)** shows only editorial content, which is not recipient-provided, so it is not relevant.
- **Member invite quotas.** The recital requires "a human decision or selection" and does not say whose decision it must be. A member choosing whom to invite is still a human selection. A supervisor could still look at substance: many members, generous quotas, shareable links or invitations traded publicly make the audience "potentially unlimited" in practice (Art. 3(k)).
- **Public launch.** Open sign-up would end the recital 14 argument completely.

**Sources.** DSA Art. 3(g)(iii), (i), (k); recitals 13 and 14 (EUR-Lex link above).

**Confidence.** Medium. The wording of recital 14 is clear. No Commission guidance or case law applies it to invitation gates, and the public profile pushes the answer towards "online platform" anyway.

**Residual risk.** Low while the service is a micro or small enterprise: the Section 3 platform duties do not apply (B.2), and Arts. 11–18 apply to every hosting service anyway. The label starts to matter only after the enterprise grows beyond small (with 12 months' grace) or if the EU KIDS Act is adopted with platform duties for small providers.

**Gap against what is built.** None. The product already meets most platform-level duties voluntarily: internal appeal (Art. 20), statement of reasons and no dark patterns.

**Owner decision or action.**
- RECOMMENDED: treat GrooveRift as an online platform for planning purposes. It is the safer reading and costs almost nothing extra.
- **Needs owner survey** (invite-only rule): when member invite quotas are designed, keep each invitation single-use, tied to a named invitee, limited in number and revocable. This keeps "human selection" real.

**Free official channel.** HAKOM, the Croatian Digital Services Coordinator (written question; see the contact page <https://www.hakom.hr/hr/akt-o-digitalnim-uslugama/11632>).

---

## B.2 Micro or small enterprise status and the Art. 19 exemption

**Question.** Is GrooveRift a micro or small enterprise, and therefore exempt under Art. 19?

**Short answer.** Yes, it is a **micro** enterprise: one person and no turnover. Section 3 (Arts. 19–28, which includes Art. 28 on minors) does not apply, except Art. 24(3). The Art. 15 transparency report does not apply either (Art. 15(2)).

The exemption does **not** cover:
- Arts. 11–18 (contact points, terms, notice and action, statement of reasons, reporting crimes);
- the Croatian HAKOM notification (national Art. 23).

**Analysis.**
- **Exemption text.** Art. 19(1) excludes Section 3 for platforms "that qualify as micro or small enterprises as defined in Recommendation 2003/361/EC", except Art. 24(3). If the status is lost, the exemption runs for 12 more months. Art. 19(2) applies Section 3 to VLOPs (45 million users) regardless of size.
- **Thresholds** (Recommendation 2003/361/EC, Annex, Art. 2):
  - micro: fewer than 10 staff and an annual turnover or balance-sheet total of at most €2 million;
  - small: fewer than 50 staff and at most €10 million.
  - Partner and linked enterprises (holdings of 25% or more) count towards the totals. This matters only if the owner holds other businesses.
- **What Art. 24(3) requires.** On request, give HAKOM and the Commission the average monthly active recipients, without personal data, with the method used.
- **Croatian notification (NN 67/2025, Art. 23).** Every intermediary service provider "established" in Croatia must notify HAKOM. HAKOM opened the e-Pružatelj DSA system on 29 July 2025 and set a deadline of 29 October 2025. Failure to notify is a misdemeanour: Art. 18(1) item 13, a fine of €6,630–66,360 for a legal person or €1,320–6,630 for a sole trader or responsible person. The notification is not a condition for providing the service (Art. 23(3)). The act and HAKOM's notice do not say how a provider that starts after the deadline should file. The safe reading is: file before the first invitation.
- **Nuance (low weight).** The DSA applies to "information society services", normally provided for remuneration. A purely non-economic hobby service might arguably fall outside, but GrooveRift plans premium, so this argument should not be relied on. Section A.4 (another research file) covers the legal-form side.

**Sources.**
- DSA Art. 15(2), 19, 24(3), 29.
- Recommendation 2003/361/EC.
- NN 67/2025 Arts. 18, 23.
- HAKOM notice of 29 July 2025 (links above).

**Confidence.** High on micro status and the exemption's scope. Medium on how a late or new HAKOM notification is treated.

**Residual risk.**
- Low for the exemption itself.
- Moderate but easy to remove for the HAKOM notification: it is a fineable formality and simple to do.

**Gap against what is built.**
- There is no way yet to compute the "average monthly active recipients" required by Art. 24(3) on request. Small, can wait until beta.

**Owner decision or action.**
- RECOMMENDED: file the HAKOM notification via e-Pružatelj DSA before the first invitation, once the legal form is settled (A.1). This creates an external account, so it needs owner approval.
- RECOMMENDED: write down the micro-status facts (staff, turnover, no holdings) in the decision log once a year.

**Free official channel.** HAKOM (e-Pružatelj DSA and phone +385 1 700 7007, as published on the notice page).

---

## B.3 Minimum content: Art. 11/12 contact points, Art. 14 terms, Art. 16 notice and action, Art. 17 statement of reasons

**Question.** What must the Art. 11/12 contact points, the Art. 14 terms, the Art. 16 notice-and-action flow and the Art. 17 statement of reasons contain at minimum?

**Short answer.** The notice form and the statement of reasons cover most of the law already. Five concrete gaps remain:
1. no confirmation of receipt to the notifier;
2. no redress information in the notifier's decision mail;
3. no legal ground in statements about illegal content;
4. no mention of judicial redress in the statement of reasons;
5. the published contact points do not exist yet.

**Analysis.**

**Art. 11 (authorities) and Art. 12 (recipients).** A single electronic point of contact is needed for each; one address may serve both.
- It must be public, easy to find and kept current (Art. 12(2)).
- For Art. 11, publish the languages accepted: Croatian, the official language where GrooveRift is established, plus English (Art. 11(3)).
- For Art. 12, members must be able to choose a means of contact that does not rely solely on automated tools (Art. 12(1)). An e-mail address plus the in-app feedback form satisfies this.
- Failing to designate either contact point is a misdemeanour (NN 67/2025 Art. 18(1) items 6–7).

**Art. 14 (terms).** The terms must state:
- the restrictions on use (what content and behaviour is prohibited, including 18+ and the human-created content rule);
- the moderation policies, procedures, measures and tools, "including algorithmic decision-making and human review";
- the rules of procedure of the complaint system. GrooveRift has one: an appeal within 183 days, reviewed by a different person where possible, and by an admin with a warning when the owner is the only reviewer.

The terms must be in clear, plain, unambiguous language and publicly available in an easily accessible, machine-readable format (an HTML page is fine) (Art. 14(1)). Members must be told of significant changes (Art. 14(2)). Moderation must be applied diligently, objectively and proportionately (Art. 14(4)).

Two items are RECOMMENDED although Art. 23 does not bind a micro platform:
- the graduated sanctions policy (warning → restriction → suspension → ban);
- the rule on manifestly unfounded notices.

**Art. 16 (notice and action).**

| Requirement | Article | PUB-11 today |
|---|---|---|
| Easy to access, electronic only, open to anyone | 16(1) | Met: public, works without an account, linked from the landing |
| Substantiated explanation | 16(2)(a) | Met: "Why is the content illegal?" (5,000 characters) |
| Exact electronic location (URL) | 16(2)(b) | Met: URL required; extra URLs go in the explanation |
| Notifier's name and e-mail, optional for child sexual abuse offences (Dir. 2011/93/EU Arts. 3–7) | 16(2)(c) | Met: optional only when "csam" is chosen |
| Statement of good-faith belief | 16(2)(d) | Met: checkbox with matching wording |
| **Confirmation of receipt** to the notifier's electronic contact, without undue delay | 16(4) | **Gap:** only an on-screen "Report received" |
| Decision without undue delay, **with redress possibilities** | 16(5) | **Partial:** the decision mail exists; "reply to this message" is the only route offered |
| Say whether automated means were used | 16(6) | Met: "a person decided, without automated decision-making" |

In-app reports for illegal content (hate, threat, private data, minor) are also Art. 16 notices when they concern illegal content. They meet 16(2) except (d), because the reporter is a known member. The "received" step and "Moje prijave" give the receipt and the outcome, but no redress information.

**Art. 17 (statement of reasons).** It is required for removal, visibility restriction, suspension, termination and account suspension, if the member's e-mail is known (Art. 17(1)–(2)). Required content, Art. 17(3), against SAFE-05:

| Item | Article | SAFE-05 today |
|---|---|---|
| The decision, its territorial scope and its duration | 17(3)(a) | Met for the decision and duration. Territorial scope is not stated (it is everywhere; a one-liner fixes this) |
| Facts and circumstances, and whether the decision followed an Art. 16 notice or GrooveRift's own initiative | 17(3)(b) | Met: "How it was decided" names the source, and the free-text statement gives the facts |
| Use of automated means | 17(3)(c) | Met |
| **For illegal content: "a reference to the legal ground relied on"** and why the content is illegal on that ground | 17(3)(d) | **Gap:** only the rule "Nothing illegal", with no field for the legal provision |
| Contractual ground and explanation | 17(3)(e) | Met: the Community Guidelines rule plus the statement |
| **Redress: internal complaint, out-of-court dispute settlement and judicial redress** | 17(3)(f) | **Partial:** the internal appeal is there; judicial redress is not |

Out-of-court dispute settlement (Art. 21) sits in Section 3 and does not bind a micro platform, so it can be left out or worded as "not available".

The right to complain to the Digital Services Coordinator (Art. 53, which applies to all intermediary services) is RECOMMENDED for the statement too. For members located in Croatia, that is HAKOM.

Failing Arts. 16 or 17 is fineable in Croatia (NN 67/2025 Art. 18(1) items 11–12).

**Sources.** DSA Arts. 11, 12, 14, 16, 17, 21, 23, 53; NN 67/2025 Art. 18(1).

**Confidence.** High. These are the plain wording of the articles and were compared line by line with the code and the copy.

**Residual risk.** Low after the gaps are closed. The moderation copy retention (90 days after the decision, or the end of the appeal window) is not set by the DSA. GDPR covers it (section C).

**Gap against what is built.**
1. **Receipt mail (16(4)).** When a PUB-11 notice includes an e-mail, send a bilingual confirmation of receipt at once. It should give the date, the category, the URL and "a person will review it". It must not repeat the explanation text.
2. **Notifier decision mail (16(5)).** Replace "If you disagree, reply to this message" with redress information:
   - the notifier may reply to ask for a re-review;
   - they may take the matter to the competent court;
   - they may complain to the Digital Services Coordinator (HAKOM, or the coordinator where they live).

   Optionally state the ground in one line.
3. **Statement of reasons, legal ground (17(3)(d)).** When the rule is "illegal" or the decision rests on illegality, require a "Legal ground" field: the law and article, for example *Kazneni zakon* čl. 325. Show it in SAFE-05 and in the admin decision form (ADM-10).
4. **Statement of reasons, redress (17(3)(f)).** Add a fixed line under "Appeal": "You can also go to court. You can complain to the Digital Services Coordinator (in Croatia: HAKOM)." Keep it even when the decision "can't be appealed" internally.
5. **Statement of reasons, scope (17(3)(a)).** Add "Applies everywhere GrooveRift is available."
6. **In-app reports (SAFE-01/04).** Add the same redress line to the reporter's outcome ("thanksAction"/"thanksNone").
7. **Contact points.** The contact page is a placeholder ("published before the first invitations"). Publish one address with "for members and for authorities (DSA Art. 11 and 12)", the languages "hrvatski, English", and the feedback form as a second channel.
8. **Terms (Art. 14).** The legal pages are drafts. The ToS must include the moderation section (human review only, no automated decisions, the sanctions ladder, the appeal rules with 183 days, response targets) and the 18+ rule with how it is enforced.

**Owner decision or action.**
- RECOMMENDED: build items 1–7 in step 5.13.
- RECOMMENDED: choose the published contact address (a role address, not a personal one).

**Free official channel.** HAKOM.

---

## B.4 Art. 18: suspected serious crime, the process and the Croatian authority

**Question.** What is the process under Art. 18, and which Croatian authority receives the notification?

**Short answer.**
- **Duty:** when GrooveRift becomes aware of information that gives rise to a **suspicion** of a criminal offence involving a threat to someone's life or safety, it must **promptly** tell the police of the Member State concerned and hand over all relevant information it holds. Certainty is not required.
- **Croatian contact point** (the Commission's list, updated 25 September 2026): **Ravnateljstvo policije – Služba terorizma, poctco@mup.hr**.
- **Imminent danger:** call **112 or 192** first.
- **Unclear Member State:** notify Croatia (the country of establishment) and/or Europol.

**Analysis.**
- **The duty.** Art. 18(1) applies to every hosting service. The micro exemption does not apply.
- **"Member State concerned"** (Art. 18(2)) means where the offence happened or may happen, where the suspected offender is, or where the victim is. If none can be identified "with reasonable certainty", notify the Member State of establishment and/or Europol.
- **Board good-practice document (25 September 2026):**
  - A mere suspicion after a diligent human assessment is enough.
  - Typical offences: killing, bodily injury, sexual abuse of children and child sexual abuse material, grooming, sextortion, trafficking, terrorism, public incitement to violence or hatred, non-consensual intimate images, cyber-stalking. The list is not exhaustive.
  - If several Member States are concerned, notify each and say who else was told.
  - Terrorist content with an imminent threat goes under the TCO Regulation, Art. 14(5), instead.
  - Preserve the evidence.
- **What to send (Board list).**
  - Always: the content and its URL; whether the threat is imminent; a short assessment.
  - Where relevant: account identifiers, the e-mail, IP addresses and timestamps in UTC, and the account history.
- **Limits.** Recital 56 says the DSA gives no legal basis for profiling users to find crimes. Share only what is relevant, which is also required by GDPR (section C).
- **Croatian fines.** The misdemeanour list in NN 67/2025 Art. 18 does not name DSA Art. 18. HAKOM can still use its Art. 51 DSA powers.
- **Child sexual abuse material.** Croatian police also run the "Red Button" reporting form (gov.hr, "Zaštita djece na internetu"). The DSA channel for a provider is still the contact point above.

**Process RECOMMENDED for a one-person team.**
1. Triage. The priority-0 categories (threat, minor, CSAM) are already reviewed first. If the threat is imminent, call 112 or 192 at once.
2. Make sure the moderation copy and the case are not purged. Retention already holds them while the case is open.
3. Disable access to the content when it is illegal, and record the case.
4. E-mail poctco@mup.hr. The subject should be "DSA čl. 18 – obavijest o sumnji na kazneno djelo". Include the URL, the content or a screenshot, timestamps in UTC, the assessment and whether the threat is imminent, and the account identifiers held. Name any other authority notified. For a victim or offender clearly in another EU country, use that country's contact point from the Commission list.
5. Write an audit entry that says what was sent, to whom and when. The audit entry must not contain the content.
6. Issue the Art. 17 statement of reasons as usual. The DSA has no tipping-off exception, so keep it factual and do not mention the police notification unless the police ask otherwise. This point is low confidence: ask the police contact point if in doubt.

**Sources.**
- DSA Art. 18 and recital 56.
- Commission contact-point list and Board good practices (links above). The PDF was downloaded and read: <https://ec.europa.eu/newsroom/dae/redirection/document/132840>
- NN 67/2025 Art. 18.
- Red Button: <https://www.gov.hr/hr/zastita-djece-na-internetu/1236>

**Confidence.**
- High on the duty and the contact point; both come from current official lists.
- Medium on what to share and on not mentioning the notification in the statement of reasons.

**Residual risk.**
- Low to moderate. With one person, the main risk is a missed or late notice when the owner is offline.
- Over-reporting is also a GDPR risk: sharing more than is relevant.

**Gap against what is built.**
- No "Art. 18 notified" step or record exists in ADM-10. RECOMMENDED: a staff-only case flag "Prijavljeno policiji (DSA čl. 18)" with date and recipient, stored without the content. It keeps the case from being purged until it is cleared.
- No one-page procedure exists in the admin help. RECOMMENDED: the steps above, the contact e-mail and 112/192.

**Owner decision or action.**
- RECOMMENDED: approve the procedure.
- Decide whether "moderation copy kept while a case is open" also covers a case flagged for Art. 18 until the police confirm receipt.

**Free official channel.** The MUP contact point above. Ask it for a template or confirmation; this is a public authority, but contacting it is the owner's call. HAKOM can also answer questions.

---

## B.5 Is the public notice form at `/legal/notice` (PUB-11) sufficient?

**Question.** Is the public notice form at `/legal/notice` (PUB-11), which works without an account, sufficient? Which fields and confirmations are required?

**Short answer.** Yes for the **fields**: all four Art. 16(2) elements are there, and the child sexual abuse exception is implemented correctly. It is **not yet sufficient for the follow-up**: it lacks the receipt confirmation (16(4)) and the redress information (16(5)) described in B.3. A few RECOMMENDED refinements for copyright and photo notices follow.

**Analysis.**
- **Access.** Art. 16(1) requires a mechanism that is "easy to access, user-friendly" and electronic, and open to "any individual or entity". PUB-11 is public, bilingual and linked from the landing and from the "O fotografiji" sheet (D-121).
- **Rate limit.** The limit per network ("Too many reports … try again in an hour") is acceptable. Keep it generous so a rights holder with several items is not blocked; the explanation can carry several URLs.
- **Required name and e-mail.** Requiring them for categories other than child sexual abuse matches Art. 16(2)(c). A notice without them is still a valid tip, just one without the "actual knowledge" effect of Art. 16(3).
- **Copyright** has no special DSA fields. DSM Art. 17 and the Copyright Act are section E. In practice, a substantiated copyright notice must identify the work and say that the notifier is the right holder or acts for one. Today only the general explanation field covers this.
- **Notices that match no object** (an outside URL or a malformed URL) correctly become their own case and are recorded with "no breach" or a note.

**Sources.** DSA Art. 16(1)–(6) and Art. 17(3)(b) (EUR-Lex). Code: `notice-form.tsx`, `src/lib/legal/notice.ts`.

**Confidence.** High.

**Residual risk.** Low once the B.3 items 1–2 are built.

**Gap against what is built.**
1. Receipt mail (B.3 item 1).
2. Redress in the decision mail (B.3 item 2).
3. RECOMMENDED: when "Copyright" is chosen, add help text and an optional pair of fields: "Which work?" and "Are you the right holder or acting for one?". When the form opens from "O fotografiji", say what the photo is and that the notifier may be its author or the person shown.
4. RECOMMENDED: a short line under the form on what happens next ("A person reviews it; we e-mail you a confirmation and the decision; we do not tell the person you report who you are, unless the law requires it"). The last part reflects Art. 17(3)(b): the notifier's identity is disclosed only where strictly necessary.

**Owner decision or action.** RECOMMENDED: approve items 1–4 for step 5.13.

**Free official channel.** HAKOM.

---

## D.1 Is 18+ self-declaration with a human invite gate defensible? What changes at public launch?

**Question.** Is 18+ self-declaration plus a human invite gate defensible for alpha and beta, and what changes at public launch?

**Short answer.**
- **Alpha and beta:** yes, defensible while GrooveRift is a micro or small enterprise. Art. 28 and the Commission guidelines do not apply (Art. 19; guidelines para. 8). Croatia has no statutory minimum age for social media; it is debated, not enacted.
- **The real safeguard** is the human gate: staff invite people they know.
- **When it changes:**
  - leaving small-enterprise status, after 12 months' grace;
  - adoption of the EU KIDS Act proposal in a form that covers small providers;
  - plans for growth beyond invitations, where the regulator's direction is unambiguous.
- **What the guidelines say** for adult-only platforms: self-declaration is "not appropriate" (para. 52); a ban in the terms alone does not take a platform out of scope (para. 6); age verification fits where the terms require 18+ (para. 37(b)).

**Analysis.**
- **DSA.** Art. 28(1) requires a high level of privacy, safety and security for minors on platforms accessible to them. Art. 28(3) adds no duty to process extra data to find out who is a minor. Section 3 does not apply to a micro platform (Art. 19(1)).
- **Guidelines, 18+ platforms:**
  - para. 6: an 18+ platform with "no effective measures" is still "accessible to minors";
  - para. 29(a): defines self-declaration, including "clicking a button";
  - para. 51: easily circumvented methods are not adequate, and adult-only platforms should prevent the sharing of credentials;
  - para. 52: self-declaration "does not meet … robustness and accuracy".
- **Croatia.** AZOP is the competent authority for DSA Arts. 27–28 (NN 67/2025 Art. 7), so AZOP is also the free channel here.
- **GDPR and Croatian law.** The digital consent age is 16 (Art. 19 of the Croatian GDPR implementing act; it applies to children resident in Croatia and to consent-based processing only). GrooveRift does not offer the service to children, so Art. 8 GDPR is not engaged by design. It becomes relevant only if a minor slips through: see D.3.
- **Human gate, today.** A staff invitation is a human decision about a known person. It is a stronger safeguard than the button and should be recorded as part of the age policy.
- **Human gate, with member quotas.** The safeguard weakens to "a member vouched".
- **What changes at public launch (RECOMMENDED path):**
  - **EU age verification solution.** "Feature ready" since 15 April 2026. It proves "18+" without other data, and EUDI wallets are due in every Member State by the end of 2026 (guidelines para. 42; Commission age-verification page). This makes real 18+ verification cheap and privacy-preserving.
  - **EU KIDS Act** (proposal of 17 September 2026):
    - minimum age 15 for an own account;
    - no accounts under 13;
    - safety by design, with the burden of proof on providers.
    - Commentary reports **no SME exemption**. This is unconfirmed in the official text and still a proposal.
    - It would not lower GrooveRift's 18+ rule, but it could bring age-assurance duties regardless of size.

**Sources.**
- DSA Arts. 19, 28.
- Guidelines OJ C/2025/5519, paras. 6, 8, 29, 37, 39, 42–44, 51, 52, 92.
- NN 67/2025 Art. 7.
- NN 42/18 Art. 19.
- Commission age-verification and KIDS Act pages (links above).
- A Croatian news search found only proposals for a national minimum age (e.g. tportal, 17 June 2026); no bill was found.

**Confidence.**
- High that Art. 28 and the guidelines do not bind a micro platform now.
- Medium on the KIDS Act scope (proposal, secondary sources).
- Medium that no Croatian minimum-age law exists (absence is harder to prove).

**Residual risk.**
- **Legal risk:** low while micro or small and invite-only.
- **Reputational and safety risk:** a minor gets in through a member invitation. This is mitigated by D.3.
- **Regulatory direction:** strongly towards verification for 18+ services.

**Gap against what is built.**
- The age policy (the attestation plus the human gate) is not written in the ToS or the privacy policy yet.
- See D.2 for the stored record.

**Owner decision or action.**
- **Needs owner survey** (18+ rule): adopt the EU age verification solution (or an EUDI wallet "18+" check) as the gate **before** open registration or a wide beta with member invitations, even while exempt.
- RECOMMENDED: re-check the Art. 28 guidelines (the review was due by July 2026) and the KIDS Act at each phase boundary.

**Free official channel.** AZOP (competent for DSA Art. 28 in Croatia, and for GDPR); HAKOM.

---

## D.2 Can we avoid storing date of birth?

**Question.** Can GrooveRift avoid storing date of birth?

**Short answer.** Yes. No law requires a date of birth. Data minimisation favours **not** storing it. The DSA does not oblige providers to collect extra age data (Art. 28(3)). The guidelines say age checks should not lead to storing "personal data beyond information about the user's age group" (para. 39).

The current build may store **too little** for accountability: the "yes, 18+" answer lives only in a short-lived cookie, and nothing is written to the account.

**Analysis.**
- **GDPR.** Art. 5(1)(c) (data minimisation) and Art. 25 (privacy by design) point against a date of birth. Art. 5(2) (accountability) means GrooveRift should be able to show that each member attested to being an adult, under which wording and when.
- **What is built.** The onboarding stores nothing about a "no" answer, which is correct (J1 E5). The "yes" cookie is deleted after sign-up (`clearJoinCookies`), and no attestation or terms-acceptance field was found in the schema.
- **Minimal fix.** A timestamp and a copy version on the user record, not a date of birth.

**Sources.** DSA Art. 28(3); guidelines paras. 39, 49(d); GDPR Arts. 5, 25.

**Confidence.** High.

**Residual risk.** Low.

**Gap against what is built.**
- RECOMMENDED: persist `adult_attested_at` (timestamp) and `adult_attestation_version` (which wording was shown) when the account is created, from the cookie.
- RECOMMENDED: likewise `terms_accepted_at` and `terms_version` once the ToS exists. This overlaps sections C and F.
- No date of birth, no age and no document.

**Owner decision or action.** RECOMMENDED: approve "attestation record, no date of birth" (this closes OQ-10 together with D.1 and D.3).

**Free official channel.** AZOP.

---

## D.3 Procedure when a minor is reported

**Question.** What should happen when someone reports that a member is under 18?

**Short answer.** Treat the report as priority, which is already built. Then:
1. Assess it as a person.
2. If the report is credible, **suspend first** and give the member a fair chance to answer.
3. If the member is likely a minor, **close the account and erase the personal data** instead of a punitive "ban" that keeps the data. Issue a neutral statement of reasons.
4. Escalate to the police under Art. 18 only when there are signs of sexual exploitation, grooming or danger.

**Analysis.**
- **Building blocks that already exist:**
  - report category `minor` (priority 0), mapped to the rule "Adults only";
  - PUB-11 "csam" (priority 0);
  - suspension keeps sign-in so the member can read the reasons and appeal.
- **What the law adds:**
  - **Statement of reasons (Art. 17).** Still required. Wording should be non-shaming ("GrooveRift is for adults; based on information we received, we closed the account").
  - **Appeal (Art. 20 good practice).** Lets an adult who was wrongly reported say so. Any proof of age requested should be the minimum (for example, showing an EU age-verification "18+" proof once available), checked and **not kept** (guidelines para. 49(d)).
  - **GDPR.** A minor's data has no sound basis once GrooveRift knows the user is a minor: the contract is with an adult only, and consent under 16 needs a parent (Croatian Art. 19). Erase it, keeping only the moderation case record for the appeal period (the existing moderation retention rule).
  - **Art. 18.** Sexual content involving a minor, grooming or sextortion is the Board's own example list, so notify promptly (B.4). Preserve the evidence and do not share it further.
  - **Minors' support.** The guidelines recommend referring minors to national support lines (section 7.2). In the closing message, a line pointing to the Croatian children's helpline (116 111) is RECOMMENDED. The number should be verified before use; medium confidence.
- **Invite source.** With member quotas, look at who invited the account. If an inviter repeatedly invites minors, apply the sanctions ladder to the inviter.

**Sources.** DSA Arts. 17, 18, 20; guidelines paras. 49(d), section 7.2; GDPR Arts. 6, 8, 17; NN 42/18 Art. 19; Board Art. 18 good practices.

**Confidence.** Medium. The steps follow from the cited articles, but no source sets a procedure for a micro 18+ platform.

**Residual risk.** Low to moderate:
- wrongly closing an adult's account, mitigated by suspending first and the appeal;
- keeping a minor's data too long, mitigated by erasure.

**Gap against what is built.**
1. RECOMMENDED: a decision outcome "Under 18: close the account" (or a flag on suspension/ban). It hides the profile at once and erases the personal data after the appeal window (or at once if the member confirms they are a minor). It does not keep the content like a normal ban does. Its statement-of-reasons text is neutral and contains the support-line line.
2. RECOMMENDED: an admin note template for the age check, recording only "verified 18+ on date X by method Y", never the document.
3. **Needs owner survey** (18+ gate): when someone answers "No, I'm under 18", should the invitation they used be voided, so that a retry with "yes" needs a new invitation from the inviter? This stores a fact on the invitation, not about the person beyond what the inviter entered. The alternative is to leave it as is: nothing stored, retry possible.

**Owner decision or action.**
- RECOMMENDED: approve the procedure (suspend → hear → close and erase → Art. 18 if needed).
- Answer the survey in item 3.

**Free official channel.** AZOP (data of a minor), MUP (Art. 18 contact point; Red Button), HAKOM.

---

## Summary for the owner

| # | Question | Short answer | Confidence |
|---|---|---|---|
| B.1 | Online platform? | Members-only content behind staff invitations: probably not "public". Public profiles: yes. Treat GrooveRift as an online platform; little changes thanks to Art. 19. Member quotas weaken the argument. | Medium |
| B.2 | Micro/small, Art. 19 | Micro: Section 3 (incl. Art. 28) and the Art. 15 report do not apply; Art. 24(3) does. **Croatian HAKOM notification (e-Pružatelj) applies to everyone** and is fineable. | High (status); medium (late filing) |
| B.3 | Minimum contents | Mostly met. Missing: notifier receipt, redress in mails and statements, legal ground for illegal-content decisions, published contact points, ToS moderation section. | High |
| B.4 | Art. 18 | Duty on suspicion, promptly. Croatia: Ravnateljstvo policije – Služba terorizma, poctco@mup.hr; 112/192 if imminent; Europol fallback. | High (duty and contact); medium (details) |
| B.5 | PUB-11 sufficient? | Fields: yes. Follow-up: needs the receipt and redress mails. Copyright help fields are RECOMMENDED. | High |
| D.1 | Self-declaration defensible? | Yes while micro/small and invite-only. At public launch or growth: verification such as the EU age app is the direction; the KIDS Act proposal is a watch item. | High (now); medium (future) |
| D.2 | Avoid date of birth? | Yes. Store an attestation timestamp and version instead; today nothing is stored. | High |
| D.3 | Minor reported | Priority → suspend → hear → close and erase (not a punitive ban) → Art. 18 if exploitation or danger; neutral statement; support line. | Medium |

## Concrete product gaps (for step 5.13)

1. **Notice receipt mail (Art. 16(4)):** a bilingual confirmation as soon as a PUB-11 notice with an e-mail is stored.
2. **Notifier decision mail (Art. 16(5)):** replace "reply to this message" with redress information: re-review on reply, the courts, and a complaint to the Digital Services Coordinator (HAKOM). The same redress line goes into the in-app reporter outcomes ("thanksAction"/"thanksNone").
3. **Statement of reasons, legal ground (Art. 17(3)(d)):** a "Legal ground" field, required in ADM-10 when the decision rests on illegality and shown in SAFE-05.
4. **Statement of reasons, redress and scope (Art. 17(3)(a), (f)):** a fixed line on judicial redress and the DSC complaint, shown even when no internal appeal is possible, and "applies everywhere GrooveRift is available".
5. **Contact points (Arts. 11, 12):** publish one role e-mail address on the Contact page, "for members and authorities", languages hrvatski and English, plus the feedback form.
6. **ToS moderation section (Art. 14):** prohibited content; human review only and no automated decisions; the sanctions ladder; appeal rules (183 days, a different reviewer where possible); the 18+ rule and how it is enforced; notice of changes.
7. **PUB-11 copyright and photo help:** optional "Which work?" and "Are you the right holder or acting for one?" when Copyright is chosen; a "what happens next" line.
8. **Art. 18 case flag and admin procedure:** a staff-only "reported to police (DSA Art. 18)" record with date and recipient that blocks the purge, plus a one-page procedure in admin help.
9. **Age attestation record:** persist `adult_attested_at` and the attestation version (and later `terms_accepted_at`/`terms_version`); no date of birth.
10. **"Under 18" closure outcome:** close the account and erase the data after the appeal window, with a neutral statement and a support-line pointer, instead of a ban that keeps the data.
11. **Active-recipients count (Art. 24(3)):** a way to compute average monthly active members over six months, on request. Low priority.

## Owner decisions and actions

**Owner actions:**
- File the **HAKOM e-Pružatelj DSA notification** before the first invitation, after the legal form is chosen. This creates an external account, so it needs owner approval.
- Choose the **public contact address** (a role address).

**RECOMMENDED for approval:**
- the Art. 18 procedure and the minor-report procedure;
- "attestation record, no date of birth" (this closes OQ-10 with D.1–D.3).

**Needs owner survey:**
- age verification (the EU age app or an EUDI "18+" check) before open registration or a wide beta (18+ rule);
- design limits for member invite quotas: single-use, named, capped, revocable (invite-only rule);
- voiding an invitation after a "No, I'm under 18" answer (18+ gate).

**Watch at each phase boundary:**
- the revised Art. 28 guidelines (the review was due by July 2026);
- the EU KIDS Act;
- any Croatian minimum-age law;
- the planned Europol/PERCI intake platform for Art. 18 notifications.
