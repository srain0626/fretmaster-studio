'use client';

import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import type { GuitarString, Lesson } from '@/types/guitar';
import { getFingerColorHex } from '@/lib/musicTheory';
import { guitarSynthEngine } from '@/lib/guitarSynthEngine';
import type { Locale } from '@/lib/i18n';
import type { VideoAudioCue } from './ExplainerVideoShell';

export interface PostureCompositionProps {
  lesson: Lesson;
  locale?: Locale;
  [key: string]: unknown;
}

type PostureVariant =
  | 'pick-pendulum'
  | 'fretwire-cross-section'
  | 'palm-mute-bridge'
  | 'chord-touch-mute'
  | 'anchor-spider-grip'
  | 'legato-eye-shift'
  | 'bend-pivot'
  | 'ear-comp-jam';

export function resolvePostureVariant(lesson: Lesson): PostureVariant {
  if (lesson.id === 'm1-1' || lesson.id === 'm2-3' || lesson.id === 'm7-3') {
    return 'pick-pendulum';
  }
  if (lesson.id === 'm1-2') return 'fretwire-cross-section';
  if (lesson.id === 'm3-2' || lesson.id === 'm7-4') return 'palm-mute-bridge';
  if (
    lesson.id === 'm3-1' ||
    lesson.id === 'm3-3' ||
    lesson.id === 'm3-4' ||
    lesson.id === 'm7-1' ||
    lesson.id === 'm7-2' ||
    lesson.id === 'm7-5'
  ) {
    return 'chord-touch-mute';
  }
  if (lesson.id === 'm6-3' || lesson.id === 'm6-4' || lesson.id === 'm8-3' || lesson.id === 'm8-4') {
    return 'bend-pivot';
  }
  if (
    lesson.id === 'm6-1' ||
    lesson.id === 'm6-2' ||
    lesson.id === 'm4-3' ||
    lesson.id === 'm8-1' ||
    lesson.id === 'm8-2' ||
    lesson.id === 'm8-5' ||
    lesson.id === 'm8-6'
  ) {
    return 'legato-eye-shift';
  }
  if (lesson.phaseId === 'phase-4') return 'ear-comp-jam';
  return 'anchor-spider-grip';
}

export function getPostureMotionLabel(lesson: Lesson, locale: Locale = 'ko'): string {
  const isEn = locale === 'en';
  const variant = resolvePostureVariant(lesson);
  switch (variant) {
    case 'pick-pendulum':
      return isEn ? 'Posture · Pick Angle & Wrist Swing' : '자세 · 교정 · 피크 각도 & 손목 진자';
    case 'fretwire-cross-section':
      return isEn ? 'Posture · Fretwire Placement vs Buzz' : '자세 · 교정 · 프렛쇠 단면 & 버징 방지';
    case 'palm-mute-bridge':
      return isEn ? 'Posture · Bridge Saddle Palm Mute' : '자세 · 교정 · 브리지 새들 팜뮤트 위치';
    case 'chord-touch-mute':
      return isEn ? 'Posture · Index Flat Touch Muting' : '자세 · 교정 · 1번 검지 불필요 줄 터치 뮤트';
    case 'anchor-spider-grip':
      return isEn ? 'Posture · Anchor Finger & Rear Thumb' : '자세 · 교정 · 앵커 핑거 & 넥 뒷면 엄지';
    case 'legato-eye-shift':
      return lesson.id === 'm6-1'
        ? isEn ? 'Posture · Hammer Strike & Snap Pull' : '자세 · 교정 · 해머링 타격 & 풀오프 스냅'
        : isEn ? 'Posture · Eye-Lead Position Shift' : '자세 · 교정 · 시선 선행 포지션 이동';
    case 'bend-pivot':
      return isEn ? 'Posture · Thumb Pivot & 3-Finger Bend' : '자세 · 교정 · 엄지 지렛대 & 3손가락 서포트';
    case 'ear-comp-jam':
      return isEn ? 'Posture · Comp ↔ Solo Role Switch' : '자세 · 교정 · 반주 ↔ 솔로 호흡 전환';
  }
}

