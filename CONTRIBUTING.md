# Contributing to FretMaster Studio

Thank you for your interest in contributing to FretMaster Studio. This guide covers local setup, architectural guardrails, commit conventions, and the verification steps required before opening a pull request.

## Before You Start

Read [`docs/INDEX.md`](docs/INDEX.md) first and open the single subsystem spec matching the area you plan to change:

- **App layout, practice modes, `localStorage`**: [`docs/01-ARCHITECTURE.md`](docs/01-ARCHITECTURE.md)
- **CSS variables, Light/Dark parity, HeroUI v3 + Base UI quirks**: [`docs/02-UI-SYSTEM.md`](docs/02-UI-SYSTEM.md)
- **Lessons (`m1-1`..`m9-4`), `buildNotes`, unlock rules**: [`docs/03-CURRICULUM.md`](docs/03-CURRICULUM.md)
- **AudioWorklet YIN/FFT DSP, ASIO WebSocket (`:9420`), synth & grading**: [`docs/04-AUDIO-DSP.md`](docs/04-AUDIO-DSP.md)
- **Remotion SVG explainers & frame-synced audio cues**: [`docs/05-ANIMATIONS.md`](docs/05-ANIMATIONS.md)
- **CLI scripts, Windows PowerShell notes, browser QA**: [`docs/06-MAINTENANCE-RUNBOOK.md`](docs/06-MAINTENANCE-RUNBOOK.md)
- **Public landing, Supabase OAuth, RLS schema & `/admin`**: [`docs/07-AUTH-AND-DATABASE.md`](docs/07-AUTH-AND-DATABASE.md)

For larger changes (new curriculum modules, DSP algorithm changes, database schema migrations), open an issue first so we can align on scope.

## Development Workflow

1. Fork the repository and create a branch from `main`:
   ```bash
   git checkout -b feat/short-topic-name
   ```
2. Install dependencies and start the development server:
   ```bash
   npm install
   npm run dev
   ```
3. If your change touches `/studio`, OAuth, or cloud progress sync, copy `.env.example` to `.env.local` and apply [`supabase/schema.sql`](supabase/schema.sql) to a development Supabase project (see [README.md](README.md#getting-started)).

## Engineering & UI Invariants

CI and code review enforce the following project-wide rules:

1. **Zero Unicode emojis or dingbats**: Do not introduce supplementary-plane emojis or `U+2600..U+27BF` dingbats (including checkmarks/crosses) in code or UI strings. Use `lucide-react` or inline monoline `<path>` elements (`VectorStatusIcon`, `GuitarSvgIcons.tsx`).
2. **Light and Dark theme parity**: Never hardcode light-only or dark-only colors inside components or SVG illustrations. Bind fills and strokes to semantic CSS custom properties (`var(--background)`, `var(--card)`, `var(--foreground)`, `var(--muted-foreground)`, `var(--primary)`).
3. **Visual restraint**: Do not add neon glow shadows (`box-shadow` radial glows) or render lesson subtitles in primary workspace views.
4. **Preserve HeroUI + Base UI CSS cascade**: Keep `--muted` as a neutral surface color and retain `.tabs__tab:not([data-selected="true"]) { color: var(--muted-foreground); }` in `src/app/globals.css`.
5. **Bilingual EN / KO coverage**: Wrap new UI strings with `useLocale()` (`tr(en, ko)`). When adding or updating lessons or per-note coaching tips, update both the Korean source (`src/data/lessonsPhase*.ts`) and English lookup tables (`src/data/curriculumEn.ts`, `src/data/coachingNotesEn.ts`).
6. **Original educational content only**: Never commit copyrighted commercial sheet music, paid TAB transcriptions, or master audio stems. Author original pedagogical etudes synthesized through `ElectricGuitarSynthEngine`.

## Commit Message Style

We follow Conventional Commits matching existing history:

- `feat(dsp): ...`
- `feat(curriculum): ...`
- `fix(audio): ...`
- `fix(ui): ...`
- `docs(readme): ...`
- `test(polyphonic): ...`

## Pre-PR Verification Checklist

Run all four checks locally before pushing (on Windows PowerShell 5.1, separate commands with `;` instead of `&&`):

```bash
npm test
npm run check:emojis
npm run lint
npm run build
```

When modifying UI or Remotion compositions, attach screenshots in both **Light** and **Dark** themes to your pull request description.

## License

By contributing to FretMaster Studio, you agree that your contributions will be licensed under the [GNU General Public License v3.0 (GPL-3.0)](LICENSE).
