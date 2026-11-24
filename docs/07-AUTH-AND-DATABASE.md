# 07. Auth, Landing Page & Cloud Progress Sync

## Public vs Authenticated Routes

| Route | Purpose | Access | SEO |
| :--- | :--- | :--- | :--- |
| `/` (`src/app/page.tsx`) | Bilingual EN/KO learner-focused Landing Page, audible fretboard/coaching demos, 39-lesson launcher (`?lesson=<id>`), Google Sign-In CTA | Public | Indexed (`canonical: '/'`, OpenGraph `/og-thumbnail.jpg`, JSON-LD) |
| `/studio` (`src/app/studio/page.tsx`) | Full 3-column FretMaster Studio (`FretMasterStudioClient.tsx`); honors optional `?lesson=<id>` deep-link (enables `freeExploreMode` when jumping ahead) | Authenticated required (`AuthGateCard` fallback preserving `?lesson=`) | `noindex, nofollow` |
| `/admin` (`src/app/admin/page.tsx`) | Admin-only table analytics & funnel console (`AdminDashboardClient.tsx`, `/api/admin/*`) | Authenticated + `is_admin_user()` RBAC | `noindex, nofollow`, disallowed in `robots.ts` |
| `/auth/callback` (`src/app/auth/callback/route.ts`) | Supabase PKCE OAuth code exchange handler (`next` sanitized, default `'/studio'`) | Public callback | Excluded |

## Next.js 16 Session Refresh (`src/proxy.ts`)

- Next.js 16 uses `src/proxy.ts` (`export async function proxy(...)`), NOT `middleware.ts`.
- Calls `@supabase/ssr` `createServerClient` + `supabase.auth.getUser()` to refresh HTTP-only auth cookies while excluding static assets, SEO files (`/robots.txt`, `/sitemap.xml`, `/google*.html`), `/preview-*.png`, and `/worklets/*`.
- Degrades safely to pass-through when `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` are unset.

## PostgreSQL Schema & Row-Level Security (`supabase/schema.sql`)

| Table | Purpose | RLS Policy |
| :--- | :--- | :--- |
| `public.profiles` | Email, full name, avatar URL, preferred locale/theme | `auth.uid() = id` |
| `public.user_progress` | `lesson_records`, `skills`, streaks, `free_explore_mode`, `last_lesson_id`, `audio_config` | `auth.uid() = user_id` |
| `public.practice_sessions` | Append-only completed Exam telemetry log | `auth.uid() = user_id` |
| `public.analytics_events` | First-party funnel & page-view telemetry (`/api/telemetry`) | Insert allowed; admin-only read via `is_admin_user()` / `get_admin_dashboard_stats()` |

- `handle_new_user()` trigger on `auth.users` insert automatically creates `profiles` and `user_progress` rows.

## Conflict-Free Sync Flow (`src/lib/progressSync.ts`)

1. On `/studio` mount when authenticated, reads local `localStorage` baseline (`fretmaster_studio_progress_v1`) and calls `fetchCloudProgress(user.id)`.
2. Merges both cleanly via `mergeUserProgress()` (`completed = a || b`, `Math.max` scores/BPM/skills/streak, highest `JudgmentTier`) and upserts the unified snapshot to Supabase.
3. Subsequent updates debounce-save (`800ms`) via `upsertCloudProgress()`, updating `CurriculumSidebar` `syncStatus` (`syncing` -> `saved` / `error`).
4. Completing an Exam (`finalizeExamSession`) logs a row in `public.practice_sessions` via `recordPracticeSession()`.

## Deployment Setup Checklist (Supabase + Google OAuth + Vercel)

1. Run [`supabase/schema.sql`](../supabase/schema.sql) inside **Supabase Dashboard -> SQL Editor**.
2. Enable **Google** in **Authentication -> Providers** (configure Google Cloud OAuth Client ID/Secret and authorized callback `https://<PROJECT_REF>.supabase.co/auth/v1/callback`).
3. In Supabase **Authentication -> URL Configuration**:
   - Site URL: `https://fretmasterstudio.seltium.xyz`
   - Redirect URLs: `https://fretmasterstudio.seltium.xyz/auth/callback`, `https://fretmaster-studio.vercel.app/auth/callback`, `http://localhost:3000/auth/callback`
4. Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to `.env.local` (dev) and **Vercel Project Settings -> Environment Variables** (Production & Preview).
