# Independent review: step 5.2 data model and data-access layer

_Session 25, 2026-11-05. Read-only subagent review (High) of `src/lib/db/schema/product.ts`, the 0002/0003 migrations, `src/lib/data/*`, the DSA notice action and the ESLint boundary, against `visibility-matrix.md` §4 and the domain-model invariants. The plan's acceptance for 5.2 asks for it._

## Fixed in the same step

| # | Finding | Fix |
|---|---|---|
| H1 | Account deletion would fail (answers with others' comments) and would erase enforcement actions and appeals | Answer and comment authors, `enforcement_action.subject_user_id` and `appeal.appellant_id` are nullable with `ON DELETE SET NULL`; body checks allow an emptied body on a deleted row; db test deletes a member with a commented answer and a warning |
| M1 | Database error messages carry query parameters (notice text, answer bodies) into logs | `src/lib/data/db-errors.ts` logs and rethrows only the PostgreSQL code and constraint; used by the notice action, `createAnswer` and `audit()` |
| M2 | A follow could commit just after a block | Pair advisory lock in follow and block paths; `follow_refuse_blocked` trigger (migration 0003); db test |
| M3 | Staff without a second factor got staff visibility in the policy | `loadViewer` reads `two_factor_enabled` and treats such staff as members; db test |
| M4 | Unfinished onboarding was hidden only on the profile route | `onboarded` fact on `Owner` and `Viewer` in the policy: hidden like a deactivated account, no writes; unit and db tests |
| M5 | The import rule could be bypassed through `db().query`, the client or relative paths | The relational API knows only auth and foundation tables; pages and components may not import `@/lib/db/*` (Phase 4 admin pages excepted until 5.9) |
| L1 | Block and mute distinguished unknown ids | Same answer for any well-formed id; db test |
| L2 | A moderator-removed answer could be deleted to free the slot | `deleteOwnAnswer` skips removed answers; db test |
| L3 | `ProfileView` carried the owner's status and settings | Returns a projection (id, self, relation, allowed sections) |
| L5 | Limits differed from plan §1.2 | Answer 1,500, comment 750, bio 200; `post` 30/h shared, report 10/day, invite 50/day, follow 60/h, search 2/s; `createAnswer` and `followMember` consume |
| L6 | Redirect loops refused only at read time | `addRedirect` refuses a loop or a missing target; db test |
| L9 | Answers of unpublished questions were readable by id | `visibleAnswers` checks the question is published |

## Carried to later steps (recorded, not forgotten)

| # | Finding | Where |
|---|---|---|
| M6 | Leftmost `X-Forwarded-For` may be client-controlled if Render appends | Runbook §1 first-deploy check with a forged header; switch to the proxy-appended entry if needed. Also: 5 notices per IP per hour may block notifiers behind carrier NAT; revisit with counsel B.5 |
| L4 | `canInteract` allows when `Viewer.status` is missing | `loadViewer` always sets it; make it required when the policy gets its next change (5.5) |
| L7 | No storage for declined follow requests (J4 E6: one new request per 7 days) | Step 5.5 adds a `follow_decline` record |
| L8 | `username_reservation` primary key blocks a later reservation; check and claim can race | Step 5.5 (username change) upserts and claims in one transaction |
| L10 | `user.status` is independent of Better Auth's `banned`; suspension does not revoke sessions | Step 5.9 (enforcement) sets both and revokes sessions |
| L11 | Invitation email normalisation and one open invite per email are not enforced in the database | Step 5.4 |
| Note | The app connects as the table owner, so append-only triggers can be dropped by a migration | Phase 6 hardening: a separate migration role |
