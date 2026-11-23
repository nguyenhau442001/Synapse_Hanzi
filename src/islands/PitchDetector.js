/**
 * PitchDetector.js
 * Real-time fundamental frequency (F0) detection using the YIN algorithm
 * via Web Audio API, paired with MediaRecorder for audio recording & A/B shadowing.
 */

// Voice frequency bounds for human speech (Mandarin tone detection)
export const MIN_SPEECH_FREQ = 75;   // Hz (filters 50/60Hz electrical hum & mic desk rumble)
export const MAX_SPEECH_FREQ = 480;  // Hz (high female voice peak)
export const YIN_THRESHOLD = 0.15;   // Threshold for unvoiced / voiced confidence
export const RMS_NOISE_FLOOR = 0.0035; // Sensitive noise floor supporting typical speaking distances

/**
 * Calculates Root Mean Square (RMS) amplitude of an audio buffer slice.
 */
export function calculateRms(buffer, start = 0, length = buffer.length) {
  let sum = 0;
  const end = Math.min(buffer.length, start + length);
  const count = end - start;
  if (count <= 0) return 0;
  for (let i = start; i < end; i++) {
    sum += buffer[i] * buffer[i];
  }
  return Math.sqrt(sum / count);
}

/**
 * Extracts a normalized waveform envelope (min, max, rms, amp) across target buckets.
 *
 * @param {Float32Array|number[]} pcmData Raw PCM audio samples
 * @param {number} targetBuckets Number of time buckets (default 120)
 * @returns {Array<{ min: number, max: number, rms: number, amp: number }>}
 */
export function extractWaveformEnvelope(pcmData, targetBuckets = 120) {
  if (!pcmData || pcmData.length === 0 || targetBuckets <= 0) {
    return [];
  }

  const numSamples = pcmData.length;
  const bucketSize = numSamples / targetBuckets;
  const envelope = [];

  let globalPeak = 0.001;

  for (let b = 0; b < targetBuckets; b++) {
    const start = Math.floor(b * bucketSize);
    const end = Math.min(numSamples, Math.floor((b + 1) * bucketSize));

    let min = 0;
    let max = 0;
    let sumSq = 0;
    const count = end - start;

    if (count > 0) {
      for (let i = start; i < end; i++) {
        const val = pcmData[i];
        if (val < min) min = val;
        if (val > max) max = val;
        sumSq += val * val;
      }
      const rms = Math.sqrt(sumSq / count);
      const amp = Math.max(Math.abs(min), Math.abs(max));
      if (amp > globalPeak) globalPeak = amp;
      envelope.push({ min, max, rms, amp });
    } else {
      envelope.push({ min: 0, max: 0, rms: 0, amp: 0 });
    }
  }

  // Normalize by peak amplitude (with headroom) for balanced visualization
  const normFactor = globalPeak > 0.01 ? 1.0 / globalPeak : 1.0;
  return envelope.map((item) => ({
    min: Math.max(-1, Math.min(0, item.min * normFactor)),
    max: Math.max(0, Math.min(1, item.max * normFactor)),
    rms: Math.min(1, item.rms * normFactor),
    amp: Math.min(1, item.amp * normFactor)
  }));
}

// In-memory cache for reference audio waveforms
const referenceWaveformCache = new Map();

/**
 * Fetches an audio file from URL and decodes its waveform envelope.
 *
 * @param {string} audioUrl URL of prebuilt studio audio
 * @param {number} targetBuckets Number of buckets (default 120)
 * @returns {Promise<Array<{ min: number, max: number, rms: number, amp: number }>>}
 */
export async function fetchAndExtractAudioWaveform(audioUrl, targetBuckets = 120) {
  if (!audioUrl) return [];
  const cacheKey = `${audioUrl}_${targetBuckets}`;
  if (referenceWaveformCache.has(cacheKey)) {
    return referenceWaveformCache.get(cacheKey);
  }

  try {
    const response = await fetch(audioUrl);
    if (!response.ok) return [];
    const arrayBuffer = await response.arrayBuffer();

    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return [];
    const ctx = new AudioCtx();
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
    try { await ctx.close(); } catch {}

    const channelData = audioBuffer.getChannelData(0);
    const envelope = extractWaveformEnvelope(channelData, targetBuckets);
    referenceWaveformCache.set(cacheKey, envelope);
    return envelope;
  } catch (err) {
    console.warn('[PitchDetector] fetchAndExtractAudioWaveform error:', err);
    return [];
  }
}

/**
 * Executes the YIN pitch detection algorithm on an audio buffer slice.
 *
 * @param {Float32Array} buffer Audio samples (typically 1024 or 2048 samples)
 * @param {number} sampleRate Audio context sample rate (e.g. 44100 or 48000)
 * @param {number} threshold YIN dip threshold (default 0.15)
 * @returns {{ frequency: number, clarity: number, rms: number }} Detected pitch or 0 if unvoiced
 */
