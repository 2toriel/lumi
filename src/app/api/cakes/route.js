import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { makeCakeSlug } from '@/lib/slug';
import { hashPassword } from '@/lib/password';

const VALID_THEMES = ['rainbow', 'citrus', 'berry', 'vanilla'];

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const { recipientName, unlockAt, password, theme } = body || {};

  if (!recipientName || typeof recipientName !== 'string' || !recipientName.trim()) {
    return NextResponse.json({ error: 'recipientName is required.' }, { status: 400 });
  }
  if (!unlockAt || Number.isNaN(new Date(unlockAt).getTime())) {
    return NextResponse.json({ error: 'unlockAt must be a valid date/time.' }, { status: 400 });
  }
  if (!password || typeof password !== 'string' || password.length < 4) {
    return NextResponse.json({ error: 'password must be at least 4 characters.' }, { status: 400 });
  }

  const safeTheme = VALID_THEMES.includes(theme) ? theme : 'citrus';

  try {
    const supabase = getSupabaseAdmin();
    const slug = makeCakeSlug(recipientName);
    const password_hash = hashPassword(password);

    const { data, error } = await supabase
      .from('cakes')
      .insert({
        slug,
        recipient_name: recipientName.trim(),
        unlock_at: new Date(unlockAt).toISOString(),
        password_hash,
        theme: safeTheme,
      })
      .select('id, slug, recipient_name, unlock_at, theme, created_at')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ cake: data }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
