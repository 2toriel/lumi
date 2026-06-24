import { distributeCandles } from '@/lib/tiers';

const THEME_GRADIENTS = {
  rainbow: 'linear-gradient(135deg,#FF6B57,#FFB627,#2EC4B6,#8B7FD1)',
  citrus: 'linear-gradient(135deg,#FFB627,#FF6B57)',
  berry: 'linear-gradient(135deg,#FF6FA8,#8B7FD1)',
  vanilla: 'linear-gradient(135deg,#FFF8EF,#2EC4B6)',
};

const CANDLE_COLOR_VARS = {
  coral: 'var(--coral)',
  marigold: 'var(--marigold)',
  teal: 'var(--teal)',
  violet: 'var(--violet)',
  pink: 'var(--pink)',
};

function Candle({ color, lit, extinguishing }) {
  const c = CANDLE_COLOR_VARS[color] || 'var(--coral)';
  return (
    <div className={`candle ${lit ? '' : 'unlit'} ${extinguishing ? 'extinguishing' : ''}`} style={{ '--c': c }}>
      {lit && <div className="flame" />}
      <div className="wick" />
      <div className="wax" />
    </div>
  );
}

// candles: full ordered array of candle rows (only `.length` and per-index
// `.color` are used here — pass however many should currently render as lit).
// extinguishingAll: true once the recipient has blown them out.
export default function Cake({ theme, candles, extinguishingAll = false }) {
  const tiers = distributeCandles(candles.length);
  const gradient = THEME_GRADIENTS[theme] || THEME_GRADIENTS.citrus;

  // Render tiers bottom-up visually (largest/base tier at the bottom), but the
  // *order candles were lit* always reads left-to-right within whichever tier
  // they landed on, tier 1 first.
  let consumed = 0;
  const tierBlocks = tiers.map((tier, tierIndex) => {
    const startIndex = consumed;
    consumed += tier.lit;
    const tierCandles = candles.slice(startIndex, startIndex + tier.lit);
    const width = 190 + tierIndex * 30;
    const height = tierIndex === tiers.length - 1 ? 64 : 50;
    return (
      <div className="tier" key={tier.id}>
        <div className="candle-row">
          {tierCandles.map((candle, i) => (
            <Candle
              key={startIndex + i}
              color={candle.color}
              lit
              extinguishing={extinguishingAll}
            />
          ))}
        </div>
        <div
          className="tier-body"
          style={{
            width,
            height,
            background: tierIndex === 0 ? gradient : 'linear-gradient(135deg,#8B7FD1,#2EC4B6)',
            marginTop: tierIndex === 0 ? 0 : -8,
          }}
        />
      </div>
    );
  });

  // tier 1 renders first (visually on top, narrowest); later tiers nestle
  // beneath as the wider base, matching the stacking system as designed.
  return <div className="cake-wrap">{tierBlocks}</div>;
}
