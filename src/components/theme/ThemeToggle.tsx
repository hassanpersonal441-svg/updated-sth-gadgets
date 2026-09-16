'use client';

import React from 'react';
import { useTheme } from './ThemeProvider';

export default function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={
        className ||
        `flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition shadow-sm cursor-pointer ${
          theme === 'light'
            ? 'border-amber-400/60 bg-amber-400/10 text-amber-600 hover:bg-amber-400/20'
            : 'border-slate-800 bg-[#0C1420] text-cyan-400 hover:border-[#00C4CC]'
        }`
      }
      aria-label="Toggle Light and Dark theme"
      title={`Current Theme: ${theme.toUpperCase()}. Click to switch.`}
    >
      <span>{theme === 'light' ? '☀️' : '🌙'}</span>
      <span className="font-display font-bold">
        {theme === 'light' ? 'Light Mode' : 'Dark Mode'}
      </span>
    </button>
  );
}
