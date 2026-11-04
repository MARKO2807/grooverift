# GrooveRift copy guide (HR/EN), v0.1

Step 3.8. Status: **CONFIRMED** (D-084, 2026-11-04). The owner chose K1–K4 on the decision page `design/prototypes/copy.html` and then approved the whole glossary and these rules ("Odobravam sve"). In the tables, "C" marks items fixed by an earlier decision and "R" items introduced here; both are now the rule. Croatian examples come first because Croatian is the harder language. English must say the same thing, not translate word by word.

Scope: all interface text written by the product: buttons, labels, headings, notifications, toasts, errors, empty states, confirmations, onboarding, settings, e-mails, accessible names. Not in scope: Daily Drop questions and other editorial content (written by editors, may carry more personality, still follow §6 and §8); legal texts (counsel); member content (never edited, Master Prompt §2).

## 1. Voice (K1: A, "miran i izravan")

GrooveRift speaks like a friend who knows music and respects your time: **calm, direct, warm through clarity**.

| Do | Don't |
|---|---|
| Short sentences. Say what happened, then what to do. | Filler ("Ups!", "Bum!", "Hej ti!"), hype, jokes in everyday copy |
| Start actions with a verb: "Odgovori", "Spremi", "Answer" | Exclamation marks in system copy |
| One music word where it earns its place, at the brand moments only: the invite, Done, the first Music DNA, the Daily Drop question (D-042) | Emoji in system copy (members may use them freely) |
| Name the thing: "Odgovori se nisu učitali." | Vague: "Nešto je pošlo po zlu.", "Došlo je do pogreške." |
| Tell the member what changes for them, plainly | Blame ("Unio si krivu lozinku") or passive bureaucracy ("Zahtjev je uspješno procesuiran") |
| Equal, factual wording for every choice (P3, D-030) | Persuasion, guilt or urgency ("Jesi li siguran da želiš propustiti…?") |

**Tone by context**
- **Everyday** (feeds, lists, toasts): neutral, brief. "Odgovor je objavljen." / "Answer posted."
- **Brand moments**: a little warmer, still no exclamation marks. "Ovo je tvoja Spirala. Raste sa svakim žanrom i izvođačem koje dodaš." / "This is your Spiral. It grows with every genre and artist you add."
- **Errors and offline**: calm, practical, never alarming. What happened, whether anything was lost, the next step.
- **Safety, privacy, account and legal**: serious and exact. State consequences, who is or is not notified, what can be undone. No softening words that hide facts.

## 2. Form and mechanics

