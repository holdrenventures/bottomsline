import { cache } from 'react';
import { getSupabaseCatalogProducts } from './supabase-products';
import type { ProductCollection } from '../lib/collections';
import { storefrontImage } from '../lib/storefront-images';

export type { CatalogCollection, ProductCollection } from '../lib/collections';
export { catalogCollections, collectionBySlug, collectionCopy, collectionFromParam, collectionPath, collectionSlug } from '../lib/collections';

export type CatalogVariant = {
  id: string;
  sku: string;
  style: string;
  garment: string | null;
  size: string;
  price: number;
  inventoryQuantity: number | null;
  active: boolean;
};

// One row per colorway. Sellability and pricing are product + style + size;
// the colorway supplies the selected color, garment and mockup.
export type CatalogColor = {
  id: string;
  color: string;
  style: string | null;      // e.g. Tee, Tank
  garment: string | null;    // e.g. tultex202, tultex105
  mockupUrl: string | null;
  sortOrder: number;
  active: boolean;
};

export type CatalogProduct = {
  id: string;
  name: string;
  slug: string;
  price: number;
  currency?: string;
  editorialDescriptor: string;
  description: string;
  productAnnotation?: string | null;
  material?: string | null;
  fitNotes?: string | null;
  careInstructions?: string | null;
  shippingNote?: string | null;
  sizeGuideUrl?: string | null;
  collection: ProductCollection;
  collections?: ProductCollection[];
  updatedAt?: string | null;
  catalogImage: string | null;
  galleryImages?: Array<{url:string;alt:string}>;
  availableSizes: string[];
  variants?: CatalogVariant[];
  colors: CatalogColor[];
  active: boolean;
  draft: boolean;             // convenience: !active from Supabase
  featured: boolean;
  isNewDrop: boolean;
  art: string[];
  tone: 'coral' | 'cream' | 'charcoal' | 'red';
  isPlaceholder?: boolean;
};

const standardSizes = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'];

const hatColorways = [
  ['Black/ White', 'black-white'],
  ['Navy/ White', 'navy-white'],
  ['Heather/ Black', 'heather-black'],
  ['Red', 'red'],
  ['Pink', 'pink'],
] as const;

// Local preview of the two draft hats. Production rows come from the insert
// script, not from this list. Photos are the fixed 615 hats, with a note on
// the product page that the printed numerals are the customer's area code.
function areaCodeHat(input: {
  id: string;
  variantId: string;
  name: string;
  slug: string;
  editorialDescriptor: string;
  description: string;
  imageSlug: string;
  catalogFile?: string;
  gallery: string[];
  tone: CatalogProduct['tone'];
}): CatalogProduct {
  const base = `https://images.bottomslineclothing.com/hats/${input.imageSlug}`;
  return {
    id: input.id,
    name: input.name,
    slug: input.slug,
    price: 35,
    editorialDescriptor: input.editorialDescriptor,
    description: input.description,
    productAnnotation: 'The photo shows 615 as a sample. Your area code goes here.',
    material: 'Yupoong 6606 — polyester/foam front, mesh back.',
    fitNotes: 'Yupoong 6606 retro trucker. One size, adjustable snapback.',
    careInstructions: 'Spot clean only. Do not machine wash, bleach, or tumble dry. Air dry if needed.',
    collection: 'Pride',
    collections: ['Pride', 'Hats'],
    catalogImage: `${base}/${input.catalogFile ?? 'heather-black'}.webp`,
    galleryImages: input.gallery.map((file) => ({
      url: `${base}/${file}.webp`,
      alt: `${input.name}, sample numerals. Your area code is printed instead. ${file.replace(/-/g, ' ')} view.`,
    })),
    availableSizes: ['One Size'],
    variants: [{
      id: input.variantId,
      sku: input.slug.toUpperCase(),
      style: 'Hat',
      garment: 'yupoong6606',
      size: 'One Size',
      price: 35,
      inventoryQuantity: null,
      active: true,
    }],
    colors: hatColorways.map(([color, file], index) => ({
      id: `${input.id.slice(0, -2)}${String(index + 11).padStart(2, '0')}`,
      color,
      style: 'Hat',
      garment: 'yupoong6606',
      mockupUrl: `${base}/${file}.webp`,
      sortOrder: index,
      active: true,
    })),
    active: true,
    draft: false,
    featured: false,
    isNewDrop: false,
    art: ['YOUR', 'AREA', 'CODE'],
    tone: input.tone,
  };
}

