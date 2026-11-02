# Research: settings benchmark (2026-11-02)

> **Provenance:** researched by a subagent of the main session on 2026-11-02 (session 11) at the owner's request ("Where will settings be, where can someone change their name, delete the account, and what else is needed?"). Labels: **Verified** (read on the official page or official source code that day), **Secondary** (third-party report, or an official page seen only as a search excerpt because the help centre blocked direct reading), **Inference** (reasoning) and **Unverified**. Not legal advice. Many help centres (X, Discord, Reddit, Instagram, TikTok) refused automated reading, so most platform facts are **Secondary**. Bluesky facts come from its open-source app code and are **Verified**.

Compared against: `docs/design/information-architecture.md` §2.10 (SET-01 to SET-12, PROF-08, SAFE-04 to SAFE-09).

## 1. Where settings are entered
| Platform | Entry | Label |
|---|---|---|
| Instagram | Profile tab (bottom right) → ☰ "More" (top right) | "Settings and activity". **Secondary** ([help excerpt](https://help.instagram.com/2358103564437429)) |
| Threads | ☰ menu (bottom left on web) → Settings; account items live in Meta Accounts Center | **Secondary** ([help excerpt](https://help.instagram.com/1207185479989246)) |
| TikTok | Profile tab → ☰ Menu (top) → "Settings and privacy" | **Secondary** (official support text, seen as search excerpt) |
| Spotify | Profile picture (top) → "Settings and privacy" | **Verified** ([support](https://support.spotify.com/us/article/privacy-and-social-controls/)) |
| X | "More" → "Settings and privacy" | **Secondary** ([language help](https://help.x.com/managing-your-account/how-to-change-language-settings)) |
| Discord | Gear next to own avatar → User Settings; "Log Out" at the bottom | **Secondary** |
| Bluesky | Menu/drawer → Settings (one flat list) | **Verified** ([source](https://github.com/bluesky-social/social-app/blob/main/src/screens/Settings/Settings.tsx)) |
| Reddit | Avatar → Settings (web tabs; app list) | **Secondary** ([delete help](https://support.reddithelp.com/hc/en-us/articles/204579509-How-do-I-delete-my-account)) |

**Pattern (Inference):** apps with a bottom tab bar (Instagram, TikTok, Spotify) put Settings behind the **own profile/avatar**. None gives Settings its own tab.

**RECOMMENDED for GrooveRift:**
- **Mobile:** Profile tab → **gear icon, top right of the own profile header** → `/settings`. Keep the "Settings" row in the profile menu list as well, so it is reachable by scrolling and by screen reader in list order.
- **Desktop:** avatar menu → Settings, plus Profile → gear.
- **Deep links:** contextual shortcuts open the exact screen, for example Activity ⋯ → Notification settings, Daily Drop reminder → reminder time, a block sheet → Blocked accounts.

## 2. Common top-level categories
Y = present. Bluesky column **Verified** (source). Spotify partly **Verified**. Other columns are **Secondary/Inference** from help pages and known app layouts; exact labels drift between versions.

| Category | IG | Threads | X | Reddit | Discord | Bluesky | Spotify | TikTok | GrooveRift today |
|---|---|---|---|---|---|---|---|---|---|
| Edit profile (name, bio, photo) | Y | Y | Y | Y | Y | Y | Y | Y | PROF-08 |
| Account (email, password, handle) | Y | Y | Y | Y | Y | Y | Y | Y | SET-02, SET-03 |
| Security (2FA, sessions, devices) | Y | Y | Y | Y | Y | Y | Y | Y | SET-04 |
| Privacy (visibility, who can interact) | Y | Y | Y | Y | Y | Y | Y | Y | SET-05 |
| Blocked / muted / moderation tools | Y | Y | Y | Y | Y | Y | n/a | Y | SAFE-08 |
| Notifications | Y | Y | Y | Y | Y | Y | Y | Y | SET-06 |
| Content preferences / feed controls | Y | Y | Y | Y | Y | Y | Y | Y | SET-08 (B4) |
| Appearance / display | Y | Y | Y | Y | Y | Y | Y | Y | none (dark only, decided) |
| Accessibility | Y | ? | Y | ? | Y | Y | ? | Y | **missing** |
| Language | Y | Y | Y | Y | Y | Y | Y | Y | SET-07 |
| Your data: export, deactivate, delete | Y | Y | Y | Y | Y | Y | Y | Y | SET-09 |
| Help / report a problem | Y | Y | Y | Y | Y | Y | Y | Y | SET-12 |
| About / legal links | Y | Y | Y | Y | ? | Y | Y | Y | **missing in settings** (PUB-10 exists) |
| Account status / support requests | Y | ? | ? | ? | ? | ? | ? | ? | SAFE-04/05/07 exist, **no settings entry** |
| Switch / add account | Y | Y | Y | Y | Y | Y | ? | Y | not planned |
| Log out | Y | Y | Y | Y | Y | Y | Y | Y | **missing** |
| Connected apps / subscriptions | Y | ? | Y | Y | Y | Y | Y | Y | Google link only (SET-02) |

**Verified Bluesky order:** Switch/Add account · Account · Privacy and security · Moderation tools · Notifications · Content and media · Find and invite friends · Appearance · Accessibility · Languages · Beta features · Help · About · Sign out (with a "Sign out?" confirmation).

## 3. Gaps
| Gap | Verdict | Reason |
|---|---|---|
| **Log out** row at the bottom of the index | **RECOMMENDED α** | Every platform has it. Without it a shared device cannot be cleared. "Log out of all devices" belongs in SET-04. |
| **Accessibility** section | **RECOMMENDED α** | Move "Smanji pokrete" here from Profile. Default "Follow device setting", then On/Off. WCAG 2.2 AA is our baseline. No theme or font pickers: dark only is decided, and browser zoom covers text size (Inference). |
| **Account status** entry (my reports, notices, restrictions, appeals) | **RECOMMENDED α** | SAFE-04/05/06/07 exist but nothing links them. DSA Art. 17 statements of reason need a findable home. Instagram has "Account Status" (Secondary). |
| **About and legal** (Terms, Privacy, Community guidelines, Cookies, Contact/imprint, licences, app version) | **RECOMMENDED α** | Links to PUB-10. DSA Art. 12/14 and ZET čl. 6 need easy access ([legal facts](2026-11-01-legal-platform-facts.md)). An app version helps alpha bug reports. |
| **Export format** stated | **RECOMMENDED α** (spec, not a new screen) | GDPR Art. 20(1) asks for a "structured, commonly used and machine-readable format" (**Verified**, [Art. 20](https://gdpr-info.eu/art-20-gdpr/)). Proposal: ZIP of JSON plus a short README; built as a background job; download link by email and in-app; the link expires. Discord ships a ZIP of files (Secondary), Letterboxd a ZIP of CSVs (Secondary). |
| **Personalisation / compatibility consent toggle** | **OPEN, counsel** | Only if the legal basis for Music DNA matching is consent. Then Art. 7(3) applies: withdrawal "as easy" as giving it (**Verified**, [Art. 7](https://gdpr-info.eu/art-7-gdpr/)). Ties to the DPIA. |
| **Email preferences** (product news vs. service mail) | **RECOMMENDED α** (inside SET-06) | Service mail (security, deletion) cannot be switched off. Any news mail must be opt-in (Inference). |
| **Privacy contact** link in Your data | **RECOMMENDED α** | Gives a route for GDPR rights the UI does not cover (objection, restriction). Art. 12(3): answer within one month (**Verified**, [Art. 12](https://gdpr-info.eu/art-12-gdpr/)). |
| **Cookie / consent settings** | **Not needed α** | Only if non-essential cookies or analytics are added. Then a consent screen is required (Inference). **Scope flag:** choosing analytics is a provider decision. |
| **"Why am I seeing this"** (recommender transparency) | **Later wave (B4, with SET-08)** | DSA Art. 27 is for online platforms. Art. 19 exempts micro and small firms ([legal facts](2026-11-01-legal-platform-facts.md)). Still good for trust once Discovery ranks content. Art. 27(3): if several orderings exist, users choose "at any time" (**Verified**, [Art. 27](https://www.eu-digital-services-act.com/Digital_Services_Act_Article_27.html)). |
| **Muted words / hidden words** | **Later wave, OPEN (scope change)** | Instagram, X and Bluesky have it. Not in the Master Prompt list. Owner decision. |
| **Sensitive content filter** | **Not needed** | 18+ community, no media uploads at α. Revisit with uploads (Inference). |
| **Switch / add account** | **Not needed** | Invite-only, one person = one account. Multi-account switching invites ban evasion (Inference). |
| **Connected apps / app passwords** | **Not needed** | No third-party API. Google link stays in SET-02. |
| **Screen time / quiet mode** | **Not needed α** | One Daily Drop a day is already low-pressure. Quiet hours could fit SET-06 later. |
| **Birthday / age field** | **OPEN** | Bluesky shows Birthday in Account (Verified). Depends on the 18+ age policy review (audit L-04). Do not add silently. |

## 4. Proposed alpha settings index
Order follows Bluesky and Instagram: identity → safety → how the app behaves → data → support → log out. Croatian labels are suggestions.

1. **Your account** · *Tvoj račun*
   - Edit profile · *Uredi profil* (PROF-08: display name, bio, avatar)
   - Account · *Račun* (SET-02: email, password, Google; username → SET-03)
   - Security · *Sigurnost* (SET-04: 2FA, recovery codes, sessions, log out of all devices)
2. **Privacy and safety** · *Privatnost i sigurnost*
   - Privacy · *Privatnost* (SET-05)
   - Blocked and muted accounts · *Blokirani i utišani računi* (SAFE-08)
   - Account status · *Stanje računa* (SAFE-04, SAFE-05, SAFE-07) **new entry**
3. **Preferences** · *Postavke aplikacije*
   - Notifications · *Obavijesti* (SET-06, incl. Daily Drop reminder)
   - Language and region · *Jezik i regija* (SET-07)
   - Accessibility · *Pristupačnost* → Reduce motion · *Smanji pokrete* **new section**
4. **Your data** · *Tvoji podaci* (SET-09)
   - Download your data · *Preuzmi svoje podatke*
   - Deactivate or delete account · *Deaktiviraj ili izbriši račun*
   - Privacy contact · *Kontakt za privatnost* **new link**
5. **Help and about** · *Pomoć i informacije*
   - Help and feedback · *Pomoć i povratne informacije* (SET-12)
   - Community guidelines · *Pravila zajednice* (PUB-10)
   - Terms, privacy and cookies · *Uvjeti, privatnost i kolačići* (PUB-10)
   - About GrooveRift · *O GrooveRiftu* (contact, imprint, licences, version) **new**
6. **Log out** · *Odjava* **new** (own row, last, not red: it is not destructive)

Later waves add rows in place: Discovery (B4) under Preferences; Verification request (B5) under Your account; Invites (B6) stays in the profile menu. Interaction limits (B3) sit inside Privacy.

## 5. Name, username, delete, log out
**Where:**
- **Display name:** Edit profile on every platform (Inference from all help pages). GrooveRift: Profile → "Edit profile" button and Settings → Edit profile. Instagram reportedly limits display name changes to twice in 14 days (Secondary). No hard limit recommended for α; rate-limit against abuse (Inference).
- **Username:** in Account on Bluesky ("Handle", **Verified** [source](https://github.com/bluesky-social/social-app/blob/main/src/screens/Settings/AccountSettings.tsx)), X and Reddit; in Edit profile on Instagram and TikTok. GrooveRift: Account → Username (SET-03). Keep it away from Edit profile so it feels deliberate.
- **Delete account:** Account or "Your data" area everywhere. Bluesky: Account → Export my data · Deactivate account · Delete account, in that order (**Verified**). GrooveRift: Your data, with export offered first.
- **Log out:** last row of the settings list on Bluesky (**Verified**), Discord and Instagram (Secondary).

**Username limits (for OQ-15):**
- TikTok: once every 30 days (Secondary, third-party guides).
- Instagram: the old handle can be reclaimed for about 14 days, "in most cases" (Secondary).
- X: a deleted account's username is released after the 30-day deactivation window (Secondary, [help excerpt](https://help.x.com/managing-your-account/how-to-deactivate-x-account)).
- **Inference:** "once per 30 days" matches TikTok. During the reservation only the previous owner may reclaim the handle. U-04 (no redirect) stays.

**Delete flows compared:**
| Platform | Grace / reactivation | Re-auth and confirmation | Label |
|---|---|---|---|
| Instagram | 30 days, cancel by logging in; full erasure may take up to 90 days | shows deletion date | Secondary |
| Threads | 30 days, cancel by logging in; 90-day wait to sign up again | — | Secondary ([help](https://help.instagram.com/313703828012423/)) |
| X | 30-day deactivation, then deletion | password | Secondary |
| TikTok | 30 days deactivated, reactivate by logging in | verification | Secondary |
| Discord | 14 days, cancel by logging in; owned servers must be transferred or deleted first | password | Secondary |
| Spotify | 7-day reactivation link by email; same email reusable after 14 days | email | **Verified** ([support](https://support.spotify.com/us/article/close-account/)) |
| Reddit | immediate, username released; content stays but unlinked | password (Google/Apple users must set one) | Secondary ([help](https://support.reddithelp.com/hc/en-us/articles/204579509-How-do-I-delete-my-account)) |
| Bluesky | immediate and permanent; deactivate is the reversible option | password **and** an emailed one-time token | **Verified** ([lexicon](https://github.com/bluesky-social/atproto/blob/main/lexicons/com/atproto/server/deleteAccount.json)) |

**RECOMMENDED pattern for SET-09 (Inference):**
1. Show what is deleted, what stays (for example anonymised replies, if decided) and offer "Download your data" first.
2. Re-authenticate: password, or a fresh Google sign-in, plus 2FA if enabled.
3. Final confirm button names the action ("Izbriši račun"). Show the exact deletion date.
4. **30-day grace period**, the most common length. The account turns "Not available" (IA8) at once. All sessions end. A confirmation email carries a cancel route; logging in during the grace period offers "Keep account".
5. After the grace period, a pg-boss job deletes the data (`DeletionRequest` in the domain model). Backups age out on a stated schedule.
6. **Counsel check:** a 30-day grace plus job time must still fit Art. 12(3)'s one month, or be framed as the member's own choice. Deactivate stays separate and reversible with no deadline.

## Not verified
- Instagram, X, TikTok, Discord and Reddit help pages could not be read directly (blocked or empty). Their facts come from search excerpts and third-party guides.
- Exact current menu labels on Instagram, Threads, X, Reddit, Discord and TikTok. The "?" cells in §2 are unknown, not absent.
- Instagram's display name limit and username revert window.
- TikTok's 30-day username rule (no official page found).
- Discord's exact pending-deletion length (14 vs 15 days reported).
- Whether a 30-day grace period fits GDPR Art. 12(3) as GrooveRift would run it (counsel).
- Letterboxd and Last.fm settings were not compared: pages gave too little detail.
