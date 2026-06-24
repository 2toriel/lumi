'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Cake from '@/components/Cake';

const COLOR_SWATCHES = [
  { id: 'coral', v: 'var(--coral)' },
  { id: 'marigold', v: 'var(--marigold)' },
  { id: 'teal', v: 'var(--teal)' },
  { id: 'violet', v: 'var(--violet)' },
  { id: 'pink', v: 'var(--pink)' },
];

function formatSeconds(total) {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// Renders e.g. "2 days 4h", "3h 12m", "8 minutes" -- granularity shrinks as
// the unlock moment gets closer.
function formatDuration(ms) {
  if (ms <= 0) return null;
  const totalMinutes = Math.ceil(ms / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  if (days >= 1) return `${days} day${days === 1 ? '' : 's'}${hours ? ` ${hours}h` : ''}`;
  if (hours >= 1) return `${hours}h ${minutes}m`;
  return `${minutes} minute${minutes === 1 ? '' : 's'}`;
}

// "2026-06-27T18:00:00.000Z" -> "2026-06-27T18:00" in the *viewer's* local
// timezone, suitable for feeding straight into a <input type="datetime-local">.
function toLocalInputValue(isoString) {
  const d = new Date(isoString);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function CakeExperience({ cake, initialCandles, isBigDay, msRemaining }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [candles, setCandles] = useState(initialCandles);
  const [showShareScreen, setShowShareScreen] = useState(
    searchParams.get('created') === '1' && !isBigDay
  );
  const [revealedPassword, setRevealedPassword] = useState(null);
  const [stage, setStage] = useState('intro'); // intro | replay | blowout | keepsake
  const [toast, setToast] = useState('');

  // Keep local candle state in sync whenever the server gives us fresh data
  // (e.g. after router.refresh() from an organizer action).
  useEffect(() => {
    setCandles(initialCandles);
  }, [initialCandles]);

  // One-time, ephemeral handoff of the plaintext password from the /new form.
  // It's never stored anywhere retrievable -- read once here, then discarded.
  useEffect(() => {
    if (showShareScreen && typeof window !== 'undefined') {
      const pw = sessionStorage.getItem('lumi:lastPassword');
      if (pw) {
        setRevealedPassword(pw);
        sessionStorage.removeItem('lumi:lastPassword');
      }
    }
  }, [showShareScreen]);

  const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/c/${cake.slug}` : '';

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(''), 1600);
  }

  function handleCopyLink() {
    navigator.clipboard?.writeText(shareUrl).catch(() => {});
    showToast('Link copied!');
  }

  function handleNewCandle(candle) {
    setCandles((prev) => [...prev, candle]);
    showToast('Candle lit ✨');
  }

  const organizer = <OrganizerPanel cake={cake} onChanged={() => router.refresh()} />;

  if (showShareScreen) {
    return (
      <ShareScreen
        cake={cake}
        shareUrl={shareUrl}
        password={revealedPassword}
        onCopy={handleCopyLink}
        onContinue={() => setShowShareScreen(false)}
        toast={toast}
      >
        {organizer}
      </ShareScreen>
    );
  }

  if (!isBigDay) {
    return (
      <AnticipationView
        cake={cake}
        candles={candles}
        msRemaining={msRemaining}
        onNewCandle={handleNewCandle}
        onCopyLink={handleCopyLink}
        toast={toast}
      >
        {organizer}
      </AnticipationView>
    );
  }

  if (candles.length === 0) {
    return <NoCandlesYet cake={cake}>{organizer}</NoCandlesYet>;
  }

  if (stage === 'intro') {
    return (
      <OpenIntro cake={cake} candleCount={candles.length} onOpen={() => setStage('replay')}>
        {organizer}
      </OpenIntro>
    );
  }
  if (stage === 'replay') {
    return <ReplayStage cake={cake} candles={candles} onDone={() => setStage('blowout')} />;
  }
  if (stage === 'blowout') {
    return <BlowOutStage cake={cake} candles={candles} onDone={() => setStage('keepsake')} />;
  }
  return <KeepsakeStage cake={cake} candles={candles}>{organizer}</KeepsakeStage>;
}

/* ---------------- Organizer password-gated controls ---------------- */
function OrganizerPanel({ cake, onChanged }) {
  const [open, setOpen] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState('');
  const [newUnlockLocal, setNewUnlockLocal] = useState(() => toLocalInputValue(cake.unlock_at));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);

  async function parseJsonResponse(res) {
    try {
      return await res.json();
    } catch {
      throw new Error(`Unexpected server response (status ${res.status}). Check Vercel's function logs for details.`);
    }
  }

  async function handleAuth(e) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/cakes/${cake.slug}/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await parseJsonResponse(res);
      if (!res.ok) throw new Error(data.error || 'Incorrect password.');
      setAuthed(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function applyChange(payload) {
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/cakes/${cake.slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, ...payload }),
      });
      const data = await parseJsonResponse(res);
      if (!res.ok) throw new Error(data.error || 'Something went wrong.');
      setInfo('Updated ✓');
      onChanged?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <div className="organizer-panel">
        <button type="button" className="link-toggle" onClick={() => setOpen(true)}>
          🔑 Organizer? Manage this cake
        </button>
      </div>
    );
  }

  return (
    <div className="organizer-panel">
      {!authed ? (
        <form onSubmit={handleAuth}>
          <label className="field-label" htmlFor="orgPw">Enter the password you set when you made this cake</label>
          <input
            id="orgPw"
            type="text"
            className="text-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
          />
          {error && <p className="error-text">{error}</p>}
          <button className="secondary-btn" type="submit" disabled={busy}>
            {busy ? 'Checking…' : 'Unlock organizer controls'}
          </button>
        </form>
      ) : (
        <>
          <label className="field-label" htmlFor="newUnlock">Change the unlock time</label>
          <input
            id="newUnlock"
            type="datetime-local"
            className="text-input"
            value={newUnlockLocal}
            onChange={(e) => setNewUnlockLocal(e.target.value)}
          />
          <button
            type="button"
            className="secondary-btn"
            disabled={busy}
            onClick={() => applyChange({ unlockAt: new Date(newUnlockLocal).toISOString() })}
          >
            Save new time
          </button>
          <button
            type="button"
            className="secondary-btn"
            style={{ marginTop: 8 }}
            disabled={busy}
            onClick={() => applyChange({ activateNow: true })}
          >
            Activate now
          </button>
          {info && <p style={{ fontSize: 12, color: 'var(--teal)', fontWeight: 700, marginTop: 8 }}>{info}</p>}
          {error && <p className="error-text">{error}</p>}
        </>
      )}
    </div>
  );
}

