/**
 * KaldiFbank.js
 * Kaldi-compatible log Mel filterbank features (port of kaldi-native-fbank ComputeFbank).
 * Matches the front-end the sherpa-onnx zipformer CTC models were trained with, so the
 * browser feeds the network exactly the features it expects.
 */

/** Feature options of sherpa-onnx offline zipformer CTC models. */
export const FBANK_OPTIONS = Object.freeze({
  SAMPLE_RATE: 16000,
  FRAME_LENGTH_MS: 25,
  FRAME_SHIFT_MS: 10,
  NUM_MEL_BINS: 80,
  LOW_FREQ_HZ: 20,
  /** Negative value is an offset from Nyquist (Kaldi convention): 8000 - 400 = 7600 Hz. */
  HIGH_FREQ_OFFSET_HZ: -400,
  PREEMPH_COEFF: 0.97,
  POVEY_WINDOW_POWER: 0.85,
  /** Kaldi mel scale: mel = MEL_SCALE * ln(1 + hz / MEL_BREAK_HZ). */
  MEL_SCALE: 1127.0,
  MEL_BREAK_HZ: 700.0,
  /** Log floor used by Kaldi (std::numeric_limits<float>::epsilon()). */
  LOG_FLOOR: 1.1920928955078125e-7,
});

const MS_PER_SECOND = 1000;

function melScale(hz) {
  return FBANK_OPTIONS.MEL_SCALE * Math.log(1 + hz / FBANK_OPTIONS.MEL_BREAK_HZ);
}

function nextPowerOfTwo(n) {
  let p = 1;
  while (p < n) p <<= 1;
  return p;
}

let cachedSetup = null;

/** Builds (once) the window, FFT size and triangular mel weights. */
function getSetup() {
  if (cachedSetup) return cachedSetup;
  const sr = FBANK_OPTIONS.SAMPLE_RATE;
  const frameLength = Math.round((sr * FBANK_OPTIONS.FRAME_LENGTH_MS) / MS_PER_SECOND);
  const frameShift = Math.round((sr * FBANK_OPTIONS.FRAME_SHIFT_MS) / MS_PER_SECOND);
  const nFft = nextPowerOfTwo(frameLength);
  const numFftBins = nFft / 2;

  const window = new Float64Array(frameLength);
  const a = (2 * Math.PI) / (frameLength - 1);
  for (let i = 0; i < frameLength; i++) {
    window[i] = Math.pow(0.5 - 0.5 * Math.cos(a * i), FBANK_OPTIONS.POVEY_WINDOW_POWER);
  }

  const nyquist = sr / 2;
  const highFreq = nyquist + FBANK_OPTIONS.HIGH_FREQ_OFFSET_HZ;
  const melLow = melScale(FBANK_OPTIONS.LOW_FREQ_HZ);
  const melHigh = melScale(highFreq);
  const numBins = FBANK_OPTIONS.NUM_MEL_BINS;
  const melDelta = (melHigh - melLow) / (numBins + 1);
  const fftBinWidth = sr / nFft;

  // Sparse triangles: { start, weights } per mel bin.
  const banks = [];
  for (let b = 0; b < numBins; b++) {
    const left = melLow + b * melDelta;
    const center = melLow + (b + 1) * melDelta;
    const right = melLow + (b + 2) * melDelta;
    let start = -1;
    const weights = [];
    for (let i = 0; i < numFftBins; i++) {
      const mel = melScale(fftBinWidth * i);
      if (mel > left && mel < right) {
        if (start < 0) start = i;
        weights.push(mel <= center ? (mel - left) / (center - left) : (right - mel) / (right - center));
      }
    }
    banks.push({ start: Math.max(0, start), weights: Float64Array.from(weights) });
  }

  cachedSetup = { frameLength, frameShift, nFft, window, banks };
  return cachedSetup;
}

/** In-place iterative radix-2 FFT. */
function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wRe = Math.cos(ang);
    const wIm = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let curRe = 1;
      let curIm = 0;
      for (let k = 0; k < len / 2; k++) {
        const aRe = re[i + k];
        const aIm = im[i + k];
        const bRe = re[i + k + len / 2] * curRe - im[i + k + len / 2] * curIm;
        const bIm = re[i + k + len / 2] * curIm + im[i + k + len / 2] * curRe;
        re[i + k] = aRe + bRe;
        im[i + k] = aIm + bIm;
        re[i + k + len / 2] = aRe - bRe;
        im[i + k + len / 2] = aIm - bIm;
        const nextRe = curRe * wRe - curIm * wIm;
        curIm = curRe * wIm + curIm * wRe;
        curRe = nextRe;
      }
    }
  }
}

/** Kaldi snip_edges=false frame count. */
export function numFbankFrames(numSamples) {
  const { frameShift } = getSetup();
  return Math.floor((numSamples + frameShift / 2) / frameShift);
}

/**
 * Computes Kaldi fbank features.
 * @param {Float32Array} samples Mono 16 kHz PCM in [-1, 1]
 * @returns {Float32Array[]} One Float32Array(80) per 10 ms frame
 */
export function computeKaldiFbank(samples) {
  const { frameLength, frameShift, nFft, window, banks } = getSetup();
  const n = samples.length;
  const numFrames = numFbankFrames(n);
  const frames = [];
  const re = new Float64Array(nFft);
  const im = new Float64Array(nFft);

  for (let f = 0; f < numFrames; f++) {
    // snip_edges=false: frame centered on f*shift + shift/2, edges mirrored.
    const start = f * frameShift + frameShift / 2 - frameLength / 2;
    re.fill(0);
    im.fill(0);
    let mean = 0;
    for (let i = 0; i < frameLength; i++) {
      let s = start + i;
      if (s < 0) s = -s - 1;
      else if (s >= n) s = 2 * n - 1 - s;
      re[i] = samples[s];
      mean += re[i];
    }
    mean /= frameLength;
    for (let i = 0; i < frameLength; i++) re[i] -= mean;
    for (let i = frameLength - 1; i > 0; i--) re[i] -= FBANK_OPTIONS.PREEMPH_COEFF * re[i - 1];
    re[0] -= FBANK_OPTIONS.PREEMPH_COEFF * re[0];
    for (let i = 0; i < frameLength; i++) re[i] *= window[i];

    fft(re, im);

    const out = new Float32Array(banks.length);
    for (let b = 0; b < banks.length; b++) {
      const { start: s0, weights } = banks[b];
      let energy = 0;
      for (let k = 0; k < weights.length; k++) {
        const idx = s0 + k;
        energy += weights[k] * (re[idx] * re[idx] + im[idx] * im[idx]);
      }
      out[b] = Math.log(Math.max(energy, FBANK_OPTIONS.LOG_FLOOR));
    }
    frames.push(out);
  }
  return frames;
}
