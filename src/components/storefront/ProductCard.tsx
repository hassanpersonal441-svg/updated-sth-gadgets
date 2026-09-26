'use client';

import Image from 'next/image';
import Link from 'next/link';
import { memo, useMemo, useState, useEffect } from 'react';
import type { Product, Settings } from '@/types/database';
import { formatPrice } from '@/lib/utils';
import { useTheme } from '@/components/theme/ThemeProvider';

function ProductCardComponent({
  product,
  settings,
  isLight: propIsLight,
}: {
  product: Product;
  settings?: Settings | null;
  isLight?: boolean;
}) {
  const { theme } = useTheme();
  const isLight = propIsLight !== undefined ? propIsLight : theme === 'light';

  const primaryImage = useMemo(() =>
    product.product_images?.find((i) => i.is_primary)?.image_url ||
    product.product_images?.[0]?.image_url ||
    '/images/logo.png',
    [product.product_images]
  );

  const [imgSrc, setImgSrc] = useState(primaryImage);

  useEffect(() => {
    setImgSrc(primaryImage);
  }, [primaryImage]);

  const hasDiscount = useMemo(() => 
    product.old_price && product.old_price > product.price,
    [product.old_price, product.price]
  );
  
  const savings = useMemo(() => 
    hasDiscount ? product.old_price! - product.price : 0,
    [hasDiscount, product.old_price, product.price]
  );

  const productUrl = useMemo(() => 
    `/products/${product.slug}`,
    [product.slug]
  );

  return (
    <div
      data-tour="customer-product-card"
      className={`group relative flex flex-col overflow-hidden rounded-2xl border transition duration-300 hover:border-[#00C4CC] hover:shadow-[0_0_24px_rgba(0,196,204,0.3)] hover:-translate-y-1 ${
        isLight
          ? 'border-slate-200 bg-white text-slate-800'
          : 'border-slate-800/90 bg-[#0C1422] text-[#C9D2DB]'
      }`}
    >
      {/* Clickable Card Link Container */}
      <Link href={productUrl} data-tour="customer-product-details" className="flex flex-1 flex-col justify-between cursor-pointer">
        {/* Top Badges */}
        <div className="absolute left-2 top-2 z-10 flex flex-col gap-1 items-start">
          {product.discount > 0 && (
            <span className="rounded-full bg-[#00C4CC] px-2 py-0.5 font-display text-[9px] sm:text-[10px] font-black text-black shadow-md tracking-wider">
              -{Math.round(product.discount)}% OFF
            </span>
          )}
          {product.bundle_offers && product.bundle_offers.length > 0 && (
            <span className="rounded-full bg-gradient-to-r from-amber-500 to-rose-500 px-2 py-0.5 font-display text-[9px] sm:text-[10px] font-black text-white shadow-md tracking-wider">
              🎁 BUNDLE
            </span>
          )}
          {product.free_delivery && (
            <span className="rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 px-2 py-0.5 font-display text-[9px] sm:text-[10px] font-black text-white shadow-md tracking-wider">
              🚚 FREE
            </span>
          )}
        </div>

        <div className="absolute right-2 top-2 z-10">
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] sm:text-[10px] font-bold shadow-sm ${
              product.stock_status === 'in_stock'
                ? isLight
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-300'
                  : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 backdrop-blur-sm'
                : product.stock_status === 'low_stock'
                ? isLight
                  ? 'bg-amber-50 text-amber-700 border border-amber-300'
                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/40 backdrop-blur-sm'
                : isLight
                ? 'bg-red-50 text-red-700 border border-red-300'
                : 'bg-red-500/20 text-red-400 border border-red-500/40 backdrop-blur-sm'
            }`}
          >
            <span
              className={`h-1 w-1 rounded-full ${
                product.stock_status === 'in_stock'
                  ? 'bg-emerald-400 animate-pulse'
                  : product.stock_status === 'low_stock'
                  ? 'bg-amber-400'
                  : 'bg-red-400'
              }`}
            ></span>
            <span className="hidden sm:inline">
              {product.stock_status === 'in_stock'
                ? 'In Stock'
                : product.stock_status === 'low_stock'
                ? 'Low Stock'
                : 'Out of Stock'}
            </span>
            <span className="sm:hidden">
              {product.stock_status === 'in_stock'
                ? '✓'
                : product.stock_status === 'low_stock'
                ? '⚠'
                : '✕'}
            </span>
          </span>
        </div>

        {/* Product Image Container */}
        <div
          className={`relative aspect-square w-full overflow-hidden p-2.5 sm:p-3 flex items-center justify-center border-b transition ${
            isLight ? 'bg-slate-50 border-slate-100' : 'bg-[#070B12] border-slate-800/80'
          }`}
        >
          <Image
            src={imgSrc}
            alt={product.name}
            fill
            className="object-contain p-1.5 sm:p-2 transition duration-500 group-hover:scale-105"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            loading="lazy"
            onError={() => setImgSrc('/images/logo.png')}
          />
        </div>

        {/* Content Body */}
        <div className="flex flex-1 flex-col justify-between p-2.5 sm:p-3 md:p-4 gap-1.5 sm:gap-2">
          <div>
            {/* Category tag & Rating stars */}
            <div className="flex items-center justify-between gap-1 mb-1">
              {product.category ? (
                <span className="font-display text-[9px] sm:text-[10px] uppercase tracking-widest text-[#00C4CC] font-extrabold truncate">
                  {product.category.name}
                </span>
              ) : (
                <span></span>
              )}
              <div className="flex items-center gap-0.5 text-[9px] sm:text-[10px] font-bold text-amber-400 shrink-0 bg-amber-400/10 px-1.5 py-0.2 rounded border border-amber-400/20">
                <span>★</span>
                <span className="hidden sm:inline">5.0</span>
              </div>
            </div>

            {/* Title */}
            <h3
              className={`line-clamp-2 font-display text-[11px] sm:text-xs md:text-sm font-bold group-hover:text-[#00C4CC] transition duration-200 leading-snug ${
                isLight ? 'text-slate-900' : 'text-white'
              }`}
            >
              {product.name}
            </h3>

            {/* Price Section */}
            <div className="mt-1.5 sm:mt-2 flex flex-wrap items-baseline gap-1 sm:gap-1.5">
              <span
                className={`font-display text-sm sm:text-base md:text-lg font-black ${
                  isLight ? 'text-black' : 'text-white'
                }`}
              >
                {formatPrice(product.price, settings)}
              </span>
              {hasDiscount && (
                <span
                  className={`text-[10px] sm:text-[11px] md:text-xs line-through ${
                    isLight ? 'text-slate-500' : 'text-slate-400'
                  }`}
                >
                  {formatPrice(product.old_price!, settings)}
                </span>
              )}
              {savings > 0 && (
                <span
                  className={`text-[8px] sm:text-[9px] md:text-[10px] font-extrabold px-1 py-0.5 sm:px-1.5 rounded-md border ${
                    isLight
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                      : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                  }`}
                >
                  Save {formatPrice(savings, settings)}
                </span>
              )}
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}

export default memo(ProductCardComponent);
