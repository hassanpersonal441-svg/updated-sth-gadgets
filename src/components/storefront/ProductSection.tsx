import Link from 'next/link';
import type { Product, Settings } from '@/types/database';
import ProductCard from './ProductCard';

export default function ProductSection({
  title,
  subtitle,
  products,
  settings,
  viewAllHref,
}: {
  title: string;
  subtitle?: string;
  products: Product[];
  settings: Settings | null;
  viewAllHref?: string;
}) {
  if (products.length === 0) return null;

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold text-silver-bright">{title}</h2>
          {subtitle && <p className="mt-1 text-sm text-silver-dim">{subtitle}</p>}
        </div>
        {viewAllHref && (
          <Link href={viewAllHref} className="font-display text-sm font-semibold text-electric-bright hover:underline">
            View All
          </Link>
        )}
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} settings={settings} />
        ))}
      </div>
    </section>
  );
}
