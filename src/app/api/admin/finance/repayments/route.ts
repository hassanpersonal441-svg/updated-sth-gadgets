import { NextResponse, type NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/admin-guard';
import { createServiceClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const borrowingId = searchParams.get('borrowingId');

  const supabase = createServiceClient();

  let query = supabase
    .from('repayments')
    .select('*, borrowings(lender_name, whatsapp_number, borrowing_number)')
    .order('created_at', { ascending: false });

  if (borrowingId) {
    query = query.eq('borrowing_id', borrowingId);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ repayments: data || [] });
}

export async function POST(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { borrowing_id, amount, repayment_date, payment_method, notes } = body;

    if (!borrowing_id) {
      return NextResponse.json({ error: 'Borrowing ID is required' }, { status: 400 });
    }

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return NextResponse.json({ error: 'Repayment amount must be a positive number' }, { status: 400 });
    }

    if (!repayment_date) {
      return NextResponse.json({ error: 'Repayment date is required' }, { status: 400 });
    }

    const supabase = createServiceClient();

    // Fetch target borrowing to check remaining balance
    const { data: borrowing, error: fetchErr } = await supabase
      .from('borrowings')
      .select('*')
      .eq('id', borrowing_id)
      .single();

    if (fetchErr || !borrowing) {
      return NextResponse.json({ error: 'Borrowing record not found' }, { status: 404 });
    }

    const remaining = Number(borrowing.remaining_amount);
    if (numAmount > remaining + 0.01) {
      return NextResponse.json(
        { error: `Repayment amount (PKR ${numAmount.toLocaleString()}) cannot exceed remaining balance (PKR ${remaining.toLocaleString()})` },
        { status: 400 }
      );
    }

    // Insert repayment (DB trigger will auto-update total_repaid, remaining_amount, and status on borrowings table)
    const { data: repayment, error: insertErr } = await supabase
      .from('repayments')
      .insert({
        borrowing_id,
        amount: numAmount,
        repayment_date,
        payment_method: payment_method || 'Cash',
        notes: notes ? notes.trim() : null,
      })
      .select('*')
      .single();

    if (insertErr) {
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }

    // Fetch updated borrowing object
    const { data: updatedBorrowing } = await supabase
      .from('borrowings')
      .select('*, repayments(*)')
      .eq('id', borrowing_id)
      .single();

    return NextResponse.json({
      success: true,
      repayment,
      borrowing: updatedBorrowing,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to record repayment' }, { status: 500 });
  }
}
