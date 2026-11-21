'use client';

import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import type { GuitarString, Lesson } from '@/types/guitar';
import { getFingerColorHex, getIntervalLabel, getNoteMidi } from '@/lib/musicTheory';
import { guitarSynthEngine } from '@/lib/guitarSynthEngine';
import type { Locale } from '@/lib/i18n';
import type { VideoAudioCue } from './ExplainerVideoShell';

export interface HarmonyCompositionProps {
  lesson: Lesson;
  locale?: Locale;
  [key: string]: unknown;
}

type HarmonyVariant =
  | 'open-strings'
  | 'octave-geometry'
  | 'interval-steps'
  | 'triad-morph'
  | 'powerchord-wave'
  | 'progression-arc'
  | 'relative-flip'
  | 'pentatonic-box'
  | 'scale-color-fill'
  | 'bend-pitch-lock'
  | 'chord-tone-lead';

export function resolveHarmonyVariant(lesson: Lesson): HarmonyVariant {
  if (lesson.id === 'm1-1') return 'open-strings';
  if (lesson.id === 'm2-4') return 'octave-geometry';
  if (lesson.id === 'm3-3') return 'triad-morph';
  if (lesson.id === 'm3-4' || lesson.id === 'm9-2') return 'progression-arc';
  if (lesson.id === 'm4-2') return 'relative-flip';
  if (lesson.id === 'm6-3' || lesson.id === 'm8-4') return 'bend-pitch-lock';
  if (lesson.harmonyConcept.layerNumber === 1) return 'interval-steps';
  if (lesson.harmonyConcept.layerNumber === 2) return 'powerchord-wave';
  if (lesson.harmonyConcept.layerNumber === 3) return 'pentatonic-box';
  if (lesson.harmonyConcept.layerNumber === 4) return 'scale-color-fill';
  return 'chord-tone-lead';
}

export function getHarmonyMotionLabel(lesson: Lesson, locale: Locale = 'ko'): string {
  const isEn = locale === 'en';
  const variant = resolveHarmonyVariant(lesson);
  switch (variant) {
    case 'open-strings':
      return isEn ? 'Harmony · Open Strings & 4ths' : '화성 구조 · 6줄 개방현 & 4도 간격';
    case 'octave-geometry':
      return isEn ? 'Harmony · Fretboard Octave Shape' : '화성 구조 · 지판 옥타브 기하학';
    case 'interval-steps':
      return isEn ? 'Harmony · Half/Whole Step Waves' : '화성 구조 · 반음/온음 파형 간격';
    case 'triad-morph':
      return isEn ? 'Harmony · Major vs Minor 3rd' : '화성 구조 · 장3도 vs 단3도 변환';
    case 'powerchord-wave':
      return isEn ? 'Harmony · 1+5+8 Power Chord Stack' : '화성 구조 · 1+5+8 파워코드 파형';
    case 'progression-arc':
      return isEn ? 'Harmony · Progression Tension Arc' : '화성 구조 · 코드 진행 긴장과 이완';
    case 'relative-flip':
      return isEn ? 'Harmony · Am ↔ C Relative Roots' : '화성 구조 · A 마이너 ↔ C 메이저 나란한조';
    case 'pentatonic-box':
      return isEn ? 'Harmony · 5-Note Pentatonic Frame' : '화성 구조 · 펜타토닉 5음 골격';
    case 'scale-color-fill':
      return isEn ? 'Harmony · Pentatonic + Color Tones' : '화성 구조 · 펜타토닉 + 컬러 노트 확장';
    case 'bend-pitch-lock':
      return isEn ? 'Harmony · Target Pitch (+200c) Bend' : '화성 구조 · 목표 음정(+200c) 벤딩 도달';
    case 'chord-tone-lead':
      return isEn ? 'Harmony · Chord-Tone Landing' : '화성 구조 · 코드 체인지 타겟 착지';
  }
}

export function getHarmonyAudioCues(lesson: Lesson): VideoAudioCue[] {
  const variant = resolveHarmonyVariant(lesson);
  const amp = lesson.recommendedAmp;

  switch (variant) {
    case 'open-strings': {
      const cues: Array<{ frame: number; string: GuitarString }> = [
        { frame: 20, string: 6 },
        { frame: 54, string: 5 },
        { frame: 88, string: 4 },
        { frame: 122, string: 3 },
        { frame: 156, string: 2 },
        { frame: 190, string: 1 },
      ];
      return cues.map((c) => ({
        frame: c.frame,
        trigger: () => guitarSynthEngine.playSingleGuitarNote(c.string, 0, 'clean', 0.85),
      }));
    }
    case 'octave-geometry':
      return [
        { frame: 18, trigger: () => guitarSynthEngine.playSingleGuitarNote(6, 5, amp, 0.9) },
        { frame: 68, trigger: () => guitarSynthEngine.playSingleGuitarNote(4, 7, amp, 0.9) },
        { frame: 136, trigger: () => guitarSynthEngine.playSingleGuitarNote(5, 3, amp, 0.9) },
        { frame: 184, trigger: () => guitarSynthEngine.playSingleGuitarNote(3, 5, amp, 0.9) },
      ];
    case 'triad-morph':
      return [
        {
          frame: 22,
          trigger: () => {
            guitarSynthEngine.playSingleGuitarNote(4, 7, 'clean', 0.9);
            setTimeout(() => guitarSynthEngine.playSingleGuitarNote(3, 6, 'clean', 0.9), 90);
            setTimeout(() => guitarSynthEngine.playSingleGuitarNote(2, 5, 'clean', 0.9), 180);
          },
        },
        {
          frame: 78,
          trigger: () => {
            guitarSynthEngine.playSingleGuitarNote(4, 7, 'clean', 0.8);
            setTimeout(() => guitarSynthEngine.playSingleGuitarNote(3, 6, 'clean', 0.8), 25);
            setTimeout(() => guitarSynthEngine.playSingleGuitarNote(2, 5, 'clean', 0.8), 50);
          },
        },
        {
          frame: 142,
          trigger: () => {
            guitarSynthEngine.playSingleGuitarNote(4, 7, 'clean', 0.9);
            setTimeout(() => guitarSynthEngine.playSingleGuitarNote(3, 5, 'clean', 0.9), 90);
            setTimeout(() => guitarSynthEngine.playSingleGuitarNote(2, 5, 'clean', 0.9), 180);
          },
        },
        {
          frame: 196,
          trigger: () => {
            guitarSynthEngine.playSingleGuitarNote(4, 7, 'clean', 0.8);
            setTimeout(() => guitarSynthEngine.playSingleGuitarNote(3, 5, 'clean', 0.8), 25);
            setTimeout(() => guitarSynthEngine.playSingleGuitarNote(2, 5, 'clean', 0.8), 50);
          },
        },
      ];
    case 'powerchord-wave':
      return [
        { frame: 20, trigger: () => guitarSynthEngine.playSingleGuitarNote(6, 5, 'crunch', 0.85) },
        {
          frame: 78,
          trigger: () => {
            guitarSynthEngine.playSingleGuitarNote(6, 5, 'crunch', 0.9);
            setTimeout(() => guitarSynthEngine.playSingleGuitarNote(5, 7, 'crunch', 0.9), 20);
          },
        },
        {
          frame: 145,
          trigger: () => {
            const tech = lesson.id === 'm3-2' ? 'palm-mute' : 'normal';
            guitarSynthEngine.playSingleGuitarNote(6, 5, 'crunch', 0.55, 0, tech);
            setTimeout(() => guitarSynthEngine.playSingleGuitarNote(5, 7, 'crunch', 0.55, 0, tech), 18);
            setTimeout(() => guitarSynthEngine.playSingleGuitarNote(4, 7, 'crunch', 0.55, 0, tech), 36);
          },
        },
        {
          frame: 192,
          trigger: () => {
            guitarSynthEngine.playSingleGuitarNote(6, 5, 'crunch', 0.9);
            setTimeout(() => guitarSynthEngine.playSingleGuitarNote(5, 7, 'crunch', 0.9), 20);
            setTimeout(() => guitarSynthEngine.playSingleGuitarNote(4, 7, 'crunch', 0.9), 40);
          },
        },
      ];
    case 'progression-arc':
      return [
        {
          frame: 18,
          trigger: () => {
            guitarSynthEngine.playSingleGuitarNote(5, 3, amp, 0.85);
            setTimeout(() => guitarSynthEngine.playSingleGuitarNote(4, 5, amp, 0.85), 24);
          },
        },
        {
          frame: 76,
          trigger: () => {
            guitarSynthEngine.playSingleGuitarNote(6, 3, amp, 0.85);
            setTimeout(() => guitarSynthEngine.playSingleGuitarNote(5, 5, amp, 0.85), 24);
          },
        },
        {
          frame: 134,
          trigger: () => {
            guitarSynthEngine.playSingleGuitarNote(6, 5, amp, 0.85);
            setTimeout(() => guitarSynthEngine.playSingleGuitarNote(5, 7, amp, 0.85), 24);
          },
        },
        {
          frame: 192,
          trigger: () => {
            guitarSynthEngine.playSingleGuitarNote(6, 1, amp, 0.85);
            setTimeout(() => guitarSynthEngine.playSingleGuitarNote(5, 3, amp, 0.85), 24);
          },
        },
      ];
    case 'relative-flip':
      return [
        { frame: 24, trigger: () => guitarSynthEngine.playSingleGuitarNote(4, 7, 'clean', 0.7) },
        { frame: 56, trigger: () => guitarSynthEngine.playSingleGuitarNote(3, 5, 'clean', 0.6) },
        { frame: 88, trigger: () => guitarSynthEngine.playSingleGuitarNote(4, 7, 'clean', 0.9) },
        { frame: 142, trigger: () => guitarSynthEngine.playSingleGuitarNote(3, 5, 'clean', 0.7) },
        { frame: 174, trigger: () => guitarSynthEngine.playSingleGuitarNote(2, 5, 'clean', 0.6) },
        { frame: 204, trigger: () => guitarSynthEngine.playSingleGuitarNote(1, 8, 'clean', 0.9) },
      ];
    case 'pentatonic-box':
      return [
        { frame: 24, trigger: () => guitarSynthEngine.playSingleGuitarNote(6, 5, amp, 0.6) },
        { frame: 62, trigger: () => guitarSynthEngine.playSingleGuitarNote(6, 8, amp, 0.6) },
        { frame: 100, trigger: () => guitarSynthEngine.playSingleGuitarNote(5, 5, amp, 0.6) },
        { frame: 138, trigger: () => guitarSynthEngine.playSingleGuitarNote(5, 7, amp, 0.6) },
        {
          frame: 176,
          trigger: () =>
            guitarSynthEngine.playSingleGuitarNote(
              3,
              lesson.id === 'm4-3' ? 9 : 5,
              amp,
              0.9,
              0,
              lesson.id === 'm4-3' ? 'slide-up' : 'normal'
            ),
        },
      ];
    case 'scale-color-fill': {
      const isBlueNote = lesson.id === 'm5-2';
      const isHarmMinor = lesson.id === 'm7-4';
      return [
        { frame: 22, trigger: () => guitarSynthEngine.playSingleGuitarNote(3, 5, amp, 0.65) },
        { frame: 62, trigger: () => guitarSynthEngine.playSingleGuitarNote(3, 7, amp, 0.65) },
        {
          frame: 112,
          trigger: () =>
            guitarSynthEngine.playSingleGuitarNote(
              isBlueNote ? 3 : 2,
              isBlueNote ? 8 : isHarmMinor ? 9 : 6,
              amp,
              0.75
            ),
        },
        {
          frame: 168,
          trigger: () =>
            guitarSynthEngine.playSingleGuitarNote(
              isBlueNote ? 3 : 1,
              isBlueNote ? 7 : isHarmMinor ? 5 : 7,
              amp,
              0.95
            ),
        },
      ];
    }
    case 'bend-pitch-lock':
      return [
        { frame: 22, trigger: () => guitarSynthEngine.playSingleGuitarNote(3, 7, 'lead', 0.6) },
        {
          frame: 78,
          trigger: () => guitarSynthEngine.playSingleGuitarNote(3, 7, 'lead', 1.25, 200, 'bend-full'),
        },
        { frame: 176, trigger: () => guitarSynthEngine.playSingleGuitarNote(3, 9, 'lead', 0.8) },
      ];
    default: {
      // Sample up to 4 distinct lesson notes or chord tones
      const picked = lesson.notes.slice(0, 4);
      const frames = [22, 76, 132, 188];
      if (picked.length > 0) {
        return picked.map((n, idx) => ({
          frame: frames[idx] ?? idx * 54 + 20,
          trigger: () =>
            guitarSynthEngine.playSingleGuitarNote(n.string, n.fret, amp, 0.75, n.bendCents, n.technique),
        }));
      }
      return [
        { frame: 22, trigger: () => guitarSynthEngine.playSingleGuitarNote(4, 7, amp, 0.7) },
        { frame: 88, trigger: () => guitarSynthEngine.playSingleGuitarNote(3, 5, amp, 0.7) },
        { frame: 154, trigger: () => guitarSynthEngine.playSingleGuitarNote(2, 6, amp, 0.85) },
      ];
    }
  }
}

