import type { MetadataRoute } from 'next';
import { collectionCopy, collectionSlug } from './lib/collections';
import { getCatalogProducts, productsInCollection } from './data/products';
import { canonicalUrl } from './lib/seo';
import { latestSitemapDate, sitemapDate } from './lib/sitemap-dates';

// Every page a search engine should discover, weighted so that the storefront
// entry points and the DIY guide rank as primary pages.
// lastModified is included only when the catalog has a real timestamp.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = await getCatalogProducts();
  const catalogUpdated = latestSitemapDate(products.map((product) => product.updatedAt));

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: canonicalUrl('/'), changeFrequency: 'weekly', priority: 1 },
    { url: canonicalUrl('/shop'), ...(catalogUpdated ? { lastModified: catalogUpdated } : {}), changeFrequency: 'daily', priority: 0.9 },
    { url: canonicalUrl('/cut-it-out'), changeFrequency: 'weekly', priority: 0.9 },
    { url: canonicalUrl('/custom-shirts'), changeFrequency: 'monthly', priority: 0.6 },
  ];

  const collectionRoutes: MetadataRoute.Sitemap = collectionCopy.map((collection) => {
    const members = productsInCollection(products, collection.name);
    const lastModified = latestSitemapDate(members.map((product) => product.updatedAt));
    return {
      url: canonicalUrl(`/shop/${collectionSlug(collection.name)}`),
      ...(lastModified ? { lastModified } : {}),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    };
  });

  const productRoutes: MetadataRoute.Sitemap = products.map((product) => {
    const lastModified = sitemapDate(product.updatedAt);
    return {
      url: canonicalUrl(`/products/${product.slug}`),
      ...(lastModified ? { lastModified } : {}),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    };
  });

  return [...staticRoutes, ...collectionRoutes, ...productRoutes];
}
