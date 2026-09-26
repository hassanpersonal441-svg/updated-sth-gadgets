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