export function getPostureAudioCues(lesson: Lesson): VideoAudioCue[] {
  const variant = resolvePostureVariant(lesson);
  const amp = lesson.recommendedAmp;

  switch (variant) {
    case 'fretwire-cross-section':
      return [
        { frame: 24, trigger: () => guitarSynthEngine.playSingleGuitarNote(6, 2, 'clean', 0.4, 0, 'palm-mute') },
        { frame: 132, trigger: () => guitarSynthEngine.playSingleGuitarNote(6, 2, 'clean', 1.1) },
      ];
    case 'pick-pendulum':
      return [
        { frame: 28, trigger: () => guitarSynthEngine.playSingleGuitarNote(6, 0, amp, 0.5) },
        { frame: 84, trigger: () => guitarSynthEngine.playSingleGuitarNote(5, 0, amp, 0.5) },
        { frame: 140, trigger: () => guitarSynthEngine.playSingleGuitarNote(4, 0, amp, 0.5) },
        { frame: 196, trigger: () => guitarSynthEngine.playSingleGuitarNote(3, 0, amp, 0.5) },
      ];
    case 'palm-mute-bridge':
      return [
        { frame: 28, trigger: () => guitarSynthEngine.playSingleGuitarNote(6, 0, 'crunch', 0.4, 0, 'palm-mute') },
        { frame: 96, trigger: () => guitarSynthEngine.playSingleGuitarNote(6, 0, 'crunch', 0.35, 0, 'palm-mute') },
        { frame: 168, trigger: () => guitarSynthEngine.playSingleGuitarNote(6, 0, 'crunch', 0.9, 0, 'normal') },
      ];
    case 'chord-touch-mute':
      return [
        {
          frame: 40,
          trigger: () => {
            guitarSynthEngine.playSingleGuitarNote(5, 3, 'crunch', 0.75);
            setTimeout(() => guitarSynthEngine.playSingleGuitarNote(4, 5, 'crunch', 0.75), 22);
            setTimeout(() => guitarSynthEngine.playSingleGuitarNote(3, 5, 'crunch', 0.75), 44);
          },
        },
        {
          frame: 150,
          trigger: () => {
            guitarSynthEngine.playSingleGuitarNote(5, 5, 'crunch', 0.75);
            setTimeout(() => guitarSynthEngine.playSingleGuitarNote(4, 7, 'crunch', 0.75), 22);
            setTimeout(() => guitarSynthEngine.playSingleGuitarNote(3, 7, 'crunch', 0.75), 44);
          },
        },
      ];
    case 'legato-eye-shift':
      return lesson.id === 'm6-1'
        ? [
            { frame: 26, trigger: () => guitarSynthEngine.playSingleGuitarNote(3, 5, 'lead', 0.45) },
            { frame: 84, trigger: () => guitarSynthEngine.playSingleGuitarNote(3, 7, 'lead', 0.45, 0, 'hammer') },
            { frame: 152, trigger: () => guitarSynthEngine.playSingleGuitarNote(3, 5, 'lead', 0.8, 0, 'pull') },
          ]
        : [
            { frame: 36, trigger: () => guitarSynthEngine.playSingleGuitarNote(3, 7, amp, 0.7) },
            { frame: 148, trigger: () => guitarSynthEngine.playSingleGuitarNote(3, 9, amp, 0.9, 0, 'slide-up') },
          ];
    case 'bend-pivot':
      return [
        { frame: 48, trigger: () => guitarSynthEngine.playSingleGuitarNote(3, 7, 'lead', 1.2, 200, 'bend-full') },
        { frame: 170, trigger: () => guitarSynthEngine.playSingleGuitarNote(3, 9, 'lead', 0.9, 0, 'vibrato') },
      ];
    case 'ear-comp-jam':
      return [
        {
          frame: 28,
          trigger: () => {
            guitarSynthEngine.playSingleGuitarNote(4, 7, 'clean', 0.7);
            setTimeout(() => guitarSynthEngine.playSingleGuitarNote(3, 5, 'clean', 0.7), 20);
          },
        },
        { frame: 140, trigger: () => guitarSynthEngine.playSingleGuitarNote(2, 8, 'crunch', 0.85, 0, 'vibrato') },
      ];
    default:
      return [
        { frame: 24, trigger: () => guitarSynthEngine.playSingleGuitarNote(6, 5, amp, 0.55) },
        { frame: 74, trigger: () => guitarSynthEngine.playSingleGuitarNote(6, 6, amp, 0.55) },
        { frame: 124, trigger: () => guitarSynthEngine.playSingleGuitarNote(6, 7, amp, 0.55) },
        { frame: 174, trigger: () => guitarSynthEngine.playSingleGuitarNote(6, 8, amp, 0.7) },
      ];
  }
}

