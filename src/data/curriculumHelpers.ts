import { getIntervalLabel, getNoteMidi } from '@/lib/musicTheory';
import type {
  ArticulationType,
  ChordBar,
  FingerNumber,
  GuitarString,
  NoteEvent,
  PickDirection,
  ScaleOverlayNote,
} from '@/types/guitar';

export interface NoteInput {
  s: GuitarString;
  f: number;
  fn: FingerNumber;
  p?: PickDirection;
  t?: ArticulationType;
  bend?: number;
  slide?: number;
  b: number;
  d?: number;
  int?: string;
  ch?: string;
  deg?: string;
  anc?: FingerNumber;
  chordNotes?: { string: GuitarString; fret: number; finger: FingerNumber; intervalLabel?: string }[];
  tip?: string;
}

export function buildNotes(
  prefix: string,
  rootPitchClass: number,
  items: NoteInput[]
): NoteEvent[] {
  return items.map((item, idx) => {
    const midi = getNoteMidi(item.s, item.f);
    return {
      id: `${prefix}-n${idx + 1}`,
      string: item.s,
      fret: item.f,
      finger: item.fn,
      pick: item.p ?? (idx % 2 === 0 ? 'D' : 'U'),
      technique: item.t ?? 'normal',
      bendCents: item.bend,
      slideToFret: item.slide,
      beatStart: item.b,
      durationBeats: item.d ?? 1,
      intervalLabel: item.int ?? getIntervalLabel(midi, rootPitchClass),
      chordContext: item.ch,
      chordDegree: item.deg,
      anchorFinger: item.anc,
      chordNotes: item.chordNotes,
      coachingNote: item.tip,
    };
  });
}

// A Minor Pentatonic Pos 1 (Frets 5-8)
export const AM_PENTA_BOX1: ScaleOverlayNote[] = [
  { string: 6, fret: 5, intervalLabel: 'R', isRoot: true, finger: 1 },
  { string: 6, fret: 8, intervalLabel: 'b3', finger: 4 },
  { string: 5, fret: 5, intervalLabel: '4', finger: 1 },
  { string: 5, fret: 7, intervalLabel: '5', finger: 3 },
  { string: 4, fret: 5, intervalLabel: 'b7', finger: 1 },
  { string: 4, fret: 7, intervalLabel: 'R', isRoot: true, finger: 3 },
  { string: 3, fret: 5, intervalLabel: 'b3', finger: 1 },
  { string: 3, fret: 7, intervalLabel: '4', finger: 3 },
  { string: 2, fret: 5, intervalLabel: '5', finger: 1 },
  { string: 2, fret: 8, intervalLabel: 'b7', finger: 4 },
  { string: 1, fret: 5, intervalLabel: 'R', isRoot: true, finger: 1 },
  { string: 1, fret: 8, intervalLabel: 'b3', finger: 4 },
];

// C Major Pentatonic (Same frets 5-8, C = Root)
export const C_MAJOR_PENTA_BOX: ScaleOverlayNote[] = [
  { string: 6, fret: 5, intervalLabel: '6', finger: 1 },
  { string: 6, fret: 8, intervalLabel: 'R', isRoot: true, finger: 4 },
  { string: 5, fret: 5, intervalLabel: '2', finger: 1 },
  { string: 5, fret: 7, intervalLabel: '3', finger: 3 },
  { string: 4, fret: 5, intervalLabel: '5', finger: 1 },
  { string: 4, fret: 7, intervalLabel: '6', finger: 3 },
  { string: 3, fret: 5, intervalLabel: 'R', isRoot: true, finger: 1 },
  { string: 3, fret: 7, intervalLabel: '2', finger: 3 },
  { string: 2, fret: 5, intervalLabel: '3', finger: 1 },
  { string: 2, fret: 8, intervalLabel: '5', finger: 4 },
  { string: 1, fret: 5, intervalLabel: '6', finger: 1 },
  { string: 1, fret: 8, intervalLabel: 'R', isRoot: true, finger: 4 },
];

// A Natural Minor 7-note overlay (Am Penta + 2(B) and b6(F) as color notes)
export const AM_FULL_SCALE_OVERLAY: ScaleOverlayNote[] = [
  ...AM_PENTA_BOX1,
  { string: 6, fret: 7, intervalLabel: '2', isColorNote: true, finger: 3 },
  { string: 5, fret: 8, intervalLabel: 'b6', isColorNote: true, finger: 4 },
  { string: 4, fret: 9, intervalLabel: '2', isColorNote: true, finger: 4 },
  { string: 3, fret: 9, intervalLabel: '5', isColorNote: false, finger: 4 },
  { string: 2, fret: 6, intervalLabel: 'b6', isColorNote: true, finger: 2 },
  { string: 1, fret: 7, intervalLabel: '2', isColorNote: true, finger: 3 },
];

