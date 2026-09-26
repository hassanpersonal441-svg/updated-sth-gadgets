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
    <section className="mx-auto max-w-7xl px-3 sm:px-4 py-6 sm:py-10 md:px-6">
      <div className="mb-4 sm:mb-6 flex items-end justify-between">
        <div>
          <h2 className="font-display text-xl sm:text-2xl font-bold text-silver-bright">{title}</h2>
          {subtitle && <p className="mt-1 text-xs sm:text-sm text-silver-dim">{subtitle}</p>}
        </div>
        {viewAllHref && (
          <Link href={viewAllHref} className="font-display text-xs sm:text-sm font-semibold text-electric-bright hover:underline">
            View All
          </Link>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} settings={settings} />
        ))}
      </div>
    </section>
  );
}
