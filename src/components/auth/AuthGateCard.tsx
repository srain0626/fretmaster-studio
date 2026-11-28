'use client';

import React, { useMemo, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { BrandFretLogo } from '@/components/icons/GuitarSvgIcons';
import { Button } from '@/components/ui/button';
import { Hint } from '@/components/ui/tooltip';
import { getLessonById, localizeLesson } from '@/data/curriculumData';
import { useAuth } from '@/lib/auth';
import { sanitizeLogLine } from '@/lib/errorSanitizer';
import { useLocale } from '@/lib/i18n';
import { useThemePreference } from '@/lib/theme';
import { ArrowLeft, BookOpen, Cloud, Lock, Monitor, Moon, ShieldCheck, Sun } from 'lucide-react';

function GoogleLogoSvg() {
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

function subscribeLocation(): () => void {
  return () => {};
}

function getClientLessonParam(): string | null {
  try {
    const lessonParam = new URLSearchParams(window.location.search).get('lesson');
    return lessonParam && getLessonById(lessonParam) ? lessonParam : null;
  } catch {
    return null;
  }
}

function getServerLessonParam(): string | null {
  return null;
}

export function AuthGateCard({
  onStartGuestDemo,
}: {
  onStartGuestDemo?: () => void;
} = {}) {
  const { locale, preference: localePref, setPreference: setLocalePref, tr } = useLocale();
  const { themePreference, setThemePreference } = useThemePreference();
  const { isConfigured, authError, signInWithGoogle } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const requestedLessonId = useSyncExternalStore(
    subscribeLocation,
    getClientLessonParam,
    getServerLessonParam
  );

  const targetLesson = useMemo(() => {
    if (!requestedLessonId) return null;
    const found = getLessonById(requestedLessonId);
    return found ? localizeLesson(found, locale) : null;
  }, [locale, requestedLessonId]);

  const handleGoogleLogin = async () => {
    setSubmitting(true);
    try {
      const nextTarget = requestedLessonId
        ? `/studio?lesson=${encodeURIComponent(requestedLessonId)}`
        : '/studio';
      await signInWithGoogle(nextTarget);
    } finally {
      setSubmitting(false);
    }
  };

  const formattedError =
    authError === 'supabase_not_configured'
      ? tr(
          'Authentication server environment variables are not configured yet.',
          'Supabase 인증 환경 변수가 아직 설정되지 않았습니다.'
        )
      : authError === 'oauth_exchange_failed' || authError === 'missing_code'
      ? tr(
          'Google sign-in session could not be verified. Please try again.',
          'Google 로그인 세션을 확인하지 못했습니다. 다시 시도해 주세요.'
        )
      : authError
      ? sanitizeLogLine(authError)
      : null;

  return (
    <div className="relative min-h-screen bg-background text-foreground flex flex-col overflow-x-clip">
      <div className="nr-ambient-aura" aria-hidden="true" />
      <header className="relative z-10 w-full border-b border-border/80 bg-background/75 backdrop-blur-md">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{tr('Back to Home', '홈으로 돌아가기')}</span>
          </Link>

          <div className="flex items-center gap-2">
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
                  className={`rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors ${
                    localePref === opt.id
                      ? 'bg-secondary text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

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
                  <Hint key={opt.id} content={opt.label} side="bottom">
                    <button
                      type="button"
                      onClick={() => setThemePreference(opt.id)}
                      className={`inline-flex items-center gap-1 rounded-[6px] px-2 py-0.5 text-[11px] font-medium transition-colors ${
                        themePreference === opt.id
                          ? 'bg-secondary text-foreground'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <Icon className="w-3 h-3" />
                      <span>{opt.label}</span>
                    </button>
                  </Hint>
                );
              })}
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md rounded-[18px] border border-border bg-card p-6 sm:p-8 shadow-[0_20px_48px_rgba(11,14,16,0.10)] dark:shadow-none space-y-6">
          <div className="flex flex-col items-center space-y-3 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-[14px] border border-border bg-background">
              <BrandFretLogo size={28} />
            </div>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 text-[11px] font-medium text-muted-foreground">
              <Lock className="w-3 h-3 text-primary" />
              <span>{tr('Member Studio Access', '회원 전용 스튜디오')}</span>
            </div>
            <h1 className="font-display text-2xl sm:text-[26px] font-light tracking-[-0.025em] text-foreground">
              {tr('Start Your Guitar Studio', '기타 레슨 스튜디오 시작하기')}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              {tr(
                'Sign in once for free to open all 39 interactive lessons and automatically save your progress, best BPM, and weak bars.',
                '무료 로그인 한 번으로 39개 전체 레슨을 열고, 내 연습 진도와 최고 BPM·취약 마디 기록을 자동으로 이어가세요.'
              )}
            </p>
            {targetLesson && (
              <div className="inline-flex items-center gap-2 rounded-xl border border-primary/35 bg-accent-soft px-3.5 py-2 text-xs text-foreground">
                <BookOpen className="w-3.5 h-3.5 text-primary shrink-0" />
                <span className="font-mono font-semibold text-primary">{targetLesson.code}</span>
                <span className="truncate font-medium">{targetLesson.title}</span>
              </div>
            )}
          </div>

          {!isConfigured && (
            <div className="rounded-xl border border-border bg-secondary/70 px-3.5 py-2.5 text-xs text-muted-foreground leading-relaxed">
              {locale === 'en'
                ? 'Supabase keys are missing in this environment. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to enable Google login.'
                : '이 환경에 Supabase 환경 변수가 설정되지 않았습니다. NEXT_PUBLIC_SUPABASE_URL 및 NEXT_PUBLIC_SUPABASE_ANON_KEY 설정 후 Google 로그인이 활성화됩니다.'}
            </div>
          )}

          {formattedError && (
            <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-3.5 py-2.5 text-xs text-foreground">
              {formattedError}
            </div>
          )}

          <div className="space-y-3">
            <Button
              type="button"
              size="lg"
              variant="signal"
              disabled={!isConfigured || submitting}
              onClick={handleGoogleLogin}
              className="w-full h-11 rounded-[10px] gap-2.5 font-semibold"
            >
              <GoogleLogoSvg />
              <span>
                {submitting
                  ? tr('Redirecting to Google...', 'Google 로그인으로 이동 중...')
                  : tr('Continue with Google', 'Google 계정으로 계속하기')}
              </span>
            </Button>

            {onStartGuestDemo ? (
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={onStartGuestDemo}
                className="w-full h-10 rounded-xl text-xs font-semibold"
              >
                {tr(
                  'Try 3 Starter Lessons Without Sign-In (1-1 · 3-1 · 4-1)',
                  '로그인 없이 3개 대표 레슨 먼저 체험하기 (1-1 · 3-1 · 4-1)'
                )}
              </Button>
            ) : (
              <Link
                href="/studio?demo=1&lesson=m1-1"
                className="w-full h-10 rounded-xl border border-border bg-background hover:bg-secondary/70 text-foreground text-xs font-semibold inline-flex items-center justify-center transition-colors"
              >
                {tr(
                  'Try 3 Starter Lessons Without Sign-In (1-1 · 3-1 · 4-1)',
                  '로그인 없이 3개 대표 레슨 먼저 체험하기 (1-1 · 3-1 · 4-1)'
                )}
              </Link>
            )}

            <div className="grid grid-cols-2 gap-2 pt-1 text-[11px] text-muted-foreground">
              <div className="flex items-center gap-1.5 rounded-lg border border-border/70 bg-background/60 px-2.5 py-2">
                <Cloud className="w-3.5 h-3.5 text-primary shrink-0" />
                <span>{tr('39 Lessons Free', '39개 전 레슨 무료')}</span>
              </div>
              <div className="flex items-center gap-1.5 rounded-lg border border-border/70 bg-background/60 px-2.5 py-2">
                <ShieldCheck className="w-3.5 h-3.5 text-primary shrink-0" />
                <span>{tr('Auto Progress Sync', '내 진도 자동 저장')}</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
