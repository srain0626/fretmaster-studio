export type GuitarString = 1 | 2 | 3 | 4 | 5 | 6; // 1 = High E4, 6 = Low E2
export type FingerNumber = 0 | 1 | 2 | 3 | 4; // 0 = Open, 1 = Index, 2 = Middle, 3 = Ring, 4 = Pinky
export type PickDirection = 'D' | 'U' | 'H' | 'P' | 'S' | 'T';

export type ArticulationType =
  | 'normal'
  | 'hammer'
  | 'pull'
  | 'slide-up'
  | 'slide-down'
  | 'bend-half'
  | 'bend-full'
  | 'bend-15'
  | 'prebend-release'
  | 'vibrato'
  | 'palm-mute'
  | 'double-stop'
  | 'chord'
  | 'tap';

export type JudgmentTier = 'relaxed' | 'standard' | 'tight' | 'studio';
export type JudgmentResult = 'perfect' | 'good' | 'pass' | 'miss';
export type PracticeMode = 'guide' | 'wait' | 'loop' | 'exam' | 'earcopy' | 'jam';
export type FretLabelMode = 'finger' | 'interval' | 'note' | 'fret';
export type AmpPreset = 'clean' | 'crunch' | 'lead';
export type FretboardTheme = 'rosewood' | 'maple' | 'ebony';

export type LessonCategory =
  | 'mechanics'
  | 'chords'
  | 'scales'
  | 'techniques'
  | 'genres'
  | 'solos'
  | 'expression';

export type PhaseId = 'phase-1' | 'phase-2' | 'phase-3' | 'phase-4';

export interface NoteEvent {
  id: string;
  string: GuitarString;
  fret: number;
  finger: FingerNumber;
  pick: PickDirection;
  technique: ArticulationType;
  bendCents?: number; // e.g., 100 for half bend, 200 for full bend, 300 for 1.5 bend
  slideToFret?: number;
  beatStart: number; // 0-based beat index
  durationBeats: number;
  intervalLabel: string; // e.g., 'R', 'b3', '3', '4', 'b5', '5', '6', 'b7', '7'
  chordContext?: string; // e.g., 'Am7', 'G', 'C'
  chordDegree?: string; // e.g., 'Root', 'm3', 'M3', 'P5', 'b7'
  anchorFinger?: FingerNumber; // Finger that should stay anchored on fretboard
  chordNotes?: { string: GuitarString; fret: number; finger: FingerNumber; intervalLabel?: string }[];
  coachingNote?: string;
}

export interface ChordBar {
  barIndex: number; // 0-based
  beats: number; // usually 4
  chordName: string; // e.g., 'Am7', 'Dm7', 'E7'
  romanNumeral: string; // e.g., 'i7', 'iv7', 'V7'
  functionTag: 'Tonic' | 'Subdominant' | 'Dominant' | 'Modal' | 'Passing';
  rootMidi: number; // MIDI pitch class 0..11 or actual bass MIDI
  chordMidiPitchClasses: number[]; // pitch classes 0..11
  voicingFrets: { string: GuitarString; fret: number; finger: FingerNumber; intervalLabel: string }[];
  role?: 'comp' | 'solo'; // For Module 9 role-switching jams
}

export interface ScaleOverlayNote {
  string: GuitarString;
  fret: number;
  intervalLabel: string;
  isRoot?: boolean;
  isColorNote?: boolean; // e.g., 2nd/6th/b5 added on top of pentatonic skeleton
  finger?: FingerNumber;
}

export interface HarmonyConcept {
  layerNumber: 1 | 2 | 3 | 4 | 5;
  layerTitle: string;
  keyCenter: string;
  formula: string;
  explanation: string;
  earTip: string;
}

export interface PostureGuide {
  thumbPosition: string;
  leftHandTip: string;
  rightHandTip: string;
  commonMistake: string;
  fixAction: string;
}

