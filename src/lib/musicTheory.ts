import type {
  FingerNumber,
  GuitarString,
  ScaleOverlayNote,
  TuningProfile,
  TuningProfileId,
} from '@/types/guitar';

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

export const TUNING_PROFILES: Record<TuningProfileId, TuningProfile> = {
  standard: {
    id: 'standard',
    name: 'E Standard',
    labelKo: '스탠다드 (EADGBE)',
    shortLabel: 'E Std',
    stringMidi: { 1: 64, 2: 59, 3: 55, 4: 50, 5: 45, 6: 40 },
    descriptionEn: 'Classic 6-string standard tuning for all 39 curriculum lessons.',
    descriptionKo: '39개 전체 커리큘럼의 기준이 되는 표준 일렉기타 튜닝입니다.',
  },
  'drop-d': {
    id: 'drop-d',
    name: 'Drop D',
    labelKo: '드롭 D (DADGBE)',
    shortLabel: 'Drop D',
    stringMidi: { 1: 64, 2: 59, 3: 55, 4: 50, 5: 45, 6: 38 },
    descriptionEn: 'Low 6th string dropped a whole step to D2 for 1-finger rock & metal power chords.',
    descriptionKo: '6번줄만 온음 낮춰(D2) 검지 하나로 무거운 록·메탈 파워코드를 연주합니다.',
  },
  'eb-standard': {
    id: 'eb-standard',
    name: 'Eb Standard',
    labelKo: '반음 다운 (Eb)',
    shortLabel: 'Eb Std',
    stringMidi: { 1: 63, 2: 58, 3: 54, 4: 49, 5: 44, 6: 39 },
    descriptionEn: 'Half-step down tuning favored by Hendrix, SRV, and Slash for softer bend tension.',
    descriptionKo: '모든 줄을 반음 낮춰 벤딩 텐션을 부드럽게 만든 록·블루스 튜닝입니다.',
  },
  'open-g': {
    id: 'open-g',
    name: 'Open G',
    labelKo: '오픈 G (DGDGBD)',
    shortLabel: 'Open G',
    stringMidi: { 1: 62, 2: 59, 3: 55, 4: 50, 5: 43, 6: 38 },
    descriptionEn: 'Open strings ring a full G Major triad—ideal for blues slide and Stones-style riffs.',
    descriptionKo: '개방현을 치면 G 메이저 화음이 울리는 블루스·슬라이드 특화 튜닝입니다.',
  },
  dadgad: {
    id: 'dadgad',
    name: 'DADGAD',
    labelKo: 'DADGAD 모달',
    shortLabel: 'DADGAD',
    stringMidi: { 1: 62, 2: 57, 3: 55, 4: 50, 5: 45, 6: 38 },
    descriptionEn: 'Suspended Dsus4 modal tuning for Celtic, acoustic fingerstyle, and ambient rock.',
    descriptionKo: 'Dsus4 모달 공명으로 핑거스타일과 몽환적인 록 리프에 쓰이는 튜닝입니다.',
  },
};

export const TUNING_PROFILE_LIST: TuningProfile[] = [
  TUNING_PROFILES.standard,
  TUNING_PROFILES['drop-d'],
  TUNING_PROFILES['eb-standard'],
  TUNING_PROFILES['open-g'],
  TUNING_PROFILES.dadgad,
];

let activeTuningProfileId: TuningProfileId = 'standard';
let activeCapoFret = 0;

export function setActiveTuning(profileId: TuningProfileId, capoFret = 0): void {
  activeTuningProfileId = TUNING_PROFILES[profileId] ? profileId : 'standard';
  activeCapoFret = Math.max(0, Math.min(7, Math.round(capoFret)));
}

export function getActiveTuning(): {
  profileId: TuningProfileId;
  profile: TuningProfile;
  capoFret: number;
} {
  return {
    profileId: activeTuningProfileId,
    profile: TUNING_PROFILES[activeTuningProfileId],
    capoFret: activeCapoFret,
  };
}

export function getEffectiveOpenStringMidi(
  string: GuitarString,
  profileId: TuningProfileId = activeTuningProfileId,
  capoFret: number = activeCapoFret
): number {
  const base = (TUNING_PROFILES[profileId] ?? TUNING_PROFILES.standard).stringMidi[string];
  return base + Math.max(0, Math.min(7, Math.round(capoFret)));
}

export function getTuningOpenStrings(
  profileId: TuningProfileId = activeTuningProfileId,
  capoFret: number = activeCapoFret
): {
  string: GuitarString;
  label: string;
  midi: number;
  freq: number;
}[] {
  const strings: GuitarString[] = [6, 5, 4, 3, 2, 1];
  return strings.map((string) => {
    const midi = getEffectiveOpenStringMidi(string, profileId, capoFret);
    return {
      string,
      label: midiToNoteName(midi),
      midi,
      freq: Number(midiToFreq(midi).toFixed(2)),
    };
  });
}

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

