import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/admin/reviews?status=pending|approved|rejected&page=1&limit=20
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const status = req.nextUrl.searchParams.get('status') || 'pending';
  const page = parseInt(req.nextUrl.searchParams.get('page') || '1');
  const limit = parseInt(req.nextUrl.searchParams.get('limit') || '20');
  const from = (page - 1) * limit;

  const { data, error, count } = await supabase
    .from('product_reviews')
    .select(
      'id, product_id, customer_name, phone, rating, title, body, status, admin_reply, helpful_count, created_at, products(name, slug)',
      { count: 'exact' }
    )
    .eq('status', status)
    .order('created_at', { ascending: false })
    .range(from, from + limit - 1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ reviews: data ?? [], total: count ?? 0 });
}
