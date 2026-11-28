'use client';

import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { ElectricFretboard } from '@/components/fretboard/ElectricFretboard';
import { useLocale } from '@/lib/i18n';
import type {
  AmpPreset,
  ChordBar,
  FretLabelMode,
  GuitarString,
  HummedNoteMapping,
  JudgmentTier,
  Lesson,
  LivePitchData,
  PracticeMode,
  TuningProfileId,
} from '@/types/guitar';
import {
  Activity,
  ChevronLeft,
  ChevronRight,
  Mic,
  MicOff,
  Pause,
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';

interface StageFocusHudModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lesson: Lesson;
  currentChordBar?: ChordBar;
  keyCenterRootPc: number;
  activeNoteIndex: number;
  labelMode: FretLabelMode;
  onLabelModeChange: (mode: FretLabelMode) => void;
  practiceMode: PracticeMode;
  judgmentTier: JudgmentTier;
  livePitch: LivePitchData;
  isAudioRunning: boolean;
  onToggleAudio: () => void;
  earCopyUnlockedIndices: Set<number>;
  earCopyHintLevel: number;
  hummedMappings?: HummedNoteMapping[];
  onFretClick: (string: GuitarString, fret: number) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onReset: () => void;
  currentBeat: number;
  totalBeats: number;
  bpm: number;
  onBpmChange: (bpm: number) => void;
  ampPreset: AmpPreset;
  onAmpPresetChange: (preset: AmpPreset) => void;
  countInState: { remaining: number; current: number; total: number } | null;
  autoStartArmed: boolean;
  autoStartImmediate: boolean;
  tuningProfile: TuningProfileId;
  capoFret: number;
  enableMetronome: boolean;
  onToggleMetronome: () => void;
  onOpenTuner: () => void;
  onPrevLesson?: () => void;
  onNextLesson?: () => void;
  currentFocusSentence: string;
}

