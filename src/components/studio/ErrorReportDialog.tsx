'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useLocale } from '@/lib/i18n';
import type { SafeErrorLogEntry } from '@/lib/errorSanitizer';
import { AlertCircle, Bug, Check, Copy, RotateCcw, ShieldCheck, SlidersHorizontal, Trash2 } from 'lucide-react';

interface ErrorReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  logs: SafeErrorLogEntry[];
  onClearLogs: () => void;
  onRetryAudio?: () => void;
  onOpenAudioSetup?: () => void;
  onOpenBugReport?: () => void;
}

export function ErrorReportDialog({
  open,
  onOpenChange,
  logs,
  onClearLogs,
  onRetryAudio,
  onOpenAudioSetup,
  onOpenBugReport,
}: ErrorReportDialogProps) {
  const { tr } = useLocale();
  const [copied, setCopied] = useState(false);

  const latest = logs[0] ?? null;

  const formattedPlainText =
    logs.length === 0
      ? tr('No diagnostic error events recorded in this session.', '이 세션에서 기록된 오류 로그가 없습니다.')
      : logs
          .map((entry) => {
            const header = `[${entry.timestamp}] [${entry.category.toUpperCase()}] (${entry.code}) ${entry.title}`;
            const body = `Summary: ${entry.summary}`;
            const meta = entry.details.length > 0 ? `Context: ${entry.details.join(' | ')}` : '';
            return [header, body, meta].filter(Boolean).join('\n');
          })
          .join('\n\n---\n\n');

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(formattedPlainText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard API unavailable
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <div className="flex items-start justify-between pr-6 gap-3">
            <div className="flex items-start gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-destructive/10 text-destructive mt-0.5">
                <AlertCircle className="w-4 h-4" />
              </div>
              <div>
                <DialogTitle className="text-base font-semibold text-foreground">
                  {latest
                    ? latest.title
                    : tr('System Diagnostic Logs', '시스템 진단 로그')}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                  {latest
                    ? latest.summary
                    : tr(
                        'Sanitized runtime and device connection events are collected here for troubleshooting.',
                        '문제 해결을 위해 안전하게 정제된 오디오·동기화 진단 기록을 확인할 수 있습니다.'
                      )}
                </DialogDescription>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between gap-2">
            <Badge variant="outline" className="gap-1.5 text-[10.5px] font-medium text-muted-foreground">
              <ShieldCheck className="w-3 h-3 text-primary" />
              <span>{tr('Sensitive details & stack traces redacted', '보안상 민감 정보 및 내부 스택 자동 차단됨')}</span>
            </Badge>
            <span className="text-[11px] font-mono text-muted-foreground">
              {logs.length} {tr('events', '건')}
            </span>
          </div>

          <ScrollArea className="h-56 rounded-xl border border-border bg-secondary/40 p-3">
            {logs.length === 0 ? (
              <div className="h-44 flex items-center justify-center text-xs text-muted-foreground">
                {tr('Everything looks healthy. No errors recorded yet.', '현재 기록된 오류 내역이 없습니다.')}
              </div>
            ) : (
              <div className="space-y-3 font-mono text-[11px] leading-relaxed">
                {logs.map((entry) => (
                  <div
                    key={entry.id}
                    className="rounded-lg border border-border/80 bg-card/80 p-2.5 space-y-1"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-semibold text-foreground">
                        [{entry.timestamp}] {entry.category.toUpperCase()} · {entry.code}
                      </span>
                    </div>
                    <div className="text-foreground/90">{entry.summary}</div>
                    {entry.details.length > 0 && (
                      <div className="text-muted-foreground text-[10.5px] break-all pt-0.5">
                        {entry.details.join(' | ')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border">
            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleCopy}
                disabled={logs.length === 0}
                className="text-xs gap-1.5"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-primary" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? tr('Copied', '복사됨') : tr('Copy Log', '로그 복사')}</span>
              </Button>
              {logs.length > 0 && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={onClearLogs}
                  className="text-xs gap-1 text-muted-foreground"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{tr('Clear', '지우기')}</span>
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {onOpenBugReport && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    onOpenChange(false);
                    onOpenBugReport();
                  }}
                  className="text-xs gap-1.5"
                >
                  <Bug className="w-3.5 h-3.5 text-primary" />
                  <span>{tr('Report Bug', '버그 리포트 보내기')}</span>
                </Button>
              )}
              {latest?.category === 'audio' && onOpenAudioSetup && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    onOpenChange(false);
                    onOpenAudioSetup();
                  }}
                  className="text-xs gap-1.5"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>{tr('Audio Settings', '오디오 설정')}</span>
                </Button>
              )}
              {latest?.category === 'audio' && onRetryAudio && (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    onOpenChange(false);
                    onRetryAudio();
                  }}
                  className="text-xs gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{tr('Retry', '다시 연결')}</span>
                </Button>
              )}
              {latest?.category !== 'audio' && (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => onOpenChange(false)}
                  className="text-xs"
                >
                  {tr('Close', '닫기')}
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
