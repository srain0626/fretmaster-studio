import type {
  Lesson,
  PracticeSessionRecord,
  UserProgressState,
  WeakBarDrillItem,
} from '@/types/guitar';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const SPACED_REVIEW_DAYS = 5;

export interface SessionHistorySummary {
  totalSessions: number;
  passRatePct: number;
  avgScore: number;
  avgPitchAccuracy: number;
  avgTimingAccuracy: number;
  maxBpm: number;
  avgTimingBiasMs: number | null;
  recentPoints: {
    id: string;
    lessonId: string;
    score: number;
    bpmPlayed: number;
    passed: boolean;
    dateLabel: string;
  }[];
}

export function summarizeSessionHistory(
  sessions: PracticeSessionRecord[]
): SessionHistorySummary {
  if (!sessions || sessions.length === 0) {
    return {
      totalSessions: 0,
      passRatePct: 0,
      avgScore: 0,
      avgPitchAccuracy: 0,
      avgTimingAccuracy: 0,
      maxBpm: 0,
      avgTimingBiasMs: null,
      recentPoints: [],
    };
  }

  const ordered = [...sessions].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  let scoreSum = 0;
  let pitchSum = 0;
  let timingSum = 0;
  let passedCount = 0;
  let maxBpm = 0;
  const biasValues: number[] = [];

  for (const s of ordered) {
    scoreSum += s.score;
    pitchSum += s.pitchAccuracy;
    timingSum += s.timingAccuracy;
    if (s.passed) passedCount += 1;
    if (s.bpmPlayed > maxBpm) maxBpm = s.bpmPlayed;
    if (typeof s.avgTimingErrorMs === 'number' && Number.isFinite(s.avgTimingErrorMs)) {
      biasValues.push(s.avgTimingErrorMs);
    }
  }

  const totalSessions = ordered.length;
  const recentPoints = ordered.slice(-10).map((s) => {
    const dt = new Date(s.createdAt);
    const dateLabel = Number.isNaN(dt.getTime())
      ? '--'
      : `${dt.getMonth() + 1}/${dt.getDate()}`;
    return {
      id: s.id,
      lessonId: s.lessonId,
      score: Math.max(0, Math.min(100, Math.round(s.score))),
      bpmPlayed: Math.round(s.bpmPlayed),
      passed: s.passed,
      dateLabel,
    };
  });

  return {
    totalSessions,
    passRatePct: Math.round((passedCount / totalSessions) * 100),
    avgScore: Math.round(scoreSum / totalSessions),
    avgPitchAccuracy: Math.round(pitchSum / totalSessions),
    avgTimingAccuracy: Math.round(timingSum / totalSessions),
    maxBpm: Math.round(maxBpm),
    avgTimingBiasMs:
      biasValues.length > 0
        ? Math.round(biasValues.reduce((a, b) => a + b, 0) / biasValues.length)
        : null,
    recentPoints,
  };
}

/**
 * Assemble a daily 5-minute warm-up queue prioritizing persistent weak bars
 * (at 80% BPM with +5 BPM auto-ramp) and completed lessons due for spaced review.
 */
export function buildWeakBarDrillQueue(
  progress: UserProgressState,
  sessions: PracticeSessionRecord[],
  lessons: Lesson[],
  nowMs: number = Date.now()
): WeakBarDrillItem[] {
  const lessonMap = new Map<string, Lesson>();
  for (const l of lessons) {
    lessonMap.set(l.id, l);
  }

  const queue: WeakBarDrillItem[] = [];
  const seenLessons = new Set<string>();

  // 1. Weak-bar targets from lessonRecords and recent sessions
  const weakByLesson = new Map<string, number[]>();
  for (const [lessonId, rec] of Object.entries(progress.lessonRecords ?? {})) {
    if (rec.weakBarIndices && rec.weakBarIndices.length > 0) {
      weakByLesson.set(lessonId, rec.weakBarIndices);
    }
  }
  for (const sess of sessions) {
    if (sess.weakBarIndices && sess.weakBarIndices.length > 0 && !weakByLesson.has(sess.lessonId)) {
      weakByLesson.set(sess.lessonId, sess.weakBarIndices);
    }
  }

  for (const [lessonId, bars] of weakByLesson.entries()) {
    const lesson = lessonMap.get(lessonId);
    if (!lesson || bars.length === 0) continue;
    const sortedBars = [...bars]
      .filter((b) => b >= 0 && b < lesson.totalBars)
      .sort((a, b) => a - b);
    if (sortedBars.length === 0) continue;

    const startBar = sortedBars[0];
    const endBar = Math.min(lesson.totalBars - 1, Math.max(startBar, Math.min(startBar + 1, sortedBars[sortedBars.length - 1])));
    const startBpm = Math.max(lesson.minBpm, Math.round((lesson.defaultBpm * 0.8) / 5) * 5);

    queue.push({
      lessonId: lesson.id,
      lessonCode: lesson.code,
      lessonTitle: lesson.title,
      barRange: [startBar, endBar],
      startBpm,
      targetBpm: lesson.defaultBpm,
      reason: 'weak-bar',
    });
    seenLessons.add(lesson.id);
    if (queue.length >= 4) return queue;
  }

  // 2. Spaced-repetition review candidates for completed lessons practiced >= 5 days ago
  const reviewCandidates: { lesson: Lesson; daysSince: number }[] = [];
  for (const [lessonId, rec] of Object.entries(progress.lessonRecords ?? {})) {
    if (!rec.completed || seenLessons.has(lessonId) || !rec.lastPracticedAt) continue;
    const lesson = lessonMap.get(lessonId);
    if (!lesson) continue;
    const practicedMs = new Date(rec.lastPracticedAt).getTime();
    if (Number.isNaN(practicedMs)) continue;
    const daysSince = Math.floor((nowMs - practicedMs) / MS_PER_DAY);
    if (daysSince >= SPACED_REVIEW_DAYS) {
      reviewCandidates.push({ lesson, daysSince });
    }
  }

  reviewCandidates.sort((a, b) => b.daysSince - a.daysSince);

  for (const item of reviewCandidates) {
    const startBpm = Math.max(
      item.lesson.minBpm,
      Math.round((item.lesson.defaultBpm * 0.85) / 5) * 5
    );
    queue.push({
      lessonId: item.lesson.id,
      lessonCode: item.lesson.code,
      lessonTitle: item.lesson.title,
      barRange: [0, Math.min(item.lesson.totalBars - 1, 1)],
      startBpm,
      targetBpm: item.lesson.defaultBpm,
      reason: 'spaced-review',
      daysSincePractice: item.daysSince,
    });
    seenLessons.add(item.lesson.id);
    if (queue.length >= 4) break;
  }

  return queue;
}
