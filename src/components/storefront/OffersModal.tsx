'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { Product, Settings } from '@/types/database';
import { formatPrice } from '@/lib/utils';

interface OffersModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  settings: Settings | null;
  onFilterDeals: () => void;
  isLight?: boolean;
}

export default function OffersModal({
  isOpen,
  onClose,
  products,
  settings,
  onFilterDeals,
  isLight = false,
}: OffersModalProps) {
  const [activeTab, setActiveTab] = useState<'all' | 'combos' | 'flash'>('all');

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Handle ESC key to close
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Extract all active combo deals / bundle offers
  const comboOffers = useMemo(() => {
    const list: {
      product: Product;
      bundle: NonNullable<Product['bundle_offers']>[number];
    }[] = [];
    products.forEach((p) => {
      if (p.bundle_offers && p.bundle_offers.length > 0) {
        p.bundle_offers.forEach((b) => {
          list.push({ product: p, bundle: b });
        });
      }
    });
    return list;
  }, [products]);

  // Discounted deals products
  const dealProducts = useMemo(() => {
    const discounted = products.filter(
      (p) => (p.old_price && p.old_price > p.price) || (p.discount && p.discount > 0)
    );
    if (discounted.length > 0) return discounted;
    return products.slice(0, 6);
  }, [products]);

  const freeShippingThreshold = settings?.free_shipping_threshold ?? 5000;
  const bundleTier1 = settings?.bundle_tier1_percent ?? 5;
  const bundleTier2 = settings?.bundle_tier2_percent ?? 10;

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto backdrop-blur-md bg-black/80 transition-all duration-300 animate-fade-in"
      onClick={onClose}
    >
      {/* Modal Container */}
      <div
        onClick={(e) => e.stopPropagation()}
        className={`relative w-full max-w-3xl max-h-[90vh] flex flex-col rounded-3xl border shadow-2xl overflow-hidden transition-all duration-300 animate-slide-up ${
          isLight
            ? 'bg-white border-slate-200 text-slate-900 shadow-[0_25px_60px_rgba(0,0,0,0.15)]'
            : 'bg-[#060F1E] border-[#00C4CC]/40 text-white shadow-[0_0_60px_rgba(0,196,204,0.25)]'
        }`}
      >
        {/* Glow Orb in corner */}
        <div className="pointer-events-none absolute -top-20 -right-20 h-48 w-48 rounded-full bg-[#00C4CC]/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 h-48 w-48 rounded-full bg-[#0066FF]/20 blur-3xl" />

        {/* ============================================================ */}
        {/* 1. MODAL HEADER                                              */}
        {/* ============================================================ */}
        <div
          className={`flex items-center justify-between border-b px-5 py-4 shrink-0 relative z-10 ${
            isLight ? 'border-slate-100 bg-slate-50/80' : 'border-slate-800/80 bg-[#091526]'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#0066FF] to-[#00C4CC] text-white text-base shadow-[0_0_12px_rgba(0,196,204,0.4)]">
              ⚡
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3
                  className={`font-display text-base sm:text-lg font-black tracking-tight ${
                    isLight ? 'text-slate-900' : 'text-white'
                  }`}
                >
                  Active Deals &amp; Offers
                </h3>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[9px] font-bold text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live Now
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Combo packages, bundle perks &amp; instant flash discounts
              </p>
            </div>
          </div>

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className={`flex h-8 w-8 items-center justify-center rounded-full border transition duration-200 hover:scale-110 active:scale-95 cursor-pointer ${
              isLight
                ? 'border-slate-300 bg-white text-slate-600 hover:bg-slate-100'
                : 'border-slate-700 bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white'
            }`}
          >
            ✕
          </button>
        </div>

        {/* Tab Filters */}
        <div
          className={`flex items-center gap-2 px-5 py-2.5 border-b text-xs font-bold shrink-0 ${
            isLight ? 'border-slate-100 bg-slate-50/50' : 'border-slate-800/60 bg-[#07101E]'
          }`}
        >
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`rounded-xl px-3 py-1.5 transition duration-200 cursor-pointer ${
              activeTab === 'all'
                ? 'bg-[#00C4CC] text-black font-black shadow-sm'
                : isLight
                ? 'text-slate-600 hover:bg-slate-200'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            All Offers
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('combos')}
            className={`flex items-center gap-1 rounded-xl px-3 py-1.5 transition duration-200 cursor-pointer ${
              activeTab === 'combos'
                ? 'bg-amber-400 text-black font-black shadow-sm'
                : isLight
                ? 'text-slate-600 hover:bg-slate-200'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <span>🎁 Combo Deals</span>
            {comboOffers.length > 0 && (
              <span className="rounded-full bg-black/20 px-1.5 py-0.2 text-[9px]">
                {comboOffers.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('flash')}
            className={`flex items-center gap-1 rounded-xl px-3 py-1.5 transition duration-200 cursor-pointer ${
              activeTab === 'flash'
                ? 'bg-rose-500 text-white font-black shadow-sm'
                : isLight
                ? 'text-slate-600 hover:bg-slate-200'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <span>🔥 Flash Deals</span>
            <span className="rounded-full bg-black/20 px-1.5 py-0.2 text-[9px]">
              {dealProducts.length}
            </span>
          </button>
        </div>

        {/* ============================================================ */}
        {/* 2. SCROLLABLE BODY CONTENT                                   */}
        {/* ============================================================ */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* Storewide Offer Cards Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {/* 1. Free Delivery */}
            <div
              className={`rounded-2xl border p-3 flex items-start gap-2.5 ${
                isLight
                  ? 'border-emerald-200 bg-emerald-50/60 text-slate-800'
                  : 'border-emerald-500/30 bg-emerald-950/20 text-slate-200'
              }`}
            >
              <span className="text-xl">🚚</span>
              <div>
                <strong className="block text-xs font-black text-emerald-400">
                  FREE Delivery
                </strong>
                <span className="text-[10px] text-slate-400 leading-tight block mt-0.5">
                  Orders above Rs. {freeShippingThreshold.toLocaleString('en-PK')}
                </span>
              </div>
            </div>

            {/* 2. Cash on Delivery */}
            <div
              className={`rounded-2xl border p-3 flex items-start gap-2.5 ${
                isLight
                  ? 'border-cyan-200 bg-cyan-50/60 text-slate-800'
                  : 'border-[#00C4CC]/30 bg-[#00C4CC]/10 text-slate-200'
              }`}
            >
              <span className="text-xl">💵</span>
              <div>
                <strong className="block text-xs font-black text-[#00C4CC]">
                  Cash on Delivery
                </strong>
                <span className="text-[10px] text-slate-400 leading-tight block mt-0.5">
                  Pay at your doorstep across Pakistan
                </span>
              </div>
            </div>

            {/* 3. Automatic Combo Discount */}
            <div
              className={`rounded-2xl border p-3 flex items-start gap-2.5 ${
                isLight
                  ? 'border-amber-200 bg-amber-50/60 text-slate-800'
                  : 'border-amber-500/30 bg-amber-950/20 text-slate-200'
              }`}
            >
              <span className="text-xl">🎁</span>
              <div>
                <strong className="block text-xs font-black text-amber-400">
                  Auto Combo Perk
                </strong>
                <span className="text-[10px] text-slate-400 leading-tight block mt-0.5">
                  Extra {bundleTier1}% - {bundleTier2}% OFF on multi items
                </span>
              </div>
            </div>
          </div>

          {/* ============================================================ */}
          {/* COMBO DEALS SECTION                                          */}
          {/* ============================================================ */}
          {(activeTab === 'all' || activeTab === 'combos') && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-display text-xs sm:text-sm font-black uppercase tracking-wider text-amber-400">
                    🎁 Mega Combo Packages &amp; Bundles
                  </span>
                  <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[9px] font-black text-amber-400">
                    Extra Savings
                  </span>
                </div>
              </div>

              {/* Real Database Bundles or Volume Combo Cards */}
              {comboOffers.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {comboOffers.map(({ product, bundle }, idx) => {
                    const primaryImg =
                      product.product_images?.find((i) => i.is_primary)?.image_url ||
                      product.product_images?.[0]?.image_url ||
                      '/images/logo.png';
                    const savings =
                      bundle.original_price && bundle.original_price > bundle.bundle_price
                        ? bundle.original_price - bundle.bundle_price
                        : 0;

                    return (
                      <Link
                        key={idx}
                        href={`/products/${product.slug}`}
                        onClick={onClose}
                        className={`group relative flex items-center gap-3 rounded-2xl border p-3 sm:p-3.5 transition duration-200 hover:-translate-y-0.5 overflow-hidden ${
                          isLight
                            ? 'border-amber-200 bg-amber-50/40 hover:border-amber-400 hover:shadow-md'
                            : 'border-amber-500/30 bg-[#0E1522] hover:border-amber-400 hover:shadow-[0_0_20px_rgba(245,158,11,0.2)]'
                        }`}
                      >
                        {/* Image */}
                        <div className="relative h-20 w-20 shrink-0 rounded-xl bg-white p-1 border border-slate-100 dark:border-slate-800 flex items-center justify-center overflow-hidden">
                          <Image
                            src={primaryImg}
                            alt={bundle.title}
                            fill
                            className="object-contain p-1 transition duration-300 group-hover:scale-105"
                            sizes="80px"
                          />
                        </div>

                        {/* Info Container with min-w-0 for bulletproof truncation */}
                        <div className="flex-1 min-w-0 space-y-1">
                          {/* Top Row: Product Name + Badge */}
                          <div className="flex items-center justify-between gap-1.5">
                            <span className="text-[9.5px] font-bold text-slate-400 truncate">
                              {product.name}
                            </span>
                            {bundle.badge_text && (
                              <span className="shrink-0 rounded-full bg-gradient-to-r from-amber-500 to-rose-500 px-2 py-0.5 text-[8px] font-black text-white uppercase tracking-wider shadow">
                                {bundle.badge_text}
                              </span>
                            )}
                          </div>

                          {/* Bundle Title */}
                          <h4
                            className={`text-xs font-black truncate ${
                              isLight ? 'text-slate-900' : 'text-white group-hover:text-amber-300'
                            }`}
                            title={bundle.title}
                          >
                            {bundle.title}
                          </h4>

                          {/* Included items */}
                          {bundle.items && bundle.items.length > 0 && (
                            <div className="flex flex-wrap gap-1 pt-0.5">
                              {bundle.items.slice(0, 2).map((it, iIdx) => (
                                <span
                                  key={iIdx}
                                  className="truncate max-w-[170px] rounded bg-black/40 border border-slate-800/80 px-1.5 py-0.5 text-[8px] text-slate-300 inline-block"
                                  title={`${it.name}${it.detail ? ` (${it.detail})` : ''}`}
                                >
                                  +{it.name}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Price & Savings */}
                          <div className="flex flex-wrap items-baseline gap-1.5 pt-0.5">
                            <span className="text-sm font-black text-amber-400">
                              {formatPrice(bundle.bundle_price, settings)}
                            </span>
                            {bundle.original_price && bundle.original_price > bundle.bundle_price && (
                              <span className="text-[10px] text-slate-500 line-through">
                                {formatPrice(bundle.original_price, settings)}
                              </span>
                            )}
                            {savings > 0 && (
                              <span className="text-[8.5px] font-bold text-emerald-400">
                                Save {formatPrice(savings, settings)}
                              </span>
                            )}
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                /* Auto Volume Combo Offers */
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Combo 1 */}
                  <div
                    className={`rounded-2xl border p-3.5 space-y-2 ${
                      isLight
                        ? 'border-amber-200 bg-amber-50/50'
                        : 'border-amber-500/30 bg-[#0E1522]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[9px] font-black text-amber-400 uppercase">
                        2-Item Combo
                      </span>
                      <span className="text-xs font-black text-emerald-400">Extra {bundleTier1}% OFF</span>
                    </div>
                    <h4 className={`text-xs font-black ${isLight ? 'text-slate-900' : 'text-white'}`}>
                      Buy Any 2 Products Together
                    </h4>
                    <p className="text-[10px] text-slate-400 leading-relaxed">
                      Mix and match any earbuds, charger, power bank or cable. Instant {bundleTier1}% discount applies in your cart automatically!
                    </p>
                  </div>

                  {/* Combo 2 */}
                  <div
                    className={`rounded-2xl border p-3.5 space-y-2 ${
                      isLight
                        ? 'border-rose-200 bg-rose-50/50'
                        : 'border-rose-500/30 bg-[#160B12]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="rounded-full bg-rose-500/20 px-2 py-0.5 text-[9px] font-black text-rose-400 uppercase">
                        3+ Mega Combo
                      </span>
                      <span className="text-xs font-black text-emerald-400">
                        Extra {bundleTier2}% OFF + FREE Ship
                      </span>
                    </div>
                    <h4 className={`text-xs font-black ${isLight ? 'text-slate-900' : 'text-white'}`}>
                      Buy 3 or More Tech Accessories
                    </h4>
                    <p className="text-[10px] text-slate-400 leading-relaxed">
                      Upgrade all your daily devices at once. Enjoy maximum tier savings of {bundleTier2}% plus 100% Free Nationwide Delivery!
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ============================================================ */}
          {/* INDIVIDUAL FLASH DEALS SECTION                               */}
          {/* ============================================================ */}
          {(activeTab === 'all' || activeTab === 'flash') && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-display text-xs sm:text-sm font-black uppercase tracking-wider text-[#00C4CC]">
                    🔥 Flash Deals &amp; Price Cuts
                  </span>
                  <span className="rounded-full bg-rose-500/20 px-2 py-0.5 text-[9px] font-black text-rose-400">
                    {dealProducts.length} Deals
                  </span>
                </div>

                <button
                  type="button"
                  onClick={onFilterDeals}
                  className="text-[11px] font-bold text-[#00C4CC] hover:underline cursor-pointer"
                >
                  View all in grid →
                </button>
              </div>

              {/* Deals Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {dealProducts.slice(0, 6).map((product) => {
                  const primaryImg =
                    product.product_images?.find((i) => i.is_primary)?.image_url ||
                    product.product_images?.[0]?.image_url ||
                    '/images/logo.png';
                  const hasDiscount = Boolean(product.old_price && product.old_price > product.price);
                  const savings = hasDiscount && product.old_price ? product.old_price - product.price : 0;
                  const discountPercent =
                    product.discount ||
                    (hasDiscount && product.old_price
                      ? Math.round(((product.old_price - product.price) / product.old_price) * 100)
                      : 0);

                  return (
                    <Link
                      key={product.id}
                      href={`/products/${product.slug}`}
                      onClick={onClose}
                      className={`group relative flex flex-col rounded-2xl border p-2.5 transition duration-200 hover:-translate-y-1 ${
                        isLight
                          ? 'border-slate-200 bg-white hover:border-[#0891B2] hover:shadow-md'
                          : 'border-slate-800 bg-[#091526] hover:border-[#00C4CC] hover:shadow-[0_0_20px_rgba(0,196,204,0.2)]'
                      }`}
                    >
                      {/* Image Box */}
                      <div className="relative aspect-square w-full rounded-xl bg-white p-2 flex items-center justify-center overflow-hidden border border-slate-100">
                        {discountPercent > 0 && (
                          <div className="absolute top-1 left-1 z-10">
                            <span className="rounded bg-rose-600 px-1.5 py-0.5 text-[8px] font-black text-white">
                              -{discountPercent}%
                            </span>
                          </div>
                        )}
                        <Image
                          src={primaryImg}
                          alt={product.name}
                          fill
                          className="object-contain p-1 transition-transform duration-300 group-hover:scale-105"
                          sizes="(max-width: 640px) 50vw, 33vw"
                        />
                      </div>

                      {/* Details */}
                      <div className="mt-2 space-y-0.5">
                        <h4
                          className={`line-clamp-1 text-xs font-bold ${
                            isLight ? 'text-slate-900' : 'text-white group-hover:text-[#00C4CC]'
                          }`}
                        >
                          {product.name}
                        </h4>

                        <div className="flex items-baseline gap-1.5 pt-0.5">
                          <span className="text-xs font-black text-[#00C4CC]">
                            {formatPrice(product.price, settings)}
                          </span>
                          {hasDiscount && product.old_price && (
                            <span className="text-[9px] text-slate-500 line-through">
                              {formatPrice(product.old_price, settings)}
                            </span>
                          )}
                        </div>

                        {savings > 0 && (
                          <span className="text-[8px] font-bold text-emerald-400 block">
                            Save {formatPrice(savings, settings)}
                          </span>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ============================================================ */}
        {/* 4. MODAL FOOTER                                              */}
        {/* ============================================================ */}
        <div
          className={`flex items-center justify-between border-t px-5 py-3.5 shrink-0 ${
            isLight ? 'border-slate-100 bg-slate-50' : 'border-slate-800/80 bg-[#091526]'
          }`}
        >
          <button
            type="button"
            onClick={onClose}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition duration-200 cursor-pointer ${
              isLight
                ? 'text-slate-600 hover:bg-slate-200'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            Close
          </button>

          <button
            type="button"
            onClick={onFilterDeals}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#0066FF] via-[#00C4CC] to-[#0066FF] hover:brightness-110 text-white font-display text-xs font-black px-4 py-2 shadow-[0_0_15px_rgba(0,196,204,0.35)] transition duration-200 hover:scale-105 active:scale-95 cursor-pointer"
          >
            <span>Filter Store Deals</span>
            <span>⚡</span>
          </button>
        </div>
      </div>
    </div>
  );
}
