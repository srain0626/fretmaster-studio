import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { createWorkletHarness, centsDiff, loadTsModule } from './helpers/loadTs.mjs';

const sampleRate = 48000;

describe('AudioWorklet YIN Pitch & Peak/Clip Telemetry', () => {
  const harness = createWorkletHarness(sampleRate);

  test('tracks Low E2 (82.41 Hz) with weak fundamental, dominant 2nd harmonic and DC offset', () => {
    const n = 8192;
    const buf = new Float32Array(n);
    const f0 = 82.41;
    for (let i = 0; i < n; i++) {
      const t = i / sampleRate;
      buf[i] =
        0.06 +
        0.05 * Math.sin(2 * Math.PI * f0 * t) +
        0.18 * Math.sin(2 * Math.PI * 2 * f0 * t) +
        0.07 * Math.sin(2 * Math.PI * 3 * f0 * t) +
        0.1 * Math.sin(2 * Math.PI * 4 * f0 * t);
    }

    const msgs = harness.feedSignal(buf, 0.2);
    const valid = msgs.filter((m) => m.frequency > 0);
    assert.ok(valid.length > 0, 'Expected pitch detections for E2 with strong 2nd harmonic');

    for (const m of valid.slice(-5)) {
      const cents = Math.abs(centsDiff(m.frequency, f0));
      assert.ok(
        cents < 25,
        `E2 should not jump +1 octave; got ${m.frequency.toFixed(2)} Hz (${cents.toFixed(1)}c off)`
      );
    }
  });

  test('tracks open strings through 22F D6 without octave drops', () => {
    const targets = [
      { name: '5A', freq: 110.0 },
      { name: '4D', freq: 146.83 },
      { name: '3G', freq: 196.0 },
      { name: '2B', freq: 246.94 },
      { name: '1e', freq: 329.63 },
      { name: '12F e', freq: 659.26 },
      { name: '22F D6', freq: 1174.66 },
    ];

    for (const { name, freq } of targets) {
      const n = 6144;
      const buf = new Float32Array(n);
      for (let i = 0; i < n; i++) {
        const t = i / sampleRate;
        buf[i] =
          0.18 * Math.sin(2 * Math.PI * freq * t) +
          0.09 * Math.sin(2 * Math.PI * 2 * freq * t) +
          0.04 * Math.sin(2 * Math.PI * 3 * freq * t);
      }

      const msgs = harness.feedSignal(buf, 1.0);
      const tail = msgs.filter((m) => m.frequency > 0).slice(-4);
      assert.ok(tail.length > 0, `Expected detections for ${name}`);
      const last = tail[tail.length - 1];
      const cents = Math.abs(centsDiff(last.frequency, freq));
      assert.ok(
        cents < 20,
        `${name} (${freq} Hz) detected inaccurately as ${last.frequency.toFixed(2)} Hz (${cents.toFixed(1)}c)`
      );
    }
  });

  test('detects soft fingerstyle attack above -58 dB noise gate', () => {
    const n = 8192;
    const buf = new Float32Array(n);
    for (let i = 2048; i < n; i++) {
      const t = (i - 2048) / sampleRate;
      const env = Math.min(1, t / 0.015);
      buf[i] = env * 0.045 * Math.sin(2 * Math.PI * 196.0 * t);
    }

    const msgs = harness.feedSignal(buf, 2.0);
    assert.ok(msgs.some((m) => m.isOnset), 'Expected soft pluck onset detection');
  });

  test('measures peakDb, inputGainDb (+6 dB trim), and raw clipping >= 0.97', () => {
    const procNormal = harness.createProcessor();
    const procGainUp = harness.createProcessor();
    procGainUp.port.onmessage({ data: { inputGainDb: 6 } });

    const len = 4096;
    const moderate = new Float32Array(len);
    const clipped = new Float32Array(len);
    for (let i = 0; i < len; i++) {
      moderate[i] = 0.25 * Math.sin((2 * Math.PI * 220 * i) / sampleRate);
      clipped[i] = 0.99 * Math.sin((2 * Math.PI * 220 * i) / sampleRate);
    }

    harness.setTime(3.0);
    for (let o = 0; o + 128 <= len; o += 128) {
      procNormal.process([[moderate.subarray(o, o + 128)]]);
      procGainUp.process([[moderate.subarray(o, o + 128)]]);
      harness.setTime(3.0 + (o + 128) / sampleRate);
    }

    const lastNorm = procNormal.messages[procNormal.messages.length - 1];
    const lastGainUp = procGainUp.messages[procGainUp.messages.length - 1];
    assert.ok(Math.abs(lastNorm.peakDb - -12.04) < 0.3, `Expected ~ -12 dB peak, got ${lastNorm.peakDb}`);
    assert.equal(lastNorm.isClipping, false);
    assert.ok(
      Math.abs(lastGainUp.peakDb - lastNorm.peakDb - 6) < 0.4,
      `Expected +6 dB software trim delta, got ${(lastGainUp.peakDb - lastNorm.peakDb).toFixed(2)}`
    );

    const procClip = harness.createProcessor();
    harness.feedProcessor(procClip, clipped, 4.0);
    const lastClip = procClip.messages[procClip.messages.length - 1];
    assert.equal(lastClip.isClipping, true, 'Raw sample >= 0.97 must flag isClipping=true');
  });
});

