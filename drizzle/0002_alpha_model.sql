CREATE TYPE "public"."appeal_status" AS ENUM('open', 'upheld', 'overturned');--> statement-breakpoint
CREATE TYPE "public"."artist_availability" AS ENUM('available', 'unavailable');--> statement-breakpoint
CREATE TYPE "public"."case_state" AS ENUM('open', 'in_progress', 'decided', 'closed');--> statement-breakpoint
CREATE TYPE "public"."catalog_entity" AS ENUM('artist', 'genre');--> statement-breakpoint
CREATE TYPE "public"."content_target" AS ENUM('answer', 'comment');--> statement-breakpoint
CREATE TYPE "public"."dna_kind" AS ENUM('genre', 'artist');--> statement-breakpoint
CREATE TYPE "public"."dna_source" AS ENUM('explicit', 'accepted_suggestion');--> statement-breakpoint
CREATE TYPE "public"."drop_status" AS ENUM('draft', 'in_review', 'approved', 'scheduled', 'published', 'failed');--> statement-breakpoint
CREATE TYPE "public"."enforcement_kind" AS ENUM('notice', 'warning', 'restriction', 'suspension', 'ban', 'content_removal');--> statement-breakpoint
CREATE TYPE "public"."export_status" AS ENUM('requested', 'building', 'ready', 'expired', 'failed');--> statement-breakpoint
CREATE TYPE "public"."follow_status" AS ENUM('pending', 'accepted');--> statement-breakpoint
CREATE TYPE "public"."invitation_status" AS ENUM('sent', 'accepted', 'expired', 'revoked');--> statement-breakpoint
CREATE TYPE "public"."notice_category" AS ENUM('csam', 'hate', 'threat', 'privacy', 'copyright', 'fraud', 'other');--> statement-breakpoint
CREATE TYPE "public"."notice_status" AS ENUM('received', 'in_review', 'actioned', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."notification_channel" AS ENUM('in_app', 'push', 'email');--> statement-breakpoint
CREATE TYPE "public"."profile_visibility" AS ENUM('public', 'private');--> statement-breakpoint
CREATE TYPE "public"."report_category" AS ENUM('harassment', 'hate', 'threat', 'sexual', 'minor', 'impersonation', 'spam', 'copyright', 'ai_generated', 'private_info', 'other');--> statement-breakpoint
CREATE TYPE "public"."report_status" AS ENUM('open', 'in_review', 'resolved', 'dismissed');--> statement-breakpoint
CREATE TYPE "public"."run_status" AS ENUM('running', 'succeeded', 'failed');--> statement-breakpoint
CREATE TYPE "public"."section_visibility" AS ENUM('everyone', 'followers', 'mutuals', 'me');--> statement-breakpoint
CREATE TYPE "public"."translation_review" AS ENUM('draft', 'approved');--> statement-breakpoint
CREATE TABLE "appeal" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"action_id" uuid NOT NULL,
	"appellant_id" uuid,
	"text" text NOT NULL,
	"status" "appeal_status" DEFAULT 'open' NOT NULL,
	"reviewer_id" uuid,
	"decided_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "artist" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mbid" uuid,
	"name" text NOT NULL,
	"sort_name" text,
	"disambiguation" text,
	"country" text,
	"begin_year" integer,
	"end_year" integer,
	"availability" "artist_availability" DEFAULT 'available' NOT NULL,
	"last_synced_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "artist_mbid_unique" UNIQUE("mbid")
);
--> statement-breakpoint
CREATE TABLE "block" (
	"blocker_id" uuid NOT NULL,
	"blocked_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "block_blocker_id_blocked_id_pk" PRIMARY KEY("blocker_id","blocked_id"),
	CONSTRAINT "block_not_self" CHECK ("block"."blocker_id" <> "block"."blocked_id")
);
--> statement-breakpoint
CREATE TABLE "canonical_redirect" (
	"from_id" uuid PRIMARY KEY NOT NULL,
	"to_id" uuid NOT NULL,
	"entity_type" "catalog_entity" NOT NULL,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "canonical_redirect_not_self" CHECK ("canonical_redirect"."from_id" <> "canonical_redirect"."to_id")
);
--> statement-breakpoint
CREATE TABLE "catalog_reference" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_type" "content_target" NOT NULL,
	"owner_id" uuid NOT NULL,
	"artist_id" uuid NOT NULL,
	"position" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "comment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"answer_id" uuid NOT NULL,
	"parent_id" uuid,
	"author_id" uuid,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"edited_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"removed_at" timestamp with time zone,
	CONSTRAINT "comment_len" CHECK (char_length("comment"."body") <= 750 and ("comment"."deleted_at" is not null or char_length("comment"."body") >= 1))
);
--> statement-breakpoint
CREATE TABLE "content_snapshot" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" uuid,
	"object_type" text NOT NULL,
	"object_id" uuid NOT NULL,
	"author_id" uuid,
	"content" jsonb NOT NULL,
	"captured_at" timestamp with time zone DEFAULT now() NOT NULL,
	"purge_after" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "daily_drop_answer" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"question_id" uuid NOT NULL,
	"author_id" uuid,
	"body" text NOT NULL,
	"language" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"edited_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"removed_at" timestamp with time zone,
	CONSTRAINT "daily_drop_answer_len" CHECK (char_length("daily_drop_answer"."body") <= 1500 and ("daily_drop_answer"."deleted_at" is not null or char_length("daily_drop_answer"."body") >= 1))
);
--> statement-breakpoint
CREATE TABLE "daily_drop_question" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"publish_date" date,
	"status" "drop_status" DEFAULT 'draft' NOT NULL,
	"is_reserve" boolean DEFAULT false NOT NULL,
	"published_at" timestamp with time zone,
	"created_by" uuid,
	"approved_by" uuid,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "daily_drop_live_has_date" CHECK ("daily_drop_question"."status" not in ('scheduled', 'published') or "daily_drop_question"."publish_date" is not null)
);
--> statement-breakpoint
CREATE TABLE "daily_drop_reminder" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"local_time" time DEFAULT '09:00' NOT NULL,
	"time_zone" text DEFAULT 'Europe/Zagreb' NOT NULL,
	"paused_until" timestamp with time zone,
	"last_notified_question_id" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "daily_drop_translation" (
	"question_id" uuid NOT NULL,
	"locale" text NOT NULL,
	"text" text NOT NULL,
	"review" "translation_review" DEFAULT 'draft' NOT NULL,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	CONSTRAINT "daily_drop_translation_question_id_locale_pk" PRIMARY KEY("question_id","locale"),
	CONSTRAINT "daily_drop_translation_locale" CHECK ("daily_drop_translation"."locale" in ('hr', 'en')),
	CONSTRAINT "daily_drop_translation_len" CHECK (char_length("daily_drop_translation"."text") between 1 and 280)
);
--> statement-breakpoint
CREATE TABLE "data_export_request" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"status" "export_status" DEFAULT 'requested' NOT NULL,
	"file_key" text,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "deletion_request" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"scheduled_for" timestamp with time zone NOT NULL,
	"cancelled_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"steps" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "enforcement_action" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" uuid,
	"subject_user_id" uuid,
	"kind" "enforcement_kind" NOT NULL,
	"target_type" text,
	"target_id" uuid,
	"statement_of_reasons" text NOT NULL,
	"rule_ref" text,
	"starts_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ends_at" timestamp with time zone,
	"decided_by" uuid,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "evidence_access" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" uuid,
	"accessor_id" uuid NOT NULL,
	"object_type" text NOT NULL,
	"object_id" uuid,
	"reason" text NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "external_id" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_type" "catalog_entity" NOT NULL,
	"entity_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"external_id" text NOT NULL,
	"last_synced_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "external_link" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_type" "catalog_entity" NOT NULL,
	"entity_id" uuid NOT NULL,
	"service" text NOT NULL,
	"url" text NOT NULL,
	"source" text DEFAULT 'provider' NOT NULL,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "feedback_report" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"kind" text NOT NULL,
	"text" text NOT NULL,
	"status" text DEFAULT 'new' NOT NULL,
	"triage_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "follow" (
	"follower_id" uuid NOT NULL,
	"followee_id" uuid NOT NULL,
	"status" "follow_status" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"accepted_at" timestamp with time zone,
	CONSTRAINT "follow_follower_id_followee_id_pk" PRIMARY KEY("follower_id","followee_id"),
	CONSTRAINT "follow_not_self" CHECK ("follow"."follower_id" <> "follow"."followee_id")
);
--> statement-breakpoint
CREATE TABLE "genre" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mbid" uuid,
	"slug" text NOT NULL,
	"name_hr" text NOT NULL,
	"name_en" text NOT NULL,
	"family" integer,
	"parent_id" uuid,
	"rank" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "genre_mbid_unique" UNIQUE("mbid"),
	CONSTRAINT "genre_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "invitation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"token_hash" text NOT NULL,
	"invited_by" uuid,
	"status" "invitation_status" DEFAULT 'sent' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"accepted_user_id" uuid,
	"accepted_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "invitation_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "moderation_case" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subject_user_id" uuid,
	"target_type" text NOT NULL,
	"target_id" uuid,
	"priority" integer DEFAULT 2 NOT NULL,
	"state" "case_state" DEFAULT 'open' NOT NULL,
	"assignee_id" uuid,
	"deadline" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "music_dna_entry" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"kind" "dna_kind" NOT NULL,
	"genre_id" uuid,
	"artist_id" uuid,
	"position" integer NOT NULL,
	"source" "dna_source" DEFAULT 'explicit' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "music_dna_one_subject" CHECK (("music_dna_entry"."kind" = 'genre' and "music_dna_entry"."genre_id" is not null and "music_dna_entry"."artist_id" is null) or ("music_dna_entry"."kind" = 'artist' and "music_dna_entry"."artist_id" is not null and "music_dna_entry"."genre_id" is null))
);
--> statement-breakpoint
CREATE TABLE "mute" (
	"muter_id" uuid NOT NULL,
	"muted_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "mute_muter_id_muted_id_pk" PRIMARY KEY("muter_id","muted_id"),
	CONSTRAINT "mute_not_self" CHECK ("mute"."muter_id" <> "mute"."muted_id")
);
--> statement-breakpoint
CREATE TABLE "notice" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category" "notice_category" NOT NULL,
	"url" text NOT NULL,
	"explanation" text NOT NULL,
	"notifier_name" text,
	"notifier_email" text,
	"submitted_by" uuid,
	"status" "notice_status" DEFAULT 'received' NOT NULL,
	"case_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"decided_at" timestamp with time zone,
	CONSTRAINT "notice_explanation_len" CHECK (char_length("notice"."explanation") between 1 and 5000)
);
--> statement-breakpoint
CREATE TABLE "notification" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recipient_id" uuid NOT NULL,
	"type" text NOT NULL,
	"actor_id" uuid,
	"target_type" text,
	"target_id" uuid,
	"group_key" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"read_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "notification_preference" (
	"user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"channel" "notification_channel" NOT NULL,
	"enabled" boolean NOT NULL,
	CONSTRAINT "notification_preference_user_id_type_channel_pk" PRIMARY KEY("user_id","type","channel")
);
--> statement-breakpoint
CREATE TABLE "privacy_settings" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"music_dna" "section_visibility" DEFAULT 'everyone' NOT NULL,
	"lists" "section_visibility" DEFAULT 'everyone' NOT NULL,
	"drop_history" "section_visibility" DEFAULT 'everyone' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profile" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"display_name" text NOT NULL,
	"bio" text,
	"visibility" "profile_visibility",
	"discoverable" boolean DEFAULT true NOT NULL,
	"onboarding_step" text,
	"onboarded_at" timestamp with time zone,
	"interface_locale" text DEFAULT 'hr' NOT NULL,
	"reading_languages" text[] DEFAULT '{hr}'::text[] NOT NULL,
	"time_zone" text DEFAULT 'Europe/Zagreb' NOT NULL,
	"username_changed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profile_username_shape" CHECK ("profile"."username" ~ '^[a-z0-9_]{3,30}$'),
	CONSTRAINT "profile_bio_len" CHECK (char_length("profile"."bio") <= 200),
	CONSTRAINT "profile_display_name_len" CHECK (char_length("profile"."display_name") between 1 and 50)
);
--> statement-breakpoint
CREATE TABLE "publication_run" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"publish_date" date NOT NULL,
	"attempt" integer NOT NULL,
	"status" "run_status" DEFAULT 'running' NOT NULL,
	"question_id" uuid,
	"used_reserve" boolean DEFAULT false NOT NULL,
	"error" text,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "push_subscription" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"endpoint" text NOT NULL,
	"keys" text NOT NULL,
	"device_label" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_success_at" timestamp with time zone,
	CONSTRAINT "push_subscription_endpoint_unique" UNIQUE("endpoint")
);
--> statement-breakpoint
CREATE TABLE "rate_limit_bucket" (
	"key" text PRIMARY KEY NOT NULL,
	"window_start" timestamp with time zone NOT NULL,
	"count" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reaction" (
	"target_type" "content_target" NOT NULL,
	"target_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reaction_target_type_target_id_user_id_pk" PRIMARY KEY("target_type","target_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "report" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reporter_id" uuid,
	"target_type" text NOT NULL,
	"target_id" uuid NOT NULL,
	"target_owner_id" uuid,
	"category" "report_category" NOT NULL,
	"details" text,
	"status" "report_status" DEFAULT 'open' NOT NULL,
	"case_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "username_reservation" (
	"username" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"reserved_until" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "status" text DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "appeal" ADD CONSTRAINT "appeal_action_id_enforcement_action_id_fk" FOREIGN KEY ("action_id") REFERENCES "public"."enforcement_action"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appeal" ADD CONSTRAINT "appeal_appellant_id_user_id_fk" FOREIGN KEY ("appellant_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appeal" ADD CONSTRAINT "appeal_reviewer_id_user_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "block" ADD CONSTRAINT "block_blocker_id_user_id_fk" FOREIGN KEY ("blocker_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "block" ADD CONSTRAINT "block_blocked_id_user_id_fk" FOREIGN KEY ("blocked_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog_reference" ADD CONSTRAINT "catalog_reference_artist_id_artist_id_fk" FOREIGN KEY ("artist_id") REFERENCES "public"."artist"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comment" ADD CONSTRAINT "comment_answer_id_daily_drop_answer_id_fk" FOREIGN KEY ("answer_id") REFERENCES "public"."daily_drop_answer"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comment" ADD CONSTRAINT "comment_author_id_user_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_snapshot" ADD CONSTRAINT "content_snapshot_case_id_moderation_case_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."moderation_case"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_snapshot" ADD CONSTRAINT "content_snapshot_author_id_user_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_drop_answer" ADD CONSTRAINT "daily_drop_answer_question_id_daily_drop_question_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."daily_drop_question"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_drop_answer" ADD CONSTRAINT "daily_drop_answer_author_id_user_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_drop_question" ADD CONSTRAINT "daily_drop_question_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_drop_question" ADD CONSTRAINT "daily_drop_question_approved_by_user_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_drop_reminder" ADD CONSTRAINT "daily_drop_reminder_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_drop_translation" ADD CONSTRAINT "daily_drop_translation_question_id_daily_drop_question_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."daily_drop_question"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_drop_translation" ADD CONSTRAINT "daily_drop_translation_reviewed_by_user_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_export_request" ADD CONSTRAINT "data_export_request_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enforcement_action" ADD CONSTRAINT "enforcement_action_case_id_moderation_case_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."moderation_case"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enforcement_action" ADD CONSTRAINT "enforcement_action_subject_user_id_user_id_fk" FOREIGN KEY ("subject_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enforcement_action" ADD CONSTRAINT "enforcement_action_decided_by_user_id_fk" FOREIGN KEY ("decided_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_access" ADD CONSTRAINT "evidence_access_case_id_moderation_case_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."moderation_case"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback_report" ADD CONSTRAINT "feedback_report_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follow" ADD CONSTRAINT "follow_follower_id_user_id_fk" FOREIGN KEY ("follower_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follow" ADD CONSTRAINT "follow_followee_id_user_id_fk" FOREIGN KEY ("followee_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_invited_by_user_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_accepted_user_id_user_id_fk" FOREIGN KEY ("accepted_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moderation_case" ADD CONSTRAINT "moderation_case_subject_user_id_user_id_fk" FOREIGN KEY ("subject_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moderation_case" ADD CONSTRAINT "moderation_case_assignee_id_user_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "music_dna_entry" ADD CONSTRAINT "music_dna_entry_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "music_dna_entry" ADD CONSTRAINT "music_dna_entry_genre_id_genre_id_fk" FOREIGN KEY ("genre_id") REFERENCES "public"."genre"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "music_dna_entry" ADD CONSTRAINT "music_dna_entry_artist_id_artist_id_fk" FOREIGN KEY ("artist_id") REFERENCES "public"."artist"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mute" ADD CONSTRAINT "mute_muter_id_user_id_fk" FOREIGN KEY ("muter_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mute" ADD CONSTRAINT "mute_muted_id_user_id_fk" FOREIGN KEY ("muted_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notice" ADD CONSTRAINT "notice_submitted_by_user_id_fk" FOREIGN KEY ("submitted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notice" ADD CONSTRAINT "notice_case_id_moderation_case_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."moderation_case"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification" ADD CONSTRAINT "notification_recipient_id_user_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification" ADD CONSTRAINT "notification_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_preference" ADD CONSTRAINT "notification_preference_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "privacy_settings" ADD CONSTRAINT "privacy_settings_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile" ADD CONSTRAINT "profile_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publication_run" ADD CONSTRAINT "publication_run_question_id_daily_drop_question_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."daily_drop_question"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_subscription" ADD CONSTRAINT "push_subscription_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reaction" ADD CONSTRAINT "reaction_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report" ADD CONSTRAINT "report_reporter_id_user_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report" ADD CONSTRAINT "report_target_owner_id_user_id_fk" FOREIGN KEY ("target_owner_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report" ADD CONSTRAINT "report_case_id_moderation_case_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."moderation_case"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "username_reservation" ADD CONSTRAINT "username_reservation_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "artist_name_idx" ON "artist" USING btree (lower("name"));--> statement-breakpoint
CREATE INDEX "block_blocked_idx" ON "block" USING btree ("blocked_id");--> statement-breakpoint
CREATE INDEX "catalog_reference_owner_idx" ON "catalog_reference" USING btree ("owner_type","owner_id");--> statement-breakpoint
CREATE INDEX "comment_answer_idx" ON "comment" USING btree ("answer_id","created_at");--> statement-breakpoint
CREATE INDEX "content_snapshot_purge_idx" ON "content_snapshot" USING btree ("purge_after");--> statement-breakpoint
CREATE UNIQUE INDEX "daily_drop_answer_one_uq" ON "daily_drop_answer" USING btree ("question_id","author_id") WHERE "daily_drop_answer"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "daily_drop_answer_question_idx" ON "daily_drop_answer" USING btree ("question_id","created_at");--> statement-breakpoint
CREATE INDEX "daily_drop_answer_author_idx" ON "daily_drop_answer" USING btree ("author_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "daily_drop_one_per_date_uq" ON "daily_drop_question" USING btree ("publish_date") WHERE "daily_drop_question"."status" in ('scheduled', 'published');--> statement-breakpoint
CREATE INDEX "daily_drop_status_idx" ON "daily_drop_question" USING btree ("status","publish_date");--> statement-breakpoint
CREATE INDEX "data_export_user_idx" ON "data_export_request" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "deletion_request_due_idx" ON "deletion_request" USING btree ("scheduled_for");--> statement-breakpoint
CREATE INDEX "enforcement_subject_idx" ON "enforcement_action" USING btree ("subject_user_id","starts_at");--> statement-breakpoint
CREATE INDEX "evidence_access_case_idx" ON "evidence_access" USING btree ("case_id","at");--> statement-breakpoint
CREATE UNIQUE INDEX "external_id_provider_uq" ON "external_id" USING btree ("provider","entity_type","external_id");--> statement-breakpoint
CREATE INDEX "external_id_entity_idx" ON "external_id" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE UNIQUE INDEX "external_link_uq" ON "external_link" USING btree ("entity_type","entity_id","url");--> statement-breakpoint
CREATE INDEX "follow_followee_idx" ON "follow" USING btree ("followee_id","status");--> statement-breakpoint
CREATE INDEX "genre_rank_idx" ON "genre" USING btree ("rank");--> statement-breakpoint
CREATE INDEX "invitation_email_idx" ON "invitation" USING btree ("email");--> statement-breakpoint
CREATE INDEX "invitation_status_idx" ON "invitation" USING btree ("status");--> statement-breakpoint
CREATE INDEX "moderation_case_state_idx" ON "moderation_case" USING btree ("state","priority","created_at");--> statement-breakpoint
CREATE INDEX "music_dna_user_idx" ON "music_dna_entry" USING btree ("user_id","kind","position");--> statement-breakpoint
CREATE UNIQUE INDEX "music_dna_genre_uq" ON "music_dna_entry" USING btree ("user_id","genre_id") WHERE "music_dna_entry"."genre_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "music_dna_artist_uq" ON "music_dna_entry" USING btree ("user_id","artist_id") WHERE "music_dna_entry"."artist_id" is not null;--> statement-breakpoint
CREATE INDEX "notice_status_idx" ON "notice" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "notification_recipient_idx" ON "notification" USING btree ("recipient_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "profile_username_lower_uq" ON "profile" USING btree (lower("username"));--> statement-breakpoint
CREATE UNIQUE INDEX "publication_run_attempt_uq" ON "publication_run" USING btree ("publish_date","attempt");--> statement-breakpoint
CREATE INDEX "push_subscription_user_idx" ON "push_subscription" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "reaction_user_idx" ON "reaction" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "report_case_idx" ON "report" USING btree ("case_id");--> statement-breakpoint
CREATE INDEX "report_reporter_idx" ON "report" USING btree ("reporter_id","created_at");--> statement-breakpoint
CREATE INDEX "username_reservation_user_idx" ON "username_reservation" USING btree ("user_id");