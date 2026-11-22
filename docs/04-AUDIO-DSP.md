# 04. Audio DSP, Guitar Synth & Judgment Engine

## Low-Latency Pitch Capture Pipeline

Files: `public/worklets/guitarPitchWorklet.js`, `src/lib/lowLatencyAudioEngine.ts` (`guitarAudioEngine` singleton)

```text
Mic / Hi-Z Interface
  ├── inputMode: 'worklet' ──▶ AudioContext ({ latencyHint: 'interactive' })
  │     ├── Primary: AudioWorkletNode ('guitar-pitch-processor', 128-sample quantum)
  │     │     • Channel routing: 'ch1' | 'ch2' | 'mono' + software input trim (`inputGainDb`, -18..+18 dB) + `peakDb` / `isClipping` metering
  │     │     • Ring buffer: 4096 samples, hopSize: 256 samples (~5.3ms @ 48kHz)
  │     │     • Pre-filter: DC offset removal + 1-pole ~1400 Hz LPF before YIN
  │     │     • Onset detector: RMS ratio (>1.45x) + HF transient delta (>55ms cooldown)
  │     │     • YIN pitch: 65–1450 Hz (threshold 0.18, fallback min < 0.34) + 2*tau subharmonic guard + parabolic interp
  │     │     • Polyphonic FFT: zero-GC 8192-pt Hann Radix-2 FFT -> 45-bin `noteSpectrum` (MIDI 40..84, 2-bin f1 + 2*f1) & 12-bin `chroma`
  │     │     • Engine stabilization: 5-frame temporal median, 160ms attack settling onset carryover, legato pitch-shift onsets
  │     │     • Noise gate: `noiseGateDb` (default -58 dB)
  │     └── Fallback: AnalyserNode (fftSize: 4096, same DC+LPF+subharmonic YIN + `computePolyphonicFallback`) + requestAnimationFrame
  └── inputMode: 'asio-bridge' ──▶ WebSocket (`ws://127.0.0.1:9420`)
        └── Emits `LivePitchData` directly with `source: 'asio-bridge'`
