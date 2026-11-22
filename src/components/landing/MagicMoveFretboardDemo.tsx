'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { STUDIO_SPRING } from '@/components/motion/StudioMotion';
import { Pause, Play } from 'lucide-react';

interface FretDotSpec {
  /** Guitar string 1..6 (1 = high e top row, 6 = low E bottom row) */
  string: number;
  /** Visible fret column between 4..9 (or 5..8 active) */
  fret: number;
  label: string;
  color: string;
  active: boolean;
  isRoot?: boolean;
}

interface MagicMoveStep {
  id: string;
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
    tabEn: '01 Interval',
    tabKo: '01 음정 감각',
    titleEn: 'Whole Step = 2 Frets',
    titleKo: '온음(Whole Step) = 2프렛 이동',
    insightEn: 'Hear and see A (Fret 5) to B (Fret 7) physically on string 6 before reading dots.',
    insightKo: '타브 숫자 암기 전에 6번줄 5프렛(A)과 7프렛(B)의 거리와 소리를 먼저 연결합니다.',
    dots: [
      { string: 6, fret: 5, label: 'R', color: '#5B7C99', active: true, isRoot: true },
      { string: 6, fret: 7, label: '2', color: '#B88648', active: true },
      { string: 5, fret: 7, label: '5', color: '#B88648', active: false },
      { string: 4, fret: 7, label: '8', color: '#B56357', active: false },
    ],
  },
  {
    id: 'power',
    tabEn: '02 Power Chord',
    tabKo: '02 파워코드',
    titleEn: 'A5 = Root + 5th + Octave',
    titleKo: 'A5 = 근음(R) + 5도 + 옥타브',
    insightEn: 'Shift one string inward and two frets up — verified polyphonically via 45-bin FFT.',
    insightKo: '한 줄 아래·두 프렛 오른쪽의 5도·옥타브 폼이 곧바로 v0.3.0 폴리포닉 코드 판정 대상입니다.',
    dots: [
      { string: 6, fret: 5, label: 'R', color: '#5B7C99', active: true, isRoot: true },
      { string: 5, fret: 7, label: '5', color: '#B88648', active: true },
      { string: 4, fret: 7, label: '8', color: '#B56357', active: true },
      { string: 3, fret: 5, label: 'b3', color: '#5C8D76', active: false },
    ],
  },
  {
    id: 'triad',
    tabEn: '03 Minor 3rd',
    tabKo: '03 3도 화성',
    titleEn: 'Add b3 -> Instant Minor Triad',
    titleKo: '3번줄 b3 추가 -> 단3화음(Am) 완성',
    insightEn: 'Adding C (Fret 5 on string 3) transforms bare A5 power into unmistakable Am color.',
    insightKo: '3번줄 5프렛(C) 하나가 더해지며 A5가 Am 3화음으로 바뀌고, 장·단3도 오판을 구분합니다.',
    dots: [
      { string: 6, fret: 5, label: 'R', color: '#5B7C99', active: true, isRoot: true },
      { string: 5, fret: 7, label: '5', color: '#B88648', active: true },
      { string: 4, fret: 7, label: '8', color: '#B56357', active: true },
      { string: 3, fret: 5, label: 'b3', color: '#5C8D76', active: true },
    ],
  },
  {
    id: 'box',
    tabEn: '04 Am ↔ C Box',
    tabKo: '04 Am ↔ C 박스',
    titleEn: 'One Box, Two Centers',
    titleKo: '하나의 박스, 두 개의 중심음 (Am ↔ C)',
    insightEn: 'Resolve onto A (Fret 5/7) for minor tension or C (Fret 8/5) for warm major home.',
    insightKo: '같은 5~8프렛 박스 안에서 A로 착지하면 마이너, C(8프렛)로 착지하면 밝은 메이저 해결이 됩니다.',
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
const FRET_COUNT = FRET_MAX - FRET_MIN; // 5 fret slots rendered cleanly

function getFretXPercent(fret: number): number {
  const idx = fret - FRET_MIN; // 1 => 5th fret slot
  return ((idx - 0.5) / FRET_COUNT) * 100;
}

function getStringYPercent(stringNum: number): number {
  const topPad = 14;
  const span = 72;
  return topPad + ((stringNum - 1) / 5) * span;
}

export function MagicMoveFretboardDemo({ locale }: { locale: 'en' | 'ko' }) {
  const [stepIdx, setStepIdx] = useState(0);
  const [autoPlay, setAutoPlay] = useState(true);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    if (!autoPlay || hovered) return;
    const timer = window.setInterval(() => {
      setStepIdx((prev) => (prev + 1) % STEPS.length);
    }, 3600);
    return () => window.clearInterval(timer);
  }, [autoPlay, hovered]);

  const activeStep = STEPS[stepIdx];

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-sm space-y-5"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-0.5">
          <div className="font-mono text-[10px] font-semibold tracking-wider uppercase text-primary">
            {locale === 'en' ? 'Interactive Keynote Neck · Frets 5–9' : '인터랙티브 지판 · 5–9프렛 영역'}
          </div>
          <h3 className="text-base sm:text-lg font-bold text-foreground">
            {locale === 'en' ? activeStep.titleEn : activeStep.titleKo}
          </h3>
        </div>

        <button
          type="button"
          onClick={() => setAutoPlay((v) => !v)}
          aria-label={
            autoPlay
              ? locale === 'en'
                ? 'Pause demo loop'
                : '데모 자동 전환 일시정지'
              : locale === 'en'
                ? 'Play demo loop'
                : '데모 자동 전환 재생'
          }
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors shrink-0"
        >
          {autoPlay ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
          <span>{autoPlay ? (locale === 'en' ? 'Auto' : '자동') : (locale === 'en' ? 'Paused' : '정지')}</span>
        </button>
      </div>

      {/* Magic Move Step Selector */}
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

      {/* SVG Neck + Framer Motion Magic Move Dots */}
      <div className="relative rounded-xl border border-border bg-background p-4 sm:p-5 overflow-hidden">
        <div className="flex">
          {/* String Labels (sub-pixel matched to SVG string Y coordinates) */}
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
              {/* Subtle Fret Markers on Fret 5 (slot 0.5) & Fret 7 (slot 2.5) */}
              <circle cx="50" cy="90" r="6" fill="var(--border)" opacity="0.7" />
              <circle cx="250" cy="90" r="6" fill="var(--border)" opacity="0.7" />
              <circle cx="450" cy="58" r="5" fill="var(--border)" opacity="0.7" />
              <circle cx="450" cy="122" r="5" fill="var(--border)" opacity="0.7" />

              {/* Fret Wires */}
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

              {/* 6 Strings with realistic progressive gauge */}
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

            {/* Magic Move Persistent Finger Nodes */}
            {activeStep.dots.map((dot, idx) => (
              <motion.div
                key={idx}
                initial={false}
                animate={{
                  left: `${getFretXPercent(dot.fret)}%`,
                  top: `${getStringYPercent(dot.string)}%`,
                  opacity: dot.active ? 1 : 0,
                  scale: dot.active ? 1 : 0.45,
                  backgroundColor: dot.color,
                }}
                transition={STUDIO_SPRING}
                className={`absolute -ml-4 -mt-4 w-8 h-8 rounded-full flex items-center justify-center font-mono text-xs font-bold text-white shadow-sm select-none ${
                  dot.isRoot ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''
                }`}
              >
                {dot.label}
              </motion.div>
            ))}
          </div>
        </div>

        {/* Fret Number Footer */}
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

      <div className="flex items-start gap-2.5 rounded-xl border border-border/80 bg-secondary/45 px-3.5 py-2.5">
        <span className="mt-1 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
        <p className="text-xs text-muted-foreground leading-relaxed">
          {locale === 'en' ? activeStep.insightEn : activeStep.insightKo}
        </p>
      </div>
    </div>
  );
}
