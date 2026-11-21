# 01. Architecture & State Flow

## Boot, Theme, Locale & Auth Initialization

File: `src/app/layout.tsx`, `src/lib/i18n.tsx`, `src/lib/auth.tsx`, `src/lib/theme.ts`
- Injects inline `<script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />` in `<head>` with `<html lang="en" suppressHydrationWarning>` to prevent Light/Dark FOUC before hydration.
- Theme resolution order: `localStorage.getItem('fretmaster_theme') || 'system'` -> `window.matchMedia('(prefers-color-scheme: dark)').matches` -> toggles `html.dark` and sets `data-theme="dark"|"light"`.
- Locale resolution: `<LocaleProvider>` starts in `'en'` on SSR for zero hydration mismatch, resolves `localStorage.getItem('fretmaster_locale') || 'system'` -> `navigator.language.startsWith('ko') ? 'ko' : 'en'` on mount, sets `document.documentElement.lang`, and exposes `{ locale, preference, setPreference, tr(en, ko) }`.
- Auth resolution: `<AuthProvider>` wraps `<TooltipProvider delay={200}>`, checks `supabase.auth.getUser()` and `onAuthStateChange`, and exposes `{ user, loading, isConfigured, authError, signInWithGoogle, signOut }`.
- Public `/` renders `LandingPageClient.tsx`; `/studio` (`FretMasterStudioClient.tsx`) requires authentication (`AuthGateCard` fallback when `!user`) and syncs per-user progress with Supabase PostgreSQL.

## Client Persistence Keys (`localStorage`)

| Key | Read / Write Location | Payload Shape |
| :--- | :--- | :--- |
| `fretmaster_locale` | `src/lib/i18n.tsx`, `CurriculumSidebar.tsx` | `'system' \| 'en' \| 'ko'` |
| `fretmaster_theme` | `layout.tsx`, `src/lib/theme.ts` | `'system' \| 'light' \| 'dark'` |
| `fretmaster_studio_progress_v1` | `FretMasterStudioClient.tsx` | `UserProgressState` (local baseline merged into Supabase `user_progress`) |
| `fretmaster_studio_audio_v1` | `FretMasterStudioClient.tsx` | `AudioDeviceConfig` (`deviceId`, `inputMode`, `channelMode`, `noiseGateDb`, `latencyOffsetMs`, etc.) |

## 3-Column Studio Grid (`src/components/studio/FretMasterStudioClient.tsx`)

Grid container: `<div className="min-h-screen grid grid-cols-1 lg:grid-cols-[232px_minmax(0,1fr)_284px]">`

```text
+-----------------------+----------------------------------------+-------------------------+
| LEFT (232px)          | CENTER (minmax(0, 1fr))                | RIGHT (284px)           |
| CurriculumSidebar     |                                        | Practice Control Aside  |
| - Brand header        | 1. Breadcrumb + LivePitchTelemetryBar  | 1. Course Progress ring |
| - Module nav/progress | 2. ElectricFretboard (SVG neck +       | 2. Practice Mode Steps  |
| - Curriculum modal    |    integrated scrubber/play/BPM/Amp)   |    + Primary CTA        |
|   trigger             | 3. HeroUI Tabs (`tab` / `lab`)         | 3. Tone/Backing toggles |
| - Theme (`Auto/Light/Dark`)|    - TabTimeline (interactive TAB)     |    + JudgmentTier select|
| - Language (`Auto/EN/KO`)   |    - EarCopy hints OR Improv Lab       | 4. Current Focus (1line)|
| - Analytics trigger         |    (Backing chords / Hum Mapper)       | 5. Bottom-Right Card:   |
|                             |                                        |    `LESSON GUIDE`       |
|                             |                                        |    (`Harmony Point`,    |
|                             |                                        |     `Posture & Fix`)    |
+-----------------------+----------------------------------------+-------------------------+
```

## Context-Aware Modes & Phase Defaults (`page.tsx`)

| Practice Mode | Purpose | Center Tab | GuitarSynth Defaults | Evaluator Active |
| :--- | :--- | :--- | :--- | :--- |
| `'guide'` | Listen to target notes & rhythm | `'tab'` | Guide ON; Phase II+ Drums/Backing ON | Passive telemetry |
| `'wait'` | Step-by-step zero-pressure practice | `'tab'` | Guide ON; transport waits for hit | Pitch match advances cursor |
| `'loop'` | Bar-range loop + optional `+5 BPM` auto-ramp | `'tab'` | Guide ON + Metronome ON | Real-time hit feedback |
| `'exam'` | Full playthrough mastery exam | `'tab'` | Guide **OFF** + Metronome ON | Calls `finalizeExamSession()` on end |
| `'earcopy'` | Blind ear transcription (`supportsEarCopy`) | `'lab'` | Guide ON; `labelMode='interval'` | Unlocks hidden TAB indices + progressive hints (0-3) |
| `'jam'` | Free comping / improv (`supportsJam`) | `'lab'` | Guide **OFF** + Drums/Bass/Chords ON | Live `evaluateImprovisation()` metrics + Hum Mapper |

### On Lesson Selection (`handleSelectLesson`)
1. Calls `resetSessionState()` (stops `guitarSynthEngine.stopTransport()`, resets beat, evaluations, streak, ear-copy hints, improv events).
2. Loads `lesson.defaultBpm`, `lesson.recommendedAmp`, `loopRangeBars: [0, totalBars - 1]`.
3. Auto-opens `LessonGuideDialog` with `guideSection = 'both'`, `guideDialogOpen = true`.
4. Phase defaults: Phase I disables Drums/Bass & Chords (`!nextIsPhase1`); Phase II+ enables them. `supportsEarCopy` forces `'earcopy'`, `supportsJam` forces `'jam'`.

## Modal Dialog Inventory (Rendered at bottom of `page.tsx`)

| Component | Trigger | Controlled State |
| :--- | :--- | :--- |
| `LessonGuideDialog` | Auto-open on mount / lesson change + right-bottom `LESSON GUIDE` buttons | `guideDialogOpen`, `guideSection` (`'both'\|'harmony'\|'posture'`) |
| `CurriculumSidebar` (Modal inside) | Left sidebar curriculum button | Internal `browserOpen` + `phaseFilter` + `previewModuleId` |
| `ChromaticTunerDialog` | `LivePitchTelemetryBar` tuner button | `tunerOpen` |
| `AudioInterfaceModal` | `LivePitchTelemetryBar` audio device button | `audioSetupOpen` |
| `SkillAnalyticsDialog` | Left sidebar analytics button | `analyticsOpen` |
| `MasteryReportDialog` | `finalizeExamSession()` at end of `'exam'` run | `reportOpen`, `lastTelemetry` |
