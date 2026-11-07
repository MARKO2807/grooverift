-- Reverts 0010_media (step 5.11). The image columns go first (their foreign keys point at media), then the tables.
DROP INDEX IF EXISTS "profile_photo_uq";--> statement-breakpoint
DROP INDEX IF EXISTS "feedback_report_screenshot_uq";--> statement-breakpoint
DROP INDEX IF EXISTS "daily_drop_answer_image_uq";--> statement-breakpoint
DROP INDEX IF EXISTS "comment_image_uq";--> statement-breakpoint
ALTER TABLE "profile" DROP CONSTRAINT IF EXISTS "profile_photo_id_media_id_fk";--> statement-breakpoint
ALTER TABLE "feedback_report" DROP CONSTRAINT IF EXISTS "feedback_report_screenshot_id_media_id_fk";--> statement-breakpoint
ALTER TABLE "daily_drop_answer" DROP CONSTRAINT IF EXISTS "daily_drop_answer_image_id_media_id_fk";--> statement-breakpoint
ALTER TABLE "comment" DROP CONSTRAINT IF EXISTS "comment_image_id_media_id_fk";--> statement-breakpoint
ALTER TABLE "enforcement_action" DROP COLUMN IF EXISTS "removed_image_id";--> statement-breakpoint
ALTER TABLE "profile" DROP COLUMN IF EXISTS "photo_id";--> statement-breakpoint
ALTER TABLE "feedback_report" DROP COLUMN IF EXISTS "screenshot_id";--> statement-breakpoint
ALTER TABLE "daily_drop_answer" DROP COLUMN IF EXISTS "image_id";--> statement-breakpoint
ALTER TABLE "comment" DROP COLUMN IF EXISTS "image_id";--> statement-breakpoint
DROP TABLE IF EXISTS "artist_photo";--> statement-breakpoint
DROP TABLE IF EXISTS "media";
