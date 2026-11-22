'use client';

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { TunerGaugeIcon } from '@/components/icons/GuitarSvgIcons';
import type { AudioLatencyTelemetry } from '@/lib/lowLatencyAudioEngine';
import type { AudioDeviceConfig, LivePitchData } from '@/types/guitar';
import { useLocale } from '@/lib/i18n';
import { AlertCircle, Mic, MicOff, Settings2 } from 'lucide-react';

interface LivePitchTelemetryBarProps {
  isAudioRunning: boolean;
  onToggleAudio: () => void;
  livePitch: LivePitchData;
  telemetry: AudioLatencyTelemetry;
  config: AudioDeviceConfig;
  onOpenTuner: () => void;
  onOpenAudioSetup: () => void;
  audioError?: string | null;
  onOpenErrorModal?: () => void;
}

export function LivePitchTelemetryBar({
  isAudioRunning,
  onToggleAudio,
  livePitch,
  onOpenTuner,
  onOpenAudioSetup,
  audioError,
  onOpenErrorModal,
}: LivePitchTelemetryBarProps) {
  const { tr } = useLocale();
  const [clipHoldActive, setClipHoldActive] = useState(false);

  const isClipNow = isAudioRunning && (livePitch.isClipping || livePitch.peakDb >= -0.5);
  useEffect(() => {
    if (!isClipNow) return;
    const onId = window.setTimeout(() => setClipHoldActive(true), 0);
    const offId = window.setTimeout(() => setClipHoldActive(false), 1500);
    return () => {
      window.clearTimeout(onId);
      window.clearTimeout(offId);
    };
  }, [isClipNow, livePitch.timestampMs]);

  const clipHeld = isAudioRunning && (isClipNow || clipHoldActive);
  const peakDbClamped = Math.max(-60, Math.min(0, livePitch.peakDb ?? -60));
  const peakPct = Math.max(0, Math.min(100, ((peakDbClamped + 60) / 60) * 100));
  const peakFillClass =
    clipHeld || peakDbClamped >= -1
      ? 'bg-destructive'
      : peakDbClamped >= -6
      ? 'bg-amber-500'
      : peakDbClamped >= -24
      ? 'bg-emerald-500'
      : 'bg-muted-foreground/60';

  const centsClamped = Math.max(-50, Math.min(50, livePitch.centsOff));
  const inTune = livePitch.isActive && Math.abs(livePitch.centsOff) <= 12;

  return (
    <div className="flex items-center gap-2">
      {isAudioRunning && (
        <button
          type="button"
          onClick={onOpenAudioSetup}
          className={`flex items-center gap-1.5 rounded-full border px-2 py-1 text-[11px] font-mono tabular-nums transition-colors ${
            clipHeld
              ? 'border-destructive/50 bg-destructive/10 text-destructive'
              : 'border-border bg-card text-muted-foreground hover:border-foreground/30 hover:text-foreground'
          }`}
          title={tr(
            'Live input peak level & clip indicator (click to adjust gain)',
            '실시간 입력 게인/피크 레벨 (클릭하여 게인 설정)'
          )}
        >
          <span className="h-1.5 w-14 sm:w-16 rounded-full bg-secondary overflow-hidden">
            <span
              className={`block h-full rounded-full transition-[width] duration-75 ${peakFillClass}`}
              style={{ width: `${peakPct}%` }}
            />
          </span>
          <span className={clipHeld ? 'font-bold text-destructive' : 'w-9 text-right'}>
            {clipHeld
              ? 'CLIP'
              : livePitch.peakDb <= -60
              ? '--dB'
              : `${Math.round(peakDbClamped)}dB`}
          </span>
        </button>
      )}

      {livePitch.isActive && livePitch.frequency > 0 && livePitch.nearestMidi > 0 && (
        <div className="hidden sm:flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 font-mono text-xs tabular-nums">
          <span className={inTune ? 'text-emerald-700 dark:text-emerald-400 font-semibold' : 'text-foreground font-semibold'}>
            {livePitch.noteName}
          </span>
          <span className="text-muted-foreground text-[11px]">
            {centsClamped > 0 ? `+${centsClamped}c` : `${centsClamped}c`}
          </span>
        </div>
      )}

      {audioError && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={onOpenErrorModal}
          className="rounded-full border-destructive/40 text-destructive hover:bg-destructive/10 text-xs gap-1.5"
          title={audioError}
        >
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{tr('Error Log', '오류 보기')}</span>
        </Button>
      )}

      <Button
        type="button"
        size="sm"
        variant={isAudioRunning ? 'secondary' : 'outline'}
        className="rounded-full"
        onClick={onToggleAudio}
      >
        {isAudioRunning ? (
          <>
            <Mic className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>{tr('Connected', '연결됨')}</span>
          </>
        ) : (
          <>
            <MicOff className="w-3.5 h-3.5 text-muted-foreground" />
            <span>{tr('Connect Guitar', '기타 연결')}</span>
          </>
        )}
      </Button>

      <Button
        type="button"
        size="sm"
        variant="outline"
        className="rounded-full"
        onClick={onOpenTuner}
      >
        <TunerGaugeIcon size={14} />
        <span className="hidden sm:inline">{tr('Tuner', '튜너')}</span>
      </Button>

      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        className="rounded-full text-muted-foreground hover:text-foreground"
        onClick={onOpenAudioSetup}
        title={tr('Audio & ASIO Settings', '오디오 및 ASIO 설정')}
      >
        <Settings2 className="w-4 h-4" />
      </Button>
    </div>
  );
}
