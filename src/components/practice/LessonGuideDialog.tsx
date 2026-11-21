'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { Lesson } from '@/types/guitar';
import { useLocale } from '@/lib/i18n';
import { BookOpen, Layers } from 'lucide-react';
import { ExplainerVideoShell } from '@/components/animations/ExplainerVideoShell';
import {
  HarmonyExplainerComposition,
  getHarmonyAudioCues,
  getHarmonyMotionLabel,
} from '@/components/animations/HarmonyExplainerComposition';
import {
  PostureExplainerComposition,
  getPostureAudioCues,
  getPostureMotionLabel,
} from '@/components/animations/PostureExplainerComposition';

export type GuideSection = 'both' | 'harmony' | 'posture';

interface LessonGuideDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lesson: Lesson;
  section: GuideSection;
  onSectionChange: (section: GuideSection) => void;
}

export function LessonGuideDialog({
  open,
  onOpenChange,
  lesson,
  section,
  onSectionChange,
}: LessonGuideDialogProps) {
  const { locale, tr } = useLocale();
  const showHarmony = section === 'both' || section === 'harmony';
  const showPosture = section === 'both' || section === 'posture';

  const [activeSoundChannel, setActiveSoundChannel] = useState<'harmony' | 'posture' | null>(null);

  useEffect(() => {
    if (!open) {
      setActiveSoundChannel(null);
    }
  }, [open, lesson.id]);

  const compositionInputProps = useMemo(() => ({ lesson, locale }), [lesson, locale]);
  const harmonyCues = useMemo(() => getHarmonyAudioCues(lesson), [lesson]);
  const postureCues = useMemo(() => getPostureAudioCues(lesson), [lesson]);
  const harmonyBadge = useMemo(() => getHarmonyMotionLabel(lesson, locale), [lesson, locale]);
  const postureBadge = useMemo(() => getPostureMotionLabel(lesson, locale), [lesson, locale]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[88vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 pt-5 pb-4 border-b border-border">
          <DialogTitle className="pr-8 text-base font-bold leading-snug">
            <span className="font-mono text-sm text-primary mr-2">{lesson.code}</span>
            {lesson.title}
          </DialogTitle>

          {/* Clean Section Switcher */}
          <div className="flex items-center gap-1.5 pt-2.5">
            {(
              [
                { id: 'both', label: tr('Overview', '전체 보기') },
                { id: 'harmony', label: tr('Harmony Point', '화성 포인트') },
                { id: 'posture', label: tr('Posture & Fix', '자세 · 교정') },
              ] as const
            ).map((item) => (
              <Button
                key={item.id}
                type="button"
                size="xs"
                variant={section === item.id ? 'default' : 'secondary'}
                onClick={() => onSectionChange(item.id)}
              >
                {item.label}
              </Button>
            ))}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* 화성 포인트 Section */}
          {showHarmony && (
            <section className="rounded-xl border border-border bg-secondary/35 p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-foreground">
                  <Layers className="w-3.5 h-3.5 text-primary" />
                  {tr('Harmony Point', '화성 포인트')}
                </span>
                <Badge variant="secondary" className="font-mono text-[11px]">
                  {lesson.harmonyConcept.formula}
                </Badge>
              </div>

              <ExplainerVideoShell
                component={HarmonyExplainerComposition}
                inputProps={compositionInputProps}
                resetKey={`${lesson.id}-harmony-${section}`}
                badgeText={harmonyBadge}
                cueEvents={harmonyCues}
                soundEnabled={activeSoundChannel === 'harmony'}
                onSoundToggle={() =>
                  setActiveSoundChannel((prev) => (prev === 'harmony' ? null : 'harmony'))
                }
              />

              <p className="text-[13px] text-foreground/90 leading-relaxed">
                {lesson.harmonyConcept.explanation}
              </p>
              <div className="rounded-lg bg-card border border-border/80 px-3 py-2 text-xs text-muted-foreground">
                <span className="font-semibold text-foreground mr-1.5">
                  {tr('Ear Tip', '청음 팁')}
                </span>
                {lesson.harmonyConcept.earTip}
              </div>
            </section>
          )}

          {/* 자세 · 교정 Section */}
          {showPosture && (
            <section className="rounded-xl border border-border bg-secondary/35 p-4 space-y-3">
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <BookOpen className="w-3.5 h-3.5 text-primary" />
                {tr('Posture & Fix', '자세 · 교정')}
              </div>

              <ExplainerVideoShell
                component={PostureExplainerComposition}
                inputProps={compositionInputProps}
                resetKey={`${lesson.id}-posture-${section}`}
                badgeText={postureBadge}
                cueEvents={postureCues}
                soundEnabled={activeSoundChannel === 'posture'}
                onSoundToggle={() =>
                  setActiveSoundChannel((prev) => (prev === 'posture' ? null : 'posture'))
                }
              />

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                <div className="rounded-lg bg-card border border-border/80 p-3">
                  <div className="font-semibold text-foreground mb-1">
                    {tr('Thumb Position', '엄지 위치')}
                  </div>
                  <p className="text-muted-foreground leading-relaxed">
                    {lesson.postureGuide.thumbPosition}
                  </p>
                </div>
                <div className="rounded-lg bg-card border border-border/80 p-3">
                  <div className="font-semibold text-foreground mb-1">
                    {tr('Left Hand', '왼손 운지')}
                  </div>
                  <p className="text-muted-foreground leading-relaxed">
                    {lesson.postureGuide.leftHandTip}
                  </p>
                </div>
                <div className="rounded-lg bg-card border border-border/80 p-3">
                  <div className="font-semibold text-foreground mb-1">
                    {tr('Right Hand', '오른손 피킹')}
                  </div>
                  <p className="text-muted-foreground leading-relaxed">
                    {lesson.postureGuide.rightHandTip}
                  </p>
                </div>
              </div>

              <div className="rounded-lg bg-card border border-border/80 px-3 py-2.5 text-xs leading-relaxed">
                <span className="font-semibold text-primary mr-1.5">
                  {tr('Common Mistake', '주의할 실수')}
                </span>
                <span className="text-foreground">{lesson.postureGuide.commonMistake}</span>
                <span className="text-muted-foreground"> — {lesson.postureGuide.fixAction}</span>
              </div>
            </section>
          )}
        </div>

        <DialogFooter className="px-6 py-3.5 border-t border-border bg-card">
          <Button type="button" size="sm" onClick={() => onOpenChange(false)}>
            {tr('Got It · Start Practice', '확인 · 연습 시작하기')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
