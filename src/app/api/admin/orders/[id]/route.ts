import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// GET: Fetch single order details with order_items for invoice/viewing
export async function GET(
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

    let { data: order, error } = await service
      .from('orders')
      .select('*, order_items(*, product:products(*, product_images(*)))')
      .eq('id', orderId)
      .maybeSingle();

    // Fallback if deep relation query fails
    if (error) {
      console.warn('Primary single order query failed, trying fallback query:', error.message);
      const fallbackRes = await service
        .from('orders')
        .select('*, order_items(*)')
        .eq('id', orderId)
        .maybeSingle();
      
      order = fallbackRes.data;
      error = fallbackRes.error;
    }

    if (error || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Enrich order items with products and product_images
    if (order.order_items && order.order_items.length > 0) {
      const productIds = order.order_items
        .filter((it: any) => it.product_id && (!it.product || !it.product.product_images))
        .map((it: any) => it.product_id);

      if (productIds.length > 0) {
        const { data: prods } = await service
          .from('products')
          .select('id, name, price, product_images(*)')
          .in('id', productIds);

        if (prods && prods.length > 0) {
          const map = new Map<string, any>();
          prods.forEach((p: any) => map.set(p.id, p));
          order.order_items.forEach((it: any) => {
            if (it.product_id && map.has(it.product_id)) {
              it.product = map.get(it.product_id);
            }
          });
        }
      }
    }

    return NextResponse.json({ success: true, order });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error fetching order' }, { status: 500 });
  }
}

const updateOrderSchema = z.object({
  customer_name: z.string().min(1, 'Name is required').max(100).optional(),
  phone: z.string().min(5, 'Valid phone is required').max(30).optional(),
  city: z.string().min(1, 'City is required').max(100).optional(),
  address: z.string().min(1, 'Address is required').max(300).optional(),
  admin_notes: z.string().nullable().optional(),
  order_number: z.string().nullable().optional(),
  subtotal: z.number().min(0).optional(),
  coupon_discount: z.number().min(0).optional(),
  bundle_discount: z.number().min(0).optional(),
  delivery_charges: z.number().min(0).optional(),
  actual_courier_cost: z.number().min(0).optional(),
  delivery_paid_by: z.enum(['customer', 'store', 'partial']).optional(),
  total_amount: z.number().min(0).optional(),
  cod_courier_fees: z.number().min(0).optional(),
  tax_deductions: z.number().min(0).optional(),
  settlement_amount_received: z.number().min(0).optional(),
  settlement_status: z.enum(['pending', 'received', 'reconciled']).optional(),
  settlement_date: z.string().nullable().optional(),
});

// PATCH: Update order details (customer info, admin notes, order number, custom prices/discounts)
export async function PATCH(
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

    const body = await request.json().catch(() => null);
    const parsed = updateOrderSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid input data' },
        { status: 400 }
      );
    }

    const service = createServiceClient();

    // Verify order exists
    const { data: existingOrder, error: fetchErr } = await service
      .from('orders')
      .select('id, order_number, subtotal, coupon_discount, bundle_discount, delivery_charges, total_amount')
      .eq('id', orderId)
      .maybeSingle();

    if (fetchErr || !existingOrder) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (parsed.data.customer_name !== undefined) updateData.customer_name = parsed.data.customer_name.trim();
    if (parsed.data.phone !== undefined) updateData.phone = parsed.data.phone.trim();
    if (parsed.data.city !== undefined) updateData.city = parsed.data.city.trim();
    if (parsed.data.address !== undefined) updateData.address = parsed.data.address.trim();
    if (parsed.data.admin_notes !== undefined) updateData.admin_notes = parsed.data.admin_notes;

    if (parsed.data.subtotal !== undefined) updateData.subtotal = parsed.data.subtotal;
    if (parsed.data.coupon_discount !== undefined) updateData.coupon_discount = parsed.data.coupon_discount;
    if (parsed.data.bundle_discount !== undefined) updateData.bundle_discount = parsed.data.bundle_discount;
    if (parsed.data.delivery_charges !== undefined) updateData.delivery_charges = parsed.data.delivery_charges;
    if (parsed.data.actual_courier_cost !== undefined) updateData.actual_courier_cost = parsed.data.actual_courier_cost;
    if (parsed.data.delivery_paid_by !== undefined) updateData.delivery_paid_by = parsed.data.delivery_paid_by;
    if (parsed.data.total_amount !== undefined) updateData.total_amount = parsed.data.total_amount;
    
    // Settlement Fields
    if (parsed.data.cod_courier_fees !== undefined) updateData.cod_courier_fees = parsed.data.cod_courier_fees;
    if (parsed.data.tax_deductions !== undefined) updateData.tax_deductions = parsed.data.tax_deductions;
    if (parsed.data.settlement_amount_received !== undefined) updateData.settlement_amount_received = parsed.data.settlement_amount_received;
    if (parsed.data.settlement_status !== undefined) updateData.settlement_status = parsed.data.settlement_status;
    if (parsed.data.settlement_date !== undefined) updateData.settlement_date = parsed.data.settlement_date;

    // Handle order_number update / reassignment
    if (parsed.data.order_number !== undefined) {
      const trimmedNumber = parsed.data.order_number?.trim() || null;

      if (trimmedNumber) {
        // Check uniqueness across other orders
        const { data: duplicate } = await service
          .from('orders')
          .select('id, order_number')
          .eq('order_number', trimmedNumber)
          .neq('id', orderId)
          .maybeSingle();

        if (duplicate) {
          return NextResponse.json(
            { error: `Order number "${trimmedNumber}" is already assigned to another order.` },
            { status: 409 }
          );
        }
      }

      updateData.order_number = trimmedNumber;
    }

    const { data: updatedOrder, error: updateErr } = await service
      .from('orders')
      .update(updateData)
      .eq('id', orderId)
      .select('*, order_items(*)')
      .single();

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, order: updatedOrder });
  } catch (err: any) {
    console.error('Order update error:', err);
    return NextResponse.json({ error: err.message || 'Error updating order' }, { status: 500 });
  }
}

// DELETE: Permanently delete an order and its items
export async function DELETE(
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

    // Verify order exists and check status
    const { data: order, error: fetchErr } = await service
      .from('orders')
      .select('id, order_number, status')
      .eq('id', orderId)
      .maybeSingle();

    if (fetchErr || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (order.status === 'delivered') {
      return NextResponse.json(
        { error: 'Cannot delete order: Once an order is delivered and received by the customer, it cannot be deleted from the portal.' },
        { status: 400 }
      );
    }

    // Delete related items first
    await service.from('order_items').delete().eq('order_id', orderId);

    // Delete the order itself
    const { error: deleteErr } = await service
      .from('orders')
      .delete()
      .eq('id', orderId);

    if (deleteErr) {
      return NextResponse.json({ error: deleteErr.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      deletedId: orderId,
      freedOrderNumber: order.order_number || null,
    });
  } catch (err: any) {
    console.error('Order delete error:', err);
    return NextResponse.json({ error: err.message || 'Error deleting order' }, { status: 500 });
  }
}

