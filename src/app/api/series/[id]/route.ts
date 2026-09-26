import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/admin-guard';
import { revalidatePath, revalidateTag } from 'next/cache';

const schema = z.object({
  name: z.string().min(1).max(200).optional(), slug: z.string().min(1).optional(),
  category_id: z.string().uuid().nullable().optional(), brand: z.string().nullable().optional(),
  description: z.string().optional(), common_specs: z.array(z.object({ label: z.string(), value: z.string() })).optional(),
  common_features: z.array(z.object({ icon: z.string().optional(), title: z.string(), subtitle: z.string().optional() })).optional(),
  warranty: z.string().nullable().optional(), thumbnail_url: z.string().nullable().optional(),
  is_active: z.boolean().optional(), sort_order: z.number().int().optional(),
});
type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Ctx) {
  const { id } = await params;
  const db = createServiceClient();
  const { data: series, error } = await db.from('product_series').select('*, category:categories(*)').eq('id', id).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!series) return NextResponse.json({ error: 'Series not found' }, { status: 404 });
  const { data: models } = await db.from('products').select('*, product_images(*), product_variants(*)').eq('series_id', id).eq('product_type', 'series_model').order('sort_order', { ascending: true });
  return NextResponse.json({ series: { ...series, models: models || [] } });
}

export async function PATCH(request: Request, { params }: Ctx) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = schema.safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: body.error.issues[0]?.message || 'Invalid data' }, { status: 400 });
  const { id } = await params;
  const { data, error } = await createServiceClient().from('product_series').update(body.data).eq('id', id).select('*, category:categories(*)').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  revalidateTag('series', 'max'); revalidateTag('products', 'max'); revalidatePath('/'); revalidatePath(`/series/${data.slug}`);
  return NextResponse.json({ series: data });
}

export async function DELETE(_request: Request, { params }: Ctx) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const db = createServiceClient();
  // Preserve model product records and their order history; unlink them before removing the series.
  const { error: unlinkError } = await db.from('products').update({ series_id: null, product_type: 'product', model_number: null }).eq('series_id', id);
  if (unlinkError) return NextResponse.json({ error: unlinkError.message }, { status: 400 });
  const { error } = await db.from('product_series').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  revalidateTag('series', 'max'); revalidateTag('products', 'max'); revalidatePath('/');
  return NextResponse.json({ success: true });
}
