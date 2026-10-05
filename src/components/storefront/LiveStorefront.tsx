'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState, useCallback } from 'react';
import type { Category, Product, ProductSeries, Settings } from '@/types/database';
import { formatPrice, buildWhatsAppOrderLink } from '@/lib/utils';
import { useCart } from '@/context/CartContext';
import { useTheme } from '@/components/theme/ThemeProvider';
import ProductCard from './ProductCard';
import SeriesCard from './SeriesCard';
import FlashSaleBanner from './FlashSaleBanner';
import OffersModal from './OffersModal';
import HeroProductComposition from './HeroProductComposition';
import ShopByCategoryGrid from './ShopByCategoryGrid';

export default function LiveStorefront({
  initialProducts,
  initialSeries = [],
  categories,
  settings,
}: {
  initialProducts: Product[];
  initialSeries?: ProductSeries[];
  categories: Category[];
  settings: Settings | null;
}) {
  const { addToCart, openCart, totalItems } = useCart();
  const { theme, toggleTheme } = useTheme();
  const isLight = theme === 'light';

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [offersOnly, setOffersOnly] = useState(false);
  const [isOffersModalOpen, setIsOffersModalOpen] = useState(false);
  const [sortBy, setSortBy] = useState<
    'default' | 'price_asc' | 'price_desc' | 'discount' | 'newest'
  >('default');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const rawPhone = settings?.whatsapp_number || '+92 348 9593671';
  const freeShippingThreshold = settings?.free_shipping_threshold ?? 5000;
  const [isMounted, setIsMounted] = useState(false);

  // Rotation tick: re-render every 60s so offset stays accurate
  const [tick, setTick] = useState(0);

  // Count active deals / discount items
  const dealsCount = useMemo(() => {
    return initialProducts.filter(
      (p) => (p.discount && p.discount > 0) || (p.old_price && p.old_price > p.price) || p.featured || p.best_seller
    ).length;
  }, [initialProducts]);

  useEffect(() => {
    setIsMounted(true);
    const interval = setInterval(() => setTick((t) => t + 1), 60_000);

    function handleOpenDeals() {
      setIsOffersModalOpen(true);
    }
    function handleFilterDeals() {
      setOffersOnly(true);
      setSelectedCategory('all');
      const el = document.getElementById('product-catalog');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }

    window.addEventListener('sth_open_deals_modal', handleOpenDeals);
    window.addEventListener('sth_filter_deals', handleFilterDeals);

    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('deals') === 'true' || params.get('offers') === 'true') {
        setOffersOnly(true);
      }
    } catch {}

    return () => {
      clearInterval(interval);
      window.removeEventListener('sth_open_deals_modal', handleOpenDeals);
      window.removeEventListener('sth_filter_deals', handleFilterDeals);
    };
  }, []);

  // Generate and print / save PDF Rate Sheet
  function handleDownloadRateSheet() {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const dateStr = new Date().toLocaleDateString('en-PK', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const grouped: Record<string, Product[]> = {};
    initialProducts.forEach((p) => {
      const catName = p.category?.name || 'General Gadgets';
      if (!grouped[catName]) grouped[catName] = [];
      grouped[catName].push(p);
    });

    let catalogRowsHtml = '';
    Object.entries(grouped).forEach(([catName, items]) => {
      catalogRowsHtml += `
        <tr class="category-row">
          <td colspan="4"><strong>📁 ${catName} (${items.length})</strong></td>
        </tr>
      `;
      items.forEach((item, idx) => {
        const priceFormatted = formatPrice(item.price, settings);
        const oldPriceFormatted =
          item.old_price && item.old_price > item.price
            ? formatPrice(item.old_price, settings)
            : '';
        const statusText =
          item.stock_status === 'in_stock'
            ? 'In Stock'
            : item.stock_status === 'low_stock'
            ? 'Low Stock'
            : 'Out of Stock';
        catalogRowsHtml += `
          <tr>
            <td>${idx + 1}</td>
            <td><strong>${item.name}</strong> ${
          item.short_description
            ? `<br><small style="color:#666;">${item.short_description}</small>`
            : ''
        }</td>
            <td><span class="stock-${item.stock_status}">${statusText}</span></td>
            <td style="text-align:right;">
              <strong style="font-size:14px;">${priceFormatted}</strong>
              ${
                oldPriceFormatted
                  ? `<br><small style="text-decoration:line-through; color:#888;">${oldPriceFormatted}</small>`
                  : ''
              }
            </td>
          </tr>
        `;
      });
    });

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${settings?.business_name || 'STH Gadgets'} — Official Rate List (${dateStr})</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 20px; color: #111; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #00C4CC; padding-bottom: 12px; margin-bottom: 20px; }
          .title { font-size: 24px; font-weight: 800; color: #008B92; text-transform: uppercase; margin: 0; }
          .subtitle { font-size: 13px; color: #555; margin-top: 4px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 13px; }
          th, td { border: 1px solid #ddd; padding: 8px 10px; text-align: left; }
          th { background: #00C4CC; color: #fff; font-weight: bold; text-transform: uppercase; font-size: 11px; }
          .category-row td { background: #f0fdfd; color: #00666b; font-size: 14px; padding: 10px; }
          .stock-in_stock { color: #059669; font-weight: bold; }
          .stock-low_stock { color: #d97706; font-weight: bold; }
          .stock-out_of_stock { color: #dc2626; font-weight: bold; }
          .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #666; border-top: 1px solid #eee; padding-top: 10px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1 class="title">${settings?.business_name || 'STH GADGETS'}</h1>
            <div class="subtitle">Official Product Catalog & Price Sheet · Generated on ${dateStr}</div>
          </div>
          <div style="text-align:right; font-size: 13px;">
            <strong>WhatsApp Orders:</strong> ${rawPhone}<br>
            <strong>Website:</strong> www.sthgadgets.store
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th style="width:40px;">#</th>
              <th>Product Name / Details</th>
              <th style="width:100px;">Availability</th>
              <th style="width:120px; text-align:right;">Price</th>
            </tr>
          </thead>
          <tbody>
            ${catalogRowsHtml}
          </tbody>
        </table>
        <div class="footer">
          Thank you for choosing ${
            settings?.business_name || 'STH Gadgets'
          }! Prices are subject to change based on market rates.
        </div>
        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  }

  // Filter & sort products
  const filteredProducts = useMemo(() => {
    let list = [...initialProducts];

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((p) => {
        const nameMatch = p.name.toLowerCase().includes(q);
        const descMatch =
          (p.short_description || '').toLowerCase().includes(q) ||
          (p.description || '').toLowerCase().includes(q);
        const catMatch = p.category?.name.toLowerCase().includes(q);
        const specMatch = (p.specifications || []).some(
          (s) => s.label.toLowerCase().includes(q) || s.value.toLowerCase().includes(q)
        );
        return nameMatch || descMatch || catMatch || specMatch;
      });
    }

    // Category filter
    if (selectedCategory !== 'all') {
      list = list.filter((p) => p.category?.slug === selectedCategory);
    }

    // In-Stock only
    if (inStockOnly) {
      list = list.filter((p) => p.stock_status === 'in_stock');
    }

    // Special Offers only
    if (offersOnly) {
      list = list.filter((p) => (p.discount && p.discount > 0) || p.featured || p.best_seller);
    }

    // Sorting
    switch (sortBy) {
      case 'price_asc':
        list.sort((a, b) => a.price - b.price);
        break;
      case 'price_desc':
        list.sort((a, b) => b.price - a.price);
        break;
      case 'discount':
        list.sort((a, b) => (b.discount || 0) - (a.discount || 0));
        break;
      case 'newest':
        list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      case 'default':
      default:
        list.sort((a, b) => {
          const orderA = typeof a.sort_order === 'number' ? a.sort_order : 999999;
          const orderB = typeof b.sort_order === 'number' ? b.sort_order : 999999;
          if (orderA !== orderB) return orderA - orderB;
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });

        // Auto-Rotate: circular shift based on current time slot (after mount only to avoid hydration mismatch)
        if (isMounted && settings?.auto_rotate_products && list.length > 1) {
          const intervalMs = (settings.auto_rotate_interval_minutes ?? 60) * 60 * 1000;
          const offset = Math.floor(Date.now() / intervalMs) % list.length;
          if (offset > 0) {
            list = [...list.slice(offset), ...list.slice(0, offset)];
          }
        }
    }

    return list;
  }, [
    initialProducts,
    searchQuery,
    selectedCategory,
    inStockOnly,
    offersOnly,
    sortBy,
    settings?.auto_rotate_products,
    settings?.auto_rotate_interval_minutes,
    isMounted,
    tick,
  ]);

  // Progressive rendering for optimal performance & loading speed
  const [visibleCount, setVisibleCount] = useState(16);

  useEffect(() => {
    setVisibleCount(16);
  }, [searchQuery, selectedCategory, inStockOnly, sortBy]);

  const displayedProducts = useMemo(() => {
    return filteredProducts.slice(0, visibleCount);
  }, [filteredProducts, visibleCount]);

  const filteredSeries = useMemo(
    () =>
      initialSeries.filter(
        (series) =>
          (selectedCategory === 'all' || series.category?.slug === selectedCategory) &&
          (!searchQuery.trim() ||
            `${series.name} ${series.description} ${series.brand || ''}`
              .toLowerCase()
              .includes(searchQuery.toLowerCase().trim())) &&
          (!inStockOnly || (series.model_count || 0) > 0)
      ),
    [initialSeries, selectedCategory, searchQuery, inStockOnly]
  );

  // Counts per category
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    initialProducts.forEach((p) => {
      if (p.category?.slug) {
        counts[p.category.slug] = (counts[p.category.slug] || 0) + 1;
      }
    });
    return counts;
  }, [initialProducts]);

  const trackWhatsAppClick = useCallback((productId: string) => {
    fetch('/api/analytics/whatsapp-click', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product_id: productId }),
    }).catch(() => {});
  }, []);

  const cardBg = useMemo(
    () =>
      isLight
        ? 'bg-white border-slate-200/90 shadow-[0_4px_20px_rgba(0,0,0,0.03)]'
        : 'bg-[#0B121E] border-slate-800/80 shadow-[0_4px_25px_rgba(0,0,0,0.4)]',
    [isLight]
  );

  return (
    <div className="min-h-screen transition-colors duration-300">
      <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8 py-5 sm:py-8 space-y-6">
        {/* ============================================================ */}
        {/* HERO BRAND HEADER & QUICK STORE BENEFIT BADGES              */}
        {/* ============================================================ */}
        {/* ============================================================ */}
        {/* HERO SECTION — 2-COLUMN WITH 4-5 PRODUCT 3D COMPOSITION      */}
        {/* ============================================================ */}
        <section
          className={`relative overflow-hidden rounded-3xl border p-6 sm:p-10 lg:p-12 backdrop-blur-2xl transition-all duration-300 ${
            isLight
              ? 'border-slate-200 bg-gradient-to-br from-white via-cyan-50/30 to-slate-50 text-slate-800 shadow-[0_10px_35px_rgba(0,0,0,0.04)]'
              : 'border-[#00C4CC]/30 bg-gradient-to-br from-[#070D18] via-[#0B1526] to-[#040810] text-[#CBD5E1] shadow-[0_0_50px_rgba(0,196,204,0.12)]'
          }`}
        >
          {/* Ambient Lighting Orbs */}
          <div className="absolute -top-32 -left-32 h-80 w-80 rounded-full bg-[#00C4CC]/15 blur-3xl pointer-events-none" />
          <div className="absolute top-1/2 -right-24 h-96 w-96 rounded-full bg-[#0066FF]/12 blur-3xl pointer-events-none" />

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            {/* LEFT COLUMN: HERO HEADLINE & ACTIONS (lg:col-span-6 xl:col-span-7) */}
            <div className="lg:col-span-6 xl:col-span-7 space-y-5 text-center lg:text-left">
              {/* Credibility Badge */}
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3.5 py-1 text-[11px] font-black uppercase tracking-wider text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>● 100% ORIGINAL PRODUCTS</span>
              </div>

              {/* Headline */}
              <h1 className="font-display text-3xl sm:text-5xl xl:text-6xl font-black tracking-tight leading-[1.08]">
                <span className={`block ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  Premium Tech.
                </span>
                <span className="block bg-gradient-to-r from-[#00C4CC] via-[#00E5FF] to-[#38BDF8] bg-clip-text text-transparent">
                  Original Accessories.
                </span>
              </h1>

              {/* Supporting Text */}
              <p
                className={`text-sm sm:text-base leading-relaxed max-w-xl mx-auto lg:mx-0 font-medium ${
                  isLight ? 'text-slate-700' : 'text-slate-200'
                }`}
                style={!isLight ? { color: '#F1F5F9' } : undefined}
              >
                Fast chargers, power banks, wireless earbuds, cables &amp; smart accessories — sourced at direct rates and delivered across Pakistan.
              </p>

              {/* CTA Action Buttons (Optimized Conversion Hierarchy) */}
              <div className="pt-2 flex flex-wrap items-center justify-center lg:justify-start gap-3">
                {/* 1. Primary CTA: Shop Gadgets */}
                <a
                  href="#product-catalog"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#00C4CC] to-[#00E5FF] hover:brightness-110 px-6 py-3.5 font-display text-sm font-black text-[#04080F] shadow-[0_0_28px_rgba(0,196,204,0.45)] transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer"
                >
                  <span>Shop Gadgets →</span>
                </a>

                {/* 2. Secondary Prominent CTA: 🔥 Hot Deals */}
                <button
                  type="button"
                  onClick={() => setOffersOnly((prev) => !prev)}
                  className={`inline-flex items-center gap-2 rounded-2xl border px-5 py-3.5 font-display text-sm font-bold transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer ${
                    offersOnly
                      ? 'border-rose-400 bg-gradient-to-r from-amber-500 to-rose-500 text-white shadow-[0_0_22px_rgba(244,63,94,0.45)]'
                      : isLight
                      ? 'border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100'
                      : 'border-amber-500/50 bg-amber-500/15 text-amber-300 hover:bg-amber-500/25 shadow-[0_0_18px_rgba(245,158,11,0.2)]'
                  }`}
                >
                  <span>🔥</span>
                  <span>{offersOnly ? 'Showing Deals' : 'Hot Deals'}</span>
                </button>

                {/* 3. Tertiary De-emphasized CTA: Rate List */}
                <button
                  type="button"
                  onClick={handleDownloadRateSheet}
                  className={`inline-flex items-center justify-center gap-2 rounded-2xl border px-4 py-3.5 font-display text-xs font-semibold transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer ${
                    isLight
                      ? 'border-slate-300 bg-slate-100/90 text-slate-700 hover:bg-slate-200'
                      : 'border-slate-800 bg-[#0A1220]/70 text-slate-300 hover:text-white hover:bg-[#0F1C30] hover:border-slate-600'
                  }`}
                  title="Print or Save Official Catalog Price Sheet"
                >
                  <span>📄</span>
                  <span>Rate List</span>
                </button>
              </div>

              {/* Conversion-Focused Trust Trigger Line */}
              <div className="pt-1 flex flex-wrap items-center justify-center lg:justify-start gap-x-3 gap-y-1.5 text-xs font-semibold">
                <span className="inline-flex items-center gap-1.5 text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  COD Available Nationwide
                </span>
                <span className="text-slate-600 hidden sm:inline">•</span>
                <span className="inline-flex items-center gap-1.5 text-slate-300">
                  <span className="text-[#00C4CC]">💬</span> Easy WhatsApp Ordering
                </span>
              </div>
            </div>

            {/* RIGHT COLUMN: 4-5 GADGET COMMERCIAL COMPOSITION (lg:col-span-6 xl:col-span-5) */}
            <div className="lg:col-span-6 xl:col-span-5 relative flex items-center justify-center">
              <HeroProductComposition
                products={initialProducts}
                customHeroImage={settings?.hero_image_url}
                isLight={isLight}
              />
            </div>
          </div>

          {/* ─────────────────────────────────────────────────────────────
              BENEFITS & TRUST VALUE PILLARS (Compact & Sleek)
          ───────────────────────────────────────────────────────────── */}
          <div className="mt-8 pt-6 border-t border-slate-800/50 grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
            <div
              className={`flex items-center gap-3 py-2.5 px-3 sm:px-3.5 rounded-2xl border transition-all duration-200 ${
                isLight
                  ? 'border-slate-200 bg-slate-50/80 text-slate-900 hover:border-slate-300'
                  : 'border-slate-800/80 bg-[#091220]/70 text-white hover:border-[#00C4CC]/30 hover:bg-[#0C1728]'
              }`}
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#00C4CC]/10 border border-[#00C4CC]/20 text-base shadow-[0_0_10px_rgba(0,196,204,0.15)]">
                🛡️
              </div>
              <div className="min-w-0">
                <strong className="block text-xs font-extrabold uppercase tracking-wider font-display truncate text-white">
                  100% Authentic
                </strong>
                <span
                  className={`block text-[11px] font-medium truncate ${isLight ? 'text-slate-600' : 'text-slate-300'}`}
                  style={!isLight ? { color: '#CBD5E1' } : undefined}
                >
                  Original Products
                </span>
              </div>
            </div>

            <div
              className={`flex items-center gap-3 py-2.5 px-3 sm:px-3.5 rounded-2xl border transition-all duration-200 ${
                isLight
                  ? 'border-slate-200 bg-slate-50/80 text-slate-900 hover:border-slate-300'
                  : 'border-slate-800/80 bg-[#091220]/70 text-white hover:border-[#00C4CC]/30 hover:bg-[#0C1728]'
              }`}
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-base shadow-[0_0_10px_rgba(6,182,212,0.15)]">
                🚚
              </div>
              <div className="min-w-0">
                <strong className="block text-xs font-extrabold uppercase tracking-wider font-display truncate text-white">
                  2–4 Day Delivery
                </strong>
                <span
                  className={`block text-[11px] font-medium truncate ${isLight ? 'text-slate-600' : 'text-slate-300'}`}
                  style={!isLight ? { color: '#CBD5E1' } : undefined}
                >
                  Pakistan-Wide
                </span>
              </div>
            </div>

            <div
              className={`flex items-center gap-3 py-2.5 px-3 sm:px-3.5 rounded-2xl border transition-all duration-200 ${
                isLight
                  ? 'border-slate-200 bg-slate-50/80 text-slate-900 hover:border-slate-300'
                  : 'border-slate-800/80 bg-[#091220]/70 text-white hover:border-[#00C4CC]/30 hover:bg-[#0C1728]'
              }`}
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-base shadow-[0_0_10px_rgba(16,185,129,0.15)]">
                💵
              </div>
              <div className="min-w-0">
                <strong className="block text-xs font-extrabold uppercase tracking-wider font-display truncate text-white">
                  Cash on Delivery
                </strong>
                <span
                  className={`block text-[11px] font-medium truncate ${isLight ? 'text-slate-600' : 'text-slate-300'}`}
                  style={!isLight ? { color: '#CBD5E1' } : undefined}
                >
                  Pay at Doorstep
                </span>
              </div>
            </div>

            <div
              className={`flex items-center gap-3 py-2.5 px-3 sm:px-3.5 rounded-2xl border transition-all duration-200 ${
                isLight
                  ? 'border-slate-200 bg-slate-50/80 text-slate-900 hover:border-slate-300'
                  : 'border-slate-800/80 bg-[#091220]/70 text-white hover:border-[#00C4CC]/30 hover:bg-[#0C1728]'
              }`}
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 border border-blue-500/20 text-base shadow-[0_0_10px_rgba(59,130,246,0.15)]">
                💬
              </div>
              <div className="min-w-0">
                <strong className="block text-xs font-extrabold uppercase tracking-wider font-display truncate text-white">
                  WhatsApp Support
                </strong>
                <span
                  className={`block text-[11px] font-medium truncate ${isLight ? 'text-slate-600' : 'text-slate-300'}`}
                  style={!isLight ? { color: '#CBD5E1' } : undefined}
                >
                  Quick Assistance
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Real-time Flash Sale Countdown Urgency Banner */}
        <FlashSaleBanner
          onShopDeals={() => setIsOffersModalOpen(true)}
          isLight={isLight}
        />

        {/* Exclusive Active Deals & Offers Modal */}
        <OffersModal
          isOpen={isOffersModalOpen}
          onClose={() => setIsOffersModalOpen(false)}
          products={initialProducts}
          settings={settings}
          onFilterDeals={() => {
            setOffersOnly(true);
            setIsOffersModalOpen(false);
          }}
          isLight={isLight}
        />

        {/* Free Delivery Announcement Banner */}
        {isMounted && freeShippingThreshold > 0 && (
          <div
            className={`rounded-2xl border p-3.5 sm:p-4 text-center transition-all ${
              isLight
                ? 'border-emerald-200 bg-emerald-50/70 text-emerald-900 shadow-sm'
                : 'border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-emerald-500/10 text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.1)]'
            }`}
          >
            <div className="flex items-center justify-center gap-2 text-xs sm:text-sm font-black">
              <span className="text-base sm:text-lg">🚚</span>
              <span className="font-display tracking-wide uppercase">
                FREE Nationwide Delivery on orders above Rs. {freeShippingThreshold.toLocaleString('en-PK')}
              </span>
              <span className="text-base sm:text-lg">✨</span>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* SHOP BY CATEGORY COMPONENT                                   */}
        {/* ============================================================ */}
        <div className="hidden sm:block">
          <ShopByCategoryGrid
            categories={categories}
            products={initialProducts}
            selectedCategory={selectedCategory}
            onSelectCategory={(slug) => {
              setSelectedCategory(slug);
              setOffersOnly(false);
            }}
            isLight={isLight}
          />
        </div>

        {/* ============================================================ */}
        {/* STATS BAR + INSTOCK SWITCH + SORTING SELECTOR                */}
        {/* ============================================================ */}
        <div id="product-catalog" className="scroll-mt-24 space-y-4 pt-2">
        {(() => {
          const activeCategoriesCount = categories.filter(
            (c) => (categoryCounts[c.slug] || 0) > 0
          ).length;
          return (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
              <div className="text-xs sm:text-sm font-medium text-slate-400 flex items-center gap-2">
                <span>Showing</span>
                <span className="font-extrabold text-[#00C4CC] font-display">
                  {filteredProducts.length}
                </span>
                <span>products across</span>
                <span className={`font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  {activeCategoriesCount}
                </span>
                <span>categories</span>
              </div>

              <div className="flex items-center gap-2.5">
                {/* Hot Deals Toggle Pill */}
                <button
                  type="button"
                  onClick={() => setOffersOnly((prev) => !prev)}
                  className={`hidden sm:flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition duration-200 cursor-pointer ${
                    offersOnly
                      ? 'border-rose-500 bg-rose-500/20 text-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.3)] ring-1 ring-rose-500'
                      : isLight
                      ? 'border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100'
                      : 'border-amber-500/40 bg-amber-500/10 text-amber-300 hover:border-amber-400 hover:bg-amber-500/20'
                  }`}
                >
                  <span>🔥</span>
                  <span>Hot Deals</span>
                  {dealsCount > 0 && (
                    <span
                      className={`rounded-full px-1.5 py-0.2 text-[9px] font-black ${
                        offersOnly ? 'bg-rose-500 text-white' : 'bg-amber-500/30 text-amber-300'
                      }`}
                    >
                      {dealsCount}
                    </span>
                  )}
                </button>

                {/* In-Stock Toggle Pill */}
                <button
                  type="button"
                  onClick={() => setInStockOnly((prev) => !prev)}
                  className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition duration-200 cursor-pointer ${
                    inStockOnly
                      ? 'border-emerald-500 bg-emerald-500/15 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.25)]'
                      : isLight
                      ? 'border-slate-300 bg-white text-slate-600 hover:border-slate-400'
                      : 'border-slate-800 bg-[#0B121E] text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <span
                    className={`h-2 w-2 rounded-full ${
                      inStockOnly ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
                    }`}
                  />
                  <span>In-Stock Only</span>
                </button>

                {/* Sort Dropdown */}
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className={`cursor-pointer rounded-xl border px-3 py-1.5 text-xs font-bold focus:border-[#00C4CC] focus:outline-none transition ${cardBg}`}
                >
                  <option value="default">Sort: Default ▾</option>
                  <option value="price_asc">Price: Low to High</option>
                  <option value="price_desc">Price: High to Low</option>
                  <option value="discount">Biggest Discount</option>
                  <option value="newest">Newest Arrivals</option>
                </select>

                {/* View Mode Switcher */}
                <div
                  className={`hidden sm:flex items-center rounded-xl border p-1 text-xs font-semibold ${cardBg}`}
                >
                  <button
                    type="button"
                    onClick={() => setViewMode('grid')}
                    className={`flex items-center gap-1 rounded-lg px-2.5 py-1 transition duration-150 ${
                      viewMode === 'grid'
                        ? 'bg-[#00C4CC]/20 text-[#00C4CC] border border-[#00C4CC]/40 font-bold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                    title="Grid View"
                  >
                    <span>⊞</span>
                    <span>Grid</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('list')}
                    className={`flex items-center gap-1 rounded-lg px-2.5 py-1 transition duration-150 ${
                      viewMode === 'list'
                        ? 'bg-[#00C4CC]/20 text-[#00C4CC] border border-[#00C4CC]/40 font-bold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                    title="List View"
                  >
                    <span>☰</span>
                    <span>List</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

        {/* ============================================================ */}
        {/* CATEGORY TABS HORIZONTAL SCROLLER                           */}
        {/* ============================================================ */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 pt-1 scrollbar-none" data-tour="customer-categories">
          <button
            type="button"
            onClick={() => {
              setSelectedCategory('all');
              setOffersOnly(false);
            }}
            className={`shrink-0 rounded-full px-4 py-2 text-xs sm:text-sm font-bold transition duration-200 shadow-sm cursor-pointer ${
              selectedCategory === 'all' && !offersOnly
                ? 'bg-gradient-to-r from-[#00C4CC] to-[#00E5FF] text-[#04080F] shadow-[0_0_15px_rgba(0,196,204,0.4)]'
                : isLight
                ? 'border border-slate-200 bg-white text-slate-600 hover:border-[#0891B2]/50 hover:text-slate-900'
                : 'border border-slate-800 bg-[#0B121E] text-slate-300 hover:text-white hover:border-[#00C4CC]/50'
            }`}
          >
            All Products ({initialProducts.length})
          </button>

          {/* Dedicated Hot Deals Tab */}
          <button
            type="button"
            onClick={() => {
              setOffersOnly(true);
              setSelectedCategory('all');
            }}
            className={`shrink-0 flex items-center gap-1.5 rounded-full px-4 py-2 text-xs sm:text-sm font-bold transition duration-200 shadow-sm cursor-pointer ${
              offersOnly
                ? 'bg-gradient-to-r from-amber-500 to-rose-500 text-white shadow-[0_0_18px_rgba(245,158,11,0.5)] ring-1 ring-rose-400'
                : isLight
                ? 'border border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100'
                : 'border border-amber-500/40 bg-amber-500/10 text-amber-300 hover:border-amber-400 hover:bg-amber-500/20'
            }`}
          >
            <span>🔥</span>
            <span>Hot Deals</span>
            {dealsCount > 0 && (
              <span
                className={`rounded-full px-1.5 py-0.2 text-[10px] font-black ${
                  offersOnly ? 'bg-black/40 text-amber-300' : 'bg-amber-500/30 text-amber-300'
                }`}
              >
                {dealsCount}
              </span>
            )}
          </button>

          {categories.map((c) => {
            const count = categoryCounts[c.slug] || 0;
            if (count === 0) return null;
            const isSelected = selectedCategory === c.slug && !offersOnly;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  setSelectedCategory(c.slug);
                  setOffersOnly(false);
                }}
                className={`shrink-0 rounded-full px-4 py-2 text-xs sm:text-sm font-semibold transition duration-200 shadow-sm cursor-pointer ${
                  isSelected
                    ? 'bg-gradient-to-r from-[#00C4CC] to-[#00E5FF] text-[#04080F] font-bold shadow-[0_0_15px_rgba(0,196,204,0.4)]'
                    : isLight
                    ? 'border border-slate-200 bg-white text-slate-600 hover:border-[#0891B2]/50 hover:text-slate-900'
                    : 'border border-slate-800 bg-[#0B121E] text-slate-300 hover:text-white hover:border-[#00C4CC]/50'
                }`}
              >
                {c.name} ({count})
              </button>
            );
          })}
        </div>

        {/* ============================================================ */}
        {/* PRODUCTS LISTING / GRID AREA                                 */}
        {/* ============================================================ */}
        <div className="pt-2">
          {filteredProducts.length === 0 && filteredSeries.length === 0 ? (
            <div className={`flex flex-col items-center justify-center rounded-3xl border py-20 text-center ${cardBg}`}>
              <span className="text-5xl mb-3">📦</span>
              <p className="font-display text-lg font-bold">No products match your filter</p>
              <p className="mt-1 text-xs sm:text-sm text-slate-400 max-w-md">
                We couldn&apos;t find any gadgets matching your query. Try resetting your search or selecting a different category.
              </p>
              {(searchQuery || selectedCategory !== 'all' || inStockOnly || offersOnly) && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('all');
                    setInStockOnly(false);
                    setOffersOnly(false);
                  }}
                  className="mt-5 rounded-2xl bg-[#00C4CC] px-6 py-2.5 font-display text-xs sm:text-sm font-black text-black shadow-md transition hover:brightness-110"
                >
                  Clear All Filters
                </button>
              )}
            </div>
          ) : viewMode === 'grid' ? (
            /* CARDS GRID VIEW */
            <div className="grid grid-cols-2 gap-3 sm:gap-5 sm:grid-cols-3 lg:grid-cols-4">
              {filteredSeries.map((series) => (
                <SeriesCard key={`series-${series.id}`} series={series} settings={settings} isLight={isLight} />
              ))}
              {displayedProducts.map((product, idx) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  settings={settings}
                  isLight={isLight}
                  priority={idx < 4}
                />
              ))}
            </div>
          ) : (
            /* COMPACT LIST / RATE SHEET VIEW */
            <div className={`overflow-hidden rounded-3xl border divide-y ${cardBg} ${isLight ? 'divide-slate-200' : 'divide-slate-800/80'}`}>
              {displayedProducts.map((product) => {
                const primaryImage =
                  product.product_images?.find((i) => i.is_primary)?.image_url ||
                  product.product_images?.[0]?.image_url ||
                  '/images/logo.png';

                const productUrl = `${process.env.NEXT_PUBLIC_SITE_URL || ''}/products/${product.slug}`;
                const phone = settings?.whatsapp_number && settings.whatsapp_number.trim()
                  ? settings.whatsapp_number
                  : '+92 348 9593671';

                const orderLink = buildWhatsAppOrderLink({
                  whatsappNumber: phone,
                  template: settings?.order_message_template || null,
                  productName: product.name,
                  price: product.price,
                  quantity: 1,
                  discount: 0,
                  finalPrice: product.price,
                  productUrl,
                  currencySymbol: settings?.currency_symbol || 'Rs.',
                });

                return (
                  <div
                    key={product.id}
                    className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:p-4 transition duration-150 ${
                      isLight ? 'hover:bg-slate-50' : 'hover:bg-[#0F1A2A]'
                    }`}
                  >
                    {/* Thumbnail & Title */}
                    <div className="flex items-center gap-3.5 min-w-0">
                      <Link
                        href={`/products/${product.slug}`}
                        className={`relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl border p-1 ${
                          isLight ? 'border-slate-200 bg-slate-50' : 'border-slate-800 bg-black/40'
                        }`}
                      >
                        <Image
                          src={primaryImage}
                          alt={product.name}
                          fill
                          className="object-contain"
                          sizes="56px"
                        />
                      </Link>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <Link href={`/products/${product.slug}`}>
                            <h4
                              className={`font-display text-xs sm:text-sm font-bold transition truncate ${
                                isLight
                                  ? 'text-slate-900 hover:text-[#0891B2]'
                                  : 'text-white hover:text-[#00C4CC]'
                              }`}
                            >
                              {product.name}
                            </h4>
                          </Link>
                          {product.category && (
                            <span
                              className={`hidden sm:inline-block rounded-md px-2 py-0.5 text-[10px] font-bold ${
                                isLight
                                  ? 'bg-cyan-50 text-cyan-800 border border-cyan-200'
                                  : 'bg-[#00C4CC]/10 text-[#00C4CC] border border-[#00C4CC]/30'
                              }`}
                            >
                              {product.category.name}
                            </span>
                          )}
                          {product.free_delivery && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-400 whitespace-nowrap">
                              <span>🚚</span>
                              <span>Free Delivery</span>
                            </span>
                          )}
                        </div>
                        {product.short_description && (
                          <p className="text-xs text-slate-400 truncate mt-0.5">
                            {product.short_description}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Stock + Price + Direct Actions */}
                    <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 pl-16 sm:pl-0">
                      {/* Stock badge */}
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold whitespace-nowrap ${
                          product.stock_status === 'in_stock'
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : product.stock_status === 'low_stock'
                            ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                            : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                        }`}
                      >
                        {product.stock_status === 'in_stock'
                          ? 'In Stock'
                          : product.stock_status === 'low_stock'
                          ? 'Low Stock'
                          : 'Out of Stock'}
                      </span>

                      {/* Prices */}
                      <div className="text-right whitespace-nowrap">
                        <div className="font-display text-sm sm:text-base font-black text-[#00C4CC]">
                          {formatPrice(product.price, settings)}
                        </div>
                        {product.old_price && product.old_price > product.price && (
                          <div
                            className={`text-[10px] line-through ${
                              isLight ? 'text-slate-400' : 'text-slate-500'
                            }`}
                          >
                            {formatPrice(product.old_price, settings)}
                          </div>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <a
                          href={orderLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => trackWhatsAppClick(product.id)}
                          className="flex items-center gap-1.5 rounded-xl bg-[#25D366] hover:bg-[#20BD5A] px-3 py-1.5 text-xs font-black text-white shadow-sm transition hover:scale-105 active:scale-95 whitespace-nowrap"
                        >
                          <svg viewBox="0 0 32 32" className="h-3.5 w-3.5 fill-white shrink-0">
                            <path d="M16.001 3C9.373 3 4 8.373 4 15c0 2.34.687 4.52 1.872 6.35L4 29l7.86-1.83A11.94 11.94 0 0016 27c6.627 0 12-5.373 12-12S22.628 3 16.001 3z" />
                          </svg>
                          <span>Order</span>
                        </a>
                        <button
                          type="button"
                          onClick={() => addToCart(product, 1)}
                          className="flex items-center gap-1 rounded-xl bg-[#00C4CC] hover:bg-[#00E5FF] text-black px-2.5 py-1.5 text-xs font-black transition hover:scale-105 active:scale-95 whitespace-nowrap"
                          title="Add to cart"
                        >
                          <span>🛒</span>
                        </button>
                        <Link
                          href={`/products/${product.slug}`}
                          className={`rounded-xl border px-2.5 py-1.5 text-center font-display text-xs font-bold transition whitespace-nowrap ${
                            isLight
                              ? 'border-slate-300 text-slate-700 hover:border-[#0891B2]'
                              : 'border-slate-700 text-slate-300 hover:border-[#00C4CC] hover:text-[#00C4CC]'
                          }`}
                        >
                          Details
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Load More Products Button */}
          {filteredProducts.length > visibleCount && (
            <div className="mt-10 flex flex-col items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setVisibleCount((prev) => prev + 24)}
                className="group relative overflow-hidden flex items-center gap-2.5 rounded-2xl border border-[#00C4CC]/50 bg-[#00C4CC]/10 hover:bg-[#00C4CC] px-8 py-3.5 font-display text-sm font-black text-[#00C4CC] hover:text-black transition duration-200 shadow-[0_0_25px_rgba(0,196,204,0.15)] hover:scale-105 active:scale-95"
              >
                <span>Load More Products</span>
                <span className="rounded-full bg-[#00C4CC]/20 group-hover:bg-black/20 px-2 py-0.5 text-xs font-black">
                  +{Math.min(24, filteredProducts.length - visibleCount)} more
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent -translate-x-full group-hover:animate-shine" />
              </button>
              <span className="text-xs text-slate-400">
                Showing {displayedProducts.length} of {filteredProducts.length} products
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  </div>
);
}
