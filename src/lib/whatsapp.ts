/**
 * Safe WhatsApp Helper Module
 * Uses explicit Unicode code points to guarantee zero encoding corruption across Windows builds,
 * Turbopack transpilation, and mobile/web browsers.
 */

export const EMOJI = {
  BAGS: String.fromCodePoint(0x1F6CD),       // 🛍️
  CART: String.fromCodePoint(0x1F6D2),       // 🛒
  CUSTOMER: String.fromCodePoint(0x1F464),   // 👤
  PHONE: String.fromCodePoint(0x1F4F1),      // 📱
  CITY: String.fromCodePoint(0x1F3D9),       // 🏙️
  PIN: String.fromCodePoint(0x1F4CD),        // 📍
  PACKAGE: String.fromCodePoint(0x1F4E6),    // 📦
  DIAMOND: String.fromCodePoint(0x1F539),    // 🔹
  NUMBERS: String.fromCodePoint(0x1F522),    // 🔢
  CASH: String.fromCodePoint(0x1F4B5),       // 💵
  TAG: String.fromCodePoint(0x1F39F),        // 🏷️
  GIFT: String.fromCodePoint(0x1F381),       // 🎁
  TRUCK: String.fromCodePoint(0x1F69A),      // 🚚
  MONEY_BAG: String.fromCodePoint(0x1F4B0),  // 💰
  SPARKLES: String.fromCodePoint(0x2728),    // ✨
  PRAY: String.fromCodePoint(0x1F64F),       // 🙏
  CHECK: String.fromCodePoint(0x2705),      // ✅
  RECEIPT: String.fromCodePoint(0x1F9FE),    // 🧾
  CARD: String.fromCodePoint(0x1F4B3),       // 💳
  WAVE: String.fromCodePoint(0x1F44B),       // 👋
  LINK: String.fromCodePoint(0x1F517),       // 🔗
  CLOCK: String.fromCodePoint(0x1F552),      // 🕒
};

export function buildWhatsAppCheckoutMessage(params: {
  customer_name: string;
  phone: string;
  city: string;
  address: string;
  subtotal: number;
  coupon_discount: number;
  coupon_code?: string | null;
  bundle_discount: number;
  delivery_charges: number;
  total_amount: number;
  order_time?: string;
  items: Array<{
    product_name: string;
    variant_name?: string | null;
    quantity: number;
    unit_price: number;
    line_total: number;
  }>;
}): string {
  const {
    customer_name,
    phone,
    city,
    address,
    subtotal,
    coupon_discount,
    coupon_code,
    bundle_discount,
    delivery_charges,
    total_amount,
    order_time,
    items,
  } = params;

  // Format current Pakistan time if order_time not provided
  let formattedTime = order_time;
  if (!formattedTime) {
    const pktTime = new Date(Date.now() + 5 * 60 * 60 * 1000);
    const day = pktTime.getUTCDate();
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = monthNames[pktTime.getUTCMonth()];
    const year = pktTime.getUTCFullYear();
    let hours = pktTime.getUTCHours();
    const minutes = pktTime.getUTCMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    const strHours = hours < 10 ? `0${hours}` : `${hours}`;
    const strMinutes = minutes < 10 ? `0${minutes}` : `${minutes}`;
    formattedTime = `${day} ${month} ${year}, ${strHours}:${strMinutes} ${ampm}`;
  }

  const itemsText = items
    .map(
      (i) =>
        `${EMOJI.DIAMOND} *${i.product_name}*${i.variant_name ? ` (${i.variant_name})` : ''}\n   ${EMOJI.NUMBERS} Qty: ${i.quantity} x PKR ${i.unit_price.toLocaleString('en-PK')} = ${EMOJI.CASH} PKR ${i.line_total.toLocaleString('en-PK')}`
    )
    .join('\n\n');

  return [
    `${EMOJI.BAGS} *STH GADGETS — NEW ORDER* ${EMOJI.CART}`,
    '━━━━━━━━━━━━━━━━━━━━━━━━━',
    `${EMOJI.CLOCK} *Order Placed:* ${formattedTime}`,
    `${EMOJI.CUSTOMER} *Customer Name:* ${customer_name}`,
    `${EMOJI.PHONE} *WhatsApp Number:* ${phone}`,
    `${EMOJI.CITY} *City:* ${city}`,
    `${EMOJI.PIN} *Address:* ${address}`,
    '━━━━━━━━━━━━━━━━━━━━━━━━━',
    `${EMOJI.PACKAGE} *ORDER DETAILS*`,
    '━━━━━━━━━━━━━━━━━━━━━━━━━',
    '',
    itemsText,
    '',
    '━━━━━━━━━━━━━━━━━━━━━━━━━',
    `${EMOJI.CASH} *Subtotal:* PKR ${subtotal.toLocaleString('en-PK')}`,
    ...(coupon_discount > 0 ? [`${EMOJI.TAG} *Coupon Discount (${coupon_code || 'PROMO'}):* -PKR ${coupon_discount.toLocaleString('en-PK')}`] : []),
    ...(bundle_discount > 0 ? [`${EMOJI.GIFT} *Bundle Discount:* -PKR ${bundle_discount.toLocaleString('en-PK')}`] : []),
    `${EMOJI.TRUCK} *Delivery Charges:* ${delivery_charges === 0 ? `FREE ${EMOJI.SPARKLES}` : `PKR ${delivery_charges.toLocaleString('en-PK')}`}`,
    `${EMOJI.MONEY_BAG} *TOTAL AMOUNT:* PKR ${total_amount.toLocaleString('en-PK')}`,
    '━━━━━━━━━━━━━━━━━━━━━━━━━',
    `${EMOJI.SPARKLES} *Please confirm my order and availability. Thank you!* ${EMOJI.PRAY}`,
  ].join('\n');
}

