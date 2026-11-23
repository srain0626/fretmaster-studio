'use client';

import React, { useCallback, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { BrandFretLogo } from '@/components/icons/GuitarSvgIcons';
import { LiveCoachingShowcase } from '@/components/landing/LiveCoachingShowcase';
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
  ArrowRight,
  BookmarkCheck,
  CheckCircle2,
  Compass,
  Headphones,
  Layers,
  Mic,
  Monitor,
  Moon,
  Music,
  ShieldCheck,
  SlidersHorizontal,
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

const PHASES: {
  id: PhaseId;
  enLabel: string;
  koLabel: string;
  goalEn: string;
  goalKo: string;
}[] = [
  {
    id: 'phase-1',
    enLabel: 'Phase I · First Notes',
    koLabel: 'Phase I · 입문 기본기',
    goalEn: 'Relaxed hand posture, clean picking, and 4-finger independence without fret buzz.',
    goalKo: '버징 없는 첫 프렛 운지, 피킹 진자 운동, 네 손가락 독립을 탄탄하게 다집니다.',
  },
  {
    id: 'phase-2',
    enLabel: 'Phase II · Chords & Scales',
    koLabel: 'Phase II · 코드 · 스케일',
    goalEn: 'Rock power chords, palm muting, Major/Minor moods, and pentatonic scale boxes.',
    goalKo: '파워코드와 팜뮤트, 메이저·마이너 3화음, 펜타토닉과 7음 스케일의 원리를 연결합니다.',
  },
  {
    id: 'phase-3',
    enLabel: 'Phase III · Bends & Solos',
    koLabel: 'Phase III · 표현 · 명곡 솔로',
    goalEn: 'Hammer-ons, expressive bends, 5 genre rhythm styles, and 6 iconic solo studies.',
    goalKo: '해머링·슬라이드·벤딩 표현기법과 5대 장르 리듬, 전설적인 솔로 6단계를 완주합니다.',
  },
  {
    id: 'phase-4',
    enLabel: 'Phase IV · Ear & Improv',
    koLabel: 'Phase IV · 귀카피 · 즉흥',
    goalEn: 'Transcribe melodies by ear, switch between rhythm and lead, and improvise freely.',
    goalKo: '타브 악보 없이 귀로 듣고 카피하며, 백킹 트랙 위에서 자유롭게 즉흥 솔로를 펼칩니다.',
  },
];

const QUICK_START_TRACKS: {
  lessonId: string;
  code: string;
  levelEn: string;
  levelKo: string;
  titleEn: string;
  titleKo: string;
}[] = [
  {
    lessonId: 'm1-1',
    code: '1-1',
    levelEn: 'Day 1 Beginner',
    levelKo: '기타 첫날 입문',
    titleEn: 'Open Strings & Picking',
    titleKo: '개방현 피킹 기초',
  },
  {
    lessonId: 'm3-1',
    code: '3-1',
    levelEn: 'Rhythm & Rock',
    levelKo: '록 리듬 반주',
    titleEn: 'Power Chords & Muting',
    titleKo: '파워코드와 줄 뮤트',
  },
  {
    lessonId: 'm4-1',
    code: '4-1',
    levelEn: 'Fretboard Unlock',
    levelKo: '지판 길 찾기',
    titleEn: 'Pentatonic Box 1',
    titleKo: '펜타토닉 1번 박스',
  },
  {
    lessonId: 'm6-3',
    code: '6-3',
    levelEn: 'Lead Expression',
    levelKo: '솔로 표현기법',
    titleEn: 'Pitch-Exact Bending',
    titleKo: '서포트 벤딩 마스터',
  },
];

const PHASE_SLIDE_VARIANTS = {
  enter: (dir: number) => ({ opacity: 0, x: dir >= 0 ? 20 : -20 }),
  center: { opacity: 1, x: 0 },
  exit: (dir: number) => ({ opacity: 0, x: dir >= 0 ? -20 : 20 }),
};

export function LandingPageClient() {
  const router = useRouter();
  const { locale, preference: localePref, setPreference: setLocalePref, tr } = useLocale();
  const { themePreference, setThemePreference, resolvedTheme } = useThemePreference();
  const {
    user,
    isAdmin,
    loading: authLoading,
    isConfigured,
    authError,
    signInWithGoogle,
  } = useAuth();

  const [selectedPhase, setSelectedPhase] = useState<PhaseId>('phase-1');
  const [phaseDir, setPhaseDir] = useState(1);
  const [signingIn, setSigningIn] = useState(false);

  const startStudioFlow = useCallback(
    async (placement: string, lessonId?: string) => {
      const destination = lessonId
        ? `/studio?lesson=${encodeURIComponent(lessonId)}`
        : '/studio';

      trackStudioEvent('landing_cta_click', {
        placement,
        action: user ? 'open_studio' : 'google_signin',
        ...(lessonId ? { lesson_id: lessonId } : {}),
      });

      if (user) {
        router.push(destination);
        return;
      }

      setSigningIn(true);
      try {
        await signInWithGoogle(destination);
      } finally {
        setSigningIn(false);
      }
    },
    [router, signInWithGoogle, user]
  );

  const handleSelectPhase = (nextPhase: PhaseId) => {
    const prevIdx = PHASES.findIndex((p) => p.id === selectedPhase);
    const nextIdx = PHASES.findIndex((p) => p.id === nextPhase);
    setPhaseDir(nextIdx >= prevIdx ? 1 : -1);
    setSelectedPhase(nextPhase);
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

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

  const activePhaseMeta = PHASES.find((p) => p.id === selectedPhase) ?? PHASES[0];
  const previewSrc = resolvedTheme === 'dark' ? '/preview-dark.png' : '/preview-light.png';

  return (
    <StudioMotionProvider>
      <div className="min-h-screen flex flex-col bg-background text-foreground overflow-x-clip">
        {/* Sticky Product Navigation */}
        <header className="sticky top-0 z-40 border-b border-border/80 bg-background/90 backdrop-blur-md">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
            <Link href="/" className="inline-flex items-center gap-2 shrink-0">
              <BrandFretLogo size={24} />
              <span className="text-sm sm:text-base font-bold tracking-tight text-foreground">
                FretMaster<span className="hidden sm:inline"> Studio</span>
              </span>
            </Link>

            <nav className="hidden lg:flex items-center gap-6 text-xs font-medium text-muted-foreground">
              <button
                type="button"
                onClick={() => scrollToSection('why')}
                className="hover:text-foreground transition-colors"
              >
                {tr('Why FretMaster', '왜 다른가요')}
              </button>
              <button
                type="button"
                onClick={() => scrollToSection('harmony')}
                className="hover:text-foreground transition-colors"
              >
                {tr('Fretboard Harmony', '지판 원리 체험')}
              </button>
              <button
                type="button"
                onClick={() => scrollToSection('method')}
                className="hover:text-foreground transition-colors"
              >
                {tr('How You Practice', '4단계 연습법')}
              </button>
              <button
                type="button"
                onClick={() => scrollToSection('coaching')}
                className="hover:text-foreground transition-colors"
              >
                {tr('Live Coaching', '실시간 코칭')}
              </button>
              <button
                type="button"
                onClick={() => scrollToSection('curriculum')}
                className="hover:text-foreground transition-colors"
              >
                {tr('39 Lessons', '전체 커리큘럼')}
              </button>
            </nav>

            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {/* Language Switcher */}
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

              {/* Theme Switcher */}
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
                      aria-label={opt.label}
                    >
                      <Icon className="w-3 h-3" />
                    </button>
                  );
                })}
              </div>

              {user ? (
                <div className="flex items-center gap-1.5">
                  {isAdmin && (
                    <Link
                      href="/admin"
                      className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-2 text-xs font-semibold text-foreground hover:bg-secondary/70 transition-colors"
                      title={tr('Admin Analytics', '어드민 통계')}
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                      <span className="hidden sm:inline">Admin</span>
                    </Link>
                  )}
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => startStudioFlow('header')}
                    className="rounded-lg gap-1.5 text-xs font-semibold"
                  >
                    <span>{tr('Continue Lesson', '이어서 연습하기')}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  disabled={authLoading || signingIn}
                  onClick={() => startStudioFlow('header')}
                  className="rounded-lg gap-2 text-xs font-semibold"
                >
                  <GoogleGIcon />
                  <span className="hidden sm:inline">
                    {tr('Start Free', '무료로 시작하기')}
                  </span>
                  <span className="sm:hidden">{tr('Start', '시작')}</span>
                </Button>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1">
          {/* SECTION 1: HERO — VALUE ESSENCE & IMMEDIATE START */}
          <section className="relative border-b border-border/80 landing-slide-grid py-14 sm:py-20 lg:py-24">
            <div className="mx-auto max-w-6xl px-4 sm:px-6 space-y-12">
              <div className="grid grid-cols-1 lg:grid-cols-[1.06fr_0.94fr] gap-10 lg:gap-12 items-center">
                <div className="space-y-6">
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, ease: SILK_EASE }}
                    className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-1 text-xs font-semibold text-foreground/90"
                  >
                    <span className="h-2 w-2 rounded-full bg-primary" />
                    <span>
                      {tr(
                        'Interactive Electric Guitar Lessons · Free All 39 Stages',
                        '혼자서도 막히지 않는 일렉기타 레슨 스튜디오 · 39강 전 과정 무료'
                      )}
                    </span>
                  </motion.div>

                  <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-foreground leading-[1.15] space-y-1">
                    <motion.span
                      className="block"
                      initial={{ opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.45, delay: 0.04, ease: SILK_EASE }}
                    >
                      {tr('Stop memorizing blind TABs.', '타브 숫자 암기에서 벗어나')}
                    </motion.span>
                    <motion.span
                      className="block"
                      initial={{ opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.45, delay: 0.12, ease: SILK_EASE }}
                    >
                      {tr('Understand why notes work', '원리를 이해하고 내 소리로 완성하는')}
                    </motion.span>
                    <motion.span
                      className="block text-primary"
                      initial={{ opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.45, delay: 0.2, ease: SILK_EASE }}
                    >
                      {tr('in a studio that listens to you.', '나만의 첫 기타 레슨 스튜디오.')}
                    </motion.span>
                  </h1>

                  <motion.p
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.45, delay: 0.28, ease: SILK_EASE }}
                    className="text-sm sm:text-base text-muted-foreground leading-relaxed max-w-xl"
                  >
                    {tr(
                      'From day-one picking posture to power chords, pentatonic harmony, famous solos, and ear copy. Play into your audio interface or mic—your studio waits until you hit the right fret and coaches every note.',
                      '첫날의 피킹 자세와 운지 교정부터 파워코드, 펜타토닉 화성, 명곡 솔로, 귀카피까지. 내가 친 기타 음을 실시간으로 듣고 맞출 때까지 기다려주는 39단계 레슨으로 오늘 첫 연주를 시작해보세요.'
                    )}
                  </motion.p>

                  {authError && (
                    <div className="rounded-xl border border-border bg-card px-4 py-3 text-xs text-muted-foreground">
                      {!isConfigured
                        ? tr(
                            'Set Supabase environment keys to enable Google sign-in and progress saving.',
                            'Google 로그인 및 진도 저장을 활성화하려면 환경 변수를 설정해 주세요.'
                          )
                        : tr(
                            'Sign-in did not finish. Please click the button below to try again.',
                            '로그인이 완료되지 않았습니다. 아래 시작하기 버튼을 다시 눌러주세요.'
                          )}
                    </div>
                  )}

                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.34, ease: SILK_EASE }}
                    className="space-y-3 pt-1"
                  >
                    <div className="flex flex-wrap items-center gap-3">
                      <Button
                        type="button"
                        size="lg"
                        disabled={authLoading || signingIn}
                        onClick={() => startStudioFlow('hero_primary', user ? undefined : 'm1-1')}
                        className="h-12 rounded-xl px-6 gap-2.5 text-sm font-semibold shadow-xs"
                      >
                        {!user && <GoogleGIcon />}
                        <span>
                          {user
                            ? tr('Continue in Your Studio', '내 스튜디오에서 이어하기')
                            : signingIn
                              ? tr('Connecting...', 'Google 연결 중...')
                              : tr('Start Free with Google', 'Google로 3초 만에 무료 시작')}
                        </span>
                        <ArrowRight className="w-4 h-4" />
                      </Button>

                      {!user && (
                        <Link
                          href="/studio?demo=1&lesson=m1-1"
                          onClick={() =>
                            trackStudioEvent('landing_cta_click', {
                              placement: 'hero_guest_demo',
                              action: 'guest_sandbox',
                              lesson_id: 'm1-1',
                            })
                          }
                          className="inline-flex items-center justify-center gap-2 h-12 rounded-xl border border-border bg-card px-5 text-sm font-semibold text-foreground hover:bg-secondary/70 transition-colors"
                        >
                          <span>{tr('Try Lesson 1-1 Without Sign-In', '로그인 없이 1-1 바로 체험')}</span>
                        </Link>
                      )}

                      <button
                        type="button"
                        onClick={() => scrollToSection('curriculum')}
                        className="inline-flex items-center justify-center gap-1.5 h-12 rounded-xl px-3 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <span>{tr('Browse 39 Lessons', '39개 커리큘럼 보기')}</span>
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0" />
                        {tr('No installation needed', '설치 없이 웹에서 바로 시작')}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0" />
                        {tr('Works with interface or laptop mic', '오디오 인터페이스 · 일반 마이크 모두 지원')}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0" />
                        {tr('Automatic progress save', '내 진도 · 최고 BPM 자동 저장')}
                      </span>
                    </div>
                  </motion.div>
                </div>

                {/* Right: Studio Preview Stage */}
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.55, delay: 0.14, ease: SILK_EASE }}
                  className="rounded-2xl border border-border bg-card p-3 shadow-sm space-y-3"
                >
                  <div className="rounded-xl overflow-hidden border border-border/70 bg-background">
                    <Image
                      src={previewSrc}
                      alt={tr(
                        'FretMaster Studio interactive fretboard, synced TAB score, and posture guide',
                        'FretMaster Studio 지판 운지 가이드, 동기화 악보 및 자세 교정 화면'
                      )}
                      width={1440}
                      height={900}
                      priority
                      className="w-full h-auto block"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {[
                      {
                        title: tr('Waits for You', '맞출 때까지 대기'),
                        sub: tr('Zero-rush practice', '박자 압박 없는 실습'),
                      },
                      {
                        title: tr('4-Color Fingers', '4색 손가락 안내'),
                        sub: tr('Clear hand position', '직관적인 운지 위치'),
                      },
                      {
                        title: tr('Chord & Bend Check', '코드 · 벤딩 코칭'),
                        sub: tr('Catches muted strings', '죽은 줄 · 잡음 감지'),
                      },
                    ].map((item) => (
                      <div
                        key={item.title}
                        className="rounded-xl border border-border/70 bg-background/80 px-2.5 py-2 text-center"
                      >
                        <div className="text-[11px] font-bold text-foreground truncate">
                          {item.title}
                        </div>
                        <div className="text-[10px] text-muted-foreground truncate">{item.sub}</div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              </div>

              {/* Quick-Start Track Picker: Jump Right into Your Level */}
              <div className="rounded-2xl border border-border bg-card/90 p-4 sm:p-5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                    <Compass className="w-4 h-4 text-primary shrink-0" />
                    <span>
                      {tr(
                        'Where are you starting from today? Click a track to jump straight into that lesson:',
                        '지금 내 실력에 맞는 첫 레슨을 고르면 로그인 후 해당 레슨으로 바로 시작합니다:'
                      )}
                    </span>
                  </div>
                  <span className="text-[11px] text-muted-foreground">
                    {tr('Free Explore available anytime', '언제든 전 단계 자유 이동 가능')}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                  {QUICK_START_TRACKS.map((track) => (
                    <button
                      key={track.lessonId}
                      type="button"
                      onClick={() => startStudioFlow(`hero_track_${track.code}`, track.lessonId)}
                      className="group text-left rounded-xl border border-border bg-background px-3.5 py-3 hover:border-primary/50 hover:bg-accent-soft/35 transition-colors flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0 space-y-0.5">
                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                          <span className="font-mono font-bold text-primary">{track.code}</span>
                          <span>·</span>
                          <span className="truncate">
                            {locale === 'en' ? track.levelEn : track.levelKo}
                          </span>
                        </div>
                        <div className="text-xs sm:text-sm font-bold text-foreground truncate">
                          {locale === 'en' ? track.titleEn : track.titleKo}
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* SECTION 2: WHY SELF-STUDY STALLS & HOW FRETMASTER SOLVES IT */}
          <section id="why" className="scroll-mt-16 border-b border-border/80 py-16 sm:py-20">
            <div className="mx-auto max-w-6xl px-4 sm:px-6 space-y-10">
              <div className="max-w-2xl space-y-2.5">
                <div className="font-mono text-xs font-semibold uppercase tracking-wider text-primary">
                  {tr('Why Guitarists Stay With FretMaster', '독학의 벽을 넘는 세 가지 차이')}
                </div>
                <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-foreground leading-tight">
                  {tr(
                    'Built for the exact moments where solo guitar practice usually stalls.',
                    '혼자 연습할 때 가장 자주 포기하던 세 가지 순간을 해결했습니다.'
                  )}
                </h2>
                <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                  {tr(
                    'Instead of flashy arcade games or dry theory books, every screen keeps your eyes and ears focused on clean sound and musical understanding.',
                    '화려하기만 한 리듬 게임이나 딱딱한 이론서 대신, 깨끗한 소리·편안한 손 모양·화성의 이유를 하나로 묶었습니다.'
                  )}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {[
                  {
                    icon: Layers,
                    pain: tr(
                      '"I memorize TAB numbers, then forget everything."',
                      '"숫자만 외워 치다 보니 곡이 바뀌면 응용이 안 돼요"'
                    ),
                    title: tr(
                      'Fretboard Harmony Under Your Fingers',
                      '손가락 간격으로 깨우치는 지판 화성'
                    ),
                    desc: tr(
                      'Learn why power chords drop the 3rd and how one pentatonic box plays both Minor and Major moods—directly through finger shapes.',
                      '왜 파워코드에서 3도를 빼는지, 같은 펜타토닉 박스가 왜 마이너와 메이저 두 가지 감정을 내는지 운지 모양 그대로 이해합니다.'
                    ),
                  },
                  {
                    icon: Headphones,
                    pain: tr(
                      '"Backing videos move too fast and my hand tenses up."',
                      '"영상을 따라 치기엔 너무 빠르고 내 자세가 맞는지 불안해요"'
                    ),
                    title: tr(
                      'Slow-Motion Posture & Patient Wait Mode',
                      '슬로우 자세 교정 & 기다려주는 실습'
                    ),
                    desc: tr(
                      'Inspect thumb placement and pick angle at 0.75x speed first, then practice in Wait Mode where the score pauses until you find the note.',
                      '엄지 위치와 피킹 각도를 슬로우모션으로 먼저 확인하고, 내가 정확한 프렛을 짚어 울릴 때까지 악보가 기다려주어 조급함이 사라집니다.'
                    ),
                  },
                  {
                    icon: Mic,
                    pain: tr(
                      '"Nobody tells me if my chords are buzzing or rushing."',
                      '"죽은 줄이 있는지, 박자가 빨라지는지 혼자선 알 길이 없어요"'
                    ),
                    title: tr(
                      'Instant Note, Chord & Mute Feedback',
                      '코드 울림 · 개방현 잡음 · 박자 코칭'
                    ),
                    desc: tr(
                      'Your guitar sound is analyzed live to spot missed chord tones, unmuted open-string ring, flat bends, and weak bars that need looping.',
                      '내가 친 소리를 실시간으로 들어 코드 구성음 누락, 실수로 울린 개방현 잡음, 덜 올라간 벤딩과 흔들린 마디를 콕 집어 알려줍니다.'
                    ),
                  },
                ].map((card) => {
                  const Icon = card.icon;
                  return (
                    <div
                      key={card.title}
                      className="rounded-2xl border border-border bg-card p-6 flex flex-col justify-between space-y-5"
                    >
                      <div className="space-y-4">
                        <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl border border-border bg-accent-soft text-primary">
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="rounded-lg bg-secondary/70 px-3 py-2 text-xs text-muted-foreground italic">
                          {card.pain}
                        </div>
                        <h3 className="text-base sm:text-lg font-bold text-foreground leading-snug">
                          {card.title}
                        </h3>
                        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                          {card.desc}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* SECTION 3: INTERACTIVE SOUND + FRETBOARD HARMONY */}
          <section
            id="harmony"
            className="scroll-mt-16 border-b border-border/80 bg-secondary/25 py-16 sm:py-20"
          >
            <div className="mx-auto max-w-6xl px-4 sm:px-6">
              <div className="grid grid-cols-1 lg:grid-cols-[0.9fr_1.1fr] gap-8 lg:gap-12 items-center">
                <div className="space-y-6">
                  <div className="space-y-2.5">
                    <div className="font-mono text-xs font-semibold uppercase tracking-wider text-primary">
                      {tr('Sound + Shape + Reason', '소리 · 모양 · 원리의 연결')}
                    </div>
                    <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-foreground leading-tight">
                      {tr(
                        'Click the fretboard to hear how simple shapes turn into real music.',
                        '외우지 않아도 이해되는 지판 원리, 직접 눌러 소리로 확인해보세요.'
                      )}
                    </h2>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {tr(
                        'Every lesson connects what you hear to how far your fingers move—so scales and chords feel natural instead of overwhelming.',
                        '어려운 화성학 용어 대신 내가 짚은 모양에서 음 하나가 더해질 때 소리의 감정이 어떻게 바뀌는지 체감하며 배웁니다.'
                      )}
                    </p>
                  </div>

                  <div className="space-y-3">
                    {[
                      {
                        step: '01',
                        text: tr(
                          'Feel half-step (1 fret) and whole-step (2 frets) distance on a single string.',
                          '반음(한 칸)과 온음(두 칸)의 거리감을 한 줄 위에서 귀와 손끝으로 먼저 익힙니다.'
                        ),
                      },
                      {
                        step: '02',
                        text: tr(
                          'Build rock power chords, then flip between happy Major and emotional Minor with one finger.',
                          '파워코드 뼈대 위에 손가락 하나만 더해 밝은 메이저와 애절한 마이너를 자유자재로 오갑니다.'
                        ),
                      },
                      {
                        step: '03',
                        text: tr(
                          'Expand one familiar 5-note pentatonic box into full solos and ear transcription.',
                          '익숙한 펜타토닉 박스 하나에서 명곡 솔로 프레이징과 귀카피, 즉흥 연주까지 자연스럽게 확장합니다.'
                        ),
                      },
                    ].map((item) => (
                      <div key={item.step} className="flex items-start gap-3 text-xs sm:text-sm">
                        <span className="font-mono text-xs font-bold text-primary mt-0.5 shrink-0">
                          {item.step}
                        </span>
                        <span className="text-foreground/85 leading-relaxed">{item.text}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <MagicMoveFretboardDemo
                  locale={locale}
                  onStartLesson={(lessonId) =>
                    startStudioFlow(`harmony_demo_${lessonId}`, lessonId)
                  }
                />
              </div>
            </div>
          </section>

          {/* SECTION 4: 4-STEP PRACTICE LOOP */}
          <section id="method" className="scroll-mt-16 border-b border-border/80 py-16 sm:py-20">
            <div className="mx-auto max-w-6xl px-4 sm:px-6 space-y-8">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div className="max-w-2xl space-y-2.5">
                  <div className="font-mono text-xs font-semibold uppercase tracking-wider text-primary">
                    {tr('4-Step Lesson Flow', '초보자도 완주하는 4단계 레슨 루프')}
                  </div>
                  <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-foreground leading-tight">
                    {tr(
                      'Start slow with zero pressure, finish jamming over a full band groove.',
                      '천천히 한 음씩 익히고, 드럼·베이스 반주 위 완주까지 자연스럽게.'
                    )}
                  </h2>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {tr(
                      'Every single lesson gives you four progressive modes so you never feel stuck or rushed.',
                      '모든 레슨이 가이드 청음 -> 대기 실습 -> 구간 반복 가속 -> 완주 테스트 4단계로 구성되어 포기 없이 실력이 쌓입니다.'
                    )}
                  </p>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => startStudioFlow('workflow_cta', 'm1-1')}
                  className="rounded-xl gap-2 text-xs font-semibold shrink-0 self-start md:self-auto"
                >
                  <span>{tr('Try Step-by-Step in Lesson 1-1', '1-1 레슨으로 직접 체험하기')}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-primary" />
                </Button>
              </div>

              <WorkflowStageShowcase locale={locale} />
            </div>
          </section>

          {/* SECTION 5: LIVE COACHING & EASY 30-SECOND SETUP */}
          <section
            id="coaching"
            className="scroll-mt-16 border-b border-border/80 bg-secondary/25 py-16 sm:py-20"
          >
            <div className="mx-auto max-w-6xl px-4 sm:px-6 space-y-8">
              <div className="max-w-2xl space-y-2.5">
                <div className="font-mono text-xs font-semibold uppercase tracking-wider text-primary">
                  {tr('Real-Time Guitar Coaching', '실시간 연주 피드백 & 간편한 준비')}
                </div>
                <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-foreground leading-tight">
                  {tr(
                    'Like having a patient guitar teacher listening right beside you.',
                    '내 기타 소리를 듣고, 놓치기 쉬운 습관까지 세심하게 짚어줍니다.'
                  )}
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {tr(
                    'Click each scenario below to hear and see how FretMaster coaches chords, muting, and string bends.',
                    '아래 예시를 눌러 코드 스트로크, 개방현 뮤트 잡음, 벤딩 음정을 스튜디오가 어떻게 코칭해주는지 확인해보세요.'
                  )}
                </p>
              </div>

              <LiveCoachingShowcase
                locale={locale}
                onStartLesson={(lessonId) =>
                  startStudioFlow(`coaching_demo_${lessonId}`, lessonId)
                }
              />

              {/* Reassuring Setup Strip */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                {[
                  {
                    icon: Music,
                    title: tr('Any Guitar Input Works', '어떤 연결 방식이든 바로 가능'),
                    desc: tr(
                      'Plug into an audio interface, a USB guitar cable, or simply use your laptop or desktop microphone.',
                      '오디오 인터페이스(Hi-Z), USB 기타 케이블은 물론 별도 장비 없이 일반 마이크만으로도 바로 시작할 수 있습니다.'
                    ),
                  },
                  {
                    icon: SlidersHorizontal,
                    title: tr('Built-In Tuner & Sync Check', '내장 튜너 & 원클릭 싱크 맞춤'),
                    desc: tr(
                      'Tune all 6 strings inside the studio and match your speaker/headphone timing in seconds.',
                      '스튜디오 안의 튜너로 6줄 음정을 맞추고, 스피커·헤드폰 환경에 맞춰 박자 싱크를 손쉽게 보정합니다.'
                    ),
                  },
                  {
                    icon: BookmarkCheck,
                    title: tr('Pick Up Anytime, Anywhere', '어디서든 이어지는 나만의 기록'),
                    desc: tr(
                      'Cleared lessons, personal best BPM, practice streaks, and weak bars stay synced to your Google account.',
                      '통과한 레슨과 최고 BPM, 연속 연습일, 집중 복습할 마디가 계정에 자동 저장되어 언제든 이어서 학습합니다.'
                    ),
                  },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.title}
                      className="rounded-2xl border border-border bg-card p-5 space-y-2"
                    >
                      <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                        <Icon className="w-4 h-4 text-primary shrink-0" />
                        <span>{item.title}</span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* SECTION 6: COMPLETE 39-LESSON CURRICULUM WITH DIRECT LAUNCH */}
          <section id="curriculum" className="scroll-mt-16 border-b border-border/80 py-16 sm:py-20">
            <div className="mx-auto max-w-6xl px-4 sm:px-6 space-y-8">
              <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5">
                <div className="space-y-2.5 max-w-2xl">
                  <div className="font-mono text-xs font-semibold uppercase tracking-wider text-primary">
                    {tr('4 Phases · 9 Modules · 39 Lessons', '4단계 페이즈 · 9개 모듈 · 39개 실전 레슨')}
                  </div>
                  <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-foreground leading-tight">
                    {tr(
                      'Pick any lesson below to sign in and start practicing right away.',
                      '원하는 레슨을 골라 지금 바로 첫 연습을 시작하세요.'
                    )}
                  </h2>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {tr(
                      'Follow the step-by-step path from 1-1, or click any module lesson below to jump straight into that topic.',
                      '1-1부터 차근차근 단계별로 해금하거나, 아래 목록에서 배우고 싶은 레슨을 클릭해 바로 해당 레슨으로 진입할 수 있습니다.'
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
                          active ? 'text-background' : 'text-muted-foreground hover:text-foreground'
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

              {/* Active Phase Goal Banner */}
              <div className="rounded-xl border border-border bg-secondary/45 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs sm:text-sm text-foreground/90 font-medium">
                  {locale === 'en' ? activePhaseMeta.goalEn : activePhaseMeta.goalKo}
                </p>
                <span className="text-[11px] font-medium text-primary">
                  {tr('Click any lesson to launch ->', '레슨 클릭 시 바로 시작 ->')}
                </span>
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
                    transition={{ duration: 0.26, ease: SILK_EASE }}
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                  >
                    {localizedModules.map((mod, idx) => {
                      const modLessons = lessonsByModule.get(mod.id) ?? [];
                      const firstLesson = modLessons[0];
                      return (
                        <motion.div
                          key={mod.id}
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{
                            duration: 0.28,
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

                          <div className="space-y-1 pt-3 border-t border-border/70">
                            {modLessons.map((lesson) => (
                              <button
                                key={lesson.id}
                                type="button"
                                onClick={() =>
                                  startStudioFlow(`curriculum_${lesson.code}`, lesson.id)
                                }
                                className="group w-full text-left rounded-lg px-2 py-1.5 -mx-2 hover:bg-secondary/75 transition-colors flex items-center justify-between gap-2"
                              >
                                <div className="flex items-start gap-2 text-xs text-foreground/90 min-w-0">
                                  <span className="font-mono text-[11px] text-primary font-semibold shrink-0 mt-0.5">
                                    {lesson.code}
                                  </span>
                                  <span className="leading-snug group-hover:text-foreground">
                                    {lesson.title}
                                  </span>
                                </div>
                                <ArrowRight className="w-3.5 h-3.5 text-primary opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                              </button>
                            ))}
                          </div>

                          {firstLesson && (
                            <div className="pt-2 border-t border-border/60">
                              <button
                                type="button"
                                onClick={() =>
                                  startStudioFlow(`module_${mod.number}_start`, firstLesson.id)
                                }
                                className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-secondary/70 hover:bg-accent-soft hover:text-primary px-3 py-2 text-xs font-semibold text-foreground transition-colors"
                              >
                                <span>
                                  {locale === 'en'
                                    ? `Start Module ${mod.number} (${firstLesson.code})`
                                    : `Module ${mod.number} 첫 레슨(${firstLesson.code}) 시작`}
                                </span>
                                <ArrowRight className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </motion.div>
                      );
                    })}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </section>

          {/* SECTION 7: FINAL CONVERSION CALL TO ACTION */}
          <section className="landing-slide-grid py-16 sm:py-24">
            <div className="mx-auto max-w-5xl px-4 sm:px-6 space-y-12">
              <div className="rounded-3xl border border-border bg-card p-8 sm:p-12 shadow-sm text-center space-y-7">
                <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-accent-soft px-3.5 py-1 text-xs font-semibold text-primary">
                  {tr('100% Free Guitar Learning Studio', '무료 회원가입 · 39개 전체 레슨 즉시 오픈')}
                </div>

                <div className="max-w-2xl mx-auto space-y-3">
                  <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-foreground leading-[1.15]">
                    {tr(
                      'Pick up your guitar and ring your first lesson today.',
                      '지금 기타를 꺼내 들고, 오늘 첫 레슨을 울려보세요.'
                    )}
                  </h2>
                  <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                    {tr(
                      'Sign in once with Google to unlock all 39 lessons, slow-motion hand guides, patient Wait-for-Note coaching, and automatic progress saving.',
                      'Google 계정으로 간편하게 시작하면 39개 전 과정 커리큘럼, 슬로우모션 자세 가이드, 실시간 연주 코칭과 개인별 진도 저장이 모두 무료로 열립니다.'
                    )}
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-3">
                  <Button
                    type="button"
                    size="lg"
                    disabled={authLoading || signingIn}
                    onClick={() => startStudioFlow('closing_primary', user ? undefined : 'm1-1')}
                    className="h-12 rounded-xl px-7 gap-2.5 text-sm font-semibold shadow-xs"
                  >
                    {!user && <GoogleGIcon />}
                    <span>
                      {user
                        ? tr('Open Your Studio Now', '내 스튜디오 바로 열기')
                        : signingIn
                          ? tr('Connecting...', 'Google 연결 중...')
                          : tr(
                              'Sign Up Free & Start Lesson 1-1',
                              'Google로 무료 가입하고 1-1 레슨 시작하기'
                            )}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 max-w-2xl mx-auto pt-4 border-t border-border/80 text-xs text-muted-foreground">
                  <div className="rounded-xl border border-border/70 bg-background py-2.5 px-3 font-medium">
                    {tr('All 39 Lessons Free', '입문 ~ 즉흥 39강 전체 무료')}
                  </div>
                  <div className="rounded-xl border border-border/70 bg-background py-2.5 px-3 font-medium">
                    {tr('Real-Time Guitar Listening', '단음 · 코드 · 벤딩 실시간 코칭')}
                  </div>
                  <div className="rounded-xl border border-border/70 bg-background py-2.5 px-3 font-medium">
                    {tr('EN & KO · Light & Dark', '한국어 · 영문 / 라이트 · 다크')}
                  </div>
                </div>
              </div>

              <footer className="border-t border-border/80 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <BrandFretLogo size={18} />
                  <span className="font-semibold text-foreground">FretMaster Studio</span>
                  <span>·</span>
                  <span>
                    {tr('Interactive Electric Guitar Studio', '인터랙티브 일렉트릭 기타 학습 스튜디오')}
                  </span>
                </div>

                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => startStudioFlow('footer_studio')}
                    className="hover:text-foreground transition-colors"
                  >
                    {tr('Start Lesson', '스튜디오 시작하기')}
                  </button>
                  <button
                    type="button"
                    onClick={() => scrollToSection('curriculum')}
                    className="hover:text-foreground transition-colors"
                  >
                    {tr('Curriculum', '커리큘럼')}
                  </button>
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
          </section>
        </main>
      </div>
    </StudioMotionProvider>
  );
}
