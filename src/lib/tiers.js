// The cake "stacking system": tier 1 holds the first 8 candles, then a second
// tier appears for the next 6, then a third for 10 more. Add more entries here
// once you've drawn additional tier art — nothing else in the app needs to
// change, distributeCandles() below just spills over into whichever tiers exist.
export const CAKE_TIERS = [
  { id: 'tier-1', capacity: 8 },
  { id: 'tier-2', capacity: 6 },
  { id: 'tier-3', capacity: 10 },
];

export function totalCapacity() {
  return CAKE_TIERS.reduce((sum, tier) => sum + tier.capacity, 0);
}

// Given a total candle count, returns one entry per *visible* tier:
// { id, capacity, lit } — lit candles on that tier, in render order.
// e.g. 16 candles -> [{tier-1, cap 8, lit 8}, {tier-2, cap 6, lit 6}, {tier-3, cap 10, lit 2}]
export function distributeCandles(totalLit) {
  const result = [];
  let remaining = totalLit;

  for (const tier of CAKE_TIERS) {
    const litOnThisTier = Math.min(Math.max(remaining, 0), tier.capacity);
    result.push({ ...tier, lit: litOnThisTier });
    remaining -= tier.capacity;
    if (remaining <= 0 && litOnThisTier > 0) break;
    // keep at least one tier visible even with zero candles yet
    if (result.length === 1 && totalLit === 0) break;
  }

  return result;
}
