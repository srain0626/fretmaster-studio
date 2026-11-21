# 05. Remotion Animated Lesson Explainers

## Component Architecture (`src/components/animations/` & `src/components/practice/`)

```text
LessonGuideDialog (sm:max-w-2xl, activeSoundChannel: 'harmony' | 'posture' | null)
├── ExplainerVideoShell (harmony) ──▶ @remotion/player <Player> + HarmonyExplainerComposition
│     └── frameupdate -> triggers getHarmonyAudioCues(lesson) when sound ON
└── ExplainerVideoShell (posture) ──▶ @remotion/player <Player> + PostureExplainerComposition
      └── frameupdate -> triggers getPostureAudioCues(lesson) when sound ON
```

## Player Shell Contract (`ExplainerVideoShell.tsx`)

- **Specs:** `compositionWidth={720}`, `compositionHeight={320}` (`aspect-[9/4]`), `fps={30}`, `durationInFrames={240}` (8s loop), `autoPlay`, `loop`, `controls={false}` (rendered with custom Creatica chrome).
- **Controls:** Play/Pause button (plus stage click/Space/Enter), Restart, scrub timeline with Coral progress fill & cue ticks, `0.75x / 1.0x` playbackRate toggle, `사운드` toggle.
- **IMPORTANT `resetKey` Stability:** `ExplainerVideoShell` resets frame `0` on `[resetKey, autoPlay]` change — **NOT** `[inputProps]` — so toggling `soundEnabled` or parent state never resets video playback to frame `0`. Always pass memoized `compositionInputProps = useMemo(() => ({ lesson }), [lesson])` and stable `resetKey`.
- **Audio Autoplay Safety:** `LessonGuideDialog` starts with `activeSoundChannel = null` (muted visuals auto-play cleanly without browser autoplay violations); clicking `사운드` toggles audio on for that single player and unlocks `AudioContext`.

## Variant Resolution Tables

### 1. `HarmonyExplainerComposition.tsx` (`resolveHarmonyVariant` & `getHarmonyAudioCues`)

| Variant Key | Matched Lessons | Visual Concept & Synced Synth Cue |
| :--- | :--- | :--- |
| `'open-strings'` | `m1-1` | 6→1 open string sine vibrations + `3G→2B (+4F M3)` rule card |
| `'octave-geometry'` | `m2-4` | Animated L-vector (`2 strings down + 2 frets right`) on A and C |
| `'interval-steps'` | Remaining `layerNumber === 1` (`1-2..2-3`) | Actual `lesson.notes` fret jumps + pitch waveform frequency compression |
| `'triad-morph'` | `m3-3` | A Major → A Minor 1-fret 3rd slide (`M3 → b3`) + mood wave |
| `'progression-arc'` | `m3-4`, `m9-2` | 4-bar spline tension curve synced to chord progression roots |
| `'powerchord-wave'` | Remaining `layerNumber === 2` (`3-1`, `3-2`) | `1 + 5 + 8` stack spectrum + PM vs Open wave contrast (`m3-2`) |
| `'relative-flip'` | `m4-2` | Same `5–8F` box flipping Root rings between `A` Minor and `C` Major |
| `'pentatonic-box'` | Remaining `layerNumber === 3` (`4-1`, `4-3`, `4-4`) | Progressive 5-note box stamp + `Pos1 → Pos2` diagonal slide (`m4-3`) |
| `'scale-color-fill'` | `layerNumber === 4` (`5-1..5-3`, `7-2`, `7-4`, `8-2`) | Gray pentatonic frame + Coral drops (`2`, `b6`, `b5` blue note, `#7`) |
| `'bend-pitch-lock'` | `m6-3`, `m8-4` | String upward deflection curve + `0c → +200c TARGET` lock gauge |
| `'chord-tone-lead'` | Remaining `layerNumber === 5` | Moving chord pills + highlighting active `R/3` target fret on Beat 1 |

### 2. `PostureExplainerComposition.tsx` (`resolvePostureVariant` & `getPostureAudioCues`)

| Variant Key | Matched Lessons | Biomechanical Motion & Cues |
| :--- | :--- | :--- |
| `'pick-pendulum'` | `m1-1`, `m2-3`, `m7-3` | `35–40°` pick edge slice + wrist pendulum oscillation (`Down ↓ / Up ↑`) |
| `'fretwire-cross-section'` | `m1-2` | Side neck cross-section: flat mid-fret buzz wave vs 2mm behind fretwire arch |
| `'palm-mute-bridge'` | `m3-2`, `m7-4` | Bridge saddle vs pickup side view showing 2mm palm heel placement |
| `'chord-touch-mute'` | `m3-1`, `3-3`, `3-4`, `7-1`, `7-2`, `7-5` | Index `1` curved fingertip fretting low string while belly drapes over `1–3` (`×`) |
| `'legato-eye-shift'` | `m6-1` (Hammer/Pull), `m6-2`, `4-3`, `8-1/2/5/6` | `m6-1`: vertical hammer drop + downward pull snap; others: `0.5` beat eye-lead reticle |
| `'bend-pivot'` | `m6-3`, `m6-4`, `8-3`, `8-4` | Top-edge thumb hinge + `1+2+3` stacked string push + doorknob wrist gauge |
| `'ear-comp-jam'` | `phase-4` (`m9-1..m9-4`) | Alternating `COMP` (1–2 beat triad space) ↔ `SOLO` (3–4 beat phrasing) cards |
| `'anchor-spider-grip'` | Default fallback (`1-3`, `2-x`, `4-x`, `5-x`) | `5–8F` spider walk keeping fingers locked + rear-neck counter-thumb pivot |

## Strict Authoring Rules Inside Remotion Compositions
1. **No CSS Transitions:** Never apply `transition-*` or Tailwind `animate-*` inside compositions; drive every transform/opacity strictly from `useCurrentFrame()`, `spring()`, and `interpolate()`.
2. **Dynamic CSS Theme Colors:** Use `var(--card)`, `var(--secondary)`, `var(--muted)`, `var(--border)`, `var(--foreground)`, `var(--muted-foreground)`, `var(--primary)` and `getFingerColorHex(...)` inside SVG attributes so Light/Dark switch works automatically.
3. **Overlay Safe Zones (`720x320`):**
   - Keep `y: 0..42` free of dense diagram text (`ExplainerVideoShell` floats top-left status badge at `top-2.5 left-3` and paused `▶ 재생` pill at `top-2.5 right-3`).
   - Do **not** add redundant top-right formula pills inside the SVG (section header above the player already shows the formula `Badge`).
4. **Vector Status Icons Only:** Draw check/cross status marks via `<VectorStatusIcon>` SVG `<path>` primitives — never `\u2714` / `\u2718` Dingbats.
5. **Valid Articulation Literals:** Pass only `ArticulationType` values (`'hammer'`, `'pull'`, `'slide-up'`, `'bend-full'`, `'palm-mute'`, `'vibrato'`, `'normal'`) to `guitarSynthEngine.playSingleGuitarNote`.
