'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { Category } from '@/types/database';

export default function Navbar({ categories }: { categories: Category[] }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const router = useRouter();

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    router.push(`/products?q=${encodeURIComponent(query)}`);
    setOpen(false);
  }

  return (
    <header className="sticky top-0 z-50 border-b border-base-border bg-base/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <Image src="/images/logo.png" alt="STH Gadgets" width={40} height={40} className="rounded-full" priority />
          <span className="hidden font-display text-lg font-semibold text-silver-bright sm:block">
            STH <span className="text-electric-bright">Gadgets</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-6 font-display text-sm text-silver-dim md:flex">
          <Link href="/products" className="transition hover:text-electric-bright">
            All Products
          </Link>
          {categories.slice(0, 5).map((c) => (
            <Link
              key={c.id}
              href={`/products?category=${c.slug}`}
              className="transition hover:text-electric-bright"
            >
              {c.name}
            </Link>
          ))}
        </nav>

        <form onSubmit={handleSearch} className="ml-auto hidden max-w-xs flex-1 items-center md:flex">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            type="text"
            placeholder="Search products..."
            className="w-full rounded-full border border-base-border bg-base-card px-4 py-2 text-sm text-silver-bright placeholder:text-silver-dim/70 focus-ring"
          />
        </form>

        <button
          aria-label="Toggle menu"
          onClick={() => setOpen((o) => !o)}
          className="ml-auto rounded-lg border border-base-border p-2 text-silver-bright md:hidden"
        >
          {open ? '✕' : '☰'}
        </button>
      </div>

      {open && (
        <div className="border-t border-base-border bg-base-raised px-4 py-4 md:hidden">
          <form onSubmit={handleSearch} className="mb-4 flex">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              type="text"
              placeholder="Search products..."
              className="w-full rounded-full border border-base-border bg-base-card px-4 py-2 text-sm text-silver-bright placeholder:text-silver-dim/70 focus-ring"
            />
          </form>
          <nav className="flex flex-col gap-3 font-display text-sm">
            <Link href="/products" onClick={() => setOpen(false)} className="text-silver-bright">
              All Products
            </Link>
            {categories.map((c) => (
              <Link
                key={c.id}
                href={`/products?category=${c.slug}`}
                onClick={() => setOpen(false)}
                className="text-silver-dim"
              >
                {c.name}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
