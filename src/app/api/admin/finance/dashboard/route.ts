import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-guard';
import { createServiceClient } from '@/lib/supabase/server';

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServiceClient();

  const { data: borrowings, error } = await supabase
    .from('borrowings')
    .select('*, repayments(*)')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const list = borrowings || [];
  let totalBorrowed = 0;
  let totalRepaid = 0;
  let totalOutstanding = 0;
  let activeCount = 0;
  let partiallyPaidCount = 0;
  let fullyPaidCount = 0;

  list.forEach((item) => {
    const borrowed = Number(item.borrowed_amount) || 0;
    const repaid = Number(item.total_repaid) || 0;
    const remaining = Number(item.remaining_amount) || 0;

    totalBorrowed += borrowed;
    totalRepaid += repaid;
    totalOutstanding += remaining;

    if (item.status === 'active') activeCount++;
    else if (item.status === 'partially_paid') partiallyPaidCount++;
    else if (item.status === 'fully_paid') fullyPaidCount++;
  });

  // Recent 5 Repayments
  const { data: recentRepayments } = await supabase
    .from('repayments')
    .select('*, borrowings(lender_name, whatsapp_number, borrowing_number)')
    .order('created_at', { ascending: false })
    .limit(5);

  return NextResponse.json({
    summary: {
      totalBorrowed,
      totalRepaid,
      totalOutstanding,
      activeCount,
      partiallyPaidCount,
      fullyPaidCount,
      recentBorrowings: list.slice(0, 5),
      recentRepayments: recentRepayments || [],
    },
  });
}
