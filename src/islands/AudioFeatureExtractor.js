/**
 * AudioFeatureExtractor.js
 * 100% Client-side 80-channel Log-Mel Spectrogram Extractor for 16kHz Speech.
 * Standard acoustic frontend matching PyTorch / Kaldi / torchaudio fbank.
 */

const SAMPLE_RATE = 16000;
const N_FFT = 512;
const WIN_LENGTH = 400; // 25ms
const HOP_LENGTH = 160; // 10ms
const N_MELS = 80;
const F_MIN = 50.0;
const F_MAX = 7600.0;

/**
 * Converts frequency in Hz to Mel scale.
 */
function hzToMel(hz) {
  return 2595.0 * Math.log10(1.0 + hz / 700.0);
}

/**
 * Converts Mel scale to frequency in Hz.
 */
function melToHz(mel) {
  return 700.0 * (Math.pow(10.0, mel / 2595.0) - 1.0);
}

/**
 * Pre-computes triangular Mel Filterbank matrix [N_MELS, N_FFT / 2 + 1].
 */
function createMelFilterbank(numMels, nFft, sampleRate, fMin, fMax) {
  const numFreqBins = Math.floor(nFft / 2) + 1;
  const minMel = hzToMel(fMin);
  const maxMel = hzToMel(fMax);
  const melPoints = new Float32Array(numMels + 2);
  for (let i = 0; i < numMels + 2; i++) {
    melPoints[i] = minMel + (i / (numMels + 1)) * (maxMel - minMel);
  }

  const hzPoints = new Float32Array(numMels + 2);
  const binPoints = new Int32Array(numMels + 2);
  for (let i = 0; i < numMels + 2; i++) {
    hzPoints[i] = melToHz(melPoints[i]);
    binPoints[i] = Math.floor(((nFft + 1) * hzPoints[i]) / sampleRate);
  }

  const fbank = Array.from({ length: numMels }, () => new Float32Array(numFreqBins));
  for (let m = 1; m <= numMels; m++) {
    const left = binPoints[m - 1];
    const center = binPoints[m];
    const right = binPoints[m + 1];

    for (let k = left; k < center; k++) {
      if (center > left) {
        fbank[m - 1][k] = (k - left) / (center - left);
      }
    }
    for (let k = center; k < right; k++) {
      if (right > center) {
        fbank[m - 1][k] = (right - k) / (right - center);
      }
    }
  }

  return fbank;
}

// Cached filterbank
let cachedFbank = null;
function getMelFilterbank() {
  if (!cachedFbank) {
    cachedFbank = createMelFilterbank(N_MELS, N_FFT, SAMPLE_RATE, F_MIN, F_MAX);
  }
  return cachedFbank;
}

/**
 * Creates a Hanning window.
 */
function createHanningWindow(length) {
  const win = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    win[i] = 0.5 * (1.0 - Math.cos((2.0 * Math.PI * i) / (length - 1)));
  }
  return win;
}

let cachedWindow = null;
function getHanningWindow() {
  if (!cachedWindow) {
    cachedWindow = createHanningWindow(WIN_LENGTH);
  }
  return cachedWindow;
}

/**
 * Computes Real-valued Fast Fourier Transform (FFT) magnitude spectrum.
 */
function computeMagnitudeFft(frame, window, nFft) {
  const numBins = Math.floor(nFft / 2) + 1;
  const real = new Float32Array(nFft);
  const imag = new Float32Array(nFft);

  for (let i = 0; i < frame.length; i++) {
    real[i] = frame[i] * window[i];
  }

  // Bit-reversal and Cooley-Tukey Radix-2 FFT
  let j = 0;
  for (let i = 0; i < nFft - 1; i++) {
    if (i < j) {
      const tempR = real[i];
      real[i] = real[j];
      real[j] = tempR;
    }
    let k = nFft >> 1;
    while (k <= j) {
      j -= k;
      k >>= 1;
    }
    j += k;
  }

  for (let len = 2; len <= nFft; len <<= 1) {
    const halfLen = len >> 1;
    const angle = (-2.0 * Math.PI) / len;
    const wStepR = Math.cos(angle);
    const wStepI = Math.sin(angle);

    for (let i = 0; i < nFft; i += len) {
      let wR = 1.0;
      let wI = 0.0;
      for (let k = 0; k < halfLen; k++) {
        const uR = real[i + k];
        const uI = imag[i + k];
        const vR = real[i + k + halfLen] * wR - imag[i + k + halfLen] * wI;
        const vI = real[i + k + halfLen] * wI + imag[i + k + halfLen] * wR;

        real[i + k] = uR + vR;
        imag[i + k] = uI + vI;
        real[i + k + halfLen] = uR - vR;
        imag[i + k + halfLen] = uI - vI;

        const nextWR = wR * wStepR - wI * wStepI;
        wI = wR * wStepI + wI * wStepR;
        wR = nextWR;
      }
    }
  }

  // Energy spectrum
  const power = new Float32Array(numBins);
  for (let k = 0; k < numBins; k++) {
    power[k] = real[k] * real[k] + imag[k] * imag[k];
  }
  return power;
}

/**
 * Extracts 80-dimensional Log-Mel spectrogram from Float32 PCM audio (16kHz).
 *
 * @param {Float32Array} pcm16k Audio samples at 16kHz
 * @returns {Array<Float32Array>} Array of frames, each containing 80 float mel values
 */
export function extractLogMelSpectrogram(pcm16k) {
  if (!pcm16k || pcm16k.length < WIN_LENGTH) {
    return [];
  }

  // 1. Pre-emphasis filter: y[t] = x[t] - 0.97 * x[t-1]
  const preEmphasized = new Float32Array(pcm16k.length);
  preEmphasized[0] = pcm16k[0];
  for (let i = 1; i < pcm16k.length; i++) {
    preEmphasized[i] = pcm16k[i] - 0.97 * pcm16k[i - 1];
  }

  const window = getHanningWindow();
  const fbank = getMelFilterbank();
  const numFrames = Math.floor((preEmphasized.length - WIN_LENGTH) / HOP_LENGTH) + 1;
  const melFrames = [];

  for (let f = 0; f < numFrames; f++) {
    const offset = f * HOP_LENGTH;
    const slice = preEmphasized.subarray(offset, offset + WIN_LENGTH);
    const power = computeMagnitudeFft(slice, window, N_FFT);

    const mel = new Float32Array(N_MELS);
    for (let m = 0; m < N_MELS; m++) {
      let energy = 0;
      const bank = fbank[m];
      for (let k = 0; k < power.length; k++) {
        energy += power[k] * bank[k];
      }
      mel[m] = Math.log(Math.max(1e-5, energy));
    }
    melFrames.push(mel);
  }

  return melFrames;
}

/**
 * Flattens array of mel frames into a contiguous Float32Array for ONNX Tensor input:
 * Shape: [1, numFrames, 80].
 */
export function melFramesToFlatTensor(melFrames) {
  const numFrames = melFrames.length;
  const flat = new Float32Array(numFrames * N_MELS);
  for (let f = 0; f < numFrames; f++) {
    flat.set(melFrames[f], f * N_MELS);
  }
  return { data: flat, shape: [1, numFrames, N_MELS] };
}
