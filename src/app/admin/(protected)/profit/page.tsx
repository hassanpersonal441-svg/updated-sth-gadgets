'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';

interface ProfitSummary {
  totalRevenue: number;
  totalProductCost: number;
  grossProfit: number;
  averageProfitMargin: number;
  todayProfit: number;
  weekProfit: number;
  monthProfit: number;
  bestProfitProduct: {
    name: string;
    profit: number;
    margin: number;
  } | null;
  lowestMarginProduct: {
    name: string;
    margin: number;
    sellingPrice: number;
    purchasePrice: number;
  } | null;
}

interface ProductProfitItem {
  id: string;
  name: string;
  sku: string;
  categoryName: string;
  sellingPrice: number;
  purchasePrice: number;
  unitsSold: number;
  revenue: number;
  cost: number;
  profit: number;
  margin: number;
}

interface CategoryProfitItem {
  id: string;
  name: string;
  productsSold: number;
  revenue: number;
  cost: number;
  profit: number;
  margin: number;
}

// In-memory cache for instant module opening without blocking loading spinner
let cachedProfit: {
  summary: ProfitSummary | null;
  products: ProductProfitItem[];
  categories: CategoryProfitItem[];
} | null = null;

export default function AdminProfitPage() {
  const [summary, setSummary] = useState<ProfitSummary | null>(cachedProfit?.summary || null);
  const [products, setProducts] = useState<ProductProfitItem[]>(cachedProfit?.products || []);
  const [categories, setCategories] = useState<CategoryProfitItem[]>(cachedProfit?.categories || []);
  const [loading, setLoading] = useState(!cachedProfit);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<
    'profit_desc' | 'profit_asc' | 'margin_desc' | 'margin_asc' | 'revenue_desc' | 'units_desc'
  >('profit_desc');

  async function fetchProfitData() {
    if (!cachedProfit) {
      setLoading(true);
    }
    try {
      const res = await fetch('/api/admin/profit');
      const data = await res.json();
      if (data.success) {
        cachedProfit = {
          summary: data.summary,
          products: data.products || [],
          categories: data.categories || [],
        };
        setSummary(data.summary);
        setProducts(data.products || []);
        setCategories(data.categories || []);
      }
    } catch (err) {
      console.error('Failed to load profit data:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchProfitData();
  }, []);

  const filteredAndSortedProducts = useMemo(() => {
    return products
      .filter((p) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase().trim();
        return (
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          p.categoryName.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        switch (sortBy) {
          case 'profit_desc':
            return b.profit - a.profit || (b.sellingPrice - b.purchasePrice) - (a.sellingPrice - a.purchasePrice);
          case 'profit_asc':
            return a.profit - b.profit || (a.sellingPrice - a.purchasePrice) - (b.sellingPrice - b.purchasePrice);
          case 'margin_desc':
            return b.margin - a.margin;
          case 'margin_asc':
            return a.margin - b.margin;
          case 'revenue_desc':
            return b.revenue - a.revenue;
          case 'units_desc':
            return b.unitsSold - a.unitsSold;
          default:
            return 0;
        }
      });
  }, [products, searchQuery, sortBy]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">💰</span>
            <h1 className="font-display text-2xl font-black text-silver-bright sm:text-3xl">
              Profit & Margins Management
            </h1>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-silver-dim">
            Real Supabase financial accounting: purchase costs, gross profit, margin percentages, and historical order performance.
          </p>
        </div>

        <button
          onClick={fetchProfitData}
          disabled={loading}
          className="flex items-center gap-2 self-start rounded-xl border border-slate-800 bg-[#0C1420] px-4 py-2 text-xs font-semibold text-silver-bright hover:border-[#00C4CC] hover:text-[#00C4CC] transition"
        >
          <span>↻</span>
          <span>{loading ? 'Calculating...' : 'Recalculate Financials'}</span>
        </button>
      </div>

      {loading && !summary ? (
        <div className="py-20 text-center text-xs text-silver-dim flex flex-col items-center gap-2">
          <span className="h-5 w-5 rounded-full border-2 border-[#00C4CC] border-t-transparent animate-spin"></span>
          <span>Calculating profit & costs from Supabase database...</span>
        </div>
      ) : (
        <>
          {/* Main Financial KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Revenue */}
            <div className="rounded-2xl border border-slate-800 bg-[#0C1420] p-5 shadow-sm">
              <div className="flex items-center justify-between text-xs text-silver-dim">
                <span>Total Order Revenue</span>
                <span className="text-base">💵</span>
              </div>
              <div className="mt-2 font-display text-2xl font-black text-silver-bright">
                PKR {summary?.totalRevenue.toLocaleString('en-PK') || 0}
              </div>
              <p className="mt-1 text-[11px] text-silver-dim">From approved customer orders</p>
            </div>

            {/* Total Product Cost */}
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5 shadow-sm">
              <div className="flex items-center justify-between text-xs text-amber-400 font-semibold">
                <span>Total Product Cost</span>
                <span className="text-base">🏷️</span>
              </div>
              <div className="mt-2 font-display text-2xl font-black text-amber-300">
                PKR {summary?.totalProductCost.toLocaleString('en-PK') || 0}
              </div>
              <p className="mt-1 text-[11px] text-silver-dim">Snapshot supplier purchase cost</p>
            </div>

            {/* Gross Profit */}
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-5 shadow-sm">
              <div className="flex items-center justify-between text-xs text-emerald-400 font-semibold">
                <span>Gross Profit</span>
                <span className="text-base">📈</span>
              </div>
              <div className="mt-2 font-display text-2xl font-black text-emerald-400">
                PKR {summary?.grossProfit.toLocaleString('en-PK') || 0}
              </div>
              <p className="mt-1 text-[11px] text-silver-dim">Revenue − Total Purchase Cost</p>
            </div>

            {/* Average Margin */}
            <div className="rounded-2xl border border-[#00C4CC]/30 bg-[#00C4CC]/5 p-5 shadow-sm">
              <div className="flex items-center justify-between text-xs text-[#00C4CC] font-semibold">
                <span>Average Profit Margin</span>
                <span className="text-base">📊</span>
              </div>
              <div className="mt-2 font-display text-2xl font-black text-[#00C4CC]">
                {summary?.averageProfitMargin || 0}%
              </div>
              <p className="mt-1 text-[11px] text-silver-dim">(Gross Profit / Revenue) × 100</p>
            </div>
          </div>

          {/* Timeframe & Product Highlights Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Today's Profit */}
            <div className="rounded-2xl border border-slate-800 bg-[#0C1420] p-4">
              <span className="text-xs text-silver-dim">Today's Profit</span>
              <div className="mt-1 font-display text-xl font-bold text-emerald-400">
                PKR {summary?.todayProfit.toLocaleString('en-PK') || 0}
              </div>
            </div>

            {/* This Week's Profit */}
            <div className="rounded-2xl border border-slate-800 bg-[#0C1420] p-4">
              <span className="text-xs text-silver-dim">This Week's Profit</span>
              <div className="mt-1 font-display text-xl font-bold text-emerald-400">
                PKR {summary?.weekProfit.toLocaleString('en-PK') || 0}
              </div>
            </div>

            {/* This Month's Profit */}
            <div className="rounded-2xl border border-slate-800 bg-[#0C1420] p-4">
              <span className="text-xs text-silver-dim">This Month's Profit</span>
              <div className="mt-1 font-display text-xl font-bold text-emerald-400">
                PKR {summary?.monthProfit.toLocaleString('en-PK') || 0}
              </div>
            </div>

            {/* Best Profit Product */}
            <div className="rounded-2xl border border-slate-800 bg-[#0C1420] p-4">
              <span className="text-xs text-silver-dim">Top Profit Generator</span>
              <div className="mt-1 font-semibold text-xs text-silver-bright truncate" title={summary?.bestProfitProduct?.name || 'N/A'}>
                {summary?.bestProfitProduct?.name || 'N/A'}
              </div>
              <div className="text-[11px] text-[#00C4CC] font-mono mt-0.5">
                {summary?.bestProfitProduct ? `+PKR ${summary.bestProfitProduct.profit.toLocaleString('en-PK')} (${summary.bestProfitProduct.margin}%)` : '-'}
              </div>
            </div>

            {/* Lowest Margin Product */}
            <div className="rounded-2xl border border-slate-800 bg-[#0C1420] p-4">
              <span className="text-xs text-silver-dim">Lowest Margin Item</span>
              <div className="mt-1 font-semibold text-xs text-silver-bright truncate" title={summary?.lowestMarginProduct?.name || 'N/A'}>
                {summary?.lowestMarginProduct?.name || 'N/A'}
              </div>
              <div className="text-[11px] text-amber-400 font-mono mt-0.5">
                {summary?.lowestMarginProduct ? `${summary.lowestMarginProduct.margin}% margin` : '-'}
              </div>
            </div>
          </div>

          {/* Product Profit Analytics Table */}
          <div className="rounded-2xl border border-slate-800 bg-[#0C1420] overflow-hidden shadow-sm space-y-4 p-4 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-display text-base font-bold text-silver-bright flex items-center gap-2">
                  <span>📦</span>
                  <span>Product Profit & Margin Analytics</span>
                </h2>
                <p className="text-xs text-silver-dim mt-0.5">
                  Detailed breakdown of units sold, revenue generated, supplier cost, net profit, and profit margin per product.
                </p>
              </div>

              {/* Search & Sort Controls */}
              <div className="flex flex-wrap items-center gap-3">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search product or SKU..."
                  className="rounded-xl border border-slate-700 bg-[#080D15] px-3 py-1.5 text-xs text-silver-bright placeholder:text-silver-dim/40 focus:border-[#00C4CC] focus:outline-none"
                />

                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="rounded-xl border border-slate-700 bg-[#080D15] px-3 py-1.5 text-xs text-silver-bright focus:border-[#00C4CC] focus:outline-none"
                >
                  <option value="profit_desc">Highest Profit</option>
                  <option value="profit_asc">Lowest Profit</option>
                  <option value="margin_desc">Highest Margin %</option>
                  <option value="margin_asc">Lowest Margin %</option>
                  <option value="revenue_desc">Highest Revenue</option>
                  <option value="units_desc">Most Units Sold</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto -mx-4 sm:-mx-6">
              <table className="w-full text-left text-xs">
                <thead className="border-y border-slate-800 bg-[#080D15] text-[11px] font-bold uppercase tracking-wider text-silver-dim">
                  <tr>
                    <th className="px-6 py-3">Product Name</th>
                    <th className="px-4 py-3">SKU</th>
                    <th className="px-4 py-3">Purchase Cost</th>
                    <th className="px-4 py-3">Selling Price</th>
                    <th className="px-4 py-3">Units Sold</th>
                    <th className="px-4 py-3">Total Revenue</th>
                    <th className="px-4 py-3">Total Cost</th>
                    <th className="px-4 py-3">Net Profit</th>
                    <th className="px-6 py-3 text-right">Profit Margin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredAndSortedProducts.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-xs text-silver-dim">
                        No products match your search.
                      </td>
                    </tr>
                  ) : (
                    filteredAndSortedProducts.map((p) => {
                      const isLoss = p.profit < 0 || p.margin < 0;
                      return (
                        <tr key={p.id} className="hover:bg-[#00C4CC]/5 transition">
                          <td className="px-6 py-3.5">
                            <div className="font-semibold text-silver-bright">{p.name}</div>
                            <div className="text-[11px] text-silver-dim">{p.categoryName}</div>
                          </td>
                          <td className="px-4 py-3.5 font-mono text-silver-dim">
                            {p.sku}
                          </td>
                          <td className="px-4 py-3.5 font-mono text-amber-300">
                            PKR {p.purchasePrice.toLocaleString('en-PK')}
                          </td>
                          <td className="px-4 py-3.5 font-mono text-silver-bright font-bold">
                            PKR {p.sellingPrice.toLocaleString('en-PK')}
                          </td>
                          <td className="px-4 py-3.5 font-mono text-silver-bright">
                            {p.unitsSold}
                          </td>
                          <td className="px-4 py-3.5 font-mono text-silver-bright">
                            PKR {p.revenue.toLocaleString('en-PK')}
                          </td>
                          <td className="px-4 py-3.5 font-mono text-amber-400/80">
                            PKR {p.cost.toLocaleString('en-PK')}
                          </td>
                          <td className="px-4 py-3.5 font-mono font-bold">
                            <span className={isLoss ? 'text-rose-400' : 'text-emerald-400'}>
                              {p.profit >= 0 ? '+' : ''}PKR {p.profit.toLocaleString('en-PK')}
                            </span>
                          </td>
                          <td className="px-6 py-3.5 text-right font-mono font-black">
                            <span
                              className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] ${
                                isLoss
                                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                  : p.margin >= 30
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                  : 'bg-[#00C4CC]/20 text-[#00C4CC] border border-[#00C4CC]/40'
                              }`}
                            >
                              {p.margin}%
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Category Profit Analytics */}
          <div className="rounded-2xl border border-slate-800 bg-[#0C1420] p-6 shadow-sm space-y-4">
            <div>
              <h2 className="font-display text-base font-bold text-silver-bright flex items-center gap-2">
                <span>🏷️</span>
                <span>Category Profit & Margin Performance</span>
              </h2>
              <p className="text-xs text-silver-dim mt-0.5">
                Financial performance aggregated across product categories.
              </p>
            </div>

            {categories.length === 0 ? (
              <div className="py-8 text-center text-xs text-silver-dim">
                No category sales recorded yet. Once orders are approved, category totals will appear here.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
                {categories.map((c) => (
                  <div key={c.id} className="rounded-xl border border-slate-800 bg-[#080D15] p-4 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-display font-bold text-sm text-silver-bright">{c.name}</span>
                      <span className="rounded-full bg-[#00C4CC]/15 border border-[#00C4CC]/30 px-2 py-0.5 text-[10px] font-mono font-bold text-[#00C4CC]">
                        {c.margin}% Margin
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                      <div>
                        <span className="text-silver-dim text-[11px]">Units Sold</span>
                        <div className="font-mono font-bold text-silver-bright">{c.productsSold}</div>
                      </div>
                      <div>
                        <span className="text-silver-dim text-[11px]">Revenue</span>
                        <div className="font-mono font-bold text-silver-bright">PKR {c.revenue.toLocaleString('en-PK')}</div>
                      </div>
                      <div>
                        <span className="text-silver-dim text-[11px]">Product Cost</span>
                        <div className="font-mono text-amber-300">PKR {c.cost.toLocaleString('en-PK')}</div>
                      </div>
                      <div>
                        <span className="text-silver-dim text-[11px]">Net Profit</span>
                        <div className="font-mono font-bold text-emerald-400">PKR {c.profit.toLocaleString('en-PK')}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
