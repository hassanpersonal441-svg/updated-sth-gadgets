import { getPublicClient } from '@/lib/supabase/server';
import type { Category, Product, ProductSeries, Settings } from '@/types/database';
import { unstable_cache } from 'next/cache';
import { cache } from 'react';

// Full product select with key_features, bundle_offers, sort_order, product_variants, and free_delivery
const PRODUCT_SELECT =
  'id, name, slug, description, short_description, specifications, key_features, bundle_offers, price, old_price, discount, category_id, sort_order, stock_status, featured, best_seller, new_arrival, free_delivery, active, created_at, updated_at, sku, category:categories(*), product_images(*), product_variants(*)';

// Standard fallback select in case newer columns have not yet been migrated in Supabase
const FALLBACK_SELECT =
  'id, name, slug, description, short_description, specifications, price, old_price, discount, category_id, stock_status, featured, best_seller, new_arrival, free_delivery, active, created_at, updated_at, category:categories(*), product_images(*)';

// Minimal fallback for basic compatibility
const MINIMAL_SELECT =
  'id, name, slug, description, short_description, specifications, price, old_price, discount, category_id, stock_status, featured, best_seller, new_arrival, free_delivery, active, created_at, updated_at, category:categories(*), product_images(*)';

export const getAllActiveProducts = unstable_cache(
  async (limit?: number): Promise<Product[]> => {
    const supabase = getPublicClient();
    const limitValue = limit || 100; // Default limit for performance
    try {
      const { data, error } = await supabase
        .from('products')
        .select(PRODUCT_SELECT)
        .eq('active', true)
        .order('sort_order', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false })
        .limit(limitValue);

      if (!error && data && data.length > 0) {
        return data as unknown as Product[];
      }

      if (error) {
        console.warn('getAllActiveProducts primary query notice:', error.message);
      }

      // Safe fallback
      const fallback = await supabase
        .from('products')
        .select(FALLBACK_SELECT)
        .eq('active', true)
        .order('created_at', { ascending: false })
        .limit(limitValue);

      return ((fallback.data as unknown as Product[]) || []);
    } catch {
      try {
        const fallback = await supabase
          .from('products')
          .select(FALLBACK_SELECT)
          .eq('active', true)
          .order('created_at', { ascending: false })
          .limit(limitValue);
        return ((fallback.data as unknown as Product[]) || []);
      } catch {
        try {
          // Minimal fallback for basic compatibility
          const minimal = await supabase
            .from('products')
            .select(MINIMAL_SELECT)
            .eq('active', true)
            .order('created_at', { ascending: false })
            .limit(limitValue);
          return ((minimal.data as unknown as Product[]) || []);
        } catch {
          return [];
        }
      }
    }
  },
  ['all-active-products'],
  { revalidate: 30, tags: ['products'] }
);

export const getSettings = unstable_cache(
  async (): Promise<Settings | null> => {
    const supabase = getPublicClient();
    try {
      const { data } = await supabase.from('settings').select('*').eq('id', 1).maybeSingle();
      if (!data) return null;
      let finalData = { ...(data as Record<string, any>) };
      if (finalData.auto_rotate_products === undefined || finalData.auto_rotate_products === null) {
        try {
          const { data: fileData } = await supabase.storage.from('site-assets').download('system_config.json');
          if (fileData) {
            const text = await fileData.text();
            const extra = JSON.parse(text);
            finalData = { ...finalData, ...extra };
          }
        } catch {
          // ignore
        }
      }
      return finalData as Settings | null;
    } catch {
      return null;
    }
  },
  ['site-settings'],
  { revalidate: 60, tags: ['settings'] }
);

export const getActiveCategories = unstable_cache(
  async (): Promise<Category[]> => {
    const supabase = getPublicClient();
    try {
      const { data } = await supabase.from('categories').select('*').eq('active', true).order('name');
      return (data as Category[]) || [];
    } catch {
      return [];
    }
  },
  ['active-categories'],
  { revalidate: 60, tags: ['categories'] }
);

