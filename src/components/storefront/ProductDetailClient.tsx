'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import type { Product, Settings } from '@/types/database';
import { formatPrice } from '@/lib/utils';
import OrderOnWhatsAppButton from './OrderOnWhatsAppButton';
import { useCart } from '@/context/CartContext';

export default function ProductDetailClient({ product, settings }: { product: Product; settings: Settings | null }) {
  const { addToCart } = useCart();
  const images = product.product_images?.length ? product.product_images : [{ id: '0', image_url: '/images/logo.png' } as any];
  const primaryIndex = Math.max(0, images.findIndex((i) => i.is_primary));
  const [activeImage, setActiveImage] = useState(primaryIndex === -1 ? 0 : primaryIndex);
  const [quantity, setQuantity] = useState(1);
  const [couponCode, setCouponCode] = useState('');
  const [couponState, setCouponState] = useState<{ status: 'idle' | 'checking' | 'valid' | 'invalid'; message?: string; discount?: number }>({
    status: 'idle',
  });
  const [copied, setCopied] = useState(false);

  const subtotal = product.price * quantity;
  const discountAmount = couponState.status === 'valid' ? couponState.discount || 0 : 0;
  const finalPrice = Math.max(subtotal - discountAmount, 0);

  const productUrl = typeof window !== 'undefined' ? window.location.href : '';

  async function applyCoupon() {
    if (!couponCode.trim()) return;
    setCouponState({ status: 'checking' });
    try {
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: couponCode.trim(), orderAmount: subtotal, productId: product.id }),
      });
      const data = await res.json();
      if (data.valid) {
        setCouponState({
          status: 'valid',
          discount: data.discountAmount,
          message: `Coupon "${couponCode.toUpperCase()}" applied: -${formatPrice(data.discountAmount, settings)}`,
        });
      } else {
        setCouponState({ status: 'invalid', message: data.reason || 'Invalid coupon code' });
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

  return (
    <div className="space-y-6">
      {/* Back button */}
      <div>
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-800 bg-[#0C1420] px-4 py-2 text-xs font-bold text-silver-bright hover:border-[#00C4CC] hover:text-[#00C4CC] transition"
        >
          <span>←</span>
          <span>Back to All Rates & Products</span>
        </Link>
      </div>

      <div className="grid gap-10 md:grid-cols-2">
        {/* Gallery */}
        <div>
          <div className="relative aspect-square overflow-hidden rounded-2xl border border-slate-800 bg-[#0C1420]">
            <Image
              src={images[activeImage].image_url}
              alt={product.name}
              fill
              className="object-contain p-8"
              sizes="(max-width: 768px) 100vw, 50vw"
              priority
            />
          </div>
          {images.length > 1 && (
            <div className="mt-3 flex gap-3 overflow-x-auto">
              {images.map((img, i) => (
                <button
                  key={img.id}
                  onClick={() => setActiveImage(i)}
                  className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border ${
                    i === activeImage ? 'border-[#00C4CC] shadow-[0_0_10px_rgba(0,196,204,0.4)]' : 'border-slate-800'
                  }`}
                >
                  <Image src={img.image_url} alt={`${product.name} ${i + 1}`} fill className="object-contain p-2" sizes="64px" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div>
          {product.category && (
            <span className="font-display text-xs uppercase tracking-wider text-[#00C4CC] font-bold">
              {product.category.name}
            </span>
          )}
          <h1 className="mt-2 font-display text-2xl font-black text-silver-bright sm:text-3xl">{product.name}</h1>

          <div className="mt-4 flex items-center gap-3">
            <span className="font-display text-3xl font-black text-[#00C4CC]">{formatPrice(product.price, settings)}</span>
            {product.old_price && product.old_price > product.price && (
              <>
                <span className="text-lg text-silver-dim line-through">{formatPrice(product.old_price, settings)}</span>
                <span className="rounded-full bg-[#00C4CC] px-2.5 py-0.5 text-xs font-extrabold text-black">
                  -{Math.round(product.discount)}%
                </span>
              </>
            )}
          </div>

          <p
            className={`mt-2 inline-block rounded-full px-3 py-1 text-xs font-semibold ${
              product.stock_status === 'in_stock'
                ? 'bg-emerald-500/15 text-emerald-400'
                : product.stock_status === 'low_stock'
                ? 'bg-amber-500/15 text-amber-400'
                : 'bg-rose-500/15 text-rose-400'
            }`}
          >
            {product.stock_status === 'in_stock' ? 'In Stock' : product.stock_status === 'low_stock' ? 'Low Stock' : 'Out of Stock'}
          </p>

          {product.short_description && <p className="mt-4 text-sm text-silver-dim">{product.short_description}</p>}

          {/* Quantity */}
          <div className="mt-6 flex items-center gap-4">
            <span className="font-display text-sm font-semibold text-silver-bright">Quantity</span>
            <div className="flex items-center rounded-xl border border-slate-800 bg-[#0C1420]">
              <button onClick={() => setQuantity((q) => Math.max(1, q - 1))} className="px-3 py-2 text-silver-bright hover:text-[#00C4CC]">
                −
              </button>
              <span className="w-10 text-center font-display text-sm font-bold text-silver-bright">{quantity}</span>
              <button onClick={() => setQuantity((q) => q + 1)} className="px-3 py-2 text-silver-bright hover:text-[#00C4CC]">
                +
              </button>
            </div>
          </div>

          {/* Coupon Input */}
          <div className="mt-6 rounded-2xl border border-slate-800 bg-[#0C1420] p-4">
            <label className="flex items-center gap-2 font-display text-xs font-semibold uppercase tracking-wider text-silver-bright">
              <span>🏷️</span>
              <span>Have a Coupon / Promo Code?</span>
            </label>
            <div className="mt-2.5 flex gap-2">
              <input
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                placeholder="ENTER CODE (E.G. STH10)"
                className="flex-1 rounded-xl border border-slate-700/80 bg-[#080D15] px-4 py-2 text-xs sm:text-sm uppercase font-mono tracking-wider text-[#00C4CC] font-bold placeholder:text-silver-dim/40 focus:border-[#00C4CC] focus:outline-none"
              />
              <button
                onClick={applyCoupon}
                disabled={couponState.status === 'checking'}
                className="rounded-xl bg-[#00C4CC] hover:bg-[#00B2B9] px-4 py-2 font-display text-xs sm:text-sm font-bold text-black transition disabled:opacity-50"
              >
                {couponState.status === 'checking' ? 'Checking...' : 'Apply'}
              </button>
            </div>
            {couponState.message && (
              <p className={`mt-2 text-xs font-semibold ${couponState.status === 'valid' ? 'text-emerald-400' : 'text-rose-400'}`}>
                {couponState.message}
              </p>
            )}
          </div>

          {/* Final price breakdown */}
          <div className="mt-6 rounded-2xl border border-slate-800 bg-[#0C1420] p-4 space-y-2">
            <div className="flex justify-between text-xs sm:text-sm text-silver-dim">
              <span>Subtotal ({quantity} item{quantity > 1 ? 's' : ''})</span>
              <span>{formatPrice(subtotal, settings)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-xs sm:text-sm font-semibold text-emerald-400">
                <span>Coupon Discount</span>
                <span>-{formatPrice(discountAmount, settings)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-slate-800 pt-2 font-display text-lg font-black text-silver-bright">
              <span>Total Price</span>
              <span className="text-[#00C4CC]">{formatPrice(finalPrice, settings)}</span>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3">
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => addToCart(product, quantity)}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-[#00C4CC] bg-[#00C4CC]/15 hover:bg-[#00C4CC] text-[#00C4CC] hover:text-black px-5 py-3 font-display text-sm font-bold shadow-[0_0_15px_rgba(0,196,204,0.2)] transition hover:scale-[1.01]"
              >
                <span>🛒</span>
                <span>Add to Cart ({quantity})</span>
              </button>
              <button
                onClick={handleShare}
                className="rounded-xl border border-slate-800 bg-[#0C1420] px-5 py-3 font-display text-xs sm:text-sm font-semibold text-silver-bright hover:border-[#00C4CC] hover:text-[#00C4CC] transition"
              >
                {copied ? '✓ Link Copied!' : 'Share Product'}
              </button>
            </div>

            <OrderOnWhatsAppButton
              settings={settings}
              productId={product.id}
              productName={product.name}
              price={product.price}
              quantity={quantity}
              discount={discountAmount}
              finalPrice={finalPrice}
              productUrl={productUrl}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] hover:bg-[#20BD5A] px-5 py-3.5 font-display text-sm font-bold text-white shadow-[0_0_15px_rgba(37,211,102,0.3)] transition hover:scale-[1.01]"
            />
          </div>

          {/* Specs */}
          {product.specifications?.length > 0 && (
            <div className="mt-8">
              <h2 className="font-display text-base font-bold text-silver-bright">Specifications</h2>
              <dl className="mt-3 divide-y divide-slate-800 rounded-xl border border-slate-800 bg-[#0C1420]">
                {product.specifications.map((s, i) => (
                  <div key={i} className="flex justify-between px-4 py-2.5 text-xs sm:text-sm">
                    <dt className="text-silver-dim">{s.label}</dt>
                    <dd className="font-semibold text-silver-bright">{s.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          {product.description && (
            <div className="mt-8">
              <h2 className="font-display text-base font-bold text-silver-bright">Description</h2>
              <p className="mt-3 whitespace-pre-line text-xs sm:text-sm leading-relaxed text-silver-dim">
                {product.description}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
