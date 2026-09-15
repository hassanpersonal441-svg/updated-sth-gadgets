import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-guard';
import { createServiceClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServiceClient();
  const searchParams = req.nextUrl.searchParams;

  const search = searchParams.get('search')?.trim() || '';
  const invoiceStatus = searchParams.get('invoice_status') || '';
  const paymentStatus = searchParams.get('payment_status') || '';
  const paymentMethod = searchParams.get('payment_method') || '';
  const startDate = searchParams.get('start_date') || '';
  const endDate = searchParams.get('end_date') || '';

  try {
    let query = supabase
      .from('invoices')
      .select('*, invoice_items(*)', { count: 'exact' });

    if (search) {
      query = query.or(
        `invoice_number.ilike.%${search}%,customer_name.ilike.%${search}%,customer_phone.ilike.%${search}%,customer_whatsapp.ilike.%${search}%`
      );
    }

    if (invoiceStatus && invoiceStatus !== 'all') {
      query = query.eq('invoice_status', invoiceStatus);
    }

    if (paymentStatus && paymentStatus !== 'all') {
      query = query.eq('payment_status', paymentStatus);
    }

    if (paymentMethod && paymentMethod !== 'all') {
      query = query.eq('payment_method', paymentMethod);
    }

    if (startDate) {
      query = query.gte('invoice_date', startDate);
    }

    if (endDate) {
      query = query.lte('invoice_date', endDate);
    }

    query = query.order('created_at', { ascending: false });

    const { data: invoices, error, count } = await query;

    if (error) {
      console.error('Error fetching invoices:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Fetch overall stats from database
    const { data: allInvoices, error: statsErr } = await supabase
      .from('invoices')
      .select('grand_total, amount_paid, remaining_amount, invoice_status, payment_status');

    let totalInvoices = 0;
    let paidInvoices = 0;
    let pendingInvoices = 0;
    let unpaidInvoices = 0;
    let cancelledInvoices = 0;
    let totalSales = 0;
    let totalPaid = 0;
    let totalOutstanding = 0;

    if (allInvoices && !statsErr) {
      totalInvoices = allInvoices.length;
      allInvoices.forEach((inv) => {
        if (inv.invoice_status === 'Paid') paidInvoices++;
        if (inv.invoice_status === 'Pending' || inv.invoice_status === 'Draft') pendingInvoices++;
        if (inv.payment_status === 'Unpaid') unpaidInvoices++;
        if (inv.invoice_status === 'Cancelled') cancelledInvoices++;

        if (inv.invoice_status !== 'Cancelled') {
          totalSales += Number(inv.grand_total || 0);
          totalPaid += Number(inv.amount_paid || 0);
          totalOutstanding += Number(inv.remaining_amount || 0);
        }
      });
    }

    return NextResponse.json({
      invoices: invoices || [],
      totalCount: count || 0,
      stats: {
        totalInvoices,
        paidInvoices,
        pendingInvoices,
        unpaidInvoices,
        cancelledInvoices,
        totalSales,
        totalPaid,
        totalOutstanding,
      },
    });
  } catch (err: any) {
    console.error('Invoice GET route failure:', err);
    return NextResponse.json({ error: err?.message || 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServiceClient();

  try {
    const body = await req.json();

    const {
      customer_name,
      customer_phone,
      customer_whatsapp,
      customer_email,
      customer_address,
      customer_city,
      invoice_date,
      due_date,
      delivery_charges = 0,
      coupon_code,
      payment_method = 'Cash on Delivery',
      payment_status = 'Unpaid',
      amount_paid = 0,
      invoice_status = 'Draft',
      notes,
      terms,
      items = [],
    } = body;

    // Input Validation
    if (!customer_name?.trim()) {
      return NextResponse.json({ error: 'Customer name is required' }, { status: 400 });
    }
    if (!customer_phone?.trim()) {
      return NextResponse.json({ error: 'Customer phone number is required' }, { status: 400 });
    }
    if (!customer_address?.trim()) {
      return NextResponse.json({ error: 'Customer address is required' }, { status: 400 });
    }
    if (!customer_city?.trim()) {
      return NextResponse.json({ error: 'Customer city is required' }, { status: 400 });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'At least one product item is required' }, { status: 400 });
    }

    // Server-side calculation of line items & subtotal
    let subtotal = 0;
    let item_discount = 0;

    const validatedItems = items.map((it: any) => {
      const qty = Math.max(1, parseInt(it.quantity) || 1);
      const unitPrice = Math.max(0, parseFloat(it.unit_price) || 0);
      const discount = Math.max(0, parseFloat(it.discount) || 0);
      const lineTotal = Math.max(0, (unitPrice * qty) - discount);

      subtotal += unitPrice * qty;
      item_discount += discount;

      return {
        product_id: it.product_id || null,
        product_name: it.product_name || 'Selected Product',
        product_image: it.product_image || null,
        quantity: qty,
        unit_price: unitPrice,
        discount: discount,
        total: lineTotal,
      };
    });

    // Validate Coupon if provided
    let coupon_discount = 0;
    let coupon_id: string | null = null;

    if (coupon_code?.trim()) {
      const { data: coupon } = await supabase
        .from('coupons')
        .select('*')
        .eq('code', coupon_code.trim())
        .eq('active', true)
        .maybeSingle();

      if (coupon) {
        // Expiry check
        const isExpired = coupon.expiry_date && new Date(coupon.expiry_date) < new Date();
        const effectiveSubtotal = subtotal - item_discount;

        if (!isExpired && effectiveSubtotal >= (coupon.minimum_order || 0)) {
          coupon_id = coupon.id;
          if (coupon.discount_type === 'percentage') {
            let calculated = (effectiveSubtotal * coupon.discount_value) / 100;
            if (coupon.maximum_discount && coupon.maximum_discount > 0) {
              calculated = Math.min(calculated, coupon.maximum_discount);
            }
            coupon_discount = calculated;
          } else if (coupon.discount_type === 'fixed') {
            coupon_discount = Math.min(coupon.discount_value, effectiveSubtotal);
          }
        }
      }
    }

    const deliveryNum = Math.max(0, parseFloat(delivery_charges) || 0);
    const grand_total = Math.max(0, subtotal - item_discount - coupon_discount + deliveryNum);
    const paidNum = Math.max(0, parseFloat(amount_paid) || 0);
    const remaining_amount = Math.max(0, grand_total - paidNum);

    // Insert Invoice
    const { data: invoice, error: invErr } = await supabase
      .from('invoices')
      .insert({
        customer_name: customer_name.trim(),
        customer_phone: customer_phone.trim(),
        customer_whatsapp: customer_whatsapp?.trim() || customer_phone.trim(),
        customer_email: customer_email?.trim() || null,
        customer_address: customer_address.trim(),
        customer_city: customer_city.trim(),
        invoice_date: invoice_date ? new Date(invoice_date).toISOString() : new Date().toISOString(),
        due_date: due_date ? new Date(due_date).toISOString() : null,
        subtotal,
        item_discount,
        coupon_discount,
        delivery_charges: deliveryNum,
        grand_total,
        coupon_code: coupon_code?.trim() || null,
        coupon_id,
        payment_method,
        payment_status,
        amount_paid: paidNum,
        remaining_amount,
        invoice_status,
        notes: notes?.trim() || null,
        terms: terms?.trim() || null,
      })
      .select()
      .single();

    if (invErr || !invoice) {
      console.error('Invoice insert error:', invErr);
      return NextResponse.json({ error: invErr?.message || 'Failed to create invoice' }, { status: 500 });
    }

    // Insert Invoice Items
    const itemsToInsert = validatedItems.map((item) => ({
      ...item,
      invoice_id: invoice.id,
    }));

    const { error: itemsErr } = await supabase.from('invoice_items').insert(itemsToInsert);

    if (itemsErr) {
      console.error('Invoice items insert error:', itemsErr);
      // Clean up invoice on failure
      await supabase.from('invoices').delete().eq('id', invoice.id);
      return NextResponse.json({ error: 'Failed to create invoice items' }, { status: 500 });
    }

    // Return complete created invoice with items
    const { data: completeInvoice } = await supabase
      .from('invoices')
      .select('*, invoice_items(*)')
      .eq('id', invoice.id)
      .single();

    return NextResponse.json({ invoice: completeInvoice }, { status: 201 });
  } catch (err: any) {
    console.error('Invoice POST route exception:', err);
    return NextResponse.json({ error: err?.message || 'Internal server error' }, { status: 500 });
  }
}
