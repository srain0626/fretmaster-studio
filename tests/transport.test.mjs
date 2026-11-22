import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { loadTsModule } from './helpers/loadTs.mjs';

function makeMockAudioContextClass(mode) {
  return class MockAudioContext {
    constructor() {
      this._createdWall = performance.now();
      this.state = mode === 'suspended' ? 'suspended' : 'running';
      this.destination = {};
    }
    get currentTime() {
      if (mode === 'suspended') return 0;
      return (performance.now() - this._createdWall) / 1000;
    }
    async resume() {
      if (mode !== 'suspended') this.state = 'running';
    }
    createGain() {
      return {
        gain: {
          value: 1,
          setValueAtTime() {},
          exponentialRampToValueAtTime() {},
          linearRampToValueAtTime() {},
        },
        connect() {},
      };
    }
    createBiquadFilter() {
      return {
        type: 'lowpass',
        frequency: { value: 4200, setValueAtTime() {}, exponentialRampToValueAtTime() {} },
        Q: { value: 0.8 },
        connect() {},
      };
    }
    createOscillator() {
      return {
        type: 'sine',
        frequency: {
          value: 440,
          setValueAtTime() {},
          linearRampToValueAtTime() {},
          exponentialRampToValueAtTime() {},
        },
        connect() {},
        start() {},
        stop() {},
      };
    }
    createWaveShaper() {
      return { curve: null, oversample: 'none', connect() {} };
    }
    createBuffer(_ch, len) {
      return { getChannelData: () => new Float32Array(len) };
    }
    createBufferSource() {
      return { buffer: null, connect() {}, start() {}, stop() {} };
    }
  };
}

