import {
  findBestFretForMidi,
  freqToMidiFloat,
  getNoteMidi,
  midiToNoteName,
} from '@/lib/musicTheory';
import type {
  AudioDeviceConfig,
  ChordBar,
  GuitarString,
  HummedNoteMapping,
  ImprovisationMetrics,
  JudgmentResult,
  JudgmentTier,
  LivePitchData,
  NoteEvaluation,
  NoteEvent,
  ScaleOverlayNote,
} from '@/types/guitar';

export interface JudgmentTierSpec {
  id: JudgmentTier;
  label: string;
  shortLabel: string;
  description: string;
  perfectMs: number;
  goodMs: number;
  passMs: number;
  centsTolerance: number;
  bendCompletionRatio: number; // e.g., 0.65 -> 1.0
  minPassScore: number;
}

export const JUDGMENT_TIERS: Record<JudgmentTier, JudgmentTierSpec> = {
  relaxed: {
    id: 'relaxed',
    label: '1단계 · RELAXED (입문 적응)',
    shortLabel: 'Relaxed',
    description: '손가락 번호와 프렛 위치 익히기 · ±110ms / ±45 cents',
    perfectMs: 110,
    goodMs: 220,
    passMs: 300,
    centsTolerance: 45,
    bendCompletionRatio: 0.65,
    minPassScore: 70,
  },
  standard: {
    id: 'standard',
    label: '2단계 · STANDARD (정규 승급)',
    shortLabel: 'Standard',
    description: '다음 단계 해금 기준 · ±65ms / ±30 cents',
    perfectMs: 65,
    goodMs: 130,
    passMs: 180,
    centsTolerance: 30,
    bendCompletionRatio: 0.8,
    minPassScore: 80,
  },
  tight: {
    id: 'tight',
    label: '3단계 · TIGHT (엄격 칼박)',
    shortLabel: 'Tight',
    description: '정확한 피킹 어택 & 벤딩 피치 · ±35ms / ±18 cents',
    perfectMs: 35,
    goodMs: 75,
    passMs: 110,
    centsTolerance: 18,
    bendCompletionRatio: 0.9,
    minPassScore: 85,
  },
  studio: {
    id: 'studio',
    label: '4단계 · STUDIO MASTER (완벽)',
    shortLabel: 'Studio Master',
    description: '무힌트 블라인드 스튜디오 판정 · ±18ms / ±10 cents',
    perfectMs: 18,
    goodMs: 40,
    passMs: 65,
    centsTolerance: 10,
    bendCompletionRatio: 0.94,
    minPassScore: 90,
  },
};

export interface AudioLatencyTelemetry {
  sampleRate: number;
  baseLatencyMs: number;
  outputLatencyMs: number;
  totalEstimatedMs: number;
  pipelineMode: 'worklet' | 'analyser-fallback' | 'asio-bridge' | 'idle';
  asioBridgeConnected: boolean;
}

export type PitchListener = (data: LivePitchData) => void;

const EMPTY_PITCH: LivePitchData = {
  frequency: 0,
  midiFloat: 0,
  nearestMidi: 0,
  noteName: '--',
  centsOff: 0,
  rmsDb: -90,
  clarity: 0,
  isOnset: false,
  isActive: false,
  timestampMs: 0,
  source: 'worklet',
};

export class LowLatencyGuitarAudioEngine {
  private ctx: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private silentGain: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private fallbackRafId: number | null = null;
  private asioSocket: WebSocket | null = null;

  private listeners = new Set<PitchListener>();
  private lastPitch: LivePitchData = EMPTY_PITCH;
  private prevFallbackRms = 0;
  private lastFallbackOnsetMs = 0;

  private config: AudioDeviceConfig = {
    deviceId: 'default',
    inputMode: 'worklet',
    channelMode: 'mono',
    directMonitor: true,
    noiseGateDb: -52,
    latencyOffsetMs: 12,
    asioBridgeUrl: 'ws://127.0.0.1:9420',
  };

