import { getSupabaseCatalogProducts } from './supabase-products';
import { trimMockup } from '../lib/cloudinary';

export type ProductCollection = 'Support Local Bottoms' | 'Cruising' | 'Parodies' | 'Nashville' | 'Pride' | 'New Drops';

export type CatalogVariant = {
  id: string;
  sku: string;
  style: string;
  garment: string | null;
  size: string;
  price: number;
  inventoryQuantity: number | null;
  stripeProductId: string | null;
  stripePriceId: string | null;
  active: boolean;
};

// One row per colorway. Sellability and pricing are product + style + size;
// the colorway supplies the selected color, garment and mockup.
export type CatalogColor = {
  id: string;
  color: string;
  style: string | null;      // e.g. Tee, Tank
  garment: string | null;    // e.g. tultex202, tultex105
  mockupUrl: string | null;  // Cloudinary URL, kept as-is
  sortOrder: number;
  active: boolean;
};

export type CatalogProduct = {
  id: string;
  name: string;
  slug: string;
  price: number;
  editorialDescriptor: string;
  description: string;
  collection: ProductCollection;
  catalogImage: string | null;
  availableSizes: string[];
  variants?: CatalogVariant[];
  colors: CatalogColor[];
  active: boolean;
  draft: boolean;             // convenience: !active from Supabase
  featured: boolean;
  isNewDrop: boolean;
  stripeProductId: string | null;
  stripePriceId: string | null;
  art: string[];
  tone: 'coral' | 'cream' | 'charcoal' | 'red';
  isPlaceholder?: boolean;
};

const standardSizes = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'];

