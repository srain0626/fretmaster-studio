import { getNoteMidi, midiToFreq } from '@/lib/musicTheory';
import type { AmpPreset, ChordBar, GuitarString, NoteEvent } from '@/types/guitar';

function createTubeSaturationCurve(drive: number): Float32Array<ArrayBuffer> {
  const samples = 2048;
  const buffer = new ArrayBuffer(samples * 4);
  const curve = new Float32Array(buffer);
  const k = Math.max(1, drive);
  for (let i = 0; i < samples; i++) {
    const x = (i * 2) / samples - 1;
    curve[i] = ((3 + k) * x * 20 * (Math.PI / 180)) / (Math.PI + k * Math.abs(x));
  }
  return curve;
}

export interface TransportOptions {
  bpm: number;
  notes: NoteEvent[];
  chordProgression: ChordBar[];
  totalBars: number;
  beatsPerBar: number;
  ampPreset: AmpPreset;
  loopRangeBars: [number, number]; // 0-based inclusive
  enableGuideGuitar: boolean;
  enableBackingChords: boolean;
  enableDrumsAndBass: boolean;
  enableMetronome: boolean;
  autoSpeedUpBpm?: number; // +5 BPM per loop
  onBeatUpdate?: (beat: number, currentBar: number, loopCount: number, newBpm?: number) => void;
  onNoteTrigger?: (note: NoteEvent) => void;
  onTransportEnd?: () => void;
}

