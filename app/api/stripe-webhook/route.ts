import type Stripe from 'stripe';
import { supabaseAdmin } from '../../lib/supabase-admin';
import { stripeClient, stripeWebhookSecret } from '../../lib/stripe';

export const dynamic = 'force-dynamic';

type AttemptRow = {
  id: string;
  stripe_checkout_session_id: string | null;
  status: string;
  currency: string;
};

type AttemptItemRow = {
  product_id: string;
  variant_id: string;
  colorway_id: string | null;
  product_name: string;
  style: string;
  color: string | null;
  garment: string | null;
  size: string;
  sku: string;
  quantity: number;
  unit_price_cents: number;
  stripe_price_id: string;
};

async function setAttemptStatus(
  attemptId: string,
  status: 'paid' | 'failed' | 'expired',
  sessionId: string,
) {
  const paidGuard = status === 'paid' ? '' : '&status=neq.paid';
  await supabaseAdmin(`checkout_attempts?id=eq.${encodeURIComponent(attemptId)}${paidGuard}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({ status, stripe_checkout_session_id: sessionId }),
  });
}

async function allLineItems(stripe: Stripe, sessionId: string) {
  const items: Stripe.LineItem[] = [];
  let startingAfter: string | undefined;
  do {
    const page = await stripe.checkout.sessions.listLineItems(sessionId, {
      limit: 100,
      ...(startingAfter ? { starting_after: startingAfter } : {}),
    });
    items.push(...page.data);
    startingAfter = page.has_more ? page.data.at(-1)?.id : undefined;
  } while (startingAfter);
  return items;
}

function priceQuantities(items: Array<{ stripe_price_id: string; quantity: number }>) {
  const quantities = new Map<string, number>();
  for (const item of items) {
    quantities.set(item.stripe_price_id, (quantities.get(item.stripe_price_id) ?? 0) + item.quantity);
  }
  return quantities;
}

async function recordPaidSession(event: Stripe.Event, eventSession: Stripe.Checkout.Session) {
  const stripe = stripeClient();
  const session = await stripe.checkout.sessions.retrieve(eventSession.id);
  if (!['paid', 'no_payment_required'].includes(session.payment_status)) return;

  const attemptId = session.client_reference_id ?? session.metadata?.checkout_attempt_id;
  if (!attemptId) throw new Error('Checkout Session is missing its attempt reference.');

  const attempts = await supabaseAdmin(
    `checkout_attempts?select=id,stripe_checkout_session_id,status,currency&id=eq.${encodeURIComponent(attemptId)}`,
  ) as AttemptRow[];
  const attempt = attempts[0];
  if (!attempt) throw new Error('Checkout attempt was not found.');
  if (attempt.stripe_checkout_session_id && attempt.stripe_checkout_session_id !== session.id) {
    throw new Error('Checkout Session does not match its saved attempt.');
  }
  if (attempt.currency !== session.currency) throw new Error('Checkout currency does not match its saved attempt.');

  const attemptItems = await supabaseAdmin(
    `checkout_attempt_items?select=product_id,variant_id,colorway_id,product_name,style,color,garment,size,sku,quantity,unit_price_cents,stripe_price_id&checkout_attempt_id=eq.${encodeURIComponent(attemptId)}&order=sort_order.asc`,
  ) as AttemptItemRow[];
  if (!attemptItems.length) throw new Error('Checkout attempt has no items.');

  const lineItems = await allLineItems(stripe, session.id);
  const stripeQuantities = new Map<string, number>();
  const firstLineIdByPrice = new Map<string, string>();
  for (const lineItem of lineItems) {
    const priceId = lineItem.price?.id;
    const quantity = lineItem.quantity;
    if (!priceId || !quantity) throw new Error('Stripe returned an incomplete line item.');
    stripeQuantities.set(priceId, (stripeQuantities.get(priceId) ?? 0) + quantity);
    if (!firstLineIdByPrice.has(priceId)) firstLineIdByPrice.set(priceId, lineItem.id);
  }

  const savedQuantities = priceQuantities(attemptItems);
  if (savedQuantities.size !== stripeQuantities.size) throw new Error('Stripe line items do not match the checkout attempt.');
  for (const [priceId, quantity] of savedQuantities) {
    if (stripeQuantities.get(priceId) !== quantity) throw new Error('Stripe quantities do not match the checkout attempt.');
  }

  const expectedSubtotal = attemptItems.reduce(
    (total, item) => total + item.unit_price_cents * item.quantity,
    0,
  );
  if (session.amount_subtotal !== expectedSubtotal || session.amount_total === null) {
    throw new Error('Stripe totals do not match the checkout attempt.');
  }

  const shipping = session.collected_information?.shipping_details;
  const paymentIntentId = typeof session.payment_intent === 'string'
    ? session.payment_intent
    : session.payment_intent?.id ?? null;
  const order = {
    stripe_checkout_session_id: session.id,
    stripe_payment_intent_id: paymentIntentId,
    customer_email: session.customer_details?.email ?? session.customer_email ?? null,
    customer_name: shipping?.name ?? session.customer_details?.name ?? null,
    shipping_address: shipping?.address ?? null,
    payment_status: session.payment_status,
    currency: session.currency,
    subtotal_cents: session.amount_subtotal,
    discount_cents: session.total_details?.amount_discount ?? 0,
    shipping_cents: session.total_details?.amount_shipping ?? 0,
    tax_cents: session.total_details?.amount_tax ?? 0,
    total_cents: session.amount_total,
  };
  const orderItems = attemptItems.map((item) => ({
    stripe_line_item_id: firstLineIdByPrice.get(item.stripe_price_id),
    product_id: item.product_id,
    variant_id: item.variant_id,
    colorway_id: item.colorway_id,
    product_name: item.product_name,
    style: item.style,
    color: item.color,
    garment: item.garment,
    size: item.size,
    sku: item.sku,
    quantity: item.quantity,
    unit_price_cents: item.unit_price_cents,
    stripe_price_id: item.stripe_price_id,
  }));
  if (orderItems.some((item) => !item.stripe_line_item_id)) {
    throw new Error('Unable to reconcile a Stripe line item.');
  }

  await supabaseAdmin('rpc/record_paid_checkout', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({
      p_event_id: event.id,
      p_event_type: event.type,
      p_event_created_at: new Date(event.created * 1000).toISOString(),
      p_order: order,
      p_items: orderItems,
    }),
  });
  await setAttemptStatus(attemptId, 'paid', session.id);
}

export async function POST(request: Request) {
  const signature = request.headers.get('stripe-signature');
  if (!signature) return Response.json({ error: 'Missing Stripe signature.' }, { status: 400 });

  const rawBody = await request.text();
  const stripe = stripeClient();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(rawBody, signature, stripeWebhookSecret());
  } catch {
    return Response.json({ error: 'Invalid Stripe signature.' }, { status: 400 });
  }

  try {
    if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
      await recordPaidSession(event, event.data.object);
    } else if (event.type === 'checkout.session.async_payment_failed' || event.type === 'checkout.session.expired') {
      const session = event.data.object;
      const attemptId = session.client_reference_id ?? session.metadata?.checkout_attempt_id;
      if (attemptId) {
        await setAttemptStatus(attemptId, event.type.endsWith('expired') ? 'expired' : 'failed', session.id);
      }
    }

    return Response.json({ received: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Webhook processing failed.';
    console.error('Stripe webhook failed:', message);
    return Response.json({ error: 'Webhook processing failed.' }, { status: 500 });
  }
}
