import Image from 'next/image';
import Link from 'next/link';

export default function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-base-border bg-grid-fade">
      <div className="mx-auto flex max-w-7xl flex-col-reverse items-center gap-10 px-4 py-16 sm:px-6 md:flex-row md:py-24">
        <div className="max-w-xl text-center md:text-left">
          <span className="inline-block rounded-full border border-electric-dim bg-electric/10 px-4 py-1 font-display text-xs font-medium text-electric-bright">
            Fast charging. Faster delivery.
          </span>
          <h1 className="mt-5 font-display text-4xl font-bold leading-tight text-silver-bright sm:text-5xl">
            Power up every device with <span className="text-gradient">STH Gadgets</span>
          </h1>
          <p className="mt-4 text-base text-silver-dim">
            Power banks, wireless earbuds, cables and speakers — engineered for daily carry, priced for real life.
            Order in seconds, straight through WhatsApp.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center md:justify-start">
            <Link
              href="/products"
              className="rounded-xl bg-electric px-6 py-3 text-center font-display text-sm font-semibold text-black shadow-glow transition hover:brightness-110"
            >
              Shop All Products
            </Link>
            <Link
              href="/products?category=power-banks"
              className="rounded-xl border border-base-border px-6 py-3 text-center font-display text-sm font-semibold text-silver-bright transition hover:border-electric hover:text-electric-bright"
            >
              Browse Power Banks
            </Link>
          </div>
        </div>

        <div className="relative flex h-56 w-56 items-center justify-center sm:h-72 sm:w-72">
          <div className="absolute inset-0 rounded-full bg-electric/20 blur-3xl" />
          <Image
            src="/images/logo.png"
            alt="STH Gadgets"
            fill
            sizes="(max-width: 640px) 224px, 288px"
            className="relative object-contain drop-shadow-glow"
            priority
          />
        </div>
      </div>
    </section>
  );
}
