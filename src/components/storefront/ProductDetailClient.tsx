'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import type { Product, Settings } from '@/types/database';
import { formatPrice, buildWhatsAppOrderLink } from '@/lib/utils';
import OrderOnWhatsAppButton from './OrderOnWhatsAppButton';
import { useCart } from '@/context/CartContext';

interface ProductDetailClientProps {
  product: Product;
  settings: Settings | null;
  relatedProducts?: Product[];
}

export default function ProductDetailClient({
  product,
  settings,
}: ProductDetailClientProps) {
  const { addToCart } = useCart();

  const images = product.product_images?.length
    ? product.product_images
    : [{ id: '0', image_url: '/images/logo.png' } as any];
  const primaryIndex = Math.max(0, images.findIndex((i) => i.is_primary));
  const [activeImage, setActiveImage] = useState(primaryIndex === -1 ? 0 : primaryIndex);

  const [quantity, setQuantity] = useState(1);
  const [couponCode, setCouponCode] = useState('');
  const [couponState, setCouponState] = useState<{
    status: 'idle' | 'checking' | 'valid' | 'invalid';
    message?: string;
    discount?: number;
  }>({ status: 'idle' });
  const [copied, setCopied] = useState(false);
  const [isFullscreenImage, setIsFullscreenImage] = useState(false);

  const subtotal = product.price * quantity;
  const discountAmount = couponState.status === 'valid' ? couponState.discount || 0 : 0;
  const finalPrice = Math.max(subtotal - discountAmount, 0);

  const [productUrl, setProductUrl] = useState('');

  useEffect(() => {
    setProductUrl(window.location.href);
  }, []);

  async function applyCoupon() {
    if (!couponCode.trim()) return;
    setCouponState({ status: 'checking' });
    try {
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: couponCode.trim(),
          orderAmount: subtotal,
          productId: product.id,
        }),
      });
      const data = await res.json();
      if (data.valid) {
        setCouponState({
          status: 'valid',
          discount: data.discountAmount,
          message: `Coupon "${couponCode.toUpperCase()}" applied: -${formatPrice(data.discountAmount, settings)}`,
        });
      } else {
        setCouponState({
          status: 'invalid',
          message: data.reason || 'Invalid coupon code',
        });
      }
    } catch {
      setCouponState({ status: 'invalid', message: 'Could not validate coupon. Try again.' });
    }
  }

  async function handleShare() {
    const shareData = { title: product.name, text: product.short_description, url: productUrl };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        /* user cancelled */
      }
    } else {
      await navigator.clipboard.writeText(productUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  const hasDiscount = product.old_price && product.old_price > product.price;
  const savings = hasDiscount ? product.old_price! - product.price : 0;

  // Key Feature Pills
  const featurePills =
    product.key_features && product.key_features.length > 0
      ? product.key_features
      : [
          { icon: '🔋', title: '20000mAh', subtitle: 'High Capacity' },
          { icon: '⚡', title: '22.5W', subtitle: 'Fast Charging' },
          { icon: '📱', title: 'LED', subtitle: 'Digital Display' },
          { icon: '🔌', title: 'Built-in Cables', subtitle: 'Type-C / Lightning' },
        ];

  return (
    <div className="space-y-6 text-[#C9D2DB]" suppressHydrationWarning>
      {/* 1. Breadcrumb Navigation */}
      <nav className="flex items-center gap-2 text-xs font-semibold text-slate-400">
        <Link href="/" className="hover:text-[#00C4CC] transition flex items-center gap-1">
          <span>🏠</span> Home
        </Link>
        <span>&gt;</span>
        {product.category && (
          <>
            <Link
              href={`/products?category=${product.category.slug}`}
              className="hover:text-[#00C4CC] transition"
            >
              {product.category.name}
            </Link>
            <span>&gt;</span>
          </>
        )}
        <span className="text-slate-200 font-bold truncate max-w-xs">{product.name}</span>
      </nav>

      {/* 2. Main 3-Column Product Grid (Matching Reference Design Image Exact Layout) */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 items-start">
        
        {/* LEFT COLUMN: Gallery with Left Vertical Thumbnails (sm:col-span-5 lg:col-span-4) */}
        <div className="sm:col-span-5 lg:col-span-4 flex flex-col-reverse sm:flex-row gap-2.5 items-start shrink-0">
          {/* Vertical Thumbnails List */}
          {images.length > 1 && (
            <div className="flex flex-row sm:flex-col gap-2 overflow-x-auto sm:overflow-y-auto shrink-0 max-h-[300px] w-full sm:w-14">
              {images.map((img, i) => (
                <button
                  key={img.id || i}
                  onClick={() => setActiveImage(i)}
                  className={`relative h-12 w-12 sm:h-14 sm:w-14 shrink-0 overflow-hidden rounded-xl border-2 transition ${
                    i === activeImage
                      ? 'border-[#00C4CC] shadow-[0_0_12px_rgba(0,196,204,0.4)]'
                      : 'border-slate-800 bg-[#0C1420] opacity-70 hover:opacity-100'
                  }`}
                >
                  <Image
                    src={img.image_url}
                    alt={`${product.name} ${i + 1}`}
                    fill
                    className="object-contain p-1"
                    sizes="56px"
                  />
                </button>
              ))}
            </div>
          )}

          {/* Main Compact Image Container */}
          <div className="relative aspect-square max-h-[300px] max-w-[300px] w-full mx-auto sm:mx-0 overflow-hidden rounded-2xl border-2 border-[#00C4CC]/40 bg-[#08101A] shadow-[0_0_25px_rgba(0,196,204,0.15)] group shrink-0">
            <Image
              src={images[activeImage]?.image_url || '/images/logo.png'}
              alt={product.name}
              fill
              className="object-contain p-3 transition duration-300 group-hover:scale-105"
              sizes="(max-width: 640px) 100vw, 300px"
              priority
            />

            {/* Badges Overlay */}
            <div className="absolute top-2.5 left-2.5 z-10">
              {hasDiscount && (
                <span className="rounded-full bg-[#00C4CC] px-2.5 py-0.5 font-display text-[11px] font-black text-slate-950 shadow-md">
                  -{Math.round(product.discount)}%
                </span>
              )}
            </div>

            <div className="absolute top-2.5 right-2.5 z-10 flex items-center gap-2">
              <span
                className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                  product.stock_status === 'in_stock'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    : product.stock_status === 'low_stock'
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                    : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                }`}
              >
                ● {product.stock_status === 'in_stock' ? 'In Stock' : product.stock_status === 'low_stock' ? 'Low Stock' : 'Out of Stock'}
              </span>
            </div>

            <button
              onClick={() => setIsFullscreenImage(true)}
              className="absolute bottom-2.5 right-2.5 z-10 rounded-xl bg-slate-900/80 p-1.5 text-slate-300 hover:text-white border border-slate-700 text-xs shadow-md"
              title="Expand view"
            >
              ⛶
            </button>
          </div>
        </div>

        {/* CENTER COLUMN: Product Title, Rating, Price, Features, Qty & Buy Buttons (sm:col-span-7 lg:col-span-5) */}
        <div className="sm:col-span-7 lg:col-span-5 space-y-3.5">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#00C4CC] uppercase tracking-wider">
              <span>⚡</span>
              <span>{product.category?.name || 'STH GADGETS'}</span>
            </div>
            <h1 className="mt-0.5 font-display text-xl sm:text-2xl font-black text-white leading-tight">
              {product.name}
            </h1>
            {product.short_description && (
              <p className="mt-1 text-xs font-semibold text-slate-300">
                {product.short_description}
              </p>
            )}

            {/* Rating Stars */}
            <div className="mt-2 flex items-center gap-1.5 text-xs">
              <span className="text-amber-400 font-bold text-sm">★★★★★</span>
              <span className="font-bold text-white">4.8</span>
              <span className="text-slate-400">(12 reviews)</span>
            </div>
          </div>

          {/* Pricing Row */}
          <div className="flex items-center gap-3">
            <span className="font-display text-2xl sm:text-3xl font-black text-[#00C4CC]">
              {formatPrice(product.price, settings)}
            </span>
            {hasDiscount && (
              <span className="text-sm text-slate-500 line-through font-semibold">
                {formatPrice(product.old_price!, settings)}
              </span>
            )}
            {hasDiscount && (
              <span className="rounded-md bg-[#00C4CC] text-slate-950 px-2 py-0.5 text-xs font-black shadow-sm">
                Save {formatPrice(savings, settings)}
              </span>
            )}
          </div>

          {/* Feature Pills Row (4 Horizontal Cards) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            {featurePills.map((pill, idx) => (
              <div
                key={idx}
                className="rounded-xl border border-[#00C4CC]/30 bg-[#0C1420] p-2 flex items-center gap-1.5"
              >
                <span className="text-sm shrink-0">{pill.icon}</span>
                <div className="min-w-0">
                  <div className="text-[10px] font-bold text-white truncate">{pill.title}</div>
                  <div className="text-[9px] text-slate-400 truncate">{pill.subtitle}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Description Paragraph */}
          {product.description && (
            <p className="text-xs text-slate-300 leading-relaxed line-clamp-3">
              {product.description}
            </p>
          )}

          {/* Quantity Selector */}
          <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-[#0C1420] px-3 py-2">
            <span className="font-display text-xs font-bold text-slate-300">Quantity:</span>
            <div className="flex items-center rounded-lg border border-slate-700 bg-[#080D15]">
              <button
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="px-3 py-1 text-slate-300 hover:text-[#00C4CC] font-bold text-base"
              >
                −
              </button>
              <span className="w-8 text-center font-mono text-xs font-bold text-white">
                {quantity}
              </span>
              <button
                onClick={() => setQuantity((q) => q + 1)}
                className="px-3 py-1 text-slate-300 hover:text-[#00C4CC] font-bold text-base"
              >
                +
              </button>
            </div>
          </div>

          {/* Action Button: Full-Width Add to Cart */}
          <div>
            <button
              type="button"
              onClick={() => addToCart(product, quantity)}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#00C4CC] hover:bg-[#00D8E0] text-slate-950 py-3 px-4 font-display text-sm font-black shadow-[0_0_20px_rgba(0,196,204,0.35)] transition hover:scale-[1.01]"
            >
              <span>🛒 Add to Cart</span>
            </button>
          </div>

          {/* 3 Trust Badges Row */}
          <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-slate-800/80 text-[10px] text-slate-300 text-center">
            <div className="rounded-xl bg-[#0C1420] p-1.5 border border-slate-800">
              <span className="block text-xs mb-0.5">🚚</span>
              <strong className="block text-white font-bold">Nationwide Delivery</strong>
              <span className="text-[9px] text-slate-400">2–4 Working Days</span>
            </div>
            <div className="rounded-xl bg-[#0C1420] p-1.5 border border-slate-800">
              <span className="block text-xs mb-0.5">🛡️</span>
              <strong className="block text-white font-bold">7-Day Checking</strong>
              <span className="text-[9px] text-slate-400">Warranty</span>
            </div>
            <div className="rounded-xl bg-[#0C1420] p-1.5 border border-slate-800">
              <span className="block text-xs mb-0.5">💵</span>
              <strong className="block text-white font-bold">Cash on Delivery</strong>
              <span className="text-[9px] text-slate-400">Available</span>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Key Features + Specifications Panel (sm:col-span-12 lg:col-span-3) */}
        <div className="sm:col-span-12 lg:col-span-3 rounded-2xl border border-[#00C4CC]/30 bg-[#08101A] p-4 space-y-4 shadow-[0_0_20px_rgba(0,196,204,0.08)]">
          {/* Key Features List */}
          <div>
            <h3 className="text-xs font-bold text-[#00C4CC] uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <span>⚡</span> Key Features
            </h3>
            <ul className="space-y-2 text-xs text-slate-300">
              <li className="flex items-center gap-2">
                <span className="text-[#00C4CC] font-bold">✓</span>
                <span>20000mAh High Capacity</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-[#00C4CC] font-bold">✓</span>
                <span>22.5W Fast Charging</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-[#00C4CC] font-bold">✓</span>
                <span>LED Digital Display</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-[#00C4CC] font-bold">✓</span>
                <span>Built-in Charging Cables</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-[#00C4CC] font-bold">✓</span>
                <span>Compact &amp; Portable Design</span>
              </li>
            </ul>
          </div>

          {/* Specifications List */}
          <div className="border-t border-slate-800/80 pt-3">
            <h3 className="text-xs font-bold text-[#00C4CC] uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <span>⚙️</span> Specifications
            </h3>
            <div className="divide-y divide-slate-800/80 text-xs">
              <div className="flex justify-between py-1.5">
                <span className="text-slate-400">Brand</span>
                <span className="text-white font-medium">STH Gadgets</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-400">Model</span>
                <span className="text-white font-medium">LP-02</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-400">Output</span>
                <span className="text-white font-medium">22.5W</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-400">Ports</span>
                <span className="text-white font-medium">USB-A / USB-C</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-400">Charging Cables</span>
                <span className="text-white font-medium">Type-C / Lightning</span>
              </div>
              {product.specifications?.map((s, i) => (
                <div key={i} className="flex justify-between py-1.5">
                  <span className="text-slate-400">{s.label}</span>
                  <span className="text-white font-medium">{s.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Promo Coupon Box */}
          <div className="border-t border-slate-800/80 pt-3 space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              🏷️ Promo Coupon Code
            </label>
            <div className="flex gap-1.5">
              <input
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                placeholder="PROMO CODE"
                className="w-full rounded-xl border border-slate-700 bg-[#04080F] px-2.5 py-1.5 text-xs font-mono font-bold text-[#00C4CC] placeholder:text-slate-600 focus:border-[#00C4CC] focus:outline-none"
              />
              <button
                onClick={applyCoupon}
                disabled={couponState.status === 'checking'}
                className="rounded-xl bg-[#00C4CC] px-3 py-1.5 text-xs font-bold text-slate-950 hover:bg-[#00D8E0] transition shrink-0 disabled:opacity-50"
              >
                Apply
              </button>
            </div>
            {couponState.message && (
              <p className={`text-[10px] font-semibold ${couponState.status === 'valid' ? 'text-emerald-400' : 'text-rose-400'}`}>
                {couponState.message}
              </p>
            )}
          </div>

          {/* 100% Original Guarantee Card */}
          <div className="rounded-xl border border-[#00C4CC]/40 bg-[#00C4CC]/10 p-3 flex items-center gap-2.5">
            <span className="text-xl">🛡️</span>
            <div>
              <strong className="block text-xs text-white">100% Original Product</strong>
              <span className="text-[10px] text-cyan-300">Guaranteed Authentic</span>
            </div>
          </div>
        </div>

      </div>

      {/* Special Bundle Offers Section */}
      {product.bundle_offers && product.bundle_offers.length > 0 && (
        <div className="rounded-2xl border border-amber-500/40 bg-gradient-to-br from-[#0F1923] via-[#141C28] to-[#0A111A] p-5 sm:p-6 space-y-4 shadow-[0_0_25px_rgba(245,158,11,0.15)]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🎁</span>
              <div>
                <h2 className="font-display text-base sm:text-lg font-black text-amber-400 uppercase tracking-wider">
                  Special Bundle Deals & Mega Savings
                </h2>
                <p className="text-xs text-slate-300">
                  Buy this product as a combo package deal and save extra!
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {product.bundle_offers.map((bundle, bIdx) => {
              const bundleSavings = (bundle.original_price || 0) > bundle.bundle_price
                ? (bundle.original_price || 0) - bundle.bundle_price
                : 0;

              const bundleOrderLink = buildWhatsAppOrderLink({
                whatsappNumber: settings?.whatsapp_number || '+92 348 9593671',
                template: settings?.order_message_template || null,
                productName: `${product.name} [Bundle: ${bundle.title}]`,
                price: bundle.bundle_price,
                quantity: 1,
                discount: 0,
                finalPrice: bundle.bundle_price,
                productUrl,
                currencySymbol: settings?.currency_symbol || 'Rs.',
              });

              return (
                <div
                  key={bIdx}
                  className="relative flex flex-col justify-between rounded-xl border border-amber-500/30 bg-[#080D15] p-4 space-y-3 hover:border-amber-400 transition shadow-md"
                >
                  {/* Badge */}
                  {bundle.badge_text && (
                    <div className="absolute -top-3 right-3 z-10">
                      <span className="rounded-full bg-gradient-to-r from-amber-500 to-rose-500 px-3 py-0.5 font-display text-[10px] font-black text-white shadow-md uppercase tracking-wider">
                        {bundle.badge_text}
                      </span>
                    </div>
                  )}

                  <div>
                    <h3 className="font-display text-sm sm:text-base font-bold text-white leading-snug pr-12">
                      {bundle.title}
                    </h3>

                    {/* Items List */}
                    <div className="mt-3 space-y-1.5 bg-[#0C1420] p-2.5 rounded-lg border border-slate-800">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block mb-1">
                        Package Includes ({bundle.items.length} Items):
                      </span>
                      {bundle.items.map((item, iIdx) => (
                        <div key={iIdx} className="flex items-center gap-2 text-xs text-slate-200">
                          <span className="text-emerald-400 font-bold">✓</span>
                          <span className="font-semibold text-white">{item.name}</span>
                          {item.detail && <span className="text-slate-400 text-[11px]">({item.detail})</span>}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Price & Buttons */}
                  <div className="pt-2 border-t border-slate-800 flex flex-col gap-2">
                    <div className="flex items-baseline justify-between">
                      <div>
                        <span className="font-display text-lg sm:text-xl font-black text-amber-400">
                          {formatPrice(bundle.bundle_price, settings)}
                        </span>
                        {bundle.original_price && bundle.original_price > bundle.bundle_price && (
                          <span className="ml-2 text-xs text-slate-400 line-through">
                            {formatPrice(bundle.original_price, settings)}
                          </span>
                        )}
                      </div>
                      {bundleSavings > 0 && (
                        <span className="text-[10px] font-extrabold text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded border border-emerald-500/30">
                          Save {formatPrice(bundleSavings, settings)}
                        </span>
                      )}
                    </div>

                    <div className="pt-2 border-t border-slate-800">
                      <button
                        type="button"
                        onClick={() =>
                          addToCart(
                            {
                              ...product,
                              id: `${product.id}-bundle-${bIdx}`,
                              name: `${product.name} (${bundle.title})`,
                              price: bundle.bundle_price,
                            },
                            1
                          )
                        }
                        className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 py-2.5 px-3 font-display text-xs font-black transition shadow-md hover:scale-[1.01]"
                      >
                        <span>🛒 Add Bundle to Cart</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Full Description Section */}
      {product.description && (
        <div className="rounded-2xl border border-slate-800 bg-[#0C1420] p-5 space-y-2">
          <h2 className="font-display text-sm font-bold text-white uppercase tracking-wider">
            Product Description
          </h2>
          <div className="whitespace-pre-line text-xs sm:text-sm leading-relaxed text-slate-300">
            {product.description}
          </div>
        </div>
      )}

      {/* Fullscreen Image Preview Modal */}
      {isFullscreenImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4 backdrop-blur-md">
          <button
            onClick={() => setIsFullscreenImage(false)}
            className="absolute top-4 right-4 rounded-full bg-slate-800 p-3 text-white text-xl font-bold hover:bg-slate-700"
          >
            ✕
          </button>
          <div className="relative h-5/6 w-full max-w-4xl">
            <Image
              src={images[activeImage]?.image_url || '/images/logo.png'}
              alt={product.name}
              fill
              className="object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
}