```

Subscription API: `guitarAudioEngine.subscribe((data: LivePitchData) => ...)` returns unsubscribe function. Telemetry exposes `sampleRate`, `baseLatencyMs`, `outputLatencyMs`, `totalEstimatedMs`, `pipelineMode`, `asioBridgeConnected`.

## Web Audio Synth & Transport (`src/lib/guitarSynthEngine.ts`)

Singleton: `guitarSynthEngine = new ElectricGuitarSynthEngine()`
- **Signal Chain:** Dual/shaped oscillators + tubesaturation WaveShaper (`createTubeSaturationCurve`) -> Lowpass CabFilter (`4200 Hz`, `Q=0.8`) -> MasterGain (`0.72`).
- **Amp Presets:** `'clean'`, `'crunch'`, `'lead'`.
- **Scheduler:** `setInterval(runScheduler, 25)` lookahead scheduler managing bar loops (`loopRangeBars`), `countInBeats` (`onCountInUpdate` pre-roll), hybrid wall-clock fallback when `AudioContext` stays suspended, continuous `getExactBeatAt()` sub-millisecond timing, optional `+5 BPM` per loop (`autoSpeedUpBpm`), `enableGuideGuitar`, `enableBackingChords`, `enableDrumsAndBass`, `enableMetronome`.
- **One-Shot API:** `guitarSynthEngine.playSingleGuitarNote(string, fret, ampPreset = 'crunch', durationSec = 0.55, bendCents = 0, technique = 'normal', scheduledTime?)` + `playCalibrationPing(scheduledTime?)` (`1800 Hz` loopback click). Used by Fretboard clicks, Lesson Guide animations, Ear Copy demos, and Acoustic Latency Calibration.
- **Exact `ArticulationType` values (`types/guitar.ts`):** `'normal' | 'hammer' | 'pull' | 'slide-up' | 'slide-down' | 'bend-half' | 'bend-full' | 'bend-15' | 'prebend-release' | 'vibrato' | 'palm-mute' | 'double-stop' | 'chord' | 'tap'`. *(Never pass `'bend'` or `'slide'` or `'hammer-on'`.)*

## 4-Stage `JUDGMENT_TIERS` (`src/lib/lowLatencyAudioEngine.ts`)

| Tier | UI Label | Perfect Window | Good | Pass | Cents Tolerance | Bend Ratio | Min Pass Score |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `'relaxed'` | 느슨함 (입문) | `±110ms` | `±220ms` | `±300ms` | `±55c` | `0.65` | `70` |
| `'standard'` | 표준 (다음 해금) | `±65ms` | `±130ms` | `±180ms` | `±42c` | `0.80` | `80` |
| `'tight'` | 엄격함 (칼박) | `±35ms` | `±75ms` | `±110ms` | `±28c` | `0.90` | `85` |
| `'studio'` | 완벽함 (블라인드) | `±18ms` | `±40ms` | `±65ms` | `±18c` | `0.94` | `90` |

## Evaluators & Music Theory Utilities

- **`evaluatePolyphonicChord(chordNotes, noteSpectrum, chroma, tier)` (`lowLatencyAudioEngine.ts`):** Verifies power chords & open triads against `45-bin` `noteSpectrum` (`MIDI 40..84`), distinguishes Major vs Minor 3rds (`wrongThirdDetected`), and detects unmuted open bass bleed (`unmutedStringWarning`).
- **`evaluateNoteHit(..., livePoly?)` (`lowLatencyAudioEngine.ts`):** Scores mono pitch accuracy or polyphonic chord strums (`evaluatePolyphonicChord` when `chordNotes` are present and `noteSpectrum` is populated) + timing delta (offset-compensated by `config.latencyOffsetMs`) + peak bend progress against active `JUDGMENT_TIERS` -> returns `NoteEvaluation`.
- **`resolveFretPositionForContext(midi, context)` (`src/lib/musicTheory.ts`):** Context-aware unison resolver locking onto matching active targets, prioritizing `lessonNotes`, `scaleOverlay`, `focusFretRange`, open-string fret 0 ergonomics, and `visibleRange`, and exposing secondary `unisons[]` across strings.
- **`evaluateImprovisation(events, scaleOverlay, chordProgression)`:** Computes `harmonicFit`, `chordToneResolution`, `rhythmBreathing`, `expressiveArticulation`, and `overallScore` for Phase IV Jam Lab.
- **`mapHummedPitchesToFretboard(midiSequence, scaleOverlay, focusRange, keyCenterRootPc)`:** Maps vocal/hummed MIDI pitches onto optimal ergonomic fret positions (`HummedNoteMapping[]`).
- **Music Theory (`src/lib/musicTheory.ts`):** Standard tuning MIDI `{ 1: 64, 2: 59, 3: 55, 4: 50, 5: 45, 6: 40 }`; `getIntervalLabel(midi, rootPitchClass)` requires **two arguments** (`midi` and `rootPitchClass % 12`).

## Audio UI Components (`src/components/audio/`)
- `LivePitchTelemetryBar.tsx`: Top-center live detected note, cent deviation, compact peak dBFS / clip indicator, triggers for Tuner & Audio Setup modals.
- `ChromaticTunerDialog.tsx`: Precision `±50c` strobe/needle tuner with reference tone triggers (`6E..1e`).
- `AudioInterfaceModal.tsx`: Input device selector, `'worklet' | 'asio-bridge'` toggle, channel route (`ch1`/`ch2`/`mono`), real-time Peak/RMS/Clip meter & software input trim (`-18..+18 dB`), `-70..-20 dB` noise gate, `'visual' | 'acoustic'` latency calibration (60fps 6-Tap Visual OR 1-click 4-Ping Acoustic Loopback Ping -> `computeCalibratedLatency`, `-50..+200 ms`), and progressive per-bar adaptive auto-calibration (`updateAdaptiveLatencyProfile`).
