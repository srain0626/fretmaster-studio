'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { SILK_EASE, STUDIO_SPRING } from '@/components/motion/StudioMotion';
import { guitarSynthEngine } from '@/lib/guitarSynthEngine';
import type { GuitarString } from '@/types/guitar';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Mic,
  Sparkles,
  Volume2,
} from 'lucide-react';

interface CoachingScenario {
  id: 'clean-chord' | 'mute-coach' | 'bend-target';
  lessonId: string;
  lessonCode: string;
  tabEn: string;
  tabKo: string;
  badgeEn: string;
  badgeKo: string;
  tone: 'success' | 'warning' | 'primary';
  headlineEn: string;
  headlineKo: string;
  feedbackEn: string;
  feedbackKo: string;
  coachTipEn: string;
  coachTipKo: string;
  strings: {
    name: string;
    stringNum: GuitarString;
    fret: number | null;
    status: 'ringing' | 'muted' | 'bleed' | 'idle';
    noteLabel: string;
  }[];
}

const COACHING_SCENARIOS: CoachingScenario[] = [
  {
    id: 'clean-chord',
    lessonId: 'm3-3',
    lessonCode: '3-3',
    tabEn: 'Chord Strum Check',
    tabKo: '코드 울림 확인',
    badgeEn: 'ALL CHORD NOTES CLEAR',
    badgeKo: '구성음 3줄 고르게 울림',
    tone: 'success',
    headlineEn: 'Know instantly if every note inside your chord actually rang out.',
    headlineKo: '코드를 쳤을 때 죽은 줄 없이 모든 구성음이 맑게 울렸는지 바로 알려줍니다.',
    feedbackEn: 'Am Triad · Root, 5th, and Minor 3rd all clear and on the beat',
    feedbackKo: 'Am 3화음 · 근음·5도·단3도 모두 선명하게 정박 안착',
    coachTipEn:
      'Great arch on your index and ring fingers—string 3 rang clearly without touching string 2.',
    coachTipKo:
      '손가락 끝을 세워 짚어 3번줄 단3도(C)까지 먹먹함 없이 또렷하게 울렸습니다.',
    strings: [
      { name: '6E', stringNum: 6, fret: null, status: 'muted', noteLabel: 'Muted' },
      { name: '5A', stringNum: 5, fret: 0, status: 'ringing', noteLabel: 'A (Root)' },
      { name: '4D', stringNum: 4, fret: 2, status: 'ringing', noteLabel: 'E (5th)' },
      { name: '3G', stringNum: 3, fret: 2, status: 'ringing', noteLabel: 'A (Oct)' },
      { name: '2B', stringNum: 2, fret: 1, status: 'ringing', noteLabel: 'C (b3)' },
      { name: '1e', stringNum: 1, fret: 0, status: 'idle', noteLabel: 'Open' },
    ],
  },
  {
    id: 'mute-coach',
    lessonId: 'm3-1',
    lessonCode: '3-1',
    tabEn: 'Open-String Mute Fix',
    tabKo: '개방현 잡음 교정',
    badgeEn: '6TH STRING RING DETECTED',
    badgeKo: '6번 개방현 잡음 감지',
    tone: 'warning',
    headlineEn: 'Catches accidental open-string noise that muddies beginner chords.',
    headlineKo: '초보자가 놓치기 쉬운 개방현 불필요 울림까지 잡아내 깔끔한 뮤트 습관을 만들어줍니다.',
    feedbackEn: 'C5 Power Chord matched, but unmuted 6th string (E) is ringing underneath',
    feedbackKo: 'C5 파워코드는 맞았지만, 뮤트되지 않은 6번 개방현(E)이 함께 울리고 있어요',
    coachTipEn:
      'Let the tip of your index finger gently touch the underside of string 6 while fretting string 5.',
    coachTipKo:
      '5번줄 3프렛을 짚은 검지 끝살을 6번줄 아래에 살짝 대기만 하면 불필요한 저음 울림이 사라집니다.',
    strings: [
      { name: '6E', stringNum: 6, fret: 0, status: 'bleed', noteLabel: 'Unmuted E!' },
      { name: '5A', stringNum: 5, fret: 3, status: 'ringing', noteLabel: 'C (Root)' },
      { name: '4D', stringNum: 4, fret: 5, status: 'ringing', noteLabel: 'G (5th)' },
      { name: '3G', stringNum: 3, fret: 5, status: 'ringing', noteLabel: 'C (Oct)' },
      { name: '2B', stringNum: 2, fret: null, status: 'muted', noteLabel: 'Muted' },
      { name: '1e', stringNum: 1, fret: null, status: 'muted', noteLabel: 'Muted' },
    ],
  },
  {
    id: 'bend-target',
    lessonId: 'm6-3',
    lessonCode: '6-3',
    tabEn: 'Expressive Bend Pitch',
    tabKo: '벤딩 목표 음정',
    badgeEn: 'WHOLE-STEP BEND LOCKED',
    badgeKo: '목표 음정 정확히 도달',
    tone: 'primary',
    headlineEn: 'Stop guessing if your string bend reached the right note—see it lock in.',
    headlineKo: '줄을 얼마나 끌어올려야 할지 감으로만 치지 마세요. 목표 음 도달을 눈으로 확인합니다.',
    feedbackEn: '3G Fret 7 lifted smoothly up a full step (+2 frets pitch) without going sharp',
    feedbackKo: '3번줄 7프렛(D)에서 한 음 위 목표음(E)까지 흔들림 없이 도달했습니다',
    coachTipEn:
      'Back up your ring finger with index and middle fingers on the same string and rotate from your wrist.',
    coachTipKo:
      '약지 뒤에 검지·중지를 나란히 붙여 세 손가락으로 지탱하고 손목 회전으로 밀어 올리면 힘이 덜 듭니다.',
    strings: [
      { name: '6E', stringNum: 6, fret: null, status: 'muted', noteLabel: 'Muted' },
      { name: '5A', stringNum: 5, fret: null, status: 'muted', noteLabel: 'Muted' },
      { name: '4D', stringNum: 4, fret: null, status: 'muted', noteLabel: 'Muted' },
      { name: '3G', stringNum: 3, fret: 7, status: 'ringing', noteLabel: '7F Bend -> E' },
      { name: '2B', stringNum: 2, fret: null, status: 'idle', noteLabel: '--' },
      { name: '1e', stringNum: 1, fret: null, status: 'idle', noteLabel: '--' },
    ],
  },
];

