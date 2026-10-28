'use client';

import { FormEvent, useState } from 'react';

export default function EmailSignup() {
  const [joined, setJoined] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    const form = event.currentTarget;
    const email = new FormData(form).get('email');
    setSubmitting(true);
    setError('');
    try {
      const response = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!response.ok) throw new Error('Signup failed');
      setJoined(true);
    } catch {
      setError('We couldn’t save your email. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }
  if (joined) return <p className="signup__success" role="status">You’re in. Try to act natural. <span>✓</span></p>;
  return (
    <form className="signup__form" onSubmit={handleSubmit}>
      <label className="sr-only" htmlFor="email">Email address</label>
      <input id="email" name="email" type="email" placeholder="YOUR EMAIL ADDRESS" autoComplete="email" required />
      <button type="submit" disabled={submitting}>{submitting ? 'Joining…' : 'Join'} <span aria-hidden="true">↗</span></button>
      <p>Get Bottom’s Line emails. Unsubscribe anytime.</p>
      {error && <p role="alert">{error}</p>}
    </form>
  );
}
