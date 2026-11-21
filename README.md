# FretMaster Studio

Interactive electric guitar learning platform built with **Next.js 16 (App Router + Turbopack)**, **React 19**, **Tailwind CSS v4**, **shadcn/ui (Base UI)**, **HeroUI v3**, **Remotion**, and **Web Audio / AudioWorklet YIN Pitch DSP**.

## Quick Start

```powershell
npm install
npm run dev    # http://localhost:3000
npm run build  # Production build + TypeScript check
npm run lint   # ESLint
```

## AI-Optimized Technical Documentation (`docs/`)

Modular, low-token technical specs live under [`docs/INDEX.md`](docs/INDEX.md):

- [`docs/INDEX.md`](docs/INDEX.md) — Stack table, repo tree, task router, invariants
- [`docs/01-ARCHITECTURE.md`](docs/01-ARCHITECTURE.md) — Boot theme init, `localStorage` keys, 3-col layout, practice modes
- [`docs/02-UI-SYSTEM.md`](docs/02-UI-SYSTEM.md) — Monochrome + Coral Light/Dark tokens, typography, HeroUI/shadcn rules
- [`docs/03-CURRICULUM.md`](docs/03-CURRICULUM.md) — 4-Phase / 9-Module / 39-Lesson index, helpers, unlock rules
- [`docs/04-AUDIO-DSP.md`](docs/04-AUDIO-DSP.md) — `AudioWorklet` YIN DSP, ASIO WS bridge, synth engine, judgment tiers
- [`docs/05-ANIMATIONS.md`](docs/05-ANIMATIONS.md) — Remotion `<Player>` explainer scenes & audio cue sync
- [`docs/06-MAINTENANCE-RUNBOOK.md`](docs/06-MAINTENANCE-RUNBOOK.md) — PowerShell verification commands, gotchas, QA checklist