describe('LowLatencyGuitarAudioEngine Stabilization, Legato & Calibration Math', () => {
  const {
    LowLatencyGuitarAudioEngine,
    evaluateNoteHit,
    computeCalibratedLatency,
    EMPTY_ADAPTIVE_LATENCY_PROFILE,
    updateAdaptiveLatencyProfile,
    JUDGMENT_TIERS,
  } = loadTsModule('src/lib/lowLatencyAudioEngine.ts');

  test('verifies judgment tier tolerances and default noise gate', () => {
    const engine = new LowLatencyGuitarAudioEngine();
    assert.equal(JUDGMENT_TIERS.relaxed.centsTolerance, 55);
    assert.equal(JUDGMENT_TIERS.standard.centsTolerance, 42);
    assert.equal(JUDGMENT_TIERS.tight.centsTolerance, 28);
    assert.equal(JUDGMENT_TIERS.studio.centsTolerance, 18);
    assert.equal(engine.getConfig().noiseGateDb, -58);
  });

  test('carries pending onset onto settled pitch, rejects 1-frame octave glitch, and detects legato shift', () => {
    const engine = new LowLatencyGuitarAudioEngine();
    const emitted = [];
    engine.subscribe((d) => emitted.push(d));

    let fakeNow = 1000;
    const origNow = performance.now.bind(performance);
    performance.now = () => fakeNow;

    try {
      engine['handleRawAnalysis'](0, -30, true, 0.2, 'worklet');
      fakeNow += 12;
      engine['handleRawAnalysis'](110.5, -24, false, 0.88, 'worklet');
      const activeA2 = emitted.filter((e) => e.isActive);
      assert.equal(activeA2.length, 1);
      assert.equal(activeA2[0].isOnset, true);
      assert.equal(activeA2[0].nearestMidi, 45);

      fakeNow += 25;
      engine['handleRawAnalysis'](220.0, -25, false, 0.72, 'worklet');
      assert.equal(emitted[emitted.length - 1].nearestMidi, 45);

      fakeNow += 110;
      engine['handleRawAnalysis'](123.47, -26, false, 0.85, 'worklet');
      fakeNow += 6;
      engine['handleRawAnalysis'](123.47, -26, false, 0.85, 'worklet');
      const latest = emitted[emitted.length - 1];
      assert.equal(latest.nearestMidi, 47);
      assert.equal(latest.isOnset, true);
    } finally {
      performance.now = origNow;
    }
  });

  test('evaluates vibrato/pick sharp tolerance and single-pitch octave fallback on chord notes', () => {
    const sampleNote = { id: 'n1', string: 5, fret: 0, finger: 0, beatStart: 0, durationBeats: 1 };
    const sharpHit = evaluateNoteHit(sampleNote, 45.26, 15, 'standard');
    assert.notEqual(sharpHit.result, 'miss');

    const chordNote = {
      id: 'ch1',
      string: 6,
      fret: 0,
      finger: 0,
      beatStart: 0,
      durationBeats: 2,
      chordNotes: [
        { string: 6, fret: 0, finger: 0 },
        { string: 5, fret: 2, finger: 2 },
      ],
    };
    const octaveChordHit = evaluateNoteHit(chordNote, 52.0, 10, 'standard');
    assert.notEqual(octaveChordHit.result, 'miss');
  });

  test('computes trimmed calibration latency and progressive adaptive latency profile', () => {
    const trimmed = computeCalibratedLatency([-40, 22, 24, 26, 28, 180]);
    assert.equal(trimmed.offsetMs, 25);
    assert.equal(trimmed.quality, 'great');

    const okRes = computeCalibratedLatency([0, 30, 50, 70]);
    assert.equal(okRes.offsetMs, 40);

    const midRes = computeCalibratedLatency([10, 25, 65, 95]);
    assert.equal(midRes.offsetMs, 45);
    assert.equal(midRes.quality, 'ok');

    assert.equal(computeCalibratedLatency([240, 260, 280, 290]).offsetMs, 200);
    assert.equal(computeCalibratedLatency([-90, -80, -70, -60]).offsetMs, -50);

    let profile = EMPTY_ADAPTIVE_LATENCY_PROFILE;
    profile = updateAdaptiveLatencyProfile(profile, [34, 38, 40, 42]);
    assert.equal(profile.totalSampleCount, 4);
    assert.equal(profile.estimatedOffsetMs, 39);
    assert.ok(profile.confidencePct >= 30 && profile.confidencePct < 55);

    const batch = Array.from({ length: 32 }, (_, i) => 35 + (i % 3));
    batch.push(-75, 220, 215, -70);
    profile = updateAdaptiveLatencyProfile(profile, batch);
    assert.equal(profile.totalSampleCount, 40);
    assert.ok(Math.abs(profile.estimatedOffsetMs - 36) <= 2);
    assert.ok(profile.confidencePct >= 90);

    profile = updateAdaptiveLatencyProfile(profile, Array.from({ length: 40 }, () => 36));
    assert.equal(profile.samplesMs.length, 64);
    assert.equal(profile.totalSampleCount, 80);
  });
});

