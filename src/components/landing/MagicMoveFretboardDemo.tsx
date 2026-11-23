'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { STUDIO_SPRING } from '@/components/motion/StudioMotion';
import { guitarSynthEngine } from '@/lib/guitarSynthEngine';
import type { GuitarString } from '@/types/guitar';
import { ArrowRight, Pause, Play, Volume2 } from 'lucide-react';

interface FretDotSpec {
  /** Guitar string 1..6 (1 = high e top row, 6 = low E bottom row) */
  string: GuitarString;
  /** Visible fret column between 4..9 (or 5..8 active) */
  fret: number;
  label: string;
  color: string;
  active: boolean;
  isRoot?: boolean;
}

interface MagicMoveStep {
  id: string;
  lessonId: string;
  lessonCode: string;
  tabEn: string;
  tabKo: string;
  titleEn: string;
  titleKo: string;
  insightEn: string;
  insightKo: string;
  dots: [FretDotSpec, FretDotSpec, FretDotSpec, FretDotSpec];
}

const STEPS: MagicMoveStep[] = [
  {
    id: 'interval',
    lessonId: 'm1-2',
    lessonCode: '1-2',
    tabEn: '01 Distance',
    tabKo: '01 음정 거리',
    titleEn: '2 Frets = 1 Whole Step',
    titleKo: '손가락 두 칸 이동 = 온음(Whole Step)',
    insightEn:
      'Before reading complex sheet music, connect physical finger distance on one string directly to how pitch rises.',
    insightKo:
      '어려운 악보 기호 대신, 6번줄 5프렛(A)에서 7프렛(B)으로 이동하는 손끝의 거리와 소리를 먼저 연결합니다.',
    dots: [
      { string: 6, fret: 5, label: 'R', color: '#5B7C99', active: true, isRoot: true },
      { string: 6, fret: 7, label: '2', color: '#B88648', active: true },
      { string: 5, fret: 7, label: '5', color: '#B88648', active: false },
      { string: 4, fret: 7, label: '8', color: '#B56357', active: false },
    ],
  },
  {
    id: 'power',
    lessonId: 'm3-1',
    lessonCode: '3-1',
    tabEn: '02 Power Chord',
    tabKo: '02 파워코드',
    titleEn: 'Rock Foundation: Root + 5th + Octave',
    titleKo: '록 사운드의 핵심: 근음 + 5도 + 옥타브',
    insightEn:
      'Move one string down and two frets right—this single shape unlocks hundreds of rock songs anywhere on the neck.',
    insightKo:
      '근음에서 한 줄 아래·두 칸 오른쪽 모양 하나만 익히면 지판 어디서든 단단한 록 파워코드를 연주할 수 있습니다.',
    dots: [
      { string: 6, fret: 5, label: 'R', color: '#5B7C99', active: true, isRoot: true },
      { string: 5, fret: 7, label: '5', color: '#B88648', active: true },
      { string: 4, fret: 7, label: '8', color: '#B56357', active: true },
      { string: 3, fret: 5, label: 'b3', color: '#5C8D76', active: false },
    ],
  },
  {
    id: 'triad',
    lessonId: 'm3-3',
    lessonCode: '3-3',
    tabEn: '03 Mood Note',
    tabKo: '03 감정 채우기',
    titleEn: 'Add One Note to Create Minor Emotion',
    titleKo: '음 하나로 완성되는 애절한 마이너 화음',
    insightEn:
      'Adding a single minor 3rd note on string 3 turns a neutral power chord into an expressive A minor chord.',
    insightKo:
      '파워코드 아래 3번줄에 단3도 음 하나만 더하면 묵직했던 울림이 감성적인 A 마이너 코드로 즉시 바뀝니다.',
    dots: [
      { string: 6, fret: 5, label: 'R', color: '#5B7C99', active: true, isRoot: true },
      { string: 5, fret: 7, label: '5', color: '#B88648', active: true },
      { string: 4, fret: 7, label: '8', color: '#B56357', active: true },
      { string: 3, fret: 5, label: 'b3', color: '#5C8D76', active: true },
    ],
  },
  {
    id: 'box',
    lessonId: 'm4-2',
    lessonCode: '4-2',
    tabEn: '04 Two Moods',
    tabKo: '04 나란한조',
    titleEn: 'Same Scale Box, Two Completely Different Moods',
    titleKo: '하나의 스케일 박스로 내는 두 가지 분위기',
    insightEn:
      'Inside the exact same 5–8 fret box, landing on A feels dark and dramatic while landing on C feels bright and warm.',
    insightKo:
      '새 모양을 또 외울 필요 없이, 같은 5~8프렛 박스도 A로 끝내면 강렬한 마이너, C로 끝내면 따뜻한 메이저 솔로가 됩니다.',
    dots: [
      { string: 6, fret: 5, label: 'A', color: '#E85D3F', active: true, isRoot: true },
      { string: 6, fret: 8, label: 'C', color: '#5B7C99', active: true, isRoot: true },
      { string: 4, fret: 7, label: 'A', color: '#B88648', active: true },
      { string: 3, fret: 5, label: 'C', color: '#5C8D76', active: true },
    ],
  },
];

