-- Step 5.12: push per device bound to its session, the device pause and failures, the reminder once a day.
-- No subscription was ever stored before this step (the feature was off), so the NOT NULL column needs no backfill.
ALTER TABLE "daily_drop_reminder" ADD COLUMN "last_reminded_on" date;--> statement-breakpoint
ALTER TABLE "push_subscription" ADD COLUMN "session_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "push_subscription" ADD COLUMN "paused_until" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "push_subscription" ADD COLUMN "failures" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "push_subscription" ADD CONSTRAINT "push_subscription_session_id_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."session"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "push_subscription_session_idx" ON "push_subscription" USING btree ("session_id");--> statement-breakpoint
ALTER TABLE "daily_drop_reminder" DROP COLUMN "paused_until";
