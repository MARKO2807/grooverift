-- Reverts 0006_editorial (step 5.6). PostgreSQL cannot drop an enum value, so the type is rebuilt without it;
-- a withdrawn question becomes a draft without a date, so no publication run can pick it up again (review 5.6 #4). The index and the check that
-- name the column are dropped and recreated exactly as 0002 created them.
UPDATE "daily_drop_question" SET "status" = 'draft', "publish_date" = NULL WHERE "status" = 'withdrawn';--> statement-breakpoint
DROP INDEX IF EXISTS "daily_drop_one_per_date_uq";--> statement-breakpoint
DROP INDEX IF EXISTS "daily_drop_status_idx";--> statement-breakpoint
ALTER TABLE "daily_drop_question" DROP CONSTRAINT IF EXISTS "daily_drop_live_has_date";--> statement-breakpoint
ALTER TABLE "daily_drop_question" ALTER COLUMN "status" DROP DEFAULT;--> statement-breakpoint
ALTER TYPE "public"."drop_status" RENAME TO "drop_status_old";--> statement-breakpoint
CREATE TYPE "public"."drop_status" AS ENUM('draft', 'in_review', 'approved', 'scheduled', 'published', 'failed');--> statement-breakpoint
ALTER TABLE "daily_drop_question" ALTER COLUMN "status" TYPE "public"."drop_status" USING "status"::text::"public"."drop_status";--> statement-breakpoint
ALTER TABLE "daily_drop_question" ALTER COLUMN "status" SET DEFAULT 'draft';--> statement-breakpoint
DROP TYPE "public"."drop_status_old";--> statement-breakpoint
ALTER TABLE "daily_drop_question" ADD CONSTRAINT "daily_drop_live_has_date" CHECK ("daily_drop_question"."status" not in ('scheduled', 'published') or "daily_drop_question"."publish_date" is not null);--> statement-breakpoint
CREATE UNIQUE INDEX "daily_drop_one_per_date_uq" ON "daily_drop_question" USING btree ("publish_date") WHERE "daily_drop_question"."status" in ('scheduled', 'published');--> statement-breakpoint
CREATE INDEX "daily_drop_status_idx" ON "daily_drop_question" USING btree ("status","publish_date");
