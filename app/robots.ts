import type { MetadataRoute } from 'next';

// Tells search engines which paths they can crawl and where the sitemap lives.
// /admin/* is intentionally blocked — those routes are gated by the Worker but
// there is no reason for a crawler to look at them either.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: ['/admin', '/admin/', '/api/', '/api/*'] },
    ],
    sitemap: 'https://bottomslineclothing.com/sitemap.xml',
    host: 'https://bottomslineclothing.com',
  };
}
