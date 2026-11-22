-- FretMaster Studio — Supabase PostgreSQL Schema & Row-Level Security
-- Run this idempotent script in Supabase Dashboard -> SQL Editor

create extension if not exists "pgcrypto";

-- 1. User Profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  preferred_locale text not null default 'system' check (preferred_locale in ('system', 'en', 'ko')),
  preferred_theme text not null default 'system' check (preferred_theme in ('system', 'light', 'dark')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Per-User Practice Progress & Audio Device Preferences
create table if not exists public.user_progress (
  user_id uuid primary key references auth.users (id) on delete cascade,
  lesson_records jsonb not null default '{}'::jsonb,
  skills jsonb not null default '{"mechanics":24,"fretboardVision":20,"rhythmTiming":25,"earCopy":15,"creativePhrasing":15}'::jsonb,
  daily_practice_seconds integer not null default 0,
  daily_goal_seconds integer not null default 1200,
  day_streak integer not null default 1,
  last_practice_date text not null default '',
  total_completed_count integer not null default 0,
  free_explore_mode boolean not null default false,
  last_lesson_id text not null default 'm1-1',
  audio_config jsonb,
  updated_at timestamptz not null default now()
);

-- 3. Completed Exam & Practice Session History Log
create table if not exists public.practice_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  lesson_id text not null,
  mode text not null,
  tier text not null,
  score integer not null,
  grade text not null,
  pitch_accuracy integer not null default 0,
  timing_accuracy integer not null default 0,
  bpm_played integer not null default 68,
  passed boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists practice_sessions_user_created_idx
  on public.practice_sessions (user_id, created_at desc);

-- 4. Row-Level Security (Strict Per-User Isolation)
alter table public.profiles enable row level security;
alter table public.user_progress enable row level security;
alter table public.practice_sessions enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "profiles_delete_own" on public.profiles;
create policy "profiles_delete_own"
  on public.profiles for delete
  using (auth.uid() = id);

drop policy if exists "user_progress_select_own" on public.user_progress;
create policy "user_progress_select_own"
  on public.user_progress for select
  using (auth.uid() = user_id);

drop policy if exists "user_progress_insert_own" on public.user_progress;
create policy "user_progress_insert_own"
  on public.user_progress for insert
  with check (auth.uid() = user_id);

drop policy if exists "user_progress_update_own" on public.user_progress;
create policy "user_progress_update_own"
  on public.user_progress for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "user_progress_delete_own" on public.user_progress;
create policy "user_progress_delete_own"
  on public.user_progress for delete
  using (auth.uid() = user_id);

drop policy if exists "practice_sessions_select_own" on public.practice_sessions;
create policy "practice_sessions_select_own"
  on public.practice_sessions for select
  using (auth.uid() = user_id);

drop policy if exists "practice_sessions_insert_own" on public.practice_sessions;
create policy "practice_sessions_insert_own"
  on public.practice_sessions for insert
  with check (auth.uid() = user_id);

drop policy if exists "practice_sessions_delete_own" on public.practice_sessions;
create policy "practice_sessions_delete_own"
  on public.practice_sessions for delete
  using (auth.uid() = user_id);

-- 5. Auto-provision profile and progress row on Google OAuth sign-up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture')
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = coalesce(excluded.full_name, public.profiles.full_name),
        avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url),
        updated_at = now();

  insert into public.user_progress (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 6. Admin Flag, Analytics Event Telemetry & Aggregation RPC (v0.3.1+)
alter table public.profiles
  add column if not exists is_admin boolean not null default false;

update public.profiles
  set is_admin = true
  where lower(email) = 'srain0626@gmail.com';

create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  session_id text not null,
  event_name text not null,
  page_path text not null default '/',
  lesson_id text,
  locale text not null default 'unknown',
  theme text not null default 'unknown',
  device_type text not null default 'unknown',
  viewport text,
  referrer_host text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists analytics_events_created_idx
  on public.analytics_events (created_at desc);

create index if not exists analytics_events_name_created_idx
  on public.analytics_events (event_name, created_at desc);

create index if not exists analytics_events_user_created_idx
  on public.analytics_events (user_id, created_at desc);

create index if not exists analytics_events_session_created_idx
  on public.analytics_events (session_id, created_at desc);

create or replace function public.is_admin_user()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select
    lower(coalesce(auth.jwt() ->> 'email', '')) = 'srain0626@gmail.com'
    or exists (
      select 1
      from public.profiles
      where id = auth.uid()
        and is_admin = true
    );
$$;

alter table public.analytics_events enable row level security;

drop policy if exists "analytics_events_insert_any" on public.analytics_events;
create policy "analytics_events_insert_any"
  on public.analytics_events for insert
  with check (user_id is null or auth.uid() = user_id);

drop policy if exists "analytics_events_select_admin" on public.analytics_events;
create policy "analytics_events_select_admin"
  on public.analytics_events for select
  using (public.is_admin_user());

create or replace function public.get_admin_dashboard_stats(days_back integer default 30)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_days integer := least(90, greatest(1, coalesce(days_back, 30)));
  v_today date := (now() at time zone 'Asia/Seoul')::date;
  v_start date := v_today - (v_days - 1);
  v_start_ts timestamptz := (v_start::timestamp at time zone 'Asia/Seoul');
  v_today_str text := to_char(v_today, 'YYYY-MM-DD');
  v_wau_start date := v_today - 6;
  v_mau_start date := v_today - 29;
  v_summary jsonb;
  v_daily jsonb;
  v_breakdowns jsonb;
  v_lessons jsonb;
  v_users jsonb;
  v_recent_events jsonb;
  v_recent_sessions jsonb;
begin
  if not public.is_admin_user() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  with active_today as (
    select distinct user_id from public.analytics_events
      where user_id is not null and (created_at at time zone 'Asia/Seoul')::date = v_today
    union
    select distinct user_id from public.practice_sessions
      where (created_at at time zone 'Asia/Seoul')::date = v_today
    union
    select distinct user_id from public.user_progress
      where last_practice_date = v_today_str
         or (updated_at at time zone 'Asia/Seoul')::date = v_today
  ),
  active_7d as (
    select distinct user_id from public.analytics_events
      where user_id is not null and (created_at at time zone 'Asia/Seoul')::date >= v_wau_start
    union
    select distinct user_id from public.practice_sessions
      where (created_at at time zone 'Asia/Seoul')::date >= v_wau_start
    union
    select distinct user_id from public.user_progress
      where (updated_at at time zone 'Asia/Seoul')::date >= v_wau_start
  ),
  active_30d as (
    select distinct user_id from public.analytics_events
      where user_id is not null and (created_at at time zone 'Asia/Seoul')::date >= v_mau_start
    union
    select distinct user_id from public.practice_sessions
      where (created_at at time zone 'Asia/Seoul')::date >= v_mau_start
    union
    select distinct user_id from public.user_progress
      where (updated_at at time zone 'Asia/Seoul')::date >= v_mau_start
  )
  select jsonb_build_object(
    'totalUsers', (select count(*)::int from public.profiles),
    'newUsersToday', (select count(*)::int from public.profiles where (created_at at time zone 'Asia/Seoul')::date = v_today),
    'newUsers7d', (select count(*)::int from public.profiles where (created_at at time zone 'Asia/Seoul')::date >= v_wau_start),
    'todayVisitors', (
      select count(distinct coalesce(user_id::text, session_id))::int
      from public.analytics_events
      where (created_at at time zone 'Asia/Seoul')::date = v_today
    ),
    'todayActiveUsers', (select count(*)::int from active_today),
    'wau', (select count(*)::int from active_7d),
    'mau', (select count(*)::int from active_30d),
    'todayPageViews', (
      select count(*)::int
      from public.analytics_events
      where event_name = 'page_view' and (created_at at time zone 'Asia/Seoul')::date = v_today
    ),
    'totalEvents', (
      select count(*)::int
      from public.analytics_events
      where created_at >= v_start_ts
    ),
    'totalSessions', (
      select count(*)::int
      from public.practice_sessions
      where created_at >= v_start_ts
    ),
    'passedSessions', (
      select count(*)::int
      from public.practice_sessions
      where created_at >= v_start_ts and passed = true
    ),
    'passRatePct', (
      select coalesce(
        round(100.0 * count(*) filter (where passed) / nullif(count(*), 0))::int,
        0
      )
      from public.practice_sessions
      where created_at >= v_start_ts
    ),
    'avgScore', (
      select coalesce(round(avg(score))::int, 0)
      from public.practice_sessions
      where created_at >= v_start_ts
    ),
    'totalPracticeMinutes', (
      select coalesce(round(sum(daily_practice_seconds) / 60.0)::int, 0)
      from public.user_progress
    )
  )
  into v_summary;

  with day_list as (
    select generate_series(v_start, v_today, interval '1 day')::date as d
  ),
  ev_daily as (
    select
      (created_at at time zone 'Asia/Seoul')::date as d,
      count(distinct coalesce(user_id::text, session_id))::int as visitors,
      count(distinct user_id)::int as active_users,
      count(*) filter (where event_name = 'page_view')::int as page_views,
      count(*) filter (where event_name = 'practice_mode_started')::int as practice_starts,
      count(*)::int as events_count
    from public.analytics_events
    where created_at >= v_start_ts
    group by 1
  ),
  ses_daily as (
    select
      (created_at at time zone 'Asia/Seoul')::date as d,
      count(distinct user_id)::int as ses_users,
      count(*)::int as exams_completed,
      count(*) filter (where passed)::int as exams_passed
    from public.practice_sessions
    where created_at >= v_start_ts
    group by 1
  ),
  usr_daily as (
    select
      (created_at at time zone 'Asia/Seoul')::date as d,
      count(*)::int as new_users
    from public.profiles
    where created_at >= v_start_ts
    group by 1
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'date', to_char(dl.d, 'YYYY-MM-DD'),
        'visitors', coalesce(ev.visitors, 0),
        'activeUsers', greatest(coalesce(ev.active_users, 0), coalesce(se.ses_users, 0)),
        'newUsers', coalesce(us.new_users, 0),
        'pageViews', coalesce(ev.page_views, 0),
        'practiceStarts', coalesce(ev.practice_starts, 0),
        'examsCompleted', coalesce(se.exams_completed, 0),
        'examsPassed', coalesce(se.exams_passed, 0),
        'eventsCount', coalesce(ev.events_count, 0)
      )
      order by dl.d desc
    ),
    '[]'::jsonb
  )
  into v_daily
  from day_list dl
  left join ev_daily ev on ev.d = dl.d
  left join ses_daily se on se.d = dl.d
  left join usr_daily us on us.d = dl.d;

  select jsonb_build_object(
    'pages', coalesce((
      select jsonb_agg(jsonb_build_object('label', label, 'count', cnt) order by cnt desc)
      from (
        select page_path as label, count(*)::int as cnt
        from public.analytics_events
        where created_at >= v_start_ts and event_name = 'page_view'
        group by 1
        order by 2 desc
        limit 12
      ) t
    ), '[]'::jsonb),
    'devices', coalesce((
      select jsonb_agg(jsonb_build_object('label', label, 'count', cnt) order by cnt desc)
      from (
        select device_type as label, count(distinct coalesce(user_id::text, session_id))::int as cnt
        from public.analytics_events
        where created_at >= v_start_ts
        group by 1
        order by 2 desc
      ) t
    ), '[]'::jsonb),
    'locales', coalesce((
      select jsonb_agg(jsonb_build_object('label', label, 'count', cnt) order by cnt desc)
      from (
        select locale as label, count(distinct coalesce(user_id::text, session_id))::int as cnt
        from public.analytics_events
        where created_at >= v_start_ts
        group by 1
        order by 2 desc
      ) t
    ), '[]'::jsonb),
    'themes', coalesce((
      select jsonb_agg(jsonb_build_object('label', label, 'count', cnt) order by cnt desc)
      from (
        select theme as label, count(distinct coalesce(user_id::text, session_id))::int as cnt
        from public.analytics_events
        where created_at >= v_start_ts
        group by 1
        order by 2 desc
      ) t
    ), '[]'::jsonb),
    'audioModes', coalesce((
      select jsonb_agg(jsonb_build_object('label', label, 'count', cnt) order by cnt desc)
      from (
        select coalesce(metadata ->> 'mode', 'unknown') as label, count(*)::int as cnt
        from public.analytics_events
        where created_at >= v_start_ts and event_name = 'audio_connected'
        group by 1
        order by 2 desc
      ) t
    ), '[]'::jsonb),
    'calibrationModes', coalesce((
      select jsonb_agg(jsonb_build_object('label', label, 'count', cnt) order by cnt desc)
      from (
        select coalesce(metadata ->> 'method', 'unknown') as label, count(*)::int as cnt
        from public.analytics_events
        where created_at >= v_start_ts and event_name = 'latency_calibrated'
        group by 1
        order by 2 desc
      ) t
    ), '[]'::jsonb),
    'referrers', coalesce((
      select jsonb_agg(jsonb_build_object('label', label, 'count', cnt) order by cnt desc)
      from (
        select coalesce(nullif(referrer_host, ''), 'direct') as label, count(distinct session_id)::int as cnt
        from public.analytics_events
        where created_at >= v_start_ts and event_name = 'page_view'
        group by 1
        order by 2 desc
        limit 10
      ) t
    ), '[]'::jsonb),
    'eventCounts', coalesce((
      select jsonb_agg(jsonb_build_object('label', label, 'count', cnt) order by cnt desc)
      from (
        select event_name as label, count(*)::int as cnt
        from public.analytics_events
        where created_at >= v_start_ts
        group by 1
        order by 2 desc
        limit 20
      ) t
    ), '[]'::jsonb)
  )
  into v_breakdowns;

  with ev_lesson as (
    select
      coalesce(lesson_id, metadata ->> 'lesson_id') as lesson_id,
      count(*) filter (where event_name = 'lesson_selected')::int as views,
      count(*) filter (where event_name = 'practice_mode_started')::int as practice_starts
    from public.analytics_events
    where created_at >= v_start_ts
      and coalesce(lesson_id, metadata ->> 'lesson_id') is not null
    group by 1
  ),
  ses_lesson as (
    select
      lesson_id,
      count(*)::int as exam_attempts,
      count(*) filter (where passed)::int as exam_passes,
      coalesce(round(avg(score))::int, 0) as avg_score,
      coalesce(round(avg(bpm_played))::int, 0) as avg_bpm
    from public.practice_sessions
    where created_at >= v_start_ts
    group by 1
  ),
  combined_lesson as (
    select
      coalesce(e.lesson_id, s.lesson_id) as lesson_id,
      coalesce(e.views, 0) as views,
      coalesce(e.practice_starts, 0) as practice_starts,
      coalesce(s.exam_attempts, 0) as exam_attempts,
      coalesce(s.exam_passes, 0) as exam_passes,
      case
        when coalesce(s.exam_attempts, 0) > 0
          then round(100.0 * s.exam_passes / s.exam_attempts)::int
        else 0
      end as pass_rate_pct,
      coalesce(s.avg_score, 0) as avg_score,
      coalesce(s.avg_bpm, 0) as avg_bpm
    from ev_lesson e
    full outer join ses_lesson s on s.lesson_id = e.lesson_id
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'lessonId', cl.lesson_id,
        'views', cl.views,
        'practiceStarts', cl.practice_starts,
        'examAttempts', cl.exam_attempts,
        'examPasses', cl.exam_passes,
        'passRatePct', cl.pass_rate_pct,
        'avgScore', cl.avg_score,
        'avgBpm', cl.avg_bpm
      )
      order by (cl.views + cl.practice_starts + cl.exam_attempts) desc, cl.lesson_id asc
    ),
    '[]'::jsonb
  )
  into v_lessons
  from combined_lesson cl;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', u.id,
        'email', u.email,
        'fullName', u.full_name,
        'preferredLocale', u.preferred_locale,
        'preferredTheme', u.preferred_theme,
        'totalCompletedCount', u.total_completed_count,
        'dayStreak', u.day_streak,
        'dailyPracticeSeconds', u.daily_practice_seconds,
        'lastPracticeDate', u.last_practice_date,
        'lastLessonId', u.last_lesson_id,
        'createdAt', u.created_at,
        'updatedAt', u.progress_updated_at
      )
      order by u.sort_ts desc
    ),
    '[]'::jsonb
  )
  into v_users
  from (
    select
      p.id,
      p.email,
      p.full_name,
      p.preferred_locale,
      p.preferred_theme,
      coalesce(up.total_completed_count, 0) as total_completed_count,
      coalesce(up.day_streak, 1) as day_streak,
      coalesce(up.daily_practice_seconds, 0) as daily_practice_seconds,
      coalesce(up.last_practice_date, '') as last_practice_date,
      coalesce(up.last_lesson_id, 'm1-1') as last_lesson_id,
      p.created_at,
      coalesce(up.updated_at, p.updated_at) as progress_updated_at,
      coalesce(up.updated_at, p.created_at) as sort_ts
    from public.profiles p
    left join public.user_progress up on up.user_id = p.id
    order by coalesce(up.updated_at, p.created_at) desc
    limit 100
  ) u;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', r.id,
        'eventName', r.event_name,
        'pagePath', r.page_path,
        'lessonId', r.lesson_id,
        'userId', r.user_id,
        'userEmail', r.email,
        'sessionId', r.session_id,
        'deviceType', r.device_type,
        'locale', r.locale,
        'theme', r.theme,
        'referrerHost', r.referrer_host,
        'metadata', r.metadata,
        'createdAt', r.created_at
      )
      order by r.created_at desc
    ),
    '[]'::jsonb
  )
  into v_recent_events
  from (
    select
      ae.id,
      ae.event_name,
      ae.page_path,
      ae.lesson_id,
      ae.user_id,
      p.email,
      ae.session_id,
      ae.device_type,
      ae.locale,
      ae.theme,
      ae.referrer_host,
      ae.metadata,
      ae.created_at
    from public.analytics_events ae
    left join public.profiles p on p.id = ae.user_id
    order by ae.created_at desc
    limit 80
  ) r;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', rs.id,
        'userEmail', rs.email,
        'lessonId', rs.lesson_id,
        'mode', rs.mode,
        'tier', rs.tier,
        'score', rs.score,
        'grade', rs.grade,
        'passed', rs.passed,
        'bpmPlayed', rs.bpm_played,
        'createdAt', rs.created_at
      )
      order by rs.created_at desc
    ),
    '[]'::jsonb
  )
  into v_recent_sessions
  from (
    select
      ps.id,
      p.email,
      ps.lesson_id,
      ps.mode,
      ps.tier,
      ps.score,
      ps.grade,
      ps.passed,
      ps.bpm_played,
      ps.created_at
    from public.practice_sessions ps
    left join public.profiles p on p.id = ps.user_id
    order by ps.created_at desc
    limit 40
  ) rs;

  return jsonb_build_object(
    'generatedAt', now(),
    'daysBack', v_days,
    'timezone', 'Asia/Seoul',
    'summary', v_summary,
    'dailySeries', v_daily,
    'breakdowns', v_breakdowns,
    'lessonStats', v_lessons,
    'users', v_users,
    'recentEvents', v_recent_events,
    'recentSessions', v_recent_sessions
  );
end;
$$;

grant execute on function public.is_admin_user() to anon, authenticated;
grant execute on function public.get_admin_dashboard_stats(integer) to authenticated;
