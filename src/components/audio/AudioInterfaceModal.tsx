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
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [calibrating, setCalibrating] = useState(false);
  const [tapErrors, setTapErrors] = useState<number[]>([]);
  const expectedClickTimesRef = useRef<number[]>([]);
  const calTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!open) return;
    void guitarAudioEngine.listInputDevices().then(setDevices);
  }, [open]);

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
          <DialogTitle className="text-base font-semibold">오디오 & ASIO 입력 설정</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2 rounded-lg border border-border bg-muted/50 p-3 font-mono text-xs tabular-nums">
            <div>
              <div className="text-[10px] text-muted-foreground">파이프라인</div>
              <div className="mt-0.5 font-semibold text-foreground">
                {telemetry.pipelineMode === 'asio-bridge'
                  ? 'ASIO Bridge'
                  : telemetry.pipelineMode === 'worklet'
                  ? 'Worklet 128'
                  : '대기'}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-muted-foreground">샘플레이트</div>
              <div className="mt-0.5 font-semibold text-foreground">
                {telemetry.sampleRate.toLocaleString()} Hz
              </div>
            </div>
            <div>
              <div className="text-[10px] text-muted-foreground">추정 지연</div>
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
                <div className="text-xs font-semibold">저지연 Web Audio</div>
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

          {config.inputMode === 'worklet' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <div className="text-xs font-medium text-foreground">입력 디바이스</div>
                <Select
                  value={config.deviceId}
                  onValueChange={(val) => {
                    if (val) onUpdateConfig({ deviceId: val });
                  }}
                >
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder="기본 입력 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">시스템 기본 입력</SelectItem>
                    {devices.map((d, i) => (
                      <SelectItem key={d.deviceId || `dev-${i}`} value={d.deviceId || 'default'}>
                        {d.label || `오디오 입력 ${i + 1}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <div className="text-xs font-medium text-foreground">입력 채널</div>
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
              <div className="text-xs font-medium">하드웨어 다이렉트 모니터링</div>
              <div className="text-[11px] text-muted-foreground">
                외장 앰프나 인터페이스 모니터링 시 브라우저 입력 에코 차단
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
                <span>노이즈 게이트</span>
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
                <span>레이턴시 보정</span>
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
              <div className="text-xs font-medium">4-탭 레이턴시 측정</div>
              <div className="text-[11px] text-muted-foreground">
                클릭에 맞춰 4회 피킹해 지연 자동 보정
              </div>
              {calibrating && (
                <Badge variant="secondary" className="mt-1 text-[10px]">
                  {tapErrors.length}/4회 감지됨
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
                {calibrating ? '측정 중' : '측정 시작'}
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  onRestartAudio();
                  onOpenChange(false);
                }}
              >
                적용
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
