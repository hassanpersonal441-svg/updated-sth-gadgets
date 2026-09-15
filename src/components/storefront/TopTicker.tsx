'use client';

import type { Settings } from '@/types/database';

export default function TopTicker({ settings }: { settings: Settings | null }) {
  const phone = settings?.whatsapp_number || '+92 348 9593671';
  const cleanPhone = phone.replace(/[^\d+]/g, '');

  const items = [
    '⚡ Best Rates on Fast Chargers, Earbuds, Smart Watches & Power Banks',
    '🛡️ 100% Original Products Guaranteed',
    '🚚 2–4 Day Nationwide Fast Delivery',
    `💬 WhatsApp Orders: ${phone}`,
  ];

  return (
    <div className="relative overflow-hidden bg-[#00C4CC] py-2 text-slate-950 select-none shadow-sm z-40">
      <div className="animate-marquee whitespace-nowrap text-xs font-black tracking-wide flex items-center">
        {[0, 1, 2].map((groupIndex) => (
          <div key={groupIndex} className="flex items-center">
            {items.map((text, idx) => (
              <span key={idx} className="mx-6 inline-flex items-center gap-2">
                {text.includes('WhatsApp Orders') ? (
                  <a
                    href={`https://wa.me/${cleanPhone.replace('+', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline font-extrabold"
                  >
                    {text}
                  </a>
                ) : (
                  text
                )}
                <span className="opacity-40 text-slate-900">✦</span>
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
