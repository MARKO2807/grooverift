-- Reverts 0008_account_data (step 5.10).
ALTER TABLE "feedback_report" DROP CONSTRAINT IF EXISTS "feedback_report_notes_len";--> statement-breakpoint
ALTER TABLE "feedback_report" DROP CONSTRAINT IF EXISTS "feedback_report_text_len";--> statement-breakpoint
ALTER TABLE "feedback_report" DROP CONSTRAINT IF EXISTS "feedback_report_status";--> statement-breakpoint
ALTER TABLE "feedback_report" DROP CONSTRAINT IF EXISTS "feedback_report_kind";--> statement-breakpoint
ALTER TABLE "data_export_request" DROP CONSTRAINT IF EXISTS "data_export_ready_has_archive";--> statement-breakpoint
DROP INDEX IF EXISTS "feedback_report_status_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "deletion_request_open_uq";--> statement-breakpoint
DROP INDEX IF EXISTS "data_export_open_uq";--> statement-breakpoint
ALTER TABLE "feedback_report" DROP CONSTRAINT IF EXISTS "feedback_report_handled_by_user_id_fk";--> statement-breakpoint
ALTER TABLE "feedback_report" DROP COLUMN IF EXISTS "handled_at";--> statement-breakpoint
ALTER TABLE "feedback_report" DROP COLUMN IF EXISTS "handled_by";--> statement-breakpoint
ALTER TABLE "feedback_report" DROP COLUMN IF EXISTS "locale";--> statement-breakpoint
ALTER TABLE "feedback_report" DROP COLUMN IF EXISTS "reply_by_email";--> statement-breakpoint
ALTER TABLE "feedback_report" DROP COLUMN IF EXISTS "context";--> statement-breakpoint
ALTER TABLE "data_export_request" DROP COLUMN IF EXISTS "attempts";--> statement-breakpoint
ALTER TABLE "data_export_request" DROP COLUMN IF EXISTS "size_bytes";--> statement-breakpoint
ALTER TABLE "data_export_request" DROP COLUMN IF EXISTS "archive";