/* ---------------- Share screen (right after creating a cake) ---------------- */
function ShareScreen({ cake, shareUrl, password, onCopy, onContinue, toast, children }) {
  return (
    <main className="page">
      <div className="card">
        <div className="eyebrow-label">CAKE CREATED</div>
        <h2 className="heading">Your cake is ready 🎉</h2>
        <p className="sub">Save these two things now — there&apos;s no account to recover them later.</p>

        <label className="field-label">Share this link with friends</label>
        <div className="link-card">
          <span>{shareUrl.replace(/^https?:\/\//, '')}</span>
          <button className="copy-btn" onClick={onCopy}>Copy</button>
        </div>

        <label className="field-label" style={{ marginTop: 12 }}>Your organizer password</label>
        <div className="link-card">
          <span>{password || "We can't show this again — hopefully you wrote it down!"}</span>
        </div>

        <p className="sub" style={{ marginTop: 16, fontSize: 12.5 }}>
          <strong>How it works:</strong> anyone with the link can light a candle before it
          unlocks, but nobody — including {cake.recipient_name} — sees what anyone wrote
          until then. Use your password any time afterward to push the unlock time, or
          unlock it early.
        </p>

        <button className="primary-btn" onClick={onContinue} style={{ marginTop: 14 }}>
          Continue to {cake.recipient_name}&apos;s cake →
        </button>
        {children}
        <div className={`toast ${toast ? 'show' : ''}`}>{toast}</div>
      </div>
    </main>
  );
}

/* ---------------- Pre-unlock: anticipation + light-a-candle ---------------- */
function AnticipationView({ cake, candles, msRemaining, onNewCandle, onCopyLink, toast, children }) {
  const [showForm, setShowForm] = useState(false);

  return (
    <main className="page">
      <div className="card">
        <div className="eyebrow-label">{cake.recipient_name.toUpperCase()}&apos;S CAKE</div>
        <h2 className="heading">
          {showForm ? `Light a candle for ${cake.recipient_name}` : `${cake.recipient_name}'s cake is filling up`}
        </h2>

        {!showForm && (
          <>
            <p className="sub">
              Friends can add a candle any time before it unlocks. Nobody — including{' '}
              {cake.recipient_name} — sees the actual wishes until then.
            </p>
            <div className="pill">
              🎂 {formatDuration(msRemaining) ? `${formatDuration(msRemaining)} until it unlocks` : 'Unlocking any moment now'}
            </div>
            <Cake theme={cake.theme} candles={candles} />
            <p className="count-meta">
              {candles.length} candle{candles.length === 1 ? '' : 's'} lit so far
            </p>
            <button className="primary-btn" onClick={() => setShowForm(true)}>
              Light a candle →
            </button>
            <button className="secondary-btn" onClick={onCopyLink} style={{ marginTop: 10 }}>
              Copy this cake&apos;s link
            </button>
          </>
        )}

        {showForm && (
          <LightCandleForm
            cakeSlug={cake.slug}
            recipientName={cake.recipient_name}
            onLit={(candle) => {
              onNewCandle(candle);
              setShowForm(false);
            }}
            onCancel={() => setShowForm(false)}
          />
        )}

        {children}
        <div className={`toast ${toast ? 'show' : ''}`}>{toast}</div>
      </div>
    </main>
  );
}

/* ---------------- Friend's "light a candle" form ---------------- */
function LightCandleForm({ cakeSlug, recipientName, onLit, onCancel }) {
  const [senderName, setSenderName] = useState('');
  const [color, setColor] = useState('teal');
  const [mode, setMode] = useState('text'); // 'text' | 'voice'
  const [message, setMessage] = useState('');
  const [recording, setRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [micError, setMicError] = useState(null);

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);

  useEffect(() => () => clearInterval(timerRef.current), []);

  async function startRecording() {
    setMicError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setRecordedBlob(blob);
        stream.getTracks().forEach((t) => t.stop());
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecording(true);
      setRecordSeconds(0);
      timerRef.current = setInterval(() => setRecordSeconds((s) => s + 1), 1000);
    } catch {
      setMicError("Couldn't access your microphone — try a written wish instead.");
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    setRecording(false);
    clearInterval(timerRef.current);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    if (!senderName.trim()) {
      setError('Your name is required.');
      return;
    }
    if (mode === 'text' && !message.trim()) {
      setError('Write a wish, or switch to a voice recording.');
      return;
    }
    if (mode === 'voice' && !recordedBlob) {
      setError('Record your voice wish first, or switch to a written one.');
      return;
    }

    setSubmitting(true);
    const form = new FormData();
    form.set('senderName', senderName.trim());
    form.set('color', color);
    form.set('messageType', mode);
    if (mode === 'text') form.set('message', message.trim());
    if (mode === 'voice') form.set('audio', recordedBlob, 'wish.webm');

    try {
      const res = await fetch(`/api/cakes/${cakeSlug}/candles`, { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Something went wrong lighting your candle.');
      onLit(data.candle);
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <label className="field-label" htmlFor="senderName">Your name</label>
      <input
        id="senderName"
        className="text-input"
        value={senderName}
        onChange={(e) => setSenderName(e.target.value)}
        placeholder="Jess"
      />

      <label className="field-label">Candle color</label>
      <div className="swatch-row">
        {COLOR_SWATCHES.map((c) => (
          <div
            key={c.id}
            className={`swatch ${color === c.id ? 'selected' : ''}`}
            style={{ background: c.v }}
            onClick={() => setColor(c.id)}
          />
        ))}
      </div>

      <label className="field-label">Your wish</label>
      {mode === 'text' ? (
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={`Write a wish for ${recipientName}...`}
        />
      ) : (
        <div className="record-row">
          {!recordedBlob ? (
            <>
              <button
                type="button"
                className={`rec-btn ${recording ? 'recording' : ''}`}
                onClick={recording ? stopRecording : startRecording}
              />
              {recording ? (
                <>
                  <div className="wave">
                    {Array.from({ length: 9 }).map((_, i) => (
                      <div key={i} className="bar" style={{ animationDelay: `${i * 0.08}s` }} />
                    ))}
                  </div>
                  <div className="rec-time">{formatSeconds(recordSeconds)}</div>
                </>
              ) : (
                <span style={{ fontSize: 13, color: '#8a8294' }}>Tap to record</span>
              )}
            </>
          ) : (
            <>
              <span style={{ fontSize: 13, fontWeight: 700 }}>Recorded · {formatSeconds(recordSeconds)}</span>
              <button
                type="button"
                className="link-toggle"
                style={{ marginLeft: 'auto' }}
                onClick={() => setRecordedBlob(null)}
              >
                Re-record
              </button>
            </>
          )}
        </div>
      )}
      {micError && <p className="error-text">{micError}</p>}

      <button type="button" className="link-toggle" onClick={() => setMode(mode === 'text' ? 'voice' : 'text')}>
        {mode === 'text' ? '🎙️ Record a voice wish instead' : '✏️ Write a wish instead'}
      </button>

      {error && <p className="error-text">{error}</p>}

      <button className="primary-btn" type="submit" disabled={submitting}>
        {submitting ? 'Lighting…' : 'Light this candle 🕯️'}
      </button>
      <button type="button" className="secondary-btn" style={{ marginTop: 10 }} onClick={onCancel}>
        Cancel
      </button>
    </form>
  );
}

/* ---------------- Unlocked, but nobody lit a candle ---------------- */
function NoCandlesYet({ cake, children }) {
  return (
    <main className="page">
      <div className="card" style={{ textAlign: 'center' }}>
        <div className="eyebrow-label">{cake.recipient_name.toUpperCase()}&apos;S CAKE</div>
        <h2 className="heading">No candles yet</h2>
        <p className="sub">
          Nobody&apos;s lit a candle for {cake.recipient_name} yet. If you unlocked this
          early by mistake, the organizer password lets you push the unlock time back.
        </p>
        {children}
      </div>
    </main>
  );
}

/* ---------------- Unlocked intro ---------------- */
function OpenIntro({ cake, candleCount, onOpen, children }) {
  return (
    <main className="page">
      <div className="card" style={{ textAlign: 'center' }}>
        <div className="eyebrow-label">{cake.recipient_name.toUpperCase()} · IT&apos;S TIME</div>
        <h2 className="heading">Happy birthday, {cake.recipient_name}!</h2>
        <p className="sub">
          {candleCount} friend{candleCount === 1 ? '' : 's'} lit a candle for you this year.
        </p>
        <button className="primary-btn" onClick={onOpen}>Open your cake →</button>
        {children}
      </div>
    </main>
  );
}

/* ---------------- Candle-by-candle replay ---------------- */
function ReplayStage({ cake, candles, onDone }) {
  const [index, setIndex] = useState(0);
  const [autoplayOn, setAutoplayOn] = useState(false);
  const [playingVoice, setPlayingVoice] = useState(false);
  const audioRef = useRef(null);
  const timerRef = useRef(null);

  const current = candles[index];
  const isLast = index === candles.length - 1;

  function clearAuto() {
    clearTimeout(timerRef.current);
  }

  useEffect(() => () => clearAuto(), []);

  function goTo(i) {
    setAutoplayOn(false);
    clearAuto();
    audioRef.current?.pause();
    setPlayingVoice(false);
    setIndex(Math.max(0, Math.min(candles.length - 1, i)));
  }

  function playVoiceManually() {
    if (!audioRef.current) return;
    audioRef.current.currentTime = 0;
    audioRef.current.play().catch(() => {});
    setPlayingVoice(true);
  }

  function readDelayMs(text) {
    const words = (text || '').trim().split(/\s+/).filter(Boolean).length || 1;
    const seconds = Math.max(3.5, Math.min(9, words / 2.6 + 1.2));
    return seconds * 1000;
  }

  function advanceAuto() {
    setIndex((i) => (i < candles.length - 1 ? i + 1 : i));
    if (index >= candles.length - 1) setAutoplayOn(false);
  }

  useEffect(() => {
    if (!autoplayOn) return;
    clearAuto();
    if (current.message_type === 'voice') {
      playVoiceManually(); // advance is driven by the audio 'ended' event
    } else {
      timerRef.current = setTimeout(advanceAuto, readDelayMs(current.message));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, autoplayOn]);

  function handleAudioEnded() {
    setPlayingVoice(false);
    if (autoplayOn) {
      timerRef.current = setTimeout(advanceAuto, 500);
    }
  }

  function toggleAutoplay() {
    const next = !autoplayOn;
    setAutoplayOn(next);
    if (!next) {
      clearAuto();
      audioRef.current?.pause();
      setPlayingVoice(false);
    }
  }

  return (
    <main className="page">
      <div className="card">
        <div className="eyebrow-label">CANDLE {index + 1} OF {candles.length}</div>
        <h2 className="heading">{cake.recipient_name} opens her cake</h2>
        <p className="sub" style={{ marginBottom: 10 }}>One candle at a time, just like the real thing.</p>

        <Cake theme={cake.theme} candles={candles.slice(0, index + 1)} />

        <div className="replay-card">
          <div className="sender-row">
            <div className="sender-dot" style={{ background: `var(--${current.color})` }} />
            <div className="sender-name">{current.sender_name}</div>
          </div>
          {current.message_type === 'text' ? (
            <div className="wish-text">&quot;{current.message}&quot;</div>
          ) : (
            <div className="play-row">
              <button type="button" className="play-btn" onClick={playVoiceManually}>▶</button>
              {playingVoice ? (
                <div className="wave">
                  {Array.from({ length: 9 }).map((_, i) => (
                    <div key={i} className="bar" style={{ animationDelay: `${i * 0.08}s` }} />
                  ))}
                </div>
              ) : (
                <span style={{ fontSize: 12, color: '#8a8294', fontWeight: 600 }}>Voice wish</span>
              )}
              <audio ref={audioRef} src={current.voice_url} onEnded={handleAudioEnded} style={{ display: 'none' }} />
            </div>
          )}
        </div>

        <div className="replay-controls">
          <button type="button" className="mini-btn" onClick={() => goTo(index - 1)} disabled={index === 0}>
            ‹ Previous
          </button>
          <div className="replay-dots">
            {candles.map((_, i) => (
              <div key={i} className={`rdot ${i === index ? 'active' : ''}`} />
            ))}
          </div>
          <button type="button" className="autoplay-toggle" onClick={toggleAutoplay}>
            {autoplayOn ? 'Autoplay ⏸' : 'Autoplay ▶'}
          </button>
        </div>

        <button className="primary-btn" onClick={() => (isLast ? onDone() : goTo(index + 1))}>
          {isLast ? 'All candles lit → Make a wish' : 'Next candle ›'}
        </button>
      </div>
    </main>
  );
}

/* ---------------- Blow them out (mic, with a tap fallback) ---------------- */
function BlowOutStage({ cake, candles, onDone }) {
  const [done, setDone] = useState(false);
  const doneRef = useRef(false);
  const [micStatus, setMicStatus] = useState('Real microphone input — try blowing!');

  function burstConfetti() {
    const colors = ['#FF6B57', '#FFB627', '#2EC4B6', '#8B7FD1', '#FF6FA8'];
    for (let i = 0; i < 36; i++) {
      const piece = document.createElement('div');
      piece.className = 'confetti-piece';
      piece.style.left = `${Math.random() * 100}vw`;
      piece.style.background = colors[i % colors.length];
      piece.style.animationDuration = `${1.2 + Math.random() * 1.2}s`;
      piece.style.animationDelay = `${Math.random() * 0.3}s`;
      document.body.appendChild(piece);
      setTimeout(() => piece.remove(), 2800);
    }
  }

  function extinguishAll() {
    if (doneRef.current) return;
    doneRef.current = true;
    setDone(true);
    burstConfetti();
  }

  async function tryMic() {
    setMicStatus('Requesting mic access…');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicStatus('Listening… blow now!');
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);
      const start = performance.now();
      let aboveCount = 0;

      const check = () => {
        if (doneRef.current) {
          stream.getTracks().forEach((t) => t.stop());
          ctx.close();
          return;
        }
        analyser.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b, 0) / data.length;
        aboveCount = avg > 55 ? aboveCount + 1 : 0;

        if (aboveCount > 3) {
          stream.getTracks().forEach((t) => t.stop());
          ctx.close();
          extinguishAll();
          return;
        }
        if (performance.now() - start > 8000) {
          stream.getTracks().forEach((t) => t.stop());
          ctx.close();
          setMicStatus("Didn't catch a blow — try the button below.");
          return;
        }
        requestAnimationFrame(check);
      };
      check();
    } catch {
      setMicStatus('Mic unavailable here — use the button below instead.');
    }
  }

  return (
    <main className="page">
      <div className="card" style={{ textAlign: 'center' }}>
        {!done ? (
          <>
            <div className="eyebrow-label">MAKE A WISH</div>
            <h2 className="heading">Make a wish, then blow them out</h2>
            <p className="sub">All {candles.length} candles are lit and waiting.</p>
            <Cake theme={cake.theme} candles={candles} />
            <div className="mic-area">
              <div className="mic-status">{micStatus}</div>
              <button className="mic-btn" onClick={tryMic}>🎙️ Blow into your mic</button>
              <button className="secondary-btn" onClick={extinguishAll}>👆 Or tap here to blow them out</button>
            </div>
          </>
        ) : (
          <>
            <div className="eyebrow-label">WISH MADE</div>
            <h2 className="heading">Happy birthday, {cake.recipient_name}! 🎉</h2>
            <p className="sub">{candles.length} people lit a candle for you this year.</p>
            <Cake theme={cake.theme} candles={candles} extinguishingAll />
            <button className="primary-btn" onClick={onDone}>See your keepsake →</button>
          </>
        )}
      </div>
    </main>
  );
}

/* ---------------- Keepsake ---------------- */
function KeepsakeStage({ cake, candles, children }) {
  return (
    <main className="page">
      <div className="card">
        <div className="eyebrow-label">SAVED FOREVER</div>
        <h2 className="heading">{cake.recipient_name}&apos;s candles</h2>
        <p className="sub">This page is yours to reopen any time — nothing to save, it&apos;s already here.</p>
        <div className="keepsake-list">
          {candles.map((c) => (
            <div className="keepsake-item" key={c.id}>
              <div className="dot" style={{ background: `var(--${c.color})` }} />
              <div className="who">{c.sender_name}</div>
              <div className="snippet">{c.message_type === 'text' ? c.message : 'Voice wish 🎙️'}</div>
            </div>
          ))}
        </div>
        {children}
      </div>
    </main>
  );
}
