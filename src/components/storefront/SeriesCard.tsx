'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { ProductSeries, Settings } from '@/types/database';
import { formatPrice } from '@/lib/utils';

export default function SeriesCard({ series, settings, isLight = false }: { series: ProductSeries; settings?: Settings | null; isLight?: boolean }) {
  return <Link href={`/series/${series.slug}`} className={`group overflow-hidden rounded-2xl border transition-all duration-500 ease-out hover:-translate-y-2 hover:border-[#00C4CC] hover:shadow-[0_12px_40px_rgba(0,196,204,0.4)] ${isLight ? 'border-slate-200 bg-white' : 'border-slate-800 bg-[#0C1420]'}`}>
    <div className="relative aspect-square bg-black/20 overflow-hidden">
      <div className="relative w-full h-full">
        <Image src={series.thumbnail_url || '/images/logo.png'} alt={series.name} fill sizes="(max-width: 640px) 50vw, 25vw" className="object-contain p-4 transition-all duration-700 ease-out group-hover:scale-110 group-hover:rotate-1" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#00C4CC]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      </div>
      <span className="absolute left-3 top-3 rounded-full bg-[#00C4CC] px-2.5 py-1 text-[10px] font-black text-black shadow-md">{series.model_count || 0} MODELS</span>
    </div>
    <div className="p-4">
      <h3 className="font-display font-bold text-silver-bright group-hover:text-[#00C4CC] transition-colors duration-300">{series.name}</h3>
      <p className="mt-1 line-clamp-2 text-xs text-silver-dim">{series.description || 'Explore available models'}</p>
      {series.min_price ? <p className="mt-3 text-sm font-black text-[#00C4CC]">From {formatPrice(series.min_price, settings)}</p> : null}
      <span className="mt-3 inline-block text-xs font-bold text-[#00C4CC] group-hover:translate-x-1 transition-transform duration-300">Explore Models →</span>
    </div>
  </Link>;
}
