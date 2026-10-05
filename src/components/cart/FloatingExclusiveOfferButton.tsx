'use client';

import React, { useEffect, useState } from 'react';
import ExclusiveBundleModal from './ExclusiveBundleModal';

export default function FloatingExclusiveOfferButton() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [hasDeals, setHasDeals] = useState(false);

  useEffect(() => {
    // Check if store has active deals or bundle offers
    fetch('/api/products')
      .then((res) => res.json())
      .then((data) => {
        if (data.products && Array.isArray(data.products)) {
          const active = data.products.some(
            (p: { active?: boolean; bundle_offers?: unknown[]; old_price?: number; price: number; discount?: number }) =>
              p.active !== false &&
              ((p.bundle_offers && p.bundle_offers.length > 0) ||
                (p.old_price && p.old_price > p.price) ||
                (p.discount && p.discount > 0))
          );
          setHasDeals(active);
        }
      })
      .catch(() => {});
  }, []);

  if (!hasDeals) return null;

  function handleClick() {
    window.dispatchEvent(new CustomEvent('sth_open_deals_modal'));
    setIsModalOpen(true);
  }

  return (
    <>
      {/* Floating Hot Deals / Exclusive Offer Button */}
      <button
        type="button"
        onClick={handleClick}
        className="mobile-exclusive-offer fixed left-4 bottom-20 sm:bottom-6 z-40 flex items-center gap-2 rounded-full border border-amber-400/50 bg-gradient-to-r from-amber-500 via-rose-500 to-amber-600 px-4 py-2.5 font-display text-xs font-black text-white shadow-[0_8px_25px_rgba(245,158,11,0.4)] transition hover:scale-105 active:scale-95 cursor-pointer ring-1 ring-amber-400/30"
        title="View Official Hot Deals & Combo Offers"
      >
        <span className="text-sm">🔥</span>
        <span className="uppercase tracking-wider">HOT DEALS</span>
        <span className="rounded-full bg-black/40 px-1.5 py-0.5 text-[9px] font-black text-amber-300">
          OFFERS
        </span>
      </button>

      {/* Exclusive Bundle Popup Modal */}
      <ExclusiveBundleModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        isPreCheckout={false}
      />
    </>
  );
}