function buildWave(x1: number, x2: number, cy: number, amp: number, cycles: number, phase: number, jagged = false): string {
  const pts: string[] = [];
  const steps = 48;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = x1 + (x2 - x1) * t;
    const env = Math.sin(Math.PI * t);
    const osc = jagged
      ? ((i % 3) - 1) * amp * env
      : Math.sin(t * cycles * Math.PI * 2 + phase) * amp * env;
    pts.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${(cy + osc).toFixed(1)}`);
  }
  return pts.join(' ');
}

function VectorStatusIcon({ ok, x, y }: { ok: boolean; x: number; y: number }) {
  return (
    <g transform={`translate(${x}, ${y})`}>
      <circle
        cx="0"
        cy="0"
        r="10"
        fill={ok ? '#5C8D76' : '#B56357'}
      />
      {ok ? (
        <path d="M -4 0.5 L -1.2 3.5 L 4.5 -3" fill="none" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      ) : (
        <path d="M -3.5 -3.5 L 3.5 3.5 M 3.5 -3.5 L -3.5 3.5" fill="none" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" />
      )}
    </g>
  );
}

export const PostureExplainerComposition: React.FC<PostureCompositionProps> = ({
  lesson,
  locale = 'ko',
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const variant = resolvePostureVariant(lesson);

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
      <defs>
        <pattern id="postureGrid" width="24" height="24" patternUnits="userSpaceOnUse">
          <circle cx="12" cy="12" r="0.8" fill="var(--border)" opacity="0.55" />
        </pattern>
      </defs>
      <rect width="720" height="320" fill="url(#postureGrid)" />

      {variant === 'fretwire-cross-section' && <FretwireCrossSectionScene frame={frame} fps={fps} locale={locale} />}
      {variant === 'pick-pendulum' && <PickPendulumScene frame={frame} fps={fps} locale={locale} />}
      {variant === 'palm-mute-bridge' && <PalmMuteBridgeScene frame={frame} fps={fps} locale={locale} />}
      {variant === 'chord-touch-mute' && <ChordTouchMuteScene frame={frame} fps={fps} locale={locale} />}
      {variant === 'anchor-spider-grip' && <AnchorSpiderGripScene frame={frame} fps={fps} locale={locale} />}
      {variant === 'legato-eye-shift' && (
        <LegatoEyeShiftScene frame={frame} fps={fps} isHammer={lesson.id === 'm6-1'} locale={locale} />
      )}
      {variant === 'bend-pivot' && <BendPivotScene frame={frame} fps={fps} locale={locale} />}
      {variant === 'ear-comp-jam' && <EarCompJamScene frame={frame} fps={fps} locale={locale} />}
    </svg>
  );
};

/* ── 1. Fretwire Side Cross-Section (Buzz vs Crispbehind-Fret) ─────────── */
const FretwireCrossSectionScene: React.FC<{ frame: number; fps: number; locale: Locale }> = ({ frame, fps, locale }) => {
  const isEn = locale === 'en';
  const showGood = frame >= 115;
  const fingerPressT = interpolate(frame % 120, [10, 40, 100, 118], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const goodWave = buildWave(414, 676, 178 - fingerPressT * 4, 8, 5, frame * 0.55, false);
  const badWave = buildWave(58, 326, 178 - fingerPressT * 4, 5, 11, frame * 0.85, true);
  const pop = spring({ frame: showGood ? frame - 115 : frame, fps, config: { damping: 16, stiffness: 180 } });

  return (
    <g>
      <text x="44" y="54" fontSize="13" fontWeight="700" fill="var(--foreground)">
        {isEn
          ? 'Side Cross-Section: Why Pressing Just Behind the Fretwire Prevents Buzz'
          : '지판 옆면 단면 비교: 왜 프렛쇠 바로 뒤를 세워서 눌러야 버징(Buzz)이 안 날까?'}
      </text>

      {/* LEFT PANEL: Bad Center Press */}
      <rect x="44" y="72" width="302" height="222" rx="12" fill="var(--secondary)" fillOpacity={!showGood ? 0.55 : 0.25} stroke={!showGood ? '#B56357' : 'var(--border)'} strokeWidth={!showGood ? 1.8 : 1} />
      <VectorStatusIcon ok={false} x={68} y={96} />
      <text x="86" y="100" fontSize="12" fontWeight="700" fill="#B56357">
        {isEn ? 'Flat Finger Mid-Fret (Buzzes)' : '칸 한가운데를 눕혀 누름 (버징 발생)'}
      </text>

      {/* Wood board & fretwire crowns */}
      <rect x="64" y="196" width="262" height="44" rx="6" fill="var(--muted)" stroke="var(--border)" />
      {[120, 260].map((fx) => (
        <path key={fx} d={`M ${fx - 5} 196 Q ${fx} 183 ${fx + 5} 196 Z`} fill="var(--foreground)" opacity="0.6" />
      ))}

      {/* Flat collapsed finger far from right fretwire */}
      <g transform={`translate(154, ${132 + fingerPressT * 42})`}>
        <ellipse cx="0" cy="0" rx="28" ry="13" fill="#B56357" opacity="0.9" />
        <text x="0" y="4" textAnchor="middle" fontSize="10" fontWeight="700" fill="#ffffff">
          {isEn ? 'Flat Pad' : '평평한 손가락'}
        </text>
      </g>
      {/* Jagged buzzing string */}
      <path d={badWave} fill="none" stroke="#B56357" strokeWidth="2.4" />
      <text x="195" y="268" textAnchor="middle" fontSize="11" fontWeight="600" fill="#B56357">
        {isEn ? 'Poor wire contact → rattling string buzz' : '프렛쇠에 밀착되지 못해 지이잉 떨림'}
      </text>

      {/* RIGHT PANEL: Good Just Behind Fretwire */}
      <rect x="374" y="72" width="302" height="222" rx="12" fill="var(--secondary)" fillOpacity={showGood ? 0.55 : 0.25} stroke={showGood ? '#5C8D76' : 'var(--border)'} strokeWidth={showGood ? 1.8 : 1} />
      <VectorStatusIcon ok={true} x={398} y={96} />
      <text x="416" y="100" fontSize="12" fontWeight="700" fill="#5C8D76">
        {isEn ? '2mm Behind Fretwire · Upright Arch' : '프렛쇠 2mm 뒤 · 수직 아치형 세우기'}
      </text>

      <rect x="394" y="196" width="262" height="44" rx="6" fill="var(--muted)" stroke="var(--border)" />
      {[450, 590].map((fx) => (
        <path key={fx} d={`M ${fx - 5} 196 Q ${fx} 183 ${fx + 5} 196 Z`} fill="var(--primary)" />
      ))}

      {/* Arched upright finger just behind x=590 fretwire */}
      <g transform={`translate(568, ${126 + fingerPressT * 46}) scale(${0.95 + 0.05 * pop})`}>
        <path d="M -22 -28 Q -6 -40 4 0 L 14 14 L -6 16 L -18 -14 Z" fill="#5C8D76" />
        <circle cx="4" cy="12" r="9" fill="#5C8D76" />
      </g>
      {/* Clean crystalline string wave */}
      <path d={goodWave} fill="none" stroke="#5C8D76" strokeWidth="2.4" />
      <text x="525" y="268" textAnchor="middle" fontSize="11" fontWeight="700" fill="#5C8D76">
        {isEn ? 'Light pressure seals wire cleanly · Pure tone' : '가벼운 힘으로도 프렛쇠에 완벽 밀착 · 맑은 음'}
      </text>
    </g>
  );
};

/* ── 2. Right-Hand Pick Angle & Wrist Pendulum ─────────────────────────── */
const PickPendulumScene: React.FC<{ frame: number; fps: number; locale: Locale }> = ({ frame, fps, locale }) => {
  const isEn = locale === 'en';
  const phase = (frame % 120) / 120;
  const swingAngle = Math.sin(phase * Math.PI * 2) * 18;
  const isDown = Math.cos(phase * Math.PI * 2) > 0;
  const pickY = 174 + Math.sin(phase * Math.PI * 2) * 32;
  const pickGlow = spring({ frame: frame % 60, fps, config: { damping: 14, stiffness: 200 } });

  return (
    <g>
      <text x="48" y="54" fontSize="13" fontWeight="700" fill="var(--foreground)">
        {isEn
          ? '35-40° Pick Edge Slant & Wrist Pendulum (Down ↓ / Up ↑) — Relax Entire Arm'
          : '피크 35~40° 사선 각도 & 손목 회전 진자(Down ↓ / Up ↑) — 팔 전체 움직임 금지'}
      </text>

      {/* Left Side: Cross-section of Pick slicing String at 40 deg */}
      <rect x="48" y="72" width="320" height="220" rx="12" fill="var(--secondary)" fillOpacity="0.4" stroke="var(--border)" />
      <text x="208" y="98" textAnchor="middle" fontSize="12" fontWeight="700" fill="var(--foreground)">
        {isEn ? 'Pick-to-String Slicing Angle' : '피크-줄 접촉 각도 (빗겨 치기)'}
      </text>

      {/* Cross-section strings */}
      {[0, 1, 2].map((i) => (
        <circle key={i} cx={158 + i * 50} cy="196" r={6 - i} fill="var(--muted-foreground)" />
      ))}

      {/* Angled Pick */}
      <g transform={`translate(208, ${pickY}) rotate(${36 + swingAngle * 0.4})`}>
        <polygon points="-14,-34 14,-34 0,4" fill="var(--primary)" opacity="0.92" />
        <line x1="-18" y1="8" x2="18" y2="8" stroke="var(--foreground)" strokeOpacity="0.2" strokeDasharray="3 3" />
      </g>

      <rect x="76" y="246" width="264" height="30" rx="8" fill="var(--card)" stroke="var(--border)" />
      <text x="208" y="265" textAnchor="middle" fontSize="11" fontWeight="600" fill="var(--primary)">
        {isDown
          ? isEn ? 'DOWN ↓ Glides across string edge' : 'DOWN ↓ 줄을 비스듬히 스치며 통과'
          : isEn ? 'UP ↑ Snag-free clean return' : 'UP ↑ 걸림 없이 자연스럽게 복귀'}
      </text>

      {/* Right Side: Wrist Pivot vs Stiff Arm */}
      <rect x="386" y="72" width="290" height="220" rx="12" fill="var(--secondary)" fillOpacity="0.4" stroke="var(--border)" />
      <text x="531" y="98" textAnchor="middle" fontSize="12" fontWeight="700" fill="var(--foreground)">
        {isEn ? 'Pivot Axis (Compact Wrist vs Elbow)' : '회전 중심축 비교 (손목 vs 팔꿈치)'}
      </text>

      {/* Pendulum arc */}
      <path d="M 466 206 A 76 76 0 0 1 596 206" fill="none" stroke="var(--border)" strokeWidth="2" strokeDasharray="4 4" />
      <g transform={`translate(531, 148) rotate(${swingAngle})`}>
        <line x1="0" y1="0" x2="0" y2="74" stroke="var(--primary)" strokeWidth="3.5" strokeLinecap="round" />
        <circle cx="0" cy="74" r={10 + pickGlow * 1.5} fill="var(--primary)" />
      </g>
      <circle cx="531" cy="148" r="10" fill="var(--foreground)" />
      <text x="531" y="132" textAnchor="middle" fontSize="10.5" fontWeight="700" fill="var(--foreground)">
        {isEn ? 'Wrist Pivot' : '손목 회전축'}
      </text>
      <text x="531" y="266" textAnchor="middle" fontSize="11" fill="var(--muted-foreground)">
        {isEn ? 'Smaller swing radius unlocks fast alternate speeds' : '축이 작을수록 16비트 고속 연주 가능'}
      </text>
    </g>
  );
};

/* ── 3. Palm Mute Saddle Bridge Placement ──────────────────────────────── */
const PalmMuteBridgeScene: React.FC<{ frame: number; fps: number; locale: Locale }> = ({ frame, fps, locale }) => {
  const isEn = locale === 'en';
  const phase = Math.floor((frame % 240) / 80); // 0 = PM OK, 1 = Too Far Dead, 2 = Open Lift
  const palmX = phase === 0 ? 182 : phase === 1 ? 268 : 178;
  const palmY = phase === 2 ? 124 : 176;
  const smoothPop = spring({ frame: frame % 80, fps, config: { damping: 16, stiffness: 180 } });

  const wave = buildWave(
    220,
    648,
    186,
    phase === 0 ? 7 : phase === 1 ? 1.5 : 19,
    phase === 0 ? 7 : 4,
    frame * 0.45
  );

  return (
    <g>
      <text x="48" y="54" fontSize="13" fontWeight="700" fill="var(--foreground)">
        {isEn
          ? '5mm Palm Placement Precision — Rest Palm Edge Lightly on Bridge Saddles'
          : '오른손 날(Palm) 위치 5mm 차이로 바뀌는 톤 — 브리지 새들 위에서 가볍게 걸치기'}
      </text>

      <rect x="48" y="72" width="628" height="220" rx="12" fill="var(--secondary)" fillOpacity="0.4" stroke="var(--border)" />

      {/* Guitar Body & Bridge Saddle Silhouette */}
      <rect x="76" y="198" width="576" height="58" rx="6" fill="var(--muted)" stroke="var(--border)" />
      <rect x="136" y="182" width="44" height="18" rx="3" fill="var(--foreground)" opacity="0.7" />
      <text x="158" y="220" textAnchor="middle" fontSize="10" fontWeight="700" fill="var(--muted-foreground)">
        {isEn ? 'Bridge Saddle' : '브리지 새들'}
      </text>

      <rect x="242" y="192" width="66" height="12" rx="2" fill="var(--muted-foreground)" opacity="0.4" />
      <text x="275" y="220" textAnchor="middle" fontSize="10" fill="var(--muted-foreground)">
        {isEn ? 'Pickup' : '픽업'}
      </text>

      {/* String & Wave */}
      <path d={wave} fill="none" stroke={phase === 1 ? '#B56357' : phase === 0 ? 'var(--primary)' : '#5C8D76'} strokeWidth="2.8" />

      {/* Palm Heel Silhouette */}
      <g transform={`translate(${palmX}, ${palmY}) scale(${0.96 + 0.04 * smoothPop})`}>
        <rect x="-32" y="-34" width="64" height="36" rx="16" fill={phase === 1 ? '#B56357' : phase === 2 ? '#5C8D76' : 'var(--primary)'} opacity="0.88" />
        <text x="0" y="-12" textAnchor="middle" fontSize="10.5" fontWeight="700" fill="#ffffff">
          {isEn ? 'Palm Heel' : '손날'}
        </text>
      </g>

      {/* Phase Status Banner */}
      <VectorStatusIcon ok={phase !== 1} x={86} y={106} />
      <text x="106" y="110" fontSize="12" fontWeight="700" fill="var(--foreground)">
        {phase === 0
          ? isEn
            ? 'OK · Sweet-Spot PM: 2mm ahead of saddle → tight percussive low chug'
            : 'O 정확한 팜뮤트: 새들 바로 앞 2mm 가볍게 터치 → 묵직하고 또렷한 저음 타격'
          : phase === 1
            ? isEn
              ? 'NO · Too Far Forward: Covering pickups chokes pitch into dead thuds'
              : 'X 너무 앞으로 이동: 픽업 위까지 덮으면 음정이 죽어 먹통 소리 발생'
            : isEn
              ? 'OK · Open Accent: Lift palm heel 1cm for explosive chord ring!'
              : 'O 오픈 악센트: 손날을 1cm 살짝 들어 올려 전음역 폭발!'}
      </text>
    </g>
  );
};

/* ── 4. Power Chord Index Flat Touch Mute ──────────────────────────────── */
const ChordTouchMuteScene: React.FC<{ frame: number; fps: number; locale: Locale }> = ({ frame, fps, locale }) => {
  const isEn = locale === 'en';
  const sweepProgress = (frame % 120) / 120;
  const pickY = 82 + sweepProgress * 186;
  const hitPop = spring({ frame: frame % 120, fps, config: { damping: 14, stiffness: 200 } });

  const stringRows: Array<{ s: GuitarString; status: 'ring' | 'mute'; label: string }> = [
    { s: 1, status: 'mute', label: isEn ? '× Muted by Index Pad' : '× 검지 배로 뮤트' },
    { s: 2, status: 'mute', label: isEn ? '× Muted by Index Pad' : '× 검지 배로 뮤트' },
    { s: 3, status: 'mute', label: isEn ? '× Muted by Index Pad' : '× 검지 배로 뮤트' },
    { s: 4, status: 'ring', label: isEn ? '• Str 4 (Pinky 7F) Rings' : '● 4번 줄 (소지 7F) 울림' },
    { s: 5, status: 'ring', label: isEn ? '• Str 5 (Ring 7F) Rings' : '● 5번 줄 (약지 7F) 울림' },
    { s: 6, status: 'ring', label: isEn ? '• Str 6 (Index 5F) Rings' : '● 6번 줄 (검지 5F) 울림' },
  ];

  return (
    <g>
      <text x="48" y="54" fontSize="12.5" fontWeight="700" fill="var(--foreground)">
        {isEn
          ? 'Fret Root with Index Tip While Draping Index Underside Lightly Over Strings 1-3'
          : '검지(1) 끝으로 누르고 손가락 배로 아래 1·2·3번 줄을 가볍게 덮어 소음 차단'}
      </text>

      <rect x="48" y="72" width="412" height="220" rx="12" fill="var(--secondary)" fillOpacity="0.4" stroke="var(--border)" />
      {[0, 1, 2, 3].map((f) => (
        <line key={f} x1={104 + f * 88} y1="86" x2={104 + f * 88} y2="274" stroke="var(--border)" strokeWidth="1.5" />
      ))}

      {stringRows.map((row) => {
        const y = 96 + (row.s - 1) * 32;
        const passed = pickY >= y - 4;
        return (
          <g key={row.s}>
            <line
              x1="76"
              y1={y}
              x2="438"
              y2={y}
              stroke={row.status === 'ring' && passed ? 'var(--primary)' : 'var(--muted-foreground)'}
              strokeOpacity={row.status === 'mute' ? 0.35 : 0.85}
              strokeWidth={1 + (row.s - 1) * 0.35}
            />
            {row.status === 'mute' && (
              <g>
                <rect x="134" y={y - 10} width="26" height="20" rx="6" fill="var(--card)" stroke="#B56357" strokeWidth="1.2" />
                <text x="147" y={y + 4} textAnchor="middle" fontSize="11" fontWeight="700" fill="#B56357">×</text>
              </g>
            )}
          </g>
        );
      })}

      {/* Translucent Flat Index Finger Draping over 5..1 */}
      <rect x="132" y="88" width="30" height="178" rx="14" fill="#5B7C99" fillOpacity="0.22" stroke="#5B7C99" strokeDasharray="4 3" strokeWidth="1.5" />
      <circle cx="147" cy={96 + 5 * 32} r="13" fill="#5B7C99" />
      <text x="147" y={96 + 5 * 32 + 4} textAnchor="middle" fontSize="11" fontWeight="700" fill="#ffffff">1</text>

      <circle cx="324" cy={96 + 4 * 32} r="13" fill="#B88648" />
      <text x="324" y={96 + 4 * 32 + 4} textAnchor="middle" fontSize="11" fontWeight="700" fill="#ffffff">3</text>

      <circle cx="324" cy={96 + 3 * 32} r="13" fill="#B56357" />
      <text x="324" y={96 + 3 * 32 + 4} textAnchor="middle" fontSize="11" fontWeight="700" fill="#ffffff">4</text>

      {/* Animated Strum Sweep Line */}
      <line x1="398" y1="84" x2="398" y2="270" stroke="var(--border)" strokeWidth="2" />
      <circle cx="398" cy={pickY} r={8 + hitPop * 1.5} fill="var(--primary)" />

      {/* Right Status Legend */}
      <rect x="476" y="72" width="198" height="220" rx="12" fill="var(--secondary)" fillOpacity="0.45" stroke="var(--border)" />
      {stringRows.map((row, idx) => (
        <text
          key={row.s}
          x="492"
          y={104 + idx * 32}
          fontSize="11"
          fontWeight={row.status === 'ring' ? '700' : '500'}
          fill={row.status === 'ring' ? 'var(--primary)' : 'var(--muted-foreground)'}
        >
          {row.label}
        </text>
      ))}
    </g>
  );
};

/* ── 5. Anchor Finger & Counter-Thumb Spider Grip ──────────────────────── */
const AnchorSpiderGripScene: React.FC<{ frame: number; fps: number; locale: Locale }> = ({ frame, fps, locale }) => {
  const isEn = locale === 'en';
  const step = Math.min(4, Math.floor((frame % 200) / 48) + 1);

  return (
    <g>
      <text x="48" y="54" fontSize="13" fontWeight="700" fill="var(--foreground)">
        {isEn
          ? 'Anchor Finger Law: Keep Earlier Fingers Planted as the Next Finger Steps Up'
          : '앵커 핑거(Anchor Finger): 다음 손가락을 짚을 때 이전 손가락을 떼지 말고 지판에 붙이기'}
      </text>

      {/* Top-down 5-8F Spider Walking */}
      <rect x="48" y="72" width="388" height="220" rx="12" fill="var(--secondary)" fillOpacity="0.4" stroke="var(--border)" />
      {[0, 1, 2, 3, 4].map((i) => (
        <g key={i}>
          <line x1={94 + i * 74} y1="90" x2={94 + i * 74} y2="262" stroke="var(--border)" strokeWidth="1.6" />
          {i < 4 && (
            <text x={131 + i * 74} y="278" textAnchor="middle" fontSize="10.5" fontFamily="'JetBrains Mono', monospace" fill="var(--muted-foreground)">
              {5 + i}F
            </text>
          )}
        </g>
      ))}
      {[1, 2, 3, 4, 5, 6].map((s) => (
        <line key={s} x1="72" y1={104 + (s - 1) * 28} x2="412" y2={104 + (s - 1) * 28} stroke="var(--muted-foreground)" strokeOpacity="0.4" strokeWidth={1 + (s - 1) * 0.3} />
      ))}

      {[1, 2, 3, 4].map((finger) => {
        const active = step >= finger;
        const isCurrent = step === finger;
        const pop = isCurrent ? spring({ frame: frame % 48, fps, config: { damping: 14, stiffness: 200 } }) : 1;
        const cx = 131 + (finger - 1) * 74;
        const cy = 104 + 5 * 28;
        const col = getFingerColorHex(finger as 1 | 2 | 3 | 4);
        return (
          <g key={finger} opacity={active ? 1 : 0.2}>
            {active && (
              <circle cx={cx} cy={cy} r={17 + (isCurrent ? pop * 3 : 0)} fill="none" stroke={col} strokeOpacity="0.4" strokeWidth="1.5" />
            )}
            <circle cx={cx} cy={cy} r="14" fill={col} />
            <text x={cx} y={cy + 4} textAnchor="middle" fontSize="11.5" fontWeight="700" fill="#ffffff">{finger}</text>
          </g>
        );
      })}

      {/* Right Rear-Neck Thumb Pivot Card */}
      <rect x="452" y="72" width="224" height="220" rx="12" fill="var(--secondary)" fillOpacity="0.45" stroke="var(--border)" />
      <text x="564" y="98" textAnchor="middle" fontSize="12" fontWeight="700" fill="var(--foreground)">
        {isEn ? 'Rear-Neck Thumb Center Pivot' : '넥 뒷면 엄지 중앙 받침점'}
      </text>

      {/* Neck back profile */}
      <rect x="478" y="132" width="172" height="58" rx="10" fill="var(--card)" stroke="var(--border)" />
      <ellipse cx="564" cy="161" rx="22" ry="15" fill="var(--primary)" opacity="0.88" />
      <text x="564" y="165" textAnchor="middle" fontSize="10.5" fontWeight="700" fill="#ffffff">
        {isEn ? 'Thumb' : '엄지 축'}
      </text>
      <path d="M 540 161 L 496 161 M 588 161 L 632 161" stroke="var(--muted-foreground)" strokeWidth="1.8" strokeDasharray="3 3" />

      <text x="564" y="218" textAnchor="middle" fontSize="11" fontWeight="600" fill="#5C8D76">
        {isEn ? 'OK · Keep palm clear of lower neck' : 'O 손바닥이 넥 뒤에 닿지 않고'}
      </text>
      <text x="564" y="238" textAnchor="middle" fontSize="11" fill="var(--muted-foreground)">
        {isEn ? 'Thumb pad only frees Pinky (4) reach' : '엄지 지문만 대어야 4번 소지가 뻗음'}
      </text>
    </g>
  );
};

/* ── 6. Legato Snap & Eye-Lead Shifting ────────────────────────────────── */
const LegatoEyeShiftScene: React.FC<{ frame: number; fps: number; isHammer: boolean; locale: Locale }> = ({
  frame,
  fps,
  isHammer,
  locale,
}) => {
  const isEn = locale === 'en';
  if (isHammer) {
    const phase = frame < 85 ? 'anchor' : frame < 150 ? 'hammer' : 'pulloff';
    const hammerDrop = phase === 'hammer' ? spring({ frame: frame - 85, fps, config: { damping: 12, stiffness: 240 } }) : phase === 'pulloff' ? 1 : 0;
    const pullSnapY = phase === 'pulloff' ? interpolate(frame, [150, 185], [0, 24], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) : 0;

    return (
      <g>
        <text x="48" y="54" fontSize="13" fontWeight="700" fill="var(--foreground)">
          {isEn
            ? 'Legato (H · P): Drop Vertically for Hammer-On, Snap Slightly Down for Pull-Off!'
            : '레가토(H · P): 해머링은 망치처럼 수직 타격, 풀오프는 아래로 살짝 튕기듯 떼기!'}
        </text>
        <rect x="48" y="72" width="628" height="220" rx="12" fill="var(--secondary)" fillOpacity="0.4" stroke="var(--border)" />
        {[0, 1, 2, 3].map((f) => (
          <line key={f} x1={128 + f * 120} y1="90" x2={128 + f * 120} y2="262" stroke="var(--border)" strokeWidth="1.6" />
        ))}
        <line x1="88" y1="168" x2="628" y2="168" stroke="var(--foreground)" strokeOpacity="0.65" strokeWidth="2.5" />

        {/* 1st finger stays anchored on 5F */}
        <circle cx="188" cy="168" r="15" fill="#5B7C99" />
        <text x="188" y="172" textAnchor="middle" fontSize="11" fontWeight="700" fill="#ffffff">1(5F)</text>

        {/* 3rd finger hammering 7F and snapping downward */}
        <circle
          cx="428"
          cy={124 + hammerDrop * 44 + pullSnapY}
          r={phase === 'pulloff' && pullSnapY > 12 ? 12 : 16}
          fill="var(--primary)"
          opacity={pullSnapY > 20 ? 0.45 : 1}
        />
        <text
          x="428"
          y={128 + hammerDrop * 44 + pullSnapY}
          textAnchor="middle"
          fontSize="10.5"
          fontWeight="700"
          fill="#ffffff"
        >
          {phase === 'pulloff' ? (isEn ? 'P Snap ↓' : 'P 스냅 ↓') : (isEn ? 'H Strike!' : 'H 타격!')}
        </text>

        <text x="362" y="256" textAnchor="middle" fontSize="12" fontWeight="700" fill="var(--primary)">
          {phase === 'anchor'
            ? isEn ? 'Step 1: Anchor Index (5F) firmly to start' : '1단계: 검지(5F)를 단단히 짚고 준비'
            : phase === 'hammer'
              ? isEn ? 'Step 2 (H): Strike Ring (7F) straight down without picking!' : '2단계(H): 피킹 없이 약지(7F)로 수직 강타!'
              : isEn ? 'Step 3 (P): Flick finger gently downward—not straight up—for sustain!' : '3단계(P): 위로 들지 말고 아래로 뜯듯 떼어 음량 유지!'}
        </text>
      </g>
    );
  }

  // Eye-lead shifting
  const gazeArrived = frame >= 60;
  const handSlideT = interpolate(frame, [120, 175], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const handX = 188 + handSlideT * 240;

  return (
    <g>
      <text x="48" y="54" fontSize="13" fontWeight="700" fill="var(--foreground)">
        {isEn
          ? 'Eye-Lead Shifting: Spot Target Fret (9F) Half a Beat Ahead Before Hand Slides!'
          : '시선 선행(Eye-Lead Shifting): 손보다 눈이 0.5박 먼저 목표 프렛(9F)을 바라보면 정밀 이동!'}
      </text>
      <rect x="48" y="72" width="628" height="220" rx="12" fill="var(--secondary)" fillOpacity="0.4" stroke="var(--border)" />
      {[0, 1, 2, 3, 4].map((f) => (
        <g key={f}>
          <line x1={128 + f * 105} y1="90" x2={128 + f * 105} y2="262" stroke="var(--border)" strokeWidth="1.6" />
          {f < 4 && (
            <text x={180 + f * 105} y="278" textAnchor="middle" fontSize="10.5" fontFamily="'JetBrains Mono', monospace" fill="var(--muted-foreground)">
              {7 + f}F
            </text>
          )}
        </g>
      ))}
      <line x1="88" y1="176" x2="628" y2="176" stroke="var(--foreground)" strokeOpacity="0.65" strokeWidth="2.5" />

      {/* Target Gaze Reticle ahead at 9F */}
      <g opacity={gazeArrived ? 1 : 0.2}>
        <circle cx="428" cy="176" r="24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeDasharray="4 3" />
        <text x="428" y="138" textAnchor="middle" fontSize="11" fontWeight="700" fill="var(--primary)">
          {isEn ? '1. Lock Eyes First!' : '1. 시선 먼저 고정!'}
        </text>
      </g>

      {/* Sliding Finger */}
      <circle cx={handX} cy="176" r="15" fill="#5B7C99" />
      <text x={handX} y="180" textAnchor="middle" fontSize="10.5" fontWeight="700" fill="#ffffff">
        {handSlideT > 0.85 ? (isEn ? 'Lock!' : '도착!') : (isEn ? 'Slide' : '유지 이동')}
      </text>
    </g>
  );
};

/* ── 7. 3-Finger Stacked Bend + Thumb-Over Hinge Pivot ─────────────────── */
const BendPivotScene: React.FC<{ frame: number; fps: number; locale: Locale }> = ({ frame, fps, locale }) => {
  const isEn = locale === 'en';
  const pushT = interpolate(frame, [38, 125, 195, 225], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const pushY = pushT * 36;
  const wristAngle = -pushT * 22;
  const readyPop = spring({ frame: Math.max(0, frame - 120), fps, config: { damping: 14, stiffness: 200 } });

  return (
    <g>
      <text x="48" y="54" fontSize="13" fontWeight="700" fill="var(--foreground)">
        {isEn
          ? 'Bend Leverage: Hook Thumb Over Neck + Wrist Twist + Fingers 1-2-3 Stacked'
          : '벤딩 정석: 엄지를 넥 위에 걸고 손목 문고리 회전 + 1·2·3번 세 손가락이 함께 밀어올리기'}
      </text>

      <rect x="48" y="72" width="400" height="220" rx="12" fill="var(--secondary)" fillOpacity="0.4" stroke="var(--border)" />
      {[0, 1, 2, 3].map((f) => (
        <line key={f} x1={96 + f * 96} y1="106" x2={96 + f * 96} y2="274" stroke="var(--border)" strokeWidth="1.6" />
      ))}

      {/* Thumb Hooked Over Top Edge */}
      <rect x="150" y="84" width="176" height="24" rx="10" fill="var(--primary)" />
      <text x="238" y="100" textAnchor="middle" fontSize="10.5" fontWeight="700" fill="#ffffff">
        {isEn ? 'Thumb Pivot (Top Edge Hook)' : '엄지 지렛대 축 (상단 걸침)'}
      </text>

      {/* Bent string */}
      <path d={`M 68 214 Q 312 ${214 - pushY} 432 214`} fill="none" stroke="var(--primary)" strokeWidth="2.8" />

      {/* Fingers 1, 2, 3 stacked side-by-side */}
      {[
        { f: 1, x: 158, col: '#5B7C99' },
        { f: 2, x: 238, col: '#5C8D76' },
        { f: 3, x: 312, col: '#B88648' },
      ].map((item) => (
        <g key={item.f}>
          <circle cx={item.x} cy={214 - pushY * (item.f === 3 ? 1 : item.f === 2 ? 0.88 : 0.72)} r="13" fill={item.col} />
          <text x={item.x} y={218 - pushY * (item.f === 3 ? 1 : item.f === 2 ? 0.88 : 0.72)} textAnchor="middle" fontSize="10.5" fontWeight="700" fill="#ffffff">{item.f}</text>
        </g>
      ))}

      {/* Right Doorknob Rotation Indicator */}
      <rect x="466" y="72" width="210" height="220" rx="12" fill="var(--secondary)" fillOpacity="0.45" stroke="var(--border)" />
      <text x="571" y="98" textAnchor="middle" fontSize="12" fontWeight="700" fill="var(--foreground)">
        {isEn ? 'Doorknob Wrist Rotation' : '손목 회전 원리'}
      </text>
      <g transform={`translate(571, 174) rotate(${wristAngle})`}>
        <circle cx="0" cy="0" r="34" fill="var(--card)" stroke="var(--primary)" strokeWidth="2" />
        <line x1="-22" y1="0" x2="22" y2="0" stroke="var(--primary)" strokeWidth="4" strokeLinecap="round" />
        <circle cx="22" cy="0" r="5" fill="var(--primary)" />
      </g>
      <text x="571" y="250" textAnchor="middle" fontSize="11" fontWeight="700" fill={pushT > 0.85 ? 'var(--primary)' : 'var(--muted-foreground)'} opacity={0.6 + 0.4 * readyPop}>
        {pushT > 0.85
          ? isEn ? '3 Fingers Together + Wrist Pivot!' : '손가락 혼자 힘 X → 3손가락 합력!'
          : isEn ? 'Rotate forearm around thumb hinge' : '엄지 축으로 손목을 위로 회전'}
      </text>
    </g>
  );
};

/* ── 8. Phase IV Ear-Copy & COMP/SOLO Role Switch Posture ──────────────── */
const EarCompJamScene: React.FC<{ frame: number; fps: number; locale: Locale }> = ({ frame, fps, locale }) => {
  const isEn = locale === 'en';
  const isSolo = frame >= 120;
  const pop = spring({ frame: isSolo ? frame - 120 : frame, fps, config: { damping: 14, stiffness: 200 } });

  return (
    <g>
      <text x="48" y="54" fontSize="13" fontWeight="700" fill="var(--foreground)">
        {isEn
          ? 'Live Jam Role Switching: COMP (Steady Rhythm Grip) ↔ SOLO (Vocal Phrasing)'
          : '실전 잼 자세 전환: COMP(반주 · 안정 그립) ↔ SOLO(호흡 · 비브라토 표현 그립)'}
      </text>

      <rect x="48" y="76" width="296" height="212" rx="12" fill="var(--secondary)" fillOpacity={!isSolo ? 0.55 : 0.25} stroke={!isSolo ? 'var(--primary)' : 'var(--border)'} strokeWidth={!isSolo ? 2 : 1} />
      <text x="196" y="106" textAnchor="middle" fontSize="14" fontWeight="800" fill={!isSolo ? 'var(--primary)' : 'var(--foreground)'}>
        {isEn ? '1. COMP (Rhythm Chords)' : '1. COMP (리듬 코드 반주)'}
      </text>
      <text x="196" y="136" textAnchor="middle" fontSize="11.5" fill="var(--muted-foreground)">
        {isEn ? '• Crisp triad stabs on beats 1 & 2' : '• 1·2박 깔끔한 트라이어드 커팅'}
      </text>
      <text x="196" y="160" textAnchor="middle" fontSize="11.5" fill="var(--muted-foreground)">
        {isEn ? '• Loose 16th ghost groove scratches' : '• 오른손 16비트 셔플 고스트 스트로크'}
      </text>
      <rect x="116" y="196" width="160" height="34" rx="8" fill={!isSolo ? 'var(--primary)' : 'var(--card)'} stroke="var(--border)" transform={!isSolo ? `translate(${196 * (1 - (0.95 + 0.05 * pop))}, ${213 * (1 - (0.95 + 0.05 * pop))}) scale(${0.95 + 0.05 * pop})` : undefined} />
      <text x="196" y="217" textAnchor="middle" fontSize="11" fontWeight="700" fill={!isSolo ? '#ffffff' : 'var(--muted-foreground)'}>
        {isEn ? 'Leave Pocket Room' : '반주 공간 내어주기'}
      </text>

      <rect x="374" y="76" width="302" height="212" rx="12" fill="var(--secondary)" fillOpacity={isSolo ? 0.55 : 0.25} stroke={isSolo ? 'var(--primary)' : 'var(--border)'} strokeWidth={isSolo ? 2 : 1} />
      <text x="525" y="106" textAnchor="middle" fontSize="14" fontWeight="800" fill={isSolo ? 'var(--primary)' : 'var(--foreground)'}>
        {isEn ? '2. SOLO (Melodic Fills)' : '2. SOLO (선율 · 필인 응답)'}
      </text>
      <text x="525" y="136" textAnchor="middle" fontSize="11.5" fill="var(--muted-foreground)">
        {isEn ? '• Answer beats 3-4 with 3-note motifs' : '• 3·4박 빈 공간에 짧은 3음 모티프 삽입'}
      </text>
      <text x="525" y="160" textAnchor="middle" fontSize="11.5" fill="var(--muted-foreground)">
        {isEn ? '• Aim for chord tones via ear contour' : '• 귀로 높낮이/코드톤 먼저 듣고 프렛 연결'}
      </text>
      <rect x="445" y="196" width="160" height="34" rx="8" fill={isSolo ? 'var(--primary)' : 'var(--card)'} stroke="var(--border)" />
      <text x="525" y="217" textAnchor="middle" fontSize="11" fontWeight="700" fill={isSolo ? '#ffffff' : 'var(--muted-foreground)'}>
        {isEn ? 'Keep Breathing Rests' : '호흡과 여백 유지'}
      </text>
    </g>
  );
};
