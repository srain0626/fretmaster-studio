'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  AnimatePresence,
  motion,
  useScroll,
  useTransform,
} from 'framer-motion';
import { BrandFretLogo } from '@/components/icons/GuitarSvgIcons';
import {
  DeckControlHud,
  SlideFrame,
  SlideIndexRail,
  SlideOverviewModal,
  TopSlideProgressBar,
  type SlideMeta,
} from '@/components/landing/DeckChrome';
import { DspPipelineVisualizer } from '@/components/landing/DspPipelineVisualizer';
import { MagicMoveFretboardDemo } from '@/components/landing/MagicMoveFretboardDemo';
import { WorkflowStageShowcase } from '@/components/landing/WorkflowStageShowcase';
import { SILK_EASE, STUDIO_SPRING, StudioMotionProvider } from '@/components/motion/StudioMotion';
import { Button } from '@/components/ui/button';
import {
  ALL_LESSONS,
  MODULES,
  localizeLesson,
  localizeModule,
} from '@/data/curriculumData';
import { trackStudioEvent } from '@/lib/analytics';
import { useAuth } from '@/lib/auth';
import { useLocale } from '@/lib/i18n';
import { useThemePreference } from '@/lib/theme';
import type { PhaseId } from '@/types/guitar';
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Monitor,
  Moon,
  Sun,
} from 'lucide-react';

function GoogleGIcon() {
  return (
    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-white shrink-0">
      <svg width="13" height="13" viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="#4285F4"
          d="M23.49 12.27c0-.79-.07-1.54-.2-2.27H12v4.3h6.44a5.51 5.51 0 0 1-2.39 3.62v3h3.87c2.26-2.08 3.57-5.15 3.57-8.65Z"
        />
        <path
          fill="#34A853"
          d="M12 24c3.24 0 5.95-1.07 7.93-2.91l-3.87-3c-1.07.72-2.44 1.15-4.06 1.15-3.12 0-5.77-2.11-6.72-4.95H1.28v3.1A12 12 0 0 0 12 24Z"
        />
        <path
          fill="#FBBC05"
          d="M5.28 14.29A7.18 7.18 0 0 1 4.9 12c0-.8.14-1.57.38-2.29V6.61H1.28A12 12 0 0 0 0 12c0 1.94.46 3.77 1.28 5.39l4-3.1Z"
        />
        <path
          fill="#EA4335"
          d="M12 4.76c1.76 0 3.34.61 4.58 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.28 6.61l4 3.1C6.23 6.87 8.88 4.76 12 4.76Z"
        />
      </svg>
    </span>
  );
}

const SLIDES: SlideMeta[] = [
  {
    id: 'slide-cover',
    index: 0,
    code: '01',
    eyebrowEn: 'Overview · v0.3.0',
    eyebrowKo: '개요 · v0.3.0',
    titleEn: 'Open Electric Guitar Studio',
    titleKo: 'FretMaster Studio 소개',
    summaryEn: '39 lessons, 128-sample YIN DSP, 8192-pt polyphonic FFT, and Remotion guides.',
    summaryKo: '39개 단계별 레슨, 초저지연 AudioWorklet DSP, 화성 모션 가이드를 담은 오픈 스튜디오.',
  },
  {
    id: 'slide-philosophy',
    index: 1,
    code: '02',
    eyebrowEn: 'Harmony Architecture',
    eyebrowKo: '화성 설계 철학',
    titleEn: '5-Layer Spiral Harmony',
    titleKo: '5단계 나선형 지판 화성학',
    summaryEn: 'Connect intervals, power chords, Major/Minor triads, and Am <-> C shapes visually.',
    summaryKo: '숫자 암기 대신 음정, 파워코드, 장·단3화음, Am↔C 박스를 손끝으로 연결합니다.',
  },
  {
    id: 'slide-dsp',
    index: 2,
    code: '03',
    eyebrowEn: 'Real-Time DSP',
    eyebrowKo: '실시간 오디오 엔진',
    titleEn: 'YIN Pitch & Polyphonic FFT',
    titleKo: 'YIN 단음 & 폴리포닉 FFT 판정',
    summaryEn: 'Off-main-thread worklet, 45-bin chord detection, and 1-click acoustic ping calibration.',
    summaryKo: 'AudioWorklet 45-bin 코드 스트럼 판정과 1800 Hz 원클릭 음향 루프백 보정.',
  },
  {
    id: 'slide-curriculum',
    index: 3,
    code: '04',
    eyebrowEn: 'Complete Syllabus',
    eyebrowKo: '전체 커리큘럼',
    titleEn: '4 Phases · 9 Modules · 39 Lessons',
    titleKo: '4 Phases · 9 Modules · 39강 로드맵',
    summaryEn: 'Progressive unlock or Free Explore from open strings through solo improvisation.',
    summaryKo: '첫 개방현 피킹부터 벤딩·귀카피·즉흥 코드 톤까지 39개 레슨 미리보기.',
  },
  {
    id: 'slide-workflow',
    index: 4,
    code: '05',
    eyebrowEn: 'Practice Cycle',
    eyebrowKo: '검증된 연습 사이클',
    titleEn: 'Wait-for-Note to Blind Exam',
    titleKo: '대기 실습에서 블라인드 승급까지',
    summaryEn: '0.75x Remotion inspection, Wait-for-Note practice, +5 BPM loop ramp, and S–C grades.',
    summaryKo: '0.75배속 원리 학습 -> 대기 실습 -> +5 BPM 가속 -> 5축 역량 리포트.',
  },
  {
    id: 'slide-closing',
    index: 5,
    code: '06',
    eyebrowEn: 'Start Learning',
    eyebrowKo: '지금 시작하기',
    titleEn: 'Enter FretMaster Studio',
    titleKo: '내 스튜디오에서 연습 시작',
    summaryEn: 'Sign in with Google for personal cloud sync across desktop devices.',
    summaryKo: 'Google 연동으로 모든 레슨 진도와 오디오 보정값을 무료 동기화하세요.',
  },
];

