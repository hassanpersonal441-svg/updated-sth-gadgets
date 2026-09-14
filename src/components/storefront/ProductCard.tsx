import Image from 'next/image';
import Link from 'next/link';
import type { Product, Settings } from '@/types/database';
import { formatPrice } from '@/lib/utils';
import OrderOnWhatsAppButton from './OrderOnWhatsAppButton';

export default function ProductCard({ product, settings }: { product: Product; settings: Settings | null }) {
  const primaryImage =
    product.product_images?.find((i) => i.is_primary)?.image_url ||
    product.product_images?.[0]?.image_url ||
    '/images/logo.png';

  const productUrl = `${process.env.NEXT_PUBLIC_SITE_URL || ''}/products/${product.slug}`;

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-base-border bg-base-card transition hover:border-electric-dim hover:shadow-glow-sm">
      {product.discount > 0 && (
        <span className="absolute left-3 top-3 z-10 rounded-full bg-electric px-2.5 py-1 font-display text-xs font-semibold text-black">
          -{Math.round(product.discount)}%
        </span>
      )}
      <span
        className={`absolute right-3 top-3 z-10 rounded-full px-2.5 py-1 text-xs font-medium ${
          product.stock_status === 'in_stock'
            ? 'bg-emerald-500/15 text-emerald-400'
            : product.stock_status === 'low_stock'
            ? 'bg-amber-500/15 text-amber-400'
            : 'bg-red-500/15 text-red-400'
        }`}
      >
        {product.stock_status === 'in_stock' ? 'In Stock' : product.stock_status === 'low_stock' ? 'Low Stock' : 'Out of Stock'}
      </span>

      <Link href={`/products/${product.slug}`} className="relative aspect-square w-full overflow-hidden bg-base-raised">
        <Image
          src={primaryImage}
          alt={product.name}
          fill
          className="object-contain p-6 transition duration-300 group-hover:scale-105"
          sizes="(max-width: 768px) 50vw, 25vw"
        />
      </Link>

      <div className="flex flex-1 flex-col gap-2 p-4">
        {product.category && (
          <span className="font-display text-[11px] uppercase tracking-wide text-electric-bright/80">
            {product.category.name}
          </span>
        )}
        <Link href={`/products/${product.slug}`}>
          <h3 className="line-clamp-2 font-display text-sm font-semibold text-silver-bright">{product.name}</h3>
        </Link>
        {product.short_description && (
          <p className="line-clamp-2 text-xs text-silver-dim">{product.short_description}</p>
        )}

        <div className="mt-1 flex items-baseline gap-2">
          <span className="font-display text-lg font-bold text-electric-bright">
            {formatPrice(product.price, settings)}
          </span>
          {product.old_price && product.old_price > product.price && (
            <span className="text-xs text-silver-dim line-through">{formatPrice(product.old_price, settings)}</span>
          )}
        </div>

        <div className="mt-2 flex gap-2">
          <Link
            href={`/products/${product.slug}`}
            className="flex-1 rounded-xl border border-base-border py-2 text-center font-display text-xs font-semibold text-silver-bright transition hover:border-electric hover:text-electric-bright"
          >
            View Details
          </Link>
        </div>
        <OrderOnWhatsAppButton
          settings={settings}
          productId={product.id}
          productName={product.name}
          price={product.price}
          finalPrice={product.price}
          productUrl={productUrl}
          compact
        />
      </div>
    </div>
  );
}
