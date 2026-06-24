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
    .select('*')
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

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const celebrationDate = new Date(`${cake.celebration_date}T00:00:00`);
  const isBigDay = today >= celebrationDate;
  const daysUntil = Math.max(
    0,
    Math.ceil((celebrationDate - today) / (1000 * 60 * 60 * 24))
  );

  return (
    <CakeExperience
      cake={cake}
      initialCandles={candles || []}
      isBigDay={isBigDay}
      daysUntil={daysUntil}
    />
  );
}
