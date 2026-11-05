# Threat model: v0.1 (alpha scope + architecture baseline)

- **Status:** DRAFT (Phase 2). Revisit at the start of Phase 4 and before alpha invitations (Phase 6). Extend for every beta wave.
- **Method:** STRIDE per component, plus abuse cases. Architecture per ADR-0002.

## 1. Assets (what we protect)
| Asset | Sensitivity |
|---|---|
| Credentials, sessions, TOTP secrets, passkeys, recovery codes | Critical |
| Admin and moderator accounts | Critical |
| Email addresses, IP addresses, device info | High (personal data) |
| Private profiles, followers-only content, Music DNA marked private | High |
| DMs, intro requests, recommendations | High |
| Reports, reporter identity, moderation evidence, fact-check notes | High |
| Backups and database dumps | Critical (they contain everything above) |
| Daily Drop publication integrity | Medium (trust and reputation) |
| Brand assets, editorial content | Medium |

## 2. Trust boundaries
Browser/PWA ↔ Next.js web service ↔ Postgres. Web ↔ worker (via the job queue in Postgres). App ↔ R2 (signed URLs). App ↔ MusicBrainz API, email provider, Web Push services (Apple, Google, Mozilla), GlitchTip. Admin UI ↔ the same app, with an elevated role.

## 3. STRIDE highlights
| Threat | Example | Mitigations (planned) |
|---|---|---|
| **Spoofing** | Credential stuffing, phishing of admin accounts, Google account linking takeover | Rate limits and lockout with backoff; breached-password check (k-anonymity API, to evaluate); verified email before linking (S-09); **passkeys or TOTP mandatory for staff**; session rotation on privilege change |
| **Tampering** | Mass-assignment (e.g. `role`, `status` in request bodies); editing other people's posts | Zod allow-list schemas per endpoint; ownership checks in the policy module; DB constraints |
| **Repudiation** | A moderator denies an action | Append-only audit log for all staff and sensitive actions; EvidenceAccess log |
| **Information disclosure** | **BOLA/IDOR** (guessing IDs to read private posts, DMs, saved items); leaks through search, notifications, OG previews, caches, logs | Single policy module + authorization test suite (R-01); non-sequential IDs; `Cache-Control: private, no-store` on personalized responses; push payloads without content; log redaction; signed, expiring media URLs |
| **Denial of service** | Upload floods, expensive search queries, mass mentions, spam | Per-user and per-IP rate limits; upload size and type limits; query timeouts; job queue backpressure |
| **Elevation of privilege** | A member reaches admin routes; an editor reads DMs | Server-side role checks on every admin action, never UI hiding alone; least-privilege roles (editor ≠ moderator ≠ admin); 📄 case-gated access |

## 4. Abuse cases (social threats)
| Abuse | Mitigation |
|---|---|
| Harassment via replies, mentions or DMs | Block, mute, interaction limits, mention policy, DM only between Mutuals, rate-limited intro requests |
| Harassment after a block via a new account | Invite-only gate; report category; moderator tooling to link accounts (privacy-reviewed) |
| Impersonation (artists, members) | Username reservation after changes, impersonation report priority, manual verification |
| Doxxing via photo metadata | EXIF/GPS strip on all images |
| Spam and self-promotion | Rate limits, artist promotion labelling, reports |
| Fake engagement (reaction farming) | Ranking not dominated by reactions; anomaly checks later |
| Malicious uploads (malware, polyglot files, illegal content) | Magic-byte validation, re-encoding, no original file served, report and takedown, hash matching (to evaluate) |
| Invite abuse (resale, mass invites) | Email-bound, single-use, expiring invites; quotas; revocation |
| Daily Drop disruption (failed publish, wrong question) | Idempotent job keyed by UTC date, reserve questions, alerts, two-step approval |

## 5. Platform-specific concerns
- **Next.js caching:** personalized and private data must never enter a shared cache. Set an explicit dynamic rendering policy for authenticated routes and add a test for it.
- **Server Actions and route handlers:** every one goes through authentication + policy + validation (lint rule or wrapper).
- **CSRF:** SameSite cookies plus origin checks for state-changing requests.
- **XSS:** no raw HTML from users; Markdown, if used, is sanitized; strict Content-Security-Policy.
- **Secrets:** environment variables on Render only; never in the repo; `.env.example` without values.
- **Supply chain:** lockfile, Dependabot or Renovate, `npm audit` in CI, minimal dependencies.
- **Backups:** encrypted at rest; a separate R2 bucket with restricted credentials; restore drills on an isolated database.

## 6. Open items
- Password composition (D-061): 12 characters plus upper, lower and special, a conscious deviation from NIST SP 800-63B-4 §3.1.1.2 (15 characters for password-only sign-in, no composition rules). Mitigations built in Phase 4: the breached-password check (`src/lib/auth/breached.ts`), the D-077 lockout, TOTP with recovery codes for every member and mandatory for staff (`requireRole`). Passkeys remain deferred. Revisit before the alpha.
- ~~Breached-password check provider (privacy review).~~ Decided (D-054) and **built (session 22)**: Have I Been Pwned range API from the server, k-anonymity with `Add-Padding`, fail-open with the audit event `auth.breach_check.skipped`. The stock Better Auth plugin fails closed, so the project has its own plugin. Counsel question C.10 covers the privacy-policy wording.
- ~~Password hashing parameters.~~ **Built (session 22, R-14 → D-089):** Argon2id through `@node-rs/argon2`, m = 19 MiB, t = 2, p = 1 (OWASP minimum), 32-byte output; `src/lib/auth/password.ts`.
- ~~Sign-in throttling limits.~~ Decided (D-077, session 15) and **built (session 22)**: `src/lib/auth/lockout.ts` with before/after hooks on `/sign-in/email`; Better Auth's own limiter (10 per minute on sign-in, 5 per 10 minutes on sign-up, reset and verification, database storage) throttles bursts in front of it; keys are keyed SHA-256 hashes; locks are audited. A completed password reset clears the 100-failure account lock. The worker prunes stale rows daily.
- **New (session 22):** the CSP uses `style-src 'unsafe-inline'` (React inline styles and Tailwind runtime). Acceptable for the alpha; a nonce for styles is a Phase 6 hardening item. Error tracking waits for A7.
- **Independent security review (session 22, end):** 16 findings, all fixed the same session (D-090, `docs/HANDOFF.md` "Review findings"). The ones that change this model: Google linking requires the provider's verified email (S-09 is now enforced by configuration, not by comment); every admin page and every Better Auth admin endpoint is behind the staff gate (role + second factor) and audited; the client-IP header is mandatory in production so rate limits and lockouts are per client; the pair counter is atomic. **To confirm on the first deploy:** which header Render fills with the client IP (runbook §1) and that `X-Forwarded-For` spoofing cannot reach the application (set `TRUSTED_PROXIES` if Render appends rather than replaces).
- ~~Sign-in wall for visitors (D-076)~~: dropped in D-085 (step 3.9). It was never a security control; what a visitor may see is enforced server-side (D-022).
- Hash matching for known illegal content: availability and legal obligations.
- Account-linking heuristics for ban evasion (privacy trade-off).
- Real-device verification of iOS EU Web Push.
