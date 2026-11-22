import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.resolve(__dirname, '../..');

const require = createRequire(path.join(REPO_ROOT, 'package.json'));
const ts = require('typescript');

/**
 * Transpiles and loads a workspace TypeScript module in Node without modifying
 * Next.js/tsconfig settings. Caches modules per loader context so singletons
 * and references behave consistently.
 */
export function loadTsModule(relPath, extraMocks = {}, cache = new Map()) {
  const fullPath = path.resolve(REPO_ROOT, relPath);
  if (cache.has(fullPath)) return cache.get(fullPath);

  const src = fs.readFileSync(fullPath, 'utf8');
  const transpiled = ts.transpileModule(src, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
    fileName: fullPath,
  });

  const mod = { exports: {} };
  cache.set(fullPath, mod.exports);

  const dir = path.dirname(fullPath);
  const localRequire = (spec) => {
    if (Object.prototype.hasOwnProperty.call(extraMocks, spec)) {
      return extraMocks[spec];
    }
    if (spec.startsWith('@/')) {
      const sub = spec.slice(2);
      for (const ext of ['.ts', '.tsx', '.js', '.mjs']) {
        const candidate = path.join(REPO_ROOT, 'src', `${sub}${ext}`);
        if (fs.existsSync(candidate)) {
          return loadTsModule(path.relative(REPO_ROOT, candidate), extraMocks, cache);
        }
      }
    }
    if (spec.startsWith('.')) {
      for (const ext of ['.ts', '.tsx', '.js', '.mjs']) {
        const candidate = path.resolve(dir, `${spec}${ext}`);
        if (fs.existsSync(candidate)) {
          return loadTsModule(path.relative(REPO_ROOT, candidate), extraMocks, cache);
        }
      }
    }
    return require(spec);
  };

  const fn = new Function('require', 'module', 'exports', transpiled.outputText);
  fn(localRequire, mod, mod.exports);
  cache.set(fullPath, mod.exports);
  return mod.exports;
}

/**
 * Loads `public/worklets/guitarPitchWorklet.js` inside a deterministic AudioWorklet
 * sandbox and returns a helper to stream synthetic PCM frames into it.
 */
export function createWorkletHarness(sampleRate = 48000) {
  const workletPath = path.join(REPO_ROOT, 'public/worklets/guitarPitchWorklet.js');
  const code = fs.readFileSync(workletPath, 'utf8');
  let RegisteredCtor = null;
  let simTime = 0;

  class MockAudioWorkletProcessor {
    constructor() {
      this.messages = [];
      this.port = {
        onmessage: null,
        postMessage: (msg) => this.messages.push(msg),
      };
    }
  }

  const sandbox = {
    AudioWorkletProcessor: MockAudioWorkletProcessor,
    registerProcessor: (_name, Ctor) => {
      RegisteredCtor = Ctor;
    },
    sampleRate,
    Float32Array,
    Uint16Array,
    Math,
  };
  Object.defineProperty(sandbox, 'currentTime', {
    get: () => simTime,
  });

  vm.runInNewContext(code, sandbox);
  if (!RegisteredCtor) {
    throw new Error('Expected guitar-pitch-processor to register inside AudioWorklet sandbox');
  }

  const createProcessor = () => new RegisteredCtor();

  const feedProcessor = (proc, samples, startTimeSec = 0) => {
    const quantum = 128;
    simTime = startTimeSec;
    for (let offset = 0; offset + quantum <= samples.length; offset += quantum) {
      const chunk = samples.subarray(offset, offset + quantum);
      proc.process([[chunk]]);
      simTime += quantum / sampleRate;
    }
    return proc.messages;
  };

  const feedSignal = (samples, startTimeSec = 0) => {
    const proc = createProcessor();
    return feedProcessor(proc, samples, startTimeSec);
  };

  return {
    sampleRate,
    createProcessor,
    feedProcessor,
    feedSignal,
    setTime: (t) => {
      simTime = t;
    },
  };
}

export function centsDiff(freq, target) {
  return 1200 * Math.log2(freq / target);
}

export function midiToFreq(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export function synthHarmonicGuitarSignal({
  midis,
  sampleRate = 48000,
  numSamples = 12288,
  dcOffset = 0,
  fundamentalGain = 0.18,
  h2Gain = 0.09,
  h3Gain = 0.03,
  attackSec = 0.008,
  perMidiWeights = null,
}) {
  const buf = new Float32Array(numSamples);
  const scale = midis.length > 0 ? 1 / Math.sqrt(midis.length) : 1;
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const env = attackSec > 0 ? Math.min(1, t / attackSec) : 1;
    let sum = dcOffset;
    for (let k = 0; k < midis.length; k++) {
      const w = perMidiWeights ? (perMidiWeights[k] ?? 1) : 1;
      const f = midiToFreq(midis[k]);
      sum +=
        w *
        scale *
        env *
        (fundamentalGain * Math.sin(2 * Math.PI * f * t) +
          h2Gain * Math.sin(2 * Math.PI * 2 * f * t) +
          h3Gain * Math.sin(2 * Math.PI * 3 * f * t));
    }
    buf[i] = sum;
  }
  return buf;
}