// LOCAL FALLBACK CATALOG — used for development and previews until the Worker
// has Supabase credentials and live product rows. Never add secrets here.
// Placeholder records demonstrate how the shop behaves at catalog scale.
const mockProducts: CatalogProduct[] = [
  areaCodeHat({
    id: 'a1111111-1111-4111-8111-111111111101',
    variantId: 'a1111111-1111-4111-8111-111111111102',
    name: 'Your Area Code Rainbow Trucker Hat',
    slug: 'your-area-code-rainbow-trucker-hat',
    editorialDescriptor: 'Bring Your Own Digits',
    description: 'Your three digits, in the same rainbow block numerals as the 615 Pride hat. Enter the area code before it goes in the bag. Yupoong 6606 trucker, one size, mesh back.',
    imageSlug: '615-pride-trucker-hat',
    gallery: ['navy-white-right-front', 'navy-white-back', 'navy-white-right', 'black-white-right-front', 'heather-black-right-front', 'red-right-front', 'pink-right-front', 'heather-black-back'],
    tone: 'coral',
  }),
  areaCodeHat({
    id: 'a2222222-2222-4222-8222-222222222201',
    variantId: 'a2222222-2222-4222-8222-222222222202',
    name: 'Your Area Code Trans Pride Trucker Hat',
    slug: 'your-area-code-trans-pride-trucker-hat',
    editorialDescriptor: 'Trans Pride, Your Digits',
    description: 'Your three digits in trans pride stripes — light blue, pink, and white — same block numerals as the 615 Trans Pride hat. Enter the area code before it goes in the bag. Yupoong 6606 trucker, one size, mesh back.',
    imageSlug: '615-trans-pride-trucker-hat',
    catalogFile: 'navy-white',
    gallery: ['navy-white-back', 'heather-black-back', 'red-back', 'pink-back'],
    tone: 'cream',
  }),
  { id:'prod_mock_001', name:'Support Local Bottoms', slug:'support-local-bottoms', price:32, editorialDescriptor:'Community Outreach', description:'A public service announcement. Support locally.', collection:'Support Local Bottoms', catalogImage: storefrontImage('https://res.cloudinary.com/bihiyho3/image/upload/e_background_removal/v1787869598/ChatGPT_Image_Aug_27_2026_05_18_54_PM_1.png'), availableSizes:standardSizes, colors:[], active:true, draft:false, featured:true, isNewDrop:false, art:['SUPPORT','LOCAL','BOTTOMS'], tone:'coral' },
  { id:'prod_mock_002', name:'Cum Dump', slug:'cum-dump', price:32, editorialDescriptor:'Advanced Placement', description:'Product description pending.', collection:'Cruising', catalogImage:null, availableSizes:standardSizes, colors:[], active:true, draft:false, featured:true, isNewDrop:false, art:['CUM','DUMP'], tone:'cream' },
  { id:'prod_mock_003', name:'Buss-ee’s', slug:'buss-ees', price:34, editorialDescriptor:'Roadside Attraction', description:'Product description pending.', collection:'Parodies', catalogImage:null, availableSizes:standardSizes, colors:[], active:true, draft:false, featured:true, isNewDrop:false, art:['BUSS','EE’S'], tone:'charcoal' },
  { id:'prod_mock_004', name:'Spread Your Legs, It’s the Nashville Way', slug:'spread-your-legs-nashville', price:34, editorialDescriptor:'Southern Hospitality', description:'Product description pending.', collection:'Nashville', catalogImage:null, availableSizes:standardSizes, colors:[], active:true, draft:false, featured:true, isNewDrop:false, art:['SPREAD','YOUR','LEGS'], tone:'red' },
  { id:'prod_placeholder_005', name:'Catalog Placeholder 05', slug:'placeholder-05', price:32, editorialDescriptor:'Catalog Placeholder', description:'Replace with confirmed catalog copy.', collection:'Cruising', catalogImage:null, availableSizes:standardSizes, colors:[], active:true, draft:false, featured:false, isNewDrop:false, art:['FUTURE','SHIRT','05'], tone:'charcoal', isPlaceholder:true },
  { id:'prod_placeholder_006', name:'Catalog Placeholder 06', slug:'placeholder-06', price:32, editorialDescriptor:'Catalog Placeholder', description:'Replace with confirmed catalog copy.', collection:'Pride', catalogImage:null, availableSizes:standardSizes, colors:[], active:true, draft:false, featured:false, isNewDrop:false, art:['FUTURE','SHIRT','06'], tone:'cream', isPlaceholder:true },
  { id:'prod_placeholder_007', name:'Catalog Placeholder 07', slug:'placeholder-07', price:34, editorialDescriptor:'Catalog Placeholder', description:'Replace with confirmed catalog copy.', collection:'New Drops', catalogImage:null, availableSizes:standardSizes, colors:[], active:true, draft:false, featured:false, isNewDrop:true, art:['FUTURE','SHIRT','07'], tone:'coral', isPlaceholder:true },
  { id:'prod_placeholder_008', name:'Catalog Placeholder 08', slug:'placeholder-08', price:32, editorialDescriptor:'Catalog Placeholder', description:'Replace with confirmed catalog copy.', collection:'Parodies', catalogImage:null, availableSizes:standardSizes, colors:[], active:true, draft:false, featured:false, isNewDrop:false, art:['FUTURE','SHIRT','08'], tone:'red', isPlaceholder:true },
  { id:'prod_placeholder_009', name:'Catalog Placeholder 09', slug:'placeholder-09', price:32, editorialDescriptor:'Catalog Placeholder', description:'Replace with confirmed catalog copy.', collection:'Support Local Bottoms', catalogImage:null, availableSizes:standardSizes, colors:[], active:true, draft:false, featured:false, isNewDrop:false, art:['FUTURE','SHIRT','09'], tone:'cream', isPlaceholder:true },
  { id:'prod_placeholder_010', name:'Catalog Placeholder 10', slug:'placeholder-10', price:34, editorialDescriptor:'Catalog Placeholder', description:'Replace with confirmed catalog copy.', collection:'Nashville', catalogImage:null, availableSizes:standardSizes, colors:[], active:true, draft:false, featured:false, isNewDrop:false, art:['FUTURE','SHIRT','10'], tone:'charcoal', isPlaceholder:true },
  { id:'prod_placeholder_011', name:'Catalog Placeholder 11', slug:'placeholder-11', price:32, editorialDescriptor:'Catalog Placeholder', description:'Replace with confirmed catalog copy.', collection:'Pride', catalogImage:null, availableSizes:standardSizes, colors:[], active:true, draft:false, featured:false, isNewDrop:false, art:['FUTURE','SHIRT','11'], tone:'coral', isPlaceholder:true },
  { id:'prod_placeholder_012', name:'Catalog Placeholder 12', slug:'placeholder-12', price:34, editorialDescriptor:'Catalog Placeholder', description:'Replace with confirmed catalog copy.', collection:'New Drops', catalogImage:null, availableSizes:standardSizes, colors:[], active:true, draft:false, featured:false, isNewDrop:true, art:['FUTURE','SHIRT','12'], tone:'red', isPlaceholder:true },
];

