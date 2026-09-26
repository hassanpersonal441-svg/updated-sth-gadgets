import type { MetadataRoute } from 'next';
import { getPublicClient } from '@/lib/supabase/server';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.sthgadgets.store';

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: base, changeFrequency: 'daily', priority: 1.0 },
    { url: `${base}/products`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${base}/about`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${base}/contact`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${base}/shipping-policy`, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${base}/return-policy`, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${base}/privacy-policy`, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${base}/terms`, changeFrequency: 'monthly', priority: 0.3 },
  ];

  let productRoutes: MetadataRoute.Sitemap = [];
  let categoryRoutes: MetadataRoute.Sitemap = [];

  try {
    const supabase = getPublicClient();
    const { data: products } = await supabase
      .from('products')
      .select('slug, updated_at')
      .eq('active', true);
    const { data: categories } = await supabase
      .from('categories')
      .select('slug')
      .eq('active', true);

    if (products && Array.isArray(products)) {
      productRoutes = products.map((p: { slug: string; updated_at?: string }) => ({
        url: `${base}/products/${p.slug}`,
        lastModified: p.updated_at ? new Date(p.updated_at) : new Date(),
        changeFrequency: 'weekly',
        priority: 0.8,
      }));
    }

    if (categories && Array.isArray(categories)) {
      categoryRoutes = categories.map((c: { slug: string }) => ({
        url: `${base}/products?category=${c.slug}`,
        changeFrequency: 'weekly',
        priority: 0.7,
      }));
    }
  } catch (err) {
    console.warn('Sitemap dynamic routes fetch warning:', err);
  }

  return [...staticRoutes, ...productRoutes, ...categoryRoutes];
}
