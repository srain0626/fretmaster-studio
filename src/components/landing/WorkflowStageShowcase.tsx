'use client';

import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { RadarChartSvg } from '@/components/icons/GuitarSvgIcons';
import { SILK_EASE, STUDIO_SPRING } from '@/components/motion/StudioMotion';
import {
  Activity,
  CheckCircle2,
  Headphones,
  Pause,
  Play,
  ShieldCheck,
} from 'lucide-react';

interface WorkflowStep {
  step: string;
  icon: typeof Headphones;
  titleEn: string;
  titleKo: string;
  descEn: string;
  descKo: string;
  stageTagEn: string;
  stageTagKo: string;
}

const WORKFLOW_STEPS: WorkflowStep[] = [
  {
    step: '01',
    icon: Headphones,
    titleEn: 'Audiate & Inspect Motion',
    titleKo: '원리 확인 & 가이드 청음',
    descEn:
      'Preview harmonic spacing and left-hand biomechanics with 0.75x Remotion guides synced to clean synth guitar cues.',
    descKo:
      '0.75배속 슬로우모션과 신스 가이드 음원으로 귀와 손 모양을 먼저 준비합니다.',
    stageTagEn: 'Remotion Curve Preview · 0.75x Slow Motion',
    stageTagKo: 'Remotion 피치 곡선 · 0.75배속 가이드',
  },
  {
    step: '02',
    icon: CheckCircle2,
    titleEn: 'Wait-for-Note Guided Practice',
    titleKo: '한 음씩 대기 정밀 실습',
    descEn:
      'Playback pauses calmly at tricky notes until AudioWorklet verifies the exact target string, fret, and pitch.',
    descKo:
      '정확한 음과 프렛을 짚을 때까지 반주가 기다려 초보자도 압박 없이 익힙니다.',
    stageTagEn: 'Zero-Pressure Wait Gate · String + Fret Lock',
    stageTagKo: '대기 모드 활성화 · 목표 음 인식 시 자동 진행',
  },
  {
    step: '03',
    icon: Activity,
    titleEn: 'Loop Range & +5 BPM Ramp',
    titleKo: '구간 반복 & 자동 템포 가속',
    descEn:
      'Isolate difficult bars over drum & bass backing loops that step up +5 BPM automatically once locked.',
    descKo:
      '어려운 마디만 잘라 드럼·베이스 반주와 반복하며 루프마다 +5 BPM씩 자동 가속합니다.',
    stageTagEn: 'Adaptive Loop · +5 BPM Auto Speed-Up',
    stageTagKo: '마디 구간 반복 · 매 루프 +5 BPM 자동 가속',
  },
  {
    step: '04',
    icon: ShieldCheck,
    titleEn: 'Graded Exam & Cloud Sync',
    titleKo: '승급 테스트 & 클라우드 저장',
    descEn:
      'Complete timed evaluations from Relaxed to Blind Studio tier and store S–C grades and skill radar stats safely.',
    descKo:
      '테스트 통과 후 취약 마디 분석과 S–C 등급, 5축 역량 그래프를 Google 계정에 저장합니다.',
    stageTagEn: 'Exam Report · Supabase Cloud Sync',
    stageTagKo: '승급 리포트 · 계정별 클라우드 동기화',
  },
];

