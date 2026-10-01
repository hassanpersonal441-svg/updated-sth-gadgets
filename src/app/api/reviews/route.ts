import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/reviews?product_id=xxx
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const productId = req.nextUrl.searchParams.get('product_id');
  if (!productId) {
    return NextResponse.json({ error: 'product_id required' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('product_reviews')
    .select('id, customer_name, rating, title, body, admin_reply, helpful_count, created_at')
    .eq('product_id', productId)
    .eq('status', 'approved')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const total = data?.length ?? 0;
  const avg =
    total > 0
      ? Math.round((data!.reduce((sum, r) => sum + r.rating, 0) / total) * 10) / 10
      : 0;

  // Count per star (1-5)
  const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  data?.forEach((r) => {
    distribution[r.rating] = (distribution[r.rating] ?? 0) + 1;
  });

  return NextResponse.json({ reviews: data ?? [], total, avg, distribution });
}

// POST /api/reviews  — customer submits a new review
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const body = await req.json();
  const { product_id, customer_name, phone, rating, title, review_body } = body;

  if (!product_id || !customer_name || !rating || !review_body) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }
  if (rating < 1 || rating > 5) {
    return NextResponse.json({ error: 'Rating must be 1–5' }, { status: 400 });
  }
  if (review_body.trim().length < 10) {
    return NextResponse.json({ error: 'Review must be at least 10 characters' }, { status: 400 });
  }

  const { error } = await supabase.from('product_reviews').insert({
    product_id,
    customer_name: customer_name.trim(),
    phone: phone?.trim() || null,
    rating,
    title: title?.trim() || null,
    body: review_body.trim(),
    status: 'pending',
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, message: 'Review submitted! It will appear after admin approval.' });
}
