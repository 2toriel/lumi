import Link from 'next/link';
import FlameMark from '@/components/FlameMark';

export default function HomePage() {
  return (
    <main className="landing-page">
      <div className="embers">
        {Array.from({ length: 14 }).map((_, i) => (
          <div
            key={i}
            className="ember"
            style={{
              left: `${(i * 37) % 100}%`,
              animationDelay: `${(i * 1.3) % 9}s`,
              animationDuration: `${7 + (i % 5)}s`,
            }}
          />
        ))}
      </div>
      <div className="landing-card">
        <div className="wordmark">
          <FlameMark size={26} /> Lumi
        </div>
        <p className="tagline">One candle. One wish. Together apart.</p>
        <p className="sub">
          A birthday cake built from the people who love you — even from far away.
        </p>
        <Link href="/new" className="primary-btn">
          Start a cake →
        </Link>
      </div>
    </main>
  );
}