export function LiveCoachingShowcase({
  locale,
  onStartLesson,
}: {
  locale: 'en' | 'ko';
  onStartLesson?: (lessonId: string) => void;
}) {
  const [idx, setIdx] = useState(0);
  const [hovered, setHovered] = useState(false);
  const timersRef = useRef<number[]>([]);

  useEffect(() => {
    return () => {
      for (const id of timersRef.current) window.clearTimeout(id);
    };
  }, []);

  useEffect(() => {
    if (hovered) return;
    const timer = window.setInterval(() => {
      setIdx((prev) => (prev + 1) % COACHING_SCENARIOS.length);
    }, 4800);
    return () => window.clearInterval(timer);
  }, [hovered]);

  const active = COACHING_SCENARIOS[idx];

  const playScenarioAudio = useCallback((scenario: CoachingScenario) => {
    for (const id of timersRef.current) window.clearTimeout(id);
    timersRef.current = [];

    if (scenario.id === 'bend-target') {
      guitarSynthEngine.playSingleGuitarNote(3, 7, 'lead', 0.9, 200, 'bend-full');
      return;
    }

    const playable = scenario.strings.filter(
      (s) => (s.status === 'ringing' || s.status === 'bleed') && s.fret !== null
    );
    const preset = scenario.id === 'mute-coach' ? 'crunch' : 'clean';
    playable.forEach((s, order) => {
      const tid = window.setTimeout(() => {
        guitarSynthEngine.playSingleGuitarNote(
          s.stringNum,
          s.fret ?? 0,
          preset,
          0.75,
          0,
          'normal'
        );
      }, order * 55);
      timersRef.current.push(tid);
    });
  }, []);

  const badgeToneClass =
    active.tone === 'success'
      ? 'border-success/35 bg-success/10 text-success'
      : active.tone === 'warning'
        ? 'border-warning/35 bg-warning/10 text-warning'
        : 'border-primary/35 bg-accent-soft text-primary';

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="rounded-2xl border border-border bg-card p-5 sm:p-7 shadow-sm space-y-6"
    >
      {/* Top Scenario Tabs + Sound Preview */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex flex-wrap gap-1.5 rounded-xl bg-secondary/70 p-1">
          {COACHING_SCENARIOS.map((item, i) => {
            const isCurrent = i === idx;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setIdx(i);
                  playScenarioAudio(item);
                }}
                className={`relative rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  isCurrent ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {isCurrent && (
                  <motion.span
                    layoutId="coaching-scenario-pill"
                    transition={STUDIO_SPRING}
                    className="absolute inset-0 rounded-lg bg-card border border-border shadow-xs"
                  />
                )}
                <span className="relative z-10">
                  {locale === 'en' ? item.tabEn : item.tabKo}
                </span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => playScenarioAudio(active)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground hover:border-primary/45 hover:text-primary transition-colors"
        >
          <Volume2 className="w-3.5 h-3.5 text-primary" />
          <span>{locale === 'en' ? 'Play Example Sound' : '예시 사운드 듣기'}</span>
        </button>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={active.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.24, ease: SILK_EASE }}
          className="grid grid-cols-1 lg:grid-cols-[1.05fr_0.95fr] gap-6 items-center"
        >
          {/* Left: 6-String Live Monitor Visual */}
          <div className="rounded-xl border border-border bg-background p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-border/70">
              <div className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Mic className="w-3.5 h-3.5 text-primary" />
                <span>
                  {locale === 'en' ? 'Live Guitar Listening View' : '실시간 기타 소리 인식 화면'}
                </span>
              </div>
              <span
                className={`rounded-full border px-2.5 py-0.5 font-mono text-[10px] font-bold ${badgeToneClass}`}
              >
                {locale === 'en' ? active.badgeEn : active.badgeKo}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {active.strings.map((st) => {
                const cardStyle =
                  st.status === 'ringing'
                    ? 'border-success/40 bg-success/10 text-foreground'
                    : st.status === 'bleed'
                      ? 'border-warning/50 bg-warning/10 text-foreground'
                      : 'border-border/70 bg-card/70 text-muted-foreground';
                return (
                  <div
                    key={st.name}
                    className={`rounded-xl border px-3 py-2.5 flex items-center justify-between gap-2 ${cardStyle}`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono text-xs font-bold shrink-0">{st.name}</span>
                      <span className="text-[11px] truncate">{st.noteLabel}</span>
                    </div>
                    {st.status === 'ringing' && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0" />
                    )}
                    {st.status === 'bleed' && (
                      <AlertCircle className="w-3.5 h-3.5 text-warning shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: Human Coaching Card + Direct Lesson CTA */}
          <div className="space-y-4">
            <h3 className="text-lg sm:text-xl font-bold text-foreground leading-snug">
              {locale === 'en' ? active.headlineEn : active.headlineKo}
            </h3>

            <div className="rounded-xl border border-border bg-secondary/45 p-4 space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                <Sparkles className="w-3.5 h-3.5 text-primary shrink-0" />
                <span>{locale === 'en' ? active.feedbackEn : active.feedbackKo}</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {locale === 'en' ? active.coachTipEn : active.coachTipKo}
              </p>
            </div>

            {onStartLesson && (
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => onStartLesson(active.lessonId)}
                  className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 text-xs font-semibold text-foreground hover:border-primary/50 hover:text-primary transition-colors"
                >
                  <span>
                    {locale === 'en'
                      ? `Practice this in Lesson ${active.lessonCode}`
                      : `레슨 ${active.lessonCode}에서 내 기타로 직접 해보기`}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-primary" />
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
