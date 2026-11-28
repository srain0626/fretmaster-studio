# 01. Architecture & State Flow

## Boot, Theme, Locale & Auth Initialization

File: `src/app/layout.tsx`, `src/lib/i18n.tsx`, `src/lib/auth.tsx`, `src/lib/theme.ts`
- Injects inline `<script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />` in `<head>` with `<html lang="en" suppressHydrationWarning>` to prevent Silver-Mist / Obsidian FOUC before hydration.
- Theme resolution order: `localStorage.getItem('fretmaster_theme') || 'system'` -> `window.matchMedia('(prefers-color-scheme: dark)').matches` -> applies `data-theme-switching="1"`, toggles `html.dark` and sets `data-theme="dark"|"light"`, flushes synchronous reflow (`void root.offsetWidth`), and removes the guard on the next `requestAnimationFrame` for flash-free switching.
- Locale resolution: `<LocaleProvider>` starts in `'en'` on SSR for zero hydration mismatch, resolves `localStorage.getItem('fretmaster_locale') || 'system'` -> `navigator.language.startsWith('ko') ? 'ko' : 'en'` on mount, sets `document.documentElement.lang`, and exposes `{ locale, preference, setPreference, tr(en, ko) }`.
- Auth resolution: `<AuthProvider>` wraps `<TooltipProvider delay={160}>`, checks `supabase.auth.getUser()` and `onAuthStateChange`, and exposes `{ user, loading, isConfigured, authError, signInWithGoogle, signOut }`.
- Public `/` renders `LandingPageClient.tsx`; `/studio` (`FretMasterStudioClient.tsx`) requires authentication (`AuthGateCard` fallback when `!user`) or guest sandbox (`?demo=1`), and syncs per-user progress with Supabase PostgreSQL.

## Client Persistence Keys (`localStorage`)

| Key | Read / Write Location | Payload Shape |
| :--- | :--- | :--- |
| `fretmaster_locale` | `src/lib/i18n.tsx`, `StudioLiquidDock.tsx` | `'system' \| 'en' \| 'ko'` |
| `fretmaster_theme` | `layout.tsx`, `src/lib/theme.ts` | `'system' \| 'light' \| 'dark'` |
| `fretmaster_studio_progress_v1` | `FretMasterStudioClient.tsx` | `UserProgressState` (local baseline merged into Supabase `user_progress`) |
| `fretmaster_studio_audio_v1` | `FretMasterStudioClient.tsx` | `AudioDeviceConfig` (`deviceId`, `inputMode`, `channelMode`, `noiseGateDb`, `latencyOffsetMs`, etc.) |

## Silver-Mist & Obsidian Progressive Disclosure Studio (`src/components/studio/FretMasterStudioClient.tsx`)

```text
+----------------------------------------------------------------------------------+
| 1. BORDERLESS TOP BAR (h-14, max-w-[1300px])                                     |
|    Brand + Curriculum Pill (M# · Code)   |  Peak dB · Note · Search [/] · Tuner  |
+----------------------------------------------------------------------------------+
| 2. HERO CENTERPIECE WORKSPACE (flex-1, justify-center, max-w-[1300px])            |
|    - Lesson Selector Header (`Paperlogy 300`) + Practice Mode Pills + Signal CTA |
|    - Recessed OLED Fretboard Stage (`nr-obsidian-stage`, #0d1113 / #070a0d)      |
|      with integrated bottom transport, BPM slider, Amp selector                  |
|    - 1-Line Focus & Dual-Guide Strip (`Harmony Point`, `Posture & Fix`, TAB/Lab) |
|    - TabTimeline (interactive TAB) OR Ear Copy / Improv Lab                      |
+----------------------------------------------------------------------------------+
| 3. DOCK-CLEARING FLOATING SHEET (`bottom-[80px]`, conditional)                   |
|    Module Progress Ring + Backing Mixer + Exam Judgment Tier / Count-In          |
+----------------------------------------------------------------------------------+
| 4. LIQUID GLASS FLOATING DOCK (`fixed bottom-5`, `nr-liquid-dock`)               |
|    [ Start Guitar / Live ms ]  |  [ Controls ]  |  [ Menu Popover (Theme/Tools) ]|
+----------------------------------------------------------------------------------+
```

## Context-Aware Modes & Phase Defaults

| Practice Mode | Purpose | Center Tab | GuitarSynth Defaults | Evaluator Active |
| :--- | :--- | :--- | :--- | :--- |
| `'guide'` | Listen to target notes & rhythm | `'tab'` | Guide ON; Phase II+ Drums/Backing ON | Passive telemetry |
| `'wait'` | Step-by-step zero-pressure practice | `'tab'` | Guide ON; transport waits for hit | Pitch match advances cursor |
| `'loop'` | Bar-range loop + optional `+5 BPM` auto-ramp | `'tab'` | Guide ON + Metronome ON | Real-time hit feedback |
| `'exam'` | Full playthrough mastery exam | `'tab'` | Guide **OFF** + Metronome ON | Calls `finalizeExamSession()` on end |
| `'earcopy'` | Blind ear transcription (`supportsEarCopy`) | `'lab'` | Guide ON; `labelMode='interval'` | Unlocks hidden TAB indices + progressive hints (0-3) |
| `'jam'` | Free comping / improv (`supportsJam`) | `'lab'` | Guide **OFF** + Drums/Bass/Chords ON | Live `evaluateImprovisation()` metrics + Hum Mapper |

### Keyboard Shortcuts (`FretMasterStudioClient.tsx`)
- `Ctrl+K` / `/`: Toggle `CommandPaletteDialog` (search 39 lessons, practice modes, studio actions)
- `Shift+S`: Toggle `StageFocusHudModal` (`#07090b` full-screen zero-glare OLED stage)
- `C` / `T` / `G` / `P`: Open Curriculum Browser / Chromatic Tuner / Lesson Guide / Progress Analytics
- `Space`: Play / Stop transport; `1`–`4` / `0`: Simulated fretting finger input
- `Esc`: Close Stage HUD, Command Palette, Spotlight Tour, or Floating Mixer Sheet

## Modal & Overlay Inventory

| Component | Trigger | Controlled State |
| :--- | :--- | :--- |
| `LessonGuideDialog` | Auto-open on mount / lesson change + Focus Strip / Deck `Harmony` & `Posture` buttons | `guideDialogOpen`, `guideSection` (`'both'\|'harmony'\|'posture'`) |
| `CurriculumBrowserDialog` | Top bar breadcrumb, clickable lesson `<h1>`, Dock Menu, `C` key, Command Palette | `curriculumOpen` |
| `CommandPaletteDialog` | Top bar `/` search button, Dock Menu, `Ctrl+K` / `/` | `commandPaletteOpen` |
| `StageFocusHudModal` | Dock Menu, Command Palette, `Shift+S` | `stageHudOpen` |
| `StudioOnboardingDialog` | First-time load or Dock Menu `Spotlight Tour` (SVG `<mask>` cutout coachmarks) | `onboardingOpen` |
| `ChromaticTunerDialog` | `LivePitchTelemetryBar`, Dock Menu, `T` key | `tunerOpen` |
| `AudioInterfaceModal` | Peak meter pill or Dock Menu `Audio & ASIO Setup` | `audioSetupOpen` |
| `SkillAnalyticsDialog` | Dock Menu `Progress` or `P` key | `analyticsOpen` |
| `MasteryReportDialog` | `finalizeExamSession()` at end of `'exam'` run | `reportOpen`, `lastTelemetry` |