  private telemetry: AudioLatencyTelemetry = {
    sampleRate: 48000,
    baseLatencyMs: 2.7,
    outputLatencyMs: 5.3,
    totalEstimatedMs: 8.0,
    pipelineMode: 'idle',
    asioBridgeConnected: false,
  };

  public isRunning = false;

  public subscribe(fn: PitchListener): () => void {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }

  private emit(data: LivePitchData) {
    this.lastPitch = data;
    this.listeners.forEach((fn) => fn(data));
  }

  public getConfig(): AudioDeviceConfig {
    return { ...this.config };
  }

  public getTelemetry(): AudioLatencyTelemetry {
    return { ...this.telemetry };
  }

  public getLastPitch(): LivePitchData {
    return this.lastPitch;
  }

  public updateConfig(partial: Partial<AudioDeviceConfig>) {
    this.config = { ...this.config, ...partial };
    if (this.workletNode) {
      this.workletNode.port.postMessage({
        noiseGateDb: this.config.noiseGateDb,
        channelMode: this.config.channelMode,
      });
    }
  }

  public async listInputDevices(): Promise<MediaDeviceInfo[]> {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.enumerateDevices) {
      return [];
    }
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.filter((d) => d.kind === 'audioinput');
    } catch {
      return [];
    }
  }

  public async start(customConfig?: Partial<AudioDeviceConfig>): Promise<AudioLatencyTelemetry> {
    if (customConfig) {
      this.updateConfig(customConfig);
    }

    await this.stop();

    if (this.config.inputMode === 'asio-bridge') {
      return this.startAsioBridge();
    }

    if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      throw new Error('이 브라우저는 Web Audio 오디오 입력을 지원하지 않습니다.');
    }

    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

    this.ctx = new AudioCtx({
      latencyHint: 'interactive',
      sampleRate: 48000,
    });

    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }

    const constraints: MediaStreamConstraints = {
      audio: {
        deviceId:
          this.config.deviceId && this.config.deviceId !== 'default'
            ? { exact: this.config.deviceId }
            : undefined,
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
        channelCount: { ideal: 2 },
        sampleRate: { ideal: 48000 },
      },
      video: false,
    };

    this.stream = await navigator.mediaDevices.getUserMedia(constraints);
    this.sourceNode = this.ctx.createMediaStreamSource(this.stream);

    // Keep zero-gain sink so AudioWorklet stays scheduled without causing feedback/flanging
    this.silentGain = this.ctx.createGain();
    this.silentGain.gain.value = 0;

    const baseLat = (this.ctx.baseLatency || 0.0027) * 1000;
    const outLat = ((this.ctx as AudioContext & { outputLatency?: number }).outputLatency || 0.0055) * 1000;

    try {
      if (!this.ctx.audioWorklet) {
        throw new Error('AudioWorklet unsupported');
      }
      await this.ctx.audioWorklet.addModule('/worklets/guitarPitchWorklet.js');
      this.workletNode = new AudioWorkletNode(this.ctx, 'guitar-pitch-processor', {
        numberOfInputs: 1,
        numberOfOutputs: 1,
        channelCount: 2,
        channelCountMode: 'explicit',
      });

      this.workletNode.port.postMessage({
        noiseGateDb: this.config.noiseGateDb,
        channelMode: this.config.channelMode,
      });

      this.workletNode.port.onmessage = (event) => {
        const msg = event.data;
        if (!msg) return;
        this.handleRawAnalysis(msg.frequency, msg.rmsDb, msg.isOnset, msg.clarity, 'worklet');
      };

      this.sourceNode.connect(this.workletNode);
      this.workletNode.connect(this.silentGain);
      this.silentGain.connect(this.ctx.destination);

      this.telemetry = {
        sampleRate: this.ctx.sampleRate,
        baseLatencyMs: Number(baseLat.toFixed(1)),
        outputLatencyMs: Number(outLat.toFixed(1)),
        totalEstimatedMs: Number((baseLat + outLat).toFixed(1)),
        pipelineMode: 'worklet',
        asioBridgeConnected: false,
      };
    } catch {
      // Fallback to AnalyserNode YIN loop
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 2048;
      this.sourceNode.connect(this.analyser);
      this.startFallbackAnalyserLoop();

      this.telemetry = {
        sampleRate: this.ctx.sampleRate,
        baseLatencyMs: Number(baseLat.toFixed(1)),
        outputLatencyMs: Number(outLat.toFixed(1)),
        totalEstimatedMs: Number((baseLat + outLat + 5.0).toFixed(1)),
        pipelineMode: 'analyser-fallback',
        asioBridgeConnected: false,
      };
    }

    this.isRunning = true;
    return this.getTelemetry();
  }

  private startAsioBridge(): Promise<AudioLatencyTelemetry> {
    return new Promise((resolve, reject) => {
      try {
        const ws = new WebSocket(this.config.asioBridgeUrl);
        this.asioSocket = ws;

        const timeout = setTimeout(() => {
          if (!this.telemetry.asioBridgeConnected) {
            ws.close();
            reject(
              new Error(
                `로컬 ASIO 브리지(${this.config.asioBridgeUrl})에 연결할 수 없습니다. 브라우저 Worklet 모드로 전환해 사용하세요.`
              )
            );
          }
        }, 2500);

        ws.onopen = () => {
          clearTimeout(timeout);
          this.isRunning = true;
          this.telemetry = {
            sampleRate: 48000,
            baseLatencyMs: 1.3,
            outputLatencyMs: 2.1,
            totalEstimatedMs: 3.4,
            pipelineMode: 'asio-bridge',
            asioBridgeConnected: true,
          };
          ws.send(
            JSON.stringify({
              type: 'config',
              channelMode: this.config.channelMode,
              noiseGateDb: this.config.noiseGateDb,
            })
          );
          resolve(this.getTelemetry());
        };

        ws.onmessage = (ev) => {
          try {
            const payload = JSON.parse(ev.data);
            if (typeof payload.frequency === 'number') {
              this.handleRawAnalysis(
                payload.frequency,
                payload.rmsDb ?? -40,
                Boolean(payload.isOnset),
                payload.clarity ?? 0.9,
                'asio-bridge'
              );
            }
          } catch {
            // ignore malformed bridge packet
          }
        };

        ws.onerror = () => {
          clearTimeout(timeout);
          this.telemetry.asioBridgeConnected = false;
          reject(new Error('ASIO 브리지 소켓 연결 오류가 발생했습니다.'));
        };
      } catch (e) {
        reject(e);
      }
    });
  }

  private startFallbackAnalyserLoop() {
    if (!this.analyser || !this.ctx) return;
    const buf = new Float32Array(this.analyser.fftSize);
    const sr = this.ctx.sampleRate;

    const tick = () => {
      if (!this.analyser || !this.ctx) return;
      this.analyser.getFloatTimeDomainData(buf);

      let sumSq = 0;
      for (let i = 0; i < buf.length; i++) sumSq += buf[i] * buf[i];
      const rms = Math.sqrt(sumSq / buf.length);
      const rmsDb = rms > 1e-7 ? 20 * Math.log10(rms) : -100;
      const gateLinear = Math.pow(10, this.config.noiseGateDb / 20);
      const nowMs = performance.now();

      const isOnset =
        rms > gateLinear * 1.5 &&
        rms > this.prevFallbackRms * 1.75 &&
        nowMs - this.lastFallbackOnsetMs > 70;
      if (isOnset) this.lastFallbackOnsetMs = nowMs;
      this.prevFallbackRms = this.prevFallbackRms * 0.65 + rms * 0.35;

      let freq = 0;
      let clarity = 0;
      if (rmsDb >= this.config.noiseGateDb) {
        const res = this.runYinSimple(buf, sr);
        freq = res.frequency;
        clarity = res.clarity;
      }

      this.handleRawAnalysis(freq, rmsDb, isOnset, clarity, 'analyser');
      this.fallbackRafId = requestAnimationFrame(tick);
    };

    this.fallbackRafId = requestAnimationFrame(tick);
  }

  private runYinSimple(frame: Float32Array, sr: number): { frequency: number; clarity: number } {
    const half = Math.floor(frame.length / 2);
    const minTau = Math.max(2, Math.floor(sr / 1320));
    const maxTau = Math.min(half - 2, Math.ceil(sr / 68));
    const yin = new Float32Array(maxTau + 1);
    yin[0] = 1;
    let running = 0;

    for (let tau = 1; tau <= maxTau; tau++) {
      let sum = 0;
      for (let j = 0; j < half; j++) {
        const d = frame[j] - frame[j + tau];
        sum += d * d;
      }
      running += sum;
      yin[tau] = running > 0 ? (sum * tau) / running : 1;
    }

    let bestTau = -1;
    let minVal = 1;
    for (let tau = minTau; tau < maxTau; tau++) {
      if (yin[tau] < 0.18) {
        while (tau + 1 < maxTau && yin[tau + 1] < yin[tau]) tau++;
        bestTau = tau;
        break;
      }
      if (yin[tau] < minVal) {
        minVal = yin[tau];
        bestTau = tau;
      }
    }

    if (bestTau <= minTau || bestTau >= maxTau || yin[bestTau] > 0.28) {
      return { frequency: 0, clarity: 0 };
    }

    const s0 = yin[bestTau - 1];
    const s1 = yin[bestTau];
    const s2 = yin[bestTau + 1];
    const denom = 2 * (2 * s1 - s2 - s0);
    const tau = Math.abs(denom) > 1e-6 ? bestTau + (s2 - s0) / denom : bestTau;
    return { frequency: sr / tau, clarity: Math.max(0, 1 - s1) };
  }

  private handleRawAnalysis(
    frequency: number,
    rmsDb: number,
    isOnset: boolean,
    clarity: number,
    source: LivePitchData['source']
  ) {
    const nowMs = performance.now() - this.config.latencyOffsetMs;
    if (frequency <= 0 || rmsDb < this.config.noiseGateDb) {
      this.emit({
        ...EMPTY_PITCH,
        rmsDb,
        isOnset: false,
        isActive: false,
        timestampMs: nowMs,
        source,
      });
      return;
    }

    const midiFloat = freqToMidiFloat(frequency);
    const nearestMidi = Math.round(midiFloat);
    const centsOff = Math.round((midiFloat - nearestMidi) * 100);
    const noteName = midiToNoteName(nearestMidi);
    const guess = findBestFretForMidi(nearestMidi, [0, 15]);

    this.emit({
      frequency,
      midiFloat,
      nearestMidi,
      noteName,
      centsOff,
      rmsDb,
      clarity,
      isOnset,
      isActive: true,
      timestampMs: nowMs,
      detectedString: guess.string,
      detectedFret: guess.fret,
      source,
    });
  }

  // Trigger simulated guitar pitch for environments without a physical mic/interface attached
  public emitSimulatedNote(string: GuitarString, fret: number, bendCents = 0) {
    const baseMidi = getNoteMidi(string, fret);
    const midiFloat = baseMidi + bendCents / 100;
    const frequency = 440 * Math.pow(2, (midiFloat - 69) / 12);
    const nearestMidi = Math.round(midiFloat);
    const centsOff = Math.round((midiFloat - nearestMidi) * 100);

    this.emit({
      frequency,
      midiFloat,
      nearestMidi,
      noteName: midiToNoteName(baseMidi),
      centsOff,
      rmsDb: -18,
      clarity: 0.99,
      isOnset: true,
      isActive: true,
      timestampMs: performance.now(),
      detectedString: string,
      detectedFret: fret,
      source: 'simulated',
    });
  }

  public async stop() {
    this.isRunning = false;
    if (this.fallbackRafId !== null) {
      cancelAnimationFrame(this.fallbackRafId);
      this.fallbackRafId = null;
    }
    if (this.asioSocket) {
      this.asioSocket.close();
      this.asioSocket = null;
    }
    if (this.workletNode) {
      this.workletNode.disconnect();
      this.workletNode = null;
    }
    if (this.analyser) {
      this.analyser.disconnect();
      this.analyser = null;
    }
    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }
    if (this.silentGain) {
      this.silentGain.disconnect();
      this.silentGain = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop());
      this.stream = null;
    }
    if (this.ctx) {
      try {
        await this.ctx.close();
      } catch {
        // ignore close errors
      }
      this.ctx = null;
    }
    this.telemetry.pipelineMode = 'idle';
    this.telemetry.asioBridgeConnected = false;
    this.emit(EMPTY_PITCH);
  }
}

