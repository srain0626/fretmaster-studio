'use client';

import { useCallback, useEffect, useSyncExternalStore } from 'react';

export type ThemePreference = 'system' | 'light' | 'dark';

export const THEME_STORAGE_KEY = 'fretmaster_theme';

const listeners = new Set<() => void>();

function notifyThemeListeners() {
  for (const fn of listeners) fn();
}

function readStoredPreference(): ThemePreference {
  if (typeof window === 'undefined') return 'system';
  try {
    const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'system' || saved === 'light' || saved === 'dark') {
      return saved;
    }
  } catch {
    // Ignore storage access failures
  }
  return 'system';
}

function computeResolvedTheme(pref: ThemePreference): 'light' | 'dark' {
  if (pref === 'dark') return 'dark';
  if (pref === 'light') return 'light';
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'light';
}

function applyDomTheme(pref: ThemePreference) {
  if (typeof document === 'undefined') return;
  const isDark = computeResolvedTheme(pref) === 'dark';
  const root = document.documentElement;
  root.classList.toggle('dark', isDark);
  root.setAttribute('data-theme', isDark ? 'dark' : 'light');
}

function subscribeTheme(callback: () => void): () => void {
  listeners.add(callback);
  if (typeof window === 'undefined') {
    return () => {
      listeners.delete(callback);
    };
  }

  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  const onSystemChange = () => {
    const current = readStoredPreference();
    if (current === 'system') {
      applyDomTheme('system');
      callback();
    }
  };
  const onStorage = (e: StorageEvent) => {
    if (e.key === THEME_STORAGE_KEY) {
      applyDomTheme(readStoredPreference());
      callback();
    }
  };

  mq.addEventListener('change', onSystemChange);
  window.addEventListener('storage', onStorage);

  return () => {
    listeners.delete(callback);
    mq.removeEventListener('change', onSystemChange);
    window.removeEventListener('storage', onStorage);
  };
}

function getServerPreference(): ThemePreference {
  return 'system';
}

function getClientResolved(): 'light' | 'dark' {
  return computeResolvedTheme(readStoredPreference());
}

function getServerResolved(): 'light' | 'dark' {
  return 'light';
}

export function useThemePreference() {
  const themePreference = useSyncExternalStore(
    subscribeTheme,
    readStoredPreference,
    getServerPreference
  );
  const resolvedTheme = useSyncExternalStore(
    subscribeTheme,
    getClientResolved,
    getServerResolved
  );

  useEffect(() => {
    applyDomTheme(themePreference);
  }, [themePreference]);

  const setThemePreference = useCallback((next: ThemePreference) => {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Ignore storage write failures
    }
    applyDomTheme(next);
    notifyThemeListeners();
  }, []);

  return { themePreference, setThemePreference, resolvedTheme };
}
