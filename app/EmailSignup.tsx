'use client';

import { FormEvent, useState } from 'react';

export default function EmailSignup() {
  const [joined, setJoined] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending) return;
    const email = new FormData(event.currentTarget).get('email');
    setSending(true);
    setError('');
    try {
      const response = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source: 'home' }),
      });
      const result = await response.json() as { ok?: boolean; error?: string };
      if (!response.ok || !result.ok) throw new Error(result.error ?? 'Signup is temporarily unavailable.');
      setJoined(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Signup is temporarily unavailable.');
    } finally {
      setSending(false);
    }
  }

  if (joined) return <p className="signup__success" role="status">You’re in. Your 10% code is in your inbox. <span>✓</span></p>;
  return (
    <form className="signup__form" onSubmit={handleSubmit}>
      <label className="sr-only" htmlFor="email">Email address</label>
      <input id="email" name="email" type="email" placeholder="YOUR EMAIL ADDRESS" autoComplete="email" required />
      <button type="submit" disabled={sending}>{sending ? 'Sending…' : 'Get 10% off'} <span aria-hidden="true">↗</span></button>
      <p role={error ? 'alert' : undefined} className={error ? 'signup__error' : undefined}>
        {error || 'Get Bottom’s Line emails. Unsubscribe anytime.'}
      </p>
    </form>
  );
}
