# Research: company form, tax, accessibility and consumer law (questions A.1–A.4, G.1–G.2)

- **Date:** 2026-11-07
- **Prepared by Claude under D-123. This is research, not legal advice; the owner decides and carries the residual risk.**
- **Scope:** `docs/legal/questions-for-counsel.md` sections A (accountant / company formation) and G (other). Sections B–E are researched separately.
- **Facts assumed:** free, invite-only, 18+ music social network run from Croatia by one person who does every role; closed alpha of 10–20 testers; no revenue in alpha or beta, a premium tier may come later; hosting about 30–60 EUR/month (D-010) paid to US companies with EU regions (Render Frankfurt, Cloudflare R2 EU, Sentry EU, Zoho ZeptoMail EU); posts, comments, DMs planned. Some services are currently billed to the owner as an individual (D-108).
- **How currency was checked (November 2026):** statutory text was read in the official gazette (narodne-novine.nn.hr) or in the consolidated texts on zakon.hr, whose banners showed updates through NN 109/26 to NN 125/26 (October 2026). EU texts were read on EUR-Lex. Where only secondary sources (RRiF, TEB, fiskai.hr, fiskalopedija.hr) gave a figure, this is said explicitly. The 2026-11-01 research note (`docs/research/2026-11-01-legal-platform-facts.md`) was re-checked rather than copied; its EAA findings hold, with the Croatian transposition now added.
- **Labels:** RECOMMENDED = Claude's suggestion, not a decision. OPEN = needs the owner or a free official channel.

---

## A.1 Legal form

**Question:** "Which legal form fits: individual, *obrt* or *d.o.o.* (or *j.d.o.o.*)? Consider liability for user content, cost and later monetization."

**Short answer:** For a no-revenue closed alpha, an individual (natural person) is legally workable and costs nothing. Once there is revenue or a real business launch, a *j.d.o.o.* is the best fit: it is the only low-cost form that separates the owner's personal assets from the company's debts. An *obrt* gives no such protection and still carries fixed monthly contributions. A full *d.o.o.* adds nothing a *j.d.o.o.* lacks at this size except the 2,500 EUR capital and the end of the profit-reserve rule.

**Analysis:**
- **Obrt.** Defined as "samostalno i trajno obavljanje dopuštenih gospodarskih djelatnosti" by natural persons to earn income or profit (Zakon o obrtu, čl. 2(1)). The owner is liable "cjelokupnom svojom imovinom" (with all personal assets) for obligations arising from the obrt (čl. 36(1)). For liability, an obrt is therefore no better than acting as an individual. A *paušalni obrt* (lump-sum taxation, 12% tax, revenue cap 60,000 EUR) is simple, but secondary sources put the 2026 fixed contributions at about 290.98 EUR/month (pension and health, base 797.20 EUR under the Naredba in NN 150/25) when the owner has no other insurance basis. That is five to ten times the whole infrastructure budget, payable even with zero revenue. If the owner is employed full-time elsewhere, the contribution regime is different and lower (sources disagree on the exact mechanics; see Open points). An HOK chamber contribution also applies; an amendment adopted 25 September 2026 lowers it from 2% to 1.5% of the basic personal allowance from 1 January 2027.
- **j.d.o.o.** A simplified *d.o.o.* (Zakon o trgovačkim društvima, ZTD, čl. 387(2) and 390.a): at most three members and one management board member, minimum capital 1.00 EUR and minimum share 1.00 EUR (čl. 390.a(3), as amended by NN 114/22 from 1 January 2023), contributions only in cash (čl. 390.a(4)), and one quarter of each year's profit must go to statutory reserves (čl. 390.a(5)) until the company raises its capital to the *d.o.o.* minimum, after which the special rules stop applying (čl. 390.a(7)). Members "ne odgovaraju za obveze društva" (ZTD čl. 10(2)), except where the limited-liability shield is abused (čl. 10(3)–(4)). It can be founded online through START without a notary (gov.hr). Secondary sources put the START court fee at a few euros to a few dozen euros (the figures conflict); check the amount on START at the time. Running costs: double-entry bookkeeping and annual financial statements filed with FINA, 10% profit tax on annual revenue up to 1,000,000 EUR (Porezna uprava; 18% above), 12% tax on dividends. If the owner as director has no other insurance basis, director contributions on a statutory minimum base apply (secondary sources: base about 1,295 EUR/month in 2026; confirm against NN 150/25).
- **d.o.o.** Same as *j.d.o.o.* but minimum capital 2,500 EUR (ZTD čl. 389(2), NN 114/22), of which at least a quarter is paid in before registration, and no reserve rule. Not needed at this size; a *j.d.o.o.* can convert later by raising capital.
- **Liability for user content.** The DSA hosting liability exemption (Art. 6) and the duties under Arts. 11–18 apply to the provider whatever its form; the form only decides whose assets answer for a fine, damages claim or debt. A company does not shield the owner from personal liability for his own unlawful acts (for example as director, or under criminal law), but it does keep GDPR fines, DSA penalties and civil claims against the platform inside the company. For a service hosting user posts, images and DMs, this is the main argument for a company.
- **Later monetization.** A premium tier makes the operator a *trgovac* under consumer law (see G.2) and requires a registered business in any case. A *j.d.o.o.* supports this without changing form.

