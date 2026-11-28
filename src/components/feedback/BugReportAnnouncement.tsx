'use client';

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { trackStudioEvent } from '@/lib/analytics';
import { BUG_REPORT_NOTICE_STORAGE_KEY } from '@/lib/bugReport';
import { useLocale } from '@/lib/i18n';
import { Bug, X } from 'lucide-react';

interface BugReportAnnouncementProps {
  onOpenBugReport: () => void;
}

export function BugReportAnnouncement({
  onOpenBugReport,
}: BugReportAnnouncementProps) {
  const pathname = usePathname();
  const { tr } = useLocale();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!pathname || pathname.startsWith('/admin') || pathname.startsWith('/auth')) {
      return;
    }

    let dismissed = false;
    try {
      dismissed = window.localStorage.getItem(BUG_REPORT_NOTICE_STORAGE_KEY) === '1';
    } catch {
      dismissed = false;
    }

    if (dismissed) return;

    const timer = window.setTimeout(() => {
      setVisible(true);
    }, 450);

    return () => window.clearTimeout(timer);
  }, [pathname]);

  if (!visible || !pathname || pathname.startsWith('/admin') || pathname.startsWith('/auth')) {
    return null;
  }

  const persistDismiss = () => {
    try {
      window.localStorage.setItem(BUG_REPORT_NOTICE_STORAGE_KEY, '1');
    } catch {
      // ignore storage errors
    }
    setVisible(false);
  };

  const handleDismiss = () => {
    persistDismiss();
    trackStudioEvent('bug_report_notice_dismissed', { page_path: pathname });
  };

  const handleOpenReport = () => {
    persistDismiss();
    trackStudioEvent('bug_report_notice_cta_clicked', { page_path: pathname });
    onOpenBugReport();
  };

  return (
    <aside
      aria-label={tr('New Bug Report Feature Notice', '새 버그 리포트 기능 안내')}
      className="fixed bottom-4 right-4 z-40 w-[calc(100vw-2rem)] max-w-sm rounded-2xl border border-primary/35 bg-card p-4 shadow-lg"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center rounded-md bg-accent-soft px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase text-primary">
            NEW
          </span>
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-foreground">
            <Bug className="w-3.5 h-3.5 text-primary" />
            <span>{tr('In-App Bug Report Added', '버그 리포트 기능이 추가되었습니다')}</span>
          </span>
        </div>

        <button
          type="button"
          onClick={handleDismiss}
          aria-label={tr('Dismiss announcement', '안내 닫기')}
          className="rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-secondary/70 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
        {tr(
          'Spotted pitch judgment issues, audio lag, or layout bugs? You can now report them in one click from the menu or studio sidebar anytime.',
          '음정 인식 오류, 오디오 문제, 화면 버그를 발견하셨나요? 상단 메뉴나 스튜디오 사이드바에서 언제든 바로 제보해 주세요.'
        )}
      </p>

      <div className="mt-3 flex items-center justify-end gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={handleDismiss}
          className="h-8 text-xs"
        >
          {tr('Got it', '확인')}
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={handleOpenReport}
          className="h-8 text-xs gap-1.5 font-semibold"
        >
          <Bug className="w-3.5 h-3.5" />
          <span>{tr('Report a Bug', '버그 제보하기')}</span>
        </Button>
      </div>
    </aside>
  );
}
