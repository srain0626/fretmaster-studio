# FretMaster Docs Index (AI-First Reference)

> **Service:** FretMaster Studio — Bilingual (EN/KO) interactive electric guitar learning app combining beginner mechanics, 5-layer harmony, ear copy, and low-latency DSP pitch judgment.
> **Token Rule:** Read **only** the doc mapped to your task below. Do not bulk-read `src/data/lessonsPhase*.ts` or `src/app/page.tsx` unless editing them.

## Stack (Exact Versions)

| Layer | Package / API | Version / Config |
| :--- | :--- | :--- |
| Framework | `next` (App Router, Turbopack, RSC) | `16.4.6` (`cacheComponents`, `partialPrefetching`) |
| UI Runtime | `react`, `react-dom`, `typescript` | `19.3.0`, `^5` |
| Styling | `tailwindcss`, `tw-animate-css` | `4.3.3` (`@tailwindcss/turbopack`) |
| Components | `shadcn/ui` (`@base-ui/react`), `@heroui/react`, `@heroui/styles` | `4.23.0` (`base-nova`), `3.2.7` |
| Motion / Video | `framer-motion`, `remotion`, `@remotion/player` | `14.14.0`, `4.0.545` |
| Icons / Fonts | `lucide-react`, `pretendard`, `Plus Jakarta Sans`, `JetBrains Mono` | `1.77.0`, `1.3.9` |
| Audio | Web Audio `AudioWorklet` (YIN DSP) + WebSocket ASIO bridge | `public/worklets/guitarPitchWorklet.js`, `ws://127.0.0.1:9420` |

## Task-to-Doc Routing Table

| If your task touches... | Read ONLY |
| :--- | :--- |
| App layout, state hooks, `localStorage`, practice modes, navigation | [01-ARCHITECTURE.md](01-ARCHITECTURE.md) |
| Themes (Light/Dark/System), Tailwind tokens, HeroUI/shadcn quirks, icons | [02-UI-SYSTEM.md](02-UI-SYSTEM.md) |
| Lessons (`m1-1`..`m9-4`), modules, unlocks, harmony/posture copy | [03-CURRICULUM.md](03-CURRICULUM.md) |
| Pitch DSP, ASIO bridge, synth engine, judgment tiers, scoring math | [04-AUDIO-DSP.md](04-AUDIO-DSP.md) |
| Remotion guide animations, cue audio sync, SVG composition rules | [05-ANIMATIONS.md](05-ANIMATIONS.md) |
| Build/lint commands, Windows PowerShell traps, debugging, QA checklist | [06-MAINTENANCE-RUNBOOK.md](06-MAINTENANCE-RUNBOOK.md) |
| Public landing page, Supabase Google OAuth, RLS DB schema & cloud sync | [07-AUTH-AND-DATABASE.md](07-AUTH-AND-DATABASE.md) |

## Repository Tree

