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
  Trophy,
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
    titleEn: 'Watch Hand Posture & Hear the Goal',
    titleKo: '손 모양 가이드 & 모범 사운드 듣기',
    descEn:
      'Check wrist angle, finger placement, and harmonic reason in 0.75x slow motion before playing your first note.',
    descKo:
      '연주에 들어가기 전, 0.75배속 슬로우모션 자세 가이드와 기타 사운드로 손 모양과 화성 원리를 편안하게 익힙니다.',
    stageTagEn: 'Step 1 · Slow-Motion Posture & Ear Guide',
    stageTagKo: '1단계 · 슬로우모션 자세 & 화성 가이드',
  },
  {
    step: '02',
    icon: CheckCircle2,
    titleEn: 'Practice One Note at a Time (Wait Mode)',
    titleKo: '맞출 때까지 기다려주는 한 음씩 실습',
    descEn:
      'Never get left behind by a fast backing track. The score waits calmly until you ring the right string and fret.',
    descKo:
      '빠른 반주에 쫓기지 마세요. 내가 정확한 줄과 프렛을 울릴 때까지 악보가 그 자리에서 차분하게 기다려줍니다.',
    stageTagEn: 'Step 2 · Zero-Pressure Wait-for-Note Practice',
    stageTagKo: '2단계 · 압박 없는 대기 실습 모드',
  },
  {
    step: '03',
    icon: Activity,
    titleEn: 'Loop Tricky Bars & Build Speed (+5 BPM)',
    titleKo: '어려운 마디 집중 반복 & +5 BPM 자동 가속',
    descEn:
      'Highlight just 1–2 tough bars over drums and bass, stepping up tempo automatically as your fingers relax.',
    descKo:
      '손이 꼬이는 한두 마디만 지정해 드럼·베이스 반주 위에서 반복하고, 익숙해지면 루프마다 조금씩 속도를 높입니다.',
    stageTagEn: 'Step 3 · Focused Bar Loop & Tempo Builder',
    stageTagKo: '3단계 · 구간 반복 & 단계별 템포 업',
  },
  {
    step: '04',
    icon: Trophy,
    titleEn: 'Play Through, Unlock Next & Track Growth',
    titleKo: '완주 도전 · 약점 진단 & 다음 레슨 해금',
    descEn:
      'See which bars rushed or dragged, earn your S–C mastery grade, and pick up right where you left off anytime.',
    descKo:
      '완주 후 흔들린 마디와 박자 습관을 한눈에 확인하고, 내 계정에 자동 저장된 진도로 다음 레슨을 이어갑니다.',
    stageTagEn: 'Step 4 · Weak-Bar Coaching & Saved Progress',
    stageTagKo: '4단계 · 완주 리포트 & 내 진도 자동 저장',
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
      {/* Left: Vertical Stepper */}
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
            <span className="text-xs font-semibold text-foreground">
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
            <span>
              {autoPlay ? (locale === 'en' ? 'Auto' : '자동') : locale === 'en' ? 'Manual' : '수동'}
            </span>
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
                className="w-full space-y-3"
              >
                <div className="rounded-xl border border-border bg-background p-4 space-y-3">
                  <div className="flex items-center justify-between text-[11px] font-medium text-muted-foreground">
                    <span>
                      {locale === 'en'
                        ? '3-Finger Support Bend Guide'
                        : '3손가락 서포트 벤딩 자세 가이드'}
                    </span>
                    <span className="font-mono text-primary font-semibold">0.75x SLOW</span>
                  </div>
                  <svg
                    viewBox="0 0 360 110"
                    className="w-full h-28 overflow-visible"
                    aria-hidden="true"
                  >
                    <line
                      x1="20"
                      y1="84"
                      x2="340"
                      y2="84"
                      stroke="var(--border)"
                      strokeDasharray="4 4"
                    />
                    <line
                      x1="20"
                      y1="28"
                      x2="340"
                      y2="28"
                      stroke="var(--border)"
                      strokeDasharray="4 4"
                    />
                    <text x="20" y="99" className="fill-muted-foreground text-[10px] font-sans">
                      {locale === 'en' ? 'Start Note (D)' : '시작 음 (7프렛 D)'}
                    </text>
                    <text x="20" y="20" className="fill-primary text-[10px] font-semibold font-sans">
                      {locale === 'en' ? 'Target Pitch (Whole-Step Up)' : '목표 음정 (한 음 위 E 안착)'}
                    </text>
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
                <p className="text-xs text-muted-foreground px-1">
                  {locale === 'en'
                    ? 'Every lesson pairs a harmony visual with a posture animation so you never guess how to hold the pick or neck.'
                    : '모든 레슨에 화성 원리와 손목·운지 교정 가이드가 함께 들어 있어 혼자서도 바른 자세로 시작할 수 있습니다.'}
                </p>
              </motion.div>
            )}

            {stepIdx === 1 && (
              <motion.div
                key="stage-1"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25, ease: SILK_EASE }}
                className="w-full space-y-3"
              >
                <div className="rounded-xl border border-border bg-background p-4 space-y-4">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-muted-foreground">
                      {locale === 'en' ? 'Bar 1 · Waiting for Your Guitar' : '1마디 · 내 기타 입력 대기 중'}
                    </span>
                    <span className="rounded-full bg-success/10 border border-success/30 px-2.5 py-0.5 text-[11px] text-success font-semibold">
                      {locale === 'en' ? 'Matched -> Next Note' : '정확히 울림 -> 다음 음 이동'}
                    </span>
                  </div>
                  <div className="relative grid grid-cols-4 gap-2 py-2">
                    {[
                      { tab: '6번줄 · 0F', en: '6E · Open', state: 'done' },
                      { tab: '5번줄 · 0F', en: '5A · Open', state: 'active' },
                      { tab: '5번줄 · 2F', en: '5A · 2F', state: 'next' },
                      { tab: '4번줄 · 0F', en: '4D · Open', state: 'next' },
                    ].map((note, idx) => (
                      <div
                        key={idx}
                        className={`rounded-xl border p-3 text-center font-mono text-xs font-bold transition-colors ${
                          note.state === 'active'
                            ? 'border-primary bg-accent-soft text-primary'
                            : note.state === 'done'
                              ? 'border-success/40 bg-success/10 text-success'
                              : 'border-border bg-card text-muted-foreground'
                        }`}
                      >
                        {locale === 'en' ? note.en : note.tab}
                      </div>
                    ))}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground px-1">
                  {locale === 'en'
                    ? 'Take all the time you need to place your fingers cleanly before moving to rhythm loops.'
                    : '손가락을 천천히 프렛 뒤에 올리고 맑은 소리를 낼 때까지 스튜디오가 재촉하지 않고 기다려줍니다.'}
                </p>
              </motion.div>
            )}

            {stepIdx === 2 && (
              <motion.div
                key="stage-2"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25, ease: SILK_EASE }}
                className="w-full space-y-3"
              >
                <div className="rounded-xl border border-border bg-background p-4 space-y-4">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-muted-foreground">
                      {locale === 'en' ? 'Selected Bars 1 – 2 Loop' : '1 – 2마디 집중 구간 반복'}
                    </span>
                    <span className="font-mono text-primary font-bold">+5 BPM AUTO</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2.5 text-center">
                    {[
                      {
                        loopEn: 'Warm-up',
                        loopKo: '1회차 적응',
                        bpm: '75 BPM',
                        active: false,
                      },
                      {
                        loopEn: 'Steady',
                        loopKo: '2회차 안정',
                        bpm: '80 BPM',
                        active: false,
                      },
                      {
                        loopEn: 'Target Groove',
                        loopKo: '목표 템포 도달',
                        bpm: '85 BPM',
                        active: true,
                      },
                    ].map((l) => (
                      <div
                        key={l.bpm}
                        className={`rounded-xl border p-3 space-y-1 ${
                          l.active
                            ? 'border-primary bg-accent-soft text-foreground'
                            : 'border-border bg-card text-muted-foreground'
                        }`}
                      >
                        <div className="text-[10px] font-semibold">
                          {locale === 'en' ? l.loopEn : l.loopKo}
                        </div>
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
                <p className="text-xs text-muted-foreground px-1">
                  {locale === 'en'
                    ? 'Drum, bass, and chord backing turn finger drills into real musical jamming.'
                    : '드럼·베이스·코드 반주를 켜고 합주하듯 연습하며 자연스럽게 원곡 템포까지 도달합니다.'}
                </p>
              </motion.div>
            )}

            {stepIdx === 3 && (
              <motion.div
                key="stage-3"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25, ease: SILK_EASE }}
                className="w-full grid grid-cols-1 sm:grid-cols-[0.88fr_1.12fr] items-center gap-4"
              >
                <div className="rounded-xl border border-border bg-background p-4 space-y-2 text-center sm:text-left">
                  <div className="text-[11px] font-semibold text-primary">
                    {locale === 'en' ? 'Lesson Cleared' : '레슨 완주 리포트'}
                  </div>
                  <div className="font-mono tabular-nums text-3xl sm:text-4xl font-bold text-foreground">
                    GRADE S
                  </div>
                  <div className="font-mono tabular-nums text-xs text-success font-semibold">
                    {locale === 'en' ? '96 Score · Next Unlocked' : '96점 통과 · 다음 레슨 해금'}
                  </div>
                  <div className="text-[11px] text-muted-foreground pt-1 leading-relaxed">
                    {locale === 'en'
                      ? 'Progress, best BPM, and weak bars are saved to your account automatically.'
                      : '최고 점수와 BPM, 보완할 마디가 내 계정에 자동 저장되어 언제든 이어서 연습합니다.'}
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
              ? '4 difficulty stages from Relaxed Beginner to Blind Master'
              : '입문자용 느슨한 판정부터 악보 힌트 없는 블라인드 마스터까지 4단계 지원'}
          </span>
          <span className="font-mono tabular-nums">0{stepIdx + 1} / 04</span>
        </div>
      </div>
    </div>
  );
}
