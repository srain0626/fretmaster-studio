import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  createWorkletHarness,
  loadTsModule,
  synthHarmonicGuitarSignal,
} from './helpers/loadTs.mjs';

const sampleRate = 48000;

describe('Polyphonic Worklet FFT & Chord-Strum Detection', () => {
  const harness = createWorkletHarness(sampleRate);
  const {
    LowLatencyGuitarAudioEngine,
    POLY_SPECTRUM_MIN_MIDI,
    POLY_SPECTRUM_COUNT,
    evaluatePolyphonicChord,
    evaluateNoteHit,
  } = loadTsModule('src/lib/lowLatencyAudioEngine.ts');

  const analyzeSignal = (midis, perMidiWeights = null) => {
    const buf = synthHarmonicGuitarSignal({
      midis,
      sampleRate,
      numSamples: 12288,
      fundamentalGain: 0.22,
      h2Gain: 0.1,
      h3Gain: 0.04,
      perMidiWeights,
    });
    const msgs = harness.feedSignal(buf, 0.5);
    const polyMsgs = msgs.filter(
      (m) => Array.isArray(m.noteSpectrum) && m.noteSpectrum.length === POLY_SPECTRUM_COUNT
    );
    assert.ok(polyMsgs.length > 0, 'Expected worklet messages with populated 45-bin noteSpectrum');
    return polyMsgs[polyMsgs.length - 1];
  };

  test('exports 45-bin noteSpectrum (MIDI 40..84) and 12-bin chroma from AudioWorklet', () => {
    const last = analyzeSignal([48, 55, 60]); // C5 power chord: C3, G3, C4
    assert.equal(POLY_SPECTRUM_MIN_MIDI, 40);
    assert.equal(POLY_SPECTRUM_COUNT, 45);
    assert.equal(last.chroma.length, 12);
    assert.ok(last.noteSpectrum[48 - POLY_SPECTRUM_MIN_MIDI] >= 22, 'Expected C3 peak in noteSpectrum');
    assert.ok(last.noteSpectrum[55 - POLY_SPECTRUM_MIN_MIDI] >= 22, 'Expected G3 peak in noteSpectrum');
    assert.ok(last.noteSpectrum[60 - POLY_SPECTRUM_MIN_MIDI] >= 22, 'Expected C4 peak in noteSpectrum');
  });

  test('rejects single bass E2 note against E5 power chord (no false 3rd-harmonic spoof)', () => {
    const e5Target = {
      id: 'e5-test',
      string: 6,
      fret: 0,
      finger: 0,
      beatStart: 0,
      durationBeats: 2,
      chordNotes: [
        { string: 6, fret: 0, finger: 0 }, // 40 E2
        { string: 5, fret: 2, finger: 2 }, // 47 B2
        { string: 4, fret: 2, finger: 3 }, // 52 E3
      ],
    };

    const singleE2 = analyzeSignal([40]);
    const polyEval = evaluatePolyphonicChord(
      e5Target.chordNotes,
      singleE2.noteSpectrum,
      singleE2.chroma,
      'standard'
    );
    assert.equal(polyEval.passed, false, 'Single E2 note must not pass E5 power chord');

    const detectedMidi = singleE2.frequency > 0 ? 69 + 12 * Math.log2(singleE2.frequency / 440) : 0;
    const hit = evaluateNoteHit(e5Target, detectedMidi, 0, 'standard', 0, {
      noteSpectrum: singleE2.noteSpectrum,
      chroma: singleE2.chroma,
      source: 'worklet',
    });
    assert.equal(hit.result, 'miss', 'evaluateNoteHit must mark single open E2 as miss for E5 strum');
  });

  test('passes E5, A5, F5, and C5 power chord strums across worklet FFT + evaluateNoteHit', () => {
    const shapes = [
      {
        name: 'E5',
        midis: [40, 47, 52],
        chordNotes: [
          { string: 6, fret: 0, finger: 0 },
          { string: 5, fret: 2, finger: 2 },
          { string: 4, fret: 2, finger: 3 },
        ],
      },
      {
        name: 'A5',
        midis: [45, 52, 57],
        chordNotes: [
          { string: 5, fret: 0, finger: 0 },
          { string: 4, fret: 2, finger: 2 },
          { string: 3, fret: 2, finger: 3 },
        ],
      },
      {
        name: 'F5',
        midis: [41, 48, 53],
        chordNotes: [
          { string: 6, fret: 1, finger: 1 },
          { string: 5, fret: 3, finger: 3 },
          { string: 4, fret: 3, finger: 4 },
        ],
      },
      {
        name: 'C5',
        midis: [48, 55, 60],
        chordNotes: [
          { string: 5, fret: 3, finger: 1 },
          { string: 4, fret: 5, finger: 3 },
          { string: 3, fret: 5, finger: 4 },
        ],
      },
    ];

    for (const shape of shapes) {
      const frame = analyzeSignal(shape.midis);
      const polyRes = evaluatePolyphonicChord(
        shape.chordNotes,
        frame.noteSpectrum,
        frame.chroma,
        'standard'
      );
      assert.equal(polyRes.passed, true, `${shape.name} strum should pass evaluatePolyphonicChord`);
      assert.ok(polyRes.matchRatio >= 0.66, `Expected matchRatio >= 0.66, got ${polyRes.matchRatio}`);
      assert.ok(polyRes.matchedNotes >= 2);

      const noteTarget = {
        id: `pc-${shape.name}`,
        string: shape.chordNotes[0].string,
        fret: shape.chordNotes[0].fret,
        finger: shape.chordNotes[0].finger,
        beatStart: 0,
        durationBeats: 2,
        chordNotes: shape.chordNotes,
      };
      const detectedMidi = frame.frequency > 0 ? 69 + 12 * Math.log2(frame.frequency / 440) : 0;
      const hit = evaluateNoteHit(noteTarget, detectedMidi, 0, 'standard', 0, {
        noteSpectrum: frame.noteSpectrum,
        chroma: frame.chroma,
        source: 'worklet',
      });
      assert.notEqual(hit.result, 'miss', `${shape.name} strum must pass evaluateNoteHit`);
    }
  });

  test('separates Am (minor 3rd) from A Major (major 3rd)', () => {
    const amShape = [
      { string: 5, fret: 0, finger: 0 }, // 45 A2
      { string: 4, fret: 2, finger: 2 }, // 52 E3
      { string: 3, fret: 2, finger: 3 }, // 57 A3
      { string: 2, fret: 1, finger: 1 }, // 60 C4
      { string: 1, fret: 0, finger: 0 }, // 64 E4
    ];
    const aMajorShape = [
      { string: 5, fret: 0, finger: 0 }, // 45 A2
      { string: 4, fret: 2, finger: 2 }, // 52 E3
      { string: 3, fret: 2, finger: 3 }, // 57 A3
      { string: 2, fret: 2, finger: 4 }, // 61 C#4
      { string: 1, fret: 0, finger: 0 }, // 64 E4
    ];

    const amFrame = analyzeSignal([45, 52, 57, 60, 64]);
    const aMajFrame = analyzeSignal([45, 52, 57, 61, 64]);

    const amOnAm = evaluatePolyphonicChord(amShape, amFrame.noteSpectrum, amFrame.chroma, 'standard');
    assert.equal(amOnAm.passed, true);
    assert.equal(amOnAm.wrongThirdDetected, false);

    const amOnAMaj = evaluatePolyphonicChord(aMajorShape, amFrame.noteSpectrum, amFrame.chroma, 'standard');
    assert.equal(amOnAMaj.passed, false, 'Strumming Am against A Major must fail on conflicting 3rd');
    assert.equal(amOnAMaj.wrongThirdDetected, true);

    const aMajOnAMaj = evaluatePolyphonicChord(aMajorShape, aMajFrame.noteSpectrum, aMajFrame.chroma, 'standard');
    assert.equal(aMajOnAMaj.passed, true);
    assert.equal(aMajOnAMaj.wrongThirdDetected, false);

    const aMajOnAm = evaluatePolyphonicChord(amShape, aMajFrame.noteSpectrum, aMajFrame.chroma, 'standard');
    assert.equal(aMajOnAm.passed, false, 'Strumming A Major against Am must fail on conflicting 3rd');
    assert.equal(aMajOnAm.wrongThirdDetected, true);
  });

  test('flags unmuted open 6E bass string warning when strumming C5 (strings 5-4-3)', () => {
    const c5Shape = [
      { string: 5, fret: 3, finger: 1 }, // 48 C3
      { string: 4, fret: 5, finger: 3 }, // 55 G3
      { string: 3, fret: 5, finger: 4 }, // 60 C4
    ];
    // Include strong open 6E (40) bleed alongside C5
    const dirtyC5 = analyzeSignal([40, 48, 55, 60], [1.6, 1.0, 1.0, 1.0]);
    const res = evaluatePolyphonicChord(c5Shape, dirtyC5.noteSpectrum, dirtyC5.chroma, 'standard');
    assert.equal(res.unmutedStringWarning, true, 'Loud unmuted open 6E string must trigger warning on C5');
  });

  test('isolates Lesson 3-1 and neighboring power chords without cross-passing', () => {
    const openMidi = { 6: 40, 5: 45, 4: 50, 3: 55, 2: 59, 1: 64 };
    const chords = {
      A5: [
        { string: 6, fret: 5, finger: 1, intervalLabel: 'R' },
        { string: 5, fret: 7, finger: 3, intervalLabel: '5' },
        { string: 4, fret: 7, finger: 4, intervalLabel: 'R' },
      ],
      F5: [
        { string: 6, fret: 1, finger: 1, intervalLabel: 'R' },
        { string: 5, fret: 3, finger: 3, intervalLabel: '5' },
        { string: 4, fret: 3, finger: 4, intervalLabel: 'R' },
      ],
      C5: [
        { string: 5, fret: 3, finger: 1, intervalLabel: 'R' },
        { string: 4, fret: 5, finger: 3, intervalLabel: '5' },
        { string: 3, fret: 5, finger: 4, intervalLabel: 'R' },
      ],
      G5: [
        { string: 6, fret: 3, finger: 1, intervalLabel: 'R' },
        { string: 5, fret: 5, finger: 3, intervalLabel: '5' },
        { string: 4, fret: 5, finger: 4, intervalLabel: 'R' },
      ],
      E5: [
        { string: 6, fret: 0, finger: 0, intervalLabel: 'R' },
        { string: 5, fret: 2, finger: 2, intervalLabel: '5' },
        { string: 4, fret: 2, finger: 3, intervalLabel: 'R' },
      ],
      Fs5: [
        { string: 6, fret: 2, finger: 1, intervalLabel: 'R' },
        { string: 5, fret: 4, finger: 3, intervalLabel: '5' },
        { string: 4, fret: 4, finger: 4, intervalLabel: 'R' },
      ],
      Bb5: [
        { string: 6, fret: 6, finger: 1, intervalLabel: 'R' },
        { string: 5, fret: 8, finger: 3, intervalLabel: '5' },
        { string: 4, fret: 8, finger: 4, intervalLabel: 'R' },
      ],
      D5: [
        { string: 5, fret: 5, finger: 1, intervalLabel: 'R' },
        { string: 4, fret: 7, finger: 3, intervalLabel: '5' },
        { string: 3, fret: 7, finger: 4, intervalLabel: 'R' },
      ],
      E5_7f: [
        { string: 5, fret: 7, finger: 1, intervalLabel: 'R' },
        { string: 4, fret: 9, finger: 3, intervalLabel: '5' },
        { string: 3, fret: 9, finger: 4, intervalLabel: 'R' },
      ],
    };

    for (const [playedName, playedShape] of Object.entries(chords)) {
      const midis = playedShape.map((cn) => openMidi[cn.string] + cn.fret);
      const frame = analyzeSignal(midis);
      for (const [targetName, targetShape] of Object.entries(chords)) {
        for (const tier of ['relaxed', 'standard']) {
          const polyRes = evaluatePolyphonicChord(
            targetShape,
            frame.noteSpectrum,
            frame.chroma,
            tier
          );
          const noteTarget = {
            id: `iso-${playedName}-${targetName}-${tier}`,
            string: targetShape[0].string,
            fret: targetShape[0].fret,
            finger: targetShape[0].finger,
            beatStart: 0,
            durationBeats: 2,
            chordNotes: targetShape,
          };
          const hit = evaluateNoteHit(noteTarget, 0, 0, tier, 0, {
            noteSpectrum: frame.noteSpectrum,
            chroma: frame.chroma,
            source: 'worklet',
          });
          if (playedName === targetName) {
            assert.equal(polyRes.passed, true, `${playedName} should pass itself on ${tier}`);
            assert.notEqual(hit.result, 'miss', `${playedName} evaluateNoteHit should pass itself on ${tier}`);
          } else {
            assert.equal(
              polyRes.passed,
              false,
              `Playing ${playedName} must NOT pass ${targetName} on ${tier}`
            );
            assert.equal(
              hit.result,
              'miss',
              `Playing ${playedName} must evaluate as miss for ${targetName} on ${tier}`
            );
          }
        }
      }
    }
  });

  test('rejects broadband pick scratch / transient noise burst across power chords', () => {
    const burst = new Float32Array(4096);
    let seed = 1337;
    for (let i = 3840; i < 4096; i++) {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      burst[i] = ((seed / 0xffffffff) - 0.5) * 0.4;
    }
    const msgs = harness.feedSignal(burst, 2.5).filter((m) => Array.isArray(m.noteSpectrum));
    assert.ok(msgs.length > 0);
    const last = msgs[msgs.length - 1];
    const a5Shape = [
      { string: 6, fret: 5, finger: 1, intervalLabel: 'R' },
      { string: 5, fret: 7, finger: 3, intervalLabel: '5' },
      { string: 4, fret: 7, finger: 4, intervalLabel: 'R' },
    ];
    const f5Shape = [
      { string: 6, fret: 1, finger: 1, intervalLabel: 'R' },
      { string: 5, fret: 3, finger: 3, intervalLabel: '5' },
      { string: 4, fret: 3, finger: 4, intervalLabel: 'R' },
    ];
    assert.equal(evaluatePolyphonicChord(a5Shape, last.noteSpectrum, last.chroma, 'relaxed').passed, false);
    assert.equal(evaluatePolyphonicChord(f5Shape, last.noteSpectrum, last.chroma, 'relaxed').passed, false);
  });

  test('isolates Lesson 7-3 high triads (Am, F, C, G) cleanly', () => {
    const openMidi = { 6: 40, 5: 45, 4: 50, 3: 55, 2: 59, 1: 64 };
    const triads = {
      Am: [
        { string: 3, fret: 5, finger: 1, intervalLabel: 'b3' },
        { string: 2, fret: 5, finger: 1, intervalLabel: '5' },
        { string: 1, fret: 5, finger: 1, intervalLabel: 'R' },
      ],
      F: [
        { string: 3, fret: 5, finger: 1, intervalLabel: '5' },
        { string: 2, fret: 6, finger: 2, intervalLabel: 'R' },
        { string: 1, fret: 5, finger: 1, intervalLabel: '3' },
      ],
      C: [
        { string: 3, fret: 5, finger: 1, intervalLabel: 'R' },
        { string: 2, fret: 5, finger: 1, intervalLabel: '3' },
        { string: 1, fret: 8, finger: 4, intervalLabel: 'R' },
      ],
      G: [
        { string: 3, fret: 7, finger: 3, intervalLabel: '5' },
        { string: 2, fret: 8, finger: 4, intervalLabel: 'R' },
        { string: 1, fret: 7, finger: 2, intervalLabel: '3' },
      ],
    };

    for (const [playedName, playedShape] of Object.entries(triads)) {
      const midis = playedShape.map((cn) => openMidi[cn.string] + cn.fret);
      const frame = analyzeSignal(midis);
      for (const [targetName, targetShape] of Object.entries(triads)) {
        const res = evaluatePolyphonicChord(targetShape, frame.noteSpectrum, frame.chroma, 'standard');
        assert.equal(
          res.passed,
          playedName === targetName,
          `Triad ${playedName} against ${targetName} expected ${playedName === targetName}`
        );
      }
    }
  });

  test('settles polyphonic onset for 36ms before emitting chord spectrum and onset', () => {
    const engine = new LowLatencyGuitarAudioEngine();
    const emitted = [];
    engine.subscribe((d) => emitted.push(d));

    const staleSpectrum = new Array(POLY_SPECTRUM_COUNT).fill(0);
    staleSpectrum[40 - POLY_SPECTRUM_MIN_MIDI] = 95;
    staleSpectrum[47 - POLY_SPECTRUM_MIN_MIDI] = 85;
    staleSpectrum[52 - POLY_SPECTRUM_MIN_MIDI] = 100;

    const settledA5 = new Array(POLY_SPECTRUM_COUNT).fill(0);
    settledA5[45 - POLY_SPECTRUM_MIN_MIDI] = 95;
    settledA5[52 - POLY_SPECTRUM_MIN_MIDI] = 80;
    settledA5[57 - POLY_SPECTRUM_MIN_MIDI] = 100;

    let fakeNow = 2000;
    const origNow = performance.now.bind(performance);
    performance.now = () => fakeNow;

    try {
      engine['handleRawAnalysis'](0, -28, true, 0.1, 'worklet', -20, false, undefined, staleSpectrum);
      assert.equal(emitted.filter((e) => e.isActive || e.isOnset).length, 0);

      fakeNow += 20;
      engine['handleRawAnalysis'](0, -26, false, 0.1, 'worklet', -20, false, undefined, staleSpectrum);
      assert.equal(emitted.filter((e) => e.isActive || e.isOnset).length, 0);

      fakeNow += 20;
      engine['handleRawAnalysis'](0, -24, false, 0.1, 'worklet', -18, false, undefined, settledA5);
      const active = emitted.filter((e) => e.isActive);
      assert.equal(active.length, 1);
      assert.equal(active[0].isOnset, true);
      assert.equal(active[0].noteSpectrum[45 - POLY_SPECTRUM_MIN_MIDI], 95);
    } finally {
      performance.now = origNow;
    }
  });
});