export const getFeaturedProducts = unstable_cache(
  async (limit = 8): Promise<Product[]> => {
    const supabase = getPublicClient();
    try {
      const { data, error } = await supabase
        .from('products')
        .select(PRODUCT_SELECT)
        .eq('active', true)
        .eq('featured', true)
        .order('sort_order', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false })
        .limit(limit);

      if (!error && data) return data as unknown as Product[];

      const fallback = await supabase
        .from('products')
        .select(FALLBACK_SELECT)
        .eq('active', true)
        .eq('featured', true)
        .order('created_at', { ascending: false })
        .limit(limit);

      return (fallback.data as unknown as Product[]) || [];
    } catch {
      return [];
    }
  },
  ['featured-products'],
  { revalidate: 30, tags: ['products'] }
);

export const getLatestProducts = unstable_cache(
  async (limit = 8): Promise<Product[]> => {
    const supabase = getPublicClient();
    try {
      const { data, error } = await supabase
        .from('products')
        .select(PRODUCT_SELECT)
        .eq('active', true)
        .order('sort_order', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false })
        .limit(limit);

      if (!error && data) return data as unknown as Product[];

      const fallback = await supabase
        .from('products')
        .select(FALLBACK_SELECT)
        .eq('active', true)
        .order('created_at', { ascending: false })
        .limit(limit);

      return (fallback.data as unknown as Product[]) || [];
    } catch {
      return [];
    }
  },
  ['latest-products'],
  { revalidate: 30, tags: ['products'] }
);

export const getBestSellers = unstable_cache(
  async (limit = 8): Promise<Product[]> => {
    const supabase = getPublicClient();
    try {
      const { data, error } = await supabase
        .from('products')
        .select(PRODUCT_SELECT)
        .eq('active', true)
        .eq('best_seller', true)
        .order('sort_order', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false })
        .limit(limit);

      if (!error && data) return data as unknown as Product[];

      const fallback = await supabase
        .from('products')
        .select(FALLBACK_SELECT)
        .eq('active', true)
        .eq('best_seller', true)
        .order('created_at', { ascending: false })
        .limit(limit);

      return (fallback.data as unknown as Product[]) || [];
    } catch {
      return [];
    }
  },
  ['bestseller-products'],
  { revalidate: 30, tags: ['products'] }
);

export const getDiscountedProducts = unstable_cache(
  async (limit = 8): Promise<Product[]> => {
    const supabase = getPublicClient();
    try {
      const { data, error } = await supabase
        .from('products')
        .select(PRODUCT_SELECT)
        .eq('active', true)
        .gt('discount', 0)
        .order('sort_order', { ascending: true, nullsFirst: false })
        .order('discount', { ascending: false })
        .limit(limit);

      if (!error && data) return data as unknown as Product[];

      const fallback = await supabase
        .from('products')
        .select(FALLBACK_SELECT)
        .eq('active', true)
        .gt('discount', 0)
        .order('discount', { ascending: false })
        .limit(limit);

      return (fallback.data as unknown as Product[]) || [];
    } catch {
      return [];
    }
  },
  ['discounted-products'],
  { revalidate: 30, tags: ['products'] }
);

export const getProductBySlug = cache(async (rawSlug: string): Promise<Product | null> => {
  const supabase = getPublicClient();
  const slug = decodeURIComponent(rawSlug).trim();

  try {
    // Try exact slug
    let { data, error } = await supabase
      .from('products')
      .select(PRODUCT_SELECT)
      .eq('slug', slug)
      .maybeSingle();

    if (error) {
      const fallback = await supabase
        .from('products')
        .select(FALLBACK_SELECT)
        .eq('slug', slug)
        .maybeSingle();
      data = fallback.data;
    }

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
  } catch {
    return null;
  }
});

export interface ProductFilters {
  q?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: 'newest' | 'price_asc' | 'price_desc' | 'discount';
}

