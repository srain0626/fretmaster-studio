'use client';

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
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
import type { User } from '@supabase/supabase-js';
import { AuthGateCard } from '@/components/auth/AuthGateCard';
import { ErrorReportDialog } from '@/components/studio/ErrorReportDialog';
import { StudioOnboardingDialog } from '@/components/studio/StudioOnboardingDialog';
import { CurriculumSidebar } from '@/components/curriculum/CurriculumSidebar';
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
import { useAuth } from '@/lib/auth';
import {
  analyzeVibratoContour,
  EMPTY_ADAPTIVE_LATENCY_PROFILE,
  evaluateImprovisation,
  evaluateNoteHit,
  guitarAudioEngine,
  JUDGMENT_TIERS,
  mapHummedPitchesToFretboard,
  updateAdaptiveLatencyProfile,
  type AudioLatencyTelemetry,
} from '@/lib/lowLatencyAudioEngine';
import { guitarSynthEngine } from '@/lib/guitarSynthEngine';
import { trackStudioEvent } from '@/lib/analytics';
import {
  getFingerName,
  getNoteMidi,
  midiToNoteName,
  setActiveTuning,
} from '@/lib/musicTheory';
import { useLocale } from '@/lib/i18n';
import { buildSafeErrorEntry, type SafeErrorLogEntry } from '@/lib/errorSanitizer';
import {
  fetchCloudProgress,
  fetchPracticeSessions,
  mergeUserProgress,
  recordPracticeSession,
  upsertCloudProgress,
  type SyncStatus,
} from '@/lib/progressSync';
import { useThemePreference } from '@/lib/theme';
import type {
  AdaptiveLatencyProfile,
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
  PracticeSessionRecord,
  SessionTelemetry,
  TuningProfileId,
  UserProgressState,
  VibratoMetrics,
  WeakBarDrillItem,
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
  RefreshCw,
  Volume2,
  VolumeX,
} from 'lucide-react';

const STORAGE_PROGRESS_KEY = 'fretmaster_studio_progress_v1';
const STORAGE_AUDIO_KEY = 'fretmaster_studio_audio_v1';
const STORAGE_LATENCY_PROFILE_KEY = 'fretmaster_adaptive_latency_v1';
const STORAGE_SESSIONS_KEY = 'fretmaster_studio_sessions_v1';
const GUEST_SANDBOX_LESSONS = new Set(['m1-1', 'm3-1', 'm4-1']);

const DEFAULT_PROGRESS: UserProgressState = {
  lessonRecords: {},
  dailyPracticeSeconds: 0,
  dailyGoalSeconds: 900,
  dayStreak: 1,
  lastPracticeDate: '',
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
  peakDb: -100,
  isClipping: false,
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

function subscribeStudioUrl(): () => void {
  return () => {};
}

function getClientDemoFlag(): boolean {
  try {
    return new URLSearchParams(window.location.search).get('demo') === '1';
  } catch {
    return false;
  }
}

function getServerDemoFlag(): boolean {
  return false;
}

export function FretMasterStudioClient() {
  const { user, isAdmin, loading, signInWithGoogle, signOut } = useAuth();
  const { tr } = useLocale();
  const [guestDemoClicked, setGuestDemoClicked] = useState(false);
  const urlDemoRequested = useSyncExternalStore(
    subscribeStudioUrl,
    getClientDemoFlag,
    getServerDemoFlag
  );
  const isGuestSandbox = !user && (urlDemoRequested || guestDemoClicked);

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-muted-foreground flex flex-col items-center justify-center gap-3">
        <RefreshCw className="w-5 h-5 animate-spin text-primary" />
        <span className="text-xs font-medium">
          {tr('Loading your studio session...', '스튜디오 세션을 불러오는 중...')}
        </span>
      </div>
    );
  }

  if (!user && !isGuestSandbox) {
    return <AuthGateCard onStartGuestDemo={() => setGuestDemoClicked(true)} />;
  }

  return (
    <AuthenticatedStudioWorkspace
      key={user?.id ?? 'guest-sandbox'}
      user={user}
      isGuestMode={!user}
      isAdmin={isAdmin}
      onSignOut={signOut}
      onGuestSignIn={(lessonId) =>
        void signInWithGoogle(
          lessonId ? `/studio?lesson=${encodeURIComponent(lessonId)}` : '/studio'
        )
      }
    />
  );
}

