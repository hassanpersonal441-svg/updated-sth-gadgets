'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { ProductSeries, Settings, ProductVariant } from '@/types/database';
import { formatPrice } from '@/lib/utils';
import { useCart } from '@/context/CartContext';
import ColorSwatchSelector from './ColorSwatchSelector';

export default function SeriesDetailClient({
  series,
  settings,
}: {
  series: ProductSeries;
  settings: Settings | null;
}) {
  const models = series.models || [];
  const [selectedId, setSelectedId] = useState(models[0]?.id || '');
  const [compare, setCompare] = useState<string[]>([]);
  const [selectedColor, setSelectedColor] = useState<ProductVariant | null>(null);
  const { addToCart } = useCart();
  const model = models.find((item) => item.id === selectedId) || models[0];

  const specs = useMemo(
    () => [...(series.common_specs || []), ...(model?.specifications || [])],
    [series, model]
  );

  if (!models.length) {
    return (
      <section className="py-12 text-center">
        <h1 className="font-display text-3xl font-black text-white">{series.name}</h1>
        <p className="mt-4 text-slate-400">Models coming soon to catalog.</p>
      </section>
    );
  }

  const compared = models.filter((item) => compare.includes(item.id)).slice(0, 3);
  const compareSpecs = Array.from(
    new Set(
      compared.flatMap((item) =>
        [...(series.common_specs || []), ...(item.specifications || [])].map((spec) => spec.label)
      )
    )
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="space-y-2">
        <div className="inline-flex items-center gap-2 rounded-full border border-[#00C4CC]/40 bg-[#00C4CC]/10 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-[#00C4CC]">
          <span>{series.brand || 'OFFICIAL SERIES'}</span>
        </div>
        <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-black text-white">
          {series.name}
        </h1>
        {series.description && (
          <p className="max-w-3xl text-xs sm:text-sm text-slate-400 leading-relaxed">
            {series.description}
          </p>
        )}
        {series.warranty && (
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400">
            <span>🛡️ Warranty:</span>
            <span>{series.warranty}</span>
          </div>
        )}
      </header>

      {/* Model Selection Tabs */}
      <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-none">
        {models.map((item) => {
          const isSelected = model.id === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setSelectedId(item.id)}
              className={`min-w-44 rounded-2xl border p-3.5 text-left transition duration-200 cursor-pointer ${
                isSelected
                  ? 'border-[#00C4CC] bg-[#00C4CC]/10 shadow-[0_0_20px_rgba(0,196,204,0.25)]'
                  : 'border-slate-800 bg-[#0B121E] hover:border-slate-700'
              }`}
            >
              <span className={`block font-display text-xs sm:text-sm font-black ${isSelected ? 'text-[#00C4CC]' : 'text-white'}`}>
                {item.name}
              </span>
              <span className="text-xs font-bold text-[#00C4CC] mt-1 block">
                {formatPrice(item.price, settings)}
              </span>
            </button>
          );
        })}
      </div>

      {/* Main Selected Model Spotlight Card */}
      <section className="grid gap-8 rounded-3xl border border-slate-800 bg-[#0B121E] p-6 md:grid-cols-2 md:p-8 shadow-sm">
        <div className="relative aspect-square overflow-hidden rounded-2xl border border-slate-800 bg-[#080E18] flex items-center justify-center p-6">
          <Image
            src={
              selectedColor?.image_url ||
              model.product_images?.find((image) => image.is_primary)?.image_url ||
              model.product_images?.[0]?.image_url ||
              '/images/logo.png'
            }
            alt={model.name}
            fill
            sizes="(max-width:768px) 100vw, 50vw"
            className="object-contain p-4 transition-transform duration-500 hover:scale-105"
          />
        </div>

        <div className="space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <h2 className="font-display text-2xl sm:text-3xl font-black text-white">
              {model.name}
            </h2>
            {model.model_number && (
              <p className="text-xs text-slate-400 font-mono">Model #{model.model_number}</p>
            )}
            <p className="text-2xl sm:text-3xl font-black text-[#00C4CC] pt-1">
              {formatPrice(model.price, settings)}
            </p>
            <div className="flex items-center gap-2 pt-1">
              <span
                className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                  model.stock_status === 'in_stock'
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                }`}
              >
                ● {model.stock_status === 'out_of_stock' ? 'Out of stock' : model.stock_status === 'low_stock' ? 'Low stock' : 'In stock'}
              </span>
              {model.free_delivery && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                  <span>🚚</span>
                  <span>Free Delivery</span>
                </span>
              )}
            </div>

            {model.short_description && (
              <p className="text-xs text-slate-300 leading-relaxed pt-2">
                {model.short_description}
              </p>
            )}

            {/* Color selector if variant exists */}
            {model.product_variants && model.product_variants.length > 0 && (
              <div className="pt-2">
                <ColorSwatchSelector
                  variants={model.product_variants}
                  selectedVariant={selectedColor}
                  onSelect={setSelectedColor}
                />
              </div>
            )}
          </div>

          <div className="space-y-4 pt-4 border-t border-slate-800">
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                disabled={model.stock_status === 'out_of_stock'}
                onClick={() =>
                  addToCart(
                    model,
                    1,
                    selectedColor?.variant_name,
                    selectedColor
                      ? {
                          colorName: selectedColor.variant_name,
                          colorValue: selectedColor.color_value || undefined,
                          imageUrl: selectedColor.image_url || undefined,
                        }
                      : undefined
                  )
                }
                className="flex-1 rounded-2xl bg-[#00C4CC] hover:bg-[#00E5FF] px-6 py-3.5 font-display text-sm font-black text-black shadow-[0_0_20px_rgba(0,196,204,0.3)] transition hover:scale-105 active:scale-95 disabled:opacity-50 cursor-pointer text-center"
              >
                🛒 Add to Cart
              </button>
              <Link
                href={`/products/${model.slug}`}
                className="rounded-2xl border border-slate-700 hover:border-[#00C4CC] px-6 py-3.5 font-display text-sm font-bold text-white transition text-center"
              >
                Full Details
              </Link>
            </div>

            {/* Specs list */}
            <div>
              <h3 className="font-display text-xs font-black uppercase tracking-wider text-[#00C4CC] mb-2">
                Specifications
              </h3>
              <dl className="divide-y divide-slate-800 text-xs">
                {specs.slice(0, 6).map((spec, i) => (
                  <div key={`${spec.label}-${i}`} className="flex justify-between gap-4 py-2">
                    <dt className="text-slate-400">{spec.label}</dt>
                    <dd className="text-right font-bold text-white">{spec.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </div>
      </section>

      {/* Series Common Features */}
      {series.common_features && series.common_features.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-display text-lg font-black text-white uppercase tracking-wider">
            Series Highlights
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {series.common_features.map((feature, i) => (
              <li
                key={i}
                className="rounded-2xl border border-slate-800 bg-[#0B121E] p-4 text-white flex items-start gap-3"
              >
                <span className="text-xl">{feature.icon || '⚡'}</span>
                <div>
                  <strong className="block text-xs font-bold text-white">{feature.title}</strong>
                  {feature.subtitle && (
                    <span className="block text-[11px] text-slate-400 mt-0.5">
                      {feature.subtitle}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Compare Models Table */}
      {models.length > 1 && (
        <section className="space-y-4 pt-4">
          <h2 className="font-display text-lg font-black text-white uppercase tracking-wider">
            Compare Models Side-by-Side
          </h2>
          <div className="flex flex-wrap gap-3">
            {models.map((item) => (
              <label
                key={item.id}
                className="flex items-center gap-2 text-xs font-bold text-slate-300 cursor-pointer bg-[#0B121E] border border-slate-800 px-3 py-1.5 rounded-xl"
              >
                <input
                  type="checkbox"
                  checked={compare.includes(item.id)}
                  disabled={!compare.includes(item.id) && compare.length >= 3}
                  onChange={(e) =>
                    setCompare((list) =>
                      e.target.checked ? [...list, item.id] : list.filter((id) => id !== item.id)
                    )
                  }
                  className="rounded text-[#00C4CC] focus:ring-[#00C4CC]"
                />
                <span>{item.name}</span>
              </label>
            ))}
          </div>

          {compared.length > 0 && (
            <div className="overflow-x-auto rounded-3xl border border-slate-800 bg-[#0B121E]">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-[#070C15]">
                    <th className="p-3.5 text-slate-400 font-bold uppercase">Specification</th>
                    {compared.map((item) => (
                      <th key={item.id} className="p-3.5 text-white font-black">
                        {item.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {['Price', ...compareSpecs].map((label) => (
                    <tr key={label} className="hover:bg-slate-800/40 transition">
                      <th className="p-3.5 text-slate-400 font-medium">{label}</th>
                      {compared.map((item) => {
                        const val =
                          label === 'Price'
                            ? formatPrice(item.price, settings)
                            : [...(series.common_specs || []), ...(item.specifications || [])].find(
                                (s) => s.label === label
                              )?.value || '—';
                        return (
                          <td key={item.id} className="p-3.5 font-bold text-white">
                            {val}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
