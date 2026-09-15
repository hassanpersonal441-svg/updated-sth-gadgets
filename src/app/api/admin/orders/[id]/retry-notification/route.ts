import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import {
  triggerAdminNewOrderNotification,
  triggerCustomerApprovalNotification,
  type WhatsAppNotificationResult,
} from '@/lib/whatsapp';

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
    const { target } = body; // 'admin' or 'customer'

    const service = createServiceClient();
    const { data: order, error } = await service
      .from('orders')
      .select('*, order_items(*)')
      .eq('id', orderId)
      .single();

    if (error || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    let result: WhatsAppNotificationResult = { success: false, message: '' };

    if (target === 'admin') {
      // Force retry by resetting flag temporarily for trigger call
      result = await triggerAdminNewOrderNotification({ ...order, admin_notification_sent: false });
    } else if (target === 'customer') {
      if (order.status !== 'approved') {
        return NextResponse.json(
          { error: 'Customer approval message can only be sent for approved orders.' },
          { status: 400 }
        );
      }
      result = await triggerCustomerApprovalNotification({ ...order, customer_notification_sent: false });
    } else {
      return NextResponse.json({ error: 'Invalid retry target. Use "admin" or "customer".' }, { status: 400 });
    }

    // Refetch updated order
    const { data: refreshedOrder } = await service
      .from('orders')
      .select('*, order_items(*)')
      .eq('id', orderId)
      .single();

    return NextResponse.json({
      success: result.success,
      message: result.message || (result.success ? 'Notification sent successfully.' : 'Failed to send notification.'),
      error: result.error,
      order: refreshedOrder || order,
    });
  } catch (err: any) {
    console.error('Retry notification error:', err);
    return NextResponse.json({ error: err.message || 'Error retrying notification' }, { status: 500 });
  }
}
