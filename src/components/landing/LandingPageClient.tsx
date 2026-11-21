'use client';

import React, { useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { BrandFretLogo } from '@/components/icons/GuitarSvgIcons';
import { Button } from '@/components/ui/button';
import {
  ALL_LESSONS,
  MODULES,
  localizeLesson,
  localizeModule,
} from '@/data/curriculumData';
import { useAuth } from '@/lib/auth';
import { useLocale } from '@/lib/i18n';
import { useThemePreference } from '@/lib/theme';
import type { PhaseId } from '@/types/guitar';
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  Cloud,
  Film,
  Headphones,
  Layers,
  Monitor,
  Moon,
  ShieldCheck,
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

const PHASES: { id: PhaseId; enLabel: string; koLabel: string }[] = [
  { id: 'phase-1', enLabel: 'Phase I · Foundations', koLabel: 'Phase I · 입문 기본기' },
  { id: 'phase-2', enLabel: 'Phase II · Chords & Scales', koLabel: 'Phase II · 화성 · 스케일' },
  { id: 'phase-3', enLabel: 'Phase III · Tech & Solos', koLabel: 'Phase III · 테크닉 · 솔로' },
  { id: 'phase-4', enLabel: 'Phase IV · Ear & Improv', koLabel: 'Phase IV · 귀카피 · 즉흥' },
];

export function LandingPageClient() {
  const { locale, preference: localePref, setPreference: setLocalePref, tr } = useLocale();
  const { themePreference, setThemePreference, resolvedTheme } = useThemePreference();
  const { user, loading: authLoading, isConfigured, authError, signInWithGoogle } = useAuth();

  const [selectedPhase, setSelectedPhase] = useState<PhaseId>('phase-1');
  const [signingIn, setSigningIn] = useState(false);

  const handlePrimaryAuth = async () => {
    setSigningIn(true);
    try {
      await signInWithGoogle('/studio');
    } finally {
      setSigningIn(false);
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

  const previewSrc = resolvedTheme === 'dark' ? '/preview-dark.png' : '/preview-light.png';

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* Sticky Minimal Navigation Bar */}
      <header className="sticky top-0 z-40 border-b border-border/80 bg-background/90 backdrop-blur-md">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <Link href="/" className="inline-flex items-center gap-2.5 shrink-0">
            <BrandFretLogo size={26} />
            <span className="text-base font-bold tracking-tight text-foreground">
              FretMaster Studio
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">
              {tr('Architecture', '핵심 기능')}
            </a>
            <a href="#curriculum" className="hover:text-foreground transition-colors">
              {tr('39-Lesson Curriculum', '39개 커리큘럼')}
            </a>
            <a href="#workflow" className="hover:text-foreground transition-colors">
              {tr('Practice Loop', '학습 방식')}
            </a>
          </nav>

          <div className="flex items-center gap-2">
            {/* Language Selector */}
            <div className="inline-flex items-center rounded-lg border border-border bg-card p-0.5">
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
                  className={`rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${
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
                onClick={handlePrimaryAuth}
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

      <main className="flex-1">
        {/* Hero Section */}
        <section className="mx-auto max-w-6xl px-4 sm:px-6 pt-12 pb-16 sm:pt-20 sm:pb-24">
          <div className="grid grid-cols-1 lg:grid-cols-[1.05fr_0.95fr] gap-10 lg:gap-12 items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-1 text-[11px] font-semibold text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                <span>
                  {tr(
                    'Open Electric Guitar Studio · 39 Guided Lessons',
                    '오픈 일렉트릭 기타 스튜디오 · 39개 단계별 레슨'
                  )}
                </span>
              </div>

              <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-foreground leading-[1.14]">
                {tr(
                  'From day-one fundamentals to fretboard harmony and fearless improvisation.',
                  '첫 개방현 피킹부터 손끝으로 깨우치는 지판 화성학과 즉흥 연주까지.'
                )}
              </h1>

              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed max-w-xl">
                {tr(
                  'FretMaster Studio unifies tension-free beginner mechanics, 5-layer spiral harmony, 128-sample AudioWorklet YIN pitch detection, interactive Remotion motion guides, and cloud progress sync inside a clutter-free workspace.',
                  '무긴장 입문 기본기, 5단계 나선형 지판 화성학, 128-sample AudioWorklet YIN 실시간 피치 판정, Remotion 화성·자세 애니메이션과 계정별 클라우드 진도 저장을 깔끔한 스튜디오 하나에 담았습니다.'
                )}
              </p>

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

              <div className="flex flex-wrap items-center gap-3 pt-1">
                {user ? (
                  <Link
                    href="/studio"
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
                    onClick={handlePrimaryAuth}
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

                <a
                  href="#curriculum"
                  className="inline-flex items-center justify-center rounded-xl border border-border bg-card px-5 py-2.5 text-sm font-medium text-foreground hover:bg-secondary/70 transition-colors"
                >
                  {tr('Browse 39 Lessons', '커리큘럼 39강 보기')}
                </a>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-border/80">
                {[
                  {
                    value: '4 Phases',
                    label: tr('9 Guided Modules', '9개 핵심 모듈'),
                  },
                  {
                    value: '39 Lessons',
                    label: tr('Unlock or Free Explore', '단계 해금 · 자유 탐색'),
                  },
                  {
                    value: '±1 cent',
                    label: tr('128-Sample YIN DSP', '저지연 실시간 판정'),
                  },
                  {
                    value: 'Cloud Sync',
                    label: tr('Saved Per Account', '계정별 진도 동기화'),
                  },
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

            {/* Real Light/Dark Studio Preview Frame */}
            <div className="rounded-2xl border border-border bg-card p-2.5 shadow-sm">
              <div className="rounded-xl overflow-hidden border border-border/70 bg-background">
                <Image
                  src={previewSrc}
                  alt={tr(
                    'FretMaster Studio 3-column workspace and animated guide preview',
                    'FretMaster Studio 3단 학습 워크스페이스 및 화성 모션 가이드 프리뷰'
                  )}
                  width={1440}
                  height={900}
                  priority
                  className="w-full h-auto block"
                />
              </div>
              <div className="flex items-center justify-between px-2 pt-2.5 pb-1 text-[11px] text-muted-foreground">
                <span>
                  {resolvedTheme === 'dark'
                    ? tr(
                        'Dark Mode · Remotion Pitch Bend & Support Biomechanics',
                        'Dark 모드 · 실시간 벤딩 피치 애니메이션 & 자세 가이드'
                      )
                    : tr(
                        'Light Mode · 4-Finger Color Neck & Synced TAB Timeline',
                        'Light 모드 · 4색 운지 지판 & 마디별 동기화 TAB 악보'
                      )}
                </span>
                <span className="font-mono">EN · KO</span>
              </div>
            </div>
          </div>
        </section>

        {/* Core Architecture Pillars */}
        <section id="features" className="border-t border-border/80 bg-card/40 py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 space-y-10">
            <div className="max-w-2xl space-y-2.5">
              <div className="text-[11px] font-semibold tracking-wider text-primary uppercase">
                {tr('DESIGNED FOR REAL GUITARISTS', '실전 중심 설계')}
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                {tr(
                  'Everything needed to build solid mechanics and harmonic intuition.',
                  '기본기와 화성 감각을 동시에 키우는 네 가지 핵심 엔진'
                )}
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {
                  icon: Layers,
                  title: tr('5-Layer Spiral Harmony', '5단계 나선형 지판 화성학'),
                  body: tr(
                    'Stop memorizing blind TAB dots. Connect half steps, power chords, Major/Minor triads, Am ↔ C relative boxes, and chord tones right under your fingers.',
                    '숫자 암기를 넘어 반음/온음 간격, 파워코드, 장·단3화음, Am↔C 나란한조, 코드 톤 착지까지 지판 위에서 하나로 연결합니다.'
                  ),
                },
                {
                  icon: Activity,
                  title: tr('128-Sample YIN DSP', '초저지연 AudioWorklet DSP'),
                  body: tr(
                    'Runs off the main thread for responsive pitch/onset detection, 4 difficulty tiers from Relaxed to Blind Studio Master, plus local ASIO WebSocket bridge.',
                    '메인 스레드 블로킹 없는 YIN 음고 인식과 4단계(입문~블라인드) 스캐폴딩 판정, 로컬 ASIO 브리지 연결까지 지원합니다.'
                  ),
                },
                {
                  icon: Film,
                  title: tr('Remotion Visual Guides', 'Remotion 화성·자세 애니메이션'),
                  body: tr(
                    'Every lesson launches interactive 11-harmony and 8-biomechanics SVG motion scenes with 0.75x slow motion, scrubbing, and synced Web Audio guitar cues.',
                    '모든 레슨에 11종 화성 원리와 8종 자세 교정 애니메이션이 0.75배속 슬로우모션·실제 신스 사운드와 함께 내장되어 있습니다.'
                  ),
                },
                {
                  icon: Cloud,
                  title: tr('Personal Cloud Sync', '개인별 클라우드 진도 저장'),
                  body: tr(
                    'Sign in with Google once to save lesson grades, skill radar stats, streak history, and hardware audio calibration safely via Supabase PostgreSQL RLS.',
                    'Google 계정 한 번으로 39개 레슨 성적, 역량 레이더, 연속 연습일, 오디오 레이턴시 보정값이 PostgreSQL에 안전하게 동기화됩니다.'
                  ),
                },
              ].map((card) => {
                const Icon = card.icon;
                return (
                  <div
                    key={card.title}
                    className="rounded-2xl border border-border bg-card p-5 space-y-3"
                  >
                    <div className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-accent-soft text-primary">
                      <Icon className="w-4 h-4" />
                    </div>
                    <h3 className="text-sm font-semibold text-foreground">{card.title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {card.body}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Interactive 39-Lesson Curriculum Preview */}
        <section id="curriculum" className="border-t border-border/80 py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 space-y-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div className="space-y-2 max-w-2xl">
                <div className="text-[11px] font-semibold tracking-wider text-primary uppercase">
                  {tr('COMPLETE SYLLABUS', '전체 커리큘럼 로드맵')}
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                  {tr(
                    '4 Phases · 9 Modules · 39 Structured Lessons',
                    '4 Phases · 9 Modules · 39개 단계별 레슨'
                  )}
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {tr(
                    'Inspect every module below before signing in. Inside the studio, unlock lessons progressively or switch on Free Explore anytime.',
                    '로그인 전 전체 커리큘럼 구성을 미리 살펴보세요. 스튜디오 내에서는 단계별 해금과 자유 탐색 모드를 모두 지원합니다.'
                  )}
                </p>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {PHASES.map((phase) => {
                  const active = selectedPhase === phase.id;
                  return (
                    <button
                      key={phase.id}
                      type="button"
                      onClick={() => setSelectedPhase(phase.id)}
                      className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition-colors ${
                        active
                          ? 'bg-foreground text-background'
                          : 'border border-border bg-card text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {locale === 'en' ? phase.enLabel : phase.koLabel}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {localizedModules.map((mod) => {
                const modLessons = lessonsByModule.get(mod.id) ?? [];
                return (
                  <div
                    key={mod.id}
                    className="rounded-2xl border border-border bg-card p-5 flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground">
                        <span>MODULE {mod.number}</span>
                        <span>{modLessons.length} {tr('Lessons', '강')}</span>
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
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* 4-Step Learning Workflow */}
        <section id="workflow" className="border-t border-border/80 bg-card/40 py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 space-y-10">
            <div className="max-w-2xl space-y-2">
              <div className="text-[11px] font-semibold tracking-wider text-primary uppercase">
                {tr('PROGRESSIVE PRACTICE WORKFLOW', '검증된 연습 사이클')}
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                {tr(
                  'From guided listening to blind mastery and cloud evaluation.',
                  '소리 청음부터 한 음씩 따라치기, 템포 완주, 블라인드 통과까지'
                )}
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {
                  step: '01',
                  icon: Headphones,
                  title: tr('Audiate & Inspect', '원리 확인 & 청음'),
                  desc: tr(
                    'Watch the harmony & posture animation and internalize the riff pitch before picking.',
                    '화성·자세 애니메이션과 가이드 음원으로 귀와 손 모양을 먼저 준비합니다.'
                  ),
                },
                {
                  step: '02',
                  icon: CheckCircle2,
                  title: tr('Wait-for-Note Practice', '한 음씩 대기 실습'),
                  desc: tr(
                    'The transport pauses gracefully on each note until you fret cleanly in tune.',
                    '정확한 음과 프렛을 짚을 때까지 반주가 기다려 초보자도 압박 없이 익힙니다.'
                  ),
                },
                {
                  step: '03',
                  icon: Activity,
                  title: tr('Loop & +5 BPM Ramp', '구간 반복 & 자동 가속'),
                  desc: tr(
                    'Isolate tricky bars, lock into drum & bass backing, and ramp +5 BPM automatically.',
                    '어려운 마디만 잘라 드럼·베이스 반주에 맞춰 치며 자동으로 속도를 끌어올립니다.'
                  ),
                },
                {
                  step: '04',
                  icon: ShieldCheck,
                  title: tr('Exam & Cloud Sync', '승급 테스트 & 기록 저장'),
                  desc: tr(
                    'Unlock the next lesson, earn S–C grades, inspect weak bars, and store history to your account.',
                    '테스트 통과 후 취약 마디 분석과 점수 이력을 내 Google 연동 계정에 저장합니다.'
                  ),
                },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.step}
                    className="rounded-2xl border border-border bg-card p-5 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-primary">
                        STEP {item.step}
                      </span>
                      <Icon className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <h3 className="text-sm font-semibold text-foreground">{item.title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Bottom Call to Action Card */}
            <div className="rounded-2xl border border-border bg-card p-6 sm:p-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
              <div className="space-y-2 max-w-xl">
                <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                  {tr(
                    'Ready to plug in and save your guitar journey?',
                    '지금 바로 기타를 연결하고 나만의 연습 기록을 시작해 보세요.'
                  )}
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  {tr(
                    'Sign in once with Google to enter the full 3-column FretMaster Studio with automatic multi-device progress sync.',
                    'Google 계정으로 한 번만 로그인하면 39개 전체 커리큘럼과 실시간 DSP 스튜디오, 다기기 진도 동기화를 무료로 이용할 수 있습니다.'
                  )}
                </p>
              </div>

              {user ? (
                <Link
                  href="/studio"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:opacity-95 transition-opacity shrink-0"
                >
                  <span>{tr('Open Studio', '스튜디오 열기')}</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              ) : (
                <Button
                  type="button"
                  size="lg"
                  disabled={authLoading || signingIn}
                  onClick={handlePrimaryAuth}
                  className="h-11 rounded-xl px-6 gap-2.5 text-sm font-semibold shrink-0"
                >
                  <GoogleGIcon />
                  <span>{tr('Continue with Google', 'Google로 시작하기')}</span>
                </Button>
              )}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/80 py-6">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <BrandFretLogo size={18} />
            <span className="font-medium text-foreground">FretMaster Studio</span>
            <span>·</span>
            <span>GNU GPL-3.0</span>
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
        </div>
      </footer>
    </div>
  );
}
