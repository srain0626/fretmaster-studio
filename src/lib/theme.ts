'use client';

import { useCallback, useEffect, useState } from 'react';

export type ThemePreference = 'system' | 'light' | 'dark';

export const THEME_STORAGE_KEY = 'fretmaster_theme';

export function useThemePreference() {
  const [themePreference, setThemePreferenceState] = useState<ThemePreference>('system');
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(THEME_STORAGE_KEY) as ThemePreference | null;
      if (saved === 'system' || saved === 'light' || saved === 'dark') {
        setThemePreferenceState(saved);
      }
    } catch {
      // Ignore storage access failures
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');

    const applyTheme = () => {
      const isDark =
        themePreference === 'dark' || (themePreference === 'system' && mq.matches);
      const root = document.documentElement;
      root.classList.toggle('dark', isDark);
      root.setAttribute('data-theme', isDark ? 'dark' : 'light');
      setResolvedTheme(isDark ? 'dark' : 'light');
    };

    applyTheme();
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, themePreference);
    } catch {
      // Ignore storage write failures
    }

    mq.addEventListener('change', applyTheme);
    return () => mq.removeEventListener('change', applyTheme);
  }, [themePreference]);

  const setThemePreference = useCallback((next: ThemePreference) => {
    setThemePreferenceState(next);
  }, []);

  return { themePreference, setThemePreference, resolvedTheme };
}
