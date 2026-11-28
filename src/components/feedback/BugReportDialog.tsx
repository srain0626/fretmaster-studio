'use client';

import React, { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { trackStudioEvent } from '@/lib/analytics';
import {
  GITHUB_BUG_REPORT_URL,
  type BugReportCategory,
} from '@/lib/bugReport';
import type { SafeErrorLogEntry } from '@/lib/errorSanitizer';
import { useLocale } from '@/lib/i18n';
import {
  AlertCircle,
  Bug,
  CheckCircle2,
  ExternalLink,
  Send,
  ShieldCheck,
} from 'lucide-react';

interface BugReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultLessonId?: string | null;
  defaultCategory?: BugReportCategory;
  diagnostics?: SafeErrorLogEntry[];
  defaultEmail?: string | null;
}

const SESSION_STORAGE_KEY = 'fretmaster_session_id';

function readBrowserContext(lessonId?: string | null) {
  if (typeof window === 'undefined') {
    return {
      sessionId: 'anonymous',
      pagePath: '/',
      lessonId: lessonId ?? null,
      locale: 'unknown' as const,
      theme: 'unknown' as const,
      deviceType: 'unknown' as const,
      viewport: null as string | null,
      userAgent: null as string | null,
    };
  }

  let sessionId = 'anonymous';
  try {
    const existing = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (existing && existing.length >= 4 && existing.length <= 80) {
      sessionId = existing;
    }
  } catch {
    // ignore storage errors
  }

  const width = window.innerWidth;
  const deviceType: 'desktop' | 'tablet' | 'mobile' =
    width < 768 ? 'mobile' : width < 1024 ? 'tablet' : 'desktop';

  let detectedLocale: 'en' | 'ko' | 'unknown' = 'unknown';
  try {
    const pref = window.localStorage.getItem('fretmaster_locale');
    if (pref === 'en' || pref === 'ko') {
      detectedLocale = pref;
    } else {
      const lang = (
        document.documentElement.lang ||
        navigator.language ||
        ''
      ).toLowerCase();
      if (lang.startsWith('ko')) detectedLocale = 'ko';
      else if (lang.startsWith('en')) detectedLocale = 'en';
    }
  } catch {
    // ignore locale lookup errors
  }

  const detectedTheme: 'light' | 'dark' = document.documentElement.classList.contains('dark')
    ? 'dark'
    : 'light';

  return {
    sessionId,
    pagePath: window.location.pathname || '/',
    lessonId: lessonId ?? null,
    locale: detectedLocale,
    theme: detectedTheme,
    deviceType,
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    userAgent: navigator.userAgent?.slice(0, 240) ?? null,
  };
}

