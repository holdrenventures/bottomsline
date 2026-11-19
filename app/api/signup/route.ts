import { sendEmail } from '../../lib/email';
import { welcomeHtml, welcomeSubject, welcomeText } from '../../lib/emails/welcome';
import { supabaseAdmin } from '../../lib/supabase-admin';

export const dynamic = 'force-dynamic';

type SignupRow = {
  email: string;
  discount_code: string;
  code_sent_at: string | null;
  redeemed_at: string | null;
};

const emailPattern = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
// Don't let anyone bomb an inbox by resubmitting the same address.
const RESEND_COOLDOWN_MS = 10 * 60 * 1000;

function welcomeCode() {
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return `QUIET-${Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join('')}`;
}

function siteOrigin(request: Request) {
  const configured = process.env.SITE_URL?.replace(/\/$/, '');
  if (configured) return configured;
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}

export async function POST(request: Request) {
  try {
    const input = await request.json() as { email?: unknown; source?: unknown };
    const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
    if (!emailPattern.test(email) || email.length > 254) {
      return Response.json({ error: 'That email doesn’t look right.' }, { status: 400 });
    }
    const source = typeof input.source === 'string' ? input.source.slice(0, 40) : null;

    const inserted = await supabaseAdmin('email_signups?on_conflict=email', {
      method: 'POST',
      headers: { Prefer: 'resolution=ignore-duplicates,return=representation' },
      body: JSON.stringify({ email, discount_code: welcomeCode(), source }),
    }) as SignupRow[];
    const existing = inserted[0]
      ?? (await supabaseAdmin(`email_signups?select=email,discount_code,code_sent_at,redeemed_at&email=eq.${encodeURIComponent(email)}`) as SignupRow[])[0];
    if (!existing) throw new Error('Signup row missing after upsert.');

    // Keep the existing marketing list complete while welcome codes live in a private table.
    await supabaseAdmin('newsletter_subscribers?on_conflict=email', {
      method: 'POST',
      headers: { Prefer: 'resolution=ignore-duplicates,return=minimal' },
      body: JSON.stringify({ email, source: source || 'homepage' }),
    });

    // Same response either way, so the form can't be used to probe who's on the list.
    const recentlySent = existing.code_sent_at && Date.now() - Date.parse(existing.code_sent_at) < RESEND_COOLDOWN_MS;
    if (existing.redeemed_at || recentlySent) return Response.json({ ok: true });

    const shopUrl = `${siteOrigin(request)}/shop`;
    const result = await sendEmail({
      to: email,
      subject: welcomeSubject,
      html: welcomeHtml(existing.discount_code, shopUrl),
      text: welcomeText(existing.discount_code, shopUrl),
      tags: [{ name: 'type', value: 'welcome' }],
    });
    if (!result.ok) {
      console.error('[signup] Welcome email failed:', result.error);
      return Response.json({ error: 'We couldn’t send your code just now. Try again in a minute.' }, { status: 502 });
    }

    await supabaseAdmin(`email_signups?email=eq.${encodeURIComponent(email)}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ code_sent_at: new Date().toISOString() }),
    });
    return Response.json({ ok: true });
  } catch (error) {
    console.error('[signup] Failed:', error instanceof Error ? error.message : error);
    return Response.json({ error: 'Signup is temporarily unavailable.' }, { status: 500 });
  }
}
