'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { MasteryRingSvg, RadarChartSvg } from '@/components/icons/GuitarSvgIcons';
import { ALL_LESSONS } from '@/data/curriculumData';
import { useLocale } from '@/lib/i18n';
import type { UserProgressState } from '@/types/guitar';

interface SkillAnalyticsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  progress: UserProgressState;
}

export function SkillAnalyticsDialog({
  open,
  onOpenChange,
  progress,
}: SkillAnalyticsDialogProps) {
  const { locale, tr } = useLocale();
  const dailyPct = Math.min(
    100,
    Math.round((progress.dailyPracticeSeconds / Math.max(1, progress.dailyGoalSeconds)) * 100)
  );
  const overallCompletionPct = Math.round(
    (progress.totalCompletedCount / Math.max(1, ALL_LESSONS.length)) * 100
  );
  const minutesPracticed = Math.floor(progress.dailyPracticeSeconds / 60);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">
            {tr('Practice Analytics', '내 연습 기록')}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
          <div className="rounded-xl border border-border bg-muted/30 p-4">
            <RadarChartSvg skills={progress.skills} size={210} locale={locale} />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-xl border border-border p-3.5">
              <div>
                <div className="text-xs text-muted-foreground">
                  {tr("Today's Practice", '오늘 연습')}
                </div>
                <div className="mt-0.5 font-mono text-lg font-bold tabular-nums">
                  {locale === 'en' ? `${minutesPracticed}m / 15m` : `${minutesPracticed}분 / 15분`}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {locale === 'en'
                    ? `${progress.dayStreak}-day streak`
                    : `연속 ${progress.dayStreak}일째`}
                </div>
              </div>
              <MasteryRingSvg progress={dailyPct} size={48} label={`${dailyPct}%`} />
            </div>

            <div className="rounded-xl border border-border p-3.5 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  {tr('Overall Progress', '전체 완료')}
                </span>
                <span className="font-mono tabular-nums font-semibold">
                  {progress.totalCompletedCount} / {ALL_LESSONS.length} ({overallCompletionPct}%)
                </span>
              </div>
              <Progress value={overallCompletionPct} className="h-2" />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
