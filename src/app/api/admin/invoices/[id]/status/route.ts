import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-guard';
import { createServiceClient } from '@/lib/supabase/server';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const supabase = createServiceClient();

  try {
    const body = await req.json();
    const { invoice_status, payment_status, amount_paid } = body;

    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (invoice_status) updates.invoice_status = invoice_status;
    if (payment_status) updates.payment_status = payment_status;

    if (amount_paid !== undefined) {
      const paid = Math.max(0, parseFloat(amount_paid) || 0);
      updates.amount_paid = paid;

      // Fetch invoice grand total to recalculate remaining balance
      const { data: inv } = await supabase
        .from('invoices')
        .select('grand_total')
        .eq('id', id)
        .single();

      if (inv) {
        updates.remaining_amount = Math.max(0, inv.grand_total - paid);
      }
    }

    const { data: updated, error } = await supabase
      .from('invoices')
      .update(updates)
      .eq('id', id)
      .select('*, invoice_items(*)')
      .single();

    if (error || !updated) {
      return NextResponse.json({ error: error?.message || 'Failed to update status' }, { status: 500 });
    }

    return NextResponse.json({ invoice: updated });
  } catch (err: any) {
    console.error('Invoice PATCH status error:', err);
    return NextResponse.json({ error: err?.message || 'Internal server error' }, { status: 500 });
  }
}
