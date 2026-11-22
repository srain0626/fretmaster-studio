'use client';

type AnalyticsParamValue = string | number | boolean;

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
  }
}

/**
 * Push privacy-safe learning funnel events to Google Tag Manager dataLayer.
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
}
