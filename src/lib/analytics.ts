'use client';

type AnalyticsParamValue = string | number | boolean;

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
  }
}

const SESSION_STORAGE_KEY = 'fretmaster_session_id';

function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return 'server';
  try {
    const existing = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (existing && existing.length >= 4 && existing.length <= 80) {
      return existing;
    }
    const generated =
      typeof window.crypto?.randomUUID === 'function'
        ? window.crypto.randomUUID()
        : `sess_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
    window.localStorage.setItem(SESSION_STORAGE_KEY, generated);
    return generated;
  } catch {
    return `sess_${Date.now().toString(36)}`;
  }
}

function getDeviceType(): 'desktop' | 'tablet' | 'mobile' {
  if (typeof window === 'undefined') return 'desktop';
  const w = window.innerWidth;
  if (w < 768) return 'mobile';
  if (w < 1024) return 'tablet';
  return 'desktop';
}

function getDetectedLocale(): 'en' | 'ko' | 'unknown' {
  if (typeof window === 'undefined') return 'unknown';
  try {
    const pref = window.localStorage.getItem('fretmaster_locale');
    if (pref === 'en' || pref === 'ko') return pref;
    const htmlLang = document.documentElement.lang?.toLowerCase() ?? '';
    if (htmlLang.startsWith('ko')) return 'ko';
    if (htmlLang.startsWith('en')) return 'en';
    const navLang = navigator.language?.toLowerCase() ?? '';
    if (navLang.startsWith('ko')) return 'ko';
    if (navLang.startsWith('en')) return 'en';
  } catch {
    // ignore
  }
  return 'unknown';
}

function getDetectedTheme(): 'light' | 'dark' | 'unknown' {
  if (typeof document === 'undefined') return 'unknown';
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

function getSanitizedReferrerHost(): string | null {
  if (typeof document === 'undefined' || !document.referrer) return null;
  try {
    const refUrl = new URL(document.referrer);
    if (refUrl.hostname && refUrl.hostname !== window.location.hostname) {
      return refUrl.hostname.toLowerCase().slice(0, 120);
    }
  } catch {
    // ignore malformed referrer
  }
  return null;
}

/**
 * Push privacy-safe learning funnel events to Google Tag Manager dataLayer
 * and stream anonymized usage telemetry to `/api/telemetry`.
 * Never logs personal identifiers, emails, or raw exception payloads.
 */
export function trackStudioEvent(
  event: string,
  params?: Record<string, AnalyticsParamValue>
): void {
  if (typeof window === 'undefined') return;
  try {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event,
      ...params,
    });
  } catch {
    // ignore storage/GTM sandbox restrictions
  }

  try {
    const pathname = window.location.pathname || '/';
    if (pathname.startsWith('/admin')) return;

    const lessonId =
      typeof params?.lesson_id === 'string' && params.lesson_id.length > 0
        ? params.lesson_id
        : null;

    const pagePath =
      typeof params?.page_path === 'string' && params.page_path.startsWith('/')
        ? params.page_path
        : pathname;

    void fetch('/api/telemetry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
      body: JSON.stringify({
        eventName: event,
        sessionId: getOrCreateSessionId(),
        pagePath,
        lessonId,
        locale: getDetectedLocale(),
        theme: getDetectedTheme(),
        deviceType: getDeviceType(),
        viewport: `${window.innerWidth}x${window.innerHeight}`,
        referrerHost: getSanitizedReferrerHost(),
        metadata: params ?? {},
      }),
    }).catch(() => {});
  } catch {
    // ignore fetch/offline restrictions
  }
}

export function trackPageView(pagePath: string): void {
  const safePath = pagePath.startsWith('/') ? pagePath : '/';
  trackStudioEvent('page_view', { page_path: safePath });
}