export function getNoteMidi(
  string: GuitarString,
  fret: number,
  tuningOverride?: { profileId?: TuningProfileId; capoFret?: number }
): number {
  const openMidi = tuningOverride
    ? getEffectiveOpenStringMidi(
        string,
        tuningOverride.profileId ?? activeTuningProfileId,
        tuningOverride.capoFret ?? activeCapoFret
      )
    : getEffectiveOpenStringMidi(string);
  return openMidi + fret;
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

export function getFingerName(finger: FingerNumber, locale: 'en' | 'ko' = 'ko'): string {
  if (locale === 'en') {
    switch (finger) {
      case 1:
        return 'Index (1)';
      case 2:
        return 'Middle (2)';
      case 3:
        return 'Ring (3)';
      case 4:
        return 'Pinky (4)';
      default:
        return 'Open String (0)';
    }
  }
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

export function getFingerNameKo(finger: FingerNumber): string {
  return getFingerName(finger, 'ko');
}

export function findPossiblePositionsForMidi(
  midi: number,
  maxFret = 22
): { string: GuitarString; fret: number }[] {
  const results: { string: GuitarString; fret: number }[] = [];
  const strings: GuitarString[] = [1, 2, 3, 4, 5, 6];
  for (const s of strings) {
    const fret = midi - getEffectiveOpenStringMidi(s);
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

    if (rangeMin === 0 && c.fret === 0) {
      score += 35;
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

export interface FretPositionResolution {
  primary: { string: GuitarString; fret: number };
  unisons: { string: GuitarString; fret: number }[];
  matchedTarget: boolean;
}

/**
 * Resolve a detected MIDI pitch to the most contextually natural string/fret position
 * on the guitar fretboard (handling unison duplicates across strings).
 */
export function resolveFretPositionForContext(
  midi: number,
  context: {
    targetNote?: {
      string: GuitarString;
      fret: number;
      chordNotes?: { string: GuitarString; fret: number }[];
    } | null;
    lessonNotes?: { string: GuitarString; fret: number }[];
    scaleOverlay?: ScaleOverlayNote[];
    focusFretRange?: [number, number];
    visibleRange?: [number, number];
  } = {}
): FretPositionResolution | null {
  const candidates = findPossiblePositionsForMidi(midi, 22);
  if (candidates.length === 0) return null;

  const { targetNote, lessonNotes, scaleOverlay, focusFretRange = [0, 12], visibleRange } = context;

  // 1. Direct lock onto active target note or chord tone if exact pitch matches
  if (targetNote) {
    if (getNoteMidi(targetNote.string, targetNote.fret) === midi) {
      const primary = { string: targetNote.string, fret: targetNote.fret };
      return {
        primary,
        unisons: candidates.filter((c) => !(c.string === primary.string && c.fret === primary.fret)),
        matchedTarget: true,
      };
    }
    if (targetNote.chordNotes && targetNote.chordNotes.length > 0) {
      const matchedChordPos = targetNote.chordNotes.find(
        (cn) => getNoteMidi(cn.string, cn.fret) === midi
      );
      if (matchedChordPos) {
        const primary = { string: matchedChordPos.string, fret: matchedChordPos.fret };
        return {
          primary,
          unisons: candidates.filter((c) => !(c.string === primary.string && c.fret === primary.fret)),
          matchedTarget: true,
        };
      }
    }
  }

  // 2. Context-aware scoring among all unison positions on the neck
  const [rangeMin, rangeMax] = focusFretRange;
  const centerFret = (rangeMin + rangeMax) / 2;

  let best = candidates[0];
  let bestScore = -1e9;

  for (const c of candidates) {
    let score = 0;

    if (lessonNotes?.some((n) => n.string === c.string && n.fret === c.fret)) {
      score += 160;
    }

    if (scaleOverlay?.some((s) => s.string === c.string && s.fret === c.fret)) {
      score += 80;
    }

    if (c.fret >= rangeMin && c.fret <= rangeMax) {
      score += 70;
    } else {
      score -= Math.min(Math.abs(c.fret - rangeMin), Math.abs(c.fret - rangeMax)) * 18;
    }

    if (visibleRange) {
      if (c.fret >= visibleRange[0] && c.fret <= visibleRange[1]) {
        score += 35;
      } else {
        score -= 40;
      }
    }

    // Open-string ergonomics: favor fret 0 in open-position lessons, keep closed shapes inside the box
    if (c.fret === 0) {
      score += rangeMin === 0 ? 45 : -25;
    }

    if (targetNote) {
      score -= Math.abs(c.string - targetNote.string) * 2;
      if (!(c.fret === 0 && rangeMin === 0)) {
        score -= Math.abs(c.fret - targetNote.fret) * 2.5;
      }
    }

    score -= Math.abs(c.fret - centerFret) * 1.2;

    if (score > bestScore) {
      bestScore = score;
      best = c;
    }
  }

  const unisons = candidates.filter((c) => !(c.string === best.string && c.fret === best.fret));
  return {
    primary: best,
    unisons,
    matchedTarget: false,
  };
}
