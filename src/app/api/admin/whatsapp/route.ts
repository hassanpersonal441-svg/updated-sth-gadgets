import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-guard';
import { createServiceClient } from '@/lib/supabase/server';
import { WHATSAPP_TEMPLATE_DEFAULTS } from '@/lib/whatsapp-templates';

export const dynamic = 'force-dynamic';

async function seedTemplates(service: ReturnType<typeof createServiceClient>) {
  const { data, error } = await service.from('whatsapp_message_templates').select('*').order('title');
  if (!error && data && data.length > 0) return data;

  const rows = WHATSAPP_TEMPLATE_DEFAULTS.map((template) => ({
    ...template,
    default_body: template.body,
  }));
  const seeded = await service.from('whatsapp_message_templates').upsert(rows, { onConflict: 'template_key' }).select('*').order('title');
  if (seeded.error) throw seeded.error;
  return seeded.data || [];
}

export async function GET(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const service = createServiceClient();
  try {
    const mode = request.nextUrl.searchParams.get('mode') || 'templates';
    if (mode === 'history') {
      const { data, error } = await service.from('whatsapp_message_history').select('*').order('created_at', { ascending: false }).limit(100);
      if (error) throw error;
      return NextResponse.json({ history: data || [] });
    }
    return NextResponse.json({ templates: await seedTemplates(service) });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Unable to load WhatsApp data' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body?.template_key || typeof body.body !== 'string') {
    return NextResponse.json({ error: 'template_key and body are required' }, { status: 400 });
  }

  const service = createServiceClient();
  const update: Record<string, unknown> = { body: body.body.trim(), updated_at: new Date().toISOString() };
  if (body.reset === true) {
    const defaultTemplate = WHATSAPP_TEMPLATE_DEFAULTS.find((template) => template.template_key === body.template_key);
    if (!defaultTemplate) return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    update.body = defaultTemplate.body;
  }

  const { data, error } = await service.from('whatsapp_message_templates').update(update).eq('template_key', body.template_key).select('*').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ template: data });
}

export async function POST(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body?.message_type || typeof body.message_body !== 'string' || !body?.recipient_phone) {
    return NextResponse.json({ error: 'message_type, message_body, and recipient_phone are required' }, { status: 400 });
  }

  const service = createServiceClient();
  const { data, error } = await service.from('whatsapp_message_history').insert({
    order_id: body.order_id || null,
    order_number: body.order_number || null,
    customer_name: body.customer_name || null,
    message_type: body.message_type,
    recipient_phone: body.recipient_phone,
    message_body: body.message_body,
    status: body.status || 'sent',
  }).select('*').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ history: data });
}
