import { supabaseAdmin } from '../../lib/supabase-admin';

export const dynamic = 'force-dynamic';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return Response.json({ error: 'Enter a valid email address.' }, { status: 400 });
  }

  const raw = typeof input === 'object' && input !== null && 'email' in input
    ? (input as { email: unknown }).email
    : null;
  const email = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
  if (email.length > 254 || !emailPattern.test(email)) {
    return Response.json({ error: 'Enter a valid email address.' }, { status: 400 });
  }

  try {
    await supabaseAdmin('newsletter_subscribers?on_conflict=email', {
      method: 'POST',
      headers: { Prefer: 'resolution=ignore-duplicates,return=minimal' },
      body: JSON.stringify({ email, source: 'homepage' }),
    });
    return Response.json({ ok: true });
  } catch (error) {
    console.error('Newsletter signup failed', error);
    return Response.json({ error: 'Signup is temporarily unavailable.' }, { status: 503 });
  }
}
