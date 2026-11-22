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
});
