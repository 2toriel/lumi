-- Migration: precise unlock time + organizer password.
-- Run this in your EXISTING Supabase project's SQL Editor (the one you
-- already deployed). It's safe to run even with existing test cakes in there.

-- 1. Add the new timestamp column, backfilled from the old date column
--    (at local midnight UTC, same as the old behavior, so nothing changes
--    for existing rows until you edit them).
alter table cakes add column if not exists unlock_at timestamptz;
update cakes set unlock_at = celebration_date::timestamptz
  where unlock_at is null and celebration_date is not null;

-- 2. Add the password column. Existing cakes won't have one — that's fine,
--    it just means you can't password-edit cakes you made before this
--    migration. New cakes created after this point will always have one.
alter table cakes add column if not exists password_hash text;

-- 3. Drop the old date-only column now that unlock_at covers it.
alter table cakes drop column if exists celebration_date;

-- 4. Re-grant on the table in case your Postgres/Supabase version requires
--    it again after a column change (harmless to re-run if not needed).
grant select, insert, update, delete on cakes to service_role;
