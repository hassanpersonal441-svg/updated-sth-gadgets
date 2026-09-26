'use client';

import React from 'react';
import { useTheme } from './ThemeProvider';

export default function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();
  const isLight = theme === 'light';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition-all duration-200 shadow-sm cursor-pointer hover:scale-105 active:scale-95 ${
        isLight
          ? 'border-slate-300 bg-white text-slate-800 hover:bg-slate-100 hover:border-slate-400'
          : 'border-slate-700/80 bg-[#0C1420] text-cyan-400 hover:border-[#00C4CC] hover:bg-[#0F1C2D]'
      } ${className}`}
      aria-label="Toggle Light and Dark theme"
      title={`Current Theme: ${theme.toUpperCase()}. Click to switch.`}
    >
      <span className="text-sm">{isLight ? '☀️' : '🌙'}</span>
      <span className="font-display font-bold">
        {isLight ? 'Light' : 'Dark'}
      </span>
    </button>
  );
}
