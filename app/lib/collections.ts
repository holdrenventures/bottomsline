export const catalogCollections = ['All', 'Support Local Bottoms', 'Cruising', 'Parodies', 'Nashville', 'Pride', 'Holiday', 'Hats', 'New Drops'] as const;

export type CatalogCollection = (typeof catalogCollections)[number];
export type ProductCollection = Exclude<CatalogCollection, 'All'>;

export function collectionSlug(collection: string) {
  return collection.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export function collectionFromParam(value?: string | null): CatalogCollection {
  if (!value) return 'All';
  const slug = collectionSlug(value);
  return catalogCollections.find((collection) => collectionSlug(collection) === slug) ?? 'All';
}

export type CollectionCopy = {
  name: ProductCollection;
  title: string;
  description: string;
  eyebrow: string;
  h1: string;
  h1Em: string;
  intro: string;
};

// Short intros are the visible line beside the collection H1. Adam reviews
// these before they ship; the titles and descriptions are the indexable copy.
export const collectionCopy: CollectionCopy[] = [
  {
    name: 'Support Local Bottoms',
    title: 'Support Local Bottoms — Queer Tees, Nashville',
    description: 'Community-minded gay apparel from Nashville. Queer tees for supporting local bottoms and the rest of the LGBTQ neighborhood. Skip the small talk.',
    eyebrow: 'Civic-minded, mostly',
    h1: 'Local',
    h1Em: 'bottoms.',
    intro: 'A public service. Mostly.',
  },
  {
    name: 'Cruising',
    title: 'Cruising Tees — Queer Apparel from Nashville',
    description: 'Cruising-collection tees for queer nights with no plan. Gay and LGBTQ apparel from Nashville, printed for people who skip the small talk.',
    eyebrow: 'No destination required',
    h1: 'No map',
    h1Em: 'required.',
    intro: 'No destination required.',
  },
  {
    name: 'Parodies',
    title: 'Parody Tees — Queer Pride Apparel, Nashville',
    description: 'Queer parody tees from Nashville. Gay pride jokes you can wear, legally filed under humor. LGBTQ apparel that would rather skip the small talk.',
    eyebrow: 'Legally, these are jokes',
    h1: 'Legally',
    h1Em: 'jokes.',
    intro: 'Familiar shapes. Worse intentions.',
  },
  {
    name: 'Nashville',
    title: 'Nashville Queer Apparel — Bottom’s Line',
    description: 'Queer and gay Nashville apparel with a drawl. LGBTQ pride tees for people who bless your whole heart and mean it. Skip the small talk.',
    eyebrow: 'Bless your whole heart',
    h1: 'Nashville',
    h1Em: 'proper.',
    intro: 'Southern hospitality. No small talk.',
  },
  {
    name: 'Pride',
    title: 'Pride Apparel — Queer & LGBTQ Tees, Nashville',
    description: 'Shop gay pride apparel from Nashville: queer LGBTQ tees and tanks that stay loud after June. Bottom’s Line Clothing. Skip the small talk.',
    eyebrow: 'Year-round behavior',
    h1: 'Pride',
    h1Em: 'year-round.',
    intro: 'Queer on purpose, not just in June.',
  },
  {
    name: 'Holiday',
    title: 'Holiday Sweatshirts — Queer Apparel, Nashville',
    description: 'Gay holiday sweatshirts and queer Christmas tees from Nashville. LGBTQ apparel for the party that doesn’t do small talk. Bottom’s Line.',
    eyebrow: 'Seasonal misbehavior',
    h1: 'Holiday',
    h1Em: 'misbehavior.',
    intro: 'Ugly-sweater energy, but make it gay.',
  },
  {
    name: 'Hats',
    title: 'Trucker Hats — Queer Apparel, Nashville',
    description: 'Gay pride trucker hats from Nashville. Queer LGBTQ caps for people who’d rather skip the small talk. One size, and it already has an opinion.',
    eyebrow: 'Brims with opinions',
    h1: 'Hats',
    h1Em: 'with opinions.',
    intro: 'One size. Already decided.',
  },
  {
    name: 'New Drops',
    title: 'New Queer Drops — LGBTQ Apparel, Nashville',
    description: 'New gay and queer drops from Nashville, before the group chat catches on. Fresh LGBTQ pride apparel from Bottom’s Line. Skip the small talk.',
    eyebrow: 'Freshly inappropriate',
    h1: 'New',
    h1Em: 'drops.',
    intro: 'Freshly inappropriate. You saw it here.',
  },
];

export function isHatStyle(style: string | null | undefined) {
  return /\bhats?\b/i.test(style ?? '');
}

export function collectionsForProduct(input: {
  names: readonly string[];
  newDrop?: boolean;
  styles?: readonly (string | null | undefined)[];
}): ProductCollection[] {
  const supported = input.names.filter(isProductCollection);
  if (input.newDrop && !supported.includes('New Drops')) supported.push('New Drops');
  if (input.styles?.some((style) => isHatStyle(style)) && !supported.includes('Hats')) supported.push('Hats');
  return supported.length ? supported : ['Support Local Bottoms'];
}

function isProductCollection(value: string): value is ProductCollection {
  return value !== 'All' && (catalogCollections as readonly string[]).includes(value);
}

export function collectionBySlug(slug: string) {
  const normalized = collectionSlug(slug);
  return collectionCopy.find((collection) => collectionSlug(collection.name) === normalized) ?? null;
}

export function collectionPath(collection: string) {
  return collection === 'All' ? '/shop' : `/shop/${collectionSlug(collection)}`;
}
