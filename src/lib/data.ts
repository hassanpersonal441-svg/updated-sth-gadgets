import { getPublicClient } from '@/lib/supabase/server';
import type { Category, Product, Settings } from '@/types/database';
import { unstable_cache } from 'next/cache';
import { cache } from 'react';

// Public storefront product select — strictly excludes private financial columns:
// purchase_price, wholesale_price, profit_amount, profit_margin
const PRODUCT_SELECT =
  'id, name, slug, description, short_description, specifications, key_features, bundle_offers, price, old_price, discount, category_id, stock_status, featured, best_seller, new_arrival, active, created_at, updated_at, sku, category:categories(*), product_images(*)';

export const getAllActiveProducts = unstable_cache(
  async (): Promise<Product[]> => {
    const supabase = getPublicClient();
    const { data } = await supabase
      .from('products')
      .select(PRODUCT_SELECT)
      .eq('active', true)
      .order('created_at', { ascending: false });
    return (data as unknown as Product[]) || [];
  },
  ['all-active-products'],
  { revalidate: 60, tags: ['products'] }
);

export const getSettings = unstable_cache(
  async (): Promise<Settings | null> => {
    const supabase = getPublicClient();
    const { data } = await supabase.from('settings').select('*').eq('id', 1).maybeSingle();
    return data as Settings | null;
  },
  ['site-settings'],
  { revalidate: 300, tags: ['settings'] }
);

export const getActiveCategories = unstable_cache(
  async (): Promise<Category[]> => {
    const supabase = getPublicClient();
    const { data } = await supabase.from('categories').select('*').eq('active', true).order('name');
    return (data as Category[]) || [];
  },
  ['active-categories'],
  { revalidate: 120, tags: ['categories'] }
);

export const getFeaturedProducts = unstable_cache(
  async (limit = 8): Promise<Product[]> => {
    const supabase = getPublicClient();
    const { data } = await supabase
      .from('products')
      .select(PRODUCT_SELECT)
      .eq('active', true)
      .eq('featured', true)
      .order('created_at', { ascending: false })
      .limit(limit);
    return (data as unknown as Product[]) || [];
  },
  ['featured-products'],
  { revalidate: 60, tags: ['products'] }
);

export const getLatestProducts = unstable_cache(
  async (limit = 8): Promise<Product[]> => {
    const supabase = getPublicClient();
    const { data } = await supabase
      .from('products')
      .select(PRODUCT_SELECT)
      .eq('active', true)
      .order('created_at', { ascending: false })
      .limit(limit);
    return (data as unknown as Product[]) || [];
  },
  ['latest-products'],
  { revalidate: 60, tags: ['products'] }
);

export const getBestSellers = unstable_cache(
  async (limit = 8): Promise<Product[]> => {
    const supabase = getPublicClient();
    const { data } = await supabase
      .from('products')
      .select(PRODUCT_SELECT)
      .eq('active', true)
      .eq('best_seller', true)
      .order('created_at', { ascending: false })
      .limit(limit);
    return (data as unknown as Product[]) || [];
  },
  ['bestseller-products'],
  { revalidate: 60, tags: ['products'] }
);

export const getDiscountedProducts = unstable_cache(
  async (limit = 8): Promise<Product[]> => {
    const supabase = getPublicClient();
    const { data } = await supabase
      .from('products')
      .select(PRODUCT_SELECT)
      .eq('active', true)
      .gt('discount', 0)
      .order('discount', { ascending: false })
      .limit(limit);
    return (data as unknown as Product[]) || [];
  },
  ['discounted-products'],
  { revalidate: 60, tags: ['products'] }
);

export const getProductBySlug = cache(async (rawSlug: string): Promise<Product | null> => {
  const supabase = getPublicClient();
  const slug = decodeURIComponent(rawSlug).trim();

  // Try exact slug
  let { data } = await supabase
    .from('products')
    .select(PRODUCT_SELECT)
    .eq('slug', slug)
    .maybeSingle();

  // Try case-insensitive slug if not found
  if (!data) {
    const res = await supabase
      .from('products')
      .select(PRODUCT_SELECT)
      .ilike('slug', slug)
      .maybeSingle();
    data = res.data;
  }

  // Fallback to id if slug is a valid ID
  if (!data) {
    const res = await supabase
      .from('products')
      .select(PRODUCT_SELECT)
      .eq('id', slug)
      .maybeSingle();
    data = res.data;
  }

  return data as unknown as Product | null;
});

export interface ProductFilters {
  q?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: 'newest' | 'price_asc' | 'price_desc' | 'discount';
}

export async function getFilteredProducts(filters: ProductFilters): Promise<Product[]> {
  const cacheKey = JSON.stringify(filters);
  return unstable_cache(
    async () => {
      const supabase = getPublicClient();
      let query = supabase.from('products').select(PRODUCT_SELECT).eq('active', true);

      if (filters.q) {
        query = query.ilike('name', `%${filters.q}%`);
      }
      if (filters.category) {
        const categories = await getActiveCategories();
        const cat = categories.find((c) => c.slug === filters.category);
        if (cat) {
          query = query.eq('category_id', cat.id);
        } else {
          const { data: dbCat } = (await supabase.from('categories').select('id').eq('slug', filters.category).maybeSingle()) as { data: { id: string } | null };
          if (dbCat?.id) query = query.eq('category_id', dbCat.id);
        }
      }
      if (filters.minPrice != null) query = query.gte('price', filters.minPrice);
      if (filters.maxPrice != null) query = query.lte('price', filters.maxPrice);

      switch (filters.sort) {
        case 'price_asc':
          query = query.order('price', { ascending: true });
          break;
        case 'price_desc':
          query = query.order('price', { ascending: false });
          break;
        case 'discount':
          query = query.order('discount', { ascending: false });
          break;
        default:
          query = query.order('created_at', { ascending: false });
      }

      const { data } = await query;
      return (data as unknown as Product[]) || [];
    },
    ['filtered-products', cacheKey],
    { revalidate: 60, tags: ['products'] }
  )();
}
