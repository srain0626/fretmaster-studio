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
