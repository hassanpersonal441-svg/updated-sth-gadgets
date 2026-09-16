import { NextResponse, type NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/admin-guard';
import { createServiceClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const supabase = createServiceClient();

  const { data: borrowing, error } = await supabase
    .from('borrowings')
    .select('*, repayments(*)')
    .eq('id', id)
    .single();

  if (error || !borrowing) {
    return NextResponse.json({ error: 'Borrowing record not found' }, { status: 404 });
  }

  return NextResponse.json({ borrowing });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
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

    const supabase = createServiceClient();

    // Fetch existing record
    const { data: existing } = await supabase
      .from('borrowings')
      .select('borrowed_amount, total_repaid')
      .eq('id', id)
      .single();

    if (!existing) {
      return NextResponse.json({ error: 'Borrowing record not found' }, { status: 404 });
    }

    const newAmount = Number(borrowed_amount);
    if (isNaN(newAmount) || newAmount <= 0) {
      return NextResponse.json({ error: 'Borrowed Amount must be a positive number' }, { status: 400 });
    }

    if (newAmount < existing.total_repaid) {
      return NextResponse.json(
        { error: `Borrowed amount (Rs. ${newAmount}) cannot be less than total already repaid (Rs. ${existing.total_repaid})` },
        { status: 400 }
      );
    }

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

    const newRemaining = Math.max(0, newAmount - existing.total_repaid);
    let newStatus = 'active';
    if (existing.total_repaid === 0) {
      newStatus = 'active';
    } else if (newRemaining > 0) {
      newStatus = 'partially_paid';
    } else {
      newStatus = 'fully_paid';
    }

    const { data: updated, error } = await supabase
      .from('borrowings')
      .update({
        lender_name: lender_name ? lender_name.trim() : undefined,
        whatsapp_number: whatsapp_number ? whatsapp_number.trim() : undefined,
        email: email !== undefined ? (email ? email.trim() : null) : undefined,
        borrowed_amount: newAmount,
        remaining_amount: newRemaining,
        status: newStatus,
        borrowing_date: borrowing_date || undefined,
        purpose: purpose !== undefined ? (purpose ? purpose.trim() : null) : undefined,
        related_order_id: related_order_id !== undefined ? (related_order_id || null) : undefined,
        related_order_number: relatedOrderNumber,
        notes: notes !== undefined ? (notes ? notes.trim() : null) : undefined,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*, repayments(*)')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, borrowing: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update borrowing' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const supabase = createServiceClient();

  const { error } = await supabase.from('borrowings').delete().eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
