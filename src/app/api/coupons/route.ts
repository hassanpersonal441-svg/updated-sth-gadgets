import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/admin-guard';
import { createServiceClient } from '@/lib/supabase/server';

const couponSchema = z.object({
  code: z.string().min(3).max(50).transform((s) => s.toUpperCase()),
  discount_type: z.enum(['percentage', 'fixed']),
  discount_value: z.number().min(0),
  minimum_order: z.number().min(0).default(0),
  maximum_discount: z.number().min(0).nullable().optional(),
  expiry_date: z.string().nullable().optional(),
  usage_limit: z.number().int().min(1).nullable().optional(),
  active: z.boolean().default(true),
});

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const service = createServiceClient();
  const { data, error } = await service.from('coupons').select('*').order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ coupons: data });
}

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const parsed = couponSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const service = createServiceClient();
  const { data, error } = await service.from('coupons').insert(parsed.data).select().single();
  if (error) {
    const message = error.code === '23505' ? 'A coupon with this code already exists' : error.message;
    return NextResponse.json({ error: message }, { status: 500 });
  }
  return NextResponse.json({ coupon: data }, { status: 201 });
}