describe('Context-Aware Unison Resolution', () => {
  const { resolveFretPositionForContext, findBestFretForMidi } = loadTsModule('src/lib/musicTheory.ts');
  const { ALL_LESSONS } = loadTsModule('src/data/curriculumData.ts');

  test('maps Lesson 1-1 open strings with unison alternatives and honors Lesson 4-1 box lock', () => {
    const lesson1_1 = ALL_LESSONS.find((l) => l.code === '1-1');
    assert.ok(lesson1_1, 'Lesson 1-1 must exist');

    for (const [midi, expectedStr] of [
      [45, 5],
      [50, 4],
      [55, 3],
      [59, 2],
      [64, 1],
    ]) {
      const basic = findBestFretForMidi(midi, [0, 12]);
      assert.equal(basic.fret, 0);
      assert.equal(basic.string, expectedStr);

      const res = resolveFretPositionForContext(midi, {
        lessonNotes: lesson1_1.notes,
        focusFretRange: lesson1_1.focusFretRange,
        visibleRange: [0, 8],
      });
      assert.equal(res.primary.string, expectedStr);
      assert.equal(res.primary.fret, 0);
      assert.ok(res.unisons.length >= 1);
    }

    const locked = resolveFretPositionForContext(45, {
      targetNote: { string: 6, fret: 5 },
      focusFretRange: [5, 8],
      visibleRange: [4, 10],
    });
    assert.equal(locked.matchedTarget, true);
    assert.equal(locked.primary.string, 6);
    assert.equal(locked.primary.fret, 5);
    assert.ok(locked.unisons.some((u) => u.string === 5 && u.fret === 0));

    const lesson4_1 = ALL_LESSONS.find((l) => l.code === '4-1') ?? ALL_LESSONS.find((l) => l.focusFretRange[0] >= 5);
    assert.ok(lesson4_1, 'Box-position lesson must exist');
    const boxNote = lesson4_1.notes.find((n) => n.fret >= lesson4_1.focusFretRange[0]);
    assert.ok(boxNote);
    const boxMidi = { 1: 64, 2: 59, 3: 55, 4: 50, 5: 45, 6: 40 }[boxNote.string] + boxNote.fret;
    const resBox = resolveFretPositionForContext(boxMidi, {
      lessonNotes: lesson4_1.notes,
      scaleOverlay: lesson4_1.scaleOverlay,
      focusFretRange: lesson4_1.focusFretRange,
      visibleRange: [Math.max(0, lesson4_1.focusFretRange[0] - 1), lesson4_1.focusFretRange[1] + 2],
    });
    assert.ok(resBox.primary.fret >= lesson4_1.focusFretRange[0] - 1);
  });
});
