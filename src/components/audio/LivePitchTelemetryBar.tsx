'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { TunerGaugeIcon } from '@/components/icons/GuitarSvgIcons';
import type { AudioLatencyTelemetry } from '@/lib/lowLatencyAudioEngine';
import type { AudioDeviceConfig, LivePitchData } from '@/types/guitar';
import { useLocale } from '@/lib/i18n';
import { Mic, MicOff, Settings2 } from 'lucide-react';

interface LivePitchTelemetryBarProps {
  isAudioRunning: boolean;
  onToggleAudio: () => void;
  livePitch: LivePitchData;
  telemetry: AudioLatencyTelemetry;
  config: AudioDeviceConfig;
  onOpenTuner: () => void;
  onOpenAudioSetup: () => void;
  audioError?: string | null;
}

export function LivePitchTelemetryBar({
  isAudioRunning,
  onToggleAudio,
  livePitch,
  onOpenTuner,
  onOpenAudioSetup,
  audioError,
}: LivePitchTelemetryBarProps) {
  const { tr } = useLocale();
  const centsClamped = Math.max(-50, Math.min(50, livePitch.centsOff));
  const inTune = livePitch.isActive && Math.abs(livePitch.centsOff) <= 12;

  return (
    <div className="flex items-center gap-2">
      {livePitch.isActive && (
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
        <span className="text-xs text-destructive truncate max-w-[160px]" title={audioError}>
          {audioError}
        </span>
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
