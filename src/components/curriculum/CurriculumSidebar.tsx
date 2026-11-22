'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { BrandFretLogo } from '@/components/icons/GuitarSvgIcons';
import { STUDIO_SPRING } from '@/components/motion/StudioMotion';
import {
  ALL_LESSONS,
  MODULES,
  localizeLesson,
  localizeModule,
} from '@/data/curriculumData';
import { useLocale } from '@/lib/i18n';
import type { SyncStatus } from '@/lib/progressSync';
import type { ThemePreference } from '@/lib/theme';
import type { Lesson, PhaseId, UserProgressState } from '@/types/guitar';
import {
  AlertCircle,
  BarChart3,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Cloud,
  CloudOff,
  Compass,
  Ear,
  Grid,
  HelpCircle,
  Languages,
  Lock,
  LogOut,
  Monitor,
  Moon,
  Radio,
  RefreshCw,
  Settings,
  ShieldCheck,
  Sun,
  Unlock,
} from 'lucide-react';

export type { ThemePreference };

export interface SidebarUserSummary {
  email?: string | null;
  name?: string | null;
  avatarUrl?: string | null;
}

interface CurriculumSidebarProps {
  selectedLessonId: string;
  onSelectLesson: (lesson: Lesson) => void;
  progress: UserProgressState;
  onToggleFreeExplore: (enabled: boolean) => void;
  onOpenAnalytics: () => void;
  onOpenOnboarding?: () => void;
  themePreference: ThemePreference;
  onThemeChange: (pref: ThemePreference) => void;
  user?: SidebarUserSummary | null;
  syncStatus?: SyncStatus;
  onSignOut?: () => void;
  errorLogCount?: number;
  onOpenErrorModal?: () => void;
  isAdmin?: boolean;
}

const PHASE_FILTERS: { id: 'all' | PhaseId; enLabel: string; koLabel: string }[] = [
  { id: 'all', enLabel: 'All', koLabel: '전체' },
  { id: 'phase-1', enLabel: 'Foundations', koLabel: '입문 · 운지' },
  { id: 'phase-2', enLabel: 'Chords & Scales', koLabel: '코드 · 스케일' },
  { id: 'phase-3', enLabel: 'Tech & Solos', koLabel: '테크닉 · 솔로' },
  { id: 'phase-4', enLabel: 'Ear Copy & Jam', koLabel: '귀카피 · 즉흥' },
];

