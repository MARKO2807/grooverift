CREATE TABLE "follow_decline" (
	"owner_id" uuid NOT NULL,
	"requester_id" uuid NOT NULL,
	"declined_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "follow_decline_owner_id_requester_id_pk" PRIMARY KEY("owner_id","requester_id"),
	CONSTRAINT "follow_decline_not_self" CHECK ("follow_decline"."owner_id" <> "follow_decline"."requester_id")
);
--> statement-breakpoint
ALTER TABLE "follow_decline" ADD CONSTRAINT "follow_decline_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follow_decline" ADD CONSTRAINT "follow_decline_requester_id_user_id_fk" FOREIGN KEY ("requester_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint

-- Step 5.5: people search (D-093 (3)) over username and display name. pg_trgm and unaccent are trusted
-- extensions (PostgreSQL 13+), so the application role may create them. unaccent() is STABLE, which an index
-- expression cannot use; the wrapper is declared IMMUTABLE on the unaccent dictionary that ships with the
-- extension (a changed dictionary would need a reindex).
CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS unaccent;--> statement-breakpoint
CREATE OR REPLACE FUNCTION search_fold(text) RETURNS text
LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT AS $$
  SELECT lower(public.unaccent('public.unaccent', $1));
$$;--> statement-breakpoint
CREATE INDEX "profile_username_trgm_idx" ON "profile" USING gin ("username" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "profile_display_name_trgm_idx" ON "profile" USING gin (search_fold("display_name") gin_trgm_ops);