**Sources:**
- Zakon o obrtu (NN 143/13, 127/19, 41/20), čl. 2(1), 14, 15, 17(3), 36(1): https://narodne-novine.nn.hr/clanci/sluzbeni/2013_12_143_3065.html
- HOK contribution amendment (adopted 25.9.2026, applies 1.1.2027), secondary: https://informator.hr/vijesti/sabor-izmjenio-zakon-o-obrtu-smanjuje-se-komorski-doprinos
- ZTD čl. 10, 389, 390.a (consolidated): https://www.zakon.hr/z/546/Zakon-o-trgovačkim-društvima ; čl. 390.a original text NN 111/12: https://narodne-novine.nn.hr/clanci/sluzbeni/2012_10_111_2392.html ; euro amounts NN 114/22, čl. 12–14: https://narodne-novine.nn.hr/clanci/sluzbeni/2022_10_114_1712.html
- gov.hr, founding a j.d.o.o. (1 EUR capital, START without notary, reserve rule): https://gov.hr/hr/osnivanje-jednostavnog-drustva-s-ogranicenom-odgovornoscu/2747
- Porezna uprava, profit tax 10% / 18%: https://porezna-uprava.gov.hr/hr/2-porez-na-dobit-7637/7637
- Secondary (contributions, fees): https://www.fiskai.hr/alati/kalkulator-doprinosa/ , https://www.fiskai.hr/kako-da/otvoriti-doo/ , https://www.fiskai.hr/vodic/doo-direktor-placa/

