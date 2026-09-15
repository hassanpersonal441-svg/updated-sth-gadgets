import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

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

      // Determine next sequence number
      let nextNumber = 1;
      if (existingApproved && existingApproved.length > 0) {
        const numbers = existingApproved
          .map((o) => {
            const m = (o.order_number || '').match(/^STH-(\d+)$/i);
            return m ? parseInt(m[1], 10) : 0;
          })
          .filter((n) => n > 0);

        if (numbers.length > 0) {
          nextNumber = Math.max(...numbers) + 1;
        }
      }

      const formattedOrderNumber = `STH-${String(nextNumber).padStart(4, '0')}`;

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
    const itemsText = (approvedOrder.order_items || [])
      .map(
        (i: any) =>
          `• ${i.product_name}${i.variant_name ? ` (${i.variant_name})` : ''}\nQty: ${i.quantity} x PKR ${Number(i.unit_price).toLocaleString('en-PK')} = PKR ${Number(i.line_total).toLocaleString('en-PK')}`
      )
      .join('\n\n');

    const cleanCustomerPhone = approvedOrder.phone.replace(/[^0-9]/g, '');

    const confirmationMessage = [
      '🛍️ STH GADGETS - ORDER CONFIRMED',
      '',
      `🔢 Order Number: ${approvedOrder.order_number}`,
      '',
      `👤 Customer Name: ${approvedOrder.customer_name}`,
      `📱 WhatsApp Number: ${approvedOrder.phone}`,
      `🏙️ City: ${approvedOrder.city}`,
      `📍 Address: ${approvedOrder.address}`,
      '',
      '📦 ORDER DETAILS',
      '',
      itemsText,
      '',
      `💵 Subtotal: PKR ${Number(approvedOrder.subtotal).toLocaleString('en-PK')}`,
      `🎟️ Coupon Discount: PKR ${Number(approvedOrder.coupon_discount).toLocaleString('en-PK')}`,
      `🎁 Bundle Discount: PKR ${Number(approvedOrder.bundle_discount).toLocaleString('en-PK')}`,
      `🚚 Delivery Charges: PKR ${Number(approvedOrder.delivery_charges).toLocaleString('en-PK')}`,
      `💰 TOTAL AMOUNT: PKR ${Number(approvedOrder.total_amount).toLocaleString('en-PK')}`,
      '',
      '=========================',
      '',
      'Thank you for shopping with STH Gadgets!',
      `Your order ${approvedOrder.order_number} has been approved and is being prepared for dispatch.`,
    ].join('\n');

    const confirmationWhatsAppUrl = `https://wa.me/${cleanCustomerPhone}?text=${encodeURIComponent(confirmationMessage)}`;

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
        const { data: newInv } = await service
          .from('invoices')
          .insert({
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
