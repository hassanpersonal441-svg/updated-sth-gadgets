import Navbar from '@/components/storefront/Navbar';
import Footer from '@/components/storefront/Footer';
import WhatsAppFloatingButton from '@/components/storefront/WhatsAppFloatingButton';
import ProductCard from '@/components/storefront/ProductCard';
import { getActiveCategories, getFilteredProducts, getSettings } from '@/lib/data';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'All Products & Official Catalog | STH Gadgets Pakistan',
  description:
    'Browse all mobile accessories, power banks, fast chargers, earbuds, cables, and gadgets with best official prices in Pakistan.',
};
export const revalidate = 30;

export default async function ProductsPage({
  searchParams,
}: {
  searchParams:
    | Promise<{ q?: string; category?: string; min?: string; max?: string; sort?: string }>
    | { q?: string; category?: string; min?: string; max?: string; sort?: string };
}) {
  const resolvedSearchParams = await searchParams;
  const q = resolvedSearchParams?.q;
  const category = resolvedSearchParams?.category;
  const min = resolvedSearchParams?.min;
  const max = resolvedSearchParams?.max;
  const sort = resolvedSearchParams?.sort;

  const [settings, categories, initialProducts] = await Promise.all([
    getSettings(),
    getActiveCategories(),
    getFilteredProducts({
      q,
      category,
      minPrice: min ? Number(min) : undefined,
      maxPrice: max ? Number(max) : undefined,
      sort: (sort as any) || 'default',
    }),
  ]);

  let products = [...initialProducts];
  if ((!sort || sort === 'default') && !q && settings?.auto_rotate_products && products.length > 1) {
    const intervalMs = (settings.auto_rotate_interval_minutes ?? 60) * 60 * 1000;
    const offset = Math.floor(Date.now() / intervalMs) % products.length;
    if (offset > 0) {
      products = [...products.slice(offset), ...products.slice(0, offset)];
    }
  }

  const activeCategory = categories.find((c) => c.slug === category);

  return (
    <>
      <Navbar categories={categories} settings={settings} />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {/* Page Header */}
        <div className="mb-8 space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-bold text-[#00C4CC] uppercase tracking-wider">
            <Link href="/" className="hover:underline">
              Home
            </Link>
            <span>/</span>
            <span>Catalog</span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-black text-white">
            {activeCategory ? activeCategory.name : q ? `Results for "${q}"` : 'All Products & Gadgets'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Showing <strong className="text-[#00C4CC]">{products.length}</strong> official items in catalog
          </p>
        </div>

        <div className="flex flex-col gap-6 md:flex-row items-start">
          {/* Filters sidebar */}
          <aside className="w-full shrink-0 md:w-64 space-y-4">
            <div className="rounded-3xl border border-slate-800 bg-[#0B121E] p-5 space-y-5 shadow-sm">
              <div>
                <h3 className="mb-3 font-display text-xs font-black uppercase tracking-wider text-[#00C4CC]">
                  Browse Categories
                </h3>
                <ul className="space-y-1.5 text-xs">
                  <li>
                    <Link
                      href="/products"
                      className={`block px-3 py-2 rounded-xl font-bold transition duration-150 ${
                        !activeCategory
                          ? 'bg-[#00C4CC] text-black shadow-sm'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                      }`}
                    >
                      All Categories
                    </Link>
                  </li>
                  {categories.map((c) => {
                    const isSelected = activeCategory?.id === c.id;
                    return (
                      <li key={c.id}>
                        <Link
                          href={`/products?category=${c.slug}`}
                          className={`block px-3 py-2 rounded-xl font-bold transition duration-150 ${
                            isSelected
                              ? 'bg-[#00C4CC] text-black shadow-sm'
                              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                          }`}
                        >
                          {c.name}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div className="border-t border-slate-800/80 pt-4">
                <h3 className="mb-3 font-display text-xs font-black uppercase tracking-wider text-[#00C4CC]">
                  Sort Products
                </h3>
                <div className="space-y-1 text-xs">
                  {[
                    { value: 'default', label: 'Featured / Recommended' },
                    { value: 'newest', label: 'Newest Arrivals' },
                    { value: 'price_asc', label: 'Price: Low to High' },
                    { value: 'price_desc', label: 'Price: High to Low' },
                    { value: 'discount', label: 'Biggest Discounts' },
                  ].map((opt) => {
                    const isSelected = (sort || 'default') === opt.value;
                    return (
                      <Link
                        key={opt.value}
                        href={`/products?${new URLSearchParams({
                          ...(q ? { q } : {}),
                          ...(category ? { category } : {}),
                          sort: opt.value,
                        }).toString()}`}
                        className={`block px-3 py-2 rounded-xl font-medium transition duration-150 ${
                          isSelected
                            ? 'bg-[#00C4CC]/20 text-[#00C4CC] border border-[#00C4CC]/40 font-bold'
                            : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                        }`}
                      >
                        {opt.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          </aside>

          {/* Product grid */}
          <div className="flex-1 w-full">
            {products.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-3xl border border-slate-800 bg-[#0B121E] py-20 text-center">
                <span className="text-5xl mb-3">📦</span>
                <p className="font-display text-lg font-bold text-white">No products found</p>
                <p className="mt-2 text-xs sm:text-sm text-slate-400 max-w-sm">
                  Try clearing your search keyword or browse all categories.
                </p>
                <Link
                  href="/products"
                  className="mt-5 rounded-2xl bg-[#00C4CC] px-6 py-2.5 font-display text-xs font-black text-black shadow-md hover:brightness-110 transition"
                >
                  View All Products
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3.5 sm:gap-5 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4">
                {products.map((p, idx) => (
                  <ProductCard key={p.id} product={p} settings={settings} priority={idx < 4} />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer settings={settings} />
      <WhatsAppFloatingButton whatsappNumber={settings?.whatsapp_number ?? null} />
    </>
  );
}
