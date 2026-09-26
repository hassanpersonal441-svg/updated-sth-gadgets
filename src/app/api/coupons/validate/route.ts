import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { evaluateCoupon } from '@/lib/utils';

const bodySchema = z.object({
  code: z.string().min(1).max(50),
  orderAmount: z.number().min(0),
  productId: z.string().uuid().optional(),
});

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ valid: false, reason: 'Invalid request' }, { status: 400 });
  }
  const { code, orderAmount, productId } = parsed.data;

  const supabase = await createClient();
  const { data: coupon } = await supabase
    .from('coupons')
    .select('*')
    .ilike('code', code)
    .maybeSingle();

  const result = evaluateCoupon(coupon as any, orderAmount);

  if (result.valid && coupon) {
    // Log usage with the service client (bypasses RLS — this is a trusted server-side write)
    const service = createServiceClient();
    await service.from('coupon_usage').insert({
      coupon_id: coupon.id,
      product_id: productId ?? null,
      order_amount: orderAmount,
      discount_amount: result.discountAmount,
    });
    await service
      .from('coupons')
      .update({ times_used: (coupon.times_used || 0) + 1 })
      .eq('id', coupon.id);
  }

  return NextResponse.json(result);
}
