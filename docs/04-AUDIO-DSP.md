# 04. Audio DSP, Guitar Synth & Judgment Engine

## Low-Latency Pitch Capture Pipeline

Files: `public/worklets/guitarPitchWorklet.js`, `src/lib/lowLatencyAudioEngine.ts` (`guitarAudioEngine` singleton)

```text
Mic / Hi-Z Interface
  ├── inputMode: 'worklet' ──▶ AudioContext ({ latencyHint: 'interactive' })
  │     ├── Primary: AudioWorkletNode ('guitar-pitch-processor', 128-sample quantum)
  │     │     • Channel routing: 'ch1' | 'ch2' | 'mono'
  │     │     • Ring buffer: 2048 samples, hopSize: 256 samples (~5.3ms @ 48kHz)
  │     │     • Onset detector: RMS jump + HF transient delta (>65ms cooldown)
  │     │     • YIN pitch: 68–1320 Hz (threshold 0.16, fallback min < 0.28) + parabolic interp (±1c)
  │     │     • Noise gate: `noiseGateDb` (default -52 dB)
  │     └── Fallback: AnalyserNode + requestAnimationFrame (when worklet blocked)
  └── inputMode: 'asio-bridge' ──▶ WebSocket (`ws://127.0.0.1:9420`)
        └── Emits `LivePitchData` directly with `source: 'asio-bridge'`
```

Subscription API: `guitarAudioEngine.subscribe((data: LivePitchData) => ...)` returns unsubscribe function. Telemetry exposes `sampleRate`, `baseLatencyMs`, `outputLatencyMs`, `totalEstimatedMs`, `pipelineMode`, `asioBridgeConnected`.

## Web Audio Synth & Transport (`src/lib/guitarSynthEngine.ts`)

Singleton: `guitarSynthEngine = new ElectricGuitarSynthEngine()`
- **Signal Chain:** Dual/shaped oscillators + tubesaturation WaveShaper (`createTubeSaturationCurve`) -> Lowpass CabFilter (`4200 Hz`, `Q=0.8`) -> MasterGain (`0.72`).
- **Amp Presets:** `'clean'`, `'crunch'`, `'lead'`.
- **Scheduler:** `setInterval(runScheduler, 25)` lookahead scheduler managing bar loops (`loopRangeBars`), optional `+5 BPM` per loop (`autoSpeedUpBpm`), `enableGuideGuitar`, `enableBackingChords`, `enableDrumsAndBass`, `enableMetronome`.
- **One-Shot API:** `guitarSynthEngine.playSingleGuitarNote(string, fret, ampPreset = 'crunch', durationSec = 0.55, bendCents = 0, technique = 'normal', scheduledTime?)`. Used by Fretboard clicks, Lesson Guide animations, and Ear Copy demos.
- **Exact `ArticulationType` values (`types/guitar.ts`):** `'normal' | 'hammer' | 'pull' | 'slide-up' | 'slide-down' | 'bend-half' | 'bend-full' | 'bend-15' | 'prebend-release' | 'vibrato' | 'palm-mute' | 'double-stop' | 'chord' | 'tap'`. *(Never pass `'bend'` or `'slide'` or `'hammer-on'`.)*

## 4-Stage `JUDGMENT_TIERS` (`src/lib/lowLatencyAudioEngine.ts`)

| Tier | UI Label | Perfect Window | Good | Pass | Cents Tolerance | Bend Ratio | Min Pass Score |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `'relaxed'` | 느슨함 (입문) | `±110ms` | `±220ms` | `±300ms` | `±45c` | `0.65` | `70` |
| `'standard'` | 표준 (다음 해금) | `±65ms` | `±130ms` | `±180ms` | `±30c` | `0.80` | `80` |
| `'tight'` | 엄격함 (칼박) | `±35ms` | `±75ms` | `±110ms` | `±18c` | `0.90` | `85` |
| `'studio'` | 완벽함 (블라인드) | `±18ms` | `±40ms` | `±65ms` | `±10c` | `0.94` | `90` |

## Evaluators & Music Theory Utilities

- **`evaluateNoteHit(...)` (`lowLatencyAudioEngine.ts`):** Scores note pitch accuracy + timing delta (offset-compensated by `config.latencyOffsetMs`) + peak bend progress against active `JUDGMENT_TIERS` spec -> returns `NoteEvaluation`.
- **`evaluateImprovisation(events, scaleOverlay, chordProgression)`:** Computes `harmonicFit`, `chordToneResolution`, `rhythmBreathing`, `expressiveArticulation`, and `overallScore` for Phase IV Jam Lab.
- **`mapHummedPitchesToFretboard(midiSequence, scaleOverlay, focusRange, keyCenterRootPc)`:** Maps vocal/hummed MIDI pitches onto optimal ergonomic fret positions (`HummedNoteMapping[]`).
- **Music Theory (`src/lib/musicTheory.ts`):** Standard tuning MIDI `{ 1: 64, 2: 59, 3: 55, 4: 50, 5: 45, 6: 40 }`; `getIntervalLabel(midi, rootPitchClass)` requires **two arguments** (`midi` and `rootPitchClass % 12`).

## Audio UI Components (`src/components/audio/`)
- `LivePitchTelemetryBar.tsx`: Top-center live detected note, cent deviation, DSP pipeline mode badge, triggers for Tuner & Audio Setup modals.
- `ChromaticTunerDialog.tsx`: Precision `±50c` strobe/needle tuner with reference tone triggers (`6E..1e`).
- `AudioInterfaceModal.tsx`: Input device selector, `'worklet' | 'asio-bridge'` toggle, channel route (`ch1`/`ch2`/`mono`), `-70..-20 dB` noise gate, latency calibration (`latencyOffsetMs`).
