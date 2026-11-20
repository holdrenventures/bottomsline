type RelatedProduct = {
  slug: string;
  name: string;
  collection: string;
  collections?: string[] | null;
  active?: boolean;
  draft?: boolean;
  isPlaceholder?: boolean;
};

function membership(product: RelatedProduct) {
  return product.collections?.length ? product.collections : [product.collection];
}

// Same-collection products first, then the rest of the line, so a page always
// has somewhere else to go. Placeholders and drafts stay out.
export function relatedProducts<T extends RelatedProduct>(product: T, catalog: T[], limit = 4): T[] {
  const mine = new Set(membership(product));
  const ranked = catalog
    .filter((item) => item.slug !== product.slug && item.active !== false && !item.draft && !item.isPlaceholder)
    .map((item) => ({ item, score: membership(item).filter((name) => mine.has(name)).length }))
    .sort((a, b) => b.score - a.score || a.item.name.localeCompare(b.item.name));
  const same = ranked.filter((row) => row.score > 0).map((row) => row.item);
  const rest = ranked.filter((row) => row.score === 0).map((row) => row.item);
  return [...same, ...rest].slice(0, limit);
}
