# Closed technical alpha: acceptance criteria (draft v0.1)

- **Status:** DRAFT (Phase 2) for owner review. Final criteria are approved before Phase 5 starts.
- **Gate G-A** (invitations) requires **every** item below to be checked off with evidence (test reports, drill logs, documents), plus explicit owner approval (§2A).

## 1. Scope readiness
- [ ] Alpha feature set approved by the owner (OQ-07). Every enabled feature works end to end; incomplete features are behind flags and inaccessible.
- [ ] HR and EN UI complete for every enabled screen (automated missing-key check passes).
- [ ] The alpha is clearly labelled as an incomplete technical alpha in the UI and in the tester notice.

## 2. Security and privacy
- [ ] Authorization test suite covers every enabled object type × relationship in the visibility matrix: **100 % pass**.
- [ ] Independent security review (subagent + checklist) completed; no open critical or high findings.
- [ ] Staff accounts use passkeys or TOTP; sessions can be revoked; audit log is active.
- [ ] Rate limits on auth, posting, reporting, invites and uploads (if enabled).
- [ ] No private content in logs, push payloads, emails or error reports (verified by tests or inspection).
- [ ] Data export and account deletion work end to end (tested).
- [ ] Dependency scan clean (no known critical vulnerabilities) at release time.

## 3. Safety and moderation
- [ ] Block, mute and report work on every enabled interaction.
- [ ] Moderation queue, enforcement actions with statement of reasons, appeal path.
- [ ] Named moderator(s) and response-time commitment (OQ-06) communicated to testers.
- [ ] Community Guidelines published.

## 4. Reliability and operations
- [ ] Daily Drop: 14 consecutive days of successful automatic publication in staging, **including one simulated failure that was recovered** via retry or reserve, with an alert received.
- [ ] Reserve of at least 14 approved Daily Drop questions (HR + EN).
- [ ] Backups: PITR enabled; daily off-system encrypted dump; **one documented restore drill** within targets (RPO ≤ 15 min PITR / ≤ 24 h off-system; RTO ≤ 4 h).
- [ ] Monitoring: error tracking, uptime checks, alert routing to the owner's phone or email.
- [ ] Incident runbook (severity levels, kill switches via feature flags, rollback procedure) and a tested rollback of one deploy.

## 5. Accessibility and quality
- [ ] WCAG 2.2 AA: automated axe checks pass on all alpha screens, plus a manual keyboard and screen-reader pass of core journeys.
- [ ] Playwright E2E for: invite → signup → onboarding → Daily Drop answer → reply → report → block → export → delete.
- [ ] Performance: core screens usable on a mid-range Android phone over a throttled 4G profile. Initial page load target defined in Phase 3 (e.g. LCP < 2.5 s).

## 6. Legal and communication
- [ ] Legal entity / controller defined (OQ-05).
- [ ] ToS, Privacy Policy, tester notice and provider info reviewed by counsel.
- [ ] DPIA completed (if counsel confirms it is required).
- [ ] MetaBrainz registration done (D-018).
- [ ] Feedback channel live; testers informed about data carry-over (OQ-09).

## 7. Alpha learning goals (privacy-conscious, no vanity metrics)
- Do testers understand Daily Drop and Music DNA without help? (Qualitative interviews or survey.)
- Share of testers who answered 3 or more Daily Drops in the first 2 weeks.
- Crash-free session rate; number of critical bugs.
- Report handling time.
- Top 5 friction points.
