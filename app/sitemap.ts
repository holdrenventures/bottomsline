import type { MetadataRoute } from 'next';
import { getCatalogProducts } from './data/products';
import { canonicalUrl } from './lib/seo';

// Every page a search engine should discover, weighted so that the storefront
// entry points and the DIY guide rank as primary pages.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const products = await getCatalogProducts();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: canonicalUrl('/'), lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: canonicalUrl('/shop'), lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: canonicalUrl('/cut-it-out'), lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: canonicalUrl('/custom-shirts'), lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
  ];

  const productRoutes: MetadataRoute.Sitemap = products.map((product) => ({
    url: canonicalUrl(`/products/${product.slug}`),
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  return [...staticRoutes, ...productRoutes];
}
