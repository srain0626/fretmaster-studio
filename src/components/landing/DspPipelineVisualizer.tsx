'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { STUDIO_SPRING } from '@/components/motion/StudioMotion';
import { Activity, Pause, Play, Radio, SlidersHorizontal } from 'lucide-react';

interface DspScenario {
  id: 'e2' | 'e5' | 'am';
  labelEn: string;
  labelKo: string;
  readout: string;
  verdictEn: string;
  verdictKo: string;
  verdictTone: 'success' | 'primary' | 'warning';
  insightEn: string;
  insightKo: string;
  highlightBins: number[];
  warnBins?: number[];
  bars: number[];
}

const SCENARIOS: DspScenario[] = [
  {
    id: 'e2',
    labelEn: 'Single Note · E2',
    labelKo: '단음 · E2 (6번 개방현)',
    readout: '82.4 Hz · ±1c',
    verdictEn: 'YIN LOCKED · ±1c',
    verdictKo: 'YIN 피치 고정 · ±1c',
    verdictTone: 'primary',
    insightEn:
      '2*tau subharmonic verification rejects 2nd-harmonic octave flips even on hollow bass plucks.',
    insightKo:
      '2배음 피크가 강한 6번 개방현에서도 2*tau 보정으로 옥타브 점프를 원천 차단합니다.',
    highlightBins: [1, 7],
    bars: [0.12, 0.96, 0.14, 0.08, 0.07, 0.1, 0.09, 0.56, 0.08, 0.06, 0.28, 0.05, 0.06, 0.08, 0.04, 0.05, 0.03, 0.04, 0.04, 0.03, 0.03, 0.03, 0.02, 0.02],
  },
  {
    id: 'e5',
    labelEn: 'Power Chord · E5',
    labelKo: '파워코드 · E5 스트럼',
    readout: 'E2 + B2 + E3 · 45-Bin FFT',
    verdictEn: 'CHORD PASS · 3/3',
    verdictKo: '코드 스트럼 통과 · 3/3',
    verdictTone: 'success',
    insightEn:
      '8192-point Hann Radix-2 FFT reads exact voiced MIDI bins (40, 47, 52), rejecting single-note 3rd-harmonic spoofs.',
    insightKo:
      '8192-pt Hann FFT가 실제 보이싱 MIDI(40·47·52)를 정밀 측정해 단음 배음 오인을 막습니다.',
    highlightBins: [1, 5, 8, 12],
    bars: [0.1, 0.92, 0.11, 0.08, 0.15, 0.84, 0.14, 0.18, 0.88, 0.11, 0.14, 0.12, 0.42, 0.1, 0.09, 0.11, 0.08, 0.07, 0.06, 0.05, 0.05, 0.04, 0.04, 0.03],
  },
  {
    id: 'am',
    labelEn: 'Am vs A Major + Mute Guard',
    labelKo: 'Am vs A 메이저 3도 · 뮤트 경고',
    readout: 'C4 (60) vs C#4 (61)',
    verdictEn: '3RD GUARD · UNMUTED 6E WARN',
    verdictKo: '장·단3도 구분 · 미뮤트 경고',
    verdictTone: 'warning',
    insightEn:
      'Separates minor b3 (C4) from major 3rd (C#4) and flags unmuted 6E open-string bleed in C5 shapes.',
    insightKo:
      'b3(Am)와 장3도(A)의 반음 차이를 판별하고, 뮤트되지 않은 6번 개방현 공명을 즉시 경고합니다.',
    highlightBins: [4, 9, 13, 16],
    warnBins: [1],
    bars: [0.09, 0.68, 0.1, 0.11, 0.86, 0.14, 0.09, 0.12, 0.14, 0.78, 0.16, 0.11, 0.14, 0.9, 0.12, 0.08, 0.64, 0.11, 0.09, 0.07, 0.06, 0.05, 0.04, 0.03],
  },
];

