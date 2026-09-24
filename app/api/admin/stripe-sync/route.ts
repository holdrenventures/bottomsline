import Stripe from 'stripe';
import { isAdminRequest, supabaseAdmin } from '../../../lib/supabase-admin';
import { stripeCatalogClient } from '../../../lib/stripe';

export const dynamic = 'force-dynamic';

type ProductRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  currency: string;
  active: boolean;
};

type VariantRow = {
  id: string;
  style: string;
  size: string;
  price_cents: number;
  stripe_product_id: string | null;
  stripe_price_id: string | null;
};

type PriceGroup = {
  style: string;
  amount: number;
  currency: string;
  variants: VariantRow[];
};

function unauthorized() {
  return Response.json({ error: 'Invalid admin token.' }, { status: 401 });
}

function isDeletedProduct(product: Stripe.Product | Stripe.DeletedProduct): product is Stripe.DeletedProduct {
  return 'deleted' in product && product.deleted === true;
}

async function resolveProduct(
  stripe: Stripe,
  product: ProductRow,
  variants: VariantRow[],
) {
  const savedIds = [...new Set(variants.map((variant) => variant.stripe_product_id).filter(Boolean))] as string[];
  if (savedIds.length > 1) throw new Error('Variants point to conflicting Stripe Products. Clear the old references before syncing.');

  let stripeProduct: Stripe.Product | null = null;
  if (savedIds[0]) {
    try {
      const existing = await stripe.products.retrieve(savedIds[0]);
      if (!isDeletedProduct(existing)) stripeProduct = existing;
    } catch {
      stripeProduct = null;
    }
  }

  const metadata: Stripe.MetadataParam = {
    supabase_product_id: product.id,
    supabase_slug: product.slug,
    source: 'bottoms-line-supabase',
  };
  const attributes: Stripe.ProductUpdateParams = {
    name: product.name,
    description: product.description?.trim() || '',
    active: product.active,
    metadata,
  };

  if (stripeProduct) return stripe.products.update(stripeProduct.id, attributes);
  return stripe.products.create({
    name: product.name,
    description: product.description?.trim() || undefined,
    active: product.active,
    metadata,
  });
}

function groupVariants(variants: VariantRow[], currency: string) {
  const groups = new Map<string, PriceGroup>();
  for (const variant of variants) {
    const style = variant.style.trim() || 'Tee';
    const amount = Number(variant.price_cents);
    if (!Number.isInteger(amount) || amount < 0) throw new Error(`Variant ${variant.size} has an invalid price.`);
    const key = `${style.toLowerCase()}|${amount}|${currency}`;
    const group = groups.get(key) ?? { style, amount, currency, variants: [] };
    group.variants.push(variant);
    groups.set(key, group);
  }
  return [...groups.values()];
}

async function reusablePrice(stripe: Stripe, group: PriceGroup, stripeProductId: string) {
  const savedIds = [...new Set(group.variants.map((variant) => variant.stripe_price_id).filter(Boolean))] as string[];
  if (savedIds.length !== 1) return null;

  try {
    const price = await stripe.prices.retrieve(savedIds[0]);
    const priceProductId = typeof price.product === 'string' ? price.product : price.product.id;
    if (
      price.active &&
      priceProductId === stripeProductId &&
      price.currency === group.currency &&
      price.unit_amount === group.amount
    ) return price;
  } catch {
    // A missing or stale price is replaced below. Supabase receives the new reference.
  }
  return null;
}

export async function POST(request: Request) {
  if (!isAdminRequest(request)) return unauthorized();

  try {
    const input = await request.json() as { productId?: string };
    const productId = input.productId?.trim() ?? '';
    if (!/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(productId)) {
      return Response.json({ error: 'A saved product is required before Stripe sync.' }, { status: 400 });
    }

    const [products, variants] = await Promise.all([
      supabaseAdmin(`products?select=id,name,slug,description,currency,active&id=eq.${encodeURIComponent(productId)}&limit=1`) as Promise<ProductRow[]>,
      supabaseAdmin(`product_variants?select=id,style,size,price_cents,stripe_product_id,stripe_price_id&product_id=eq.${encodeURIComponent(productId)}&order=style.asc,size.asc`) as Promise<VariantRow[]>,
    ]);
    const product = products[0];
    if (!product) return Response.json({ error: 'Product not found.' }, { status: 404 });
    if (!variants.length) return Response.json({ error: 'Add and save at least one variant before syncing.' }, { status: 400 });

    const currency = product.currency.trim().toLowerCase();
    if (!/^[a-z]{3}$/.test(currency)) return Response.json({ error: 'Product currency must be a three-letter code.' }, { status: 400 });

    const stripe = stripeCatalogClient();
    const stripeProduct = await resolveProduct(stripe, product, variants);
    const groups = groupVariants(variants, currency);
    let pricesCreated = 0;

    const results = [];
    for (const group of groups) {
      let price = await reusablePrice(stripe, group, stripeProduct.id);
      if (!price) {
        price = await stripe.prices.create({
          product: stripeProduct.id,
          currency: group.currency,
          unit_amount: group.amount,
          nickname: `${group.style} — ${(group.amount / 100).toFixed(2)} ${group.currency.toUpperCase()}`,
          metadata: {
            supabase_product_id: product.id,
            style: group.style,
            source: 'bottoms-line-supabase',
          },
        });
        pricesCreated += 1;
      }

      const ids = group.variants.map((variant) => variant.id);
      await supabaseAdmin(`product_variants?id=in.(${ids.join(',')})`, {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ stripe_product_id: stripeProduct.id, stripe_price_id: price.id }),
      });
      results.push({ style: group.style, amount: group.amount, stripePriceId: price.id, variants: ids.length });
    }

    return Response.json({
      ok: true,
      stripeProductId: stripeProduct.id,
      pricesCreated,
      variantsUpdated: variants.length,
      groups: results,
    });
  } catch (error) {
    console.error('Stripe catalog sync failed:', error instanceof Error ? error.message : error);
    const message = error instanceof Error ? error.message : 'Stripe catalog sync failed.';
    const configurationError = /not configured/i.test(message);
    const validationError = /conflicting|invalid price/i.test(message);
    return Response.json(
      { error: configurationError ? message : validationError ? message : 'Unable to sync this product to Stripe.' },
      { status: configurationError ? 503 : validationError ? 400 : 500 },
    );
  }
}