const FRET_MIN = 4;
const FRET_MAX = 9;
const FRET_COUNT = FRET_MAX - FRET_MIN;

function getFretXPercent(fret: number): number {
  const idx = fret - FRET_MIN;
  return ((idx - 0.5) / FRET_COUNT) * 100;
}

function getStringYPercent(stringNum: number): number {
  const topPad = 14;
  const span = 72;
  return topPad + ((stringNum - 1) / 5) * span;
}

export function MagicMoveFretboardDemo({
  locale,
  onStartLesson,
}: {
  locale: 'en' | 'ko';
  onStartLesson?: (lessonId: string) => void;
}) {
  const [stepIdx, setStepIdx] = useState(0);
  const [autoPlay, setAutoPlay] = useState(true);
  const [hovered, setHovered] = useState(false);
  const [ringingIdx, setRingingIdx] = useState<number | null>(null);
  const timersRef = useRef<number[]>([]);

  useEffect(() => {
    return () => {
      for (const id of timersRef.current) window.clearTimeout(id);
    };
  }, []);

  useEffect(() => {
    if (!autoPlay || hovered) return;
    const timer = window.setInterval(() => {
      setStepIdx((prev) => (prev + 1) % STEPS.length);
    }, 3800);
    return () => window.clearInterval(timer);
  }, [autoPlay, hovered]);

  const activeStep = STEPS[stepIdx];

  const playStepPreview = useCallback((step: MagicMoveStep) => {
    for (const id of timersRef.current) window.clearTimeout(id);
    timersRef.current = [];
    const activeDots = step.dots
      .map((dot, idx) => ({ dot, idx }))
      .filter((item) => item.dot.active);

    const staggerMs = step.id === 'interval' || step.id === 'box' ? 280 : 65;
    const preset = step.id === 'power' ? 'crunch' : 'clean';

    activeDots.forEach(({ dot, idx }, order) => {
      const tid = window.setTimeout(() => {
        setRingingIdx(idx);
        guitarSynthEngine.playSingleGuitarNote(dot.string, dot.fret, preset, 0.7, 0, 'normal');
      }, order * staggerMs);
      timersRef.current.push(tid);
    });

    const clearTid = window.setTimeout(() => {
      setRingingIdx(null);
    }, activeDots.length * staggerMs + 500);
    timersRef.current.push(clearTid);
  }, []);

  const playSingleDot = useCallback((dot: FretDotSpec, idx: number, stepId: string) => {
    if (!dot.active) return;
    setAutoPlay(false);
    setRingingIdx(idx);
    const preset = stepId === 'power' ? 'crunch' : 'clean';
    guitarSynthEngine.playSingleGuitarNote(dot.string, dot.fret, preset, 0.65, 0, 'normal');
    const tid = window.setTimeout(() => setRingingIdx(null), 450);
    timersRef.current.push(tid);
  }, []);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-sm space-y-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-0.5">
          <div className="font-mono text-[10px] font-semibold tracking-wider uppercase text-primary">
            {locale === 'en'
              ? 'Interactive Fretboard · Click Notes to Hear'
              : '인터랙티브 지판 체험 · 음표를 눌러 소리를 들어보세요'}
          </div>
          <h3 className="text-base sm:text-lg font-bold text-foreground">
            {locale === 'en' ? activeStep.titleEn : activeStep.titleKo}
          </h3>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => {
              setAutoPlay(false);
              playStepPreview(activeStep);
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-primary/35 bg-accent-soft px-2.5 py-1.5 text-[11px] font-semibold text-primary hover:opacity-90 transition-opacity"
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span>{locale === 'en' ? 'Hear Guitar' : '소리 들어보기'}</span>
          </button>

          <button
            type="button"
            onClick={() => setAutoPlay((v) => !v)}
            aria-label={
              autoPlay
                ? locale === 'en'
                  ? 'Pause demo loop'
                  : '자동 전환 일시정지'
                : locale === 'en'
                  ? 'Play demo loop'
                  : '자동 전환 재생'
            }
            className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-2 py-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            {autoPlay ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* Step Selector */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 rounded-xl bg-secondary/70 p-1">
        {STEPS.map((step, i) => {
          const isCurrent = i === stepIdx;
          return (
            <button
              key={step.id}
              type="button"
              onClick={() => {
                setStepIdx(i);
                setAutoPlay(false);
                playStepPreview(step);
              }}
              className={`relative rounded-lg px-2 py-1.5 text-[11px] font-semibold transition-colors ${
                isCurrent ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {isCurrent && (
                <motion.span
                  layoutId="magic-move-step-pill"
                  transition={STUDIO_SPRING}
                  className="absolute inset-0 rounded-lg bg-card border border-border shadow-xs"
                />
              )}
              <span className="relative z-10 font-mono whitespace-nowrap">
                {locale === 'en' ? step.tabEn : step.tabKo}
              </span>
            </button>
          );
        })}
      </div>

      {/* SVG Neck + Persistent Finger Nodes */}
      <div className="relative rounded-xl border border-border bg-background p-4 sm:p-5 overflow-hidden">
        <div className="flex">
          <div className="relative w-7 h-44 sm:h-48 shrink-0 select-none">
            {['1e', '2B', '3G', '4D', '5A', '6E'].map((name, idx) => (
              <span
                key={name}
                style={{ top: `${getStringYPercent(idx + 1)}%` }}
                className="absolute right-2 -translate-y-1/2 font-mono text-[10px] leading-none font-semibold text-muted-foreground"
              >
                {name}
              </span>
            ))}
          </div>

          <div className="relative flex-1 h-44 sm:h-48">
            <svg
              viewBox="0 0 500 180"
              preserveAspectRatio="none"
              className="w-full h-full block"
              aria-hidden="true"
            >
              <circle cx="50" cy="90" r="6" fill="var(--border)" opacity="0.7" />
              <circle cx="250" cy="90" r="6" fill="var(--border)" opacity="0.7" />
              <circle cx="450" cy="58" r="5" fill="var(--border)" opacity="0.7" />
              <circle cx="450" cy="122" r="5" fill="var(--border)" opacity="0.7" />

              {[0, 100, 200, 300, 400, 500].map((x, idx) => (
                <line
                  key={x}
                  x1={x}
                  y1={20}
                  x2={x}
                  y2={160}
                  stroke="var(--border)"
                  strokeWidth={idx === 0 ? 3 : 1.5}
                />
              ))}

              {[1, 2, 3, 4, 5, 6].map((strNum) => {
                const y = (getStringYPercent(strNum) / 100) * 180;
                const strokeWidth = 0.8 + (strNum - 1) * 0.35;
                return (
                  <line
                    key={strNum}
                    x1={0}
                    y1={y}
                    x2={500}
                    y2={y}
                    stroke="var(--muted-foreground)"
                    strokeOpacity={0.45}
                    strokeWidth={strokeWidth}
                  />
                );
              })}
            </svg>

            {activeStep.dots.map((dot, idx) => {
              const isRinging = ringingIdx === idx;
              return (
                <motion.button
                  key={idx}
                  type="button"
                  disabled={!dot.active}
                  onClick={() => playSingleDot(dot, idx, activeStep.id)}
                  initial={false}
                  animate={{
                    left: `${getFretXPercent(dot.fret)}%`,
                    top: `${getStringYPercent(dot.string)}%`,
                    opacity: dot.active ? 1 : 0,
                    scale: dot.active ? (isRinging ? 1.16 : 1) : 0.45,
                    backgroundColor: dot.color,
                  }}
                  transition={STUDIO_SPRING}
                  className={`absolute -ml-4 -mt-4 w-8 h-8 rounded-full flex items-center justify-center font-mono text-xs font-bold text-white shadow-sm select-none ${
                    dot.active ? 'cursor-pointer' : 'pointer-events-none'
                  } ${
                    dot.isRoot ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''
                  }`}
                >
                  {dot.label}
                </motion.button>
              );
            })}
          </div>
        </div>

        <div className="flex pl-7 pt-2">
          {[5, 6, 7, 8, 9].map((fret) => (
            <div
              key={fret}
              className="flex-1 text-center font-mono text-[10px] font-medium text-muted-foreground"
            >
              {fret}F
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-border/80 bg-secondary/45 px-3.5 py-3">
        <div className="flex items-start gap-2.5">
          <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            {locale === 'en' ? activeStep.insightEn : activeStep.insightKo}
          </p>
        </div>

        {onStartLesson && (
          <button
            type="button"
            onClick={() => onStartLesson(activeStep.lessonId)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-card border border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:border-primary/50 hover:text-primary transition-colors shrink-0 self-end sm:self-center"
          >
            <span>
              {locale === 'en'
                ? `Try Lesson ${activeStep.lessonCode}`
                : `${activeStep.lessonCode} 레슨 해보기`}
            </span>
            <ArrowRight className="w-3.5 h-3.5 text-primary" />
          </button>
        )}
      </div>
    </div>
  );
}
