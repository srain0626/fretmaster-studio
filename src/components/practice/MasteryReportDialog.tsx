'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import type { SessionTelemetry } from '@/types/guitar';
import { ArrowRight, CheckCircle2, RotateCcw } from 'lucide-react';

interface MasteryReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  telemetry: SessionTelemetry | null;
  hasNextLesson: boolean;
  onRetry: () => void;
  onLoopWeakBar: (barIndex: number) => void;
  onNextLesson: () => void;
}

export function MasteryReportDialog({
  open,
  onOpenChange,
  telemetry,
  hasNextLesson,
  onRetry,
  onLoopWeakBar,
  onNextLesson,
}: MasteryReportDialogProps) {
  if (!telemetry) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between text-base font-semibold">
            <span className="flex items-center gap-2">
              {telemetry.passed && <CheckCircle2 className="w-5 h-5 text-primary" />}
              {telemetry.passed ? '단계를 통과했어요' : '조금만 더 연습해 볼까요'}
            </span>
            <Badge variant={telemetry.passed ? 'default' : 'secondary'} className="font-mono">
              {telemetry.grade}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-xl border border-border bg-muted/40 p-4">
            <div>
              <div className="text-xs text-muted-foreground">종합 점수</div>
              <div className="mt-0.5 font-mono text-3xl font-bold tabular-nums">
                {telemetry.score}
                <span className="text-sm font-normal text-muted-foreground"> / 100</span>
              </div>
            </div>
            <div className="text-right font-mono text-xs tabular-nums text-muted-foreground space-y-1">
              <div>템포 {telemetry.bpmPlayed} BPM</div>
              <div>
                평균 박자 오차 {telemetry.avgTimingErrorMs > 0 ? `+${telemetry.avgTimingErrorMs}` : telemetry.avgTimingErrorMs}ms
              </div>
            </div>
          </div>

          <div className="space-y-2.5 rounded-xl border border-border p-3.5">
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">음정 정확도</span>
                <span className="font-mono tabular-nums font-semibold">{telemetry.pitchAccuracy}%</span>
              </div>
              <Progress value={telemetry.pitchAccuracy} className="h-1.5" />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">박자 정확도</span>
                <span className="font-mono tabular-nums font-semibold">{telemetry.timingAccuracy}%</span>
              </div>
              <Progress value={telemetry.timingAccuracy} className="h-1.5" />
            </div>
          </div>

          {telemetry.weakBarIndices.length > 0 && (
            <div className="rounded-lg border border-border bg-secondary/50 p-3">
              <div className="text-xs font-medium mb-2">다시 연습하면 좋은 마디</div>
              <div className="flex flex-wrap gap-1.5">
                {telemetry.weakBarIndices.map((barIdx) => (
                  <Button
                    key={barIdx}
                    type="button"
                    size="xs"
                    variant="outline"
                    onClick={() => {
                      onLoopWeakBar(barIdx);
                      onOpenChange(false);
                    }}
                  >
                    {barIdx + 1}마디 반복
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              onRetry();
            }}
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
            다시 도전
          </Button>

          {telemetry.passed && hasNextLesson && (
            <Button
              type="button"
              onClick={() => {
                onOpenChange(false);
                onNextLesson();
              }}
            >
              다음 레슨
              <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
