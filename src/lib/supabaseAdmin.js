import { createClient } from '@supabase/supabase-js';

// This client uses the service_role key and must only ever be imported from
// server-side code (Server Components, Route Handlers). Never import this
// from a file marked 'use client'.
export function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;

  if (!url || !key) {
    throw new Error(
      'Missing SUPABASE_URL or SUPABASE_SECRET_KEY. Copy .env.local.example to .env.local and fill in your project values.'
    );
  }

  return createClient(url, key, {
    auth: { persistSession: false },
  });
}
