import { NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';
import { z } from 'zod';
import { requireAdmin } from '@/lib/admin-guard';
import { createServiceClient } from '@/lib/supabase/server';

const settingsSchema = z.object({
  business_name: z.string().min(1).optional(),
  logo_url: z.string().url().nullable().optional(),
  whatsapp_number: z.string().min(5).optional(),
  email: z.string().nullable().optional().or(z.literal('')),
  address: z.string().nullable().optional().or(z.literal('')),
  facebook: z.string().url().nullable().optional().or(z.literal('')),
  instagram: z.string().url().nullable().optional().or(z.literal('')),
  tiktok: z.string().url().nullable().optional().or(z.literal('')),
  business_greeting: z.string().optional(),
  order_message_template: z.string().optional(),
  currency: z.string().optional(),
  currency_symbol: z.string().optional(),
  prevent_negative_profit: z.boolean().optional(),
  delivery_charges: z.number().min(0).optional(),
  free_shipping_threshold: z.number().min(0).optional(),
  payment_method_title: z.string().optional(),
  courier_partners: z.string().optional(),
  dispatch_window: z.string().optional(),
  dispatch_note: z.string().optional(),
});

export async function GET() {
  const service = createServiceClient();
  const { data, error } = await service.from('settings').select('*').eq('id', 1).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ settings: data });
}

export async function PATCH(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const parsed = settingsSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const service = createServiceClient();
  const updatePayload: Record<string, any> = {
    ...parsed.data,
    updated_at: new Date().toISOString(),
  };

  let { data, error } = await service
    .from('settings')
    .update(updatePayload)
    .eq('id', 1)
    .select()
    .single();

  // If new columns haven't been added to the database yet via migration, retry without them
  if (error && error.message?.includes('column')) {
    const fallbackPayload = { ...updatePayload };
    delete fallbackPayload.delivery_charges;
    delete fallbackPayload.free_shipping_threshold;
    delete fallbackPayload.payment_method_title;
    delete fallbackPayload.courier_partners;
    delete fallbackPayload.dispatch_window;
    delete fallbackPayload.dispatch_note;

    const retry = await service
      .from('settings')
      .update(fallbackPayload)
      .eq('id', 1)
      .select()
      .single();

    if (!retry.error) {
      data = { ...retry.data, ...parsed.data };
      error = null;
    }
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  (revalidateTag as any)('settings');
  revalidatePath('/', 'layout');

  return NextResponse.json({ settings: data });
}
