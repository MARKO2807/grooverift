-- Step 5.2: constraints Drizzle does not express in the schema files.

-- Account status values (policy AccountStatus, domain model §1).
ALTER TABLE "user" ADD CONSTRAINT "user_status_check"
  CHECK ("status" IN ('active', 'deactivated', 'suspended', 'banned', 'pending_deletion', 'deleted'));
--> statement-breakpoint

-- Invariant 7: the evidence access log is append-only, like audit_log.
CREATE OR REPLACE FUNCTION evidence_access_append_only() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'evidence_access is append-only (% rejected)', TG_OP;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER evidence_access_no_update_delete
  BEFORE UPDATE OR DELETE ON "evidence_access"
  FOR EACH ROW EXECUTE FUNCTION evidence_access_append_only();
--> statement-breakpoint
CREATE TRIGGER evidence_access_no_truncate
  BEFORE TRUNCATE ON "evidence_access"
  FOR EACH STATEMENT EXECUTE FUNCTION evidence_access_append_only();
--> statement-breakpoint

-- Invariant 2, second line of defence (review M2): no follow row may exist between a blocked pair, whatever the
-- write path. The data layer also takes a pair lock so a follow and a block never interleave.
CREATE OR REPLACE FUNCTION follow_refuse_blocked() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "block"
    WHERE ("blocker_id" = NEW."follower_id" AND "blocked_id" = NEW."followee_id")
       OR ("blocker_id" = NEW."followee_id" AND "blocked_id" = NEW."follower_id")
  ) THEN
    RAISE EXCEPTION 'follow refused: the pair is blocked' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER follow_refuse_blocked
  BEFORE INSERT OR UPDATE ON "follow"
  FOR EACH ROW EXECUTE FUNCTION follow_refuse_blocked();
