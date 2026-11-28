'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { ALL_LESSONS, MODULES, localizeLesson, localizeModule } from '@/data/curriculumData';
import { useLocale } from '@/lib/i18n';
import type { Lesson, PracticeMode, UserProgressState } from '@/types/guitar';
import {
  Activity,
  BookOpen,
  Compass,
  Ear,
  Grid,
  Headphones,
  Lock,
  Maximize2,
  Mic,
  Moon,
  Radio,
  Search,
  SlidersHorizontal,
  Sun,
  Trophy,
} from 'lucide-react';

interface CommandItemEntry {
  id: string;
  group: 'action' | 'mode' | 'lesson';
  title: string;
  subtitle?: string;
  keywords: string;
  kbd?: string;
  badge?: string;
  disabled?: boolean;
  icon: React.ReactNode;
  onSelect: () => void;
}

interface CommandPaletteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedLessonId: string;
  progress: UserProgressState;
  isGuestMode: boolean;
  isAudioRunning: boolean;
  resolvedTheme: 'light' | 'dark';
  availableModes: { mode: PracticeMode; label: string }[];
  onSelectLesson: (lesson: Lesson) => void;
  onSelectMode: (mode: PracticeMode) => void;
  onToggleAudio: () => void;
  onOpenCurriculum: () => void;
  onOpenTuner: () => void;
  onOpenGuide: () => void;
  onOpenAudioSetup: () => void;
  onOpenAnalytics: () => void;
  onOpenStageHud: () => void;
  onOpenTour: () => void;
  onToggleTheme: () => void;
  onToggleLocale: () => void;
}

const GUEST_SANDBOX_LESSONS = new Set(['m1-1', 'm3-1', 'm4-1']);

