'use client';

import { FormEvent, useState } from 'react';

export default function EmailSignup() {
  const [joined, setJoined] = useState(false);
  function handleSubmit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setJoined(true); }
  if (joined) return <p className="signup__success" role="status">You’re in. Try to act natural. <span>✓</span></p>;
  return (
    <form className="signup__form" onSubmit={handleSubmit}>
      <label className="sr-only" htmlFor="email">Email address</label>
      <input id="email" name="email" type="email" placeholder="YOUR EMAIL ADDRESS" autoComplete="email" required />
      <button type="submit">Join <span aria-hidden="true">↗</span></button>
      <p>No spam. We’re too busy making questionable shirts.</p>
    </form>
  );
}
