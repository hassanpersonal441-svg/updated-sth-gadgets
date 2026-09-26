import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-guard';
import { createServiceClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized: Admin login required' }, { status: 401 });
  }

  const supabase = createServiceClient();

  try {
    const body = await req.json().catch(() => ({}));
    const action = body.action || 'reset_whatsapp';

    let resultMessage = '';

    if (action === 'reset_whatsapp' || action === 'full_reset') {
      // Delete all records in whatsapp_clicks
      const { error: waErr } = await supabase
        .from('whatsapp_clicks')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (waErr) {
        console.error('Error resetting whatsapp clicks:', waErr);
        return NextResponse.json({ error: waErr.message }, { status: 500 });
      }
      resultMessage += 'WhatsApp tracked clicks reset to 0. ';
    }

    if (action === 'resequence_orders' || action === 'full_reset') {
      // Fetch all orders with assigned order numbers or approved status ordered by created_at ascending
      const { data: orders, error: ordErr } = await supabase
        .from('orders')
        .select('id, order_number, status, created_at')
        .not('status', 'eq', 'cancelled')
        .order('created_at', { ascending: true });

      if (ordErr) {
        console.error('Error fetching orders for resequence:', ordErr);
        return NextResponse.json({ error: ordErr.message }, { status: 500 });
      }

      let orderSeq = 1;
      if (orders && orders.length > 0) {
        for (const ord of orders) {
          // Only assign order_number to approved, processing, shipped, delivered, or orders that already had an order number
          if (ord.order_number || ord.status !== 'pending') {
            const newNum = `STH-${String(orderSeq).padStart(3, '0')}`;
            await supabase
              .from('orders')
              .update({ order_number: newNum })
              .eq('id', ord.id);
            orderSeq++;
          }
        }
      }
      resultMessage += `Orders re-sequenced cleanly from STH-001 (Total: ${orderSeq - 1}). `;
    }

    if (action === 'resequence_invoices' || action === 'full_reset') {
      // Fetch all invoices ordered by created_at ascending
      const { data: invoices, error: invErr } = await supabase
        .from('invoices')
        .select('id, invoice_number, created_at')
        .order('created_at', { ascending: true });

      if (invErr) {
        console.error('Error fetching invoices for resequence:', invErr);
        return NextResponse.json({ error: invErr.message }, { status: 500 });
      }

      let invSeq = 1;
      if (invoices && invoices.length > 0) {
        for (const inv of invoices) {
          const newInvNum = `STH-INV-${String(invSeq).padStart(3, '0')}`;
          await supabase
            .from('invoices')
            .update({ invoice_number: newInvNum })
            .eq('id', inv.id);
          invSeq++;
        }
      }
      resultMessage += `Invoices re-sequenced cleanly from STH-INV-001 (Total: ${invSeq - 1}). `;
    }

    return NextResponse.json({
      success: true,
      message: resultMessage.trim() || 'System reset completed successfully.',
    });
  } catch (err: any) {
    console.error('System reset error:', err);
    return NextResponse.json({ error: err?.message || 'Failed to perform reset' }, { status: 500 });
  }
}
