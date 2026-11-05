-- Reverts 0003_alpha_constraints (step 5.2).
DROP TRIGGER IF EXISTS follow_refuse_blocked ON "follow";
DROP FUNCTION IF EXISTS follow_refuse_blocked();
DROP TRIGGER IF EXISTS evidence_access_no_truncate ON "evidence_access";
DROP TRIGGER IF EXISTS evidence_access_no_update_delete ON "evidence_access";
DROP FUNCTION IF EXISTS evidence_access_append_only();
ALTER TABLE "user" DROP CONSTRAINT IF EXISTS "user_status_check";
