'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { DownPickIcon, UpPickIcon } from '@/components/icons/GuitarSvgIcons';
import { getFingerColorHex } from '@/lib/musicTheory';
import type {
  ChordBar,
  GuitarString,
  NoteEvaluation,
  NoteEvent,
  PhaseId,
  PracticeMode,
} from '@/types/guitar';
import { Repeat } from 'lucide-react';

interface TabTimelineProps {
  phaseId: PhaseId;
  notes: NoteEvent[];
  chordProgression: ChordBar[];
  totalBars: number;
  beatsPerBar: number;
  activeNoteIndex: number;
  currentBeat: number;
  isPlaying: boolean;
  loopRangeBars: [number, number];
  onLoopRangeChange: (range: [number, number]) => void;
  onSelectNote: (index: number) => void;
  evaluations: Record<string, NoteEvaluation>;
  practiceMode: PracticeMode;
  earCopyUnlockedIndices: Set<number>;
  earCopyHintLevel: number;
}

const STRINGS: GuitarString[] = [1, 2, 3, 4, 5, 6];

export function TabTimeline({
  phaseId,
  notes,
  chordProgression,
  totalBars,
  beatsPerBar,
  activeNoteIndex,
  currentBeat,
  isPlaying,
  loopRangeBars,
  onLoopRangeChange,
  onSelectNote,
  evaluations,
  practiceMode,
  earCopyUnlockedIndices,
  earCopyHintLevel,
}: TabTimelineProps) {
  const isPhase1 = phaseId === 'phase-1';
  const barIndices = Array.from({ length: totalBars }, (_, i) => i);
  const totalBeats = totalBars * beatsPerBar;
  const playheadPct = Math.max(0, Math.min(100, (currentBeat / Math.max(1, totalBeats)) * 100));

  const toggleBarLoop = (barIdx: number) => {
    const [start, end] = loopRangeBars;
    if (start === barIdx && end === barIdx) {
      onLoopRangeChange([0, totalBars - 1]);
    } else if (start === 0 && end === totalBars - 1) {
      onLoopRangeChange([barIdx, barIdx]);
    } else if (barIdx < start) {
      onLoopRangeChange([barIdx, end]);
    } else if (barIdx > end) {
      onLoopRangeChange([start, barIdx]);
    } else {
      onLoopRangeChange([barIdx, barIdx]);
    }
  };

  const getEvalBadgeClass = (ev?: NoteEvaluation) => {
    if (!ev) return '';
    if (ev.result === 'perfect' || ev.result === 'good') {
      return 'border-emerald-600/60 bg-emerald-500/12 text-emerald-700 dark:text-emerald-300';
    }
    if (ev.result === 'pass') {
      return 'border-amber-600/60 bg-amber-500/12 text-amber-700 dark:text-amber-300';
    }
    return 'border-destructive/70 bg-destructive/12 text-destructive dark:text-red-300';
  };

  return (
    <div className="rounded-xl border border-border bg-card p-3.5">
      {/* Measure Bar Header (Phase II+ shows Chords; Phase I shows simple Bar pills only when >1 bar) */}
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <div
          className="grid flex-1 gap-1.5"
          style={{ gridTemplateColumns: `repeat(${totalBars}, minmax(0, 1fr))` }}
        >
          {barIndices.map((bIdx) => {
            const chord = chordProgression[bIdx % Math.max(1, chordProgression.length)];
            const isInLoop = bIdx >= loopRangeBars[0] && bIdx <= loopRangeBars[1];
            const isCurrentBar = Math.floor(currentBeat / beatsPerBar) === bIdx;

            return (
              <button
                key={bIdx}
                type="button"
                onClick={() => toggleBarLoop(bIdx)}
                className={`flex items-center justify-between rounded-md border px-2.5 py-1 text-left text-xs transition-colors ${
                  isCurrentBar
                    ? 'border-primary bg-accent-soft/70 text-foreground font-semibold'
                    : isInLoop
                    ? 'border-border bg-secondary/50 text-foreground hover:bg-secondary'
                    : 'border-border/60 bg-background text-muted-foreground opacity-50'
                }`}
              >
                <span className="font-mono text-[11px] text-muted-foreground">
                  {bIdx + 1}마디
                </span>
                {!isPhase1 && chord && (
                  <span className="font-mono text-xs font-semibold text-foreground">
                    {chord.chordName}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {(loopRangeBars[0] !== 0 || loopRangeBars[1] !== totalBars - 1) && (
          <Button
            type="button"
            size="xs"
            variant="ghost"
            onClick={() => onLoopRangeChange([0, totalBars - 1])}
          >
            <Repeat className="w-3 h-3 mr-1" />
            전체
          </Button>
        )}
      </div>

      {/* 6-Line Clean Tablature */}
      <div className="relative overflow-x-auto rounded-lg border border-border/80 bg-muted/40 px-3 py-3">
        <div className="relative min-w-[600px]">
          {(isPlaying || currentBeat > 0) && (
            <div
              className="pointer-events-none absolute top-0 bottom-0 z-10 w-[2px] bg-primary transition-[left] duration-75"
              style={{ left: `${playheadPct}%` }}
            />
          )}

          {barIndices.slice(1).map((bIdx) => (
            <div
              key={`div-${bIdx}`}
              className="pointer-events-none absolute top-4 bottom-6 w-px bg-border"
              style={{ left: `${(bIdx / totalBars) * 100}%` }}
            />
          ))}

          {/* Picking Direction Row */}
          <div className="relative h-5 mb-1">
            {notes.map((n) => {
              const leftPct = ((n.beatStart + 0.15) / totalBeats) * 100;
              return (
                <div
                  key={`pick-${n.id}`}
                  className="absolute -translate-x-1/2 text-muted-foreground"
                  style={{ left: `${leftPct}%` }}
                >
                  {n.pick === 'D' ? (
                    <DownPickIcon size={12} />
                  ) : n.pick === 'U' ? (
                    <UpPickIcon size={12} />
                  ) : (
                    <span className="font-mono text-[10px] font-semibold">{n.pick}</span>
                  )}
                </div>
              );
            })}
          </div>

          {/* 6 Tab Strings */}
          <div className="space-y-3 py-1">
            {STRINGS.map((str) => (
              <div key={str} className="relative flex items-center h-3">
                <span className="w-5 text-[10px] font-mono text-muted-foreground select-none">
                  {str}
                </span>
                <div className="relative flex-1 h-px bg-border">
                  {notes.map((n, idx) => {
                    const isHiddenEarCopy =
                      practiceMode === 'earcopy' &&
                      !earCopyUnlockedIndices.has(idx) &&
                      !(earCopyHintLevel >= 2 && idx === 0) &&
                      earCopyHintLevel < 3;

                    const leftPct = ((n.beatStart + 0.15) / totalBeats) * 100;
                    const ev = evaluations[n.id];
                    const isActive = idx === activeNoteIndex;

                    if (n.chordNotes && n.chordNotes.length > 0) {
                      const match = n.chordNotes.find((cn) => cn.string === str);
                      if (!match) return null;
                      return (
                        <button
                          key={`${n.id}-${str}`}
                          type="button"
                          onClick={() => onSelectNote(idx)}
                          style={{ left: `${leftPct}%` }}
                          className={`absolute -translate-x-1/2 -translate-y-1/2 rounded px-1.5 py-0.5 font-mono text-[11px] font-semibold tabular-nums border transition-transform duration-150 ${
                            isActive
                              ? 'z-20 scale-110 bg-primary text-primary-foreground border-primary'
                              : ev
                              ? getEvalBadgeClass(ev)
                              : 'bg-card text-foreground border-border hover:border-foreground/40'
                          }`}
                        >
                          {isHiddenEarCopy ? '?' : match.fret}
                        </button>
                      );
                    }

                    if (n.string !== str) return null;

                    const suffix = n.bendCents
                      ? n.bendCents >= 200
                        ? 'b↑'
                        : 'b'
                      : n.technique === 'slide-up'
                      ? '/'
                      : n.technique === 'vibrato'
                      ? '~'
                      : '';

                    return (
                      <button
                        key={n.id}
                        type="button"
                        onClick={() => onSelectNote(idx)}
                        style={{ left: `${leftPct}%` }}
                        className={`absolute -translate-x-1/2 -translate-y-1/2 rounded px-1.5 py-0.5 font-mono text-[11px] font-semibold tabular-nums border transition-transform duration-150 ${
                          isActive
                            ? 'z-20 scale-110 bg-primary text-primary-foreground border-primary'
                            : ev
                            ? getEvalBadgeClass(ev)
                            : 'bg-card text-foreground border-border hover:border-foreground/40'
                        }`}
                      >
                        {isHiddenEarCopy ? '?' : `${n.fret}${suffix}`}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Finger Number Row */}
          <div className="relative h-5 mt-2 pl-5">
            {notes.map((n, idx) => {
              const leftPct = ((n.beatStart + 0.15) / totalBeats) * 100;
              const isHiddenEarCopy =
                practiceMode === 'earcopy' &&
                !earCopyUnlockedIndices.has(idx) &&
                earCopyHintLevel < 3;

              return (
                <div
                  key={`fn-${n.id}`}
                  style={{ left: `${leftPct}%` }}
                  className="absolute -translate-x-1/2 flex flex-col items-center"
                >
                  <span
                    className="inline-flex h-4 w-4 items-center justify-center rounded-full text-[9.5px] font-mono font-bold text-white"
                    style={{
                      backgroundColor: isHiddenEarCopy
                        ? '#9CA3AF'
                        : getFingerColorHex(n.finger),
                    }}
                  >
                    {isHiddenEarCopy ? '?' : n.finger}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
