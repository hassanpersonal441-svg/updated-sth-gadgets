'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import type { Category, Product, Settings } from '@/types/database';
import { formatPrice, buildWhatsAppOrderLink } from '@/lib/utils';
import { useCart } from '@/context/CartContext';
import ProductCard from './ProductCard';

export default function LiveStorefront({
  initialProducts,
  categories,
  settings,
}: {
  initialProducts: Product[];
  categories: Category[];
  settings: Settings | null;
}) {
  const { addToCart, openCart, totalItems } = useCart();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [offersOnly, setOffersOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'default' | 'price_asc' | 'price_desc' | 'discount' | 'newest'>('default');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isLight, setIsLight] = useState(false);

  const rawPhone = settings?.whatsapp_number || '+92 348 9593671';
  const cleanPhone = rawPhone.replace(/[^\d]/g, '');

  // Toggle light/dark
  function toggleTheme() {
    setIsLight((prev) => !prev);
  }

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
        const oldPriceFormatted = item.old_price && item.old_price > item.price ? formatPrice(item.old_price, settings) : '';
        const statusText = item.stock_status === 'in_stock' ? 'In Stock' : item.stock_status === 'low_stock' ? 'Low Stock' : 'Out of Stock';
        catalogRowsHtml += `
          <tr>
            <td>${idx + 1}</td>
            <td><strong>${item.name}</strong> ${item.short_description ? `<br><small style="color:#666;">${item.short_description}</small>` : ''}</td>
            <td><span class="stock-${item.stock_status}">${statusText}</span></td>
            <td style="text-align:right;">
              <strong style="font-size:14px;">${priceFormatted}</strong>
              ${oldPriceFormatted ? `<br><small style="text-decoration:line-through; color:#888;">${oldPriceFormatted}</small>` : ''}
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
            <strong>Website:</strong> www.sthgadgets.com
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
          Thank you for choosing ${settings?.business_name || 'STH Gadgets'}! Prices are subject to change based on market rates.
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
        const descMatch = (p.short_description || '').toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q);
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
          if (a.featured && !b.featured) return -1;
          if (!a.featured && b.featured) return 1;
          if (a.best_seller && !b.best_seller) return -1;
          if (!a.best_seller && b.best_seller) return 1;
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
    }

    return list;
  }, [initialProducts, searchQuery, selectedCategory, inStockOnly, offersOnly, sortBy]);

  // Progressive rendering for optimal performance & loading speed
  const [visibleCount, setVisibleCount] = useState(24);

  useEffect(() => {
    setVisibleCount(24);
  }, [searchQuery, selectedCategory, inStockOnly, sortBy]);

  const displayedProducts = useMemo(() => {
    return filteredProducts.slice(0, visibleCount);
  }, [filteredProducts, visibleCount]);

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

  // Coupon state per product card
  const [couponInputs, setCouponInputs] = useState<Record<string, string>>({});
  const [appliedCoupons, setAppliedCoupons] = useState<
    Record<
      string,
      {
        code: string;
        discount: number;
        finalPrice: number;
        status: 'idle' | 'checking' | 'valid' | 'invalid';
        message?: string;
      }
    >
  >({});

  async function handleApplyCoupon(productId: string, price: number) {
    const code = (couponInputs[productId] || '').trim();
    if (!code) return;

    setAppliedCoupons((prev) => ({
      ...prev,
      [productId]: { code, discount: 0, finalPrice: price, status: 'checking' },
    }));

    try {
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, orderAmount: price, productId }),
      });
      const data = await res.json();
      if (data.valid) {
        setAppliedCoupons((prev) => ({
          ...prev,
          [productId]: {
            code: code.toUpperCase(),
            discount: data.discountAmount,
            finalPrice: Math.max(0, price - data.discountAmount),
            status: 'valid',
            message: `Saved ${formatPrice(data.discountAmount, settings)}`,
          },
        }));
      } else {
        setAppliedCoupons((prev) => ({
          ...prev,
          [productId]: {
            code,
            discount: 0,
            finalPrice: price,
            status: 'invalid',
            message: data.reason || 'Invalid coupon',
          },
        }));
      }
    } catch {
      setAppliedCoupons((prev) => ({
        ...prev,
        [productId]: {
          code,
          discount: 0,
          finalPrice: price,
          status: 'invalid',
          message: 'Validation failed',
        },
      }));
    }
  }

  function handleRemoveCoupon(productId: string) {
    setAppliedCoupons((prev) => {
      const next = { ...prev };
      delete next[productId];
      return next;
    });
    setCouponInputs((prev) => {
      const next = { ...prev };
      delete next[productId];
      return next;
    });
  }

  function trackWhatsAppClick(productId: string) {
    fetch('/api/analytics/whatsapp-click', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product_id: productId }),
    }).catch(() => {});
  }

  const themeClasses = isLight
    ? 'bg-[#F4F6F9] text-[#111827]'
    : 'bg-[#05080E] text-[#C9D2DB]';

  const cardBg = isLight ? 'bg-white border-slate-200' : 'bg-[#0C1420] border-slate-800';
  const inputBg = isLight ? 'bg-slate-100 border-slate-300 text-slate-900 placeholder:text-slate-400' : 'bg-[#080D15] border-slate-800 text-silver-bright placeholder:text-silver-dim/50';

  return (
    <div className={`min-h-screen transition-colors duration-300 ${themeClasses}`}>
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* ============================================================ */}
        {/* HEADER: STH GADGETS + LIGHT MODE + LIVE RATES + WHATSAPP SHOP */}
        {/* ============================================================ */}
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Brand Left */}
          <div className="flex items-center gap-3.5">
            <Link href="/" className="group relative flex shrink-0 items-center justify-center">
              <div className="relative h-14 w-14 sm:h-16 sm:w-16 overflow-hidden rounded-full border-2 border-[#00C4CC] bg-black p-0.5 shadow-[0_0_16px_rgba(0,196,204,0.45)] transition group-hover:scale-105">
                <Image
                  src={settings?.logo_url || '/images/logo.png'}
                  alt={settings?.business_name || 'STH Gadgets'}
                  fill
                  className="object-cover rounded-full"
                  priority
                />
              </div>
            </Link>
            <div>
              <Link href="/">
                <h1 className="font-display text-2xl sm:text-3xl font-black tracking-wider uppercase text-silver-bright">
                  {settings?.business_name || 'STH GADGETS'}
                </h1>
              </Link>
              <p className="text-xs sm:text-sm font-medium text-[#00C4CC] tracking-wide">
                Mobile Accessories & Gadgets — Official Rates
              </p>
            </div>
          </div>

          {/* Controls Right */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {/* Light / Dark Mode Button */}
            <button
              onClick={toggleTheme}
              className={`flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold shadow-sm transition ${
                isLight
                  ? 'border-slate-300 bg-white text-slate-800 hover:bg-slate-100'
                  : 'border-slate-700/80 bg-[#0C1420] text-silver-bright hover:border-slate-600'
              }`}
            >
              <span>{isLight ? '🌙' : '☀️'}</span>
              <span>{isLight ? 'Dark Mode' : 'Light Mode'}</span>
            </button>

            {/* Live Rates Badge */}
            <div className="flex items-center gap-2 rounded-full border border-emerald-500/30 bg-[#071915] px-3.5 py-1.5 text-xs font-medium text-emerald-400">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
              </span>
              <span>Live Rates</span>
            </div>

            {/* Shopping Cart Button */}
            <button
              onClick={openCart}
              className={`flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs sm:text-sm font-bold shadow-sm transition hover:scale-105 ${
                isLight
                  ? 'border-slate-300 bg-white text-slate-800 hover:bg-slate-100'
                  : 'border-[#00C4CC]/50 bg-[#0C1420] text-[#00C4CC] hover:bg-[#00C4CC]/10'
              }`}
            >
              <span>🛒 Cart</span>
              {totalItems > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#00C4CC] px-1.5 text-[11px] font-black text-black">
                  {totalItems}
                </span>
              )}
            </button>

            {/* Special Offers Toggle Button */}
            <button
              type="button"
              onClick={() => setOffersOnly((prev) => !prev)}
              className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs sm:text-sm font-bold shadow-md transition hover:scale-[1.02] ${
                offersOnly
                  ? 'bg-gradient-to-r from-amber-500 to-rose-500 text-white ring-2 ring-rose-400'
                  : 'bg-gradient-to-r from-amber-500/20 to-rose-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
              }`}
            >
              <span>🔥</span>
              <span>{offersOnly ? 'All Items' : 'Special Offers'}</span>
            </button>

            {/* Rate Sheet PDF Download / Print Button */}
            <button
              type="button"
              onClick={handleDownloadRateSheet}
              className="flex items-center gap-1.5 rounded-full bg-[#00C4CC] hover:bg-[#00B2B9] px-4 py-1.5 text-xs sm:text-sm font-bold text-black shadow-md transition hover:scale-[1.02]"
              title="Download / Print Catalog Rate Sheet"
            >
              <span>📄</span>
              <span>Rate Sheet</span>
            </button>
          </div>
        </header>

        {/* ============================================================ */}
        {/* SEARCH BAR */}
        {/* ============================================================ */}
        <div className="mt-5 relative w-full">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-silver-dim">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search rates by product name, brand, model or specification..."
            className={`w-full rounded-xl border py-3 pl-11 pr-10 text-sm focus:border-[#00C4CC] focus:outline-none focus:ring-1 focus:ring-[#00C4CC] transition ${cardBg}`}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-xs text-silver-dim hover:text-silver-bright"
            >
              ✕
            </button>
          )}
        </div>


        {/* ============================================================ */}
        {/* STATS & FILTER CONTROLS */}
        {/* ============================================================ */}
        {(() => {
          const activeCategoriesCount = categories.filter((c) => (categoryCounts[c.slug] || 0) > 0).length;
          return (
            <div className="mt-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-xs sm:text-sm font-medium text-silver-dim">
                Showing <span className="font-bold text-[#00C4CC]">{filteredProducts.length}</span> products ·{' '}
                <span className="font-bold text-silver-bright">{activeCategoriesCount}</span> categories
              </div>

              <div className="flex items-center gap-2.5">
                {/* In-Stock Only Toggle Pill */}
                <button
                  onClick={() => setInStockOnly((prev) => !prev)}
                  className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition ${
                    inStockOnly
                      ? 'border-emerald-500 bg-emerald-500/15 text-emerald-400'
                      : 'border-slate-800 bg-[#0C1420] text-silver-dim hover:border-slate-700'
                  }`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${inStockOnly ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`}></span>
                  <span>In-Stock Only</span>
                </button>

                {/* Sort Dropdown */}
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className={`cursor-pointer rounded-lg border px-3 py-1 text-xs font-semibold focus:border-[#00C4CC] focus:outline-none ${cardBg}`}
                >
                  <option value="default">Sort: Default ▾</option>
                  <option value="price_asc">Price: Low to High</option>
                  <option value="price_desc">Price: High to Low</option>
                  <option value="discount">Biggest Discount</option>
                  <option value="newest">Newest</option>
                </select>
              </div>
            </div>
          );
        })()}

        {/* ============================================================ */}
        {/* CYAN GLOW DIVIDER */}
        {/* ============================================================ */}
        <div className="mt-3.5 h-[2px] w-full bg-gradient-to-r from-transparent via-[#00C4CC] to-transparent shadow-[0_0_12px_rgba(0,196,204,0.7)]"></div>

        {/* ============================================================ */}
        {/* CATEGORY TABS + VIEW MODE SWITCHER */}
        {/* ============================================================ */}
        <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Category Tabs (Hides categories with 0 products) */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`shrink-0 rounded-full px-4 py-1.5 text-xs sm:text-sm font-bold transition shadow-sm ${
                selectedCategory === 'all'
                  ? 'bg-[#00C4CC] text-black shadow-[0_0_12px_rgba(0,196,204,0.4)]'
                  : `border border-slate-800 text-silver-dim hover:text-silver-bright hover:border-[#00C4CC]/50 ${cardBg}`
              }`}
            >
              All Products ({initialProducts.length})
            </button>
            {categories.map((c) => {
              const count = categoryCounts[c.slug] || 0;
              if (count === 0) return null; // Hide 0-product categories completely
              const isSelected = selectedCategory === c.slug;
              return (
                <button
                  key={c.id}
                  onClick={() => setSelectedCategory(c.slug)}
                  className={`shrink-0 rounded-full px-4 py-1.5 text-xs sm:text-sm font-semibold transition ${
                    isSelected
                      ? 'bg-[#00C4CC] text-black font-bold shadow-[0_0_12px_rgba(0,196,204,0.4)]'
                      : `border border-slate-800 text-silver-dim hover:text-silver-bright hover:border-[#00C4CC]/50 ${cardBg}`
                  }`}
                >
                  {c.name} ({count})
                </button>
              );
            })}
          </div>

          {/* View Mode Switcher */}
          <div className={`flex items-center self-end sm:self-auto shrink-0 rounded-lg border p-1 text-xs font-semibold ${cardBg}`}>
            <button
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 transition ${
                viewMode === 'grid'
                  ? 'bg-[#00C4CC]/20 text-[#00C4CC] border border-[#00C4CC]/50 shadow-sm'
                  : 'text-silver-dim hover:text-silver-bright'
              }`}
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M4 4h4v4H4V4zm6 0h4v4h-4V4zm6 0h4v4h-4V4zM4 10h4v4H4v-4zm6 0h4v4h-4v-4zm6 0h4v4h-4v-4zM4 16h4v4H4v-4zm6 0h4v4h-4v-4zm6 0h4v4h-4v-4z" />
              </svg>
              <span>Grid</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 transition ${
                viewMode === 'list'
                  ? 'bg-[#00C4CC]/20 text-[#00C4CC] border border-[#00C4CC]/50 shadow-sm'
                  : 'text-silver-dim hover:text-silver-bright'
              }`}
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M4 6h16v2H4V6zm0 5h16v2H4v-2zm0 5h16v2H4v-2z" />
              </svg>
              <span>List</span>
            </button>
          </div>
        </div>

        {/* ============================================================ */}
        {/* PRODUCTS AREA */}
        {/* ============================================================ */}
        <div className="mt-6">
          {filteredProducts.length === 0 ? (
            <div className={`flex flex-col items-center justify-center rounded-2xl border py-20 text-center ${cardBg}`}>
              <span className="text-4xl mb-3">📦</span>
              <p className="font-display text-lg font-bold text-silver-bright">No products found</p>
              <p className="mt-1 text-xs sm:text-sm text-silver-dim">
                Try searching for a different keyword or choose another category.
              </p>
              {(searchQuery || selectedCategory !== 'all' || inStockOnly) && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('all');
                    setInStockOnly(false);
                  }}
                  className="mt-4 rounded-xl bg-[#00C4CC] px-5 py-2 font-display text-xs sm:text-sm font-bold text-black shadow-sm transition hover:brightness-110"
                >
                  Clear Filters
                </button>
              )}
            </div>
          ) : viewMode === 'grid' ? (
            /* ============================================================ */
            /* CARDS GRID VIEW (2 cols mobile, 3 tablet, 4 desktop) */
            /* ============================================================ */
            <div className="grid grid-cols-2 gap-3 sm:gap-5 sm:grid-cols-3 lg:grid-cols-4">
              {displayedProducts.map((product) => (
                <ProductCard key={product.id} product={product} settings={settings} isLight={isLight} />
              ))}
            </div>
          ) : (
            /* ============================================================ */
            /* COMPACT LIST / RATE SHEET VIEW */
            /* ============================================================ */
            <div className={`overflow-hidden rounded-2xl border divide-y divide-slate-800 ${cardBg}`}>
              {displayedProducts.map((product) => {
                const primaryImage =
                  product.product_images?.find((i) => i.is_primary)?.image_url ||
                  product.product_images?.[0]?.image_url ||
                  '/images/logo.png';

                return (
                  <div
                    key={product.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 sm:p-3.5 hover:bg-[#00C4CC]/5 transition duration-200"
                  >
                    {/* Left: Thumbnail & Details */}
                    <div className="flex items-center gap-3 min-w-0">
                      <Link
                        href={`/products/${product.slug}`}
                        className="relative h-12 w-12 sm:h-14 sm:w-14 shrink-0 overflow-hidden rounded-xl border border-slate-800 bg-black/30 p-1"
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
                              className={`font-display text-xs sm:text-sm font-bold hover:text-[#00C4CC] transition truncate ${
                                isLight ? 'text-slate-900' : 'text-white'
                              }`}
                            >
                              {product.name}
                            </h4>
                          </Link>
                          {product.category && (
                            <span className="hidden sm:inline-block rounded-full bg-[#00C4CC]/10 border border-[#00C4CC]/30 px-2 py-0.5 text-[10px] font-bold text-[#00C4CC]">
                              {product.category.name}
                            </span>
                          )}
                        </div>
                        {product.short_description && (
                          <p className="text-xs text-silver-dim truncate">{product.short_description}</p>
                        )}
                      </div>
                    </div>

                    {/* Right: Stock + Price + WhatsApp button */}
                    <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 pl-14 sm:pl-0">
                      {/* Stock badge */}
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold whitespace-nowrap ${
                          product.stock_status === 'in_stock'
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : product.stock_status === 'low_stock'
                            ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                            : 'bg-red-500/15 text-red-400 border border-red-500/30'
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
                        <div
                          className={`font-display text-sm sm:text-base font-black ${
                            isLight ? 'text-black' : 'text-white'
                          }`}
                        >
                          {formatPrice(product.price, settings)}
                        </div>
                        {product.old_price && product.old_price > product.price && (
                          <div
                            className={`text-[10px] line-through ${
                              isLight ? 'text-slate-500' : 'text-slate-400'
                            }`}
                          >
                            {formatPrice(product.old_price, settings)}
                          </div>
                        )}
                      </div>

                      {/* Action Buttons */}
                      {(() => {
                        const productUrl = `${process.env.NEXT_PUBLIC_SITE_URL || ''}/products/${product.slug}`;
                        const phone =
                          settings?.whatsapp_number && settings.whatsapp_number.trim()
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
                          <div className="flex items-center gap-1.5 shrink-0">
                            <a
                              href={orderLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={() => trackWhatsAppClick(product.id)}
                              className="flex items-center gap-1 rounded-xl bg-[#25D366] hover:bg-[#20BD5A] px-3 py-1.5 text-xs font-black text-white shadow-sm transition hover:scale-[1.02] whitespace-nowrap"
                            >
                              <svg viewBox="0 0 32 32" className="h-3.5 w-3.5 fill-white shrink-0">
                                <path d="M16.001 3C9.373 3 4 8.373 4 15c0 2.34.687 4.52 1.872 6.35L4 29l7.86-1.83A11.94 11.94 0 0016 27c6.627 0 12-5.373 12-12S22.628 3 16.001 3z" />
                              </svg>
                              <span>Order</span>
                            </a>
                            <button
                              type="button"
                              onClick={() => addToCart(product, 1)}
                              className="flex items-center gap-1 rounded-xl bg-[#00C4CC] hover:bg-[#00B2B9] text-black px-2.5 py-1.5 text-xs font-black transition whitespace-nowrap"
                              title="Add to cart"
                            >
                              <span>🛒</span>
                              <span className="hidden sm:inline">Cart</span>
                            </button>
                            <Link
                              href={`/products/${product.slug}`}
                              className="rounded-xl border border-slate-700/80 hover:border-[#00C4CC] px-2.5 py-1.5 text-center font-display text-xs font-semibold text-silver-bright hover:text-[#00C4CC] transition whitespace-nowrap"
                            >
                              Details
                            </Link>
                          </div>
                        );
                      })()}
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
                className="group flex items-center gap-2 rounded-2xl border border-[#00C4CC]/40 bg-[#00C4CC]/10 hover:bg-[#00C4CC] px-8 py-3.5 font-display text-sm font-bold text-[#00C4CC] hover:text-black transition shadow-[0_0_20px_rgba(0,196,204,0.15)] hover:scale-[1.02]"
              >
                <span>Load More Products</span>
                <span className="rounded-full bg-[#00C4CC]/20 group-hover:bg-black/20 px-2.5 py-0.5 text-xs font-semibold">
                  +{Math.min(24, filteredProducts.length - visibleCount)} more
                </span>
              </button>
              <span className="text-xs text-silver-dim">
                Showing {displayedProducts.length} of {filteredProducts.length} items
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

