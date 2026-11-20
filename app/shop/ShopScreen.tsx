import type { Metadata } from 'next';
import SiteHeader from '../SiteHeader';
import { collectionPath, getCatalogProducts, productsInCollection, toShopCard, type CatalogCollection } from '../data/products';
import { collectionBySlug, collectionCopy } from '../lib/collections';
import { JsonLd } from '../lib/JsonLd';
import { SHOP_DESCRIPTION, SHOP_TITLE, collectionStructuredData, pageMetadata } from '../lib/seo';
import ShopCatalog from './ShopCatalog';

const validSorts = ['featured', 'newest', 'price-asc', 'price-desc', 'name'] as const;
type SortOption = (typeof validSorts)[number];

export function shopMetadata(collection?: string): Metadata {
  const copy = collection ? collectionBySlug(collection) : null;
  if (copy) {
    return pageMetadata({ title: copy.title, description: copy.description, path: collectionPath(copy.name) });
  }
  return pageMetadata({ title: SHOP_TITLE, description: SHOP_DESCRIPTION, path: '/shop' });
}

export async function ShopScreen({
  collection,
  query,
  sort,
  style,
}: {
  collection: CatalogCollection;
  query: string;
  sort: SortOption;
  style: 'tee' | null;
}) {
  const products = await getCatalogProducts();
  const visible = productsInCollection(products, collection);
  const copy = collection === 'All' ? null : collectionCopy.find((entry) => entry.name === collection) ?? null;
  const path = collectionPath(collection);
  const listName = copy?.name ?? 'Shop';
  const listDescription = copy?.description ?? SHOP_DESCRIPTION;
  return (
    <>
      <JsonLd data={collectionStructuredData({
        path,
        name: listName,
        description: listDescription,
        products: visible.map((product) => ({ slug: product.slug, name: product.name })),
      })} />
      <SiteHeader />
      <main className="shop-page">
        <section className="shop-intro shell">
          <p className="eyebrow"><span /> {copy?.eyebrow ?? 'The full collection'}</p>
          <div>
            <h1>{copy ? <>{copy.h1}<br /><em>{copy.h1Em}</em></> : <>Shop<br /><em>the line.</em></>}</h1>
            <p>{copy?.intro ?? 'Say it with your chest.'}</p>
          </div>
        </section>
        <ShopCatalog
          products={visible.map(toShopCard)}
          initialCollection={collection}
          initialQuery={query}
          initialSort={sort}
          initialStyle={style}
        />
      </main>
      <footer className="shop-footer"><div className="shell"><p className="wordmark wordmark--footer">BOTTOM’S <span>LINE</span></p><p>End of the line. For now.</p></div></footer>
    </>
  );
}

export function shopFilters(search: { q?: string; sort?: string; style?: string }) {
  return {
    query: search.q ?? '',
    sort: validSorts.find((sort) => sort === search.sort) ?? 'featured',
    style: search.style?.toLowerCase() === 'tee' ? 'tee' as const : null,
  };
}
