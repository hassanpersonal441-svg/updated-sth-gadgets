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
  
  // Active Color Variants
  const activeVariants = (product.product_variants || []).filter((v) => v.is_active !== false);
  const initialVariant = activeVariants.length > 0 ? activeVariants[0] : null;
  
  let initialActive = primaryIndex === -1 ? 0 : primaryIndex;
  let initialOverride = null;
  
  if (initialVariant?.image_url) {
    const foundIdx = images.findIndex((img) => img.image_url === initialVariant.image_url);
    if (foundIdx !== -1) {
      initialActive = foundIdx;
    } else {
      initialOverride = initialVariant.image_url;
    }
  }

  const [activeImage, setActiveImage] = useState(initialActive);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(initialVariant);
  const [colorError, setColorError] = useState<string | null>(null);
  const [colorImageOverride, setColorImageOverride] = useState<string | null>(initialOverride);

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

  // Pre-select color if passed in URL (?color=...)
  useEffect(() => {
    if (typeof window !== 'undefined' && activeVariants.length > 0) {
      const params = new URLSearchParams(window.location.search);
      const colorParam = params.get('color');
      if (colorParam) {
        const matched = activeVariants.find(
          (v) => v.variant_name.toLowerCase() === colorParam.toLowerCase()
        );
        if (matched) {
          handleSelectVariant(matched);
        }
      }
    }
  }, []);

  const [quantity, setQuantity] = useState(1);
  const [couponCode, setCouponCode] = useState('');
  const [couponState, setCouponState] = useState<{
    status: 'idle' | 'checking' | 'valid' | 'invalid';
    message?: string;
    discount?: number;
  }>({ status: 'idle' });
  const [isFullscreenImage, setIsFullscreenImage] = useState(false);
  const [showOnlinePaymentModal, setShowOnlinePaymentModal] = useState(false);

  const subtotal = product.price * quantity;
  const discountAmount = couponState.status === 'valid' ? couponState.discount || 0 : 0;
  const finalPrice = Math.max(subtotal - discountAmount, 0);

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
          message: `Coupon "${couponCode.toUpperCase()}" applied: -${formatPrice(
            data.discountAmount,
            settings
          )}`,
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

  const hasDiscount = product.old_price && product.old_price > product.price;
  const savings = hasDiscount ? product.old_price! - product.price : 0;
  const featurePills = product.key_features && product.key_features.length > 0 ? product.key_features : [];

  const cardBg = isLight
    ? 'bg-white border-slate-200/90 shadow-[0_4px_20px_rgba(0,0,0,0.03)]'
    : 'bg-[#0B121E] border-slate-800/80 shadow-[0_4px_25px_rgba(0,0,0,0.4)]';

  return (
    <div className={`space-y-8 ${isLight ? 'text-slate-800' : 'text-[#CBD5E1]'}`} suppressHydrationWarning>
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
        <span className={`font-bold truncate max-w-xs ${isLight ? 'text-slate-900' : 'text-white'}`}>
          {product.name}
        </span>
      </nav>

      {/* 2. Main 3-Column Product Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
        {/* LEFT COLUMN: Gallery with Left Vertical Thumbnails (lg:col-span-5) */}
        <div className="lg:col-span-5 flex flex-col-reverse sm:flex-row gap-3.5 items-start">
          {/* Vertical Thumbnails List */}
          {images.length > 1 && (
            <div className="flex flex-row sm:flex-col gap-2.5 overflow-x-auto sm:overflow-y-auto shrink-0 max-h-[480px] w-full sm:w-18 scrollbar-thin">
              {images.map((img, i) => (
                <button
                  key={img.id || i}
                  type="button"
                  onClick={() => {
                    setActiveImage(i);
                    setColorImageOverride(null);
                  }}
                  className={`relative h-14 w-14 sm:h-18 sm:w-18 shrink-0 overflow-hidden rounded-2xl border-2 transition duration-200 cursor-pointer ${
                    i === activeImage && !colorImageOverride
                      ? 'border-[#00C4CC] shadow-[0_0_15px_rgba(0,196,204,0.5)] scale-102'
                      : isLight
                      ? 'border-slate-200 bg-white opacity-80 hover:opacity-100 hover:border-slate-400'
                      : 'border-slate-800 bg-[#0B121E] opacity-70 hover:opacity-100 hover:border-[#00C4CC]/50'
                  }`}
                >
                  <Image
                    src={img.image_url}
                    alt={`${product.name} ${i + 1}`}
                    fill
                    className="object-contain p-1.5"
                    sizes="72px"
                  />
                </button>
              ))}
            </div>
          )}

          {/* Main Large Image Stage */}
          <div
            className={`relative aspect-square w-full max-w-[500px] mx-auto sm:mx-0 overflow-hidden rounded-3xl border-2 group flex-1 transition-all duration-300 ${
              isLight
                ? 'border-slate-200 bg-gradient-to-b from-slate-50 to-white shadow-[0_10px_35px_rgba(0,0,0,0.05)]'
                : 'border-[#00C4CC]/40 bg-gradient-to-b from-[#080E18] to-[#0E1A2C] shadow-[0_0_35px_rgba(0,196,204,0.18)]'
            }`}
          >
            <Image
              key={currentImg}
              id="main-product-image"
              src={currentImg}
              alt={product.name}
              fill
              className="object-contain p-6 transition-transform duration-500 ease-out group-hover:scale-106"
              sizes="(max-width: 640px) 100vw, 500px"
              priority
              onError={() => setCurrentImg('/images/logo.png')}
            />

            {/* Badges Overlay Left */}
            <div className="absolute top-3.5 left-3.5 z-10 flex flex-col gap-1.5">
              {hasDiscount && (
                <span className="rounded-full bg-gradient-to-r from-[#00C4CC] to-[#00E5FF] px-3 py-1 font-display text-xs font-black text-[#04080F] shadow-md">
                  -{Math.round(product.discount)}% OFF
                </span>
              )}
              {product.free_delivery && (
                <span className="rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 px-3 py-1 font-display text-xs font-black text-white shadow-md">
                  🚚 FREE DELIVERY
                </span>
              )}
            </div>

            {/* Badges Overlay Right */}
            <div className="absolute top-3.5 right-3.5 z-10 flex items-center gap-2">
              <span
                className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider backdrop-blur-md ${
                  product.stock_status === 'in_stock'
                    ? isLight
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                      : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    : product.stock_status === 'low_stock'
                    ? isLight
                      ? 'bg-amber-50 text-amber-800 border border-amber-300'
                      : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                    : isLight
                    ? 'bg-rose-50 text-rose-800 border border-rose-300'
                    : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                }`}
              >
                ● {product.stock_status === 'in_stock' ? 'In Stock' : product.stock_status === 'low_stock' ? 'Low Stock' : 'Out of Stock'}
              </span>
            </div>

            {/* Lightbox Expand Button */}
            <button
              type="button"
              onClick={() => setIsFullscreenImage(true)}
              className={`absolute bottom-3.5 right-3.5 z-10 rounded-2xl p-2.5 text-sm shadow-md transition duration-200 cursor-pointer ${
                isLight
                  ? 'bg-white/90 text-slate-700 hover:text-black hover:bg-white border border-slate-200'
                  : 'bg-[#0B121E]/90 text-slate-300 hover:text-white hover:bg-[#0B121E] border border-slate-700'
              }`}
              title="Expand view"
            >
              ⛶
            </button>
          </div>
        </div>

        {/* CENTER COLUMN: Details, Price, Swatches, CTA (lg:col-span-4) */}
        <div className="lg:col-span-4 space-y-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-black text-[#00C4CC] uppercase tracking-wider">
              <span>⚡</span>
              <span>{product.category?.name || 'STH GADGETS'}</span>
            </div>
            <h1
              className={`mt-1 font-display text-xl sm:text-2xl lg:text-3xl font-black leading-tight ${
                isLight ? 'text-slate-900' : 'text-white'
              }`}
            >
              {product.name}
            </h1>
            {product.short_description && (
              <p className="mt-1.5 text-xs sm:text-sm font-medium text-slate-400 leading-relaxed">
                {product.short_description}
              </p>
            )}

            {/* Rating Stars Chip */}
            <div className="mt-2.5 flex items-center gap-2 text-xs">
              <span className="text-amber-400 font-bold text-sm">★★★★★</span>
              <span className={`font-black ${isLight ? 'text-slate-900' : 'text-white'}`}>5.0</span>
              <span className="text-slate-500 font-semibold">(Verified Product)</span>
            </div>
          </div>

          {/* Pricing Row */}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <span className="font-display text-2xl sm:text-3xl lg:text-4xl font-black text-[#00C4CC]">
              {formatPrice(product.price, settings)}
            </span>
            {hasDiscount && (
              <span className="text-sm sm:text-base text-slate-400 line-through font-semibold">
                {formatPrice(product.old_price!, settings)}
              </span>
            )}
            {hasDiscount && (
              <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 px-3 py-1 text-xs font-black shadow-sm">
                Save {formatPrice(savings, settings)}
              </span>
            )}
          </div>

          {/* Feature Pills — Horizontal Scroll Row */}
          {featurePills.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              {featurePills.map((pill, idx) => (
                <div
                  key={idx}
                  className={`shrink-0 rounded-2xl border px-3 py-2 flex items-center gap-2 ${
                    isLight
                      ? 'border-cyan-200 bg-cyan-50/70 text-slate-800'
                      : 'border-[#00C4CC]/30 bg-[#0B121E]'
                  }`}
                >
                  <span className="text-sm shrink-0">{pill.icon || '⚡'}</span>
                  <div>
                    <div
                      className={`text-[10.5px] font-bold whitespace-nowrap leading-snug ${
                        isLight ? 'text-slate-900' : 'text-white'
                      }`}
                    >
                      {pill.title}
                    </div>
                    {pill.subtitle && (
                      <div className="text-[9px] text-slate-400 whitespace-nowrap leading-snug mt-0.5">
                        {pill.subtitle}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Color Selector */}
          {activeVariants.length > 0 && (
            <div className={`rounded-2xl border p-3.5 ${cardBg}`}>
              <ColorSwatchSelector
                variants={activeVariants}
                selectedVariant={selectedVariant}
                onSelect={handleSelectVariant}
                validationError={colorError}
                isLight={isLight}
              />
            </div>
          )}

          {/* Quantity Stepper */}
          <div className={`flex items-center justify-between rounded-2xl border px-4 py-2.5 ${cardBg}`}>
            <span className="font-display text-xs sm:text-sm font-bold">Quantity:</span>
            <div
              className={`flex items-center rounded-xl border ${
                isLight ? 'border-slate-200 bg-slate-50' : 'border-slate-700 bg-[#060A11]'
              }`}
            >
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="px-3.5 py-1 font-bold text-base hover:text-[#00C4CC] transition cursor-pointer"
              >
                −
              </button>
              <span
                className={`w-8 text-center font-mono text-xs font-black ${
                  isLight ? 'text-slate-900' : 'text-white'
                }`}
              >
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => setQuantity((q) => q + 1)}
                className="px-3.5 py-1 font-bold text-base hover:text-[#00C4CC] transition cursor-pointer"
              >
                +
              </button>
            </div>
          </div>

          {/* Add to Cart Primary Button */}
          <div>
            <button
              type="button"
              onClick={(e) => {
                if (activeVariants.length > 0 && !selectedVariant) {
                  setColorError('Please select a color.');
                  return;
                }
                setColorError(null);
                
                // Fly animation
                const imgElement = document.getElementById('main-product-image') as HTMLImageElement;
                const isMobile = window.innerWidth < 1024;
                const cartIcon = isMobile 
                  ? (document.getElementById('cart-icon-mobile') || document.getElementById('cart-icon-nav'))
                  : document.getElementById('cart-icon-nav');
                
                if (imgElement && cartIcon) {
                  const imgRect = imgElement.getBoundingClientRect();
                  const cartRect = cartIcon.getBoundingClientRect();
                  
                  // Wrap in a div to create a perfect arc (Parabola)
                  // The outer div moves Y-axis, inner image moves X-axis if we wanted, 
                  // but we can achieve a great curve by combining different easing for top and left.
                  const flyer = document.createElement('div');
                  flyer.style.position = 'fixed';
                  flyer.style.left = `${imgRect.left}px`;
                  flyer.style.top = `${imgRect.top}px`;
                  flyer.style.width = `${imgRect.width}px`;
                  flyer.style.height = `${imgRect.height}px`;
                  flyer.style.zIndex = '9999';
                  flyer.style.pointerEvents = 'none';
                  
                  // Easing for a nice arc: X moves linearly, Y starts fast and slows down (ease-out)
                  flyer.style.transition = 'top 0.75s cubic-bezier(0.17, 0.84, 0.44, 1), left 0.75s linear, width 0.75s ease-in-out, height 0.75s ease-in-out, opacity 0.75s ease-in';
                  
                  const flyerImg = document.createElement('img');
                  flyerImg.src = currentImg;
                  flyerImg.style.width = '100%';
                  flyerImg.style.height = '100%';
                  flyerImg.style.objectFit = 'contain';
                  flyerImg.style.transition = 'transform 0.75s ease-in-out';
                  flyer.appendChild(flyerImg);
                  
                  document.body.appendChild(flyer);
                  
                  requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                      flyer.style.left = `${cartRect.left - 10}px`;
                      flyer.style.top = `${cartRect.top - 10}px`;
                      flyer.style.width = '45px';
                      flyer.style.height = '45px';
                      flyer.style.opacity = '0.5';
                      flyerImg.style.transform = 'scale(0.8) rotate(15deg)'; // Adds a subtle premium spin
                    });
                  });
                  
                  setTimeout(() => {
                    if (document.body.contains(flyer)) {
                      document.body.removeChild(flyer);
                    }
                    // Add a tiny bump animation to the cart icon
                    cartIcon.style.transition = 'transform 0.15s ease-in-out';
                    cartIcon.style.transform = 'scale(1.3) rotate(-5deg)';
                    setTimeout(() => {
                      cartIcon.style.transform = 'scale(1) rotate(0deg)';
                    }, 150);
                    
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
                    openCart();
                  }, 750);
                } else {
                  // Fallback if elements not found
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
                  openCart();
                }
              }}
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#00C4CC] via-[#00E5FF] to-[#00C4CC] hover:brightness-110 text-[#04080F] py-3.5 px-4 font-display text-sm font-black shadow-[0_0_25px_rgba(0,196,204,0.4)] transition duration-200 hover:scale-[1.01] active:scale-98 cursor-pointer"
            >
              <span>🛒 Add to Cart</span>
              <span className="opacity-40">•</span>
              <span>{formatPrice(finalPrice, settings)}</span>
            </button>
          </div>

          {/* Trust Guarantee Cards */}
          <div className="grid grid-cols-3 gap-2 pt-2 text-[10px] text-center">
            <div className={`rounded-2xl p-2 border ${cardBg}`}>
              <span className="block text-sm mb-0.5">🚚</span>
              <strong className={`block font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                Fast Delivery
              </strong>
              <span className="text-[9px] text-slate-500">2–4 Days</span>
            </div>
            <div className={`rounded-2xl p-2 border ${cardBg}`}>
              <span className="block text-sm mb-0.5">💵</span>
              <strong className={`block font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                Cash on Delivery
              </strong>
              <span className="text-[9px] text-slate-500">Pay At Door</span>
            </div>
            <button
              type="button"
              onClick={() => setShowOnlinePaymentModal(true)}
              className={`rounded-2xl p-2 border hover:border-[#00C4CC] transition cursor-pointer ${cardBg}`}
            >
              <span className="block text-sm mb-0.5">💳</span>
              <strong className={`block font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                Online Payment
              </strong>
              <span className="text-[9px] text-slate-500">Direct Transfer</span>
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: Key Features + Specifications + Coupon (lg:col-span-3) */}
        <div className={`lg:col-span-3 rounded-3xl border p-5 space-y-5 ${cardBg}`}>
          {/* Key Features List */}
          {product.key_features && product.key_features.length > 0 && (
            <div>
              <h3 className="text-xs font-black text-[#00C4CC] uppercase tracking-wider mb-3">
                Key Highlights
              </h3>
              <ul className="space-y-2.5 text-xs">
                {product.key_features.map((kf, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span className="text-[#00C4CC] font-bold mt-0.5">✓</span>
                    <div>
                      <strong className={isLight ? 'text-slate-900' : 'text-white'}>
                        {kf.title}
                      </strong>
                      {kf.subtitle ? (
                        <p className="text-[10px] text-slate-400 mt-0.5">{kf.subtitle}</p>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Specifications Table */}
          <div className="border-t border-slate-800/60 pt-4">
            <h3 className="text-xs font-black text-[#00C4CC] uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <span>⚙️</span> Specifications
            </h3>
            <div className={`divide-y text-xs ${isLight ? 'divide-slate-100' : 'divide-slate-800/80'}`}>
              {product.category && (
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-400">Category</span>
                  <span className={`font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    {product.category.name}
                  </span>
                </div>
              )}
              {product.sku && (
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-400">SKU</span>
                  <span className="font-mono font-bold text-[#00C4CC]">{product.sku}</span>
                </div>
              )}
              {product.specifications && product.specifications.length > 0 ? (
                product.specifications.map((s, i) => (
                  <div key={i} className="flex justify-between py-1.5">
                    <span className="text-slate-400">{s.label}</span>
                    <span className={`font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                      {s.value}
                    </span>
                  </div>
                ))
              ) : (
                <div className="py-1 text-[11px] text-slate-500 italic">Official Original Product</div>
              )}
            </div>
          </div>

          {/* Promo Coupon Code Box */}
          <div className="border-t border-slate-800/60 pt-4 space-y-2.5">
            <label className="text-[10px] font-black uppercase tracking-wider block text-slate-400">
              🏷️ Have a Promo Coupon?
            </label>
            <div className="flex gap-2">
              <input
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                placeholder="PROMO CODE"
                className={`w-full rounded-xl border px-3 py-2 text-xs font-mono font-bold focus:border-[#00C4CC] focus:outline-none ${
                  isLight
                    ? 'border-slate-300 bg-slate-50 text-slate-900 placeholder:text-slate-400'
                    : 'border-slate-700 bg-[#060A11] text-[#00C4CC] placeholder:text-slate-600'
                }`}
              />
              <button
                type="button"
                onClick={applyCoupon}
                disabled={couponState.status === 'checking'}
                className="rounded-xl bg-[#00C4CC] px-4 py-2 text-xs font-black text-[#04080F] hover:brightness-110 transition shrink-0 disabled:opacity-50 cursor-pointer"
              >
                Apply
              </button>
            </div>
            {couponState.message && (
              <p
                className={`text-[10px] font-bold ${
                  couponState.status === 'valid' ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {couponState.message}
              </p>
            )}
          </div>

          {/* 100% Genuine Seal */}
          <div
            className={`rounded-2xl border p-3 flex items-center gap-3 ${
              isLight
                ? 'border-cyan-200 bg-cyan-50/70 text-slate-900'
                : 'border-[#00C4CC]/40 bg-[#00C4CC]/10'
            }`}
          >
            <span className="text-2xl">🛡️</span>
            <div>
              <strong className={`block text-xs font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                100% Original Guarantee
              </strong>
              <span className={`text-[10px] ${isLight ? 'text-cyan-800' : 'text-cyan-300'}`}>
                Official brand warranty
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Special Bundle Offers Section */}
      {product.bundle_offers && product.bundle_offers.length > 0 && (
        <div
          className={`rounded-3xl border p-5 sm:p-7 space-y-6 transition-all ${
            isLight
              ? 'border-amber-300 bg-white text-slate-900 shadow-md'
              : 'border-amber-500/30 bg-[#07111E] text-white shadow-[0_0_35px_rgba(245,158,11,0.12)]'
          }`}
        >
          {/* Header */}
          <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4 ${
            isLight ? 'border-slate-200' : 'border-slate-800'
          }`}>
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-500/20 text-2xl border border-amber-500/30 text-amber-400">
                🎁
              </span>
              <div>
                <h2 className="font-display text-base sm:text-lg font-black uppercase tracking-wider text-amber-400">
                  Special Combo Packages &amp; Bundles
                </h2>
                <p className={`text-xs ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                  Buy this product as a combo package deal and save extra!
                </p>
              </div>
            </div>
            <span className="self-start sm:self-auto inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-400/10 text-amber-300 px-3.5 py-1 text-xs font-black uppercase tracking-wider">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
              <span>{product.bundle_offers.length} Active Combo Offer{product.bundle_offers.length > 1 ? 's' : ''}</span>
            </span>
          </div>

          {/* Bundles List */}
          <div className="space-y-4">
            {product.bundle_offers.map((bundle, bIdx) => {
              const bundleSavings =
                (bundle.original_price || 0) > bundle.bundle_price
                  ? (bundle.original_price || 0) - bundle.bundle_price
                  : 0;

              return (
                <div
                  key={bIdx}
                  className={`relative rounded-2xl border p-4 sm:p-5 transition-all shadow-sm ${
                    isLight
                      ? 'border-slate-200 bg-slate-50 hover:border-amber-400'
                      : 'border-amber-500/30 bg-[#0A1424] hover:border-[#00C4CC]/60'
                  }`}
                >
                  {/* Top Bar inside card */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-2.5 py-0.5 text-[9.5px] font-black uppercase tracking-widest text-amber-400 border border-amber-500/30">
                      ⚡ COMBO DEAL
                    </span>
                    {bundle.badge_text && (
                      <span className="rounded-full bg-gradient-to-r from-amber-500 to-rose-500 px-2.5 py-0.5 text-[9px] font-black text-white shadow uppercase tracking-wider">
                        {bundle.badge_text}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
                    {/* Left: Bundle Title & Items */}
                    <div className="lg:col-span-7 space-y-2">
                      <h3 className={`font-display text-sm sm:text-base font-black ${isLight ? 'text-slate-900' : 'text-white'}`}>
                        {bundle.title}
                      </h3>
                      <div className="space-y-1.5 pt-1">
                        {bundle.items.map((item, iIdx) => (
                          <div key={iIdx} className="flex items-center gap-2 text-xs">
                            <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-black">
                              ✓
                            </span>
                            <span className={`font-semibold ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                              {item.name}
                            </span>
                            {item.detail && (
                              <span className="text-[10px] text-slate-400 font-normal">
                                ({item.detail})
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Right: Pricing & CTA Button */}
                    <div className="lg:col-span-5 flex flex-col sm:flex-row items-start sm:items-center justify-between lg:justify-end gap-3.5 border-t lg:border-t-0 border-slate-800/40 pt-3 lg:pt-0">
                      <div className="text-left lg:text-right">
                        {bundle.original_price && bundle.original_price > bundle.bundle_price && (
                          <span className="text-xs text-slate-400 line-through block font-medium">
                            {formatPrice(bundle.original_price, settings)}
                          </span>
                        )}
                        <span className="font-display text-2xl font-black text-[#00C4CC] tracking-tight block">
                          {formatPrice(bundle.bundle_price, settings)}
                        </span>
                        {bundleSavings > 0 && (
                          <span className="inline-flex items-center gap-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-400 mt-0.5">
                            ✦ Save {formatPrice(bundleSavings, settings)}
                          </span>
                        )}
                      </div>

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
                        className="flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-[#0066FF] via-[#00C4CC] to-[#0066FF] hover:brightness-110 text-white px-5 py-2.5 font-display text-xs font-black shadow-[0_0_20px_rgba(0,196,204,0.35)] transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer whitespace-nowrap"
                      >
                        <span>🛒</span>
                        <span>Add Combo to Cart</span>
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
        <div className={`rounded-3xl border p-6 space-y-3 ${cardBg}`}>
          <h2 className="font-display text-sm font-black uppercase tracking-wider text-[#00C4CC]">
            Product Description
          </h2>
          <div className={`whitespace-pre-line text-xs sm:text-sm leading-relaxed ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
            {product.description}
          </div>
        </div>
      )}

      {/* Fullscreen Image Lightbox Modal */}
      {isFullscreenImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4 backdrop-blur-md">
          <button
            type="button"
            onClick={() => setIsFullscreenImage(false)}
            className="absolute top-4 right-4 rounded-full bg-slate-800 p-3 text-white text-xl font-bold hover:bg-slate-700 cursor-pointer"
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
