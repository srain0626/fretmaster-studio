'use client';

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Hint } from '@/components/ui/tooltip';
import { TunerGaugeIcon } from '@/components/icons/GuitarSvgIcons';
import type { AudioLatencyTelemetry } from '@/lib/lowLatencyAudioEngine';
import type { AudioDeviceConfig, LivePitchData } from '@/types/guitar';
import { useLocale } from '@/lib/i18n';
import { AlertCircle, Search } from 'lucide-react';

interface LivePitchTelemetryBarProps {
  isAudioRunning: boolean;
  onToggleAudio: () => void;
  livePitch: LivePitchData;
  telemetry: AudioLatencyTelemetry;
  config: AudioDeviceConfig;
  onOpenTuner: () => void;
  onOpenAudioSetup: () => void;
  onOpenCommandPalette?: () => void;
  audioError?: string | null;
  onOpenErrorModal?: () => void;
}

export function LivePitchTelemetryBar({
  isAudioRunning,
  livePitch,
  onOpenTuner,
  onOpenAudioSetup,
  onOpenCommandPalette,
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
        <Hint
          content={tr(
            'Live input peak level & clip indicator (click to adjust gain)',
            '실시간 입력 피크 레벨 (클릭하여 게인 · 오디오 설정)'
          )}
          side="bottom"
        >
          <button
            type="button"
            onClick={onOpenAudioSetup}
            className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-mono tabular-nums transition-colors ${
              clipHeld
                ? 'border-destructive/50 bg-destructive/10 text-destructive'
                : 'border-border bg-card/85 text-muted-foreground hover:border-foreground/30 hover:text-foreground'
            }`}
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
        </Hint>
      )}

      {livePitch.isActive && livePitch.frequency > 0 && livePitch.nearestMidi > 0 && (
        <div className="hidden sm:flex items-center gap-1.5 rounded-full border border-oled-border bg-oled px-2.5 py-1 font-mono text-xs tabular-nums text-oled-foreground">
          <span className={inTune ? 'text-emerald-400 font-semibold' : 'text-oled-foreground font-semibold'}>
            {livePitch.noteName}
          </span>
          <span className="text-oled-muted text-[11px]">
            {centsClamped > 0 ? `+${centsClamped}c` : `${centsClamped}c`}
          </span>
        </div>
      )}

      {audioError && (
        <Hint content={audioError} side="bottom">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onOpenErrorModal}
            className="rounded-full border-destructive/40 text-destructive hover:bg-destructive/10 text-xs gap-1.5"
          >
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{tr('Logs', '오류')}</span>
          </Button>
        </Hint>
      )}

      {onOpenCommandPalette && (
        <Hint content={tr('Quick Search Lessons & Actions', '레슨 · 기능 빠른 검색')} kbd="Ctrl+K" side="bottom">
          <Button
            type="button"
            size="sm"
            variant="keycap"
            className="rounded-full h-7 px-2.5 gap-1.5 text-muted-foreground hover:text-foreground"
            onClick={onOpenCommandPalette}
          >
            <Search className="w-3 h-3" />
            <span className="hidden md:inline font-sans text-[11px]">{tr('Search', '검색')}</span>
            <kbd className="rounded-[4px] border border-border bg-secondary px-1 py-px text-[9.5px] font-mono">
              /
            </kbd>
          </Button>
        </Hint>
      )}

      <Hint content={tr('Chromatic Tuner & Alternate Tunings', '크로매틱 튜너 · 변칙 튜닝')} kbd="T" side="bottom">
        <Button
          type="button"
          size="sm"
          variant="keycap"
          className="rounded-full h-7 px-2.5"
          onClick={onOpenTuner}
        >
          <TunerGaugeIcon size={13} />
          <span className="hidden sm:inline font-sans text-[11px]">{tr('Tuner', '튜너')}</span>
        </Button>
      </Hint>
    </div>
  );
}
