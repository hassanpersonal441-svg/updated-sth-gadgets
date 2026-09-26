'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

type ThemeMode = 'light' | 'dark';

interface ThemeContextType {
  theme: ThemeMode;
  toggleTheme: () => void;
  setThemeMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'dark',
  toggleTheme: () => {},
  setThemeMode: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<ThemeMode>('dark');

  useEffect(() => {
    // Read saved theme from localStorage
    try {
      const savedTheme = localStorage.getItem('sth_theme') as ThemeMode;
      if (savedTheme === 'light' || savedTheme === 'dark') {
        setTheme(savedTheme);
        document.documentElement.setAttribute('data-theme', savedTheme);
      } else {
        const prefersLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
        const initialMode = prefersLight ? 'light' : 'dark';
        setTheme(initialMode);
        document.documentElement.setAttribute('data-theme', initialMode);
      }
    } catch {
      // ignore
    }

    function handleThemeChange(e: any) {
      const newTheme = e.detail || localStorage.getItem('sth_theme') || 'dark';
      setTheme(newTheme as ThemeMode);
      document.documentElement.setAttribute('data-theme', newTheme);
    }

    window.addEventListener('sth_theme_changed', handleThemeChange);
    return () => window.removeEventListener('sth_theme_changed', handleThemeChange);
  }, []);

  function setThemeMode(mode: ThemeMode) {
    setTheme(mode);
    try {
      localStorage.setItem('sth_theme', mode);
      document.documentElement.setAttribute('data-theme', mode);
      window.dispatchEvent(new CustomEvent('sth_theme_changed', { detail: mode }));
    } catch {
      // ignore
    }
  }

  function toggleTheme() {
    const nextMode = theme === 'dark' ? 'light' : 'dark';
    setThemeMode(nextMode);
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setThemeMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
