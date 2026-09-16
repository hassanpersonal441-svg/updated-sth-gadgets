import { NextResponse, type NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/admin-guard';
import { createServiceClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q')?.trim() || '';
  const status = searchParams.get('status')?.trim() || '';
  const startDate = searchParams.get('startDate')?.trim() || '';
  const endDate = searchParams.get('endDate')?.trim() || '';

  const supabase = createServiceClient();

  let dbQuery = supabase
    .from('borrowings')
    .select('*, repayments(*)')
    .order('created_at', { ascending: false });

  if (status && ['active', 'partially_paid', 'fully_paid'].includes(status)) {
    dbQuery = dbQuery.eq('status', status);
  }

  if (startDate) {
    dbQuery = dbQuery.gte('borrowing_date', startDate);
  }

  if (endDate) {
    dbQuery = dbQuery.lte('borrowing_date', endDate);
  }

  if (query) {
    // Search across lender_name, whatsapp_number, email, borrowing_number, related_order_number
    dbQuery = dbQuery.or(
      `lender_name.ilike.%${query}%,whatsapp_number.ilike.%${query}%,email.ilike.%${query}%,borrowing_number.ilike.%${query}%,related_order_number.ilike.%${query}%`
    );
  }

  const { data, error } = await dbQuery;

  if (error) {
    console.error('Error fetching borrowings:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ borrowings: data || [] });
}

export async function POST(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      lender_name,
      whatsapp_number,
      email,
      borrowed_amount,
      borrowing_date,
      purpose,
      related_order_id,
      notes,
    } = body;

    if (!lender_name || !lender_name.trim()) {
      return NextResponse.json({ error: 'Lender Name is required' }, { status: 400 });
    }

    if (!whatsapp_number || !whatsapp_number.trim()) {
      return NextResponse.json({ error: 'WhatsApp Number is required' }, { status: 400 });
    }

    const numAmount = Number(borrowed_amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return NextResponse.json({ error: 'Borrowed Amount must be a positive number' }, { status: 400 });
    }

    if (!borrowing_date) {
      return NextResponse.json({ error: 'Borrowing Date is required' }, { status: 400 });
    }

    const supabase = createServiceClient();

    let relatedOrderNumber: string | null = null;
    if (related_order_id) {
      const { data: order } = await supabase
        .from('orders')
        .select('order_number, id')
        .eq('id', related_order_id)
        .maybeSingle();

      if (order) {
        relatedOrderNumber = order.order_number || `#ORD-${order.id.slice(0, 6)}`;
      }
    }

    const { data: newBorrowing, error } = await supabase
      .from('borrowings')
      .insert({
        lender_name: lender_name.trim(),
        whatsapp_number: whatsapp_number.trim(),
        email: email ? email.trim() : null,
        borrowed_amount: numAmount,
        total_repaid: 0,
        remaining_amount: numAmount,
        borrowing_date,
        purpose: purpose ? purpose.trim() : null,
        related_order_id: related_order_id || null,
        related_order_number: relatedOrderNumber,
        notes: notes ? notes.trim() : null,
        status: 'active',
      })
      .select('*, repayments(*)')
      .single();

    if (error) {
      console.error('Error creating borrowing:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, borrowing: newBorrowing });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Invalid request' }, { status: 500 });
  }
}