export function detectPitchYin(buffer, sampleRate, threshold = YIN_THRESHOLD) {
  const rms = calculateRms(buffer);
  if (rms < RMS_NOISE_FLOOR) {
    return { frequency: 0, clarity: 0, rms };
  }

  const halfLen = Math.floor(buffer.length / 2);
  const minTau = Math.floor(sampleRate / MAX_SPEECH_FREQ);
  const maxTau = Math.min(halfLen - 1, Math.ceil(sampleRate / MIN_SPEECH_FREQ));

  if (minTau >= maxTau) {
    return { frequency: 0, clarity: 0, rms };
  }

  // Step 1: Difference function
  const diff = new Float32Array(maxTau + 1);
  for (let tau = 1; tau <= maxTau; tau++) {
    let sum = 0;
    for (let j = 0; j < halfLen; j++) {
      const delta = buffer[j] - buffer[j + tau];
      sum += delta * delta;
    }
    diff[tau] = sum;
  }

  // Step 2: Cumulative mean normalized difference function (CMNDF)
  const cmndf = new Float32Array(maxTau + 1);
  cmndf[0] = 1;
  let runningSum = 0;
  for (let tau = 1; tau <= maxTau; tau++) {
    runningSum += diff[tau];
    cmndf[tau] = runningSum > 0 ? (diff[tau] * tau) / runningSum : 1;
  }

  // Step 3: Absolute threshold
  let bestTau = -1;
  for (let tau = minTau; tau <= maxTau; tau++) {
    if (cmndf[tau] < threshold) {
      while (tau + 1 <= maxTau && cmndf[tau + 1] < cmndf[tau]) {
        tau++;
      }
      bestTau = tau;
      break;
    }
  }

  // Fallback: If no dip passed threshold, look for global minimum in valid speech range
  let clarity = 0;
  if (bestTau === -1) {
    let minVal = 1.0;
    let minIdx = -1;
    for (let tau = minTau; tau <= maxTau; tau++) {
      if (cmndf[tau] < minVal) {
        minVal = cmndf[tau];
        minIdx = tau;
      }
    }
    if (minIdx !== -1 && minVal < 0.35) {
      bestTau = minIdx;
      clarity = 1 - minVal;
    } else {
      return { frequency: 0, clarity: 0, rms };
    }
  } else {
    clarity = 1 - Math.min(1, cmndf[bestTau]);
  }

  // Step 4: Parabolic interpolation for sub-sample accuracy
  let refinedTau = bestTau;
  if (bestTau > 1 && bestTau < maxTau) {
    const s0 = cmndf[bestTau - 1];
    const s1 = cmndf[bestTau];
    const s2 = cmndf[bestTau + 1];
    const denom = 2 * (2 * s1 - s0 - s2);
    if (denom !== 0) {
      refinedTau = bestTau + (s2 - s0) / denom;
    }
  }

  const frequency = sampleRate / refinedTau;
  if (frequency < MIN_SPEECH_FREQ || frequency > MAX_SPEECH_FREQ) {
    return { frequency: 0, clarity: 0, rms };
  }

  return { frequency, clarity, rms };
}

/**
 * Extracts pitch contour from an AudioBuffer.
 *
 * @param {AudioBuffer} audioBuffer Audio buffer to analyze
 * @param {number} hopMs Time step in milliseconds between analysis windows
 * @returns {Array<{ time: number, frequency: number, clarity: number, rms: number }>}
 */
export function extractPitchContourFromBuffer(audioBuffer, hopMs = 15) {
  const channelData = audioBuffer.getChannelData(0);
  const sampleRate = audioBuffer.sampleRate;
  const windowSize = 2048;
  const hopSize = Math.floor((sampleRate * hopMs) / 1000);
  const totalSamples = channelData.length;

  const points = [];
  for (let offset = 0; offset + windowSize <= totalSamples; offset += hopSize) {
    const slice = channelData.subarray(offset, offset + windowSize);
    const time = offset / sampleRate;
    const res = detectPitchYin(slice, sampleRate);
    points.push({
      time,
      frequency: res.frequency,
      clarity: res.clarity,
      rms: res.rms
    });
  }

  return points;
}

/**
 * Converts frequency in Hz to Chao 5-scale (1 to 5) relative to speaker's median pitch.
 *
 * @param {number} freqHz Pitch in Hz
 * @param {number} medianHz Median speaking pitch of the speaker
 * @param {number} semitoneRange Typical range (default +/- 6 semitones covering 1 octave)
 * @returns {number} Value between 1.0 and 5.0
 */
export function frequencyToChaoScale(freqHz, medianHz, semitoneRange = 6) {
  if (!freqHz || !medianHz || freqHz <= 0 || medianHz <= 0) return 3.0;
  const semitones = 12 * Math.log2(freqHz / medianHz);
  // Center is Chao 3.0. -semitoneRange maps to 1.0, +semitoneRange maps to 5.0
  const normalized = 3.0 + (semitones / semitoneRange) * 2.0;
  return Math.max(1.0, Math.min(5.0, normalized));
}

/**
 * Real-time Speech Recorder and Live Pitch Tracking Controller.
 */
