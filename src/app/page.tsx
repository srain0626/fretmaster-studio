'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Surface, Tabs as HeroTabs } from '@heroui/react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MasteryRingSvg } from '@/components/icons/GuitarSvgIcons';
import { ElectricFretboard } from '@/components/fretboard/ElectricFretboard';
import { TabTimeline } from '@/components/fretboard/TabTimeline';
import { LivePitchTelemetryBar } from '@/components/audio/LivePitchTelemetryBar';
import { ChromaticTunerDialog } from '@/components/audio/ChromaticTunerDialog';
import { AudioInterfaceModal } from '@/components/audio/AudioInterfaceModal';
import { CurriculumSidebar, type ThemePreference } from '@/components/curriculum/CurriculumSidebar';
import { SkillAnalyticsDialog } from '@/components/curriculum/SkillAnalyticsDialog';
import { MasteryReportDialog } from '@/components/practice/MasteryReportDialog';
import {
  LessonGuideDialog,
  type GuideSection,
} from '@/components/practice/LessonGuideDialog';
import {
  SILK_EASE,
  STUDIO_SPRING,
  StudioMotionProvider,
} from '@/components/motion/StudioMotion';
import {
  ALL_LESSONS,
  getLessonById,
  getModuleById,
  getNextLesson,
  localizeLesson,
  localizeModule,
} from '@/data/curriculumData';
import {
  evaluateImprovisation,
  evaluateNoteHit,
  guitarAudioEngine,
  JUDGMENT_TIERS,
  mapHummedPitchesToFretboard,
  type AudioLatencyTelemetry,
} from '@/lib/lowLatencyAudioEngine';
import { guitarSynthEngine } from '@/lib/guitarSynthEngine';
import { getFingerName, getNoteMidi, midiToNoteName } from '@/lib/musicTheory';
import { useLocale } from '@/lib/i18n';
import type {
  AmpPreset,
  AudioDeviceConfig,
  FretLabelMode,
  GuitarString,
  HummedNoteMapping,
  ImprovisationMetrics,
  JudgmentResult,
  JudgmentTier,
  Lesson,
  LivePitchData,
  NoteEvaluation,
  PracticeMode,
  SessionTelemetry,
  UserProgressState,
} from '@/types/guitar';
import {
  BookOpen,
  Check,
  ChevronRight,
  Circle,
  Headphones,
  HelpCircle,
  Layers,
  Mic,
  Volume2,
  VolumeX,
} from 'lucide-react';

const STORAGE_PROGRESS_KEY = 'fretmaster_studio_progress_v1';
const STORAGE_AUDIO_KEY = 'fretmaster_studio_audio_v1';

const DEFAULT_PROGRESS: UserProgressState = {
  lessonRecords: {},
  dailyPracticeSeconds: 180,
  dailyGoalSeconds: 900,
  dayStreak: 1,
  lastPracticeDate: new Date().toISOString().slice(0, 10),
  totalCompletedCount: 0,
  freeExploreMode: false,
  skills: {
    mechanics: 32,
    fretboardVision: 28,
    rhythmTiming: 30,
    earCopy: 24,
    creativePhrasing: 25,
  },
};

const EMPTY_PITCH: LivePitchData = {
  frequency: 0,
  midiFloat: 0,
  nearestMidi: 0,
  noteName: '--',
  centsOff: 0,
  rmsDb: -90,
  clarity: 0,
  isOnset: false,
  isActive: false,
  timestampMs: 0,
  source: 'worklet',
};

interface FeedbackBanner {
  result: JudgmentResult;
  title: string;
  detail: string;
}

type BottomTabKey = 'tab' | 'lab';