// LOCAL FALLBACK CATALOG — used for development and previews until the Worker
// has Supabase credentials and live product rows. Never add secrets here.
// Placeholder records demonstrate how the shop behaves at catalog scale.
const mockProducts: CatalogProduct[] = [
  { id:'prod_mock_001', name:'Support Local Bottoms', slug:'support-local-bottoms', price:32, editorialDescriptor:'Community Outreach', description:'A public service announcement. Support locally.', collection:'Support Local Bottoms', catalogImage: trimMockup('https://res.cloudinary.com/bihiyho3/image/upload/e_background_removal/v1787869598/ChatGPT_Image_Aug_27_2026_05_18_54_PM_1.png'), availableSizes:standardSizes, colors:[], active:true, draft:false, featured:true, isNewDrop:false, stripeProductId:null, stripePriceId:null, art:['SUPPORT','LOCAL','BOTTOMS'], tone:'coral' },
  { id:'prod_mock_002', name:'Cum Dump', slug:'cum-dump', price:32, editorialDescriptor:'Advanced Placement', description:'Product description pending.', collection:'Cruising', catalogImage:null, availableSizes:standardSizes, colors:[], active:true, draft:false, featured:true, isNewDrop:false, stripeProductId:null, stripePriceId:null, art:['CUM','DUMP'], tone:'cream' },
  { id:'prod_mock_003', name:'Buss-ee’s', slug:'buss-ees', price:34, editorialDescriptor:'Roadside Attraction', description:'Product description pending.', collection:'Parodies', catalogImage:null, availableSizes:standardSizes, colors:[], active:true, draft:false, featured:true, isNewDrop:false, stripeProductId:null, stripePriceId:null, art:['BUSS','EE’S'], tone:'charcoal' },
  { id:'prod_mock_004', name:'Spread Your Legs, It’s the Nashville Way', slug:'spread-your-legs-nashville', price:34, editorialDescriptor:'Southern Hospitality', description:'Product description pending.', collection:'Nashville', catalogImage:null, availableSizes:standardSizes, colors:[], active:true, draft:false, featured:true, isNewDrop:false, stripeProductId:null, stripePriceId:null, art:['SPREAD','YOUR','LEGS'], tone:'red' },
  { id:'prod_placeholder_005', name:'Catalog Placeholder 05', slug:'placeholder-05', price:32, editorialDescriptor:'Catalog Placeholder', description:'Replace with confirmed catalog copy.', collection:'Cruising', catalogImage:null, availableSizes:standardSizes, colors:[], active:true, draft:false, featured:false, isNewDrop:false, stripeProductId:null, stripePriceId:null, art:['FUTURE','SHIRT','05'], tone:'charcoal', isPlaceholder:true },
  { id:'prod_placeholder_006', name:'Catalog Placeholder 06', slug:'placeholder-06', price:32, editorialDescriptor:'Catalog Placeholder', description:'Replace with confirmed catalog copy.', collection:'Pride', catalogImage:null, availableSizes:standardSizes, colors:[], active:true, draft:false, featured:false, isNewDrop:false, stripeProductId:null, stripePriceId:null, art:['FUTURE','SHIRT','06'], tone:'cream', isPlaceholder:true },
  { id:'prod_placeholder_007', name:'Catalog Placeholder 07', slug:'placeholder-07', price:34, editorialDescriptor:'Catalog Placeholder', description:'Replace with confirmed catalog copy.', collection:'New Drops', catalogImage:null, availableSizes:standardSizes, colors:[], active:true, draft:false, featured:false, isNewDrop:true, stripeProductId:null, stripePriceId:null, art:['FUTURE','SHIRT','07'], tone:'coral', isPlaceholder:true },
  { id:'prod_placeholder_008', name:'Catalog Placeholder 08', slug:'placeholder-08', price:32, editorialDescriptor:'Catalog Placeholder', description:'Replace with confirmed catalog copy.', collection:'Parodies', catalogImage:null, availableSizes:standardSizes, colors:[], active:true, draft:false, featured:false, isNewDrop:false, stripeProductId:null, stripePriceId:null, art:['FUTURE','SHIRT','08'], tone:'red', isPlaceholder:true },
  { id:'prod_placeholder_009', name:'Catalog Placeholder 09', slug:'placeholder-09', price:32, editorialDescriptor:'Catalog Placeholder', description:'Replace with confirmed catalog copy.', collection:'Support Local Bottoms', catalogImage:null, availableSizes:standardSizes, colors:[], active:true, draft:false, featured:false, isNewDrop:false, stripeProductId:null, stripePriceId:null, art:['FUTURE','SHIRT','09'], tone:'cream', isPlaceholder:true },
  { id:'prod_placeholder_010', name:'Catalog Placeholder 10', slug:'placeholder-10', price:34, editorialDescriptor:'Catalog Placeholder', description:'Replace with confirmed catalog copy.', collection:'Nashville', catalogImage:null, availableSizes:standardSizes, colors:[], active:true, draft:false, featured:false, isNewDrop:false, stripeProductId:null, stripePriceId:null, art:['FUTURE','SHIRT','10'], tone:'charcoal', isPlaceholder:true },
  { id:'prod_placeholder_011', name:'Catalog Placeholder 11', slug:'placeholder-11', price:32, editorialDescriptor:'Catalog Placeholder', description:'Replace with confirmed catalog copy.', collection:'Pride', catalogImage:null, availableSizes:standardSizes, colors:[], active:true, draft:false, featured:false, isNewDrop:false, stripeProductId:null, stripePriceId:null, art:['FUTURE','SHIRT','11'], tone:'coral', isPlaceholder:true },
  { id:'prod_placeholder_012', name:'Catalog Placeholder 12', slug:'placeholder-12', price:34, editorialDescriptor:'Catalog Placeholder', description:'Replace with confirmed catalog copy.', collection:'New Drops', catalogImage:null, availableSizes:standardSizes, colors:[], active:true, draft:false, featured:false, isNewDrop:true, stripeProductId:null, stripePriceId:null, art:['FUTURE','SHIRT','12'], tone:'red', isPlaceholder:true },
];

// Data-access boundary: pages keep the same product contract whether their data
// came from Supabase or the local prototype catalog. Null means Supabase is not
// configured, while an empty array means it is configured but has no live
// products. Do not replace that intentional empty state with prototype data.
export async function getCatalogProducts() {
  const products = await getSupabaseCatalogProducts();
  return products === null ? mockProducts : products;
}

export async function getProductBySlug(slug: string) {
  const products = await getCatalogProducts();
  return products.find((product) => product.slug === slug) ?? null;
}

export const catalogCollections = ['All', 'Support Local Bottoms', 'Cruising', 'Parodies', 'Nashville', 'Pride', 'New Drops'] as const;