// A Blues Scale (Am Penta + b5 Eb/D#)
export const A_BLUES_BOX1: ScaleOverlayNote[] = [
  ...AM_PENTA_BOX1,
  { string: 5, fret: 6, intervalLabel: 'b5', isColorNote: true, finger: 2 },
  { string: 3, fret: 8, intervalLabel: 'b5', isColorNote: true, finger: 4 },
];

// Common Chord Bars Factory
export function makeChordBar(
  barIndex: number,
  chordName: string,
  romanNumeral: string,
  functionTag: ChordBar['functionTag'],
  rootMidi: number,
  chordMidiPitchClasses: number[],
  voicingFrets: ChordBar['voicingFrets'],
  role?: 'comp' | 'solo',
  beats = 4
): ChordBar {
  return {
    barIndex,
    beats,
    chordName,
    romanNumeral,
    functionTag,
    rootMidi,
    chordMidiPitchClasses,
    voicingFrets,
    role,
  };
}

export const CHORD_TEMPLATES = {
  Am7: {
    name: 'Am7',
    rootMidi: 45, // A2
    pcs: [9, 0, 4, 7], // A, C, E, G
    voicing: [
      { string: 6 as GuitarString, fret: 5, finger: 1 as FingerNumber, intervalLabel: 'R' },
      { string: 4 as GuitarString, fret: 5, finger: 2 as FingerNumber, intervalLabel: 'b7' },
      { string: 3 as GuitarString, fret: 5, finger: 3 as FingerNumber, intervalLabel: 'b3' },
      { string: 2 as GuitarString, fret: 5, finger: 4 as FingerNumber, intervalLabel: '5' },
    ],
  },
  Am: {
    name: 'Am',
    rootMidi: 45,
    pcs: [9, 0, 4],
    voicing: [
      { string: 4 as GuitarString, fret: 7, finger: 3 as FingerNumber, intervalLabel: 'R' },
      { string: 3 as GuitarString, fret: 5, finger: 1 as FingerNumber, intervalLabel: 'b3' },
      { string: 2 as GuitarString, fret: 5, finger: 1 as FingerNumber, intervalLabel: '5' },
      { string: 1 as GuitarString, fret: 5, finger: 1 as FingerNumber, intervalLabel: 'R' },
    ],
  },
  Dm7: {
    name: 'Dm7',
    rootMidi: 50, // D3
    pcs: [2, 5, 9, 0], // D, F, A, C
    voicing: [
      { string: 5 as GuitarString, fret: 5, finger: 1 as FingerNumber, intervalLabel: 'R' },
      { string: 4 as GuitarString, fret: 7, finger: 3 as FingerNumber, intervalLabel: '5' },
      { string: 3 as GuitarString, fret: 5, finger: 1 as FingerNumber, intervalLabel: 'b7' },
      { string: 2 as GuitarString, fret: 6, finger: 2 as FingerNumber, intervalLabel: 'b3' },
    ],
  },
  E7: {
    name: 'E7',
    rootMidi: 40, // E2
    pcs: [4, 8, 11, 2], // E, G#, B, D
    voicing: [
      { string: 5 as GuitarString, fret: 7, finger: 2 as FingerNumber, intervalLabel: 'R' },
      { string: 4 as GuitarString, fret: 6, finger: 1 as FingerNumber, intervalLabel: '3' },
      { string: 3 as GuitarString, fret: 7, finger: 3 as FingerNumber, intervalLabel: 'b7' },
      { string: 2 as GuitarString, fret: 5, finger: 1 as FingerNumber, intervalLabel: '5' },
    ],
  },
  C: {
    name: 'C',
    rootMidi: 48, // C3
    pcs: [0, 4, 7], // C, E, G
    voicing: [
      { string: 3 as GuitarString, fret: 5, finger: 1 as FingerNumber, intervalLabel: 'R' },
      { string: 2 as GuitarString, fret: 5, finger: 1 as FingerNumber, intervalLabel: '3' },
      { string: 1 as GuitarString, fret: 8, finger: 4 as FingerNumber, intervalLabel: 'R' },
    ],
  },
  F: {
    name: 'F',
    rootMidi: 41, // F2
    pcs: [5, 9, 0], // F, A, C
    voicing: [
      { string: 3 as GuitarString, fret: 5, finger: 1 as FingerNumber, intervalLabel: '5' },
      { string: 2 as GuitarString, fret: 6, finger: 2 as FingerNumber, intervalLabel: 'R' },
      { string: 1 as GuitarString, fret: 5, finger: 1 as FingerNumber, intervalLabel: '3' },
    ],
  },
  G: {
    name: 'G',
    rootMidi: 43, // G2
    pcs: [7, 11, 2], // G, B, D
    voicing: [
      { string: 3 as GuitarString, fret: 7, finger: 3 as FingerNumber, intervalLabel: '5' },
      { string: 2 as GuitarString, fret: 8, finger: 4 as FingerNumber, intervalLabel: 'R' },
      { string: 1 as GuitarString, fret: 7, finger: 2 as FingerNumber, intervalLabel: '3' },
    ],
  },
  A7: {
    name: 'A7',
    rootMidi: 45,
    pcs: [9, 1, 4, 7], // A, C#, E, G
    voicing: [
      { string: 6 as GuitarString, fret: 5, finger: 1 as FingerNumber, intervalLabel: 'R' },
      { string: 4 as GuitarString, fret: 5, finger: 1 as FingerNumber, intervalLabel: 'b7' },
      { string: 3 as GuitarString, fret: 6, finger: 2 as FingerNumber, intervalLabel: '3' },
      { string: 2 as GuitarString, fret: 5, finger: 1 as FingerNumber, intervalLabel: '5' },
    ],
  },
  D7: {
    name: 'D7',
    rootMidi: 50,
    pcs: [2, 6, 9, 0], // D, F#, A, C
    voicing: [
      { string: 5 as GuitarString, fret: 5, finger: 2 as FingerNumber, intervalLabel: 'R' },
      { string: 4 as GuitarString, fret: 4, finger: 1 as FingerNumber, intervalLabel: '3' },
      { string: 3 as GuitarString, fret: 5, finger: 3 as FingerNumber, intervalLabel: 'b7' },
    ],
  },
  Bm: {
    name: 'Bm',
    rootMidi: 47, // B2
    pcs: [11, 2, 6], // B, D, F#
    voicing: [
      { string: 6 as GuitarString, fret: 7, finger: 1 as FingerNumber, intervalLabel: 'R' },
      { string: 4 as GuitarString, fret: 9, finger: 3 as FingerNumber, intervalLabel: 'R' },
      { string: 3 as GuitarString, fret: 7, finger: 1 as FingerNumber, intervalLabel: 'b3' },
      { string: 2 as GuitarString, fret: 7, finger: 1 as FingerNumber, intervalLabel: '5' },
    ],
  },
  Em: {
    name: 'Em',
    rootMidi: 40,
    pcs: [4, 7, 11], // E, G, B
    voicing: [
      { string: 6 as GuitarString, fret: 0, finger: 0 as FingerNumber, intervalLabel: 'R' },
      { string: 5 as GuitarString, fret: 2, finger: 2 as FingerNumber, intervalLabel: '5' },
      { string: 4 as GuitarString, fret: 2, finger: 3 as FingerNumber, intervalLabel: 'R' },
      { string: 3 as GuitarString, fret: 0, finger: 0 as FingerNumber, intervalLabel: 'b3' },
    ],
  },
  Cmaj7: {
    name: 'Cmaj7',
    rootMidi: 48,
    pcs: [0, 4, 7, 11], // C, E, G, B
    voicing: [
      { string: 6 as GuitarString, fret: 8, finger: 2 as FingerNumber, intervalLabel: 'R' },
      { string: 4 as GuitarString, fret: 9, finger: 3 as FingerNumber, intervalLabel: '7' },
      { string: 3 as GuitarString, fret: 9, finger: 4 as FingerNumber, intervalLabel: '3' },
    ],
  },
  G7: {
    name: 'G7',
    rootMidi: 43,
    pcs: [7, 11, 2, 5], // G, B, D, F
    voicing: [
      { string: 6 as GuitarString, fret: 3, finger: 2 as FingerNumber, intervalLabel: 'R' },
      { string: 4 as GuitarString, fret: 3, finger: 3 as FingerNumber, intervalLabel: 'b7' },
      { string: 3 as GuitarString, fret: 4, finger: 4 as FingerNumber, intervalLabel: '3' },
    ],
  },
};
