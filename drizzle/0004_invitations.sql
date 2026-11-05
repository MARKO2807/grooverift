ALTER TABLE "invitation" ADD COLUMN "locale" text DEFAULT 'hr' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "invitation_open_email_uq" ON "invitation" USING btree ("email") WHERE "invitation"."status" = 'sent';--> statement-breakpoint
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_email_normalised" CHECK ("invitation"."email" = lower(btrim("invitation"."email")));--> statement-breakpoint
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_locale" CHECK ("invitation"."locale" in ('hr', 'en'));