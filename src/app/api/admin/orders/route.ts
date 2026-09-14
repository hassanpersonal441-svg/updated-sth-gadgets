import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : undefined;

    const service = createServiceClient();
    let query = service
      .from('orders')
      .select('*, order_items(*)')
      .order('created_at', { ascending: false });

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

    const { data: orders, error } = await query;

    if (error) {
      console.error('Error fetching admin orders:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ orders: orders || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
