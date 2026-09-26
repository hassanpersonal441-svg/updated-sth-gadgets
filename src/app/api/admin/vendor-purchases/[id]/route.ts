import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-guard';
import { createServiceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function PATCH(
  req: NextRequest,
  { params }: { params: any }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const resolvedParams = await params;
  const id = resolvedParams?.id || params?.id;
  const supabase = createServiceClient();

  try {
    const body = await req.json();
    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (body.status !== undefined) updatePayload.status = body.status === 'purchased' ? 'purchased' : 'pending';
    if (body.payment_status !== undefined) {
      updatePayload.payment_status = ['unpaid', 'partial', 'paid'].includes(body.payment_status) ? body.payment_status : 'unpaid';
    }
    if (body.payment_method !== undefined) {
      updatePayload.payment_method = ['cash', 'bank_transfer', 'easypaisa', 'jazzcash', 'other'].includes(body.payment_method) ? body.payment_method : 'cash';
    }
    if (body.amount_paid !== undefined) updatePayload.amount_paid = Math.max(0, Number(body.amount_paid) || 0);
    if (body.payment_due_date !== undefined) updatePayload.payment_due_date = body.payment_due_date || null;
    if (body.whatsapp_sent_at !== undefined) updatePayload.whatsapp_sent_at = body.whatsapp_sent_at || null;
    if (body.order_number !== undefined) updatePayload.order_number = body.order_number.trim().toUpperCase();
    if (body.product_name !== undefined) updatePayload.product_name = body.product_name.trim();
    if (body.quantity !== undefined) updatePayload.quantity = Math.max(1, Number(body.quantity) || 1);
    if (body.wholesale_cost !== undefined) updatePayload.wholesale_cost = Math.max(0, Number(body.wholesale_cost) || 0);
    if (body.purchase_date !== undefined) updatePayload.purchase_date = body.purchase_date;
    if (body.notes !== undefined) updatePayload.notes = body.notes ? body.notes.trim() : null;

    const { data, error } = await supabase
      .from('vendor_purchases')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, purchase: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error updating vendor purchase' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: any }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const resolvedParams = await params;
  const id = resolvedParams?.id || params?.id;
  const supabase = createServiceClient();

  try {
    const { error } = await supabase.from('vendor_purchases').delete().eq('id', id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error deleting vendor purchase' }, { status: 500 });
  }
}
