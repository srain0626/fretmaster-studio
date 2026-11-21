'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { guitarAudioEngine, type AudioLatencyTelemetry } from '@/lib/lowLatencyAudioEngine';
import { guitarSynthEngine } from '@/lib/guitarSynthEngine';
import { useLocale } from '@/lib/i18n';
import type { AudioDeviceConfig, ChannelRouteMode, LivePitchData } from '@/types/guitar';

interface AudioInterfaceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: AudioDeviceConfig;
  onUpdateConfig: (next: Partial<AudioDeviceConfig>) => void;
  telemetry: AudioLatencyTelemetry;
  livePitch: LivePitchData;
  isAudioRunning: boolean;
  onRestartAudio: () => void;
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
}: AudioInterfaceModalProps) {
  const { tr } = useLocale();
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [calibrating, setCalibrating] = useState(false);
  const [tapErrors, setTapErrors] = useState<number[]>([]);
  const [bridgeTestState, setBridgeTestState] = useState<{
    status: 'idle' | 'testing' | 'ok' | 'offline';
    latencyMs?: number;
  }>({ status: 'idle' });
  const expectedClickTimesRef = useRef<number[]>([]);
  const calTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!open) {
      setBridgeTestState({ status: 'idle' });
      return;
    }
    void guitarAudioEngine.listInputDevices().then(setDevices);
  }, [open]);

  const handleTestAsioBridge = async () => {
    setBridgeTestState({ status: 'testing' });
    const res = await guitarAudioEngine.testAsioBridge(config.asioBridgeUrl);
    setBridgeTestState(
      res.ok ? { status: 'ok', latencyMs: res.latencyMs } : { status: 'offline' }
    );
  };

  useEffect(() => {
    if (!calibrating || !livePitch.isOnset) return;
    if (expectedClickTimesRef.current.length === 0) return;

    const now = performance.now();
    let closestErr = 9999;
    for (const exp of expectedClickTimesRef.current) {
      const diff = now - exp;
      if (Math.abs(diff) < Math.abs(closestErr)) {
        closestErr = diff;
      }
    }

    if (Math.abs(closestErr) <= 220) {
      setTapErrors((prev) => {
        if (prev.length >= 4) return prev;
        const next = [...prev, Math.round(closestErr)];
        if (next.length === 4) {
          const avg = Math.round(next.reduce((a, b) => a + b, 0) / 4);
          const clamped = Math.max(-50, Math.min(150, avg));
          onUpdateConfig({ latencyOffsetMs: clamped });
          setCalibrating(false);
        }
        return next;
      });
    }
  }, [calibrating, livePitch.isOnset, livePitch.timestampMs, onUpdateConfig]);

  useEffect(() => {
    return () => {
      if (calTimerRef.current !== null) clearInterval(calTimerRef.current);
    };
  }, []);

  const startLatencyCalibration = () => {
    setTapErrors([]);
    expectedClickTimesRef.current = [];
    setCalibrating(true);
    let count = 0;

    if (calTimerRef.current !== null) clearInterval(calTimerRef.current);
    const fireClick = () => {
      count++;
      if (count > 8) {
        if (calTimerRef.current !== null) clearInterval(calTimerRef.current);
        setCalibrating(false);
        return;
      }
      expectedClickTimesRef.current.push(performance.now());
      guitarSynthEngine.playMetronomeClick(count % 4 === 1);
    };
    fireClick();
    calTimerRef.current = window.setInterval(fireClick, 750);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">
            {tr('Audio & ASIO Input Setup', '오디오 & ASIO 입력 설정')}
          </DialogTitle>
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
                max={150}
                step={1}
                onValueChange={(val) =>
                  onUpdateConfig({ latencyOffsetMs: Array.isArray(val) ? val[0] : Number(val) })
                }
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border bg-muted/40 p-3">
            <div>
              <div className="text-xs font-medium">{tr('4-Tap Latency Calibration', '4-탭 레이턴시 측정')}</div>
              <div className="text-[11px] text-muted-foreground">
                {tr('Pick 4 clicks to auto-calibrate round-trip latency', '클릭에 맞춰 4회 피킹해 지연 자동 보정')}
              </div>
              {calibrating && (
                <Badge variant="secondary" className="mt-1 text-[10px]">
                  {tr(`${tapErrors.length}/4 detected`, `${tapErrors.length}/4회 감지됨`)}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={!isAudioRunning || calibrating}
                onClick={startLatencyCalibration}
              >
                {calibrating ? tr('Measuring', '측정 중') : tr('Calibrate', '측정 시작')}
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  onRestartAudio();
                  onOpenChange(false);
                }}
              >
                {tr('Apply', '적용')}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
