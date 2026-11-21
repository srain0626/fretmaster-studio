'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export type Locale = 'en' | 'ko';
export type LocalePreference = 'system' | 'en' | 'ko';

export const LOCALE_STORAGE_KEY = 'fretmaster_locale';

interface LocaleContextValue {
  locale: Locale;
  preference: LocalePreference;
  setPreference: (pref: LocalePreference) => void;
  tr: (en: string, ko: string) => string;
}

const LocaleContext = createContext<LocaleContextValue>({
  locale: 'en',
  preference: 'system',
  setPreference: () => {},
  tr: (en) => en,
});

export function resolveSystemLocale(): Locale {
  if (typeof navigator === 'undefined') return 'en';
  const lang = (navigator.language || '').toLowerCase();
  return lang.startsWith('ko') ? 'ko' : 'en';
}

export function resolveLocale(pref: LocalePreference): Locale {
  if (pref === 'en' || pref === 'ko') return pref;
  return resolveSystemLocale();
}

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  // Initial 'en' guarantees zero SSR/CSR hydration mismatch; browser preference resolves on mount.
  const [preference, setPreferenceState] = useState<LocalePreference>('system');
  const [locale, setLocale] = useState<Locale>('en');

  useEffect(() => {
    let saved: LocalePreference = 'system';
    try {
      const raw = window.localStorage.getItem(LOCALE_STORAGE_KEY);
      if (raw === 'en' || raw === 'ko' || raw === 'system') {
        saved = raw;
      }
    } catch {
      // Ignore storage failures
    }
    setPreferenceState(saved);
    const resolved = resolveLocale(saved);
    setLocale(resolved);
    document.documentElement.lang = resolved;

    const handleLangChange = () => {
      setPreferenceState((curr) => {
        if (curr === 'system') {
          const next = resolveSystemLocale();
          setLocale(next);
          document.documentElement.lang = next;
        }
        return curr;
      });
    };

    window.addEventListener('languagechange', handleLangChange);
    return () => window.removeEventListener('languagechange', handleLangChange);
  }, []);

  const setPreference = useCallback((nextPref: LocalePreference) => {
    setPreferenceState(nextPref);
    try {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, nextPref);
    } catch {
      // Ignore storage errors
    }
    const resolved = resolveLocale(nextPref);
    setLocale(resolved);
    if (typeof document !== 'undefined') {
      document.documentElement.lang = resolved;
    }
  }, []);

  const tr = useCallback((en: string, ko: string) => (locale === 'en' ? en : ko), [locale]);

  const value = useMemo(
    () => ({ locale, preference, setPreference, tr }),
    [locale, preference, setPreference, tr]
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  return useContext(LocaleContext);
}