export default function FretMasterStudioPage() {
  const [selectedLessonId, setSelectedLessonId] = useState<string>(ALL_LESSONS[0].id);
  const [practiceMode, setPracticeMode] = useState<PracticeMode>('guide');
  const [judgmentTier, setJudgmentTier] = useState<JudgmentTier>('relaxed');
  const [labelMode, setLabelMode] = useState<FretLabelMode>('finger');
  const [ampPreset, setAmpPreset] = useState<AmpPreset>(ALL_LESSONS[0].recommendedAmp);
  const [bottomTab, setBottomTab] = useState<BottomTabKey>('tab');

  // Transport State
  const [bpm, setBpm] = useState<number>(ALL_LESSONS[0].defaultBpm);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentBeat, setCurrentBeat] = useState(0);
  const [activeNoteIndex, setActiveNoteIndex] = useState(0);
  const [loopRangeBars, setLoopRangeBars] = useState<[number, number]>([
    0,
    ALL_LESSONS[0].totalBars - 1,
  ]);
  const [autoSpeedUp, setAutoSpeedUp] = useState(false);
  const [enableGuideGuitar, setEnableGuideGuitar] = useState(true);
  const [enableDrumsAndBass, setEnableDrumsAndBass] = useState(false);
  const [enableBackingChords, setEnableBackingChords] = useState(false);
  const [enableMetronome, setEnableMetronome] = useState(true);

  // Task completion tracking per session
  const [completedTasks, setCompletedTasks] = useState<Set<PracticeMode>>(new Set());

  // Audio DSP & Dialog State
  const [isAudioRunning, setIsAudioRunning] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [livePitch, setLivePitch] = useState<LivePitchData>(EMPTY_PITCH);
  const [audioConfig, setAudioConfig] = useState<AudioDeviceConfig>(() =>
    guitarAudioEngine.getConfig()
  );
  const [audioTelemetry, setAudioTelemetry] = useState<AudioLatencyTelemetry>(() =>
    guitarAudioEngine.getTelemetry()
  );
  const [tunerOpen, setTunerOpen] = useState(false);
  const [audioSetupOpen, setAudioSetupOpen] = useState(false);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [guideDialogOpen, setGuideDialogOpen] = useState(true);
  const [guideSection, setGuideSection] = useState<GuideSection>('both');

  // Evaluation State
  const [evaluations, setEvaluations] = useState<Record<string, NoteEvaluation>>({});
  const [feedbackBanner, setFeedbackBanner] = useState<FeedbackBanner | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [lastTelemetry, setLastTelemetry] = useState<SessionTelemetry | null>(null);

  // Ear Copy & Improvisation Lab State
  const [earCopyUnlockedIndices, setEarCopyUnlockedIndices] = useState<Set<number>>(new Set());
  const [earCopyHintLevel, setEarCopyHintLevel] = useState(0);
  const [improvEvents, setImprovEvents] = useState<
    { midi: number; barIndex: number; isBend: boolean; gapMs: number }[]
  >([]);
  const [isCapturingHum, setIsCapturingHum] = useState(false);
  const [hummedMappings, setHummedMappings] = useState<HummedNoteMapping[]>([]);

  // User Progress & Theme State
  const [progress, setProgress] = useState<UserProgressState>(DEFAULT_PROGRESS);
  const [themePreference, setThemePreference] = useState<ThemePreference>('system');

  // Refs for real-time callback sync
  const lastLoopCountRef = useRef<number>(0);
  const peakBendRef = useRef<number>(0);
  const lastProcessedNoteTimestampRef = useRef<number>(0);
  const lastImprovNoteTimeRef = useRef<number>(0);
  const lastHumMidiRef = useRef<number>(0);
  const evaluationsRef = useRef<Record<string, NoteEvaluation>>({});
  const maxFlowStreakRef = useRef<number>(0);

  const { locale, tr } = useLocale();

  const rawLesson = useMemo(
    () => getLessonById(selectedLessonId) ?? ALL_LESSONS[0],
    [selectedLessonId]
  );
  const lesson = useMemo(
    () => localizeLesson(rawLesson, locale),
    [rawLesson, locale]
  );
  const modInfo = useMemo(() => {
    const raw = getModuleById(lesson.moduleId);
    return raw ? localizeModule(raw, locale) : undefined;
  }, [lesson.moduleId, locale]);

  useEffect(() => {
    setFeedbackBanner(null);
  }, [locale]);

  const moduleLessons = useMemo(
    () => ALL_LESSONS.filter((l) => l.moduleId === lesson.moduleId),
    [lesson.moduleId]
  );
  const completedInModule = useMemo(
    () => moduleLessons.filter((l) => progress.lessonRecords[l.id]?.completed).length,
    [moduleLessons, progress.lessonRecords]
  );
  const moduleProgressPct = Math.round(
    (completedInModule / Math.max(1, moduleLessons.length)) * 100
  );

  const isPhase1 = lesson.phaseId === 'phase-1';
  const totalBeats = lesson.totalBars * lesson.beatsPerBar;
  const currentBarIndex = Math.min(
    lesson.totalBars - 1,
    Math.floor(currentBeat / lesson.beatsPerBar)
  );
  const currentChordBar =
    lesson.chordProgression[currentBarIndex % Math.max(1, lesson.chordProgression.length)];

  const keyCenterRootPc = useMemo(() => {
    const firstRoot = lesson.scaleOverlay.find((s) => s.isRoot);
    if (firstRoot) return getNoteMidi(firstRoot.string, firstRoot.fret) % 12;
    return (lesson.chordProgression[0]?.rootMidi ?? 45) % 12;
  }, [lesson]);

  // Hydrate persisted progress & audio config
  useEffect(() => {
    try {
      const savedProg = window.localStorage.getItem(STORAGE_PROGRESS_KEY);
      if (savedProg) {
        const parsed = JSON.parse(savedProg) as Partial<UserProgressState>;
        const today = new Date().toISOString().slice(0, 10);
        setProgress((prev) => ({
          ...prev,
          ...parsed,
          dailyPracticeSeconds:
            parsed.lastPracticeDate === today ? parsed.dailyPracticeSeconds ?? 0 : 0,
          lastPracticeDate: today,
        }));
      }
      const savedAudio = window.localStorage.getItem(STORAGE_AUDIO_KEY);
      if (savedAudio) {
        const parsedAudio = JSON.parse(savedAudio) as Partial<AudioDeviceConfig>;
        guitarAudioEngine.updateConfig(parsedAudio);
        setAudioConfig(guitarAudioEngine.getConfig());
      }
      const savedTheme = window.localStorage.getItem('fretmaster_theme') as ThemePreference | null;
      if (savedTheme === 'system' || savedTheme === 'light' || savedTheme === 'dark') {
        setThemePreference(savedTheme);
      }
    } catch {
      // ignore
    }
  }, []);

  // Sync system/manual light & dark theme cleanly
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');

    const applyTheme = () => {
      const isDark =
        themePreference === 'dark' || (themePreference === 'system' && mq.matches);
      const root = document.documentElement;
      root.classList.toggle('dark', isDark);
      root.setAttribute('data-theme', isDark ? 'dark' : 'light');
    };

    applyTheme();
    try {
      window.localStorage.setItem('fretmaster_theme', themePreference);
    } catch {
      // ignore
    }

    mq.addEventListener('change', applyTheme);
    return () => mq.removeEventListener('change', applyTheme);
  }, [themePreference]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_PROGRESS_KEY, JSON.stringify(progress));
    } catch {
      // ignore
    }
  }, [progress]);

  useEffect(() => {
    if (!isPlaying && !isAudioRunning) return;
    const timer = window.setInterval(() => {
      setProgress((prev) => ({
        ...prev,
        dailyPracticeSeconds: prev.dailyPracticeSeconds + 5,
        lastPracticeDate: new Date().toISOString().slice(0, 10),
      }));
    }, 5000);
    return () => clearInterval(timer);
  }, [isPlaying, isAudioRunning]);

  useEffect(() => {
    const unsubscribe = guitarAudioEngine.subscribe((data) => {
      setLivePitch(data);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    return () => {
      guitarSynthEngine.stopTransport();
      void guitarAudioEngine.stop();
    };
  }, []);

  const resetSessionState = useCallback(() => {
    guitarSynthEngine.stopTransport();
    setIsPlaying(false);
    setCurrentBeat(0);
    setActiveNoteIndex(0);
    setEvaluations({});
    evaluationsRef.current = {};
    maxFlowStreakRef.current = 0;
    setFeedbackBanner(null);
    setEarCopyUnlockedIndices(new Set());
    setEarCopyHintLevel(0);
    setImprovEvents([]);
    setHummedMappings([]);
    peakBendRef.current = 0;
    lastLoopCountRef.current = 0;
  }, []);

  const handleSelectLesson = (next: Lesson) => {
    resetSessionState();
    setSelectedLessonId(next.id);
    setBpm(next.defaultBpm);
    setAmpPreset(next.recommendedAmp);
    setLoopRangeBars([0, next.totalBars - 1]);
    setCompletedTasks(new Set());
    setGuideSection('both');
    setGuideDialogOpen(true);

    // Context-aware defaults per curriculum phase
    const nextIsPhase1 = next.phaseId === 'phase-1';
    setEnableDrumsAndBass(!nextIsPhase1);
    setEnableBackingChords(!nextIsPhase1 && !next.supportsEarCopy);

    if (next.supportsEarCopy) {
      setPracticeMode('earcopy');
      setBottomTab('lab');
      setEnableGuideGuitar(true);
    } else if (next.supportsJam) {
      setPracticeMode('jam');
      setBottomTab('lab');
      setEnableGuideGuitar(false);
    } else {
      setPracticeMode('guide');
      setBottomTab('tab');
      setEnableGuideGuitar(true);
    }
  };

  const handlePracticeModeChange = (mode: PracticeMode) => {
    resetSessionState();
    setPracticeMode(mode);
    if (mode === 'jam') {
      setEnableGuideGuitar(false);
      setEnableDrumsAndBass(true);
      setEnableBackingChords(true);
      setBottomTab('lab');
    } else if (mode === 'earcopy') {
      setEnableGuideGuitar(true);
      setLabelMode('interval');
      setBottomTab('lab');
    } else if (mode === 'exam') {
      setEnableGuideGuitar(false);
      setEnableMetronome(true);
      setBottomTab('tab');
    } else {
      setEnableGuideGuitar(true);
      setBottomTab('tab');
    }
  };

  const finalizeExamSession = useCallback(
    (evalMap: Record<string, NoteEvaluation>, finalMaxStreak: number) => {
      const noteList = lesson.notes;
      const spec = JUDGMENT_TIERS[judgmentTier];
      let pitchHits = 0;
      let timingScoreSum = 0;
      let bendTotal = 0;
      let bendHits = 0;
      let timingErrAbsSum = 0;
      let centsErrSum = 0;
      let evalCount = 0;
      const barMissMap = new Map<number, number>();

      for (const n of noteList) {
        const ev = evalMap[n.id];
        const barIdx = Math.floor(n.beatStart / lesson.beatsPerBar);
        if (!ev) {
          barMissMap.set(barIdx, (barMissMap.get(barIdx) ?? 0) + 1);
          continue;
        }
        evalCount++;
        timingErrAbsSum += ev.timingErrorMs;
        centsErrSum += ev.centsError;

        if (ev.result !== 'miss') {
          pitchHits++;
        } else {
          barMissMap.set(barIdx, (barMissMap.get(barIdx) ?? 0) + 1);
        }

        if (ev.result === 'perfect') timingScoreSum += 100;
        else if (ev.result === 'good') timingScoreSum += 80;
        else if (ev.result === 'pass') timingScoreSum += 60;

        if (n.bendCents && n.bendCents > 0) {
          bendTotal++;
          if (ev.result !== 'miss') bendHits++;
        }
      }

      const pitchAccuracy = Math.round((pitchHits / Math.max(1, noteList.length)) * 100);
      const timingAccuracy = Math.round(timingScoreSum / Math.max(1, noteList.length));
      const bendAccuracy =
        bendTotal > 0 ? Math.round((bendHits / bendTotal) * 100) : pitchAccuracy;

      const score = Math.round(
        pitchAccuracy * 0.5 + timingAccuracy * 0.35 + bendAccuracy * 0.15
      );
      const passed = score >= spec.minPassScore;
      const grade: SessionTelemetry['grade'] =
        score >= 94 ? 'S' : score >= 85 ? 'A' : score >= 75 ? 'B' : score >= 65 ? 'C' : 'Retry';

      const weakBarIndices = Array.from(barMissMap.entries())
        .filter(([, misses]) => misses >= 1)
        .map(([b]) => b);

      const report: SessionTelemetry = {
        lessonId: lesson.id,
        mode: practiceMode,
        tier: judgmentTier,
        score,
        grade,
        pitchAccuracy,
        timingAccuracy,
        bendAccuracy,
        maxFlowStreak: finalMaxStreak,
        avgTimingErrorMs: evalCount > 0 ? Math.round(timingErrAbsSum / evalCount) : 0,
        avgCentsError: evalCount > 0 ? Math.round(centsErrSum / evalCount) : 0,
        bpmPlayed: bpm,
        passed,
        unlockedNext: passed,
        evaluations: Object.values(evalMap),
        weakBarIndices,
      };

      setLastTelemetry(report);
      setReportOpen(true);

      if (passed) {
        setCompletedTasks((prev) => new Set(prev).add('exam'));
      }

      setProgress((prev) => {
        const existing = prev.lessonRecords[lesson.id];
        const nextCompleted = Boolean(existing?.completed || passed);
        const nextRecords = {
          ...prev.lessonRecords,
          [lesson.id]: {
            completed: nextCompleted,
            bestScore: Math.max(existing?.bestScore ?? 0, score),
            bestGrade:
              existing?.bestScore && existing.bestScore > score ? existing.bestGrade : grade,
            highestTierCleared: passed ? judgmentTier : existing?.highestTierCleared ?? null,
            bestBpm: Math.max(existing?.bestBpm ?? 0, passed ? bpm : 0),
            earCopySolved: existing?.earCopySolved ?? false,
          },
        };
        const totalCompletedCount = Object.values(nextRecords).filter((r) => r.completed).length;

        const skillBump = passed ? 4 : 1;
        const nextSkills = { ...prev.skills };
        if (lesson.category === 'mechanics' || lesson.category === 'techniques') {
          nextSkills.mechanics = Math.min(100, nextSkills.mechanics + skillBump);
        }
        if (lesson.category === 'scales' || lesson.category === 'chords') {
          nextSkills.fretboardVision = Math.min(100, nextSkills.fretboardVision + skillBump);
        }
        if (timingAccuracy >= 75) {
          nextSkills.rhythmTiming = Math.min(100, nextSkills.rhythmTiming + skillBump);
        }
        if (lesson.category === 'genres' || lesson.category === 'solos') {
          nextSkills.creativePhrasing = Math.min(100, nextSkills.creativePhrasing + skillBump);
        }

        return {
          ...prev,
          lessonRecords: nextRecords,
          totalCompletedCount,
          skills: nextSkills,
        };
      });
    },
    [bpm, judgmentTier, lesson, practiceMode]
  );

  const toggleTransport = useCallback(() => {
    if (isPlaying) {
      guitarSynthEngine.stopTransport();
      setIsPlaying(false);
      return;
    }

    if (practiceMode === 'wait') {
      const target = lesson.notes[activeNoteIndex];
      if (target) {
        guitarSynthEngine.playNoteEvent(target, ampPreset, 60 / bpm);
      }
      setFeedbackBanner({
        result: 'good',
        title: tr('Waiting', '대기 중'),
        detail: tr(
          'Play the highlighted note on your guitar or click the fretboard to advance.',
          '지판의 음을 기타로 치거나 클릭하면 다음 음으로 넘어갑니다.'
        ),
      });
      return;
    }

    setEvaluations({});
    evaluationsRef.current = {};
    maxFlowStreakRef.current = 0;
    lastLoopCountRef.current = 0;
    setIsPlaying(true);

    guitarSynthEngine.startTransport({
      bpm,
      notes: lesson.notes,
      chordProgression: lesson.chordProgression,
      totalBars: lesson.totalBars,
      beatsPerBar: lesson.beatsPerBar,
      ampPreset,
      loopRangeBars,
      enableGuideGuitar,
      enableBackingChords,
      enableDrumsAndBass,
      enableMetronome,
      autoSpeedUpBpm: autoSpeedUp && practiceMode === 'loop' ? 5 : 0,
      onBeatUpdate: (beat, _barIdx, loopIdx, bumpedBpm) => {
        setCurrentBeat(beat);
        if (bumpedBpm) setBpm(bumpedBpm);

        let activeIdx = 0;
        for (let i = 0; i < lesson.notes.length; i++) {
          if (lesson.notes[i].beatStart <= beat + 0.15) {
            activeIdx = i;
          }
        }
        setActiveNoteIndex(activeIdx);

        if (loopIdx > lastLoopCountRef.current) {
          lastLoopCountRef.current = loopIdx;
          if (practiceMode === 'guide' || practiceMode === 'loop') {
            setCompletedTasks((prev) => new Set(prev).add(practiceMode));
          }
          if (practiceMode === 'exam') {
            guitarSynthEngine.stopTransport();
            setIsPlaying(false);
            finalizeExamSession(evaluationsRef.current, maxFlowStreakRef.current);
          }
        }
      },
    });
  }, [
    activeNoteIndex,
    ampPreset,
    autoSpeedUp,
    bpm,
    enableBackingChords,
    enableDrumsAndBass,
    enableGuideGuitar,
    enableMetronome,
    finalizeExamSession,
    isPlaying,
    lesson,
    loopRangeBars,
    practiceMode,
    tr,
  ]);

  useEffect(() => {
    if (!isPlaying) return;
    guitarSynthEngine.updateTransportOptions({
      bpm,
      ampPreset,
      loopRangeBars,
      enableGuideGuitar,
      enableBackingChords,
      enableDrumsAndBass,
      enableMetronome,
      autoSpeedUpBpm: autoSpeedUp && practiceMode === 'loop' ? 5 : 0,
    });
  }, [
    ampPreset,
    autoSpeedUp,
    bpm,
    enableBackingChords,
    enableDrumsAndBass,
    enableGuideGuitar,
    enableMetronome,
    isPlaying,
    loopRangeBars,
    practiceMode,
  ]);

  // Real-time Pitch Evaluation (Real Guitar + Fretboard Click)
  useEffect(() => {
    if (!livePitch.isActive) return;

    if (isCapturingHum && livePitch.clarity > 0.65) {
      const rounded = Math.round(livePitch.midiFloat);
      if (rounded !== lastHumMidiRef.current && rounded >= 36 && rounded <= 84) {
        lastHumMidiRef.current = rounded;
        setHummedMappings((prev) => {
          const nextMidis = [
            ...prev.slice(-11).map((p) => p.midi),
            rounded,
          ];
          return mapHummedPitchesToFretboard(
            nextMidis,
            lesson.focusFretRange,
            lesson.scaleOverlay,
            keyCenterRootPc
          );
        });
      }
      return;
    }

    const targetNote = lesson.notes[activeNoteIndex];
    if (targetNote?.bendCents) {
      const baseMidi = getNoteMidi(targetNote.string, targetNote.fret);
      const raised = (livePitch.midiFloat - baseMidi) * 100;
      if (raised > peakBendRef.current) {
        peakBendRef.current = raised;
      }
    }

    if (livePitch.timestampMs === lastProcessedNoteTimestampRef.current) return;
    if (!livePitch.isOnset && !targetNote?.bendCents) return;
    if (!livePitch.isOnset && targetNote?.bendCents) {
      const spec = JUDGMENT_TIERS[judgmentTier];
      if (peakBendRef.current < targetNote.bendCents * spec.bendCompletionRatio) {
        return;
      }
    }
    lastProcessedNoteTimestampRef.current = livePitch.timestampMs;

    // Wait-for-Note Mode
    if (practiceMode === 'wait' && targetNote) {
      const ev = evaluateNoteHit(
        targetNote,
        livePitch.midiFloat,
        0,
        judgmentTier,
        peakBendRef.current
      );

      if (ev.result !== 'miss') {
        const nextEvals = { ...evaluationsRef.current, [targetNote.id]: ev };
        evaluationsRef.current = nextEvals;
        setEvaluations(nextEvals);
        peakBendRef.current = 0;

        setFeedbackBanner({
          result: ev.result,
          title: tr('Nice', '좋아요'),
          detail: tr(
            `String ${targetNote.string}, Fret ${targetNote.fret} recognized`,
            `${targetNote.string}번 줄 ${targetNote.fret}프렛 인식 완료`
          ),
        });

        if (activeNoteIndex + 1 < lesson.notes.length) {
          setActiveNoteIndex((i) => i + 1);
        } else {
          setCompletedTasks((prev) => new Set(prev).add('wait'));
          setFeedbackBanner({
            result: 'perfect',
            title: tr('Step-by-Step Complete', '한 음씩 따라치기 완료'),
            detail: tr('Now try playing along in tempo.', '이제 템포에 맞춰 완주해 보세요.'),
          });
          setActiveNoteIndex(0);
        }
      } else {
        const targetMidi = getNoteMidi(targetNote.string, targetNote.fret);
        const diffSemis = Math.round(livePitch.midiFloat - targetMidi);
        const absSemis = Math.abs(diffSemis);
        const directionTip =
          diffSemis > 0
            ? tr(
                `Slightly sharp · ${absSemis} fret${absSemis === 1 ? '' : 's'} left`,
                `조금 높아요 · ${absSemis}프렛 왼쪽으로`
              )
            : tr(
                `Slightly flat · ${absSemis} fret${absSemis === 1 ? '' : 's'} right`,
                `조금 낮아요 · ${absSemis}프렛 오른쪽으로`
              );

        setFeedbackBanner({
          result: 'miss',
          title: tr('Check Pitch', '음정 확인'),
          detail:
            diffSemis === 0
              ? tr('Press slightly cleaner right behind the fret', '조금 더 정확히 눌러보세요')
              : directionTip,
        });
      }
      return;
    }

    // Ear Copy Deck Mode
    if (practiceMode === 'earcopy') {
      const targetIdx = lesson.notes.findIndex((_, i) => !earCopyUnlockedIndices.has(i));
      if (targetIdx === -1) return;
      const earTarget = lesson.notes[targetIdx];
      const ev = evaluateNoteHit(
        earTarget,
        livePitch.midiFloat,
        0,
        judgmentTier,
        peakBendRef.current
      );

      if (ev.result !== 'miss') {
        peakBendRef.current = 0;
        const nextSet = new Set(earCopyUnlockedIndices);
        nextSet.add(targetIdx);
        setEarCopyUnlockedIndices(nextSet);
        setActiveNoteIndex(Math.min(lesson.notes.length - 1, targetIdx + 1));

        setFeedbackBanner({
          result: 'perfect',
          title: tr(`Note #${targetIdx + 1} found`, `${targetIdx + 1}번째 음 찾음`),
          detail: tr(
            `String ${earTarget.string} · Fret ${earTarget.fret}`,
            `${earTarget.string}번 줄 ${earTarget.fret}프렛`
          ),
        });

        if (nextSet.size === lesson.notes.length) {
          setCompletedTasks((prev) => new Set(prev).add('earcopy'));
          setProgress((prev) => {
            const existing = prev.lessonRecords[lesson.id];
            const nextRecords = {
              ...prev.lessonRecords,
              [lesson.id]: {
                completed: true,
                bestScore: Math.max(existing?.bestScore ?? 0, 95),
                bestGrade: 'S' as const,
                highestTierCleared: judgmentTier,
                bestBpm: Math.max(existing?.bestBpm ?? 0, bpm),
                earCopySolved: true,
              },
            };
            return {
              ...prev,
              lessonRecords: nextRecords,
              totalCompletedCount: Object.values(nextRecords).filter((r) => r.completed).length,
              skills: {
                ...prev.skills,
                earCopy: Math.min(100, prev.skills.earCopy + 8),
              },
            };
          });
        }
      } else {
        const targetMidi = getNoteMidi(earTarget.string, earTarget.fret);
        setFeedbackBanner({
          result: 'miss',
          title: `${livePitch.noteName}`,
          detail:
            livePitch.midiFloat > targetMidi
              ? tr(
                  'Higher than target. Try searching a lower pitch.',
                  '정답보다 높아요. 더 낮은 음을 찾아보세요.'
                )
              : tr(
                  'Lower than target. Try searching a higher pitch.',
                  '정답보다 낮아요. 더 높은 음을 찾아보세요.'
                ),
        });
      }
      return;
    }

    // Free Jam Mode
    if (practiceMode === 'jam' && isPlaying) {
      const now = performance.now();
      const gapMs =
        lastImprovNoteTimeRef.current > 0 ? now - lastImprovNoteTimeRef.current : 500;
      lastImprovNoteTimeRef.current = now;
      const isBend = Math.abs(livePitch.centsOff) > 28;
      const barIdx = Math.floor(currentBeat / lesson.beatsPerBar);

      setImprovEvents((prev) => [
        ...prev.slice(-60),
        {
          midi: livePitch.nearestMidi,
          barIndex: barIdx,
          isBend,
          gapMs,
        },
      ]);
      return;
    }

    // Timed Loop & Exam Modes
    if ((practiceMode === 'loop' || practiceMode === 'exam') && isPlaying) {
      const secPerBeat = 60 / bpm;
      const loopStartBeat = loopRangeBars[0] * lesson.beatsPerBar;
      let closestNote: (typeof lesson.notes)[number] | null = null;
      let minBeatDiff = 999;

      for (const n of lesson.notes) {
        if (n.beatStart < loopStartBeat - 0.1) continue;
        const diff = currentBeat - n.beatStart;
        if (Math.abs(diff) < Math.abs(minBeatDiff)) {
          minBeatDiff = diff;
          closestNote = n;
        }
      }

      if (!closestNote || Math.abs(minBeatDiff) > 1.0) return;
      const timingErrorMs = minBeatDiff * secPerBeat * 1000;
      const ev = evaluateNoteHit(
        closestNote,
        livePitch.midiFloat,
        timingErrorMs,
        judgmentTier,
        peakBendRef.current
      );

      const nextEvals = { ...evaluationsRef.current, [closestNote.id]: ev };
      evaluationsRef.current = nextEvals;
      setEvaluations(nextEvals);
      peakBendRef.current = 0;

      if (ev.result !== 'miss') {
        maxFlowStreakRef.current += 1;
      } else {
        maxFlowStreakRef.current = 0;
      }

      const timingMsg =
        Math.abs(ev.timingErrorMs) <= 20
          ? tr('On beat', '정확한 박자')
          : ev.timingErrorMs < 0
          ? tr(`Slightly early (${ev.timingErrorMs}ms)`, `조금 빠름 (${ev.timingErrorMs}ms)`)
          : tr(`Slightly late (+${ev.timingErrorMs}ms)`, `조금 늦음 (+${ev.timingErrorMs}ms)`);

      setFeedbackBanner({
        result: ev.result,
        title: ev.result === 'miss' ? tr('Miss', '빗나감') : tr('Hit', '정확해요'),
        detail: timingMsg,
      });
    }
  }, [
    activeNoteIndex,
    bpm,
    currentBeat,
    earCopyUnlockedIndices,
    isCapturingHum,
    isPlaying,
    judgmentTier,
    keyCenterRootPc,
    lesson,
    livePitch,
    loopRangeBars,
    practiceMode,
    tr,
  ]);

  const handleFretClick = useCallback(
    (string: GuitarString, fret: number) => {
      const targetNote = lesson.notes[activeNoteIndex];
      const bend =
        targetNote && targetNote.string === string && targetNote.fret === fret
          ? targetNote.bendCents ?? 0
          : 0;
      guitarSynthEngine.playSingleGuitarNote(
        string,
        fret,
        ampPreset,
        0.55,
        bend,
        targetNote?.technique ?? 'normal'
      );
      guitarAudioEngine.emitSimulatedNote(string, fret, bend);
    },
    [activeNoteIndex, ampPreset, lesson.notes]
  );

  // Keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (e.code === 'Space') {
        e.preventDefault();
        toggleTransport();
        return;
      }

      if (['1', '2', '3', '4', '0'].includes(e.key)) {
        const fingerPressed = Number(e.key);
        const active = lesson.notes[activeNoteIndex];
        if (!active) return;

        if (active.finger === fingerPressed) {
          handleFretClick(active.string, active.fret);
        } else {
          const shiftedFret = Math.max(0, active.fret + (fingerPressed - active.finger));
          guitarSynthEngine.playSingleGuitarNote(active.string, shiftedFret, ampPreset, 0.35);
          setFeedbackBanner({
            result: 'miss',
            title: tr('Check Finger', '손가락 확인'),
            detail: tr(
              `Press fret ${active.fret} using ${getFingerName(active.finger, locale)}.`,
              `${getFingerName(active.finger, locale)}로 ${active.fret}프렛을 짚어보세요.`
            ),
          });
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeNoteIndex, ampPreset, handleFretClick, lesson.notes, locale, toggleTransport, tr]);

  const handleToggleAudio = async () => {
    if (isAudioRunning) {
      await guitarAudioEngine.stop();
      setIsAudioRunning(false);
      setAudioTelemetry(guitarAudioEngine.getTelemetry());
      setAudioError(null);
      return;
    }

    try {
      setAudioError(null);
      const tel = await guitarAudioEngine.start(audioConfig);
      setAudioTelemetry(tel);
      setIsAudioRunning(true);
    } catch (err) {
      setAudioError(err instanceof Error ? err.message : tr('Audio connection failed', '오디오 연결 실패'));
      setIsAudioRunning(false);
    }
  };

  const handleUpdateAudioConfig = (partial: Partial<AudioDeviceConfig>) => {
    guitarAudioEngine.updateConfig(partial);
    const updated = guitarAudioEngine.getConfig();
    setAudioConfig(updated);
    try {
      window.localStorage.setItem(STORAGE_AUDIO_KEY, JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  const handleRestartAudio = async () => {
    try {
      setAudioError(null);
      const tel = await guitarAudioEngine.start(audioConfig);
      setAudioTelemetry(tel);
      setIsAudioRunning(true);
    } catch (err) {
      setAudioError(err instanceof Error ? err.message : tr('Audio restart failed', '오디오 재시작 실패'));
    }
  };

  const improvMetrics: ImprovisationMetrics = useMemo(
    () => evaluateImprovisation(improvEvents, lesson.scaleOverlay, lesson.chordProgression, locale),
    [improvEvents, lesson.chordProgression, lesson.scaleOverlay, locale]
  );

  const nextLesson = useMemo(() => getNextLesson(lesson.id), [lesson.id]);

  // Task Checklist tailored to Lesson Type
  const lessonTasks = useMemo(() => {
    if (lesson.supportsEarCopy) {
      return [
        {
          mode: 'guide' as PracticeMode,
          label: tr('Listen to Target Riff', '문제 음원 들어보기'),
          hint: tr('Learn pitch contour', '음의 높낮이 익히기'),
        },
        {
          mode: 'earcopy' as PracticeMode,
          label: tr('Transcribe by Ear', '귀로 듣고 채보하기'),
          hint: tr('Find notes without TAB', '악보 없이 음 찾기'),
        },
      ];
    }
    if (lesson.supportsJam) {
      return [
        {
          mode: 'guide' as PracticeMode,
          label: tr('Listen to Demo Solo', '예시 반주 · 솔로 듣기'),
          hint: tr('Follow harmonic flow', '화성 흐름 익히기'),
        },
        {
          mode: 'jam' as PracticeMode,
          label: tr('Free Backing & Improv Jam', '자유 반주 · 즉흥 잼'),
          hint: tr('Phrase your own solo', '내 음악으로 표현하기'),
        },
      ];
    }
    return [
      {
        mode: 'guide' as PracticeMode,
        label: tr('Listen to Demo', '소리 들어보기'),
        hint: tr('Check melody & rhythm', '멜로디와 리듬 확인'),
      },
      {
        mode: 'wait' as PracticeMode,
        label: tr('Step-by-Step Wait Mode', '한 음씩 따라치기'),
        hint: tr('Learn fingering at your pace', '내 속도로 운지 익히기'),
      },
      {
        mode: 'loop' as PracticeMode,
        label: tr('Loop in Tempo', '템포 맞춰 완주하기'),
        hint: tr(`Lock into ${bpm} BPM`, `${bpm} BPM 리듬 연결`),
      },
      {
        mode: 'exam' as PracticeMode,
        label: tr('Take Passing Exam', '통과 테스트 보기'),
        hint: tr('Unlock next lesson', '다음 단계 해금'),
      },
    ];
  }, [bpm, lesson.supportsEarCopy, lesson.supportsJam, tr]);

  // Primary Action Button Label & Handler (One Clear CTA per Screen)
  const primaryCta = useMemo(() => {
    if (practiceMode === 'guide') {
      return {
        label: tr('Start Step-by-Step', '한 음씩 따라치기'),
        onClick: () => handlePracticeModeChange(lesson.supportsEarCopy ? 'earcopy' : lesson.supportsJam ? 'jam' : 'wait'),
      };
    }
    if (practiceMode === 'wait') {
      return {
        label: tr('Go to Tempo Loop', '템포 연습으로 이동'),
        onClick: () => handlePracticeModeChange('loop'),
      };
    }
    if (practiceMode === 'loop') {
      return {
        label: tr('Take Passing Exam', '통과 테스트 보기'),
        onClick: () => handlePracticeModeChange('exam'),
      };
    }
    if (practiceMode === 'exam') {
      return {
        label: isPlaying ? tr('Stop Exam', '테스트 중지') : tr('Start Exam', '테스트 시작'),
        onClick: toggleTransport,
      };
    }
    return {
      label: isPlaying ? tr('Stop', '정지') : tr('Play Backing', '반주 재생'),
      onClick: toggleTransport,
    };
  }, [isPlaying, lesson.supportsEarCopy, lesson.supportsJam, practiceMode, toggleTransport, tr]);

  // Concise 1-line guidance for current note
  const activeNote = lesson.notes[activeNoteIndex];
  const currentFocusSentence = useMemo(() => {
    if (feedbackBanner) return feedbackBanner.detail;
    if (practiceMode === 'earcopy') {
      return tr(
        'Listen to the target riff, then find matching pitches directly on the fretboard.',
        '문제 음원을 들은 뒤 지판에서 똑같은 소리가 나는 위치를 찾아보세요.'
      );
    }
    if (practiceMode === 'jam') {
      return tr(
        `When the ${currentChordBar?.chordName ?? ''} chord sounds, target the highlighted scale and chord tones freely.`,
        `${currentChordBar?.chordName ?? ''} 코드가 울릴 때 지판 위 밝은 점을 기준으로 자유롭게 쳐보세요.`
      );
    }
    if (activeNote?.coachingNote) return activeNote.coachingNote;
    if (activeNote) {
      return tr(
        `Play string ${activeNote.string}, ${
          activeNote.fret === 0 ? 'open string' : `fret ${activeNote.fret}`
        } using ${getFingerName(activeNote.finger, locale)}.`,
        `${getFingerName(activeNote.finger, locale)}로 ${activeNote.string}번 줄 ${
          activeNote.fret === 0 ? '개방현' : `${activeNote.fret}프렛`
        }을 소리 내보세요.`
      );
    }
    return lesson.postureGuide.leftHandTip;
  }, [activeNote, currentChordBar, feedbackBanner, lesson.postureGuide.leftHandTip, locale, practiceMode, tr]);

  const showFourthLabTab = lesson.supportsEarCopy || lesson.supportsJam || !isPhase1;

  return (
    <StudioMotionProvider>
      <div className="min-h-screen grid grid-cols-1 lg:grid-cols-[232px_minmax(0,1fr)_284px] bg-background text-foreground">
        {/* ==================== 1. LEFT SIDEBAR (Dribbble Creatica Left Nav) ==================== */}
        <CurriculumSidebar
          selectedLessonId={lesson.id}
          onSelectLesson={handleSelectLesson}
          progress={progress}
          onToggleFreeExplore={(enabled) =>
            setProgress((prev) => ({ ...prev, freeExploreMode: enabled }))
          }
          onOpenAnalytics={() => setAnalyticsOpen(true)}
          themePreference={themePreference}
          onThemeChange={setThemePreference}
        />

        {/* ==================== 2. CENTER MAIN WORKSPACE ==================== */}
        <main className="min-w-0 px-4 sm:px-7 py-5 space-y-5">
          {/* Minimal 1-Line Top Bar: Breadcrumb + Audio Status */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <nav className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span>{modInfo?.phaseTitle.split('·')[0].trim()}</span>
              <ChevronRight className="w-3.5 h-3.5" />
              <span>Module {modInfo?.number}</span>
              <ChevronRight className="w-3.5 h-3.5" />
              <span className="font-medium text-foreground font-mono">{lesson.code}</span>
            </nav>

            <LivePitchTelemetryBar
              isAudioRunning={isAudioRunning}
              onToggleAudio={handleToggleAudio}
              livePitch={livePitch}
              telemetry={audioTelemetry}
              config={audioConfig}
              onOpenTuner={() => setTunerOpen(true)}
              onOpenAudioSetup={() => setAudioSetupOpen(true)}
              audioError={audioError}
            />
          </div>

          {/* Primary Viewport: Electric Guitar Fretboard + Integrated Player Bar */}
          <ElectricFretboard
            phaseId={lesson.phaseId}
            notes={lesson.notes}
            activeNoteIndex={activeNoteIndex}
            scaleOverlay={lesson.scaleOverlay}
            currentChordBar={currentChordBar}
            focusFretRange={lesson.focusFretRange}
            keyCenterRootPc={keyCenterRootPc}
            labelMode={labelMode}
            onLabelModeChange={setLabelMode}
            practiceMode={practiceMode}
            judgmentTier={judgmentTier}
            livePitch={livePitch}
            earCopyUnlockedIndices={earCopyUnlockedIndices}
            earCopyHintLevel={earCopyHintLevel}
            hummedMappings={hummedMappings}
            onFretClick={handleFretClick}
            isPlaying={isPlaying}
            onTogglePlay={toggleTransport}
            onReset={resetSessionState}
            currentBeat={currentBeat}
            totalBeats={totalBeats}
            bpm={bpm}
            minBpm={lesson.minBpm}
            maxBpm={lesson.maxBpm}
            onBpmChange={setBpm}
            ampPreset={ampPreset}
            onAmpPresetChange={setAmpPreset}
          />

          {/* Lesson Title (No Subtitle) + Primary Action CTA */}
          <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-4 pt-1">
            <motion.h1
              key={lesson.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.16, ease: SILK_EASE }}
              className="text-lg sm:text-xl font-bold tracking-tight text-foreground leading-snug"
            >
              {lesson.title}
            </motion.h1>

            <div className="flex items-center gap-2 shrink-0">
              {lastTelemetry && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setReportOpen(true)}
                >
                  {tr(`Last Result (${lastTelemetry.score})`, `최근 결과 (${lastTelemetry.score}점)`)}
                </Button>
              )}
              <Button type="button" size="sm" onClick={primaryCta.onClick}>
                {primaryCta.label}
              </Button>
            </div>
          </div>

          {/* Bottom Progressive Disclosure Tabs (Only shown when Lab/Mixer tab applies) */}
          {showFourthLabTab && (
            <HeroTabs
              selectedKey={bottomTab}
              onSelectionChange={(key) => setBottomTab(String(key) as BottomTabKey)}
              variant="secondary"
              orientation="horizontal"
              className="w-full"
            >
              <HeroTabs.ListContainer>
                <HeroTabs.List aria-label={tr('Practice tools', '연습 도구')} className="flex flex-row gap-4">
                  <HeroTabs.Tab
                    id="tab"
                    className="w-auto px-1 pb-2.5 text-sm font-medium whitespace-nowrap"
                  >
                    {tr('TAB Score', '타브 악보')}
                    <HeroTabs.Indicator />
                  </HeroTabs.Tab>
                  <HeroTabs.Tab
                    id="lab"
                    className="w-auto px-1 pb-2.5 text-sm font-medium whitespace-nowrap"
                  >
                    {lesson.supportsEarCopy
                      ? tr('Ear Copy Lab', '귀카피 도구')
                      : lesson.supportsJam
                      ? tr('Improv & Hum', '즉흥 · 허밍')
                      : tr('Audio Mixer', '소리 믹서')}
                    <HeroTabs.Indicator />
                  </HeroTabs.Tab>
                </HeroTabs.List>
              </HeroTabs.ListContainer>
            </HeroTabs>
          )}

          {/* Single Active Tab Content */}
          <AnimatePresence initial={false}>
            {(!showFourthLabTab || bottomTab === 'tab') && (
              <motion.div
                key="panel-tab"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.15, ease: SILK_EASE }}
              >
                <TabTimeline
                  phaseId={lesson.phaseId}
                  notes={lesson.notes}
                  chordProgression={lesson.chordProgression}
                  totalBars={lesson.totalBars}
                  beatsPerBar={lesson.beatsPerBar}
                  activeNoteIndex={activeNoteIndex}
                  currentBeat={currentBeat}
                  isPlaying={isPlaying}
                  loopRangeBars={loopRangeBars}
                  onLoopRangeChange={setLoopRangeBars}
                  onSelectNote={(idx) => {
                    setActiveNoteIndex(idx);
                    const n = lesson.notes[idx];
                    if (n && practiceMode !== 'earcopy') {
                      guitarSynthEngine.playNoteEvent(n, ampPreset, 60 / bpm);
                    }
                  }}
                  evaluations={evaluations}
                  practiceMode={practiceMode}
                  earCopyUnlockedIndices={earCopyUnlockedIndices}
                  earCopyHintLevel={earCopyHintLevel}
                />
              </motion.div>
            )}

            {bottomTab === 'lab' && showFourthLabTab && (
              <motion.div
                key="panel-lab"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.15, ease: SILK_EASE }}
              >
                {lesson.supportsEarCopy ? (
                  <Surface variant="default" className="rounded-xl border border-border p-5 space-y-3.5">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold">
                        {tr(
                          `Ear Copy Transcription (${earCopyUnlockedIndices.size} / ${lesson.notes.length})`,
                          `귀카피 채보 (${earCopyUnlockedIndices.size} / ${lesson.notes.length})`
                        )}
                      </span>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => {
                            setEnableGuideGuitar(true);
                            toggleTransport();
                          }}
                        >
                          <Headphones className="w-3.5 h-3.5 mr-1.5" />
                          {isPlaying ? tr('Stop', '정지') : tr('Listen', '문제 듣기')}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => setEarCopyHintLevel((h) => Math.min(3, h + 1))}
                        >
                          <HelpCircle className="w-3.5 h-3.5 mr-1.5" />
                          {tr(`Hint (${earCopyHintLevel}/3)`, `힌트 (${earCopyHintLevel}/3)`)}
                        </Button>
                      </div>
                    </div>
                    <Progress
                      value={(earCopyUnlockedIndices.size / Math.max(1, lesson.notes.length)) * 100}
                      className="h-2"
                    />
                    {earCopyHintLevel > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {earCopyHintLevel === 1 &&
                          tr('Scale zone overlay is now visible on the fretboard.', '지판에 스케일 영역이 표시되었습니다.')}
                        {earCopyHintLevel === 2 &&
                          tr('The starting first note has been revealed.', '첫 번째 시작 음이 공개되었습니다.')}
                        {earCopyHintLevel >= 3 &&
                          tr('The complete target TAB score is revealed.', '전체 정답 악보가 공개되었습니다.')}
                      </p>
                    )}
                  </Surface>
                ) : lesson.supportsJam ? (
                  <Surface variant="default" className="rounded-xl border border-border p-5 space-y-4">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {(
                        [
                          { label: tr('Scale Fit', '스케일 조화'), val: improvMetrics.harmonicFit },
                          { label: tr('Chord Tones', '코드 톤 착지'), val: improvMetrics.chordToneResolution },
                          { label: tr('Phrasing Space', '리듬 여백'), val: improvMetrics.rhythmBreathing },
                          { label: tr('Expression', '표현 기법'), val: improvMetrics.expressiveArticulation },
                        ] as const
                      ).map((m) => (
                        <div key={m.label} className="rounded-lg bg-secondary/50 p-3 space-y-1.5">
                          <div className="text-[11px] text-muted-foreground">{m.label}</div>
                          <div className="font-mono text-base font-bold tabular-nums">{m.val}%</div>
                          <Progress value={m.val} className="h-1" />
                        </div>
                      ))}
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3">
                      <div className="text-xs text-muted-foreground">
                        {tr(
                          'Hum a melody in your head to map it into the current fretboard position.',
                          '머릿속 멜로디를 흥얼거리면 현재 포지션 운지로 바꿔 지판에 띄워줍니다.'
                        )}
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant={isCapturingHum ? 'destructive' : 'outline'}
                        onClick={async () => {
                          if (!isAudioRunning) await handleToggleAudio();
                          if (!isCapturingHum) {
                            lastHumMidiRef.current = 0;
                            setHummedMappings([]);
                            setIsCapturingHum(true);
                          } else {
                            setIsCapturingHum(false);
                          }
                        }}
                      >
                        <Mic className="w-3.5 h-3.5 mr-1.5" />
                        {isCapturingHum ? tr('Stop Capture', '채보 종료') : tr('Hum-to-Fret', '허밍 매핑')}
                      </Button>
                    </div>
                  </Surface>
                ) : (
                  <Surface variant="default" className="rounded-xl border border-border p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant={enableGuideGuitar ? 'default' : 'outline'}
                          onClick={() => setEnableGuideGuitar((v) => !v)}
                        >
                          {enableGuideGuitar ? <Volume2 className="w-3.5 h-3.5 mr-1" /> : <VolumeX className="w-3.5 h-3.5 mr-1" />}
                          {tr('Guide Guitar', '가이드 기타')}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant={enableDrumsAndBass ? 'default' : 'outline'}
                          onClick={() => setEnableDrumsAndBass((v) => !v)}
                        >
                          {tr('Drums & Bass', '드럼 · 베이스')}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant={enableBackingChords ? 'default' : 'outline'}
                          onClick={() => setEnableBackingChords((v) => !v)}
                        >
                          {tr('Backing Chords', '코드 반주')}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant={enableMetronome ? 'default' : 'outline'}
                          onClick={() => setEnableMetronome((v) => !v)}
                        >
                          {tr('Metronome', '메트로놈')}
                        </Button>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-muted-foreground">
                          {tr('+5 BPM per loop', '반복 시 +5 BPM 가속')}
                        </span>
                        <Switch checked={autoSpeedUp} onCheckedChange={setAutoSpeedUp} />
                      </div>
                    </div>
                  </Surface>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {/* ==================== 3. RIGHT PANEL (Course Progress + Lesson Tasks + Bottom Guide) ==================== */}
        <aside className="flex flex-col border-t lg:border-t-0 lg:border-l border-border bg-card/60 px-5 py-5 gap-4">
          {/* COURSE PROGRESS */}
          <div className="rounded-2xl border border-border bg-card p-4 flex items-center justify-between">
            <div>
              <div className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                COURSE PROGRESS
              </div>
              <div className="mt-1 text-sm font-semibold text-foreground tabular-nums">
                {tr(
                  `${completedInModule} / ${moduleLessons.length} lessons completed`,
                  `${completedInModule} / ${moduleLessons.length} 레슨 완료`
                )}
              </div>
            </div>
            <MasteryRingSvg progress={moduleProgressPct} size={44} label={`${moduleProgressPct}%`} />
          </div>

          {/* LESSON TASKS (Interactive Checklist Driving Practice Modes) */}
          <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
            <div className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
              LESSON TASKS
            </div>

            <div className="space-y-2">
              {lessonTasks.map((task) => {
                const isActive = practiceMode === task.mode;
                const isDone = completedTasks.has(task.mode);

                return (
                  <button
                    key={task.mode}
                    type="button"
                    onClick={() => handlePracticeModeChange(task.mode)}
                    className={`w-full flex items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors ${
                      isActive ? 'bg-secondary/90' : 'hover:bg-secondary/50'
                    }`}
                  >
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition-colors ${
                        isDone
                          ? 'bg-primary border-primary text-primary-foreground'
                          : isActive
                          ? 'border-primary bg-accent-soft text-primary'
                          : 'border-border bg-background text-muted-foreground'
                      }`}
                    >
                      {isDone ? (
                        <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                      ) : isActive ? (
                        <span className="h-2 w-2 rounded-full bg-primary" />
                      ) : (
                        <Circle className="w-3.5 h-3.5 opacity-0" />
                      )}
                    </span>

                    <div className="min-w-0">
                      <div
                        className={`text-xs font-semibold truncate ${
                          isActive ? 'text-foreground' : 'text-foreground/85'
                        }`}
                      >
                        {task.label}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Judgment Precision Selector appears cleanly ONLY when Exam is selected */}
            {practiceMode === 'exam' && (
              <div className="pt-2 border-t border-border space-y-1.5">
                <div className="text-[11px] font-medium text-muted-foreground">
                  {tr('Judgment Tier', '판정 기준')}
                </div>
                <Select
                  value={judgmentTier}
                  onValueChange={(v) => {
                    if (v) setJudgmentTier(v as JudgmentTier);
                  }}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="relaxed">{tr('Relaxed (Starter)', '느슨함 (입문)')}</SelectItem>
                    <SelectItem value="standard">{tr('Standard (Unlock Next)', '표준 (다음 단계 해금)')}</SelectItem>
                    <SelectItem value="tight">{tr('Tight (Pocket)', '엄격함 (칼박)')}</SelectItem>
                    <SelectItem value="studio">{tr('Studio (Blind)', '완벽함 (블라인드)')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* CURRENT FOCUS (One Concise Sentence) */}
          <div className="rounded-2xl border border-border bg-card p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                {tr('CURRENT FOCUS', '지금 할 일')}
              </span>
              {feedbackBanner && (
                <Badge
                  variant={feedbackBanner.result === 'miss' ? 'outline' : 'default'}
                  className="text-[10px]"
                >
                  {feedbackBanner.title}
                </Badge>
              )}
            </div>
            <p className="text-xs leading-relaxed text-foreground/90">
              {currentFocusSentence}
            </p>
          </div>

          {/* BOTTOM RIGHT: Lesson Guide Entry Card */}
          <div className="mt-auto rounded-2xl border border-border bg-card p-4 space-y-2">
            <div className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase mb-1">
              LESSON GUIDE
            </div>

            <button
              type="button"
              onClick={() => {
                setGuideSection('harmony');
                setGuideDialogOpen(true);
              }}
              className="w-full flex items-center justify-between rounded-xl border border-border/80 bg-background/60 hover:bg-secondary/70 px-3 py-2.5 text-left transition-colors"
            >
              <span className="inline-flex items-center gap-2.5 text-xs font-semibold text-foreground">
                <Layers className="w-4 h-4 text-primary" />
                {tr('Harmony Point', '화성 포인트')}
              </span>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>

            <button
              type="button"
              onClick={() => {
                setGuideSection('posture');
                setGuideDialogOpen(true);
              }}
              className="w-full flex items-center justify-between rounded-xl border border-border/80 bg-background/60 hover:bg-secondary/70 px-3 py-2.5 text-left transition-colors"
            >
              <span className="inline-flex items-center gap-2.5 text-xs font-semibold text-foreground">
                <BookOpen className="w-4 h-4 text-primary" />
                {tr('Posture & Fix', '자세 · 교정')}
              </span>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </aside>
      </div>

      {/* ==================== DIALOGS ==================== */}
      <LessonGuideDialog
        open={guideDialogOpen}
        onOpenChange={setGuideDialogOpen}
        lesson={lesson}
        section={guideSection}
        onSectionChange={setGuideSection}
      />

      <ChromaticTunerDialog
        open={tunerOpen}
        onOpenChange={setTunerOpen}
        livePitch={livePitch}
        isAudioRunning={isAudioRunning}
        onStartAudio={handleToggleAudio}
      />

      <AudioInterfaceModal
        open={audioSetupOpen}
        onOpenChange={setAudioSetupOpen}
        config={audioConfig}
        onUpdateConfig={handleUpdateAudioConfig}
        telemetry={audioTelemetry}
        livePitch={livePitch}
        isAudioRunning={isAudioRunning}
        onRestartAudio={handleRestartAudio}
      />

      <SkillAnalyticsDialog
        open={analyticsOpen}
        onOpenChange={setAnalyticsOpen}
        progress={progress}
      />

      <MasteryReportDialog
        open={reportOpen}
        onOpenChange={setReportOpen}
        telemetry={lastTelemetry}
        hasNextLesson={Boolean(nextLesson)}
        onRetry={() => {
          resetSessionState();
          setPracticeMode('exam');
        }}
        onLoopWeakBar={(barIdx) => {
          setPracticeMode('loop');
          setLoopRangeBars([barIdx, barIdx]);
          setBpm(Math.max(lesson.minBpm, Math.round(bpm * 0.8)));
        }}
        onNextLesson={() => {
          if (nextLesson) handleSelectLesson(nextLesson);
        }}
      />
    </StudioMotionProvider>
  );
}
