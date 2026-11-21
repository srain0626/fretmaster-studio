# 02. UI Design System & Component Rules

## Visual Principles

- **Aesthetic:** Dribbble Creatica clean 3-column classroom + TOSS progressive disclosure (single primary focus CTA per screen, 1-line live feedback).
- **Color Discipline:** Strictly Monochrome surfaces + Coral accent + Muted Earth 4-finger coding. **Zero neon, zero radial glow, zero emojis/dingbats, zero lesson subtitles.**

## CSS Token Reference (`src/app/globals.css`)

| Token | Light Mode (`:root`) | Dark Mode (`.dark`) | Role |
| :--- | :--- | :--- | :--- |
| `--background` | `#f6f6f8` | `#111215` | Canvas backdrop |
| `--card` / `--surface` | `#ffffff` | `#181a1f` | Primary card & SVG animation surface |
| `--secondary` / `--muted` | `#f1f2f5` | `#22252d` | Recessed chips, table rows, subtle surfaces |
| `--foreground` | `#111827` | `#f3f4f6` | High-contrast body text |
| `--muted-foreground` | `#6b7280` | `#a1a7b3` | Secondary labels & inactive tab labels |
| `--primary` / `--accent` / `--ring` | `#e85d3f` | `#ee6c4d` | Single Coral CTA, active root, playhead |
| `--accent-soft` | `#fdf0ec` | `rgba(238,108,77,0.16)` | Soft Coral badge fill |
| `--border` | `#e5e7eb` | `#2a2e37` | 1px hairlines (`border-border`) |
| `--success` / `--warning` / `--destructive` | `#3f7d5e` / `#b88648` / `#dc2626` | `#4fa37b` / `#c99a5b` / `#ef4444` | Pass / Timing / Error states |
| `--sidebar` | `#f2f3f5` | `#14161a` | Left navigation background |

### Muted 4-Finger Palette (`src/lib/musicTheory.ts` -> `getFingerColorHex`)

| Finger | Index Value | Hex | Meaning |
| :--- | :--- | :--- | :--- |
| Open | `0` | `#78716C` | Open string (`Stone`) |
| Index | `1` | `#5B7C99` | Muted Slate Blue |
| Middle | `2` | `#5C8D76` | Muted Sage Green |
| Ring | `3` | `#B88648` | Muted Amber Ochre |
| Pinky | `4` | `#B56357` | Muted Terracotta |

## Typography (`layout.tsx` & `globals.css`)

- **English / Numerals:** `Plus_Jakarta_Sans` -> `--font-sans-en` (`400..700`).
- **Korean UI Copy:** Local `pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css` (`"Pretendard Variable"`).
- **TAB / Code / BPM / Timestamps:** `JetBrains_Mono` -> `--font-mono` paired with `.tabular-nums`.
- **Body CSS:** `word-break: keep-all;` ensures clean Korean word wrapping.

## Component Library Quirk Matrix (`shadcn` Base UI + `HeroUI v3`)

| Issue / Library | Exact Requirement | Reason |
| :--- | :--- | :--- |
| HeroUI `@import "@heroui/styles"` vs shadcn | Keep `--muted` as surface gray; retain `.tabs__tab:not([data-selected="true"]) { color: var(--muted-foreground); }` in `globals.css` | HeroUI treats `--muted` as muted text; without override, unselected tabs become unreadable |
| HeroUI `<Tabs>` | Use `selectedKey`, `onSelectionChange={(k) => ...}`, `<Tabs.Tab id="...">`, `<Tabs.Indicator />`, `variant="secondary"`, plus `w-auto whitespace-nowrap` on `Tabs.Tab` | HeroUI v3 API differs from Radix/HeroUI v2 |
| Base UI `<Select>` | Guard `onValueChange={(v) => { if (v) ... }}` | Base UI passes `null` when cleared |
| Base UI `<Slider>` | Normalize `Array.isArray(v) ? v[0] : v` in `onValueChange` | Base UI accepts `number \| readonly number[]` |
| Base UI `<TooltipProvider>` | Use `delay={200}` (not `delayDuration`) | Base UI prop name |
| Base UI `<Accordion>` | Control via `value` + `onValueChange` | Prevents stale `defaultValue` across dynamic lists |

## Fretboard Context Hiding & Motion (`ElectricFretboard.tsx`, `StudioMotion.tsx`)

- **Phase-Aware Fretboard:** Phase I hides scale backdrop overlays (`!isPhase1`); `judgmentTier === 'studio'` in `'exam'` enables Blind Exam (hides scale, active note, next ghost); Phase I–II lock fretboard zoomed to `focusFretRange`.
- **Custom SVGs:** `src/components/icons/GuitarSvgIcons.tsx` contains all monoline guitar glyphs (`BrandFretLogo`, `DownPickIcon`, `UpPickIcon`, `BendCurveIcon`, `LegatoArcIcon`, `SlideGlyphIcon`, `VibratoWaveIcon`, `TunerGaugeIcon`, `LatencyPulseIcon`, `TriadVoicingIcon`, `MasteryRingSvg`, `RadarChartSvg`). All use `var(--*)` colors.
- **Framer Motion Springs (`StudioMotion.tsx`):** `STUDIO_SPRING` (`stiffness: 340, damping: 32, mass: 0.9`), `GENTLE_SPRING` (`stiffness: 240, damping: 28, mass: 1`), `SILK_EASE: [0.22, 1, 0.36, 1]`. Wrapped in `<StudioMotionProvider>` (`reducedMotion="user"`).
