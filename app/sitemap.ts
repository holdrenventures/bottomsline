import type { MetadataRoute } from 'next';
import { getCatalogProducts } from './data/products';

const SITE = 'https://bottomslineclothing.com';

// Every page a search engine should discover, weighted so that the storefront
// entry points and the DIY guide rank as primary pages.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const products = await getCatalogProducts();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE}/`, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE}/shop`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE}/cut-it-out`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${SITE}/bag`, lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
  ];

  const productRoutes: MetadataRoute.Sitemap = products.map((product) => ({
    url: `${SITE}/products/${product.slug}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  return [...staticRoutes, ...productRoutes];
}
