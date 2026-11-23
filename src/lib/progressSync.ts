import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import type {
  AudioDeviceConfig,
  JudgmentTier,
  LessonProgressRecord,
  PracticeMode,
  PracticeSessionRecord,
  SessionTelemetry,
  UserProgressState,
} from '@/types/guitar';

export type SyncStatus = 'idle' | 'syncing' | 'saved' | 'error';

export interface CloudProgressPayload {
  progress: UserProgressState;
  lastLessonId: string;
  audioConfig?: AudioDeviceConfig | null;
}

const GRADE_RANK: Record<LessonProgressRecord['bestGrade'], number> = {
  Retry: 0,
  C: 1,
  B: 2,
  A: 3,
  S: 4,
};

const TIER_RANK: Record<JudgmentTier, number> = {
  relaxed: 1,
  standard: 2,
  tight: 3,
  studio: 4,
};

function higherGrade(
  a?: LessonProgressRecord['bestGrade'],
  b?: LessonProgressRecord['bestGrade']
): LessonProgressRecord['bestGrade'] {
  if (!a) return b ?? 'Retry';
  if (!b) return a;
  return GRADE_RANK[a] >= GRADE_RANK[b] ? a : b;
}

function higherTier(a?: JudgmentTier | null, b?: JudgmentTier | null): JudgmentTier | null {
  if (!a) return b ?? null;
  if (!b) return a;
  return TIER_RANK[a] >= TIER_RANK[b] ? a : b;
}

export function mergeUserProgress(
  local: UserProgressState,
  cloud: UserProgressState | null
): UserProgressState {
  if (!cloud) return local;

  const allLessonIds = new Set([
    ...Object.keys(local.lessonRecords ?? {}),
    ...Object.keys(cloud.lessonRecords ?? {}),
  ]);

  const mergedRecords: Record<string, LessonProgressRecord> = {};
  for (const id of allLessonIds) {
    const a = local.lessonRecords?.[id];
    const b = cloud.lessonRecords?.[id];
    if (!a && !b) continue;
    const latestPracticedAt =
      (a?.lastPracticedAt ?? '') >= (b?.lastPracticedAt ?? '')
        ? a?.lastPracticedAt
        : b?.lastPracticedAt;
    const latestWeakBars =
      (a?.lastPracticedAt ?? '') >= (b?.lastPracticedAt ?? '')
        ? a?.weakBarIndices ?? b?.weakBarIndices
        : b?.weakBarIndices ?? a?.weakBarIndices;

    mergedRecords[id] = {
      completed: Boolean(a?.completed || b?.completed),
      bestScore: Math.max(a?.bestScore ?? 0, b?.bestScore ?? 0),
      bestGrade: higherGrade(a?.bestGrade, b?.bestGrade),
      highestTierCleared: higherTier(a?.highestTierCleared, b?.highestTierCleared),
      bestBpm: Math.max(a?.bestBpm ?? 0, b?.bestBpm ?? 0),
      earCopySolved: Boolean(a?.earCopySolved || b?.earCopySolved),
      lastPracticedAt: latestPracticedAt,
      weakBarIndices: latestWeakBars,
    };
  }

  const localDate = local.lastPracticeDate || '';
  const cloudDate = cloud.lastPracticeDate || '';
  let lastPracticeDate = localDate >= cloudDate ? localDate : cloudDate;
  let dailyPracticeSeconds = local.dailyPracticeSeconds;

  if (localDate === cloudDate) {
    dailyPracticeSeconds = Math.max(local.dailyPracticeSeconds, cloud.dailyPracticeSeconds);
  } else if (cloudDate > localDate) {
    dailyPracticeSeconds = cloud.dailyPracticeSeconds;
  }

  if (!lastPracticeDate) {
    lastPracticeDate = '';
  }

  const totalCompletedCount = Object.values(mergedRecords).filter((r) => r.completed).length;

  return {
    lessonRecords: mergedRecords,
    dailyPracticeSeconds,
    dailyGoalSeconds: cloud.dailyGoalSeconds || local.dailyGoalSeconds,
    dayStreak: Math.max(local.dayStreak, cloud.dayStreak),
    lastPracticeDate,
    totalCompletedCount,
    freeExploreMode: Boolean(local.freeExploreMode || cloud.freeExploreMode),
    onboardingCompleted: Boolean(
      local.onboardingCompleted || cloud.onboardingCompleted || totalCompletedCount > 0
    ),
    skills: {
      mechanics: Math.max(local.skills.mechanics, cloud.skills?.mechanics ?? 0),
      fretboardVision: Math.max(local.skills.fretboardVision, cloud.skills?.fretboardVision ?? 0),
      rhythmTiming: Math.max(local.skills.rhythmTiming, cloud.skills?.rhythmTiming ?? 0),
      earCopy: Math.max(local.skills.earCopy, cloud.skills?.earCopy ?? 0),
      creativePhrasing: Math.max(local.skills.creativePhrasing, cloud.skills?.creativePhrasing ?? 0),
    },
  };
}

