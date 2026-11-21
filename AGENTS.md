<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Project Documentation Router (Low-Token Entry)

Start with **`docs/INDEX.md`** (~100 lines) and open **only** the task module you need:
- Architecture, state, storage keys, 3-col layout -> `docs/01-ARCHITECTURE.md`
- Light/Dark theme tokens, fonts, HeroUI/shadcn quirks -> `docs/02-UI-SYSTEM.md`
- 39-lesson schema, modules, unlock logic -> `docs/03-CURRICULUM.md`
- AudioWorklet YIN DSP, synth, judgment tiers -> `docs/04-AUDIO-DSP.md`
- Remotion explainer videos & audio cues -> `docs/05-ANIMATIONS.md`
- CLI commands, PowerShell rules, traps, QA -> `docs/06-MAINTENANCE-RUNBOOK.md`

Critical invariants: zero Unicode emojis/dingbats (`\u2600-\u27BF`), zero neon glows, zero lesson subtitles, maintain Light & Dark contrast via CSS tokens (`var(--*)`), verify changes with `npm run build`.
