import type { MetadataRoute } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://digitalmenu-inky-theta.vercel.app';

/**
 * sitemap.xml — tells Google which pages to crawl.
 * Menu pages (/m/[slug]) are excluded because they:
 *   1. Require a signed ?t= token (would 404 without it)
 *   2. Are behind restaurant-specific access
 * Only the public landing page is indexed.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
  ];
}