const PHASES: { id: PhaseId; enLabel: string; koLabel: string }[] = [
  { id: 'phase-1', enLabel: 'Phase I · Foundations', koLabel: 'Phase I · 입문 기본기' },
  { id: 'phase-2', enLabel: 'Phase II · Chords & Scales', koLabel: 'Phase II · 화성 · 스케일' },
  { id: 'phase-3', enLabel: 'Phase III · Tech & Solos', koLabel: 'Phase III · 테크닉 · 솔로' },
  { id: 'phase-4', enLabel: 'Phase IV · Ear & Improv', koLabel: 'Phase IV · 귀카피 · 즉흥' },
];

const PHASE_SLIDE_VARIANTS = {
  enter: (dir: number) => ({ opacity: 0, x: dir >= 0 ? 24 : -24 }),
  center: { opacity: 1, x: 0 },
  exit: (dir: number) => ({ opacity: 0, x: dir >= 0 ? -24 : 24 }),
};

function HeroParallaxStage({
  previewSrc,
  alt,
  caption,
}: {
  previewSrc: string;
  alt: string;
  caption: string;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: stageRef,
    offset: ['start end', 'end start'],
  });
  const yShift = useTransform(scrollYProgress, [0, 1], [8, -14]);

  return (
    <motion.div
      ref={stageRef}
      style={{ y: yShift }}
      initial={{ opacity: 0, y: 18, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.6, delay: 0.14, ease: SILK_EASE }}
      className="rounded-2xl border border-border bg-card p-2.5 shadow-sm space-y-2"
    >
      <div className="rounded-xl overflow-hidden border border-border/70 bg-background">
        <Image
          src={previewSrc}
          alt={alt}
          width={1440}
          height={900}
          priority
          className="w-full h-auto block"
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 px-2 py-1 text-[11px] text-muted-foreground">
        <span className="truncate">{caption}</span>
        <span className="font-mono shrink-0">EN · KO</span>
      </div>

      <div className="grid grid-cols-3 gap-1.5 px-1 pb-0.5">
        {[
          { k: '8192-pt FFT', v: 'Polyphonic' },
          { k: '128-Sample YIN', v: '±1 cent' },
          { k: '39 Lessons', v: 'Cloud Sync' },
        ].map((chip, idx) => (
          <motion.div
            key={chip.k}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.25 + idx * 0.08, ease: SILK_EASE }}
            className="rounded-xl border border-border/70 bg-background/85 px-2.5 py-2 text-center"
          >
            <div className="font-mono text-[10px] font-bold text-foreground truncate">
              {chip.k}
            </div>
            <div className="text-[10px] text-muted-foreground truncate">{chip.v}</div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

export function LandingPageClient() {
  const { locale, preference: localePref, setPreference: setLocalePref, tr } = useLocale();
  const { themePreference, setThemePreference, resolvedTheme } = useThemePreference();
  const { user, loading: authLoading, isConfigured, authError, signInWithGoogle } = useAuth();

  const [selectedPhase, setSelectedPhase] = useState<PhaseId>('phase-1');
  const [phaseDir, setPhaseDir] = useState(1);
  const [signingIn, setSigningIn] = useState(false);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [overviewOpen, setOverviewOpen] = useState(false);

  const handlePrimaryAuth = async (placement: string) => {
    trackStudioEvent('landing_cta_click', { placement, action: 'google_signin' });
    setSigningIn(true);
    try {
      await signInWithGoogle('/studio');
    } finally {
      setSigningIn(false);
    }
  };

  const handleSelectPhase = (nextPhase: PhaseId) => {
    const prevIdx = PHASES.findIndex((p) => p.id === selectedPhase);
    const nextIdx = PHASES.findIndex((p) => p.id === nextPhase);
    setPhaseDir(nextIdx >= prevIdx ? 1 : -1);
    setSelectedPhase(nextPhase);
  };

  const jumpToSlide = useCallback((idx: number) => {
    const clamped = Math.max(0, Math.min(SLIDES.length - 1, idx));
    setActiveSlideIndex(clamped);
    const target = document.getElementById(SLIDES[clamped].id);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  // Observe active slide in viewport using IntersectionObserver
  useEffect(() => {
    const sections = Array.from(document.querySelectorAll<HTMLElement>('[data-slide-index]'));
    if (sections.length === 0) return;

    const ratios = new Map<number, number>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const idx = Number(entry.target.getAttribute('data-slide-index'));
          if (!Number.isNaN(idx)) {
            ratios.set(idx, entry.isIntersecting ? entry.intersectionRatio : 0);
          }
        }
        let bestIdx = -1;
        let bestRatio = 0;
        for (const [idx, r] of ratios.entries()) {
          if (r > bestRatio) {
            bestRatio = r;
            bestIdx = idx;
          }
        }
        if (bestIdx !== -1) {
          setActiveSlideIndex(bestIdx);
        }
      },
      {
        rootMargin: '-20% 0px -30% 0px',
        threshold: [0.1, 0.25, 0.45, 0.65],
      }
    );

    for (const sec of sections) observer.observe(sec);
    return () => observer.disconnect();
  }, []);

  // Keynote keyboard navigation (ArrowRight/Down, ArrowLeft/Up, 1-6, G)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }

      if (e.key === 'g' || e.key === 'G') {
        e.preventDefault();
        setOverviewOpen((v) => !v);
        return;
      }

      if (overviewOpen) return;

      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        jumpToSlide(activeSlideIndex + 1);
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        jumpToSlide(activeSlideIndex - 1);
      } else if (e.key >= '1' && e.key <= '6') {
        e.preventDefault();
        jumpToSlide(Number(e.key) - 1);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeSlideIndex, jumpToSlide, overviewOpen]);

  const localizedModules = useMemo(
    () =>
      MODULES.filter((m) => m.phaseId === selectedPhase).map((m) =>
        localizeModule(m, locale)
      ),
    [locale, selectedPhase]
  );

  const lessonsByModule = useMemo(() => {
    const map = new Map<string, ReturnType<typeof localizeLesson>[]>();
    for (const mod of localizedModules) {
      map.set(
        mod.id,
        ALL_LESSONS.filter((l) => l.moduleId === mod.id).map((l) => localizeLesson(l, locale))
      );
    }
    return map;
  }, [locale, localizedModules]);

  const previewSrc = resolvedTheme === 'dark' ? '/preview-dark.png' : '/preview-light.png';

  return (
    <StudioMotionProvider>
      <div className="min-h-screen flex flex-col bg-background text-foreground overflow-x-clip">
        {/* Sticky Minimal Navigation Bar */}
        <header className="sticky top-0 z-40 border-b border-border/80 bg-background/90 backdrop-blur-md">
          <div className="mx-auto max-w-6xl px-3 sm:px-6 h-16 flex items-center justify-between gap-2 sm:gap-4">
            <Link
              href="#slide-cover"
              onClick={(e) => {
                e.preventDefault();
                jumpToSlide(0);
              }}
              className="inline-flex items-center gap-2 shrink-0"
            >
              <BrandFretLogo size={24} />
              <span className="text-sm sm:text-base font-bold tracking-tight text-foreground">
                FretMaster<span className="hidden sm:inline"> Studio</span>
              </span>
            </Link>

            <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-muted-foreground">
              <a
                href="#slide-philosophy"
                onClick={(e) => {
                  e.preventDefault();
                  jumpToSlide(1);
                }}
                className={`transition-colors ${
                  activeSlideIndex === 1 ? 'text-foreground font-semibold' : 'hover:text-foreground'
                }`}
              >
                {tr('Harmony', '화성 설계')}
              </a>
              <a
                href="#slide-dsp"
                onClick={(e) => {
                  e.preventDefault();
                  jumpToSlide(2);
                }}
                className={`transition-colors ${
                  activeSlideIndex === 2 ? 'text-foreground font-semibold' : 'hover:text-foreground'
                }`}
              >
                {tr('Audio DSP', '실시간 DSP')}
              </a>
              <a
                href="#slide-curriculum"
                onClick={(e) => {
                  e.preventDefault();
                  jumpToSlide(3);
                }}
                className={`transition-colors ${
                  activeSlideIndex === 3 ? 'text-foreground font-semibold' : 'hover:text-foreground'
                }`}
              >
                {tr('39-Lesson Curriculum', '39개 커리큘럼')}
              </a>
              <a
                href="#slide-workflow"
                onClick={(e) => {
                  e.preventDefault();
                  jumpToSlide(4);
                }}
                className={`transition-colors ${
                  activeSlideIndex === 4 ? 'text-foreground font-semibold' : 'hover:text-foreground'
                }`}
              >
                {tr('Practice Loop', '학습 사이클')}
              </a>
            </nav>

            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {/* Language Selector */}
              <div className="inline-flex items-center rounded-lg border border-border bg-card p-0.5 shrink-0">
                {(
                  [
                    { id: 'system', label: tr('Auto', '자동') },
                    { id: 'en', label: 'EN' },
                    { id: 'ko', label: '한국어' },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setLocalePref(opt.id)}
                    className={`rounded-md px-1.5 sm:px-2 py-1 text-[11px] font-medium whitespace-nowrap transition-colors ${
                      localePref === opt.id
                        ? 'bg-secondary text-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {/* Theme Selector */}
              <div className="hidden sm:inline-flex items-center rounded-lg border border-border bg-card p-0.5">
                {(
                  [
                    { id: 'system', icon: Monitor, label: tr('Auto', '자동') },
                    { id: 'light', icon: Sun, label: tr('Light', '라이트') },
                    { id: 'dark', icon: Moon, label: tr('Dark', '다크') },
                  ] as const
                ).map((opt) => {
                  const Icon = opt.icon;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setThemePreference(opt.id)}
                      className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${
                        themePreference === opt.id
                          ? 'bg-secondary text-foreground'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                      title={opt.label}
                    >
                      <Icon className="w-3 h-3" />
                    </button>
                  );
                })}
              </div>

              {user ? (
                <Link
                  href="/studio"
                  onClick={() =>
                    trackStudioEvent('landing_cta_click', {
                      placement: 'header',
                      action: 'open_studio',
                    })
                  }
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground hover:opacity-95 transition-opacity"
                >
                  <span>{tr('Open Studio', '스튜디오 열기')}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  disabled={authLoading || signingIn}
                  onClick={() => handlePrimaryAuth('header')}
                  className="rounded-lg gap-2 text-xs font-semibold"
                >
                  <GoogleGIcon />
                  <span className="hidden sm:inline">
                    {tr('Continue with Google', 'Google로 시작하기')}
                  </span>
                  <span className="sm:hidden">{tr('Sign In', '로그인')}</span>
                </Button>
              )}
            </div>
          </div>
        </header>

        <TopSlideProgressBar />

        <main className="flex-1">
          {/* SLIDE 01: COVER */}
          <SlideFrame
            id="slide-cover"
            slideNumber={1}
            totalSlides={SLIDES.length}
            eyebrow={locale === 'en' ? SLIDES[0].eyebrowEn : SLIDES[0].eyebrowKo}
            variant="grid"
          >
            <div className="grid grid-cols-1 lg:grid-cols-[1.06fr_0.94fr] gap-10 lg:gap-12 items-center">
              <div className="space-y-6">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, ease: SILK_EASE }}
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-1 text-[11px] font-semibold text-muted-foreground"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  <span>
                    {tr(
                      'Open Electric Guitar Studio · v0.3.0 Polyphonic & CI Release',
                      '오픈 일렉트릭 기타 스튜디오 · v0.3.0 폴리포닉 코드 & 음향 핑 보정'
                    )}
                  </span>
                </motion.div>

                <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-foreground leading-[1.13] space-y-1">
                  <span className="block overflow-hidden">
                    <motion.span
                      className="block"
                      initial={{ y: '100%', opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ duration: 0.55, delay: 0.05, ease: SILK_EASE }}
                    >
                      {tr('From open strings', '첫 개방현 피킹부터')}
                    </motion.span>
                  </span>
                  <span className="block overflow-hidden">
                    <motion.span
                      className="block"
                      initial={{ y: '100%', opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ duration: 0.55, delay: 0.14, ease: SILK_EASE }}
                    >
                      {tr('to fretboard harmony', '손끝으로 깨우치는 지판 화성학과')}
                    </motion.span>
                  </span>
                  <span className="block overflow-hidden">
                    <motion.span
                      className="block text-primary"
                      initial={{ y: '100%', opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ duration: 0.55, delay: 0.23, ease: SILK_EASE }}
                    >
                      {tr('and fearless improvisation.', '자유로운 즉흥 연주까지.')}
                    </motion.span>
                  </span>
                </h1>

                <motion.p
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, delay: 0.3, ease: SILK_EASE }}
                  className="text-sm sm:text-base text-muted-foreground leading-relaxed max-w-xl"
                >
                  {tr(
                    'Unifying tension-free guitar mechanics, 5-layer spiral harmony, 128-sample AudioWorklet YIN + 8192-pt polyphonic FFT, interactive Remotion guides, and personal cloud sync inside one distraction-free studio.',
                    '무긴장 입문 기본기, 5단계 나선형 지판 화성학, 128-sample YIN + 8192-pt 폴리포닉 FFT 판정, Remotion 화성 애니메이션과 계정별 클라우드 진도 동기화를 하나의 깔끔한 워크스페이스에 담았습니다.'
                  )}
                </motion.p>

                {authError && (
                  <div className="rounded-xl border border-border bg-card px-4 py-3 text-xs text-muted-foreground">
                    {!isConfigured
                      ? tr(
                          'Configure NEXT_PUBLIC_SUPABASE_URL & NEXT_PUBLIC_SUPABASE_ANON_KEY to activate live Google sign-in.',
                          '실제 Google 로그인 및 클라우드 저장을 활성화하려면 Supabase 환경 변수를 설정해 주세요.'
                        )
                      : tr(
                          'Sign-in did not complete. Please click Continue with Google to retry.',
                          '로그인 세션 확인에 실패했습니다. Google로 시작하기 버튼을 다시 눌러주세요.'
                        )}
                  </div>
                )}

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.38, ease: SILK_EASE }}
                  className="flex flex-wrap items-center gap-3 pt-1"
                >
                  {user ? (
                    <Link
                      href="/studio"
                      onClick={() =>
                        trackStudioEvent('landing_cta_click', {
                          placement: 'hero',
                          action: 'open_studio',
                        })
                      }
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:opacity-95 transition-opacity"
                    >
                      <span>{tr('Enter Your Studio', '내 스튜디오 이어하기')}</span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  ) : (
                    <Button
                      type="button"
                      size="lg"
                      disabled={authLoading || signingIn}
                      onClick={() => handlePrimaryAuth('hero')}
                      className="h-11 rounded-xl px-5 gap-2.5 text-sm font-semibold"
                    >
                      <GoogleGIcon />
                      <span>
                        {signingIn
                          ? tr('Connecting to Google...', 'Google 연결 중...')
                          : tr('Start Free with Google', 'Google 계정으로 무료 시작')}
                      </span>
                    </Button>
                  )}

                  <button
                    type="button"
                    onClick={() => jumpToSlide(1)}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-5 py-2.5 text-sm font-medium text-foreground hover:bg-secondary/70 transition-colors"
                  >
                    <span>{tr('Start Presentation', '프레젠테이션 넘겨보기')}</span>
                    <ArrowDown className="w-3.5 h-3.5 text-primary" />
                  </button>
                </motion.div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-border/80">
                  {[
                    { value: '4 Phases', label: tr('9 Guided Modules', '9개 핵심 모듈') },
                    { value: '39 Lessons', label: tr('Unlock or Explore', '단계 해금 · 자유 탐색') },
                    { value: '±1 cent', label: tr('YIN + Poly FFT', '단음 · 코드 실시간 판정') },
                    { value: 'Cloud Sync', label: tr('Saved Per Account', '계정별 진도 동기화') },
                  ].map((stat) => (
                    <div key={stat.value} className="space-y-0.5">
                      <div className="font-mono text-sm font-bold text-foreground">
                        {stat.value}
                      </div>
                      <div className="text-[11px] text-muted-foreground">{stat.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              <HeroParallaxStage
                previewSrc={previewSrc}
                alt={tr(
                  'FretMaster Studio 3-column workspace and animated guide preview',
                  'FretMaster Studio 3단 학습 워크스페이스 및 화성 모션 가이드 프리뷰'
                )}
                caption={
                  resolvedTheme === 'dark'
                    ? tr(
                        'Dark Mode · Remotion Pitch Bend & Support Biomechanics',
                        'Dark 모드 · 실시간 벤딩 피치 애니메이션 & 자세 가이드'
                      )
                    : tr(
                        'Light Mode · 4-Finger Color Neck & Synced TAB Timeline',
                        'Light 모드 · 4색 운지 지판 & 마디별 동기화 TAB 악보'
                      )
                }
              />
            </div>
          </SlideFrame>

          {/* SLIDE 02: HARMONY PHILOSOPHY + KEYNOTE MAGIC MOVE */}
          <SlideFrame
            id="slide-philosophy"
            slideNumber={2}
            totalSlides={SLIDES.length}
            eyebrow={locale === 'en' ? SLIDES[1].eyebrowEn : SLIDES[1].eyebrowKo}
            variant="tinted"
          >
            <div className="grid grid-cols-1 lg:grid-cols-[0.9fr_1.1fr] gap-8 lg:gap-12 items-center">
              <div className="space-y-6">
                <div className="space-y-3">
                  <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-foreground leading-tight">
                    {tr(
                      'Stop memorizing blind TAB numbers. See how notes relate across the neck.',
                      '숫자만 외우는 연습은 그만. 지판 위의 간격과 화성을 한눈에 연결하세요.'
                    )}
                  </h2>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {tr(
                      'Every phase revisits the same 6 strings with deeper harmonic vision—linking physical finger distance directly to intervals, chords, and improvisation targets.',
                      '모든 페이즈가 같은 6줄 지판을 나선형으로 심화해, 손가락 간격이 곧바로 음정·코드·즉흥 타깃으로 연결되도록 설계했습니다.'
                    )}
                  </p>
                </div>

                {/* Before / After Contrast */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="rounded-xl border border-border bg-background/80 p-4 space-y-1.5">
                    <div className="font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {tr('Conventional TAB', '기존 단순 TAB 암기')}
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {tr(
                        'Isolated fret numbers disappear the moment you change key or string set.',
                        '키나 포지션만 바뀌어도 외운 프렛 숫자가 무너져 응용이 어렵습니다.'
                      )}
                    </p>
                  </div>
                  <div className="rounded-xl border border-primary/35 bg-card p-4 space-y-1.5">
                    <div className="font-mono text-[10px] font-semibold uppercase tracking-wider text-primary">
                      {tr('Spiral Harmony System', '5단계 나선형 지판 시스템')}
                    </div>
                    <p className="text-xs text-foreground/90 leading-relaxed">
                      {tr(
                        '4-color finger coding + Root/5th/3rd visual anchors stay consistent across all 22 frets.',
                        '4색 손가락 코딩과 근음·5도·3도 앵커 시야가 전 프렛에서 일관되게 확장됩니다.'
                      )}
                    </p>
                  </div>
                </div>

                <div className="space-y-2.5 pt-1">
                  {[
                    {
                      num: '01',
                      text: tr(
                        'Intervals (Half vs Whole Steps) mapped physically along single strings.',
                        '반음(1F)·온음(2F) 간격을 줄 위에서 직관적 거리로 먼저 체득합니다.'
                      ),
                    },
                    {
                      num: '02',
                      text: tr(
                        'Power Chords -> Major & Minor 3rds -> Open Triads verified by FFT spectrum.',
                        '파워코드에서 장·단3도 추가만으로 메이저/마이너 트라이어드로 자연 확장됩니다.'
                      ),
                    },
                    {
                      num: '03',
                      text: tr(
                        'Am <-> C relative pentatonic boxes locked to real backing chord tones.',
                        'Am ↔ C 나란한조 박스를 실제 코드 진행의 3도·7도 해결음과 직결합니다.'
                      ),
                    },
                  ].map((pt) => (
                    <div key={pt.num} className="flex items-start gap-3 text-xs sm:text-sm">
                      <span className="font-mono text-xs font-bold text-primary mt-0.5 shrink-0">
                        {pt.num}
                      </span>
                      <span className="text-muted-foreground leading-relaxed">{pt.text}</span>
                    </div>
                  ))}
                </div>
              </div>

              <MagicMoveFretboardDemo locale={locale} />
            </div>
          </SlideFrame>

          {/* SLIDE 03: REAL-TIME AUDIO DSP & v0.3.0 CALIBRATION */}
          <SlideFrame
            id="slide-dsp"
            slideNumber={3}
            totalSlides={SLIDES.length}
            eyebrow={locale === 'en' ? SLIDES[2].eyebrowEn : SLIDES[2].eyebrowKo}
            variant="default"
          >
            <div className="space-y-8">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div className="space-y-2 max-w-2xl">
                  <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-foreground leading-tight">
                    {tr(
                      'Studio-grade YIN pitch and 8192-point polyphonic FFT inside your browser.',
                      '브라우저만으로 구현한 초저지연 YIN 단음·8192-pt 폴리포닉 코드 판정'
                    )}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {tr(
                      'Inspect how FretMaster separates single bass plucks, full power-chord strums, Major vs Minor 3rds, and hardware audio latency.',
                      '아래 시뮬레이터에서 단음, 파워코드, 장·단3도 구분 및 미뮤트 개방현 경고 동작을 직접 눌러 확인해 보세요.'
                    )}
                  </p>
                </div>

                <div className="inline-flex flex-wrap items-center gap-2 sm:gap-3 rounded-xl border border-border bg-card px-3.5 sm:px-4 py-2 sm:py-2.5 font-mono text-[11px] sm:text-xs max-w-full">
                  <span className="text-muted-foreground">TIERS:</span>
                  <span className="text-foreground font-semibold">±55c / ±42c / ±28c / ±18c</span>
                </div>
              </div>

              <DspPipelineVisualizer locale={locale} />
            </div>
          </SlideFrame>

          {/* SLIDE 04: 39-LESSON INTERACTIVE CURRICULUM */}
          <SlideFrame
            id="slide-curriculum"
            slideNumber={4}
            totalSlides={SLIDES.length}
            eyebrow={locale === 'en' ? SLIDES[3].eyebrowEn : SLIDES[3].eyebrowKo}
            variant="tinted"
          >
            <div className="space-y-8">
              <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5">
                <div className="space-y-2 max-w-2xl">
                  <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-foreground leading-tight">
                    {tr(
                      '4 Phases · 9 Modules · 39 Structured Lessons',
                      '4 Phases · 9 Modules · 39개 단계별 레슨'
                    )}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {tr(
                      'Flip through all four curriculum phases like sub-slides below before entering the studio.',
                      '각 페이즈 버튼을 눌러 39개 전체 커리큘럼 구성을 서브 슬라이드처럼 미리 살펴보세요.'
                    )}
                  </p>
                </div>

                <div className="flex flex-wrap gap-1.5 rounded-2xl border border-border bg-card p-1.5">
                  {PHASES.map((phase) => {
                    const active = selectedPhase === phase.id;
                    return (
                      <button
                        key={phase.id}
                        type="button"
                        onClick={() => handleSelectPhase(phase.id)}
                        className={`relative rounded-xl px-3.5 py-2 text-xs font-semibold transition-colors ${
                          active
                            ? 'text-background'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {active && (
                          <motion.span
                            layoutId="curriculum-phase-pill"
                            transition={STUDIO_SPRING}
                            className="absolute inset-0 rounded-xl bg-foreground"
                          />
                        )}
                        <span className="relative z-10 whitespace-nowrap">
                          {locale === 'en' ? phase.enLabel : phase.koLabel}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="overflow-hidden">
                <AnimatePresence mode="wait" custom={phaseDir}>
                  <motion.div
                    key={selectedPhase}
                    custom={phaseDir}
                    variants={PHASE_SLIDE_VARIANTS}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ duration: 0.28, ease: SILK_EASE }}
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                  >
                    {localizedModules.map((mod, idx) => {
                      const modLessons = lessonsByModule.get(mod.id) ?? [];
                      return (
                        <motion.div
                          key={mod.id}
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{
                            duration: 0.3,
                            delay: idx * 0.05,
                            ease: SILK_EASE,
                          }}
                          className="rounded-2xl border border-border bg-card p-5 flex flex-col justify-between space-y-4"
                        >
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground">
                              <span>MODULE {mod.number}</span>
                              <span>
                                {modLessons.length} {tr('Lessons', '강')}
                              </span>
                            </div>
                            <h3 className="text-base font-bold text-foreground leading-snug">
                              {mod.title}
                            </h3>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                              {mod.summary}
                            </p>
                          </div>

                          <div className="space-y-1.5 pt-3 border-t border-border/70">
                            {modLessons.map((lesson) => (
                              <div
                                key={lesson.id}
                                className="flex items-start gap-2 text-xs text-foreground/90"
                              >
                                <span className="font-mono text-[11px] text-primary font-semibold shrink-0 mt-0.5">
                                  {lesson.code}
                                </span>
                                <span className="leading-snug">{lesson.title}</span>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      );
                    })}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </SlideFrame>

          {/* SLIDE 05: INTERACTIVE PRACTICE WORKFLOW */}
          <SlideFrame
            id="slide-workflow"
            slideNumber={5}
            totalSlides={SLIDES.length}
            eyebrow={locale === 'en' ? SLIDES[4].eyebrowEn : SLIDES[4].eyebrowKo}
            variant="default"
          >
            <div className="space-y-8">
              <div className="max-w-2xl space-y-2">
                <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-foreground leading-tight">
                  {tr(
                    'From 0.75x visual inspection to blind mastery and skill analytics.',
                    '0.75배속 원리 확인부터 한 음씩 대기 실습, 자동 가속, 역량 평가까지'
                  )}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {tr(
                    'Select any step below to see how every lesson balances zero-pressure discovery with real-time rhythmic accountability.',
                    '각 학습 단계를 눌러 스튜디오 내 실제 애니메이션·대기 판정·역량 레이더 흐름을 확인하세요.'
                  )}
                </p>
              </div>

              <WorkflowStageShowcase locale={locale} />
            </div>
          </SlideFrame>

          {/* SLIDE 06: CLOSING SLIDE + FOOTER */}
          <SlideFrame
            id="slide-closing"
            slideNumber={6}
            totalSlides={SLIDES.length}
            eyebrow={locale === 'en' ? SLIDES[5].eyebrowEn : SLIDES[5].eyebrowKo}
            variant="grid"
            className="border-b-0"
          >
            <div className="space-y-10 pb-16 sm:pb-20">
              <div className="rounded-3xl border border-border bg-card p-8 sm:p-12 shadow-sm text-center space-y-7">
                <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3.5 py-1 font-mono text-[11px] font-semibold text-primary">
                  READY TO PLUG IN · v0.3.0
                </div>

                <div className="max-w-3xl mx-auto space-y-3">
                  <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-foreground leading-[1.15]">
                    {tr(
                      'Plug in your guitar and turn practice into measurable mastery.',
                      '지금 기타를 연결하고 감에 의존하던 연습을 눈으로 확인하세요.'
                    )}
                  </h2>
                  <p className="text-sm sm:text-base text-muted-foreground leading-relaxed max-w-2xl mx-auto">
                    {tr(
                      'Sign in once with Google to access all 39 lessons, polyphonic AudioWorklet detection, Remotion harmonic guides, and cloud progress sync for free.',
                      'Google 계정 한 번으로 39개 전체 커리큘럼, 폴리포닉 AudioWorklet 판정, Remotion 가이드 및 다기기 진도 동기화를 무료로 이용할 수 있습니다.'
                    )}
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-3">
                  {user ? (
                    <Link
                      href="/studio"
                      onClick={() =>
                        trackStudioEvent('landing_cta_click', {
                          placement: 'closing_slide',
                          action: 'open_studio',
                        })
                      }
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:opacity-95 transition-opacity"
                    >
                      <span>{tr('Open Studio', '스튜디오 열기')}</span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  ) : (
                    <Button
                      type="button"
                      size="lg"
                      disabled={authLoading || signingIn}
                      onClick={() => handlePrimaryAuth('closing_slide')}
                      className="h-11 rounded-xl px-6 gap-2.5 text-sm font-semibold"
                    >
                      <GoogleGIcon />
                      <span>{tr('Continue with Google', 'Google로 무료 시작하기')}</span>
                    </Button>
                  )}

                  <button
                    type="button"
                    onClick={() => jumpToSlide(0)}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-background px-5 py-2.5 text-sm font-medium text-foreground hover:bg-secondary/70 transition-colors"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                    <span>{tr('Back to Slide 01', '처음 슬라이드로')}</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 max-w-2xl mx-auto pt-4 border-t border-border/80 font-mono text-[11px] text-muted-foreground">
                  <div className="rounded-xl border border-border/70 bg-background py-2 px-3">
                    GNU GPL-3.0
                  </div>
                  <div className="rounded-xl border border-border/70 bg-background py-2 px-3">
                    AudioWorklet DSP
                  </div>
                  <div className="rounded-xl border border-border/70 bg-background py-2 px-3">
                    Supabase Cloud Sync
                  </div>
                  <div className="rounded-xl border border-border/70 bg-background py-2 px-3">
                    EN · KO / Light · Dark
                  </div>
                </div>
              </div>

              <footer className="border-t border-border/80 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <BrandFretLogo size={18} />
                  <span className="font-medium text-foreground">FretMaster Studio</span>
                  <span>·</span>
                  <span>v0.3.0 · GNU GPL-3.0</span>
                </div>

                <div className="flex items-center gap-4">
                  <Link href="/studio" className="hover:text-foreground transition-colors">
                    {tr('Studio Workspace', '스튜디오 바로가기')}
                  </Link>
                  <a
                    href="https://github.com/srain0626/fretmaster-studio"
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-foreground transition-colors"
                  >
                    GitHub
                  </a>
                </div>
              </footer>
            </div>
          </SlideFrame>
        </main>

        <SlideIndexRail
          slides={SLIDES}
          activeIndex={activeSlideIndex}
          locale={locale}
          onJumpTo={jumpToSlide}
        />

        <DeckControlHud
          slides={SLIDES}
          activeIndex={activeSlideIndex}
          locale={locale}
          onJumpTo={jumpToSlide}
          onOpenOverview={() => setOverviewOpen(true)}
        />

        <SlideOverviewModal
          open={overviewOpen}
          slides={SLIDES}
          activeIndex={activeSlideIndex}
          locale={locale}
          onClose={() => setOverviewOpen(false)}
          onJumpTo={jumpToSlide}
        />
      </div>
    </StudioMotionProvider>
  );
}
