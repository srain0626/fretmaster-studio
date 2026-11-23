'use client';

import React, { useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { MasteryRingSvg, RadarChartSvg } from '@/components/icons/GuitarSvgIcons';
import { ALL_LESSONS, localizeLesson } from '@/data/curriculumData';
import {
  buildWeakBarDrillQueue,
  summarizeSessionHistory,
} from '@/lib/practiceAnalytics';
import { useLocale } from '@/lib/i18n';
import type {
  PracticeSessionRecord,
  UserProgressState,
  WeakBarDrillItem,
} from '@/types/guitar';
import { Activity, Clock, Play, RotateCcw, TrendingUp } from 'lucide-react';

interface SkillAnalyticsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  progress: UserProgressState;
  sessions?: PracticeSessionRecord[];
  onStartDrill?: (item: WeakBarDrillItem) => void;
}

export function SkillAnalyticsDialog({
  open,
  onOpenChange,
  progress,
  sessions = [],
  onStartDrill,
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

  const localizedLessons = useMemo(
    () => ALL_LESSONS.map((l) => localizeLesson(l, locale)),
    [locale]
  );

  const historySummary = useMemo(() => summarizeSessionHistory(sessions), [sessions]);
  const drillQueue = useMemo(
    () => buildWeakBarDrillQueue(progress, sessions, localizedLessons),
    [localizedLessons, progress, sessions]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[86vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">
            {tr('Practice History & Weak-Bar Drills', '내 연습 기록 · 약점 마디 드릴')}
          </DialogTitle>
        </DialogHeader>

        {/* Top Summary Row: Radar + Daily Goal + Overall Completion */}
        <div className="grid grid-cols-1 sm:grid-cols-[0.95fr_1.05fr] gap-4 items-center">
          <div className="rounded-xl border border-border bg-muted/30 p-3 flex items-center justify-center">
            <RadarChartSvg skills={progress.skills} size={200} locale={locale} />
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

            {historySummary.totalSessions > 0 && (
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl border border-border bg-card p-2.5">
                  <div className="text-[10px] text-muted-foreground">
                    {tr('Avg Score', '평균 점수')}
                  </div>
                  <div className="font-mono text-sm font-bold tabular-nums text-foreground">
                    {historySummary.avgScore}
                  </div>
                </div>
                <div className="rounded-xl border border-border bg-card p-2.5">
                  <div className="text-[10px] text-muted-foreground">
                    {tr('Peak BPM', '최고 BPM')}
                  </div>
                  <div className="font-mono text-sm font-bold tabular-nums text-primary">
                    {historySummary.maxBpm}
                  </div>
                </div>
                <div className="rounded-xl border border-border bg-card p-2.5">
                  <div className="text-[10px] text-muted-foreground">
                    {tr('Pass Rate', '통과율')}
                  </div>
                  <div className="font-mono text-sm font-bold tabular-nums text-foreground">
                    {historySummary.passRatePct}%
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Session History Score & BPM Trend Chart */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
              <TrendingUp className="w-4 h-4 text-primary" />
              <span>{tr('Recent Exam Score Trend', '최근 승급 테스트 점수 추이')}</span>
            </div>
            {historySummary.avgTimingBiasMs !== null && (
              <Badge variant="secondary" className="font-mono text-[10px]">
                {historySummary.avgTimingBiasMs === 0
                  ? tr('Timing On-Grid', '정박 안정')
                  : historySummary.avgTimingBiasMs < 0
                    ? tr(
                        `Timing ${historySummary.avgTimingBiasMs}ms early`,
                        `박자 ${Math.abs(historySummary.avgTimingBiasMs)}ms 빠름`
                      )
                    : tr(
                        `Timing +${historySummary.avgTimingBiasMs}ms late`,
                        `박자 +${historySummary.avgTimingBiasMs}ms 느림`
                      )}
              </Badge>
            )}
          </div>

          {historySummary.recentPoints.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-secondary/35 px-4 py-5 text-center text-xs text-muted-foreground">
              {tr(
                'Complete your first Exam session to chart accuracy, BPM growth, and timing bias.',
                '첫 승급 테스트를 완주하면 정확도·BPM 성장 추이와 박자 성향 차트가 기록됩니다.'
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <svg
                viewBox="0 0 420 110"
                className="w-full h-28 overflow-visible"
                role="img"
                aria-label={tr('Recent exam score trend chart', '최근 승급 테스트 점수 차트')}
              >
                {/* 80% Pass Reference Line */}
                <line
                  x1="12"
                  y1="26"
                  x2="408"
                  y2="26"
                  stroke="var(--border)"
                  strokeDasharray="4 4"
                />
                <text
                  x="408"
                  y="22"
                  textAnchor="end"
                  className="fill-muted-foreground font-mono text-[9px]"
                >
                  80%
                </text>

                {historySummary.recentPoints.map((pt, i) => {
                  const count = historySummary.recentPoints.length;
                  const slotW = 388 / Math.max(1, count);
                  const barW = Math.min(28, slotW * 0.56);
                  const x = 16 + i * slotW + (slotW - barW) / 2;
                  const barH = Math.max(6, (pt.score / 100) * 76);
                  const y = 88 - barH;
                  return (
                    <g key={pt.id}>
                      <rect
                        x={x}
                        y={y}
                        width={barW}
                        height={barH}
                        rx={4}
                        fill={pt.passed ? 'var(--primary)' : 'var(--muted-foreground)'}
                        fillOpacity={pt.passed ? 0.88 : 0.45}
                      />
                      <text
                        x={x + barW / 2}
                        y={Math.max(10, y - 4)}
                        textAnchor="middle"
                        className="fill-foreground font-mono text-[9px] font-semibold"
                      >
                        {pt.score}
                      </text>
                      <text
                        x={x + barW / 2}
                        y={104}
                        textAnchor="middle"
                        className="fill-muted-foreground font-mono text-[9px]"
                      >
                        {pt.dateLabel}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          )}
        </div>

        {/* Adaptive 5-Minute Weak-Bar Warm-Up & Spaced Review Queue */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
              <Activity className="w-4 h-4 text-primary" />
              <span>
                {tr('5-Min Weak-Bar & Review Drill Queue', '5분 약점 마디 · 복습 워밍업 드릴 큐')}
              </span>
            </div>
            <span className="font-mono text-[10px] text-muted-foreground">
              80% BPM -&gt; +5 BPM
            </span>
          </div>

          {drillQueue.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-secondary/35 px-4 py-4 text-xs text-muted-foreground">
              {tr(
                'No weak bars or overdue reviews right now. Finish an exam or return after 5 days for automatic spaced-review drills.',
                '현재 누적된 약점 마디나 복습 대기 레슨이 없습니다. 테스트를 완주하면 흔들린 마디가 자동으로 드릴 큐에 추가됩니다.'
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {drillQueue.map((item) => (
                <div
                  key={`${item.lessonId}-${item.reason}`}
                  className="rounded-xl border border-border bg-background/80 px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-3"
                >
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-primary">
                        {item.lessonCode}
                      </span>
                      <span className="text-xs font-semibold text-foreground truncate">
                        {item.lessonTitle}
                      </span>
                      <Badge variant="secondary" className="text-[10px] font-medium shrink-0">
                        {item.reason === 'weak-bar' ? (
                          <span className="inline-flex items-center gap-1">
                            <RotateCcw className="w-2.5 h-2.5" />
                            {tr(
                              `Bar ${item.barRange[0] + 1}-${item.barRange[1] + 1}`,
                              `${item.barRange[0] + 1}~${item.barRange[1] + 1}마디 집중`
                            )}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" />
                            {tr(
                              `${item.daysSincePractice}d review`,
                              `${item.daysSincePractice}일 전 복습`
                            )}
                          </span>
                        )}
                      </Badge>
                    </div>
                    <div className="font-mono text-[11px] text-muted-foreground">
                      {tr(
                        `Auto-ramp ${item.startBpm} -> ${item.targetBpm} BPM`,
                        `${item.startBpm} BPM 시작 -> ${item.targetBpm} BPM 자동 가속`
                      )}
                    </div>
                  </div>

                  {onStartDrill && (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        onStartDrill(item);
                        onOpenChange(false);
                      }}
                      className="rounded-lg gap-1.5 text-xs font-semibold shrink-0"
                    >
                      <Play className="w-3 h-3" />
                      <span>{tr('Start Drill', '드릴 시작')}</span>
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
