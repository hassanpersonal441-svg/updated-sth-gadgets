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

    // 1. Fetch order with items
    const { data: order, error: orderErr } = await service
      .from('orders')
      .select('*, order_items(*)')
      .eq('id', orderId)
      .maybeSingle();

    if (orderErr || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // 2. Check if invoice already exists for this order
    let searchPattern = order.order_number || order.id;
    let expectedInvNum = order.order_number ? order.order_number.replace(/^STH-/i, 'STH-INV-') : '';

    let existingQuery = service
      .from('invoices')
      .select('*, invoice_items(*)')
      .or(`notes.ilike.%${searchPattern}%${expectedInvNum ? `,invoice_number.ilike.${expectedInvNum}` : ''}`);

    const { data: existingInvoices } = await existingQuery;

    if (existingInvoices && existingInvoices.length > 0) {
      const existing = existingInvoices[0];
      return NextResponse.json({
        success: true,
        invoice: existing,
        invoice_number: existing.invoice_number,
        invoiceUrl: `/invoice/${existing.invoice_number}`,
        isExisting: true,
      });
    }

    // 3. Determine invoice number
    let finalInvoiceNumber: string;
    const orderMatch = (order.order_number || '').match(/^STH-(\d+)$/i);
    if (orderMatch) {
      finalInvoiceNumber = `STH-INV-${orderMatch[1]}`;
    } else {
      const { data: allInvs } = await service
        .from('invoices')
        .select('invoice_number')
        .not('invoice_number', 'is', null)
        .order('created_at', { ascending: false });

      let nextNum = 1;
      if (allInvs && allInvs.length > 0) {
        const numbers = allInvs
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
      finalInvoiceNumber = `STH-INV-${String(nextNum).padStart(3, '0')}`;
    }

    // 4. Create invoice in database
    const { data: newInv, error: insertErr } = await service
      .from('invoices')
      .insert({
        invoice_number: finalInvoiceNumber,
        customer_name: order.customer_name,
        customer_phone: order.phone,
        customer_whatsapp: order.phone,
        customer_address: order.address || 'Address on file',
        customer_city: order.city || 'City on file',
        invoice_date: new Date().toISOString(),
        subtotal: Number(order.subtotal) || Number(order.total_amount) || 0,
        coupon_discount: (Number(order.coupon_discount) || 0) + (Number(order.bundle_discount) || 0),
        delivery_charges: Number(order.delivery_charges) || 0,
        actual_courier_cost: Number(order.actual_courier_cost) || 0,
        delivery_paid_by: order.delivery_paid_by || 'customer',
        grand_total: Number(order.total_amount) || 0,
        payment_method: order.payment_method || 'Cash on Delivery',
        payment_status: order.payment_status === 'paid' ? 'Paid' : 'Unpaid',
        invoice_status: 'Confirmed',
        amount_paid: order.payment_status === 'paid' ? Number(order.total_amount) : (Number(order.amount_paid) || 0),
        remaining_amount: order.payment_status === 'paid' ? 0 : Math.max(0, (Number(order.total_amount) || 0) - (Number(order.amount_paid) || 0)),
        notes: `Order ${order.order_number || order.id}`,
      })
      .select()
      .single();

    if (insertErr || !newInv) {
      console.error('Error creating invoice:', insertErr);
      return NextResponse.json({ error: insertErr?.message || 'Failed to create invoice' }, { status: 500 });
    }

    // 5. Insert invoice items
    if (order.order_items && order.order_items.length > 0) {
      const itemsToInsert = order.order_items.map((i: any) => ({
        invoice_id: newInv.id,
        product_id: i.product_id || null,
        product_name: i.product_name + (i.variant_name ? ` (${i.variant_name})` : ''),
        quantity: i.quantity || 1,
        unit_price: Number(i.unit_price) || 0,
        discount: 0,
        total: Number(i.line_total) || 0,
      }));

      await service.from('invoice_items').insert(itemsToInsert);
    }

    return NextResponse.json({
      success: true,
      invoice: newInv,
      invoice_number: finalInvoiceNumber,
      invoiceUrl: `/invoice/${finalInvoiceNumber}`,
      isExisting: false,
    });
  } catch (err: any) {
    console.error('POST /api/admin/orders/[id]/invoice error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
