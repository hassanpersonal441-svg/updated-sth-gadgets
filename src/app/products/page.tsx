import Navbar from '@/components/storefront/Navbar';
import Footer from '@/components/storefront/Footer';
import WhatsAppFloatingButton from '@/components/storefront/WhatsAppFloatingButton';
import ProductCard from '@/components/storefront/ProductCard';
import { getActiveCategories, getFilteredProducts, getSettings } from '@/lib/data';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'All Products' };
export const revalidate = 30;

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; min?: string; max?: string; sort?: string }> | { q?: string; category?: string; min?: string; max?: string; sort?: string };
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
        <div className="mb-6">
          <h1 className="font-display text-2xl font-bold text-silver-bright">
            {activeCategory ? activeCategory.name : q ? `Results for "${q}"` : 'All Products'}
          </h1>
          <p className="mt-1 text-sm text-silver-dim">{products.length} product{products.length === 1 ? '' : 's'} found</p>
        </div>

        <div className="flex flex-col gap-6 md:flex-row">
          {/* Filters sidebar */}
          <aside className="w-full shrink-0 md:w-56">
            <div className="rounded-2xl border border-base-border bg-base-card p-4">
              <h3 className="mb-3 font-display text-sm font-semibold text-silver-bright">Categories</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/products" className={`hover:text-electric-bright ${!activeCategory ? 'text-electric-bright' : 'text-silver-dim'}`}>
                    All Categories
                  </Link>
                </li>
                {categories.map((c) => (
                  <li key={c.id}>
                    <Link
                      href={`/products?category=${c.slug}`}
                      className={`hover:text-electric-bright ${activeCategory?.id === c.id ? 'text-electric-bright' : 'text-silver-dim'}`}
                    >
                      {c.name}
                    </Link>
                  </li>
                ))}
              </ul>

              <h3 className="mb-3 mt-6 font-display text-sm font-semibold text-silver-bright">Sort By</h3>
              <form className="space-y-2 text-sm">
                {[
                  { value: 'default', label: 'Featured / Recommended' },
                  { value: 'newest', label: 'Newest' },
                  { value: 'price_asc', label: 'Price: Low to High' },
                  { value: 'price_desc', label: 'Price: High to Low' },
                  { value: 'discount', label: 'Biggest Discount' },
                ].map((opt) => (
                  <Link
                    key={opt.value}
                    href={`/products?${new URLSearchParams({ ...(q ? { q } : {}), ...(category ? { category } : {}), sort: opt.value }).toString()}`}
                    className={`block hover:text-electric-bright ${
                      (sort || 'default') === opt.value ? 'text-electric-bright' : 'text-silver-dim'
                    }`}
                  >
                    {opt.label}
                  </Link>
                ))}
              </form>
            </div>
          </aside>

          {/* Product grid */}
          <div className="flex-1">
            {products.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-base-border bg-base-card py-20 text-center">
                <p className="font-display text-lg font-semibold text-silver-bright">No products found</p>
                <p className="mt-2 text-sm text-silver-dim">Try a different search term or browse all categories.</p>
                <Link href="/products" className="mt-4 rounded-xl bg-electric px-5 py-2 font-display text-sm font-semibold text-black">
                  View All Products
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {products.map((p) => (
                  <ProductCard key={p.id} product={p} settings={settings} />
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
