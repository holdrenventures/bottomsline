import { sendEmail, orderNotificationRecipient } from '../../lib/email';
import { escapeHtml } from '../../lib/emails/types';

export const dynamic = 'force-dynamic';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const projectTypes = {
  modify: 'Customize an existing design',
  scratch: 'Create a design from scratch',
} as const;

function readString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

export async function POST(request: Request) {
  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return Response.json({ error: 'Please check your details and try again.' }, { status: 400 });
  }

  if (!input || typeof input !== 'object') {
    return Response.json({ error: 'Please check your details and try again.' }, { status: 400 });
  }

  const fields = input as Record<string, unknown>;
  // Quietly accept bot submissions without mailing the owner.
  if (readString(fields.website)) return Response.json({ ok: true });

  const name = readString(fields.name);
  const email = readString(fields.email).toLowerCase();
  const projectType = readString(fields.project_type);
  const message = readString(fields.message);
  const rawQuantity = readString(fields.quantity);
  const quantity = rawQuantity ? Number(rawQuantity) : null;

  if (!name || name.length > 100 || /[\r\n]/.test(name)) {
    return Response.json({ error: 'Please enter your name.' }, { status: 400 });
  }
  if (!email || email.length > 254 || !emailPattern.test(email)) {
    return Response.json({ error: 'Please enter a valid email address.' }, { status: 400 });
  }
  if (projectType !== 'modify' && projectType !== 'scratch') {
    return Response.json({ error: 'Please choose what kind of custom shirt you have in mind.' }, { status: 400 });
  }
  if (rawQuantity && (!Number.isInteger(quantity) || Number(quantity) < 1 || Number(quantity) > 5000)) {
    return Response.json({ error: 'Please enter a shirt quantity between 1 and 5,000.' }, { status: 400 });
  }
  if (!message || message.length > 3000) {
    return Response.json({ error: 'Please describe your idea in 3,000 characters or fewer.' }, { status: 400 });
  }

  const recipient = orderNotificationRecipient();
  if (!recipient) {
    console.error('Custom shirt inquiry email is unavailable: ORDER_NOTIFICATION_EMAIL is not configured.');
    return Response.json({ error: 'Inquiry messages are temporarily unavailable.' }, { status: 503 });
  }

  const quantityLabel = quantity ? String(quantity) : 'Not specified';
  const text = [
    'New custom shirt inquiry from the Bottom’s Line website',
    '',
    `Name: ${name}`,
    `Email: ${email}`,
    `Request: ${projectTypes[projectType]}`,
    `Approximate quantity: ${quantityLabel}`,
    '',
    'Idea:',
    message,
  ].join('\n');
  const html = `<h2>New custom shirt inquiry</h2><p><strong>Name:</strong> ${escapeHtml(name)}</p><p><strong>Email:</strong> ${escapeHtml(email)}</p><p><strong>Request:</strong> ${escapeHtml(projectTypes[projectType])}</p><p><strong>Approximate quantity:</strong> ${escapeHtml(quantityLabel)}</p><p><strong>Idea:</strong></p><p>${escapeHtml(message).replace(/\n/g, '<br>')}</p>`;

  const result = await sendEmail({
    to: recipient,
    replyTo: email,
    subject: `Custom shirt inquiry from ${name}`,
    text,
    html,
    tags: [{ name: 'type', value: 'custom-shirt-inquiry' }],
  });

  if (!result.ok) {
    console.error('Custom shirt inquiry notification failed:', result.error);
    return Response.json({ error: 'Your note didn’t go through. Please try again in a moment.' }, { status: 503 });
  }

  return Response.json({ ok: true });
}
