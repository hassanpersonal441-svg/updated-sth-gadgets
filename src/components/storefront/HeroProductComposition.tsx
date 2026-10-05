'use client';

import React, { useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { Product } from '@/types/database';

interface HeroProductCompositionProps {
  products: Product[];
  customHeroImage?: string | null;
  isLight?: boolean;
}

export default function HeroProductComposition({
  products,
  customHeroImage,
  isLight = false,
}: HeroProductCompositionProps) {
  // Dynamically select 5 complementary gadgets from active products
  const compositionItems = useMemo(() => {
    const hasValidImage = (p: Product) => {
      const img =
        p.product_images?.find((i) => i.image_url && !i.image_url.includes('logo.png'))?.image_url ||
        p.product_images?.[0]?.image_url;
      return Boolean(img && !img.includes('logo.png'));
    };

    const findByPatterns = (patterns: string[], excludeIds: Set<string>) => {
      return products.find((p) => {
        if (excludeIds.has(p.id)) return false;
        if (!hasValidImage(p)) return false;
        const catSlug = (p.category?.slug || '').toLowerCase();
        const catName = (p.category?.name || '').toLowerCase();
        const name = p.name.toLowerCase();
        return patterns.some(
          (pat) => catSlug.includes(pat) || catName.includes(pat) || name.includes(pat)
        );
      });
    };

    const usedIds = new Set<string>();

    // 1. Center Hero: Wireless Earbuds
    const earbuds = findByPatterns(['earbud', 'buds', 'tws', 'air31', 'headphone'], usedIds);
    if (earbuds) usedIds.add(earbuds.id);

    // 2. Power Bank
    const powerBank = findByPatterns(['power-bank', 'power bank', 'mah', 'battery'], usedIds);
    if (powerBank) usedIds.add(powerBank.id);

    // 3. Bluetooth Speaker
    const speaker = findByPatterns(['speaker', 'audio', 'sound', 'bass'], usedIds);
    if (speaker) usedIds.add(speaker.id);

    // 4. Premium Cable
    const cable = findByPatterns(['cable', 'type-c', 'usb-c', 'lightning', 'wire'], usedIds);
    if (cable) usedIds.add(cable.id);

    // 5. Fast Charger
    const charger = findByPatterns(['charger', 'adapter', 'fast-charger', 'wall'], usedIds);
    if (charger) usedIds.add(charger.id);

    const picked = [earbuds, powerBank, speaker, cable, charger].filter(Boolean) as Product[];

    // If any slot is missing, fill from other products with valid images
    if (picked.length < 5) {
      for (const p of products) {
        if (picked.length >= 5) break;
        if (!usedIds.has(p.id) && hasValidImage(p)) {
          picked.push(p);
          usedIds.add(p.id);
        }
      }
    }

    return picked.slice(0, 5);
  }, [products]);

  // If admin uploaded a custom 1-photo composition with all products
  if (customHeroImage) {
    return (
      <div className="relative w-full max-w-[580px] h-[360px] sm:h-[440px] lg:h-[480px] mx-auto select-none flex items-center justify-center">
        {/* Studio Spotlight Ambient Glow */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#00C4CC]/28 via-[#0066FF]/14 to-transparent blur-3xl pointer-events-none rounded-full transform scale-95" />

        {/* Subtle Cyan Rim Highlight Arc */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[92%] h-[86%] rounded-3xl border border-[#00C4CC]/20 pointer-events-none opacity-60" />

        {/* Soft Stage Pedestal Ground Shadow */}
        <div className="absolute bottom-3 sm:bottom-6 left-1/2 -translate-x-1/2 w-[88%] h-14 bg-black/70 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute bottom-5 sm:bottom-8 left-1/2 -translate-x-1/2 w-[65%] h-6 bg-[#00C4CC]/30 rounded-full blur-xl pointer-events-none" />

        {/* 1-Photo Hero Showcase Presentation Container */}
        <a
          href="#product-catalog"
          className="group relative z-20 block w-full h-full max-h-[460px] transition-all duration-500 ease-out hover:scale-[1.02]"
          title="Browse All Products"
        >
          {/* Subtle Glowing Border on Hover */}
          <div className="absolute -inset-0.5 rounded-3xl bg-gradient-to-r from-[#00C4CC]/40 via-cyan-400/20 to-[#0066FF]/40 opacity-60 blur-sm group-hover:opacity-100 transition duration-500 pointer-events-none" />

          <div
            className={`relative w-full h-full rounded-3xl p-3 sm:p-5 flex items-center justify-center transition-all duration-300 border shadow-[0_20px_50px_rgba(0,0,0,0.65)] backdrop-blur-md ${
              isLight
                ? 'bg-white/95 border-slate-200/90'
                : 'bg-gradient-to-b from-[#0B1424]/90 via-[#070D18]/95 to-[#040810]/95 border-white/15'
            }`}
          >
            <Image
              src={customHeroImage}
              alt="STH Gadgets Flagship Collection"
              fill
              className="object-contain p-2 sm:p-4 transition-transform duration-700 ease-out group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, 580px"
              priority
            />

            {/* Studio Gloss Glare Reflection */}
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-tr from-transparent via-transparent to-white/10 pointer-events-none" />
          </div>
        </a>
      </div>
    );
  }

  if (compositionItems.length === 0) return null;

  // Helpers to get primary image
  const getImage = (prod?: Product) => {
    if (!prod) return '/images/logo.png';
    return (
      prod.product_images?.find((i) => i.is_primary)?.image_url ||
      prod.product_images?.[0]?.image_url ||
      '/images/logo.png'
    );
  };

  const pCenter = compositionItems[0];
  const pRearLeft = compositionItems[1] || compositionItems[0];
  const pRearRight = compositionItems[2] || compositionItems[0];
  const pFrontLeft = compositionItems[3] || compositionItems[0];
  const pFrontRight = compositionItems[4] || compositionItems[0];

  return (
    <div className="relative w-full max-w-[600px] h-[390px] sm:h-[450px] lg:h-[500px] mx-auto select-none flex items-center justify-center [perspective:1200px]">
      {/* ─────────────────────────────────────────────────────────────
          1. 3D STUDIO LIGHTING, VOLUMETRIC GLOW & PEDESTAL SHADOWS
      ───────────────────────────────────────────────────────────── */}
      {/* Deep Stage Studio Spotlight Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#00C4CC]/28 via-[#0066FF]/14 to-transparent blur-3xl pointer-events-none rounded-full transform scale-95 animate-pulse-subtle" />

      {/* Intense Center Neon Cyan Aura behind Flagship gadget */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 sm:w-80 h-64 sm:h-80 rounded-full bg-[radial-gradient(circle_at_center,rgba(0,196,204,0.38)_0%,rgba(0,102,255,0.18)_50%,transparent_75%)] blur-2xl pointer-events-none" />

      {/* Subtle Cyan Rim Highlight Arc */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] h-[84%] rounded-full border border-[#00C4CC]/20 pointer-events-none opacity-50" />

      {/* 3D Realistic Ground Pedestal Shadow Cast */}
      <div className="absolute bottom-2 sm:bottom-4 left-1/2 -translate-x-1/2 w-[88%] h-12 bg-black/80 rounded-[100%] blur-2xl pointer-events-none" />
      <div className="absolute bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 w-[62%] h-6 bg-[#00C4CC]/30 rounded-[100%] blur-xl pointer-events-none" />

      {/* ─────────────────────────────────────────────────────────────
          2. THE 5-GADGET 3D ART-DIRECTED STAGE COMPOSITION
      ───────────────────────────────────────────────────────────── */}

      {/* ITEM 2: REAR LEFT — Receded in 3D Space (Angled inward) */}
      {pRearLeft && (
        <Link
          href={`/products/${pRearLeft.slug}`}
          title={pRearLeft.name}
          className="group absolute top-4 sm:top-6 left-1 sm:left-4 z-10 block transition-all duration-500 ease-out hover:z-40 [transform:rotateY(14deg)_rotateZ(-4deg)_translateZ(-30px)] hover:[transform:rotateY(0deg)_rotateZ(0deg)_scale(1.06)_translateZ(10px)]"
        >
          <div className="relative h-32 w-32 sm:h-40 sm:w-40 lg:h-44 lg:w-44 rounded-3xl bg-white/95 p-2 sm:p-2.5 shadow-[0_20px_40px_rgba(0,0,0,0.7),0_0_20px_rgba(0,196,204,0.2)] border border-cyan-400/30 transition-all duration-300 group-hover:border-[#00C4CC] group-hover:shadow-[0_0_30px_rgba(0,196,204,0.5)]">
            <Image
              src={getImage(pRearLeft)}
              alt={pRearLeft.name}
              fill
              className="object-contain p-1.5 transition-transform duration-500 group-hover:scale-105 filter drop-shadow-[0_8px_16px_rgba(0,0,0,0.2)]"
              sizes="(max-width: 640px) 130px, 180px"
              priority
            />
            {/* Specular Studio Rim Glare */}
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-tr from-transparent via-transparent to-white/40 pointer-events-none" />
          </div>
        </Link>
      )}

      {/* ITEM 3: REAR RIGHT — Receded in 3D Space (Angled inward) */}
      {pRearRight && (
        <Link
          href={`/products/${pRearRight.slug}`}
          title={pRearRight.name}
          className="group absolute top-3 sm:top-5 right-1 sm:right-4 z-10 block transition-all duration-500 ease-out hover:z-40 [transform:rotateY(-14deg)_rotateZ(4deg)_translateZ(-30px)] hover:[transform:rotateY(0deg)_rotateZ(0deg)_scale(1.06)_translateZ(10px)]"
        >
          <div className="relative h-32 w-32 sm:h-40 sm:w-40 lg:h-44 lg:w-44 rounded-3xl bg-white/95 p-2 sm:p-2.5 shadow-[0_20px_40px_rgba(0,0,0,0.7),0_0_20px_rgba(0,196,204,0.2)] border border-cyan-400/30 transition-all duration-300 group-hover:border-[#00C4CC] group-hover:shadow-[0_0_30px_rgba(0,196,204,0.5)]">
            <Image
              src={getImage(pRearRight)}
              alt={pRearRight.name}
              fill
              className="object-contain p-1.5 transition-transform duration-500 group-hover:scale-105 filter drop-shadow-[0_8px_16px_rgba(0,0,0,0.2)]"
              sizes="(max-width: 640px) 130px, 180px"
              priority
            />
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-tl from-transparent via-transparent to-white/40 pointer-events-none" />
          </div>
        </Link>
      )}

      {/* ITEM 1: HERO CENTER ANCHOR (Larger Flagship Centerpiece) */}
      {pCenter && (
        <Link
          href={`/products/${pCenter.slug}`}
          title={pCenter.name}
          className="group relative z-30 block transition-all duration-500 ease-out hover:z-50 [transform:translateZ(15px)] hover:[transform:translateZ(30px)_scale(1.04)]"
        >
          {/* Subtle pulsating cyan rim halo */}
          <div className="absolute -inset-2 rounded-[2.5rem] bg-gradient-to-r from-[#00C4CC] via-[#00E5FF] to-[#0066FF] opacity-45 blur-xl group-hover:opacity-80 transition duration-500 pointer-events-none animate-pulse-subtle" />

          {/* Floating 3D Badge on Center Flagship */}
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-40 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-[#00C4CC] to-[#00E5FF] px-3 py-0.5 text-[9.5px] font-black uppercase tracking-wider text-[#04080F] shadow-[0_4px_15px_rgba(0,196,204,0.5)] pointer-events-none whitespace-nowrap">
            <span>⚡</span>
            <span>TOP SELLER</span>
          </div>

          <div className="relative h-48 w-48 sm:h-60 sm:w-60 lg:h-72 lg:w-72 xl:h-76 xl:w-76 rounded-[2.2rem] bg-gradient-to-b from-white via-slate-50 to-slate-100 p-2.5 sm:p-3.5 shadow-[0_30px_70px_-10px_rgba(0,0,0,0.9),0_0_35px_rgba(0,196,204,0.35)] border-2 border-[#00C4CC]/50 transition-all duration-300 group-hover:border-[#00C4CC] group-hover:shadow-[0_0_50px_rgba(0,196,204,0.6)]">
            <Image
              src={getImage(pCenter)}
              alt={pCenter.name}
              fill
              className="object-contain p-2 sm:p-3 transition-transform duration-700 ease-out group-hover:scale-108 filter drop-shadow-[0_12px_24px_rgba(0,0,0,0.28)]"
              sizes="(max-width: 640px) 200px, 310px"
              priority
            />
            {/* Gloss reflection shimmer */}
            <div className="absolute inset-0 rounded-[2.2rem] bg-gradient-to-tr from-transparent via-white/10 to-white/50 pointer-events-none" />
          </div>
        </Link>
      )}

      {/* ITEM 4: FOREGROUND LEFT — Overlapping bottom-left of center flagship */}
      {pFrontLeft && (
        <Link
          href={`/products/${pFrontLeft.slug}`}
          title={pFrontLeft.name}
          className="group absolute bottom-1 sm:bottom-3 left-0 sm:left-3 z-35 block transition-all duration-500 ease-out hover:z-50 [transform:rotateY(10deg)_rotateZ(3deg)_translateZ(15px)] hover:[transform:rotateY(0deg)_rotateZ(0deg)_scale(1.1)_translateZ(30px)]"
        >
          <div className="relative h-24 w-24 sm:h-32 sm:w-32 lg:h-36 lg:w-36 rounded-2xl bg-white/95 p-1.5 sm:p-2 shadow-[0_20px_35px_rgba(0,0,0,0.85),0_0_18px_rgba(0,196,204,0.3)] border border-cyan-400/40 transition-all duration-300 group-hover:border-[#00C4CC] group-hover:shadow-[0_0_25px_rgba(0,196,204,0.6)]">
            <Image
              src={getImage(pFrontLeft)}
              alt={pFrontLeft.name}
              fill
              className="object-contain p-1 transition-transform duration-500 group-hover:scale-108 filter drop-shadow-[0_6px_12px_rgba(0,0,0,0.2)]"
              sizes="(max-width: 640px) 100px, 144px"
            />
          </div>
        </Link>
      )}

      {/* ITEM 5: FOREGROUND RIGHT — Overlapping bottom-right of center flagship */}
      {pFrontRight && (
        <Link
          href={`/products/${pFrontRight.slug}`}
          title={pFrontRight.name}
          className="group absolute bottom-1 sm:bottom-3 right-0 sm:right-3 z-35 block transition-all duration-500 ease-out hover:z-50 [transform:rotateY(-10deg)_rotateZ(-3deg)_translateZ(15px)] hover:[transform:rotateY(0deg)_rotateZ(0deg)_scale(1.1)_translateZ(30px)]"
        >
          <div className="relative h-24 w-24 sm:h-32 sm:w-32 lg:h-36 lg:w-36 rounded-2xl bg-white/95 p-1.5 sm:p-2 shadow-[0_20px_35px_rgba(0,0,0,0.85),0_0_18px_rgba(0,196,204,0.3)] border border-cyan-400/40 transition-all duration-300 group-hover:border-[#00C4CC] group-hover:shadow-[0_0_25px_rgba(0,196,204,0.6)]">
            <Image
              src={getImage(pFrontRight)}
              alt={pFrontRight.name}
              fill
              className="object-contain p-1 transition-transform duration-500 group-hover:scale-108 filter drop-shadow-[0_6px_12px_rgba(0,0,0,0.2)]"
              sizes="(max-width: 640px) 100px, 144px"
            />
          </div>
        </Link>
      )}
    </div>
  );
}
