import { isAdminRequest, supabaseAdmin } from '../../../lib/supabase-admin';

export const dynamic = 'force-dynamic';

type VariantInput = {
  id?: string;
  style?: string;
  garment?: string | null;
  size?: string;
  sku?: string;
  active?: boolean;
  inventory_quantity?: number | null;
  stripe_product_id?: string | null;
  stripe_price_id?: string | null;
  price_cents?: number;
};

type ColorInput = {
  id?: string;
  color?: string;
  style?: string | null;
  garment?: string | null;
  mockup_url?: string | null;
  sort_order?: number;
  active?: boolean;
};

type ProductInput = {
  id?: string;
  name?: string;
  slug?: string;
  editorial_descriptor?: string | null;
  description?: string | null;
  base_price_cents?: number;
  currency?: string;
  catalog_image?: string | null;
  active?: boolean;
  featured?: boolean;
  new_drop?: boolean;
  collection_ids?: string[];
  product_variants?: VariantInput[];
  product_colors?: ColorInput[];
};

function unauthorized() {
  return Response.json({ error: 'Invalid admin token.' }, { status: 401 });
}

function cleanNullable(value: unknown) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function validateProduct(input: ProductInput) {
  const name = input.name?.trim() ?? '';
  const slug = input.slug?.trim().toLowerCase() ?? '';
  const price = Number(input.base_price_cents);
  const currency = input.currency?.trim().toLowerCase() ?? 'usd';
  if (!name) throw new Error('Product name is required.');
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new Error('Slug must use lowercase letters, numbers, and hyphens.');
  if (!Number.isInteger(price) || price < 0) throw new Error('Price must be a non-negative number of cents.');
  if (!/^[a-z]{3}$/.test(currency)) throw new Error('Currency must be a three-letter lowercase code.');
  return { name, slug, price, currency };
}

export async function GET(request: Request) {
  if (!isAdminRequest(request)) return unauthorized();

  try {
    const select = [
      '*',
      'product_variants(*)',
      'product_colors(*)',
      'product_collections(collection_id,sort_order)',
    ].join(',');
    const [products, collections] = await Promise.all([
      supabaseAdmin(`products?select=${encodeURIComponent(select)}&order=created_at.desc`),
      supabaseAdmin('collections?select=*&order=sort_order.asc'),
    ]);
    return Response.json({ products, collections });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'Unable to load catalog.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!isAdminRequest(request)) return unauthorized();

  try {
    const input = await request.json() as ProductInput;
    const { name, slug, price, currency } = validateProduct(input);
    const productPayload = {
      name,
      slug,
      editorial_descriptor: cleanNullable(input.editorial_descriptor),
      description: cleanNullable(input.description),
      base_price_cents: price,
      currency,
      catalog_image: cleanNullable(input.catalog_image),
      active: Boolean(input.active),
      featured: Boolean(input.featured),
      new_drop: Boolean(input.new_drop),
    };

    let productId = input.id;
    if (productId) {
      await supabaseAdmin(`products?id=eq.${encodeURIComponent(productId)}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify(productPayload),
      });
    } else {
      const created = await supabaseAdmin('products', {
        method: 'POST',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify(productPayload),
      }) as Array<{ id: string }>;
      productId = created[0]?.id;
    }
    if (!productId) throw new Error('Supabase did not return a product ID.');

    const variants = (input.product_variants ?? []).filter((variant) => variant.size?.trim() && variant.sku?.trim()).map((variant) => {
      const active = Boolean(variant.active);
      const style = variant.style?.trim() || 'Tee';
      const stripeProductId = cleanNullable(variant.stripe_product_id);
      const stripePriceId = cleanNullable(variant.stripe_price_id);
      return {
        id: variant.id || crypto.randomUUID(),
        product_id: productId,
        style,
        garment: cleanNullable(variant.garment),
        size: variant.size!.trim(),
        sku: variant.sku!.trim(),
        active,
        inventory_quantity: variant.inventory_quantity === null || variant.inventory_quantity === undefined
          ? null
          : Number(variant.inventory_quantity),
        stripe_product_id: stripeProductId,
        stripe_price_id: stripePriceId,
        price_cents: Number.isInteger(Number(variant.price_cents)) ? Number(variant.price_cents) : price,
      };
    });

    const colors = (input.product_colors ?? []).filter((color) => color.color?.trim()).map((color, index) => ({
      id: color.id || crypto.randomUUID(),
      product_id: productId,
      color: color.color!.trim(),
      style: cleanNullable(color.style),
      garment: cleanNullable(color.garment),
      mockup_url: cleanNullable(color.mockup_url),
      sort_order: Number.isInteger(Number(color.sort_order)) ? Number(color.sort_order) : index,
      active: color.active !== false,
    }));

    if (variants.length) {
      await supabaseAdmin('product_variants?on_conflict=id', {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify(variants),
      });
    }
    if (colors.length) {
      await supabaseAdmin('product_colors?on_conflict=id', {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify(colors),
      });
    }

    await supabaseAdmin(`product_collections?product_id=eq.${encodeURIComponent(productId)}`, { method: 'DELETE' });
    const collectionLinks = [...new Set(input.collection_ids ?? [])].map((collectionId, index) => ({
      product_id: productId,
      collection_id: collectionId,
      sort_order: index,
    }));
    if (collectionLinks.length) {
      await supabaseAdmin('product_collections', {
        method: 'POST',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify(collectionLinks),
      });
    }

    return Response.json({ ok: true, id: productId });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to save product.';
    return Response.json({ error: message }, { status: /required|must|needs|Price|Slug/.test(message) ? 400 : 500 });
  }
}
