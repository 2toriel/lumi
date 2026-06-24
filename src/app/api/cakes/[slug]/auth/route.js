import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { verifyPassword } from '@/lib/password';

export async function POST(request, { params }) {
  const { slug } = await params;
  const body = await request.json().catch(() => ({}));
  const { password } = body || {};

  if (!password) {
    return NextResponse.json({ error: 'Password is required.' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { data: cake } = await supabase
    .from('cakes')
    .select('password_hash')
    .eq('slug', slug)
    .single();

  if (!cake || !verifyPassword(password, cake.password_hash)) {
    return NextResponse.json({ error: 'Incorrect password.' }, { status: 401 });
  }

  return NextResponse.json({ ok: true });
}
