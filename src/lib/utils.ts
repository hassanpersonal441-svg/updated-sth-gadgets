import type { Coupon, Settings } from '@/types/database';

export function formatPrice(amount: number, settings?: Pick<Settings, 'currency_symbol'> | null) {
  const symbol = settings?.currency_symbol ?? 'Rs.';
  return `${symbol} ${Math.round(amount).toLocaleString('en-PK')}`;
}

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
      reason: `Minimum order of Rs. ${coupon.minimum_order.toLocaleString('en-PK')} required`,
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
  '\u{1F6CD}\u{FE0F} STH GADGETS - NEW ORDER \u{1F6D2}\n=========================\n\u{1F4E6} Product: {product_name}\n\u{1F4B5} Price: {currency_symbol} {product_price}\n\u{1F522} Quantity: {quantity}\n\u{1F39F}\u{FE0F} Discount: {discount}\n\u{1F4B0} Final Price: {currency_symbol} {final_price}\n\n\u{1F517} Link: {product_url}\n=========================\n\u{1F64F} Please confirm availability & order details. Thank you! \u{2728}';

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
    .replaceAll('{product_price}', `${price.toLocaleString('en-PK')}`)
    .replaceAll('{quantity}', String(quantity))
    .replaceAll('{discount}', discount > 0 ? `${currencySymbol} ${discount.toLocaleString('en-PK')}` : 'None')
    .replaceAll('{final_price}', finalPrice.toLocaleString('en-PK'))
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
 * Converts Pakistan numbers (e.g. 03001234567 or +923001234567) to standard international format (923001234567).
 * Retains international numbers starting with country code without leading +.
 */
export function normalizePhoneNumber(phone: string): string {
  if (!phone) return '';
  let cleaned = phone.replace(/[^0-9+]/g, '');

  if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1);
  }

  // Pakistan local format: 03XXXXXXXXX (11 digits starting with 03)
  if (/^03\d{9}$/.test(cleaned)) {
    return '92' + cleaned.substring(1);
  }

  // Pakistan 0092 format: 00923XXXXXXXXX
  if (/^00923\d{9}$/.test(cleaned)) {
    return cleaned.substring(2);
  }

  // Already clean digits
  return cleaned;
}

