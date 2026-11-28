'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { HelpHint, Hint } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { useLocale } from '@/lib/i18n';
import type { SyncStatus } from '@/lib/progressSync';
import type { ThemePreference } from '@/lib/theme';
import type { AudioLatencyTelemetry } from '@/lib/lowLatencyAudioEngine';
import type { LivePitchData } from '@/types/guitar';
import {
  Activity,
  AlertCircle,
  BarChart3,
  BookOpen,
  Bug,
  Cloud,
  CloudOff,
  Compass,
  Grid,
  LogOut,
  Maximize2,
  Menu,
  Mic,
  Monitor,
  Moon,
  RefreshCw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sun,
} from 'lucide-react';

export interface DockUserSummary {
  email?: string | null;
  name?: string | null;
  avatarUrl?: string | null;
}

interface StudioLiquidDockProps {
  isAudioRunning: boolean;
  onToggleAudio: () => void;
  livePitch: LivePitchData;
  audioTelemetry: AudioLatencyTelemetry;
  deckOpen: boolean;
  onToggleDeck: () => void;
  isPlaying: boolean;
  isGuestMode: boolean;
  isAdmin: boolean;
  user?: DockUserSummary | null;
  syncStatus?: SyncStatus;
  onSignOut?: () => void;
  themePreference: ThemePreference;
  onThemeChange: (pref: ThemePreference) => void;
  freeExploreMode: boolean;
  onToggleFreeExplore: (enabled: boolean) => void;
  errorLogCount: number;
  onOpenCurriculum: () => void;
  onOpenTuner: () => void;
  onOpenGuide: () => void;
  onOpenAnalytics: () => void;
  onOpenAudioSetup: () => void;
  onOpenStageHud: () => void;
  onOpenCommandPalette: () => void;
  onOpenTour: () => void;
  onOpenErrorModal: () => void;
  onOpenBugReport: () => void;
}

