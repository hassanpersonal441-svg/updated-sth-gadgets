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
  priority = false,
}: {
  product: Product;
  settings?: Settings | null;
  isLight?: boolean;
  priority?: boolean;
}) {
  const { theme } = useTheme();
  const isLight = propIsLight !== undefined ? propIsLight : theme === 'light';

  const [selectedVariantIndex, setSelectedVariantIndex] = useState<number | null>(null);

  const activeVariants = useMemo(
    () => (product.product_variants || []).filter((v) => v.is_active !== false),
    [product.product_variants]
  );

  const primaryImage = useMemo(
    () =>
      product.product_images?.find((i) => i.is_primary)?.image_url ||
      product.product_images?.[0]?.image_url ||
      '/images/logo.png',
    [product.product_images]
  );

  // Variant specific image (or matched by index from gallery)
  const variantImage = useMemo(() => {
    if (selectedVariantIndex === null || !activeVariants[selectedVariantIndex]) return null;
    const v = activeVariants[selectedVariantIndex];
    if (v.image_url) return v.image_url;
    if (product.product_images && product.product_images[selectedVariantIndex]) {
      return product.product_images[selectedVariantIndex].image_url;
    }
    return null;
  }, [selectedVariantIndex, activeVariants, product.product_images]);

  const secondaryImage = useMemo(() => {
    if (!product.product_images || product.product_images.length < 2) return null;
    const nonPrimary = product.product_images.find(
      (img) => img.image_url && img.image_url !== primaryImage
    );
    return nonPrimary ? nonPrimary.image_url : product.product_images[1]?.image_url || null;
  }, [product.product_images, primaryImage]);

  const currentDisplayImage = variantImage || primaryImage;
  const [imgSrc, setImgSrc] = useState(currentDisplayImage);

  useEffect(() => {
    setImgSrc(currentDisplayImage);
  }, [currentDisplayImage]);

  const hasDiscount = useMemo(
    () => Boolean(product.old_price && product.old_price > product.price),
    [product.old_price, product.price]
  );

  const savings = useMemo(
    () => (hasDiscount && product.old_price ? product.old_price - product.price : 0),
    [hasDiscount, product.old_price, product.price]
  );

  const discountPercent = useMemo(() => {
    if (product.discount && product.discount > 0) return Math.round(product.discount);
    if (hasDiscount && product.old_price) {
      return Math.round(((product.old_price - product.price) / product.old_price) * 100);
    }
    return 0;
  }, [product.discount, hasDiscount, product.old_price, product.price]);

  // Product URL pre-selected with chosen color
  const productUrl = useMemo(() => {
    if (selectedVariantIndex !== null && activeVariants[selectedVariantIndex]) {
      const vName = activeVariants[selectedVariantIndex].variant_name;
      return `/products/${product.slug}?color=${encodeURIComponent(vName)}`;
    }
    return `/products/${product.slug}`;
  }, [product.slug, selectedVariantIndex, activeVariants]);

  return (
    <Link
      href={productUrl}
      data-tour="customer-product-card"
      className={`group relative flex flex-col overflow-hidden rounded-2xl border transition-all duration-300 ease-out hover:-translate-y-1 p-3 cursor-pointer ${
        isLight
          ? 'border-slate-200 bg-white text-slate-900 shadow-sm hover:border-[#0891B2] hover:shadow-[0_8px_25px_-4px_rgba(8,145,178,0.2)]'
          : 'border-[#1E3A5F]/70 bg-[#060F1E] text-white shadow-[0_4px_20px_rgba(0,0,0,0.5)] hover:border-[#00C4CC] hover:shadow-[0_0_25px_rgba(0,196,204,0.25)]'
      }`}
    >
      {/* IMAGE STAGE WITH INTERACTIVE LIVE COLOR SWAP */}
      <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-white border border-slate-100 dark:border-[#1E3048] flex items-center justify-center">
        {/* Discount Badge */}
        {discountPercent > 0 && (
          <div className="absolute top-2 left-2 z-10 pointer-events-none">
            <span className="inline-flex items-center gap-0.5 rounded-md bg-gradient-to-r from-[#0066FF] to-[#00C4CC] px-2 py-0.5 text-[9px] font-black text-white tracking-wide shadow-sm">
              ⚡ -{discountPercent}%
            </span>
          </div>
        )}

        {/* Stock badge */}
        <div className="absolute top-2 right-2 z-10 pointer-events-none">
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[8px] font-bold ${
              product.stock_status === 'in_stock'
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                : product.stock_status === 'low_stock'
                ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                product.stock_status === 'in_stock'
                  ? 'bg-emerald-400 animate-pulse'
                  : product.stock_status === 'low_stock'
                  ? 'bg-amber-400'
                  : 'bg-rose-400'
              }`}
            />
            {product.stock_status === 'in_stock'
              ? 'In Stock'
              : product.stock_status === 'low_stock'
              ? 'Low Stock'
              : 'Out of Stock'}
          </span>
        </div>

        {/* Main Image (Swaps to selected color, or dual-flips on hover if no color picked) */}
        <div
          className={`relative h-full w-full transition-all duration-500 ease-out ${
            selectedVariantIndex === null && secondaryImage
              ? 'group-hover:opacity-0 group-hover:scale-95'
              : 'group-hover:scale-108'
          }`}
        >
          <Image
            key={imgSrc}
            src={imgSrc}
            alt={product.name}
            fill
            className="object-contain p-2"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            priority={priority}
            loading={priority ? undefined : 'lazy'}
            onError={() => setImgSrc('/images/logo.png')}
          />
        </div>

        {/* Secondary Image on general hover (when no specific color dot is selected) */}
        {selectedVariantIndex === null && secondaryImage && (
          <div className="absolute inset-0 transition-all duration-500 ease-out opacity-0 group-hover:opacity-100 group-hover:scale-108 pointer-events-none">
            <Image
              src={secondaryImage}
              alt={`${product.name} preview`}
              fill
              className="object-contain p-2"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              loading="lazy"
            />
          </div>
        )}

        {/* View Details Hover Indicator */}
        <div className="absolute bottom-2 inset-x-2 flex justify-center opacity-0 translate-y-1.5 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 pointer-events-none z-10">
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-950/85 backdrop-blur-md text-[8.5px] font-bold text-[#00C4CC] border border-[#00C4CC]/50 shadow-md">
            <span>View Details</span>
            <span className="text-[10px]">→</span>
          </span>
        </div>
      </div>

      {/* PRODUCT INFO */}
      <div className="mt-2.5 space-y-1">
        {/* Category + Live Interactive Color Dots */}
        <div className="flex items-center justify-between gap-1">
          <span className="text-[9px] font-black uppercase tracking-widest text-[#00C4CC] truncate">
            {product.category?.name || 'GADGETS'}
          </span>

          {/* Interactive Color Swatches */}
          {activeVariants.length > 0 && (
            <div
              className="flex items-center gap-1 shrink-0"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
            >
              {activeVariants.slice(0, 5).map((v, idx) => {
                const isSelected = selectedVariantIndex === idx;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setSelectedVariantIndex(isSelected ? null : idx);
                    }}
                    onMouseEnter={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setSelectedVariantIndex(idx);
                    }}
                    className={`h-3 w-3 rounded-full transition-all duration-200 cursor-pointer ${
                      isSelected
                        ? 'ring-2 ring-[#00C4CC] ring-offset-1 ring-offset-slate-900 scale-125 shadow-[0_0_8px_rgba(0,196,204,0.8)]'
                        : 'opacity-70 hover:opacity-100 hover:scale-115 border border-white/50 dark:border-slate-600'
                    }`}
                    style={{ backgroundColor: v.color_value || '#00C4CC' }}
                    title={v.variant_name}
                    aria-label={`Color: ${v.variant_name}`}
                  />
                );
              })}
              <span className="text-[8.5px] font-semibold text-slate-400 ml-0.5">
                {selectedVariantIndex !== null && activeVariants[selectedVariantIndex]
                  ? activeVariants[selectedVariantIndex].variant_name
                  : `${activeVariants.length} Colors`}
              </span>
            </div>
          )}
        </div>

        {/* Product Title */}
        <h3
          className={`line-clamp-2 text-xs font-bold leading-snug ${
            isLight ? 'text-slate-900 group-hover:text-[#0891B2]' : 'text-white group-hover:text-[#00C4CC]'
          }`}
        >
          {product.name}
        </h3>

        {/* Rating */}
        <div className="flex items-center gap-1 text-[10px]">
          <span className="text-amber-400 text-[10px]">★★★★★</span>
          <span className={`font-bold ${isLight ? 'text-slate-800' : 'text-white'}`}>5.0</span>
          <span className="text-slate-500">(1.2k+)</span>
        </div>

        {/* Price Row */}
        <div className="flex items-baseline gap-2 pt-0.5">
          <span
            className={`text-base font-black tracking-tight ${
              isLight ? 'text-slate-950' : 'text-white'
            }`}
          >
            {formatPrice(product.price, settings)}
          </span>
          {hasDiscount && product.old_price && (
            <span className="text-[10px] text-slate-400 line-through">
              {formatPrice(product.old_price, settings)}
            </span>
          )}
        </div>

        {/* Save Badge */}
        {savings > 0 && (
          <span className="inline-flex items-center gap-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.5 text-[8.5px] font-bold text-emerald-400">
            ✦ Save {formatPrice(savings, settings)}
          </span>
        )}
      </div>
    </Link>
  );
}

export default memo(ProductCardComponent);
