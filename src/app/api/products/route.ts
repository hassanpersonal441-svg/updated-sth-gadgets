import { NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';
import { z } from 'zod';
import { requireAdmin } from '@/lib/admin-guard';
import { createServiceClient } from '@/lib/supabase/server';
import { slugify } from '@/lib/utils';

const specSchema = z.object({ label: z.string(), value: z.string() });
const keyFeatureSchema = z.object({
  icon: z.string().optional(),
  title: z.string(),
  subtitle: z.string().optional(),
});
const bundleOfferItemSchema = z.object({
  name: z.string(),
  detail: z.string().optional(),
});
const bundleOfferSchema = z.object({
  id: z.string().optional(),
  title: z.string(),
  badge_text: z.string().optional(),
  bundle_price: z.number().min(0),
  original_price: z.number().min(0).optional(),
  items: z.array(bundleOfferItemSchema).optional().default([]),
});

const colorVariantSchema = z.object({
  id: z.string().optional(),
  variant_type: z.string().default('color'),
  variant_name: z.string().min(1),
  color_value: z.string().nullable().optional(),
  image_url: z.string().nullable().optional(),
  is_active: z.boolean().default(true),
  sort_order: z.number().int().default(0),
});

const productSchema = z.object({
  name: z.string().min(1),
  product_type: z.enum(['product', 'series_model']).optional(),
  series_id: z.string().uuid().nullable().optional(),
  model_number: z.string().nullable().optional(),
  slug: z.string().min(1),
  sku: z.string().nullable().optional(),
  description: z.string().optional().default(''),
  short_description: z.string().optional().default(''),
  specifications: z.array(specSchema).optional().default([]),
  key_features: z.array(keyFeatureSchema).optional().default([]),
  bundle_offers: z.array(bundleOfferSchema).optional().default([]),
  color_variants: z.array(colorVariantSchema).optional().default([]),
  purchase_price: z.number().min(0).default(0),
  price: z.number().min(0),
  old_price: z.number().min(0).nullable().optional(),
  wholesale_price: z.number().min(0).nullable().optional(),
  category_id: z.string().uuid().nullable().optional(),
  sort_order: z.number().int().min(0).optional(),
  stock_status: z.enum(['in_stock', 'out_of_stock', 'low_stock']).default('in_stock'),
  featured: z.boolean().default(false),
  best_seller: z.boolean().default(false),
  new_arrival: z.boolean().default(false),
  free_delivery: z.boolean().default(false),
  active: z.boolean().default(true),
  images: z.array(z.object({ image_url: z.string().url(), is_primary: z.boolean().default(false) })).optional().default([]),
});

// GET: list products (public visitors get active products; admins get all)
export async function GET(request: Request) {
  const service = createServiceClient();
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q');
  const admin = await requireAdmin();

  const buildQuery = (includeVariants = true) => {
    const selectStr = includeVariants
      ? '*, category:categories(*), product_images(*), product_variants(*)'
      : '*, category:categories(*), product_images(*)';
    let query = service.from('products').select(selectStr);

    if (!admin) {
      query = query.eq('active', true);
    }

    if (q && q.trim()) {
      const term = q.trim();
      query = query.or(`name.ilike.%${term}%,description.ilike.%${term}%,short_description.ilike.%${term}%`);
    }

    return query
      .order('sort_order', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false })
      .limit(admin ? 1000 : 200);
  };

  let { data, error } = await buildQuery(true);

  // Fallback if product_variants table is not yet migrated in Supabase
  if (error && (error.message.includes('product_variants') || error.code === 'PGRST200')) {
    const fallbackRes = await buildQuery(false);
    data = fallbackRes.data;
    error = fallbackRes.error;
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ products: data || [] });
}

