import type { MetadataRoute } from 'next';

const BASE_URL = 'https://www.themenuqr.food';

/**
 * sitemap.xml — tells Google which pages to crawl.
 * Menu pages (/m/[slug]) are excluded because they:
 *   1. Require a signed ?t= token (would 404 without it)
 *   2. Are behind restaurant-specific access
 * Only public pages are indexed.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${BASE_URL}/faq`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
  ];
}
