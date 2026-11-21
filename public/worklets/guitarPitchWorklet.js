// High-speed 128-sample AudioWorkletProcessor for real-time electric guitar pitch & onset DSP
// Implements YIN (Cumulative Mean Normalized Difference Function) with parabolic interpolation

class GuitarPitchProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.bufferSize = 2048;
    this.hopSize = 256;
    this.ringBuffer = new Float32Array(this.bufferSize);
    this.yinBuffer = new Float32Array(this.bufferSize / 2);
    this.writeIndex = 0;
    this.samplesSinceAnalysis = 0;

    this.noiseGateDb = -52;
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

      this.ringBuffer[this.writeIndex] = sample;
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
    // Reorder ring buffer into contiguous frame
    const frame = new Float32Array(this.bufferSize);
    let idx = this.writeIndex;
    let sumSq = 0;
    let highEnergy = 0;
    let prev = 0;

    for (let i = 0; i < this.bufferSize; i++) {
      const s = this.ringBuffer[idx];
      frame[i] = s;
      sumSq += s * s;
      const diff = s - prev;
      highEnergy += diff * diff;
      prev = s;
      idx = (idx + 1) % this.bufferSize;
    }

    const rms = Math.sqrt(sumSq / this.bufferSize);
    const rmsDb = rms > 1e-7 ? 20 * Math.log10(rms) : -100;
    const normHighEnergy = Math.sqrt(highEnergy / this.bufferSize);

    // Onset detection via RMS jump and high-frequency pick transient delta
    const nowSec = currentTime;
    const gateLinear = Math.pow(10, this.noiseGateDb / 20);
    const rmsRatio = this.prevRms > 1e-5 ? rms / this.prevRms : 10;
    const highRatio = this.prevHighEnergy > 1e-5 ? normHighEnergy / this.prevHighEnergy : 10;

    let isOnset = false;
    if (
      rms > gateLinear * 1.4 &&
      nowSec - this.lastOnsetTime > 0.065 &&
      ((rmsRatio > 1.75 && rms - this.prevRms > 0.008) ||
        (highRatio > 2.4 && rms > gateLinear * 2.0))
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
        isOnset: false,
        clarity: 0,
        sampleTime: nowSec,
      });
      return;
    }

    // YIN Pitch Detection across 70Hz ~ 1300Hz
    const sr = sampleRate;
    const minTau = Math.max(2, Math.floor(sr / 1320));
    const maxTau = Math.min(Math.floor(this.bufferSize / 2) - 2, Math.ceil(sr / 68));
    const yin = this.yinBuffer;
    yin[0] = 1;

    let runningSum = 0;
    for (let tau = 1; tau <= maxTau; tau++) {
      let deltaSum = 0;
      const windowLimit = this.bufferSize / 2;
      for (let j = 0; j < windowLimit; j++) {
        const d = frame[j] - frame[j + tau];
        deltaSum += d * d;
      }
      runningSum += deltaSum;
      yin[tau] = runningSum > 0 ? (deltaSum * tau) / runningSum : 1;
    }

    // Absolute threshold search
    const threshold = 0.16;
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

    // Fallback to global minimum if slightly noisy
    if (tauEstimate === -1) {
      let minVal = 1;
      let bestTau = -1;
      for (let tau = minTau; tau < maxTau; tau++) {
        if (yin[tau] < minVal) {
          minVal = yin[tau];
          bestTau = tau;
        }
      }
      if (minVal < 0.28) {
        tauEstimate = bestTau;
      }
    }

    if (tauEstimate === -1 || tauEstimate <= minTau || tauEstimate >= maxTau) {
      this.port.postMessage({
        frequency: 0,
        rmsDb,
        isOnset,
        clarity: 0,
        sampleTime: nowSec,
      });
      return;
    }

    // Parabolic interpolation for sub-sample precision (±1 cent)
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
      frequency: frequency >= 68 && frequency <= 1320 ? frequency : 0,
      rmsDb,
      isOnset,
      clarity,
      sampleTime: nowSec,
    });
  }
}

registerProcessor('guitar-pitch-processor', GuitarPitchProcessor);
