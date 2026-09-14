import { createServiceClient } from '@/lib/supabase/server';
import { normalizePhoneNumber } from '@/lib/utils';
import type { Order, OrderItem } from '@/types/database';

export interface WhatsAppNotificationResult {
  success: boolean;
  message?: string;
  error?: string;
}

/**
 * Triggers Make.com Scenario 1 (New Order -> Admin Notification)
 * Enforces duplicate protection by checking and updating `admin_notification_sent`.
 */
export async function triggerAdminNewOrderNotification(
  order: Order & { order_items?: OrderItem[] }
): Promise<WhatsAppNotificationResult> {
  const supabase = createServiceClient();

  // 1. Idempotency Check: Don't re-send if already sent
  if (order.admin_notification_sent) {
    return { success: true, message: 'Admin notification already sent previously.' };
  }

  const makeWebhookUrl =
    process.env.MAKE_NEW_ORDER_WEBHOOK_URL || process.env.MAKE_WEBHOOK_URL;

  // Retrieve admin phone from env or database settings fallback
  let adminPhone = process.env.ADMIN_WHATSAPP_NUMBER || '';
  if (!adminPhone) {
    const { data: settings } = await supabase
      .from('settings')
      .select('whatsapp_number')
      .eq('id', 1)
      .maybeSingle();
    adminPhone = settings?.whatsapp_number || '923489593671';
  }

  const normalizedAdminPhone = normalizePhoneNumber(adminPhone);
  const normalizedCustomerPhone = normalizePhoneNumber(order.phone);

  // Format products list
  const productsText = (order.order_items || [])
    .map(
      (item) =>
        `🔹 ${item.product_name}${item.variant_name ? ` (${item.variant_name})` : ''} x${item.quantity} (Rs. ${Number(item.line_total).toLocaleString('en-PK')})`
    )
    .join('\n');

  const formattedAddress = `${order.address}, ${order.city}`;

  const messageText = [
    '🛒 STH GADGETS — NEW ORDER 🛍️',
    '',
    `🏷️ Order: #${order.order_number || order.id.slice(0, 8)}`,
    '',
    '👤 Customer:',
    order.customer_name,
    '',
    '📱 Phone:',
    order.phone,
    '',
    '📦 Products:',
    productsText || 'Order items',
    '',
    '💰 Total:',
    `Rs. ${Number(order.total_amount).toLocaleString('en-PK')}`,
    '',
    '📍 Address:',
    formattedAddress,
    '',
    '⏳ Status:',
    'PENDING ⏳',
    '',
    '📲 Please open the STH Gadgets Admin Panel to review this order.',
  ].join('\n');

  const payload = {
    event: 'new_order',
    order_id: order.id,
    order_number: order.order_number || order.id.slice(0, 8),
    admin_phone: normalizedAdminPhone,
    customer_name: order.customer_name,
    customer_phone: normalizedCustomerPhone,
    raw_customer_phone: order.phone,
    products: productsText,
    items: order.order_items || [],
    total_amount: Number(order.total_amount),
    formatted_total: `Rs. ${Number(order.total_amount).toLocaleString('en-PK')}`,
    customer_address: formattedAddress,
    city: order.city,
    status: 'PENDING',
    message_text: messageText,
    created_at: order.created_at,
  };

  try {
    if (makeWebhookUrl) {
      const response = await fetch(makeWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        console.error('Make.com new order webhook HTTP error:', response.status);
        return {
          success: false,
          error: `Make.com webhook error HTTP ${response.status}`,
        };
      }
    } else {
      console.warn(
        'MAKE_NEW_ORDER_WEBHOOK_URL or MAKE_WEBHOOK_URL environment variable is not configured. Webhook payload prepared:',
        payload
      );
    }

    // Update Supabase idempotency flag safely
    await supabase
      .from('orders')
      .update({ admin_notification_sent: true, updated_at: new Date().toISOString() })
      .eq('id', order.id);

    return { success: true, message: 'Admin notification triggered successfully.' };
  } catch (err: any) {
    console.error('Failed to send admin notification:', err);
    // Return error without breaking order flow
    return { success: false, error: err.message || 'Network error triggering webhook' };
  }
}

/**
 * Triggers Make.com Scenario 2 (Order Approved -> Customer Notification)
 * Enforces duplicate protection by checking and updating `customer_notification_sent`.
 */
export async function triggerCustomerApprovalNotification(
  order: Order
): Promise<WhatsAppNotificationResult> {
  const supabase = createServiceClient();

  // 1. Idempotency Check: Don't re-send if already sent or if status is not approved
  if (order.customer_notification_sent) {
    return { success: true, message: 'Customer approval notification already sent previously.' };
  }

  if (order.status !== 'approved') {
    return { success: false, error: 'Cannot send customer approval message for unapproved order.' };
  }

  const makeWebhookUrl =
    process.env.MAKE_ORDER_APPROVED_WEBHOOK_URL || process.env.MAKE_WEBHOOK_URL;

  const normalizedCustomerPhone = normalizePhoneNumber(order.phone);

  const messageText = [
    '🎉 STH GADGETS',
    '',
    `Assalam-o-Alaikum ${order.customer_name}!`,
    '',
    `Your order #${order.order_number || order.id.slice(0, 8)} has been APPROVED ✅`,
    '',
    '📦 Order Total:',
    `Rs. ${Number(order.total_amount).toLocaleString('en-PK')}`,
    '',
    'Thank you for shopping with STH Gadgets.',
    'We will contact you regarding delivery soon. 📦',
  ].join('\n');

  const payload = {
    event: 'order_approved',
    order_id: order.id,
    order_number: order.order_number || order.id.slice(0, 8),
    customer_name: order.customer_name,
    customer_phone: normalizedCustomerPhone,
    raw_customer_phone: order.phone,
    total_amount: Number(order.total_amount),
    formatted_total: `Rs. ${Number(order.total_amount).toLocaleString('en-PK')}`,
    status: 'APPROVED',
    message_text: messageText,
    approved_at: order.approved_at || new Date().toISOString(),
  };

  try {
    if (makeWebhookUrl) {
      const response = await fetch(makeWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        console.error('Make.com order approved webhook HTTP error:', response.status);
        return {
          success: false,
          error: `Make.com webhook error HTTP ${response.status}`,
        };
      }
    } else {
      console.warn(
        'MAKE_ORDER_APPROVED_WEBHOOK_URL or MAKE_WEBHOOK_URL environment variable is not configured. Webhook payload prepared:',
        payload
      );
    }

    // Update Supabase idempotency flag safely
    await supabase
      .from('orders')
      .update({ customer_notification_sent: true, updated_at: new Date().toISOString() })
      .eq('id', order.id);

    return { success: true, message: 'Customer approval notification triggered successfully.' };
  } catch (err: any) {
    console.error('Failed to send customer approval notification:', err);
    return { success: false, error: err.message || 'Network error triggering webhook' };
  }
}
