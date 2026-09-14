import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient, createServiceClient } from '@/lib/supabase/server';

// GET: Fetch single order details with order_items for invoice/viewing
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const orderId = params.id;
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized: Admin login required' }, { status: 401 });
    }

    const service = createServiceClient();

    const { data: order, error } = await service
      .from('orders')
      .select('*, order_items(*, product:products(*, product_images(*)))')
      .eq('id', orderId)
      .maybeSingle();

    if (error || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
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
});

// PATCH: Update order details (customer info, admin notes, order number)
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const orderId = params.id;
    const supabase = createClient();
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
      .select('id, order_number')
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
  { params }: { params: { id: string } }
) {
  try {
    const orderId = params.id;
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized: Admin login required' }, { status: 401 });
    }

    const service = createServiceClient();

    // Verify order exists
    const { data: order, error: fetchErr } = await service
      .from('orders')
      .select('id, order_number')
      .eq('id', orderId)
      .maybeSingle();

    if (fetchErr || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
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
