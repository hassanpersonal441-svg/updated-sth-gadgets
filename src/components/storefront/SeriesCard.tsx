'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { ProductSeries, Settings } from '@/types/database';
import { formatPrice } from '@/lib/utils';

export default function SeriesCard({
  series,
  settings,
  isLight = false,
}: {
  series: ProductSeries;
  settings?: Settings | null;
  isLight?: boolean;
}) {
  return (
    <Link
      href={`/series/${series.slug}`}
      className={`group relative flex flex-col justify-between overflow-hidden rounded-[24px] sm:rounded-[28px] border transition-all duration-400 ease-out hover:-translate-y-1.5 cursor-pointer ${
        isLight
          ? 'border-slate-300/90 bg-gradient-to-b from-white via-slate-50/80 to-slate-100/90 text-slate-900 shadow-[0_8px_30px_rgba(0,0,0,0.06)] hover:border-[#0891B2] hover:shadow-[0_20px_45px_-8px_rgba(8,145,178,0.25)]'
          : 'border-[#1E3A5F]/80 bg-gradient-to-b from-[#060F1E] via-[#050C18] to-[#02060D] text-white shadow-[0_10px_35px_rgba(0,0,0,0.7)] hover:border-[#00C4CC] hover:shadow-[0_0_35px_rgba(0,196,204,0.35)]'
      }`}
    >
      {/* Outer Glow Orbs */}
      <div className="pointer-events-none absolute -top-12 -left-12 h-28 w-28 rounded-full bg-[#00C4CC]/20 blur-2xl transition duration-500 group-hover:bg-[#00C4CC]/35" />
      <div className="pointer-events-none absolute -bottom-12 -right-12 h-28 w-28 rounded-full bg-[#0077FF]/20 blur-2xl transition duration-500 group-hover:bg-[#0077FF]/35" />

      <div className="flex flex-1 flex-col justify-between p-3.5 sm:p-4.5">
        {/* Top Header */}
        <div className="flex items-center justify-between gap-2 mb-2.5 relative z-10">
          <div className="flex items-center gap-1.5">
            <span className="font-display font-black text-xs tracking-wider uppercase bg-gradient-to-r from-white via-[#E0F7FA] to-[#00C4CC] bg-clip-text text-transparent">
              STH <span className="text-[#00C4CC]">COLLECTION</span>
            </span>
          </div>

          <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[9px] sm:text-[9.5px] font-bold shadow-sm bg-[#00C4CC]/15 text-[#00C4CC] border border-[#00C4CC]/30">
            {series.model_count || 0} Models
          </span>
        </div>

        {/* Image Stage */}
        <div className="relative aspect-square w-full overflow-hidden rounded-2xl border border-slate-200/80 dark:border-[#1E3048] bg-white p-3 sm:p-4 flex items-center justify-center shadow-[inset_0_2px_8px_rgba(0,0,0,0.04)] dark:shadow-[0_8px_25px_rgba(0,0,0,0.5)] transition duration-300">
          <div className="relative h-full w-full">
            <Image
              src={series.thumbnail_url || '/images/logo.png'}
              alt={series.name}
              fill
              className="object-contain transition-transform duration-500 ease-out group-hover:scale-108"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            />
          </div>
        </div>

        {/* Feature Icons Strip */}
        <div className="mt-3 grid grid-cols-3 gap-1.5">
          <div className={`rounded-xl border p-1.5 text-center ${isLight ? 'border-slate-200 bg-white/80' : 'border-[#152B44] bg-[#071322]/80'}`}>
            <span className="text-xs block text-[#00C4CC]">📦</span>
            <span className="block text-[8.5px] sm:text-[9px] font-bold truncate mt-0.5">Multi Models</span>
          </div>
          <div className={`rounded-xl border p-1.5 text-center ${isLight ? 'border-slate-200 bg-white/80' : 'border-[#152B44] bg-[#071322]/80'}`}>
            <span className="text-xs block text-[#00C4CC]">🛡️</span>
            <span className="block text-[8.5px] sm:text-[9px] font-bold truncate mt-0.5">100% Genuine</span>
          </div>
          <div className={`rounded-xl border p-1.5 text-center ${isLight ? 'border-slate-200 bg-white/80' : 'border-[#152B44] bg-[#071322]/80'}`}>
            <span className="text-xs block text-[#00C4CC]">⚡</span>
            <span className="block text-[8.5px] sm:text-[9px] font-bold truncate mt-0.5">Official Rate</span>
          </div>
        </div>

        {/* Meta & Details */}
        <div className="mt-3 space-y-1.5">
          <span className="font-display text-[9px] sm:text-[9.5px] font-black uppercase tracking-widest text-[#00C4CC] truncate block">
            {series.brand || 'PRODUCT SERIES'}
          </span>

          <h3 className={`line-clamp-2 font-display text-xs sm:text-sm font-black leading-snug transition-colors duration-200 min-h-[2.3rem] ${isLight ? 'text-slate-900 group-hover:text-[#0891B2]' : 'text-white group-hover:text-[#00C4CC]'}`}>
            {series.name}
          </h3>

          <p className="text-[10px] sm:text-[11px] text-slate-400 line-clamp-1">
            {series.description || 'Explore all models & variants in this series.'}
          </p>

          <div className="pt-2">
            {series.min_price ? (
              <span className={`font-display text-lg sm:text-xl font-black tracking-tight ${isLight ? 'text-slate-950' : 'text-white'}`}>
                From {formatPrice(series.min_price, settings)}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {/* Explore Button */}
      <div className="p-3 sm:p-4 pt-0">
        <div className="w-full flex items-center justify-center gap-2 rounded-xl sm:rounded-2xl bg-gradient-to-r from-[#0066FF] via-[#00C4CC] to-[#0066FF] hover:brightness-110 text-white font-display text-xs sm:text-sm font-black py-2.5 sm:py-3 px-4 shadow-[0_0_20px_rgba(0,196,204,0.4)] transition-all duration-300 group-hover:scale-[1.02]">
          <span>Explore Series Models &gt;</span>
        </div>
      </div>
    </Link>
  );
}