export const getAllActiveSeries = unstable_cache(async (): Promise<ProductSeries[]> => {
  const db = getPublicClient();
  try {
    const { data, error } = await (db as any).from('product_series').select('*, category:categories(*)').eq('is_active', true).order('sort_order');
    if (error || !data) return [];
    return await Promise.all(data.map(async (series: any) => {
      try {
        const { data: models } = await db.from('products').select('price').eq('series_id', series.id).eq('active', true).eq('product_type', 'series_model');
        return { ...series, model_count: models?.length || 0, min_price: models?.length ? Math.min(...models.map((m: any) => Number(m.price))) : 0 };
      } catch {
        // Fallback if product_type column doesn't exist
        const { data: models } = await db.from('products').select('price').eq('series_id', series.id).eq('active', true);
        return { ...series, model_count: models?.length || 0, min_price: models?.length ? Math.min(...models.map((m: any) => Number(m.price))) : 0 };
      }
    }));
  } catch (error) {
    // If product_series table doesn't exist, return empty array
    console.warn('getAllActiveSeries error (table may not exist):', error);
    return [];
  }
}, ['all-active-series'], { revalidate: 30, tags: ['series'] });

export const getSeriesBySlug = cache(async (slug: string): Promise<ProductSeries | null> => {
  const db = getPublicClient();
  try {
    const { data: series, error } = await (db as any).from('product_series').select('*, category:categories(*)').eq('slug', decodeURIComponent(slug)).maybeSingle();
    if (error || !series) return null;
    try {
      const { data: models } = await db.from('products').select('*, product_images(*), product_variants(*)').eq('series_id', series.id).eq('product_type', 'series_model').eq('active', true).order('sort_order');
      return { ...series, models: models || [], model_count: models?.length || 0, min_price: models?.length ? Math.min(...models.map((m: any) => Number(m.price))) : 0 } as ProductSeries;
    } catch {
      // Fallback if product_type column doesn't exist
      const { data: models } = await db.from('products').select('*, product_images(*), product_variants(*)').eq('series_id', series.id).eq('active', true).order('sort_order');
      return { ...series, models: models || [], model_count: models?.length || 0, min_price: models?.length ? Math.min(...models.map((m: any) => Number(m.price))) : 0 } as ProductSeries;
    }
  } catch (error) {
    // If product_series table doesn't exist, return null
    console.warn('getSeriesBySlug error (table may not exist):', error);
    return null;
  }
});

export async function getFilteredProducts(filters: ProductFilters): Promise<Product[]> {
  const cacheKey = JSON.stringify(filters);
  return unstable_cache(
    async () => {
      const supabase = getPublicClient();
      try {
        let query = supabase.from('products').select(PRODUCT_SELECT).eq('active', true);

        if (filters.q && filters.q.trim()) {
          const searchTerm = filters.q.trim();
          query = query.or(
            `name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,short_description.ilike.%${searchTerm}%`
          );
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
            query = query.order('sort_order', { ascending: true, nullsFirst: false }).order('created_at', { ascending: false });
        }

        const { data, error } = await query;
        if (!error && data) return data as unknown as Product[];

        // Fallback
        let fallbackQuery = supabase.from('products').select(FALLBACK_SELECT).eq('active', true);
        if (filters.q && filters.q.trim()) {
          const searchTerm = filters.q.trim();
          fallbackQuery = fallbackQuery.or(
            `name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,short_description.ilike.%${searchTerm}%`
          );
        }
        if (filters.category) {
          const categories = await getActiveCategories();
          const cat = categories.find((c) => c.slug === filters.category);
          if (cat) fallbackQuery = fallbackQuery.eq('category_id', cat.id);
        }
        if (filters.minPrice != null) fallbackQuery = fallbackQuery.gte('price', filters.minPrice);
        if (filters.maxPrice != null) fallbackQuery = fallbackQuery.lte('price', filters.maxPrice);
        fallbackQuery = fallbackQuery.order('created_at', { ascending: false });

        const fallbackData = await fallbackQuery;
        return (fallbackData.data as unknown as Product[]) || [];
      } catch {
        return [];
      }
    },
    ['filtered-products', cacheKey],
    { revalidate: 30, tags: ['products'] }
  )();
}
