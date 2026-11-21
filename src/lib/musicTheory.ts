import type { FingerNumber, GuitarString, ScaleOverlayNote } from '@/types/guitar';

// Standard Guitar Tuning MIDI Numbers:
// String 1 (High E4): 64
// String 2 (B3): 59
// String 3 (G3): 55
// String 4 (D3): 50
// String 5 (A2): 45
// String 6 (Low E2): 40
export const STANDARD_TUNING_MIDI: Record<GuitarString, number> = {
  1: 64,
  2: 59,
  3: 55,
  4: 50,
  5: 45,
  6: 40,
};

export const TUNING_OPEN_STRINGS: {
  string: GuitarString;
  label: string;
  midi: number;
  freq: number;
}[] = [
  { string: 6, label: 'E2', midi: 40, freq: 82.41 },
  { string: 5, label: 'A2', midi: 45, freq: 110.0 },
  { string: 4, label: 'D3', midi: 50, freq: 146.83 },
  { string: 3, label: 'G3', midi: 55, freq: 196.0 },
  { string: 2, label: 'B3', midi: 59, freq: 246.94 },
  { string: 1, label: 'E4', midi: 64, freq: 329.63 },
];

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

const INTERVAL_NAMES: Record<number, string> = {
  0: 'R',
  1: 'b2',
  2: '2',
  3: 'b3',
  4: '3',
  5: '4',
  6: 'b5',
  7: '5',
  8: 'b6',
  9: '6',
  10: 'b7',
  11: '7',
};

export function getNoteMidi(string: GuitarString, fret: number): number {
  return STANDARD_TUNING_MIDI[string] + fret;
}

export function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export function freqToMidiFloat(freq: number): number {
  if (freq <= 0) return 0;
  return 69 + 12 * Math.log2(freq / 440);
}

export function midiToNoteName(midi: number): string {
  const rounded = Math.round(midi);
  const name = NOTE_NAMES[((rounded % 12) + 12) % 12];
  const octave = Math.floor(rounded / 12) - 1;
  return `${name}${octave}`;
}

export function midiToPitchClassName(midi: number): string {
  return NOTE_NAMES[((Math.round(midi) % 12) + 12) % 12];
}

export function getIntervalLabel(midi: number, rootPitchClass: number): string {
  const diff = (((midi % 12) - (rootPitchClass % 12)) % 12 + 12) % 12;
  return INTERVAL_NAMES[diff] ?? 'R';
}

// Low-saturation muted earth/stone finger palette (non-neon)
export function getFingerColorHex(finger: FingerNumber): string {
  switch (finger) {
    case 1:
      return '#5B7C99'; // Muted Slate Blue - Index
    case 2:
      return '#5C8D76'; // Muted Sage - Middle
    case 3:
      return '#B88648'; // Warm Ochre - Ring
    case 4:
      return '#B56357'; // Muted Terracotta - Pinky
    default:
      return '#78716C'; // Neutral Stone - Open
  }
}

export function getFingerNameKo(finger: FingerNumber): string {
  switch (finger) {
    case 1:
      return '1번 검지';
    case 2:
      return '2번 중지';
    case 3:
      return '3번 약지';
    case 4:
      return '4번 소지';
    default:
      return '개방현 (0)';
  }
}

export function findPossiblePositionsForMidi(
  midi: number,
  maxFret = 22
): { string: GuitarString; fret: number }[] {
  const results: { string: GuitarString; fret: number }[] = [];
  const strings: GuitarString[] = [1, 2, 3, 4, 5, 6];
  for (const s of strings) {
    const fret = midi - STANDARD_TUNING_MIDI[s];
    if (fret >= 0 && fret <= maxFret) {
      results.push({ string: s, fret });
    }
  }
  return results;
}

export function findBestFretForMidi(
  midi: number,
  fretRange: [number, number] = [0, 12],
  preferredScale?: ScaleOverlayNote[],
  preferredRootPitchClass = 9 // A default
): {
  string: GuitarString;
  fret: number;
  finger: FingerNumber;
  intervalLabel: string;
} {
  const candidates = findPossiblePositionsForMidi(midi, 22);
  if (candidates.length === 0) {
    return {
      string: 3,
      fret: 5,
      finger: 1,
      intervalLabel: getIntervalLabel(midi, preferredRootPitchClass),
    };
  }

  const [rangeMin, rangeMax] = fretRange;
  const centerFret = (rangeMin + rangeMax) / 2;

  let best = candidates[0];
  let bestScore = -9999;

  for (const c of candidates) {
    let score = 0;
    if (c.fret >= rangeMin && c.fret <= rangeMax) {
      score += 100;
    } else {
      score -= Math.min(Math.abs(c.fret - rangeMin), Math.abs(c.fret - rangeMax)) * 10;
    }

    if (
      preferredScale &&
      preferredScale.some((s) => s.string === c.string && s.fret === c.fret)
    ) {
      score += 45;
    }

    score -= Math.abs(c.fret - centerFret) * 1.5;

    if (score > bestScore) {
      bestScore = score;
      best = c;
    }
  }

  const anchor = Math.max(1, rangeMin);
  let finger: FingerNumber = 1;
  if (best.fret === 0) {
    finger = 0;
  } else {
    const offset = best.fret - anchor;
    if (offset <= 0) finger = 1;
    else if (offset === 1) finger = 2;
    else if (offset === 2) finger = 3;
    else finger = 4;
  }

  return {
    string: best.string,
    fret: best.fret,
    finger,
    intervalLabel: getIntervalLabel(midi, preferredRootPitchClass),
  };
}
