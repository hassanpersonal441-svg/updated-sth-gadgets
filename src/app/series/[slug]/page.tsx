import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getSeriesBySlug, getSettings } from '@/lib/data';
import SeriesDetailClient from '@/components/storefront/SeriesDetailClient';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const series = await getSeriesBySlug(slug);
  return { title: series ? `${series.name} | STH Gadgets` : 'Series | STH Gadgets', description: series?.description || undefined };
}

export default async function SeriesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [series, settings] = await Promise.all([getSeriesBySlug(slug), getSettings()]);
  if (!series || !series.is_active) notFound();
  return <main className="mx-auto min-h-screen max-w-7xl px-4 py-10"><nav className="mb-6 text-sm text-silver-dim"><Link href="/">Home</Link> / {series.name}</nav><SeriesDetailClient series={series} settings={settings} /></main>;
}
