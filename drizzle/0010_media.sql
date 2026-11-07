-- Step 5.11: images. One media table (re-encoded WebP in object storage), the artist photo with its credit, licence
-- snapshot and the admin hide (D-118), and one optional image reference on profiles, answers, comments and feedback
-- (D-078, D-121). Additive only: no existing row changes, no destructive statement.
CREATE TABLE "artist_photo" (
	"artist_id" uuid PRIMARY KEY NOT NULL,
	"media_id" uuid,
	"status" text NOT NULL,
	"commons_file" text,
	"author" text,
	"attribution" text,
	"title" text,
	"credit_line" text,
	"licence" text,
	"licence_url" text,
	"file_page_url" text,
	"checked_at" timestamp with time zone DEFAULT now() NOT NULL,
	"refresh_after" timestamp with time zone NOT NULL,
	"hidden_at" timestamp with time zone,
	"hidden_by" uuid,
	"hidden_reason" text,
	"failures" integer DEFAULT 0 NOT NULL,
	"snapshot" jsonb,
	CONSTRAINT "artist_photo_status" CHECK ("artist_photo"."status" in ('ok', 'none')),
	CONSTRAINT "artist_photo_reason_len" CHECK ("artist_photo"."hidden_reason" is null or char_length("artist_photo"."hidden_reason") <= 500)
);
--> statement-breakpoint
CREATE TABLE "media" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" text NOT NULL,
	"owner_id" uuid,
	"storage_key" text NOT NULL,
	"content_type" text DEFAULT 'image/webp' NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"byte_size" integer NOT NULL,
	"alt" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"held_until" timestamp with time zone,
	CONSTRAINT "media_storage_key_unique" UNIQUE("storage_key"),
	CONSTRAINT "media_kind" CHECK ("media"."kind" in ('profile_photo', 'artist_photo', 'answer_image', 'comment_image', 'feedback_screenshot')),
	CONSTRAINT "media_alt_len" CHECK ("media"."alt" is null or char_length("media"."alt") <= 300),
	CONSTRAINT "media_size" CHECK ("media"."width" > 0 and "media"."height" > 0 and "media"."byte_size" > 0)
);
--> statement-breakpoint
ALTER TABLE "comment" ADD COLUMN "image_id" uuid;--> statement-breakpoint
ALTER TABLE "daily_drop_answer" ADD COLUMN "image_id" uuid;--> statement-breakpoint
ALTER TABLE "feedback_report" ADD COLUMN "screenshot_id" uuid;--> statement-breakpoint
ALTER TABLE "profile" ADD COLUMN "photo_id" uuid;--> statement-breakpoint
ALTER TABLE "artist_photo" ADD CONSTRAINT "artist_photo_artist_id_artist_id_fk" FOREIGN KEY ("artist_id") REFERENCES "public"."artist"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artist_photo" ADD CONSTRAINT "artist_photo_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artist_photo" ADD CONSTRAINT "artist_photo_hidden_by_user_id_fk" FOREIGN KEY ("hidden_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media" ADD CONSTRAINT "media_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "artist_photo_refresh_idx" ON "artist_photo" USING btree ("refresh_after");--> statement-breakpoint
CREATE UNIQUE INDEX "artist_photo_media_uq" ON "artist_photo" USING btree ("media_id");--> statement-breakpoint
CREATE INDEX "media_owner_idx" ON "media" USING btree ("owner_id");--> statement-breakpoint
ALTER TABLE "comment" ADD CONSTRAINT "comment_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_drop_answer" ADD CONSTRAINT "daily_drop_answer_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback_report" ADD CONSTRAINT "feedback_report_screenshot_id_media_id_fk" FOREIGN KEY ("screenshot_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile" ADD CONSTRAINT "profile_photo_id_media_id_fk" FOREIGN KEY ("photo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "comment_image_uq" ON "comment" USING btree ("image_id");--> statement-breakpoint
CREATE UNIQUE INDEX "daily_drop_answer_image_uq" ON "daily_drop_answer" USING btree ("image_id");--> statement-breakpoint
CREATE UNIQUE INDEX "feedback_report_screenshot_uq" ON "feedback_report" USING btree ("screenshot_id");--> statement-breakpoint
CREATE UNIQUE INDEX "profile_photo_uq" ON "profile" USING btree ("photo_id");