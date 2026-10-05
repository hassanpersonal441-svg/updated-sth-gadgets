'use client';

import { useEffect, useState } from 'react';

interface FlashSaleBannerProps {
  onShopDeals?: () => void;
  isLight?: boolean;
}

export default function FlashSaleBanner({ onShopDeals, isLight = false }: FlashSaleBannerProps) {
  const [timeLeft, setTimeLeft] = useState<{ hours: number; minutes: number; seconds: number }>({
    hours: 5,
    minutes: 24,
    seconds: 18,
  });
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);

    function getTimeRemaining() {
      const now = new Date();
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);
      const diff = Math.max(0, endOfDay.getTime() - now.getTime());

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      return { hours, minutes, seconds };
    }

    setTimeLeft(getTimeRemaining());
    const timer = setInterval(() => {
      setTimeLeft(getTimeRemaining());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const pad = (n: number) => n.toString().padStart(2, '0');

  return (
    <div
      className={`relative overflow-hidden rounded-xl border px-3.5 sm:px-5 py-2.5 sm:py-3 transition-all duration-300 ${
        isLight
          ? 'border-cyan-200/90 bg-gradient-to-r from-cyan-50/80 via-white to-cyan-50/80 text-slate-900 shadow-sm'
          : 'border-[#00C4CC]/30 bg-gradient-to-r from-[#060F1E] via-[#09182B] to-[#060F1E] text-white shadow-[0_0_25px_rgba(0,196,204,0.12)]'
      }`}
    >
      {/* Subtle Cyan Ambient Glow */}
      <div className="pointer-events-none absolute -top-10 -right-10 h-24 w-24 rounded-full bg-[#00C4CC]/15 blur-2xl" />

      <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Left Side: Badge + Headline */}
        <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap justify-center sm:justify-start">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#00C4CC]/15 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-[#00C4CC] border border-[#00C4CC]/35 shadow-[0_0_10px_rgba(0,196,204,0.25)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#00C4CC] animate-pulse" />
            <span>⚡ Flash Deals</span>
          </span>

          <div className="flex items-center gap-2 text-xs sm:text-sm font-black">
            <span className={isLight ? 'text-slate-900' : 'text-white'}>
              Limited Stock Tech Sale
            </span>
            <span className="text-[#00C4CC] font-black">•</span>
            <span className="text-[#00C4CC] font-bold text-xs">Up to 40% OFF</span>
          </div>
        </div>

        {/* Right Side: Digital Cyber Timer + CTA Button */}
        <div className="flex items-center gap-3">
          {/* Cyber Countdown Clock */}
          <div className="flex items-center gap-1 font-mono text-xs font-black" suppressHydrationWarning>
            <span
              className={`rounded-md px-1.5 py-0.5 border ${
                isLight
                  ? 'border-slate-300 bg-white text-slate-900 shadow-sm'
                  : 'border-[#1E3A5F] bg-[#030A14] text-[#00C4CC] shadow-inner'
              }`}
              suppressHydrationWarning
            >
              {pad(timeLeft.hours)}h
            </span>
            <span className="text-[#00C4CC] font-black">:</span>
            <span
              className={`rounded-md px-1.5 py-0.5 border ${
                isLight
                  ? 'border-slate-300 bg-white text-slate-900 shadow-sm'
                  : 'border-[#1E3A5F] bg-[#030A14] text-[#00C4CC] shadow-inner'
              }`}
              suppressHydrationWarning
            >
              {pad(timeLeft.minutes)}m
            </span>
            <span className="text-[#00C4CC] font-black">:</span>
            <span
              className={`rounded-md px-1.5 py-0.5 border ${
                isLight
                  ? 'border-slate-300 bg-white text-slate-900 shadow-sm'
                  : 'border-[#00C4CC]/50 bg-[#030A14] text-white shadow-[0_0_8px_rgba(0,196,204,0.3)] animate-pulse'
              }`}
              suppressHydrationWarning
            >
              {pad(timeLeft.seconds)}s
            </span>
          </div>

          {/* Action Button */}
          {onShopDeals && (
            <button
              type="button"
              onClick={onShopDeals}
              className="flex items-center gap-1 rounded-lg bg-gradient-to-r from-[#0066FF] via-[#00C4CC] to-[#0066FF] hover:brightness-110 text-white font-display text-[11px] font-black px-3 py-1 shadow-[0_0_12px_rgba(0,196,204,0.35)] transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer shrink-0"
            >
              <span>Explore Deals</span>
              <span>→</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