function AuthenticatedStudioWorkspace({
  user,
  isGuestMode,
  isAdmin,
  onSignOut,
  onGuestSignIn,
}: {
  user: User | null;
  isGuestMode: boolean;
  isAdmin: boolean;
  onSignOut: () => Promise<void>;
  onGuestSignIn: (lessonId?: string) => void;
}) {
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
  const [adaptiveLatency, setAdaptiveLatency] = useState<AdaptiveLatencyProfile>(
    EMPTY_ADAPTIVE_LATENCY_PROFILE
  );
  const [audioTelemetry, setAudioTelemetry] = useState<AudioLatencyTelemetry>(() =>
    guitarAudioEngine.getTelemetry()
  );
  const [tunerOpen, setTunerOpen] = useState(false);
  const [audioSetupOpen, setAudioSetupOpen] = useState(false);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [errorModalOpen, setErrorModalOpen] = useState(false);
  const [errorLogs, setErrorLogs] = useState<SafeErrorLogEntry[]>([]);
  const [guideDialogOpen, setGuideDialogOpen] = useState(false);
  const [guideSection, setGuideSection] = useState<GuideSection>('both');

  const pushSafeError = useCallback(
    (
      params: Parameters<typeof buildSafeErrorEntry>[0],
      openModal = true
    ) => {
      const entry = buildSafeErrorEntry(params);
      setErrorLogs((prev) => [entry, ...prev].slice(0, 20));
      if (openModal) {
        setErrorModalOpen(true);
      }
    },
    []
  );

  // Evaluation State
  const [evaluations, setEvaluations] = useState<Record<string, NoteEvaluation>>({});
  const [feedbackBanner, setFeedbackBanner] = useState<FeedbackBanner | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [lastTelemetry, setLastTelemetry] = useState<SessionTelemetry | null>(null);
  const [practiceSessions, setPracticeSessions] = useState<PracticeSessionRecord[]>([]);
  const [liveVibrato, setLiveVibrato] = useState<VibratoMetrics | null>(null);
  const vibratoSamplesRef = useRef<{ timestampMs: number; centsOffset: number }[]>([]);
  const [examCountInBars, setExamCountInBars] = useState<number>(1);
  const [examAutoStart, setExamAutoStart] = useState<boolean>(true);
  const [countInState, setCountInState] = useState<{
    remaining: number;
    current: number;
    total: number;
  } | null>(null);

  const isExamAutoStartArmed =
    practiceMode === 'exam' &&
    !isPlaying &&
    examAutoStart &&
    isAudioRunning &&
    !reportOpen &&
    !tunerOpen &&
    !audioSetupOpen &&
    !analyticsOpen &&
    !onboardingOpen &&
    !guideDialogOpen &&
    !errorModalOpen;

  // Ear Copy & Improvisation Lab State
  const [earCopyUnlockedIndices, setEarCopyUnlockedIndices] = useState<Set<number>>(new Set());
  const [earCopyHintLevel, setEarCopyHintLevel] = useState(0);
  const [improvEvents, setImprovEvents] = useState<
    { midi: number; barIndex: number; isBend: boolean; gapMs: number }[]
  >([]);
  const [isCapturingHum, setIsCapturingHum] = useState(false);
  const [hummedMappings, setHummedMappings] = useState<HummedNoteMapping[]>([]);

  // User Progress, Cloud Sync & Theme State
  const [progress, setProgress] = useState<UserProgressState>(DEFAULT_PROGRESS);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const { themePreference, setThemePreference } = useThemePreference();

  // Refs for real-time callback sync
  const cloudHydratedRef = useRef<boolean>(false);
  const lastLoopCountRef = useRef<number>(0);
  const peakBendRef = useRef<number>(0);
  const countInActiveRef = useRef<boolean>(false);
  const examAutoStartArmedAtRef = useRef<number>(0);
  const lastProcessedNoteTimestampRef = useRef<number>(0);
  const lastAcceptedRef = useRef<{
    noteId: string;
    midi: number;
    at: number;
    hadSilence: boolean;
  } | null>(null);
  const wrongHoldRef = useRef<{
    noteId: string;
    midi: number;
    startedAt: number;
  } | null>(null);
  const silenceStartAtRef = useRef<number>(0);
  const lastImprovNoteTimeRef = useRef<number>(0);
  const lastHumMidiRef = useRef<number>(0);
  const evaluationsRef = useRef<Record<string, NoteEvaluation>>({});
  const maxFlowStreakRef = useRef<number>(0);
  const audioConfigRef = useRef<AudioDeviceConfig>(audioConfig);
  const adaptiveLatencyRef = useRef<AdaptiveLatencyProfile>(EMPTY_ADAPTIVE_LATENCY_PROFILE);
  const pendingRawLatencyBatchRef = useRef<number[]>([]);
  const latencySampledNotesRef = useRef<Set<string>>(new Set());
  const lastLatencyBarRef = useRef<number>(-1);
  const progressRef = useRef<UserProgressState>(DEFAULT_PROGRESS);
  const warmupTrackedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    progressRef.current = progress;
  }, [progress]);

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

  // Hydrate local baseline then merge & sync per-user cloud progress from Supabase
  useEffect(() => {
    let active = true;
    cloudHydratedRef.current = false;
    const today = new Date().toISOString().slice(0, 10);

    let localProgress: UserProgressState = {
      ...DEFAULT_PROGRESS,
      lastPracticeDate: today,
    };

    try {
      const savedProg = window.localStorage.getItem(STORAGE_PROGRESS_KEY);
      if (savedProg) {
        const parsed = JSON.parse(savedProg) as Partial<UserProgressState>;
        localProgress = {
          ...localProgress,
          ...parsed,
          dailyPracticeSeconds:
            parsed.lastPracticeDate === today ? parsed.dailyPracticeSeconds ?? 0 : 0,
          lastPracticeDate: today,
        };
      }
      const savedAudio = window.localStorage.getItem(STORAGE_AUDIO_KEY);
      if (savedAudio) {
        const parsedAudio = JSON.parse(savedAudio) as Partial<AudioDeviceConfig>;
        guitarAudioEngine.updateConfig(parsedAudio);
        const syncedAudio = guitarAudioEngine.getConfig();
        audioConfigRef.current = syncedAudio;
        setAudioConfig(syncedAudio);
      }
      const savedLatency = window.localStorage.getItem(STORAGE_LATENCY_PROFILE_KEY);
      if (savedLatency) {
        const parsedLat = JSON.parse(savedLatency) as Partial<AdaptiveLatencyProfile>;
        if (Array.isArray(parsedLat.samplesMs)) {
          const loadedProfile: AdaptiveLatencyProfile = {
            ...EMPTY_ADAPTIVE_LATENCY_PROFILE,
            ...parsedLat,
          };
          adaptiveLatencyRef.current = loadedProfile;
          setAdaptiveLatency(loadedProfile);
        }
      }
    } catch {
      // ignore local storage errors
    }

    let requestedLessonParam: string | null = null;
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const queryLesson = urlParams.get('lesson');
      if (queryLesson && getLessonById(queryLesson)) {
        requestedLessonParam = queryLesson;
        urlParams.delete('lesson');
        const remainingQuery = urlParams.toString();
        window.history.replaceState(
          null,
          '',
          remainingQuery ? `${window.location.pathname}?${remainingQuery}` : window.location.pathname
        );
      }
    } catch {
      // ignore URL query errors
    }

    const applyInitialLessonConfig = (targetLesson: Lesson) => {
      setSelectedLessonId(targetLesson.id);
      setAmpPreset(targetLesson.recommendedAmp);
      setBpm(targetLesson.defaultBpm);
      setLoopRangeBars([0, targetLesson.totalBars - 1]);
      const nextIsPhase1 = targetLesson.phaseId === 'phase-1';
      setEnableDrumsAndBass(!nextIsPhase1);
      setEnableBackingChords(!nextIsPhase1 && !targetLesson.supportsEarCopy);
      if (targetLesson.supportsEarCopy) {
        setPracticeMode('earcopy');
        setBottomTab('lab');
        setEnableGuideGuitar(true);
      } else if (targetLesson.supportsJam) {
        setPracticeMode('jam');
        setBottomTab('lab');
        setEnableGuideGuitar(false);
      } else {
        setPracticeMode('guide');
        setBottomTab('tab');
        setEnableGuideGuitar(true);
      }
    };

    if (requestedLessonParam) {
      const requestedLesson = getLessonById(requestedLessonParam);
      if (requestedLesson) {
        applyInitialLessonConfig(requestedLesson);
      }
      if (requestedLessonParam !== ALL_LESSONS[0].id) {
        localProgress = {
          ...localProgress,
          freeExploreMode: true,
        };
      }
    }

    try {
      const savedSessions = window.localStorage.getItem(STORAGE_SESSIONS_KEY);
      if (savedSessions) {
        const parsedSessions = JSON.parse(savedSessions) as PracticeSessionRecord[];
        if (Array.isArray(parsedSessions)) {
          setPracticeSessions(parsedSessions.slice(0, 30));
        }
      }
    } catch {
      // ignore session storage errors
    }

    setActiveTuning(audioConfigRef.current.tuningProfile ?? 'standard', audioConfigRef.current.capoFret ?? 0);

    if (isGuestMode || !user) {
      const guestProgress: UserProgressState = {
        ...localProgress,
        freeExploreMode: true,
        onboardingCompleted: true,
      };
      setProgress(guestProgress);
      setSyncStatus('idle');
      cloudHydratedRef.current = true;
      setGuideDialogOpen(true);
      return () => {
        active = false;
      };
    }

    setProgress(localProgress);
    setSyncStatus('syncing');

    Promise.all([fetchCloudProgress(user.id), fetchPracticeSessions(user.id, 30)])
      .then(async ([cloud, remoteSessions]) => {
        if (!active) return;

        if (remoteSessions.length > 0) {
          setPracticeSessions(remoteSessions);
          try {
            window.localStorage.setItem(STORAGE_SESSIONS_KEY, JSON.stringify(remoteSessions));
          } catch {
            // ignore
          }
        }

        const merged = mergeUserProgress(localProgress, cloud?.progress ?? null);
        const targetLessonId = requestedLessonParam || cloud?.lastLessonId || ALL_LESSONS[0].id;
        const targetLesson = getLessonById(targetLessonId);
        const needsFreeExplore =
          Boolean(requestedLessonParam) &&
          targetLesson !== undefined &&
          targetLesson.id !== ALL_LESSONS[0].id;

        const normalizedMerged: UserProgressState = {
          ...merged,
          freeExploreMode: merged.freeExploreMode || needsFreeExplore,
          dailyPracticeSeconds:
            merged.lastPracticeDate === today ? merged.dailyPracticeSeconds : 0,
          lastPracticeDate: today,
        };

        setProgress(normalizedMerged);

        if (targetLesson) {
          applyInitialLessonConfig(targetLesson);
        }

        if (cloud?.audioConfig) {
          guitarAudioEngine.updateConfig(cloud.audioConfig);
          const synced = guitarAudioEngine.getConfig();
          setAudioConfig(synced);
          setActiveTuning(synced.tuningProfile ?? 'standard', synced.capoFret ?? 0);
        }

        try {
          await upsertCloudProgress(user.id, {
            progress: normalizedMerged,
            lastLessonId: targetLesson?.id ?? ALL_LESSONS[0].id,
            audioConfig: cloud?.audioConfig ?? guitarAudioEngine.getConfig(),
          });
          if (active) setSyncStatus('saved');
        } catch (err) {
          if (active) {
            setSyncStatus('error');
            pushSafeError(
              {
                category: 'sync',
                code: 'CLOUD_UPSERT_FAILED',
                title: tr('Cloud Save Delayed', '클라우드 저장 지연'),
                summary: tr(
                  'Progress is saved locally, but uploading to cloud storage did not complete.',
                  '연습 기록은 로컬에 저장되었으나 클라우드 업로드 중 일시적 오류가 발생했습니다.'
                ),
                error: err,
              },
              false
            );
          }
        } finally {
          cloudHydratedRef.current = true;
          if (active) {
            if (!normalizedMerged.onboardingCompleted && normalizedMerged.totalCompletedCount === 0) {
              setOnboardingOpen(true);
            } else {
              setGuideDialogOpen(true);
            }
          }
        }
      })
      .catch((err) => {
        if (!active) return;
        cloudHydratedRef.current = true;
        setSyncStatus('error');
        pushSafeError(
          {
            category: 'sync',
            code: 'CLOUD_FETCH_FAILED',
            title: tr('Cloud Sync Unavailable', '클라우드 동기화 연결 실패'),
            summary: tr(
              'Unable to load remote progress right now; running from local cache.',
              '원격 진도 데이터를 불러오지 못해 로컬 캐시 기준으로 실행합니다.'
            ),
            error: err,
          },
          false
        );
        if (!localProgress.onboardingCompleted && localProgress.totalCompletedCount === 0) {
          setOnboardingOpen(true);
        } else {
          setGuideDialogOpen(true);
        }
      });

    return () => {
      active = false;
    };
  }, [isGuestMode, pushSafeError, tr, user]);

  // Keep active tuning & virtual capo synced to musicTheory engine
  useEffect(() => {
    setActiveTuning(audioConfig.tuningProfile ?? 'standard', audioConfig.capoFret ?? 0);
  }, [audioConfig.capoFret, audioConfig.tuningProfile]);

  // Persist local cache & debounce-sync updates to Supabase PostgreSQL
  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_PROGRESS_KEY, JSON.stringify(progress));
    } catch {
      // ignore
    }

    if (!cloudHydratedRef.current || isGuestMode || !user) return;

    setSyncStatus('syncing');
    const timeoutId = window.setTimeout(() => {
      upsertCloudProgress(user.id, {
        progress,
        lastLessonId: selectedLessonId,
        audioConfig,
      })
        .then(() => setSyncStatus('saved'))
        .catch((err) => {
          setSyncStatus('error');
          pushSafeError(
            {
              category: 'sync',
              code: 'CLOUD_SYNC_RETRY',
              title: tr('Cloud Sync Paused', '클라우드 동기화 보류'),
              summary: tr(
                'Latest progress changes remain cached locally and will sync on next update.',
                '최근 변경 사항은 로컬에 안전하게 보관되었으며 다음 갱신 시 다시 동기화됩니다.'
              ),
              error: err,
            },
            false
          );
        });
    }, 800);

    return () => window.clearTimeout(timeoutId);
  }, [audioConfig, isGuestMode, progress, pushSafeError, selectedLessonId, tr, user]);

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
    lastAcceptedRef.current = null;
    wrongHoldRef.current = null;
    silenceStartAtRef.current = 0;
    countInActiveRef.current = false;
    setCountInState(null);
  }, []);

  const completeWarmupLesson = useCallback(
    (targetLesson: Lesson) => {
      if (!targetLesson.skipExam) return;
      const alreadyCompleted = Boolean(
        progressRef.current.lessonRecords[targetLesson.id]?.completed
      );
      if (alreadyCompleted || warmupTrackedRef.current.has(targetLesson.id)) return;

      warmupTrackedRef.current.add(targetLesson.id);
      trackStudioEvent('warmup_completed', {
        lesson_id: targetLesson.id,
        bpm,
      });

      setProgress((prev) => {
        if (prev.lessonRecords[targetLesson.id]?.completed) return prev;
        const existing = prev.lessonRecords[targetLesson.id];
        const nextRecords = {
          ...prev.lessonRecords,
          [targetLesson.id]: {
            completed: true,
            bestScore: Math.max(existing?.bestScore ?? 0, 100),
            bestGrade: existing?.bestScore ? existing.bestGrade : ('S' as const),
            highestTierCleared: existing?.highestTierCleared ?? judgmentTier,
            bestBpm: Math.max(existing?.bestBpm ?? 0, bpm),
            earCopySolved: existing?.earCopySolved ?? false,
          },
        };
        const totalCompletedCount = Object.values(nextRecords).filter((r) => r.completed).length;

        const nextSkills = { ...prev.skills };
        if (targetLesson.category === 'mechanics' || targetLesson.category === 'techniques') {
          nextSkills.mechanics = Math.min(100, nextSkills.mechanics + 4);
        } else if (targetLesson.category === 'scales' || targetLesson.category === 'chords') {
          nextSkills.fretboardVision = Math.min(100, nextSkills.fretboardVision + 4);
        } else if (targetLesson.category === 'genres' || targetLesson.category === 'solos') {
          nextSkills.creativePhrasing = Math.min(100, nextSkills.creativePhrasing + 4);
        }

        return {
          ...prev,
          lessonRecords: nextRecords,
          totalCompletedCount,
          skills: nextSkills,
        };
      });
    },
    [bpm, judgmentTier]
  );

  const handleSelectLesson = useCallback(
    (next: Lesson) => {
      if (isGuestMode && !GUEST_SANDBOX_LESSONS.has(next.id)) {
        setFeedbackBanner({
          result: 'good',
          title: tr('Sign In to Unlock All 39 Lessons', 'Google 로그인 후 39강 전체 해금'),
          detail: tr(
            `Guest preview includes 1-1, 3-1, and 4-1. Sign in free to open Lesson ${next.code}.`,
            `체험 모드에서는 1-1, 3-1, 4-1 레슨이 열려 있습니다. 무료 로그인 후 ${next.code} 레슨을 바로 시작하세요.`
          ),
        });
        onGuestSignIn(next.id);
        return;
      }
      if (rawLesson.skipExam && next.id === getNextLesson(rawLesson.id)?.id) {
        completeWarmupLesson(rawLesson);
      }
      resetSessionState();
      setSelectedLessonId(next.id);
      setBpm(next.defaultBpm);
      setAmpPreset(next.recommendedAmp);
      setLoopRangeBars([0, next.totalBars - 1]);
      setCompletedTasks(new Set());
      setGuideSection('both');
      setGuideDialogOpen(true);
      trackStudioEvent('lesson_selected', {
        lesson_id: next.id,
        lesson_code: next.code,
        phase_id: next.phaseId,
      });

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
    },
    [completeWarmupLesson, isGuestMode, onGuestSignIn, rawLesson, resetSessionState, tr]
  );

  const handleTuningChange = useCallback(
    (profile: TuningProfileId, capoFret: number) => {
      setActiveTuning(profile, capoFret);
      guitarAudioEngine.updateConfig({ tuningProfile: profile, capoFret });
      const nextCfg = guitarAudioEngine.getConfig();
      audioConfigRef.current = nextCfg;
      setAudioConfig(nextCfg);
      try {
        window.localStorage.setItem(STORAGE_AUDIO_KEY, JSON.stringify(nextCfg));
      } catch {
        // ignore
      }
    },
    []
  );

  const handleAdvanceToNextLesson = useCallback(() => {
    completeWarmupLesson(rawLesson);
    const next = getNextLesson(rawLesson.id);
    if (next) {
      handleSelectLesson(next);
    }
  }, [completeWarmupLesson, handleSelectLesson, rawLesson]);

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
      const nowIso = new Date().toISOString();
      const newSessionRecord: PracticeSessionRecord = {
        id: `local-${Date.now()}`,
        lessonId: lesson.id,
        mode: practiceMode,
        tier: judgmentTier,
        score,
        grade,
        pitchAccuracy,
        timingAccuracy,
        bpmPlayed: bpm,
        avgTimingErrorMs: report.avgTimingErrorMs,
        weakBarIndices,
        passed,
        createdAt: nowIso,
      };
      setPracticeSessions((prev) => {
        const updated = [newSessionRecord, ...prev].slice(0, 30);
        try {
          window.localStorage.setItem(STORAGE_SESSIONS_KEY, JSON.stringify(updated));
        } catch {
          // ignore
        }
        return updated;
      });
      if (user) {
        void recordPracticeSession(user.id, report);
      }
      trackStudioEvent('exam_completed', {
        lesson_id: lesson.id,
        tier: judgmentTier,
        score,
        grade,
        passed,
        bpm,
      });

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
            lastPracticedAt: nowIso,
            weakBarIndices: weakBarIndices.length > 0 ? weakBarIndices : existing?.weakBarIndices,
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
    [bpm, judgmentTier, lesson, practiceMode, user]
  );

  const handleUpdateAudioConfig = useCallback((partial: Partial<AudioDeviceConfig>) => {
    guitarAudioEngine.updateConfig(partial);
    const updated = guitarAudioEngine.getConfig();
    audioConfigRef.current = updated;
    setAudioConfig(updated);
    try {
      window.localStorage.setItem(STORAGE_AUDIO_KEY, JSON.stringify(updated));
    } catch {
      // ignore
    }
  }, []);

  const persistLatencyProfile = useCallback((nextProfile: AdaptiveLatencyProfile) => {
    adaptiveLatencyRef.current = nextProfile;
    setAdaptiveLatency(nextProfile);
    try {
      window.localStorage.setItem(STORAGE_LATENCY_PROFILE_KEY, JSON.stringify(nextProfile));
    } catch {
      // ignore
    }
  }, []);

  const flushAdaptiveLatency = useCallback(() => {
    const batch = pendingRawLatencyBatchRef.current;
    if (batch.length === 0) return;
    pendingRawLatencyBatchRef.current = [];

    const nextProfile = updateAdaptiveLatencyProfile(adaptiveLatencyRef.current, batch);
    persistLatencyProfile(nextProfile);

    const cfg = audioConfigRef.current;
    if (
      cfg.autoCalibrateLatency !== false &&
      nextProfile.totalSampleCount >= 4 &&
      Math.abs(nextProfile.estimatedOffsetMs - cfg.latencyOffsetMs) >= 2
    ) {
      handleUpdateAudioConfig({ latencyOffsetMs: nextProfile.estimatedOffsetMs });
      trackStudioEvent('latency_calibrated', {
        method: 'adaptive_bar',
        offset_ms: nextProfile.estimatedOffsetMs,
        confidence_pct: nextProfile.confidencePct,
      });
    }
  }, [handleUpdateAudioConfig, persistLatencyProfile]);

  const handleResetAdaptiveLatency = useCallback(() => {
    pendingRawLatencyBatchRef.current = [];
    latencySampledNotesRef.current.clear();
    const empty = { ...EMPTY_ADAPTIVE_LATENCY_PROFILE };
    persistLatencyProfile(empty);
  }, [persistLatencyProfile]);

  const handleRecordManualCalibrationSamples = useCallback(
    (samplesMs: number[]) => {
      pendingRawLatencyBatchRef.current = [];
      const seeded = updateAdaptiveLatencyProfile(
        adaptiveLatencyRef.current,
        samplesMs,
        true
      );
      persistLatencyProfile(seeded);
    },
    [persistLatencyProfile]
  );

  const startTransportForMode = useCallback(
    (
      mode: PracticeMode,
      overrides?: {
        bpm?: number;
        loopRangeBars?: [number, number];
        enableGuideGuitar?: boolean;
        enableBackingChords?: boolean;
        enableDrumsAndBass?: boolean;
        enableMetronome?: boolean;
        countInBeats?: number;
      }
    ) => {
      const targetBpm = overrides?.bpm ?? bpm;
      const targetLoopRange = overrides?.loopRangeBars ?? loopRangeBars;
      const targetGuide = overrides?.enableGuideGuitar ?? enableGuideGuitar;
      const targetChords = overrides?.enableBackingChords ?? enableBackingChords;
      const targetDrums = overrides?.enableDrumsAndBass ?? enableDrumsAndBass;
      const targetMetro = overrides?.enableMetronome ?? enableMetronome;
      const targetCountInBeats =
        overrides?.countInBeats ?? (mode === 'exam' ? examCountInBars * lesson.beatsPerBar : 0);

      setEvaluations({});
      evaluationsRef.current = {};
      maxFlowStreakRef.current = 0;
      lastLoopCountRef.current = 0;
      lastAcceptedRef.current = null;
      wrongHoldRef.current = null;
      pendingRawLatencyBatchRef.current = [];
      latencySampledNotesRef.current.clear();
      lastLatencyBarRef.current = -1;
      if (targetCountInBeats > 0) {
        countInActiveRef.current = true;
        setCountInState({ remaining: targetCountInBeats, current: 0, total: targetCountInBeats });
      } else {
        countInActiveRef.current = false;
        setCountInState(null);
      }
      setIsPlaying(true);

      guitarSynthEngine.startTransport({
        bpm: targetBpm,
        notes: lesson.notes,
        chordProgression: lesson.chordProgression,
        totalBars: lesson.totalBars,
        beatsPerBar: lesson.beatsPerBar,
        ampPreset,
        loopRangeBars: targetLoopRange,
        enableGuideGuitar: targetGuide,
        enableBackingChords: targetChords,
        enableDrumsAndBass: targetDrums,
        enableMetronome: targetMetro,
        autoSpeedUpBpm: autoSpeedUp && mode === 'loop' ? 5 : 0,
        countInBeats: targetCountInBeats,
        onCountInUpdate: (remaining, current, total) => {
          if (remaining <= 0) {
            countInActiveRef.current = false;
            setCountInState(null);
          } else {
            countInActiveRef.current = true;
            setCountInState({ remaining, current, total });
          }
        },
        onBeatUpdate: (beat, barIdx, loopIdx, bumpedBpm) => {
          setCurrentBeat(beat);
          if (bumpedBpm) setBpm(bumpedBpm);

          if (barIdx !== lastLatencyBarRef.current) {
            if (lastLatencyBarRef.current !== -1) {
              flushAdaptiveLatency();
            }
            lastLatencyBarRef.current = barIdx;
          }

          let activeIdx = 0;
          for (let i = 0; i < lesson.notes.length; i++) {
            if (lesson.notes[i].beatStart <= beat + 0.15) {
              activeIdx = i;
            }
          }
          setActiveNoteIndex(activeIdx);

          if (loopIdx > lastLoopCountRef.current) {
            lastLoopCountRef.current = loopIdx;
            if (mode === 'guide' || mode === 'loop') {
              setCompletedTasks((prev) => new Set(prev).add(mode));
              if (rawLesson.skipExam) {
                completeWarmupLesson(rawLesson);
              }
            }
            if (mode === 'loop') {
              latencySampledNotesRef.current.clear();
              flushAdaptiveLatency();
              evaluationsRef.current = {};
              setEvaluations({});
              setFeedbackBanner({
                result: 'perfect',
                title: tr(`Loop #${loopIdx} Complete`, `${loopIdx}회 템포 완주 완료`),
                detail: bumpedBpm
                  ? tr(
                      `Tempo raised to ${bumpedBpm} BPM. Keep playing!`,
                      `템포가 ${bumpedBpm} BPM으로 올라갔어요. 이어서 연주해 보세요.`
                    )
                  : lesson.skipExam
                  ? tr(
                      'Warm-up complete! Keep repeating or move straight to the next lesson.',
                      '워밍업 완주 완료! 더 반복하거나 바로 다음 레슨으로 넘어가세요.'
                    )
                  : tr(
                      'Great groove! Keep repeating or take the passing exam.',
                      '잘했어요! 계속 반복하거나 통과 테스트에 도전해 보세요.'
                    ),
              });
            }
            if (mode === 'exam') {
              flushAdaptiveLatency();
              guitarSynthEngine.stopTransport();
              countInActiveRef.current = false;
              setCountInState(null);
              examAutoStartArmedAtRef.current = performance.now() + 2200;
              setIsPlaying(false);
              finalizeExamSession(evaluationsRef.current, maxFlowStreakRef.current);
            }
          }
        },
      });
    },
    [
      ampPreset,
      autoSpeedUp,
      bpm,
      completeWarmupLesson,
      enableBackingChords,
      enableDrumsAndBass,
      enableGuideGuitar,
      enableMetronome,
      examCountInBars,
      finalizeExamSession,
      flushAdaptiveLatency,
      lesson,
      loopRangeBars,
      rawLesson,
      tr,
    ]
  );

  const toggleTransport = useCallback(() => {
    if (isPlaying) {
      guitarSynthEngine.stopTransport();
      countInActiveRef.current = false;
      setCountInState(null);
      examAutoStartArmedAtRef.current = performance.now() + 1800;
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

    startTransportForMode(practiceMode);
  }, [
    activeNoteIndex,
    ampPreset,
    bpm,
    isPlaying,
    lesson.notes,
    practiceMode,
    startTransportForMode,
    tr,
  ]);

  const handlePracticeModeChange = useCallback(
    (mode: PracticeMode) => {
      if (mode === 'exam' && rawLesson.skipExam) {
        handleAdvanceToNextLesson();
        return;
      }
      resetSessionState();
      setPracticeMode(mode);
      trackStudioEvent('practice_mode_started', {
        lesson_id: lesson.id,
        mode,
      });

      const nextGuide = mode !== 'jam' && mode !== 'exam';
      const nextDrums = mode === 'jam' ? true : enableDrumsAndBass;
      const nextChords = mode === 'jam' ? true : enableBackingChords;
      const nextMetro = mode === 'exam' ? true : enableMetronome;

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
        examAutoStartArmedAtRef.current = performance.now() + 700;
        if (examAutoStart && isAudioRunning) {
          setFeedbackBanner({
            result: 'good',
            title: tr('Ready to Auto-Start', '연주 대기 중'),
            detail:
              examCountInBars > 0
                ? tr(
                    'Strum any note on your guitar to start the count-in, or press Start Exam.',
                    '기타를 한 번 튕기면 예비박 카운트인 후 테스트가 자동 시작됩니다.'
                  )
                : tr(
                    'Play the 1st note cleanly to begin the exam immediately.',
                    '첫 음을 정확히 치면 즉시 테스트가 시작됩니다.'
                  ),
          });
        }
      } else {
        setEnableGuideGuitar(true);
        setBottomTab('tab');
      }

      if (mode === 'loop' || mode === 'guide') {
        startTransportForMode(mode, {
          enableGuideGuitar: nextGuide,
          enableBackingChords: nextChords,
          enableDrumsAndBass: nextDrums,
          enableMetronome: nextMetro,
        });
        if (mode === 'loop') {
          setFeedbackBanner({
            result: 'good',
            title: tr('Playing in Tempo', '템포 맞춰 연주 중'),
            detail: tr(
              'Follow the moving playhead and play along with the beat.',
              '움직이는 플레이헤드와 메트로놈에 맞춰 연주해 보세요.'
            ),
          });
        }
      }
    },
    [
      enableBackingChords,
      enableDrumsAndBass,
      enableMetronome,
      examAutoStart,
      examCountInBars,
      handleAdvanceToNextLesson,
      isAudioRunning,
      lesson.id,
      rawLesson.skipExam,
      resetSessionState,
      startTransportForMode,
      tr,
    ]
  );

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
    const nowWallMs = performance.now();
    if (!livePitch.isActive) {
      if (silenceStartAtRef.current === 0) {
        silenceStartAtRef.current = nowWallMs;
      } else if (nowWallMs - silenceStartAtRef.current >= 50 && lastAcceptedRef.current) {
        lastAcceptedRef.current.hadSilence = true;
      }
      wrongHoldRef.current = null;
      return;
    }
    silenceStartAtRef.current = 0;

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
    lastProcessedNoteTimestampRef.current = livePitch.timestampMs;

    // Auto-start Passing Exam on clean guitar pluck / onset
    if (
      isExamAutoStartArmed &&
      livePitch.source !== 'simulated' &&
      nowWallMs >= examAutoStartArmedAtRef.current &&
      livePitch.isOnset &&
      livePitch.clarity >= 0.65 &&
      livePitch.rmsDb >= audioConfig.noiseGateDb + 6
    ) {
      if (examCountInBars > 0) {
        startTransportForMode('exam', {
          countInBeats: examCountInBars * lesson.beatsPerBar,
        });
        setFeedbackBanner({
          result: 'good',
          title: tr('Count-In Started', '예비박 시작'),
          detail: tr(
            'Get ready and enter on beat 1!',
            '박자를 느끼며 첫 박에 맞춰 시작하세요!'
          ),
        });
        return;
      }

      const firstNote = lesson.notes[0];
      if (firstNote) {
        const firstEv = evaluateNoteHit(
          firstNote,
          livePitch.midiFloat,
          0,
          judgmentTier,
          0,
          {
            noteSpectrum: livePitch.noteSpectrum,
            chroma: livePitch.chroma,
            source: livePitch.source,
          }
        );
        if (firstEv.result !== 'miss') {
          startTransportForMode('exam', { countInBeats: 0 });
          evaluationsRef.current = { [firstNote.id]: firstEv };
          setEvaluations({ [firstNote.id]: firstEv });
          maxFlowStreakRef.current = 1;
          setFeedbackBanner({
            result: firstEv.result,
            title: tr('Exam Started', '테스트 시작'),
            detail: tr('First note locked! Keep flowing.', '첫 음 인식 완료! 템포에 맞춰 이어가세요.'),
          });
        }
      }
      return;
    }

    const hasSignalForStepMode = livePitch.isOnset || livePitch.clarity >= 0.58;

    // Helper: prevent single sustain from auto-advancing repeated identical pitches without re-attack or mute
    const canAcceptPitchForNote = (noteId: string, detectedMidi: number, isOnset: boolean) => {
      if (livePitch.source === 'simulated') return true;
      const prevAcc = lastAcceptedRef.current;
      if (!prevAcc) return true;
      if (prevAcc.noteId === noteId) return false;
      if (prevAcc.midi === detectedMidi) {
        if (nowWallMs - prevAcc.at < 140) return false;
        return isOnset || prevAcc.hadSilence;
      }
      return true;
    };

    // Wait-for-Note Mode
    if (practiceMode === 'wait' && targetNote) {
      if (!hasSignalForStepMode) return;
      const isChordTarget = Boolean(targetNote.chordNotes && targetNote.chordNotes.length > 0);
      if (!isChordTarget && (livePitch.frequency <= 0 || livePitch.nearestMidi <= 0)) return;
      if (targetNote.bendCents) {
        const spec = JUDGMENT_TIERS[judgmentTier];
        if (peakBendRef.current < targetNote.bendCents * spec.bendCompletionRatio) {
          return;
        }
      }

      const ev = evaluateNoteHit(
        targetNote,
        livePitch.midiFloat,
        0,
        judgmentTier,
        peakBendRef.current,
        {
          noteSpectrum: livePitch.noteSpectrum,
          chroma: livePitch.chroma,
          source: livePitch.source,
        }
      );

      if (ev.result !== 'miss') {
        if (
          !isChordTarget &&
          !canAcceptPitchForNote(targetNote.id, livePitch.nearestMidi, livePitch.isOnset)
        ) {
          return;
        }
        if (isChordTarget && !livePitch.isOnset && livePitch.source !== 'simulated') {
          const prevAcc = lastAcceptedRef.current;
          if (prevAcc && prevAcc.noteId === targetNote.id) return;
          if (prevAcc && nowWallMs - prevAcc.at < 260 && !prevAcc.hadSilence) return;
        }
        lastAcceptedRef.current = {
          noteId: targetNote.id,
          midi: livePitch.nearestMidi,
          at: nowWallMs,
          hadSilence: false,
        };
        wrongHoldRef.current = null;

        const nextEvals = { ...evaluationsRef.current, [targetNote.id]: ev };
        evaluationsRef.current = nextEvals;
        setEvaluations(nextEvals);
        peakBendRef.current = 0;

        setFeedbackBanner({
          result: ev.result,
          title: tr('Nice', '좋아요'),
          detail: ev.unmutedStringWarning
            ? ev.unmutedStringDetail
              ? tr(
                  `Matched · mute unplayed ${ev.unmutedStringDetail} string`,
                  `인식 완료 · 치지 않는 ${ev.unmutedStringDetail} 개방현을 뮤트해 보세요`
                )
              : tr(
                  'Chord matched · mute unused low strings',
                  '코드 인식 완료 · 치지 않는 저음현을 뮤트해 보세요'
                )
            : tr(
                `String ${targetNote.string}, Fret ${targetNote.fret} recognized`,
                `${targetNote.string}번 줄 ${targetNote.fret}프렛 인식 완료`
              ),
        });

        if (activeNoteIndex + 1 < lesson.notes.length) {
          setActiveNoteIndex((i) => i + 1);
        } else {
          lastAcceptedRef.current = {
            noteId: '',
            midi: livePitch.nearestMidi,
            at: nowWallMs,
            hadSilence: false,
          };
          setCompletedTasks((prev) => new Set(prev).add('wait'));
          if (rawLesson.skipExam) {
            completeWarmupLesson(rawLesson);
          }
          setFeedbackBanner({
            result: 'perfect',
            title: tr('Step-by-Step Complete', '한 음씩 따라치기 완료'),
            detail: rawLesson.skipExam
              ? tr(
                  'Try playing along in tempo, or continue straight to the next lesson.',
                  '템포에 맞춰 완주해 보거나 바로 다음 레슨으로 넘어가세요.'
                )
              : tr('Now try playing along in tempo.', '이제 템포에 맞춰 완주해 보세요.'),
          });
          setActiveNoteIndex(0);
        }
      } else {
        if (livePitch.source !== 'simulated') {
          // Ignore leftover tail of immediately accepted previous note; debounce attack transients (110ms)
          const prevAcc = lastAcceptedRef.current;
          if (
            prevAcc &&
            prevAcc.midi === livePitch.nearestMidi &&
            !livePitch.isOnset &&
            !prevAcc.hadSilence &&
            nowWallMs - prevAcc.at < 450
          ) {
            return;
          }

          const hold = wrongHoldRef.current;
          if (
            !hold ||
            hold.noteId !== targetNote.id ||
            Math.abs(hold.midi - livePitch.nearestMidi) > 1
          ) {
            wrongHoldRef.current = {
              noteId: targetNote.id,
              midi: livePitch.nearestMidi,
              startedAt: nowWallMs,
            };
            return;
          }
          if (nowWallMs - hold.startedAt < 110) return;
        }

        if (isChordTarget) {
          setFeedbackBanner({
            result: 'miss',
            title: tr('Check Chord Strum', '코드 스트럼 확인'),
            detail: tr(
              'Strum all highlighted chord notes cleanly together',
              '지판에 표시된 코드 구성음을 모두 깨끗하게 함께 스트럼해 보세요'
            ),
          });
          return;
        }

        const targetMidi = getNoteMidi(targetNote.string, targetNote.fret);
        const diffSemis = Math.round(livePitch.midiFloat - targetMidi);
        const absSemis = Math.abs(diffSemis);
        const octaveTip =
          diffSemis === 12
            ? tr(
                'One octave higher · check the thicker string or lower position',
                '한 옥타브 높아요 · 더 굵은 줄이나 아래 포지션을 확인해 보세요'
              )
            : tr(
                'One octave lower · check the thinner string or +12 frets up',
                '한 옥타브 낮아요 · 더 얇은 줄이나 12프렛 위를 확인해 보세요'
              );
        const directionTip =
          absSemis === 12
            ? octaveTip
            : diffSemis > 0
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
      if (!hasSignalForStepMode) return;
      const targetIdx = lesson.notes.findIndex((_, i) => !earCopyUnlockedIndices.has(i));
      if (targetIdx === -1) return;
      const earTarget = lesson.notes[targetIdx];
      const isEarChord = Boolean(earTarget.chordNotes && earTarget.chordNotes.length > 0);
      if (!isEarChord && (livePitch.frequency <= 0 || livePitch.nearestMidi <= 0)) return;
      if (earTarget.bendCents) {
        const spec = JUDGMENT_TIERS[judgmentTier];
        if (peakBendRef.current < earTarget.bendCents * spec.bendCompletionRatio) {
          return;
        }
      }

      const ev = evaluateNoteHit(
        earTarget,
        livePitch.midiFloat,
        0,
        judgmentTier,
        peakBendRef.current,
        {
          noteSpectrum: livePitch.noteSpectrum,
          chroma: livePitch.chroma,
          source: livePitch.source,
        }
      );

      if (ev.result !== 'miss') {
        if (!canAcceptPitchForNote(earTarget.id, livePitch.nearestMidi, livePitch.isOnset)) {
          return;
        }
        lastAcceptedRef.current = {
          noteId: earTarget.id,
          midi: livePitch.nearestMidi,
          at: nowWallMs,
          hadSilence: false,
        };
        wrongHoldRef.current = null;
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
          trackStudioEvent('earcopy_completed', {
            lesson_id: lesson.id,
            hints_used: earCopyHintLevel,
          });
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
        if (livePitch.source !== 'simulated') {
          const hold = wrongHoldRef.current;
          if (
            !hold ||
            hold.noteId !== earTarget.id ||
            Math.abs(hold.midi - livePitch.nearestMidi) > 1
          ) {
            wrongHoldRef.current = {
              noteId: earTarget.id,
              midi: livePitch.nearestMidi,
              startedAt: nowWallMs,
            };
            return;
          }
          if (nowWallMs - hold.startedAt < 110) return;
        }

        const targetMidi = getNoteMidi(earTarget.string, earTarget.fret);
        const diffSemis = Math.round(livePitch.midiFloat - targetMidi);
        setFeedbackBanner({
          result: 'miss',
          title: `${livePitch.noteName}`,
          detail:
            Math.abs(diffSemis) === 12
              ? diffSemis > 0
                ? tr(
                    'Octave high · search the same note one octave lower.',
                    '한 옥타브 높아요 · 같은 계이름의 아래 옥타브를 찾아보세요.'
                  )
                : tr(
                    'Octave low · search the same note one octave higher.',
                    '한 옥타브 낮아요 · 같은 계이름의 위 옥타브를 찾아보세요.'
                  )
              : livePitch.midiFloat > targetMidi
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

    // Free Jam Mode (record distinct note onsets)
    if (practiceMode === 'jam' && isPlaying) {
      if (!livePitch.isOnset) return;
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
      if (countInActiveRef.current) return;
      const secPerBeat = 60 / bpm;
      const loopStartBeat = loopRangeBars[0] * lesson.beatsPerBar;
      const loopSpan = Math.max(
        1,
        (loopRangeBars[1] - loopRangeBars[0] + 1) * lesson.beatsPerBar
      );
      const circularDiff = (a: number, b: number) => {
        let d = a - b;
        if (d > loopSpan / 2) d -= loopSpan;
        if (d < -loopSpan / 2) d += loopSpan;
        return d;
      };

      const compensatedWallMs =
        livePitch.source === 'simulated'
          ? nowWallMs
          : nowWallMs - audioConfig.latencyOffsetMs;
      const exactCompBeat = guitarSynthEngine.getExactBeatAt(compensatedWallMs);
      const exactRawBeat = guitarSynthEngine.getExactBeatAt(nowWallMs);

      let closestNote: (typeof lesson.notes)[number] | null = null;
      let minBeatDiff = 999;

      for (const n of lesson.notes) {
        if (n.beatStart < loopStartBeat - 0.1) continue;
        const diff = circularDiff(exactCompBeat, n.beatStart);
        if (Math.abs(diff) < Math.abs(minBeatDiff)) {
          minBeatDiff = diff;
          closestNote = n;
        }
      }

      if (!closestNote || Math.abs(minBeatDiff) > 1.0) return;

      const isClosestChord = Boolean(closestNote.chordNotes && closestNote.chordNotes.length > 0);
      if (!isClosestChord && (livePitch.frequency <= 0 || livePitch.nearestMidi <= 0)) return;

      const existingEval = evaluationsRef.current[closestNote.id];
      const rankOf = (r: NoteEvaluation['result']) =>
        r === 'perfect' ? 3 : r === 'good' ? 2 : r === 'pass' ? 1 : 0;

      // Never downgrade an already-passed evaluation on the same note within a pass
      if (existingEval && existingEval.result !== 'miss') {
        if (!livePitch.isOnset && livePitch.clarity < 0.6) return;
      } else if (!isClosestChord && !livePitch.isOnset && livePitch.clarity < 0.6) {
        return;
      }

      const timingErrorMs = minBeatDiff * secPerBeat * 1000;
      const ev = evaluateNoteHit(
        closestNote,
        livePitch.midiFloat,
        timingErrorMs,
        judgmentTier,
        peakBendRef.current,
        {
          noteSpectrum: livePitch.noteSpectrum,
          chroma: livePitch.chroma,
          source: livePitch.source,
        }
      );

      // Accumulate clean physical guitar note onsets to refine latency progressively per bar
      if (
        livePitch.source !== 'simulated' &&
        livePitch.isOnset &&
        livePitch.clarity >= 0.65 &&
        Math.abs(ev.centsError) <= JUDGMENT_TIERS[judgmentTier].centsTolerance
      ) {
        const rawTimingErrorMs =
          circularDiff(exactRawBeat, closestNote.beatStart) * secPerBeat * 1000;
        if (
          rawTimingErrorMs >= -80 &&
          rawTimingErrorMs <= 240 &&
          !latencySampledNotesRef.current.has(closestNote.id)
        ) {
          latencySampledNotesRef.current.add(closestNote.id);
          pendingRawLatencyBatchRef.current.push(rawTimingErrorMs);
          if (pendingRawLatencyBatchRef.current.length >= lesson.beatsPerBar) {
            flushAdaptiveLatency();
          }
        }
      }

      if (existingEval && existingEval.result !== 'miss') {
        if (ev.result === 'miss' || rankOf(ev.result) <= rankOf(existingEval.result)) {
          return;
        }
      }

      // Only record an explicit miss on a genuine onset (prevent stray sustain spillover from stamping miss)
      if (ev.result === 'miss' && !livePitch.isOnset) {
        return;
      }

      const nextEvals = { ...evaluationsRef.current, [closestNote.id]: ev };
      evaluationsRef.current = nextEvals;
      setEvaluations(nextEvals);
      peakBendRef.current = 0;

      if (ev.result !== 'miss') {
        if (!existingEval || existingEval.result === 'miss') {
          maxFlowStreakRef.current += 1;
        }
      } else {
        maxFlowStreakRef.current = 0;
      }

      const timingMsg =
        ev.result === 'miss' && isClosestChord
          ? tr('Check chord shape and clean strum', '코드 운지와 스트럼 울림을 확인해 보세요')
          : ev.unmutedStringWarning && ev.result !== 'miss'
          ? ev.unmutedStringDetail
            ? tr(
                `Hit · mute unplayed ${ev.unmutedStringDetail} string`,
                `정확해요 · 치지 않는 ${ev.unmutedStringDetail} 개방현 뮤트 확인`
              )
            : tr('Hit · mute unused low strings', '정확해요 · 치지 않는 저음현 뮤트 확인')
          : Math.abs(ev.timingErrorMs) <= 20
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
    audioConfig.latencyOffsetMs,
    audioConfig.noiseGateDb,
    bpm,
    completeWarmupLesson,
    earCopyHintLevel,
    earCopyUnlockedIndices,
    examCountInBars,
    flushAdaptiveLatency,
    isCapturingHum,
    isExamAutoStartArmed,
    isPlaying,
    judgmentTier,
    keyCenterRootPc,
    lesson,
    livePitch,
    loopRangeBars,
    practiceMode,
    rawLesson,
    startTransportForMode,
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
      trackStudioEvent('audio_connected', {
        input_mode: audioConfig.inputMode,
        pipeline_mode: tel.pipelineMode,
        sample_rate: tel.sampleRate,
      });
    } catch (err) {
      const fallbackMsg = tr('Audio connection failed', '오디오 연결 실패');
      setAudioError(err instanceof Error ? err.message : fallbackMsg);
      setIsAudioRunning(false);
      pushSafeError(
        {
          category: 'audio',
          code: 'AUDIO_INPUT_START_FAILED',
          title: tr('Guitar Audio Connection Error', '기타 오디오 입력 연결 오류'),
          summary: tr(
            'Could not start audio input. Check browser microphone permissions or audio device settings.',
            '기타 오디오 입력을 시작하지 못했습니다. 브라우저 마이크 권한 및 입력 장치 설정을 확인해 주세요.'
          ),
          error: err,
          context: {
            inputMode: audioConfig.inputMode,
            channelMode: audioConfig.channelMode,
          },
        },
        true
      );
    }
  };

  const handleRestartAudio = async () => {
    try {
      setAudioError(null);
      const tel = await guitarAudioEngine.start(audioConfig);
      setAudioTelemetry(tel);
      setIsAudioRunning(true);
      trackStudioEvent('audio_connected', {
        input_mode: audioConfig.inputMode,
        pipeline_mode: tel.pipelineMode,
        sample_rate: tel.sampleRate,
      });
    } catch (err) {
      const fallbackMsg = tr('Audio restart failed', '오디오 재시작 실패');
      setAudioError(err instanceof Error ? err.message : fallbackMsg);
      setIsAudioRunning(false);
      pushSafeError(
        {
          category: 'audio',
          code: 'AUDIO_RESTART_FAILED',
          title: tr('Audio Device Restart Error', '오디오 장치 재연결 오류'),
          summary: tr(
            'Failed to apply audio settings. Verify selected input device is connected.',
            '변경한 오디오 설정을 적용하지 못했습니다. 선택한 입력 장치 연결 상태를 확인해 주세요.'
          ),
          error: err,
          context: {
            inputMode: audioConfig.inputMode,
            channelMode: audioConfig.channelMode,
          },
        },
        true
      );
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
    const standardTasks = [
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
    return lesson.skipExam
      ? standardTasks.filter((t) => t.mode !== 'exam')
      : standardTasks;
  }, [bpm, lesson.skipExam, lesson.supportsEarCopy, lesson.supportsJam, tr]);

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
      if (completedTasks.has('loop') && lesson.skipExam && nextLesson) {
        return {
          label: tr(`Next Lesson (${nextLesson.code})`, `다음 레슨 (${nextLesson.code}) 이동`),
          onClick: handleAdvanceToNextLesson,
        };
      }
      if (completedTasks.has('loop') && !isPlaying) {
        return {
          label: tr('Take Passing Exam', '통과 테스트 보기'),
          onClick: () => handlePracticeModeChange('exam'),
        };
      }
      return {
        label: isPlaying ? tr('Stop Tempo Loop', '템포 연습 중지') : tr('Start Tempo Loop', '템포 맞춰 시작'),
        onClick: toggleTransport,
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
  }, [
    completedTasks,
    handleAdvanceToNextLesson,
    handlePracticeModeChange,
    isPlaying,
    lesson.skipExam,
    lesson.supportsEarCopy,
    lesson.supportsJam,
    nextLesson,
    practiceMode,
    toggleTransport,
    tr,
  ]);

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

  // Track live vibrato pitch contour on sustained expressive notes (e.g., 6-4, 8-3, 8-4)
  useEffect(() => {
    const isVibratoContext =
      lesson.id === 'm6-4' ||
      lesson.id === 'm8-3' ||
      lesson.id === 'm8-4' ||
      lesson.notes.some((n) => n.technique === 'vibrato');

    if (!isVibratoContext || !livePitch.isActive || livePitch.midiFloat <= 0) {
      if (vibratoSamplesRef.current.length > 0) {
        vibratoSamplesRef.current = [];
        setLiveVibrato(null);
      }
      return;
    }

    const nowMs = livePitch.timestampMs || performance.now();
    const baseMidi = Math.round(livePitch.midiFloat);
    const centsOffset = (livePitch.midiFloat - baseMidi) * 100;
    const recent = vibratoSamplesRef.current.filter((s) => nowMs - s.timestampMs <= 900);
    recent.push({ timestampMs: nowMs, centsOffset });
    vibratoSamplesRef.current = recent.slice(-36);

    if (recent.length >= 8) {
      const metrics = analyzeVibratoContour(recent);
      setLiveVibrato(metrics.isDetected ? metrics : null);
    }
  }, [lesson.id, lesson.notes, livePitch.isActive, livePitch.midiFloat, livePitch.timestampMs]);

  const showFourthLabTab = lesson.supportsEarCopy || lesson.supportsJam || !isPhase1;

  return (
    <StudioMotionProvider>
      <div className="min-h-screen grid grid-cols-1 lg:grid-cols-[232px_minmax(0,1fr)_284px] bg-background text-foreground">
        {/* ==================== 1. LEFT SIDEBAR ==================== */}
        <CurriculumSidebar
          selectedLessonId={lesson.id}
          onSelectLesson={handleSelectLesson}
          progress={progress}
          onToggleFreeExplore={(enabled) =>
            setProgress((prev) => ({ ...prev, freeExploreMode: enabled }))
          }
          onOpenAnalytics={() => setAnalyticsOpen(true)}
          onOpenOnboarding={() => setOnboardingOpen(true)}
          themePreference={themePreference}
          onThemeChange={setThemePreference}
          user={
            user
              ? {
                  email: user.email,
                  name:
                    (user.user_metadata?.full_name as string | undefined) ??
                    (user.user_metadata?.name as string | undefined),
                  avatarUrl:
                    (user.user_metadata?.avatar_url as string | undefined) ??
                    (user.user_metadata?.picture as string | undefined),
                }
              : {
                  email: tr('Guest Preview (1-1 · 3-1 · 4-1)', '무료 체험 중 (1-1 · 3-1 · 4-1)'),
                  name: tr('Guest Mode', '체험 모드'),
                }
          }
          syncStatus={syncStatus}
          onSignOut={() => (isGuestMode ? onGuestSignIn(lesson.id) : void onSignOut())}
          errorLogCount={errorLogs.length}
          onOpenErrorModal={() => setErrorModalOpen(true)}
          isAdmin={isAdmin}
        />

        {/* ==================== 2. CENTER MAIN WORKSPACE ==================== */}
        <main className="min-w-0 px-4 sm:px-7 py-5 space-y-5">
          {/* Guest Sandbox Trial Banner */}
          {isGuestMode && (
            <div className="rounded-xl border border-primary/35 bg-accent-soft px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2 text-xs text-foreground">
                <Badge variant="default" className="font-mono text-[10px]">
                  {tr('GUEST SANDBOX', '무료 체험 모드')}
                </Badge>
                <span className="font-medium">
                  {tr(
                    'Try starter lessons right away. Sign in with Google to unlock all 39 lessons and cloud save.',
                    '로그인 없이 대표 3강을 체험 중입니다. Google 로그인으로 39강 전체와 진도 저장을 여세요.'
                  )}
                </span>
                <div className="inline-flex items-center gap-1">
                  {(['m1-1', 'm3-1', 'm4-1'] as const).map((id) => {
                    const item = getLessonById(id);
                    if (!item) return null;
                    const active = lesson.id === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => handleSelectLesson(item)}
                        className={`rounded-md px-2 py-0.5 font-mono text-[11px] font-semibold border transition-colors ${
                          active
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-border bg-card text-foreground hover:border-primary/50'
                        }`}
                      >
                        {item.code}
                      </button>
                    );
                  })}
                </div>
              </div>
              <Button
                type="button"
                size="sm"
                onClick={() => onGuestSignIn(lesson.id)}
                className="rounded-lg text-xs font-semibold shrink-0"
              >
                {tr('Save & Unlock 39 Lessons', 'Google 로그인 · 39강 열기')}
              </Button>
            </div>
          )}

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
              onOpenErrorModal={() => setErrorModalOpen(true)}
            />
          </div>

          {/* Live Vibrato Pitch-Contour Coaching Bar (shown when vibrato is detected) */}
          {liveVibrato?.isDetected && (
            <div className="rounded-xl border border-primary/35 bg-card px-4 py-2 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs">
                <span className="h-2 w-2 rounded-full bg-primary" />
                <span className="font-semibold text-foreground">
                  {tr('Live Vibrato Contour', '실시간 비브라토 피치 궤적')}
                </span>
                <span className="font-mono text-primary font-semibold tabular-nums">
                  ±{Math.round(liveVibrato.widthCents / 2)}c · {liveVibrato.rateHz} Hz
                </span>
                <span className="text-muted-foreground">
                  ({tr(`Stability ${liveVibrato.stabilityScore}%`, `안정도 ${liveVibrato.stabilityScore}%`)})
                </span>
              </div>
              <svg viewBox="0 0 120 24" className="w-28 h-6 overflow-visible" aria-hidden="true">
                <line x1="0" y1="12" x2="120" y2="12" stroke="var(--border)" strokeDasharray="3 3" />
                <polyline
                  fill="none"
                  stroke="var(--primary)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={liveVibrato.samplesCents
                    .map((c, idx, arr) => {
                      const x = (idx / Math.max(1, arr.length - 1)) * 120;
                      const y = Math.max(2, Math.min(22, 12 - (c / 60) * 10));
                      return `${x.toFixed(1)},${y.toFixed(1)}`;
                    })
                    .join(' ')}
                />
              </svg>
            </div>
          )}

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
            countInState={countInState}
            autoStartArmed={isExamAutoStartArmed}
            autoStartImmediate={examCountInBars === 0}
            tuningProfile={audioConfig.tuningProfile ?? 'standard'}
            capoFret={audioConfig.capoFret ?? 0}
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
              {lastTelemetry && lastTelemetry.lessonId === lesson.id && !lesson.skipExam && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setReportOpen(true)}
                >
                  {tr(`Last Result (${lastTelemetry.score})`, `최근 결과 (${lastTelemetry.score}점)`)}
                </Button>
              )}
              {lesson.skipExam &&
                nextLesson &&
                !(practiceMode === 'loop' && completedTasks.has('loop')) && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleAdvanceToNextLesson}
                  >
                    <span>
                      {tr(`Next Lesson (${nextLesson.code})`, `다음 레슨 (${nextLesson.code})`)}
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 ml-1" />
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

            {lesson.skipExam && nextLesson && (
              <div className="pt-2.5 border-t border-border space-y-2">
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  {tr(
                    'Warm-up lesson · Move on anytime without an exam',
                    '입문 워밍업 레슨 · 테스트 없이 언제든 다음 단계로 넘어갈 수 있어요'
                  )}
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant={
                    completedTasks.has('loop') ||
                    completedTasks.has('wait') ||
                    Boolean(progress.lessonRecords[lesson.id]?.completed)
                      ? 'default'
                      : 'secondary'
                  }
                  onClick={handleAdvanceToNextLesson}
                  className="w-full justify-between text-xs"
                >
                  <span>
                    {tr(
                      `Continue to Lesson ${nextLesson.code}`,
                      `다음 레슨으로 넘어가기 (${nextLesson.code})`
                    )}
                  </span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            )}

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

                <div className="pt-1.5 space-y-1.5">
                  <div className="text-[11px] font-medium text-muted-foreground">
                    {tr('Count-In', '예비박 카운트인')}
                  </div>
                  <Select
                    value={String(examCountInBars)}
                    onValueChange={(v) => {
                      if (v !== null) setExamCountInBars(Number(v));
                    }}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">{tr('1 Bar (4 Beats · Recommended)', '1마디 (4박 · 추천)')}</SelectItem>
                      <SelectItem value="2">{tr('2 Bars (8 Beats · Relaxed)', '2마디 (8박 · 여유)')}</SelectItem>
                      <SelectItem value="0">{tr('None (Immediate)', '없음 (바로 시작)')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="pt-1.5 flex items-center justify-between gap-2">
                  <span className="text-[11px] font-medium text-foreground/90">
                    {tr('Auto-Start on Guitar', '기타 입력 시 자동 시작')}
                  </span>
                  <Switch checked={examAutoStart} onCheckedChange={setExamAutoStart} />
                </div>

                {examAutoStart && !isAudioRunning && (
                  <div className="flex items-center justify-between gap-2 rounded-lg bg-muted/60 px-2.5 py-1.5 text-[11px] text-muted-foreground">
                    <span>{tr('Connect guitar for auto-start', '자동 시작하려면 기타를 연결하세요')}</span>
                    <button
                      type="button"
                      onClick={() => void handleToggleAudio()}
                      className="font-semibold text-primary hover:underline shrink-0"
                    >
                      {tr('Connect', '연결')}
                    </button>
                  </div>
                )}
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
      <StudioOnboardingDialog
        open={onboardingOpen}
        onOpenChange={setOnboardingOpen}
        userName={
          (user?.user_metadata?.full_name as string | undefined) ??
          (user?.user_metadata?.name as string | undefined) ??
          user?.email?.split('@')[0]
        }
        initialFreeExplore={progress.freeExploreMode}
        initialDailyGoalSeconds={progress.dailyGoalSeconds}
        isAudioRunning={isAudioRunning}
        onConnectAudio={handleToggleAudio}
        onOpenAudioSetup={() => setAudioSetupOpen(true)}
        onComplete={({ freeExploreMode, dailyGoalSeconds }) => {
          setProgress((prev) => ({
            ...prev,
            onboardingCompleted: true,
            freeExploreMode,
            dailyGoalSeconds,
          }));
          trackStudioEvent('onboarding_completed', {
            locale,
            daily_goal_minutes: Math.round(dailyGoalSeconds / 60),
            free_explore: freeExploreMode,
          });
          setOnboardingOpen(false);
          setGuideSection('both');
          setGuideDialogOpen(true);
        }}
        onSkip={() => {
          setProgress((prev) =>
            prev.onboardingCompleted ? prev : { ...prev, onboardingCompleted: true }
          );
        }}
      />

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
        tuningProfile={audioConfig.tuningProfile ?? 'standard'}
        capoFret={audioConfig.capoFret ?? 0}
        onTuningChange={handleTuningChange}
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
        adaptiveLatency={adaptiveLatency}
        onResetAdaptiveLatency={handleResetAdaptiveLatency}
        onRecordManualCalibrationSamples={handleRecordManualCalibrationSamples}
      />

      <SkillAnalyticsDialog
        open={analyticsOpen}
        onOpenChange={setAnalyticsOpen}
        progress={progress}
        sessions={practiceSessions}
        onStartDrill={(item: WeakBarDrillItem) => {
          const target = getLessonById(item.lessonId);
          if (!target) return;
          handleSelectLesson(target);
          setGuideDialogOpen(false);
          setPracticeMode('loop');
          setLoopRangeBars(item.barRange);
          setBpm(item.startBpm);
          setAutoSpeedUp(true);
        }}
      />

      <MasteryReportDialog
        open={reportOpen}
        onOpenChange={setReportOpen}
        telemetry={lastTelemetry}
        hasNextLesson={Boolean(nextLesson)}
        onRetry={() => {
          setReportOpen(false);
          resetSessionState();
          setPracticeMode('exam');
          examAutoStartArmedAtRef.current = performance.now() + 900;
        }}
        onLoopWeakBar={(barIdx) => {
          const slowBpm = Math.max(lesson.minBpm, Math.round(bpm * 0.8));
          setReportOpen(false);
          setPracticeMode('loop');
          setLoopRangeBars([barIdx, barIdx]);
          setBpm(slowBpm);
          startTransportForMode('loop', {
            loopRangeBars: [barIdx, barIdx],
            bpm: slowBpm,
          });
        }}
        onNextLesson={() => {
          if (nextLesson) handleSelectLesson(nextLesson);
        }}
      />

      <ErrorReportDialog
        open={errorModalOpen}
        onOpenChange={setErrorModalOpen}
        logs={errorLogs}
        onClearLogs={() => {
          setErrorLogs([]);
          setAudioError(null);
        }}
        onRetryAudio={() => void handleToggleAudio()}
        onOpenAudioSetup={() => setAudioSetupOpen(true)}
      />
    </StudioMotionProvider>
  );
}