**Confidence:** High on the legal features (liability, capital, reserves; read in the statutory text). Medium on running costs (contribution amounts and court fees come from secondary sources and depend on the owner's insurance status).

**Residual risk:** Choosing a *j.d.o.o.* without checking the owner's insurance status could create an unexpected monthly contribution bill. Staying an individual or an obrt leaves personal assets exposed to platform claims.

**Owner decision or action:** OPEN (OQ-05). RECOMMENDED: stay an individual for the closed alpha only, and found a *j.d.o.o.* through START before any revenue, before the open beta or public launch, or before signing paid contracts that should belong to the business (see A.2 for triggers). The owner should first establish whether he has another insurance basis (employment), because that decides the fixed monthly cost of either form.

**Free official channel:** Porezna uprava (local office or ePorezna inquiry) for contributions and tax; FINA (START help desks at 20 locations) for founding; HOK for obrt questions; HGK for company questions.

---

## A.2 Free service without a business, and when it must change

**Question:** "Can a free, non-revenue service operate as an individual or *obrt* during alpha and beta? When must it change?"

**Short answer:** Yes, as an individual, provided there is genuinely no income and no income-seeking activity (no premium, ads, sponsorship, paid features or donations). Registration is required by law only once the activity is carried out to earn income. Registering an obrt with no revenue is lawful but brings fixed costs and no liability benefit. It must change before the first revenue, and RECOMMENDED earlier: before the open beta or public launch.

**Analysis:**
- Croatian business-registration rules attach to economic activity carried out "sa svrhom postizanja dohotka ili dobiti" (Zakon o obrtu čl. 2(1)); companies are formed for the same purpose. A free, non-commercial service run by a private person is not, on that wording, an obrt that must be registered. No statute found forbids a natural person from operating a free website or app. The 2026 amendment of the Zakon o suzbijanju neprijavljenoga rada (NN 69/26) defines undeclared work around employment-like work and does not address unregistered business activity, so it does not change this.
- GDPR applies in full whatever the form: a natural person can be the controller (GDPR Art. 4(7)). The household exemption (Art. 2(2)(c)) does not cover running a service for other people.
- Provider identification (Zakon o elektroničkoj trgovini čl. 6) would, for an individual, mean publishing the owner's own name and address. Whether a free, non-commercial service is an "information society service" at all ("normally provided for remuneration") is a question for section B. If it is, a company would let the published identity be the company's name and seat instead of the owner's.
- **When it must change (legal triggers):** the first income of any kind from the service, or concrete steps to earn it (selling premium, ads, sponsorship). At that point registration is required before trading starts (an obrt must also report the start of activity at least eight days in advance, čl. 17(3)), and consumer law (G.2) requires a *trgovac*.
- **When it should change (prudential triggers):** before the open beta or a public launch (more users means more liability exposure), before employing or paying anyone, before contracts that should belong to the business (MetaBrainz commercial tier, D-018), and before invoices for infrastructure are expected to be tax-deductible. Costs the owner pays privately before the company exists are generally not deductible by the company later; keep the invoices anyway.
- Moving from individual to company later is a transfer of the service, the domain, the accounts and the role of controller; members need notice of the new controller (GDPR Arts. 13–14) and new terms.

**Sources:** Zakon o obrtu čl. 2(1), 17(3) (link in A.1); ZSNR amendment NN 69/26, čl. 1 (new čl. 3): https://narodne-novine.nn.hr/clanci/sluzbeni/2026_06_69_835.html ; GDPR Arts. 2(2)(c), 4(7), 13, 14: https://eur-lex.europa.eu/eli/reg/2016/679/oj ; ZET čl. 6(1): https://narodne-novine.nn.hr/clanci/sluzbeni/2003_10_173_2504.html

**Confidence:** Medium. The statutory wording supports the answer, but no official opinion was found that addresses a free, pre-commercial online service run by an individual, and "preparation for a later business" could be read as the start of economic activity.

**Residual risk:** If the authorities treated the alpha as preparatory business activity, the consequence would be a registration demand, not a revenue-based tax (there is no revenue). Personal assets are exposed during the alpha. Any accidental revenue (for example a tester paying for something) would be unregistered activity.

**Owner decision or action:** RECOMMENDED: no money of any kind changes hands during the alpha; record the switch to a *j.d.o.o.* as a gate before the open beta in `STATUS.md`. OPEN: confirm by a free written inquiry to Porezna uprava that a free, non-revenue service run by an individual needs no registration.

**Free official channel:** Porezna uprava (written inquiry through ePorezna or the local office); HOK obrt advisory service.

---

## A.3 VAT on foreign SaaS invoices

**Question:** "VAT implications of foreign SaaS invoices (Render, Cloudflare, etc.) for each form."

**Short answer:** In every form the owner effectively pays 25% Croatian VAT on these services unless the business is inside the VAT system. As an individual, the supplier charges it (if it is registered for the EU's non-Union OSS scheme). As a non-VAT-registered obrt or *j.d.o.o.*, the business must obtain a PDV identification number, self-assess 25% VAT on each foreign invoice (reverse charge) and pay it, with no deduction. Only a VAT-registered business can deduct it, which makes it cost-neutral. The registration threshold has been 60,000 EUR of annual supplies since 1 January 2025 and is unchanged as of November 2026.

**Analysis:**
- **Place of supply.** For services to a taxable person (any obrt or company, VAT-registered or not), the place of supply is where the customer is established: VAT Directive Art. 44; Zakon o PDV-u (ZPDV) čl. 17(1) ("Mjestom obavljanja usluga poreznom obvezniku ... smatra se mjesto sjedišta tog poreznog obveznika"). For an individual (non-taxable person), electronically supplied services are taxed where the customer lives (VAT Directive Art. 58), and non-EU suppliers collect it through the non-Union OSS scheme (Arts. 358a–369k).
- **Who pays.** ZPDV čl. 75(1)(6) makes "svaki porezni obveznik" receiving čl. 17(1) services from a supplier not established in Croatia liable for the VAT (VAT Directive Art. 196). This covers EU and non-EU suppliers alike.
- **Small taxable persons are not exempt.** ZPDV čl. 77(2) frees small taxable persons under čl. 90 from applying for a PDV ID, but čl. 77(4) begins "Neovisno o stavku 2." and requires "svaki porezni obveznik primatelj usluga iz članka 75. stavka 1. točke 6." to apply for one (VAT Directive Art. 214(1)(d)). A Porezna uprava notice (reported 2020) says to apply 15 days before starting to receive such services and to "obračunati hrvatski PDV po stopi od 25 posto". VAT is reported in the PDV return for the period and paid by the general deadline (čl. 76(1) and (3)). A small taxable person has no right to deduct it.
- **Threshold.** ZPDV čl. 90(1): a taxable person whose supplies in the previous or current year "nije bio veći od 60.000,00 eura" is exempt (read in the consolidated text on zakon.hr; confirmed by the Porezna uprava VAT page). The change from 40,000 EUR came with NN 152/24 from 1 January 2025. Amendments NN 151/25 (fiscalization alignment, 1 January 2026) and NN 32/26 (energy rate) did not change it. Voluntary registration is possible but, per secondary sources, binds for two years.
- **Practical effect at 30–60 EUR/month:** 7.50–15 EUR/month of VAT in every form except a VAT-registered business, plus monthly PDV filing for a non-registered obrt or *j.d.o.o.* in each month with a foreign invoice. Give suppliers the PDV ID so they do not also charge VAT (double taxation).
- **Individual today:** no filing obligation. Whether Render, Cloudflare, Sentry or Zoho add VAT to the owner's personal invoices depends on their OSS registration; check the invoices.

**Sources:**
- ZPDV consolidated (čl. 17(1), 75(1)(6), 76, 77(2) and (4), 90(1)): https://www.zakon.hr/z/1455/Zakon-o-porezu-na-dodanu-vrijednost ; NN 152/24: https://narodne-novine.nn.hr/clanci/sluzbeni/2024_12_152_2508.html ; NN 32/26: https://narodne-novine.nn.hr/clanci/sluzbeni/2026_03_32_377.html
- Porezna uprava, VAT (60,000 EUR): https://porezna-uprava.gov.hr/hr/3-porez-na-dodanu-vrijednost/7638
- Porezna uprava notice on EU service platforms, as reported: https://www.tportal.hr/vijesti/clanak/porezna-uprava-uputila-vaznu-obavijest-gradanima-evo-sto-kazu-u-njoj-20200213
- VAT Directive 2006/112/EC, Arts. 44, 58, 196, 214(1)(d), 358a–369k: https://eur-lex.europa.eu/eli/dir/2006/112/oj

**Confidence:** High for the threshold and the reverse-charge rule (read in the statute). Medium for the filing mechanics of a non-registered business (based on the statute plus secondary sources and a reported notice, not a current Porezna uprava guide).

**Residual risk:** A non-registered business that forgets to self-assess owes the VAT plus interest and possible misdemeanour penalties. Supplier invoices to an individual may or may not include VAT.

**Owner decision or action:** After founding a business, apply for a PDV ID before the first foreign invoice in the business's name and set a monthly reminder for the PDV return. OPEN: whether voluntary VAT registration is worth it once revenue starts.

**Free official channel:** Porezna uprava (ePorezna inquiry; PDV ID application through form P-PDV at the local office).

---

## A.4 Legal form and micro/small enterprise status

**Question:** "Does the legal form affect 'micro/small enterprise' status under the DSA (Recommendation 2003/361/EC)?"

**Short answer:** No. The Recommendation defines an enterprise as "any entity engaged in an economic activity, irrespective of its legal form", including self-employed persons. With one person and no turnover, GrooveRift is a microenterprise in any form. What matters are headcount, turnover or balance sheet, and links to other enterprises.

**Analysis:**
- Annex, Art. 1: form-independent definition. Art. 2(3): microenterprise = fewer than 10 persons and annual turnover and/or balance sheet total not above 2 million EUR (small: fewer than 50 and 10 million EUR). Art. 5: owner-managers count in the headcount, so the owner is 1 of 10.
- Art. 4(2): status changes only if a ceiling is exceeded over two consecutive accounting periods. Art. 4(3): a new enterprise uses a bona fide estimate.
- Art. 3(3): enterprises linked through a natural person "acting jointly" are aggregated only if they operate in the same or adjacent markets. If the owner holds or runs other businesses in a related market, their figures could be added.
- **Individual phase:** a person running a free service with no economic activity is arguably not an "enterprise" at all. The safer reading for the DSA Art. 19 exemption is that offering a service on a market, even free, is economic activity, so the individual qualifies as a microenterprise. A strict reader could argue a non-enterprise cannot "qualify" as one; this is a theoretical gap that disappears once a company exists. Whether the DSA applies to a non-commercial service at all is section B.
- The EAA (G.1) uses its own microenterprise definition (Directive 2019/882 Art. 3(23)); the Croatian transposition explicitly covers "fizička ili pravna osoba", so it is also form-independent.

**Sources:** Commission Recommendation 2003/361/EC, Annex Arts. 1, 2(3), 3(3), 4(2)–(3), 5: https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32003H0361 ; DSA Art. 19: https://eur-lex.europa.eu/eli/reg/2022/2065/oj

**Confidence:** High (plain text of the Recommendation).

**Residual risk:** Low. Only the linked-enterprise rule and the individual-phase theory gap remain.

**Owner decision or action:** OPEN, for the owner only: confirm he has no other business in a related market that would count as linked. No other action.

**Free official channel:** HAMAG-BICRO or HGK for SME status questions; the Commission's *User guide to the SME definition* (free).

---

## G.1 European Accessibility Act

**Question:** "Does the European Accessibility Act apply if DMs count as interpersonal communications, or once paid features exist?"

**Short answer:** Not while GrooveRift is a microenterprise. Croatia's transposition says plainly that the Act does not apply to microenterprises providing services. On scope: DMs might be an "electronic communications service" (it is arguable either way), and a premium checkout would be an "e-commerce service", so both would be covered once the business is no longer micro (10 or more persons, or more than 2 million EUR turnover). WCAG 2.2 AA stays the project baseline regardless.

**Analysis:**
- **Services covered.** Directive (EU) 2019/882 Art. 2(2) lists, among others, (a) electronic communications services and (f) e-commerce services provided to consumers after 28 June 2025. Social networking as such is not listed.
- **DMs.** Art. 3(8) points to Directive (EU) 2018/1972 (EECC) Art. 2(4): a service "normally provided for remuneration" that includes interpersonal communications services. Art. 2(5) excludes services where interpersonal communication is "a minor and purely ancillary feature that is intrinsically linked to another service"; recital 17 gives game chat as an example. Recital 16 says remuneration includes giving personal data or being exposed to ads. In GrooveRift, DMs are secondary to the music profile and feed, which supports the "ancillary" reading. But DMs on large social networks are widely treated as number-independent interpersonal communications services (Art. 2(7)), so the opposite reading is credible. Treat it as uncertain.
- **Premium.** Art. 3(30) and the Croatian čl. 5(25): "usluga e-trgovine je usluga koja se pruža na daljinu putem internetske stranice i usluga na mobilnom uređaju ... na pojedinačni zahtjev potrošača radi sklapanja potrošačkog ugovora". Selling a subscription online to consumers fits.
- **Microenterprise exemption.** Directive Art. 4(5): microenterprises providing services are exempt from the accessibility requirements; Art. 3(23) defines microenterprise (fewer than 10 persons; turnover or balance sheet not above 2 million EUR). Croatia transposed this through the Zakon o zahtjevima za pristupačnost proizvoda i usluga (NN 89/25, in force 28 June 2025): čl. 4(2) "Ovaj se Zakon ne primjenjuje na mikro subjekte malog gospodarstva koji pružaju usluge", and čl. 5(18) defines a "mikro subjekt malog gospodarstva" as a natural or legal person with fewer than ten employees and turnover (or assets) up to 2 million EUR based on the previous year's financial statements. The Croatian exemption is wider than the directive's: the whole Act, not only the requirements.
- **If the business grows past micro:** supervision of e-commerce services by market inspectors of the Državni inspektorat (čl. 25(9)); electronic communications by HAKOM (čl. 25(1)); fines for legal persons 6,630 to 132,720 EUR (čl. 36(1)). An amending bill sent to Parliament in September 2026 adds definitions on emergency calls and real-time text; it does not appear to change the micro exemption (not verified in final form).
- The 2026-11-01 note's conclusion ("generally false" for a free social network) holds, with the correction that the reason is the micro exemption, not only the service list.

**Sources:** Directive (EU) 2019/882, Arts. 2(2), 3(8), 3(23), 3(30), 4(5), recital 72: https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32019L0882 ; Directive (EU) 2018/1972, Art. 2(4), (5), (7), recitals 16–17: https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32018L1972 ; Zakon o zahtjevima za pristupačnost proizvoda i usluga, NN 89/25, čl. 3(2), 4(2), 5(18), 5(25), 25, 36, 38: https://narodne-novine.nn.hr/clanci/sluzbeni/2025_06_89_1231.html

**Confidence:** High that the EAA does not apply while micro (explicit Croatian text). Medium on whether DMs are in scope once the exemption ends (no authoritative guidance found).

**Residual risk:** Low now. The risk returns only when the business stops being micro; building to WCAG 2.2 AA already covers most of what EN 301 549 would ask of a web service.

**Owner decision or action:** None now. RECOMMENDED: keep WCAG 2.2 AA (already a guardrail); re-check this answer if the team reaches 10 people or turnover approaches 2 million EUR.

**Free official channel:** Državni inspektorat (market inspection, e-commerce services); HAKOM (electronic communications); Ministarstvo rada, mirovinskoga sustava, obitelji i socijalne politike (sponsor of the Act).

---

## G.2 Croatian consumer law for a future premium tier

**Question:** "Croatian consumer law implications for a future premium tier."

**Short answer:** A paid tier sold online to consumers is a distance contract for a digital service. The main duties: full pre-contract information including total price per billing period (ZZP čl. 60), an order button labelled "narudžba s obvezom plaćanja" or similar (čl. 74), a 14-day withdrawal right from conclusion (čl. 79) with proportional payment if the member asks to start at once (čl. 84), an online "raskid ugovora" withdrawal function with confirmation on a durable medium (čl. 81.a, from 19 June 2026), conformity and update duties for digital services, and fair contract terms. The operator must be a registered *trgovac* (see A.2). Some digital-content rules may already apply to the free tier.

**Analysis:**
- **Applicable acts.** Zakon o zaštiti potrošača (ZZP, NN 19/22, 59/23, 59/26; consolidated text in force from 17 June 2026) and the Zakon o određenim aspektima ugovora o isporuci digitalnog sadržaja i digitalnih usluga (ZDS, NN 110/21, transposing Directive (EU) 2019/770).
- **Before the contract.** ZZP čl. 46 (general) and čl. 60(1) (distance contracts): identity and contact details, main features, total price incl. taxes, functionality, compatibility and interoperability, the minimum period of software updates (added by NN 59/26), termination conditions and the location of the withdrawal function. For subscriptions, the total price means costs per billing period, and the consumer does not owe undisclosed charges (čl. 60(3)–(6)).
- **Order button.** ZZP čl. 74: the button must say "narudžba s obvezom plaćanja" or equivalent; otherwise the consumer is not bound (čl. 74(4)).
- **Withdrawal.** 14 days without reasons, counted for services from conclusion (čl. 79(1), (5)). If the member expressly asks the service to start during that period, he pays a proportional share on withdrawal; nothing if the trader failed to inform or obtain the request (čl. 84(8)–(9)). The right is lost only when a service has been fully performed with prior express consent and acknowledgement (čl. 86(1)(1)), which rarely happens for a running subscription. Digital content not on a physical medium has its own exception (čl. 86(1)(13)).
- **Withdrawal function.** ZZP čl. 81.a (added by NN 59/26 Art. 28, applying from 19 June 2026, transposing Directive (EU) 2023/2673): a prominent function labelled "raskid ugovora", a confirmation step "potvrditi raskid ugovora", and a confirmation on a durable medium with date and time. Cancellation must not be more complicated than signing up (čl. 99(2), as reported).
- **Digital service duties (ZDS).** Conformity for the whole supply period (čl. 12(5)); burden of proof on the trader during that period (čl. 13(3)); changes to the service only under contract terms with a valid reason and at no extra cost, and the consumer may terminate free within 30 days if a change harms him (čl. 20). ZDS čl. 5(2) also applies where the consumer "dostavlja ... osobne podatke trgovcu", unless the data are processed only to supply the service or meet legal obligations. The free tier may therefore already be a ZDS contract if member data are used for anything beyond providing the service (for example product analytics). This needs a view together with section C.
- **Disputes.** The EU ODR platform and its link duty ended on 20 July 2025 (Regulation (EU) 2024/3228). Information duties about out-of-court dispute resolution under Croatian ADR law were not verified here (OPEN).
- **Cross-border.** If premium is marketed to consumers in other Member States, their mandatory consumer law can apply (Rome I Art. 6). Not researched further.
- **Related tax points (not consumer law):** VAT on B2C digital services is due where the consumer lives, subject to the EU 10,000 EUR cross-border threshold and the OSS scheme (VAT Directive Arts. 58, 59c). Since 1 January 2026, fiscalization of B2C receipts covers all payment methods, per secondary sources (Zakon o fiskalizaciji, NN 89/25). Both need checking before launch.

**Sources:** ZZP consolidated (čl. 46, 60, 74, 79, 81.a, 84, 86): https://www.zakon.hr/z/193/Zakon-o-zaštiti-potrošača ; NN 59/26 (Art. 28 adding čl. 81.a; Art. 66 application dates): https://narodne-novine.nn.hr/clanci/sluzbeni/2026_06_59_728.html ; ZDS NN 110/21 (čl. 5(2), 12(5), 13, 20): https://narodne-novine.nn.hr/clanci/sluzbeni/2021_10_110_1925.html ; Regulation (EU) 2024/3228: https://eur-lex.europa.eu/eli/reg/2024/3228/oj/eng ; fiscalization (secondary): https://www.teb.hr/novosti/2025/prikaz-zakona-o-fiskalizaciji/

**Confidence:** High on the listed ZZP and ZDS duties (statutory text). Medium on the ZDS reach into the free tier (depends on data uses). Low on fiscalization and ADR details (not verified in primary text).

**Residual risk:** Premium is not designed yet, so the main risk is building a checkout or cancellation flow that misses čl. 74 or čl. 81.a. Penalties are set in the ZZP misdemeanour provisions and enforced by the Državni inspektorat.

**Owner decision or action:** None now (premium is DEFERRED). RECOMMENDED when premium is planned: a dedicated consumer-law pass covering checkout, cancellation and terms; and an OPEN choice between selling directly and using a merchant-of-record payment provider that acts as the seller (shifts VAT and some consumer duties; a new provider needs owner approval).

**Free official channel:** Državni inspektorat (consumer protection); Ministarstvo gospodarstva (consumer policy); Porezna uprava for VAT and fiscalization.

---

## Summary for the owner

| Question | Short answer | Confidence |
|---|---|---|
| A.1 Legal form | Individual is fine for a no-revenue closed alpha; a *j.d.o.o.* (1 EUR capital, limited liability) is the best fit before revenue or public launch; an obrt gives no liability protection. | High (law), medium (costs) |
| A.2 Free service without a business | Yes as an individual, as long as there is no income or income-seeking activity; must change before first revenue, RECOMMENDED before open beta. | Medium |
| A.3 VAT on foreign SaaS | About 25% VAT in every form unless VAT-registered; a non-registered obrt/*j.d.o.o.* needs a PDV ID and self-assesses with no deduction; threshold 60,000 EUR. | High (rule), medium (filing) |
| A.4 Form and micro status | Form does not matter; one person, no turnover = microenterprise. | High |
| G.1 EAA | Does not apply while micro (Croatian law exempts micro service providers entirely); DMs arguably and premium checkout clearly in scope later. | High (now), medium (later) |
| G.2 Consumer law for premium | Distance-contract duties incl. order button, 14-day withdrawal, "raskid ugovora" function (from 19.6.2026), digital-service conformity; free tier may already fall under ZDS. | High (duties), medium (free tier) |

## Open points

1. **Owner's insurance status** (employed elsewhere or not): decides the fixed monthly contributions of an obrt or of a *j.d.o.o.* director. Not recorded in the repo, and personal, so the owner checks it himself with Porezna uprava / HZMO.
2. **Written Porezna uprava inquiry** confirming that a free, non-revenue service run by an individual needs no registration (A.2).
3. **OQ-05 decision**: individual for the alpha, *j.d.o.o.* before open beta or revenue (RECOMMENDED, not decided).
4. **Linked enterprises**: the owner confirms no other business in a related market (A.4).
5. **Supplier invoices**: check whether Render, Cloudflare, Sentry and Zoho add Croatian VAT to the owner's personal invoices (A.3).
6. **ZDS and the free tier**: decide with section C whether any member data are used beyond providing the service (G.2).
7. **Before premium**: ADR information duty, fiscalization of online payments, OSS and the merchant-of-record option (G.2).
8. **Exact current fees and contribution bases** (START court fee, NN 150/25 bases) were taken from secondary sources; confirm on START and in NN 150/25 when founding.