const sampleNotes = [
  { id: 'n1', string: 6, fret: 0, finger: 0, pick: 'D', beatStart: 0, durationBeats: 1 },
  { id: 'n2', string: 5, fret: 0, finger: 0, pick: 'U', beatStart: 1, durationBeats: 1 },
];
const sampleChords = [
  { barIndex: 0, chordName: 'Em', romanNumeral: 'i', functionLabel: 'Tonic', rootMidi: 40, pitchClasses: [4, 7, 11], suggestedVoicing: [] },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

describe('ElectricGuitarSynthEngine Lookahead Transport Scheduler', () => {
  test('advances beats monotonically, wraps loops with +5 BPM bump, and cancels cleanly on stopTransport', async () => {
    globalThis.window = globalThis;
    globalThis.AudioContext = makeMockAudioContextClass('running');
    const { ElectricGuitarSynthEngine } = loadTsModule('src/lib/guitarSynthEngine.ts');
    const engine = new ElectricGuitarSynthEngine();
    const events = [];

    engine.startTransport({
      bpm: 150,
      notes: sampleNotes,
      chordProgression: sampleChords,
      totalBars: 1,
      beatsPerBar: 2,
      ampPreset: 'clean',
      loopRangeBars: [0, 0],
      enableGuideGuitar: true,
      enableBackingChords: false,
      enableDrumsAndBass: true,
      enableMetronome: true,
      autoSpeedUpBpm: 5,
      onBeatUpdate: (beat, barIdx, loopCount, newBpm) => {
        events.push({ beat, barIdx, loopCount, newBpm });
      },
    });

    await sleep(1050);
    engine.stopTransport();
    const countAtStop = events.length;
    await sleep(250);
    assert.equal(events.length, countAtStop);

    const loop0 = events.filter((e) => e.loopCount === 0);
    const loop1 = events.filter((e) => e.loopCount === 1);
    assert.ok(loop0.length >= 6);
    assert.ok(loop1.length >= 1);

    for (let i = 1; i < loop0.length; i++) {
      assert.ok(loop0[i].beat > loop0[i - 1].beat);
    }

    assert.equal(loop0.some((e) => e.newBpm !== undefined), false);
    assert.equal(loop1[0].beat, 0);
    assert.equal(loop1[0].newBpm, 155);
  });

  test('interpolates continuous sub-millisecond beat position via getExactBeatAt', async () => {
    globalThis.window = globalThis;
    globalThis.AudioContext = makeMockAudioContextClass('running');
    const { ElectricGuitarSynthEngine } = loadTsModule('src/lib/guitarSynthEngine.ts');
    const engine = new ElectricGuitarSynthEngine();

    engine.startTransport({
      bpm: 120,
      notes: sampleNotes,
      chordProgression: sampleChords,
      totalBars: 1,
      beatsPerBar: 4,
      ampPreset: 'clean',
      loopRangeBars: [0, 0],
      enableGuideGuitar: false,
      enableBackingChords: false,
      enableDrumsAndBass: false,
      enableMetronome: false,
    });

    await sleep(280);
    const b1 = engine.getExactBeatAt();
    await sleep(75);
    const b2 = engine.getExactBeatAt();
    engine.stopTransport();

    assert.ok(b2 > b1 + 0.08, `Expected continuous beat advance (b1=${b1}, b2=${b2})`);
    assert.ok(b2 - b1 < 0.4);
  });

  test('falls back to wall-clock timing when AudioContext remains suspended', async () => {
    globalThis.window = globalThis;
    globalThis.AudioContext = makeMockAudioContextClass('suspended');
    const { ElectricGuitarSynthEngine } = loadTsModule('src/lib/guitarSynthEngine.ts');
    const engine = new ElectricGuitarSynthEngine();
    const events = [];

    engine.startTransport({
      bpm: 150,
      notes: sampleNotes,
      chordProgression: sampleChords,
      totalBars: 1,
      beatsPerBar: 2,
      ampPreset: 'clean',
      loopRangeBars: [0, 0],
      enableGuideGuitar: true,
      enableBackingChords: false,
      enableDrumsAndBass: false,
      enableMetronome: true,
      autoSpeedUpBpm: 5,
      onBeatUpdate: (beat, barIdx, loopCount, newBpm) => {
        events.push({ beat, barIdx, loopCount, newBpm });
      },
    });

    await sleep(1050);
    engine.stopTransport();

    const loop0 = events.filter((e) => e.loopCount === 0);
    const loop1 = events.filter((e) => e.loopCount === 1);
    assert.ok(loop0.length >= 6);
    assert.ok(loop0[loop0.length - 1].beat >= 1.5);
    assert.ok(loop1.length >= 1);
    assert.equal(loop1[0].newBpm, 155);
  });

  test('executes 4-beat count-in countdown before Beat 0 in running and suspended modes', async () => {
    for (const ctxMode of ['running', 'suspended']) {
      globalThis.window = globalThis;
      globalThis.AudioContext = makeMockAudioContextClass(ctxMode);
      const { ElectricGuitarSynthEngine } = loadTsModule('src/lib/guitarSynthEngine.ts');
      const engine = new ElectricGuitarSynthEngine();
      const trace = [];

      engine.startTransport({
        bpm: 240,
        notes: sampleNotes,
        chordProgression: sampleChords,
        totalBars: 1,
        beatsPerBar: 4,
        ampPreset: 'clean',
        loopRangeBars: [0, 0],
        enableGuideGuitar: false,
        enableBackingChords: false,
        enableDrumsAndBass: false,
        enableMetronome: true,
        countInBeats: 4,
        onCountInUpdate: (remaining, current, total) => {
          trace.push({ kind: 'countIn', remaining, current, total });
        },
        onBeatUpdate: (beat, barIdx, loopCount) => {
          trace.push({ kind: 'beat', beat, barIdx, loopCount });
        },
      });

      await sleep(1450);
      engine.stopTransport();

      const countIns = trace.filter((e) => e.kind === 'countIn');
      const beats = trace.filter((e) => e.kind === 'beat');
      assert.ok(beats.length >= 2);
      assert.deepEqual(
        countIns.map((c) => [c.remaining, c.current, c.total]),
        [
          [4, 1, 4],
          [3, 2, 4],
          [2, 3, 4],
          [1, 4, 4],
          [0, 4, 4],
        ]
      );

      const lastCountInIdx = trace.findIndex((e) => e.kind === 'countIn' && e.remaining === 0);
      const firstBeatIdx = trace.findIndex((e) => e.kind === 'beat');
      assert.ok(lastCountInIdx !== -1 && lastCountInIdx < firstBeatIdx);
      assert.equal(beats[0].beat, 0);
    }
  });
});
