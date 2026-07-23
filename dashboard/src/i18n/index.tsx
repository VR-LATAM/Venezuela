// Diseñado por: Edward Labrador  ·  Para: ELITE GROUP - Integral Services LLC
'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import en, { type DashboardTranslations } from './en';
import es from './es';

type Locale = 'en' | 'es';

const TRANSLATIONS: Record<Locale, DashboardTranslations> = { en, es };

interface I18nContextValue {
  locale:    Locale;
  setLocale: (l: Locale) => void;
  t:         DashboardTranslations;
}

const I18nContext = createContext<I18nContextValue>({
  locale:    'en',
  setLocale: () => {},
  t:         en,
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('veronaride-lang') as Locale) ?? 'en';
    }
    return 'es';
  });

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    if (typeof window !== 'undefined') localStorage.setItem('veronaride-lang', l);
  }, []);

  return (
    <I18nContext.Provider value={{ locale, setLocale, t: TRANSLATIONS[locale] }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
