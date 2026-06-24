import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { verifyPassword } from '@/lib/password';

export async function PATCH(request, { params }) {
  const { slug } = await params;
  const body = await request.json().catch(() => ({}));
  const { password, unlockAt, activateNow } = body || {};

  if (!password) {
    return NextResponse.json({ error: 'Password is required.' }, { status: 400 });
  }
  if (!unlockAt && !activateNow) {
    return NextResponse.json({ error: 'Nothing to update.' }, { status: 400 });
  }
  if (unlockAt && Number.isNaN(new Date(unlockAt).getTime())) {
    return NextResponse.json({ error: 'unlockAt must be a valid date/time.' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  // Always re-verify server-side — never trust that an earlier /auth call
  // alone authorizes this request, since there's no session tying them together.
  const { data: cake } = await supabase
    .from('cakes')
    .select('id, password_hash')
    .eq('slug', slug)
    .single();

  if (!cake || !verifyPassword(password, cake.password_hash)) {
    return NextResponse.json({ error: 'Incorrect password.' }, { status: 401 });
  }

  const nextUnlockAt = activateNow ? new Date().toISOString() : new Date(unlockAt).toISOString();

  const { data: updated, error } = await supabase
    .from('cakes')
    .update({ unlock_at: nextUnlockAt })
    .eq('id', cake.id)
    .select('id, slug, recipient_name, unlock_at, theme')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ cake: updated });
}