// POST: create a product with its images
export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const parsed = productSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { images, color_variants, ...productData } = parsed.data;
  
  // Only validate series_id if product_type is provided and is series_model
  if (productData.product_type === 'series_model' && !productData.series_id) {
    return NextResponse.json({ error: 'Choose a series for this model' }, { status: 400 });
  }

  const service = createServiceClient();

  const { data: lastProduct } = await service
    .from('products')
    .select('sort_order')
    .order('sort_order', { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();
  const nextSortOrder = (Number(lastProduct?.sort_order) || 0) + 1;

  // Check prevent_negative_profit setting
  const { data: settings } = await service
    .from('settings')
    .select('prevent_negative_profit')
    .eq('id', 1)
    .maybeSingle();

  if (settings?.prevent_negative_profit && (productData.purchase_price || 0) > productData.price) {
    return NextResponse.json(
      { error: 'Selling price cannot be lower than purchase price (Negative profit prevented by store settings).' },
      { status: 400 }
    );
  }

  // Validate category_id exists if provided
  if (productData.category_id) {
    const { data: catExists } = await service
      .from('categories')
      .select('id')
      .eq('id', productData.category_id)
      .maybeSingle();

    if (!catExists) {
      let fallbackCatId: string | null = null;
      if (productData.series_id) {
        const { data: s } = await service.from('product_series').select('category_id').eq('id', productData.series_id).maybeSingle();
        if (s?.category_id) {
          const { data: sCat } = await service.from('categories').select('id').eq('id', s.category_id).maybeSingle();
          if (sCat) fallbackCatId = s.category_id;
        }
      }
      productData.category_id = fallbackCatId;
    }
  }

  // Ensure unique slug automatically to prevent products_slug_key constraint violations
  const baseSlug = (productData.slug?.trim() || slugify(productData.name) || 'product').toLowerCase();
  let candidateSlug = baseSlug;
  let counter = 1;
  while (true) {
    const { data: existingSlug } = await service
      .from('products')
      .select('id')
      .eq('slug', candidateSlug)
      .maybeSingle();

    if (!existingSlug) break;
    counter++;
    candidateSlug = `${baseSlug}-${counter}`;
  }
  productData.slug = candidateSlug;

  // Remove fields that might not exist in database
  const { product_type, series_id, model_number, ...safeProductData } = productData;
  
  // Try to insert with all fields first
  let { data: product, error } = await service.from('products').insert({ ...productData, sort_order: nextSortOrder }).select().single();
  
  // If error due to missing columns, try without those columns
  if (error && (error.message.includes("Could not find the 'product_type'") || 
                error.message.includes("Could not find the 'series_id'") ||
                error.message.includes("Could not find the 'model_number'"))) {
    const { data: retryProduct, error: retryError } = await service.from('products').insert({ ...safeProductData, sort_order: nextSortOrder }).select().single();
    product = retryProduct;
    error = retryError;
  }
  
  if (error) {
    if (error.message.includes("products_slug_key") || (error.message.includes("unique constraint") && error.message.includes("slug"))) {
      return NextResponse.json(
        { error: `A product with the slug "${productData.slug}" already exists. Please choose a different title or slug.` },
        { status: 400 }
      );
    }
    if (error.message.includes("Could not find the 'bundle_offers'") || error.message.includes("bundle_offers")) {
      return NextResponse.json(
        {
          error:
            "Missing database column 'bundle_offers'. Please run this query in your Supabase SQL Editor: ALTER TABLE public.products ADD COLUMN IF NOT EXISTS bundle_offers jsonb DEFAULT '[]'::jsonb;",
        },
        { status: 400 }
      );
    }
    if (error.message.includes("products_category_id_fkey") || error.message.includes("foreign key constraint")) {
      return NextResponse.json(
        { error: "The selected category does not exist. Please select a valid category or leave it blank." },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (images.length > 0) {
    const rows = images.map((img, i) => ({
      product_id: product.id,
      image_url: img.image_url,
      is_primary: img.is_primary || i === 0,
      sort_order: i,
    }));
    const { error: imgError } = await service.from('product_images').insert(rows);
    if (imgError) return NextResponse.json({ error: imgError.message }, { status: 500 });
  }

  if (color_variants && color_variants.length > 0) {
    const variantRows = color_variants.map((v, i) => ({
      product_id: product.id,
      variant_type: 'color',
      variant_name: v.variant_name,
      color_value: v.color_value || null,
      image_url: v.image_url || null,
      is_active: v.is_active ?? true,
      sort_order: v.sort_order ?? i,
    }));
    const { error: varError } = await service.from('product_variants').insert(variantRows);
    if (varError) {
      console.error('Error inserting color variants:', varError);
      if (varError.message.includes('product_variants') || varError.message.includes('does not exist')) {
        return NextResponse.json(
          {
            error:
              "Missing database table 'product_variants'. Please run the migration in your Supabase SQL Editor: supabase/migrations/20260922_product_color_variants.sql",
          },
          { status: 400 }
        );
      }
      return NextResponse.json({ error: varError.message }, { status: 500 });
    }
  }

  (revalidateTag as any)('products');
  (revalidateTag as any)('all-active-products');
  (revalidateTag as any)('series');
  revalidatePath('/');
  revalidatePath('/products');
  revalidatePath('/admin/products');

  return NextResponse.json({ product }, { status: 201 });
}
