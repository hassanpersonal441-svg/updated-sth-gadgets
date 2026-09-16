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

const productSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  sku: z.string().nullable().optional(),
  description: z.string().optional().default(''),
  short_description: z.string().optional().default(''),
  specifications: z.array(specSchema).optional().default([]),
  key_features: z.array(keyFeatureSchema).optional().default([]),
  bundle_offers: z.array(bundleOfferSchema).optional().default([]),
  purchase_price: z.number().min(0).default(0),
  price: z.number().min(0),
  old_price: z.number().min(0).nullable().optional(),
  wholesale_price: z.number().min(0).nullable().optional(),
  category_id: z.string().uuid().nullable().optional(),
  stock_status: z.enum(['in_stock', 'out_of_stock', 'low_stock']).default('in_stock'),
  featured: z.boolean().default(false),
  best_seller: z.boolean().default(false),
  new_arrival: z.boolean().default(false),
  active: z.boolean().default(true),
  images: z.array(z.object({ image_url: z.string().url(), is_primary: z.boolean().default(false) })).optional().default([]),
});

// GET: list all products (admin sees inactive too)
export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const service = createServiceClient();
  const { data, error } = await service
    .from('products')
    .select('*, category:categories(*), product_images(*)')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ products: data });
}

// POST: create a product with its images
export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const parsed = productSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { images, ...productData } = parsed.data;

  const service = createServiceClient();

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

  const { data: product, error } = await service.from('products').insert(productData).select().single();
  if (error) {
    if (error.message.includes("Could not find the 'bundle_offers'") || error.message.includes("bundle_offers")) {
      return NextResponse.json(
        {
          error:
            "Missing database column 'bundle_offers'. Please run this query in your Supabase SQL Editor: ALTER TABLE public.products ADD COLUMN IF NOT EXISTS bundle_offers jsonb DEFAULT '[]'::jsonb;",
        },
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

  (revalidateTag as any)('products');
  revalidatePath('/');
  revalidatePath('/products');

  return NextResponse.json({ product }, { status: 201 });
}
