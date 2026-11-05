-- Reverts 0005_profiles_search (step 5.5). The extensions stay installed (other objects may use them).
DROP INDEX IF EXISTS "profile_display_name_trgm_idx";
DROP INDEX IF EXISTS "profile_username_trgm_idx";
DROP FUNCTION IF EXISTS search_fold(text);
DROP TABLE IF EXISTS "follow_decline";
