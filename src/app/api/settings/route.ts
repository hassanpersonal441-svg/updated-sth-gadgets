import { NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';
import { z } from 'zod';
import { requireAdmin } from '@/lib/admin-guard';
import { createServiceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const settingsSchema = z.object({
  business_name: z.string().min(1).optional(),
  logo_url: z.string().nullable().optional().or(z.literal('')),
  whatsapp_number: z.string().min(5).optional(),
  email: z.string().nullable().optional().or(z.literal('')),
  address: z.string().nullable().optional().or(z.literal('')),
  facebook: z.string().nullable().optional().or(z.literal('')),
  instagram: z.string().nullable().optional().or(z.literal('')),
  tiktok: z.string().nullable().optional().or(z.literal('')),
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
  bundle_tier1_threshold: z.number().min(0).optional(),
  bundle_tier1_percent: z.number().min(0).max(100).optional(),
  bundle_tier2_threshold: z.number().min(0).optional(),
  bundle_tier2_percent: z.number().min(0).max(100).optional(),
  brand_voice_enabled: z.boolean().optional(),
  online_payment_enabled: z.boolean().optional(),
  online_payment_free_delivery_threshold: z.number().min(0).optional(),
  payment_accounts: z.array(z.object({
    id: z.string().optional(),
    name: z.string().optional(),
    payment_method_name: z.string().optional(),
    account_name: z.string().optional(),
    account_number: z.string().optional(),
    bank_name: z.string().nullable().optional(),
    whatsapp_number: z.string().nullable().optional(),
    instructions: z.string().optional(),
    is_active: z.boolean().optional(),
    sort_order: z.number().optional(),
  })).optional(),
  payment_method_name: z.string().optional(),
  payment_account_name: z.string().nullable().optional(),
  payment_account_number: z.string().nullable().optional(),
  payment_instructions: z.string().nullable().optional(),
  payment_whatsapp_number: z.string().nullable().optional(),
  payment_verification_required: z.boolean().optional(),
  auto_rotate_products: z.boolean().optional(),
  auto_rotate_interval_minutes: z.number().int().min(1).optional(),
});

export async function GET() {
  const service = createServiceClient();
  const { data, error } = await service.from('settings').select('*').eq('id', 1).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  
  let mergedData = data ? { ...data } : null;
  // If auto_rotate columns do not exist in the database table yet, load from storage backup
  if (mergedData && (mergedData.auto_rotate_products === undefined || mergedData.auto_rotate_products === null)) {
    try {
      const { data: fileData } = await service.storage.from('site-assets').download('system_config.json');
      if (fileData) {
        const text = await fileData.text();
        const extra = JSON.parse(text);
        mergedData = { ...mergedData, ...extra };
      }
    } catch {
      // Ignore if file doesn't exist yet
    }
  }
  return NextResponse.json(
    { settings: mergedData },
    {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      },
    }
  );
}

export async function PATCH(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const parsed = settingsSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const service = createServiceClient();

  // Persist rotation config to storage backup so it immediately survives even without SQL migration
  if (parsed.data.auto_rotate_products !== undefined || parsed.data.auto_rotate_interval_minutes !== undefined) {
    try {
      const storagePayload = JSON.stringify({
        auto_rotate_products: parsed.data.auto_rotate_products ?? false,
        auto_rotate_interval_minutes: parsed.data.auto_rotate_interval_minutes ?? 60,
      });
      await service.storage.from('site-assets').upload('system_config.json', storagePayload, {
        contentType: 'application/json',
        upsert: true,
      });
    } catch (storageErr) {
      console.warn('Storage config backup notice:', storageErr);
    }
  }

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
    delete fallbackPayload.bundle_tier1_threshold;
    delete fallbackPayload.bundle_tier1_percent;
    delete fallbackPayload.bundle_tier2_threshold;
    delete fallbackPayload.bundle_tier2_percent;
    delete fallbackPayload.brand_voice_enabled;
    delete fallbackPayload.online_payment_enabled;
    delete fallbackPayload.payment_accounts;
    delete fallbackPayload.payment_method_name;
    delete fallbackPayload.payment_account_name;
    delete fallbackPayload.payment_account_number;
    delete fallbackPayload.payment_instructions;
    delete fallbackPayload.payment_whatsapp_number;
    delete fallbackPayload.payment_verification_required;
    delete fallbackPayload.auto_rotate_products;
    delete fallbackPayload.auto_rotate_interval_minutes;

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

  // Ensure response includes auto-rotate values
  if (data && parsed.data.auto_rotate_products !== undefined) {
    data.auto_rotate_products = parsed.data.auto_rotate_products;
  }
  if (data && parsed.data.auto_rotate_interval_minutes !== undefined) {
    data.auto_rotate_interval_minutes = parsed.data.auto_rotate_interval_minutes;
  }

  (revalidateTag as any)('settings');
  (revalidateTag as any)('products');
  revalidatePath('/', 'layout');
  revalidatePath('/products');
  revalidatePath('/admin/settings');

  return NextResponse.json({ settings: data });
}
