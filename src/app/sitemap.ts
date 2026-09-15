import type { MetadataRoute } from 'next';
import { getPublicClient } from '@/lib/supabase/server';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const supabase = getPublicClient();

  const { data: products } = await supabase.from('products').select('slug, updated_at').eq('active', true);
  const { data: categories } = await supabase.from('categories').select('slug').eq('active', true);

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: base, changeFrequency: 'daily', priority: 1 },
    { url: `${base}/products`, changeFrequency: 'daily', priority: 0.9 },
  ];

  const productRoutes: MetadataRoute.Sitemap = ((products as any[]) || []).map((p: { slug: string; updated_at?: string }) => ({
    url: `${base}/products/${p.slug}`,
    lastModified: p.updated_at,
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  const categoryRoutes: MetadataRoute.Sitemap = ((categories as any[]) || []).map((c: { slug: string }) => ({
    url: `${base}/products?category=${c.slug}`,
    changeFrequency: 'weekly',
    priority: 0.6,
  }));

  return [...staticRoutes, ...productRoutes, ...categoryRoutes];
}
