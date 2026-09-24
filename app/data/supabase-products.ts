import type { CatalogColor, CatalogProduct, CatalogVariant, ProductCollection } from './products';
import { trimMockup } from '../lib/cloudinary';

type SupabaseCollection = {
  name: string;
  slug: string;
  active: boolean;
};

type SupabaseColor = {
  id: string;
  color: string;
  style: string | null;
  garment: string | null;
  mockup_url: string | null;
  sort_order: number;
  active: boolean;
};

type SupabaseProduct = {
  id: string;
  name: string;
  slug: string;
  editorial_descriptor: string | null;
  description: string | null;
  product_annotation: string | null;
  material: string | null;
  fit_notes: string | null;
  care_instructions: string | null;
  shipping_note: string | null;
  size_guide_url: string | null;
  base_price_cents: number;
  currency: string;
  catalog_image: string | null;
  active: boolean;
  featured: boolean;
  new_drop: boolean;
  created_at: string;
  product_variants: Array<{
    id: string;
    sku: string;
    style: string;
    garment: string | null;
    size: string;
    active: boolean;
    inventory_quantity: number | null;
    price_cents: number;
  }>;
  product_collections: Array<{
    sort_order: number;
    collections: SupabaseCollection | SupabaseCollection[] | null;
  }>;
  product_colors: SupabaseColor[];
};

const supportedCollections: ProductCollection[] = [
  'Support Local Bottoms',
  'Cruising',
  'Parodies',
  'Nashville',
  'Pride',
  'New Drops',
];

// Preferred size order for display; unknown sizes append at the end alphabetically.
const sizeOrder = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL'];
function sizeRank(size: string) {
  const idx = sizeOrder.indexOf(size);
  return idx === -1 ? sizeOrder.length : idx;
}

function isProductCollection(value: string): value is ProductCollection {
  return supportedCollections.includes(value as ProductCollection);
}

function productCollections(product: SupabaseProduct): ProductCollection[] {
  const names = [...product.product_collections]
    .sort((a, b) => a.sort_order - b.sort_order)
    .flatMap((link) => Array.isArray(link.collections) ? link.collections : link.collections ? [link.collections] : [])
    .map((collection) => collection.name);

  const supported = names.filter(isProductCollection);
  if (product.new_drop && !supported.includes('New Drops')) supported.push('New Drops');
  return supported.length ? supported : ['Support Local Bottoms'];
}

function productArt(name: string) {
  const words = name.toUpperCase().replace(/[^A-Z0-9’'-]+/g, ' ').trim().split(/\s+/);
  return words.length > 1 ? words.slice(0, 3) : [name.toUpperCase()];
}

function normalizeProduct(product: SupabaseProduct, index: number): CatalogProduct {
  // A sellable SKU is product + style + size. Colorways stay separate so a
  // price can be reused across colors while the order still records color.
  const variants: CatalogVariant[] = [...product.product_variants]
    .sort((a, b) => a.style.localeCompare(b.style) || sizeRank(a.size) - sizeRank(b.size))
    .map((variant) => ({
      id: variant.id,
      sku: variant.sku,
      style: variant.style,
      garment: variant.garment,
      size: variant.size,
      price: variant.price_cents / 100,
      inventoryQuantity: variant.inventory_quantity,
      active: variant.active,
    }));

  const colors: CatalogColor[] = [...(product.product_colors ?? [])]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((color) => ({
      id: color.id,
      color: color.color,
      style: color.style,
      garment: color.garment,
      mockupUrl: trimMockup(color.mockup_url),
      sortOrder: color.sort_order,
      active: color.active,
    }));

  const collections = productCollections(product);
  const tones: CatalogProduct['tone'][] = ['coral', 'cream', 'charcoal', 'red'];

  // Fall back to the first colorway's mockup when catalog_image is empty.
  const firstColorMockup = colors.find((color) => color.active && color.mockupUrl)?.mockupUrl ?? null;
  const trimmedCatalog = trimMockup(product.catalog_image);

  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    price: product.base_price_cents / 100,
    editorialDescriptor: product.editorial_descriptor ?? 'Conversation Starter',
    description: product.description ?? '',
    productAnnotation: product.product_annotation,
    material: product.material,
    fitNotes: product.fit_notes,
    careInstructions: product.care_instructions,
    shippingNote: product.shipping_note,
    sizeGuideUrl: product.size_guide_url,
    collection: collections[0],
    collections,
    catalogImage: trimmedCatalog ?? firstColorMockup,
    availableSizes: Array.from(new Set(variants.map((variant) => variant.size))),
    variants,
    colors,
    active: product.active,
    draft: !product.active,
    featured: product.featured,
    isNewDrop: product.new_drop,
    art: productArt(product.name),
    tone: tones[index % tones.length],
  };
}

/**
 * Reads the private catalog from Supabase from server code only. The
 * sb_secret_* key belongs in Cloudflare's encrypted secrets, never NEXT_PUBLIC_*.
 * A missing configuration returns null so local previews keep using mock data.
 *
 * Public storefront reads include active products only. The Product Desk uses
 * its own authenticated endpoint so drafts remain editable without leaking
 * into the shop, homepage, or public product routes.
 */
export async function getSupabaseCatalogProducts(): Promise<CatalogProduct[] | null> {
  const supabaseUrl = process.env.SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!supabaseUrl || !secretKey) return null;

  const select = [
    'id', 'name', 'slug', 'editorial_descriptor', 'description',
    'product_annotation', 'material', 'fit_notes', 'care_instructions', 'shipping_note', 'size_guide_url',
    'base_price_cents', 'currency', 'catalog_image', 'active', 'featured', 'new_drop', 'created_at',
    'product_variants(id,sku,style,garment,size,active,inventory_quantity,price_cents)',
    'product_collections(sort_order,collections(name,slug,active))',
    'product_colors(id,color,style,garment,mockup_url,sort_order,active)',
  ].join(',');
  const endpoint = new URL('/rest/v1/products', supabaseUrl);
  endpoint.searchParams.set('select', select);
  endpoint.searchParams.set('active', 'eq.true');
  endpoint.searchParams.set('order', 'created_at.desc');

  const response = await fetch(endpoint, {
    headers: {
      apikey: secretKey,
      Authorization: `Bearer ${secretKey}`,
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
