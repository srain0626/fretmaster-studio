import {
  findBestFretForMidi,
  freqToMidiFloat,
  getNoteMidi,
  midiToNoteName,
} from '@/lib/musicTheory';

function isEnglishRuntimeLocale(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const pref = window.localStorage.getItem('fretmaster_locale');
    if (pref === 'ko') return false;
    if (pref === 'en') return true;
  } catch {
    // ignore storage access issues
  }
  return typeof navigator !== 'undefined'
    ? !navigator.language.toLowerCase().startsWith('ko')
    : true;
}
import type {
  AdaptiveLatencyProfile,
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

export const POLY_SPECTRUM_MIN_MIDI = 40;
export const POLY_SPECTRUM_COUNT = 45;

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
    description: '손가락 번호와 프렛 위치 익히기 · ±110ms / ±55 cents',
    perfectMs: 110,
    goodMs: 220,
    passMs: 300,
    centsTolerance: 55,
    bendCompletionRatio: 0.65,
    minPassScore: 70,
  },
  standard: {
    id: 'standard',
    label: '2단계 · STANDARD (정규 승급)',
    shortLabel: 'Standard',
    description: '다음 단계 해금 기준 · ±65ms / ±42 cents',
    perfectMs: 65,
    goodMs: 130,
    passMs: 180,
    centsTolerance: 42,
    bendCompletionRatio: 0.8,
    minPassScore: 80,
  },
  tight: {
    id: 'tight',
    label: '3단계 · TIGHT (엄격 칼박)',
    shortLabel: 'Tight',
    description: '정확한 피킹 어택 & 벤딩 피치 · ±35ms / ±28 cents',
    perfectMs: 35,
    goodMs: 75,
    passMs: 110,
    centsTolerance: 28,
    bendCompletionRatio: 0.9,
    minPassScore: 85,
  },
  studio: {
    id: 'studio',
    label: '4단계 · STUDIO MASTER (완벽)',
    shortLabel: 'Studio Master',
    description: '무힌트 블라인드 스튜디오 판정 · ±18ms / ±18 cents',
    perfectMs: 18,
    goodMs: 40,
    passMs: 65,
    centsTolerance: 18,
    bendCompletionRatio: 0.94,
    minPassScore: 90,
  },
};

export function getJudgmentTierLabel(tier: JudgmentTier, locale: 'en' | 'ko' = 'ko'): string {
  if (locale === 'en') {
    switch (tier) {
      case 'relaxed':
        return 'Relaxed (Beginner)';
      case 'standard':
        return 'Standard (Unlock Next)';
      case 'tight':
        return 'Tight (Strict Pocket)';
      case 'studio':
        return 'Studio Master (Blind)';
    }
  }
  return JUDGMENT_TIERS[tier].label;
}

export interface AudioLatencyTelemetry {
  sampleRate: number;
  baseLatencyMs: number;
  outputLatencyMs: number;
  totalEstimatedMs: number;
  pipelineMode: 'worklet' | 'analyser-fallback' | 'asio-bridge' | 'idle';
  asioBridgeConnected: boolean;
  fallbackNotice?: string;
}

export type PitchListener = (data: LivePitchData) => void;

