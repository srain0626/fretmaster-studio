'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { BrandFretLogo } from '@/components/icons/GuitarSvgIcons';
import { Button } from '@/components/ui/button';
import { ALL_LESSONS, localizeLesson } from '@/data/curriculumData';
import { useAuth } from '@/lib/auth';
import type { BugReportRecord, BugReportStatus } from '@/lib/bugReport';
import { useLocale } from '@/lib/i18n';
import { useThemePreference } from '@/lib/theme';
import {
  ArrowLeft,
  BarChart3,
  Bug,
  Clock,
  Database,
  Lock,
  Monitor,
  Moon,
  RefreshCw,
  Search,
  ShieldCheck,
  Sun,
  TrendingUp,
  Users,
} from 'lucide-react';

interface AdminSummary {
  totalUsers: number;
  newUsersToday: number;
  newUsers7d: number;
  todayVisitors: number;
  todayActiveUsers: number;
  wau: number;
  mau: number;
  todayPageViews: number;
  totalEvents: number;
  totalSessions: number;
  passedSessions: number;
  passRatePct: number;
  avgScore: number;
  totalPracticeMinutes: number;
}

interface DailyRow {
  date: string;
  visitors: number;
  activeUsers: number;
  newUsers: number;
  pageViews: number;
  practiceStarts: number;
  examsCompleted: number;
  examsPassed: number;
  eventsCount: number;
}

interface BreakdownItem {
  label: string;
  count: number;
}

interface LessonStatRow {
  lessonId: string;
  views: number;
  practiceStarts: number;
  examAttempts: number;
  examPasses: number;
  passRatePct: number;
  avgScore: number;
  avgBpm: number;
}

interface AdminUserRow {
  id: string;
  email: string | null;
  fullName: string | null;
  preferredLocale: string;
  preferredTheme: string;
  totalCompletedCount: number;
  dayStreak: number;
  dailyPracticeSeconds: number;
  lastPracticeDate: string;
  lastLessonId: string;
  createdAt: string;
  updatedAt: string;
}

