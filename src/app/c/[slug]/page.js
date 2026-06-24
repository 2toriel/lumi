import { notFound } from 'next/navigation';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import CakeExperience from './CakeExperience';

// This route fetches fresh data from Supabase on every request, so it must
// never be statically generated at build time.
export const dynamic = 'force-dynamic';

export default async function CakePage({ params }) {
  const { slug } = await params;
  const supabase = getSupabaseAdmin();

  const { data: cake } = await supabase
    .from('cakes')
    .select('id, slug, recipient_name, unlock_at, theme, created_at')
    .eq('slug', slug)
    .single();

  if (!cake) {
    notFound();
  }

  const { data: candles } = await supabase
    .from('candles')
    .select('*')
    .eq('cake_id', cake.id)
    .order('created_at', { ascending: true });

  // unlock_at is an absolute instant (timestamptz), so comparing it against
  // "now" here is correct regardless of which timezone the server or the
  // organizer happen to be in -- that's what the old date-only check got wrong.
  const now = Date.now();
  const unlockAtMs = new Date(cake.unlock_at).getTime();
  const isBigDay = now >= unlockAtMs;
  const msRemaining = Math.max(0, unlockAtMs - now);

  return (
    <CakeExperience
      cake={cake}
      initialCandles={candles || []}
      isBigDay={isBigDay}
      msRemaining={msRemaining}
    />
  );
}