export function BugReportDialog({
  open,
  onOpenChange,
  defaultLessonId,
  defaultCategory = 'audio_pitch',
  diagnostics = [],
  defaultEmail,
}: BugReportDialogProps) {
  const { tr } = useLocale();

  const [category, setCategory] = useState<BugReportCategory>(defaultCategory);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [reporterEmail, setReporterEmail] = useState(defaultEmail ?? '');
  const [attachDiagnostics, setAttachDiagnostics] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submittedId, setSubmittedId] = useState<string | null>(null);

  const categoryLabels = useMemo<Record<BugReportCategory, string>>(
    () => ({
      audio_pitch: tr('Audio & Pitch Recognition', '오디오 · 음정 인식'),
      lesson_content: tr('Lesson, TAB & Fretboard', '레슨 · 악보 · 지판'),
      ui_layout: tr('Screen, Theme & Layout', '화면 · 테마 · 레이아웃'),
      auth_sync: tr('Login & Cloud Save', '로그인 · 진도 저장'),
      other: tr('Other / Suggestion', '기타 문제 · 개선 의견'),
    }),
    [tr]
  );

  const canSubmit =
    title.trim().length >= 2 && description.trim().length >= 5 && !submitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) {
      setErrorMsg(
        tr(
          'Please enter a short summary (2+ chars) and details (5+ chars).',
          '제목(2자 이상)과 상세 설명(5자 이상)을 입력해 주세요.'
        )
      );
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    const env = readBrowserContext(defaultLessonId);
    const payload = {
      sessionId: env.sessionId,
      category,
      title: title.trim(),
      description: description.trim(),
      reporterEmail: reporterEmail.trim(),
      pagePath: attachDiagnostics ? env.pagePath : '/',
      lessonId: attachDiagnostics ? env.lessonId : null,
      locale: attachDiagnostics ? env.locale : 'unknown',
      theme: attachDiagnostics ? env.theme : 'unknown',
      deviceType: attachDiagnostics ? env.deviceType : 'unknown',
      viewport: attachDiagnostics ? env.viewport : null,
      userAgent: attachDiagnostics ? env.userAgent : null,
      diagnostics: attachDiagnostics ? diagnostics : [],
    };

    try {
      const res = await fetch('/api/bug-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        id?: string;
        error?: string;
      };

      if (!res.ok || !json.ok || !json.id) {
        if (json.error === 'invalid_email') {
          setErrorMsg(
            tr('Please check your email address format.', '이메일 주소 형식을 확인해 주세요.')
          );
        } else {
          setErrorMsg(
            tr(
              'Could not save the bug report right now. Please try again or open a GitHub issue.',
              '지금 버그 리포트를 전송하지 못했습니다. 잠시 후 다시 시도하거나 GitHub 이슈를 이용해 주세요.'
            )
          );
        }
        return;
      }

      setSubmittedId(json.id);
      trackStudioEvent('bug_report_submitted', {
        category,
        has_diagnostics: attachDiagnostics && diagnostics.length > 0,
        ...(defaultLessonId ? { lesson_id: defaultLessonId } : {}),
      });
    } catch {
      setErrorMsg(
        tr(
          'Network error while sending report. Check your connection or use GitHub issues.',
          '네트워크 오류로 전송하지 못했습니다. 연결을 확인하거나 GitHub 이슈를 이용해 주세요.'
        )
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-start gap-3 pr-6">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-primary mt-0.5">
              <Bug className="w-4 h-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-foreground">
                {tr('Report a Bug', '버그 리포트 보내기')}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                {tr(
                  'Spot wrong pitch judgment, audio glitches, or UI bugs? Send a report directly to the developer.',
                  '음정 판정 오류, 오디오 끊김, 화면 불편 사항을 개발팀에 바로 전달할 수 있습니다.'
                )}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {submittedId ? (
          <div className="py-4 space-y-4">
            <div className="rounded-xl border border-primary/35 bg-accent-soft/60 p-4 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="text-sm font-semibold text-foreground">
                  {tr('Thank you! Your report has been received.', '버그 리포트가 정상 접수되었습니다.')}
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {tr(
                    'We review every incoming report promptly and improve FretMaster Studio with each update.',
                    '접수된 내용은 순차적으로 확인하여 다음 업데이트에 빠르게 반영하겠습니다.'
                  )}
                </p>
                <div className="pt-1">
                  <Badge variant="outline" className="font-mono text-[11px]">
                    {tr('Reference', '접수 번호')} #{submittedId.slice(0, 8).toUpperCase()}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  setSubmittedId(null);
                  setTitle('');
                  setDescription('');
                  setErrorMsg(null);
                }}
                className="text-xs"
              >
                {tr('Submit Another', '추가 제보하기')}
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="text-xs font-semibold"
              >
                {tr('Close', '닫기')}
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-3.5 pt-1">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground block">
                {tr('Category', '문제 유형')}
              </label>
              <Select
                value={category}
                onValueChange={(val) => {
                  if (val) setCategory(val as BugReportCategory);
                }}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(categoryLabels) as BugReportCategory[]).map((key) => (
                    <SelectItem key={key} value={key}>
                      {categoryLabels[key]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="bug-report-title"
                className="text-xs font-semibold text-foreground block"
              >
                {tr('Summary', '제목')}
              </label>
              <input
                id="bug-report-title"
                type="text"
                maxLength={140}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={tr(
                  'e.g. Power chord passes when muting in Lesson 3-1',
                  '예: 3-1 레슨에서 파워코드를 잘못 쳐도 통과됩니다'
                )}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="bug-report-description"
                className="text-xs font-semibold text-foreground block"
              >
                {tr('What happened & how to reproduce', '상세 내용 및 재현 방법')}
              </label>
              <textarea
                id="bug-report-description"
                rows={4}
                maxLength={3000}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={tr(
                  'Describe what you played or clicked, what happened, and what you expected.',
                  '어떤 레슨이나 화면에서 어떤 동작을 했는지, 실제로 어떻게 동작했는지 알려주세요.'
                )}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-y min-h-[96px]"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="bug-report-email"
                className="text-xs font-semibold text-foreground block"
              >
                {tr('Reply Email (Optional)', '답변 받을 이메일 (선택 사항)')}
              </label>
              <input
                id="bug-report-email"
                type="email"
                maxLength={160}
                value={reporterEmail}
                onChange={(e) => setReporterEmail(e.target.value)}
                placeholder={tr(
                  'Leave blank to report anonymously',
                  '비워 두시면 익명으로 접수됩니다'
                )}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            <div className="rounded-xl border border-border bg-secondary/40 px-3 py-2.5 flex items-center justify-between gap-3">
              <div className="space-y-0.5 min-w-0">
                <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                  <ShieldCheck className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span>{tr('Attach sanitized environment & logs', '진단 환경 정보 함께 첨부')}</span>
                </div>
                <p className="text-[11px] text-muted-foreground truncate">
                  {defaultLessonId
                    ? tr(
                        `Lesson ${defaultLessonId}, viewport, theme & ${diagnostics.length} diagnostic logs`,
                        `레슨 ${defaultLessonId}, 화면 크기, 테마 및 진단 로그 ${diagnostics.length}건`
                      )
                    : tr(
                        `Current page, viewport, theme & ${diagnostics.length} diagnostic logs`,
                        `현재 페이지, 화면 크기, 테마 및 진단 로그 ${diagnostics.length}건`
                      )}
                </p>
              </div>
              <Switch
                checked={attachDiagnostics}
                onCheckedChange={setAttachDiagnostics}
              />
            </div>

            {errorMsg && (
              <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2.5 text-xs text-destructive space-y-1.5">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
                <a
                  href={GITHUB_BUG_REPORT_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-semibold underline hover:opacity-80"
                >
                  <span>{tr('Open GitHub Issues', 'GitHub 이슈 페이지 열기')}</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}

            <div className="flex items-center justify-between gap-2 pt-2 border-t border-border">
              <a
                href={GITHUB_BUG_REPORT_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
              >
                <span>GitHub Issues</span>
                <ExternalLink className="w-3 h-3" />
              </a>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  className="text-xs"
                >
                  {tr('Cancel', '취소')}
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={!canSubmit}
                  className="text-xs gap-1.5 font-semibold"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>
                    {submitting
                      ? tr('Sending...', '전송 중...')
                      : tr('Send Report', '제보 전송')}
                  </span>
                </Button>
              </div>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