interface RecentEventRow {
  id: string;
  eventName: string;
  pagePath: string;
  lessonId: string | null;
  userId: string | null;
  userEmail: string | null;
  sessionId: string;
  deviceType: string;
  locale: string;
  theme: string;
  referrerHost: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

interface RecentSessionRow {
  id: string;
  userEmail: string | null;
  lessonId: string;
  mode: string;
  tier: string;
  score: number;
  grade: string;
  passed: boolean;
  bpmPlayed: number;
  createdAt: string;
}

interface AdminDashboardPayload {
  generatedAt: string;
  daysBack: number;
  timezone: string;
  summary: AdminSummary;
  dailySeries: DailyRow[];
  breakdowns: {
    pages: BreakdownItem[];
    devices: BreakdownItem[];
    locales: BreakdownItem[];
    themes: BreakdownItem[];
    audioModes: BreakdownItem[];
    calibrationModes: BreakdownItem[];
    referrers: BreakdownItem[];
    eventCounts: BreakdownItem[];
  };
  lessonStats: LessonStatRow[];
  users: AdminUserRow[];
  recentEvents: RecentEventRow[];
  recentSessions: RecentSessionRow[];
}

function formatKstDateTime(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString('ko-KR', {
      timeZone: 'Asia/Seoul',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  } catch {
    return iso;
  }
}

function BreakdownTable({
  title,
  emptyLabel,
  itemHeader,
  rows,
  countHeader,
}: {
  title: string;
  emptyLabel: string;
  itemHeader: string;
  rows: BreakdownItem[];
  countHeader: string;
}) {
  const total = rows.reduce((acc, r) => acc + r.count, 0);

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="border-b border-border/80 bg-secondary/40 px-4 py-3 flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold text-foreground">{title}</h3>
        <span className="font-mono tabular-nums text-[11px] text-muted-foreground">
          {total.toLocaleString()}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border/70 text-[11px] text-muted-foreground">
              <th className="py-2 px-4 text-left font-medium">{itemHeader}</th>
              <th className="py-2 px-3 text-right font-medium">{countHeader}</th>
              <th className="py-2 px-4 text-right font-medium w-16">%</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={3} className="py-6 px-4 text-center text-muted-foreground">
                  {emptyLabel}
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const pct = total > 0 ? Math.round((row.count / total) * 100) : 0;
                return (
                  <tr
                    key={row.label}
                    className="border-b border-border/50 last:border-b-0 hover:bg-secondary/35 transition-colors"
                  >
                    <td className="py-2 px-4 font-mono text-[11.5px] text-foreground truncate max-w-[180px]">
                      {row.label}
                    </td>
                    <td className="py-2 px-3 text-right font-mono tabular-nums font-semibold text-foreground">
                      {row.count.toLocaleString()}
                    </td>
                    <td className="py-2 px-4 text-right font-mono tabular-nums text-muted-foreground">
                      {pct}%
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function AdminDashboardClient() {
  const { locale, preference: localePref, setPreference: setLocalePref, tr } = useLocale();
  const { themePreference, setThemePreference } = useThemePreference();
  const { user, loading: authLoading, signInWithGoogle } = useAuth();

  const [days, setDays] = useState<7 | 14 | 30 | 90>(30);
  const [fetching, setFetching] = useState(false);
  const [errorState, setErrorState] = useState<'unauthorized' | 'forbidden' | 'unavailable' | 'error' | null>(null);
  const [setupRequired, setSetupRequired] = useState(false);
  const [adminEmail, setAdminEmail] = useState<string | null>(null);
  const [stats, setStats] = useState<AdminDashboardPayload | null>(null);

  const [lessonSort, setLessonSort] = useState<'popular' | 'lowestPass'>('popular');
  const [userSearch, setUserSearch] = useState('');
  const [activityTab, setActivityTab] = useState<'events' | 'sessions' | 'bugs'>('events');
  const [eventFilter, setEventFilter] = useState<string>('ALL');
  const [bugReports, setBugReports] = useState<BugReportRecord[]>([]);
  const [openBugCount, setOpenBugCount] = useState(0);
  const [bugStatusFilter, setBugStatusFilter] = useState<'all' | BugReportStatus>('all');
  const [updatingBugId, setUpdatingBugId] = useState<string | null>(null);

  const loadStats = useCallback(async (rangeDays: number) => {
    setFetching(true);
    setErrorState(null);
    try {
      const [res, bugsRes] = await Promise.all([
        fetch(`/api/admin/stats?days=${rangeDays}`, { cache: 'no-store' }),
        fetch('/api/admin/bug-reports', { cache: 'no-store' }).catch(() => null),
      ]);
      if (res.status === 401) {
        setErrorState('unauthorized');
        setStats(null);
        return;
      }
      if (res.status === 403) {
        setErrorState('forbidden');
        setStats(null);
        return;
      }
      if (res.status === 503) {
        setErrorState('unavailable');
        setStats(null);
        return;
      }
      if (!res.ok) {
        setErrorState('error');
        return;
      }
      const json = (await res.json()) as {
        setupRequired?: boolean;
        adminEmail?: string;
        data?: AdminDashboardPayload;
      };
      setAdminEmail(json.adminEmail ?? null);
      if (json.setupRequired) {
        setSetupRequired(true);
        setStats(null);
      } else if (json.data) {
        setSetupRequired(false);
        setStats(json.data);
      }

      if (bugsRes && bugsRes.ok) {
        const bugsJson = (await bugsRes.json()) as {
          reports?: BugReportRecord[];
          openCount?: number;
        };
        if (Array.isArray(bugsJson.reports)) {
          setBugReports(bugsJson.reports);
          setOpenBugCount(bugsJson.openCount ?? 0);
        }
      }
    } catch {
      setErrorState('error');
    } finally {
      setFetching(false);
    }
  }, []);

  const handleBugStatusChange = useCallback(
    async (id: string, nextStatus: BugReportStatus) => {
      setUpdatingBugId(id);
      try {
        const res = await fetch('/api/admin/bug-reports', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, status: nextStatus }),
        });
        if (!res.ok) return;
        setBugReports((prev) => {
          const updated = prev.map((r) =>
            r.id === id ? { ...r, status: nextStatus } : r
          );
          setOpenBugCount(
            updated.filter((r) => r.status === 'open' || r.status === 'in_progress')
              .length
          );
          return updated;
        });
      } finally {
        setUpdatingBugId(null);
      }
    },
    []
  );

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setErrorState('unauthorized');
      setStats(null);
      return;
    }
    void loadStats(days);
  }, [authLoading, days, loadStats, user]);

  const lessonMetaMap = useMemo(() => {
    const map = new Map<string, { code: string; title: string }>();
    for (const raw of ALL_LESSONS) {
      const loc = localizeLesson(raw, locale);
      map.set(raw.id, { code: raw.code, title: loc.title });
    }
    return map;
  }, [locale]);

  const sortedLessons = useMemo(() => {
    if (!stats) return [];
    const copy = [...stats.lessonStats];
    if (lessonSort === 'lowestPass') {
      copy.sort((a, b) => {
        if (a.examAttempts === 0 && b.examAttempts > 0) return 1;
        if (b.examAttempts === 0 && a.examAttempts > 0) return -1;
        if (a.passRatePct !== b.passRatePct) return a.passRatePct - b.passRatePct;
        return b.examAttempts - a.examAttempts;
      });
    } else {
      copy.sort(
        (a, b) =>
          b.views + b.practiceStarts + b.examAttempts -
          (a.views + a.practiceStarts + a.examAttempts)
      );
    }
    return copy;
  }, [lessonSort, stats]);

  const filteredUsers = useMemo(() => {
    if (!stats) return [];
    const q = userSearch.trim().toLowerCase();
    if (!q) return stats.users;
    return stats.users.filter(
      (u) =>
        (u.email ?? '').toLowerCase().includes(q) ||
        (u.fullName ?? '').toLowerCase().includes(q)
    );
  }, [stats, userSearch]);

  const distinctEventNames = useMemo(() => {
    if (!stats) return [];
    return Array.from(new Set(stats.recentEvents.map((e) => e.eventName))).sort();
  }, [stats]);

  const filteredEvents = useMemo(() => {
    if (!stats) return [];
    if (eventFilter === 'ALL') return stats.recentEvents;
    return stats.recentEvents.filter((e) => e.eventName === eventFilter);
  }, [eventFilter, stats]);

  const chartDaily = useMemo(() => {
    if (!stats) return [];
    return [...stats.dailySeries].slice(0, 14).reverse();
  }, [stats]);

  const chartMax = useMemo(() => {
    if (chartDaily.length === 0) return 1;
    return Math.max(
      1,
      ...chartDaily.map((d) => Math.max(d.visitors, d.activeUsers, d.pageViews))
    );
  }, [chartDaily]);

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* Top Admin Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/studio"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors shrink-0"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{tr('Studio', '스튜디오')}</span>
            </Link>
            <div className="flex items-center gap-2 min-w-0">
              <BrandFretLogo size={22} />
              <span className="text-sm sm:text-base font-bold tracking-tight truncate">
                {tr('Admin Analytics', '어드민 통계 대시보드')}
              </span>
              <span className="hidden md:inline-flex items-center gap-1 rounded-full bg-accent-soft px-2.5 py-0.5 font-mono text-[10px] font-semibold text-primary shrink-0">
                <ShieldCheck className="w-3 h-3" />
                {adminEmail ?? user?.email ?? 'ADMIN'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {stats && (
              <div className="hidden sm:inline-flex items-center rounded-lg border border-border bg-card p-0.5">
                {([7, 14, 30, 90] as const).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDays(d)}
                    className={`rounded-md px-2 py-1 font-mono text-[11px] font-medium transition-colors ${
                      days === d
                        ? 'bg-foreground text-background'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {d}d
                  </button>
                ))}
              </div>
            )}

            {stats && openBugCount > 0 && (
              <button
                type="button"
                onClick={() => {
                  setActivityTab('bugs');
                  document
                    .getElementById('admin-activity-panel')
                    ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-destructive/40 bg-destructive/10 px-2.5 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/15 transition-colors"
              >
                <Bug className="w-3.5 h-3.5" />
                <span>{tr(`${openBugCount} Bugs`, `미처리 버그 ${openBugCount}`)}</span>
              </button>
            )}

            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={fetching || authLoading}
              onClick={() => void loadStats(days)}
              className="gap-1.5 text-xs rounded-lg"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${fetching ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{tr('Refresh', '새로고침')}</span>
            </Button>

            {/* Language & Theme */}
            <div className="hidden md:inline-flex items-center rounded-lg border border-border bg-card p-0.5">
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
                    className={`rounded-md px-2 py-1 text-[11px] transition-colors ${
                      themePreference === opt.id
                        ? 'bg-secondary text-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                    title={opt.label}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 py-6 sm:py-8 space-y-8">
        {/* Loading State */}
        {(authLoading || (fetching && !stats && !errorState && !setupRequired)) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div
                key={idx}
                className="h-28 rounded-2xl border border-border bg-card p-5 animate-pulse"
              />
            ))}
          </div>
        )}

        {/* Unauthorized (Sign In Required) */}
        {!authLoading && errorState === 'unauthorized' && (
          <div className="mx-auto max-w-lg rounded-2xl border border-border bg-card p-8 text-center space-y-5 mt-8">
            <div className="mx-auto inline-flex h-11 w-11 items-center justify-center rounded-xl bg-accent-soft text-primary">
              <Lock className="w-5 h-5" />
            </div>
            <div className="space-y-1.5">
              <h1 className="text-lg font-bold text-foreground">
                {tr('Admin Sign-In Required', '관리자 계정 로그인 필요')}
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                {tr(
                  'Please sign in with the authorized Google account to view site analytics and active user metrics.',
                  '허용된 관리자 Google 계정으로 로그인하면 방문자 수, 활성 유저, 레슨별 통계 표를 확인할 수 있습니다.'
                )}
              </p>
            </div>
            <div className="flex items-center justify-center gap-2.5">
              <Button type="button" onClick={() => void signInWithGoogle('/admin')}>
                {tr('Continue with Google', 'Google 계정으로 로그인')}
              </Button>
              <Link
                href="/"
                className="rounded-xl border border-border bg-background px-4 py-2 text-xs font-medium text-foreground hover:bg-secondary/70"
              >
                {tr('Home', '홈으로')}
              </Link>
            </div>
          </div>
        )}

        {/* Forbidden (Non-admin account) */}
        {!authLoading && errorState === 'forbidden' && (
          <div className="mx-auto max-w-lg rounded-2xl border border-border bg-card p-8 text-center space-y-5 mt-8">
            <div className="mx-auto inline-flex h-11 w-11 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="space-y-1.5">
              <div className="font-mono text-xs font-semibold text-destructive">403 FORBIDDEN</div>
              <h1 className="text-lg font-bold text-foreground">
                {tr('Admin Access Restricted', '관리자 권한이 없는 계정입니다')}
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                {tr(
                  'Signed in as an external account without admin privileges. Return to your practice workspace.',
                  '현재 로그인된 계정에는 관리자 대시보드 열람 권한이 없습니다.'
                )}
              </p>
            </div>
            <div className="flex items-center justify-center gap-2.5">
              <Link
                href="/studio"
                className="rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
              >
                {tr('Open Studio', '스튜디오로 돌아가기')}
              </Link>
              <Link
                href="/"
                className="rounded-xl border border-border bg-background px-4 py-2 text-xs font-medium text-foreground"
              >
                {tr('Landing Page', '랜딩 페이지')}
              </Link>
            </div>
          </div>
        )}

        {/* Schema Setup Required Notice */}
        {!authLoading && setupRequired && (
          <div className="mx-auto max-w-2xl rounded-2xl border border-border bg-card p-7 space-y-4 mt-6">
            <div className="flex items-center gap-2.5 text-primary">
              <Database className="w-5 h-5" />
              <h1 className="text-base font-bold text-foreground">
                {tr('Supabase Analytics Schema Migration Needed', 'Supabase 통계 스키마 적용 필요')}
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              {tr(
                'Your admin account is authenticated cleanly. Please run the updated `supabase/schema.sql` script once in Supabase Dashboard -> SQL Editor to create `public.analytics_events` and `public.get_admin_dashboard_stats`.',
                '관리자 계정 인증이 정상 확인되었습니다. Supabase Dashboard -> SQL Editor에서 최신 `supabase/schema.sql` 전체를 1회 실행하면 `analytics_events` 테이블과 `get_admin_dashboard_stats` 집계 함수가 생성되어 즉시 데이터가 표시됩니다.'
              )}
            </p>
            <Button type="button" onClick={() => void loadStats(days)} className="gap-1.5 text-xs">
              <RefreshCw className="w-3.5 h-3.5" />
              {tr('Re-check Connection', '적용 후 다시 불러오기')}
            </Button>
          </div>
        )}

        {/* Error fallback */}
        {!authLoading && (errorState === 'error' || errorState === 'unavailable') && (
          <div className="mx-auto max-w-lg rounded-2xl border border-border bg-card p-7 text-center space-y-4 mt-6">
            <h1 className="text-base font-bold text-foreground">
              {tr('Unable to load admin statistics', '통계 데이터를 불러오지 못했습니다')}
            </h1>
            <p className="text-xs text-muted-foreground">
              {errorState === 'unavailable'
                ? tr(
                    'Supabase environment variables are not configured in this runtime.',
                    '현재 환경에 Supabase 환경 변수가 설정되지 않았습니다.'
                  )
                : tr(
                    'Please verify your session and database connection and try again.',
                    '세션 및 데이터베이스 연결을 확인한 뒤 다시 시도해 주세요.'
                  )}
            </p>
            <Button type="button" onClick={() => void loadStats(days)} className="text-xs">
              {tr('Retry', '다시 시도')}
            </Button>
          </div>
        )}

        {/* Main Admin Tables & Metrics */}
        {stats && (
          <>
            {/* Mobile period selector + timestamp */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-0.5">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                  {tr('Live User & Practice Telemetry Overview', '실시간 방문자 · 활성 유저 · 학습 통계')}
                </h1>
                <p className="text-xs text-muted-foreground font-mono tabular-nums">
                  TZ: {stats.timezone} · Window: {stats.daysBack}d · Updated:{' '}
                  {formatKstDateTime(stats.generatedAt)}
                </p>
              </div>
              <div className="sm:hidden inline-flex items-center rounded-lg border border-border bg-card p-0.5">
                {([7, 14, 30, 90] as const).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDays(d)}
                    className={`rounded-md px-2 py-1 font-mono text-[11px] font-medium ${
                      days === d ? 'bg-foreground text-background' : 'text-muted-foreground'
                    }`}
                  >
                    {d}d
                  </button>
                ))}
              </div>
            </div>

            {/* Section 1: KPI Strip + Core Activity Table */}
            <section className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {[
                  {
                    label: tr('Today Visitors', '오늘 방문자 수'),
                    value: stats.summary.todayVisitors.toLocaleString(),
                    sub: tr(`${stats.summary.todayPageViews} page views`, `페이지뷰 ${stats.summary.todayPageViews}건`),
                    highlight: true,
                  },
                  {
                    label: tr('Today Active (DAU)', '오늘 활성 유저 (DAU)'),
                    value: stats.summary.todayActiveUsers.toLocaleString(),
                    sub: tr('Logged-in learners today', '오늘 학습·방문 계정'),
                    highlight: true,
                  },
                  {
                    label: tr('Weekly Active (WAU)', '주간 활성 유저 (WAU)'),
                    value: stats.summary.wau.toLocaleString(),
                    sub: tr(`New 7d: +${stats.summary.newUsers7d}`, `최근 7일 신규 +${stats.summary.newUsers7d}`),
                  },
                  {
                    label: tr('Monthly Active (MAU)', '월간 활성 유저 (MAU)'),
                    value: stats.summary.mau.toLocaleString(),
                    sub: tr('Rolling 30 days', '최근 30일 기준'),
                  },
                  {
                    label: tr('Total Users', '총 가입 유저 수'),
                    value: stats.summary.totalUsers.toLocaleString(),
                    sub: tr(`New today: +${stats.summary.newUsersToday}`, `오늘 신규 가입 +${stats.summary.newUsersToday}`),
                  },
                  {
                    label: tr('Exam Pass / Practice', '시험 통과율 · 연습량'),
                    value: `${stats.summary.passRatePct}%`,
                    sub: `${stats.summary.avgScore} pts · ${stats.summary.totalPracticeMinutes} min`,
                  },
                ].map((kpi) => (
                  <div
                    key={kpi.label}
                    className={`rounded-2xl border bg-card p-4 space-y-1.5 ${
                      kpi.highlight ? 'border-primary/40' : 'border-border'
                    }`}
                  >
                    <div className="text-[11px] font-medium text-muted-foreground">{kpi.label}</div>
                    <div className="font-mono tabular-nums text-2xl font-bold text-foreground">
                      {kpi.value}
                    </div>
                    <div className="text-[11px] text-muted-foreground font-mono tabular-nums">
                      {kpi.sub}
                    </div>
                  </div>
                ))}
              </div>

              {/* Explicit KPI Summary Table */}
              <div className="rounded-2xl border border-border bg-card overflow-hidden">
                <div className="border-b border-border/80 bg-secondary/40 px-4 py-3 flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" />
                  <h2 className="text-sm font-bold text-foreground">
                    {tr('Key User & Engagement Summary Table', '핵심 유저 · 활성 지표 요약 표')}
                  </h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border text-[11px] text-muted-foreground">
                        <th className="py-2.5 px-4 text-left font-medium">{tr('Metric', '지표')}</th>
                        <th className="py-2.5 px-4 text-left font-medium">{tr('Definition', '집계 기준')}</th>
                        <th className="py-2.5 px-4 text-right font-medium">{tr('Value', '수치')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        {
                          m: tr('Today Visitors (Sessions)', '오늘 방문한 유저 수 (고유 방문)'),
                          d: tr('Distinct visitors with events or page views today (KST)', '오늘 KST 기준 페이지 방문 고유 세션/계정 수'),
                          v: `${stats.summary.todayVisitors.toLocaleString()} (${stats.summary.todayPageViews} views)`,
                        },
                        {
                          m: tr('Today Active Users (DAU)', '오늘 활성 유저 수 (DAU)'),
                          d: tr('Distinct signed-in users practicing or active today', '오늘 접속·연습·시험을 진행한 로그인 유저 수'),
                          v: stats.summary.todayActiveUsers.toLocaleString(),
                        },
                        {
                          m: tr('Weekly / Monthly Active Users (WAU / MAU)', '주간 / 월간 활성 유저 수 (WAU / MAU)'),
                          d: tr('Distinct signed-in learners across last 7 / 30 days', '최근 7일 / 30일 누적 로그인 활성 유저 수'),
                          v: `${stats.summary.wau.toLocaleString()} / ${stats.summary.mau.toLocaleString()}`,
                        },
                        {
                          m: tr('Registered Users (New Today / 7d / Total)', '가입 유저 현황 (오늘 신규 / 7일 / 누적)'),
                          d: tr('Google OAuth accounts stored in profiles', 'Google 로그인으로 생성된 전체 프로필 계정'),
                          v: `+${stats.summary.newUsersToday} / +${stats.summary.newUsers7d} / ${stats.summary.totalUsers.toLocaleString()}`,
                        },
                        {
                          m: tr(`Telemetry Events (${stats.daysBack}d)`, `수집 이벤트 수 (${stats.daysBack}일)`),
                          d: tr('Page views, practice starts, audio, calibration, and exam events', '페이지뷰, 연습 시작, 오디오, 보정, 시험 이벤트 합계'),
                          v: stats.summary.totalEvents.toLocaleString(),
                        },
                        {
                          m: tr(`Exam Sessions & Pass Rate (${stats.daysBack}d)`, `시험 응시 및 통과율 (${stats.daysBack}일)`),
                          d: tr('Completed exams and mean score in period', '기간 내 시험 통과 횟수 / 응시 횟수 (평균 점수)'),
                          v: `${stats.summary.passedSessions} / ${stats.summary.totalSessions} (${stats.summary.passRatePct}% · avg ${stats.summary.avgScore})`,
                        },
                      ].map((row) => (
                        <tr
                          key={row.m}
                          className="border-b border-border/50 last:border-b-0 hover:bg-secondary/35 transition-colors"
                        >
                          <td className="py-2.5 px-4 font-semibold text-foreground">{row.m}</td>
                          <td className="py-2.5 px-4 text-muted-foreground">{row.d}</td>
                          <td className="py-2.5 px-4 text-right font-mono tabular-nums font-bold text-foreground whitespace-nowrap">
                            {row.v}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>

            {/* Section 2: Daily Visitors & Active Users Trend (Mini Bar Visual + Full Table) */}
            <section className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="border-b border-border/80 bg-secondary/40 px-4 py-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  <h2 className="text-sm font-bold text-foreground">
                    {tr(
                      `Daily Visitors & Active Users (${stats.daysBack} Days, KST)`,
                      `일별 방문자 및 활성 유저 추이 표 (최근 ${stats.daysBack}일, KST)`
                    )}
                  </h2>
                </div>
                <div className="flex items-center gap-3 text-[11px] font-mono text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-xs bg-foreground/25" />
                    {tr('Visitors', '방문자')}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-xs bg-primary" />
                    {tr('Active Users', '활성 유저')}
                  </span>
                </div>
              </div>

              {/* Compact 14-day Bar Visualization */}
              {chartDaily.length > 0 && (
                <div className="px-4 pt-4 pb-3 border-b border-border/70">
                  <div className="h-24 flex items-end gap-1.5">
                    {chartDaily.map((d) => {
                      const visH = Math.max(4, Math.round((d.visitors / chartMax) * 100));
                      const actH = Math.max(
                        d.activeUsers > 0 ? 4 : 0,
                        Math.round((d.activeUsers / chartMax) * 100)
                      );
                      return (
                        <div
                          key={d.date}
                          title={`${d.date}: Visitors ${d.visitors}, Active ${d.activeUsers}, Views ${d.pageViews}`}
                          className="flex-1 h-full flex flex-col justify-end items-center gap-1"
                        >
                          <div className="w-full flex items-end justify-center gap-0.5 h-20">
                            <div
                              style={{ height: `${visH}%` }}
                              className="w-1/2 max-w-3 rounded-t-xs bg-foreground/25"
                            />
                            <div
                              style={{ height: `${actH}%` }}
                              className="w-1/2 max-w-3 rounded-t-xs bg-primary"
                            />
                          </div>
                          <span className="font-mono text-[9px] text-muted-foreground">
                            {d.date.slice(5)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="overflow-x-auto max-h-[380px]">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-card border-b border-border text-[11px] text-muted-foreground">
                    <tr>
                      <th className="py-2.5 px-4 text-left font-medium">{tr('Date (KST)', '날짜 (KST)')}</th>
                      <th className="py-2.5 px-3 text-right font-medium">{tr('Visitors', '방문자(세션)')}</th>
                      <th className="py-2.5 px-3 text-right font-medium">{tr('Active (DAU)', '활성 유저')}</th>
                      <th className="py-2.5 px-3 text-right font-medium">{tr('New Users', '신규 가입')}</th>
                      <th className="py-2.5 px-3 text-right font-medium">{tr('Page Views', '페이지뷰')}</th>
                      <th className="py-2.5 px-3 text-right font-medium">{tr('Practice Starts', '연습 시작')}</th>
                      <th className="py-2.5 px-3 text-right font-medium">{tr('Exams', '시험 완료')}</th>
                      <th className="py-2.5 px-3 text-right font-medium">{tr('Pass %', '통과율')}</th>
                      <th className="py-2.5 px-4 text-right font-medium">{tr('Events', '총 이벤트')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.dailySeries.map((row, idx) => {
                      const passRate =
                        row.examsCompleted > 0
                          ? Math.round((row.examsPassed / row.examsCompleted) * 100)
                          : 0;
                      const isToday = idx === 0;
                      return (
                        <tr
                          key={row.date}
                          className={`border-b border-border/50 last:border-b-0 hover:bg-secondary/35 transition-colors ${
                            isToday ? 'bg-accent-soft/35' : ''
                          }`}
                        >
                          <td className="py-2 px-4 font-mono font-semibold text-foreground whitespace-nowrap">
                            {row.date}{' '}
                            {isToday && (
                              <span className="ml-1 rounded bg-accent-soft px-1.5 py-0.5 text-[10px] text-primary">
                                TODAY
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-right font-mono tabular-nums font-semibold text-foreground">
                            {row.visitors}
                          </td>
                          <td className="py-2 px-3 text-right font-mono tabular-nums font-bold text-primary">
                            {row.activeUsers}
                          </td>
                          <td className="py-2 px-3 text-right font-mono tabular-nums text-foreground">
                            {row.newUsers > 0 ? `+${row.newUsers}` : '0'}
                          </td>
                          <td className="py-2 px-3 text-right font-mono tabular-nums text-muted-foreground">
                            {row.pageViews}
                          </td>
                          <td className="py-2 px-3 text-right font-mono tabular-nums text-muted-foreground">
                            {row.practiceStarts}
                          </td>
                          <td className="py-2 px-3 text-right font-mono tabular-nums text-muted-foreground">
                            {row.examsCompleted}
                          </td>
                          <td className="py-2 px-3 text-right font-mono tabular-nums text-muted-foreground">
                            {row.examsCompleted > 0 ? `${passRate}%` : '-'}
                          </td>
                          <td className="py-2 px-4 text-right font-mono tabular-nums text-muted-foreground">
                            {row.eventsCount}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Section 3: Environment, Feature & Traffic Breakdown Tables */}
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" />
                <h2 className="text-sm font-bold text-foreground">
                  {tr('Traffic, Device, Audio & Feature Breakdown Tables', '페이지 · 기기 · 언어 · 오디오 기능 통계 표')}
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <BreakdownTable
                  title={tr('Pages Visited', '페이지별 조회수')}
                  emptyLabel={tr('No page views recorded yet', '수집된 페이지뷰 없음')}
                  itemHeader={tr('Path', '경로')}
                  rows={stats.breakdowns.pages}
                  countHeader={tr('Views', '조회')}
                />
                <BreakdownTable
                  title={tr('Devices & Referrers', '접속 기기 분포')}
                  emptyLabel={tr('No device data yet', '수집된 기기 데이터 없음')}
                  itemHeader={tr('Device', '기기')}
                  rows={stats.breakdowns.devices}
                  countHeader={tr('Users', '유저')}
                />
                <BreakdownTable
                  title={tr('Language & Theme', '언어별 유저 분포')}
                  emptyLabel={tr('No locale data yet', '언어 데이터 없음')}
                  itemHeader={tr('Locale', '언어')}
                  rows={stats.breakdowns.locales}
                  countHeader={tr('Users', '유저')}
                />
                <BreakdownTable
                  title={tr('Theme Preference', '라이트/다크 테마 분포')}
                  emptyLabel={tr('No theme data yet', '테마 데이터 없음')}
                  itemHeader={tr('Theme', '테마')}
                  rows={stats.breakdowns.themes}
                  countHeader={tr('Users', '유저')}
                />
                <BreakdownTable
                  title={tr('Referrer Hosts', '유입 도메인')}
                  emptyLabel={tr('No referrer data yet', '유입 데이터 없음')}
                  itemHeader={tr('Host', '도메인')}
                  rows={stats.breakdowns.referrers}
                  countHeader={tr('Sessions', '방문')}
                />
                <BreakdownTable
                  title={tr('Audio Engine Modes', '오디오 연결 방식')}
                  emptyLabel={tr('No audio connections yet', '오디오 연결 기록 없음')}
                  itemHeader={tr('Mode', '방식')}
                  rows={stats.breakdowns.audioModes}
                  countHeader={tr('Count', '횟수')}
                />
                <BreakdownTable
                  title={tr('Latency Calibration Methods', '레이턴시 보정 방식')}
                  emptyLabel={tr('No calibrations yet', '보정 기록 없음')}
                  itemHeader={tr('Method', '방식')}
                  rows={stats.breakdowns.calibrationModes}
                  countHeader={tr('Count', '횟수')}
                />
                <BreakdownTable
                  title={tr('Event Totals', '전체 이벤트 집계')}
                  emptyLabel={tr('No events recorded yet', '수집된 이벤트 없음')}
                  itemHeader={tr('Event', '이벤트명')}
                  rows={stats.breakdowns.eventCounts}
                  countHeader={tr('Events', '건수')}
                />
              </div>
            </section>

            {/* Section 4: Lesson Engagement & Pass Rate Table */}
            <section className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="border-b border-border/80 bg-secondary/40 px-4 py-3 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-bold text-foreground">
                  {tr('Lesson Engagement & Bottleneck Analysis Table', '레슨별 인기도 · 시험 통과율 표')}
                </h2>
                <div className="inline-flex items-center rounded-lg border border-border bg-card p-0.5 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setLessonSort('popular')}
                    className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
                      lessonSort === 'popular'
                        ? 'bg-foreground text-background'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {tr('Most Active', '인기순')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setLessonSort('lowestPass')}
                    className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
                      lessonSort === 'lowestPass'
                        ? 'bg-foreground text-background'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {tr('Lowest Pass Rate', '낮은 통과율순 (병목)')}
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto max-h-[360px]">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-card border-b border-border text-[11px] text-muted-foreground">
                    <tr>
                      <th className="py-2.5 px-4 text-left font-medium">{tr('Lesson', '레슨')}</th>
                      <th className="py-2.5 px-3 text-right font-medium">{tr('Views', '선택 수')}</th>
                      <th className="py-2.5 px-3 text-right font-medium">{tr('Practice', '연습 시작')}</th>
                      <th className="py-2.5 px-3 text-right font-medium">{tr('Exams', '시험 응시')}</th>
                      <th className="py-2.5 px-3 text-right font-medium">{tr('Passed', '통과')}</th>
                      <th className="py-2.5 px-3 text-right font-medium">{tr('Pass %', '통과율')}</th>
                      <th className="py-2.5 px-3 text-right font-medium">{tr('Avg Score', '평균 점수')}</th>
                      <th className="py-2.5 px-4 text-right font-medium">{tr('Avg BPM', '평균 BPM')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedLessons.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-8 px-4 text-center text-muted-foreground">
                          {tr('No lesson activity recorded in this window yet.', '기간 내 레슨 활동 데이터가 아직 없습니다.')}
                        </td>
                      </tr>
                    ) : (
                      sortedLessons.map((row) => {
                        const meta = lessonMetaMap.get(row.lessonId);
                        return (
                          <tr
                            key={row.lessonId}
                            className="border-b border-border/50 last:border-b-0 hover:bg-secondary/35 transition-colors"
                          >
                            <td className="py-2 px-4">
                              <span className="font-mono text-[11px] font-bold text-primary mr-2">
                                {meta?.code ?? row.lessonId}
                              </span>
                              <span className="text-foreground font-medium">
                                {meta?.title ?? row.lessonId}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-right font-mono tabular-nums text-foreground">
                              {row.views}
                            </td>
                            <td className="py-2 px-3 text-right font-mono tabular-nums text-foreground">
                              {row.practiceStarts}
                            </td>
                            <td className="py-2 px-3 text-right font-mono tabular-nums text-foreground">
                              {row.examAttempts}
                            </td>
                            <td className="py-2 px-3 text-right font-mono tabular-nums text-success">
                              {row.examPasses}
                            </td>
                            <td className="py-2 px-3 text-right font-mono tabular-nums font-semibold text-foreground">
                              {row.examAttempts > 0 ? `${row.passRatePct}%` : '-'}
                            </td>
                            <td className="py-2 px-3 text-right font-mono tabular-nums text-muted-foreground">
                              {row.examAttempts > 0 ? row.avgScore : '-'}
                            </td>
                            <td className="py-2 px-4 text-right font-mono tabular-nums text-muted-foreground">
                              {row.avgBpm > 0 ? row.avgBpm : '-'}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Section 5: Registered Users Directory Table */}
            <section className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="border-b border-border/80 bg-secondary/40 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-sm font-bold text-foreground">
                  {tr(
                    `Registered Users (${filteredUsers.length})`,
                    `가입 유저 목록 표 (${filteredUsers.length}명)`
                  )}
                </h2>
                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="search"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder={tr('Search email or name...', '이메일 또는 이름 검색...')}
                    className="w-full rounded-lg border border-border bg-background pl-8 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
              </div>
              <div className="overflow-x-auto max-h-[380px]">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-card border-b border-border text-[11px] text-muted-foreground">
                    <tr>
                      <th className="py-2.5 px-4 text-left font-medium">{tr('User', '유저 (이름 / 이메일)')}</th>
                      <th className="py-2.5 px-3 text-right font-medium">{tr('Completed', '완료 레슨')}</th>
                      <th className="py-2.5 px-3 text-right font-medium">{tr('Streak', '연속일')}</th>
                      <th className="py-2.5 px-3 text-right font-medium">{tr('Daily Practice', '오늘 연습')}</th>
                      <th className="py-2.5 px-3 text-left font-medium">{tr('Last Practice', '최근 연습일')}</th>
                      <th className="py-2.5 px-3 text-left font-medium">{tr('Last Lesson', '최근 레슨')}</th>
                      <th className="py-2.5 px-3 text-left font-medium">{tr('Locale', '언어')}</th>
                      <th className="py-2.5 px-4 text-right font-medium">{tr('Joined (KST)', '가입일')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-8 px-4 text-center text-muted-foreground">
                          {tr('No matching users found.', '일치하는 가입 유저가 없습니다.')}
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((u) => {
                        const meta = lessonMetaMap.get(u.lastLessonId);
                        return (
                          <tr
                            key={u.id}
                            className="border-b border-border/50 last:border-b-0 hover:bg-secondary/35 transition-colors"
                          >
                            <td className="py-2 px-4">
                              <div className="font-semibold text-foreground">
                                {u.fullName || tr('Guitarist', '사용자')}
                              </div>
                              <div className="font-mono text-[11px] text-muted-foreground">
                                {u.email ?? '-'}
                              </div>
                            </td>
                            <td className="py-2 px-3 text-right font-mono tabular-nums font-semibold text-foreground">
                              {u.totalCompletedCount} / 39
                            </td>
                            <td className="py-2 px-3 text-right font-mono tabular-nums text-primary font-semibold">
                              {u.dayStreak}d
                            </td>
                            <td className="py-2 px-3 text-right font-mono tabular-nums text-muted-foreground">
                              {Math.round(u.dailyPracticeSeconds / 60)} min
                            </td>
                            <td className="py-2 px-3 font-mono text-[11px] text-muted-foreground">
                              {u.lastPracticeDate || '-'}
                            </td>
                            <td className="py-2 px-3 font-mono text-[11px] text-foreground">
                              {meta?.code ?? u.lastLessonId}
                            </td>
                            <td className="py-2 px-3 font-mono text-[11px] uppercase text-muted-foreground">
                              {u.preferredLocale}
                            </td>
                            <td className="py-2 px-4 text-right font-mono tabular-nums text-[11px] text-muted-foreground whitespace-nowrap">
                              {formatKstDateTime(u.createdAt)}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Section 6: Recent Events, Exam Sessions & Bug Reports */}
            <section
              id="admin-activity-panel"
              className="rounded-2xl border border-border bg-card overflow-hidden"
            >
              <div className="border-b border-border/80 bg-secondary/40 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" />
                  <div className="inline-flex items-center rounded-lg border border-border bg-card p-0.5 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setActivityTab('events')}
                      className={`rounded-md px-2.5 py-1 font-semibold transition-colors ${
                        activityTab === 'events'
                          ? 'bg-foreground text-background'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {tr(`Recent Events (${filteredEvents.length})`, `최근 이벤트 로그 (${filteredEvents.length})`)}
                    </button>
                    <button
                      type="button"
                      onClick={() => setActivityTab('sessions')}
                      className={`rounded-md px-2.5 py-1 font-semibold transition-colors ${
                        activityTab === 'sessions'
                          ? 'bg-foreground text-background'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {tr(`Recent Exams (${stats.recentSessions.length})`, `최근 시험 기록 (${stats.recentSessions.length})`)}
                    </button>
                    <button
                      type="button"
                      onClick={() => setActivityTab('bugs')}
                      className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 font-semibold transition-colors ${
                        activityTab === 'bugs'
                          ? 'bg-foreground text-background'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <span>{tr(`Bug Reports (${bugReports.length})`, `버그 리포트 (${bugReports.length})`)}</span>
                      {openBugCount > 0 && (
                        <span className="rounded-full bg-destructive text-destructive-foreground px-1.5 py-0.5 text-[10px] font-mono leading-none">
                          {openBugCount}
                        </span>
                      )}
                    </button>
                  </div>
                </div>

                {activityTab === 'events' && (
                  <select
                    aria-label={tr('Filter by event', '이벤트 필터')}
                    value={eventFilter}
                    onChange={(e) => setEventFilter(e.target.value)}
                    className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground"
                  >
                    <option value="ALL">{tr('All Events', '전체 이벤트')}</option>
                    {distinctEventNames.map((ev) => (
                      <option key={ev} value={ev}>
                        {ev}
                      </option>
                    ))}
                  </select>
                )}

                {activityTab === 'bugs' && (
                  <select
                    aria-label={tr('Filter bug status', '버그 상태 필터')}
                    value={bugStatusFilter}
                    onChange={(e) =>
                      setBugStatusFilter(e.target.value as 'all' | BugReportStatus)
                    }
                    className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground"
                  >
                    <option value="all">{tr('All Statuses', '전체 상태')}</option>
                    <option value="open">{tr('Open', '신규 접수')}</option>
                    <option value="in_progress">{tr('In Progress', '확인 · 수정 중')}</option>
                    <option value="resolved">{tr('Resolved', '해결 완료')}</option>
                    <option value="dismissed">{tr('Dismissed', '보류 · 제외')}</option>
                  </select>
                )}
              </div>

              {activityTab === 'bugs' ? (
                <div className="divide-y divide-border/70 max-h-[520px] overflow-y-auto">
                  {bugReports.filter(
                    (b) => bugStatusFilter === 'all' || b.status === bugStatusFilter
                  ).length === 0 ? (
                    <div className="py-10 px-4 text-center text-xs text-muted-foreground">
                      {tr('No bug reports matching the selected filter.', '해당 상태의 버그 리포트가 없습니다.')}
                    </div>
                  ) : (
                    bugReports
                      .filter(
                        (b) => bugStatusFilter === 'all' || b.status === bugStatusFilter
                      )
                      .map((bug) => {
                        const diagCount = Array.isArray(bug.diagnostics)
                          ? bug.diagnostics.length
                          : 0;
                        return (
                          <div key={bug.id} className="p-4 space-y-2.5 hover:bg-secondary/25 transition-colors">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div className="space-y-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="rounded-md bg-accent-soft px-2 py-0.5 font-mono text-[10.5px] font-semibold text-primary">
                                    {bug.category}
                                  </span>
                                  <span className="font-semibold text-sm text-foreground break-words">
                                    {bug.title}
                                  </span>
                                </div>
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] text-muted-foreground">
                                  <span>{formatKstDateTime(bug.created_at)}</span>
                                  <span>
                                    {bug.reporter_email ?? `anon:${bug.session_id.slice(0, 8)}`}
                                  </span>
                                  <span>{bug.page_path}</span>
                                  {bug.lesson_id && <span>lesson:{bug.lesson_id}</span>}
                                  <span>
                                    {bug.device_type} · {bug.locale} · {bug.theme}
                                    {bug.viewport ? ` · ${bug.viewport}` : ''}
                                  </span>
                                </div>
                              </div>

                              <select
                                aria-label={tr('Update bug status', '버그 상태 변경')}
                                disabled={updatingBugId === bug.id}
                                value={bug.status}
                                onChange={(e) =>
                                  void handleBugStatusChange(
                                    bug.id,
                                    e.target.value as BugReportStatus
                                  )
                                }
                                className="rounded-lg border border-border bg-background px-2.5 py-1 text-xs font-semibold text-foreground"
                              >
                                <option value="open">{tr('Open', '신규 접수')}</option>
                                <option value="in_progress">{tr('In Progress', '수정 중')}</option>
                                <option value="resolved">{tr('Resolved', '해결 완료')}</option>
                                <option value="dismissed">{tr('Dismissed', '보류 · 제외')}</option>
                              </select>
                            </div>

                            <p className="text-xs leading-relaxed text-foreground/90 whitespace-pre-wrap break-words rounded-lg bg-secondary/40 px-3 py-2.5 border border-border/60">
                              {bug.description}
                            </p>

                            {diagCount > 0 && (
                              <details className="text-[11px] text-muted-foreground">
                                <summary className="cursor-pointer font-medium hover:text-foreground">
                                  {tr(
                                    `View ${diagCount} diagnostic log entries`,
                                    `첨부된 진단 로그 ${diagCount}건 보기`
                                  )}
                                </summary>
                                <pre className="mt-2 rounded-lg border border-border bg-background p-2.5 overflow-x-auto font-mono text-[10.5px] leading-relaxed">
                                  {JSON.stringify(bug.diagnostics, null, 2)}
                                </pre>
                              </details>
                            )}
                          </div>
                        );
                      })
                  )}
                </div>
              ) : activityTab === 'events' ? (
                <div className="overflow-x-auto max-h-[380px]">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-card border-b border-border text-[11px] text-muted-foreground">
                      <tr>
                        <th className="py-2.5 px-4 text-left font-medium">{tr('Time (KST)', '시간 (KST)')}</th>
                        <th className="py-2.5 px-3 text-left font-medium">{tr('Event', '이벤트')}</th>
                        <th className="py-2.5 px-3 text-left font-medium">{tr('User / Session', '유저 / 세션')}</th>
                        <th className="py-2.5 px-3 text-left font-medium">{tr('Path', '경로')}</th>
                        <th className="py-2.5 px-3 text-left font-medium">{tr('Lesson', '레슨')}</th>
                        <th className="py-2.5 px-3 text-left font-medium">{tr('Env', '환경')}</th>
                        <th className="py-2.5 px-4 text-left font-medium">{tr('Metadata', '세부 정보')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredEvents.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-8 px-4 text-center text-muted-foreground">
                            {tr('No events recorded yet.', '아직 기록된 이벤트가 없습니다.')}
                          </td>
                        </tr>
                      ) : (
                        filteredEvents.map((ev) => (
                          <tr
                            key={ev.id}
                            className="border-b border-border/50 last:border-b-0 hover:bg-secondary/35 transition-colors"
                          >
                            <td className="py-2 px-4 font-mono tabular-nums text-[11px] text-muted-foreground whitespace-nowrap">
                              {formatKstDateTime(ev.createdAt)}
                            </td>
                            <td className="py-2 px-3 font-mono text-[11px] font-semibold text-primary">
                              {ev.eventName}
                            </td>
                            <td className="py-2 px-3 font-mono text-[11px] text-foreground">
                              {ev.userEmail ?? `anon:${ev.sessionId.slice(0, 8)}`}
                            </td>
                            <td className="py-2 px-3 font-mono text-[11px] text-muted-foreground">
                              {ev.pagePath}
                            </td>
                            <td className="py-2 px-3 font-mono text-[11px] text-foreground">
                              {ev.lessonId ?? '-'}
                            </td>
                            <td className="py-2 px-3 font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                              {ev.deviceType} · {ev.locale} · {ev.theme}
                            </td>
                            <td className="py-2 px-4 font-mono text-[10.5px] text-muted-foreground max-w-[260px] truncate">
                              {Object.keys(ev.metadata ?? {}).length > 0
                                ? JSON.stringify(ev.metadata)
                                : '-'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="overflow-x-auto max-h-[380px]">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-card border-b border-border text-[11px] text-muted-foreground">
                      <tr>
                        <th className="py-2.5 px-4 text-left font-medium">{tr('Time (KST)', '시간 (KST)')}</th>
                        <th className="py-2.5 px-3 text-left font-medium">{tr('User', '유저')}</th>
                        <th className="py-2.5 px-3 text-left font-medium">{tr('Lesson', '레슨')}</th>
                        <th className="py-2.5 px-3 text-left font-medium">{tr('Mode / Tier', '모드 / 난이도')}</th>
                        <th className="py-2.5 px-3 text-right font-medium">{tr('Score', '점수')}</th>
                        <th className="py-2.5 px-3 text-right font-medium">{tr('BPM', 'BPM')}</th>
                        <th className="py-2.5 px-4 text-right font-medium">{tr('Result', '결과')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.recentSessions.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-8 px-4 text-center text-muted-foreground">
                            {tr('No completed exam sessions yet.', '완료된 시험 기록이 없습니다.')}
                          </td>
                        </tr>
                      ) : (
                        stats.recentSessions.map((ses) => {
                          const meta = lessonMetaMap.get(ses.lessonId);
                          return (
                            <tr
                              key={ses.id}
                              className="border-b border-border/50 last:border-b-0 hover:bg-secondary/35 transition-colors"
                            >
                              <td className="py-2 px-4 font-mono tabular-nums text-[11px] text-muted-foreground whitespace-nowrap">
                                {formatKstDateTime(ses.createdAt)}
                              </td>
                              <td className="py-2 px-3 font-mono text-[11px] text-foreground">
                                {ses.userEmail ?? '-'}
                              </td>
                              <td className="py-2 px-3 text-foreground">
                                <span className="font-mono text-[11px] font-bold text-primary mr-1.5">
                                  {meta?.code ?? ses.lessonId}
                                </span>
                                <span>{meta?.title ?? ''}</span>
                              </td>
                              <td className="py-2 px-3 font-mono text-[11px] text-muted-foreground">
                                {ses.mode} · {ses.tier}
                              </td>
                              <td className="py-2 px-3 text-right font-mono tabular-nums font-bold text-foreground">
                                {ses.score} ({ses.grade})
                              </td>
                              <td className="py-2 px-3 text-right font-mono tabular-nums text-muted-foreground">
                                {ses.bpmPlayed}
                              </td>
                              <td className="py-2 px-4 text-right font-mono text-[11px] font-semibold">
                                <span
                                  className={ses.passed ? 'text-success' : 'text-destructive'}
                                >
                                  {ses.passed ? 'PASS' : 'RETRY'}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
