-- Reverts 0007_moderation (step 5.9).
ALTER TABLE "report" DROP CONSTRAINT IF EXISTS "report_details_len";--> statement-breakpoint
ALTER TABLE "moderation_case" DROP CONSTRAINT IF EXISTS "moderation_case_outcome";--> statement-breakpoint
ALTER TABLE "enforcement_action" DROP CONSTRAINT IF EXISTS "enforcement_sor_len";--> statement-breakpoint
ALTER TABLE "appeal" DROP CONSTRAINT IF EXISTS "appeal_text_len";--> statement-breakpoint
DROP INDEX IF EXISTS "report_open_uq";--> statement-breakpoint
DROP INDEX IF EXISTS "moderation_case_open_target_uq";--> statement-breakpoint
DROP INDEX IF EXISTS "appeal_status_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "appeal_action_uq";--> statement-breakpoint
ALTER TABLE "moderation_case" DROP CONSTRAINT IF EXISTS "moderation_case_decided_by_user_id_fk";--> statement-breakpoint
ALTER TABLE "moderation_case" DROP COLUMN IF EXISTS "decided_at";--> statement-breakpoint
ALTER TABLE "moderation_case" DROP COLUMN IF EXISTS "decided_by";--> statement-breakpoint
ALTER TABLE "moderation_case" DROP COLUMN IF EXISTS "outcome";--> statement-breakpoint
ALTER TABLE "enforcement_action" DROP COLUMN IF EXISTS "removes_content";--> statement-breakpoint
ALTER TABLE "enforcement_action" DROP COLUMN IF EXISTS "acknowledged_at";--> statement-breakpoint
ALTER TABLE "enforcement_action" DROP COLUMN IF EXISTS "appeal_until";--> statement-breakpoint
ALTER TABLE "appeal" DROP COLUMN IF EXISTS "outcome_text";--> statement-breakpoint
ALTER TABLE "report" DROP COLUMN IF EXISTS "target_handle";
