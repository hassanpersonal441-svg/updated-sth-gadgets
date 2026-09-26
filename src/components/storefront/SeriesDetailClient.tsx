'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { Product, ProductSeries, Settings } from '@/types/database';
import { formatPrice } from '@/lib/utils';
import { useCart } from '@/context/CartContext';
import ColorSwatchSelector from './ColorSwatchSelector';
import type { ProductVariant } from '@/types/database';

export default function SeriesDetailClient({ series, settings }: { series: ProductSeries; settings: Settings | null }) {
  const models = series.models || [];
  const [selectedId, setSelectedId] = useState(models[0]?.id || '');
  const [compare, setCompare] = useState<string[]>([]);
  const [selectedColor, setSelectedColor] = useState<ProductVariant | null>(null);
  const { addToCart } = useCart();
  const model = models.find((item) => item.id === selectedId) || models[0];
  const specs = useMemo(() => [...(series.common_specs || []), ...(model?.specifications || [])], [series, model]);
  if (!models.length) return <section><h1 className="font-display text-3xl font-black">{series.name}</h1><p className="mt-4 text-silver-dim">Models coming soon.</p></section>;
  const compared = models.filter((item) => compare.includes(item.id)).slice(0, 3);
  const compareSpecs = Array.from(new Set(compared.flatMap((item) => [...(series.common_specs || []), ...(item.specifications || [])].map((spec) => spec.label))));
  return <div>
    <header className="mb-8"><p className="text-xs font-bold uppercase tracking-[.2em] text-[#00C4CC]">{series.brand || 'Product Series'}</p><h1 className="mt-2 font-display text-3xl font-black text-silver-bright sm:text-5xl">{series.name}</h1><p className="mt-3 max-w-3xl text-silver-dim">{series.description}</p>{series.warranty && <p className="mt-2 text-sm text-silver-dim">Warranty: {series.warranty}</p>}</header>
    <div className="mb-6 flex gap-3 overflow-x-auto pb-2">{models.map((item) => <button key={item.id} onClick={() => setSelectedId(item.id)} className={`min-w-36 rounded-xl border p-3 text-left ${model.id === item.id ? 'border-[#00C4CC] bg-[#00C4CC]/10' : 'border-slate-800 bg-[#0C1420]'}`}><span className="block font-bold text-silver-bright">{item.name}</span><span className="text-xs text-[#00C4CC]">{formatPrice(item.price, settings)}</span></button>)}</div>
    <section className="grid gap-8 rounded-2xl border border-slate-800 bg-[#0C1420] p-5 md:grid-cols-2 md:p-8">
      <div className="relative aspect-square overflow-hidden rounded-xl bg-black/20"><Image src={selectedColor?.image_url || model.product_images?.find((image) => image.is_primary)?.image_url || model.product_images?.[0]?.image_url || '/images/logo.png'} alt={model.name} fill sizes="(max-width:768px) 100vw,50vw" className="object-contain p-5" /></div>
      <div><h2 className="font-display text-2xl font-black text-silver-bright">{model.name}</h2>{model.model_number && <p className="mt-1 text-sm text-silver-dim">Model {model.model_number}</p>}<p className="mt-4 text-3xl font-black text-[#00C4CC]">{formatPrice(model.price, settings)}</p><p className="mt-2 text-sm text-silver-dim">{model.stock_status === 'out_of_stock' ? 'Out of stock' : model.stock_status === 'low_stock' ? 'Low stock' : 'In stock'}</p><p className="mt-4 text-silver-dim">{model.short_description || model.description}</p>
      <div className="mt-5"><ColorSwatchSelector variants={model.product_variants} selectedVariant={selectedColor} onSelect={setSelectedColor} /></div><div className="mt-5 flex gap-3"><button disabled={model.stock_status === 'out_of_stock'} onClick={() => addToCart(model, 1, selectedColor?.variant_name, selectedColor ? { colorName: selectedColor.variant_name, colorValue: selectedColor.color_value || undefined, imageUrl: selectedColor.image_url || undefined } : undefined)} className="rounded-xl bg-[#00C4CC] px-5 py-3 font-bold text-black disabled:opacity-50">Add to Cart</button><Link href={`/products/${model.slug}`} className="rounded-xl border border-slate-700 px-5 py-3 font-bold text-silver-bright">Full Details</Link></div>{model.free_delivery && <div className="mt-2"><span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-400"><span>🚚</span><span>Free Delivery</span></span></div>}
      <h3 className="mt-8 font-bold text-silver-bright">Specifications</h3><dl className="mt-2 divide-y divide-slate-800">{specs.map((spec, i) => <div key={`${spec.label}-${i}`} className="flex justify-between gap-4 py-2 text-sm"><dt className="text-silver-dim">{spec.label}</dt><dd className="text-right text-silver-bright">{spec.value}</dd></div>)}</dl>
      </div>
    </section>
    {series.common_features?.length ? <section className="mt-8"><h2 className="font-display text-xl font-bold text-silver-bright">Series Features</h2><ul className="mt-3 grid gap-3 sm:grid-cols-2">{series.common_features.map((feature, i) => <li key={i} className="rounded-xl border border-slate-800 p-4 text-silver-bright">{feature.icon} {feature.title}{feature.subtitle && <span className="block text-sm text-silver-dim">{feature.subtitle}</span>}</li>)}</ul></section> : null}
    {models.length > 1 && <section className="mt-10"><h2 className="font-display text-xl font-bold text-silver-bright">Compare models</h2><div className="mt-3 flex flex-wrap gap-3">{models.map((item) => <label key={item.id} className="flex items-center gap-2 text-sm text-silver-bright"><input type="checkbox" checked={compare.includes(item.id)} disabled={!compare.includes(item.id) && compare.length >= 3} onChange={(e) => setCompare((list) => e.target.checked ? [...list, item.id] : list.filter((id) => id !== item.id))} />{item.name}</label>)}</div>{compared.length > 0 && <div className="mt-4 overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr><th className="p-3 text-silver-dim">Specification</th>{compared.map((item) => <th key={item.id} className="p-3 text-silver-bright">{item.name}</th>)}</tr></thead><tbody>{['Price', ...compareSpecs].map((label) => <tr key={label} className="border-t border-slate-800"><th className="p-3 text-silver-dim">{label}</th>{compared.map((item) => { const val = label === 'Price' ? formatPrice(item.price, settings) : [...(series.common_specs || []), ...(item.specifications || [])].find((s) => s.label === label)?.value || '—'; return <td key={item.id} className="p-3 text-silver-bright">{val}</td>; })}</tr>)}</tbody></table></div>}</section>}
  </div>;
}
