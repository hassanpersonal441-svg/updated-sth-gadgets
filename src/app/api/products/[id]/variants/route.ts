import { NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';
import { z } from 'zod';
import { requireAdmin } from '@/lib/admin-guard';
import { createServiceClient } from '@/lib/supabase/server';

const variantSchema = z.object({
  id: z.string().optional(),
  variant_type: z.string().default('color'),
  variant_name: z.string().min(1, 'Color name is required'),
  color_value: z.string().nullable().optional(),
  image_url: z.string().nullable().optional(),
  is_active: z.boolean().default(true),
  sort_order: z.number().int().default(0),
});

export async function GET(_req: Request, { params }: { params: any }) {
  const resolvedParams = await params;
  const id = resolvedParams?.id || params?.id;
  const service = createServiceClient();

  const { data, error } = await service
    .from('product_variants')
    .select('*')
    .eq('product_id', id)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) {
    if (error.message.includes('product_variants') || error.code === 'PGRST200') {
      return NextResponse.json({ variants: [] });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ variants: data || [] });
}

export async function POST(request: Request, { params }: { params: any }) {
  const resolvedParams = await params;
  const id = resolvedParams?.id || params?.id;
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = variantSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const service = createServiceClient();
  const { data, error } = await service
    .from('product_variants')
    .insert({
      product_id: id,
      variant_type: 'color',
      variant_name: parsed.data.variant_name,
      color_value: parsed.data.color_value || null,
      image_url: parsed.data.image_url || null,
      is_active: parsed.data.is_active ?? true,
      sort_order: parsed.data.sort_order ?? 0,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  (revalidateTag as any)('products');
  revalidatePath('/');
  revalidatePath('/products');

  return NextResponse.json({ variant: data }, { status: 201 });
}

export async function PUT(request: Request, { params }: { params: any }) {
  const resolvedParams = await params;
  const id = resolvedParams?.id || params?.id;
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => null);
  const listSchema = z.array(variantSchema);
  const parsed = listSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const service = createServiceClient();

  // Replace all variants for this product
  await service.from('product_variants').delete().eq('product_id', id);

  if (parsed.data.length > 0) {
    const rows = parsed.data.map((v, i) => ({
      product_id: id,
      variant_type: 'color',
      variant_name: v.variant_name,
      color_value: v.color_value || null,
      image_url: v.image_url || null,
      is_active: v.is_active ?? true,
      sort_order: v.sort_order ?? i,
    }));
    const { error: insErr } = await service.from('product_variants').insert(rows);
    if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });
  }

  const { data: updatedList } = await service
    .from('product_variants')
    .select('*')
    .eq('product_id', id)
    .order('sort_order', { ascending: true });

  (revalidateTag as any)('products');
  revalidatePath('/');
  revalidatePath('/products');

  return NextResponse.json({ variants: updatedList || [] });
}
