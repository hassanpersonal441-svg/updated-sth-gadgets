import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { buildWhatsAppApprovalMessage, createWhatsAppUrl } from '@/lib/whatsapp';

export const dynamic = 'force-dynamic';

export async function POST(
  request: Request,
  { params }: { params: any }
) {
  try {
    const resolvedParams = await params;
    const orderId = resolvedParams?.id || params?.id;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized: Admin login required' }, { status: 401 });
    }

    const service = createServiceClient();

    // 1. Fetch order to verify existence and PENDING status
    const { data: order, error: fetchErr } = await service
      .from('orders')
      .select('*, order_items(*)')
      .eq('id', orderId)
      .maybeSingle();

    if (fetchErr || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (order.status !== 'pending') {
      return NextResponse.json(
        { error: `Order is already marked as ${order.status.toUpperCase()}. Only PENDING orders can be approved.` },
        { status: 400 }
      );
    }

    if (order.order_number) {
      return NextResponse.json(
        { error: `Order already has an official number: ${order.order_number}` },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const adminNotes = body.admin_notes || null;

    let approvedOrder: any = null;

    // 2. Attempt atomic approval via PostgreSQL stored procedure `approve_order`
    const { data: rpcData, error: rpcErr } = await service.rpc('approve_order', {
      p_order_id: orderId,
      p_admin_id: user.id,
      p_admin_notes: adminNotes,
    });

    if (!rpcErr && rpcData) {
      approvedOrder = rpcData;
    } else {
      // Fallback in case PostgreSQL function is pending user SQL execution:
      // Concurrency-safe atomic update using sequence or sequential order count
      const { data: existingApproved } = await service
        .from('orders')
        .select('order_number')
        .not('order_number', 'is', null)
        .order('created_at', { ascending: false });

      // Determine lowest available unused sequence number starting from 1 (STH-001 format)
      let nextNumber = 1;
      if (existingApproved && existingApproved.length > 0) {
        const numbers = existingApproved
          .map((o) => {
            const m = (o.order_number || '').match(/^STH-(\d+)$/i);
            return m ? parseInt(m[1], 10) : 0;
          })
          .filter((n) => n > 0);

        const usedSet = new Set(numbers);
        while (usedSet.has(nextNumber)) {
          nextNumber++;
        }
      }

      const formattedOrderNumber = `STH-${String(nextNumber).padStart(3, '0')}`;

      const { data: updated, error: updateErr } = await service
        .from('orders')
        .update({
          order_number: formattedOrderNumber,
          status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: user.id,
          admin_notes: adminNotes || order.admin_notes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId)
        .eq('status', 'pending')
        .select('*, order_items(*)')
        .single();

      if (updateErr || !updated) {
        return NextResponse.json(
          { error: updateErr?.message || 'Failed to approve order' },
          { status: 500 }
        );
      }

      approvedOrder = updated;
    }

    // Re-fetch order with items if needed
    if (!approvedOrder.order_items) {
      const { data: fullOrder } = await service
        .from('orders')
        .select('*, order_items(*)')
        .eq('id', orderId)
        .single();
      approvedOrder = fullOrder || approvedOrder;
    }

    // Build Approved Order WhatsApp confirmation message
    const confirmationMessage = buildWhatsAppApprovalMessage({
      order_number: approvedOrder.order_number,
      customer_name: approvedOrder.customer_name,
      phone: approvedOrder.phone,
      city: approvedOrder.city,
      address: approvedOrder.address,
      subtotal: approvedOrder.subtotal,
      coupon_discount: approvedOrder.coupon_discount,
      bundle_discount: approvedOrder.bundle_discount,
      delivery_charges: approvedOrder.delivery_charges,
      total_amount: approvedOrder.total_amount,
      items: approvedOrder.order_items || [],
    });

    const confirmationWhatsAppUrl = createWhatsAppUrl(approvedOrder.phone, confirmationMessage);

    // Generate corresponding official invoice for approved order
    try {
      const { data: existingInvoice } = await service
        .from('invoices')
        .select('id')
        .eq('customer_phone', approvedOrder.phone)
        .eq('subtotal', approvedOrder.subtotal)
        .eq('grand_total', approvedOrder.total_amount)
        .maybeSingle();

      if (!existingInvoice) {
        // Calculate next invoice number
        const { data: existingInvoices } = await service
          .from('invoices')
          .select('invoice_number')
          .not('invoice_number', 'is', null)
          .order('created_at', { ascending: false });

        let nextNum = 1;
        if (existingInvoices && existingInvoices.length > 0) {
          const numbers = existingInvoices
            .map((inv: any) => {
              const m = (inv.invoice_number || '').match(/(\d+)/);
              return m ? parseInt(m[1], 10) : 0;
            })
            .filter((n: number) => n > 0);

          const usedSet = new Set(numbers);
          while (usedSet.has(nextNum)) {
            nextNum++;
          }
        }
        const generatedInvNum = `STH-INV-${String(nextNum).padStart(3, '0')}`;

        const { data: newInv } = await service
          .from('invoices')
          .insert({
            invoice_number: generatedInvNum,
            customer_name: approvedOrder.customer_name,
            customer_phone: approvedOrder.phone,
            customer_whatsapp: approvedOrder.phone,
            customer_address: approvedOrder.address,
            customer_city: approvedOrder.city,
            subtotal: approvedOrder.subtotal,
            coupon_discount: (approvedOrder.coupon_discount || 0) + (approvedOrder.bundle_discount || 0),
            delivery_charges: approvedOrder.delivery_charges,
            grand_total: approvedOrder.total_amount,
            payment_method: 'Cash on Delivery',
            payment_status: approvedOrder.payment_status === 'paid' ? 'Paid' : 'Unpaid',
            invoice_status: 'Confirmed',
            amount_paid: approvedOrder.payment_status === 'paid' ? approvedOrder.total_amount : 0,
            remaining_amount: approvedOrder.payment_status === 'paid' ? 0 : approvedOrder.total_amount,
            notes: `Auto-generated from Approved Order ${approvedOrder.order_number}`,
          })
          .select()
          .single();

        if (newInv && approvedOrder.order_items && approvedOrder.order_items.length > 0) {
          const invItems = approvedOrder.order_items.map((i: any) => ({
            invoice_id: newInv.id,
            product_id: i.product_id || null,
            product_name: i.product_name + (i.variant_name ? ` (${i.variant_name})` : ''),
            quantity: i.quantity,
            unit_price: i.unit_price,
            discount: 0,
            total: i.line_total,
          }));
          await service.from('invoice_items').insert(invItems);
        }
      }
    } catch (invEx) {
      console.error('Auto invoice creation error during order approval:', invEx);
    }

    return NextResponse.json({
      success: true,
      order: approvedOrder,
      confirmationMessage,
      confirmationWhatsAppUrl,
    });
  } catch (err: any) {
    console.error('Approve order error:', err);
    return NextResponse.json({ error: err.message || 'Error approving order' }, { status: 500 });
  }
}
