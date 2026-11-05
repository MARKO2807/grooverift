-- Step 5.6: an admin may withdraw a published Daily Drop question for a severe error (J6 "Corrections after
-- publishing"). Member reads ask for status = 'published', so a withdrawn question and its answers are hidden,
-- not deleted. The new value is not used inside this migration (ADD VALUE inside a transaction is fine then).
-- drizzle applies all pending migrations in ONE transaction: a later migration must not use 'withdrawn' in SQL
-- (an index predicate, an UPDATE), or a fresh database fails with "unsafe use of new enum value".
ALTER TYPE "public"."drop_status" ADD VALUE 'withdrawn';