export class LivePitchTracker {
  constructor(options = {}) {
    this.onPitch = options.onPitch || null;
    this.onVolume = options.onVolume || null;
    this.onWaveform = options.onWaveform || null;
    this.onStatus = options.onStatus || null;
    this.audioContext = null;
    this.mediaStream = null;
    this.analyser = null;
    this.mediaRecorder = null;
    this.recordedChunks = [];
    this.recordedBlob = null;
    this.recordedAudioUrl = null;
    this.animationFrameId = null;
    this.isRecording = false;
    this.capturedFrames = [];
  }

  async start() {
    this.stop();
    this.recordedChunks = [];
    this.capturedFrames = [];
    this.recordedBlob = null;
    if (this.recordedAudioUrl) {
      URL.revokeObjectURL(this.recordedAudioUrl);
      this.recordedAudioUrl = null;
    }

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.audioContext = new AudioCtx();
      const source = this.audioContext.createMediaStreamSource(this.mediaStream);

      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 2048;
      source.connect(this.analyser);

      // MediaRecorder for playback & shadowing
      this.mediaRecorder = new MediaRecorder(this.mediaStream);
      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          this.recordedChunks.push(e.data);
        }
      };
      this.mediaRecorder.onstop = () => {
        this.recordedBlob = new Blob(this.recordedChunks, { type: 'audio/webm' });
        this.recordedAudioUrl = URL.createObjectURL(this.recordedBlob);
        if (this.onStatus) this.onStatus('recorded', { audioUrl: this.recordedAudioUrl });
      };

      this.mediaRecorder.start(100);
      this.isRecording = true;
      if (this.onStatus) this.onStatus('recording');

      this._startPitchLoop();
      return true;
    } catch (err) {
      console.warn('[PitchDetector] Microphone access error:', err);
      if (this.onStatus) this.onStatus('error', { error: err });
      return false;
    }
  }

  _startPitchLoop() {
    const timeDomainBuffer = new Float32Array(this.analyser.fftSize);
    const startTime = performance.now();

    const loop = () => {
      if (!this.isRecording) return;

      this.analyser.getFloatTimeDomainData(timeDomainBuffer);
      const sampleRate = this.audioContext.sampleRate;
      const res = detectPitchYin(timeDomainBuffer, sampleRate);
      const elapsedSec = (performance.now() - startTime) / 1000;

      if (this.onVolume) {
        this.onVolume(res.rms);
      }

      if (this.onWaveform) {
        this.onWaveform(timeDomainBuffer, res.rms);
      }

      const frameData = {
        time: elapsedSec,
        frequency: res.frequency,
        clarity: res.clarity,
        rms: res.rms,
        isVoiced: res.frequency >= MIN_SPEECH_FREQ && res.frequency <= MAX_SPEECH_FREQ && res.clarity > 0.45
      };

      this.capturedFrames.push(frameData);

      if (this.onPitch) {
        this.onPitch(frameData);
      }

      this.animationFrameId = requestAnimationFrame(loop);
    };

    this.animationFrameId = requestAnimationFrame(loop);
  }

  stop() {
    this.isRecording = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try { this.mediaRecorder.stop(); } catch (e) {}
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }

    if (this.audioContext && this.audioContext.state !== 'closed') {
      try { this.audioContext.close(); } catch (e) {}
      this.audioContext = null;
    }
  }

  getCapturedContour() {
    return this.capturedFrames.slice();
  }

  getRecordedAudioUrl() {
    return this.recordedAudioUrl;
  }

  getRecordedBlob() {
    return this.recordedBlob;
  }

  /**
   * Decodes and resamples the recorded audio to 16kHz mono PCM Float32Array
   * for Neural Network (ONNX / GOP) speech analysis.
   */
  async getPcm16k() {
    if (!this.recordedBlob) return null;
    try {
      const arrayBuffer = await this.recordedBlob.arrayBuffer();
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioCtx();
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
      try { await ctx.close(); } catch {}

      if (audioBuffer.sampleRate === 16000) {
        return audioBuffer.getChannelData(0);
      }

      // Resample accurately using OfflineAudioContext
      const offlineCtx = new OfflineAudioContext(
        1,
        Math.max(1, Math.ceil(audioBuffer.duration * 16000)),
        16000
      );
      const source = offlineCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(offlineCtx.destination);
      source.start(0);
      const resampled = await offlineCtx.startRendering();
      return resampled.getChannelData(0);
    } catch (err) {
      console.warn('[PitchDetector] getPcm16k decode error:', err);
      return null;
    }
  }

  /**
   * Retrieves the normalized waveform envelope of the user's recorded audio.
   *
   * @param {number} targetBuckets Number of time buckets
   * @returns {Promise<Array<{ min: number, max: number, rms: number, amp: number }>>}
   */
  async getRecordedWaveform(targetBuckets = 120) {
    const pcm = await this.getPcm16k();
    if (!pcm || pcm.length === 0) return [];
    return extractWaveformEnvelope(pcm, targetBuckets);
  }
}
