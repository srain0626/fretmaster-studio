'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { trackPageView, trackStudioEvent } from '@/lib/analytics';

export function PageViewTracker() {
  const pathname = usePathname();
  const lastTrackedPathRef = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname || pathname.startsWith('/admin')) return;
    if (lastTrackedPathRef.current === pathname) return;
    lastTrackedPathRef.current = pathname;
    trackPageView(pathname);
  }, [pathname]);

  useEffect(() => {
    if (!pathname || !pathname.startsWith('/studio')) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        trackStudioEvent('practice_heartbeat', { page_path: pathname });
      }
    }, 60_000);
    return () => window.clearInterval(timer);
  }, [pathname]);

  return null;
}