export function CurriculumSidebar({
  selectedLessonId,
  onSelectLesson,
  progress,
  onToggleFreeExplore,
  onOpenAnalytics,
  onOpenOnboarding,
  themePreference,
  onThemeChange,
  user,
  syncStatus = 'idle',
  onSignOut,
  errorLogCount = 0,
  onOpenErrorModal,
  isAdmin = false,
}: CurriculumSidebarProps) {
  const { locale, preference: localePref, setPreference: setLocalePref, tr } = useLocale();
  const [browserOpen, setBrowserOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [phaseFilter, setPhaseFilter] = useState<'all' | PhaseId>('all');
  const [previewModuleId, setPreviewModuleId] = useState<string>('mod-1');

  const localizedModules = useMemo(
    () => MODULES.map((m) => localizeModule(m, locale)),
    [locale]
  );

  const activeLesson = useMemo(() => {
    const raw = ALL_LESSONS.find((l) => l.id === selectedLessonId) ?? ALL_LESSONS[0];
    return localizeLesson(raw, locale);
  }, [selectedLessonId, locale]);

  const currentModule = useMemo(
    () => localizedModules.find((m) => m.id === activeLesson.moduleId) ?? localizedModules[0],
    [localizedModules, activeLesson.moduleId]
  );

  const currentModuleLessons = useMemo(
    () =>
      ALL_LESSONS.filter((l) => l.moduleId === currentModule.id).map((l) =>
        localizeLesson(l, locale)
      ),
    [currentModule.id, locale]
  );

  const isLessonUnlocked = (lesson: Lesson): boolean => {
    if (progress.freeExploreMode) return true;
    const globalIdx = ALL_LESSONS.findIndex((l) => l.id === lesson.id);
    if (globalIdx <= 0) return true;
    const prevLesson = ALL_LESSONS[globalIdx - 1];
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

  const jumpToLessonId = (id: string) => {
    const found = ALL_LESSONS.find((l) => l.id === id);
    if (found) onSelectLesson(found);
  };

  const openBrowser = (initialPhase: 'all' | PhaseId = 'all') => {
    setPhaseFilter(initialPhase);
    setPreviewModuleId(
      initialPhase === 'all'
        ? activeLesson.moduleId
        : MODULES.find((m) => m.phaseId === initialPhase)?.id ?? activeLesson.moduleId
    );
    setBrowserOpen(true);
  };

  return (
    <>
      <aside className="flex flex-col h-full bg-sidebar border-b lg:border-b-0 lg:border-r border-sidebar-border px-3.5 py-4 select-none">
        {/* Minimal Brand Header */}
        <div className="flex items-center justify-between px-2 mb-6">
          <Link href="/" className="flex items-center gap-2.5 hover:opacity-85 transition-opacity">
            <BrandFretLogo size={24} />
            <span className="text-base font-bold tracking-tight text-foreground">
              FretMaster
            </span>
          </Link>
          <div className="flex items-center gap-1 lg:hidden">
            <Button
              type="button"
              size="icon-xs"
              variant="ghost"
              onClick={() => setSettingsOpen(true)}
              className="relative text-muted-foreground"
              title={tr('Settings', '설정')}
            >
              <Settings className="w-3.5 h-3.5" />
              {errorLogCount > 0 && (
                <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-destructive" />
              )}
            </Button>
            {isAdmin && (
              <Link
                href="/admin"
                className="inline-flex h-7 w-7 items-center justify-center rounded-md text-primary hover:bg-accent-soft transition-colors"
                title={tr('Admin Analytics', '어드민 통계')}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
              </Link>
            )}
            {user && onSignOut && (
              <Button
                type="button"
                size="icon-xs"
                variant="ghost"
                onClick={onSignOut}
                className="text-muted-foreground"
                title={tr('Sign out', '로그아웃')}
              >
                <LogOut className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </div>

        {/* LEARNING Section */}
        <div className="space-y-1 mb-5">
          <div className="px-2.5 mb-1.5 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
            LEARNING
          </div>
          <button
            type="button"
            onClick={() => openBrowser('all')}
            className="w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium text-foreground bg-card shadow-[0_1px_2px_rgba(0,0,0,0.03)] border border-border/70 transition-colors"
          >
            <BookOpen className="w-4 h-4 text-primary" />
            <span>{tr('All Curriculum', '전체 커리큘럼')}</span>
          </button>

          <button
            type="button"
            onClick={() => openBrowser('phase-2')}
            className="w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium text-muted-foreground hover:text-foreground hover:bg-card/60 transition-colors"
          >
            <Compass className="w-4 h-4" />
            <span>{tr('Browse by Topic', '주제별 골라 배우기')}</span>
          </button>

          <button
            type="button"
            onClick={onOpenAnalytics}
            className="w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium text-muted-foreground hover:text-foreground hover:bg-card/60 transition-colors"
          >
            <BarChart3 className="w-4 h-4" />
            <span>{tr('My Progress', '내 연습 기록')}</span>
          </button>

          {onOpenOnboarding && (
            <button
              type="button"
              onClick={onOpenOnboarding}
              className="w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium text-muted-foreground hover:text-foreground hover:bg-card/60 transition-colors"
            >
              <HelpCircle className="w-4 h-4" />
              <span>{tr('Quick Tour', '튜토리얼 다시 보기')}</span>
            </button>
          )}
        </div>

        {/* PRACTICE LAB Section */}
        <div className="space-y-1 mb-6">
          <div className="px-2.5 mb-1.5 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
            PRACTICE LAB
          </div>
          <button
            type="button"
            onClick={() => jumpToLessonId('m9-1')}
            className={`w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-colors ${
              activeLesson.id === 'm9-1' || activeLesson.id === 'm9-2'
                ? 'text-primary bg-accent-soft/70'
                : 'text-muted-foreground hover:text-foreground hover:bg-card/60'
            }`}
          >
            <Ear className="w-4 h-4" />
            <span>{tr('Ear Copy Lab', '귀카피 연습')}</span>
          </button>
          <button
            type="button"
            onClick={() => jumpToLessonId('m9-3')}
            className={`w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-colors ${
              activeLesson.id === 'm9-3' || activeLesson.id === 'm9-4'
                ? 'text-primary bg-accent-soft/70'
                : 'text-muted-foreground hover:text-foreground hover:bg-card/60'
            }`}
          >
            <Radio className="w-4 h-4" />
            <span>{tr('Comping & Improv', '자유 반주 · 즉흥')}</span>
          </button>
        </div>

        {/* CURRENT MODULE Lesson List */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex items-center justify-between px-2.5 mb-2">
            <span className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
              MODULE {currentModule.number}
            </span>
            <button
              type="button"
              onClick={() => openBrowser('all')}
              className="text-[11px] font-medium text-primary hover:underline flex items-center gap-1"
            >
              <Grid className="w-3 h-3" />
              {tr('Browse', '변경')}
            </button>
          </div>

          <ScrollArea className="flex-1 -mx-1 px-1">
            <div className="space-y-1">
              {currentModuleLessons.map((lesson) => {
                const unlocked = isLessonUnlocked(lesson);
                const rec = progress.lessonRecords[lesson.id];
                const isSelected = lesson.id === selectedLessonId;

                return (
                  <button
                    key={lesson.id}
                    type="button"
                    disabled={!unlocked}
                    onClick={() => onSelectLesson(lesson)}
                    className={`relative w-full flex items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left transition-colors ${
                      isSelected
                        ? 'bg-card text-foreground font-semibold shadow-[0_1px_2px_rgba(0,0,0,0.04)]'
                        : unlocked
                        ? 'text-muted-foreground hover:text-foreground hover:bg-card/50'
                        : 'text-muted-foreground/45 cursor-not-allowed'
                    }`}
                  >
                    {isSelected && (
                      <motion.div
                        layoutId="active-lesson-bar"
                        transition={STUDIO_SPRING}
                        className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full bg-primary"
                      />
                    )}
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono text-[11px] text-muted-foreground shrink-0">
                        {lesson.code}
                      </span>
                      <span className="text-[12.5px] truncate">{lesson.title}</span>
                    </div>

                    {rec?.completed ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                    ) : !unlocked ? (
                      <Lock className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
                    ) : null}
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        </div>

        {/* Clean Bottom Account & Settings Footer (Desktop) */}
        <div className="hidden lg:flex flex-col pt-3 mt-3 border-t border-sidebar-border px-1">
          {user ? (
            <div className="flex items-center justify-between gap-2 rounded-xl border border-border/80 bg-card/85 px-2.5 py-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-soft text-primary text-[11px] font-bold uppercase overflow-hidden border border-border">
                  {(user.name || user.email || 'U').slice(0, 1)}
                </div>
                <div className="min-w-0">
                  <div className="text-[12px] font-semibold text-foreground truncate">
                    {user.name || user.email || tr('Member', '회원')}
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    {syncStatus === 'syncing' ? (
                      <>
                        <RefreshCw className="w-2.5 h-2.5 animate-spin text-primary shrink-0" />
                        <span>{tr('Saving...', '저장 중...')}</span>
                      </>
                    ) : syncStatus === 'error' ? (
                      <button
                        type="button"
                        onClick={onOpenErrorModal}
                        className="inline-flex items-center gap-1 text-destructive hover:underline"
                      >
                        <CloudOff className="w-2.5 h-2.5 shrink-0" />
                        <span>{tr('Sync paused', '동기화 오류')}</span>
                      </button>
                    ) : (
                      <>
                        <Cloud className="w-2.5 h-2.5 text-primary shrink-0" />
                        <span>{tr('Cloud synced', '클라우드 저장됨')}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-0.5 shrink-0">
                {isAdmin && (
                  <Link
                    href="/admin"
                    className="inline-flex h-6 w-6 items-center justify-center rounded-md text-primary hover:bg-accent-soft transition-colors"
                    title={tr('Admin Analytics', '어드민 통계')}
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                  </Link>
                )}
                <Button
                  type="button"
                  size="icon-xs"
                  variant="ghost"
                  onClick={() => setSettingsOpen(true)}
                  className="relative text-muted-foreground hover:text-foreground"
                  title={tr('Settings', '설정')}
                >
                  <Settings className="w-3.5 h-3.5" />
                  {errorLogCount > 0 && (
                    <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-destructive" />
                  )}
                </Button>
                {onSignOut && (
                  <Button
                    type="button"
                    size="icon-xs"
                    variant="ghost"
                    onClick={onSignOut}
                    className="text-muted-foreground hover:text-foreground"
                    title={tr('Sign out', '로그아웃')}
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSettingsOpen(true)}
              className="w-full justify-between text-xs text-muted-foreground hover:text-foreground"
            >
              <span className="inline-flex items-center gap-2">
                <Settings className="w-3.5 h-3.5" />
                {tr('Settings', '설정')}
              </span>
              <span className="text-[10px] font-mono uppercase">{locale}</span>
            </Button>
          )}
        </div>
      </aside>

      {/* Ultra-Simple 2-Column Master-Detail Curriculum Modal */}
      <Dialog open={browserOpen} onOpenChange={setBrowserOpen}>
        <DialogContent className="sm:max-w-3xl p-0 gap-0 overflow-hidden">
          <DialogHeader className="px-6 pt-5 pb-4 border-b border-border">
            <DialogTitle className="flex items-center justify-between pr-8 text-base font-semibold">
              <span>{tr('Curriculum', '커리큘럼')}</span>
              <div className="flex items-center gap-2 font-normal text-xs text-muted-foreground">
                {progress.freeExploreMode ? (
                  <Unlock className="w-3.5 h-3.5 text-primary" />
                ) : (
                  <Lock className="w-3.5 h-3.5" />
                )}
                <span>{tr('Free Explore', '자유 탐색')}</span>
                <Switch
                  checked={progress.freeExploreMode}
                  onCheckedChange={onToggleFreeExplore}
                />
              </div>
            </DialogTitle>

            {/* Clean 1-Row 5-Pill Phase Filter */}
            <div className="flex flex-wrap gap-1.5 pt-3">
              {PHASE_FILTERS.map((pf) => (
                <Button
                  key={pf.id}
                  type="button"
                  size="xs"
                  variant={phaseFilter === pf.id ? 'default' : 'secondary'}
                  onClick={() => setPhaseFilter(pf.id)}
                >
                  {locale === 'en' ? pf.enLabel : pf.koLabel}
                </Button>
              ))}
            </div>
          </DialogHeader>

          {/* Master-Detail Split: Left Module List | Right Full-Width Lesson List (No Truncation!) */}
          <div className="grid grid-cols-1 sm:grid-cols-[240px_minmax(0,1fr)] min-h-[380px] max-h-[64vh]">
            {/* Left Column: Modules */}
            <div className="border-b sm:border-b-0 sm:border-r border-border bg-muted/35 p-2.5 overflow-y-auto space-y-1">
              {filteredModules.map((mod) => {
                const modLessons = ALL_LESSONS.filter((l) => l.moduleId === mod.id);
                const done = modLessons.filter((l) => progress.lessonRecords[l.id]?.completed).length;
                const isSelected = mod.id === effectivePreviewModule.id;

                return (
                  <button
                    key={mod.id}
                    type="button"
                    onClick={() => setPreviewModuleId(mod.id)}
                    className={`w-full flex items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-left transition-colors ${
                      isSelected
                        ? 'bg-card text-foreground font-semibold shadow-[0_1px_2px_rgba(0,0,0,0.04)] border border-border/80'
                        : 'text-muted-foreground hover:text-foreground hover:bg-card/60'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`font-mono text-[11px] shrink-0 ${
                          isSelected ? 'text-primary font-bold' : 'text-muted-foreground'
                        }`}
                      >
                        0{mod.number}
                      </span>
                      <span className="text-xs truncate">{mod.title}</span>
                    </div>
                    <span className="font-mono text-[10.5px] text-muted-foreground shrink-0">
                      {done}/{modLessons.length}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Right Column: Spacious 1-Column Lessons for Selected Module */}
            <div className="p-4 overflow-y-auto bg-card space-y-3">
              <div className="flex items-center justify-between border-b border-border pb-2.5">
                <h3 className="text-sm font-semibold text-foreground">
                  Module {effectivePreviewModule.number}. {effectivePreviewModule.title}
                </h3>
                <span className="text-xs text-muted-foreground font-mono">
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
                      disabled={!unlocked}
                      onClick={() => {
                        onSelectLesson(lesson);
                        setBrowserOpen(false);
                      }}
                      className={`group w-full flex items-center justify-between gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors ${
                        isCurrent
                          ? 'border-primary bg-accent-soft/55 text-foreground font-semibold'
                          : unlocked
                          ? 'border-border bg-background/50 hover:bg-secondary/70 text-foreground'
                          : 'border-border/50 bg-muted/30 text-muted-foreground/50 cursor-not-allowed'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className={`font-mono text-xs shrink-0 ${
                            isCurrent ? 'text-primary font-bold' : 'text-muted-foreground'
                          }`}
                        >
                          {lesson.code}
                        </span>
                        <span className="text-[13px] leading-snug">{lesson.title}</span>
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
          </div>
        </DialogContent>
      </Dialog>

      {/* Studio Preferences & Diagnostics Modal */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-semibold">
              <Settings className="w-4 h-4 text-primary" />
              <span>{tr('Studio Settings', '스튜디오 환경 설정')}</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-1">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs font-medium text-foreground whitespace-nowrap">
                <Languages className="w-3.5 h-3.5 text-muted-foreground" />
                <span>{tr('Language', '언어')}</span>
              </div>
              <div className="inline-flex items-center rounded-lg border border-border bg-card p-0.5">
                {(
                  [
                    { id: 'system', label: tr('Auto', '자동') },
                    { id: 'en', label: 'EN' },
                    { id: 'ko', label: '한국어' },
                  ] as const
                ).map((opt) => {
                  const active = localePref === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setLocalePref(opt.id)}
                      className={`rounded-md px-2.5 py-1 text-xs font-medium whitespace-nowrap transition-colors ${
                        active
                          ? 'bg-secondary text-foreground'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs font-medium text-foreground whitespace-nowrap">
                <Monitor className="w-3.5 h-3.5 text-muted-foreground" />
                <span>{tr('Appearance', '화면 테마')}</span>
              </div>
              <div className="inline-flex items-center rounded-lg border border-border bg-card p-0.5">
                {(
                  [
                    { id: 'system', icon: Monitor, label: tr('Auto', '자동') },
                    { id: 'light', icon: Sun, label: tr('Light', '라이트') },
                    { id: 'dark', icon: Moon, label: tr('Dark', '다크') },
                  ] as const
                ).map((opt) => {
                  const Icon = opt.icon;
                  const active = themePreference === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => onThemeChange(opt.id)}
                      className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium whitespace-nowrap transition-colors ${
                        active
                          ? 'bg-secondary text-foreground'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <Icon className="w-3 h-3" />
                      <span>{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {onOpenErrorModal && (
              <div className="pt-3 border-t border-border flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs font-medium text-foreground">
                  <AlertCircle className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>{tr('Diagnostic Logs', '오류 진단 로그')}</span>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSettingsOpen(false);
                    onOpenErrorModal();
                  }}
                  className="text-xs gap-1.5"
                >
                  <span>{tr('View Logs', '로그 열기')}</span>
                  {errorLogCount > 0 && (
                    <span className="rounded-full bg-destructive/15 text-destructive px-1.5 py-0.5 text-[10px] font-mono font-semibold">
                      {errorLogCount}
                    </span>
                  )}
                </Button>
              </div>
            )}

            {isAdmin && (
              <div className="pt-3 border-t border-border flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs font-medium text-foreground">
                  <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                  <span>{tr('Admin Analytics', '어드민 통계')}</span>
                </div>
                <Link
                  href="/admin"
                  onClick={() => setSettingsOpen(false)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-95 transition-opacity"
                >
                  <span>{tr('Open Dashboard', '대시보드 열기')}</span>
                </Link>
              </div>
            )}

            {user && onSignOut && (
              <div className="pt-3 border-t border-border flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-foreground truncate">
                    {user.name || tr('Signed in', '로그인됨')}
                  </div>
                  {user.email && (
                    <div className="text-[11px] text-muted-foreground truncate">{user.email}</div>
                  )}
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSettingsOpen(false);
                    onSignOut();
                  }}
                  className="text-xs gap-1.5 shrink-0"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>{tr('Sign out', '로그아웃')}</span>
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
