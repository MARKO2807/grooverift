# Research: legal and platform fact check (2026-11-01)

> **Provenance:** fact check by a Claude research subagent on 2026-11-01. EUR-Lex pages came back empty, so verbatim mirrors (eu-digital-services-act.com, WIPO Lex, legislation.gov.uk) and official national sources were used. Commentary is marked as secondary. **This is not legal advice.** The items in the last section need a qualified Croatian/EU lawyer.

| # | Claim checked | Result | Key points |
|---|---|---|---|
| 1 | DSA obligations and the SME exemption | **TRUE with nuance** | See below |
| 2 | DPIA likely needed | **TRUE (likely)** | See below |
| 3 | Croatian provider info and consent age | **TRUE** | See below |
| 4 | Google Fonts ruling (LG München I, 20.01.2022) | **TRUE** (secondary) | Dynamic loading passed IP addresses to Google; €100 damages; self-hosting is the remedy |
| 5 | iOS Web Push | **TRUE**; 2026 EU status **partly unverified** | See below |
| 6 | European Accessibility Act applies | **Generally FALSE** for a free social network | See below |
| 7 | DSM Art. 17 thresholds | **TRUE** | See below |
| 8 | GitHub Actions free quota | **PARTLY**; model changed | GitHub Free now includes **$12/month of compute** (about 2,000 Linux minutes) and 500 MB of storage. Windows runners cost more |
| 9 | Sora and Inter licences | **TRUE** | Both SIL OFL 1.1. Both declare `latin-ext`, which covers č ć đ š ž (indirect evidence; do a visual check) |
| 10 | EU age-assurance guidance | **TRUE** that guidance exists; applicability conditional | See below |

## 1. DSA ([articles](https://www.eu-digital-services-act.com/Digital_Services_Act_Articles.html))
- **All intermediary services:**
  - Art. 11 (contact point for authorities), Art. 12 (contact point for users), Art. 14 (terms and conditions)
  - Art. 15 (transparency report): **micro and small enterprises are exempt** under Art. 15(2)
- **Hosting services, no SME exemption:**
  - Art. 16 (notice and action)
  - Art. 17 (statement of reasons)
  - Art. 18 (reporting suspected serious crimes)
- **Online platforms (Arts. 20–28):**
  - Art. 19 **exempts micro and small enterprises** from this section, except Art. 24(3) (user numbers on request).
  - Art. 28 (protection of minors) is therefore also out of scope for SMEs.
- **Is GrooveRift an "online platform"?** Recital 14 says content is not disseminated "to the public" when admission requires a **human decision or selection**. DMs are outside the definition anyway.
  - **Inference:** a genuinely human-curated invite gate supports the view that GrooveRift is a hosting service but not an online platform.
- **Inference:** Arts. 11, 12, 14, 16, 17 and 18 apply in any case. Our moderation design must implement them.

## 2. GDPR DPIA
- **Croatian AZOP Art. 35(4) list** ([PDF](https://www.edpb.europa.eu/system/files/decisions/list_of_the_types_of_processing_for_dpia_croatia_35_4.pdf)):
  - item 1: systematic, extensive profiling (preferences, interests, behaviour)
  - item 10: multi-source matching
- **WP248 rule of thumb:** meeting two criteria usually means a DPIA is required.
- **Inference:** music-taste profiling combined with compatibility matching plausibly meets two criteria. **Plan a DPIA before the alpha.**

## 3. Croatia
- **Zakon o elektroničkoj trgovini, čl. 6(1)** ([NN](https://narodne-novine.nn.hr/clanci/sluzbeni/2003_10_173_2504.html)) requires the following to be directly and permanently accessible:
  - name or company name
  - registered seat
  - e-mail and other quick contact details
  - register and registration number
  - supervisory body (if the activity needs authorisation)
  - VAT number (if a VAT payer)
- **Digital consent age:** **16** (Zakon o provedbi Opće uredbe o zaštiti podataka, čl. 19). It does not affect our 18+ rule.
- No Croatian statutory minimum age for social networks was found. This is **unverified**, not confirmed absent.

## 5. iOS Web Push ([WebKit](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/))
- Requires **iOS/iPadOS 16.4+** and the PWA **added to the Home Screen**.
- The permission request must follow a user gesture.
- The manifest `display` must be `standalone` or `fullscreen`.
- Declarative Web Push arrived in iOS 18.4.
- In March 2024 Apple reversed its plan to remove Home Screen web apps in the EU. No official 2025–2026 statement specifically confirms EU Web Push. **Verify on a real device in Phase 4.**

## 6. European Accessibility Act
- Social networking is not a listed service category (Art. 2(2)).
- Microenterprises providing services are exempt (Art. 4(5)).
- **Caveat (inference):** DMs could arguably count as interpersonal communications, and future paid features could count as e-commerce. **Lawyer question.** WCAG 2.2 AA remains our target regardless.

## 7. DSM Copyright Directive Art. 17
- Lighter regime for providers that are under 3 years old **and** have turnover under €10M.
- **Inference:** Art. 2(6) covers only services whose main purpose is giving access to large amounts of works for profit. A small GrooveRift may not be in scope at all.
- A takedown flow is needed regardless.

## 10. Age assurance
- **Guidelines:** the Commission's Art. 28 guidelines were adopted 14 July 2025 ([page](https://digital-strategy.ec.europa.eu/en/library/commission-publishes-guidelines-protection-minors)).
- **Self-declaration:** commentary (secondary) says the guidelines treat it as not appropriate.
- **Age verification:** treated as appropriate where a platform's **own terms require 18+**.
- **Scope:** Art. 28 is out of scope for micro and small enterprises (Art. 19).
- **Reference tooling:** the EU blueprint at [ageverification.dev](https://ageverification.dev).
- **Inference:** self-declaration is defensible only while GrooveRift is a micro/small enterprise and/or not an online platform. **This changes audit L-04: the age policy must be revisited before growth or a public launch.**

## Must go to a qualified lawyer
1. DSA status (online platform or not, given the invite gate) and confirmation of micro/small enterprise status.
2. DPIA, lawful basis for profiling and matching, and Art. 22 risk.
3. Croatian ZET Art. 6 disclosures for the chosen legal form, DSA Art. 11/12 contact points and Art. 14 terms.
4. DSM Art. 17 / ZAPSP status. Music licensing (e.g. ZAMP) for user uploads that contain music.
5. A defensible age-assurance approach under the DSA, GDPR and Croatian consumer law.
6. EAA exposure (DMs, future paid features).