const PIPELINE_NODES = [
  {
    step: '01',
    titleEn: 'Hi-Z / Mic Input',
    titleKo: '오디오 인터페이스 / 마이크 입력',
    spec: 'ch1 | ch2 | mono · ±18 dB trim',
  },
  {
    step: '02',
    titleEn: '128-Sample AudioWorklet',
    titleKo: '전용 스레드 AudioWorklet',
    spec: '4096 ring · zero-GC hop 256',
  },
  {
    step: '03',
    titleEn: 'YIN + 8192-pt FFT',
    titleKo: 'YIN 단음 + 8192-pt 폴리포닉 FFT',
    spec: '65–1450 Hz · 45-bin MIDI 40..84',
  },
  {
    step: '04',
    titleEn: '4-Stage Scoring & Ping',
    titleKo: '4단계 난이도 판정 & 핑 보정',
    spec: 'Relaxed..Studio · 1800 Hz loopback',
  },
];

export function DspPipelineVisualizer({ locale }: { locale: 'en' | 'ko' }) {
  const [scenarioIdx, setScenarioIdx] = useState(1);
  const [autoPlay, setAutoPlay] = useState(true);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    if (!autoPlay || hovered) return;
    const timer = window.setInterval(() => {
      setScenarioIdx((prev) => (prev + 1) % SCENARIOS.length);
    }, 4200);
    return () => window.clearInterval(timer);
  }, [autoPlay, hovered]);

  const active = SCENARIOS[scenarioIdx];

  const verdictBadgeClass =
    active.verdictTone === 'success'
      ? 'border-success/35 bg-success/10 text-success'
      : active.verdictTone === 'warning'
        ? 'border-warning/35 bg-warning/10 text-warning'
        : 'border-primary/35 bg-accent-soft text-primary';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[0.92fr_1.08fr] gap-6 items-start">
      {/* Left: Signal Flow Architecture */}
      <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            <span className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">
              {locale === 'en' ? 'Off-Main-Thread Signal Pipeline' : '메인 스레드 분리 오디오 파이프라인'}
            </span>
          </div>
          <span className="font-mono text-[11px] font-semibold text-primary">v0.3.0</span>
        </div>

        <div className="relative pl-6 space-y-3">
          {/* Vertical Spine + Animated Pulse Packet */}
          <div className="absolute left-2.5 top-3 bottom-3 w-px bg-border overflow-hidden" aria-hidden="true">
            <motion.div
              animate={{ y: ['-20%', '120%'] }}
              transition={{ duration: 2.6, repeat: Infinity, ease: 'linear' }}
              className="w-full h-10 bg-primary"
            />
          </div>

          {PIPELINE_NODES.map((node) => (
            <div
              key={node.step}
              className="relative rounded-xl border border-border/80 bg-background px-4 py-3 flex items-center justify-between gap-3"
            >
              <span
                aria-hidden="true"
                className="absolute -left-[19px] top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full border-2 border-primary bg-card"
              />
              <div className="space-y-0.5 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] font-bold text-primary">
                    {node.step}
                  </span>
                  <span className="text-xs sm:text-sm font-semibold text-foreground truncate">
                    {locale === 'en' ? node.titleEn : node.titleKo}
                  </span>
                </div>
                <div className="font-mono text-[11px] text-muted-foreground truncate">
                  {node.spec}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* v0.3.0 Calibration Callouts */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
          <div className="rounded-xl border border-border/80 bg-secondary/45 p-3 space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
              <Radio className="w-3.5 h-3.5 text-primary shrink-0" />
              <span>
                {locale === 'en' ? '1-Click Loopback Ping' : '원클릭 음향 핑 보정'}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              {locale === 'en'
                ? '4 x 1800 Hz pings calibrate audio latency automatically with outlier trimming.'
                : '1800 Hz 4회 핑으로 오디오 인터페이스 왕복 레이턴시를 자동 측정합니다.'}
            </p>
          </div>

          <div className="rounded-xl border border-border/80 bg-secondary/45 p-3 space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
              <SlidersHorizontal className="w-3.5 h-3.5 text-primary shrink-0" />
              <span>
                {locale === 'en' ? 'Per-Bar Adaptive Offset' : '마디별 자동 오차 학습'}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              {locale === 'en'
                ? 'Every completed bar narrows timing offset estimation cleanly up to 64 samples.'
                : '한 마디를 연주할 때마다 타이밍 오프셋을 최대 64샘플까지 점진 보정합니다.'}
            </p>
          </div>
        </div>
      </div>

      {/* Right: Interactive Polyphonic & Pitch Spectrum Card */}
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-sm space-y-5"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="space-y-0.5">
            <div className="font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {locale === 'en' ? 'Live Judgment Simulator' : '실시간 스펙트럼 · 판정 시뮬레이터'}
            </div>
            <div className="font-mono tabular-nums text-sm sm:text-base font-bold text-foreground">
              {active.readout}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`rounded-full border px-2.5 py-1 font-mono text-[10px] font-bold tracking-wide ${verdictBadgeClass}`}
            >
              {locale === 'en' ? active.verdictEn : active.verdictKo}
            </span>
            <button
              type="button"
              onClick={() => setAutoPlay((v) => !v)}
              aria-label={
                autoPlay
                  ? locale === 'en'
                    ? 'Pause spectrum cycle'
                    : '스펙트럼 순환 정지'
                  : locale === 'en'
                    ? 'Resume spectrum cycle'
                    : '스펙트럼 순환 재생'
              }
              className="inline-flex items-center justify-center w-7 h-7 rounded-lg border border-border bg-background text-muted-foreground hover:text-foreground transition-colors"
            >
              {autoPlay ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            </button>
          </div>
        </div>

        {/* Scenario Switcher Tabs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 rounded-xl bg-secondary/70 p-1">
          {SCENARIOS.map((sc, i) => {
            const isSelected = i === scenarioIdx;
            return (
              <button
                key={sc.id}
                type="button"
                onClick={() => {
                  setScenarioIdx(i);
                  setAutoPlay(false);
                }}
                className={`relative rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-colors ${
                  isSelected ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {isSelected && (
                  <motion.span
                    layoutId="dsp-scenario-pill"
                    transition={STUDIO_SPRING}
                    className="absolute inset-0 rounded-lg bg-card border border-border shadow-xs"
                  />
                )}
                <span className="relative z-10 whitespace-nowrap">
                  {locale === 'en' ? sc.labelEn : sc.labelKo}
                </span>
              </button>
            );
          })}
        </div>

        {/* 24-Bin Spectrum Bar Chart */}
        <div className="rounded-xl border border-border bg-background p-4 space-y-2.5">
          <div className="flex items-center justify-between font-mono text-[10px] text-muted-foreground">
            <span>45-BIN NOTE SPECTRUM (MIDI 40..84)</span>
            <span>THRESHOLD 22</span>
          </div>
          <div className="h-36 sm:h-40 flex items-end gap-1 pt-2 border-b border-border/80 pb-1">
            {active.bars.map((val, idx) => {
              const isWarn = active.warnBins?.includes(idx);
              const isHighlight = active.highlightBins.includes(idx);
              const barColorClass = isWarn
                ? 'bg-warning'
                : isHighlight
                  ? 'bg-primary'
                  : 'bg-muted-foreground/25';

              return (
                <div key={idx} className="flex-1 h-full flex items-end">
                  <motion.div
                    initial={false}
                    animate={{ height: `${Math.round(val * 100)}%` }}
                    transition={STUDIO_SPRING}
                    className={`w-full rounded-t-sm ${barColorClass}`}
                  />
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-between font-mono text-[10px] text-muted-foreground">
            <span>6E (40)</span>
            <span>5A (45)</span>
            <span>4D (50)</span>
            <span>3G (55)</span>
            <span>2B (59)</span>
            <span>1e (64)</span>
          </div>
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed">
          {locale === 'en' ? active.insightEn : active.insightKo}
        </p>
      </div>
    </div>
  );
}
