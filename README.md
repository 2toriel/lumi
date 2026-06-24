# Lumi

One candle. One wish. Together apart.

## What this is

A real, runnable scaffold of the product we prototyped: anyone can start a
cake for someone's birthday, share one link, and friends can light a candle
(a written or recorded wish) any time before the big day. On the day, the
same link opens into a candle-by-candle reveal, then a blow-out moment, then
a permanent keepsake.

There are no user accounts. The link itself is the access key — see
"How access works" below for why that's enough for v1.

## Stack

- **Next.js 16** (App Router) — one codebase for pages + API routes
- **Supabase** — Postgres database + file storage for voice recordings
- Plain CSS (see `src/app/globals.css`) carrying over the brand tokens from
  the pitch prototype — no UI framework needed at this size

## Setup

1. **Create a Supabase project** at supabase.com (free tier is plenty for now).
2. **Run the schema.** Open your project's SQL Editor and run the contents of
   `supabase/schema.sql`. This creates the `cakes` and `candles` tables (with
   the access grants Supabase now requires on new tables), and a public
   storage bucket called `voice-notes` for recordings.
3. **Copy your credentials.** In your Supabase project: Settings → API Keys.
   You need the **Project URL** and the **secret key** (`sb_secret_...`) — on
   an older project still on legacy keys, use the **service_role key**
   instead; it works the same way here. Never the publishable/anon key.
4. **Set up your env file:**
   ```
   cp .env.local.example .env.local
   ```
   Then fill in `SUPABASE_URL` and `SUPABASE_SECRET_KEY`.
5. **Install and run:**
   ```
   npm install
   npm run dev
   ```
   Visit `http://localhost:3000`.

## How access works (no accounts, on purpose)

Every visitor — the organizer, every friend, and the birthday person — uses
the exact same link: `/c/[slug]`. What they see depends on **when** they
visit, not **who** they are:

- **Before the birthday:** the page shows the candle count and a countdown,
  plus a form to light a candle. It never shows message content yet, so the
  surprise survives even if the birthday person peeks at their own link.
- **On or after the birthday:** the same link opens into the full reveal.

The slug (e.g. `maya-j4k2x`) is the only thing standing in for a login — it's
random and unguessable, which is enough for a friend-group context. If you
ever want to let only the organizer edit a cake's details, the cheap fix is a
second, secret "edit" link rather than a real login — not built here, since
v1 doesn't need it.

## Security note

Row Level Security is enabled on both tables with **no policies** for the
public/anon role — meaning even if a publishable/anon key ever ended up in
client-side code, it couldn't read or write anything. All reads and writes go
through this app's own server code (Server Components + Route Handlers)
using the secret key, which is never sent to the browser. Voice
recordings are uploaded through the server too, not directly from the
browser to Supabase.

As of mid-2026, Supabase no longer auto-exposes new public-schema tables to
the Data API by default — `schema.sql` includes the explicit `grant`
statements this app's `service_role` access needs as a result. If you ever
add a new table, you'll need to grant it the same way or every request to it
will be rejected before RLS is even checked.

`npm audit` will flag one inherited moderate-severity advisory in `postcss`
(a transitive dependency of Next.js's build tooling, related to malicious CSS
input). It's not exploitable through normal use of this app and fixing it
would require downgrading Next.js itself — worth re-checking next time you
upgrade dependencies, not urgent today.

## What's still a placeholder

- **Cake & candle art** is plain CSS shapes — built so you can drop in your
  hand-drawn tier art per `src/lib/tiers.js` / `src/components/Cake.jsx`
  without touching the rest of the app.
- **No rate limiting / spam protection** on the public endpoints yet. Fine
  for a friend-group v1; worth adding (e.g. basic per-IP throttling) before
  sharing more widely.
- **No "late candle" grace period** — once the birthday date passes, the
  light-a-candle form disappears. Easy to add if you want a few days' grace.
