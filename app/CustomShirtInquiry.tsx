'use client';

import { FormEvent, useState } from 'react';

export default function CustomShirtInquiry() {
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    const form = event.currentTarget;
    const payload = Object.fromEntries(new FormData(form).entries());
    setSubmitting(true);
    setError('');

    try {
      const response = await fetch('/api/custom-inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error('Inquiry failed');
      setSent(true);
    } catch {
      setError('Your note didn’t go through. Please try again in a moment.');
    } finally {
      setSubmitting(false);
    }
  }

  if (sent) {
    return (
      <div className="custom-form__success" role="status">
        <p className="eyebrow"><span /> Message received</p>
        <h3>Good idea.<br /><em>I’ll be in touch.</em></h3>
        <p>Thanks for sharing what you have in mind.</p>
      </div>
    );
  }

  return (
    <form className="custom-form" onSubmit={handleSubmit}>
      <div className="custom-form__row">
        <div className="custom-form__field">
          <label htmlFor="custom-name">Your name</label>
          <input id="custom-name" name="name" autoComplete="name" maxLength={100} required />
        </div>
        <div className="custom-form__field">
          <label htmlFor="custom-email">Email</label>
          <input id="custom-email" name="email" type="email" autoComplete="email" maxLength={254} required />
        </div>
      </div>

      <div className="custom-form__field">
        <label htmlFor="custom-project">What are you thinking?</label>
        <select id="custom-project" name="project_type" defaultValue="modify">
          <option value="modify">Customize a design I already like</option>
          <option value="scratch">Create something from scratch</option>
        </select>
      </div>

      <div className="custom-form__field">
        <label htmlFor="custom-quantity">About how many shirts?</label>
        <input id="custom-quantity" name="quantity" type="number" min="1" max="5000" inputMode="numeric" placeholder="Just one, or a group order" />
        <span className="custom-form__hint">Team and group orders are welcome. A rough estimate is fine.</span>
      </div>

      <div className="custom-form__field">
        <label htmlFor="custom-idea">Tell me about the idea</label>
        <textarea id="custom-idea" name="message" rows={5} maxLength={3000} placeholder="A design you want to change, an idea from scratch, your group’s theme…" required />
      </div>

      <div className="custom-form__honeypot" aria-hidden="true">
        <label htmlFor="custom-website">Leave this field empty</label>
        <input id="custom-website" name="website" tabIndex={-1} autoComplete="off" />
      </div>

      <button className="button button--primary" type="submit" disabled={submitting}>
        {submitting ? 'Sending…' : 'Send your idea'} <span aria-hidden="true">↗</span>
      </button>
      <p className="custom-form__privacy">Your note and email go straight to Bottom’s Line so I can follow up.</p>
      {error && <p className="custom-form__error" role="alert">{error}</p>}
    </form>
  );
}
