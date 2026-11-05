-- Reverts 0004_invitations (step 5.4).
ALTER TABLE "invitation" DROP CONSTRAINT IF EXISTS "invitation_locale";
ALTER TABLE "invitation" DROP CONSTRAINT IF EXISTS "invitation_email_normalised";
DROP INDEX IF EXISTS "invitation_open_email_uq";
ALTER TABLE "invitation" DROP COLUMN IF EXISTS "locale";
