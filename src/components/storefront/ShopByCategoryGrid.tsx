'use client';

import React, { useMemo } from 'react';
import Image from 'next/image';
import type { Category, Product } from '@/types/database';

interface ShopByCategoryGridProps {
  categories: Category[];
  products: Product[];
  selectedCategory: string;
  onSelectCategory: (slug: string) => void;
  isLight?: boolean;
}

export default function ShopByCategoryGrid({
  categories,
  products,
  selectedCategory,
  onSelectCategory,
  isLight = false,
}: ShopByCategoryGridProps) {
  // Map category slug to a representative product image
  const categoryImages = useMemo(() => {
    const map: Record<string, string> = {};
    for (const cat of categories) {
      const match = products.find(
        (p) =>
          p.category?.slug === cat.slug &&
          p.product_images?.length &&
          !p.product_images[0].image_url.includes('logo.png')
      );
      if (match?.product_images?.[0]?.image_url) {
        map[cat.slug] = match.product_images[0].image_url;
      } else {
        // Fallback default image for standard gadget categories
        map[cat.slug] = '/images/logo.png';
      }
    }
    return map;
  }, [categories, products]);

  // Product counts per category
  const categoryCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const p of products) {
      if (p.category?.slug) {
        map[p.category.slug] = (map[p.category.slug] || 0) + 1;
      }
    }
    return map;
  }, [products]);

  // Priority categories to showcase
  const displayCategories = useMemo(() => {
    // Sort so categories with products come first
    return [...categories]
      .filter((c) => (categoryCounts[c.slug] || 0) > 0)
      .slice(0, 6);
  }, [categories, categoryCounts]);

  if (displayCategories.length === 0) return null;

  return (
    <section id="shop-by-category" className="py-4 space-y-4">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 border-b border-slate-800/60 pb-3">
        <div>
          <span className="font-display text-[11px] font-black uppercase tracking-wider text-[#00C4CC] flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-[#00C4CC]" />
            Official Tech Divisions
          </span>
          <h2
            className={`font-display text-xl sm:text-2xl font-black tracking-tight mt-0.5 ${
              isLight ? 'text-slate-900' : 'text-white'
            }`}
          >
            Shop by Category
          </h2>
        </div>
        <p className="text-xs text-slate-400 font-medium">
          Browse verified authentic gadget categories across Pakistan
        </p>
      </div>

      {/* Category Grid (2 col mobile, 3 col tablet, 6 col desktop) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {displayCategories.map((cat) => {
          const isSelected = selectedCategory === cat.slug;
          const imgUrl = categoryImages[cat.slug] || '/images/logo.png';
          const count = categoryCounts[cat.slug] || 0;

          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => {
                onSelectCategory(cat.slug);
                const el = document.getElementById('product-catalog');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              className={`group relative flex flex-col items-center justify-between rounded-2xl p-4 text-center border transition-all duration-300 cursor-pointer overflow-hidden ${
                isSelected
                  ? 'border-[#00C4CC] bg-[#00C4CC]/10 shadow-[0_0_20px_rgba(0,196,204,0.25)] ring-1 ring-[#00C4CC]'
                  : isLight
                  ? 'border-slate-200 bg-white hover:border-[#0891B2] hover:shadow-[0_8px_20px_rgba(0,0,0,0.06)]'
                  : 'border-slate-800/80 bg-[#0B121E] hover:border-[#00C4CC] hover:bg-[#0E1A2C] hover:shadow-[0_0_25px_rgba(0,196,204,0.18)]'
              }`}
            >
              {/* Product Thumbnail Container */}
              <div className="relative h-20 w-20 sm:h-24 sm:w-24 rounded-2xl bg-white p-2.5 shadow-sm border border-slate-100 dark:border-white/10 mb-3 flex items-center justify-center transition-transform duration-300 group-hover:scale-108 group-hover:-translate-y-1">
                <Image
                  src={imgUrl}
                  alt={cat.name}
                  fill
                  className="object-contain p-1.5"
                  sizes="96px"
                />
              </div>

              {/* Title & Item Count */}
              <div className="w-full">
                <span
                  className={`block font-display text-xs sm:text-sm font-bold truncate transition-colors duration-200 ${
                    isSelected
                      ? 'text-[#00C4CC]'
                      : isLight
                      ? 'text-slate-900 group-hover:text-[#0891B2]'
                      : 'text-white group-hover:text-[#00C4CC]'
                  }`}
                >
                  {cat.name}
                </span>
                <span className="block text-[10px] text-slate-400 font-medium mt-0.5">
                  {count} {count === 1 ? 'Product' : 'Products'}
                </span>
              </div>

              {/* Subtle Cyan Bottom Indicator */}
              <div
                className={`absolute bottom-0 left-0 right-0 h-0.5 transition-all duration-300 ${
                  isSelected
                    ? 'bg-[#00C4CC]'
                    : 'bg-transparent group-hover:bg-[#00C4CC]/70'
                }`}
              />
            </button>
          );
        })}
      </div>
    </section>
  );
}
