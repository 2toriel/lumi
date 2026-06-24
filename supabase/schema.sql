-- Lumi database schema.
-- Run this once in your Supabase project's SQL editor (Database -> SQL Editor -> New query).

create extension if not exists "pgcrypto";

create table if not exists cakes (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  recipient_name text not null,
  celebration_date date not null,
  theme text not null default 'citrus',
  created_at timestamptz not null default now()
);

create table if not exists candles (
  id uuid primary key default gen_random_uuid(),
  cake_id uuid not null references cakes(id) on delete cascade,
  sender_name text not null,
  color text not null default 'coral',
  message_type text not null check (message_type in ('text', 'voice')),
  message text,
  voice_url text,
  created_at timestamptz not null default now()
);

create index if not exists candles_cake_id_idx on candles (cake_id);

-- As of mid-2026, new Supabase projects no longer auto-expose new public-schema
-- tables to the Data API — you must grant access explicitly, or every request
-- (even from server-side code using the secret/service_role key) gets rejected
-- before Row Level Security is even checked. This app only ever talks to these
-- tables using the secret key (which authenticates as the `service_role`
-- Postgres role), so that's the only role that needs a grant here.
grant select, insert, update, delete on cakes to service_role;
grant select, insert, update, delete on candles to service_role;

-- Row Level Security: enabled with NO policies for the anon/authenticated roles.
-- That means the public anon key (which is inherently exposed if it's ever used
-- client-side) cannot read or write these tables at all. Every read and write in
-- this app goes through Next.js server code using the service_role key instead,
-- which bypasses RLS by design. This keeps the "no accounts" model from turning
-- into "anyone can list every cake ever made" — the only door in is your own API.
alter table cakes enable row level security;
alter table candles enable row level security;

-- Storage bucket for voice wishes. Public read so the browser can stream the
-- audio file directly once it's playing on the recipient's reveal screen;
-- uploads still go through the server (see app/api/.../candles/route.js),
-- never directly from the browser.
insert into storage.buckets (id, name, public)
values ('voice-notes', 'voice-notes', true)
on conflict (id) do nothing;

drop policy if exists "Public read voice notes" on storage.objects;
create policy "Public read voice notes"
  on storage.objects for select
  using (bucket_id = 'voice-notes');
