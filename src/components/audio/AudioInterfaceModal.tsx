'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Hint } from '@/components/ui/tooltip';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  computeCalibratedLatency,
  guitarAudioEngine,
  type AudioLatencyTelemetry,
} from '@/lib/lowLatencyAudioEngine';
import { guitarSynthEngine } from '@/lib/guitarSynthEngine';
import { trackStudioEvent } from '@/lib/analytics';
import { useLocale } from '@/lib/i18n';
import type {
  AdaptiveLatencyProfile,
  AudioDeviceConfig,
  ChannelRouteMode,
  LivePitchData,
} from '@/types/guitar';

const CAL_BEAT_MS = 800; // 75 BPM steady groove
const CAL_COUNT_IN_BEATS = 4; // 3.2s visual + audio count-in before first measured beat
const CAL_TARGET_TAPS = 6;
const CAL_MAX_MEASURE_BEATS = 16;

const PING_COUNT = 4;
const PING_LEAD_MS = 900;
const PING_STEP_MS = 700;

interface TapSample {
  beatIdx: number;
  errorMs: number;
}

interface AudioInterfaceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: AudioDeviceConfig;
  onUpdateConfig: (next: Partial<AudioDeviceConfig>) => void;
  telemetry: AudioLatencyTelemetry;
  livePitch: LivePitchData;
  isAudioRunning: boolean;
  onRestartAudio: () => void;
  adaptiveLatency?: AdaptiveLatencyProfile;
  onResetAdaptiveLatency?: () => void;
  onRecordManualCalibrationSamples?: (samplesMs: number[]) => void;
}

