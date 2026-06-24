'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const THEMES = [
  { id: 'rainbow', name: 'Rainbow Sprinkle', gradient: 'linear-gradient(135deg,#FF6B57,#FFB627,#2EC4B6,#8B7FD1)' },
  { id: 'citrus', name: 'Citrus Pop', gradient: 'linear-gradient(135deg,#FFB627,#FF6B57)' },
  { id: 'berry', name: 'Berry Bliss', gradient: 'linear-gradient(135deg,#FF6FA8,#8B7FD1)' },
  { id: 'vanilla', name: 'Classic Vanilla', gradient: 'linear-gradient(135deg,#FFF8EF,#2EC4B6)' },
];

export default function NewCakePage() {
  const router = useRouter();
  const [recipientName, setRecipientName] = useState('');
  const [celebrationDate, setCelebrationDate] = useState('');
  const [theme, setTheme] = useState('citrus');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/cakes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientName, celebrationDate, theme }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Something went wrong creating your cake.');
      router.push(`/c/${data.cake.slug}?created=1`);
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  return (
    <main className="page">
      <form className="card" onSubmit={handleSubmit}>
        <div className="eyebrow-label">NEW CAKE</div>
        <h2 className="heading">Start a cake for someone</h2>
        <p className="sub">Pick who it&apos;s for. Friends can light candles up until the big day.</p>

        <label className="field-label" htmlFor="name">Their name</label>
        <input
          id="name"
          className="text-input"
          required
          value={recipientName}
          onChange={(e) => setRecipientName(e.target.value)}
          placeholder="Maya"
        />

        <label className="field-label" htmlFor="date">Their birthday</label>
        <input
          id="date"
          type="date"
          className="text-input"
          required
          value={celebrationDate}
          onChange={(e) => setCelebrationDate(e.target.value)}
        />

        <label className="field-label">Cake style</label>
        <div className="theme-row">
          {THEMES.map((t) => (
            <button
              type="button"
              key={t.id}
              className={`theme-card ${theme === t.id ? 'selected' : ''}`}
              onClick={() => setTheme(t.id)}
            >
              <span className="theme-blob" style={{ background: t.gradient }} />
              <span>{t.name}</span>
            </button>
          ))}
        </div>

        {error && <p className="error-text">{error}</p>}

        <button className="primary-btn" type="submit" disabled={submitting}>
          {submitting ? 'Creating…' : 'Create Lumi & get the link'}
        </button>
      </form>
    </main>
  );
}
