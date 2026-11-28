'use client';

import React, { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { BrandFretLogo } from '@/components/icons/GuitarSvgIcons';
import { useLocale } from '@/lib/i18n';
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Check,
  Compass,
  Layers,
  Mic,
  Sparkles,
  X,
} from 'lucide-react';

interface StudioOnboardingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userName?: string | null;
  initialFreeExplore: boolean;
  initialDailyGoalSeconds: number;
  isAudioRunning: boolean;
  onConnectAudio: () => Promise<void> | void;
  onOpenAudioSetup: () => void;
  onComplete: (prefs: { freeExploreMode: boolean; dailyGoalSeconds: number }) => void;
  onSkip: () => void;
}

type PreferredSide = 'top' | 'bottom' | 'left' | 'right';

interface TourStepSpec {
  badge: string;
  target?: string;
  preferredSide: PreferredSide;
  pad: number;
  rx: number;
  titleEn: string;
  titleKo: string;
  descEn: string;
  descKo: string;
  tipsEn: string[];
  tipsKo: string[];
  icon: React.ReactNode;
}

interface SpotRect {
  x: number;
  y: number;
  w: number;
  h: number;
  rx: number;
}

interface CardPos {
  left: number;
  top: number;
}

const GOAL_MINUTES = [10, 15, 20, 30] as const;

function rectsOverlapArea(
  ax: number,
  ay: number,
  aw: number,
  ah: number,
  bx: number,
  by: number,
  bw: number,
  bh: number
): number {
  const ox = Math.max(0, Math.min(ax + aw, bx + bw) - Math.max(ax, bx));
  const oy = Math.max(0, Math.min(ay + ah, by + bh) - Math.max(ay, by));
  return ox * oy;
}

function computeCoachmarkPos(
  spot: SpotRect | null,
  cardW: number,
  cardH: number,
  preferred: PreferredSide,
  vw: number,
  vh: number
): CardPos {
  const margin = 16;
  const gap = 14;
  const maxL = Math.max(margin, vw - cardW - margin);
  const maxT = Math.max(margin, vh - cardH - margin);

  if (!spot) {
    return {
      left: Math.round(Math.max(margin, (vw - cardW) / 2)),
      top: Math.round(Math.max(margin, (vh - cardH) / 2)),
    };
  }

  const clampL = (v: number) => Math.max(margin, Math.min(maxL, v));
  const clampT = (v: number) => Math.max(margin, Math.min(maxT, v));

  const spotCenterX = spot.x + spot.w / 2;
  const alignRight = spotCenterX > vw * 0.52;
  const horizLeft = clampL(alignRight ? spot.x + spot.w - cardW : spot.x);
  const vertTop = clampT(spot.y);

  const candidates: Array<{ left: number; top: number; fits: boolean }> = [];
  const order: PreferredSide[] = [
    preferred,
    preferred === 'bottom'
      ? 'top'
      : preferred === 'top'
      ? 'bottom'
      : preferred === 'left'
      ? 'right'
      : 'left',
    'bottom',
    'top',
    'right',
    'left',
  ];

  for (const side of order) {
    let rawL = horizLeft;
    let rawT = vertTop;
    if (side === 'bottom') {
      rawT = spot.y + spot.h + gap;
      rawL = horizLeft;
    } else if (side === 'top') {
      rawT = spot.y - cardH - gap;
      rawL = horizLeft;
    } else if (side === 'right') {
      rawL = spot.x + spot.w + gap;
      rawT = vertTop;
    } else {
      rawL = spot.x - cardW - gap;
      rawT = vertTop;
    }

    const fitsViewport =
      rawL >= margin &&
      rawL + cardW <= vw - margin &&
      rawT >= margin &&
      rawT + cardH <= vh - margin;

    candidates.push({
      left: Math.round(clampL(rawL)),
      top: Math.round(clampT(rawT)),
      fits: fitsViewport,
    });
  }

  for (const c of candidates) {
    if (!c.fits) continue;
    if (rectsOverlapArea(c.left, c.top, cardW, cardH, spot.x, spot.y, spot.w, spot.h) === 0) {
      return { left: c.left, top: c.top };
    }
  }

  let best = candidates[0];
  let bestOverlap = Infinity;
  for (const c of candidates) {
    const ov = rectsOverlapArea(c.left, c.top, cardW, cardH, spot.x, spot.y, spot.w, spot.h);
    if (ov < bestOverlap) {
      bestOverlap = ov;
      best = c;
    }
  }
  return { left: best.left, top: best.top };
}

