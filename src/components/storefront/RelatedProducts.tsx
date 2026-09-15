'use client';

import React from 'react';
import type { Product, Settings } from '@/types/database';
import ProductCard from './ProductCard';

interface RelatedProductsProps {
  products: Product[];
  currentProductId: string;
  settings?: Settings | null;
}

export default function RelatedProducts({
  products,
  currentProductId,
  settings,
}: RelatedProductsProps) {
  const filtered = products.filter((p) => p.id !== currentProductId).slice(0, 4);

  if (filtered.length === 0) return null;

  return (
    <div className="mt-16 border-t border-slate-800/80 pt-10">
      <div className="flex items-center justify-between mb-6">
        <div>
          <span className="font-display text-xs font-bold uppercase tracking-wider text-[#00C4CC]">
            Recommended Accessories
          </span>
          <h2 className="font-display text-xl sm:text-2xl font-black text-white mt-1">
            Related Products
          </h2>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-4">
        {filtered.map((product) => (
          <ProductCard key={product.id} product={product} settings={settings} />
        ))}
      </div>
    </div>
  );
}