// Data-access boundary: pages keep the same product contract whether their data
// came from Supabase or the local prototype catalog. Null means Supabase is not
// configured, while an empty array means it is configured but has no live
// products. Do not replace that intentional empty state with prototype data.
export const getCatalogProducts = cache(async function getCatalogProducts() {
  const products = await getSupabaseCatalogProducts();
  return products === null ? mockProducts : products;
});

export async function getProductBySlug(slug: string) {
  const products = await getCatalogProducts();
  return products.find((product) => product.slug === slug) ?? null;
}

export function productPriceLabel(product: CatalogProduct) {
  const prices = (product.variants ?? [])
    .filter((variant) => variant.active && (variant.inventoryQuantity === null || variant.inventoryQuantity > 0))
    .map((variant) => variant.price);
  if (!prices.length) return `$${product.price.toFixed(2)}`;
  const minimum = Math.min(...prices);
  const maximum = Math.max(...prices);
  return minimum === maximum ? `$${minimum.toFixed(2)}` : `From $${minimum.toFixed(2)}`;
}

export type ShopCard = {
  id: string;
  name: string;
  slug: string;
  editorialDescriptor: string;
  price: number;
  priceLabel: string;
  collection: ProductCollection;
  collections: ProductCollection[];
  catalogImage: string | null;
  teeImage: string | null;
  art: string[];
  tone: CatalogProduct['tone'];
  featured: boolean;
  isNewDrop: boolean;
  isPlaceholder?: boolean;
  styles: string[];
};

function shopStyles(product: CatalogProduct) {
  const styles = product.variants?.length
    ? product.variants
      .filter((variant) => variant.active && (variant.inventoryQuantity === null || variant.inventoryQuantity > 0))
      .map((variant) => variant.style)
    : product.colors.filter((color) => color.active).map((color) => color.style?.trim() || 'Tee');
  return [...new Set(styles.filter(Boolean))];
}

// The shop grid only needs one thumbnail (plus a tee photo when ?style=tee is on).
// Colorways, variants, and galleries stay on the product page.
export function toShopCard(product: CatalogProduct): ShopCard {
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    editorialDescriptor: product.editorialDescriptor,
    price: product.price,
    priceLabel: productPriceLabel(product),
    collection: product.collection,
    collections: product.collections ?? [product.collection],
    catalogImage: product.catalogImage,
    teeImage: product.colors.find((color) => color.active && (color.style?.trim() || 'Tee').toLowerCase() === 'tee' && color.mockupUrl)?.mockupUrl ?? null,
    art: product.art,
    tone: product.tone,
    featured: product.featured,
    isNewDrop: product.isNewDrop,
    isPlaceholder: product.isPlaceholder,
    styles: shopStyles(product),
  };
}

export function productsInCollection<T extends { collection: string; collections?: string[] | null }>(products: T[], collection: string) {
  if (collection === 'All') return products;
  return products.filter((product) => (product.collections ?? [product.collection]).some((name) => name === collection));
}