export class ElectricGuitarSynthEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private cabFilter: BiquadFilterNode | null = null;

  private schedulerTimer: number | null = null;
  private isPlaying = false;

  private currentBeat = 0;
  private nextBeatTime = 0;
  private loopCount = 0;
  private lastBeatFloor = -1;
  private triggeredNotes = new Set<string>();
  private triggeredChords = new Set<string>();
  private transportSessionId = 0;
  private pendingTimers = new Set<number>();
  private lastAudioTime = 0;
  private lastAudioAdvanceWallMs = 0;
  private lastResumeAttemptMs = 0;
  private usingWallClock = false;
  private pendingBpmBump: number | undefined = undefined;

  private currentOptions: TransportOptions | null = null;

  private ensureContext(): AudioContext {
    if (typeof window === 'undefined') {
      throw new Error('AudioContext requires browser environment');
    }
    if (!this.ctx || this.ctx.state === 'closed') {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx({ latencyHint: 'interactive' });

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.72;

      this.cabFilter = this.ctx.createBiquadFilter();
      this.cabFilter.type = 'lowpass';
      this.cabFilter.frequency.value = 4200;
      this.cabFilter.Q.value = 0.8;

      this.cabFilter.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);
    }

    if (this.ctx.state === 'suspended') {
      void this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public playSingleGuitarNote(
    string: GuitarString,
    fret: number,
    ampPreset: AmpPreset = 'crunch',
    durationSec = 0.55,
    bendCents = 0,
    technique: NoteEvent['technique'] = 'normal',
    scheduledTime?: number
  ) {
    const ctx = this.ensureContext();
    const startTime = scheduledTime ?? ctx.currentTime;
    const baseMidi = getNoteMidi(string, fret);
    const freq = midiToFreq(baseMidi);

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    osc1.type = ampPreset === 'clean' ? 'triangle' : 'sawtooth';
    osc2.type = 'square';
    osc1.frequency.setValueAtTime(freq, startTime);
    osc2.frequency.setValueAtTime(freq * 2, startTime); // subtle 2nd harmonic pickup bite

    // Handle pre-bend release vs bend up vs vibrato
    if (technique === 'prebend-release' && bendCents > 0) {
      const bentFreq = freq * Math.pow(2, bendCents / 1200);
      osc1.frequency.setValueAtTime(bentFreq, startTime);
      osc2.frequency.setValueAtTime(bentFreq * 2, startTime);
      osc1.frequency.exponentialRampToValueAtTime(freq, startTime + durationSec * 0.75);
      osc2.frequency.exponentialRampToValueAtTime(freq * 2, startTime + durationSec * 0.75);
    } else if (bendCents > 0) {
      const targetFreq = freq * Math.pow(2, bendCents / 1200);
      const bendStart = startTime + Math.min(0.08, durationSec * 0.15);
      const bendEnd = startTime + Math.min(durationSec * 0.65, 0.35);
      osc1.frequency.setValueAtTime(freq, bendStart);
      osc2.frequency.setValueAtTime(freq * 2, bendStart);
      osc1.frequency.exponentialRampToValueAtTime(targetFreq, bendEnd);
      osc2.frequency.exponentialRampToValueAtTime(targetFreq * 2, bendEnd);
    }

    if (technique === 'vibrato') {
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.frequency.value = 5.4;
      lfoGain.gain.value = freq * 0.013;
      lfo.connect(lfoGain);
      lfoGain.connect(osc1.frequency);
      lfo.start(startTime + 0.12);
      lfo.stop(startTime + durationSec + 0.05);
    }

    const osc1Mix = ctx.createGain();
    const osc2Mix = ctx.createGain();
    osc1Mix.gain.value = 0.75;
    osc2Mix.gain.value = ampPreset === 'clean' ? 0.12 : 0.25;

    const shaper = ctx.createWaveShaper();
    const driveAmount = ampPreset === 'clean' ? 2 : ampPreset === 'crunch' ? 18 : 55;
    shaper.curve = createTubeSaturationCurve(driveAmount);
    shaper.oversample = '2x';

    const toneFilter = ctx.createBiquadFilter();
    toneFilter.type = 'lowpass';
    const cutoff =
      technique === 'palm-mute'
        ? 900
        : ampPreset === 'clean'
        ? 3600
        : ampPreset === 'crunch'
        ? 2900
        : 3400;
    toneFilter.frequency.setValueAtTime(cutoff * 1.4, startTime);
    toneFilter.frequency.exponentialRampToValueAtTime(cutoff * 0.6, startTime + durationSec);

    const env = ctx.createGain();
    const peakGain = ampPreset === 'clean' ? 0.24 : ampPreset === 'crunch' ? 0.2 : 0.17;
    const attack = technique === 'hammer' || technique === 'pull' ? 0.012 : 0.005;
    const effectiveDur = technique === 'palm-mute' ? Math.min(durationSec, 0.18) : durationSec;

    env.gain.setValueAtTime(0.0001, startTime);
    env.gain.linearRampToValueAtTime(peakGain, startTime + attack);
    env.gain.exponentialRampToValueAtTime(peakGain * 0.45, startTime + effectiveDur * 0.45);
    env.gain.exponentialRampToValueAtTime(0.0001, startTime + effectiveDur + 0.04);

    osc1.connect(osc1Mix);
    osc2.connect(osc2Mix);
    osc1Mix.connect(shaper);
    osc2Mix.connect(shaper);
    shaper.connect(toneFilter);
    toneFilter.connect(env);
    env.connect(this.cabFilter ?? ctx.destination);

    osc1.start(startTime);
    osc2.start(startTime);
    osc1.stop(startTime + effectiveDur + 0.06);
    osc2.stop(startTime + effectiveDur + 0.06);
  }

  public playNoteEvent(note: NoteEvent, ampPreset: AmpPreset, secPerBeat: number, scheduledTime?: number) {
    const durSec = Math.max(0.18, note.durationBeats * secPerBeat * 0.92);
    if (note.chordNotes && note.chordNotes.length > 0) {
      note.chordNotes.forEach((cn, idx) => {
        const strumDelay = idx * 0.016;
        this.playSingleGuitarNote(
          cn.string,
          cn.fret,
          ampPreset,
          durSec,
          0,
          note.technique,
          (scheduledTime ?? this.ensureContext().currentTime) + strumDelay
        );
      });
    } else {
      this.playSingleGuitarNote(
        note.string,
        note.fret,
        ampPreset,
        durSec,
        note.bendCents ?? 0,
        note.technique,
        scheduledTime
      );
    }
  }

  public playReferenceTone(freq: number, durationSec = 1.4) {
    const ctx = this.ensureContext();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now);
    env.gain.setValueAtTime(0.001, now);
    env.gain.linearRampToValueAtTime(0.22, now + 0.02);
    env.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);
    osc.connect(env);
    env.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + durationSec + 0.05);
  }

  public playMetronomeClick(isDownbeat: boolean, scheduledTime?: number) {
    const ctx = this.ensureContext();
    const t = scheduledTime ?? ctx.currentTime;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(isDownbeat ? 1180 : 820, t);
    env.gain.setValueAtTime(0.001, t);
    env.gain.linearRampToValueAtTime(isDownbeat ? 0.22 : 0.12, t + 0.002);
    env.gain.exponentialRampToValueAtTime(0.0001, t + 0.055);
    osc.connect(env);
    env.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.06);
  }

  private playDrumHit(type: 'kick' | 'snare' | 'hat', t: number) {
    const ctx = this.ensureContext();
    if (type === 'kick') {
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      osc.frequency.setValueAtTime(135, t);
      osc.frequency.exponentialRampToValueAtTime(42, t + 0.14);
      env.gain.setValueAtTime(0.32, t);
      env.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
      osc.connect(env);
      env.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.2);
    } else if (type === 'snare') {
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(195, t);
      osc.frequency.exponentialRampToValueAtTime(95, t + 0.08);
      env.gain.setValueAtTime(0.18, t);
      env.gain.exponentialRampToValueAtTime(0.0001, t + 0.13);
      osc.connect(env);
      env.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.15);
    } else {
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const env = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(5200, t);
      filter.type = 'highpass';
      filter.frequency.value = 4500;
      env.gain.setValueAtTime(0.04, t);
      env.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);
      osc.connect(filter);
      filter.connect(env);
      env.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.05);
    }
  }

  private playBassNote(midi: number, durationSec: number, t: number) {
    const ctx = this.ensureContext();
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const env = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(midiToFreq(midi), t);
    filter.type = 'lowpass';
    filter.frequency.value = 340;
    env.gain.setValueAtTime(0.001, t);
    env.gain.linearRampToValueAtTime(0.24, t + 0.015);
    env.gain.exponentialRampToValueAtTime(0.0001, t + durationSec);
    osc.connect(filter);
    filter.connect(env);
    env.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + durationSec + 0.03);
  }

  private playBackingChordPad(chord: ChordBar, durationSec: number, t: number) {
    const ctx = this.ensureContext();
    chord.chordMidiPitchClasses.slice(0, 3).forEach((pc) => {
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const env = ctx.createGain();
      osc.type = 'triangle';
      const midi = 48 + pc;
      osc.frequency.setValueAtTime(midiToFreq(midi), t);
      filter.type = 'lowpass';
      filter.frequency.value = 1200;
      env.gain.setValueAtTime(0.001, t);
      env.gain.linearRampToValueAtTime(0.055, t + 0.04);
      env.gain.exponentialRampToValueAtTime(0.0001, t + durationSec);
      osc.connect(filter);
      filter.connect(env);
      env.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + durationSec + 0.05);
    });
  }

  public startTransport(options: TransportOptions, startFromLoopStart = true) {
    this.stopTransport();
    const sessionId = ++this.transportSessionId;
    const ctx = this.ensureContext();
    this.currentOptions = { ...options };
    this.isPlaying = true;
    this.loopCount = 0;
    this.triggeredNotes.clear();
    this.triggeredChords.clear();

    const startBeat = startFromLoopStart
      ? options.loopRangeBars[0] * options.beatsPerBar
      : 0;
    this.currentBeat = startBeat;
    this.lastBeatFloor = startBeat - 1;

    const initWall = performance.now();
    this.lastAudioTime = ctx.currentTime;
    this.lastAudioAdvanceWallMs = initWall;
    this.lastResumeAttemptMs = initWall;
    this.usingWallClock = ctx.state !== 'running';
    this.pendingBpmBump = undefined;
    this.nextBeatTime = ctx.currentTime + 0.05;

    const scheduleStepBeats = 0.25; // 16th-note resolution
    const lookaheadSec = 0.12;

    const scheduleUiCallback = (delayMs: number, fn: () => void) => {
      const timerId = globalThis.setTimeout(() => {
        this.pendingTimers.delete(timerId);
        if (!this.isPlaying || this.transportSessionId !== sessionId) return;
        fn();
      }, delayMs) as unknown as number;
      this.pendingTimers.add(timerId);
    };

    const runScheduler = () => {
      if (!this.isPlaying || this.transportSessionId !== sessionId || !this.currentOptions || !this.ctx) {
        return;
      }
      const opts = this.currentOptions;
      const nowWallMs = performance.now();

      if (this.ctx.state === 'suspended' && nowWallMs - this.lastResumeAttemptMs > 500) {
        void this.ctx.resume().catch(() => {});
        this.lastResumeAttemptMs = nowWallMs;
      }

      if (this.ctx.state === 'running' && this.ctx.currentTime > this.lastAudioTime + 0.0005) {
        if (this.usingWallClock) {
          const virtualNow = this.lastAudioTime + (nowWallMs - this.lastAudioAdvanceWallMs) / 1000;
          const remaining = this.nextBeatTime - virtualNow;
          this.nextBeatTime = this.ctx.currentTime + Math.max(0.01, Math.min(0.3, remaining));
        }
        this.usingWallClock = false;
        this.lastAudioTime = this.ctx.currentTime;
        this.lastAudioAdvanceWallMs = nowWallMs;
      } else if (nowWallMs - this.lastAudioAdvanceWallMs > 180) {
        this.usingWallClock = true;
      }

      const nowSec = this.usingWallClock
        ? this.lastAudioTime + (nowWallMs - this.lastAudioAdvanceWallMs) / 1000
        : this.ctx.currentTime;
      const audioActive = !this.usingWallClock && this.ctx.state === 'running';

      // Guard against catch-up burst after background tab throttling
      if (this.nextBeatTime < nowSec - 0.5) {
        this.nextBeatTime = nowSec + 0.02;
      }

      const secPerBeat = 60 / opts.bpm;
      const loopStartBeat = opts.loopRangeBars[0] * opts.beatsPerBar;
      const loopEndBeat = (opts.loopRangeBars[1] + 1) * opts.beatsPerBar;

      while (this.nextBeatTime < nowSec + lookaheadSec) {
        const beatInBar = this.currentBeat % opts.beatsPerBar;
        const barIdx = Math.floor(this.currentBeat / opts.beatsPerBar);

        // Beat integer tick
        if (Math.abs(beatInBar - Math.round(beatInBar)) < 0.001) {
          const intBeat = Math.round(this.currentBeat);
          if (intBeat !== this.lastBeatFloor) {
            this.lastBeatFloor = intBeat;
            if (audioActive && opts.enableMetronome) {
              this.playMetronomeClick(intBeat % opts.beatsPerBar === 0, this.nextBeatTime);
            }
            if (audioActive && opts.enableDrumsAndBass) {
              const bMod = intBeat % opts.beatsPerBar;
              if (bMod === 0 || bMod === 2) {
                this.playDrumHit('kick', this.nextBeatTime);
              }
              if (bMod === 1 || bMod === 3) {
                this.playDrumHit('snare', this.nextBeatTime);
              }
              this.playDrumHit('hat', this.nextBeatTime);

              const chord = opts.chordProgression[barIdx % opts.chordProgression.length];
              if (chord && (bMod === 0 || bMod === 2)) {
                this.playBassNote(chord.rootMidi - 12, secPerBeat * 1.4, this.nextBeatTime);
              }
            }
            if (audioActive && opts.enableBackingChords && intBeat % opts.beatsPerBar === 0) {
              const chord = opts.chordProgression[barIdx % opts.chordProgression.length];
              const chordKey = `${this.loopCount}-${barIdx}`;
              if (chord && !this.triggeredChords.has(chordKey)) {
                this.triggeredChords.add(chordKey);
                this.playBackingChordPad(chord, secPerBeat * opts.beatsPerBar * 0.92, this.nextBeatTime);
              }
            }
          }
        } else if (audioActive && opts.enableDrumsAndBass && Math.abs((beatInBar % 0.5) - 0) < 0.001) {
          this.playDrumHit('hat', this.nextBeatTime);
        }

        // Trigger Notes in current 16th window
        const baseDelayMs = Math.max(0, (this.nextBeatTime - nowSec) * 1000);
        for (const note of opts.notes) {
          const nKey = `${this.loopCount}-${note.id}`;
          if (
            !this.triggeredNotes.has(nKey) &&
            note.beatStart >= this.currentBeat - 0.01 &&
            note.beatStart < this.currentBeat + scheduleStepBeats - 0.01
          ) {
            this.triggeredNotes.add(nKey);
            const offsetSec = Math.max(0, (note.beatStart - this.currentBeat) * secPerBeat);
            if (audioActive && opts.enableGuideGuitar) {
              this.playNoteEvent(note, opts.ampPreset, secPerBeat, this.nextBeatTime + offsetSec);
            }
            if (opts.onNoteTrigger) {
              const triggerCopy = note;
              scheduleUiCallback(baseDelayMs + offsetSec * 1000, () => {
                opts.onNoteTrigger?.(triggerCopy);
              });
            }
          }
        }

        // Notify UI playhead
        const beatSnapshot = this.currentBeat;
        const barSnapshot = barIdx;
        const loopSnapshot = this.loopCount;
        const bpmBumpSnapshot = this.pendingBpmBump;
        this.pendingBpmBump = undefined;
        scheduleUiCallback(baseDelayMs, () => {
          opts.onBeatUpdate?.(beatSnapshot, barSnapshot, loopSnapshot, bpmBumpSnapshot);
        });

        // Advance beat
        this.currentBeat += scheduleStepBeats;
        this.nextBeatTime += scheduleStepBeats * secPerBeat;

        if (this.currentBeat >= loopEndBeat - 0.001) {
          this.currentBeat = loopStartBeat;
          this.lastBeatFloor = loopStartBeat - 1;
          this.loopCount++;
          this.triggeredNotes.clear();
          this.triggeredChords.clear();

          if (opts.autoSpeedUpBpm && opts.autoSpeedUpBpm > 0) {
            const bumped = Math.min(160, opts.bpm + opts.autoSpeedUpBpm);
            if (bumped !== opts.bpm) {
              opts.bpm = bumped;
              this.pendingBpmBump = bumped;
            }
          }
        }
      }
    };

    runScheduler();
    this.schedulerTimer = globalThis.setInterval(runScheduler, 25) as unknown as number;
  }

  public updateTransportOptions(partial: Partial<TransportOptions>) {
    if (this.currentOptions) {
      this.currentOptions = { ...this.currentOptions, ...partial };
    }
  }

  public stopTransport() {
    this.isPlaying = false;
    this.transportSessionId++;
    if (this.schedulerTimer !== null) {
      globalThis.clearInterval(this.schedulerTimer as unknown as ReturnType<typeof setInterval>);
      this.schedulerTimer = null;
    }
    this.pendingTimers.forEach((id) => {
      globalThis.clearTimeout(id as unknown as ReturnType<typeof setTimeout>);
    });
    this.pendingTimers.clear();
    this.triggeredNotes.clear();
    this.triggeredChords.clear();
    this.pendingBpmBump = undefined;
    this.usingWallClock = false;
  }
}

export const guitarSynthEngine = new ElectricGuitarSynthEngine();
