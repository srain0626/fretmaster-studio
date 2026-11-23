// High-speed 128-sample AudioWorkletProcessor for real-time electric guitar pitch & onset DSP
// Implements YIN (Cumulative Mean Normalized Difference Function) with parabolic interpolation

class GuitarPitchProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.bufferSize = 4096;
    this.hopSize = 256;
    this.ringBuffer = new Float32Array(this.bufferSize);
    this.rawFrame = new Float32Array(this.bufferSize);
    this.yinFrame = new Float32Array(this.bufferSize);
    this.yinBuffer = new Float32Array(this.bufferSize / 2);
    this.writeIndex = 0;
    this.samplesSinceAnalysis = 0;

    // Preallocated 8192-point zero-padded Hann Radix-2 FFT workspace for polyphonic chord analysis
    this.fftSize = 8192;
    this.fftRe = new Float32Array(this.fftSize);
    this.fftIm = new Float32Array(this.fftSize);
    this.hannWindow = new Float32Array(this.bufferSize);
    for (let i = 0; i < this.bufferSize; i++) {
      this.hannWindow[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (this.bufferSize - 1)));
    }
    this.bitRev = new Uint16Array(this.fftSize);
    const logN = Math.round(Math.log2(this.fftSize));
    for (let i = 0; i < this.fftSize; i++) {
      let x = i;
      let rev = 0;
      for (let b = 0; b < logN; b++) {
        rev = (rev << 1) | (x & 1);
        x >>= 1;
      }
      this.bitRev[i] = rev;
    }
    this.cosTable = new Float32Array(this.fftSize / 2);
    this.sinTable = new Float32Array(this.fftSize / 2);
    for (let i = 0; i < this.fftSize / 2; i++) {
      const ang = (-2 * Math.PI * i) / this.fftSize;
      this.cosTable[i] = Math.cos(ang);
      this.sinTable[i] = Math.sin(ang);
    }
    this.polyHopCounter = 0;
    this.fftMag = new Float32Array(1024);
    this.peakFreqs = new Float32Array(256);
    this.peakMags = new Float32Array(256);
    this.lastChroma = new Array(12).fill(0);
    this.lastNoteSpectrum = new Array(45).fill(0);

    // Dynamics & onset state
    this.noiseGateDb = -58;
    this.inputGainLinear = 1.0;
    this.hopPeak = 0;
    this.hopRawPeak = 0;
    this.prevRms = 0;
    this.prevHighEnergy = 0;
    this.lastOnsetTime = -1;
    this.channelMode = 'mono'; // 'ch1' | 'ch2' | 'mono'

    this.port.onmessage = (event) => {
      const msg = event.data;
      if (!msg || typeof msg !== 'object') return;
      if (typeof msg.noiseGateDb === 'number') {
        this.noiseGateDb = msg.noiseGateDb;
      }
      if (typeof msg.inputGainDb === 'number') {
        const clampedDb = Math.max(-18, Math.min(18, msg.inputGainDb));
        this.inputGainLinear = Math.pow(10, clampedDb / 20);
      }
      if (typeof msg.channelMode === 'string') {
        this.channelMode = msg.channelMode;
      }
    };
  }

  process(inputs) {
    const input = inputs[0];
    if (!input || input.length === 0) return true;

    const ch0 = input[0];
    const ch1 = input.length > 1 ? input[1] : null;
    if (!ch0) return true;

    const len = ch0.length;
    for (let i = 0; i < len; i++) {
      let sample = ch0[i];
      if (this.channelMode === 'ch2' && ch1) {
        sample = ch1[i];
      } else if (this.channelMode === 'mono' && ch1) {
        sample = (ch0[i] + ch1[i]) * 0.5;
      }

      const absRaw = Math.abs(sample);
      if (absRaw > this.hopRawPeak) this.hopRawPeak = absRaw;

      const gained = sample * this.inputGainLinear;
      const absGained = Math.abs(gained);
      if (absGained > this.hopPeak) this.hopPeak = absGained;

      this.ringBuffer[this.writeIndex] = gained;
      this.writeIndex = (this.writeIndex + 1) % this.bufferSize;
      this.samplesSinceAnalysis++;
    }

    if (this.samplesSinceAnalysis >= this.hopSize) {
      this.samplesSinceAnalysis = 0;
      this.analyze();
    }

    return true;
  }

  analyze() {
    // Reorder ring buffer into contiguous frame & measure raw energy / pick transient
    const frame = this.rawFrame;
    let idx = this.writeIndex;
    let sum = 0;
    let sumSq = 0;
    let highEnergy = 0;
    let prev = 0;

    for (let i = 0; i < this.bufferSize; i++) {
      const s = this.ringBuffer[idx];
      frame[i] = s;
      sum += s;
      sumSq += s * s;
      const diff = s - prev;
      highEnergy += diff * diff;
      prev = s;
      idx = (idx + 1) % this.bufferSize;
    }

    const mean = sum / this.bufferSize;
    const rms = Math.sqrt(sumSq / this.bufferSize);
    const rmsDb = rms > 1e-7 ? 20 * Math.log10(rms) : -100;
    const peak = this.hopPeak;
    const rawPeak = this.hopRawPeak;
    this.hopPeak = 0;
    this.hopRawPeak = 0;
    const peakDb = peak > 1e-6 ? Math.min(0, 20 * Math.log10(peak)) : -100;
    const isClipping = rawPeak >= 0.97 || peak >= 0.98;
    const normHighEnergy = Math.sqrt(highEnergy / this.bufferSize);

    // Onset detection via RMS jump and high-frequency pick transient delta
    const nowSec = currentTime;
    const gateLinear = Math.pow(10, this.noiseGateDb / 20);
    const rmsRatio = this.prevRms > 1e-5 ? rms / this.prevRms : 10;
    const highRatio = this.prevHighEnergy > 1e-5 ? normHighEnergy / this.prevHighEnergy : 10;

    let isOnset = false;
    if (
      rms > gateLinear * 1.3 &&
      nowSec - this.lastOnsetTime > 0.055 &&
      ((rmsRatio > 1.45 && rms - this.prevRms > 0.003) ||
        (highRatio > 2.0 && rms > gateLinear * 1.5))
    ) {
      isOnset = true;
      this.lastOnsetTime = nowSec;
    }

    this.prevRms = this.prevRms * 0.6 + rms * 0.4;
    this.prevHighEnergy = this.prevHighEnergy * 0.6 + normHighEnergy * 0.4;

    if (rmsDb < this.noiseGateDb) {
      this.port.postMessage({
        frequency: 0,
        rmsDb,
        peakDb,
        isClipping,
        isOnset: false,
        clarity: 0,
        sampleTime: nowSec,
      });
      return;
    }

    // DC offset removal + 1-pole LPF (~1400 Hz) to suppress pick scratch & aliasing
    const sr = sampleRate;
    const polyTick = this.polyHopCounter++;
    if (isOnset || polyTick % 2 === 0) {
      this.computePolyphonicSpectrum(frame, mean, sr);
    }
    const yinFrame = this.yinFrame;
    const lpfAlpha = (2 * Math.PI * 1400) / (sr + 2 * Math.PI * 1400);
    let lpfState = 0;
    for (let i = 0; i < this.bufferSize; i++) {
      lpfState += lpfAlpha * (frame[i] - mean - lpfState);
      yinFrame[i] = lpfState;
    }

    // YIN Pitch Detection across 65Hz ~ 1450Hz
    const minTau = Math.max(2, Math.floor(sr / 1450));
    const windowLimit = this.bufferSize / 2;
    const maxTau = Math.min(windowLimit - 2, Math.ceil(sr / 65));
    const yin = this.yinBuffer;
    yin[0] = 1;

    let runningSum = 0;
    for (let tau = 1; tau <= maxTau; tau++) {
      let deltaSum = 0;
      for (let j = 0; j < windowLimit; j++) {
        const d = yinFrame[j] - yinFrame[j + tau];
        deltaSum += d * d;
      }
      runningSum += deltaSum;
      yin[tau] = runningSum > 0 ? (deltaSum * tau) / runningSum : 1;
    }

    // Absolute threshold search
    const threshold = 0.18;
    let tauEstimate = -1;
    for (let tau = minTau; tau < maxTau; tau++) {
      if (yin[tau] < threshold) {
        while (tau + 1 < maxTau && yin[tau + 1] < yin[tau]) {
          tau++;
        }
        tauEstimate = tau;
        break;
      }
    }

    // Fallback to global minimum if slightly noisy / saturated
    if (tauEstimate === -1) {
      let minVal = 1;
      let bestTau = -1;
      for (let tau = minTau; tau < maxTau; tau++) {
        if (yin[tau] < minVal) {
          minVal = yin[tau];
          bestTau = tau;
        }
      }
      if (minVal < 0.34) {
        tauEstimate = bestTau;
      }
    }

    // Subharmonic guard: prefer true 2*tau fundamental on wound low strings
    // only when the candidate dip at tauEstimate is ambiguous (>= 0.05) and 2*tau is decisively cleaner.
    if (tauEstimate !== -1 && yin[tauEstimate] >= 0.05 && tauEstimate * 2 < maxTau - 3) {
      const doubleCenter = tauEstimate * 2;
      let bestDoubleTau = doubleCenter;
      let bestDoubleVal = yin[doubleCenter];
      for (let t = Math.max(minTau, doubleCenter - 3); t <= Math.min(maxTau - 1, doubleCenter + 3); t++) {
        if (yin[t] < bestDoubleVal) {
          bestDoubleVal = yin[t];
          bestDoubleTau = t;
        }
      }
      while (bestDoubleTau + 1 < maxTau && yin[bestDoubleTau + 1] < yin[bestDoubleTau]) {
        bestDoubleTau++;
        bestDoubleVal = yin[bestDoubleTau];
      }
      if (
        bestDoubleVal < 0.12 &&
        bestDoubleVal < yin[tauEstimate] * 0.55 &&
        yin[tauEstimate] - bestDoubleVal >= 0.04
      ) {
        tauEstimate = bestDoubleTau;
      }
    }

    if (tauEstimate === -1 || tauEstimate <= minTau || tauEstimate >= maxTau) {
      this.port.postMessage({
        frequency: 0,
        rmsDb,
        peakDb,
        isClipping,
        isOnset,
        clarity: 0,
        sampleTime: nowSec,
        chroma: this.lastChroma,
        noteSpectrum: this.lastNoteSpectrum,
      });
      return;
    }

    // Parabolic interpolation for sub-sample precision
    const s0 = yin[tauEstimate - 1];
    const s1 = yin[tauEstimate];
    const s2 = yin[tauEstimate + 1];
    const denom = 2 * (2 * s1 - s2 - s0);
    let betterTau = tauEstimate;
    if (Math.abs(denom) > 1e-6) {
      betterTau += (s2 - s0) / denom;
    }

    const frequency = sr / betterTau;
    const clarity = Math.max(0, Math.min(1, 1 - s1));

    this.port.postMessage({
      frequency: frequency >= 65 && frequency <= 1450 ? frequency : 0,
      rmsDb,
      peakDb,
      isClipping,
      isOnset,
      clarity,
      sampleTime: nowSec,
      chroma: this.lastChroma,
      noteSpectrum: this.lastNoteSpectrum,
    });
  }

  computePolyphonicSpectrum(frame, mean, sr) {
    const N = this.fftSize;
    const re = this.fftRe;
    const im = this.fftIm;
    const win = this.hannWindow;
    const bitRev = this.bitRev;
    const cosT = this.cosTable;
    const sinT = this.sinTable;

    re.fill(0);
    im.fill(0);
    for (let i = 0; i < this.bufferSize; i++) {
      re[bitRev[i]] = (frame[i] - mean) * win[i];
    }

    // Iterative Cooley-Tukey Radix-2 FFT
    for (let size = 2; size <= N; size <<= 1) {
      const half = size >> 1;
      const tableStep = N / size;
      for (let i = 0; i < N; i += size) {
        for (let j = 0, k = 0; j < half; j++, k += tableStep) {
          const evenIdx = i + j;
          const oddIdx = evenIdx + half;
          const tRe = re[oddIdx] * cosT[k] - im[oddIdx] * sinT[k];
          const tIm = re[oddIdx] * sinT[k] + im[oddIdx] * cosT[k];
          re[oddIdx] = re[evenIdx] - tRe;
          im[oddIdx] = im[evenIdx] - tIm;
          re[evenIdx] += tRe;
          im[evenIdx] += tIm;
        }
      }
    }

    const binHz = sr / N;
    const halfBins = N >> 1;
    const specOut = this.lastNoteSpectrum;
    const chromaOut = this.lastChroma;
    const minBin = Math.max(2, Math.floor(70 / binHz));
    const maxBin = Math.min(halfBins - 2, Math.min(1022, Math.ceil(3000 / binHz)));
    const bandMaxBin = Math.min(maxBin, Math.ceil(1500 / binHz));
    const mag = this.fftMag;

    let sumMag = 0;
    let cntMag = 0;
    let maxMag = 0;
    for (let k = minBin - 1; k <= maxBin + 1; k++) {
      const m = Math.hypot(re[k], im[k]);
      mag[k] = m;
      if (k >= minBin && k <= bandMaxBin) {
        sumMag += m;
        cntMag++;
      }
      if (m > maxMag) maxMag = m;
    }

    const crest = cntMag > 0 && sumMag > 1e-9 ? maxMag / (sumMag / cntMag) : 0;
    const tonalWeight = crest <= 3.2 ? 0 : Math.min(1, (crest - 3.2) / 1.6);
    if (tonalWeight <= 0 || maxMag < 1e-6) {
      specOut.fill(0);
      chromaOut.fill(0);
      return;
    }

    const peakFreqs = this.peakFreqs;
    const peakMags = this.peakMags;
    let peakCount = 0;
    const minPeakMag = maxMag * 0.04;
    for (let k = minBin; k <= maxBin && peakCount < 256; k++) {
      const m0 = mag[k - 1];
      const m1 = mag[k];
      const m2 = mag[k + 1];
      if (m1 >= m0 && m1 >= m2 && m1 >= minPeakMag) {
        const denom = m0 - 2 * m1 + m2;
        const delta =
          Math.abs(denom) > 1e-9
            ? Math.max(-0.5, Math.min(0.5, (0.5 * (m0 - m2)) / denom))
            : 0;
        peakFreqs[peakCount] = (k + delta) * binHz;
        peakMags[peakCount] = m1 - 0.25 * (m0 - m2) * delta;
        peakCount++;
      }
    }

    const peakAtFreq = (targetFreq, maxCents) => {
      let best = 0;
      for (let p = 0; p < peakCount; p++) {
        const cents = 1200 * Math.abs(Math.log2(peakFreqs[p] / targetFreq));
        if (cents <= maxCents) {
          const ratio = cents / maxCents;
          const w = 1 - 0.55 * ratio * ratio;
          const val = peakMags[p] * w;
          if (val > best) best = val;
        }
      }
      return best;
    };

    const rawEnergies = new Float32Array(45);
    const rawChroma = new Float32Array(12);
    let maxEnergy = 0;

    for (let idx = 0; idx < 45; idx++) {
      const midi = 40 + idx;
      const f1 = 440 * Math.pow(2, (midi - 69) / 12);
      const m1 = peakAtFreq(f1, 54);
      const m2 = f1 * 2 < 2900 ? peakAtFreq(f1 * 2, 48) : 0;
      const harmonicCap = midi <= 49 ? 4.0 : 2.5;
      const energy =
        (m1 > 0 ? 0.58 * m1 + 0.42 * Math.min(m2, m1 * harmonicCap) : 0) * tonalWeight;
      rawEnergies[idx] = energy;
      if (energy > maxEnergy) maxEnergy = energy;
      rawChroma[midi % 12] += energy;
    }

    if (maxEnergy <= 1e-6) {
      specOut.fill(0);
      chromaOut.fill(0);
      return;
    }

    let maxChroma = 1e-6;
    for (let c = 0; c < 12; c++) {
      if (rawChroma[c] > maxChroma) maxChroma = rawChroma[c];
    }

    for (let idx = 0; idx < 45; idx++) {
      specOut[idx] = Math.round((rawEnergies[idx] / maxEnergy) * 100);
    }
    for (let c = 0; c < 12; c++) {
      chromaOut[c] = Number((rawChroma[c] / maxChroma).toFixed(3));
    }
  }
}

registerProcessor('guitar-pitch-processor', GuitarPitchProcessor);