export function WorkflowStageShowcase({ locale }: { locale: 'en' | 'ko' }) {
  const [stepIdx, setStepIdx] = useState(0);
  const [autoPlay, setAutoPlay] = useState(true);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    if (!autoPlay || hovered) return;
    const timer = window.setInterval(() => {
      setStepIdx((prev) => (prev + 1) % WORKFLOW_STEPS.length);
    }, 4500);
    return () => window.clearInterval(timer);
  }, [autoPlay, hovered]);

  const current = WORKFLOW_STEPS[stepIdx];

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="grid grid-cols-1 lg:grid-cols-[0.95fr_1.05fr] gap-6 items-stretch"
    >
      {/* Left: Keynote Vertical Stepper */}
      <div className="space-y-2.5 flex flex-col justify-between">
        {WORKFLOW_STEPS.map((item, i) => {
          const Icon = item.icon;
          const isActive = i === stepIdx;
          return (
            <button
              key={item.step}
              type="button"
              onClick={() => {
                setStepIdx(i);
                setAutoPlay(false);
              }}
              className={`relative w-full text-left rounded-2xl border p-4 sm:p-5 transition-colors ${
                isActive
                  ? 'border-primary/40 bg-card shadow-xs'
                  : 'border-border bg-card/60 hover:bg-card'
              }`}
            >
              {isActive && (
                <motion.span
                  layoutId="workflow-step-pill"
                  transition={STUDIO_SPRING}
                  className="absolute left-0 top-4 bottom-4 w-1 rounded-r-full bg-primary"
                />
              )}
              <div className="flex items-start justify-between gap-3 pl-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`font-mono text-xs font-bold ${
                        isActive ? 'text-primary' : 'text-muted-foreground'
                      }`}
                    >
                      STEP {item.step}
                    </span>
                    <span className="text-sm font-bold text-foreground">
                      {locale === 'en' ? item.titleEn : item.titleKo}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {locale === 'en' ? item.descEn : item.descKo}
                  </p>
                </div>
                <Icon
                  className={`w-4 h-4 shrink-0 mt-0.5 ${
                    isActive ? 'text-primary' : 'text-muted-foreground'
                  }`}
                />
              </div>
            </button>
          );
        })}
      </div>

      {/* Right: Animated Stage Canvas */}
      <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-sm flex flex-col justify-between space-y-5 min-h-[340px]">
        <div className="flex items-center justify-between gap-2 border-b border-border/70 pb-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary" />
            <span className="font-mono text-[11px] font-semibold text-foreground">
              {locale === 'en' ? current.stageTagEn : current.stageTagKo}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setAutoPlay((v) => !v)}
            aria-label={
              autoPlay
                ? locale === 'en'
                  ? 'Pause workflow showcase'
                  : '단계 자동 전환 정지'
                : locale === 'en'
                  ? 'Play workflow showcase'
                  : '단계 자동 전환 재생'
            }
            className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-2 py-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            {autoPlay ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            <span>{autoPlay ? (locale === 'en' ? 'Auto' : '자동') : (locale === 'en' ? 'Manual' : '수동')}</span>
          </button>
        </div>

        <div className="flex-1 flex items-center justify-center py-2">
          <AnimatePresence mode="wait">
            {stepIdx === 0 && (
              <motion.div
                key="stage-0"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25, ease: SILK_EASE }}
                className="w-full space-y-4"
              >
                <div className="rounded-xl border border-border bg-background p-4 space-y-3">
                  <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground">
                    <span>PITCH TRAJECTORY · +200c FULL BEND</span>
                    <span className="text-primary font-semibold">0.75x GUIDE</span>
                  </div>
                  <svg viewBox="0 0 360 110" className="w-full h-28 overflow-visible" aria-hidden="true">
                    <line x1="20" y1="84" x2="340" y2="84" stroke="var(--border)" strokeDasharray="4 4" />
                    <line x1="20" y1="28" x2="340" y2="28" stroke="var(--border)" strokeDasharray="4 4" />
                    <text x="20" y="99" className="fill-muted-foreground text-[9px] font-mono">D4 (293.7 Hz)</text>
                    <text x="20" y="21" className="fill-primary text-[9px] font-mono">TARGET E4 (329.6 Hz)</text>
                    <motion.path
                      d="M 35 84 C 125 84, 165 28, 255 28 L 325 28"
                      fill="none"
                      stroke="var(--primary)"
                      strokeWidth="3"
                      strokeLinecap="round"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 1.4, ease: SILK_EASE }}
                    />
                    <motion.circle
                      cx="255"
                      cy="28"
                      r="5.5"
                      fill="var(--primary)"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 1.0, ...STUDIO_SPRING }}
                    />
                  </svg>
                </div>
              </motion.div>
            )}

            {stepIdx === 1 && (
              <motion.div
                key="stage-1"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25, ease: SILK_EASE }}
                className="w-full space-y-4"
              >
                <div className="rounded-xl border border-border bg-background p-4 space-y-4">
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="text-muted-foreground">BAR 01 · WAIT-FOR-NOTE</span>
                    <span className="rounded-full bg-success/10 border border-success/30 px-2 py-0.5 text-success font-semibold">
                      {locale === 'en' ? 'A2 DETECTED -> ADVANCE' : 'A2 인식 완료 -> 다음 음 진행'}
                    </span>
                  </div>
                  <div className="relative grid grid-cols-4 gap-2 py-3">
                    {['6E · 0', '5A · 0', '5A · 2', '4D · 0'].map((note, idx) => (
                      <div
                        key={note}
                        className={`rounded-xl border p-3 text-center font-mono text-xs font-bold transition-colors ${
                          idx === 1
                            ? 'border-primary bg-accent-soft text-primary'
                            : idx === 0
                              ? 'border-success/40 bg-success/10 text-success'
                              : 'border-border bg-card text-muted-foreground'
                        }`}
                      >
                        {note}
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {stepIdx === 2 && (
              <motion.div
                key="stage-2"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25, ease: SILK_EASE }}
                className="w-full space-y-4"
              >
                <div className="rounded-xl border border-border bg-background p-4 space-y-4">
                  <div className="flex items-center justify-between font-mono text-xs">
                    <span className="text-muted-foreground">LOOP RANGE [BAR 1 – BAR 2]</span>
                    <span className="text-primary font-bold">+5 BPM / LOOP</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2.5 text-center">
                    {[
                      { loop: 'LOOP 1', bpm: '80 BPM', active: false },
                      { loop: 'LOOP 2', bpm: '85 BPM', active: false },
                      { loop: 'LOOP 3', bpm: '90 BPM', active: true },
                    ].map((l) => (
                      <div
                        key={l.loop}
                        className={`rounded-xl border p-3 space-y-1 ${
                          l.active
                            ? 'border-primary bg-accent-soft text-foreground'
                            : 'border-border bg-card text-muted-foreground'
                        }`}
                      >
                        <div className="font-mono text-[10px] font-semibold">{l.loop}</div>
                        <div className="font-mono tabular-nums text-base font-bold">{l.bpm}</div>
                      </div>
                    ))}
                  </div>
                  <div className="h-2 rounded-full bg-secondary overflow-hidden">
                    <motion.div
                      initial={{ width: '15%' }}
                      animate={{ width: '100%' }}
                      transition={{ duration: 2.2, repeat: Infinity, ease: 'linear' }}
                      className="h-full bg-primary rounded-full"
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {stepIdx === 3 && (
              <motion.div
                key="stage-3"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25, ease: SILK_EASE }}
                className="w-full grid grid-cols-1 sm:grid-cols-[0.85fr_1.15fr] items-center gap-4"
              >
                <div className="rounded-xl border border-border bg-background p-4 space-y-2 text-center sm:text-left">
                  <div className="font-mono text-[10px] font-semibold text-primary uppercase">
                    {locale === 'en' ? 'Exam Result' : '승급 테스트 결과'}
                  </div>
                  <div className="font-mono tabular-nums text-4xl font-bold text-foreground">
                    GRADE S
                  </div>
                  <div className="font-mono tabular-nums text-xs text-success font-semibold">
                    96 / 100 · ±14 ms
                  </div>
                  <div className="text-[11px] text-muted-foreground pt-1">
                    {locale === 'en'
                      ? 'Synced via Supabase PostgreSQL RLS'
                      : 'Supabase PostgreSQL 클라우드 저장 완료'}
                  </div>
                </div>

                <div className="flex items-center justify-center px-3 overflow-visible">
                  <RadarChartSvg
                    size={196}
                    locale={locale}
                    skills={{
                      mechanics: 92,
                      fretboardVision: 88,
                      rhythmTiming: 94,
                      earCopy: 82,
                      creativePhrasing: 85,
                    }}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex items-center justify-between text-[11px] text-muted-foreground border-t border-border/70 pt-3">
          <span>
            {locale === 'en'
              ? 'Supports Relaxed · Standard · Tight · Blind Studio tiers'
              : '느슨함 · 표준 · 엄격함 · 블라인드 마스터 4단계 판정'}
          </span>
          <span className="font-mono tabular-nums">
            0{stepIdx + 1} / 04
          </span>
        </div>
      </div>
    </div>
  );
}