function buildSineWavePath(
  xStart: number,
  xEnd: number,
  yCenter: number,
  amplitude: number,
  cycles: number,
  phase: number,
  samples = 56
): string {
  const parts: string[] = [];
  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    const x = xStart + (xEnd - xStart) * t;
    const envelope = Math.sin(Math.PI * t);
    const y = yCenter + Math.sin(t * cycles * Math.PI * 2 + phase) * amplitude * envelope;
    parts.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`);
  }
  return parts.join(' ');
}

function getStringY(stringNum: GuitarString, topY: number, gap: number): number {
  return topY + (stringNum - 1) * gap;
}

export const HarmonyExplainerComposition: React.FC<HarmonyCompositionProps> = ({
  lesson,
  locale = 'ko',
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const variant = resolveHarmonyVariant(lesson);

  return (
    <svg
      viewBox="0 0 720 320"
      width="100%"
      height="100%"
      style={{
        backgroundColor: 'var(--card)',
        fontFamily: "'Pretendard Variable', 'Plus Jakarta Sans', sans-serif",
      }}
    >
      {/* Subtle Architectural Grid Backdrop */}
      <defs>
        <pattern id="harmonyDotGrid" width="24" height="24" patternUnits="userSpaceOnUse">
          <circle cx="12" cy="12" r="0.8" fill="var(--border)" opacity="0.55" />
        </pattern>
      </defs>
      <rect width="720" height="320" fill="url(#harmonyDotGrid)" />

      {variant === 'open-strings' && <OpenStringsScene frame={frame} fps={fps} locale={locale} />}
      {variant === 'octave-geometry' && <OctaveGeometryScene frame={frame} fps={fps} locale={locale} />}
      {variant === 'interval-steps' && (
        <IntervalStepsScene frame={frame} fps={fps} lesson={lesson} locale={locale} />
      )}
      {variant === 'triad-morph' && <TriadMorphScene frame={frame} fps={fps} locale={locale} />}
      {variant === 'powerchord-wave' && (
        <PowerChordWaveScene frame={frame} fps={fps} isPalmMute={lesson.id === 'm3-2'} locale={locale} />
      )}
      {variant === 'progression-arc' && (
        <ProgressionArcScene frame={frame} fps={fps} lesson={lesson} locale={locale} />
      )}
      {variant === 'relative-flip' && <RelativeFlipScene frame={frame} fps={fps} locale={locale} />}
      {variant === 'pentatonic-box' && (
        <PentatonicBoxScene frame={frame} fps={fps} lesson={lesson} locale={locale} />
      )}
      {variant === 'scale-color-fill' && (
        <ScaleColorFillScene frame={frame} fps={fps} lesson={lesson} locale={locale} />
      )}
      {variant === 'bend-pitch-lock' && <BendPitchLockScene frame={frame} fps={fps} locale={locale} />}
      {variant === 'chord-tone-lead' && (
        <ChordToneLeadScene frame={frame} fps={fps} lesson={lesson} locale={locale} />
      )}
    </svg>
  );
};

/* ── 1. Open Strings 6-to-1 Scene ─────────────────────────────────────────── */
const OPEN_STRING_SPECS: Array<{
  str: GuitarString;
  note: string;
  hz: number;
  cueFrame: number;
}> = [
  { str: 6, note: 'E2', hz: 82, cueFrame: 20 },
  { str: 5, note: 'A2', hz: 110, cueFrame: 54 },
  { str: 4, note: 'D3', hz: 147, cueFrame: 88 },
  { str: 3, note: 'G3', hz: 196, cueFrame: 122 },
  { str: 2, note: 'B3', hz: 247, cueFrame: 156 },
  { str: 1, note: 'E4', hz: 330, cueFrame: 190 },
];

const OpenStringsScene: React.FC<{ frame: number; fps: number; locale: Locale }> = ({ frame, fps, locale }) => {
  const isEn = locale === 'en';
  const neckX = 64;
  const neckW = 370;
  const topY = 72;
  const gap = 36;

  return (
    <g>
      <text x="64" y="54" fontSize="13" fontWeight="700" fill="var(--foreground)">
        {isEn ? 'Open String Tuning Ladder: Low 6th (E2) → High 1st (E4)' : '굵은 6번 줄(저음) → 얇은 1번 줄(고음) 개방현 계단'}
      </text>

      {/* Nut */}
      <rect
        x={neckX}
        y={topY - 12}
        width="10"
        height={gap * 5 + 24}
        rx="2"
        fill="var(--foreground)"
        opacity="0.85"
      />

      {/* Fret wires */}
      {[1, 2, 3, 4].map((f) => (
        <line
          key={f}
          x1={neckX + 10 + f * 86}
          y1={topY - 10}
          x2={neckX + 10 + f * 86}
          y2={topY + gap * 5 + 10}
          stroke="var(--border)"
          strokeWidth="2"
        />
      ))}

      {OPEN_STRING_SPECS.map((s) => {
        const y = getStringY(s.str, topY, gap);
        const dt = frame - s.cueFrame;
        const active = dt >= 0 && dt < 42;
        const amp = active ? Math.max(0, 7.5 * Math.exp(-dt * 0.08)) : 0;
        const pathD = buildSineWavePath(neckX + 10, neckX + neckW, y, amp, 4 + (6 - s.str), frame * 0.55);
        const popScale = active
          ? spring({ frame: dt, fps, config: { damping: 14, stiffness: 220 } })
          : 0;
        const thickness = 1.2 + (s.str - 1) * 0.45;

        return (
          <g key={s.str}>
            <path
              d={pathD}
              fill="none"
              stroke={active ? 'var(--primary)' : 'var(--muted-foreground)'}
              strokeWidth={active ? thickness + 0.8 : thickness}
              opacity={active ? 1 : 0.5}
            />
            <circle
              cx={neckX - 18}
              cy={y}
              r={11 + popScale * 2}
              fill={active ? 'var(--primary)' : 'var(--secondary)'}
              stroke={active ? 'var(--primary)' : 'var(--border)'}
              strokeWidth="1.2"
            />
            <text
              x={neckX - 18}
              y={y + 4}
              textAnchor="middle"
              fontSize="10.5"
              fontWeight="700"
              fontFamily="'JetBrains Mono', monospace"
              fill={active ? '#ffffff' : 'var(--foreground)'}
            >
              {s.note}
            </text>
          </g>
        );
      })}

      {/* Right Interval Chart */}
      <rect
        x="466"
        y="64"
        width="224"
        height="218"
        rx="12"
        fill="var(--secondary)"
        fillOpacity="0.45"
        stroke="var(--border)"
      />
      <text x="484" y="88" fontSize="12" fontWeight="700" fill="var(--foreground)">
        {isEn ? 'Adjacent String Intervals' : '인접 줄 음정 규칙'}
      </text>

      {[
        { pair: '6E → 5A', rule: isEn ? '+5 Frets (P4)' : '+5 프렛 (완전4도)', isException: false, y: 118 },
        { pair: '5A → 4D', rule: isEn ? '+5 Frets (P4)' : '+5 프렛 (완전4도)', isException: false, y: 150 },
        { pair: '4D → 3G', rule: isEn ? '+5 Frets (P4)' : '+5 프렛 (완전4도)', isException: false, y: 182 },
        { pair: '3G → 2B', rule: isEn ? '+4 Frets (M3 Exception)' : '+4 프렛 (장3도 예외)', isException: true, y: 214 },
        { pair: '2B → 1E', rule: isEn ? '+5 Frets (P4)' : '+5 프렛 (완전4도)', isException: false, y: 246 },
      ].map((row, i) => {
        const highlight =
          frame >= OPEN_STRING_SPECS[i].cueFrame &&
          frame < OPEN_STRING_SPECS[Math.min(5, i + 1)].cueFrame + 24;
        return (
          <g key={row.pair}>
            <rect
              x="480"
              y={row.y - 16}
              width="196"
              height="24"
              rx="6"
              fill={row.isException ? 'var(--primary)' : highlight ? 'var(--card)' : 'transparent'}
              fillOpacity={row.isException ? 0.14 : 1}
              stroke={row.isException ? 'var(--primary)' : highlight ? 'var(--border)' : 'none'}
            />
            <text
              x="490"
              y={row.y}
              fontSize="11"
              fontWeight="700"
              fontFamily="'JetBrains Mono', monospace"
              fill={row.isException ? 'var(--primary)' : 'var(--foreground)'}
            >
              {row.pair}
            </text>
            <text
              x="666"
              y={row.y}
              textAnchor="end"
              fontSize="10.5"
              fontWeight={row.isException ? '700' : '500'}
              fill={row.isException ? 'var(--primary)' : 'var(--muted-foreground)'}
            >
              {row.rule}
            </text>
          </g>
        );
      })}
    </g>
  );
};

/* ── 2. Octave Geometry Scene (2-down + 2-right) ────────────────────────── */
const OctaveGeometryScene: React.FC<{ frame: number; fps: number; locale: Locale }> = ({ frame, fps, locale }) => {
  const isEn = locale === 'en';
  const isSecondHalf = frame >= 120;
  const localFrame = isSecondHalf ? frame - 120 : frame;
  const rootPos = isSecondHalf ? { str: 5 as GuitarString, fret: 3, label: 'C' } : { str: 6 as GuitarString, fret: 5, label: 'A' };
  const octPos = isSecondHalf ? { str: 3 as GuitarString, fret: 5, label: 'C' } : { str: 4 as GuitarString, fret: 7, label: 'A' };

  const left = 56;
  const right = 668;
  const minFret = 1;
  const fretCount = 8;
  const fretW = (right - left) / fretCount;
  const topY = 78;
  const gap = 32;

  const xForFret = (f: number) => left + (f - minFret + 0.5) * fretW;
  const yForStr = (s: GuitarString) => getStringY(s, topY, gap);

  const rx = xForFret(rootPos.fret);
  const ry = yForStr(rootPos.str);
  const ox = xForFret(octPos.fret);
  const oy = yForStr(octPos.str);

  const downProgress = interpolate(localFrame, [22, 48], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const rightProgress = interpolate(localFrame, [48, 74], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const octPop = spring({ frame: Math.max(0, localFrame - 66), fps, config: { damping: 14, stiffness: 200 } });

  return (
    <g>
      <text x="56" y="54" fontSize="13" fontWeight="700" fill="var(--foreground)">
        {isEn
          ? `Octave Rule: [2 Strings Down] + [2 Frets Right] = 1 Octave (${rootPos.label} → ${octPos.label})`
          : `옥타브 도형 공식: [2줄 아래] + [2프렛 오른쪽] = 1옥타브 (${rootPos.label} → ${octPos.label})`}
      </text>

      {/* Fretboard Frame */}
      <rect x={left} y={topY - 12} width={right - left} height={gap * 5 + 24} rx="8" fill="var(--secondary)" fillOpacity="0.4" stroke="var(--border)" />
      {Array.from({ length: fretCount + 1 }, (_, i) => {
        const x = left + i * fretW;
        return (
          <g key={i}>
            <line x1={x} y1={topY - 12} x2={x} y2={topY + gap * 5 + 12} stroke="var(--border)" strokeWidth={i === 0 ? 3 : 1.5} />
            {i < fretCount && (
              <text x={x + fretW / 2} y={topY + gap * 5 + 28} textAnchor="middle" fontSize="10.5" fontFamily="'JetBrains Mono', monospace" fill="var(--muted-foreground)">
                {i + 1}F
              </text>
            )}
          </g>
        );
      })}
      {[1, 2, 3, 4, 5, 6].map((s) => (
        <line key={s} x1={left} y1={yForStr(s as GuitarString)} x2={right} y2={yForStr(s as GuitarString)} stroke="var(--muted-foreground)" strokeOpacity="0.45" strokeWidth={1 + (s - 1) * 0.35} />
      ))}

      {/* Vertical 2-string step vector */}
      <line
        x1={rx}
        y1={ry}
        x2={rx}
        y2={ry + (oy - ry) * downProgress}
        stroke="var(--primary)"
        strokeWidth="2.5"
        strokeDasharray="5 4"
      />
      {downProgress > 0.4 && (
        <g opacity={downProgress}>
          <rect x={rx - 80} y={(ry + oy) / 2 - 11} width="72" height="20" rx="5" fill="var(--card)" stroke="var(--primary)" strokeWidth="1" />
          <text x={rx - 44} y={(ry + oy) / 2 + 3} textAnchor="middle" fontSize="10" fontWeight="700" fill="var(--primary)">
            {isEn ? '2 Strings ↓' : '2줄 아래'}
          </text>
        </g>
      )}

      {/* Horizontal 2-fret step vector */}
      {rightProgress > 0 && (
        <line
          x1={rx}
          y1={oy}
          x2={rx + (ox - rx) * rightProgress}
          y2={oy}
          stroke="var(--primary)"
          strokeWidth="2.5"
        />
      )}
      {rightProgress > 0.5 && (
        <g opacity={rightProgress}>
          <rect x={(rx + ox) / 2 - 44} y={oy - 28} width="88" height="20" rx="5" fill="var(--card)" stroke="var(--primary)" strokeWidth="1" />
          <text x={(rx + ox) / 2} y={oy - 14} textAnchor="middle" fontSize="10" fontWeight="700" fill="var(--primary)">
            {isEn ? '+2 Frets →' : '+2프렛 오른쪽'}
          </text>
        </g>
      )}

      {/* Root Circle */}
      <circle cx={rx} cy={ry} r="14" fill="#5B7C99" />
      <text x={rx} y={ry + 4} textAnchor="middle" fontSize="11.5" fontWeight="700" fill="#ffffff">
        {rootPos.label}
      </text>

      {/* Octave Circle */}
      <g transform={`translate(${ox}, ${oy}) scale(${0.2 + 0.8 * octPop})`} opacity={localFrame >= 66 ? 1 : 0.25}>
        <circle cx="0" cy="0" r="15" fill="var(--primary)" />
        <text x="0" y="4" textAnchor="middle" fontSize="11.5" fontWeight="700" fill="#ffffff">
          {octPos.label}8
        </text>
      </g>
    </g>
  );
};

/* ── 3. Interval Half/Whole Steps & Acoustic Wave Scene ─────────────────── */
const IntervalStepsScene: React.FC<{ frame: number; fps: number; lesson: Lesson; locale: Locale }> = ({
  frame,
  fps,
  lesson,
  locale,
}) => {
  const isEn = locale === 'en';
  const uniqueNotes = React.useMemo(() => {
    const out: Array<{ string: GuitarString; fret: number; finger: number }> = [];
    const seen = new Set<string>();
    for (const n of lesson.notes) {
      const k = `${n.string}-${n.fret}`;
      if (!seen.has(k)) {
        seen.add(k);
        out.push({ string: n.string, fret: n.fret, finger: n.finger });
      }
      if (out.length === 4) break;
    }
    if (out.length < 2) {
      return [
        { string: 6 as GuitarString, fret: 5, finger: 1 },
        { string: 6 as GuitarString, fret: 6, finger: 2 },
        { string: 6 as GuitarString, fret: 7, finger: 3 },
        { string: 6 as GuitarString, fret: 8, finger: 4 },
      ];
    }
    return out;
  }, [lesson.notes]);

  const minFret = Math.max(0, Math.min(...uniqueNotes.map((n) => n.fret)) - 1);
  const maxFret = Math.max(minFret + 4, Math.max(...uniqueNotes.map((n) => n.fret)) + 1);
  const fretCount = maxFret - minFret + 1;

  const left = 56;
  const right = 668;
  const fretW = (right - left) / fretCount;
  const topY = 74;
  const gap = 22;

  const stepIdx = Math.min(uniqueNotes.length - 1, Math.floor((frame % 240) / 60));
  const current = uniqueNotes[stepIdx];
  const rootMidi = getNoteMidi(uniqueNotes[0].string, uniqueNotes[0].fret);
  const currentMidi = getNoteMidi(current.string, current.fret);
  const semis = currentMidi - rootMidi;
  const intervalTxt = getIntervalLabel(currentMidi, rootMidi % 12);

  const wavePath = buildSineWavePath(
    80,
    648,
    256,
    18,
    3.5 + Math.max(0, semis) * 0.65,
    frame * (0.28 + Math.max(0, semis) * 0.04)
  );

  return (
    <g>
      <text x="56" y="54" fontSize="13" fontWeight="700" fill="var(--foreground)">
        {isEn
          ? `Fret Span = Interval (Half +1F · Whole +2F) — Current: ${intervalTxt} (${semis >= 0 ? `+${semis}` : semis} st)`
          : `프렛 간격 = 음정 거리 (반음 +1F · 온음 +2F) — 현재: ${intervalTxt} (${semis >= 0 ? `+${semis}` : semis} 반음)`}
      </text>

      <rect x={left} y={topY - 8} width={right - left} height={gap * 5 + 16} rx="8" fill="var(--secondary)" fillOpacity="0.35" stroke="var(--border)" />
      {Array.from({ length: fretCount + 1 }, (_, i) => {
        const x = left + i * fretW;
        const fretNum = minFret + i;
        return (
          <g key={i}>
            <line x1={x} y1={topY - 8} x2={x} y2={topY + gap * 5 + 8} stroke="var(--border)" strokeWidth={fretNum === 0 ? 3 : 1.3} />
            {i < fretCount && (
              <text x={x + fretW / 2} y={topY + gap * 5 + 23} textAnchor="middle" fontSize="10" fontFamily="'JetBrains Mono', monospace" fill="var(--muted-foreground)">
                {fretNum}F
              </text>
            )}
          </g>
        );
      })}
      {[1, 2, 3, 4, 5, 6].map((s) => (
        <line key={s} x1={left} y1={getStringY(s as GuitarString, topY, gap)} x2={right} y2={getStringY(s as GuitarString, topY, gap)} stroke="var(--muted-foreground)" strokeOpacity="0.4" strokeWidth={1 + (s - 1) * 0.3} />
      ))}

      {/* Jump arcs between sequential notes */}
      {uniqueNotes.map((n, idx) => {
        if (idx === 0) return null;
        const prev = uniqueNotes[idx - 1];
        const x1 = left + (prev.fret - minFret + 0.5) * fretW;
        const y1 = getStringY(prev.string, topY, gap);
        const x2 = left + (n.fret - minFret + 0.5) * fretW;
        const y2 = getStringY(n.string, topY, gap);
        const activeArc = stepIdx >= idx;
        return (
          <path
            key={idx}
            d={`M ${x1} ${y1 - 12} Q ${(x1 + x2) / 2} ${Math.min(y1, y2) - 34} ${x2} ${y2 - 12}`}
            fill="none"
            stroke={idx === stepIdx ? 'var(--primary)' : 'var(--muted-foreground)'}
            strokeWidth={idx === stepIdx ? 2 : 1.2}
            strokeDasharray={Math.abs(n.fret - prev.fret) === 1 ? '4 3' : undefined}
            opacity={activeArc ? 0.9 : 0.25}
          />
        );
      })}

      {/* Note Markers */}
      {uniqueNotes.map((n, idx) => {
        const cx = left + (n.fret - minFret + 0.5) * fretW;
        const cy = getStringY(n.string, topY, gap);
        const isCurrent = idx === stepIdx;
        const pop = isCurrent
          ? spring({ frame: frame % 60, fps, config: { damping: 14, stiffness: 220 } })
          : 0;
        const color = isCurrent ? 'var(--primary)' : getFingerColorHex(n.finger as 0 | 1 | 2 | 3 | 4);
        return (
          <g key={`${n.string}-${n.fret}`}>
            <circle cx={cx} cy={cy} r={isCurrent ? 12 + pop * 2 : 10} fill={color} opacity={idx <= stepIdx ? 1 : 0.4} />
            <text x={cx} y={cy + 3.5} textAnchor="middle" fontSize="10" fontWeight="700" fill="#ffffff">
              {getIntervalLabel(getNoteMidi(n.string, n.fret), rootMidi % 12)}
            </text>
          </g>
        );
      })}

      {/* Acoustic Frequency Strip */}
      <rect x="56" y="218" width="612" height="74" rx="10" fill="var(--secondary)" fillOpacity="0.45" stroke="var(--border)" />
      <text x="72" y="238" fontSize="11" fontWeight="600" fill="var(--muted-foreground)">
        {isEn
          ? 'Pitch Frequency Wave — Tighter oscillation as pitch climbs up frets'
          : '음고(Pitch) 주파수 파형 — 프렛이 올라갈수록 진동이 촘촘해짐'}
      </text>
      <path d={wavePath} fill="none" stroke="var(--primary)" strokeWidth="2.2" />
    </g>
  );
};

/* ── 4. Triad Morph (Major 3rd vs Minor 3rd) ───────────────────────────── */
const TriadMorphScene: React.FC<{ frame: number; fps: number; locale: Locale }> = ({ frame, fps, locale }) => {
  const isEn = locale === 'en';
  const isMinor = frame >= 120;
  const shiftT = interpolate(frame, [110, 140], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const thirdFret = 6 - shiftT;

  const left = 52;
  const topY = 82;
  const gap = 36;
  const fretW = 66;
  const minFret = 4;

  const cxFor = (f: number) => left + (f - minFret + 0.5) * fretW;

  const cardPop = spring({ frame: isMinor ? frame - 120 : frame, fps, config: { damping: 16, stiffness: 180 } });

  return (
    <g>
      <text x="52" y="54" fontSize="13" fontWeight="700" fill="var(--foreground)">
        {isEn
          ? 'One-Fret 3rd Rule: Hold Root & 5th Steady, Slide Only 3rd Down 1 Fret (Major → Minor)'
          : '3도 1프렛 법칙: 루트(R)와 5도(5)는 그대로, 3도만 1칸 내리면 장3화음 → 단3화음'}
      </text>

      {/* Mini 4-string Fretboard (4,3,2,1) */}
      <rect x={left} y={topY - 14} width={fretW * 5} height={gap * 3 + 28} rx="8" fill="var(--secondary)" fillOpacity="0.4" stroke="var(--border)" />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <g key={i}>
          <line x1={left + i * fretW} y1={topY - 14} x2={left + i * fretW} y2={topY + gap * 3 + 14} stroke="var(--border)" strokeWidth="1.5" />
          {i < 5 && (
            <text x={left + i * fretW + fretW / 2} y={topY + gap * 3 + 32} textAnchor="middle" fontSize="10.5" fontFamily="'JetBrains Mono', monospace" fill="var(--muted-foreground)">
              {minFret + i}F
            </text>
          )}
        </g>
      ))}
      {[1, 2, 3, 4].map((s) => (
        <line key={s} x1={left} y1={topY + (s - 1) * gap} x2={left + fretW * 5} y2={topY + (s - 1) * gap} stroke="var(--muted-foreground)" strokeOpacity="0.45" strokeWidth={1 + s * 0.3} />
      ))}

      {/* Root 4str 7F + 5th 2str 5F anchored */}
      <circle cx={cxFor(7)} cy={topY + 3 * gap} r="14" fill="#5B7C99" />
      <text x={cxFor(7)} y={topY + 3 * gap + 4} textAnchor="middle" fontSize="11" fontWeight="700" fill="#ffffff">R</text>

      <circle cx={cxFor(5)} cy={topY + 1 * gap} r="14" fill="#5C8D76" />
      <text x={cxFor(5)} y={topY + 1 * gap + 4} textAnchor="middle" fontSize="11" fontWeight="700" fill="#ffffff">5</text>

      {/* Animated 3rd Note sliding 6F -> 5F */}
      <circle cx={cxFor(thirdFret)} cy={topY + 2 * gap} r="16" fill="var(--primary)" />
      <text x={cxFor(thirdFret)} y={topY + 2 * gap + 4} textAnchor="middle" fontSize="11" fontWeight="700" fill="#ffffff">
        {shiftT > 0.5 ? 'b3' : 'M3'}
      </text>

      {/* Right Mood Comparison Panel */}
      <rect x="412" y="68" width="276" height="198" rx="12" fill="var(--secondary)" fillOpacity="0.45" stroke={isMinor ? 'var(--primary)' : 'var(--border)'} strokeWidth="1.5" />
      <g transform={`translate(550, 128) scale(${0.92 + 0.08 * cardPop})`}>
        <text x="0" y="-20" textAnchor="middle" fontSize="18" fontWeight="800" fill="var(--foreground)">
          {isMinor ? 'A Minor (Am)' : 'A Major (A)'}
        </text>
        <text x="0" y="6" textAnchor="middle" fontSize="12" fontWeight="600" fill="var(--primary)">
          {isMinor
            ? isEn
              ? 'R - b3 (Minor 3rd) - 5 · Down 1 Fret (-1F)'
              : 'R - b3(단3도) - 5 · 반음 내려감 (-1F)'
            : isEn
            ? 'R - M3 (Major 3rd) - 5 · Default 6F'
            : 'R - M3(장3도) - 5 · 기본 6프렛'}
        </text>
        <text x="0" y="34" textAnchor="middle" fontSize="11.5" fill="var(--muted-foreground)">
          {isMinor
            ? isEn
              ? 'Warm, moody Minor coloration'
              : '서정적이고 깊이 있는 마이너 색채'
            : isEn
            ? 'Bright, open Major resonance'
            : '명쾌하고 밝은 메이저 울림'}
        </text>
      </g>
      <path
        d={buildSineWavePath(436, 664, 224, isMinor ? 12 : 18, isMinor ? 4.5 : 6, frame * 0.25)}
        fill="none"
        stroke="var(--primary)"
        strokeWidth="2.2"
      />
    </g>
  );
};

/* ── 5. Power Chord & Dynamics Wave Scene ──────────────────────────────── */
const PowerChordWaveScene: React.FC<{ frame: number; fps: number; isPalmMute: boolean; locale: Locale }> = ({
  frame,
  fps,
  isPalmMute,
  locale,
}) => {
  const isEn = locale === 'en';
  const showFifth = frame >= 70;
  const showOctave = frame >= 140;
  const step3 = frame >= 188;

  const wave1 = buildSineWavePath(412, 672, 114, 16, 3, frame * 0.22);
  const wave5 = buildSineWavePath(412, 672, 166, showFifth ? 14 : 0, 4.5, frame * 0.33);
  const waveOutAmp = isPalmMute ? (step3 ? 22 : showOctave ? 7 : 14) : 18;
  const waveSum = buildSineWavePath(412, 672, 232, waveOutAmp, isPalmMute && !step3 ? 7 : 5, frame * 0.28);

  const gripPop = spring({ frame: Math.max(0, frame - 18), fps, config: { damping: 16, stiffness: 180 } });

  return (
    <g>
      <text x="52" y="54" fontSize="13" fontWeight="700" fill="var(--foreground)">
        {isPalmMute
          ? isEn
            ? 'Palm Mute (PM) Damped Pulse vs Explosive Open Accent Dynamics'
            : '팜뮤트(PM) 억제 파형 vs 오픈(Open) 폭발 다이나믹'
          : isEn
          ? 'Power Chord (1 + 5 + 8) Overtones · Omitting the 3rd Keeps Gain Tight'
          : '파워코드(1 + 5 + 8) 배음 결합 · 3도 생략으로 왜곡 없는 클린/록 톤'}
      </text>

      {/* Mini Chord Stack Diagram */}
      <rect x="52" y="70" width="330" height="206" rx="12" fill="var(--secondary)" fillOpacity="0.4" stroke="var(--border)" />
      {[0, 1, 2, 3].map((f) => (
        <line key={f} x1={96 + f * 66} y1="92" x2={96 + f * 66} y2="250" stroke="var(--border)" strokeWidth="1.5" />
      ))}
      {[1, 2, 3, 4, 5, 6].map((s) => (
        <line key={s} x1="78" y1={96 + (s - 1) * 28} x2="360" y2={96 + (s - 1) * 28} stroke="var(--muted-foreground)" strokeOpacity="0.45" strokeWidth={1 + (s - 1) * 0.35} />
      ))}

      {/* 6str 5F (1), 5str 7F (5), 4str 7F (8) */}
      <g opacity={gripPop}>
        <circle cx="129" cy={96 + 5 * 28} r="13" fill="#5B7C99" />
        <text x="129" y={96 + 5 * 28 + 4} textAnchor="middle" fontSize="10.5" fontWeight="700" fill="#ffffff">1(R)</text>
      </g>
      <g opacity={showFifth ? 1 : 0.2}>
        <circle cx="261" cy={96 + 4 * 28} r="13" fill="#B88648" />
        <text x="261" y={96 + 4 * 28 + 4} textAnchor="middle" fontSize="10.5" fontWeight="700" fill="#ffffff">{isEn ? '5th' : '5도'}</text>
      </g>
      <g opacity={showOctave ? 1 : 0.2}>
        <circle cx="261" cy={96 + 3 * 28} r="13" fill="var(--primary)" />
        <text x="261" y={96 + 3 * 28 + 4} textAnchor="middle" fontSize="10.5" fontWeight="700" fill="#ffffff">8(R)</text>
      </g>

      {/* Right Wave Comparison */}
      <rect x="398" y="70" width="290" height="206" rx="12" fill="var(--secondary)" fillOpacity="0.4" stroke="var(--border)" />
      <text x="414" y="92" fontSize="10.5" fontWeight="600" fill="var(--muted-foreground)">
        {isEn ? 'Root (1x Fundamental)' : 'Root (1x 주파수)'}
      </text>
      <path d={wave1} fill="none" stroke="#5B7C99" strokeWidth="2" />
      <text x="414" y="144" fontSize="10.5" fontWeight="600" fill="var(--muted-foreground)">
        {isEn ? 'Perfect 5th (1.5x Consonant Ratio)' : 'Perfect 5th (1.5x 조화비)'}
      </text>
      <path d={wave5} fill="none" stroke="#B88648" strokeWidth="2" opacity={showFifth ? 1 : 0.2} />
      <text x="414" y="200" fontSize="11" fontWeight="700" fill="var(--primary)">
        {isPalmMute
          ? step3
            ? isEn ? 'OPEN Accent (Full Spectrum Release)' : 'OPEN 악센트 (전음역 개방)'
            : showOctave
            ? isEn ? 'PM Zone (Damped Bass Chug)' : 'PM 구간 (저음부 타격 억제)'
            : isEn ? 'PM vs Open Contrast' : 'PM + Open 대비'
          : isEn
          ? 'Summed Power Waveform (Tight Punch)'
          : '합성 사운드 (단단한 파워코드)'}
      </text>
      <path d={waveSum} fill="none" stroke="var(--primary)" strokeWidth="2.4" />
    </g>
  );
};

/* ── 6. Progression Tension/Release Arc ────────────────────────────────── */
const ProgressionArcScene: React.FC<{ frame: number; fps: number; lesson: Lesson; locale: Locale }> = ({
  frame,
  fps,
  lesson,
  locale,
}) => {
  const isEn = locale === 'en';
  const defaultChords = [
    { name: 'C (I)', role: isEn ? 'Home' : '집 · 안정', height: 220 },
    { name: 'G (V)', role: isEn ? 'Tension' : '긴장 · 끌림', height: 120 },
    { name: 'Am (vi)', role: isEn ? 'Lyrical' : '서정 · 대리', height: 156 },
    { name: 'F (IV)', role: isEn ? 'Lift' : '확장 · 준비', height: 142 },
  ];
  const chords =
    lesson.chordProgression.length >= 4
      ? lesson.chordProgression.slice(0, 4).map((c, idx) => ({
          name: c.chordName,
          role:
            idx === 0
              ? isEn ? 'Center' : '출발/중심'
              : idx === 1
              ? isEn ? 'Expand' : '전개/확장'
              : idx === 2
              ? isEn ? 'Peak' : '긴장/고조'
              : isEn ? 'Resolve' : '해결 준비',
          height: [216, 134, 152, 128][idx % 4],
        }))
      : defaultChords;

  const activeIdx = Math.min(3, Math.floor((frame % 240) / 60));
  const dotX = interpolate(frame % 240, [0, 60, 120, 180, 239], [120, 290, 460, 620, 620]);
  const dotY = interpolate(
    frame % 240,
    [0, 60, 120, 180, 239],
    chords.map((c) => c.height).concat(chords[3].height)
  );

  return (
    <g>
      <text x="52" y="54" fontSize="13" fontWeight="700" fill="var(--foreground)">
        {isEn
          ? 'Chord Progression Energy Arc — Building Harmonic Tension & Returning Home to I'
          : '코드 진행 에너지 곡선 — 긴장이 쌓였다가 I(집)으로 되돌아오는 힘'}
      </text>

      <rect x="52" y="72" width="616" height="186" rx="12" fill="var(--secondary)" fillOpacity="0.35" stroke="var(--border)" />
      <path
        d={`M 120 ${chords[0].height} C 205 ${chords[0].height}, 205 ${chords[1].height}, 290 ${chords[1].height} S 375 ${chords[2].height}, 460 ${chords[2].height} S 540 ${chords[3].height}, 620 ${chords[3].height}`}
        fill="none"
        stroke="var(--primary)"
        strokeOpacity="0.45"
        strokeWidth="3"
      />

      {chords.map((c, i) => {
        const x = 124 + i * 158;
        const active = i === activeIdx;
        const pop = active ? spring({ frame: frame % 60, fps, config: { damping: 14, stiffness: 200 } }) : 0;
        return (
          <g key={`${c.name}-${i}`}>
            <rect
              x={x - 70}
              y="268"
              width="140"
              height="32"
              rx="8"
              fill={active ? 'var(--primary)' : 'var(--secondary)'}
              stroke={active ? 'var(--primary)' : 'var(--border)'}
            />
            <text x={x} y="288" textAnchor="middle" fontSize="11" fontWeight="700" fill={active ? '#ffffff' : 'var(--foreground)'}>
              {c.name} · {c.role}
            </text>
            <circle cx={x} cy={c.height} r={active ? 10 + pop * 3 : 7} fill={active ? 'var(--primary)' : 'var(--card)'} stroke="var(--primary)" strokeWidth="2.5" />
          </g>
        );
      })}

      <circle cx={dotX} cy={dotY} r="6" fill="var(--foreground)" opacity="0.85" />
    </g>
  );
};

/* ── 7. Relative Minor / Major Twin Root Flip (4-2) ───────────────────── */
const AM_BOX_DOTS: Array<{ str: GuitarString; fret: number; isA: boolean; isC: boolean }> = [
  { str: 6, fret: 5, isA: true, isC: false },
  { str: 6, fret: 8, isA: false, isC: true },
  { str: 5, fret: 5, isA: false, isC: false },
  { str: 5, fret: 7, isA: false, isC: false },
  { str: 4, fret: 5, isA: false, isC: false },
  { str: 4, fret: 7, isA: true, isC: false },
  { str: 3, fret: 5, isA: false, isC: true },
  { str: 3, fret: 7, isA: false, isC: false },
  { str: 2, fret: 5, isA: false, isC: false },
  { str: 2, fret: 8, isA: false, isC: false },
  { str: 1, fret: 5, isA: true, isC: false },
  { str: 1, fret: 8, isA: false, isC: true },
];

const RelativeFlipScene: React.FC<{ frame: number; fps: number; locale: Locale }> = ({ frame, fps, locale }) => {
  const isEn = locale === 'en';
  const isCMajor = frame >= 120;
  const pop = spring({ frame: isCMajor ? frame - 120 : frame, fps, config: { damping: 14, stiffness: 180 } });

  const left = 58;
  const fretW = 72;
  const topY = 82;
  const gap = 32;

  return (
    <g>
      <text x="58" y="54" fontSize="13" fontWeight="700" fill="var(--foreground)">
        {isEn
          ? '100% Identical Fret Notes — Shifting Only Your Home Root Note Flips the Mood'
          : '구성음 100% 동일 · 시작하는 주인공 음(Root)만 바꾸면 분위기 완전 반전'}
      </text>

      <rect x={left} y={topY - 12} width={fretW * 4} height={gap * 5 + 24} rx="8" fill="var(--secondary)" fillOpacity="0.4" stroke="var(--border)" />
      {[0, 1, 2, 3, 4].map((i) => (
        <g key={i}>
          <line x1={left + i * fretW} y1={topY - 12} x2={left + i * fretW} y2={topY + gap * 5 + 12} stroke="var(--border)" strokeWidth="1.5" />
          {i < 4 && (
            <text x={left + i * fretW + fretW / 2} y={topY + gap * 5 + 29} textAnchor="middle" fontSize="10.5" fontFamily="'JetBrains Mono', monospace" fill="var(--muted-foreground)">
              {5 + i}F
            </text>
          )}
        </g>
      ))}
      {[1, 2, 3, 4, 5, 6].map((s) => (
        <line key={s} x1={left} y1={getStringY(s as GuitarString, topY, gap)} x2={left + fretW * 4} y2={getStringY(s as GuitarString, topY, gap)} stroke="var(--muted-foreground)" strokeOpacity="0.4" strokeWidth={1 + (s - 1) * 0.3} />
      ))}

      {AM_BOX_DOTS.map((d) => {
        const cx = left + (d.fret - 5 + 0.5) * fretW;
        const cy = getStringY(d.str, topY, gap);
        const isRoot = isCMajor ? d.isC : d.isA;
        return (
          <g key={`${d.str}-${d.fret}`}>
            <circle
              cx={cx}
              cy={cy}
              r={isRoot ? 11 + pop * 3 : 8}
              fill={isRoot ? 'var(--primary)' : 'var(--card)'}
              stroke={isRoot ? 'var(--primary)' : 'var(--muted-foreground)'}
              strokeWidth="1.5"
            />
            {isRoot && (
              <text x={cx} y={cy + 3.5} textAnchor="middle" fontSize="9.5" fontWeight="700" fill="#ffffff">
                {isCMajor ? 'C' : 'A'}
              </text>
            )}
          </g>
        );
      })}

      {/* Mode Comparison Card */}
      <rect x="380" y="70" width="308" height="196" rx="12" fill="var(--secondary)" fillOpacity="0.45" stroke="var(--border)" />
      <rect
        x="398"
        y={isCMajor ? 174 : 88}
        width="272"
        height="72"
        rx="10"
        fill="var(--card)"
        stroke="var(--primary)"
        strokeWidth="2"
      />
      <text x="414" y="114" fontSize="13.5" fontWeight="700" fill={!isCMajor ? 'var(--primary)' : 'var(--muted-foreground)'}>
        {isEn ? 'A Minor (Root = A)' : 'A 마이너 (Root = A)'}
      </text>
      <text x="414" y="136" fontSize="11.5" fill="var(--muted-foreground)">
        {isEn ? 'Rock, Blues & Soulful Minor Center' : '블루스·록·애절한 솔로 중심축'}
      </text>
      <text x="414" y="200" fontSize="13.5" fontWeight="700" fill={isCMajor ? 'var(--primary)' : 'var(--muted-foreground)'}>
        {isEn ? 'C Major (Root = C)' : 'C 메이저 (Root = C)'}
      </text>
      <text x="414" y="222" fontSize="11.5" fill="var(--muted-foreground)">
        {isEn ? 'Pop, Country & Bright Major Lift' : '팝·컨트리·밝고 경쾌한 멜로디 중심축'}
      </text>
    </g>
  );
};

/* ── 8. Pentatonic Box Builder & Shift ─────────────────────────────────── */
const PentatonicBoxScene: React.FC<{ frame: number; fps: number; lesson: Lesson; locale: Locale }> = ({
  frame,
  fps,
  lesson,
  locale,
}) => {
  const isEn = locale === 'en';
  const isSlide = lesson.id === 'm4-3';
  const revealCount = Math.floor(interpolate(frame, [0, 180], [2, 12], { extrapolateRight: 'clamp' }));
  const slideShift = isSlide ? interpolate(frame, [130, 185], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) : 0;

  const left = 56;
  const fretW = 86;
  const topY = 82;
  const gap = 32;

  return (
    <g>
      <text x="56" y="54" fontSize="13" fontWeight="700" fill="var(--foreground)">
        {isSlide
          ? isEn
            ? 'Box 1 (5-8F) → Slide 3rd String Into Box 2 (8-10F) Upper Register'
            : '1번 박스(5~8F) → 3번 줄 슬라이드로 2번 박스(8~10F) 탈출 연결'
          : isEn
          ? 'Am7 Chord Tones (A-C-E-G) + 4th (D) = Foolproof 5-Note Pentatonic Box 1'
          : 'Am 코드톤(A-C-E-G) + 4도(D) = 실패 없는 5음 펜타토닉 1번 박스'}
      </text>

      <rect x={left} y={topY - 12} width={fretW * 6} height={gap * 5 + 24} rx="8" fill="var(--secondary)" fillOpacity="0.35" stroke="var(--border)" />
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <g key={i}>
          <line x1={left + i * fretW} y1={topY - 12} x2={left + i * fretW} y2={topY + gap * 5 + 12} stroke="var(--border)" strokeWidth="1.5" />
          {i < 6 && (
            <text x={left + i * fretW + fretW / 2} y={topY + gap * 5 + 29} textAnchor="middle" fontSize="10.5" fontFamily="'JetBrains Mono', monospace" fill="var(--muted-foreground)">
              {5 + i}F
            </text>
          )}
        </g>
      ))}
      {[1, 2, 3, 4, 5, 6].map((s) => (
        <line key={s} x1={left} y1={getStringY(s as GuitarString, topY, gap)} x2={left + fretW * 6} y2={getStringY(s as GuitarString, topY, gap)} stroke="var(--muted-foreground)" strokeOpacity="0.4" strokeWidth={1 + (s - 1) * 0.3} />
      ))}

      {AM_BOX_DOTS.slice(0, revealCount).map((d, idx) => {
        const cx = left + (d.fret - 5 + 0.5) * fretW;
        const cy = getStringY(d.str, topY, gap);
        const pop = idx === revealCount - 1 ? spring({ frame: frame % 15, fps, config: { damping: 14, stiffness: 200 } }) : 1;
        return (
          <circle
            key={`${d.str}-${d.fret}`}
            cx={cx}
            cy={cy}
            r={d.isA ? 11 * Math.max(0.7, pop) : 8.5 * Math.max(0.7, pop)}
            fill={d.isA ? 'var(--primary)' : '#5B7C99'}
          />
        );
      })}

      {isSlide && (
        <g opacity={0.3 + 0.7 * slideShift}>
          <line
            x1={left + 2.5 * fretW}
            y1={getStringY(3, topY, gap)}
            x2={left + (2.5 + 2 * slideShift) * fretW}
            y2={getStringY(3, topY, gap)}
            stroke="var(--primary)"
            strokeWidth="3.5"
          />
          <circle cx={left + (2.5 + 2 * slideShift) * fretW} cy={getStringY(3, topY, gap)} r="12" fill="var(--primary)" />
          <circle cx={left + 5.5 * fretW} cy={getStringY(2, topY, gap)} r="10" fill="#5C8D76" opacity={slideShift} />
        </g>
      )}
    </g>
  );
};

/* ── 9. Layer 4: Pentatonic + 2 Color Notes / Blue Note Fill ───────────── */
const ScaleColorFillScene: React.FC<{ frame: number; fps: number; lesson: Lesson; locale: Locale }> = ({
  frame,
  fps,
  lesson,
  locale,
}) => {
  const isEn = locale === 'en';
  const isBlueNote = lesson.id === 'm5-2';
  const showColor = frame >= 75;
  const colorPop = showColor ? spring({ frame: frame - 75, fps, config: { damping: 14, stiffness: 200 } }) : 0;

  const left = 56;
  const fretW = 92;
  const topY = 82;
  const gap = 32;

  const colorTargets: Array<{ str: GuitarString; fret: number; label: string }> = isBlueNote
    ? [{ str: 3, fret: 8, label: 'b5' }]
    : lesson.id === 'm7-4'
      ? [
          { str: 4, fret: 6, label: '#7' },
          { str: 2, fret: 9, label: '#7' },
        ]
      : [
          { str: 6, fret: 7, label: '2' },
          { str: 5, fret: 8, label: 'b6' },
          { str: 4, fret: 9, label: '2' },
          { str: 2, fret: 6, label: 'b6' },
        ];

  return (
    <g>
      <text x="56" y="54" fontSize="13" fontWeight="700" fill="var(--foreground)">
        {isBlueNote
          ? isEn
            ? 'Pentatonic 5-Note Skeleton + Chromatic Blue Note (b5) Tension & Release'
            : '펜타토닉 5음 뼈대 + 크로매틱 블루 노트(b5) 긴장과 해결'
          : isEn
          ? 'Layer Just 2 Color Tones (2nd & b6th) Onto Pentatonic to Complete Full 7-Note Scale'
          : '펜타토닉 5음 뼈대 위에 컬러 노트(2도·b6도)를 얹어 7음 스케일 완성'}
      </text>

      <rect x={left} y={topY - 12} width={fretW * 5} height={gap * 5 + 24} rx="8" fill="var(--secondary)" fillOpacity="0.35" stroke="var(--border)" />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <g key={i}>
          <line x1={left + i * fretW} y1={topY - 12} x2={left + i * fretW} y2={topY + gap * 5 + 12} stroke="var(--border)" strokeWidth="1.5" />
          {i < 5 && (
            <text x={left + i * fretW + fretW / 2} y={topY + gap * 5 + 29} textAnchor="middle" fontSize="10.5" fontFamily="'JetBrains Mono', monospace" fill="var(--muted-foreground)">
              {5 + i}F
            </text>
          )}
        </g>
      ))}
      {[1, 2, 3, 4, 5, 6].map((s) => (
        <line key={s} x1={left} y1={getStringY(s as GuitarString, topY, gap)} x2={left + fretW * 5} y2={getStringY(s as GuitarString, topY, gap)} stroke="var(--muted-foreground)" strokeOpacity="0.4" strokeWidth={1 + (s - 1) * 0.3} />
      ))}

      {/* Base Pentatonic Dots (Muted Slate) */}
      {AM_BOX_DOTS.map((d) => (
        <circle
          key={`${d.str}-${d.fret}`}
          cx={left + (d.fret - 5 + 0.5) * fretW}
          cy={getStringY(d.str, topY, gap)}
          r="9"
          fill="var(--card)"
          stroke="var(--muted-foreground)"
          strokeWidth="1.5"
        />
      ))}

      {/* Color Dots */}
      {showColor &&
        colorTargets.map((ct) => {
          const cx = left + (ct.fret - 5 + 0.5) * fretW;
          const cy = getStringY(ct.str, topY, gap);
          return (
            <g key={`${ct.str}-${ct.fret}`} opacity={colorPop}>
              <circle cx={cx} cy={cy} r={14 * Math.max(0.5, colorPop)} fill="var(--primary)" />
              <text x={cx} y={cy + 4} textAnchor="middle" fontSize="10.5" fontWeight="700" fill="#ffffff">
                {ct.label}
              </text>
            </g>
          );
        })}

      {isBlueNote && frame >= 150 && (
        <path
          d={`M ${left + 3.5 * fretW} ${getStringY(3, topY, gap) - 16} Q ${left + 3 * fretW} ${getStringY(3, topY, gap) - 38} ${left + 2.5 * fretW} ${getStringY(3, topY, gap) - 14}`}
          fill="none"
          stroke="var(--primary)"
          strokeWidth="2.5"
        />
      )}

      {/* Legend */}
      <rect x="536" y="76" width="154" height="106" rx="10" fill="var(--secondary)" fillOpacity="0.45" stroke="var(--border)" />
      <circle cx="556" cy="108" r="7" fill="var(--card)" stroke="var(--muted-foreground)" strokeWidth="1.5" />
      <text x="572" y="112" fontSize="11" fill="var(--muted-foreground)">
        {isEn ? 'Pentatonic 5 Notes' : '펜타토닉 기본 5음'}
      </text>
      <circle cx="556" cy="144" r="8" fill="var(--primary)" opacity={showColor ? 1 : 0.35} />
      <text x="572" y="148" fontSize="11" fontWeight="700" fill="var(--foreground)">
        {isBlueNote
          ? isEn ? 'Blue Note (b5) Pull' : '블루노트(b5) 해결'
          : isEn ? 'Added Color Notes' : '추가 컬러 음정'}
      </text>
    </g>
  );
};

/* ── 10. Bend Pitch-Up Lock Scene (6-3, 8-4) ───────────────────────────── */
const BendPitchLockScene: React.FC<{ frame: number; fps: number; locale: Locale }> = ({ frame, fps, locale }) => {
  const isEn = locale === 'en';
  const bendPct = interpolate(frame, [52, 130, 195, 225], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const locked = bendPct > 0.94;
  const lockPop = locked ? spring({ frame: Math.max(0, frame - 130), fps, config: { damping: 14, stiffness: 200 } }) : 0;

  const stringBaseY = 186;
  const bendPushY = stringBaseY - bendPct * 42;

  return (
    <g>
      <text x="52" y="54" fontSize="13" fontWeight="700" fill="var(--foreground)">
        {isEn
          ? '3rd Str 7F (4th: D) → Bend Smoothly to Match Target Pitch 9F (5th: E, +200 cents)'
          : '3번 줄 7F(4도 D) → 줄 밀어올려 9F(5도 E) 목표 음정 정확히 도달하기 (+200 cents)'}
      </text>

      {/* Left String Push Visualization */}
      <rect x="52" y="72" width="376" height="202" rx="12" fill="var(--secondary)" fillOpacity="0.35" stroke="var(--border)" />
      {[0, 1, 2, 3].map((f) => (
        <g key={f}>
          <line x1={104 + f * 78} y1="88" x2={104 + f * 78} y2="254" stroke="var(--border)" strokeWidth="1.6" />
          {f < 3 && (
            <text x={143 + f * 78} y="268" textAnchor="middle" fontSize="10.5" fontFamily="'JetBrains Mono', monospace" fill="var(--muted-foreground)">
              {7 + f}F
            </text>
          )}
        </g>
      ))}
      <line x1="72" y1="126" x2="404" y2="126" stroke="var(--muted-foreground)" strokeOpacity="0.3" strokeWidth="1.5" />
      <line x1="72" y1="226" x2="404" y2="226" stroke="var(--muted-foreground)" strokeOpacity="0.3" strokeWidth="2.4" />

      {/* Ghost target pitch dot at 9F */}
      <circle cx="299" cy={stringBaseY} r="12" fill="none" stroke="var(--primary)" strokeDasharray="3 3" strokeWidth="1.5" opacity="0.65" />
      <text x="299" y={stringBaseY + 4} textAnchor="middle" fontSize="10" fontWeight="700" fill="var(--primary)" opacity="0.8">
        {isEn ? 'E (Target)' : 'E(목표)'}
      </text>

      {/* Bending String */}
      <path
        d={`M 72 ${stringBaseY} Q 143 ${bendPushY} 404 ${stringBaseY}`}
        fill="none"
        stroke={locked ? 'var(--primary)' : 'var(--foreground)'}
        strokeWidth="2.8"
      />
      <circle cx="143" cy={bendPushY} r="14" fill="var(--primary)" />
      <text x="143" y={bendPushY + 4} textAnchor="middle" fontSize="10.5" fontWeight="700" fill="#ffffff">D</text>

      {/* Right Pitch Cent Gauge */}
      <rect x="448" y="72" width="224" height="202" rx="12" fill="var(--secondary)" fillOpacity="0.45" stroke={locked ? 'var(--primary)' : 'var(--border)'} strokeWidth="1.5" />
      <text x="560" y="102" textAnchor="middle" fontSize="12" fontWeight="700" fill="var(--foreground)">
        {isEn ? 'Live Target Pitch Gauge' : '실시간 피치 도달 게이지'}
      </text>
      <rect x="484" y="124" width="152" height="14" rx="7" fill="var(--card)" stroke="var(--border)" />
      <rect x="484" y="124" width={152 * bendPct} height="14" rx="7" fill="var(--primary)" />
      <text x="560" y="168" textAnchor="middle" fontSize="22" fontWeight="800" fontFamily="'JetBrains Mono', monospace" fill={locked ? 'var(--primary)' : 'var(--foreground)'}>
        +{Math.round(bendPct * 200)}c
      </text>
      <g transform={`translate(560, 218) scale(${0.8 + 0.2 * lockPop})`}>
        <rect x="-74" y="-14" width="148" height="28" rx="14" fill={locked ? 'var(--primary)' : 'var(--card)'} stroke="var(--border)" />
        <text x="0" y="4" textAnchor="middle" fontSize="11" fontWeight="700" fill={locked ? '#ffffff' : 'var(--muted-foreground)'}>
          {locked ? (isEn ? 'Target E Locked!' : '목표 음 E 도달!') : (isEn ? 'Raising Pitch…' : '음정 상승 중…')}
        </text>
      </g>
    </g>
  );
};

/* ── 11. Layer 5 Chord-Tone Landing (Module 5-4 / 7 / 8 / 9) ───────────── */
const ChordToneLeadScene: React.FC<{ frame: number; fps: number; lesson: Lesson; locale: Locale }> = ({
  frame,
  fps,
  lesson,
  locale,
}) => {
  const isEn = locale === 'en';
  const chords =
    lesson.chordProgression.length > 0
      ? lesson.chordProgression.slice(0, 4).map((c) => c.chordName)
      : ['Am7', 'Dm7', 'E7', 'Am7'];
  const activeIdx = Math.min(chords.length - 1, Math.floor((frame % 240) / (240 / chords.length)));

  const targetDots = [
    { str: 4 as GuitarString, fret: 7, name: 'R(A)', chordMatch: 0 },
    { str: 2 as GuitarString, fret: 6, name: 'b3(F)', chordMatch: 1 },
    { str: 4 as GuitarString, fret: 6, name: 'M3(G#)', chordMatch: 2 },
    { str: 3 as GuitarString, fret: 5, name: 'b3(C)', chordMatch: 3 },
  ];

  const left = 56;
  const fretW = 86;
  const topY = 122;
  const gap = 26;

  return (
    <g>
      <text x="56" y="54" fontSize="13" fontWeight="700" fill="var(--foreground)">
        {isEn
          ? 'Nail Chord Tones (3rd / Root) Right on Every Chord Change'
          : '코드가 바뀔 때 주인공 음(Chord Tone · 3도/루트)에 정확히 착지하기'}
      </text>

      {/* Top Chord Timeline Pills */}
      {chords.map((c, idx) => {
        const w = 138;
        const x = 56 + idx * 156;
        const active = idx === activeIdx;
        return (
          <g key={`${c}-${idx}`}>
            <rect
              x={x}
              y="68"
              width={w}
              height="32"
              rx="8"
              fill={active ? 'var(--primary)' : 'var(--secondary)'}
              stroke={active ? 'var(--primary)' : 'var(--border)'}
            />
            <text x={x + w / 2} y="88" textAnchor="middle" fontSize="12" fontWeight="700" fill={active ? '#ffffff' : 'var(--foreground)'}>
              {c}
            </text>
          </g>
        );
      })}

      <rect x={left} y={topY - 10} width={fretW * 5} height={gap * 5 + 20} rx="8" fill="var(--secondary)" fillOpacity="0.35" stroke="var(--border)" />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <g key={i}>
          <line x1={left + i * fretW} y1={topY - 10} x2={left + i * fretW} y2={topY + gap * 5 + 10} stroke="var(--border)" strokeWidth="1.4" />
          {i < 5 && (
            <text x={left + i * fretW + fretW / 2} y={topY + gap * 5 + 26} textAnchor="middle" fontSize="10" fontFamily="'JetBrains Mono', monospace" fill="var(--muted-foreground)">
              {5 + i}F
            </text>
          )}
        </g>
      ))}
      {[1, 2, 3, 4, 5, 6].map((s) => (
        <line key={s} x1={left} y1={getStringY(s as GuitarString, topY, gap)} x2={left + fretW * 5} y2={getStringY(s as GuitarString, topY, gap)} stroke="var(--muted-foreground)" strokeOpacity="0.4" strokeWidth={1 + (s - 1) * 0.28} />
      ))}

      {targetDots.map((t, idx) => {
        const cx = left + (t.fret - 5 + 0.5) * fretW;
        const cy = getStringY(t.str, topY, gap);
        const active = idx === activeIdx % targetDots.length;
        const pop = active ? spring({ frame: frame % 60, fps, config: { damping: 14, stiffness: 200 } }) : 0;
        return (
          <g key={`${t.name}-${idx}`}>
            <circle cx={cx} cy={cy} r={active ? 13 + pop * 3 : 9} fill={active ? 'var(--primary)' : '#5B7C99'} opacity={active ? 1 : 0.45} />
            <text x={cx} y={cy + 3.5} textAnchor="middle" fontSize="9" fontWeight="700" fill="#ffffff">
              {t.name.split('(')[0]}
            </text>
          </g>
        );
      })}

      {/* Right Summary Box */}
      <rect x="514" y="114" width="174" height="148" rx="10" fill="var(--secondary)" fillOpacity="0.45" stroke="var(--border)" />
      <text x="530" y="140" fontSize="11.5" fontWeight="700" fill="var(--foreground)">
        {isEn ? 'Solo Target Tip' : '솔로 타겟 팁'}
      </text>
      <text x="530" y="166" fontSize="11" fill="var(--muted-foreground)">
        {isEn ? '• On Beat 1 chord switch:' : '• 코드 변경 첫 박자에'}
      </text>
      <text x="530" y="184" fontSize="11" fill="var(--primary)" fontWeight="600">
        {isEn ? '  Land on 3rd or Root' : '  3도 또는 루트 착지'}
      </text>
      <text x="530" y="212" fontSize="11" fill="var(--muted-foreground)">
        {isEn ? '• Next beat: Leave rests' : '• 다음 박자는 쉼표(호흡)'}
      </text>
      <text x="530" y="238" fontSize="11" fill="var(--muted-foreground)">
        {isEn ? '• Sustain phrase vibrato' : '• 문장 끝 비브라토 유지'}
      </text>
    </g>
  );
};
