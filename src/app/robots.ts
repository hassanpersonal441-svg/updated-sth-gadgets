import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.sthgadgets.store';
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin',
          '/admin/',
          '/admin-sth-gadgets',
          '/admin/*',
          '/api/admin/*',
          '/cart',
          '/checkout',
          '/login',
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
