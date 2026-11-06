-- Step 5.10 (settings, account and data): the export ZIP kept in its row until A7 brings R2 (D-109), one open
-- export and one open deletion request per member, and the SET-12 feedback fields (context, reply by email,
-- handled by) with checks matching the form.
ALTER TABLE "data_export_request" ADD COLUMN "archive" bytea;--> statement-breakpoint
ALTER TABLE "data_export_request" ADD COLUMN "size_bytes" integer;--> statement-breakpoint
ALTER TABLE "data_export_request" ADD COLUMN "attempts" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "feedback_report" ADD COLUMN "context" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "feedback_report" ADD COLUMN "reply_by_email" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "feedback_report" ADD COLUMN "locale" text DEFAULT 'hr' NOT NULL;--> statement-breakpoint
ALTER TABLE "feedback_report" ADD COLUMN "handled_by" uuid;--> statement-breakpoint
ALTER TABLE "feedback_report" ADD COLUMN "handled_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "feedback_report" ADD CONSTRAINT "feedback_report_handled_by_user_id_fk" FOREIGN KEY ("handled_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "data_export_open_uq" ON "data_export_request" USING btree ("user_id") WHERE "data_export_request"."status" in ('requested', 'building');--> statement-breakpoint
CREATE UNIQUE INDEX "deletion_request_open_uq" ON "deletion_request" USING btree ("user_id") WHERE "deletion_request"."cancelled_at" is null and "deletion_request"."completed_at" is null;--> statement-breakpoint
CREATE INDEX "feedback_report_status_idx" ON "feedback_report" USING btree ("status","created_at");--> statement-breakpoint
ALTER TABLE "data_export_request" ADD CONSTRAINT "data_export_ready_has_archive" CHECK ("data_export_request"."status" <> 'ready' or ("data_export_request"."archive" is not null and "data_export_request"."expires_at" is not null));--> statement-breakpoint
ALTER TABLE "feedback_report" ADD CONSTRAINT "feedback_report_kind" CHECK ("feedback_report"."kind" in ('bug', 'idea', 'other'));--> statement-breakpoint
ALTER TABLE "feedback_report" ADD CONSTRAINT "feedback_report_status" CHECK ("feedback_report"."status" in ('new', 'done'));--> statement-breakpoint
ALTER TABLE "feedback_report" ADD CONSTRAINT "feedback_report_text_len" CHECK (char_length("feedback_report"."text") between 1 and 2000);--> statement-breakpoint
ALTER TABLE "feedback_report" ADD CONSTRAINT "feedback_report_notes_len" CHECK ("feedback_report"."triage_notes" is null or char_length("feedback_report"."triage_notes") <= 2000);