const EMPTY_PITCH: LivePitchData = {
  frequency: 0,
  midiFloat: 0,
  nearestMidi: 0,
  noteName: '--',
  centsOff: 0,
  rmsDb: -90,
  peakDb: -100,
  isClipping: false,
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

  // Pitch smoothing, attack settling, and legato onset tracking
  private pitchHistory: number[] = [];
  private candidateJumpMidi: number | null = null;
  private candidateJumpCount = 0;
  private pendingOnsetUntilMs = 0;
  private stableMidiForLegato: number | null = null;
  private legatoHoldMidi: number | null = null;
  private legatoHoldCount = 0;
  private lastSynthOnsetMs = 0;
  private lastUiEmitMs = 0;
  private silenceResetCount = 0;

  private config: AudioDeviceConfig = {
    deviceId: 'default',
    inputMode: 'worklet',
    channelMode: 'mono',
    directMonitor: true,
    noiseGateDb: -58,
    latencyOffsetMs: 12,
    inputGainDb: 0,
    autoCalibrateLatency: true,
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
        inputGainDb: this.config.inputGainDb ?? 0,
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
      try {
        return await this.startAsioBridge();
      } catch {
        const fallbackNotice = isEnglishRuntimeLocale()
          ? 'Local ASIO daemon was not detected; switched automatically to 128-sample Web Audio Worklet.'
          : '로컬 ASIO 브리지(9420)를 찾지 못해 저지연 Web Audio(Worklet 128)로 자동 전환했습니다.';
        const tel = await this.startWorkletPipeline();
        this.telemetry = {
          ...tel,
          fallbackNotice,
        };
        return this.getTelemetry();
      }
    }

    return this.startWorkletPipeline();
  }

  private async startWorkletPipeline(): Promise<AudioLatencyTelemetry> {
    if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      throw new Error(
        isEnglishRuntimeLocale()
          ? 'This browser does not support Web Audio microphone input.'
          : '이 브라우저는 Web Audio 오디오 입력을 지원하지 않습니다.'
      );
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
        inputGainDb: this.config.inputGainDb ?? 0,
      });

      this.workletNode.port.onmessage = (event) => {
        const msg = event.data;
        if (!msg) return;
        this.handleRawAnalysis(
          msg.frequency,
          msg.rmsDb,
          msg.isOnset,
          msg.clarity,
          'worklet',
          msg.peakDb,
          msg.isClipping,
          msg.chroma,
          msg.noteSpectrum
        );
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
      this.analyser.fftSize = 4096;
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

  public async testAsioBridge(
    targetUrl?: string
  ): Promise<{ ok: boolean; latencyMs?: number; error?: string }> {
    const url = targetUrl || this.config.asioBridgeUrl;
    if (typeof window === 'undefined' || typeof WebSocket === 'undefined') {
      return {
        ok: false,
        error: isEnglishRuntimeLocale()
          ? 'WebSocket is unavailable in this environment.'
          : '현재 브라우저 환경에서 WebSocket을 사용할 수 없습니다.',
      };
    }

    return new Promise((resolve) => {
      let settled = false;
      const startedAt = performance.now();
      let ws: WebSocket | null = null;

      const finish = (res: { ok: boolean; latencyMs?: number; error?: string }) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        try {
          if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
            ws.close();
          }
        } catch {
          // ignore close errors
        }
        resolve(res);
      };

      const timeout = setTimeout(() => {
        finish({
          ok: false,
          error: isEnglishRuntimeLocale()
            ? `No ASIO bridge daemon detected on ${url}.`
            : `로컬 ASIO 브리지(${url})가 실행 중이지 않습니다.`,
        });
      }, 1500);

      try {
        ws = new WebSocket(url);
        ws.onopen = () => {
          finish({ ok: true, latencyMs: Math.max(1, Math.round(performance.now() - startedAt)) });
        };
        ws.onerror = () => {
          finish({
            ok: false,
            error: isEnglishRuntimeLocale()
              ? `Could not connect to ${url}.`
              : `${url} 연결에 실패했습니다.`,
          });
        };
        ws.onclose = () => {
          finish({
            ok: false,
            error: isEnglishRuntimeLocale()
              ? `Bridge socket closed on ${url}.`
              : `ASIO 브리지 소켓(${url})이 닫혔습니다.`,
          });
        };
      } catch (err) {
        finish({
          ok: false,
          error: err instanceof Error ? err.message : 'WebSocket error',
        });
      }
    });
  }

  private startAsioBridge(): Promise<AudioLatencyTelemetry> {
    return new Promise((resolve, reject) => {
      let settled = false;
      let ws: WebSocket | null = null;

      const fail = (err: Error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        this.telemetry.asioBridgeConnected = false;
        this.asioSocket = null;
        try {
          if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
            ws.close();
          }
        } catch {
          // ignore close failures
        }
        reject(err);
      };

      const timeout = setTimeout(() => {
        fail(
          new Error(
            isEnglishRuntimeLocale()
              ? `Unable to connect to local ASIO bridge (${this.config.asioBridgeUrl}). Switch to Browser Worklet mode.`
              : `로컬 ASIO 브리지(${this.config.asioBridgeUrl})에 연결할 수 없습니다. 브라우저 Worklet 모드로 전환해 사용하세요.`
          )
        );
      }, 1500);

      try {
        ws = new WebSocket(this.config.asioBridgeUrl);
        this.asioSocket = ws;

        ws.onopen = () => {
          if (settled) return;
          settled = true;
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
          ws?.send(
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
              const rmsVal = payload.rmsDb ?? -40;
              const peakVal = payload.peakDb ?? rmsVal;
              const clipVal = Boolean(payload.isClipping || peakVal >= -0.5);
              this.handleRawAnalysis(
                payload.frequency,
                rmsVal,
                Boolean(payload.isOnset),
                payload.clarity ?? 0.9,
                'asio-bridge',
                peakVal,
                clipVal,
                Array.isArray(payload.chroma) ? payload.chroma : undefined,
                Array.isArray(payload.noteSpectrum) ? payload.noteSpectrum : undefined
              );
            }
          } catch {
            // ignore malformed bridge packet
          }
        };

        ws.onerror = () => {
          fail(
            new Error(
              isEnglishRuntimeLocale()
                ? 'ASIO bridge WebSocket connection error occurred.'
                : 'ASIO 브리지 소켓 연결 오류가 발생했습니다.'
            )
          );
        };

        ws.onclose = () => {
          if (!settled) {
            fail(
              new Error(
                isEnglishRuntimeLocale()
                  ? 'ASIO bridge WebSocket closed before handshake.'
                  : 'ASIO 브리지 소켓이 연결 전 종료되었습니다.'
              )
            );
          } else {
            this.telemetry.asioBridgeConnected = false;
            this.asioSocket = null;
          }
        };
      } catch (e) {
        fail(e instanceof Error ? e : new Error('ASIO bridge WebSocket connection error occurred.'));
      }
    });
  }

  private startFallbackAnalyserLoop() {
    if (!this.analyser || !this.ctx) return;
    const buf = new Float32Array(this.analyser.fftSize);
    const scaled = new Float32Array(this.analyser.fftSize);
    const sr = this.ctx.sampleRate;

    const tick = () => {
      if (!this.analyser || !this.ctx) return;
      this.analyser.getFloatTimeDomainData(buf);

      const gainDb = Math.max(-18, Math.min(18, this.config.inputGainDb ?? 0));
      const gainLinear = Math.pow(10, gainDb / 20);
      let sumSq = 0;
      let rawPeak = 0;
      let peak = 0;
      for (let i = 0; i < buf.length; i++) {
        const raw = buf[i];
        const absRaw = Math.abs(raw);
        if (absRaw > rawPeak) rawPeak = absRaw;
        const g = raw * gainLinear;
        scaled[i] = g;
        const absG = Math.abs(g);
        if (absG > peak) peak = absG;
        sumSq += g * g;
      }
      const rms = Math.sqrt(sumSq / buf.length);
      const rmsDb = rms > 1e-7 ? 20 * Math.log10(rms) : -100;
      const peakDb = peak > 1e-6 ? Math.min(0, 20 * Math.log10(peak)) : -100;
      const isClipping = rawPeak >= 0.97 || peak >= 0.98;
      const gateLinear = Math.pow(10, this.config.noiseGateDb / 20);
      const nowMs = performance.now();

      const isOnset =
        rms > gateLinear * 1.3 &&
        nowMs - this.lastFallbackOnsetMs > 55 &&
        rms > this.prevFallbackRms * 1.45;
      if (isOnset) this.lastFallbackOnsetMs = nowMs;
      this.prevFallbackRms = this.prevFallbackRms * 0.65 + rms * 0.35;

      let freq = 0;
      let clarity = 0;
      let poly: { chroma: number[]; noteSpectrum: number[] } | undefined;
      if (rmsDb >= this.config.noiseGateDb) {
        const res = this.runYinSimple(scaled, sr);
        freq = res.frequency;
        clarity = res.clarity;
        poly = this.computePolyphonicFallback(scaled, sr);
      }

      this.handleRawAnalysis(
        freq,
        rmsDb,
        isOnset,
        clarity,
        'analyser',
        peakDb,
        isClipping,
        poly?.chroma,
        poly?.noteSpectrum
      );
      this.fallbackRafId = requestAnimationFrame(tick);
    };

    this.fallbackRafId = requestAnimationFrame(tick);
  }

  private computePolyphonicFallback(
    frame: Float32Array,
    sr: number
  ): { chroma: number[]; noteSpectrum: number[] } {
    const N = 8192;
    const len = Math.min(frame.length, 4096);
    let mean = 0;
    for (let i = 0; i < len; i++) mean += frame[i];
    mean /= Math.max(1, len);

    const re = new Float32Array(N);
    const im = new Float32Array(N);
    for (let i = 0; i < len; i++) {
      const w = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (len - 1)));
      re[i] = (frame[i] - mean) * w;
    }

    // Bit-reversal permutation + iterative FFT
    for (let i = 1, j = 0; i < N; i++) {
      let bit = N >> 1;
      for (; j & bit; bit >>= 1) j ^= bit;
      j ^= bit;
      if (i < j) {
        const tmp = re[i];
        re[i] = re[j];
        re[j] = tmp;
      }
    }
    for (let size = 2; size <= N; size <<= 1) {
      const half = size >> 1;
      const step = (-2 * Math.PI) / size;
      for (let i = 0; i < N; i += size) {
        for (let k = 0; k < half; k++) {
          const ang = k * step;
          const wr = Math.cos(ang);
          const wi = Math.sin(ang);
          const even = i + k;
          const odd = even + half;
          const tRe = re[odd] * wr - im[odd] * wi;
          const tIm = re[odd] * wi + im[odd] * wr;
          re[odd] = re[even] - tRe;
          im[odd] = im[even] - tIm;
          re[even] += tRe;
          im[even] += tIm;
        }
      }
    }

    const binHz = sr / N;
    const halfBins = N >> 1;
    const rawEnergies = new Float32Array(POLY_SPECTRUM_COUNT);
    const rawChroma = new Float32Array(12);
    let maxE = 1e-6;
    const bracketMag = (f: number) => {
      const exact = f / binHz;
      const b0 = Math.max(1, Math.min(halfBins - 2, Math.floor(exact)));
      const b1 = b0 + 1;
      const m0 = Math.hypot(re[b0], im[b0]);
      const m1 = Math.hypot(re[b1], im[b1]);
      return m0 > m1 ? m0 : m1;
    };
    for (let idx = 0; idx < POLY_SPECTRUM_COUNT; idx++) {
      const midi = POLY_SPECTRUM_MIN_MIDI + idx;
      const f1 = 440 * Math.pow(2, (midi - 69) / 12);
      const mag1 = bracketMag(f1);
      const mag2 = f1 * 2 < sr * 0.45 ? bracketMag(f1 * 2) : 0;
      const e = Math.sqrt(mag1 * (0.55 * mag1 + 0.45 * mag2));
      rawEnergies[idx] = e;
      if (e > maxE) maxE = e;
      rawChroma[midi % 12] += e;
    }
    const maxC = Math.max(1e-6, ...rawChroma);
    return {
      noteSpectrum: Array.from(rawEnergies, (e) => Math.round((e / maxE) * 100)),
      chroma: Array.from(rawChroma, (c) => Number((c / maxC).toFixed(3))),
    };
  }

  private runYinSimple(frame: Float32Array, sr: number): { frequency: number; clarity: number } {
    // DC offset removal + 1-pole LPF (~1400 Hz) to suppress pick click & upper harmonics
    let mean = 0;
    for (let i = 0; i < frame.length; i++) mean += frame[i];
    mean /= frame.length;

    const filtered = new Float32Array(frame.length);
    const lpfAlpha = (2 * Math.PI * 1400) / (sr + 2 * Math.PI * 1400);
    let lpfState = 0;
    for (let i = 0; i < frame.length; i++) {
      lpfState += lpfAlpha * (frame[i] - mean - lpfState);
      filtered[i] = lpfState;
    }

    const half = Math.floor(filtered.length / 2);
    const minTau = Math.max(2, Math.floor(sr / 1450));
    const maxTau = Math.min(half - 2, Math.ceil(sr / 65));
    const yin = new Float32Array(maxTau + 1);
    yin[0] = 1;
    let running = 0;

    for (let tau = 1; tau <= maxTau; tau++) {
      let sum = 0;
      for (let j = 0; j < half; j++) {
        const d = filtered[j] - filtered[j + tau];
        sum += d * d;
      }
      running += sum;
      yin[tau] = running > 0 ? (sum * tau) / running : 1;
    }

    let bestTau = -1;
    for (let tau = minTau; tau < maxTau; tau++) {
      if (yin[tau] < 0.18) {
        while (tau + 1 < maxTau && yin[tau + 1] < yin[tau]) tau++;
        bestTau = tau;
        break;
      }
    }

    if (bestTau === -1) {
      let minVal = 1;
      for (let tau = minTau; tau < maxTau; tau++) {
        if (yin[tau] < minVal) {
          minVal = yin[tau];
          bestTau = tau;
        }
      }
      if (minVal >= 0.34) {
        bestTau = -1;
      }
    }

    // Subharmonic guard against +1 octave jumps on low wound strings
    if (bestTau !== -1 && yin[bestTau] >= 0.05 && bestTau * 2 < maxTau - 3) {
      const doubleCenter = bestTau * 2;
      let bestDoubleTau = doubleCenter;
      let bestDoubleVal = yin[doubleCenter];
      for (let t = Math.max(minTau, doubleCenter - 3); t <= Math.min(maxTau - 1, doubleCenter + 3); t++) {
        if (yin[t] < bestDoubleVal) {
          bestDoubleVal = yin[t];
          bestDoubleTau = t;
        }
      }
      while (bestDoubleTau + 1 < maxTau && yin[bestDoubleTau + 1] < yin[bestDoubleTau]) {
        bestDoubleTau++;
        bestDoubleVal = yin[bestDoubleTau];
      }
      if (
        bestDoubleVal < 0.12 &&
        bestDoubleVal < yin[bestTau] * 0.55 &&
        yin[bestTau] - bestDoubleVal >= 0.04
      ) {
        bestTau = bestDoubleTau;
      }
    }

    if (bestTau <= minTau || bestTau >= maxTau) {
      return { frequency: 0, clarity: 0 };
    }

    const s0 = yin[bestTau - 1];
    const s1 = yin[bestTau];
    const s2 = yin[bestTau + 1];
    const denom = 2 * (2 * s1 - s2 - s0);
    const tau = Math.abs(denom) > 1e-6 ? bestTau + (s2 - s0) / denom : bestTau;
    const frequency = sr / tau;
    if (frequency < 65 || frequency > 1450) {
      return { frequency: 0, clarity: 0 };
    }
    return { frequency, clarity: Math.max(0, Math.min(1, 1 - s1)) };
  }

  private resetPitchTrackingState() {
    this.pitchHistory = [];
    this.candidateJumpMidi = null;
    this.candidateJumpCount = 0;
    this.pendingOnsetUntilMs = 0;
    this.stableMidiForLegato = null;
    this.legatoHoldMidi = null;
    this.legatoHoldCount = 0;
    this.silenceResetCount = 0;
  }

  private handleRawAnalysis(
    frequency: number,
    rmsDb: number,
    isOnset: boolean,
    clarity: number,
    source: LivePitchData['source'],
    peakDb: number = rmsDb,
    isClipping: boolean = peakDb >= -0.5,
    chroma?: number[],
    noteSpectrum?: number[]
  ) {
    const nowMs = performance.now() - this.config.latencyOffsetMs;

    // Preserve a pick attack onset even if the initial attack transient is unpitched (freq=0)
    if (isOnset && rmsDb >= this.config.noiseGateDb) {
      this.pendingOnsetUntilMs = nowMs + 160;
      this.pitchHistory = [];
      this.candidateJumpMidi = null;
      this.candidateJumpCount = 0;
      this.legatoHoldMidi = null;
      this.legatoHoldCount = 0;
    }

    if (frequency <= 0 || rmsDb < this.config.noiseGateDb || clarity < 0.45) {
      this.silenceResetCount++;
      if (rmsDb < this.config.noiseGateDb && this.silenceResetCount >= 3) {
        this.resetPitchTrackingState();
      }
      const hasPolyActive =
        rmsDb >= this.config.noiseGateDb &&
        Array.isArray(noteSpectrum) &&
        noteSpectrum.length === POLY_SPECTRUM_COUNT;
      if (
        isClipping ||
        (hasPolyActive && isOnset) ||
        this.lastPitch.isActive ||
        nowMs - this.lastUiEmitMs >= 45
      ) {
        this.lastUiEmitMs = nowMs;
        this.emit({
          ...EMPTY_PITCH,
          rmsDb,
          peakDb,
          isClipping,
          chroma: hasPolyActive ? chroma : undefined,
          noteSpectrum: hasPolyActive ? noteSpectrum : undefined,
          isOnset: hasPolyActive && isOnset,
          isActive: hasPolyActive,
          timestampMs: nowMs,
          source,
        });
      }
      return;
    }

    this.silenceResetCount = 0;
    const rawMidiFloat = freqToMidiFloat(frequency);

    // Temporal median smoothing with fast 2-frame jump acceptance
    let jumpAccepted = false;
    if (this.pitchHistory.length > 0) {
      const sortedPrev = [...this.pitchHistory].sort((a, b) => a - b);
      const prevMedian = sortedPrev[Math.floor(sortedPrev.length / 2)];
      if (Math.abs(rawMidiFloat - prevMedian) >= 0.8) {
        if (this.candidateJumpMidi !== null && Math.abs(rawMidiFloat - this.candidateJumpMidi) < 0.5) {
          this.candidateJumpCount++;
        } else {
          this.candidateJumpMidi = rawMidiFloat;
          this.candidateJumpCount = 1;
        }
        if (this.candidateJumpCount >= 2) {
          this.pitchHistory = [rawMidiFloat];
          this.candidateJumpMidi = null;
          this.candidateJumpCount = 0;
          jumpAccepted = true;
        }
      } else {
        this.candidateJumpMidi = null;
        this.candidateJumpCount = 0;
        this.pitchHistory.push(rawMidiFloat);
        if (this.pitchHistory.length > 5) {
          this.pitchHistory.shift();
        }
      }
    } else {
      this.pitchHistory.push(rawMidiFloat);
    }

    const sortedHistory = [...this.pitchHistory].sort((a, b) => a - b);
    const midiFloat = sortedHistory[Math.floor(sortedHistory.length / 2)];
    const smoothedFrequency = 440 * Math.pow(2, (midiFloat - 69) / 12);
    const nearestMidi = Math.round(midiFloat);
    const centsOff = Math.round((midiFloat - nearestMidi) * 100);
    const noteName = midiToNoteName(nearestMidi);
    const guess = findBestFretForMidi(nearestMidi, [0, 12]);

    // Post-onset settling carryover + legato / soft fingerpicking pitch-shift onset
    let effectiveOnset = false;
    if (clarity >= 0.6) {
      if (isOnset || nowMs <= this.pendingOnsetUntilMs) {
        effectiveOnset = true;
        this.pendingOnsetUntilMs = 0;
        this.lastSynthOnsetMs = nowMs;
        this.stableMidiForLegato = nearestMidi;
        this.legatoHoldMidi = null;
        this.legatoHoldCount = 0;
      } else if (this.stableMidiForLegato === null || this.stableMidiForLegato !== nearestMidi) {
        if (jumpAccepted) {
          // Already confirmed 2 consecutive steady frames at the new note
          if (nowMs - this.lastSynthOnsetMs > 90) {
            effectiveOnset = true;
            this.lastSynthOnsetMs = nowMs;
            this.stableMidiForLegato = nearestMidi;
          }
          this.legatoHoldMidi = null;
          this.legatoHoldCount = 0;
        } else {
          if (this.legatoHoldMidi === nearestMidi) {
            this.legatoHoldCount++;
          } else {
            this.legatoHoldMidi = nearestMidi;
            this.legatoHoldCount = 1;
          }
          if (this.legatoHoldCount >= 2 && nowMs - this.lastSynthOnsetMs > 90) {
            effectiveOnset = true;
            this.lastSynthOnsetMs = nowMs;
            this.stableMidiForLegato = nearestMidi;
            this.legatoHoldMidi = null;
            this.legatoHoldCount = 0;
          }
        }
      } else {
        this.legatoHoldMidi = null;
        this.legatoHoldCount = 0;
      }
    }

    // Emit immediately on onset, clipping peak, attack-from-silence, or pitch change; throttle steady sustain to ~45 Hz
    const shouldEmit =
      effectiveOnset ||
      isClipping ||
      !this.lastPitch.isActive ||
      this.lastPitch.nearestMidi !== nearestMidi ||
      nowMs - this.lastUiEmitMs >= 22;

    if (!shouldEmit) return;
    this.lastUiEmitMs = nowMs;

    this.emit({
      frequency: smoothedFrequency,
      midiFloat,
      nearestMidi,
      noteName,
      centsOff,
      rmsDb,
      peakDb,
      isClipping,
      clarity,
      isOnset: effectiveOnset,
      isActive: true,
      timestampMs: nowMs,
      chroma,
      noteSpectrum,
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
      peakDb: -12,
      isClipping: false,
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
    this.prevFallbackRms = 0;
    this.lastFallbackOnsetMs = 0;
    this.lastSynthOnsetMs = 0;
    this.lastUiEmitMs = 0;
    this.resetPitchTrackingState();
    this.telemetry.pipelineMode = 'idle';
    this.telemetry.asioBridgeConnected = false;
    this.emit(EMPTY_PITCH);
  }
}

export const guitarAudioEngine = new LowLatencyGuitarAudioEngine();

export function computeCalibratedLatency(samplesMs: number[]): {
  offsetMs: number;
  jitterMs: number;
  quality: 'great' | 'ok' | 'noisy';
} {
  const finite = samplesMs.filter((n) => Number.isFinite(n));
  if (finite.length === 0) {
    return { offsetMs: 0, jitterMs: 0, quality: 'noisy' };
  }
  const sorted = [...finite].sort((a, b) => a - b);
  const core = sorted.length >= 4 ? sorted.slice(1, -1) : sorted;
  const avg = core.reduce((acc, v) => acc + v, 0) / core.length;
  const offsetMs = Math.max(-50, Math.min(200, Math.round(avg)));
  const jitterMs = Math.round(
    core.reduce((acc, v) => acc + Math.abs(v - avg), 0) / core.length
  );
  const quality: 'great' | 'ok' | 'noisy' =
    jitterMs <= 14 ? 'great' : jitterMs <= 30 ? 'ok' : 'noisy';
  return { offsetMs, jitterMs, quality };
}

export const EMPTY_ADAPTIVE_LATENCY_PROFILE: AdaptiveLatencyProfile = {
  samplesMs: [],
  totalSampleCount: 0,
  estimatedOffsetMs: 12,
  confidencePct: 0,
  jitterMs: 0,
  lastUpdatedAt: 0,
};

export function updateAdaptiveLatencyProfile(
  prev: AdaptiveLatencyProfile,
  newRawErrorsMs: number[],
  resetExisting = false
): AdaptiveLatencyProfile {
  const valid = newRawErrorsMs
    .filter((n) => Number.isFinite(n) && n >= -80 && n <= 240)
    .map((n) => Math.round(n));

  if (valid.length === 0 && !resetExisting) {
    return prev;
  }

  const combined = resetExisting
    ? valid.slice(-64)
    : [...prev.samplesMs, ...valid].slice(-64);
  const totalSampleCount = resetExisting
    ? valid.length
    : prev.totalSampleCount + valid.length;

  if (combined.length === 0) {
    return { ...EMPTY_ADAPTIVE_LATENCY_PROFILE };
  }

  const sorted = [...combined].sort((a, b) => a - b);
  let core: number[];
  if (sorted.length >= 6) {
    const trim = Math.max(1, Math.floor(sorted.length * 0.2));
    core = sorted.slice(trim, sorted.length - trim);
  } else if (sorted.length >= 4) {
    core = sorted.slice(1, -1);
  } else {
    core = sorted;
  }

  const avg = core.reduce((acc, v) => acc + v, 0) / core.length;
  const estimatedOffsetMs = Math.max(-50, Math.min(200, Math.round(avg)));
  const jitterMs = Math.round(
    core.reduce((acc, v) => acc + Math.abs(v - avg), 0) / core.length
  );

  const sampleFactor = Math.min(1, combined.length / 32);
  const consistencyFactor = Math.max(0.25, Math.min(1, 1 - Math.max(0, jitterMs - 8) / 45));
  const confidencePct =
    combined.length < 4
      ? Math.round(combined.length * 8)
      : Math.round(Math.min(99, (0.25 + 0.75 * sampleFactor) * consistencyFactor * 100));

  return {
    samplesMs: combined,
    totalSampleCount,
    estimatedOffsetMs,
    confidencePct,
    jitterMs,
    lastUpdatedAt: Date.now(),
  };
}

export interface PolyphonicChordResult {
  passed: boolean;
  matchRatio: number;
  matchedNotes: number;
  totalNotes: number;
  wrongThirdDetected: boolean;
  unmutedStringWarning: boolean;
}

const POLY_ENERGY_THRESHOLDS: Record<JudgmentTier, number> = {
  relaxed: 16,
  standard: 22,
  tight: 28,
  studio: 34,
};

const POLY_MIN_RATIO: Record<JudgmentTier, number> = {
  relaxed: 0.6,
  standard: 0.67,
  tight: 0.75,
  studio: 0.85,
};

export function evaluatePolyphonicChord(
  chordNotes: NonNullable<NoteEvent['chordNotes']>,
  noteSpectrum: number[],
  chroma?: number[],
  tier: JudgmentTier = 'standard'
): PolyphonicChordResult {
  const totalNotes = chordNotes.length;
  if (totalNotes === 0) {
    return {
      passed: false,
      matchRatio: 0,
      matchedNotes: 0,
      totalNotes: 0,
      wrongThirdDetected: false,
      unmutedStringWarning: false,
    };
  }

  const noteThresh = POLY_ENERGY_THRESHOLDS[tier];
  const minRatio = POLY_MIN_RATIO[tier];

  const getEnergy = (midi: number): number => {
    const idx = midi - POLY_SPECTRUM_MIN_MIDI;
    if (idx >= 0 && idx < POLY_SPECTRUM_COUNT && idx < noteSpectrum.length) {
      return noteSpectrum[idx];
    }
    return (chroma?.[midi % 12] ?? 0) * 100;
  };

  const uniqueTargetPcs = new Set<number>();
  const matchedUniquePcs = new Set<number>();
  let matchedNotes = 0;

  const targetMidis = chordNotes.map((cn) => {
    const m = getNoteMidi(cn.string, cn.fret);
    uniqueTargetPcs.add(m % 12);
    return m;
  });

  const rootCn = chordNotes.find((cn) => cn.intervalLabel === 'R');
  const rootMidi = rootCn ? getNoteMidi(rootCn.string, rootCn.fret) : Math.min(...targetMidis);
  const rootPc = rootMidi % 12;

  for (const m of targetMidis) {
    if (getEnergy(m) >= noteThresh) {
      matchedNotes++;
      matchedUniquePcs.add(m % 12);
    }
  }

  // Distinguish Major 3rd vs Minor 3rd cleanly in the active voicing's octave
  const major3Pc = (rootPc + 4) % 12;
  const minor3Pc = (rootPc + 3) % 12;
  const expectsMajor3 = uniqueTargetPcs.has(major3Pc) && !uniqueTargetPcs.has(minor3Pc);
  const expectsMinor3 = uniqueTargetPcs.has(minor3Pc) && !uniqueTargetPcs.has(major3Pc);
  let wrongThirdDetected = false;

  if (expectsMajor3) {
    for (const m of targetMidis) {
      if (m % 12 === major3Pc) {
        const targetE = getEnergy(m);
        const oppositeE = getEnergy(m - 1);
        if (oppositeE >= 26 && oppositeE > targetE * 1.25) {
          wrongThirdDetected = true;
        }
      }
    }
  } else if (expectsMinor3) {
    for (const m of targetMidis) {
      if (m % 12 === minor3Pc) {
        const targetE = getEnergy(m);
        const oppositeE = getEnergy(m + 1);
        if (oppositeE >= 26 && oppositeE > targetE * 1.25) {
          wrongThirdDetected = true;
        }
      }
    }
  }

  // Warn if unmuted low open bass strings (6E=40, 5A=45, 4D=50) outside the chord ring loudly
  let unmutedStringWarning = false;
  for (const openMidi of [40, 45, 50]) {
    if (!uniqueTargetPcs.has(openMidi % 12) && getEnergy(openMidi) >= 55) {
      unmutedStringWarning = true;
      break;
    }
  }

  const matchRatio = Number((matchedNotes / totalNotes).toFixed(2));
  const minUniquePcs = Math.min(2, uniqueTargetPcs.size);
  const passed =
    !wrongThirdDetected &&
    matchedUniquePcs.size >= minUniquePcs &&
    matchRatio >= minRatio;

  return {
    passed,
    matchRatio,
    matchedNotes,
    totalNotes,
    wrongThirdDetected,
    unmutedStringWarning,
  };
}

export function evaluateNoteHit(
  targetNote: NoteEvent,
  detectedMidiFloat: number,
  timingErrorMs: number,
  tier: JudgmentTier,
  peakBendCents = 0,
  livePoly?: {
    noteSpectrum?: number[];
    chroma?: number[];
    source?: LivePitchData['source'];
  }
): NoteEvaluation {
  const spec = JUDGMENT_TIERS[tier];
  const baseTargetMidi = getNoteMidi(targetNote.string, targetNote.fret);
  const expectedBend = targetNote.bendCents ?? 0;

  // Pitch comparison (polyphonic spectrum check for strummed chords on real audio)
  const targetMidiWithBend = baseTargetMidi + expectedBend / 100;
  const rawCentsDiff = Math.round((detectedMidiFloat - baseTargetMidi) * 100);
  const bendTargetCentsDiff = Math.round((detectedMidiFloat - targetMidiWithBend) * 100);

  let pitchOk = false;
  let chordMatchRatio: number | undefined;
  let unmutedStringWarning: boolean | undefined;

  if (expectedBend > 0) {
    const achieved = Math.max(peakBendCents, rawCentsDiff);
    const minRequired = expectedBend * spec.bendCompletionRatio;
    pitchOk =
      achieved >= minRequired &&
      Math.abs(bendTargetCentsDiff) <= spec.centsTolerance + (expectedBend * (1 - spec.bendCompletionRatio));
  } else if (targetNote.chordNotes && targetNote.chordNotes.length > 0) {
    if (
      livePoly?.noteSpectrum &&
      livePoly.noteSpectrum.length === POLY_SPECTRUM_COUNT &&
      livePoly.source !== 'simulated'
    ) {
      const polyRes = evaluatePolyphonicChord(
        targetNote.chordNotes,
        livePoly.noteSpectrum,
        livePoly.chroma,
        tier
      );
      pitchOk = polyRes.passed;
      chordMatchRatio = polyRes.matchRatio;
      if (polyRes.unmutedStringWarning) {
        unmutedStringWarning = true;
      }
    } else {
      // Fallback single-note chord check (simulated clicks or bridges without spectrum)
      pitchOk = targetNote.chordNotes.some((cn) => {
        const m = getNoteMidi(cn.string, cn.fret);
        return [-12, 0, 12].some(
          (shift) => Math.abs((detectedMidiFloat - (m + shift)) * 100) <= spec.centsTolerance + 18
        );
      });
    }
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
    centsError:
      expectedBend > 0
        ? bendTargetCentsDiff
        : targetNote.chordNotes && targetNote.chordNotes.length > 0
        ? 0
        : rawCentsDiff,
    bendAchievedCents: expectedBend > 0 ? Math.max(0, Math.round(peakBendCents)) : undefined,
    detectedMidi: detectedMidiFloat > 0 ? Math.round(detectedMidiFloat) : undefined,
    chordMatchRatio,
    unmutedStringWarning,
  };
}

export function evaluateImprovisation(
  playedEvents: { midi: number; barIndex: number; isBend: boolean; gapMs: number }[],
  scaleOverlay: ScaleOverlayNote[],
  chordProgression: ChordBar[],
  locale: 'en' | 'ko' = 'ko'
): ImprovisationMetrics {
  const isEn = locale === 'en';
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
      feedbackSummary: isEn
        ? 'Start Improv Jam and play your guitar to analyze harmonic fit and chord-tone landings in real time.'
        : '즉흥 잼을 시작하고 기타를 연주하면 화성 조화도와 코드 톤 착지력을 실시간으로 분석합니다.',
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
    feedbackSummary = isEn
      ? 'Natural chord-tone resolutions over changes with musical breathing room between phrases.'
      : '코드 체인지에 맞춘 타겟 노트 착지와 프레이징 여백(호흡)이 매우 자연스럽습니다.';
  } else if (chordToneResolution < 60) {
    feedbackSummary = isEn
      ? 'Scale notes are steady. Try resolving the end of each phrase onto highlighted chord tones (R, 3, 5) on chord changes.'
      : '스케일 음은 안정적입니다. 다음 마디로 넘어갈 때 지판에 표시된 현재 코드 톤(R, 3, 5)에서 프레이즈를 마무리해 보세요.';
  } else if (rhythmBreathing < 70) {
    feedbackSummary = isEn
      ? 'Instead of nonstop notes, leave brief rests between short 2-3 note statements so your solo breathes.'
      : '음을 쉼 없이 이어 치기보다 2~3음 문장 사이에 짧은 쉼표(호흡)를 두면 훨씬 노래하는 솔로가 됩니다.';
  } else {
    feedbackSummary = isEn
      ? 'Solid harmonic awareness. Add controlled bends or vibrato to sustained target notes for extra voice.'
      : '안정적인 화성 감각입니다. 긴 음에 벤딩이나 비브라토 표현을 더하면 완성도가 한층 높아집니다.';
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
