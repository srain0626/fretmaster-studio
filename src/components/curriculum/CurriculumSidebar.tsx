'use client';

import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { HelpHint } from '@/components/ui/tooltip';
import {
  ALL_LESSONS,
  MODULES,
  localizeLesson,
  localizeModule,
} from '@/data/curriculumData';
import { useLocale } from '@/lib/i18n';
import type { Lesson, PhaseId, UserProgressState } from '@/types/guitar';
import { CheckCircle2, ChevronRight, Lock, Unlock } from 'lucide-react';

export interface CurriculumBrowserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedLessonId: string;
  onSelectLesson: (lesson: Lesson) => void;
  progress: UserProgressState;
  onToggleFreeExplore: (enabled: boolean) => void;
  isGuestMode?: boolean;
}

const GUEST_SANDBOX_LESSONS = new Set(['m1-1', 'm3-1', 'm4-1']);

const PHASE_FILTERS: { id: 'all' | PhaseId; enLabel: string; koLabel: string }[] = [
  { id: 'all', enLabel: 'All', koLabel: '전체' },
  { id: 'phase-1', enLabel: 'Foundations', koLabel: '입문 · 운지' },
  { id: 'phase-2', enLabel: 'Chords & Scales', koLabel: '코드 · 스케일' },
  { id: 'phase-3', enLabel: 'Tech & Solos', koLabel: '테크닉 · 솔로' },
  { id: 'phase-4', enLabel: 'Ear Copy & Jam', koLabel: '귀카피 · 즉흥' },
];

