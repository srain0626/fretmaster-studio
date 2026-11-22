'use client';

import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { STUDIO_SPRING } from '@/components/motion/StudioMotion';
import {
  findPossiblePositionsForMidi,
  getFingerColorHex,
  getIntervalLabel,
  getNoteMidi,
  midiToPitchClassName,
  resolveFretPositionForContext,
} from '@/lib/musicTheory';
import { useLocale } from '@/lib/i18n';
import type {
  AmpPreset,
  ChordBar,
  FretLabelMode,
  GuitarString,
  HummedNoteMapping,
  JudgmentTier,
  LivePitchData,
  NoteEvent,
  PhaseId,
  PracticeMode,
  ScaleOverlayNote,
} from '@/types/guitar';
import { Maximize2, Minimize2, Pause, Play, RotateCcw } from 'lucide-react';

interface ElectricFretboardProps {
  phaseId: PhaseId;
  notes: NoteEvent[];
  activeNoteIndex: number;
  scaleOverlay: ScaleOverlayNote[];
  currentChordBar?: ChordBar;
  focusFretRange: [number, number];
  keyCenterRootPc: number;
  labelMode: FretLabelMode;
  onLabelModeChange: (mode: FretLabelMode) => void;
  practiceMode: PracticeMode;
  judgmentTier: JudgmentTier;
  livePitch: LivePitchData;
  earCopyUnlockedIndices: Set<number>;
  earCopyHintLevel: number;
  hummedMappings?: HummedNoteMapping[];
  onFretClick?: (string: GuitarString, fret: number) => void;
  // Integrated Player Controls (Dribbble Video Player Bar aesthetic)
  isPlaying: boolean;
  onTogglePlay: () => void;
  onReset: () => void;
  currentBeat: number;
  totalBeats: number;
  bpm: number;
  minBpm: number;
  maxBpm: number;
  onBpmChange: (bpm: number) => void;
  ampPreset: AmpPreset;
  onAmpPresetChange: (preset: AmpPreset) => void;
}

const TOTAL_FRETS = 22;
const INLAY_SINGLE = [3, 5, 7, 9, 15, 17, 19, 21];
const INLAY_DOUBLE = [12];
const STRINGS_ORDER: GuitarString[] = [1, 2, 3, 4, 5, 6];
const STRING_NAMES: Record<GuitarString, string> = {
  1: 'e',
  2: 'B',
  3: 'G',
  4: 'D',
  5: 'A',
  6: 'E',
};

