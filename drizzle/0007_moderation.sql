-- Step 5.9 (safety and moderation): case outcome and decider, one open case per object (J5 E4), one open report
-- per reporter and object, one appeal per decision with the reviewer's reasons, the appeal window and the
-- acknowledgement of the SAFE-07 restriction screen, and length checks matching the forms.
ALTER TABLE "appeal" ADD COLUMN "outcome_text" text;--> statement-breakpoint
ALTER TABLE "enforcement_action" ADD COLUMN "appeal_until" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "enforcement_action" ADD COLUMN "acknowledged_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "enforcement_action" ADD COLUMN "removes_content" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "report" ADD COLUMN "target_handle" text;--> statement-breakpoint
ALTER TABLE "moderation_case" ADD COLUMN "outcome" text;--> statement-breakpoint
ALTER TABLE "moderation_case" ADD COLUMN "decided_by" uuid;--> statement-breakpoint
ALTER TABLE "moderation_case" ADD COLUMN "decided_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "moderation_case" ADD CONSTRAINT "moderation_case_decided_by_user_id_fk" FOREIGN KEY ("decided_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "appeal_action_uq" ON "appeal" USING btree ("action_id");--> statement-breakpoint
CREATE INDEX "appeal_status_idx" ON "appeal" USING btree ("status","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "moderation_case_open_target_uq" ON "moderation_case" USING btree ("target_type","target_id") WHERE "moderation_case"."state" in ('open', 'in_progress');--> statement-breakpoint
CREATE UNIQUE INDEX "report_open_uq" ON "report" USING btree ("reporter_id","target_type","target_id") WHERE "report"."status" in ('open', 'in_review');--> statement-breakpoint
ALTER TABLE "appeal" ADD CONSTRAINT "appeal_text_len" CHECK (char_length("appeal"."text") between 1 and 1000);--> statement-breakpoint
ALTER TABLE "enforcement_action" ADD CONSTRAINT "enforcement_sor_len" CHECK (char_length("enforcement_action"."statement_of_reasons") between 1 and 2000);--> statement-breakpoint
ALTER TABLE "moderation_case" ADD CONSTRAINT "moderation_case_outcome" CHECK ("moderation_case"."outcome" is null or "moderation_case"."outcome" in ('action', 'none'));--> statement-breakpoint
ALTER TABLE "report" ADD CONSTRAINT "report_details_len" CHECK ("report"."details" is null or char_length("report"."details") <= 500);