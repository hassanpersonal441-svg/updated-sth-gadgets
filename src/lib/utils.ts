import type { Coupon, Settings } from '@/types/database';

export function slugify(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

interface CouponValidationResult {
  valid: boolean;
  reason?: string;
  discountAmount: number;
}

/** Pure function: validates a coupon against an order amount and computes the discount. */
export function evaluateCoupon(coupon: Coupon | null, orderAmount: number): CouponValidationResult {
  if (!coupon) return { valid: false, reason: 'Coupon not found', discountAmount: 0 };
  if (!coupon.active) return { valid: false, reason: 'This coupon is no longer active', discountAmount: 0 };
  if (coupon.expiry_date && new Date(coupon.expiry_date) < new Date()) {
    return { valid: false, reason: 'This coupon has expired', discountAmount: 0 };
  }
  if (coupon.usage_limit != null && coupon.times_used >= coupon.usage_limit) {
    return { valid: false, reason: 'This coupon has reached its usage limit', discountAmount: 0 };
  }
  if (orderAmount < coupon.minimum_order) {
    return {
      valid: false,
      reason: `Minimum order of Rs. ${formatNumber(coupon.minimum_order)} required`,
      discountAmount: 0,
    };
  }

  let discount =
    coupon.discount_type === 'percentage'
      ? (orderAmount * coupon.discount_value) / 100
      : coupon.discount_value;

  if (coupon.maximum_discount != null) {
    discount = Math.min(discount, coupon.maximum_discount);
  }
  discount = Math.min(discount, orderAmount);

  return { valid: true, discountAmount: Math.round(discount * 100) / 100 };
}

const DEFAULT_ORDER_TEMPLATE =
  '🛍️ *STH GADGETS — NEW ORDER* 🛒\n━━━━━━━━━━━━━━━━━━━━━━━━━\n📦 *Product:* {product_name}\n💵 *Price:* {currency_symbol} {product_price}\n🔢 *Quantity:* {quantity}\n🏷️ *Discount:* {discount}\n💰 *Final Price:* {currency_symbol} {final_price}\n\n🔗 *Product Link:* {product_url}\n━━━━━━━━━━━━━━━━━━━━━━━━━\n✨ *Please confirm availability & order details. Thank you!* 🙏';

/** Builds the pre-filled WhatsApp order message and returns a wa.me deep link. */
export function buildWhatsAppOrderLink(params: {
  whatsappNumber?: string | null;
  template?: string | null;
  productName: string;
  price: number;
  quantity?: number;
  discount?: number;
  finalPrice?: number;
  productUrl?: string;
  currencySymbol?: string;
}) {
  const {
    whatsappNumber,
    template,
    productName,
    price,
    quantity = 1,
    discount = 0,
    finalPrice = price,
    productUrl = '',
    currencySymbol = 'Rs.',
  } = params;

  const rawTpl = template && template.trim() ? template : DEFAULT_ORDER_TEMPLATE;
  const tpl = rawTpl.replace(/\\n/g, '\n');

  const message = tpl
    .replaceAll('{product_name}', productName)
    .replaceAll('{product_price}', formatNumber(price))
    .replaceAll('{quantity}', String(quantity))
    .replaceAll('{discount}', discount > 0 ? `${currencySymbol} ${formatNumber(discount)}` : 'None')
    .replaceAll('{final_price}', formatNumber(finalPrice))
    .replaceAll('{product_url}', productUrl)
    .replaceAll('{currency_symbol}', currencySymbol);

  const phone = whatsappNumber && whatsappNumber.trim() ? whatsappNumber : '923489593671';
  const cleanNumber = phone.replace(/[^0-9]/g, '');
  return `https://wa.me/${cleanNumber}?text=${encodeURIComponent(message)}`;
}

export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

/**
 * Normalizes phone numbers for WhatsApp API delivery.
 */
export function normalizePhoneNumber(phone: string): string {
  if (!phone) return '';
  let cleaned = phone.replace(/[^0-9+]/g, '');

  if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1);
  }

  if (/^03\d{9}$/.test(cleaned)) {
    return '92' + cleaned.substring(1);
  }

  if (/^00923\d{9}$/.test(cleaned)) {
    return cleaned.substring(2);
  }

  return cleaned;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

/** Deterministic Date & Time formatter in Pakistan Time (PKT, UTC+5) to prevent React Hydration mismatch */
export function formatOrderDateTime(dateInput: string | Date | null | undefined): {
  date: string;
  time: string;
  full: string;
} {
  if (!dateInput) return { date: '', time: '', full: '' };
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return { date: '', time: '', full: '' };

  // Shift to Pakistan Standard Time (UTC+5)
  const pktTime = new Date(d.getTime() + 5 * 60 * 60 * 1000);
  const day = pktTime.getUTCDate();
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = monthNames[pktTime.getUTCMonth()];
  const year = pktTime.getUTCFullYear();

  let hours = pktTime.getUTCHours();
  const minutes = pktTime.getUTCMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const strHours = hours < 10 ? `0${hours}` : `${hours}`;
  const strMinutes = minutes < 10 ? `0${minutes}` : `${minutes}`;

  const dateStr = `${day} ${month} ${year}`;
  const timeStr = `${strHours}:${strMinutes} ${ampm}`;
  const fullStr = `${dateStr}, ${timeStr}`;

  return {
    date: dateStr,
    time: timeStr,
    full: fullStr,
  };
}

/** Deterministic UTC date formatter to prevent React Hydration Error between server & client */
export function formatInvoiceDate(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return '';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '';
  const day = d.getUTCDate();
  const month = MONTH_NAMES[d.getUTCMonth()];
  const year = d.getUTCFullYear();
  return `${month} ${day}, ${year}`;
}

/** Deterministic number formatter (comma separator) to prevent server/client locale mismatch */
export function formatNumber(val: number | string | null | undefined): string {
  const num = Math.round(Number(val) || 0);
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export function formatPrice(amount: number, settings?: Pick<Settings, 'currency_symbol'> | null) {
  const symbol = settings?.currency_symbol ?? 'Rs.';
  return `${symbol} ${formatNumber(amount)}`;
}

