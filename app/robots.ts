import type { MetadataRoute } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://digitalmenu-inky-theta.vercel.app';

/**
 * robots.txt — controls which pages Google crawls.
 * - Allow: homepage and all public pages
 * - Disallow: dashboard, admin, and API routes (private)
 * - Disallow: /m/ (menu pages require signed tokens — Googlebot would get 404)
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/dashboard/',
          '/admin/',
          '/api/',
          '/m/', // menu pages need signed ?t= token — Googlebot can't access them
        ],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  };
}