### Both languages
- **Sentence case** everywhere, also in English headings and buttons ("Delete account", not "Delete Account"). Product names keep their capitals (§4).
- Address the member as **"ti" / "you"** (confirmed in round 1, recorded here). Never "Vi" in Croatian, never "the user" in English.
- Buttons: 1–3 words, a verb, the same word in the title of the dialog it confirms ("Blokirati @luka_jazz?" → "Blokiraj").
- No full stop on buttons, labels, headings, tab names or one-line toasts that are a fragment; full stops on full sentences.
- Numbers as digits ("3 komentara", "3 comments"). Time in 24 h in Croatian ("21:00"), and in English as well (EU product): "21:00".
- Dates: HR "Nedjelja, 1. studenoga" (D-047 style A; month in the genitive, lowercase); EN "Sunday, 1 November".
- Ellipsis "…" (one character) only for busy states: "Objavljujem…", "Spremam…" / "Posting…", "Saving…". The button keeps its width (components.md).
- Never write "klikni" / "click"; use the action itself ("Otvori postavke") or "odaberi" / "choose" when needed. "Dodirni" / "tap" only where touch is the only way (the Spirala hint „Dodirni spiralu", which has an sr-only alternative listing genres and artists; keep that pairing, `accessibility-pass.md`).

### Croatian
- Quotation marks „…" (and ‚…' inside). English text quoted inside Croatian keeps „…".
- **Do not decline the brand name or English feature names.** Rephrase instead: "srce zajednice", not "srce GrooveRifta" (D-050); "Tvoji odgovori na Daily Drop", not "na Daily Dropu"; "Otvori Hub", "u Hubu" → "na Hub stranici" only if needed, preferably "Otvori Hub".
- Plurals have three forms. Write every count string with all three: 1 komentar, 2–4 komentara, 5+ komentara (and 21 komentar, 22 komentara, 11–14 komentara). Implement with ICU plural rules (`one`, `few`, `other`), never with string concatenation.
- Diacritics always (č, ć, đ, š, ž), also in e-mail subjects.

### English
- **US spelling** ("color", "favorite"), matching the web platform, with **EU conventions** for dates ("1 November") and 24 h time.
- Contractions are fine ("didn't", "you'll").
- Singular "they" for any member.

## 3. Gender-neutral Croatian (K4: A, rephrasing)

GrooveRift does not know a member's gender and never guesses it from a name. Croatian past tense, adjectives and some greetings carry gender, so copy is **rephrased** so that no gendered form is needed. No setting, no slashes.

| Technique | Avoid | Write |
|---|---|---|
| Present tense for other members' actions | „Luka je komentirao tvoj odgovor" | „Luka komentira tvoj odgovor" |
| | „Ana te zapratila" | „Ana te sada prati" |
| The thing as the subject | „Objavio si odgovor." | „Odgovor je objavljen." |
| | „Prijavio si se." | „Prijava je uspjela." |
| A noun instead of an adjective | „Dobrodošao!" | „Dobrodošlica u grooverift" / „Drago nam je što si tu." |
| | „Jesi li siguran?" | Name the action: „Izbrisati račun?" |
| The member's name with a colon in accessible names | „odgovor korisnika Luke" (declined, and "korisnik") | „Više opcija za odgovor: Luka" |
| "Osoba" for third parties (grammatically feminine, fine for anyone) | „Blokirani korisnik neće znati…" | „Ta osoba to ne zna." |

English already works: "Luka commented on your answer", "They won't be notified."

## 4. Glossary

One name per thing per language (WCAG 3.2.4). **Status**: C = CONFIRMED by a decision, R = RECOMMENDED here.

### Product and feature names (K2: B)
Names of features stay English in both languages; descriptions of content types are translated.

| Concept | HR | EN | Status / note |
|---|---|---|---|
| Brand | grooverift (set like the wordmark, D-050) | GrooveRift / grooverift in UI | C |
| The daily question | Daily Drop | Daily Drop | C (D-047); not declined |
| Taste profile | Music DNA | Music DNA | C (K2) |
| Its visual | Spirala | Spiral | C (D-048) HR; EN R |
| Community section and tab | Hub | Hub | C (K2) |
| Weekly poll | **Tjedna anketa** | Weekly Poll | C (K2) |
| Fact format | **Znaš li?** | Did You Know? | C (K2) |
| Discovery modes | Music Twins · Music Explorers · Music Connections | same | C (K2); "Music Connections" must never be shortened to „Veze" / "Connections" (D-074) |
| Live line motif (name for the team only) | Strujica | Current | internal |

### People and relationships
| Concept | HR | EN | Status / note |
|---|---|---|---|
| A person on GrooveRift | **član** (ne „korisnik") | member (not "user") | R; „korisnik" only in legal texts if counsel requires |
| Follow (action) | Prati / Prestani pratiti | Follow / Unfollow | C (prototype, D-074) |
| Follower / following lists | Pratitelji N · Prati N | Followers N · Following N | C (D-074) |
| Mutual follow | **Povezani** | **Connected** | C (D-074); code `mutual` (D-012) |
| Follow request | Zahtjev za praćenje | Follow request | R |
| Verified artist | Potvrđeni izvođač | Verified artist | R |

### Content and reactions (K3: A)
| Concept | HR | EN | Status / note |
|---|---|---|---|
| A member's answer to the Daily Drop | **odgovor** · button „Odgovori" | **answer** · "Answer" | C (K3) |
| What others write under an answer | **komentar** · button „Komentiraj" | **comment** · "Comment" | C (K3); never „odgovor na odgovor" |
| The single reaction | Sviđa mi se | Like | C (D-056) |
| Saved items | Spremljeno · „Spremi" | Saved · "Save" | R |
| Question suggestion | Predloži pitanje | Suggest a question | R |
| Archive | Arhiva | Archive | R |

### Navigation (IA working names, now final)
| HR | EN | Status |
|---|---|---|
| Početna | Home | R → final with this guide |
| Hub | Hub | C (K2) |
| Otkrij | Discover | R (B4) |
| Aktivnost | Activity | R |
| Profil | Profile | R |
| Poruke | Messages | R (B3) |
| Postavke | Settings | R |

### Safety and account
| Concept | HR | EN | Note |
|---|---|---|---|
| Mute | Utišaj / Poništi utišavanje | Mute / Unmute | C (D-075) |
| Block | Blokiraj / Odblokiraj | Block / Unblock | C (D-075) |
| Report content | **Prijavi + object**: „Prijavi odgovor", „Prijavi profil" | Report answer, Report profile | R: never a bare „Prijavi", which reads as sign-in |
| Sign in / out | **Prijavi se** / **Odjavi se** | Sign in / Sign out | R: always with „se" |
| Report a bug | Prijavi grešku | Report a bug | R |
| Deactivate | Deaktiviraj račun | Deactivate account | R (prototype) |
| Delete permanently | **Izbriši** (account, own content) | Delete | R: „Izbriši" = gone for good |
| Remove from a list or relation | **Ukloni** (follower, genre, photo) | Remove | R: „Ukloni" = can be added back |
| Undo (toast) | Poništi | Undo | C (prototype) |
| Invite | pozivnica · „Pošalji pozivnicu" | invite · "Send invite" | R |

Report categories (J5; final names):

| Key | HR | EN |
|---|---|---|
| harass | Uznemiravanje ili zlostavljanje | Harassment or bullying |
| hate | Mržnja | Hate |
| threat | Prijetnje ili nasilje | Threats or violence |
| sexual | Seksualni sadržaj | Sexual content |
| minor | Osoba mlađa od 18 | Someone under 18 |
| imperson | Lažno predstavljanje | Impersonation |
| spam | Spam ili prijevara | Spam or scam |
| copyright | Autorska prava | Copyright |
| ai | Sadržaj iz AI-ja kao vlastiti | AI-made content passed off as own |
| private | Tuđi privatni podaci | Someone's private information |
| other | Nešto drugo | Something else |

### Common actions
| HR | EN | HR | EN |
|---|---|---|---|
| Nastavi | Continue | Natrag | Back |
| Gotovo | Done | Odustani | Cancel |
| Spremi | Save | Zatvori | Close |
| Uredi | Edit | Pokušaj ponovno | Try again |
| Objavi | Post | Pošalji | Send |
| Prikaži više | Show more | Učitaj još | Load more |

## 5. Patterns

**Buttons.** Verb first, 1–3 words. The destructive button repeats the action ("Izbriši račun"), never "Da" / "OK". Equal choices (visibility, permissions) get equal weight and parallel wording (P3).

**Toasts.** What happened, past or passive, plus one action if useful: „Utišano: @luka_jazz. Ta osoba to ne zna." [Poništi] / "Muted @luka_jazz. They won't know." [Undo].

**Errors.** Three parts, as short as possible: what failed, whether anything was lost, what to do. No error codes in the main text (a reference may follow in small print for support).
- „Komentar nije poslan. Tekst je sačuvan, pokušaj ponovno." / "Comment not sent. Your text is saved; try again."
- Field errors say how to fix, next to the field: „Najmanje 12 znakova." (D-061 rules).

**Empty states.** What will appear here and how it gets here; one action if there is one. „Tvoji odgovori na Daily Drop skupljaju se ovdje." / "Your Daily Drop answers collect here." Never fake activity (anti-slop).

**Confirmations.** Title = the action as a question with its object („Blokirati @luka_jazz?"). Body = consequences in plain facts, including who is notified. Buttons: „Odustani" + the action.

**Notifications.** Actor + present-tense action + object (§3): „Luka komentira tvoj odgovor", „Ana te sada prati", „Tvoj prijedlog pitanja je objavljen" (D-037). English: past tense is fine ("Luka commented on your answer"). Push and e-mail never contain private content from DMs, blocked people or reports.

**Visibility and privacy notices.** Neutral and complete for every option (D-030, P3): who sees it, what changes, that it can be changed later. No "preporučeno".

**Counts.** Real numbers only, with ICU plurals (§2). No rounded "1k+" in the alpha; no precision that suggests a score (Master Prompt §4).

**Placeholders.** An example, not an instruction: „Npr. Kind of Blue" / "e.g. Kind of Blue". Labels stay visible; a placeholder never replaces a label.

## 6. Safety, privacy and legal copy

- Block (the block-confirmation note in `ux-foundations.md`, D-019, D-075): state that the other person cannot see the profile, answers or write; that the member won't see theirs; that **they are not notified**; mention that public share links remain viewable signed out (D-019); optional checkbox „Prijavi i ovaj račun" / "Also report this account".
- Report: say what happens next and that the reported person is not told who reported („Tko je prijavio, ne otkrivamo."). Prioritised categories say so ("Ima prednost u pregledu.").
- Account deletion and deactivation: the exact effect and timing, what can be undone and until when (D-069 dates), nothing hidden behind "Saznaj više".
- 18+ (D-051, D-068): factual, not moralising.
- No dark patterns: no confirm-shaming, no pre-ticked boxes, no fake urgency. The visitor wall (D-076) stays factual and is a counsel item (C.9).
- Placeholder legal text is marked as such until counsel provides it.

## 7. Accessibility

- The visible label is part of the accessible name (WCAG 2.5.3); icon-only buttons get the same word a visible button would use („Više opcija za odgovor: Luka").
- Same function, same name, in both languages (3.2.4): this glossary is the source.
- `lang="en"` on English names inside Croatian text only where the name is read as English (Daily Drop, Music DNA, Hub, Music Twins…); not on translated terms (Tjedna anketa, Znaš li?).
- Screen-reader-only text says the same as the visual, never more persuasive.
- Plain language: one idea per sentence; no idioms in errors.

## 8. Editorial content (Daily Drop and Hub)

Editors may be more personal and playful in questions, polls and Did You Know?/Znaš li? stories, but: questions are open and inclusive of all genres; no leading questions about members; Znaš li? stories always cite sources; HR and EN versions are written, not machine-translated (Master Prompt §2, editorial workflow).

## 9. Applied in the prototype (session 20)

- „Weekly Poll" → „Tjedna anketa", „Did You Know?" → „Znaš li?" in the Croatian UI (Kako radi, Hub cards, toasts, archives), without `lang="en"`.
- Accessible names no longer use „korisnika <ime>": „Više opcija za odgovor: Luka", „Komentari na odgovor: Luka".
- „Obriši" → „Izbriši" (and „Obrisati" → „Izbrisati", „obrisan" → „izbrisan") in the prototype and in `components.html`, per the delete/remove rule.
- `pulse-smoke.mjs` passes 146/146 after the changes.

Remaining copy work happens screen by screen in Phase 4, with this guide as the rule set. Open for later: English UI copy for the prototype (the prototype is Croatian only), e-mail templates (B3/beta), and the final legal texts (counsel).
