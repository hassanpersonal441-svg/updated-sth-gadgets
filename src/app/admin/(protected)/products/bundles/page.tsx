'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type { Product, BundleOffer, BundleOfferItem } from '@/types/database';
import { formatPrice } from '@/lib/utils';
import { useToast } from '@/context/ToastContext';
import ConfirmModal from '@/components/admin/ConfirmModal';

export default function AdminBundleOffersPage() {
  const { success: showSuccessToast, error: showErrorToast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTargetProductId, setEditingTargetProductId] = useState<string>('');
  const [editingBundleIndex, setEditingBundleIndex] = useState<number | null>(null);

  // Form State
  const [targetProductId, setTargetProductId] = useState<string>('');
  const [bundleTitle, setBundleTitle] = useState('Special 2-in-1 Combo Pack');
  const [badgeText, setBadgeText] = useState('SAVE RS. 500 EXTRA');
  const [bundlePrice, setBundlePrice] = useState<string>('');
  const [originalPrice, setOriginalPrice] = useState<string>('');
  const [items, setItems] = useState<BundleOfferItem[]>([
    { name: '', detail: '' },
    { name: '', detail: '' },
  ]);

  // Load all products on mount
  async function fetchProducts() {
    setLoading(true);
    try {
      const res = await fetch('/api/products');
      const data = await res.json();
      if (res.ok && data.products) {
        setProducts(data.products);
      }
    } catch (err) {
      console.error('Failed to load products for bundle manager:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchProducts();
  }, []);

  // Compute flattened list of all bundle offers across products
  const allBundlesList = useMemo(() => {
    const list: { product: Product; bundle: BundleOffer; index: number }[] = [];
    products.forEach((p) => {
      if (p.bundle_offers && p.bundle_offers.length > 0) {
        p.bundle_offers.forEach((b, idx) => {
          list.push({ product: p, bundle: b, index: idx });
        });
      }
    });
    return list;
  }, [products]);

  // Filtered bundles list for search query
  const filteredBundles = useMemo(() => {
    if (!searchQuery.trim()) return allBundlesList;
    const q = searchQuery.toLowerCase().trim();
    return allBundlesList.filter(
      (item) =>
        item.product.name.toLowerCase().includes(q) ||
        item.bundle.title.toLowerCase().includes(q) ||
        (item.bundle.badge_text || '').toLowerCase().includes(q) ||
        item.bundle.items.some(
          (it) => it.name.toLowerCase().includes(q) || (it.detail || '').toLowerCase().includes(q)
        )
    );
  }, [allBundlesList, searchQuery]);

  function openCreateModal(defaultProdId?: string) {
    const initialProd = defaultProdId || (products[0]?.id || '');
    setEditingTargetProductId('');
    setEditingBundleIndex(null);
    setTargetProductId(initialProd);

    const mainProd = products.find((p) => p.id === initialProd);
    const mainPrice = mainProd?.price || 0;

    setBundleTitle('Special 2-in-1 Combo Pack');
    setBadgeText('SAVE RS. 500 EXTRA');
    setBundlePrice(mainPrice ? Math.round(mainPrice * 0.85).toString() : '');
    setOriginalPrice(mainPrice ? (mainPrice + 1000).toString() : '');
    setItems([
      { name: mainProd?.name || '', detail: 'Primary Product' },
      { name: '', detail: '' },
    ]);
    setIsModalOpen(true);
  }

  function openEditModal(prod: Product, bundle: BundleOffer, index: number) {
    setEditingTargetProductId(prod.id);
    setEditingBundleIndex(index);
    setTargetProductId(prod.id);
    setBundleTitle(bundle.title);
    setBadgeText(bundle.badge_text || '');
    setBundlePrice(bundle.bundle_price.toString());
    setOriginalPrice(bundle.original_price ? bundle.original_price.toString() : '');
    setItems(bundle.items?.length ? bundle.items : [{ name: '', detail: '' }, { name: '', detail: '' }]);
    setIsModalOpen(true);
  }

  function handleMainProductChange(prodId: string) {
    setTargetProductId(prodId);
    const selectedProd = products.find((p) => p.id === prodId);
    if (selectedProd && !editingTargetProductId) {
      const pPrice = selectedProd.price || 0;
      setBundlePrice(pPrice ? Math.round(pPrice * 0.85).toString() : '');
      setOriginalPrice(pPrice ? (pPrice + 1000).toString() : '');
      setItems([
        { name: selectedProd.name, detail: 'Primary Product' },
        { name: '', detail: '' },
      ]);
    }
  }

  function handleSelectBundledItemProduct(itemIndex: number, prodId: string) {
    if (!prodId) return;
    const selected = products.find((p) => p.id === prodId);
    if (!selected) return;

    setItems((prev) =>
      prev.map((it, idx) => {
        if (idx === itemIndex) {
          return {
            name: selected.name,
            detail: selected.short_description || (selected.price ? `Rs. ${selected.price}` : ''),
          };
        }
        return it;
      })
    );
  }

  function addBundledItemRow() {
    if (items.length >= 4) return;
    setItems((prev) => [...prev, { name: '', detail: '' }]);
  }

  function removeBundledItemRow(itemIndex: number) {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, idx) => idx !== itemIndex));
  }

  function updateBundledItem(itemIndex: number, field: keyof BundleOfferItem, value: string) {
    setItems((prev) =>
      prev.map((it, idx) => (idx === itemIndex ? { ...it, [field]: value } : it))
    );
  }

  async function handleSaveBundle(e: React.FormEvent) {
    e.preventDefault();

    if (!targetProductId) return alert('Please select a main product to attach this bundle to.');
    if (!bundleTitle.trim()) return alert('Please enter a Bundle Title');
    const numPrice = Number(bundlePrice);
    if (isNaN(numPrice) || numPrice <= 0) return alert('Please enter a valid Bundle Price');

    const validItems = items.filter((it) => it.name.trim());
    if (validItems.length === 0) return alert('Please add at least one valid item to the bundle');

    const targetProduct = products.find((p) => p.id === targetProductId);
    if (!targetProduct) return alert('Target product not found');

    setSaving(true);

    const updatedBundle: BundleOffer = {
      title: bundleTitle.trim(),
      badge_text: badgeText.trim() || undefined,
      bundle_price: numPrice,
      original_price: Number(originalPrice) || undefined,
      items: validItems,
    };

    let existingBundles = [...(targetProduct.bundle_offers || [])];

    if (editingTargetProductId && editingBundleIndex !== null) {
      if (editingTargetProductId === targetProductId) {
        // Edit in place
        existingBundles[editingBundleIndex] = updatedBundle;
      } else {
        // Moved to another product: remove from old, add to new
        const oldProd = products.find((p) => p.id === editingTargetProductId);
        if (oldProd) {
          const oldBundles = (oldProd.bundle_offers || []).filter((_, idx) => idx !== editingBundleIndex);
          await fetch(`/api/products/${oldProd.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bundle_offers: oldBundles }),
          });
        }
        existingBundles.push(updatedBundle);
      }
    } else {
      // Add new
      existingBundles.push(updatedBundle);
    }

    try {
      const res = await fetch(`/api/products/${targetProductId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bundle_offers: existingBundles }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save bundle offer');
      }

      showSuccessToast('Special Bundle Offer saved successfully!');
      setIsModalOpen(false);
      fetchProducts();
    } catch (err: any) {
      showErrorToast(err.message || 'Error saving bundle offer');
    } finally {
      setSaving(false);
    }
  }

  // Confirm Modal State
  const [confirmDeleteBundle, setConfirmDeleteBundle] = useState<{
    prod: Product;
    bundleIndex: number;
    title: string;
  } | null>(null);
  const [deletingBundle, setDeletingBundle] = useState(false);

  function handleDeleteBundleClick(prod: Product, bundleIndex: number) {
    const bTitle = prod.bundle_offers?.[bundleIndex]?.title || 'Bundle Offer';
    setConfirmDeleteBundle({
      prod,
      bundleIndex,
      title: bTitle,
    });
  }

  async function handleConfirmDeleteBundle() {
    if (!confirmDeleteBundle) return;
    const { prod, bundleIndex } = confirmDeleteBundle;
    setDeletingBundle(true);

    const updatedBundles = (prod.bundle_offers || []).filter((_, idx) => idx !== bundleIndex);

    try {
      const res = await fetch(`/api/products/${prod.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bundle_offers: updatedBundles }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete bundle');
      }

      showSuccessToast('Bundle offer deleted');
      fetchProducts();
    } catch (err: any) {
      showErrorToast(err.message || 'Error deleting bundle');
    } finally {
      setDeletingBundle(false);
      setConfirmDeleteBundle(null);
    }
  }

  return (
    <div className="space-y-6 text-[#C9D2DB]">
      {/* Page Header & Top Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white uppercase font-display">
            🎁 Special Bundle Offers Manager
          </h1>
          <p className="text-xs text-silver-dim mt-1">
            Create 2-in-1 & 3-in-1 combo package deals by selecting products directly from your store catalog.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/admin/products"
            className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-2.5 text-xs sm:text-sm font-bold text-white hover:border-[#00C4CC] transition shadow-sm"
          >
            <span>📦</span>
            <span>All Products</span>
          </Link>
          <button
            onClick={() => openCreateModal()}
            className="flex items-center gap-2 rounded-xl bg-[#00C4CC] hover:bg-[#00B2B9] text-black px-4 py-2.5 text-xs sm:text-sm font-black transition shadow-md hover:scale-105"
          >
            <span>➕</span>
            <span>Create New Bundle Deal</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="rounded-2xl border border-slate-800/80 bg-[#0C1420] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Search bundles by product name, bundle title, badge or item..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-800 bg-[#080D15] px-4 py-2.5 text-xs text-white placeholder-slate-600 focus:border-[#00C4CC] focus:outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-2.5 text-xs text-silver-dim hover:text-white"
            >
              ✕
            </button>
          )}
        </div>
        <div className="text-xs text-silver-dim font-medium">
          Showing <span className="font-bold text-[#00C4CC]">{filteredBundles.length}</span> bundle deals across{' '}
          <span className="font-bold text-white">{products.length}</span> products
        </div>
      </div>

      {/* Bundles Grid View */}
      {loading ? (
        <div className="rounded-2xl border border-slate-800 bg-[#0C1420] py-16 text-center text-silver-dim">
          <span className="animate-pulse text-sm">⏳ Loading bundle offers from database...</span>
        </div>
      ) : filteredBundles.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-[#0C1420] p-12 text-center space-y-3">
          <span className="text-4xl">🎁</span>
          <h3 className="text-lg font-bold text-white">No Special Bundle Deals Created Yet</h3>
          <p className="text-xs text-silver-dim max-w-md mx-auto">
            Create multi-item combo package deals (e.g. Power Bank + 65W Fast Cable + TWS Earbuds) to boost store average order value.
          </p>
          <button
            onClick={() => openCreateModal()}
            className="mt-2 rounded-xl bg-[#00C4CC] px-5 py-2.5 text-xs font-black text-black shadow-md transition hover:brightness-110"
          >
            + Create First Bundle Deal
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {filteredBundles.map(({ product: prod, bundle: b, index: idx }) => {
            const primaryImg =
              prod.product_images?.find((i) => i.is_primary)?.image_url ||
              prod.product_images?.[0]?.image_url ||
              '/images/logo.png';

            const bundleSavings = (b.original_price || 0) > b.bundle_price ? (b.original_price || 0) - b.bundle_price : 0;

            return (
              <div
                key={`${prod.id}-bundle-${idx}`}
                className="relative flex flex-col justify-between rounded-2xl border border-slate-800 bg-[#0C1420] p-5 shadow-lg space-y-4 hover:border-[#00C4CC]/50 transition"
              >
                {/* Header Badge & Main Product Link */}
                <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-slate-700 bg-black/40 p-1">
                      <Image src={primaryImg} alt={prod.name} fill className="object-contain" sizes="48px" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#00C4CC] block">
                        Main Product Page Link
                      </span>
                      <Link
                        href={`/admin/products/${prod.id}/edit`}
                        className="font-display text-sm font-extrabold text-white hover:text-[#00C4CC] transition line-clamp-1"
                      >
                        {prod.name}
                      </Link>
                    </div>
                  </div>

                  {b.badge_text && (
                    <span className="rounded-full bg-gradient-to-r from-amber-500 to-rose-500 px-2.5 py-0.5 text-[10px] font-black text-white shadow-sm uppercase tracking-wider">
                      {b.badge_text}
                    </span>
                  )}
                </div>

                {/* Bundle Details Body */}
                <div className="space-y-3">
                  <h4 className="font-display text-base font-black text-amber-400">{b.title}</h4>

                  {/* Bundled Items */}
                  <div className="space-y-1.5 bg-[#080D15] p-3 rounded-xl border border-slate-800/80">
                    <span className="text-[11px] font-bold text-silver-dim block mb-1">
                      Bundled Package Items ({b.items.length}):
                    </span>
                    {b.items.map((it, itemIdx) => (
                      <div key={itemIdx} className="flex items-center gap-2 text-xs">
                        <span className="text-emerald-400 font-bold">✓</span>
                        <span className="font-semibold text-white">{it.name}</span>
                        {it.detail && <span className="text-slate-400 text-[11px]">({it.detail})</span>}
                      </div>
                    ))}
                  </div>

                  {/* Pricing Details */}
                  <div className="flex items-center justify-between bg-[#080D15] p-3 rounded-xl border border-slate-800/80">
                    <div>
                      <span className="text-[10px] text-silver-dim block uppercase font-bold">Bundle Price</span>
                      <span className="font-display text-lg font-black text-emerald-400">
                        Rs. {b.bundle_price.toLocaleString()}
                      </span>
                      {b.original_price && b.original_price > b.bundle_price && (
                        <span className="ml-2 text-xs text-slate-500 line-through font-mono">
                          Rs. {b.original_price.toLocaleString()}
                        </span>
                      )}
                    </div>
                    {bundleSavings > 0 && (
                      <span className="rounded-md bg-emerald-500/15 border border-emerald-500/30 px-2 py-1 text-xs font-bold text-emerald-400">
                        Save Rs. {bundleSavings.toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => openEditModal(prod, b, idx)}
                    className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/60 px-3.5 py-1.5 text-xs font-bold text-white hover:border-[#00C4CC] hover:text-[#00C4CC] transition"
                  >
                    <span>✏️ Edit Bundle</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteBundleClick(prod, idx)}
                    className="flex items-center gap-1.5 rounded-xl border border-rose-900/40 bg-rose-950/40 px-3 py-1.5 text-xs font-bold text-rose-400 hover:bg-rose-800/40 transition"
                  >
                    <span>🗑️ Delete</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE / EDIT BUNDLE MODAL BUILDER */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-2xl rounded-2xl border border-slate-800 bg-[#0C1420] p-6 text-[#C9D2DB] shadow-2xl space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">🎁</span>
                <h3 className="font-display text-base font-black uppercase tracking-wider text-white">
                  {editingBundleIndex !== null ? 'Edit Special Bundle Deal' : 'Create Special Bundle Deal'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-silver-dim hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveBundle} className="space-y-4">
              {/* 1. Target Main Product Selector */}
              <div>
                <label className="block text-xs font-bold uppercase text-[#00C4CC] mb-1">
                  1. Select Target Main Product (Where Bundle Will Appear)
                </label>
                <select
                  value={targetProductId}
                  onChange={(e) => handleMainProductChange(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-[#080D15] px-3.5 py-2.5 text-xs sm:text-sm text-white focus:border-[#00C4CC] focus:outline-none cursor-pointer"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — Rs. {p.price} {p.sku ? `(SKU: ${p.sku})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* 2. Bundle Title & Badge */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-silver-dim mb-1">Bundle Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Mega Power Combo: Power Bank + 65W Cable + Earbuds"
                    value={bundleTitle}
                    onChange={(e) => setBundleTitle(e.target.value)}
                    className="w-full rounded-xl border border-slate-700/80 bg-[#080D15] px-3.5 py-2 text-xs sm:text-sm text-white focus:border-[#00C4CC] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-silver-dim mb-1">Promotional Badge / Tag</label>
                  <input
                    type="text"
                    placeholder="e.g. SAVE RS. 500 EXTRA"
                    value={badgeText}
                    onChange={(e) => setBadgeText(e.target.value)}
                    className="w-full rounded-xl border border-slate-700/80 bg-[#080D15] px-3.5 py-2 text-xs sm:text-sm text-white focus:border-[#00C4CC] focus:outline-none"
                  />
                </div>
              </div>

              {/* 3. Pricing */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-silver-dim mb-1">Discounted Bundle Price (Rs.)</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 3500"
                    value={bundlePrice}
                    onChange={(e) => setBundlePrice(e.target.value)}
                    className="w-full rounded-xl border border-slate-700/80 bg-[#080D15] px-3.5 py-2 text-xs sm:text-sm text-white focus:border-[#00C4CC] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-silver-dim mb-1">Original Combined Total (Rs.)</label>
                  <input
                    type="number"
                    placeholder="e.g. 4300"
                    value={originalPrice}
                    onChange={(e) => setOriginalPrice(e.target.value)}
                    className="w-full rounded-xl border border-slate-700/80 bg-[#080D15] px-3.5 py-2 text-xs sm:text-sm text-white focus:border-[#00C4CC] focus:outline-none"
                  />
                </div>
              </div>

              {/* 4. Included Products Picker & Builder */}
              <div className="space-y-3 pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold uppercase text-amber-400">
                    2. Select / Add Bundled Products Included (2 to 4 Items)
                  </label>
                  {items.length < 4 && (
                    <button
                      type="button"
                      onClick={addBundledItemRow}
                      className="text-xs font-bold text-[#00C4CC] hover:underline"
                    >
                      + Add Bundled Item
                    </button>
                  )}
                </div>

                <div className="space-y-3 max-h-[250px] overflow-y-auto pr-1">
                  {items.map((item, idx) => (
                    <div key={idx} className="rounded-xl border border-slate-800 bg-[#080D15] p-3 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-silver-bright">Item #{idx + 1}</span>

                        {/* Search & Select from Store Products Catalog */}
                        <select
                          onChange={(e) => handleSelectBundledItemProduct(idx, e.target.value)}
                          className="rounded-lg border border-[#00C4CC]/40 bg-[#0C1420] px-2.5 py-1 text-xs text-[#00C4CC] font-bold focus:outline-none cursor-pointer max-w-xs"
                        >
                          <option value="">🔍 Pick Product from Store Catalog... ▾</option>
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} — Rs. {p.price} {p.sku ? `(${p.sku})` : ''}
                            </option>
                          ))}
                        </select>

                        {items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeBundledItemRow(idx)}
                            className="text-xs text-rose-400 hover:text-rose-300"
                          >
                            ✕ Remove
                          </button>
                        )}
                      </div>

                      <div className="flex flex-col sm:flex-row items-center gap-2">
                        <input
                          type="text"
                          required
                          placeholder="Item Name (e.g. 20,000mAh Power Bank)"
                          value={item.name}
                          onChange={(e) => updateBundledItem(idx, 'name', e.target.value)}
                          className="w-full sm:flex-1 rounded-lg border border-slate-700/80 bg-[#0C1420] px-3 py-1.5 text-xs text-white focus:border-[#00C4CC] focus:outline-none"
                        />
                        <input
                          type="text"
                          placeholder="Short Detail (e.g. 22.5W Fast Charge)"
                          value={item.detail || ''}
                          onChange={(e) => updateBundledItem(idx, 'detail', e.target.value)}
                          className="w-full sm:w-1/3 rounded-lg border border-slate-700/80 bg-[#0C1420] px-3 py-1.5 text-xs text-white focus:border-[#00C4CC] focus:outline-none"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-bold text-silver-bright hover:bg-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-[#00C4CC] hover:bg-[#00B2B9] text-black px-5 py-2 text-xs font-black transition shadow-md disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Special Bundle Offer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={!!confirmDeleteBundle}
        onClose={() => setConfirmDeleteBundle(null)}
        onConfirm={handleConfirmDeleteBundle}
        title={`Delete "${confirmDeleteBundle?.title}"?`}
        description={`Are you sure you want to delete bundle "${confirmDeleteBundle?.title}" attached to "${confirmDeleteBundle?.prod.name}"? This action cannot be undone.`}
        confirmText="Delete Bundle"
        cancelText="Cancel"
        variant="danger"
        loading={deletingBundle}
      />
    </div>
  );
}
