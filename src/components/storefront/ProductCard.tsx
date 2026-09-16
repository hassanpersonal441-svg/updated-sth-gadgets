'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { Product, Settings } from '@/types/database';
import { formatPrice, buildWhatsAppOrderLink } from '@/lib/utils';
import { useCart } from '@/context/CartContext';

export default function ProductCard({
  product,
  settings,
  isLight = false,
}: {
  product: Product;
  settings?: Settings | null;
  isLight?: boolean;
}) {
  const { addToCart } = useCart();

  const primaryImage =
    product.product_images?.find((i) => i.is_primary)?.image_url ||
    product.product_images?.[0]?.image_url ||
    '/images/logo.png';

  const hasDiscount = product.old_price && product.old_price > product.price;
  const savings = hasDiscount ? product.old_price! - product.price : 0;

  const productUrl = `/products/${product.slug}`;

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

  async function trackWhatsAppClick(e: React.MouseEvent) {
    e.preventDefault();

    let targetLink = orderLink;

    try {
      const res = await fetch('/api/orders/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: 'WhatsApp Customer',
          phone: phone.replace(/[^\d]/g, '') || '923489593671',
          city: 'Pakistan',
          address: `Direct WhatsApp Order for "${product.name}"`,
          coupon_code: null,
          items: [{ product_id: product.id, quantity: 1 }],
        }),
      });
      const data = await res.json();
      if (data.success && data.whatsappUrl) {
        targetLink = data.whatsappUrl;
      }
    } catch (err) {
      console.error('WhatsApp track error:', err);
    } finally {
      if (typeof window !== 'undefined') {
        window.location.href = targetLink;
      }
    }
  }

  return (
    <div
      className={`group relative flex flex-col overflow-hidden rounded-2xl border transition duration-300 hover:border-[#00C4CC] hover:shadow-[0_0_24px_rgba(0,196,204,0.3)] ${
        isLight
          ? 'border-slate-200 bg-white text-slate-800'
          : 'border-slate-800/90 bg-[#0C1422] text-[#C9D2DB]'
      }`}
    >
      {/* Top Badges */}
      <div className="absolute left-2.5 top-2.5 z-10 flex flex-col gap-1 items-start">
        {product.discount > 0 && (
          <span className="rounded-full bg-[#00C4CC] px-2.5 py-0.5 font-display text-[10px] sm:text-xs font-black text-black shadow-md tracking-wider">
            -{Math.round(product.discount)}% OFF
          </span>
        )}
        {product.bundle_offers && product.bundle_offers.length > 0 && (
          <span className="rounded-full bg-gradient-to-r from-amber-500 to-rose-500 px-2.5 py-0.5 font-display text-[10px] sm:text-xs font-black text-white shadow-md tracking-wider">
            🎁 BUNDLE DEAL
          </span>
        )}
      </div>

      <div className="absolute right-2.5 top-2.5 z-10">
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold shadow-sm ${
            product.stock_status === 'in_stock'
              ? isLight
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-300'
                : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 backdrop-blur-sm'
              : product.stock_status === 'low_stock'
              ? isLight
                ? 'bg-amber-50 text-amber-700 border border-amber-300'
                : 'bg-amber-500/20 text-amber-400 border border-amber-500/40 backdrop-blur-sm'
              : isLight
              ? 'bg-red-50 text-red-700 border border-red-300'
              : 'bg-red-500/20 text-red-400 border border-red-500/40 backdrop-blur-sm'
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              product.stock_status === 'in_stock'
                ? 'bg-emerald-400 animate-pulse'
                : product.stock_status === 'low_stock'
                ? 'bg-amber-400'
                : 'bg-red-400'
            }`}
          ></span>
          <span>
            {product.stock_status === 'in_stock'
              ? 'In Stock'
              : product.stock_status === 'low_stock'
              ? 'Low Stock'
              : 'Out of Stock'}
          </span>
        </span>
      </div>

      {/* Product Image Link Container */}
      <Link
        href={`/products/${product.slug}`}
        className={`relative aspect-square w-full overflow-hidden p-2.5 sm:p-3 flex items-center justify-center border-b transition ${
          isLight ? 'bg-slate-50 border-slate-100' : 'bg-[#070B12] border-slate-800/80'
        }`}
      >
        <Image
          src={primaryImage}
          alt={product.name}
          fill
          className="object-contain p-1.5 sm:p-2 transition duration-500 group-hover:scale-105"
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
        />
      </Link>

      {/* Content Body */}
      <div className="flex flex-1 flex-col justify-between p-3 sm:p-4 gap-2">
        <div>
          {/* Category tag & Rating stars */}
          <div className="flex items-center justify-between gap-1 mb-1">
            {product.category ? (
              <span className="font-display text-[10px] uppercase tracking-widest text-[#00C4CC] font-extrabold truncate">
                {product.category.name}
              </span>
            ) : (
              <span></span>
            )}
            <div className="flex items-center gap-0.5 text-[10px] font-bold text-amber-400 shrink-0 bg-amber-400/10 px-1.5 py-0.2 rounded border border-amber-400/20">
              <span>★</span>
              <span>5.0</span>
            </div>
          </div>

          {/* Title */}
          <Link href={`/products/${product.slug}`}>
            <h3
              className={`line-clamp-2 font-display text-xs sm:text-sm font-bold group-hover:text-[#00C4CC] transition duration-200 leading-snug ${
                isLight ? 'text-slate-900' : 'text-white'
              }`}
            >
              {product.name}
            </h3>
          </Link>

          {/* Price Section */}
          <div className="mt-2 flex flex-wrap items-baseline gap-1.5">
            <span
              className={`font-display text-base sm:text-lg font-black ${
                isLight ? 'text-black' : 'text-white'
              }`}
            >
              {formatPrice(product.price, settings)}
            </span>
            {hasDiscount && (
              <span
                className={`text-[11px] sm:text-xs line-through ${
                  isLight ? 'text-slate-500' : 'text-slate-400'
                }`}
              >
                {formatPrice(product.old_price!, settings)}
              </span>
            )}
            {savings > 0 && (
              <span
                className={`text-[9px] sm:text-[10px] font-extrabold px-1.5 py-0.5 rounded-md border ${
                  isLight
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                    : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                }`}
              >
                Save {formatPrice(savings, settings)}
              </span>
            )}
          </div>
        </div>

        {/* Action Button: Full-Width Add to Cart */}
        <div className="mt-2.5">
          <button
            type="button"
            onClick={() => addToCart(product, 1)}
            className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-[#00C4CC] hover:bg-[#00B2B9] text-black py-2.5 px-3 font-display text-xs sm:text-sm font-black transition duration-200 shadow-sm hover:scale-[1.01]"
          >
            <span>🛒</span>
            <span>Add to Cart</span>
          </button>
        </div>
      </div>
    </div>
  );
}
