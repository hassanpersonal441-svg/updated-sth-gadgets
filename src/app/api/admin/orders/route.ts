import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-guard';
import { createServiceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 100;
    const page = searchParams.get('page') ? parseInt(searchParams.get('page')!, 10) : 1;
    const offset = (page - 1) * limit;

    const service = createServiceClient();
    
    // Optimized single-level relational query for instant response (<200ms)
    let query = service
      .from('orders')
      .select('*, order_items(*)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    if (search && search.trim()) {
      const q = search.trim();
      query = query.or(`customer_name.ilike.%${q}%,phone.ilike.%${q}%,order_number.ilike.%${q}%,city.ilike.%${q}%`);
    }

    const { data: orders, error, count } = await query;

    if (error) {
      console.error('Error fetching admin orders:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Fast parallel batch product enrichment (thumbnails & variant images)
    if (orders && orders.length > 0) {
      const allProductIds = Array.from(
        new Set(
          orders.flatMap((o: any) =>
            (o.order_items || [])
              .map((item: any) => item.product_id)
              .filter(Boolean)
          )
        )
      );

      if (allProductIds.length > 0) {
        try {
          const { data: productsData } = await service
            .from('products')
            .select('id, name, price, image_url, product_images(image_url, is_primary)')
            .in('id', allProductIds);

          if (productsData && productsData.length > 0) {
            const productMap = new Map<string, any>();
            productsData.forEach((p: any) => productMap.set(p.id, p));

            orders.forEach((o: any) => {
              (o.order_items || []).forEach((item: any) => {
                if (item.product_id && productMap.has(item.product_id)) {
                  item.product = productMap.get(item.product_id);
                }
              });
            });
          }
        } catch (enrichErr) {
          console.warn('Non-blocking product image enrichment warning:', enrichErr);
        }
      }
    }

    return NextResponse.json({ 
      orders: orders || [], 
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    });
  } catch (err: any) {
    console.error('Admin orders GET exception:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      customer_name,
      phone,
      city,
      address,
      delivery_charges = 0,
      actual_courier_cost,
      delivery_paid_by = 'customer',
      payment_method = 'Cash on Delivery',
      payment_status = 'unpaid',
      amount_paid = 0,
      notes,
      order_items,
      order_source = 'web',
    } = body;

    if (!customer_name || !phone) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!order_items || order_items.length === 0) {
      return NextResponse.json({ error: 'Order must have at least one item' }, { status: 400 });
    }

    const service = createServiceClient();

    // Calculate total amount
    const subtotal = order_items.reduce((sum: number, item: any) => sum + item.line_total, 0);
    const total_amount = subtotal + (delivery_charges || 0);

    // Generate sequential order number (STH-001, STH-002, ...)
    const { data: existingOrders } = await service
      .from('orders')
      .select('order_number')
      .not('order_number', 'is', null);

    let nextNumber = 1;
    if (existingOrders && existingOrders.length > 0) {
      const numbers = existingOrders
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

    const order_number = `STH-${String(nextNumber).padStart(3, '0')}`;

    // Create order
    const { data: order, error: orderError } = await service
      .from('orders')
      .insert({
        customer_name,
        phone,
        city,
        address,
        delivery_charges,
        actual_courier_cost: actual_courier_cost !== undefined ? actual_courier_cost : delivery_charges,
        delivery_paid_by,
        payment_method,
        payment_status,
        amount_paid,
        total_amount,
        notes,
        order_number,
        status: 'pending',
        order_source,
        admin_notification_sent: false,
        customer_notification_sent: false,
      })
      .select()
      .single();

    if (orderError) {
      console.error('Error creating order:', orderError);
      return NextResponse.json({ error: orderError.message }, { status: 500 });
    }

    // Create order items
    const itemsToInsert = order_items.map((item: any) => ({
      order_id: order.id,
      product_id: item.product_id,
      product_name: item.product_name,
      quantity: item.quantity,
      unit_price: item.unit_price,
      purchase_price: item.purchase_price || 0,
      line_total: item.line_total,
    }));

    const { error: itemsError } = await service
      .from('order_items')
      .insert(itemsToInsert);

    if (itemsError) {
      console.error('Error creating order items:', itemsError);
      await service.from('orders').delete().eq('id', order.id);
      return NextResponse.json({ error: itemsError.message }, { status: 500 });
    }

    // Fetch the complete order with items from database
    const { data: completeOrder, error: fetchError } = await service
      .from('orders')
      .select('*, order_items(*)')
      .eq('id', order.id)
      .single();

    if (fetchError) {
      console.error('Error fetching complete order:', fetchError);
      return NextResponse.json({
        success: true,
        order: { ...order, order_items: itemsToInsert }
      });
    }

    return NextResponse.json({
      success: true,
      order: completeOrder
    });
  } catch (err: any) {
    console.error('POST /api/admin/orders error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
