import 'server-only';

/**
 * Minimal Resend REST wrapper for Cloudflare Workers.
 *
 * We call Resend from the Worker (no SDK) because:
 *  - Workers runs on the Fetch standard; a plain fetch keeps the bundle small.
 *  - Resend's Node SDK pulls in deps that would otherwise need to be shimmed.
 *
 * Required env vars (set as Cloudflare Worker secrets, not plain vars):
 *   - RESEND_API_KEY         Resend API key (re_...)
 *   - MAIL_FROM              Verified sender, e.g. "Bottom's Line <hello@bottomslineclothing.com>"
 *   - ORDER_NOTIFICATION_EMAIL   Where new-order alerts go (owner inbox)
 */
export type SendEmailInput = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  tags?: Array<{ name: string; value: string }>;
};

export type SendEmailResult = { ok: true; id: string } | { ok: false; error: string };

export function emailFrom(): string | null {
  return process.env.MAIL_FROM ?? null;
}

export function orderNotificationRecipient(): string | null {
  return process.env.ORDER_NOTIFICATION_EMAIL ?? null;
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = emailFrom();
  if (!apiKey) return { ok: false, error: 'RESEND_API_KEY is not configured.' };
  if (!from) return { ok: false, error: 'MAIL_FROM is not configured.' };

  const body = {
    from,
    to: Array.isArray(input.to) ? input.to : [input.to],
    subject: input.subject,
    html: input.html,
    ...(input.text ? { text: input.text } : {}),
    ...(input.replyTo ? { reply_to: input.replyTo } : {}),
    ...(input.tags ? { tags: input.tags } : {}),
  };

  let response: Response;
  try {
    response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Resend network error' };
  }

  if (!response.ok) {
    const payload = (await response.text()).slice(0, 500);
    return { ok: false, error: `Resend ${response.status}: ${payload}` };
  }
  const payload = (await response.json()) as { id?: string };
  return payload.id ? { ok: true, id: payload.id } : { ok: false, error: 'Resend returned no id.' };
}
