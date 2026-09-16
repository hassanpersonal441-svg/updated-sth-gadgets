import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-guard';
import { createServiceClient } from '@/lib/supabase/server';

export async function GET(
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
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    let query = supabase.from('invoices').select('*, invoice_items(*)');

    if (isUuid) {
      query = query.eq('id', id);
    } else {
      query = query.ilike('invoice_number', id);
    }

    const { data: invoice, error } = await query.maybeSingle();

    if (error || !invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    return NextResponse.json({ invoice });
  } catch (err: any) {
    console.error('Invoice GET [id] error:', err);
    return NextResponse.json({ error: err?.message || 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
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

    const {
      invoice_number,
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

    // Verify existing invoice exists
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    let findQuery = supabase.from('invoices').select('id, invoice_number');
    if (isUuid) {
      findQuery = findQuery.eq('id', id);
    } else {
      findQuery = findQuery.ilike('invoice_number', id);
    }

    const { data: existingInv } = await findQuery.maybeSingle();

    if (!existingInv) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    const targetId = existingInv.id;

    // Server-side recalculations
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
        invoice_id: targetId,
        product_id: it.product_id || null,
        product_name: it.product_name || 'Selected Product',
        product_image: it.product_image || null,
        quantity: qty,
        unit_price: unitPrice,
        discount: discount,
        total: lineTotal,
      };
    });

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

    // Update invoice header
    const updateData: Record<string, any> = {
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
      updated_at: new Date().toISOString(),
    };

    if (invoice_number?.trim()) {
      updateData.invoice_number = invoice_number.trim();
    }

    const { data: updatedInvoice, error: updateErr } = await supabase
      .from('invoices')
      .update(updateData)
      .eq('id', targetId)
      .select()
      .single();

    if (updateErr || !updatedInvoice) {
      console.error('Invoice update error:', updateErr);
      return NextResponse.json({ error: updateErr?.message || 'Failed to update invoice' }, { status: 500 });
    }

    // Replace items: delete old items and insert updated ones
    await supabase.from('invoice_items').delete().eq('invoice_id', id);
    const { error: itemsErr } = await supabase.from('invoice_items').insert(validatedItems);

    if (itemsErr) {
      console.error('Invoice items replace error:', itemsErr);
      return NextResponse.json({ error: 'Failed to update invoice items' }, { status: 500 });
    }

    // Fetch complete updated invoice
    const { data: completeInvoice } = await supabase
      .from('invoices')
      .select('*, invoice_items(*)')
      .eq('id', id)
      .single();

    return NextResponse.json({ invoice: completeInvoice });
  } catch (err: any) {
    console.error('Invoice PUT [id] error:', err);
    return NextResponse.json({ error: err?.message || 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
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
    const { error } = await supabase.from('invoices').delete().eq('id', id);

    if (error) {
      console.error('Invoice delete error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Invoice deleted successfully' });
  } catch (err: any) {
    console.error('Invoice DELETE [id] error:', err);
    return NextResponse.json({ error: err?.message || 'Internal server error' }, { status: 500 });
  }
}