export interface Lesson {
  id: string;
  moduleId: string;
  phaseId: PhaseId;
  orderInModule: number;
  code: string; // e.g., '1-1', '4-2', '8-4'
  title: string;
  subtitle: string;
  category: LessonCategory;
  difficulty: 1 | 2 | 3 | 4 | 5;
  isCheckpoint: boolean;
  defaultBpm: number;
  minBpm: number;
  maxBpm: number;
  recommendedAmp: AmpPreset;
  beatsPerBar: number;
  totalBars: number;
  focusFretRange: [number, number];
  pedagogyTags: string[];
  harmonyConcept: HarmonyConcept;
  postureGuide: PostureGuide;
  scaleOverlay: ScaleOverlayNote[];
  chordProgression: ChordBar[];
  notes: NoteEvent[];
  supportsEarCopy?: boolean;
  supportsJam?: boolean;
  jamPrompt?: string;
}

export interface ModuleInfo {
  id: string;
  phaseId: PhaseId;
  phaseTitle: string;
  number: number;
  title: string;
  englishTitle: string;
  pedagogyBasis: string;
  summary: string;
}

export interface LivePitchData {
  frequency: number;
  midiFloat: number;
  nearestMidi: number;
  noteName: string;
  centsOff: number;
  rmsDb: number;
  clarity: number;
  isOnset: boolean;
  isActive: boolean;
  timestampMs: number;
  detectedString?: GuitarString;
  detectedFret?: number;
  source: 'worklet' | 'analyser' | 'asio-bridge' | 'simulated';
}

export interface NoteEvaluation {
  noteId: string;
  result: JudgmentResult;
  timingErrorMs: number; // negative = early, positive = late
  centsError: number; // negative = flat, positive = sharp
  bendAchievedCents?: number;
  detectedMidi?: number;
}

export interface SessionTelemetry {
  lessonId: string;
  mode: PracticeMode;
  tier: JudgmentTier;
  score: number; // 0..100
  grade: 'S' | 'A' | 'B' | 'C' | 'Retry';
  pitchAccuracy: number; // 0..100
  timingAccuracy: number; // 0..100
  bendAccuracy: number; // 0..100
  maxFlowStreak: number;
  avgTimingErrorMs: number;
  avgCentsError: number;
  bpmPlayed: number;
  passed: boolean;
  unlockedNext: boolean;
  evaluations: NoteEvaluation[];
  weakBarIndices: number[];
}

export interface ImprovisationMetrics {
  harmonicFit: number; // 0..100
  chordToneResolution: number; // 0..100
  rhythmBreathing: number; // 0..100
  expressiveArticulation: number; // 0..100
  totalNotesPlayed: number;
  chordToneHits: number;
  inScaleHits: number;
  bendsDetected: number;
  phraseCount: number;
  overallScore: number;
  feedbackSummary: string;
}

export type AudioInputMode = 'worklet' | 'asio-bridge';
export type ChannelRouteMode = 'ch1' | 'ch2' | 'mono';

export interface AudioDeviceConfig {
  deviceId: string;
  inputMode: AudioInputMode;
  channelMode: ChannelRouteMode;
  directMonitor: boolean;
  noiseGateDb: number; // -70 to -20 dB
  latencyOffsetMs: number; // -50 to +150 ms
  asioBridgeUrl: string;
}

export interface LessonProgressRecord {
  completed: boolean;
  bestScore: number;
  bestGrade: 'S' | 'A' | 'B' | 'C' | 'Retry';
  highestTierCleared: JudgmentTier | null;
  bestBpm: number;
  earCopySolved: boolean;
}

export interface SkillRadarStats {
  mechanics: number; // 0..100
  fretboardVision: number;
  rhythmTiming: number;
  earCopy: number;
  creativePhrasing: number;
}

export interface UserProgressState {
  lessonRecords: Record<string, LessonProgressRecord>;
  dailyPracticeSeconds: number;
  dailyGoalSeconds: number;
  dayStreak: number;
  lastPracticeDate: string;
  totalCompletedCount: number;
  freeExploreMode: boolean;
  skills: SkillRadarStats;
}

export interface HummedNoteMapping {
  midi: number;
  noteName: string;
  string: GuitarString;
  fret: number;
  finger: FingerNumber;
  intervalLabel: string;
}
