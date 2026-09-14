import Link from 'next/link';
import Image from 'next/image';
import type { Category } from '@/types/database';

export default function CategoryGrid({ categories }: { categories: Category[] }) {
  if (categories.length === 0) return null;

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <h2 className="mb-6 font-display text-2xl font-bold text-silver-bright">Shop by Category</h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {categories.map((c) => (
          <Link
            key={c.id}
            href={`/products?category=${c.slug}`}
            className="group flex flex-col items-center gap-3 rounded-2xl border border-base-border bg-base-card p-4 text-center transition hover:border-electric-dim hover:shadow-glow-sm"
          >
            <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-base-raised">
              {c.image_url ? (
                <Image src={c.image_url} alt={c.name} fill sizes="64px" className="rounded-full object-cover" />
              ) : (
                <span className="font-display text-lg font-bold text-electric-bright">{c.name.charAt(0)}</span>
              )}
            </div>
            <span className="font-display text-xs font-medium text-silver-bright group-hover:text-electric-bright">
              {c.name}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
