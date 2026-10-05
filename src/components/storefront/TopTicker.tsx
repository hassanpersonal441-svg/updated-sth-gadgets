'use client';

import type { Settings } from '@/types/database';

export default function TopTicker({ settings }: { settings: Settings | null }) {
  const phone = settings?.whatsapp_number || '+92 348 9593671';
  const cleanPhone = phone.replace(/[^\d+]/g, '');
  const freeShippingThreshold = settings?.free_shipping_threshold ?? 5000;

  const items = [
    { icon: '⚡', text: 'Official Tech & Best Guaranteed Rates' },
    { icon: '🛡️', text: '100% Guaranteed Authentic Gadgets' },
    {
      icon: '🚚',
      text: freeShippingThreshold > 0
        ? `FREE Nationwide Delivery Above Rs. ${freeShippingThreshold.toLocaleString('en-PK')}`
        : 'Fast 2–4 Days Nationwide Delivery',
    },
    { icon: '💬', text: `WhatsApp Orders & Support: ${phone}`, isPhone: true },
    { icon: '💵', text: 'Cash on Delivery Available Pakistan-Wide' },
  ];

  return (
    <div
      className="relative z-40 overflow-hidden bg-gradient-to-r from-[#00C4CC] via-[#00E5FF] to-[#00C4CC] py-1 sm:py-1.5 text-[#04080F] shadow-[0_1px_10px_rgba(0,196,204,0.25)] select-none border-b border-[#00B4BC]/40"
      suppressHydrationWarning
    >
      <div className="animate-marquee whitespace-nowrap text-[10px] sm:text-[11px] font-black tracking-wider flex items-center">
        {[0, 1].map((groupIndex) => (
          <div key={groupIndex} className="flex items-center">
            {items.map((item, idx) => (
              <span key={idx} className="mx-4 sm:mx-6 inline-flex items-center gap-1.5">
                <span className="text-[11px] sm:text-xs">{item.icon}</span>
                {item.isPhone ? (
                  <a
                    href={`https://wa.me/${cleanPhone.replace('+', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline font-black text-[#04080F] transition duration-200"
                  >
                    {item.text}
                  </a>
                ) : (
                  <span className="font-extrabold text-[#04080F]">{item.text}</span>
                )}
                <span className="opacity-40 text-[#04080F] text-[10px] font-bold">✦</span>
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
