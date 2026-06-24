import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { verifyPassword } from '@/lib/password';

export async function PATCH(request, { params }) {
  try {
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

    // Always re-verify server-side -- never trust that an earlier /auth call
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

    // Plain update, no chained .select() -- the client doesn't need the row
    // back (it calls router.refresh() afterward), and this sidesteps any
    // quirk around PostgREST's update+select response handling entirely.
    const { error } = await supabase
      .from('cakes')
      .update({ unlock_at: nextUnlockAt })
      .eq('id', cake.id);

    if (error) {
      console.error('cakes update failed:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, unlockAt: nextUnlockAt });
  } catch (err) {
    console.error('PATCH /api/cakes/[slug] crashed:', err);
    return NextResponse.json({ error: err.message || 'Unexpected server error.' }, { status: 500 });
  }
}
