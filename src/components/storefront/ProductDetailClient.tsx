'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import type { Product, Settings, ProductVariant } from '@/types/database';
import { formatPrice } from '@/lib/utils';
import ColorSwatchSelector from './ColorSwatchSelector';
import { useCart } from '@/context/CartContext';
import { useTheme } from '@/components/theme/ThemeProvider';
import ProductOnlinePaymentModal from './ProductOnlinePaymentModal';

interface ProductDetailClientProps {
  product: Product;
  settings: Settings | null;
  relatedProducts?: Product[];
}

export default function ProductDetailClient({
  product,
  settings,
}: ProductDetailClientProps) {
  const { addToCart, openCart } = useCart();
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const images = product.product_images?.length
    ? product.product_images
    : [{ id: '0', image_url: '/images/logo.png' } as any];
  const primaryIndex = Math.max(0, images.findIndex((i) => i.is_primary));
  const [activeImage, setActiveImage] = useState(primaryIndex === -1 ? 0 : primaryIndex);

  // Active Color Variants
  const activeVariants = (product.product_variants || []).filter((v) => v.is_active !== false);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(
    activeVariants.length > 0 ? activeVariants[0] : null
  );
  const [colorError, setColorError] = useState<string | null>(null);
  const [colorImageOverride, setColorImageOverride] = useState<string | null>(
    activeVariants.length > 0 && activeVariants[0].image_url ? activeVariants[0].image_url : null
  );

  function handleSelectVariant(variant: ProductVariant) {
    setSelectedVariant(variant);
    setColorError(null);
    if (variant.image_url) {
      const foundIdx = images.findIndex((img) => img.image_url === variant.image_url);
      if (foundIdx !== -1) {
        setActiveImage(foundIdx);
        setColorImageOverride(null);
      } else {
        setColorImageOverride(variant.image_url);
      }
    } else {
      setColorImageOverride(null);
    }
  }

  const displayImageUrl = colorImageOverride || images[activeImage]?.image_url || '/images/logo.png';
  const [currentImg, setCurrentImg] = useState(displayImageUrl);

  useEffect(() => {
    setCurrentImg(displayImageUrl);
  }, [displayImageUrl]);

  const [quantity, setQuantity] = useState(1);
  const [couponCode, setCouponCode] = useState('');
  const [couponState, setCouponState] = useState<{
    status: 'idle' | 'checking' | 'valid' | 'invalid';
    message?: string;
    discount?: number;
  }>({ status: 'idle' });
  const [copied, setCopied] = useState(false);
  const [isFullscreenImage, setIsFullscreenImage] = useState(false);
  const [showOnlinePaymentModal, setShowOnlinePaymentModal] = useState(false);
  const [onlinePaymentSettings, setOnlinePaymentSettings] = useState<any>(null);

  const subtotal = product.price * quantity;
  const discountAmount = couponState.status === 'valid' ? couponState.discount || 0 : 0;
  const finalPrice = Math.max(subtotal - discountAmount, 0);

  const [productUrl, setProductUrl] = useState('');

  useEffect(() => {
    setProductUrl(window.location.href);
  }, []);

  // Load online payment settings
  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch('/api/settings');
        const data = await res.json();
        if (data.settings && data.settings.online_payment_enabled) {
          setOnlinePaymentSettings(data.settings);
        }
      } catch (err) {
        console.error('Failed to load payment settings:', err);
      }
    }
    loadSettings();
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
  const featurePills = product.key_features && product.key_features.length > 0 ? product.key_features : [];

  return (
    <div className={`space-y-6 ${isLight ? 'text-slate-800' : 'text-[#C9D2DB]'}`} suppressHydrationWarning>
      {/* 1. Breadcrumb Navigation */}
      <nav className={`flex items-center gap-2 text-xs font-semibold ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
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
        <span className={`font-bold truncate max-w-xs ${isLight ? 'text-slate-900' : 'text-slate-200'}`}>{product.name}</span>
      </nav>

      {/* 2. Main 3-Column Product Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: Gallery with Left Vertical Thumbnails (lg:col-span-5) */}
        <div className="lg:col-span-5 flex flex-col-reverse sm:flex-row gap-3 items-start">
          {/* Vertical Thumbnails List */}
          {images.length > 1 && (
            <div className="flex flex-row sm:flex-col gap-2.5 overflow-x-auto sm:overflow-y-auto shrink-0 max-h-[460px] w-full sm:w-16">
              {images.map((img, i) => (
                <button
                  key={img.id || i}
                  onClick={() => {
                    setActiveImage(i);
                    setColorImageOverride(null);
                  }}
                  className={`relative h-14 w-14 sm:h-16 sm:w-16 shrink-0 overflow-hidden rounded-xl border-2 transition ${
                    i === activeImage && !colorImageOverride
                      ? 'border-[#00C4CC] shadow-[0_0_14px_rgba(0,196,204,0.5)]'
                      : isLight
                      ? 'border-slate-200 bg-white opacity-75 hover:opacity-100 hover:border-slate-400'
                      : 'border-slate-800 bg-[#0C1420] opacity-70 hover:opacity-100'
                  }`}
                >
                  <Image
                    src={img.image_url}
                    alt={`${product.name} ${i + 1}`}
                    fill
                    className="object-contain p-1"
                    sizes="64px"
                  />
                </button>
              ))}
            </div>
          )}

          {/* Main Large Image Container */}
          <div className={`relative aspect-square w-full max-w-[480px] max-h-[480px] mx-auto sm:mx-0 overflow-hidden rounded-2xl border-2 group flex-1 transition ${
            isLight
              ? 'border-slate-200 bg-white shadow-md'
              : 'border-[#00C4CC]/40 bg-[#08101A] shadow-[0_0_30px_rgba(0,196,204,0.2)]'
          }`}>
            <Image
              src={currentImg}
              alt={product.name}
              fill
              className="object-contain p-4 transition duration-300 group-hover:scale-105"
              sizes="(max-width: 640px) 100vw, 480px"
              priority
              onError={() => setCurrentImg('/images/logo.png')}
            />

            {/* Badges Overlay */}
            <div className="absolute top-3 left-3 z-10 flex flex-col gap-1">
              {hasDiscount && (
                <span className="rounded-full bg-[#00C4CC] px-3 py-1 font-display text-xs font-black text-slate-950 shadow-md">
                  -{Math.round(product.discount)}% OFF
                </span>
              )}
              {product.free_delivery && (
                <span className="rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 px-3 py-1 font-display text-xs font-black text-white shadow-md">
                  🚚 FREE DELIVERY
                </span>
              )}
            </div>

            <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
              <span
                className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                  product.stock_status === 'in_stock'
                    ? isLight
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 backdrop-blur-sm'
                    : product.stock_status === 'low_stock'
                    ? isLight
                      ? 'bg-amber-100 text-amber-800 border border-amber-300'
                      : 'bg-amber-500/20 text-amber-400 border border-amber-500/40 backdrop-blur-sm'
                    : isLight
                    ? 'bg-rose-100 text-rose-800 border border-rose-300'
                    : 'bg-rose-500/20 text-rose-400 border border-rose-500/40 backdrop-blur-sm'
                }`}
              >
                ● {product.stock_status === 'in_stock' ? 'In Stock' : product.stock_status === 'low_stock' ? 'Low Stock' : 'Out of Stock'}
              </span>
            </div>

            <button
              onClick={() => setIsFullscreenImage(true)}
              className={`absolute bottom-3 right-3 z-10 rounded-xl p-2 text-sm shadow-md transition ${
                isLight
                  ? 'bg-white/90 text-slate-700 hover:text-black border border-slate-200'
                  : 'bg-slate-900/80 text-slate-300 hover:text-white border border-slate-700'
              }`}
              title="Expand view"
            >
              ⛶
            </button>
          </div>
        </div>

        {/* CENTER COLUMN: Product Title, Rating, Price, Qty & Buy Buttons (lg:col-span-4) */}
        <div className="lg:col-span-4 space-y-3.5">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#00C4CC] uppercase tracking-wider">
              <span>⚡</span>
              <span>{product.category?.name || 'STH GADGETS'}</span>
            </div>
            <h1 className={`mt-0.5 font-display text-xl sm:text-2xl font-black leading-tight ${
              isLight ? 'text-slate-900' : 'text-white'
            }`}>
              {product.name}
            </h1>
            {product.short_description && (
              <p className={`mt-1 text-xs font-semibold ${
                isLight ? 'text-slate-600' : 'text-slate-300'
              }`}>
                {product.short_description}
              </p>
            )}

            {/* Rating Stars */}
            <div className="mt-2 flex items-center gap-1.5 text-xs">
              <span className="text-amber-400 font-bold text-sm">★★★★★</span>
              <span className={`font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>4.8</span>
              <span className={isLight ? 'text-slate-500' : 'text-slate-400'}>(12 reviews)</span>
            </div>
          </div>

          {/* Pricing Row */}
          <div className="flex items-center gap-3">
            <span className="font-display text-2xl sm:text-3xl font-black text-[#00C4CC]">
              {formatPrice(product.price, settings)}
            </span>
            {hasDiscount && (
              <span className="text-sm text-slate-400 line-through font-semibold">
                {formatPrice(product.old_price!, settings)}
              </span>
            )}
            {hasDiscount && (
              <span className="rounded-md bg-[#00C4CC] text-slate-950 px-2 py-0.5 text-xs font-black shadow-sm">
                Save {formatPrice(savings, settings)}
              </span>
            )}
          </div>

          {/* Feature Pills — horizontal scrollable row */}
          {featurePills.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none -mx-1 px-1">
              {featurePills.map((pill, idx) => (
                <div
                  key={idx}
                  className={`shrink-0 rounded-xl border px-2.5 py-2 flex items-center gap-1.5 ${
                    isLight
                      ? 'border-cyan-200 bg-cyan-50/60 text-slate-800'
                      : 'border-[#00C4CC]/30 bg-[#0C1420]'
                  }`}
                >
                  <span className="text-sm shrink-0">{pill.icon || '⚡'}</span>
                  <div>
                    <div className={`text-[10px] font-bold whitespace-nowrap leading-snug ${
                      isLight ? 'text-slate-900' : 'text-white'
                    }`}>
                      {pill.title}
                    </div>
                    {pill.subtitle && (
                      <div className={`text-[9px] whitespace-nowrap leading-snug mt-0.5 ${
                        isLight ? 'text-slate-500' : 'text-slate-400'
                      }`}>
                        {pill.subtitle}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Description Paragraph */}
          {product.description && (
            <p className={`text-xs leading-relaxed line-clamp-3 ${
              isLight ? 'text-slate-600' : 'text-slate-300'
            }`}>
              {product.description}
            </p>
          )}

          {/* Color Selector */}
          {activeVariants.length > 0 && (
            <div className={`rounded-xl border p-3 ${
              isLight ? 'border-slate-200 bg-white' : 'border-slate-800 bg-[#0C1420]'
            }`}>
              <ColorSwatchSelector
                variants={activeVariants}
                selectedVariant={selectedVariant}
                onSelect={handleSelectVariant}
                validationError={colorError}
                isLight={isLight}
              />
            </div>
          )}

          {/* Quantity Selector */}
          <div className={`flex items-center justify-between rounded-xl border px-3 py-2 ${
            isLight ? 'border-slate-200 bg-white' : 'border-slate-800 bg-[#0C1420]'
          }`}>
            <span className={`font-display text-xs font-bold ${
              isLight ? 'text-slate-700' : 'text-slate-300'
            }`}>
              Quantity:
            </span>
            <div className={`flex items-center rounded-lg border ${
              isLight ? 'border-slate-200 bg-slate-50' : 'border-slate-700 bg-[#080D15]'
            }`}>
              <button
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className={`px-3 py-1 font-bold text-base transition ${
                  isLight ? 'text-slate-600 hover:text-black' : 'text-slate-300 hover:text-[#00C4CC]'
                }`}
              >
                −
              </button>
              <span className={`w-8 text-center font-mono text-xs font-bold ${
                isLight ? 'text-slate-900' : 'text-white'
              }`}>
                {quantity}
              </span>
              <button
                onClick={() => setQuantity((q) => q + 1)}
                className={`px-3 py-1 font-bold text-base transition ${
                  isLight ? 'text-slate-600 hover:text-black' : 'text-slate-300 hover:text-[#00C4CC]'
                }`}
              >
                +
              </button>
            </div>
          </div>

          {/* Action Button: Full-Width Add to Cart */}
          <div>
            <button
              type="button"
              onClick={() => {
                if (activeVariants.length > 0 && !selectedVariant) {
                  setColorError('Please select a color.');
                  return;
                }
                setColorError(null);
                addToCart(
                  product,
                  quantity,
                  selectedVariant?.variant_name,
                  selectedVariant
                    ? {
                        colorName: selectedVariant.variant_name,
                        colorValue: selectedVariant.color_value || undefined,
                        imageUrl: selectedVariant.image_url || undefined,
                      }
                    : undefined
                );
                // Open cart drawer
                openCart();
              }}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#00C4CC] hover:bg-[#00D8E0] text-slate-950 py-3 px-4 font-display text-sm font-black shadow-[0_0_20px_rgba(0,196,204,0.35)] transition hover:scale-[1.01]"
            >
              <span>🛒 Add to Cart</span>
            </button>
          </div>

          {/* 3 Trust Badges Row */}
          <div className={`grid grid-cols-3 gap-1.5 pt-2 border-t text-[10px] text-center ${
            isLight ? 'border-slate-200 text-slate-700' : 'border-slate-800/80 text-slate-300'
          }`}>
            <div className={`rounded-xl p-1.5 border ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0C1420] border-slate-800'
            }`}>
              <span className="block text-xs mb-0.5">🚚</span>
              <strong className={`block font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                Nationwide Delivery
              </strong>
              <span className={`text-[9px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                2–4 Working Days
              </span>
            </div>
            <div className={`rounded-xl p-1.5 border ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0C1420] border-slate-800'
            }`}>
              <span className="block text-xs mb-0.5">💵</span>
              <strong className={`block font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                Cash on Delivery
              </strong>
              <span className={`text-[9px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                Available
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowOnlinePaymentModal(true)}
              className={`rounded-xl p-1.5 border hover:border-[#00C4CC] transition cursor-pointer ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0C1420] border-slate-800'
              }`}
            >
              <span className="block text-xs mb-0.5">💳</span>
              <strong className={`block font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                Online Payment
              </strong>
              <span className={`text-[9px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                Available
              </span>
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: Key Features + Specifications Panel (sm:col-span-12 lg:col-span-3) */}
        <div className={`sm:col-span-12 lg:col-span-3 rounded-2xl border p-4 space-y-4 ${
          isLight
            ? 'border-slate-200 bg-white text-slate-800 shadow-sm'
            : 'border-[#00C4CC]/30 bg-[#08101A] shadow-[0_0_20px_rgba(0,196,204,0.08)]'
        }`}>
          {/* Key Features List */}
          {product.key_features && product.key_features.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-[#00C4CC] uppercase tracking-wider mb-2.5">
                Key Features
              </h3>
              <ul className={`space-y-2 text-xs ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                {product.key_features.map((kf, i) => (
                  <li key={i} className="flex items-center gap-2">
                    {kf.icon && kf.icon !== '⚡' && <span className="text-[#00C4CC] font-bold">{kf.icon}</span>}
                    <span>
                      <strong className={isLight ? 'text-slate-900' : 'text-white'}>{kf.title}</strong>
                      {kf.subtitle ? (
                        <span className={`ml-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                          ({kf.subtitle})
                        </span>
                      ) : ''}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Specifications List */}
          <div className={product.key_features && product.key_features.length > 0 ? (isLight ? 'border-t border-slate-200 pt-3' : 'border-t border-slate-800/80 pt-3') : ''}>
            <h3 className="text-xs font-bold text-[#00C4CC] uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <span>⚙️</span> Specifications
            </h3>
            <div className={`divide-y text-xs ${isLight ? 'divide-slate-100' : 'divide-slate-800/80'}`}>
              {product.category && (
                <div className="flex justify-between py-1.5">
                  <span className={isLight ? 'text-slate-500' : 'text-slate-400'}>Category</span>
                  <span className={`font-medium ${isLight ? 'text-slate-900' : 'text-white'}`}>{product.category.name}</span>
                </div>
              )}
              {product.sku && (
                <div className="flex justify-between py-1.5">
                  <span className={isLight ? 'text-slate-500' : 'text-slate-400'}>SKU</span>
                  <span className={`font-medium font-mono ${isLight ? 'text-slate-900' : 'text-white'}`}>{product.sku}</span>
                </div>
              )}
              {product.specifications && product.specifications.length > 0 ? (
                product.specifications.map((s, i) => (
                  <div key={i} className="flex justify-between py-1.5">
                    <span className={isLight ? 'text-slate-500' : 'text-slate-400'}>{s.label}</span>
                    <span className={`font-medium ${isLight ? 'text-slate-900' : 'text-white'}`}>{s.value}</span>
                  </div>
                ))
              ) : (
                <div className={`py-1 italic text-[11px] ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>
                  Official STH Gadgets item
                </div>
              )}
            </div>
          </div>

          {/* Promo Coupon Box */}
          <div className={`border-t pt-3 space-y-2 ${isLight ? 'border-slate-200' : 'border-slate-800/80'}`}>
            <label className={`text-[10px] font-bold uppercase tracking-wider block ${
              isLight ? 'text-slate-600' : 'text-slate-400'
            }`}>
              🏷️ Promo Coupon Code
            </label>
            <div className="flex gap-1.5">
              <input
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                placeholder="PROMO CODE"
                className={`w-full rounded-xl border px-2.5 py-1.5 text-xs font-mono font-bold focus:border-[#00C4CC] focus:outline-none ${
                  isLight
                    ? 'border-slate-300 bg-slate-50 text-slate-900 placeholder:text-slate-400'
                    : 'border-slate-700 bg-[#04080F] text-[#00C4CC] placeholder:text-slate-600'
                }`}
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
              <p className={`text-[10px] font-semibold ${couponState.status === 'valid' ? 'text-emerald-600' : 'text-rose-500'}`}>
                {couponState.message}
              </p>
            )}
          </div>

          {/* 100% Original Guarantee Card */}
          <div className={`rounded-xl border p-3 flex items-center gap-2.5 ${
            isLight
              ? 'border-cyan-200 bg-cyan-50/70 text-slate-900'
              : 'border-[#00C4CC]/40 bg-[#00C4CC]/10'
          }`}>
            <span className="text-xl">🛡️</span>
            <div>
              <strong className={`block text-xs ${isLight ? 'text-slate-900' : 'text-white'}`}>
                100% Original Product
              </strong>
              <span className={`text-[10px] ${isLight ? 'text-cyan-700 font-semibold' : 'text-cyan-300'}`}>
                Guaranteed Authentic
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* Special Bundle Offers Section */}
      {product.bundle_offers && product.bundle_offers.length > 0 && (
        <div className={`rounded-2xl border p-5 sm:p-6 space-y-6 shadow-sm ${
          isLight
            ? 'border-amber-200 bg-amber-50/30'
            : 'border-amber-500/30 bg-gradient-to-br from-[#0C1420] via-[#0F1C2D] to-[#080D15] shadow-[0_0_25px_rgba(0,196,204,0.08)]'
        }`}>
          <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-4 ${
            isLight ? 'border-amber-200' : 'border-slate-800'
          }`}>
            <div className="flex items-center gap-3">
              <span className="text-2xl sm:text-3xl">🎁</span>
              <div>
                <h2 className="font-display text-base sm:text-lg font-black text-amber-500 uppercase tracking-wider">
                  Special Bundle Deals & Mega Savings
                </h2>
                <p className={`text-xs ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                  Buy this product as a combo package deal and save extra!
                </p>
              </div>
            </div>
            <span className={`self-start sm:self-auto rounded-full border px-3.5 py-1 text-xs font-black uppercase tracking-wider ${
              isLight
                ? 'border-amber-300 bg-amber-100 text-amber-900'
                : 'border-amber-400/40 bg-amber-400/10 text-amber-300'
            }`}>
              🔥 {product.bundle_offers.length} Active Combo Offer{product.bundle_offers.length > 1 ? 's' : ''}
            </span>
          </div>

          <div className="space-y-6">
            {product.bundle_offers.map((bundle, bIdx) => {
              const bundleSavings = (bundle.original_price || 0) > bundle.bundle_price
                ? (bundle.original_price || 0) - bundle.bundle_price
                : 0;

              return (
                <div
                  key={bIdx}
                  className={`relative rounded-xl border p-3 sm:p-4 transition shadow-sm ${
                    isLight
                      ? 'border-slate-200 bg-white hover:border-cyan-400'
                      : 'border-amber-500/30 bg-[#080D15] hover:border-[#00C4CC]/50 text-[#C9D2DB]'
                  }`}
                >
                  {/* Badge */}
                  {bundle.badge_text && (
                    <div className="absolute -top-2.5 right-3 z-10">
                      <span className="rounded-full bg-gradient-to-r from-amber-500 to-rose-500 px-2.5 py-0.5 font-display text-[9px] font-black text-white shadow uppercase tracking-wider">
                        {bundle.badge_text}
                      </span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
                    {/* LEFT COLUMN: Bundle Title & Package Items */}
                    <div className="lg:col-span-7 space-y-3 flex flex-col justify-between">
                      <div className="space-y-2.5">
                        <div className="space-y-0.5">
                          <span className="text-[9px] font-black uppercase tracking-widest text-amber-500">
                            COMBO PACKAGE OFFER
                          </span>
                          <h3 className={`font-display text-sm sm:text-base font-bold leading-snug ${
                            isLight ? 'text-slate-900' : 'text-white'
                          }`}>
                            {bundle.title}
                          </h3>
                        </div>

                        {/* Bundled Included Items List */}
                        <div className={`p-2.5 sm:p-3 rounded-lg border space-y-1.5 ${
                          isLight ? 'border-slate-200 bg-slate-50' : 'border-slate-800 bg-[#0C1420]'
                        }`}>
                          <span className={`text-[10px] font-bold uppercase tracking-wider block ${
                            isLight ? 'text-amber-800' : 'text-amber-300'
                          }`}>
                            📦 Bundled Package Items ({bundle.items.length}):
                          </span>
                          <div className="space-y-1">
                            {bundle.items.map((item, iIdx) => (
                              <div key={iIdx} className="flex items-center gap-2 text-xs">
                                <span className="text-emerald-500 font-bold shrink-0">✓</span>
                                <div className="leading-tight truncate">
                                  <strong className={isLight ? 'text-slate-900' : 'text-white'}>{item.name}</strong>
                                  {item.detail && (
                                    <span className={`text-[11px] ml-1 font-normal ${
                                      isLight ? 'text-slate-500' : 'text-slate-400'
                                    }`}>
                                      ({item.detail})
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* RIGHT COLUMN: Pricing Summary & CTA */}
                    <div className="lg:col-span-5 flex flex-col justify-between h-full">
                      <div className={`p-3 sm:p-3.5 rounded-xl border space-y-3 flex-1 flex flex-col justify-between ${
                        isLight ? 'border-slate-200 bg-slate-50' : 'border-slate-800 bg-[#0C1420]'
                      }`}>
                        <div className="space-y-2.5">
                          <span className={`text-[10px] font-bold uppercase tracking-wider block border-b pb-1.5 ${
                            isLight ? 'border-slate-200 text-slate-500' : 'border-slate-800 text-slate-400'
                          }`}>
                            Package Pricing & Savings
                          </span>

                          <div className="space-y-1">
                            {bundle.original_price && bundle.original_price > bundle.bundle_price && (
                              <div className={`flex items-center justify-between text-[11px] ${
                                isLight ? 'text-slate-500' : 'text-slate-400'
                              }`}>
                                <span>Original Total Price:</span>
                                <span className="line-through font-semibold">
                                  {formatPrice(bundle.original_price, settings)}
                                </span>
                              </div>
                            )}

                            <div className="flex items-baseline justify-between pt-0.5">
                              <span className={`text-xs font-bold uppercase tracking-wider ${
                                isLight ? 'text-slate-700' : 'text-slate-300'
                              }`}>
                                Combo Bundle Price:
                              </span>
                              <span className="font-display text-lg sm:text-xl font-extrabold text-[#00C4CC]">
                                {formatPrice(bundle.bundle_price, settings)}
                              </span>
                            </div>
                          </div>

                          {bundleSavings > 0 && (
                            <div className="pt-1">
                              <div className={`flex items-center justify-between p-2 rounded-lg border text-xs font-bold ${
                                isLight
                                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                                  : 'border-emerald-500/30 bg-emerald-500/15 text-emerald-400'
                              }`}>
                                <span className="flex items-center gap-1.5 text-[11px]">
                                  <span>💥</span> Total Savings
                                </span>
                                <span className="text-xs font-black">
                                  {formatPrice(bundleSavings, settings)}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className={`pt-2.5 border-t ${isLight ? 'border-slate-200' : 'border-slate-800/80'}`}>
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
                            className="w-full flex items-center justify-center gap-2 rounded-lg bg-[#00C4CC] hover:bg-[#00D8E0] text-slate-950 py-2.5 px-3 font-display text-xs sm:text-sm font-bold shadow-[0_0_15px_rgba(0,196,204,0.2)] transition hover:scale-[1.01] cursor-pointer"
                          >
                            <span>🛒 Add Bundle to Cart</span>
                          </button>
                        </div>
                      </div>
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
        <div className={`rounded-2xl border p-5 space-y-2 ${
          isLight ? 'border-slate-200 bg-white' : 'border-slate-800 bg-[#0C1420]'
        }`}>
          <h2 className={`font-display text-sm font-bold uppercase tracking-wider ${
            isLight ? 'text-slate-900' : 'text-white'
          }`}>
            Product Description
          </h2>
          <div className={`whitespace-pre-line text-xs sm:text-sm leading-relaxed ${
            isLight ? 'text-slate-700' : 'text-slate-300'
          }`}>
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
              src={displayImageUrl}
              alt={product.name}
              fill
              className="object-contain"
            />
          </div>
        </div>
      )}

      {/* Online Payment Modal */}
      <ProductOnlinePaymentModal
        isOpen={showOnlinePaymentModal}
        onClose={() => setShowOnlinePaymentModal(false)}
        settings={settings}
        productName={product.name}
        price={finalPrice}
      />
    </div>
  );
}
