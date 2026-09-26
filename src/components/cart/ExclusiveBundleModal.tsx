'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';
import type { Product } from '@/types/database';

interface ExclusiveBundleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProceedToCheckout?: () => void;
  isPreCheckout?: boolean;
}

export default function ExclusiveBundleModal({
  isOpen,
  onClose,
  onProceedToCheckout,
  isPreCheckout = false,
}: ExclusiveBundleModalProps) {
  const { addToCart, openCheckout } = useCart();
  const [bundleOffers, setBundleOffers] = useState<
    { product: Product; bundle: NonNullable<Product['bundle_offers']>[number] }[]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;

    // Fetch active products with bundle offers
    fetch('/api/products')
      .then((res) => res.json())
      .then((data) => {
        if (data.products && Array.isArray(data.products)) {
          const list: { product: Product; bundle: NonNullable<Product['bundle_offers']>[number] }[] = [];
          data.products.forEach((p: Product) => {
            if (p.active && p.bundle_offers && p.bundle_offers.length > 0) {
              p.bundle_offers.forEach((b) => {
                list.push({ product: p, bundle: b });
              });
            }
          });
          setBundleOffers(list);
        }
      })
      .catch((err) => console.error('Error fetching bundle offers:', err))
      .finally(() => setLoading(false));
  }, [isOpen]);

  if (!isOpen) return null;

  function handleAddBundleAndCheckout(product: Product, bundle: NonNullable<Product['bundle_offers']>[number]) {
    // 1. Add main product with bundle pricing
    addToCart(
      {
        ...product,
        name: `${product.name} (${bundle.title})`,
        price: bundle.bundle_price,
      },
      1,
      bundle.title
    );

    onClose();
    if (onProceedToCheckout) {
      onProceedToCheckout();
    } else {
      openCheckout();
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fadeIn">
      {/* Backdrop click to close */}
      <div className="fixed inset-0" onClick={onClose} />

      {/* Modal Box */}
      <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border border-amber-500/40 bg-gradient-to-b from-[#0F1C2D] via-[#0C1420] to-[#080D15] text-[#C9D2DB] shadow-[0_0_40px_rgba(245,158,11,0.25)]">
        
        {/* Decorative Top Accent */}
        <div className="h-1.5 w-full bg-gradient-to-r from-amber-500 via-rose-500 to-[#00C4CC]" />

        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-800 p-4 sm:p-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-gradient-to-r from-amber-500 to-rose-500 px-2.5 py-0.5 font-display text-[10px] font-black uppercase tracking-wider text-white shadow">
                🔥 EXCLUSIVE OFFER
              </span>
              <span className="text-xs font-bold text-amber-400">Limited Time Savings</span>
            </div>
            <h2 className="font-display text-lg sm:text-xl font-black text-white">
              {isPreCheckout ? 'Pre-Checkout Special Combo Bundle!' : 'Exclusive Bundle Deal & Mega Savings'}
            </h2>
            {isPreCheckout && (
              <p className="text-xs text-amber-300/90 font-medium">
                Wait! Upgrade your order with this Exclusive Bundle Offer before checking out and save extra!
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="rounded-lg border border-slate-800 p-1.5 text-slate-400 hover:border-slate-700 hover:text-white transition"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="max-h-[65vh] overflow-y-auto p-4 sm:p-5 space-y-4">
          {loading ? (
            <div className="py-8 text-center text-xs text-slate-400">Loading exclusive offers...</div>
          ) : bundleOffers.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">No active exclusive bundle deals available right now.</div>
          ) : (
            bundleOffers.map(({ product, bundle }, idx) => {
              const bundleSavings =
                (bundle.original_price || 0) > bundle.bundle_price
                  ? (bundle.original_price || 0) - bundle.bundle_price
                  : 0;

              const primaryImg =
                product.product_images?.find((i) => i.is_primary)?.image_url ||
                product.product_images?.[0]?.image_url ||
                '/images/logo.png';

              return (
                <div
                  key={idx}
                  className="rounded-xl border border-amber-500/30 bg-[#080D15] p-3.5 sm:p-4 space-y-3 shadow-md"
                >
                  <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2">
                    <div className="space-y-0.5">
                      <span className="text-[9px] font-black uppercase tracking-widest text-amber-400">
                        {bundle.badge_text || 'EXCLUSIVE PACKAGE'}
                      </span>
                      <h3 className="font-display text-sm font-bold text-white leading-tight">
                        {bundle.title}
                      </h3>
                    </div>
                    {bundleSavings > 0 && (
                      <span className="rounded-md bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                        Save PKR {bundleSavings.toLocaleString('en-PK')}
                      </span>
                    )}
                  </div>

                  {/* Main Product Info */}
                  <div className="flex items-center gap-3 rounded-lg border border-slate-800 bg-[#0C1420] p-2.5">
                    <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-md bg-black border border-slate-800">
                      <Image src={primaryImg} alt={product.name} fill className="object-contain p-1" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-[#00C4CC] block mb-0.5">
                        MAIN PRODUCT
                      </span>
                      <h4 className="text-xs font-semibold text-white leading-snug truncate">
                        {product.name}
                      </h4>
                    </div>
                  </div>

                  {/* Bundled Package Items */}
                  {bundle.items && bundle.items.length > 0 && (
                    <div className="rounded-lg border border-slate-800 bg-[#0C1420] p-2.5 space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider block text-amber-300">
                        📦 Included Package Items ({bundle.items.length}):
                      </span>
                      {bundle.items.map((item, iIdx) => (
                        <div key={iIdx} className="flex items-center gap-2 text-xs">
                          <span className="text-emerald-400 font-bold shrink-0">✓</span>
                          <span className="text-white font-medium truncate">{item.name}</span>
                          {item.detail && <span className="text-[11px] text-slate-400">({item.detail})</span>}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Pricing Breakdown & CTA */}
                  <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      {bundle.original_price && bundle.original_price > bundle.bundle_price && (
                        <div className="text-[10px] font-medium text-white/70 line-through">
                          Original Price: PKR {bundle.original_price.toLocaleString('en-PK')}
                        </div>
                      )}
                      <div className="font-display text-base font-extrabold text-white">
                        Combo Price: PKR {bundle.bundle_price.toLocaleString('en-PK')}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleAddBundleAndCheckout(product, bundle)}
                      className="rounded-lg bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 py-2 px-3.5 font-display text-xs font-black text-white shadow-md transition hover:scale-[1.02] cursor-pointer"
                    >
                      🛒 Add Exclusive Offer & Checkout
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-800 bg-[#0A101A] p-4 flex flex-col sm:flex-row items-center justify-between gap-2.5">
          {isPreCheckout ? (
            <button
              onClick={() => {
                onClose();
                if (onProceedToCheckout) onProceedToCheckout();
              }}
              className="w-full sm:w-auto text-xs font-bold text-slate-400 hover:text-white transition py-2 px-3 border border-slate-800 rounded-lg"
            >
              ⚡ No Thanks, Skip to Checkout
            </button>
          ) : (
            <button
              onClick={onClose}
              className="w-full sm:w-auto text-xs font-bold text-slate-400 hover:text-white transition py-2 px-3 border border-slate-800 rounded-lg"
            >
              Close
            </button>
          )}

          {isPreCheckout && bundleOffers.length > 0 && (
            <span className="text-[11px] text-amber-400/90 font-medium">
              💡 Exclusive savings applied directly to cart
            </span>
          )}
        </div>

      </div>
    </div>
  );
}
