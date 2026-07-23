// Diseñado por: Edward Labrador  ·  Para: ELITE GROUP - Integral Services LLC
'use client';

import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextValue {
  theme:     Theme;
  resolved:  'light' | 'dark';
  setTheme:  (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme:    'system',
  resolved: 'light',
  setTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('system');
  const [resolved, setResolved] = useState<'light' | 'dark'>('light');

  // Cargar preferencia guardada
  useEffect(() => {
    const saved = localStorage.getItem('veronaride-theme') as Theme | null;
    if (saved) setThemeState(saved);
  }, []);

  // Aplicar clase al <html> y detectar preferencia del sistema
  useEffect(() => {
    const root = document.documentElement;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    function apply() {
      const isDark =
        theme === 'dark' ||
        (theme === 'system' && mediaQuery.matches);

      root.classList.toggle('dark', isDark);
      setResolved(isDark ? 'dark' : 'light');
    }

    apply();
    mediaQuery.addEventListener('change', apply);
    return () => mediaQuery.removeEventListener('change', apply);
  }, [theme]);

  const setTheme = (t: Theme) => {
    setThemeState(t);
    localStorage.setItem('veronaride-theme', t);
  };

  return (
    <ThemeContext.Provider value={{ theme, resolved, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
