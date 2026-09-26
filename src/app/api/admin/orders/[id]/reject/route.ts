import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(
  request: Request,
  { params }: { params: any }
) {
  try {
    const resolvedParams = await params;
    const orderId = resolvedParams?.id || params?.id;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized: Admin login required' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const adminNotes = body.admin_notes || null;

    const service = createServiceClient();

    const updateData: any = {
      status: 'rejected',
      rejected_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (adminNotes !== null) {
      updateData.admin_notes = adminNotes;
    }

    const { data: updatedOrder, error } = await service
      .from('orders')
      .update(updateData)
      .eq('id', orderId)
      .select('*, order_items(*)')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message || 'Failed to reject order' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      order: updatedOrder,
      message: 'Order rejected successfully.',
    });
  } catch (err: any) {
    console.error('Reject order error:', err);
    return NextResponse.json({ error: err.message || 'Error rejecting order' }, { status: 500 });
  }
}
