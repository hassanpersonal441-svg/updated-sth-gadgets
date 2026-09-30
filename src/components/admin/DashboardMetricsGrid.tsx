'use client';

import React, { useState } from 'react';
import Link from 'next/link';

export interface DashboardMetricCard {
  label: string;
  value: string | number;
  icon: string;
  color: string;
  borderColor: string;
  textColor: string;
  href: string;
  canHide?: boolean;
}

interface DashboardMetricsGridProps {
  cards: DashboardMetricCard[];
}

export default function DashboardMetricsGrid({ cards }: DashboardMetricsGridProps) {
  // Profit cards start hidden by default
  const [revealedCards, setRevealedCards] = useState<Record<string, boolean>>({});

  const toggleReveal = (label: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setRevealedCards((prev) => ({
      ...prev,
      [label]: !prev[label],
    }));
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {cards.map((c) => {
        const isProfitCard =
          c.canHide ??
          (c.label === 'Gross Profit' || c.label === 'Total Profit');
        const isRevealed = !!revealedCards[c.label];

        return (
          <Link
            key={c.label}
            href={c.href}
            className={`group relative overflow-hidden rounded-xl border ${c.borderColor} bg-[#0C1420] p-3 sm:p-3.5 shadow-sm transition hover:border-[#00C4CC]/60 hover:shadow-[0_0_15px_rgba(0,196,204,0.12)] hover:scale-[1.01]`}
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${c.color} opacity-25 transition group-hover:opacity-50`}></div>
            
            {/* Header: Icon on left, Eye & Link on right */}
            <div className="relative flex items-center justify-between">
              <span className="text-base sm:text-lg">{c.icon}</span>

              <div className="flex items-center gap-1.5">
                {isProfitCard && (
                  <button
                    type="button"
                    onClick={(e) => toggleReveal(c.label, e)}
                    className={`flex items-center justify-center rounded-md border p-1 text-[11px] transition ${
                      isRevealed
                        ? 'border-[#00C4CC]/40 bg-[#00C4CC]/10 text-[#00C4CC] hover:bg-[#00C4CC]/20'
                        : 'border-slate-700 bg-slate-800/80 text-silver-dim hover:text-white hover:border-slate-600'
                    }`}
                    title={isRevealed ? 'Click to hide profit' : 'Click to reveal profit'}
                    aria-label={isRevealed ? 'Hide profit' : 'Reveal profit'}
                  >
                    {isRevealed ? (
                      // Open Eye Icon
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-3.5 w-3.5"
                      >
                        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    ) : (
                      // Crossed Eye Icon (Hidden)
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-3.5 w-3.5"
                      >
                        <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                        <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                        <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                        <line x1="2" x2="22" y1="2" y2="22" />
                      </svg>
                    )}
                  </button>
                )}

                <span className="text-[10px] text-silver-dim group-hover:text-silver-bright transition">↗</span>
              </div>
            </div>

            {/* Content */}
            <div className="relative mt-2">
              <div className="flex items-center justify-between">
                <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-silver-dim truncate">
                  {c.label}
                </p>
                {isProfitCard && !isRevealed && (
                  <span className="text-[9px] text-silver-dim/60 font-medium">Hidden</span>
                )}
              </div>

              {isProfitCard && !isRevealed ? (
                <div className="mt-0.5 flex items-center py-0.5">
                  <span className="font-mono text-base sm:text-lg font-bold text-silver-dim tracking-[0.2em] select-none">
                    PKR •••••
                  </span>
                </div>
              ) : (
                <p className={`mt-0.5 font-display text-lg sm:text-xl font-black ${c.textColor} truncate animate-fadeIn`}>
                  {typeof c.value === 'string' ? c.value : c.value.toLocaleString()}
                </p>
              )}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