export const guitarAudioEngine = new LowLatencyGuitarAudioEngine();

export function evaluateNoteHit(
  targetNote: NoteEvent,
  detectedMidiFloat: number,
  timingErrorMs: number,
  tier: JudgmentTier,
  peakBendCents = 0
): NoteEvaluation {
  const spec = JUDGMENT_TIERS[tier];
  const baseTargetMidi = getNoteMidi(targetNote.string, targetNote.fret);
  const expectedBend = targetNote.bendCents ?? 0;

  // Pitch comparison (account for octave tolerance only in Studio? No, exact pitch, unless chord note)
  const targetMidiWithBend = baseTargetMidi + expectedBend / 100;
  const rawCentsDiff = Math.round((detectedMidiFloat - baseTargetMidi) * 100);
  const bendTargetCentsDiff = Math.round((detectedMidiFloat - targetMidiWithBend) * 100);

  let pitchOk = false;
  if (expectedBend > 0) {
    const achieved = Math.max(peakBendCents, rawCentsDiff);
    const minRequired = expectedBend * spec.bendCompletionRatio;
    pitchOk =
      achieved >= minRequired &&
      Math.abs(bendTargetCentsDiff) <= spec.centsTolerance + (expectedBend * (1 - spec.bendCompletionRatio));
  } else if (targetNote.chordNotes && targetNote.chordNotes.length > 0) {
    // Any note belonging to the chord voicing passes pitch check
    pitchOk = targetNote.chordNotes.some((cn) => {
      const m = getNoteMidi(cn.string, cn.fret);
      return Math.abs((detectedMidiFloat - m) * 100) <= spec.centsTolerance + 15;
    });
  } else {
    pitchOk = Math.abs(rawCentsDiff) <= spec.centsTolerance;
  }

  const absTiming = Math.abs(timingErrorMs);
  let result: JudgmentResult = 'miss';

  if (pitchOk) {
    if (absTiming <= spec.perfectMs) {
      result = 'perfect';
    } else if (absTiming <= spec.goodMs) {
      result = 'good';
    } else if (absTiming <= spec.passMs) {
      result = 'pass';
    } else {
      result = 'miss';
    }
  }

  return {
    noteId: targetNote.id,
    result,
    timingErrorMs: Math.round(timingErrorMs),
    centsError: expectedBend > 0 ? bendTargetCentsDiff : rawCentsDiff,
    bendAchievedCents: expectedBend > 0 ? Math.max(0, Math.round(peakBendCents)) : undefined,
    detectedMidi: Math.round(detectedMidiFloat),
  };
}