export function StudioLiquidDock({
  isAudioRunning,
  onToggleAudio,
  livePitch,
  audioTelemetry,
  deckOpen,
  onToggleDeck,
  isPlaying,
  isGuestMode,
  isAdmin,
  user,
  syncStatus = 'idle',
  onSignOut,
  themePreference,
  onThemeChange,
  freeExploreMode,
  onToggleFreeExplore,
  errorLogCount,
  onOpenCurriculum,
  onOpenTuner,
  onOpenGuide,
  onOpenAnalytics,
  onOpenAudioSetup,
  onOpenStageHud,
  onOpenCommandPalette,
  onOpenTour,
  onOpenErrorModal,
  onOpenBugReport,
}: StudioLiquidDockProps) {
  const { locale, preference: localePref, setPreference: setLocalePref, tr } = useLocale();
  const [menuOpen, setMenuOpen] = useState(false);

  const latencyLabel =
    audioTelemetry.totalEstimatedMs > 0
      ? `${audioTelemetry.totalEstimatedMs.toFixed(1)}ms`
      : 'LIVE';

  return (
    <div
      data-tour="liquid-dock"
      className="fixed bottom-5 inset-x-0 z-40 pointer-events-none flex justify-center px-3"
    >
      <nav
        aria-label={tr('Studio Floating Dock', '스튜디오 플로팅 독')}
        className="pointer-events-auto nr-liquid-dock flex items-center gap-1.5 p-1.5"
      >
        {/* 1. Audio Input Start / Live Status */}
        <Hint
          content={
            isAudioRunning
              ? tr('Click to disconnect guitar input', '클릭하여 기타 입력 끄기')
              : tr('Connect guitar or mic for real-time pitch coaching', '마이크·오디오 인터페이스를 연결합니다')
          }
          side="top"
        >
          <button
            type="button"
            onClick={onToggleAudio}
            data-audio={isAudioRunning ? 'live' : 'idle'}
            className="nr-liquid-btn inline-flex h-9 items-center gap-2 px-4 text-[12.5px] font-medium whitespace-nowrap cursor-pointer"
          >
            {isAudioRunning ? (
              <>
                <span className="size-2 rounded-full bg-white animate-pulse shrink-0" />
                <span className="font-mono text-xs tabular-nums">
                  {livePitch.isActive && livePitch.nearestMidi > 0
                    ? `${livePitch.noteName} · ${latencyLabel}`
                    : `${tr('Live', '연결됨')} · ${latencyLabel}`}
                </span>
              </>
            ) : (
              <>
                <Mic className="size-3.5 text-primary shrink-0" />
                <span>{tr('Start Guitar', '기타 연결')}</span>
              </>
            )}
          </button>
        </Hint>

        <span className="w-px h-4 bg-foreground/15 shrink-0" aria-hidden="true" />

        {/* 2. Practice & Backing Deck Drawer Toggle */}
        <Hint
          content={tr('Open practice controls, backing mixer & exam tier', '반주 믹서·판정 기준·진도 시트 열기')}
          side="top"
        >
          <button
            type="button"
            onClick={onToggleDeck}
            data-active={deckOpen ? 'true' : undefined}
            data-recording={isPlaying && !deckOpen ? 'true' : undefined}
            className="nr-liquid-btn inline-flex h-9 items-center gap-2 px-4 text-[12.5px] font-medium whitespace-nowrap cursor-pointer text-foreground"
          >
            <SlidersHorizontal className="size-3.5 shrink-0" />
            <span>{tr('Controls', '믹서 · 설정')}</span>
          </button>
        </Hint>

        <span className="w-px h-4 bg-foreground/15 shrink-0" aria-hidden="true" />

        {/* 3. Progressive Menu Popover */}
        <Popover open={menuOpen} onOpenChange={setMenuOpen}>
          <PopoverTrigger
            data-active={menuOpen ? 'true' : undefined}
            className="nr-liquid-btn inline-flex h-9 items-center gap-2 px-4 text-[12.5px] font-medium whitespace-nowrap cursor-pointer text-foreground relative"
          >
            <Menu className="size-3.5 shrink-0" />
            <span>{tr('Menu', '메뉴')}</span>
            {errorLogCount > 0 && (
              <span className="size-1.5 rounded-full bg-destructive shrink-0" />
            )}
          </PopoverTrigger>

          <PopoverContent side="top" sideOffset={12} align="end" className="w-80 p-3 space-y-2.5">
            {/* Row 1: Account & Sync Card */}
            <div className="flex items-center justify-between gap-2 rounded-[12px] border border-border bg-secondary/50 px-3 py-2">
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <div className="flex size-7 shrink-0 items-center justify-center rounded-full border border-border bg-accent-soft font-mono text-[11px] font-bold text-primary uppercase">
                  {(user?.name || user?.email || 'G').slice(0, 1)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold text-foreground truncate">
                    {user?.name || user?.email || tr('Guest Mode', '체험 모드')}
                  </div>
                  <div className="flex items-center gap-1 text-[10.5px] text-muted-foreground truncate">
                    {isGuestMode ? (
                      <span>{tr('Sign in to sync 39 lessons', '로그인 시 39강 전체 저장')}</span>
                    ) : syncStatus === 'syncing' ? (
                      <>
                        <RefreshCw className="size-2.5 animate-spin text-primary shrink-0" />
                        <span>{tr('Syncing...', '저장 중...')}</span>
                      </>
                    ) : syncStatus === 'error' ? (
                      <>
                        <CloudOff className="size-2.5 text-destructive shrink-0" />
                        <span>{tr('Sync paused', '동기화 보류')}</span>
                      </>
                    ) : (
                      <>
                        <Cloud className="size-2.5 text-primary shrink-0" />
                        <span>{tr('Cloud synced', '클라우드 저장됨')}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {isAdmin && (
                  <Hint content={tr('Admin Analytics', '어드민 통계')} side="top">
                    <Link
                      href="/admin"
                      onClick={() => setMenuOpen(false)}
                      className="inline-flex size-7 items-center justify-center rounded-[8px] border border-border bg-card text-primary hover:bg-secondary transition-colors"
                    >
                      <ShieldCheck className="size-3.5" />
                    </Link>
                  </Hint>
                )}
                {onSignOut && (
                  <Hint
                    content={
                      isGuestMode
                        ? tr('Sign in with Google', 'Google 로그인')
                        : tr('Sign out', '로그아웃')
                    }
                    side="top"
                  >
                    <Button
                      type="button"
                      size="icon-xs"
                      variant="ghost"
                      onClick={() => {
                        setMenuOpen(false);
                        onSignOut();
                      }}
                    >
                      <LogOut className="size-3.5" />
                    </Button>
                  </Hint>
                )}
              </div>
            </div>

            {/* Row 2: Theme & Language Segmented Pills */}
            <div className="grid grid-cols-2 gap-1.5">
              <div className="flex items-center rounded-[10px] border border-border bg-secondary/45 p-0.5">
                {(
                  [
                    { id: 'system', icon: Monitor, label: tr('Auto', '자동') },
                    { id: 'light', icon: Sun, label: tr('Mist', '미스트') },
                    { id: 'dark', icon: Moon, label: tr('Dark', '다크') },
                  ] as const
                ).map((opt) => {
                  const Icon = opt.icon;
                  const active = themePreference === opt.id;
                  return (
                    <Hint key={opt.id} content={opt.label} side="top">
                      <button
                        type="button"
                        onClick={() => onThemeChange(opt.id)}
                        className={`flex-1 inline-flex items-center justify-center gap-1 rounded-[8px] py-1 text-[10.5px] font-medium transition-colors ${
                          active
                            ? 'bg-card text-foreground shadow-xs'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        <Icon className="size-3" />
                      </button>
                    </Hint>
                  );
                })}
              </div>

              <div className="flex items-center rounded-[10px] border border-border bg-secondary/45 p-0.5">
                {(
                  [
                    { id: 'system', label: tr('Auto', '자동') },
                    { id: 'en', label: 'EN' },
                    { id: 'ko', label: 'KO' },
                  ] as const
                ).map((opt) => {
                  const active = localePref === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setLocalePref(opt.id)}
                      className={`flex-1 rounded-[8px] py-1 font-mono text-[10.5px] font-medium transition-colors ${
                        active
                          ? 'bg-card text-foreground shadow-xs'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Row 3: 2x2 Quick Tools Grid */}
            <div className="grid grid-cols-2 gap-1.5">
              {[
                {
                  label: tr('39 Lessons', '커리큘럼'),
                  kbd: 'C',
                  icon: <Grid className="size-3.5 text-primary" />,
                  onClick: () => {
                    setMenuOpen(false);
                    onOpenCurriculum();
                  },
                },
                {
                  label: tr('Tuner', '튜너'),
                  kbd: 'T',
                  icon: <Activity className="size-3.5 text-primary" />,
                  onClick: () => {
                    setMenuOpen(false);
                    onOpenTuner();
                  },
                },
                {
                  label: tr('Motion Guide', '모션 가이드'),
                  kbd: 'G',
                  icon: <BookOpen className="size-3.5 text-primary" />,
                  onClick: () => {
                    setMenuOpen(false);
                    onOpenGuide();
                  },
                },
                {
                  label: tr('Progress', '내 기록'),
                  kbd: 'P',
                  icon: <BarChart3 className="size-3.5 text-primary" />,
                  onClick: () => {
                    setMenuOpen(false);
                    onOpenAnalytics();
                  },
                },
              ].map((tool) => (
                <button
                  key={tool.kbd}
                  type="button"
                  onClick={tool.onClick}
                  className="w-full min-w-0 overflow-hidden flex items-center justify-between gap-2 rounded-[10px] border border-border bg-card/75 hover:bg-secondary/80 px-2.5 py-2 text-left transition-colors"
                >
                  <span className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="shrink-0">{tool.icon}</span>
                    <span className="text-xs font-medium truncate">{tool.label}</span>
                  </span>
                  <kbd className="shrink-0 rounded-[4px] border border-border bg-background px-1 py-0.5 font-mono text-[9.5px] text-muted-foreground">
                    {tool.kbd}
                  </kbd>
                </button>
              ))}
            </div>

            {/* Row 4: Secondary Studio Actions */}
            <div className="space-y-0.5 pt-1 border-t border-border">
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onOpenAudioSetup();
                }}
                className="w-full min-w-0 overflow-hidden flex items-center justify-between gap-2 rounded-[8px] px-2.5 py-1.5 text-xs text-foreground/90 hover:bg-secondary/70 transition-colors"
              >
                <span className="flex items-center gap-2 min-w-0 flex-1">
                  <SlidersHorizontal className="size-3.5 text-muted-foreground shrink-0" />
                  <span className="truncate">{tr('Audio & ASIO Setup', '오디오 · ASIO 설정')}</span>
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onOpenStageHud();
                }}
                className="w-full min-w-0 overflow-hidden flex items-center justify-between gap-2 rounded-[8px] px-2.5 py-1.5 text-xs text-foreground/90 hover:bg-secondary/70 transition-colors"
              >
                <span className="flex items-center gap-2 min-w-0 flex-1">
                  <Maximize2 className="size-3.5 text-muted-foreground shrink-0" />
                  <span className="truncate">{tr('Stage Focus HUD', '스테이지 집중 HUD')}</span>
                </span>
                <kbd className="shrink-0 rounded-[4px] border border-border bg-background px-1.5 py-0.5 font-mono text-[9.5px] text-muted-foreground">
                  Shift+S
                </kbd>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onOpenCommandPalette();
                }}
                className="w-full min-w-0 overflow-hidden flex items-center justify-between gap-2 rounded-[8px] px-2.5 py-1.5 text-xs text-foreground/90 hover:bg-secondary/70 transition-colors"
              >
                <span className="flex items-center gap-2 min-w-0 flex-1">
                  <Search className="size-3.5 text-muted-foreground shrink-0" />
                  <span className="truncate">{tr('Quick Search', '빠른 검색 팔레트')}</span>
                </span>
                <kbd className="shrink-0 rounded-[4px] border border-border bg-background px-1.5 py-0.5 font-mono text-[9.5px] text-muted-foreground">
                  Ctrl+K
                </kbd>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onOpenTour();
                }}
                className="w-full min-w-0 overflow-hidden flex items-center justify-between gap-2 rounded-[8px] px-2.5 py-1.5 text-xs text-foreground/90 hover:bg-secondary/70 transition-colors"
              >
                <span className="flex items-center gap-2 min-w-0 flex-1">
                  <Compass className="size-3.5 text-muted-foreground shrink-0" />
                  <span className="truncate">{tr('Spotlight Tour', '스포트라이트 튜토리얼')}</span>
                </span>
              </button>

              <div className="w-full min-w-0 flex items-center justify-between gap-2 rounded-[8px] px-2.5 py-1.5 text-xs text-foreground/90">
                <span className="flex items-center gap-1.5 min-w-0 flex-1">
                  <span className="truncate">{tr('Free Explore (39)', '자유 탐색 (39강)')}</span>
                  <HelpHint
                    content={tr(
                      'Unlock all 39 lessons immediately without passing exams sequentially.',
                      '통과 테스트 없이 39개 전체 레슨을 바로 탐색할 수 있습니다.'
                    )}
                    side="left"
                  />
                </span>
                <Switch
                  checked={freeExploreMode}
                  onCheckedChange={onToggleFreeExplore}
                  aria-label={tr('Free Explore', '자유 탐색')}
                />
              </div>
            </div>

            {/* Footer: 3-split diagnostics / bug / version */}
            <div className="grid grid-cols-3 gap-1 pt-1.5 border-t border-border text-[11px]">
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onOpenErrorModal();
                }}
                className="flex items-center justify-center gap-1 rounded-[6px] py-1 text-muted-foreground hover:bg-secondary/70 hover:text-foreground transition-colors"
              >
                <AlertCircle className="size-3 shrink-0" />
                <span className="truncate">{tr('Logs', '로그')}</span>
                {errorLogCount > 0 && (
                  <span className="size-1.5 rounded-full bg-destructive shrink-0" />
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onOpenBugReport();
                }}
                className="flex items-center justify-center gap-1 rounded-[6px] py-1 text-muted-foreground hover:bg-secondary/70 hover:text-foreground transition-colors"
              >
                <Bug className="size-3 text-primary shrink-0" />
                <span className="truncate">{tr('Bug', '버그 제보')}</span>
              </button>

              <div className="flex items-center justify-center font-mono text-[10px] text-muted-foreground">
                v0.4 · {locale.toUpperCase()}
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </nav>
    </div>
  );
}
