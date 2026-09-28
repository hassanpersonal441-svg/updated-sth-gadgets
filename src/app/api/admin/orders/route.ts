import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 50;
    const page = searchParams.get('page') ? parseInt(searchParams.get('page')!, 10) : 1;
    const offset = (page - 1) * limit;

    const service = createServiceClient();
    
    // Primary query with deep item & product relations
    let query = service
      .from('orders')
      .select('*, order_items(*, product:products(*, product_images(*)))', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (limit && limit > 0) {
      query = query.limit(limit);
    }

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    if (search && search.trim()) {
      const q = search.trim();
      query = query.or(`customer_name.ilike.%${q}%,phone.ilike.%${q}%,order_number.ilike.%${q}%,city.ilike.%${q}%`);
    }

    let { data: orders, error, count } = await query;

    // Fallback: If deep relational query fails due to schema/relation mismatches, fallback to flat order_items
    if (error) {
      console.warn('Primary admin orders query failed, attempting fallback query:', error.message);
      
      let fallbackQuery = service
        .from('orders')
        .select('*, order_items(*)')
        .order('created_at', { ascending: false });

      if (limit && limit > 0) fallbackQuery = fallbackQuery.limit(limit);
      if (status && status !== 'all') fallbackQuery = fallbackQuery.eq('status', status);
      if (search && search.trim()) {
        const q = search.trim();
        fallbackQuery = fallbackQuery.or(`customer_name.ilike.%${q}%,phone.ilike.%${q}%,order_number.ilike.%${q}%,city.ilike.%${q}%`);
      }

      const fallbackRes = await fallbackQuery;
      orders = fallbackRes.data;
      error = fallbackRes.error;
      count = orders?.length || 0;
    }

    if (error) {
      console.error('Error fetching admin orders:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
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
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      customer_name,
      phone,
      city,
      address,
      delivery_charges = 0,
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

    // Generate order number
    const order_number = `STH-${Date.now().toString().slice(-8)}`;

    // Create order
    const { data: order, error: orderError } = await service
      .from('orders')
      .insert({
        customer_name,
        phone,
        city,
        address,
        delivery_charges,
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
      line_total: item.line_total,
    }));

    const { error: itemsError } = await service
      .from('order_items')
      .insert(itemsToInsert);

    if (itemsError) {
      console.error('Error creating order items:', itemsError);
      // Rollback order if items fail
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
      // Return the order with inserted items as fallback
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
