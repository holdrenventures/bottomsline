export type ProductCollection = 'Support Local Bottoms' | 'Cruising' | 'Parodies' | 'Nashville' | 'Pride' | 'New Drops';

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
  active: boolean;
  featured: boolean;
  isNewDrop: boolean;
  stripeProductId: string | null;
  stripePriceId: string | null;
  art: string[];
  tone: 'coral' | 'cream' | 'charcoal' | 'red';
  isPlaceholder?: boolean;
};

const standardSizes = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'];

// MOCK CATALOG PROVIDER — replace this array with the normalized result of a
// server-side Airtable read. Airtable tokens and Stripe secrets must never be
// added here or exposed to browser code. Placeholder records demonstrate scale.
const mockProducts: CatalogProduct[] = [
  { id:'prod_mock_001', name:'Support Local Bottoms', slug:'support-local-bottoms', price:32, editorialDescriptor:'Community Outreach', description:'A public service announcement. Support locally.', collection:'Support Local Bottoms', catalogImage:'https://res.cloudinary.com/bihiyho3/image/upload/e_background_removal/v1787869598/ChatGPT_Image_Aug_27_2026_05_18_54_PM_1.png', availableSizes:standardSizes, active:true, featured:true, isNewDrop:false, stripeProductId:null, stripePriceId:null, art:['SUPPORT','LOCAL','BOTTOMS'], tone:'coral' },
  { id:'prod_mock_002', name:'Cum Dump', slug:'cum-dump', price:32, editorialDescriptor:'Advanced Placement', description:'Product description pending.', collection:'Cruising', catalogImage:null, availableSizes:standardSizes, active:true, featured:true, isNewDrop:false, stripeProductId:null, stripePriceId:null, art:['CUM','DUMP'], tone:'cream' },
  { id:'prod_mock_003', name:'Buss-ee’s', slug:'buss-ees', price:34, editorialDescriptor:'Roadside Attraction', description:'Product description pending.', collection:'Parodies', catalogImage:null, availableSizes:standardSizes, active:true, featured:true, isNewDrop:false, stripeProductId:null, stripePriceId:null, art:['BUSS','EE’S'], tone:'charcoal' },
  { id:'prod_mock_004', name:'Spread Your Legs, It’s the Nashville Way', slug:'spread-your-legs-nashville', price:34, editorialDescriptor:'Southern Hospitality', description:'Product description pending.', collection:'Nashville', catalogImage:null, availableSizes:standardSizes, active:true, featured:true, isNewDrop:false, stripeProductId:null, stripePriceId:null, art:['SPREAD','YOUR','LEGS'], tone:'red' },
  { id:'prod_placeholder_005', name:'Catalog Placeholder 05', slug:'placeholder-05', price:32, editorialDescriptor:'Catalog Placeholder', description:'Replace with confirmed catalog copy.', collection:'Cruising', catalogImage:null, availableSizes:standardSizes, active:true, featured:false, isNewDrop:false, stripeProductId:null, stripePriceId:null, art:['FUTURE','SHIRT','05'], tone:'charcoal', isPlaceholder:true },
  { id:'prod_placeholder_006', name:'Catalog Placeholder 06', slug:'placeholder-06', price:32, editorialDescriptor:'Catalog Placeholder', description:'Replace with confirmed catalog copy.', collection:'Pride', catalogImage:null, availableSizes:standardSizes, active:true, featured:false, isNewDrop:false, stripeProductId:null, stripePriceId:null, art:['FUTURE','SHIRT','06'], tone:'cream', isPlaceholder:true },
  { id:'prod_placeholder_007', name:'Catalog Placeholder 07', slug:'placeholder-07', price:34, editorialDescriptor:'Catalog Placeholder', description:'Replace with confirmed catalog copy.', collection:'New Drops', catalogImage:null, availableSizes:standardSizes, active:true, featured:false, isNewDrop:true, stripeProductId:null, stripePriceId:null, art:['FUTURE','SHIRT','07'], tone:'coral', isPlaceholder:true },
  { id:'prod_placeholder_008', name:'Catalog Placeholder 08', slug:'placeholder-08', price:32, editorialDescriptor:'Catalog Placeholder', description:'Replace with confirmed catalog copy.', collection:'Parodies', catalogImage:null, availableSizes:standardSizes, active:true, featured:false, isNewDrop:false, stripeProductId:null, stripePriceId:null, art:['FUTURE','SHIRT','08'], tone:'red', isPlaceholder:true },
  { id:'prod_placeholder_009', name:'Catalog Placeholder 09', slug:'placeholder-09', price:32, editorialDescriptor:'Catalog Placeholder', description:'Replace with confirmed catalog copy.', collection:'Support Local Bottoms', catalogImage:null, availableSizes:standardSizes, active:true, featured:false, isNewDrop:false, stripeProductId:null, stripePriceId:null, art:['FUTURE','SHIRT','09'], tone:'cream', isPlaceholder:true },
  { id:'prod_placeholder_010', name:'Catalog Placeholder 10', slug:'placeholder-10', price:34, editorialDescriptor:'Catalog Placeholder', description:'Replace with confirmed catalog copy.', collection:'Nashville', catalogImage:null, availableSizes:standardSizes, active:true, featured:false, isNewDrop:false, stripeProductId:null, stripePriceId:null, art:['FUTURE','SHIRT','10'], tone:'charcoal', isPlaceholder:true },
  { id:'prod_placeholder_011', name:'Catalog Placeholder 11', slug:'placeholder-11', price:32, editorialDescriptor:'Catalog Placeholder', description:'Replace with confirmed catalog copy.', collection:'Pride', catalogImage:null, availableSizes:standardSizes, active:true, featured:false, isNewDrop:false, stripeProductId:null, stripePriceId:null, art:['FUTURE','SHIRT','11'], tone:'coral', isPlaceholder:true },
  { id:'prod_placeholder_012', name:'Catalog Placeholder 12', slug:'placeholder-12', price:34, editorialDescriptor:'Catalog Placeholder', description:'Replace with confirmed catalog copy.', collection:'New Drops', catalogImage:null, availableSizes:standardSizes, active:true, featured:false, isNewDrop:true, stripeProductId:null, stripePriceId:null, art:['FUTURE','SHIRT','12'], tone:'red', isPlaceholder:true },
];

// Data-access boundary: a future Airtable adapter can replace these functions
// without changing the Shop or PDP component contracts.
export async function getCatalogProducts() {
  return mockProducts.filter((product) => product.active);
}

export async function getProductBySlug(slug: string) {
  return mockProducts.find((product) => product.active && product.slug === slug) ?? null;
}

export const catalogCollections = ['All', 'Support Local Bottoms', 'Cruising', 'Parodies', 'Nashville', 'Pride', 'New Drops'] as const;
