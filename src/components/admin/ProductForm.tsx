'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import type { Category, Product, Specification, KeyFeature, BundleOffer, BundleOfferItem } from '@/types/database';
import { slugify } from '@/lib/utils';
import ImageUploader, { UploadedImage } from './ImageUploader';
import { useToast, setFlashToast } from '@/context/ToastContext';

export default function ProductForm({
  categories,
  product,
  allProducts = [],
}: {
  categories: Category[];
  product?: Product;
  allProducts?: Partial<Product>[];
}) {
  const router = useRouter();
  const { success: showSuccessToast, error: showErrorToast } = useToast();
  const isEdit = !!product;

  const [storeProducts, setStoreProducts] = useState<Partial<Product>[]>(allProducts || []);

  useEffect(() => {
    if (!allProducts || allProducts.length === 0) {
      async function loadStoreProducts() {
        try {
          const { createClient } = await import('@/lib/supabase/client');
          const supabase = createClient();
          const { data } = await supabase
            .from('products')
            .select('id, name, price, short_description, sku')
            .eq('active', true)
            .order('name');
          if (data) setStoreProducts(data);
        } catch (err) {
          console.error('Failed to load store products:', err);
        }
      }
      loadStoreProducts();
    }
  }, [allProducts]);

  const [name, setName] = useState(product?.name || '');
  const [slug, setSlug] = useState(product?.slug || '');
  const [slugTouched, setSlugTouched] = useState(isEdit);
  const [sku, setSku] = useState(product?.sku || '');
  const [categoryId, setCategoryId] = useState(product?.category_id || categories[0]?.id || '');
  const [purchasePrice, setPurchasePrice] = useState(product?.purchase_price?.toString() || '');
  const [price, setPrice] = useState(product?.price?.toString() || '');
  const [oldPrice, setOldPrice] = useState(product?.old_price?.toString() || '');
  const [wholesalePrice, setWholesalePrice] = useState(product?.wholesale_price?.toString() || '');
  const [shortDescription, setShortDescription] = useState(product?.short_description || '');
  const [description, setDescription] = useState(product?.description || '');
  const [stockStatus, setStockStatus] = useState(product?.stock_status || 'in_stock');
  const [featured, setFeatured] = useState(product?.featured || false);
  const [bestSeller, setBestSeller] = useState(product?.best_seller || false);
  const [newArrival, setNewArrival] = useState(product?.new_arrival || false);
  const [active, setActive] = useState(product?.active ?? true);
  const [specs, setSpecs] = useState<Specification[]>(
    product?.specifications?.length ? product.specifications : [{ label: '', value: '' }]
  );
  const [keyFeatures, setKeyFeatures] = useState<KeyFeature[]>(
    product?.key_features?.length ? product.key_features : [{ icon: '⚡', title: '', subtitle: '' }]
  );
  const [bundleOffers, setBundleOffers] = useState<BundleOffer[]>(
    product?.bundle_offers?.length ? product.bundle_offers : []
  );
  const [images, setImages] = useState<UploadedImage[]>(
    product?.product_images?.map((i) => ({ image_url: i.image_url, is_primary: i.is_primary })) || []
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Live profit calculation logic
  const numPurchase = parseFloat(purchasePrice) || 0;
  const numSelling = parseFloat(price) || 0;
  const hasSelling = price.trim() !== '' && !isNaN(numSelling);
  const hasPurchase = purchasePrice.trim() !== '' && !isNaN(numPurchase);

  const profitAmount = hasSelling ? Math.round((numSelling - numPurchase) * 100) / 100 : 0;
  const isNegativeProfit = hasSelling && hasPurchase && numPurchase > numSelling;

  let marginDisplay = 'N/A';
  let marginPercent = 0;
  if (hasSelling && numSelling > 0) {
    marginPercent = Math.round(((numSelling - numPurchase) / numSelling) * 10000) / 100;
    marginDisplay = `${marginPercent}%`;
  }

  function handleNameChange(value: string) {
    setName(value);
    if (!slugTouched) setSlug(slugify(value));
  }

  function updateSpec(index: number, field: 'label' | 'value', value: string) {
    setSpecs((prev) => prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)));
  }
  function addSpec() {
    setSpecs((prev) => [...prev, { label: '', value: '' }]);
  }
  function removeSpec(index: number) {
    setSpecs((prev) => prev.filter((_, i) => i !== index));
  }

  function updateKeyFeature(index: number, field: keyof KeyFeature, value: string) {
    setKeyFeatures((prev) => prev.map((kf, i) => (i === index ? { ...kf, [field]: value } : kf)));
  }
  function addKeyFeature() {
    setKeyFeatures((prev) => [...prev, { icon: '⚡', title: '', subtitle: '' }]);
  }
  function removeKeyFeature(index: number) {
    setKeyFeatures((prev) => prev.filter((_, i) => i !== index));
  }

  function addBundleOffer() {
    setBundleOffers((prev) => [
      ...prev,
      {
        title: 'Special 2-in-1 Combo Pack',
        badge_text: 'SAVE RS. 500 EXTRA',
        bundle_price: numSelling > 0 ? Math.round(numSelling * 0.85) : 0,
        original_price: numSelling > 0 ? numSelling + 1000 : 0,
        items: [
          { name: name || 'Main Product', detail: 'Primary Item' },
          { name: '65W Fast Charging Cable', detail: 'Type-C Braided Cable' },
        ],
      },
    ]);
  }

  function removeBundleOffer(index: number) {
    setBundleOffers((prev) => prev.filter((_, i) => i !== index));
  }

  function updateBundleOfferField(index: number, field: keyof BundleOffer, value: any) {
    setBundleOffers((prev) => prev.map((bo, i) => (i === index ? { ...bo, [field]: value } : bo)));
  }

  function addBundleItem(bundleIndex: number) {
    setBundleOffers((prev) =>
      prev.map((bo, i) => {
        if (i === bundleIndex) {
          if (bo.items.length >= 4) return bo;
          return {
            ...bo,
            items: [...bo.items, { name: '', detail: '' }],
          };
        }
        return bo;
      })
    );
  }

  function removeBundleItem(bundleIndex: number, itemIndex: number) {
    setBundleOffers((prev) =>
      prev.map((bo, i) => {
        if (i === bundleIndex) {
          return {
            ...bo,
            items: bo.items.filter((_, j) => j !== itemIndex),
          };
        }
        return bo;
      })
    );
  }

  function updateBundleItemField(bundleIndex: number, itemIndex: number, field: keyof BundleOfferItem, value: string) {
    setBundleOffers((prev) =>
      prev.map((bo, i) => {
        if (i === bundleIndex) {
          const updatedItems = bo.items.map((it, j) => (j === itemIndex ? { ...it, [field]: value } : it));
          return { ...bo, items: updatedItems };
        }
        return bo;
      })
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const validSpecs = specs.filter((s) => s.label.trim() && s.value.trim());
    const validFeatures = keyFeatures.filter((f) => f.title.trim());

    if (validFeatures.length === 0) {
      const msg = 'Please add at least 1 Key Feature for this product (e.g. Waterproof, 20-Hour Playtime).';
      setError(msg);
      showErrorToast(msg);
      setSaving(false);
      return;
    }

    if (validSpecs.length === 0) {
      const msg = 'Please add at least 1 Specification row for this product (e.g. Connectivity: Bluetooth 5.0).';
      setError(msg);
      showErrorToast(msg);
      setSaving(false);
      return;
    }

    const payload = {
      name,
      slug,
      sku: sku.trim() || null,
      category_id: categoryId || null,
      purchase_price: Number(purchasePrice) || 0,
      price: Number(price),
      old_price: oldPrice ? Number(oldPrice) : null,
      wholesale_price: wholesalePrice ? Number(wholesalePrice) : null,
      short_description: shortDescription,
      description,
      stock_status: stockStatus,
      featured,
      best_seller: bestSeller,
      new_arrival: newArrival,
      active,
      specifications: validSpecs,
      key_features: validFeatures,
      bundle_offers: bundleOffers
        .filter((bo) => bo.title.trim() && bo.bundle_price > 0)
        .map((bo) => ({
          ...bo,
          items: bo.items.filter((it) => it.name.trim()),
        })),
      images,
    };

    try {
      const url = isEdit ? `/api/products/${product.id}` : '/api/products';
      const method = isEdit ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(typeof data.error === 'string' ? data.error : 'Failed to save product');
      }
      const successMsg = isEdit ? 'Product updated successfully!' : 'Product created successfully!';
      setFlashToast(successMsg);
      showSuccessToast(successMsg);
      router.push('/admin/products');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
      showErrorToast(err.message || 'Failed to save product');
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-4xl space-y-6">
      {/* Basic Info Card */}
      <div className="rounded-2xl border border-slate-800 bg-[#0C1420] p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <span className="text-base">📦</span>
          <h2 className="font-display text-sm font-bold uppercase tracking-wider text-silver-bright">
            Basic Information
          </h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-semibold text-silver-dim">Product Title *</label>
            <input
              required
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g. 20000mAh Fast Charging Power Bank"
              className="w-full rounded-xl border border-slate-700/80 bg-[#080D15] px-4 py-2 text-sm text-silver-bright focus:border-[#00C4CC] focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-silver-dim">Product Slug (URL) *</label>
            <input
              required
              value={slug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(slugify(e.target.value));
              }}
              placeholder="e.g. 20000mah-fast-charging-power-bank"
              className="w-full rounded-xl border border-slate-700/80 bg-[#080D15] px-4 py-2 text-sm text-silver-bright focus:border-[#00C4CC] focus:outline-none"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-semibold text-silver-dim">Category *</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full rounded-xl border border-slate-700/80 bg-[#080D15] px-4 py-2 text-sm text-silver-bright focus:border-[#00C4CC] focus:outline-none"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-silver-dim">
              SKU / Stock Keeping Unit (e.g. STH-PB-20K)
            </label>
            <input
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              placeholder="e.g. STH-PB-20K"
              className="w-full rounded-xl border border-slate-700/80 bg-[#080D15] px-4 py-2 text-sm font-mono text-silver-bright focus:border-[#00C4CC] focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-silver-dim">Short Description (Subtitle)</label>
          <input
            value={shortDescription}
            onChange={(e) => setShortDescription(e.target.value)}
            placeholder="Key specs or summary (e.g. 22.5W Super Fast Charge, Dual Output)"
            className="w-full rounded-xl border border-slate-700/80 bg-[#080D15] px-4 py-2 text-sm text-silver-bright focus:border-[#00C4CC] focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-silver-dim">Full Description</label>
          <textarea
            rows={5}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Detailed product overview, features, warranty, and package contents..."
            className="w-full rounded-xl border border-slate-700/80 bg-[#080D15] px-4 py-2 text-sm text-silver-bright focus:border-[#00C4CC] focus:outline-none"
          />
        </div>
      </div>

      {/* Pricing, Cost & Profit Margin Card */}
      <div className="rounded-2xl border border-slate-800 bg-[#0C1420] p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-base">💰</span>
            <h2 className="font-display text-sm font-bold uppercase tracking-wider text-silver-bright">
              Pricing, Cost & Profit Margin
            </h2>
          </div>
          <span className="rounded-md bg-amber-500/10 border border-amber-500/30 px-2.5 py-0.5 text-[11px] font-semibold text-amber-400">
            🔒 Private Admin Financials
          </span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-silver-dim">
              Purchase Price (Cost) *
            </label>
            <input
              required
              type="number"
              min="0"
              step="0.01"
              value={purchasePrice}
              onChange={(e) => setPurchasePrice(e.target.value)}
              placeholder="e.g. 900"
              className="w-full rounded-xl border border-slate-700/80 bg-[#080D15] px-4 py-2 text-sm font-mono text-amber-300 font-bold focus:border-[#00C4CC] focus:outline-none"
            />
            <p className="mt-1 text-[11px] text-silver-dim/70">What you pay supplier</p>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-silver-dim">
              Selling Price (Rs.) *
            </label>
            <input
              required
              type="number"
              min="0"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="e.g. 1200"
              className="w-full rounded-xl border border-slate-700/80 bg-[#080D15] px-4 py-2 text-sm font-mono text-[#00C4CC] font-bold focus:border-[#00C4CC] focus:outline-none"
            />
            <p className="mt-1 text-[11px] text-silver-dim/70">Customer retail price</p>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-silver-dim">
              Original Price (Rs., optional)
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={oldPrice}
              onChange={(e) => setOldPrice(e.target.value)}
              placeholder="e.g. 1500"
              className="w-full rounded-xl border border-slate-700/80 bg-[#080D15] px-4 py-2 text-sm font-mono text-silver-bright focus:border-[#00C4CC] focus:outline-none"
            />
            <p className="mt-1 text-[11px] text-silver-dim/70">Discount strikethrough</p>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-silver-dim">
              Wholesale Price (Rs., optional)
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={wholesalePrice}
              onChange={(e) => setWholesalePrice(e.target.value)}
              placeholder="e.g. 1000"
              className="w-full rounded-xl border border-slate-700/80 bg-[#080D15] px-4 py-2 text-sm font-mono text-silver-bright focus:border-[#00C4CC] focus:outline-none"
            />
            <p className="mt-1 text-[11px] text-silver-dim/70">Bulk dealer rate</p>
          </div>
        </div>

        {/* Live Profit Calculation Widget */}
        <div className="rounded-xl border border-slate-800 bg-[#080D15] p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-silver-dim">
              Live Profit & Margin Calculation
            </span>
            <span className="text-[11px] font-mono text-silver-dim">
              Profit = Selling − Purchase • Margin = (Profit / Selling) × 100
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
            <div className="rounded-lg bg-[#0C1420] border border-slate-800/80 p-2.5">
              <span className="text-[11px] text-silver-dim">Purchase Price</span>
              <div className="font-mono text-sm font-bold text-silver-bright mt-0.5">
                PKR {numPurchase.toLocaleString('en-PK')}
              </div>
            </div>

            <div className="rounded-lg bg-[#0C1420] border border-slate-800/80 p-2.5">
              <span className="text-[11px] text-silver-dim">Selling Price</span>
              <div className="font-mono text-sm font-bold text-[#00C4CC] mt-0.5">
                PKR {numSelling.toLocaleString('en-PK')}
              </div>
            </div>

            <div className={`rounded-lg p-2.5 border ${
              isNegativeProfit
                ? 'bg-rose-500/10 border-rose-500/40'
                : 'bg-emerald-500/10 border-emerald-500/30'
            }`}>
              <span className="text-[11px] text-silver-dim">Net Profit / Unit</span>
              <div className={`font-mono text-sm font-black mt-0.5 ${
                isNegativeProfit ? 'text-rose-400' : 'text-emerald-400'
              }`}>
                {isNegativeProfit ? '−' : ''}PKR {Math.abs(profitAmount).toLocaleString('en-PK')}
              </div>
            </div>

            <div className={`rounded-lg p-2.5 border ${
              isNegativeProfit
                ? 'bg-rose-500/10 border-rose-500/40'
                : 'bg-emerald-500/10 border-emerald-500/30'
            }`}>
              <span className="text-[11px] text-silver-dim">Profit Margin</span>
              <div className={`font-mono text-sm font-black mt-0.5 ${
                isNegativeProfit ? 'text-rose-400' : 'text-emerald-400'
              }`}>
                {marginDisplay}
              </div>
            </div>
          </div>

          {/* Negative Profit Warning */}
          {isNegativeProfit && (
            <div className="rounded-lg border border-rose-500/40 bg-rose-950/40 px-3.5 py-2.5 text-xs text-rose-300 flex items-center gap-2">
              <span className="text-base">⚠️</span>
              <span>
                <strong>Warning: Selling below purchase cost.</strong> Each sale will result in a loss of PKR {Math.abs(profitAmount).toLocaleString('en-PK')} ({marginDisplay} margin).
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Specifications Card */}
      <div className="rounded-2xl border border-slate-800 bg-[#0C1420] p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-base">⚡</span>
            <h2 className="font-display text-sm font-bold uppercase tracking-wider text-silver-bright">
              Specifications
            </h2>
          </div>
          <button
            type="button"
            onClick={addSpec}
            className="text-xs font-bold text-[#00C4CC] hover:underline"
          >
            + Add Spec Row
          </button>
        </div>

        <div className="space-y-2.5">
          {specs.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                placeholder="Label (e.g. Capacity)"
                value={s.label}
                onChange={(e) => updateSpec(i, 'label', e.target.value)}
                className="w-1/3 rounded-xl border border-slate-700/80 bg-[#080D15] px-3.5 py-2 text-xs sm:text-sm text-silver-bright focus:border-[#00C4CC] focus:outline-none"
              />
              <input
                placeholder="Value (e.g. 20000mAh)"
                value={s.value}
                onChange={(e) => updateSpec(i, 'value', e.target.value)}
                className="flex-1 rounded-xl border border-slate-700/80 bg-[#080D15] px-3.5 py-2 text-xs sm:text-sm text-silver-bright focus:border-[#00C4CC] focus:outline-none"
              />
              {specs.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeSpec(i)}
                  className="rounded-xl border border-slate-800 px-3 py-2 text-xs text-rose-400 hover:border-rose-500/40 hover:bg-rose-500/10"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Key Features & Highlights Card */}
      <div className="rounded-2xl border border-slate-800 bg-[#0C1420] p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-base">⚡</span>
            <h2 className="font-display text-sm font-bold uppercase tracking-wider text-silver-bright">
              Key Features & Highlights
            </h2>
          </div>
          <button
            type="button"
            onClick={addKeyFeature}
            className="text-xs font-bold text-[#00C4CC] hover:underline"
          >
            + Add Feature
          </button>
        </div>

        <div className="space-y-3">
          {keyFeatures.map((kf, i) => (
            <div key={i} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-[#080D15] p-3 rounded-xl border border-slate-800/80">
              <input
                placeholder="Icon (⚡)"
                value={kf.icon || ''}
                onChange={(e) => updateKeyFeature(i, 'icon', e.target.value)}
                className="w-full sm:w-20 rounded-lg border border-slate-700/80 bg-[#0C1420] px-3 py-2 text-xs sm:text-sm text-silver-bright focus:border-[#00C4CC] focus:outline-none text-center"
              />
              <input
                placeholder="Feature Title (e.g. Fast Charging)"
                value={kf.title}
                onChange={(e) => updateKeyFeature(i, 'title', e.target.value)}
                className="w-full sm:w-1/3 rounded-lg border border-slate-700/80 bg-[#0C1420] px-3 py-2 text-xs sm:text-sm text-silver-bright focus:border-[#00C4CC] focus:outline-none"
              />
              <input
                placeholder="Subtitle / Detail (e.g. 22.5W Power Delivery)"
                value={kf.subtitle || ''}
                onChange={(e) => updateKeyFeature(i, 'subtitle', e.target.value)}
                className="flex-1 rounded-lg border border-slate-700/80 bg-[#0C1420] px-3 py-2 text-xs sm:text-sm text-silver-bright focus:border-[#00C4CC] focus:outline-none"
              />
              {keyFeatures.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeKeyFeature(i)}
                  className="self-end sm:self-center rounded-lg border border-slate-800 px-3 py-2 text-xs text-rose-400 hover:border-rose-500/40 hover:bg-rose-500/10"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Special Bundle Offers Card */}
      <div className="rounded-2xl border border-slate-800 bg-[#0C1420] p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-base">🎁</span>
            <h2 className="font-display text-sm font-bold uppercase tracking-wider text-silver-bright">
              Special Bundle Offers (2-in-1 / 3-in-1 Deals)
            </h2>
          </div>
          <button
            type="button"
            onClick={addBundleOffer}
            className="text-xs font-bold text-[#00C4CC] hover:underline"
          >
            + Add Bundle Offer
          </button>
        </div>

        {bundleOffers.length === 0 ? (
          <p className="text-xs text-silver-dim italic">
            No bundle offers created yet. Click "+ Add Bundle Offer" to create a 2-in-1 or 3-in-1 combo package deal!
          </p>
        ) : (
          <div className="space-y-4">
            {bundleOffers.map((bo, bIndex) => (
              <div key={bIndex} className="rounded-xl border border-slate-800/90 bg-[#080D15] p-4 space-y-3">
                <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
                  <span className="text-xs font-bold text-[#00C4CC]">Bundle #{bIndex + 1}</span>
                  <button
                    type="button"
                    onClick={() => removeBundleOffer(bIndex)}
                    className="text-xs text-rose-400 hover:underline"
                  >
                    ✕ Remove Bundle
                  </button>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-silver-dim">Bundle Title</label>
                    <input
                      placeholder="e.g. Mega Power Combo: Power Bank + 65W Cable + Earbuds"
                      value={bo.title}
                      onChange={(e) => updateBundleOfferField(bIndex, 'title', e.target.value)}
                      className="w-full rounded-xl border border-slate-700/80 bg-[#0C1420] px-3.5 py-2 text-xs sm:text-sm text-silver-bright focus:border-[#00C4CC] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-silver-dim">Promotional Badge / Tag</label>
                    <input
                      placeholder="e.g. SAVE RS. 800 (MEGA DEAL)"
                      value={bo.badge_text || ''}
                      onChange={(e) => updateBundleOfferField(bIndex, 'badge_text', e.target.value)}
                      className="w-full rounded-xl border border-slate-700/80 bg-[#0C1420] px-3.5 py-2 text-xs sm:text-sm text-silver-bright focus:border-[#00C4CC] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-silver-dim">Discounted Bundle Price (Rs.)</label>
                    <input
                      type="number"
                      placeholder="e.g. 3500"
                      value={bo.bundle_price || ''}
                      onChange={(e) => updateBundleOfferField(bIndex, 'bundle_price', Number(e.target.value))}
                      className="w-full rounded-xl border border-slate-700/80 bg-[#0C1420] px-3.5 py-2 text-xs sm:text-sm text-silver-bright focus:border-[#00C4CC] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-silver-dim">Original Combined Total (Rs.)</label>
                    <input
                      type="number"
                      placeholder="e.g. 4300"
                      value={bo.original_price || ''}
                      onChange={(e) => updateBundleOfferField(bIndex, 'original_price', Number(e.target.value))}
                      className="w-full rounded-xl border border-slate-700/80 bg-[#0C1420] px-3.5 py-2 text-xs sm:text-sm text-silver-bright focus:border-[#00C4CC] focus:outline-none"
                    />
                  </div>
                </div>

                {/* Bundled Items Section */}
                <div className="pt-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-silver-bright">Bundled Items (2-3 Products Included):</span>
                    {bo.items.length < 4 && (
                      <button
                        type="button"
                        onClick={() => addBundleItem(bIndex)}
                        className="text-[11px] font-bold text-[#00C4CC] hover:underline"
                      >
                        + Add Bundled Item
                      </button>
                    )}
                  </div>
                  <div className="space-y-3">
                    {bo.items.map((item, iIndex) => (
                      <div key={iIndex} className="rounded-xl border border-slate-800 bg-[#0C1420] p-3 space-y-2">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <span className="text-xs font-bold text-silver-dim">Item #{iIndex + 1}</span>
                          {storeProducts.length > 0 && (
                            <select
                              onChange={(e) => {
                                const selectedId = e.target.value;
                                if (!selectedId) return;
                                const foundProd = storeProducts.find((p) => p.id === selectedId);
                                if (foundProd) {
                                  updateBundleItemField(bIndex, iIndex, 'name', foundProd.name || '');
                                  updateBundleItemField(
                                    bIndex,
                                    iIndex,
                                    'detail',
                                    foundProd.short_description || (foundProd.price ? `Rs. ${foundProd.price}` : '')
                                  );
                                }
                              }}
                              className="rounded-lg border border-[#00C4CC]/40 bg-[#080D15] px-2.5 py-1 text-xs text-[#00C4CC] font-bold focus:outline-none cursor-pointer"
                            >
                              <option value="">🔍 Search & Pick Product from Catalog... ▾</option>
                              {storeProducts.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name} — Rs. {p.price} {p.sku ? `(${p.sku})` : ''}
                                </option>
                              ))}
                            </select>
                          )}
                          {bo.items.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeBundleItem(bIndex, iIndex)}
                              className="text-xs text-rose-400 hover:text-rose-300 self-end sm:self-auto"
                            >
                              ✕ Remove Item
                            </button>
                          )}
                        </div>

                        <div className="flex flex-col sm:flex-row items-center gap-2">
                          <input
                            placeholder="Item Name (e.g. 20,000mAh Power Bank)"
                            value={item.name}
                            onChange={(e) => updateBundleItemField(bIndex, iIndex, 'name', e.target.value)}
                            className="w-full sm:flex-1 rounded-lg border border-slate-700/80 bg-[#080D15] px-3 py-1.5 text-xs text-silver-bright focus:border-[#00C4CC] focus:outline-none"
                          />
                          <input
                            placeholder="Short Detail (e.g. 22.5W Fast Charge)"
                            value={item.detail || ''}
                            onChange={(e) => updateBundleItemField(bIndex, iIndex, 'detail', e.target.value)}
                            className="w-full sm:w-1/3 rounded-lg border border-slate-700/80 bg-[#080D15] px-3 py-1.5 text-xs text-silver-bright focus:border-[#00C4CC] focus:outline-none"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Images Card */}
      <div className="rounded-2xl border border-slate-800 bg-[#0C1420] p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <span className="text-base">🖼️</span>
          <h2 className="font-display text-sm font-bold uppercase tracking-wider text-silver-bright">
            Product Images
          </h2>
        </div>
        <ImageUploader bucket="product-images" images={images} onChange={setImages} multiple={true} />
      </div>

      {/* Visibility & Stock Card */}
      <div className="rounded-2xl border border-slate-800 bg-[#0C1420] p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <span className="text-base">⚙️</span>
          <h2 className="font-display text-sm font-bold uppercase tracking-wider text-silver-bright">
            Status & Badges
          </h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 items-center">
          <div>
            <label className="mb-1 block text-xs font-semibold text-silver-dim">Stock Status</label>
            <select
              value={stockStatus}
              onChange={(e) => setStockStatus(e.target.value as any)}
              className="w-full rounded-xl border border-slate-700/80 bg-[#080D15] px-3 py-2 text-sm text-silver-bright focus:border-[#00C4CC] focus:outline-none"
            >
              <option value="in_stock">In Stock</option>
              <option value="low_stock">Low Stock</option>
              <option value="out_of_stock">Out of Stock</option>
            </select>
          </div>

          <label className="flex items-center gap-2.5 rounded-xl border border-slate-800 bg-[#080D15] px-4 py-2 text-xs font-semibold text-silver-bright cursor-pointer hover:border-slate-700">
            <input
              type="checkbox"
              checked={featured}
              onChange={(e) => setFeatured(e.target.checked)}
              className="h-4 w-4 rounded accent-[#00C4CC]"
            />
            <span>Featured Product</span>
          </label>

          <label className="flex items-center gap-2.5 rounded-xl border border-slate-800 bg-[#080D15] px-4 py-2 text-xs font-semibold text-silver-bright cursor-pointer hover:border-slate-700">
            <input
              type="checkbox"
              checked={bestSeller}
              onChange={(e) => setBestSeller(e.target.checked)}
              className="h-4 w-4 rounded accent-[#00C4CC]"
            />
            <span>Best Seller</span>
          </label>

          <label className="flex items-center gap-2.5 rounded-xl border border-slate-800 bg-[#080D15] px-4 py-2 text-xs font-semibold text-silver-bright cursor-pointer hover:border-slate-700">
            <input
              type="checkbox"
              checked={newArrival}
              onChange={(e) => setNewArrival(e.target.checked)}
              className="h-4 w-4 rounded accent-[#00C4CC]"
            />
            <span>New Arrival</span>
          </label>
        </div>

        <div className="pt-2">
          <label className="flex items-center gap-2.5 text-xs sm:text-sm font-semibold text-silver-bright cursor-pointer">
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="h-4 w-4 rounded accent-[#00C4CC]"
            />
            <span>Active & Visible on Storefront</span>
          </label>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs font-semibold text-rose-400">
          {error}
        </div>
      )}

      {/* Buttons */}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded-xl bg-[#00C4CC] hover:bg-[#00B2B9] px-6 py-3 font-display text-sm font-bold text-black shadow-[0_0_15px_rgba(0,196,204,0.3)] transition hover:scale-[1.01] disabled:opacity-50"
        >
          {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Product'}
        </button>
        <button
          type="button"
          onClick={() => router.push('/admin/products')}
          className="rounded-xl border border-slate-800 bg-[#0C1420] px-5 py-3 font-display text-sm font-semibold text-silver-dim hover:text-white"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
