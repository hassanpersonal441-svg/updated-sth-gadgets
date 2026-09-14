'use client';

import { buildWhatsAppOrderLink } from '@/lib/utils';
import type { Settings } from '@/types/database';

export default function OrderOnWhatsAppButton({
  settings,
  productId,
  productName,
  price,
  quantity = 1,
  discount = 0,
  finalPrice,
  productUrl,
  className,
  compact = false,
}: {
  settings: Settings | null;
  productId: string;
  productName: string;
  price: number;
  quantity?: number;
  discount?: number;
  finalPrice: number;
  productUrl: string;
  className?: string;
  compact?: boolean;
}) {
  const phone = settings?.whatsapp_number && settings.whatsapp_number.trim()
    ? settings.whatsapp_number
    : '+92 348 9593671';

  const link = buildWhatsAppOrderLink({
    whatsappNumber: phone,
    template: settings?.order_message_template || null,
    productName,
    price,
    quantity,
    discount,
    finalPrice: finalPrice ?? price,
    productUrl,
    currencySymbol: settings?.currency_symbol || 'Rs.',
  });

  function trackClick() {
    fetch('/api/analytics/whatsapp-click', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product_id: productId }),
    }).catch(() => {});
  }

  return (
    <a
      href={link}
      target="_blank"
      rel="noopener noreferrer"
      onClick={trackClick}
      className={
        className ||
        `flex items-center justify-center gap-2 rounded-xl bg-[#25D366] hover:bg-[#20BD5A] font-display font-bold text-white shadow-sm transition hover:scale-[1.01] ${
          compact ? 'px-3 py-2 text-xs' : 'px-5 py-3 text-sm'
        }`
      }
    >
      <svg viewBox="0 0 32 32" className={compact ? 'h-4 w-4 fill-white' : 'h-5 w-5 fill-white'}>
        <path d="M16.001 3C9.373 3 4 8.373 4 15c0 2.34.687 4.52 1.872 6.35L4 29l7.86-1.83A11.94 11.94 0 0016 27c6.627 0 12-5.373 12-12S22.628 3 16.001 3z" />
      </svg>
      <span>Order on WhatsApp</span>
    </a>
  );
}
