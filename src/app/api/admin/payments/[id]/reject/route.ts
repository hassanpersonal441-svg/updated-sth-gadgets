import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/admin-guard';
import { createServiceClient } from '@/lib/supabase/server';

const rejectSchema = z.object({
  rejection_reason: z.string().optional(),
});

export async function POST(
  request: Request,
  { params }: { params: any }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const resolvedParams = await params;
  const paymentId = resolvedParams?.id || params?.id;

  const parsed = rejectSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }

  const service = createServiceClient();

  try {
    // Get payment details
    const { data: payment, error: paymentError } = await service
      .from('payments')
      .select('*, order:orders(*)')
      .eq('id', paymentId)
      .single();

    if (paymentError || !payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    if (payment.status === 'paid') {
      return NextResponse.json({ error: 'Payment is already verified and cannot be rejected' }, { status: 400 });
    }

    if (payment.status === 'rejected') {
      return NextResponse.json({ error: 'Payment is already rejected' }, { status: 400 });
    }

    // Reject payment using the database function
    const { data: rejectedPayment, error: rejectError } = await service
      .rpc('reject_payment', {
        p_payment_id: paymentId,
        p_rejection_reason: parsed.data.rejection_reason || null,
        p_admin_id: admin.userId,
      });

    if (rejectError) {
      console.error('Payment rejection error:', rejectError);
      return NextResponse.json({ error: rejectError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      payment: rejectedPayment,
    });
  } catch (error: any) {
    console.error('Payment rejection error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
