import type { CatalogProduct, CatalogVariant, ProductCollection } from './products';

type SupabaseCollection = {
  name: string;
  slug: string;
  active: boolean;
};

type SupabaseProduct = {
  id: string;
  name: string;
  slug: string;
  editorial_descriptor: string | null;
  description: string | null;
  base_price_cents: number;
  currency: string;
  catalog_image: string | null;
  featured: boolean;
  new_drop: boolean;
  created_at: string;
  product_variants: Array<{
    id: string;
    size: string;
    active: boolean;
    inventory_quantity: number | null;
    stripe_product_id: string | null;
    stripe_price_id: string | null;
    price_cents: number;
  }>;
  product_collections: Array<{
    sort_order: number;
    collections: SupabaseCollection | SupabaseCollection[] | null;
  }>;
};

const supportedCollections: ProductCollection[] = [
  'Support Local Bottoms',
  'Cruising',
  'Parodies',
  'Nashville',
  'Pride',
  'New Drops',
];

function isProductCollection(value: string): value is ProductCollection {
  return supportedCollections.includes(value as ProductCollection);
}

function firstCollection(product: SupabaseProduct): ProductCollection {
  const names = [...product.product_collections]
    .sort((a, b) => a.sort_order - b.sort_order)
    .flatMap((link) => Array.isArray(link.collections) ? link.collections : link.collections ? [link.collections] : [])
    .filter((collection) => collection.active)
    .map((collection) => collection.name);

  const supported = names.find(isProductCollection);
  if (supported) return supported;
  return product.new_drop ? 'New Drops' : 'Support Local Bottoms';
}

function productArt(name: string) {
  const words = name.toUpperCase().replace(/[^A-Z0-9’'-]+/g, ' ').trim().split(/\s+/);
  return words.length > 1 ? words.slice(0, 3) : [name.toUpperCase()];
}

function normalizeProduct(product: SupabaseProduct, index: number): CatalogProduct {
  const variants: CatalogVariant[] = product.product_variants
    .filter((variant) => variant.active && variant.inventory_quantity !== 0)
    .map((variant) => ({
      id: variant.id,
      size: variant.size,
      price: variant.price_cents / 100,
      inventoryQuantity: variant.inventory_quantity,
      stripeProductId: variant.stripe_product_id,
      stripePriceId: variant.stripe_price_id,
    }));
  const checkoutVariant = variants[0];
  const tones: CatalogProduct['tone'][] = ['coral', 'cream', 'charcoal', 'red'];

  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    price: product.base_price_cents / 100,
    editorialDescriptor: product.editorial_descriptor ?? 'Conversation Starter',
    description: product.description ?? '',
    collection: firstCollection(product),
    catalogImage: product.catalog_image,
    availableSizes: variants.map((variant) => variant.size),
    variants,
    active: true,
    featured: product.featured,
    isNewDrop: product.new_drop,
    stripeProductId: checkoutVariant?.stripeProductId ?? null,
    stripePriceId: checkoutVariant?.stripePriceId ?? null,
    art: productArt(product.name),
    tone: tones[index % tones.length],
  };
}

/**
 * Reads the private catalog from Supabase from server code only. The new
 * sb_secret_* key belongs in Cloudflare's encrypted secrets, never NEXT_PUBLIC_*.
 * A missing configuration returns null so local previews keep using mock data.
 */
export async function getSupabaseCatalogProducts(): Promise<CatalogProduct[] | null> {
  const supabaseUrl = process.env.SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!supabaseUrl || !secretKey) return null;

  const select = [
    'id', 'name', 'slug', 'editorial_descriptor', 'description',
    'base_price_cents', 'currency', 'catalog_image', 'featured', 'new_drop', 'created_at',
    'product_variants(id,size,active,inventory_quantity,stripe_product_id,stripe_price_id,price_cents)',
    'product_collections(sort_order,collections(name,slug,active))',
  ].join(',');
  const endpoint = new URL('/rest/v1/products', supabaseUrl);
  endpoint.searchParams.set('select', select);
  endpoint.searchParams.set('active', 'eq.true');
  endpoint.searchParams.set('order', 'created_at.desc');

  const response = await fetch(endpoint, {
    headers: {
      apikey: secretKey,
      Accept: 'application/json',
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    const message = (await response.text()).slice(0, 500);
    throw new Error(`Supabase catalog request failed (${response.status}): ${message}`);
  }

  const products = await response.json() as SupabaseProduct[];
  return products.map(normalizeProduct);
}
