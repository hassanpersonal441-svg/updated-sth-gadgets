'use client';

export const dynamic = 'force-dynamic';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import type { Product } from '@/types/database';
import { formatPrice } from '@/lib/utils';
import { useToast } from '@/context/ToastContext';
import ConfirmModal from '@/components/admin/ConfirmModal';

// In-memory cache for instant module opening without blocking loading spinner
let cachedProducts: Product[] | null = null;

export default function AdminProductsPage() {
  const { success, error: showErrorToast, admin } = useToast();
  const [products, setProducts] = useState<Product[]>(cachedProducts || []);
  const [loading, setLoading] = useState(!cachedProducts);
  const [search, setSearch] = useState('');
  const [stockFilter, setStockFilter] = useState<'all' | 'in_stock' | 'out_of_stock' | 'low_stock'>('all');
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [draggedProductId, setDraggedProductId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [reordering, setReordering] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch('/api/products');
      const data = await res.json();
      if (data.products) {
        const standalone = data.products.filter((product: Product) => product.product_type !== 'series_model');
        cachedProducts = standalone;
        setProducts(standalone);
      }
    } catch {
      showErrorToast('Failed to load products');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // Always clear cache and load fresh data on mount
    cachedProducts = null;
    load();
  }, []);

  async function toggleActive(product: Product) {
    try {
      const res = await fetch(`/api/products/${product.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !product.active }),
      });
      if (res.ok) {
        admin(`Product visibility set to ${!product.active ? 'LIVE' : 'HIDDEN'}`, 'Product Status Updated');
        setProducts((prev) => {
          const next = prev.map((p) => (p.id === product.id ? { ...p, active: !product.active } : p));
          cachedProducts = next;
          return next;
        });
      } else {
        showErrorToast('Failed to update product status');
      }
    } catch {
      showErrorToast('Failed to update product status');
    }
  }

  const canReorder = !search.trim() && stockFilter === 'all';

  async function persistProductOrder(nextProducts: Product[]) {
    const previousProducts = products;
    const normalized = nextProducts.map((product, index) => ({ ...product, sort_order: index }));
    setProducts(normalized);
    cachedProducts = normalized;
    setReordering(true);
    try {
      const res = await fetch('/api/products/reorder', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productIds: normalized.map((product) => product.id) }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to save product sequence');
      success('Product sequence updated on the live store.');
    } catch (error: any) {
      setProducts(previousProducts);
      cachedProducts = previousProducts;
      showErrorToast(error.message || 'Failed to save product sequence');
    } finally {
      setReordering(false);
      setDraggedProductId(null);
      setDropTargetId(null);
    }
  }

  function moveProduct(productId: string, direction: -1 | 1) {
    if (!canReorder || reordering) return;
    const index = products.findIndex((product) => product.id === productId);
    const targetIndex = index + direction;
    if (index < 0 || targetIndex < 0 || targetIndex >= products.length) return;
    const next = [...products];
    [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
    void persistProductOrder(next);
  }

  function handleDrop(targetId: string) {
    if (!canReorder || !draggedProductId || draggedProductId === targetId || reordering) return;
    const fromIndex = products.findIndex((product) => product.id === draggedProductId);
    const toIndex = products.findIndex((product) => product.id === targetId);
    if (fromIndex < 0 || toIndex < 0) return;
    const next = [...products];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    void persistProductOrder(next);
  }

  async function confirmDeleteProduct() {
    if (!productToDelete) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/products/${productToDelete.id}`, { method: 'DELETE' });
      if (res.ok) {
        success(`Product "${productToDelete.name}" deleted successfully!`);
        setProducts((prev) => {
          const next = prev.filter((p) => p.id !== productToDelete.id);
          cachedProducts = next;
          return next;
        });
        setProductToDelete(null);
      } else {
        const data = await res.json().catch(() => ({}));
        showErrorToast(data.error || 'Failed to delete product');
      }
    } catch (err: any) {
      showErrorToast(err.message || 'Failed to delete product');
    } finally {
      setDeleting(false);
    }
  }

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const matchSearch =
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.category?.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (p.sku || '').toLowerCase().includes(search.toLowerCase());
      const matchStock = stockFilter === 'all' || p.stock_status === stockFilter;
      return matchSearch && matchStock;
    });
  }, [products, search, stockFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800 pb-6">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-silver-bright">
            Products Management
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-silver-dim">
            Total {products.length} products listed in your store catalog
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/products/bundles"
            className="flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-2.5 font-display text-xs sm:text-sm font-bold text-white hover:border-[#00C4CC] transition shadow-sm"
          >
            <span>🎁</span>
            <span>Bundle Deals</span>
          </Link>
          <Link
            href="/admin/products/new"
            className="flex items-center justify-center gap-2 rounded-xl bg-[#00C4CC] hover:bg-[#00B2B9] px-4 py-2.5 font-display text-xs sm:text-sm font-bold text-black shadow-[0_0_15px_rgba(0,196,204,0.3)] transition hover:scale-[1.02]"
          >
            <span>+</span>
            <span>Add New Product</span>
          </Link>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-slate-800 bg-[#0C1420] p-4">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products by name, SKU, or category..."
            className="w-full rounded-xl border border-slate-700/80 bg-[#080D15] py-2 pl-4 pr-10 text-xs sm:text-sm text-silver-bright placeholder:text-silver-dim/50 focus:border-[#00C4CC] focus:outline-none"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-xs text-silver-dim hover:text-white"
            >
              ✕
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-silver-dim">Stock:</span>
          <select
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value as any)}
            className="rounded-xl border border-slate-700/80 bg-[#080D15] px-3 py-2 text-xs font-semibold text-silver-bright focus:border-[#00C4CC] focus:outline-none"
          >
            <option value="all">All Stock Status</option>
            <option value="in_stock">In Stock</option>
            <option value="low_stock">Low Stock</option>
            <option value="out_of_stock">Out of Stock</option>
          </select>
        </div>
      </div>

      <div className={`flex flex-col gap-2 rounded-2xl border px-4 py-3 text-xs sm:flex-row sm:items-center sm:justify-between ${canReorder ? 'border-[#00C4CC]/30 bg-[linear-gradient(100deg,rgba(0,196,204,0.12),rgba(8,13,21,0.7))] text-[#C9D2DB]' : 'border-amber-500/30 bg-amber-500/5 text-amber-300'}`}>
        <div className="flex items-center gap-2.5">
          <span className={`flex h-8 w-8 items-center justify-center rounded-lg text-base ${canReorder ? 'bg-[#00C4CC]/15 text-[#00C4CC]' : 'bg-amber-500/15 text-amber-300'}`}>☷</span>
          <div><strong className={canReorder ? 'text-white' : ''}>{canReorder ? 'Live Store Sequence' : 'Reordering paused'}</strong><span className="ml-2 text-slate-400">{canReorder ? 'Drag cards or use the arrows to set the storefront order.' : 'Clear search and stock filters to reorder the full catalog.'}</span></div>
        </div>
        {reordering ? <span className="font-semibold text-[#00C4CC]">Saving sequence...</span> : canReorder && <span className="font-mono text-[10px] text-slate-500">{products.length} positions</span>}
      </div>

      {/* Products Container */}
      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-[#0C1420] shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-silver-dim gap-2">
            <span className="h-5 w-5 rounded-full border-2 border-[#00C4CC] border-t-transparent animate-spin"></span>
            <span className="text-sm">Loading products catalog...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center text-silver-dim">
            <p className="text-base font-semibold text-silver-bright">No matching products found</p>
            <p className="mt-1 text-xs">Try clearing your filters or create a new product.</p>
          </div>
        ) : (
          <>
            {/* Mobile Cards View (< md screens) */}
            <div className="divide-y divide-slate-800/80 md:hidden">
              {filtered.map((p, index) => {
                const img =
                  p.product_images?.find((i) => i.is_primary)?.image_url ||
                  p.product_images?.[0]?.image_url ||
                  '/images/logo.png';

                return (
                  <div key={p.id} className={`relative p-4 space-y-3 transition ${draggedProductId === p.id ? 'opacity-50' : ''} ${dropTargetId === p.id ? 'bg-[#00C4CC]/10 ring-1 ring-inset ring-[#00C4CC]' : 'hover:bg-[#00C4CC]/5'}`} draggable={canReorder} onDragStart={() => setDraggedProductId(p.id)} onDragOver={(event) => { event.preventDefault(); setDropTargetId(p.id); }} onDragLeave={() => setDropTargetId(null)} onDrop={() => handleDrop(p.id)}>
                    <div className="flex items-start gap-3">
                      <div className="flex shrink-0 flex-col items-center gap-1 pt-1">
                        <span className="rounded-md bg-[#00C4CC]/10 px-1.5 py-0.5 font-mono text-[10px] font-bold text-[#00C4CC]">{String(index + 1).padStart(2, '0')}</span>
                        <span className="cursor-grab text-slate-500" title="Drag to reorder">☷</span>
                        <button type="button" onClick={() => moveProduct(p.id, -1)} disabled={!canReorder || index === 0 || reordering} className="min-h-8 min-w-8 rounded-lg border border-slate-700 text-slate-400 disabled:opacity-30" title="Move product up">↑</button>
                        <button type="button" onClick={() => moveProduct(p.id, 1)} disabled={!canReorder || index === filtered.length - 1 || reordering} className="min-h-8 min-w-8 rounded-lg border border-slate-700 text-slate-400 disabled:opacity-30" title="Move product down">↓</button>
                      </div>
                      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-slate-800 bg-black/40 p-1">
                        <Image src={img} alt={p.name} fill className="object-contain" sizes="64px" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-silver-bright text-sm line-clamp-1">
                          {p.name}
                        </h4>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                          {p.sku && (
                            <span className="font-mono text-[10px] text-silver-dim bg-slate-800/80 px-1.5 py-0.2 rounded">
                              {p.sku}
                            </span>
                          )}
                          <span className="rounded bg-[#00C4CC]/10 border border-[#00C4CC]/30 px-1.5 py-0.2 text-[10px] font-bold text-[#00C4CC]">
                            {p.category?.name || 'Uncategorized'}
                          </span>
                        </div>
                        <div className="mt-1 font-display font-bold text-[#00C4CC] text-sm">
                          {formatPrice(p.price)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-800/60 text-xs">
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            p.stock_status === 'in_stock'
                              ? 'bg-emerald-500/15 text-emerald-400'
                              : p.stock_status === 'low_stock'
                              ? 'bg-amber-500/15 text-amber-400'
                              : 'bg-rose-500/15 text-rose-400'
                          }`}
                        >
                          {p.stock_status.replace('_', ' ').toUpperCase()}
                        </span>

                        <button
                          type="button"
                          onClick={() => toggleActive(p)}
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold transition ${
                            p.active
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                          }`}
                        >
                          {p.active ? '● Live' : '○ Hidden'}
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        <Link
                          href={`/admin/products/${p.id}/edit`}
                          className="rounded-lg border border-slate-700 bg-slate-800/40 px-3 py-1.5 text-xs font-semibold text-silver-bright hover:text-[#00C4CC] transition"
                        >
                          Edit
                        </Link>
                        <button
                          type="button"
                          onClick={() => setProductToDelete(p)}
                          className="rounded-lg border border-rose-900/60 bg-rose-950/20 px-3 py-1.5 text-xs font-semibold text-rose-400 hover:bg-rose-900/40 transition"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table View (>= md screens) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="border-b border-slate-800 bg-[#080D15]/60 text-silver-dim uppercase text-[11px] font-semibold tracking-wider">
                  <tr>
                    <th className="px-5 py-3.5">Product</th>
                    <th className="px-5 py-3.5">Price</th>
                    <th className="px-5 py-3.5">Stock</th>
                    <th className="px-5 py-3.5">Visibility</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filtered.map((p, index) => {
                    const img =
                      p.product_images?.find((i) => i.is_primary)?.image_url ||
                      p.product_images?.[0]?.image_url ||
                      '/images/logo.png';

                    return (
                      <tr key={p.id} draggable={canReorder} onDragStart={() => setDraggedProductId(p.id)} onDragOver={(event) => { event.preventDefault(); setDropTargetId(p.id); }} onDragLeave={() => setDropTargetId(null)} onDrop={() => handleDrop(p.id)} className={`transition ${draggedProductId === p.id ? 'opacity-50' : ''} ${dropTargetId === p.id ? 'bg-[#00C4CC]/10 shadow-[inset_3px_0_0_#00C4CC]' : 'hover:bg-slate-800/25'}`}>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3.5">
                            <div className="flex flex-col items-center gap-1">
                              <span className="rounded-md bg-[#00C4CC]/10 px-1.5 py-0.5 font-mono text-[10px] font-bold text-[#00C4CC]">{String(index + 1).padStart(2, '0')}</span>
                              <span className="cursor-grab text-slate-500" title="Drag to reorder">☷</span>
                              <div className="flex gap-1">
                                <button type="button" onClick={() => moveProduct(p.id, -1)} disabled={!canReorder || index === 0 || reordering} className="min-h-7 min-w-7 rounded border border-slate-700 text-[10px] text-slate-400 disabled:opacity-30" title="Move product up">↑</button>
                                <button type="button" onClick={() => moveProduct(p.id, 1)} disabled={!canReorder || index === filtered.length - 1 || reordering} className="min-h-7 min-w-7 rounded border border-slate-700 text-[10px] text-slate-400 disabled:opacity-30" title="Move product down">↓</button>
                              </div>
                            </div>
                            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-slate-800 bg-black/40 p-1">
                              <Image src={img} alt={p.name} fill className="object-contain" sizes="48px" />
                            </div>
                            <div>
                              <p className="font-semibold text-silver-bright line-clamp-1">{p.name}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                {p.sku && (
                                  <span className="font-mono text-[10px] text-silver-dim bg-slate-800/80 px-1.5 py-0.2 rounded">
                                    {p.sku}
                                  </span>
                                )}
                                <span className="rounded bg-[#00C4CC]/10 border border-[#00C4CC]/30 px-1.5 py-0.2 text-[10px] font-bold text-[#00C4CC]">
                                  {p.category?.name || 'Uncategorized'}
                                </span>
                                {p.discount > 0 && (
                                  <span className="text-[10px] font-extrabold text-amber-400">
                                    -{Math.round(p.discount)}% OFF
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-4 font-display">
                          <div className="font-bold text-[#00C4CC] text-sm">
                            {formatPrice(p.price)}
                          </div>
                          {p.purchase_price !== undefined && (
                            <div className="text-[10px] text-amber-300/90 font-mono mt-0.5">
                              Cost: {formatPrice(p.purchase_price)}
                              <span className="ml-1.5 text-emerald-400 font-bold">
                                ({p.price > 0 ? Math.round(((p.price - p.purchase_price) / p.price) * 100) : 0}%)
                              </span>
                            </div>
                          )}
                          {p.old_price && p.old_price > p.price && (
                            <div className="text-[10px] text-silver-dim line-through">
                              {formatPrice(p.old_price)}
                            </div>
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold whitespace-nowrap ${
                              p.stock_status === 'in_stock'
                                ? 'bg-emerald-500/15 text-emerald-400'
                                : p.stock_status === 'low_stock'
                                ? 'bg-amber-500/15 text-amber-400'
                                : 'bg-rose-500/15 text-rose-400'
                            }`}
                          >
                            {p.stock_status.replace('_', ' ').toUpperCase()}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <button
                            onClick={() => toggleActive(p)}
                            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition ${
                              p.active
                                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25'
                                : 'bg-rose-500/15 text-rose-400 border border-rose-500/30 hover:bg-rose-500/25'
                            }`}
                          >
                            <span className={`h-1.5 w-1.5 rounded-full ${p.active ? 'bg-emerald-400' : 'bg-rose-400'}`}></span>
                            <span>{p.active ? 'Live' : 'Hidden'}</span>
                          </button>
                        </td>

                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              href={`/admin/products/${p.id}/edit`}
                              className="rounded-lg border border-slate-700 bg-slate-800/40 px-3 py-1.5 text-xs font-semibold text-silver-bright hover:border-[#00C4CC] hover:text-[#00C4CC] transition"
                            >
                              Edit
                            </Link>
                            <button
                              onClick={() => setProductToDelete(p)}
                              className="rounded-lg border border-slate-800 bg-slate-800/20 px-3 py-1.5 text-xs font-semibold text-rose-400 hover:border-rose-500/50 hover:bg-rose-500/10 transition"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!productToDelete}
        onClose={() => setProductToDelete(null)}
        onConfirm={confirmDeleteProduct}
        title="Delete Product Permanently"
        description={`Are you sure you want to permanently delete "${productToDelete?.name}"? This action cannot be undone and will remove all product images and inventory records.`}
        confirmText="Yes, Delete Product"
        isDeleting={deleting}
      />
    </div>
  );
}
