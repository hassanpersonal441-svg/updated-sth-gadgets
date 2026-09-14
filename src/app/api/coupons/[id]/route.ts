import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/admin-guard';
import { createServiceClient } from '@/lib/supabase/server';

const couponUpdateSchema = z.object({
  code: z.string().min(3).max(50).transform((s) => s.toUpperCase()).optional(),
  discount_type: z.enum(['percentage', 'fixed']).optional(),
  discount_value: z.number().min(0).optional(),
  minimum_order: z.number().min(0).optional(),
  maximum_discount: z.number().min(0).nullable().optional(),
  expiry_date: z.string().nullable().optional(),
  usage_limit: z.number().int().min(1).nullable().optional(),
  active: z.boolean().optional(),
});

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const parsed = couponUpdateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const service = createServiceClient();
  const { data, error } = await service.from('coupons').update(parsed.data).eq('id', params.id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ coupon: data });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const service = createServiceClient();
  const { error } = await service.from('coupons').delete().eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
