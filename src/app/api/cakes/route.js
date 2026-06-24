import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { makeCakeSlug } from '@/lib/slug';

const VALID_THEMES = ['rainbow', 'citrus', 'berry', 'vanilla'];

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const { recipientName, celebrationDate, theme } = body || {};

  if (!recipientName || typeof recipientName !== 'string' || !recipientName.trim()) {
    return NextResponse.json({ error: 'recipientName is required.' }, { status: 400 });
  }
  if (!celebrationDate || Number.isNaN(new Date(celebrationDate).getTime())) {
    return NextResponse.json({ error: 'celebrationDate must be a valid date.' }, { status: 400 });
  }

  const safeTheme = VALID_THEMES.includes(theme) ? theme : 'citrus';

  try {
    const supabase = getSupabaseAdmin();
    const slug = makeCakeSlug(recipientName);

    const { data, error } = await supabase
      .from('cakes')
      .insert({
        slug,
        recipient_name: recipientName.trim(),
        celebration_date: celebrationDate,
        theme: safeTheme,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ cake: data }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