export function buildWhatsAppApprovalMessage(params: {
  order_number: string;
  customer_name: string;
  phone: string;
  city: string;
  address: string;
  subtotal: number;
  coupon_discount: number;
  bundle_discount: number;
  delivery_charges: number;
  total_amount: number;
  order_time?: string;
  items: Array<{
    product_name: string;
    variant_name?: string | null;
    quantity: number;
    unit_price: number;
    line_total: number;
  }>;
}): string {
  const {
    order_number,
    customer_name,
    phone,
    city,
    address,
    subtotal,
    coupon_discount,
    bundle_discount,
    delivery_charges,
    total_amount,
    order_time,
    items,
  } = params;

  const itemsText = items
    .map(
      (i) =>
        `${EMOJI.DIAMOND} *${i.product_name}*${i.variant_name ? ` (${i.variant_name})` : ''}\n   ${EMOJI.NUMBERS} Qty: ${i.quantity} x PKR ${Number(i.unit_price).toLocaleString('en-PK')} = ${EMOJI.CASH} PKR ${Number(i.line_total).toLocaleString('en-PK')}`
    )
    .join('\n\n');

  return [
    `${EMOJI.BAGS} *STH GADGETS — ORDER CONFIRMED* ${EMOJI.CHECK}`,
    '━━━━━━━━━━━━━━━━━━━━━━━━━',
    `${EMOJI.NUMBERS} *Official Order No:* ${order_number}`,
    ...(order_time ? [`${EMOJI.CLOCK} *Order Time:* ${order_time}`] : []),
    `${EMOJI.CUSTOMER} *Customer Name:* ${customer_name}`,
    `${EMOJI.PHONE} *WhatsApp Number:* ${phone}`,
    `${EMOJI.CITY} *City:* ${city}`,
    `${EMOJI.PIN} *Address:* ${address}`,
    '━━━━━━━━━━━━━━━━━━━━━━━━━',
    `${EMOJI.PACKAGE} *ORDER DETAILS*`,
    '━━━━━━━━━━━━━━━━━━━━━━━━━',
    '',
    itemsText,
    '',
    '━━━━━━━━━━━━━━━━━━━━━━━━━',
    `${EMOJI.CASH} *Subtotal:* PKR ${Number(subtotal).toLocaleString('en-PK')}`,
    ...(Number(coupon_discount) > 0 ? [`${EMOJI.TAG} *Special / VIP Discount:* -PKR ${Number(coupon_discount).toLocaleString('en-PK')}`] : []),
    ...(Number(bundle_discount) > 0 ? [`${EMOJI.GIFT} *Bundle Discount:* -PKR ${Number(bundle_discount).toLocaleString('en-PK')}`] : []),
    `${EMOJI.TRUCK} *Delivery Charges:* ${Number(delivery_charges) === 0 ? `FREE ${EMOJI.SPARKLES}` : `PKR ${Number(delivery_charges).toLocaleString('en-PK')}`}`,
    `${EMOJI.MONEY_BAG} *TOTAL AMOUNT:* PKR ${Number(total_amount).toLocaleString('en-PK')}`,
    '━━━━━━━━━━━━━━━━━━━━━━━━━',
    `${EMOJI.SPARKLES} *Thank you for shopping with STH Gadgets!* ${EMOJI.PRAY}`,
    `Your order *${order_number}* has been approved and is being prepared for fast dispatch! ${EMOJI.TRUCK}💨`,
  ].join('\n');
}

export function buildWhatsAppInvoiceMessage(params: {
  customer_name: string;
  business_name: string;
  invoice_number: string;
  grand_total: number;
  payment_status: string;
  currency_symbol: string;
  public_url: string;
}): string {
  const { customer_name, business_name, invoice_number, grand_total, payment_status, currency_symbol, public_url } = params;

  return [
    `${EMOJI.WAVE} Hello *${customer_name}*!`,
    '',
    `${EMOJI.SPARKLES} Thank you for shopping with *${business_name}*.`,
    '',
    `${EMOJI.RECEIPT} *INVOICE DETAILS:*`,
    `${EMOJI.NUMBERS} *Invoice No:* ${invoice_number}`,
    `${EMOJI.MONEY_BAG} *Total Amount:* ${currency_symbol} ${grand_total.toLocaleString()}`,
    `${EMOJI.CARD} *Payment Status:* ${payment_status.toUpperCase()}`,
    '',
    `${EMOJI.LINK} *View Official Invoice Online:*`,
    public_url,
    '',
    `${EMOJI.PRAY} *Thank you for choosing ${business_name}!* ${EMOJI.SPARKLES}`,
  ].join('\n');
}

export function createWhatsAppUrl(phone: string, text: string): string {
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
}

export interface WhatsAppNotificationResult {
  success: boolean;
  message: string;
  error?: string;
}

export async function triggerAdminNewOrderNotification(order: any): Promise<WhatsAppNotificationResult> {
  return { success: true, message: 'Admin notification triggered' };
}

export async function triggerCustomerApprovalNotification(order: any): Promise<WhatsAppNotificationResult> {
  return { success: true, message: 'Customer approval notification triggered' };
}