export function CommandPaletteDialog({
  open,
  onOpenChange,
  selectedLessonId,
  progress,
  isGuestMode,
  isAudioRunning,
  resolvedTheme,
  availableModes,
  onSelectLesson,
  onSelectMode,
  onToggleAudio,
  onOpenCurriculum,
  onOpenTuner,
  onOpenGuide,
  onOpenAudioSetup,
  onOpenAnalytics,
  onOpenStageHud,
  onOpenTour,
  onToggleTheme,
  onToggleLocale,
}: CommandPaletteDialogProps) {
  const { locale, tr } = useLocale();
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setActiveIndex(0);
    const id = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 20);
    return () => window.clearTimeout(id);
  }, [open]);

  const moduleMap = useMemo(() => {
    const map = new Map<string, ReturnType<typeof localizeModule>>();
    for (const m of MODULES) {
      map.set(m.id, localizeModule(m, locale));
    }
    return map;
  }, [locale]);

  const isLessonUnlocked = (lesson: Lesson): boolean => {
    if (isGuestMode) return GUEST_SANDBOX_LESSONS.has(lesson.id);
    if (progress.freeExploreMode) return true;
    const globalIdx = ALL_LESSONS.findIndex((l) => l.id === lesson.id);
    if (globalIdx <= 0) return true;
    const prevLesson = ALL_LESSONS[globalIdx - 1];
    if (prevLesson.skipExam) return true;
    return Boolean(progress.lessonRecords[prevLesson.id]?.completed);
  };

  const allItems = useMemo<CommandItemEntry[]>(() => {
    const actions: CommandItemEntry[] = [
      {
        id: 'act-audio',
        group: 'action',
        title: isAudioRunning
          ? tr('Disconnect Guitar Audio', '기타 오디오 연결 해제')
          : tr('Connect Guitar Audio', '기타 오디오 연결'),
        subtitle: tr('Toggle low-latency pitch recognition', '저지연 음정 인식 엔진 시작/정지'),
        keywords: 'audio mic guitar connect input dsp',
        icon: <Mic className="size-3.5 text-primary" />,
        onSelect: () => {
          onOpenChange(false);
          onToggleAudio();
        },
      },
      {
        id: 'act-curriculum',
        group: 'action',
        title: tr('Open 39-Lesson Curriculum Browser', '39강 전체 커리큘럼 브라우저 열기'),
        subtitle: tr('Browse all 9 modules & phases', '9개 모듈 및 페이즈 전체 탐색'),
        keywords: 'curriculum lessons modules browse list',
        kbd: 'C',
        icon: <Grid className="size-3.5 text-primary" />,
        onSelect: () => {
          onOpenChange(false);
          onOpenCurriculum();
        },
      },
      {
        id: 'act-tuner',
        group: 'action',
        title: tr('Open Chromatic Tuner & Alternate Tunings', '크로매틱 튜너 · 변칙 튜닝 열기'),
        subtitle: tr('440Hz needle, Drop D, Half-Step Down, Virtual Capo', '크로매틱 튜너 및 가상 카포'),
        keywords: 'tuner tuning drop d capo pitch',
        kbd: 'T',
        icon: <Activity className="size-3.5 text-primary" />,
        onSelect: () => {
          onOpenChange(false);
          onOpenTuner();
        },
      },
      {
        id: 'act-guide',
        group: 'action',
        title: tr('Open Harmony & Posture Guide', '화성 · 자세 모션 가이드 열기'),
        subtitle: tr('Watch slow-motion Remotion explainers', '화성 포인트 및 자세 애니메이션 보기'),
        keywords: 'guide harmony posture animation remotion',
        kbd: 'G',
        icon: <BookOpen className="size-3.5 text-primary" />,
        onSelect: () => {
          onOpenChange(false);
          onOpenGuide();
        },
      },
      {
        id: 'act-hud',
        group: 'action',
        title: tr('Enter Stage Focus HUD (Full-Screen OLED)', '스테이지 집중 HUD 전환 (풀스크린 암실)'),
        subtitle: tr('Zero-glare dark performance view', '고대비 전체화면 연습 모드'),
        keywords: 'stage hud fullscreen focus darkroom',
        kbd: 'Shift+S',
        icon: <Maximize2 className="size-3.5 text-primary" />,
        onSelect: () => {
          onOpenChange(false);
          onOpenStageHud();
        },
      },
      {
        id: 'act-audio-setup',
        group: 'action',
        title: tr('Audio Interface, ASIO & Latency Calibration', '오디오 인터페이스 · ASIO · 레이턴시 보정'),
        keywords: 'asio audio setup calibration latency device',
        icon: <SlidersHorizontal className="size-3.5 text-muted-foreground" />,
        onSelect: () => {
          onOpenChange(false);
          onOpenAudioSetup();
        },
      },
      {
        id: 'act-analytics',
        group: 'action',
        title: tr('My Progress & Weak-Bar Drills', '내 연습 기록 · 약점 마디 드릴'),
        keywords: 'progress stats radar analytics drill',
        kbd: 'P',
        icon: <Trophy className="size-3.5 text-muted-foreground" />,
        onSelect: () => {
          onOpenChange(false);
          onOpenAnalytics();
        },
      },
      {
        id: 'act-theme',
        group: 'action',
        title:
          resolvedTheme === 'dark'
            ? tr('Switch Theme to Silver-Mist (Light)', 'Silver-Mist (라이트) 테마로 전환')
            : tr('Switch Theme to Obsidian Night (Dark)', 'Obsidian Night (다크) 테마로 전환'),
        keywords: 'theme dark light mist obsidian',
        icon:
          resolvedTheme === 'dark' ? (
            <Sun className="size-3.5 text-muted-foreground" />
          ) : (
            <Moon className="size-3.5 text-muted-foreground" />
          ),
        onSelect: () => {
          onOpenChange(false);
          onToggleTheme();
        },
      },
      {
        id: 'act-locale',
        group: 'action',
        title: tr('Switch Language to 한국어', 'Switch Language to English'),
        keywords: 'language locale korean english ko en',
        icon: <Compass className="size-3.5 text-muted-foreground" />,
        onSelect: () => {
          onOpenChange(false);
          onToggleLocale();
        },
      },
      {
        id: 'act-tour',
        group: 'action',
        title: tr('Restart Spotlight Onboarding Tour', '스포트라이트 온보딩 투어 다시 보기'),
        keywords: 'onboarding tour tutorial help',
        icon: <Headphones className="size-3.5 text-muted-foreground" />,
        onSelect: () => {
          onOpenChange(false);
          onOpenTour();
        },
      },
    ];

    const modes: CommandItemEntry[] = availableModes.map((m) => ({
      id: `mode-${m.mode}`,
      group: 'mode',
      title: m.label,
      subtitle: tr('Switch active practice stage', '연습 단계 즉시 전환'),
      keywords: `mode ${m.mode} ${m.label}`,
      icon:
        m.mode === 'earcopy' ? (
          <Ear className="size-3.5 text-primary" />
        ) : m.mode === 'jam' ? (
          <Radio className="size-3.5 text-primary" />
        ) : (
          <Activity className="size-3.5 text-primary" />
        ),
      onSelect: () => {
        onOpenChange(false);
        onSelectMode(m.mode);
      },
    }));

    const lessons: CommandItemEntry[] = ALL_LESSONS.map((raw) => {
      const loc = localizeLesson(raw, locale);
      const mod = moduleMap.get(loc.moduleId);
      const unlocked = isLessonUnlocked(raw);
      const completed = Boolean(progress.lessonRecords[raw.id]?.completed);
      return {
        id: `lesson-${raw.id}`,
        group: 'lesson',
        title: `${loc.code} · ${loc.title}`,
        subtitle: mod ? `M${mod.number} · ${mod.title}` : undefined,
        keywords: `${loc.code} ${loc.title} ${raw.title} ${mod?.title ?? ''} ${loc.phaseId}`,
        badge:
          raw.id === selectedLessonId
            ? tr('CURRENT', '현재')
            : completed
            ? tr('DONE', '완료')
            : !unlocked
            ? tr('LOCKED', '잠김')
            : undefined,
        disabled: !unlocked && !isGuestMode,
        icon: !unlocked ? (
          <Lock className="size-3.5 text-muted-foreground/50" />
        ) : (
          <BookOpen className="size-3.5 text-muted-foreground" />
        ),
        onSelect: () => {
          onOpenChange(false);
          onSelectLesson(raw);
        },
      };
    });

    return [...actions, ...modes, ...lessons];
  }, [
    availableModes,
    isAudioRunning,
    isGuestMode,
    locale,
    moduleMap,
    onOpenAnalytics,
    onOpenAudioSetup,
    onOpenChange,
    onOpenCurriculum,
    onOpenGuide,
    onOpenStageHud,
    onOpenTour,
    onOpenTuner,
    onSelectLesson,
    onSelectMode,
    onToggleAudio,
    onToggleLocale,
    onToggleTheme,
    progress.freeExploreMode,
    progress.lessonRecords,
    resolvedTheme,
    selectedLessonId,
    tr,
  ]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      // Show actions + modes + top 8 relevant lessons when empty
      const act = allItems.filter((i) => i.group !== 'lesson');
      const les = allItems.filter((i) => i.group === 'lesson').slice(0, 8);
      return [...act, ...les];
    }
    return allItems.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        (item.subtitle && item.subtitle.toLowerCase().includes(q)) ||
        item.keywords.toLowerCase().includes(q)
    );
  }, [allItems, query]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (filtered.length === 0 ? 0 : (prev + 1) % filtered.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) =>
        filtered.length === 0 ? 0 : (prev - 1 + filtered.length) % filtered.length
      );
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const chosen = filtered[activeIndex];
      if (chosen && !chosen.disabled) {
        chosen.onSelect();
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="sm:max-w-xl p-0 gap-0 overflow-hidden"
      >
        <DialogHeader className="sr-only">
          <DialogTitle>{tr('Studio Command Palette', '스튜디오 빠른 검색')}</DialogTitle>
          <DialogDescription>
            {tr(
              'Search all 39 lessons, practice modes, and studio actions.',
              '39강 레슨, 연습 모드 및 스튜디오 기능을 검색하고 실행합니다.'
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2.5 border-b border-border px-4 py-3">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={tr(
              'Search lessons, chords, tuner, Stage HUD...',
              '레슨(1-1, 펜타토닉), 튜너, 가이드, 스테이지 HUD 검색...'
            )}
            className="w-full min-w-0 bg-transparent text-xs text-foreground placeholder:text-muted-foreground outline-none"
          />
          <kbd className="shrink-0 rounded-[4px] border border-border bg-secondary px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
            ESC
          </kbd>
        </div>

        <ScrollArea className="max-h-[58vh]">
          <div className="p-2 space-y-1">
            {filtered.length === 0 ? (
              <div className="py-10 text-center text-xs text-muted-foreground">
                {tr('No matching lessons or commands.', '일치하는 레슨이나 명령이 없습니다.')}
              </div>
            ) : (
              filtered.map((item, idx) => {
                const isSelected = idx === activeIndex;
                return (
                  <button
                    key={item.id}
                    type="button"
                    disabled={item.disabled}
                    onMouseEnter={() => setActiveIndex(idx)}
                    onClick={() => {
                      if (!item.disabled) item.onSelect();
                    }}
                    className={`w-full min-w-0 overflow-hidden flex items-center justify-between gap-2 rounded-[10px] px-3 py-2 text-left transition-colors ${
                      item.disabled
                        ? 'opacity-45 cursor-not-allowed'
                        : isSelected
                        ? 'bg-secondary text-foreground'
                        : 'text-foreground/85 hover:bg-secondary/60'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <span className="shrink-0">{item.icon}</span>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-medium truncate">{item.title}</div>
                        {item.subtitle && (
                          <div className="text-[11px] text-muted-foreground truncate">
                            {item.subtitle}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {item.badge && (
                        <Badge
                          variant={item.badge === tr('CURRENT', '현재') ? 'signal' : 'secondary'}
                        >
                          {item.badge}
                        </Badge>
                      )}
                      {item.kbd && (
                        <kbd className="rounded-[4px] border border-border bg-background px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                          {item.kbd}
                        </kbd>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </ScrollArea>

        <div className="flex items-center justify-between border-t border-border bg-secondary/40 px-4 py-2 text-[10.5px] font-mono text-muted-foreground">
          <span>{tr('↑↓ Navigate · Enter Run', '↑↓ 이동 · Enter 실행')}</span>
          <span>Ctrl+K / /</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
