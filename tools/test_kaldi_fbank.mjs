import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { computeKaldiFbank, numFbankFrames, FBANK_OPTIONS } from '../src/islands/KaldiFbank.js';

// Must mirror synth_signal() in tools/gen_kaldi_fbank_fixture.py
const DURATION_SEC = 0.8;
const LOW_TONE_HZ = 220.0, LOW_TONE_AMP = 0.3;
const HIGH_TONE_HZ = 1750.0, HIGH_TONE_AMP = 0.2;
const NOISE_AMP = 0.05, NOISE_PRIME = 7919, NOISE_PERIOD = 1000;
/** Max abs log-energy deviation allowed vs kaldi-native-fbank (fixture rounded to 1e-4). */
const MAX_ABS_ERROR = 2e-3;

console.log('Testing KaldiFbank parity with kaldi-native-fbank...');

const sr = FBANK_OPTIONS.SAMPLE_RATE;
const samples = new Float32Array(Math.round(sr * DURATION_SEC));
for (let n = 0; n < samples.length; n++) {
  const noise = ((n * NOISE_PRIME) % NOISE_PERIOD) / NOISE_PERIOD - 0.5;
  samples[n] = LOW_TONE_AMP * Math.sin((2 * Math.PI * LOW_TONE_HZ * n) / sr)
    + HIGH_TONE_AMP * Math.sin((2 * Math.PI * HIGH_TONE_HZ * n) / sr)
    + NOISE_AMP * noise;
}

const fixture = JSON.parse(readFileSync(new URL('./fixtures/kaldi_fbank_fixture.json', import.meta.url), 'utf-8'));
const frames = computeKaldiFbank(samples);

assert.equal(numFbankFrames(samples.length), fixture.numFrames);
assert.equal(frames.length, fixture.numFrames);
console.log(`✅ PASSED: frame count matches (${frames.length})`);

let maxErr = 0;
for (let f = 0; f < frames.length; f++) {
  assert.equal(frames[f].length, FBANK_OPTIONS.NUM_MEL_BINS);
  for (let b = 0; b < frames[f].length; b++) {
    maxErr = Math.max(maxErr, Math.abs(frames[f][b] - fixture.frames[f][b]));
  }
}
assert(maxErr < MAX_ABS_ERROR, `Fbank deviates from Kaldi by ${maxErr}`);
console.log(`✅ PASSED: all 80-bin frames match Kaldi (max abs error ${maxErr.toExponential(2)})`);

console.log('\nAll KaldiFbank tests passed successfully!');
