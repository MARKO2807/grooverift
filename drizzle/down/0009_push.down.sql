-- Reverts 0009_push (step 5.12).
ALTER TABLE "daily_drop_reminder" ADD COLUMN IF NOT EXISTS "paused_until" timestamp with time zone;--> statement-breakpoint
DROP INDEX IF EXISTS "push_subscription_session_idx";--> statement-breakpoint
ALTER TABLE "push_subscription" DROP CONSTRAINT IF EXISTS "push_subscription_session_id_session_id_fk";--> statement-breakpoint
ALTER TABLE "push_subscription" DROP COLUMN IF EXISTS "failures";--> statement-breakpoint
ALTER TABLE "push_subscription" DROP COLUMN IF EXISTS "paused_until";--> statement-breakpoint
ALTER TABLE "push_subscription" DROP COLUMN IF EXISTS "session_id";--> statement-breakpoint
ALTER TABLE "daily_drop_reminder" DROP COLUMN IF EXISTS "last_reminded_on";
