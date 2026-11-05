# Review 5.6: Daily Drop editorial and publication

_Session 29, 2026-11-05. Independent read-only review by a subagent (Opus, High) of the uncommitted step 5.6 code, followed by fixes in the same session. Scope: `src/lib/data/editorial.ts`, `src/lib/editorial/*`, `src/worker.ts`, migration 0006 with its down file, the pages under `src/app/[locale]/(app)/admin/editorial/`, the admin overview and layout, `src/components/admin/editorial*.tsx`, the db and e2e tests._

## Verified as correct (by the reviewer)
- The nested `tx.transaction` in drizzle 0.45.4 is a savepoint (`rollback to savepoint` on error); the outer transaction stays usable and the failed run row commits.
- The attempt counter is read and written under the date's advisory lock; `publication_run_attempt_uq` backs it up.
- Two dates cannot take the same reserve question (`FOR UPDATE SKIP LOCKED` held to the outer commit).
- A schedule racing a run: the unique index makes one side fail (`date-taken`, or the run fails and its retry publishes).
- pg-boss 12.38: `retryCount` is 4 on the fifth run, so `final: retryCount >= PUBLISH_RETRY_LIMIT` is right; retries keep `created_on`, so `publishDateOf` is stable.
- Authorization: every page runs `adminPageGate("editor", "admin")` (role and second factor), every data function checks `mayEdit` again, withdraw checks the admin role twice plus a recent sign-in; no IDOR found. Member reads filter on `status = 'published'`.
- `publication_run.error` holds only an error code and a constraint name; the alert emails carry dates only.

## Findings and what was done

| # | Severity | Finding | Fix |
|---|---|---|---|
| 1 | Medium | A failure outside the publication's savepoint (the lock, the `live` check, the run insert, the flag read, a dropped connection) on the last retry sent no alert, wrote no audit and left the question `scheduled` | `runPublication` now catches every error: the audit records the error code, and on the scheduled job's last retry it marks the scheduled question failed (`markScheduledFailed`) and emails staff, each step guarded |
| 2 | Low–medium | After a withdraw, a worker restart's catch-up job would fill the date from the reserve on its own; `singletonKey` alone does not deduplicate on a standard queue, so every restart on an empty day repeated the critical email | The job never refills a withdrawn date from the reserve (outcome `withdrawn`, no run row); a question an editor schedules for that date on purpose is still published; "Publish now" may refill (`allowRefill`). The catch-up uses `singletonKey` with `singletonSeconds: 86400` |
| 3 | Low | A reserve row briefly locked by an editor made the run report `empty` (critical alert, no retry) | When the locked-skipping pick finds nothing but complete reserve questions exist, the run fails with `reserve_busy` and is retried |
| 4 | Low | The 0006 down file turned a withdrawn question into `failed` with its date, a candidate for "Publish now" | The down file makes it a draft without a date |
| 5 | Low | drizzle applies pending migrations in one transaction; a later migration using `'withdrawn'` would fail on a fresh database | Noted in `drizzle/0006_editorial.sql` |
| 6 | Low | "Publish now" did not check `mayEdit` (an inactive account with a live session) | Checked |
| 7 | Low | A question scheduled for a date the worker missed entirely stayed `scheduled` without a warning | `editorialHealth().stale`; shown on ADM-01, the calendar and the jobs page, and included in the daily warning email |

Tests added: `tests/db/editorial.test.ts` (withdrawn date not refilled by the job, a scheduled replacement still published, "Publish now" refills from the reserve, `reserve_busy` under a held lock, the stale date in health), `tests/db/worker.test.ts` (`publishDateOf`), the migration test (0006 down). `npm run test:db` 94 passed after the fixes.