export function StudioOnboardingDialog({
  open,
  onOpenChange,
  userName,
  initialFreeExplore,
  initialDailyGoalSeconds,
  isAudioRunning,
  onConnectAudio,
  onOpenAudioSetup,
  onComplete,
  onSkip,
}: StudioOnboardingDialogProps) {
  const { tr } = useLocale();
  const maskId = useId();
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [step, setStep] = useState(0);
  const [freeExploreMode, setFreeExploreMode] = useState(initialFreeExplore);
  const [goalMinutes, setGoalMinutes] = useState(() =>
    Math.max(10, Math.round(initialDailyGoalSeconds / 60) || 15)
  );
  const [connectingAudio, setConnectingAudio] = useState(false);
  const [spot, setSpot] = useState<SpotRect | null>(null);
  const [cardDims, setCardDims] = useState<{ w: number; h: number }>({ w: 432, h: 256 });
  const [cardPos, setCardPos] = useState<CardPos>({ left: 32, top: 80 });

  useEffect(() => {
    if (!open) return;
    setStep(0);
    setFreeExploreMode(initialFreeExplore);
    setGoalMinutes(Math.max(10, Math.round(initialDailyGoalSeconds / 60) || 15));
    (document.activeElement as HTMLElement | null)?.blur?.();
  }, [initialDailyGoalSeconds, initialFreeExplore, open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onSkip();
        onOpenChange(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onOpenChange, onSkip, open]);

  const steps: TourStepSpec[] = [
    {
      badge: 'STEP 01 / 04',
      target: 'lesson-header',
      preferredSide: 'bottom',
      pad: 8,
      rx: 14,
      titleEn: 'Lesson Focus & 4-Step Flow',
      titleKo: '레슨 제목과 4단계 정복 루프',
      descEn:
        'Click the lesson title anytime to browse all 39 lessons, or step cleanly across Listen → Wait → Tempo Loop → Exam.',
      descKo:
        '레슨 제목을 누르면 39강 커리큘럼이 열리고, 우측 단계 칩과 주황색 실행 버튼으로 청음 → 대기 → 템포 → 테스트를 순서대로 진행합니다.',
      tipsEn: [
        'Press Ctrl+K or / anywhere to search all 39 lessons and studio actions.',
        'Hover any ? badge to read concise tips without cluttering the screen.',
      ],
      tipsKo: [
        '어디서든 Ctrl+K 또는 / 키로 39개 레슨과 튜너·가이드를 즉시 검색할 수 있습니다.',
        '설명 문장 대신 ? 배지에 마우스를 올려 필요한 팁만 깔끔하게 확인하세요.',
      ],
      icon: <Sparkles className="size-4 text-primary" />,
    },
    {
      badge: 'STEP 02 / 04',
      target: 'fretboard-stage',
      preferredSide: 'bottom',
      pad: 6,
      rx: 24,
      titleEn: 'Recessed OLED Fretboard Stage',
      titleKo: '함몰형 다크 OLED 지판 무대',
      descEn:
        'Color-coded 4-finger guides, synced backing audio, tempo slider, and live pitch feedback stay anchored in this high-contrast stage.',
      descKo:
        '4손가락 색상 운지 가이드, 템포 슬라이더, 실시간 음정 미러가 눈부심 없는 다크 OLED 무대 안에 집중 배치되어 있습니다.',
      tipsEn: [
        'No guitar nearby? Click any fret directly or press keys 1–4 to play Wait Mode.',
        'Press Shift+S anytime for the full-screen zero-glare Stage Focus HUD.',
      ],
      tipsKo: [
        '기타가 없을 땐 지판 프렛을 클릭하거나 키보드 1~4를 눌러 바로 연주할 수 있습니다.',
        'Shift+S 키를 누르면 풀스크린 암실 스테이지 HUD로 전환됩니다.',
      ],
      icon: <Activity className="size-4 text-primary" />,
    },
    {
      badge: 'STEP 03 / 04',
      target: 'liquid-dock',
      preferredSide: 'top',
      pad: 6,
      rx: 28,
      titleEn: 'Liquid Glass Floating Dock',
      titleKo: '하단 리퀴드 글래스 플로팅 독',
      descEn:
        'Connect your guitar in one click, pull up the backing mixer sheet, or open Menu for themes, tuner, analytics, and guides.',
      descKo:
        '기타 오디오 연결, 반주 믹서·판정 기준 시트, 그리고 메뉴(테마·언어·튜너·모션 가이드·오류 로그)가 하단 독 3버튼에 깔끔하게 수납되어 있습니다.',
      tipsEn: [
        'The dock clears floating sheets automatically so your fretboard stays unobstructed.',
      ],
      tipsKo: [
        '믹서 시트를 열면 중앙 작업대가 위로 부드럽게 올라가 지판을 가리지 않습니다.',
      ],
      icon: <Layers className="size-4 text-primary" />,
    },
    {
      badge: 'STEP 04 / 04',
      preferredSide: 'bottom',
      pad: 0,
      rx: 16,
      titleEn: 'Personalize Your Path & Audio',
      titleKo: '학습 경로와 목표를 선택해 주세요',
      descEn:
        'Connect your guitar now or configure your progression path and daily goal—settings sync automatically.',
      descKo:
        '지금 바로 기타를 연결하거나 학습 경로와 하루 목표 시간을 고르시면 계정에 자동 저장됩니다.',
      tipsEn: [],
      tipsKo: [],
      icon: <Compass className="size-4 text-primary" />,
    },
  ];

  const currentStep = steps[step] ?? steps[0];

  useLayoutEffect(() => {
    if (!open) return;

    const measure = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      if (!currentStep.target) {
        setSpot(null);
        setCardPos(computeCoachmarkPos(null, cardDims.w, cardDims.h, currentStep.preferredSide, vw, vh));
        return;
      }
      const el = document.querySelector(`[data-tour="${currentStep.target}"]`) as HTMLElement | null;
      if (!el) {
        setSpot(null);
        setCardPos(computeCoachmarkPos(null, cardDims.w, cardDims.h, currentStep.preferredSide, vw, vh));
        return;
      }
      const r = el.getBoundingClientRect();
      const pad = currentStep.pad;
      const nextSpot: SpotRect = {
        x: Math.max(4, r.left - pad),
        y: Math.max(4, r.top - pad),
        w: Math.min(vw - 8, r.width + pad * 2),
        h: Math.min(vh - 8, r.height + pad * 2),
        rx: currentStep.rx,
      };
      setSpot(nextSpot);
      setCardPos(
        computeCoachmarkPos(nextSpot, cardDims.w, cardDims.h, currentStep.preferredSide, vw, vh)
      );
    };

    measure();
    const raf = window.requestAnimationFrame(measure);
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [cardDims.h, cardDims.w, currentStep.pad, currentStep.preferredSide, currentStep.rx, currentStep.target, open, step]);

  useLayoutEffect(() => {
    const node = cardRef.current;
    if (!node || typeof ResizeObserver === 'undefined') return;
    const obs = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (!rect) return;
      setCardDims((prev) =>
        Math.abs(prev.w - rect.width) > 2 || Math.abs(prev.h - rect.height) > 2
          ? { w: Math.round(rect.width), h: Math.round(rect.height) }
          : prev
      );
    });
    obs.observe(node);
    return () => obs.disconnect();
  }, [open, step]);

  if (!open || typeof document === 'undefined') return null;

  const displayName = userName?.trim();
  const handleConnectClick = async () => {
    setConnectingAudio(true);
    try {
      await onConnectAudio();
    } finally {
      setConnectingAudio(false);
    }
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={tr('FretMaster Studio Tour', 'FretMaster 스튜디오 투어')}
      className="fixed inset-0 z-[70]"
    >
      {/* Translucent Dimming Backdrop with SVG Cutout Mask */}
      <svg
        className="fixed inset-0 h-full w-full pointer-events-auto"
        aria-hidden="true"
        onClick={() => {
          onSkip();
          onOpenChange(false);
        }}
      >
        <defs>
          <mask id={maskId}>
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {spot && (
              <rect
                x={spot.x}
                y={spot.y}
                width={spot.w}
                height={spot.h}
                rx={spot.rx}
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(7, 10, 13, 0.62)"
          mask={`url(#${maskId})`}
        />
      </svg>

      {/* Tangerine Spotlight Focus Frame */}
      {spot && (
        <div
          className="pointer-events-none fixed border-2 border-primary shadow-[0_0_0_4px_rgba(255,107,36,0.20),0_12px_36px_rgba(255,107,36,0.30)] transition-all duration-200"
          style={{
            left: spot.x,
            top: spot.y,
            width: spot.w,
            height: spot.h,
            borderRadius: spot.rx,
          }}
        />
      )}

      {/* Collision-Free Floating Coachmark Card */}
      <div
        ref={cardRef}
        onClick={(e) => e.stopPropagation()}
        style={{ left: cardPos.left, top: cardPos.top }}
        className="fixed z-10 w-[min(460px,calc(100vw-32px))] rounded-[18px] border border-border bg-popover p-5 text-popover-foreground shadow-[0_28px_72px_rgba(11,14,16,0.34)] nr-popover-anim space-y-4"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <BrandFretLogo size={22} />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] font-semibold tracking-[0.12em] text-primary">
                  {currentStep.badge}
                </span>
                {currentStep.icon}
              </div>
              <h3 className="font-display text-base font-light tracking-[-0.02em] text-foreground truncate">
                {step === 0 && displayName
                  ? tr(`Welcome, ${displayName}`, `환영합니다, ${displayName}님`)
                  : tr(currentStep.titleEn, currentStep.titleKo)}
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              onSkip();
              onOpenChange(false);
            }}
            aria-label={tr('Close tour', '투어 닫기')}
            className="inline-flex size-7 items-center justify-center rounded-[6px] text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed">
          {tr(currentStep.descEn, currentStep.descKo)}
        </p>

        {step < 3 ? (
          <ul className="space-y-1.5 rounded-[12px] border border-border bg-secondary/45 px-3.5 py-2.5 text-[11.5px] text-foreground/90">
            {(tr('__en__', '__ko__') === '__en__' ? currentStep.tipsEn : currentStep.tipsKo).map(
              (tip, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="mt-1.5 size-1.5 rounded-full bg-primary shrink-0" />
                  <span className="leading-relaxed">{tip}</span>
                </li>
              )
            )}
          </ul>
        ) : (
          <div className="space-y-3.5">
            {/* Audio Connect Quick Action */}
            <div className="flex items-center justify-between gap-2 rounded-[12px] border border-border bg-secondary/45 px-3 py-2.5">
              <div className="flex items-center gap-2 min-w-0">
                <Mic className="size-4 text-primary shrink-0" />
                <span className="text-xs font-medium truncate">
                  {isAudioRunning
                    ? tr('Guitar DSP Live', '기타 입력 연결 완료')
                    : tr('Connect Guitar Audio', '실시간 기타 입력 연결')}
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <Button
                  type="button"
                  size="xs"
                  variant={isAudioRunning ? 'outline' : 'default'}
                  disabled={connectingAudio}
                  onClick={handleConnectClick}
                >
                  {isAudioRunning
                    ? tr('Connected', '연결됨')
                    : connectingAudio
                    ? tr('Connecting...', '연결 중...')
                    : tr('Connect', '연결')}
                </Button>
                <Button type="button" size="xs" variant="ghost" onClick={onOpenAudioSetup}>
                  {tr('Setup', '설정')}
                </Button>
              </div>
            </div>

            {/* Learning Path */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setFreeExploreMode(false)}
                className={`rounded-[12px] border p-2.5 text-left transition-colors ${
                  !freeExploreMode
                    ? 'border-primary bg-accent-soft/60'
                    : 'border-border bg-card hover:bg-secondary/50'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span>{tr('Guided Path', '단계별 해금')}</span>
                  {!freeExploreMode && <Check className="size-3.5 text-primary" />}
                </div>
                <div className="mt-1 text-[10.5px] text-muted-foreground leading-snug">
                  {tr('Start 1-1 & unlock', '1-1부터 차근차근')}
                </div>
              </button>

              <button
                type="button"
                onClick={() => setFreeExploreMode(true)}
                className={`rounded-[12px] border p-2.5 text-left transition-colors ${
                  freeExploreMode
                    ? 'border-primary bg-accent-soft/60'
                    : 'border-border bg-card hover:bg-secondary/50'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span>{tr('Free Explore', '39강 전체 오픈')}</span>
                  {freeExploreMode && <Check className="size-3.5 text-primary" />}
                </div>
                <div className="mt-1 text-[10.5px] text-muted-foreground leading-snug">
                  {tr('Open all 39 lessons', '모든 스케일·솔로 개방')}
                </div>
              </button>
            </div>

            {/* Daily Target */}
            <div className="grid grid-cols-4 gap-1.5">
              {GOAL_MINUTES.map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => setGoalMinutes(mins)}
                  className={`rounded-[8px] border py-1.5 font-mono text-[11px] font-semibold transition-colors ${
                    goalMinutes === mins
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-card text-foreground hover:bg-secondary/60'
                  }`}
                >
                  {tr(`${mins}m`, `${mins}분`)}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Footer Controls */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <div className="flex items-center gap-1.5">
            {steps.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setStep(idx)}
                aria-label={`Step ${idx + 1}`}
                className={`h-1.5 rounded-full transition-all ${
                  idx === step
                    ? 'w-5 bg-primary'
                    : idx < step
                    ? 'w-2 bg-primary/45'
                    : 'w-2 bg-border'
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-1.5">
            {step > 0 ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setStep((s) => Math.max(0, s - 1))}
              >
                <ArrowLeft className="size-3.5" />
                {tr('Back', '이전')}
              </Button>
            ) : (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  onSkip();
                  onOpenChange(false);
                }}
              >
                {tr('Skip', '건너뛰기')}
              </Button>
            )}

            {step < steps.length - 1 ? (
              <Button
                type="button"
                variant="signal"
                size="sm"
                onClick={() => setStep((s) => Math.min(steps.length - 1, s + 1))}
              >
                <span>{tr('Next', '다음')}</span>
                <ArrowRight className="size-3.5" />
              </Button>
            ) : (
              <Button
                type="button"
                variant="signal"
                size="sm"
                onClick={() =>
                  onComplete({
                    freeExploreMode,
                    dailyGoalSeconds: goalMinutes * 60,
                  })
                }
              >
                <Check className="size-3.5" />
                <span>{tr('Start Practicing', '연습 시작하기')}</span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