export async function fetchCloudProgress(userId: string): Promise<CloudProgressPayload | null> {
  const supabase = createSupabaseBrowserClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('user_progress')
    .select(
      'lesson_records, skills, daily_practice_seconds, daily_goal_seconds, day_streak, last_practice_date, total_completed_count, free_explore_mode, last_lesson_id, audio_config'
    )
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw error;
  }
  if (!data) {
    return null;
  }

  const rawAudio = (data.audio_config ?? null) as
    | (Partial<AudioDeviceConfig> & { _onboardingCompleted?: boolean })
    | null;
  let onboardingCompletedFromAudio = false;
  let cleanAudioConfig: AudioDeviceConfig | null = null;
  if (rawAudio && typeof rawAudio === 'object') {
    onboardingCompletedFromAudio = Boolean(rawAudio._onboardingCompleted);
    const { _onboardingCompleted: _omit, ...rest } = rawAudio;
    void _omit;
    if (typeof rest.inputMode === 'string') {
      cleanAudioConfig = rest as AudioDeviceConfig;
    }
  }

  const totalCompleted = Number(data.total_completed_count ?? 0);

  return {
    progress: {
      lessonRecords: (data.lesson_records ?? {}) as Record<string, LessonProgressRecord>,
      skills: data.skills ?? {
        mechanics: 24,
        fretboardVision: 20,
        rhythmTiming: 25,
        earCopy: 15,
        creativePhrasing: 15,
      },
      dailyPracticeSeconds: Number(data.daily_practice_seconds ?? 0),
      dailyGoalSeconds: Number(data.daily_goal_seconds ?? 1200),
      dayStreak: Number(data.day_streak ?? 1),
      lastPracticeDate: String(data.last_practice_date ?? ''),
      totalCompletedCount: totalCompleted,
      freeExploreMode: Boolean(data.free_explore_mode),
      onboardingCompleted: onboardingCompletedFromAudio || totalCompleted > 0,
    },
    lastLessonId: String(data.last_lesson_id || 'm1-1'),
    audioConfig: cleanAudioConfig,
  };
}

export async function upsertCloudProgress(
  userId: string,
  payload: {
    progress: UserProgressState;
    lastLessonId: string;
    audioConfig?: AudioDeviceConfig;
  }
): Promise<boolean> {
  const supabase = createSupabaseBrowserClient();
  if (!supabase) return false;

  const serializedAudioConfig = {
    ...(payload.audioConfig ?? {}),
    _onboardingCompleted: Boolean(payload.progress.onboardingCompleted),
  };

  const { error } = await supabase.from('user_progress').upsert(
    {
      user_id: userId,
      lesson_records: payload.progress.lessonRecords,
      skills: payload.progress.skills,
      daily_practice_seconds: payload.progress.dailyPracticeSeconds,
      daily_goal_seconds: payload.progress.dailyGoalSeconds,
      day_streak: payload.progress.dayStreak,
      last_practice_date: payload.progress.lastPracticeDate,
      total_completed_count: payload.progress.totalCompletedCount,
      free_explore_mode: payload.progress.freeExploreMode,
      last_lesson_id: payload.lastLessonId,
      audio_config: serializedAudioConfig,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  );

  if (error) {
    throw error;
  }
  return true;
}

export async function recordPracticeSession(
  userId: string,
  telemetry: SessionTelemetry
): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  if (!supabase) return;

  await supabase.from('practice_sessions').insert({
    user_id: userId,
    lesson_id: telemetry.lessonId,
    mode: telemetry.mode,
    tier: telemetry.tier,
    score: Math.round(telemetry.score),
    grade: telemetry.grade,
    pitch_accuracy: Math.round(telemetry.pitchAccuracy),
    timing_accuracy: Math.round(telemetry.timingAccuracy),
    bpm_played: Math.round(telemetry.bpmPlayed),
    passed: telemetry.passed,
  });
}

export async function fetchPracticeSessions(
  userId: string,
  limit = 30
): Promise<PracticeSessionRecord[]> {
  const supabase = createSupabaseBrowserClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('practice_sessions')
    .select(
      'id, lesson_id, mode, tier, score, grade, pitch_accuracy, timing_accuracy, bpm_played, passed, created_at'
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !data) {
    return [];
  }

  return data.map((row) => ({
    id: String(row.id),
    lessonId: String(row.lesson_id),
    mode: (row.mode as PracticeMode) || 'exam',
    tier: (row.tier as JudgmentTier) || 'standard',
    score: Number(row.score ?? 0),
    grade: (row.grade as PracticeSessionRecord['grade']) || 'Retry',
    pitchAccuracy: Number(row.pitch_accuracy ?? 0),
    timingAccuracy: Number(row.timing_accuracy ?? 0),
    bpmPlayed: Number(row.bpm_played ?? 0),
    passed: Boolean(row.passed),
    createdAt: String(row.created_at ?? new Date().toISOString()),
  }));
}
