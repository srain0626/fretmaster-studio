# 02. UI Design System & Component Rules

## Visual Principles ("The Tactile Studio Atelier")

- **Aesthetic:** Silver-Mist & Obsidian Night dual-polarity studio canvases paired with a recessed dark OLED fretboard stage (`#0d1113` / `#070a0d`), bottom-center **Liquid Glass Floating Dock**, and Toss-style Progressive Disclosure (single primary Tangerine Signal CTA per screen, 1-line live coaching focus, `?` `HelpHint` hover tooltips).
- **Color Discipline:** Strictly Monochrome Silver-Mist / Obsidian surfaces + **Tangerine Signal** (`#ff6b24`, <= 10% screen area) + Engine Emerald Live (`#10b981` / `#34d399`) + Muted Earth 4-finger coding. **Zero neon radial glow, zero emojis/dingbats, zero lesson subtitles, zero native `title=""` tooltips.**

## CSS Token Reference (`src/app/globals.css`)

| Token | Silver-Mist (`:root`) | Obsidian Night (`.dark`) | Role |
| :--- | :--- | :--- | :--- |
| `--background` | `#d5dcd9` | `#0a0f12` | Canvas backdrop |
| `--card` / `--surface` | `#f4f6f5` | `#11171b` | Primary card & panel surface |
| `--popover` / `--overlay` | `#f7f9f8` | `#141b20` | Floating sheets, dialogs, popovers |
| `--secondary` | `#e2e8e5` | `#182025` | Recessed chips, table rows |
| `--muted` | `#c7d0cc` | `#141b1f` | Muted surface fill |
| `--foreground` | `#0b0e10` | `#f5f7f6` | High-contrast body text |
| `--muted-foreground` | `#51595b` | `#8a9599` | Secondary labels & inactive tab labels |
| `--primary` / `--ring` | `#ff6b24` | `#ff6b24` | Tangerine Signal CTA, active focus, playhead |
| `--accent-soft` | `rgba(255,107,36,0.12)` | `rgba(255,107,36,0.16)` | Soft Tangerine badge fill |
| `--border` | `rgba(11,14,16,0.11)` | `rgba(255,255,255,0.10)` | 1px hairlines (`border-border`) |
| `--surface-oled` | `#0d1113` | `#070a0d` | Recessed OLED fretboard & tuner pod |
| `--surface-oled-elevated` | `#14191c` | `#10161a` | OLED transport bar & nested pods |
| `--ink-oled` / `--ink-oled-muted` | `#f5f7f6` / `#828d91` | `#f5f7f6` / `#7f8b90` | High-contrast text inside OLED stages |
| `--success` / `--warning` / `--destructive` | `#15803d` / `#ff8c42` / `#dc2626` | `#34d399` / `#ff8c42` / `#ef4444` | Live / In-Tune / Timing / Error states |

### Muted 4-Finger Palette (`src/lib/musicTheory.ts` -> `getFingerColorHex`)

| Finger | Index Value | Hex | Meaning |
| :--- | :--- | :--- | :--- |
| Open | `0` | `#78716C` | Open string (`Stone`) |
| Index | `1` | `#5B7C99` | Muted Slate Blue |
| Middle | `2` | `#5C8D76` | Muted Sage Green |
| Ring | `3` | `#B88648` | Muted Amber Ochre |
| Pinky | `4` | `#B56357` | Muted Terracotta |

## Typography (`public/fonts/`, `layout.tsx` & `globals.css`)

- **Display / Headings:** Offline bundled `Paperlogy` (`300` Light / `400` Regular via `public/fonts/Paperlogy-*.woff2`) -> `--font-display` / `--font-heading`.
- **Body UI (EN/KO):** Offline bundled `SUIT Variable` (`100..900` via `public/fonts/SUIT-Variable.woff2`) with `Plus_Jakarta_Sans` (`--font-sans-en`) & `Pretendard Variable` fallback.
- **TAB / Code / BPM / Telemetry:** `IBM_Plex_Mono` (`400..700`) -> `--font-mono` paired with `.tabular-nums`.
- **Body CSS:** `word-break: keep-all;` ensures clean Korean word wrapping; variable-length list items enforce `min-w-0 truncate`.

## Component Library Quirk Matrix (`shadcn` Base UI + `HeroUI v3`)

| Issue / Library | Exact Requirement | Reason |
| :--- | :--- | :--- |
| HeroUI `@import "@heroui/styles"` vs shadcn | Keep `--muted` as surface gray; retain `.tabs__tab:not([data-selected="true"]) { color: var(--muted-foreground); }` in `globals.css` | HeroUI treats `--muted` as muted text; without override, unselected tabs become unreadable |
| HeroUI `<Tabs>` | Use `selectedKey`, `onSelectionChange={(k) => ...}`, `<Tabs.Tab id="...">`, `<Tabs.Indicator />`, `variant="secondary"`, plus `w-auto whitespace-nowrap` on `Tabs.Tab` | HeroUI v3 API differs from Radix/HeroUI v2 |
| Base UI `<Select>` | Guard `onValueChange={(v) => { if (v) ... }}` | Base UI passes `null` when cleared |
| Base UI `<Slider>` | Normalize `Array.isArray(v) ? v[0] : v` in `onValueChange` | Base UI accepts `number \| readonly number[]` |
| Base UI `<TooltipProvider>` & `<TooltipTrigger>` | Use `delay={160}` on `TooltipProvider` and `render={children}` (not `asChild`) on `TooltipTrigger` | Base UI prop names differ from Radix |
| Base UI `<ScrollArea>` | Keep `[&>div]:!block [&>div]:w-full [&>div]:min-w-0` on `ScrollAreaPrimitive.Viewport` | Prevents internal table wrapper from breaking `truncate` |
| Global `:active` button scale vs centered overlays | Keep `.no-press-scale` on `-translate-x-1/2 -translate-y-1/2` buttons, and use `inset-x-0 mx-auto` on `.nr-float-up` sheets | Avoids CSS `transform` collision |

## Motion & Material Signatures (`globals.css` & `StudioMotion.tsx`)

- **Soft Illumination:** Non-disabled buttons transition background, border, shadow, and transform over `260ms–320ms cubic-bezier(0.22, 1, 0.36, 1)` with `:active { transform: scale(0.965); transition-duration: 100ms; }`.
- **Surfaces:** `.nr-ambient-aura` (atmospheric top-left radial wash), `.nr-obsidian-stage` / `.nr-obsidian-pod` (recessed dark instrument wells), `.nr-liquid-dock` / `.nr-liquid-btn` (frosted pill dock), `.nr-solid-btn` / `.nr-ghost-btn` (`2px` CAD editorial buttons on `/`).
- **Framer Motion Springs (`StudioMotion.tsx`):** `STUDIO_SPRING` (`stiffness: 340, damping: 32, mass: 0.9`), `GENTLE_SPRING` (`stiffness: 240, damping: 28, mass: 1`), `SILK_EASE: [0.22, 1, 0.36, 1]`. Wrapped in `<StudioMotionProvider>` (`reducedMotion="user"`).
