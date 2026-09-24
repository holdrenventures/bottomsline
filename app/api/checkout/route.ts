import type Stripe from 'stripe';
import { supabaseAdmin } from '../../lib/supabase-admin';
import { stripeClient } from '../../lib/stripe';

export const dynamic = 'force-dynamic';

type CheckoutInput = {
  items?: Array<{
    productId?: string;
    variantId?: string | null;
    colorId?: string | null;
    quantity?: number;
  }>;
};

type ProductRow = {
  id: string;
  name: string;
  slug: string;
  active: boolean;
  currency: string;
};

type VariantRow = {
  id: string;
  product_id: string;
  style: string;
  garment: string | null;
  size: string;
  sku: string;
  active: boolean;
  inventory_quantity: number | null;
  price_cents: number;
};

type ColorRow = {
  id: string;
  product_id: string;
  color: string;
  style: string | null;
  garment: string | null;
  active: boolean;
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function badRequest(message: string) {
  return Response.json({ error: message }, { status: 400 });
}

function checkoutOrigin(request: Request) {
  const configured = process.env.SITE_URL?.replace(/\/$/, '');
  if (configured) return configured;
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}

function randomLetters(length = 8) {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz';
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join('');
}

export async function POST(request: Request) {
  try {
    const input = await request.json() as CheckoutInput;
    if (!Array.isArray(input.items) || input.items.length < 1 || input.items.length > 25) {
      return badRequest('Your bag must contain between 1 and 25 selections.');
    }

    const selections = input.items.map((item) => ({
      productId: item.productId?.trim() ?? '',
      variantId: item.variantId?.trim() ?? '',
      colorId: item.colorId?.trim() || null,
      quantity: Number(item.quantity),
    }));

    if (selections.some((item) => !uuidPattern.test(item.productId) || !uuidPattern.test(item.variantId))) {
      return badRequest('One or more bag selections are no longer available.');
    }
    if (selections.some((item) => item.colorId && !uuidPattern.test(item.colorId))) {
      return badRequest('One or more color selections are invalid.');
    }
    if (selections.some((item) => !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 9)) {
      return badRequest('Each quantity must be between 1 and 9.');
    }

    const productIds = [...new Set(selections.map((item) => item.productId))];
    const variantIds = [...new Set(selections.map((item) => item.variantId))];
    const colorIds = [...new Set(selections.flatMap((item) => item.colorId ? [item.colorId] : []))];

    const [products, variants, colors] = await Promise.all([
      supabaseAdmin(`products?select=id,name,slug,active,currency&id=in.(${productIds.join(',')})`) as Promise<ProductRow[]>,
      supabaseAdmin(`product_variants?select=id,product_id,style,garment,size,sku,active,inventory_quantity,price_cents&id=in.(${variantIds.join(',')})`) as Promise<VariantRow[]>,
      colorIds.length
        ? supabaseAdmin(`product_colors?select=id,product_id,color,style,garment,active&id=in.(${colorIds.join(',')})`) as Promise<ColorRow[]>
        : Promise.resolve([] as ColorRow[]),
    ]);

    const productById = new Map(products.map((product) => [product.id, product]));
    const variantById = new Map(variants.map((variant) => [variant.id, variant]));
    const colorById = new Map(colors.map((color) => [color.id, color]));
    const trusted = selections.map((selection) => {
      const product = productById.get(selection.productId);
      const variant = variantById.get(selection.variantId);
      const color = selection.colorId ? colorById.get(selection.colorId) : null;

      if (!product?.active || !variant?.active || variant.product_id !== product.id) {
        throw new Error('One or more products are no longer available.');
      }
      if (variant.inventory_quantity !== null && selection.quantity > variant.inventory_quantity) {
        throw new Error(`Only ${variant.inventory_quantity} of ${product.name} is currently available.`);
      }
      if (selection.colorId && (!color?.active || color.product_id !== product.id)) {
        throw new Error(`The selected color for ${product.name} is no longer available.`);
      }
      if (color?.style && color.style !== variant.style) {
        throw new Error(`The selected style for ${product.name} is no longer available.`);
      }

      return { selection, product, variant, color };
    });

    const quantityByVariant = new Map<string, number>();
    for (const { selection, variant } of trusted) {
      quantityByVariant.set(variant.id, (quantityByVariant.get(variant.id) ?? 0) + selection.quantity);
    }
    for (const { product, variant } of trusted) {
      const requested = quantityByVariant.get(variant.id) ?? 0;
      if (variant.inventory_quantity !== null && requested > variant.inventory_quantity) {
        throw new Error(`Only ${variant.inventory_quantity} of ${product.name} is currently available.`);
      }
    }

    const currencies = new Set(trusted.map(({ product }) => product.currency));
    if (currencies.size !== 1) throw new Error('All bag items must use the same currency.');
    const currency = trusted[0].product.currency;

    const stripe = stripeClient();
    const attemptId = crypto.randomUUID();
    await supabaseAdmin('checkout_attempts', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ id: attemptId, currency, status: 'creating' }),
    });
    let createdSession: Stripe.Checkout.Session | null = null;
    try {
      const origin = checkoutOrigin(request);
      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        client_reference_id: attemptId,
        integration_identifier: `bottoms_line_${randomLetters()}`,
        line_items: trusted.map(({ selection, product, variant, color }, index) => ({
          price_data: {
            currency,
            unit_amount: variant.price_cents,
            product_data: {
              name: product.name,
              description: [variant.style, color?.color, variant.size].filter(Boolean).join(' / '),
              metadata: {
                checkout_attempt_id: attemptId,
                line_index: String(index),
                product_id: product.id,
                variant_id: variant.id,
              },
            },
          },
          quantity: selection.quantity,
        })),
        metadata: { checkout_attempt_id: attemptId },
        payment_intent_data: { metadata: { checkout_attempt_id: attemptId } },
        billing_address_collection: 'auto',
        shipping_address_collection: { allowed_countries: ['US'] },
        success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/bag`,
      }, { idempotencyKey: `bottoms-line-checkout-${attemptId}` });
      createdSession = session;

      if (!session.url) throw new Error('Stripe did not return a Checkout URL.');
      const lineItems = await stripe.checkout.sessions.listLineItems(session.id, {
        limit: 100,
        expand: ['data.price.product'],
      });
      if (lineItems.has_more || lineItems.data.length !== trusted.length) {
        throw new Error('Stripe returned an unexpected line-item count.');
      }

      const snapshots: Array<Record<string, unknown> | undefined> = new Array(trusted.length);
      for (const lineItem of lineItems.data) {
        const price = lineItem.price;
        const stripeProduct = price && typeof price.product !== 'string' ? price.product : null;
        const index = Number(stripeProduct && !('deleted' in stripeProduct) ? stripeProduct.metadata.line_index : NaN);
        const trustedItem = trusted[index];
        if (
          !price?.id ||
          !trustedItem ||
          snapshots[index] ||
          price.currency !== currency ||
          price.unit_amount !== trustedItem.variant.price_cents ||
          lineItem.quantity !== trustedItem.selection.quantity ||
          lineItem.amount_subtotal !== trustedItem.variant.price_cents * trustedItem.selection.quantity
        ) {
          throw new Error('Stripe line items do not match the authoritative catalog snapshot.');
        }

        const { selection, product, variant, color } = trustedItem;
        snapshots[index] = {
          checkout_attempt_id: attemptId,
          sort_order: index,
          product_id: product.id,
          variant_id: variant.id,
          colorway_id: color?.id ?? null,
          product_name: product.name,
          style: variant.style,
          color: color?.color ?? null,
          garment: variant.garment ?? color?.garment ?? null,
          size: variant.size,
          sku: variant.sku,
          quantity: selection.quantity,
          unit_price_cents: variant.price_cents,
          stripe_price_id: price.id,
        };
      }
      if (snapshots.some((snapshot) => !snapshot)) {
        throw new Error('Stripe did not return every authoritative catalog line.');
      }

      await supabaseAdmin('checkout_attempt_items', {
        method: 'POST',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify(snapshots),
      });
      await supabaseAdmin(`checkout_attempts?id=eq.${attemptId}&status=eq.creating`, {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ stripe_checkout_session_id: session.id, status: 'open' }),
      });
      return Response.json({ url: session.url });
    } catch (error) {
      if (createdSession?.status === 'open') {
        try { await stripe.checkout.sessions.expire(createdSession.id); } catch { /* Preserve the original checkout error. */ }
      }
      await supabaseAdmin(`checkout_attempts?id=eq.${attemptId}&status=eq.creating`, {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ status: 'failed' }),
      });
      throw error;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Checkout is temporarily unavailable.';
    const status = /available|invalid|quantity|currency/i.test(message) ? 400 : 500;
    if (status === 500) console.error('Checkout creation failed:', message);
    return Response.json({ error: status === 400 ? message : 'Checkout is temporarily unavailable.' }, { status });
  }
}
