'use client';

import React, { useEffect, useState } from 'react';
import ExclusiveBundleModal from './ExclusiveBundleModal';

export default function FloatingExclusiveOfferButton() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [hasDeals, setHasDeals] = useState(false);

  useEffect(() => {
    // Check if store has active bundle deals
    fetch('/api/products')
      .then((res) => res.json())
      .then((data) => {
        if (data.products && Array.isArray(data.products)) {
          const active = data.products.some(
            (p: { active?: boolean; bundle_offers?: unknown[] }) =>
              p.active && p.bundle_offers && p.bundle_offers.length > 0
          );
          setHasDeals(active);
        }
      })
      .catch(() => {});
  }, []);

  if (!hasDeals) return null;

  return (
    <>
      {/* Floating Exclusive Offer Button */}
      <button
        onClick={() => setIsModalOpen(true)}
        className="mobile-exclusive-offer fixed left-3 z-40 flex max-w-[calc(100vw-6rem)] items-center gap-2 rounded-full border border-amber-500/50 bg-gradient-to-r from-amber-500 via-rose-500 to-amber-600 px-3.5 py-2 font-display text-xs font-black text-white shadow-[0_0_20px_rgba(245,158,11,0.4)] transition hover:scale-105 animate-pulse cursor-pointer sm:left-4"
        title="View Exclusive Bundle Deals"
      >
        <span className="text-sm">🎁</span>
        <span className="uppercase tracking-wider">EXCLUSIVE DEALS</span>
        <span className="rounded-full bg-black/40 px-1.5 py-0.5 text-[9px] font-extrabold text-amber-300">
          HOT
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
