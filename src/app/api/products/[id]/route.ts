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

const productUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  sku: z.string().nullable().optional(),
  description: z.string().optional(),
  short_description: z.string().optional(),
  specifications: z.array(specSchema).optional(),
  key_features: z.array(keyFeatureSchema).optional(),
  bundle_offers: z.array(bundleOfferSchema).optional(),
  purchase_price: z.number().min(0).optional(),
  price: z.number().min(0).optional(),
  old_price: z.number().min(0).nullable().optional(),
  wholesale_price: z.number().min(0).nullable().optional(),
  category_id: z.string().uuid().nullable().optional(),
  stock_status: z.enum(['in_stock', 'out_of_stock', 'low_stock']).optional(),
  featured: z.boolean().optional(),
  best_seller: z.boolean().optional(),
  new_arrival: z.boolean().optional(),
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
  const { data, error } = await service
    .from('products')
    .select('*, category:categories(*), product_images(*)')
    .eq('id', id)
    .maybeSingle();

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

  const { images, ...productData } = parsed.data;
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

    const { error } = await service.from('products').update(productData).eq('id', id);
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

  const { data: updated } = await service
    .from('products')
    .select('*, category:categories(*), product_images(*)')
    .eq('id', id)
    .maybeSingle();

  (revalidateTag as any)('products');
  if (updated?.slug) (revalidateTag as any)(`product-${updated.slug}`);
  revalidatePath('/');
  revalidatePath('/products');

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
  revalidatePath('/');
  revalidatePath('/products');

  return NextResponse.json({ ok: true });
}