export function CurriculumBrowserDialog({
  open,
  onOpenChange,
  selectedLessonId,
  onSelectLesson,
  progress,
  onToggleFreeExplore,
  isGuestMode = false,
}: CurriculumBrowserDialogProps) {
  const { locale, tr } = useLocale();
  const [phaseFilter, setPhaseFilter] = useState<'all' | PhaseId>('all');
  const [previewModuleId, setPreviewModuleId] = useState<string>(() => {
    const active = ALL_LESSONS.find((l) => l.id === selectedLessonId) ?? ALL_LESSONS[0];
    return active.moduleId;
  });

  const localizedModules = useMemo(
    () => MODULES.map((m) => localizeModule(m, locale)),
    [locale]
  );

  const isLessonUnlocked = (lesson: Lesson): boolean => {
    if (isGuestMode) return GUEST_SANDBOX_LESSONS.has(lesson.id);
    if (progress.freeExploreMode) return true;
    const globalIdx = ALL_LESSONS.findIndex((l) => l.id === lesson.id);
    if (globalIdx <= 0) return true;
    const prevLesson = ALL_LESSONS[globalIdx - 1];
    if (prevLesson.skipExam) return true;
    return Boolean(progress.lessonRecords[prevLesson.id]?.completed);
  };

  const filteredModules = useMemo(() => {
    if (phaseFilter === 'all') return localizedModules;
    return localizedModules.filter((m) => m.phaseId === phaseFilter);
  }, [localizedModules, phaseFilter]);

  const effectivePreviewModule = useMemo(() => {
    const match = filteredModules.find((m) => m.id === previewModuleId);
    return match ?? filteredModules[0] ?? localizedModules[0];
  }, [filteredModules, previewModuleId, localizedModules]);

  const previewLessons = useMemo(
    () =>
      ALL_LESSONS.filter((l) => l.moduleId === effectivePreviewModule.id).map((l) =>
        localizeLesson(l, locale)
      ),
    [effectivePreviewModule.id, locale]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 pt-5 pb-4 border-b border-border">
          <DialogTitle className="flex items-center justify-between pr-8 text-lg">
            <span>{tr('39-Lesson Curriculum', '39강 커리큘럼')}</span>
            <div className="flex items-center gap-2 font-sans text-xs text-muted-foreground">
              {progress.freeExploreMode ? (
                <Unlock className="w-3.5 h-3.5 text-primary" />
              ) : (
                <Lock className="w-3.5 h-3.5" />
              )}
              <span>{tr('Free Explore', '자유 탐색')}</span>
              <HelpHint
                content={tr(
                  'Open all 39 lessons immediately without waiting to pass sequential exams.',
                  '순차 통과 테스트 없이 39개 전체 레슨을 바로 골라 연습할 수 있습니다.'
                )}
                side="bottom"
              />
              <Switch
                checked={progress.freeExploreMode}
                onCheckedChange={onToggleFreeExplore}
              />
            </div>
          </DialogTitle>
          <DialogDescription className="sr-only">
            {tr(
              'Browse modules by phase and select any unlocked guitar lesson.',
              '페이즈 및 모듈별로 39개 기타 레슨을 탐색하고 선택합니다.'
            )}
          </DialogDescription>

          {/* 5-Pill Phase Filter */}
          <div className="flex flex-wrap gap-1.5 pt-3">
            {PHASE_FILTERS.map((pf) => (
              <Button
                key={pf.id}
                type="button"
                size="xs"
                variant={phaseFilter === pf.id ? 'signal' : 'secondary'}
                onClick={() => setPhaseFilter(pf.id)}
              >
                {locale === 'en' ? pf.enLabel : pf.koLabel}
              </Button>
            ))}
          </div>
        </DialogHeader>

        {/* Master-Detail Split */}
        <div className="grid grid-cols-1 sm:grid-cols-[248px_minmax(0,1fr)] min-h-[380px] max-h-[64vh]">
          {/* Left Column: Modules */}
          <ScrollArea className="border-b sm:border-b-0 sm:border-r border-border bg-secondary/35 p-2.5 max-h-[200px] sm:max-h-[64vh]">
            <div className="space-y-1">
              {filteredModules.map((mod) => {
                const modLessons = ALL_LESSONS.filter((l) => l.moduleId === mod.id);
                const done = modLessons.filter((l) => progress.lessonRecords[l.id]?.completed).length;
                const isSelected = mod.id === effectivePreviewModule.id;

                return (
                  <button
                    key={mod.id}
                    type="button"
                    onClick={() => setPreviewModuleId(mod.id)}
                    className={`w-full min-w-0 overflow-hidden flex items-center justify-between gap-2 rounded-[10px] px-3 py-2.5 text-left transition-colors ${
                      isSelected
                        ? 'bg-card text-foreground font-semibold shadow-xs border border-border'
                        : 'text-muted-foreground hover:text-foreground hover:bg-card/60'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span
                        className={`font-mono text-[11px] shrink-0 ${
                          isSelected ? 'text-primary font-bold' : 'text-muted-foreground'
                        }`}
                      >
                        0{mod.number}
                      </span>
                      <span className="text-xs truncate min-w-0">{mod.title}</span>
                    </div>
                    <span className="font-mono text-[10.5px] tabular-nums text-muted-foreground shrink-0">
                      {done}/{modLessons.length}
                    </span>
                  </button>
                );
              })}
            </div>
          </ScrollArea>

          {/* Right Column: Lessons */}
          <ScrollArea className="bg-card max-h-[420px] sm:max-h-[64vh]">
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between gap-2 border-b border-border pb-2.5">
                <h3 className="font-display text-sm font-normal text-foreground truncate min-w-0">
                  Module {effectivePreviewModule.number}. {effectivePreviewModule.title}
                </h3>
                <span className="text-[11px] text-muted-foreground font-mono shrink-0">
                  {locale === 'en'
                    ? `${previewLessons.length} lessons`
                    : `${previewLessons.length}개 레슨`}
                </span>
              </div>

              <div className="space-y-1.5">
                {previewLessons.map((lesson) => {
                  const unlocked = isLessonUnlocked(lesson);
                  const rec = progress.lessonRecords[lesson.id];
                  const isCurrent = lesson.id === selectedLessonId;

                  return (
                    <button
                      key={lesson.id}
                      type="button"
                      disabled={!unlocked && !isGuestMode}
                      onClick={() => {
                        onSelectLesson(lesson);
                        onOpenChange(false);
                      }}
                      className={`group w-full min-w-0 overflow-hidden flex items-center justify-between gap-3 rounded-[10px] border px-3.5 py-2.5 text-left transition-colors ${
                        isCurrent
                          ? 'border-primary bg-accent-soft/60 text-foreground font-semibold'
                          : unlocked
                          ? 'border-border bg-background/60 hover:bg-secondary/70 text-foreground'
                          : 'border-border/50 bg-secondary/20 text-muted-foreground/55 cursor-not-allowed'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <span
                          className={`font-mono text-xs shrink-0 ${
                            isCurrent ? 'text-primary font-bold' : 'text-muted-foreground'
                          }`}
                        >
                          {lesson.code}
                        </span>
                        <span className="text-[13px] leading-snug truncate min-w-0">
                          {lesson.title}
                        </span>
                      </div>

                      <div className="shrink-0">
                        {rec?.completed ? (
                          <CheckCircle2 className="w-4 h-4 text-primary" />
                        ) : !unlocked ? (
                          <Lock className="w-3.5 h-3.5 text-muted-foreground/50" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-muted-foreground/60 group-hover:text-foreground transition-colors" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
