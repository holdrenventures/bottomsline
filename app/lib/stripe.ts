import 'server-only';
import Stripe from 'stripe';

let client: Stripe | null = null;

export function stripeClient() {
  const apiKey = process.env.STRIPE_RESTRICTED_KEY;
  if (!apiKey) throw new Error('Stripe is not configured.');

  if (!client) {
    client = new Stripe(apiKey, {
      apiVersion: '2026-08-26.dahlia',
      maxNetworkRetries: 2,
    });
  }

  return client;
}

export function stripeWebhookSecret() {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error('Stripe webhook verification is not configured.');
  return secret;
}
