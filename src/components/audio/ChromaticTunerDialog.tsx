'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  getTuningOpenStrings,
  TUNING_PROFILE_LIST,
  TUNING_PROFILES,
} from '@/lib/musicTheory';
import { guitarSynthEngine } from '@/lib/guitarSynthEngine';
import { useLocale } from '@/lib/i18n';
import type { LivePitchData, TuningProfileId } from '@/types/guitar';
import { Volume2 } from 'lucide-react';

interface ChromaticTunerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  livePitch: LivePitchData;
  isAudioRunning: boolean;
  onStartAudio: () => void;
  tuningProfile?: TuningProfileId;
  capoFret?: number;
  onTuningChange?: (profile: TuningProfileId, capoFret: number) => void;
}

export function ChromaticTunerDialog({
  open,
  onOpenChange,
  livePitch,
  isAudioRunning,
  onStartAudio,
  tuningProfile = 'standard',
  capoFret = 0,
  onTuningChange,
}: ChromaticTunerDialogProps) {
  const { locale, tr } = useLocale();
  const openStrings = getTuningOpenStrings(tuningProfile, capoFret);
  const activeProfile = TUNING_PROFILES[tuningProfile] ?? TUNING_PROFILES.standard;
  const hasTunerPitch = livePitch.isActive && livePitch.frequency > 0 && livePitch.midiFloat > 0;
  const cents = Math.max(-50, Math.min(50, livePitch.centsOff));
  const needleAngleDeg = (cents / 50) * 58;
  const isInTune = hasTunerPitch && Math.abs(cents) <= 5;

  const nearestOpenString = hasTunerPitch
    ? openStrings.reduce((best, cur) =>
        Math.abs(cur.midi - livePitch.midiFloat) < Math.abs(best.midi - livePitch.midiFloat)
          ? cur
          : best
      )
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base flex items-center justify-between gap-2 pr-6">
            <span>{tr('Chromatic Tuner & Tuning', '크로매틱 튜너 · 변칙 튜닝')}</span>
            <Badge variant="signal" className="font-mono text-[11px]">
              {activeProfile.shortLabel}
              {capoFret > 0 ? ` · Capo ${capoFret}F` : ''}
            </Badge>
          </DialogTitle>
          <DialogDescription className="sr-only">
            {tr(
              'Tune open strings with 440Hz strobe readout and switch alternate tunings or virtual capo.',
              '440Hz 크로매틱 튜너로 개방현을 조율하고 변칙 튜닝과 가상 카포를 설정합니다.'
            )}
          </DialogDescription>
        </DialogHeader>

        {/* Alternate Tuning & Virtual Capo Selector */}
        {onTuningChange && (
          <div className="rounded-xl border border-border bg-secondary/35 p-3 space-y-2.5">
            <div className="flex flex-wrap gap-1.5">
              {TUNING_PROFILE_LIST.map((profile) => {
                const selected = profile.id === tuningProfile;
                return (
                  <button
                    key={profile.id}
                    type="button"
                    onClick={() => onTuningChange(profile.id, capoFret)}
                    className={`rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                      selected
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-card text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {locale === 'en' ? profile.name : profile.labelKo}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/60">
              <div className="text-[11px] text-muted-foreground leading-snug">
                {locale === 'en' ? activeProfile.descriptionEn : activeProfile.descriptionKo}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <span className="text-[11px] font-medium text-muted-foreground">
                  {tr('Capo', '카포')}
                </span>
                <div className="inline-flex items-center rounded-lg border border-border bg-card p-0.5">
                  {[0, 1, 2, 3, 4, 5].map((fret) => (
                    <button
                      key={fret}
                      type="button"
                      onClick={() => onTuningChange(tuningProfile, fret)}
                      className={`rounded-md px-1.5 py-0.5 font-mono text-[11px] font-semibold transition-colors ${
                        capoFret === fret
                          ? 'bg-foreground text-background'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {fret === 0 ? tr('Off', '없음') : `${fret}F`}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {!isAudioRunning && (
          <div className="rounded-[12px] border border-border bg-secondary/60 p-3 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {tr('Enable guitar input to detect live pitch.', '기타 입력을 시작하면 음정이 표시됩니다.')}
            </span>
            <Button size="sm" variant="signal" onClick={onStartAudio}>
              {tr('Connect', '연결 시작')}
            </Button>
          </div>
        )}

        <div className="nr-obsidian-pod flex flex-col items-center rounded-[16px] border border-oled-border p-5 text-oled-foreground">
          <svg viewBox="0 0 280 150" className="w-full max-w-[260px] h-auto">
            <path
              d="M 35 128 A 105 105 0 0 1 245 128"
              fill="none"
              stroke="rgba(255,255,255,0.16)"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <path
              d="M 129 24 A 105 105 0 0 1 151 24"
              fill="none"
              stroke="#34d399"
              strokeWidth="5"
              strokeLinecap="round"
            />
            {[-50, -25, 0, 25, 50].map((val) => {
              const rad = ((-90 + (val / 50) * 58) * Math.PI) / 180;
              const x1 = 140 + Math.cos(rad) * 95;
              const y1 = 128 + Math.sin(rad) * 95;
              const x2 = 140 + Math.cos(rad) * 112;
              const y2 = 128 + Math.sin(rad) * 112;
              return (
                <line
                  key={val}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={val === 0 ? '#34d399' : '#828d91'}
                  strokeWidth={val === 0 ? 2 : 1.3}
                />
              );
            })}
            <g
              transform={`rotate(${livePitch.isActive ? needleAngleDeg : 0} 140 128)`}
              className="transition-transform duration-75"
            >
              <line
                x1="140"
                y1="128"
                x2="140"
                y2="34"
                stroke={!livePitch.isActive ? '#828d91' : isInTune ? '#34d399' : '#ff6b24'}
                strokeWidth="2.4"
                strokeLinecap="round"
              />
            </g>
            <circle cx="140" cy="128" r="5" fill="#f5f7f6" />
          </svg>

          <div className="mt-2 flex items-baseline gap-3 font-mono tabular-nums">
            <span className={`text-3xl font-bold ${isInTune ? 'text-emerald-400' : 'text-oled-foreground'}`}>
              {livePitch.isActive ? livePitch.noteName : '--'}
            </span>
            <span className="text-xs text-oled-muted">
              {livePitch.isActive ? `${livePitch.frequency.toFixed(1)} Hz` : tr('Idle', '대기 중')}
            </span>
          </div>

          <div className="mt-2">
            {livePitch.isActive ? (
              <Badge variant={isInTune ? 'ok' : 'signal'}>
                {isInTune
                  ? tr('In Tune', '정확함')
                  : cents < 0
                  ? tr(`Flat (${cents}c) · Tune Up`, `낮음 (${cents}c) · 조이세요`)
                  : tr(`Sharp (+${cents}c) · Tune Down`, `높음 (+${cents}c) · 푸세요`)}
              </Badge>
            ) : (
              <span className="text-xs text-oled-muted">
                {tr('Pluck one open string at a time', '개방현을 한 줄씩 튕겨 보세요')}
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-6 gap-1.5">
          {openStrings.map((st) => {
            const isDetected =
              nearestOpenString?.string === st.string &&
              Math.abs(nearestOpenString.midi - livePitch.midiFloat) < 1.5;

            return (
              <Button
                key={st.string}
                type="button"
                variant={isDetected ? 'default' : 'outline'}
                className="flex flex-col h-auto py-2"
                onClick={() => guitarSynthEngine.playReferenceTone(st.freq, 1.5)}
              >
                <span className="text-[10px] opacity-70">{tr(`Str ${st.string}`, `${st.string}번`)}</span>
                <span className="font-mono text-xs font-semibold">{st.label}</span>
                <Volume2 className="w-3 h-3 mt-1 opacity-60" />
              </Button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
