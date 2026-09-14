import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceClient } from '@/lib/supabase/server';

const bodySchema = z.object({ product_id: z.string().uuid() });

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });

  const service = createServiceClient();
  await service.from('whatsapp_clicks').insert({ product_id: parsed.data.product_id });

  return NextResponse.json({ ok: true });
}
