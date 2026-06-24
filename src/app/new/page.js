'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const THEMES = [
  { id: 'rainbow', name: 'Rainbow Sprinkle', gradient: 'linear-gradient(135deg,#FF6B57,#FFB627,#2EC4B6,#8B7FD1)' },
  { id: 'citrus', name: 'Citrus Pop', gradient: 'linear-gradient(135deg,#FFB627,#FF6B57)' },
  { id: 'berry', name: 'Berry Bliss', gradient: 'linear-gradient(135deg,#FF6FA8,#8B7FD1)' },
  { id: 'vanilla', name: 'Classic Vanilla', gradient: 'linear-gradient(135deg,#FFF8EF,#2EC4B6)' },
];

// Default the picker to a week from now, 6pm local time -- a friendly guess,
// not a constraint; the organizer can change it to anything.
function defaultUnlockLocal() {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  d.setHours(18, 0, 0, 0);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function NewCakePage() {
  const router = useRouter();
  const [recipientName, setRecipientName] = useState('');
  const [unlockLocal, setUnlockLocal] = useState(defaultUnlockLocal());
  const [unlockNow, setUnlockNow] = useState(false);
  const [password, setPassword] = useState('');
  const [theme, setTheme] = useState('citrus');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    if (!password || password.length < 4) {
      setError('Choose a password at least 4 characters long -- you\u2019ll need it to make changes later.');
      return;
    }

    setSubmitting(true);
    try {
      // new Date(localString) is parsed in the *browser's* local timezone,
      // which is exactly the organizer's timezone -- so this correctly
      // captures "6pm, where I am" as an absolute instant.
      const unlockAt = unlockNow ? new Date() : new Date(unlockLocal);

      const res = await fetch('/api/cakes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientName,
          unlockAt: unlockAt.toISOString(),
          password,
          theme,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Something went wrong creating your cake.');
      // Briefly stash the plaintext password so the share screen on the next
      // page can show it once -- it's never stored anywhere after that.
      sessionStorage.setItem('lumi:lastPassword', password);
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
        <p className="sub">Pick who it&apos;s for. Friends can light candles up until it unlocks.</p>

        <label className="field-label" htmlFor="name">Their name</label>
        <input
          id="name"
          className="text-input"
          required
          value={recipientName}
          onChange={(e) => setRecipientName(e.target.value)}
          placeholder="Maya"
        />

        <label className="field-label" htmlFor="unlock">When should it unlock?</label>
        <input
          id="unlock"
          type="datetime-local"
          className="text-input"
          required
          disabled={unlockNow}
          value={unlockLocal}
          onChange={(e) => setUnlockLocal(e.target.value)}
        />
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: -6, marginBottom: 14, fontSize: 13, color: '#6b6378' }}>
          <input type="checkbox" checked={unlockNow} onChange={(e) => setUnlockNow(e.target.checked)} />
          Unlock immediately (for testing or a live showcase)
        </label>

        <label className="field-label" htmlFor="password">Set a password</label>
        <input
          id="password"
          type="text"
          className="text-input"
          required
          minLength={4}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Something memorable -- write it down"
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