export function evaluateImprovisation(
  playedEvents: { midi: number; barIndex: number; isBend: boolean; gapMs: number }[],
  scaleOverlay: ScaleOverlayNote[],
  chordProgression: ChordBar[]
): ImprovisationMetrics {
  if (playedEvents.length === 0) {
    return {
      harmonicFit: 0,
      chordToneResolution: 0,
      rhythmBreathing: 0,
      expressiveArticulation: 0,
      totalNotesPlayed: 0,
      chordToneHits: 0,
      inScaleHits: 0,
      bendsDetected: 0,
      phraseCount: 0,
      overallScore: 0,
      feedbackSummary: '즉흥 잼을 시작하고 기타를 연주하면 화성 조화도와 코드 톤 착지력을 실시간으로 분석합니다.',
    };
  }

  const scalePitchClasses = new Set(
    scaleOverlay.map((s) => getNoteMidi(s.string, s.fret) % 12)
  );

  let inScaleHits = 0;
  let chordToneHits = 0;
  let bendsDetected = 0;
  let phraseCount = 1;

  for (let i = 0; i < playedEvents.length; i++) {
    const ev = playedEvents[i];
    const pc = ((ev.midi % 12) + 12) % 12;
    if (scalePitchClasses.has(pc)) inScaleHits++;

    const bar = chordProgression[ev.barIndex % Math.max(1, chordProgression.length)];
    if (bar && bar.chordMidiPitchClasses.includes(pc)) {
      chordToneHits++;
    }
    if (ev.isBend) bendsDetected++;
    if (i > 0 && ev.gapMs > 420) phraseCount++;
  }

  const harmonicFit = Math.round((inScaleHits / playedEvents.length) * 100);
  const chordToneResolution = Math.min(
    100,
    Math.round((chordToneHits / playedEvents.length) * 135)
  );
  const idealPhrases = Math.max(2, Math.round(playedEvents.length / 4));
  const rhythmBreathing = Math.min(
    100,
    Math.round(55 + (Math.min(phraseCount, idealPhrases) / idealPhrases) * 45)
  );
  const expressiveArticulation = Math.min(
    100,
    Math.round(50 + Math.min(5, bendsDetected) * 10)
  );

  const overallScore = Math.round(
    harmonicFit * 0.3 +
      chordToneResolution * 0.35 +
      rhythmBreathing * 0.2 +
      expressiveArticulation * 0.15
  );

  let feedbackSummary = '';
  if (overallScore >= 85) {
    feedbackSummary =
      '코드 체인지에 맞춘 타겟 노트 착지와 프레이징 여백(호흡)이 매우 자연스럽습니다.';
  } else if (chordToneResolution < 60) {
    feedbackSummary =
      '스케일 음은 안정적입니다. 다음 마디로 넘어갈 때 지판에 표시된 현재 코드 톤(R, 3, 5)에서 프레이즈를 마무리해 보세요.';
  } else if (rhythmBreathing < 70) {
    feedbackSummary =
      '음을 쉼 없이 이어 치기보다 2~3음 문장 사이에 짧은 쉼표(호흡)를 두면 훨씬 노래하는 솔로가 됩니다.';
  } else {
    feedbackSummary =
      '안정적인 화성 감각입니다. 긴 음에 벤딩이나 비브라토 표현을 더하면 완성도가 한층 높아집니다.';
  }

  return {
    harmonicFit,
    chordToneResolution,
    rhythmBreathing,
    expressiveArticulation,
    totalNotesPlayed: playedEvents.length,
    chordToneHits,
    inScaleHits,
    bendsDetected,
    phraseCount,
    overallScore,
    feedbackSummary,
  };
}

export function mapHummedPitchesToFretboard(
  midis: number[],
  fretRange: [number, number],
  scaleOverlay: ScaleOverlayNote[],
  rootPitchClass = 9
): HummedNoteMapping[] {
  return midis.map((rawMidi) => {
    // Fold extreme vocal octaves into comfortable guitar register (E3..E5 = 52..76)
    let midi = Math.round(rawMidi);
    while (midi < 48) midi += 12;
    while (midi > 76) midi -= 12;

    const best = findBestFretForMidi(midi, fretRange, scaleOverlay, rootPitchClass);
    return {
      midi,
      noteName: midiToNoteName(midi),
      string: best.string,
      fret: best.fret,
      finger: best.finger,
      intervalLabel: best.intervalLabel,
    };
  });
}
