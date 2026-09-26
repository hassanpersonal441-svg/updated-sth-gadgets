import { NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';
import { z } from 'zod';
import { requireAdmin } from '@/lib/admin-guard';
import { createServiceClient } from '@/lib/supabase/server';

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

const productUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  product_type: z.enum(['product', 'series_model']).optional(),
  series_id: z.string().uuid().nullable().optional(),
  model_number: z.string().nullable().optional(),
  slug: z.string().min(1).optional(),
  sku: z.string().nullable().optional(),
  description: z.string().optional(),
  short_description: z.string().optional(),
  specifications: z.array(specSchema).optional(),
  key_features: z.array(keyFeatureSchema).optional(),
  bundle_offers: z.array(bundleOfferSchema).optional(),
  color_variants: z.array(colorVariantSchema).optional(),
  purchase_price: z.number().min(0).optional(),
  price: z.number().min(0).optional(),
  old_price: z.number().min(0).nullable().optional(),
  wholesale_price: z.number().min(0).nullable().optional(),
  category_id: z.string().uuid().nullable().optional(),
  sort_order: z.number().int().min(0).optional(),
  stock_status: z.enum(['in_stock', 'out_of_stock', 'low_stock']).optional(),
  featured: z.boolean().optional(),
  best_seller: z.boolean().optional(),
  new_arrival: z.boolean().optional(),
  free_delivery: z.boolean().optional(),
  active: z.boolean().optional(),
  images: z
    .array(z.object({ image_url: z.string().url(), is_primary: z.boolean().default(false) }))
    .optional(),
});

export async function GET(_req: Request, { params }: { params: any }) {
  const resolvedParams = await params;
  const id = resolvedParams?.id || params?.id;
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const service = createServiceClient();
  let { data, error } = await service
    .from('products')
    .select('*, category:categories(*), product_images(*), product_variants(*)')
    .eq('id', id)
    .maybeSingle();

  if (error && (error.message.includes('product_variants') || error.code === 'PGRST200')) {
    const fallback = await service
      .from('products')
      .select('*, category:categories(*), product_images(*)')
      .eq('id', id)
      .maybeSingle();
    data = fallback.data;
    error = fallback.error;
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ product: data });
}

export async function PATCH(request: Request, { params }: { params: any }) {
  const resolvedParams = await params;
  const id = resolvedParams?.id || params?.id;
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const parsed = productUpdateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { images, color_variants, ...productData } = parsed.data;
  const service = createServiceClient();

  if (Object.keys(productData).length > 0) {
    // Check prevent_negative_profit setting
    const { data: settings } = await service
      .from('settings')
      .select('prevent_negative_profit')
      .eq('id', 1)
      .maybeSingle();

    if (settings?.prevent_negative_profit) {
      const { data: currentProd } = await service
        .from('products')
        .select('price, purchase_price')
        .eq('id', id)
        .maybeSingle();

      const effectivePrice = productData.price !== undefined ? productData.price : (currentProd?.price || 0);
      const effectiveCost = productData.purchase_price !== undefined ? productData.purchase_price : (currentProd?.purchase_price || 0);

      if (effectiveCost > effectivePrice) {
        return NextResponse.json(
          { error: 'Selling price cannot be lower than purchase price (Negative profit prevented by store settings).' },
          { status: 400 }
        );
      }
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

    // If slug is being updated, check if it's already used by another product
    if (productData.slug) {
      const trimmedSlug = productData.slug.trim().toLowerCase();
      const { data: existingSlug } = await service
        .from('products')
        .select('id, name')
        .eq('slug', trimmedSlug)
        .neq('id', id)
        .maybeSingle();

      if (existingSlug) {
        return NextResponse.json(
          { error: `The slug "${trimmedSlug}" is already in use by product "${existingSlug.name}". Please choose a unique slug.` },
          { status: 400 }
        );
      }
      productData.slug = trimmedSlug;
    }

    // Remove fields that might not exist in database
    const { product_type, series_id, model_number, ...safeProductData } = productData;
    
    // Try to update with all fields first
    let error = await service.from('products').update(productData).eq('id', id).then(({ error: e }) => e);
    
    // If error due to missing columns, try without those columns
    if (error && (error.message.includes("Could not find the 'product_type'") || 
                  error.message.includes("Could not find the 'series_id'") ||
                  error.message.includes("Could not find the 'model_number'"))) {
      error = await service.from('products').update(safeProductData).eq('id', id).then(({ error: e }) => e);
    }
    
    if (error) {
      if (error.message.includes("products_slug_key") || (error.message.includes("unique constraint") && error.message.includes("slug"))) {
        return NextResponse.json(
          { error: `A product with this slug already exists. Please choose a different slug.` },
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
  }

  // Replace image set if provided
  if (images) {
    await service.from('product_images').delete().eq('product_id', id);
    if (images.length > 0) {
      const rows = images.map((img, i) => ({
        product_id: id,
        image_url: img.image_url,
        is_primary: img.is_primary || i === 0,
        sort_order: i,
      }));
      const { error: imgError } = await service.from('product_images').insert(rows);
      if (imgError) return NextResponse.json({ error: imgError.message }, { status: 500 });
    }
  }

  // Replace color variants if provided
  if (color_variants !== undefined) {
    await service.from('product_variants').delete().eq('product_id', id);
    if (color_variants.length > 0) {
      const variantRows = color_variants.map((v, i) => ({
        product_id: id,
        variant_type: 'color',
        variant_name: v.variant_name,
        color_value: v.color_value || null,
        image_url: v.image_url || null,
        is_active: v.is_active ?? true,
        sort_order: v.sort_order ?? i,
      }));
      const { error: varError } = await service.from('product_variants').insert(variantRows);
      if (varError) {
        console.error('Error updating color variants:', varError);
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
  }

  let { data: updated, error: fetchErr } = await service
    .from('products')
    .select('*, category:categories(*), product_images(*), product_variants(*)')
    .eq('id', id)
    .maybeSingle();

  if (fetchErr && (fetchErr.message.includes('product_variants') || fetchErr.code === 'PGRST200')) {
    const fallback = await service
      .from('products')
      .select('*, category:categories(*), product_images(*)')
      .eq('id', id)
      .maybeSingle();
    updated = fallback.data;
  }

  (revalidateTag as any)('products');
  if (updated?.slug) (revalidateTag as any)(`product-${updated.slug}`);
  (revalidateTag as any)('all-active-products');
  revalidatePath('/');
  revalidatePath('/products');
  revalidatePath('/admin/products');

  return NextResponse.json({ product: updated });
}

export async function DELETE(_req: Request, { params }: { params: any }) {
  const resolvedParams = await params;
  const id = resolvedParams?.id || params?.id;
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const service = createServiceClient();
  const { error } = await service.from('products').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  (revalidateTag as any)('products');
  (revalidateTag as any)('all-active-products');
  revalidatePath('/');
  revalidatePath('/products');
  revalidatePath('/admin/products');

  return NextResponse.json({ ok: true });
}