export function ElectricFretboard({
  phaseId,
  notes,
  activeNoteIndex,
  scaleOverlay,
  currentChordBar,
  focusFretRange,
  keyCenterRootPc,
  labelMode,
  onLabelModeChange,
  practiceMode,
  judgmentTier,
  livePitch,
  earCopyUnlockedIndices,
  earCopyHintLevel,
  hummedMappings = [],
  onFretClick,
  isPlaying,
  onTogglePlay,
  onReset,
  currentBeat,
  totalBeats,
  bpm,
  minBpm,
  maxBpm,
  onBpmChange,
  ampPreset,
  onAmpPresetChange,
}: ElectricFretboardProps) {
  const { tr } = useLocale();
  const [zoomFocus, setZoomFocus] = useState(true);
  const [showScaleBackdrop, setShowScaleBackdrop] = useState(true);

  const isPhase1 = phaseId === 'phase-1';
  const isPhase3Or4 = phaseId === 'phase-3' || phaseId === 'phase-4';

  const visibleRange = useMemo<[number, number]>(() => {
    if (!zoomFocus && isPhase3Or4) return [0, TOTAL_FRETS];
    const minF = Math.max(0, focusFretRange[0] - 1);
    const maxF = Math.min(TOTAL_FRETS, Math.max(focusFretRange[1] + 2, minF + 7));
    return [minF, maxF];
  }, [zoomFocus, isPhase3Or4, focusFretRange]);

  const currentNote = notes[activeNoteIndex] ?? null;
  const nextNote = notes[activeNoteIndex + 1] ?? null;

  const isBlindExam = judgmentTier === 'studio' && practiceMode === 'exam';
  const isEarCopy = practiceMode === 'earcopy';

  const shouldShowScale =
    !isPhase1 &&
    showScaleBackdrop &&
    !isBlindExam &&
    (!isEarCopy || earCopyHintLevel >= 1);

  const shouldShowActiveTarget =
    currentNote !== null &&
    !isBlindExam &&
    (!isEarCopy ||
      earCopyUnlockedIndices.has(activeNoteIndex) ||
      (earCopyHintLevel >= 2 && activeNoteIndex === 0) ||
      earCopyHintLevel >= 3);

  const shouldShowNextGhost =
    nextNote !== null &&
    !isBlindExam &&
    !isEarCopy &&
    (judgmentTier === 'relaxed' || judgmentTier === 'standard');

  const liveFretResolution = useMemo(() => {
    if (!livePitch.isActive || livePitch.nearestMidi <= 0) return null;

    if (
      livePitch.source === 'simulated' &&
      livePitch.detectedString &&
      livePitch.detectedFret !== undefined
    ) {
      const primary = { string: livePitch.detectedString, fret: livePitch.detectedFret };
      const unisons = findPossiblePositionsForMidi(livePitch.nearestMidi, 22).filter(
        (c) => !(c.string === primary.string && c.fret === primary.fret)
      );
      const targetForCheck = shouldShowActiveTarget ? currentNote : null;
      const matchedTarget = Boolean(
        targetForCheck &&
          (getNoteMidi(targetForCheck.string, targetForCheck.fret) === livePitch.nearestMidi ||
            targetForCheck.chordNotes?.some(
              (cn) => getNoteMidi(cn.string, cn.fret) === livePitch.nearestMidi
            ))
      );
      return { primary, unisons, matchedTarget };
    }

    return resolveFretPositionForContext(livePitch.nearestMidi, {
      targetNote: shouldShowActiveTarget ? currentNote : null,
      lessonNotes: isBlindExam || isEarCopy ? undefined : notes,
      scaleOverlay: shouldShowScale ? scaleOverlay : undefined,
      focusFretRange,
      visibleRange,
    });
  }, [
    livePitch.isActive,
    livePitch.nearestMidi,
    livePitch.source,
    livePitch.detectedString,
    livePitch.detectedFret,
    shouldShowActiveTarget,
    currentNote,
    isBlindExam,
    isEarCopy,
    notes,
    shouldShowScale,
    scaleOverlay,
    focusFretRange,
    visibleRange,
  ]);

  const fretsToDraw = useMemo(() => {
    const arr: number[] = [];
    for (let f = visibleRange[0]; f <= visibleRange[1]; f++) arr.push(f);
    return arr;
  }, [visibleRange]);

  const fretCount = fretsToDraw.length;
  const svgWidth = 980;
  const svgHeight = 236;
  const leftMargin = 42;
  const rightMargin = 20;
  const usableWidth = svgWidth - leftMargin - rightMargin;
  const colWidth = usableWidth / Math.max(1, fretCount);
  const topY = 30;
  const stringGap = 31;
  const boardHeight = stringGap * 5 + 24;

  const getColX = (fret: number) => {
    const idx = fret - visibleRange[0];
    return leftMargin + idx * colWidth + colWidth / 2;
  };

  const getStringY = (str: GuitarString) => {
    const idx = STRINGS_ORDER.indexOf(str);
    return topY + 12 + idx * stringGap;
  };

  const getBadgeText = (
    str: GuitarString,
    fret: number,
    finger: number,
    intervalLabel?: string
  ): string => {
    if (isPhase1 || labelMode === 'finger') return String(finger);
    if (labelMode === 'fret') return String(fret);
    const midi = getNoteMidi(str, fret);
    if (labelMode === 'note') return midiToPitchClassName(midi);
    return intervalLabel ?? getIntervalLabel(midi, keyCenterRootPc);
  };

  const activeBendProgress = useMemo(() => {
    if (!currentNote?.bendCents || !livePitch.isActive) return null;
    const baseMidi = getNoteMidi(currentNote.string, currentNote.fret);
    const centsRaised = (livePitch.midiFloat - baseMidi) * 100;
    const ratio = Math.max(0, Math.min(1.2, centsRaised / currentNote.bendCents));
    return {
      centsRaised: Math.round(centsRaised),
      targetCents: currentNote.bendCents,
      pct: Math.round(Math.min(100, ratio * 100)),
      onTarget: Math.abs(centsRaised - currentNote.bendCents) <= 25,
    };
  }, [currentNote, livePitch]);

  const chordPcSet = useMemo(
    () => new Set(currentChordBar?.chordMidiPitchClasses ?? []),
    [currentChordBar]
  );

  const progressPct = Math.max(0, Math.min(100, (currentBeat / Math.max(1, totalBeats)) * 100));

  return (
    <div className="rounded-2xl border border-border bg-card shadow-[0_1px_3px_rgba(15,23,42,0.04)] overflow-hidden">
      {/* Context-Aware Top Strip */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 pt-3 pb-1">
        {/* Muted 4-Finger Legend */}
        <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#5B7C99]" /> {tr('1 Index', '1 검지')}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#5C8D76]" /> {tr('2 Middle', '2 중지')}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#B88648]" /> {tr('3 Ring', '3 약지')}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#B56357]" /> {tr('4 Pinky', '4 소지')}
          </span>
        </div>

        {/* Live Pitch Resolution Readout */}
        {livePitch.isActive && liveFretResolution && (
          <div
            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[11px] font-mono tabular-nums ${
              liveFretResolution.matchedTarget
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                : 'border-border bg-muted/70 text-foreground'
            }`}
          >
            <span className="font-semibold">{livePitch.noteName}</span>
            <span className="text-muted-foreground">
              {tr(
                `S${liveFretResolution.primary.string} ${liveFretResolution.primary.fret}F`,
                `${liveFretResolution.primary.string}번줄 ${liveFretResolution.primary.fret}F`
              )}
            </span>
            <span className="text-muted-foreground">
              {livePitch.centsOff >= 0 ? `+${livePitch.centsOff}c` : `${livePitch.centsOff}c`}
            </span>
          </div>
        )}

        {/* Phase II+ Label Switcher & Scale Toggle (Hidden in Phase I) */}
        {!isPhase1 && (
          <div className="flex items-center gap-1.5">
            {(
              [
                { id: 'finger', label: tr('Finger', '손가락') },
                { id: 'interval', label: tr('Interval', '도수') },
                { id: 'note', label: tr('Note', '계이름') },
              ] as { id: FretLabelMode; label: string }[]
            ).map((item) => (
              <Button
                key={item.id}
                type="button"
                size="xs"
                variant={labelMode === item.id ? 'secondary' : 'ghost'}
                className={labelMode === item.id ? 'font-semibold text-foreground' : 'text-muted-foreground'}
                onClick={() => onLabelModeChange(item.id)}
              >
                {item.label}
              </Button>
            ))}

            <Button
              type="button"
              size="xs"
              variant={showScaleBackdrop ? 'secondary' : 'ghost'}
              className="text-xs"
              onClick={() => setShowScaleBackdrop((v) => !v)}
            >
              {tr('Scale', '스케일')}
            </Button>

            {isPhase3Or4 && (
              <Button
                type="button"
                size="xs"
                variant="ghost"
                onClick={() => setZoomFocus((v) => !v)}
                title={zoomFocus ? tr('Show all 22 frets', '22프렛 전체 보기') : tr('Zoom active range', '집중 구간 확대')}
              >
                {zoomFocus ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
              </Button>
            )}
          </div>
        )}
      </div>

      {/* SVG Guitar Fretboard */}
      <div className="px-3 py-1 overflow-x-auto">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full min-w-[640px] h-auto select-none"
          role="img"
          aria-label={tr('Electric Guitar Fretboard', '일렉트릭 기타 지판')}
        >
          {/* Matte Walnut Wood Surface (Non-neon) */}
          <rect
            x={leftMargin}
            y={topY}
            width={usableWidth}
            height={boardHeight}
            rx={8}
            fill="#2B2420"
            stroke="var(--border)"
            strokeWidth="1"
          />

          {/* Frets, Inlays, Numbers */}
          {fretsToDraw.map((fret) => {
            const cx = getColX(fret);
            const rightEdge = cx + colWidth / 2;
            const isOpenCol = fret === 0;
            const isSingleDot = INLAY_SINGLE.includes(fret);
            const isDoubleDot = INLAY_DOUBLE.includes(fret);
            const midY = topY + boardHeight / 2;

            return (
              <g key={fret}>
                {isOpenCol && (
                  <rect
                    x={cx - colWidth / 2}
                    y={topY}
                    width={colWidth}
                    height={boardHeight}
                    rx={6}
                    fill="rgba(255,255,255,0.04)"
                  />
                )}
                {isSingleDot && <circle cx={cx} cy={midY} r={4.8} fill="rgba(255,255,255,0.18)" />}
                {isDoubleDot && (
                  <>
                    <circle cx={cx} cy={midY - 32} r={4.5} fill="rgba(255,255,255,0.18)" />
                    <circle cx={cx} cy={midY + 32} r={4.5} fill="rgba(255,255,255,0.18)" />
                  </>
                )}
                <line
                  x1={rightEdge}
                  y1={topY}
                  x2={rightEdge}
                  y2={topY + boardHeight}
                  stroke={isOpenCol ? '#EFECE6' : '#78716C'}
                  strokeWidth={isOpenCol ? 4 : 1.4}
                />
                <text
                  x={cx}
                  y={topY - 10}
                  textAnchor="middle"
                  className="fill-muted-foreground text-[11px] font-mono tabular-nums"
                >
                  {fret === 0 ? 'OPEN' : fret}
                </text>
              </g>
            );
          })}

          {/* Strings */}
          {STRINGS_ORDER.map((str) => {
            const y = getStringY(str);
            const isActiveString =
              shouldShowActiveTarget &&
              (currentNote?.string === str ||
                currentNote?.chordNotes?.some((cn) => cn.string === str));
            const strokeW = 0.8 + str * 0.34;

            return (
              <g key={str}>
                <text
                  x={16}
                  y={y + 4}
                  textAnchor="middle"
                  className="fill-muted-foreground text-[11px] font-mono font-medium"
                >
                  {STRING_NAMES[str]}
                </text>
                <line
                  x1={leftMargin}
                  y1={y}
                  x2={leftMargin + usableWidth}
                  y2={y}
                  stroke={isActiveString ? '#E85D3F' : str >= 4 ? '#C4B5A5' : '#E2E8F0'}
                  strokeWidth={isActiveString ? strokeW + 0.6 : strokeW}
                  strokeOpacity={isActiveString ? 0.95 : 0.7}
                  className={isActiveString ? 'animate-string-vibrate' : ''}
                />
              </g>
            );
          })}

          {/* Scale Backdrop (Phase II+ only) */}
          {shouldShowScale &&
            scaleOverlay.map((sc) => {
              if (sc.fret < visibleRange[0] || sc.fret > visibleRange[1]) return null;
              const cx = getColX(sc.fret);
              const cy = getStringY(sc.string);
              const midi = getNoteMidi(sc.string, sc.fret);
              const isInChord = practiceMode === 'jam' && chordPcSet.has(midi % 12);

              return (
                <g
                  key={`sc-${sc.string}-${sc.fret}`}
                  className="cursor-pointer"
                  onClick={() => onFretClick?.(sc.string, sc.fret)}
                >
                  <circle
                    cx={cx}
                    cy={cy}
                    r={9}
                    fill={
                      isInChord
                        ? 'rgba(232, 93, 63, 0.25)'
                        : sc.isRoot
                        ? 'rgba(255, 255, 255, 0.22)'
                        : 'rgba(255, 255, 255, 0.08)'
                    }
                    stroke={isInChord ? '#E85D3F' : sc.isRoot ? '#FFFFFF' : 'rgba(255,255,255,0.28)'}
                    strokeWidth={sc.isRoot || isInChord ? '1.3' : '0.9'}
                  />
                  <text
                    x={cx}
                    y={cy + 3.2}
                    textAnchor="middle"
                    className="fill-white/85 text-[9px] font-mono font-medium"
                  >
                    {labelMode === 'finger'
                      ? sc.intervalLabel
                      : getBadgeText(sc.string, sc.fret, sc.finger ?? 1, sc.intervalLabel)}
                  </text>
                </g>
              );
            })}

          {/* Hummed Mapped Notes */}
          {hummedMappings.map((hm, idx) => {
            if (hm.fret < visibleRange[0] || hm.fret > visibleRange[1]) return null;
            const cx = getColX(hm.fret);
            const cy = getStringY(hm.string);
            return (
              <g
                key={`hum-${idx}-${hm.string}-${hm.fret}`}
                className="cursor-pointer"
                onClick={() => onFretClick?.(hm.string, hm.fret)}
              >
                <circle
                  cx={cx}
                  cy={cy}
                  r={11.5}
                  fill="#5C8D76"
                  stroke="#FFFFFF"
                  strokeWidth="1.5"
                />
                <text
                  x={cx}
                  y={cy + 3.5}
                  textAnchor="middle"
                  className="fill-white text-[10px] font-mono font-bold"
                >
                  {idx + 1}
                </text>
              </g>
            );
          })}

          {/* Next Note Ghost Preview (Subtle Dashed Circle, Zero Neon) */}
          {shouldShowNextGhost &&
            nextNote &&
            nextNote.fret >= visibleRange[0] &&
            nextNote.fret <= visibleRange[1] && (
              <g className="pointer-events-none opacity-75">
                <circle
                  cx={getColX(nextNote.fret)}
                  cy={getStringY(nextNote.string)}
                  r={11.5}
                  fill="rgba(255, 255, 255, 0.1)"
                  stroke="#FFFFFF"
                  strokeWidth="1.4"
                  strokeDasharray="3 2.5"
                />
                <text
                  x={getColX(nextNote.fret)}
                  y={getStringY(nextNote.string) + 3.5}
                  textAnchor="middle"
                  className="fill-white/90 text-[10px] font-mono font-semibold"
                >
                  {getBadgeText(nextNote.string, nextNote.fret, nextNote.finger, nextNote.intervalLabel)}
                </text>
              </g>
            )}

          {/* Active Target Note(s) */}
          {shouldShowActiveTarget &&
            currentNote &&
            (currentNote.chordNotes && currentNote.chordNotes.length > 0
              ? currentNote.chordNotes.map((cn) => {
                  if (cn.fret < visibleRange[0] || cn.fret > visibleRange[1]) return null;
                  const cx = getColX(cn.fret);
                  const cy = getStringY(cn.string);
                  const col = getFingerColorHex(cn.finger);
                  return (
                    <g
                      key={`active-ch-${currentNote.id}-${cn.string}-${cn.fret}`}
                      className="cursor-pointer"
                      onClick={() => onFretClick?.(cn.string, cn.fret)}
                    >
                      <motion.circle
                        cx={cx}
                        cy={cy}
                        fill={col}
                        stroke="#FFFFFF"
                        strokeWidth="2"
                        initial={{ r: 8, opacity: 0.5 }}
                        animate={{ r: 12.5, opacity: 1 }}
                        transition={STUDIO_SPRING}
                      />
                      <text
                        x={cx}
                        y={cy + 4}
                        textAnchor="middle"
                        className="fill-white text-[11px] font-mono font-bold"
                      >
                        {getBadgeText(cn.string, cn.fret, cn.finger, cn.intervalLabel)}
                      </text>
                    </g>
                  );
                })
              : currentNote.fret >= visibleRange[0] &&
                currentNote.fret <= visibleRange[1] && (
                  <g
                    key={`active-single-${currentNote.id}`}
                    className="cursor-pointer"
                    onClick={() => onFretClick?.(currentNote.string, currentNote.fret)}
                  >
                    <motion.circle
                      cx={getColX(currentNote.fret)}
                      cy={getStringY(currentNote.string)}
                      fill="none"
                      stroke="#E85D3F"
                      strokeWidth="2"
                      initial={{ r: 13, opacity: 0.4 }}
                      animate={{ r: 16, opacity: 0.95 }}
                      transition={STUDIO_SPRING}
                    />
                    <motion.circle
                      cx={getColX(currentNote.fret)}
                      cy={getStringY(currentNote.string)}
                      fill={getFingerColorHex(currentNote.finger)}
                      stroke="#FFFFFF"
                      strokeWidth="2"
                      initial={{ r: 8, opacity: 0.5 }}
                      animate={{ r: 12.5, opacity: 1 }}
                      transition={STUDIO_SPRING}
                    />
                    <text
                      x={getColX(currentNote.fret)}
                      y={getStringY(currentNote.string) + 4}
                      textAnchor="middle"
                      className="fill-white text-[11px] font-mono font-bold"
                    >
                      {getBadgeText(
                        currentNote.string,
                        currentNote.fret,
                        currentNote.finger,
                        currentNote.intervalLabel
                      )}
                    </text>
                  </g>
                ))}

          {/* Live Detected Note Mirror Marker + Subtle Unison Positions */}
          {livePitch.isActive && liveFretResolution && (
            <g className="pointer-events-none">
              {!isBlindExam &&
                liveFretResolution.unisons
                  .filter((u) => u.fret >= visibleRange[0] && u.fret <= visibleRange[1])
                  .map((u) => (
                    <circle
                      key={`live-unison-${u.string}-${u.fret}`}
                      cx={getColX(u.fret)}
                      cy={getStringY(u.string)}
                      r={11.5}
                      fill="none"
                      stroke="#E2E8F0"
                      strokeWidth="1.25"
                      strokeDasharray="2 2"
                      opacity={0.34}
                    />
                  ))}
              {liveFretResolution.primary.fret >= visibleRange[0] &&
                liveFretResolution.primary.fret <= visibleRange[1] && (
                  <circle
                    cx={getColX(liveFretResolution.primary.fret)}
                    cy={getStringY(liveFretResolution.primary.string)}
                    r={liveFretResolution.matchedTarget ? 17 : 15.5}
                    fill="none"
                    stroke={liveFretResolution.matchedTarget ? '#34D399' : '#FAF9F6'}
                    strokeWidth={liveFretResolution.matchedTarget ? '2.5' : '2'}
                    strokeDasharray={liveFretResolution.matchedTarget ? undefined : '3 2'}
                  />
                )}
            </g>
          )}

          {/* Clickable Hit Targets */}
          {STRINGS_ORDER.map((str) =>
            fretsToDraw.map((fret) => (
              <rect
                key={`hit-${str}-${fret}`}
                x={getColX(fret) - colWidth / 2}
                y={getStringY(str) - stringGap / 2}
                width={colWidth}
                height={stringGap}
                fill="transparent"
                className="cursor-pointer hover:fill-white/5"
                onClick={() => onFretClick?.(str, fret)}
              />
            ))
          )}
        </svg>
      </div>

      {/* Bend Pitch Thermometer (Only shown when active note requires a bend) */}
      {currentNote?.bendCents && (
        <div className="mx-4 mb-2 flex items-center justify-between gap-3 rounded-lg bg-secondary/70 px-3 py-1.5 text-xs">
          <span className="font-medium text-foreground">
            {tr('Bend Target:', '벤딩 목표:')} +{currentNote.bendCents} cents ({currentNote.bendCents >= 200 ? tr('Whole Step', '온음') : tr('Half Step', '반음')})
          </span>
          <div className="flex items-center gap-2">
            <div className="h-2 w-28 overflow-hidden rounded-full bg-border">
              <motion.div
                className={`h-full rounded-full ${
                  activeBendProgress?.onTarget ? 'bg-emerald-600' : 'bg-primary'
                }`}
                animate={{ width: `${activeBendProgress?.pct ?? 0}%` }}
                transition={STUDIO_SPRING}
              />
            </div>
            <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
              +{activeBendProgress?.centsRaised ?? 0}c
            </span>
          </div>
        </div>
      )}

      {/* Integrated Bottom Player Bar (Dribbble Reference Video Player Bar Style) */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-card px-4 py-2.5">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            onClick={onReset}
            title={tr('Restart', '처음으로')}
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </Button>
          <Button
            type="button"
            size="icon-sm"
            variant={isPlaying ? 'secondary' : 'default'}
            className="rounded-full"
            onClick={onTogglePlay}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </Button>
          <span className="font-mono text-xs tabular-nums text-muted-foreground ml-1">
            {currentBeat.toFixed(0)} / {totalBeats}
          </span>
        </div>

        {/* Clean Progress Track */}
        <div className="flex-1 min-w-[120px] max-w-md h-1.5 rounded-full bg-secondary overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-[width] duration-75"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {/* BPM & Conditional Amp Preset */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Slider
              value={[bpm]}
              min={minBpm}
              max={maxBpm}
              step={2}
              className="w-20"
              onValueChange={(v) => onBpmChange(Array.isArray(v) ? v[0] : Number(v))}
            />
            <span className="font-mono text-xs tabular-nums text-foreground font-medium w-14 text-right">
              {bpm} BPM
            </span>
          </div>

          {isPhase3Or4 && (
            <Select
              value={ampPreset}
              onValueChange={(v) => {
                if (v) onAmpPresetChange(v as AmpPreset);
              }}
            >
              <SelectTrigger className="h-7 w-[108px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="clean">Clean</SelectItem>
                <SelectItem value="crunch">Crunch</SelectItem>
                <SelectItem value="lead">Lead</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
      </div>
    </div>
  );
}
