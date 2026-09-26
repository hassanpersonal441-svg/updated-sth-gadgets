'use client';

import React from 'react';
import type { Product, Settings } from '@/types/database';
import ProductCard from './ProductCard';
import { useTheme } from '@/components/theme/ThemeProvider';

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
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const filtered = products.filter((p) => p.id !== currentProductId).slice(0, 4);

  if (filtered.length === 0) return null;

  return (
    <div className={`mt-16 border-t pt-10 ${isLight ? 'border-slate-200' : 'border-slate-800/80'}`}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <span className="font-display text-xs font-bold uppercase tracking-wider text-[#00C4CC]">
            Recommended Accessories
          </span>
          <h2 className={`font-display text-xl sm:text-2xl font-black mt-1 ${isLight ? 'text-slate-900' : 'text-white'}`}>
            Related Products
          </h2>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-4">
        {filtered.map((product) => (
          <ProductCard key={product.id} product={product} settings={settings} isLight={isLight} />
        ))}
      </div>
    </div>
  );
}
