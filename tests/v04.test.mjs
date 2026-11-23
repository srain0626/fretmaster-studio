import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { loadTsModule } from './helpers/loadTs.mjs';

describe('v0.4.0 Alternate Tunings, Virtual Capo, Muting, Vibrato & Drill Queue', () => {
  const {
    setActiveTuning,
    getActiveTuning,
    getNoteMidi,
    getTuningOpenStrings,
    findPossiblePositionsForMidi,
  } = loadTsModule('src/lib/musicTheory.ts');

  const {
    detectSingleNoteOpenStringBleed,
    analyzeVibratoContour,
  } = loadTsModule('src/lib/lowLatencyAudioEngine.ts');

  const {
    summarizeSessionHistory,
    buildWeakBarDrillQueue,
  } = loadTsModule('src/lib/practiceAnalytics.ts');

  test('switches alternate tunings (Drop D, Eb, Open G, DADGAD) and virtual capo cleanly', () => {
    try {
      setActiveTuning('drop-d', 0);
      assert.equal(getActiveTuning().profileId, 'drop-d');
      assert.equal(getNoteMidi(6, 0), 38); // D2
      assert.equal(getNoteMidi(6, 2), 40); // E2
      assert.equal(getNoteMidi(5, 0), 45); // A2 unchanged

      const dropDOpen = getTuningOpenStrings('drop-d', 0);
      assert.equal(dropDOpen[0].label, 'D2');
      assert.equal(dropDOpen[5].label, 'E4');

      setActiveTuning('eb-standard', 0);
      assert.equal(getNoteMidi(6, 0), 39); // D#2 / Eb2
      assert.equal(getNoteMidi(1, 0), 63); // D#4 / Eb4

      setActiveTuning('standard', 2);
      assert.equal(getNoteMidi(6, 0), 42); // F#2 with Capo 2F
      const capoPositions = findPossiblePositionsForMidi(42, 12);
      assert.ok(capoPositions.some((p) => p.string === 6 && p.fret === 0));
    } finally {
      setActiveTuning('standard', 0);
    }
  });

  test('detects single-note unmuted open-string bleed without flagging sympathetic octaves', () => {
    setActiveTuning('standard', 0);
    const spectrum = new Array(45).fill(0);
    // Target: 3G fret 5 = C4 (MIDI 60 -> bin 20)
    spectrum[60 - 40] = 88;
    // Unmuted 6E open string = E2 (MIDI 40 -> bin 0)
    spectrum[40 - 40] = 74;

    const bleed = detectSingleNoteOpenStringBleed({ string: 3, fret: 5 }, spectrum);
    assert.equal(bleed.hasBleed, true);
    assert.equal(bleed.bleedingStringLabel, '6E2');

    // Clean note without unmuted bass ring
    const cleanSpectrum = new Array(45).fill(0);
    cleanSpectrum[60 - 40] = 90;
    const cleanRes = detectSingleNoteOpenStringBleed({ string: 3, fret: 5 }, cleanSpectrum);
    assert.equal(cleanRes.hasBleed, false);
  });

  test('analyzes live vibrato width (cents), rate (Hz), and rejects flat steady pitch', () => {
    // 5.5 Hz sine vibrato with +/-30 cents amplitude over 750ms
    const vibratoSamples = [];
    for (let i = 0; i <= 24; i++) {
      const tMs = i * 30;
      const cents = Math.sin((2 * Math.PI * 5.5 * tMs) / 1000) * 30;
      vibratoSamples.push({ timestampMs: tMs, centsOffset: cents });
    }
    const vib = analyzeVibratoContour(vibratoSamples);
    assert.equal(vib.isDetected, true);
    assert.ok(vib.widthCents >= 50 && vib.widthCents <= 64, `Expected ~60c width, got ${vib.widthCents}`);
    assert.ok(vib.rateHz >= 4.5 && vib.rateHz <= 6.5, `Expected ~5.5 Hz, got ${vib.rateHz}`);
    assert.ok(vib.stabilityScore >= 80, `Expected high stability, got ${vib.stabilityScore}`);

    // Flat pitch with tiny noise should not trigger vibrato detection
    const flatSamples = Array.from({ length: 16 }, (_, i) => ({
      timestampMs: i * 40,
      centsOffset: (i % 2 === 0 ? 2 : -2),
    }));
    const flat = analyzeVibratoContour(flatSamples);
    assert.equal(flat.isDetected, false);
  });

  test('summarizes practice session history and assembles weak-bar & spaced-review drill queue', () => {
    const nowMs = Date.parse('2026-11-23T12:00:00Z');
    const sessions = [
      {
        id: 's1',
        lessonId: 'm1-2',
        mode: 'exam',
        tier: 'standard',
        score: 76,
        grade: 'B',
        pitchAccuracy: 80,
        timingAccuracy: 72,
        bpmPlayed: 75,
        avgTimingErrorMs: 14,
        weakBarIndices: [1, 2],
        passed: false,
        createdAt: '2026-11-20T10:00:00Z',
      },
      {
        id: 's2',
        lessonId: 'm1-2',
        mode: 'exam',
        tier: 'standard',
        score: 92,
        grade: 'A',
        pitchAccuracy: 94,
        timingAccuracy: 90,
        bpmPlayed: 85,
        avgTimingErrorMs: 6,
        weakBarIndices: [],
        passed: true,
        createdAt: '2026-11-22T10:00:00Z',
      },
    ];

    const summary = summarizeSessionHistory(sessions);
    assert.equal(summary.totalSessions, 2);
    assert.equal(summary.avgScore, 84);
    assert.equal(summary.maxBpm, 85);
    assert.equal(summary.passRatePct, 50);
    assert.equal(summary.avgTimingBiasMs, 10);
    assert.equal(summary.recentPoints.length, 2);

    const mockLessons = [
      { id: 'm1-1', code: '1-1', title: 'Open Strings', defaultBpm: 70, minBpm: 50, totalBars: 4 },
      { id: 'm1-2', code: '1-2', title: 'First Frets', defaultBpm: 80, minBpm: 55, totalBars: 4 },
    ];
    const progress = {
      lessonRecords: {
        'm1-1': {
          completed: true,
          bestScore: 95,
          bestGrade: 'S',
          highestTierCleared: 'standard',
          bestBpm: 75,
          earCopySolved: false,
          lastPracticedAt: '2026-11-15T10:00:00Z', // 8 days ago -> spaced review
        },
        'm1-2': {
          completed: true,
          bestScore: 92,
          bestGrade: 'A',
          highestTierCleared: 'standard',
          bestBpm: 85,
          earCopySolved: false,
          lastPracticedAt: '2026-11-22T10:00:00Z',
          weakBarIndices: [1, 2],
        },
      },
      dailyPracticeSeconds: 600,
      dailyGoalSeconds: 900,
      dayStreak: 3,
      lastPracticeDate: '2026-11-23',
      totalCompletedCount: 2,
      freeExploreMode: false,
      skills: { mechanics: 60, fretboardVision: 55, rhythmTiming: 58, earCopy: 30, creativePhrasing: 30 },
    };

    const queue = buildWeakBarDrillQueue(progress, sessions, mockLessons, nowMs);
    assert.equal(queue.length, 2);
    assert.equal(queue[0].lessonId, 'm1-2');
    assert.equal(queue[0].reason, 'weak-bar');
    assert.deepEqual(queue[0].barRange, [1, 2]);
    assert.equal(queue[0].startBpm, 65); // 80% of 80 rounded to nearest 5
    assert.equal(queue[1].lessonId, 'm1-1');
    assert.equal(queue[1].reason, 'spaced-review');
    assert.equal(queue[1].daysSincePractice, 8);
  });
});
