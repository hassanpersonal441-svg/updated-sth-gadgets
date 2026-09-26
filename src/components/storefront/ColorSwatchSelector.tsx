'use client';

import React from 'react';
import type { ProductVariant } from '@/types/database';

interface ColorSwatchSelectorProps {
  variants?: ProductVariant[];
  selectedVariant: ProductVariant | null;
  onSelect: (variant: ProductVariant) => void;
  validationError?: string | null;
  isLight?: boolean;
}

export default function ColorSwatchSelector({
  variants = [],
  selectedVariant,
  onSelect,
  validationError,
  isLight = false,
}: ColorSwatchSelectorProps) {
  // Only show active variants
  const activeVariants = variants.filter((v) => v.is_active !== false);

  if (activeVariants.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      {/* Header Row: Label & Selected Name */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-bold">
          <span className={isLight ? 'text-slate-700' : 'text-slate-300'}>
            Color:
          </span>
          {selectedVariant ? (
            <span className="font-extrabold text-[#00C4CC]">
              {selectedVariant.variant_name}
            </span>
          ) : (
            <span className="font-normal text-slate-400 italic">
              Select a color
            </span>
          )}
        </div>
      </div>

      {/* Swatches Container */}
      <div className="flex flex-wrap items-center gap-2.5">
        {activeVariants.map((v, i) => {
          const isSelected = selectedVariant?.id
            ? selectedVariant.id === v.id
            : selectedVariant?.variant_name === v.variant_name;

          const hexColor = v.color_value || '#000000';
          const isWhiteLike =
            hexColor.toLowerCase() === '#ffffff' ||
            hexColor.toLowerCase() === '#fff' ||
            hexColor.toLowerCase() === 'white';

          return (
            <div key={v.id || i} className="group relative">
              <button
                type="button"
                onClick={() => onSelect(v)}
                className={`relative flex items-center justify-center h-8 w-8 sm:h-9 sm:w-9 rounded-full transition-all duration-200 focus:outline-none ${
                  isSelected
                    ? 'ring-2 ring-[#00C4CC] ring-offset-2 scale-110 shadow-[0_0_12px_rgba(0,196,204,0.4)]'
                    : 'hover:scale-105 opacity-85 hover:opacity-100'
                } ${isLight ? 'ring-offset-white' : 'ring-offset-[#08101A]'}`}
                style={{
                  backgroundColor: hexColor,
                  border: isWhiteLike
                    ? '1.5px solid #94A3B8'
                    : '1.5px solid rgba(255, 255, 255, 0.25)',
                }}
                aria-label={`Select color ${v.variant_name}`}
                title={v.variant_name}
              >
                {/* Checkmark indicator for selected state */}
                {isSelected && (
                  <span
                    className={`text-xs font-black ${
                      isWhiteLike ? 'text-slate-900' : 'text-white drop-shadow'
                    }`}
                  >
                    ✓
                  </span>
                )}
              </button>

              {/* Tooltip on Hover (Desktop) */}
              <div
                className={`pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md px-2 py-0.5 text-[10px] font-bold shadow-md transition-opacity duration-150 opacity-0 group-hover:opacity-100 z-20 ${
                  isLight
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-800 text-slate-100 border border-slate-700'
                }`}
              >
                {v.variant_name}
              </div>
            </div>
          );
        })}
      </div>

      {/* Validation Error Banner */}
      {validationError && (
        <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-400 flex items-center gap-1.5 animate-shake">
          <span>⚠️</span>
          <span>{validationError}</span>
        </div>
      )}
    </div>
  );
}
