# Owner setup checklist (accounts and registrations)

_Written 2026-11-05 (session 25). Everything Claude cannot do for the project: external accounts, registrations and money (CLAUDE.md approval gates). Each item says what it unblocks, so the order can follow the build. Prices and terms are from earlier research; re-check them on the provider's site before paying (HANDOFF, Notes)._

## Order

| # | Item | Unblocks | Cost | Blocks today? |
|---|---|---|---|---|
| 1 | `git push` after each session | GitHub Actions run on the hosted runner | $0 | no |
| 2 | Project mailbox on grooverift.com (A4) | the MusicBrainz User-Agent contact; later the contact page (PUB-10) | depends on the mail host | **yes, step 5.3** |
| 3 | MetaBrainz registration (A4, D-018) | live MusicBrainz lookups in step 5.3 | $0 (Stealth Start-Up) | **yes, step 5.3** |
| 4 | A7 accounts (OQ-33): Render, Cloudflare R2, email provider, error tracking, Google OAuth | staging (4.11), images (5.11), real push tests (5.12), production email | about $20/month | no for 5.2–5.10; yes for 5.11 and the alpha |
| 5 | Accountant and lawyer (`docs/legal/questions-for-counsel.md`) | final legal pages, the legal entity (OQ-05), retention periods (B.3), the DSA notice scope (B.5) | quote | yes, before any invitation |

## 2. Project mailbox (A4)

1. Create one mailbox on the grooverift.com domain with the mail host you already use for the domain, or add one (any EU host is fine).
2. Pick a role address, not a personal one, for example `dev@grooverift.com` or `api@grooverift.com`. MusicBrainz shows it to their operators only; it is how they contact the project if the app misbehaves.
3. Tell Claude the address. It goes into the environment variable `MUSICBRAINZ_CONTACT` (`.env.local` and later Render), never into the code or a commit.

## 3. MetaBrainz registration (A4, D-018)

1. Create a MusicBrainz account at <https://musicbrainz.org/register> with the project mailbox from step 2.
2. Sign in at <https://metabrainz.org/supporters> and register the project as a supporter. Choose the free tier for a stealth start-up or non-commercial project (D-018: Stealth Start-Up, $0). Describe the use honestly: "artist lookups for a music community app, about 1 request per second, local cache".
3. Keep the confirmation email. Nothing else is needed for step 5.3: the API itself needs no key, only the polite rate (1 request per second, built into the client) and a User-Agent of the form `GrooveRift/0.1 ( <mailbox> )`.
4. Bronze tier ($100/month) is only for public launch or monetisation (D-018); not now.

## 4. A7 accounts (OQ-33)

The exact clicks and the environment values are in [`deploy-runbook.md`](deploy-runbook.md) §1–§5. Suggested order, because each one is independent:

1. **Render** (Frankfurt): web service, background worker, PostgreSQL. Runbook §1.
2. **Cloudflare R2** with EU jurisdiction: one bucket, one API token limited to it. Runbook §2.
3. **Email provider** (security and account mail only, OQ-32): Scaleway TEM or the fallback in the runbook; add the DNS records it asks for on grooverift.com. Runbook §3.
4. **Error tracking** (GlitchTip EU or Sentry EU). Runbook §5.
5. **Google OAuth client** for "Prijava s Googleom". Runbook §4.

Send Claude only the **names** of what you created (service names, bucket name, region). Put secrets straight into Render's environment settings yourself; never paste them into the chat (CLAUDE.md: never paste credentials into prompts).

Push notifications (step 5.12) need **no account**: Claude generates the VAPID keys locally and you paste the private one into Render.

## 5. What Claude does when each item lands

- Mailbox and MetaBrainz → step 5.3 (catalogue and Music DNA) can start.
- A7 → step 4.11 (staging, runbook §6 checks), 5.11 (images), the real-device push check in 5.12.
- Counsel → the legal pages lose their draft mark; invitations can be planned (owner approval, Master Prompt §2A.8).