export function StageFocusHudModal({
  open,
  onOpenChange,
  lesson,
  currentChordBar,
  keyCenterRootPc,
  activeNoteIndex,
  labelMode,
  onLabelModeChange,
  practiceMode,
  judgmentTier,
  livePitch,
  isAudioRunning,
  onToggleAudio,
  earCopyUnlockedIndices,
  earCopyHintLevel,
  hummedMappings,
  onFretClick,
  isPlaying,
  onTogglePlay,
  onReset,
  currentBeat,
  totalBeats,
  bpm,
  onBpmChange,
  ampPreset,
  onAmpPresetChange,
  countInState,
  autoStartArmed,
  autoStartImmediate,
  tuningProfile,
  capoFret,
  enableMetronome,
  onToggleMetronome,
  onOpenTuner,
  onPrevLesson,
  onNextLesson,
  currentFocusSentence,
}: StageFocusHudModalProps) {
  const { tr } = useLocale();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onOpenChange(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onOpenChange, open]);

  if (!open || typeof document === 'undefined') return null;

  const centsClamped = Math.max(-50, Math.min(50, livePitch.centsOff));
  const inTune = livePitch.isActive && Math.abs(livePitch.centsOff) <= 8;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={tr('Stage Focus HUD', '스테이지 집중 HUD')}
      className="fixed inset-0 z-50 flex flex-col bg-[#07090b] text-[#f5f7f6] overflow-y-auto"
    >
      {/* Top Zero-Glare Console Bar */}
      <header className="h-16 shrink-0 border-b border-white/10 px-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <span className="rounded-[6px] border border-[#ff6b24]/40 bg-[#ff6b24]/15 px-2.5 py-1 font-mono text-xs font-bold text-[#ff6b24] shrink-0">
            {lesson.code}
          </span>
          <h2 className="font-display text-xl sm:text-2xl font-light tracking-[-0.02em] truncate">
            {lesson.title}
          </h2>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onPrevLesson && (
            <Button type="button" variant="oled" size="sm" onClick={onPrevLesson}>
              <ChevronLeft className="size-4" />
              <span className="hidden sm:inline">{tr('Prev', '이전')}</span>
            </Button>
          )}
          {onNextLesson && (
            <Button type="button" variant="oled" size="sm" onClick={onNextLesson}>
              <span className="hidden sm:inline">{tr('Next', '다음')}</span>
              <ChevronRight className="size-4" />
            </Button>
          )}
          <Button
            type="button"
            variant="oled"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            <X className="size-4" />
            <span>ESC</span>
          </Button>
        </div>
      </header>

      {/* Main 12-Column Stage Area */}
      <main className="flex-1 mx-auto w-full max-w-[1380px] px-6 py-6 flex flex-col justify-center gap-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          {/* Left 5-col: Large Chromatic Readout & Focus */}
          <div className="lg:col-span-5 rounded-[18px] border border-white/10 bg-[#0d1113] p-5 flex flex-col justify-between gap-4">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#828d91]">
                {tr('STAGE PITCH TELEMETRY', '실시간 피치 텔레메트리')}
              </span>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-mono text-[10px] font-semibold ${
                  isAudioRunning
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    : 'bg-white/5 text-[#828d91] border border-white/10'
                }`}
              >
                <span
                  className={`size-1.5 rounded-full ${
                    isAudioRunning ? 'bg-emerald-400' : 'bg-[#828d91]'
                  }`}
                />
                {isAudioRunning ? tr('LIVE INPUT', '입력 활성') : tr('STANDBY', '대기')}
              </span>
            </div>

            <div className="flex items-baseline justify-between gap-4 py-2">
              <div
                className={`font-mono text-5xl font-bold tabular-nums tracking-tight ${
                  !livePitch.isActive
                    ? 'text-white/25'
                    : inTune
                    ? 'text-emerald-400'
                    : 'text-[#f5f7f6]'
                }`}
              >
                {livePitch.isActive && livePitch.nearestMidi > 0 ? livePitch.noteName : '--'}
              </div>

              <div className="text-right font-mono tabular-nums">
                <div className="text-xl font-semibold text-[#f5f7f6]">
                  {livePitch.isActive
                    ? `${centsClamped > 0 ? `+${centsClamped}` : centsClamped} ct`
                    : '0 ct'}
                </div>
                <div className="text-xs text-[#828d91]">
                  {livePitch.isActive && livePitch.frequency > 0
                    ? `${livePitch.frequency.toFixed(1)} Hz`
                    : '440.0 Hz REF'}
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="relative h-2 rounded-full bg-white/10 overflow-hidden">
                <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-white/30 -translate-x-1/2" />
                {livePitch.isActive && (
                  <div
                    className={`absolute top-0 bottom-0 w-3 rounded-full -translate-x-1/2 transition-[left] duration-75 ${
                      inTune ? 'bg-emerald-400' : 'bg-[#ff6b24]'
                    }`}
                    style={{ left: `${50 + (centsClamped / 50) * 46}%` }}
                  />
                )}
              </div>
              <p className="text-xs text-[#a9b3b7] leading-relaxed pt-1">
                {currentFocusSentence}
              </p>
            </div>
          </div>

          {/* Right 7-col: Large Touch-Friendly Transport Controls */}
          <div className="lg:col-span-7 rounded-[18px] border border-white/10 bg-[#0d1113] p-5 flex flex-col justify-between gap-4">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#828d91]">
                {tr('STAGE TRANSPORT & MONITORING', '스테이지 트랜스포트')}
              </span>
              <span className="font-mono text-xs tabular-nums text-[#f5f7f6]">
                {bpm} BPM · {currentBeat.toFixed(0)} / {totalBeats}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                variant={isPlaying ? 'oled' : 'signal'}
                onClick={onTogglePlay}
                className="h-14 px-6 rounded-[14px] text-sm font-semibold"
              >
                {isPlaying ? <Pause className="size-5" /> : <Play className="size-5" />}
                <span>{isPlaying ? tr('Stop', '정지') : tr('Play', '재생')}</span>
              </Button>

              <Button
                type="button"
                variant="oled"
                onClick={onReset}
                className="h-14 w-14 rounded-[14px] p-0"
                aria-label={tr('Reset', '처음으로')}
              >
                <RotateCcw className="size-5" />
              </Button>

              <Button
                type="button"
                variant="oled"
                onClick={onToggleAudio}
                className={`h-14 px-5 rounded-[14px] text-xs ${
                  isAudioRunning
                    ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                    : ''
                }`}
              >
                {isAudioRunning ? <Mic className="size-4" /> : <MicOff className="size-4" />}
                <span>{isAudioRunning ? tr('Guitar Live', '기타 연결됨') : tr('Connect Guitar', '기타 연결')}</span>
              </Button>

              <Button
                type="button"
                variant="oled"
                onClick={onToggleMetronome}
                className={`h-14 px-4 rounded-[14px] text-xs ${
                  enableMetronome ? 'border-[#ff6b24]/50 text-[#ff6b24]' : ''
                }`}
              >
                {enableMetronome ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
                <span>{tr('Click', '메트로놈')}</span>
              </Button>

              <Button
                type="button"
                variant="oled"
                onClick={onOpenTuner}
                className="h-14 px-4 rounded-[14px] text-xs"
              >
                <Activity className="size-4" />
                <span>{tr('Tuner', '튜너')}</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Full-Width High-Contrast Fretboard */}
        <ElectricFretboard
          phaseId={lesson.phaseId}
          notes={lesson.notes}
          activeNoteIndex={activeNoteIndex}
          scaleOverlay={lesson.scaleOverlay}
          currentChordBar={currentChordBar}
          focusFretRange={lesson.focusFretRange}
          keyCenterRootPc={keyCenterRootPc}
          labelMode={labelMode}
          onLabelModeChange={onLabelModeChange}
          practiceMode={practiceMode}
          judgmentTier={judgmentTier}
          livePitch={livePitch}
          earCopyUnlockedIndices={earCopyUnlockedIndices}
          earCopyHintLevel={earCopyHintLevel}
          hummedMappings={hummedMappings}
          onFretClick={onFretClick}
          isPlaying={isPlaying}
          onTogglePlay={onTogglePlay}
          onReset={onReset}
          currentBeat={currentBeat}
          totalBeats={totalBeats}
          bpm={bpm}
          minBpm={lesson.minBpm}
          maxBpm={lesson.maxBpm}
          onBpmChange={onBpmChange}
          ampPreset={ampPreset}
          onAmpPresetChange={onAmpPresetChange}
          countInState={countInState}
          autoStartArmed={autoStartArmed}
          autoStartImmediate={autoStartImmediate}
          tuningProfile={tuningProfile}
          capoFret={capoFret}
        />
      </main>
    </div>,
    document.body
  );
}