export function AudioInterfaceModal({
  open,
  onOpenChange,
  config,
  onUpdateConfig,
  telemetry,
  livePitch,
  isAudioRunning,
  onRestartAudio,
  adaptiveLatency,
  onResetAdaptiveLatency,
  onRecordManualCalibrationSamples,
}: AudioInterfaceModalProps) {
  const { tr } = useLocale();
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [bridgeTestState, setBridgeTestState] = useState<{
    status: 'idle' | 'testing' | 'ok' | 'offline';
    latencyMs?: number;
  }>({ status: 'idle' });

  // Live Peak Hold & Clip Hold State
  const [peakHoldDb, setPeakHoldDb] = useState(-100);
  const [clipCount, setClipCount] = useState(0);
  const [clipHoldActive, setClipHoldActive] = useState(false);
  const peakHoldAtRef = useRef(0);

  // Visual 6-Tap & Acoustic Ping Calibration Studio State
  const [calMode, setCalMode] = useState<'visual' | 'acoustic'>('visual');
  const [calPhase, setCalPhase] = useState<'idle' | 'count-in' | 'measuring' | 'done'>('idle');
  const [calBeatFloat, setCalBeatFloat] = useState(-CAL_COUNT_IN_BEATS);
  const [calCountInRemaining, setCalCountInRemaining] = useState(0);
  const [tapSamples, setTapSamples] = useState<TapSample[]>([]);
  const [lastTapFeedback, setLastTapFeedback] = useState<{ errorMs: number; at: number } | null>(null);
  const [calResult, setCalResult] = useState<ReturnType<typeof computeCalibratedLatency> | null>(null);

  const [pingPhase, setPingPhase] = useState<'idle' | 'running' | 'done' | 'failed'>('idle');
  const [pingSentCount, setPingSentCount] = useState(0);
  const [pingDetectedCount, setPingDetectedCount] = useState(0);
  const pingTimersRef = useRef<number[]>([]);
  const pingSentTimesRef = useRef<number[]>([]);
  const pingCapturedIdxRef = useRef<Set<number>>(new Set());
  const pingPhaseRef = useRef<'idle' | 'running' | 'done' | 'failed'>('idle');
  const pingDetectedRef = useRef<number[]>([]);

  const calPhaseRef = useRef<'idle' | 'count-in' | 'measuring' | 'done'>('idle');
  const gridOriginMsRef = useRef(0);
  const lastScheduledIntBeatRef = useRef(-CAL_COUNT_IN_BEATS - 1);
  const calRafIdRef = useRef<number | null>(null);
  const recordedBeatsRef = useRef<Set<number>>(new Set());
  const lastAcceptedHitMsRef = useRef(0);
  const tapSamplesRef = useRef<TapSample[]>([]);

  const clearPingTimers = useCallback(() => {
    pingTimersRef.current.forEach((id) => window.clearTimeout(id));
    pingTimersRef.current = [];
  }, []);

  const stopAcousticPing = useCallback(
    (nextPhase: 'idle' | 'done' | 'failed' = 'idle') => {
      clearPingTimers();
      pingPhaseRef.current = nextPhase;
      setPingPhase(nextPhase);
    },
    [clearPingTimers]
  );

  const cancelCalRaf = useCallback(() => {
    if (calRafIdRef.current !== null) {
      window.cancelAnimationFrame(calRafIdRef.current);
      calRafIdRef.current = null;
    }
  }, []);

  const stopCalibration = useCallback(
    (nextPhase: 'idle' | 'done' = 'idle') => {
      cancelCalRaf();
      calPhaseRef.current = nextPhase;
      setCalPhase(nextPhase);
      setCalCountInRemaining(0);
    },
    [cancelCalRaf]
  );

  useEffect(() => {
    if (!open) {
      cancelCalRaf();
      clearPingTimers();
      calPhaseRef.current = 'idle';
      pingPhaseRef.current = 'idle';
      const t = window.setTimeout(() => {
        setBridgeTestState({ status: 'idle' });
        setCalPhase('idle');
        setCalCountInRemaining(0);
        setPingPhase('idle');
      }, 0);
      return () => window.clearTimeout(t);
    }
    void guitarAudioEngine.listInputDevices().then(setDevices);
  }, [cancelCalRaf, clearPingTimers, open]);

  // Track peak-hold and brief clip warnings across incoming DSP frames
  const isClipNow = isAudioRunning && (livePitch.isClipping || livePitch.peakDb >= -0.5);
  useEffect(() => {
    if (!isAudioRunning) {
      const t = window.setTimeout(() => {
        setPeakHoldDb(-100);
        setClipCount(0);
        setClipHoldActive(false);
      }, 0);
      return () => window.clearTimeout(t);
    }

    const currentPeak = livePitch.peakDb ?? -100;
    const now = performance.now();
    const updateTimer = window.setTimeout(() => {
      if (currentPeak > -95) {
        setPeakHoldDb((prev) => {
          if (currentPeak >= prev || now - peakHoldAtRef.current >= 2500) {
            peakHoldAtRef.current = now;
            return currentPeak;
          }
          return prev;
        });
      }
      if (isClipNow) {
        setClipCount((c) => c + 1);
        setClipHoldActive(true);
      }
    }, 0);

    let decayTimer: number | undefined;
    if (currentPeak > -95) {
      decayTimer = window.setTimeout(() => {
        setPeakHoldDb((prev) => Math.max(currentPeak, prev - 6));
      }, 2600);
    }
    let clipOffTimer: number | undefined;
    if (isClipNow) {
      clipOffTimer = window.setTimeout(() => setClipHoldActive(false), 2000);
    }

    return () => {
      window.clearTimeout(updateTimer);
      if (decayTimer !== undefined) window.clearTimeout(decayTimer);
      if (clipOffTimer !== undefined) window.clearTimeout(clipOffTimer);
    };
  }, [isAudioRunning, isClipNow, livePitch.peakDb, livePitch.timestampMs]);

  const handleTestAsioBridge = async () => {
    setBridgeTestState({ status: 'testing' });
    const res = await guitarAudioEngine.testAsioBridge(config.asioBridgeUrl);
    setBridgeTestState(
      res.ok ? { status: 'ok', latencyMs: res.latencyMs } : { status: 'offline' }
    );
  };

  // Capture guitar pluck onsets strictly during the 'measuring' phase (never during count-in)
  useEffect(() => {
    if (calPhase !== 'measuring' || !livePitch.isOnset || livePitch.source === 'simulated') {
      return;
    }
    if (gridOriginMsRef.current <= 0) return;

    const now = performance.now();
    if (now - lastAcceptedHitMsRef.current < 350) return;

    const beatIdx = Math.max(0, Math.round((now - gridOriginMsRef.current) / CAL_BEAT_MS));
    if (recordedBeatsRef.current.has(beatIdx)) return;

    const expectedMs = gridOriginMsRef.current + beatIdx * CAL_BEAT_MS;
    const errorMs = Math.round(now - expectedMs);
    if (errorMs < -240 || errorMs > 280) return;

    recordedBeatsRef.current.add(beatIdx);
    lastAcceptedHitMsRef.current = now;

    const nextSamples = [...tapSamplesRef.current, { beatIdx, errorMs }];
    tapSamplesRef.current = nextSamples;

    const t = window.setTimeout(() => {
      setTapSamples(nextSamples);
      setLastTapFeedback({ errorMs, at: now });

      if (nextSamples.length >= CAL_TARGET_TAPS) {
        const rawList = nextSamples.map((s) => s.errorMs);
        const res = computeCalibratedLatency(rawList);
        onUpdateConfig({ latencyOffsetMs: res.offsetMs });
        onRecordManualCalibrationSamples?.(rawList);
        trackStudioEvent('latency_calibrated', {
          method: 'visual_6tap',
          offset_ms: res.offsetMs,
          quality: res.quality,
        });
        setCalResult(res);
        stopCalibration('done');
      }
    }, 0);

    return () => window.clearTimeout(t);
  }, [
    calPhase,
    livePitch.isOnset,
    livePitch.source,
    livePitch.timestampMs,
    onRecordManualCalibrationSamples,
    onUpdateConfig,
    stopCalibration,
  ]);

  // Capture Acoustic Loopback Ping reflections
  useEffect(() => {
    if (pingPhase !== 'running' || livePitch.source === 'simulated') return;
    if (!livePitch.isOnset && livePitch.peakDb <= config.noiseGateDb + 8) return;
    const sent = pingSentTimesRef.current;
    if (sent.length === 0) return;

    const now = performance.now();
    for (let i = sent.length - 1; i >= 0; i--) {
      if (pingCapturedIdxRef.current.has(i)) continue;
      const elapsed = now - sent[i];
      if (elapsed >= 5 && elapsed <= 260) {
        pingCapturedIdxRef.current.add(i);
        const rounded = Math.round(elapsed);
        const updated = [...pingDetectedRef.current, rounded];
        pingDetectedRef.current = updated;
        const t = window.setTimeout(() => {
          setPingDetectedCount(updated.length);
        }, 0);
        return () => window.clearTimeout(t);
      }
    }
  }, [
    config.noiseGateDb,
    livePitch.isOnset,
    livePitch.peakDb,
    livePitch.source,
    livePitch.timestampMs,
    pingPhase,
  ]);

  useEffect(() => {
    return () => {
      cancelCalRaf();
      clearPingTimers();
    };
  }, [cancelCalRaf, clearPingTimers]);

  const startAcousticPing = () => {
    stopCalibration('idle');
    clearPingTimers();
    pingSentTimesRef.current = [];
    pingCapturedIdxRef.current = new Set();
    pingDetectedRef.current = [];
    pingPhaseRef.current = 'running';
    setPingPhase('running');
    setPingSentCount(0);
    setPingDetectedCount(0);
    setCalResult(null);
    setTapSamples([]);

    for (let idx = 0; idx < PING_COUNT; idx++) {
      const fireId = window.setTimeout(() => {
        if (pingPhaseRef.current !== 'running') return;
        pingSentTimesRef.current.push(performance.now());
        setPingSentCount(idx + 1);
        try {
          guitarSynthEngine.playCalibrationPing();
        } catch {
          // ignore if blocked
        }
      }, PING_LEAD_MS + idx * PING_STEP_MS);
      pingTimersRef.current.push(fireId);
    }

    const doneId = window.setTimeout(() => {
      if (pingPhaseRef.current !== 'running') return;
      const detected = pingDetectedRef.current;
      if (detected.length >= 2) {
        const res = computeCalibratedLatency(detected);
        onUpdateConfig({ latencyOffsetMs: res.offsetMs });
        onRecordManualCalibrationSamples?.(detected);
        trackStudioEvent('latency_calibrated', {
          method: 'acoustic_ping',
          offset_ms: res.offsetMs,
          quality: res.quality,
        });
        const formatted = detected.map((err, i) => ({ beatIdx: i, errorMs: err }));
        tapSamplesRef.current = formatted;
        setTapSamples(formatted);
        setCalResult(res);
        calPhaseRef.current = 'done';
        setCalPhase('done');
        pingPhaseRef.current = 'done';
        setPingPhase('done');
      } else {
        pingPhaseRef.current = 'failed';
        setPingPhase('failed');
      }
    }, PING_LEAD_MS + (PING_COUNT - 1) * PING_STEP_MS + 380);
    pingTimersRef.current.push(doneId);
  };

  const startLatencyCalibration = () => {
    cancelCalRaf();
    const origin = performance.now() + CAL_COUNT_IN_BEATS * CAL_BEAT_MS;
    gridOriginMsRef.current = origin;
    calPhaseRef.current = 'count-in';
    lastScheduledIntBeatRef.current = -CAL_COUNT_IN_BEATS - 1;
    recordedBeatsRef.current = new Set();
    lastAcceptedHitMsRef.current = 0;
    tapSamplesRef.current = [];

    setTapSamples([]);
    setLastTapFeedback(null);
    setCalResult(null);
    setCalBeatFloat(-CAL_COUNT_IN_BEATS);
    setCalCountInRemaining(CAL_COUNT_IN_BEATS);
    setCalPhase('count-in');

    const step = () => {
      if (calPhaseRef.current !== 'count-in' && calPhaseRef.current !== 'measuring') {
        calRafIdRef.current = null;
        return;
      }

      const now = performance.now();
      const bf = (now - gridOriginMsRef.current) / CAL_BEAT_MS;
      setCalBeatFloat(bf);

      const intBeat = Math.floor(bf + 0.02);
      if (intBeat > lastScheduledIntBeatRef.current) {
        lastScheduledIntBeatRef.current = intBeat;

        if (intBeat >= CAL_MAX_MEASURE_BEATS) {
          if (tapSamplesRef.current.length >= 3) {
            const rawList = tapSamplesRef.current.map((s) => s.errorMs);
            const res = computeCalibratedLatency(rawList);
            onUpdateConfig({ latencyOffsetMs: res.offsetMs });
            onRecordManualCalibrationSamples?.(rawList);
            trackStudioEvent('latency_calibrated', {
              method: 'visual_6tap',
              offset_ms: res.offsetMs,
              quality: res.quality,
            });
            setCalResult(res);
            calPhaseRef.current = 'done';
            setCalPhase('done');
          } else {
            calPhaseRef.current = 'idle';
            setCalPhase('idle');
          }
          setCalCountInRemaining(0);
          calRafIdRef.current = null;
          return;
        }

        const isAccent = ((intBeat % 4) + 4) % 4 === 0;
        try {
          guitarSynthEngine.playMetronomeClick(isAccent);
        } catch {
          // ignore if browser blocked audio before gesture
        }

        if (intBeat < 0) {
          calPhaseRef.current = 'count-in';
          setCalPhase('count-in');
          setCalCountInRemaining(Math.abs(intBeat));
        } else {
          if (calPhaseRef.current !== 'measuring') {
            calPhaseRef.current = 'measuring';
            setCalPhase('measuring');
            setCalCountInRemaining(0);
          }
        }
      }

      calRafIdRef.current = window.requestAnimationFrame(step);
    };

    calRafIdRef.current = window.requestAnimationFrame(step);
  };

  const toDbPct = (db: number) => Math.max(0, Math.min(100, ((db + 60) / 60) * 100));
  const clipHeld = isAudioRunning && (isClipNow || clipHoldActive);
  const currentPeakDb = isAudioRunning ? livePitch.peakDb ?? -100 : -100;
  const currentRmsDb = isAudioRunning ? livePitch.rmsDb ?? -100 : -100;
  const peakPct = toDbPct(currentPeakDb);
  const peakHoldPct = peakHoldDb > -60 ? toDbPct(peakHoldDb) : 0;
  const gateTickPct = toDbPct(config.noiseGateDb);
  const peakBarClass =
    clipHeld || currentPeakDb >= -1
      ? 'bg-destructive'
      : currentPeakDb >= -6
      ? 'bg-amber-500'
      : currentPeakDb >= -24
      ? 'bg-emerald-500'
      : 'bg-muted-foreground/60';

  const gainHealthStatus = !isAudioRunning
    ? { label: tr('Idle', '대기 중'), cls: 'border-border bg-secondary text-muted-foreground' }
    : clipHeld || peakHoldDb >= -1
    ? {
        label: tr('CLIP · Lower gain', 'CLIP · 게인 낮추세요'),
        cls: 'border-destructive/45 bg-destructive/12 text-destructive',
      }
    : peakHoldDb >= -20 && peakHoldDb <= -4
    ? {
        label: tr('Optimal (-18 ~ -6 dB)', '적정 음량 (-18 ~ -6 dB)'),
        cls: 'border-emerald-500/35 bg-emerald-500/12 text-emerald-700 dark:text-emerald-400',
      }
    : peakHoldDb > -60 && peakHoldDb < -24
    ? {
        label: tr('Low level · Raise gain', '음량 작음 · 게인 올리세요'),
        cls: 'border-border bg-secondary text-muted-foreground',
      }
    : {
        label: tr('Warm / Near Limit', '허용 범위'),
        cls: 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300',
      };

  const recordedBeatSet = new Set(tapSamples.map((s) => s.beatIdx));
  const beatPhaseWrapped = ((calBeatFloat % 1) + 1) % 1;
  const onBeatFlash = beatPhaseWrapped < 0.09 || beatPhaseWrapped > 0.91;
  const minDrawBeat = Math.max(-CAL_COUNT_IN_BEATS, Math.floor(calBeatFloat) - 1);
  const maxDrawBeat = Math.min(CAL_MAX_MEASURE_BEATS - 1, Math.floor(calBeatFloat) + 2);
  const visibleRunwayBeats: number[] = [];
  for (let b = minDrawBeat; b <= maxDrawBeat; b++) {
    visibleRunwayBeats.push(b);
  }
  const inputGainDb = config.inputGainDb ?? 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">
            {tr('Audio & ASIO Input Setup', '오디오 & ASIO 입력 설정')}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {tr(
              'Configure audio device, channel routing, noise gate, and latency calibration.',
              '오디오 입력 장치, 채널 라우팅, 노이즈 게이트 및 레이턴시 보정을 설정합니다.'
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2 rounded-lg border border-border bg-muted/50 p-3 font-mono text-xs tabular-nums">
            <div>
              <div className="text-[10px] text-muted-foreground">{tr('Pipeline', '파이프라인')}</div>
              <div className="mt-0.5 font-semibold text-foreground">
                {telemetry.pipelineMode === 'asio-bridge'
                  ? 'ASIO Bridge'
                  : telemetry.pipelineMode === 'worklet'
                  ? 'Worklet 128'
                  : tr('Idle', '대기')}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-muted-foreground">{tr('Sample Rate', '샘플레이트')}</div>
              <div className="mt-0.5 font-semibold text-foreground">
                {telemetry.sampleRate.toLocaleString()} Hz
              </div>
            </div>
            <div>
              <div className="text-[10px] text-muted-foreground">{tr('Est. Latency', '추정 지연')}</div>
              <div className="mt-0.5 font-semibold text-foreground">
                {telemetry.totalEstimatedMs.toFixed(1)} ms
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant={config.inputMode === 'worklet' ? 'default' : 'outline'}
              className="h-auto py-2 justify-start text-left"
              onClick={() => onUpdateConfig({ inputMode: 'worklet' })}
            >
              <div>
                <div className="text-xs font-semibold">
                  {tr('Low-Latency Web Audio (Recommended)', '저지연 Web Audio (권장)')}
                </div>
                <div className="text-[10px] opacity-80">128-sample Worklet</div>
              </div>
            </Button>
            <Button
              type="button"
              variant={config.inputMode === 'asio-bridge' ? 'default' : 'outline'}
              className="h-auto py-2 justify-start text-left"
              onClick={() => onUpdateConfig({ inputMode: 'asio-bridge' })}
            >
              <div>
                <div className="text-xs font-semibold">Native ASIO Bridge</div>
                <div className="text-[10px] opacity-80">ws://127.0.0.1:9420</div>
              </div>
            </Button>
          </div>

          {telemetry.fallbackNotice && (
            <div className="rounded-lg border border-border bg-secondary/50 px-3 py-2 text-xs text-foreground">
              {telemetry.fallbackNotice}
            </div>
          )}

          {config.inputMode === 'asio-bridge' && (
            <div className="rounded-lg border border-border bg-secondary/35 p-3 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs font-semibold text-foreground">
                  {tr('Local ASIO Bridge Daemon Status', '로컬 ASIO 브리지 데몬 상태')}
                </div>
                <Badge variant="outline" className="text-[10px] font-mono">
                  {bridgeTestState.status === 'ok'
                    ? tr(`Online (${bridgeTestState.latencyMs}ms)`, `연결됨 (${bridgeTestState.latencyMs}ms)`)
                    : bridgeTestState.status === 'offline'
                    ? tr('Offline · Auto-fallback active', '미실행 · 자동 Web Audio 전환')
                    : bridgeTestState.status === 'testing'
                    ? tr('Testing...', '확인 중...')
                    : config.asioBridgeUrl}
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                {tr(
                  'Requires a separate local ASIO daemon listening on ws://127.0.0.1:9420 (GitHub Issue #1). If unreachable, FretMaster automatically falls back to the 128-sample Web Audio Worklet so guitar input stays uninterrupted.',
                  'Native ASIO 모드는 PC에 별도 로컬 브리지 데몬(ws://127.0.0.1:9420, Issue #1)이 실행 중이어야 합니다. 연결되지 않아도 저지연 Web Audio(Worklet 128)로 자동 전환되어 끊김 없이 연습할 수 있습니다.'
                )}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={bridgeTestState.status === 'testing'}
                  onClick={handleTestAsioBridge}
                  className="text-xs"
                >
                  {bridgeTestState.status === 'testing'
                    ? tr('Testing...', '테스트 중...')
                    : tr('Test Bridge', '연결 테스트')}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => onUpdateConfig({ inputMode: 'worklet' })}
                  className="text-xs"
                >
                  {tr('Use Web Audio (Recommended)', '저지연 Web Audio 사용 (권장)')}
                </Button>
              </div>
            </div>
          )}

          {config.inputMode === 'worklet' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <div className="text-xs font-medium text-foreground">
                  {tr('Input Device', '입력 디바이스')}
                </div>
                <Select
                  value={config.deviceId}
                  onValueChange={(val) => {
                    if (val) onUpdateConfig({ deviceId: val });
                  }}
                >
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder={tr('Select input device', '기본 입력 선택')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">{tr('System Default Input', '시스템 기본 입력')}</SelectItem>
                    {devices.map((d, i) => (
                      <SelectItem key={d.deviceId || `dev-${i}`} value={d.deviceId || 'default'}>
                        {d.label || tr(`Audio Input ${i + 1}`, `오디오 입력 ${i + 1}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <div className="text-xs font-medium text-foreground">
                  {tr('Input Channel', '입력 채널')}
                </div>
                <Select
                  value={config.channelMode}
                  onValueChange={(val) => {
                    if (val) onUpdateConfig({ channelMode: val as ChannelRouteMode });
                  }}
                >
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mono">Mono Sum (Ch 1 + 2)</SelectItem>
                    <SelectItem value="ch1">Input 1 (Left)</SelectItem>
                    <SelectItem value="ch2">Input 2 (Hi-Z Guitar)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
            <div>
              <div className="text-xs font-medium">
                {tr('Hardware Direct Monitor', '하드웨어 다이렉트 모니터링')}
              </div>
              <div className="text-[11px] text-muted-foreground">
                {tr(
                  'Block browser input echo when using an external amp or interface monitor',
                  '외장 앰프나 인터페이스 모니터링 시 브라우저 입력 에코 차단'
                )}
              </div>
            </div>
            <Switch
              checked={config.directMonitor}
              onCheckedChange={(checked) => onUpdateConfig({ directMonitor: checked })}
            />
          </div>

          {/* Live Input Gain, Peak Hold & Clipping Meter + Software Trim */}
          <div className="rounded-lg border border-border bg-muted/35 p-3 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold text-foreground">
                {tr('Input Gain & Peak Meter', '입력 게인 & 피크 미터')}
              </span>
              <div className="flex items-center gap-2">
                {clipCount > 0 && (
                  <span className="font-mono text-[10px] font-semibold text-destructive">
                    {tr(`Clips: ${clipCount}`, `피크 초과 ${clipCount}회`)}
                  </span>
                )}
                <Badge variant="outline" className={`text-[10px] ${gainHealthStatus.cls}`}>
                  {gainHealthStatus.label}
                </Badge>
              </div>
            </div>

            <div className="relative h-3 rounded-full bg-secondary overflow-hidden border border-border/70">
              {/* Ideal headroom highlight band (-18 dB .. -6 dB) */}
              <div
                className="absolute top-0 bottom-0 bg-emerald-500/15 border-x border-emerald-500/35 pointer-events-none"
                style={{ left: '70%', width: '20%' }}
              />
              {/* Live Peak Bar */}
              <div
                className={`h-full transition-[width] duration-75 ${peakBarClass}`}
                style={{ width: `${peakPct}%` }}
              />
              {/* Noise Gate Marker */}
              <div
                className="absolute top-0 bottom-0 w-px border-l border-dashed border-foreground/45 pointer-events-none"
                style={{ left: `${gateTickPct}%` }}
                aria-label={`${tr('Noise Gate', '노이즈 게이트')}: ${config.noiseGateDb} dB`}
              />
              {/* Peak Hold Indicator */}
              {peakHoldDb > -60 && (
                <div
                  className={`absolute top-0 bottom-0 w-0.5 pointer-events-none ${
                    peakHoldDb >= -1 ? 'bg-destructive' : 'bg-foreground'
                  }`}
                  style={{ left: `${peakHoldPct}%` }}
                />
              )}
            </div>

            <div className="flex justify-between text-[9.5px] font-mono text-muted-foreground tabular-nums">
              <span>-60</span>
              <span>-48</span>
              <span>-36</span>
              <span>-24</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">-18</span>
              <span>-12</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">-6</span>
              <span className="text-destructive font-semibold">0 dB</span>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono tabular-nums">
              <div className="flex items-center gap-3 text-muted-foreground">
                <span>
                  Peak:{' '}
                  <strong className="text-foreground">
                    {currentPeakDb <= -90 ? '--' : `${currentPeakDb.toFixed(1)}`} dB
                  </strong>
                </span>
                <Hint content={tr('Click to reset Peak Hold', '클릭하여 피크 홀드 초기화')} side="top">
                  <button
                    type="button"
                    onClick={() => {
                      setPeakHoldDb(-100);
                      setClipCount(0);
                      setClipHoldActive(false);
                      peakHoldAtRef.current = 0;
                    }}
                    className="hover:underline text-left"
                  >
                    Hold:{' '}
                    <strong className={peakHoldDb >= -1 ? 'text-destructive' : 'text-foreground'}>
                      {peakHoldDb <= -90 ? '--' : `${peakHoldDb.toFixed(1)}`} dB
                    </strong>
                  </button>
                </Hint>
                <span>
                  RMS:{' '}
                  <strong className="text-foreground">
                    {currentRmsDb <= -90 ? '--' : `${currentRmsDb.toFixed(1)}`} dB
                  </strong>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-sans text-[11px] text-muted-foreground">
                  {tr('Input Trim', '입력 트림')}
                </span>
                <span className="font-semibold text-foreground w-12 text-right">
                  {inputGainDb > 0 ? `+${inputGainDb}` : inputGainDb} dB
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-0.5">
              <Slider
                value={[inputGainDb]}
                min={-18}
                max={18}
                step={1}
                className="flex-1"
                onValueChange={(val) =>
                  onUpdateConfig({ inputGainDb: Array.isArray(val) ? val[0] : Number(val) })
                }
              />
              {inputGainDb !== 0 && (
                <Button
                  type="button"
                  size="xs"
                  variant="ghost"
                  className="text-[11px] h-6 px-2"
                  onClick={() => onUpdateConfig({ inputGainDb: 0 })}
                >
                  0 dB
                </Button>
              )}
            </div>

            <p className="text-[11px] text-muted-foreground leading-snug">
              {tr(
                'Aim peaks between -18 and -6 dB. If CLIP lights up red, lower your audio interface gain first.',
                '피크가 -18 ~ -6 dB 범위에 오도록 맞추세요. 빨간 CLIP이 켜지면 먼저 오디오 인터페이스 게인을 낮추세요.'
              )}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2 rounded-lg border border-border p-3">
              <div className="flex justify-between text-xs">
                <span>{tr('Noise Gate', '노이즈 게이트')}</span>
                <span className="font-mono tabular-nums">{config.noiseGateDb} dB</span>
              </div>
              <Slider
                value={[config.noiseGateDb]}
                min={-70}
                max={-20}
                step={1}
                onValueChange={(val) =>
                  onUpdateConfig({ noiseGateDb: Array.isArray(val) ? val[0] : Number(val) })
                }
              />
            </div>

            <div className="space-y-2 rounded-lg border border-border p-3">
              <div className="flex justify-between text-xs">
                <span>{tr('Latency Offset', '레이턴시 보정')}</span>
                <span className="font-mono tabular-nums">
                  {config.latencyOffsetMs > 0 ? `+${config.latencyOffsetMs}` : config.latencyOffsetMs} ms
                </span>
              </div>
              <Slider
                value={[config.latencyOffsetMs]}
                min={-50}
                max={200}
                step={1}
                onValueChange={(val) =>
                  onUpdateConfig({ latencyOffsetMs: Array.isArray(val) ? val[0] : Number(val) })
                }
              />
            </div>
          </div>

          {/* Latency Calibration Studio (Visual 6-Tap & Acoustic Loopback Ping) */}
          <div className="rounded-lg border border-border bg-muted/40 p-3 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1 rounded-md border border-border bg-card p-0.5">
                <button
                  type="button"
                  onClick={() => {
                    stopAcousticPing('idle');
                    stopCalibration('idle');
                    setCalMode('visual');
                  }}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                    calMode === 'visual'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {tr('Visual 6-Tap', '시각적 6-탭')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    stopCalibration('idle');
                    stopAcousticPing('idle');
                    setCalMode('acoustic');
                  }}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                    calMode === 'acoustic'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {tr('Acoustic Ping', '음향 루프백 핑')}
                </button>
              </div>
              {calPhase !== 'idle' && calMode === 'visual' && (
                <Badge variant="secondary" className="text-[10px] font-mono tabular-nums">
                  {calPhase === 'count-in'
                    ? tr(`Count-in ${calCountInRemaining}`, `예비박 ${calCountInRemaining}`)
                    : calPhase === 'measuring'
                    ? tr(
                        `Measuring ${tapSamples.length}/${CAL_TARGET_TAPS}`,
                        `측정 ${tapSamples.length}/${CAL_TARGET_TAPS}`
                      )
                    : tr(
                        `Calibrated ${calResult && calResult.offsetMs >= 0 ? `+${calResult.offsetMs}` : calResult?.offsetMs ?? 0}ms`,
                        `보정 완료 ${calResult && calResult.offsetMs >= 0 ? `+${calResult.offsetMs}` : calResult?.offsetMs ?? 0}ms`
                      )}
                </Badge>
              )}
              {pingPhase !== 'idle' && calMode === 'acoustic' && (
                <Badge variant="secondary" className="text-[10px] font-mono tabular-nums">
                  {pingPhase === 'running'
                    ? tr(`Ping ${pingSentCount}/${PING_COUNT}`, `핑 ${pingSentCount}/${PING_COUNT}`)
                    : pingPhase === 'done'
                    ? tr(
                        `Calibrated ${calResult && calResult.offsetMs >= 0 ? `+${calResult.offsetMs}` : calResult?.offsetMs ?? 0}ms`,
                        `보정 완료 ${calResult && calResult.offsetMs >= 0 ? `+${calResult.offsetMs}` : calResult?.offsetMs ?? 0}ms`
                      )
                    : tr('Signal Weak', '응답 미감지')}
                </Badge>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="space-y-0.5 max-w-[330px]">
                <span className="text-xs font-semibold text-foreground block">
                  {calMode === 'visual'
                    ? tr('Visual 6-Tap Latency Calibration', '시각적 6-탭 레이턴시 측정')
                    : tr('Acoustic Loopback Ping Calibration', '자동 음향 루프백 핑 측정')}
                </span>
                <div className="text-[11px] text-muted-foreground leading-snug">
                  {calMode === 'visual'
                    ? tr(
                        'Follow the 4-beat visual count-in, then pluck a muted string when each beat crosses center.',
                        '4박 예비박 후 중앙선에 박자 마커가 닿는 순간 줄을 6회 튕겨 지연을 정밀 측정합니다.'
                      )
                    : tr(
                        'Plays 4 crisp audio pings over speakers so open mics/pickups auto-measure hardware latency. Use Visual 6-Tap for headphones.',
                        '스피커에서 4회 짧은 핑을 재생해 마이크·픽업에 들어오는 하드웨어 왕복 지연을 자동 측정합니다. 헤드폰 환경에서는 시각적 6-탭을 사용하세요.'
                      )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {calMode === 'visual' ? (
                  calPhase === 'count-in' || calPhase === 'measuring' ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => stopCalibration('idle')}
                    >
                      {tr('Stop', '중지')}
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={!isAudioRunning}
                      onClick={startLatencyCalibration}
                    >
                      {calPhase === 'done'
                        ? tr('Recalibrate', '다시 측정')
                        : tr('Calibrate', '측정 시작')}
                    </Button>
                  )
                ) : pingPhase === 'running' ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => stopAcousticPing('idle')}
                  >
                    {tr('Stop', '중지')}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={!isAudioRunning}
                    onClick={startAcousticPing}
                  >
                    {pingPhase === 'done'
                      ? tr('Ping Again', '다시 측정')
                      : tr('Start Ping', '자동 핑 시작')}
                  </Button>
                )}
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    stopCalibration('idle');
                    stopAcousticPing('idle');
                    onRestartAudio();
                    onOpenChange(false);
                  }}
                >
                  {tr('Apply', '적용')}
                </Button>
              </div>
            </div>

            {calMode === 'acoustic' && pingPhase === 'running' && (
              <div className="rounded-md border border-border bg-card px-3 py-2 text-xs text-muted-foreground flex items-center justify-between">
                <span>
                  {tr(
                    'Listening for acoustic ping echo... keep room quiet.',
                    '핑 반사음 감지 중... 스피커 볼륨을 적당히 높여주세요.'
                  )}
                </span>
                <span className="font-mono text-foreground font-semibold">
                  {pingDetectedCount}/{PING_COUNT}
                </span>
              </div>
            )}

            {calMode === 'acoustic' && pingPhase === 'failed' && (
              <div className="rounded-md border border-destructive/35 bg-destructive/8 px-3 py-2 text-xs text-foreground">
                {tr(
                  'Fewer than 2 pings were heard by your input. If you are using headphones or a direct guitar cable, switch to Visual 6-Tap.',
                  '입력에서 2회 미만만 감지되었습니다. 헤드폰 또는 유선 직접 연결(Hi-Z) 환경이라면 시각적 6-탭 모드를 사용해 주세요.'
                )}
              </div>
            )}

            {!isAudioRunning && (
              <div className="flex items-center justify-between gap-2 rounded-md border border-border bg-card px-3 py-2 text-xs text-muted-foreground">
                <span>
                  {tr(
                    'Connect your guitar input first to run visual latency calibration.',
                    '시각적 레이턴시 측정을 시작하려면 먼저 기타 오디오를 연결하세요.'
                  )}
                </span>
                <Button type="button" size="xs" variant="secondary" onClick={onRestartAudio}>
                  {tr('Connect Guitar', '기타 연결')}
                </Button>
              </div>
            )}

            {(calPhase === 'count-in' || calPhase === 'measuring') && (
              <div className="space-y-2">
                <div className="relative h-16 rounded-xl border border-border bg-background/90 overflow-hidden select-none">
                  {/* Top status prompts inside runway */}
                  <div className="absolute top-1.5 left-2.5 right-2.5 z-10 flex items-center justify-between text-[10px] font-medium">
                    <span className="text-muted-foreground">
                      {calPhase === 'count-in'
                        ? tr(
                            `Prepare · Starts in ${calCountInRemaining} beat${calCountInRemaining === 1 ? '' : 's'}`,
                            `예비박 · ${calCountInRemaining}박 후 측정 시작`
                          )
                        : tr(
                            `Pluck cleanly as beats cross the center line (${tapSamples.length}/${CAL_TARGET_TAPS})`,
                            `마커가 중앙선에 닿을 때 줄을 튕기세요 (${tapSamples.length}/${CAL_TARGET_TAPS})`
                          )}
                    </span>
                    {lastTapFeedback && (
                      <span className="font-mono tabular-nums text-foreground font-semibold">
                        {lastTapFeedback.errorMs >= 0
                          ? `+${lastTapFeedback.errorMs} ms`
                          : `${lastTapFeedback.errorMs} ms`}
                      </span>
                    )}
                  </div>

                  {/* Center Target Line */}
                  <div
                    className={`absolute top-0 bottom-0 left-1/2 -translate-x-1/2 transition-all duration-75 ${
                      onBeatFlash ? 'w-1 bg-primary' : 'w-0.5 bg-border'
                    }`}
                  />

                  {/* Moving Beat Runway Pills */}
                  {visibleRunwayBeats.map((b) => {
                    const leftPct = 50 + (b - calBeatFloat) * 42;
                    if (leftPct < -6 || leftPct > 106) return null;
                    const isCountInBeat = b < 0;
                    const isHit = !isCountInBeat && recordedBeatSet.has(b);
                    const labelNum = isCountInBeat ? Math.abs(b) : (b % 4) + 1;

                    return (
                      <div
                        key={`runway-beat-${b}`}
                        className={`absolute top-1/2 -translate-x-1/2 -translate-y-1/3 flex h-7 w-7 items-center justify-center rounded-full border text-xs font-mono font-bold tabular-nums ${
                          isCountInBeat
                            ? 'border-dashed border-muted-foreground/50 bg-background/80 text-muted-foreground'
                            : isHit
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-foreground/45 bg-card text-foreground'
                        }`}
                        style={{ left: `${leftPct}%` }}
                      >
                        {labelNum}
                      </div>
                    );
                  })}

                  {/* Bottom Captured Hit Scatter Ticks (-250..+250ms mapped around 50%) */}
                  {tapSamples.map((s) => {
                    const tickPct = Math.max(4, Math.min(96, 50 + (s.errorMs / 250) * 44));
                    return (
                      <span
                        key={`tap-tick-${s.beatIdx}`}
                        className="absolute bottom-1 h-2 w-0.5 -translate-x-1/2 rounded-full bg-primary/80"
                        style={{ left: `${tickPct}%` }}
                      />
                    );
                  })}
                </div>

                {/* Live Noise-Gate Reference Input Bar */}
                <div className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground">
                  <span className="shrink-0">{tr('Gate Monitor', '입력 감도')}</span>
                  <div className="relative flex-1 h-1.5 rounded-full bg-secondary overflow-hidden">
                    <div
                      className={`h-full transition-[width] duration-75 ${peakBarClass}`}
                      style={{ width: `${peakPct}%` }}
                    />
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-foreground/60 pointer-events-none"
                      style={{ left: `${gateTickPct}%` }}
                    />
                  </div>
                  <span className="w-11 text-right tabular-nums">
                    {currentPeakDb <= -90 ? '-- dB' : `${Math.round(currentPeakDb)} dB`}
                  </span>
                </div>
              </div>
            )}

            {calPhase === 'done' && calResult && (
              <div className="rounded-lg border border-border bg-card p-2.5 space-y-2">
                <div className="relative h-5 rounded-md bg-secondary/70 border border-border/60 overflow-hidden">
                  {/* Zero ms line */}
                  <div
                    className="absolute top-0 bottom-0 w-px bg-muted-foreground/50"
                    style={{ left: '33.3%' }}
                  />
                  {tapSamples.map((s) => {
                    const dotPct = Math.max(
                      2,
                      Math.min(98, ((s.errorMs + 100) / 300) * 100)
                    );
                    return (
                      <span
                        key={`done-dot-${s.beatIdx}`}
                        className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-muted-foreground/65"
                        style={{ left: `${dotPct}%` }}
                      />
                    );
                  })}
                  <span
                    className="absolute top-0.5 bottom-0.5 w-1 -translate-x-1/2 rounded-full bg-primary"
                    style={{
                      left: `${Math.max(2, Math.min(98, ((calResult.offsetMs + 100) / 300) * 100))}%`,
                    }}
                  />
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono tabular-nums">
                  <span className="text-foreground font-semibold">
                    {tr(
                      `Applied Offset: ${calResult.offsetMs >= 0 ? `+${calResult.offsetMs}` : calResult.offsetMs} ms`,
                      `보정 적용됨: ${calResult.offsetMs >= 0 ? `+${calResult.offsetMs}` : calResult.offsetMs} ms`
                    )}
                  </span>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <span>
                      {tr(`Jitter: ±${calResult.jitterMs} ms`, `편차(지터): ±${calResult.jitterMs} ms`)}
                    </span>
                    <Badge variant="outline" className="font-sans text-[10px]">
                      {calResult.quality === 'great'
                        ? tr('Stable', '안정적')
                        : calResult.quality === 'ok'
                        ? tr('Good', '양호')
                        : tr('High Variance · Retry', '편차 큼 · 재측정 권장')}
                    </Badge>
                  </div>
                </div>
              </div>
            )}

            {/* Progressive Per-Bar Auto-Calibration */}
            <div className="pt-2 border-t border-border/70 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="space-y-0.5">
                  <div className="text-xs font-medium text-foreground">
                    {tr('Progressive Auto-Calibration', '연주 중 누적 오차 자동 보정')}
                  </div>
                  <div className="text-[11px] text-muted-foreground leading-snug">
                    {tr(
                      'Refines latency after every bar you play; accuracy tightens with more notes.',
                      '1마디 이상 연주할 때마다 오차를 자동 보정하며, 많이 칠수록 정확도가 높아집니다.'
                    )}
                  </div>
                </div>
                <Switch
                  checked={config.autoCalibrateLatency !== false}
                  onCheckedChange={(checked) =>
                    onUpdateConfig({ autoCalibrateLatency: checked })
                  }
                />
              </div>

              {adaptiveLatency && (
                <div className="space-y-1.5 rounded-md border border-border/60 bg-card/70 px-2.5 py-2">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono tabular-nums">
                    <div className="flex flex-wrap items-center gap-2.5 text-muted-foreground">
                      <span>
                        {tr('Samples', '누적 학습')}:{' '}
                        <strong className="text-foreground">
                          {adaptiveLatency.totalSampleCount}
                        </strong>
                        {tr(' notes', '음')}
                      </span>
                      <span>
                        {tr('Estimate', '추정치')}:{' '}
                        <strong className="text-foreground">
                          {adaptiveLatency.estimatedOffsetMs >= 0
                            ? `+${adaptiveLatency.estimatedOffsetMs}`
                            : adaptiveLatency.estimatedOffsetMs}{' '}
                          ms
                        </strong>
                      </span>
                      <span>
                        {tr('Confidence', '신뢰도')}:{' '}
                        <strong className="text-foreground">
                          {adaptiveLatency.confidencePct}%
                        </strong>
                      </span>
                    </div>
                    {adaptiveLatency.totalSampleCount > 0 && onResetAdaptiveLatency && (
                      <button
                        type="button"
                        onClick={onResetAdaptiveLatency}
                        className="font-sans text-[11px] text-muted-foreground hover:text-foreground hover:underline"
                      >
                        {tr('Reset', '초기화')}
                      </button>
                    )}
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
                    <div
                      className="h-full bg-primary transition-[width] duration-150"
                      style={{
                        width: `${Math.max(0, Math.min(100, adaptiveLatency.confidencePct))}%`,
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