```text
GuitarTeacher/
├── AGENTS.md                         # Next.js agent rules + doc router
├── LICENSE                           # GNU GPL-3.0 full license text
├── README.md                         # Global English showcase README, roadmap & AI guide
├── README.ko.md                      # Korean README edition
├── next.config.ts                    # Turbopack root & CSS rule, cacheComponents
├── components.json                   # shadcn base-nova config
├── docs/assets/                      # README hero thumbnail & Light/Dark previews
├── supabase/
│   └── schema.sql                    # PostgreSQL profiles, progress, sessions & RLS policies
├── public/worklets/
│   └── guitarPitchWorklet.js         # 128-sample AudioWorklet YIN DSP processor
└── src/
    ├── proxy.ts                      # Next.js 16 session refresh proxy (replaces middleware)
    ├── types/guitar.ts               # Canonical domain & telemetry interfaces
    ├── lib/
    │   ├── supabase/                 # Browser & SSR Supabase client helpers
    │   ├── auth.tsx                  # AuthProvider, Google OAuth sign-in & sign-out
    │   ├── progressSync.ts           # Conflict-free local+cloud merge & PostgreSQL sync
    │   ├── theme.ts                  # Shared Light/Dark/System theme hook
    │   ├── i18n.tsx                  # EN/KO LocaleProvider, navigator auto-detect & tr()
    │   ├── musicTheory.ts            # MIDI, frequency, interval, muted 4-finger colors
    │   ├── guitarSynthEngine.ts      # Web Audio guitar synth & lookahead transport
    │   ├── lowLatencyAudioEngine.ts  # Worklet/Analyser/ASIO capture + scoring math
    │   └── utils.ts                  # `cn` re-export
    ├── data/
    │   ├── modulesMeta.ts            # 9 modules (Phase I-IV) metadata (KO source)
    │   ├── curriculumEn.ts           # English translations for categories, 9 modules, 39 lessons
    │   ├── coachingNotesEn.ts        # English lookup table for all note coaching tips
    │   ├── curriculumHelpers.ts      # `buildNotes`, `makeChordBar`, scale overlays
    │   ├── lessonsPhase1.ts          # 8 lessons (m1-1..m2-4)
    │   ├── lessonsPhase2.ts          # 12 lessons (m3-1..m5-4)
    │   ├── lessonsPhase3.ts          # 15 lessons (m6-1..m8-6)
    │   ├── lessonsPhase4.ts          # 4 lessons (m9-1..m9-4)
    │   └── curriculumData.ts         # Unified `ALL_LESSONS` (39) + `localizeLesson` helpers
    ├── app/
    │   ├── globals.css               # Tailwind v4 + HeroUI + Light/Dark CSS vars
    │   ├── layout.tsx                # Fonts, SEO/JSON-LD, theme script, AuthProvider, TooltipProvider
    │   ├── page.tsx                  # Public bilingual Landing Page (`/`)
    │   ├── studio/page.tsx           # Protected interactive Studio workspace (`/studio`)
    │   ├── auth/callback/route.ts    # PKCE OAuth callback handler (`/auth/callback`)
    │   ├── robots.ts                 # Static robots.txt route
    │   ├── sitemap.ts                # Static sitemap.xml route
    │   └── icon.svg                  # Brand monoline icon
    └── components/
        ├── landing/                  # `LandingPageClient.tsx`
        ├── auth/                     # `AuthGateCard.tsx`
        ├── studio/                   # `FretMasterStudioClient.tsx` (auth-gated orchestrator)
        ├── ui/                       # 15 shadcn/base-ui primitives
        ├── icons/GuitarSvgIcons.tsx  # Custom monoline SVGs (CSS var tokens)
        ├── motion/StudioMotion.tsx   # Framer Motion springs & MotionConfig
        ├── curriculum/               # `CurriculumSidebar.tsx`, `SkillAnalyticsDialog.tsx`
        ├── fretboard/                # `ElectricFretboard.tsx`, `TabTimeline.tsx`
        ├── audio/                    # `LivePitchTelemetryBar`, `ChromaticTunerDialog`, `AudioInterfaceModal`
        ├── practice/                 # `LessonGuideDialog.tsx`, `MasteryReportDialog.tsx`
        └── animations/               # `ExplainerVideoShell`, `HarmonyExplainerComposition`, `PostureExplainerComposition`
```

## Non-Negotiable Service Invariants

1. **Zero Emojis / Dingbats:** No Unicode emojis (`\uD83C-\uDBFF\uDC00-\uDFFF`) or Dingbats (`\u2600-\u27BF`, e.g., check/cross marks) anywhere in `src/`. Use `lucide-react` or inline vector `<path>`.
2. **Zero Neon / Zero Subtitles:** Strictly Light/Dark Monochrome + Coral (`#e85d3f` / `#ee6c4d`) accent + muted 4-finger earth palette. Omit lesson subtitles from main views.
3. **Dark & Light Parity:** Theme toggles via `html.dark` class + `data-theme="dark"|"light"`. Never hardcode light-only or dark-only SVG strokes/fills; use `var(--*)`.
4. **HeroUI `--muted` Protection:** Keep `--muted` as surface gray for shadcn and preserve `.tabs__tab:not([data-selected="true"]) { color: var(--muted-foreground); }` in `src/app/globals.css`.
5. **Dual-Guide Surface:** Lesson guide (`화성 포인트`, `자세 · 교정`) auto-opens via `LessonGuideDialog` on initial load and lesson switches, and re-opens via the bottom-right `LESSON GUIDE` card.
6. **Preserve Next.js Agent Block:** Never delete `<!-- BEGIN:nextjs-agent-rules --> ... <!-- END:nextjs-agent-rules -->` in `AGENTS.md`.
7. **Windows Shell Safety:** Commands execute in PowerShell; use `;` instead of `&&` and quote paths with spaces.
8. **Verification Gate:** Any code change requires `npm run build` exit 0 + emoji scan `0` hits + runtime visual verification when UI changes.
