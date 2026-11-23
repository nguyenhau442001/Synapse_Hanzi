/**
 * tools/test_waveform_extractor.mjs
 * Unit tests for waveform envelope extraction, normalization, and syllable alignment diagnostics.
 */

import assert from 'node:assert';
import { calculateRms, extractWaveformEnvelope } from '../src/islands/PitchDetector.js';
import { scorePitchContour } from '../src/islands/ToneScorer.js';
import { analyzeToneSandhi, generateTargetPitchContour } from '../src/islands/ToneSandhi.js';

console.log('Testing Waveform Envelope Extractor & Alignment...');

// Test 1: calculateRms on known signal
{
  const buffer = new Float32Array([1.0, -1.0, 1.0, -1.0]);
  const rms = calculateRms(buffer);
  assert(Math.abs(rms - 1.0) < 1e-4, 'RMS of unit square wave should be 1.0');
  console.log('✅ PASSED: calculateRms on unit square wave');
}

// Test 2: calculateRms on silence
{
  const buffer = new Float32Array(100).fill(0);
  const rms = calculateRms(buffer);
  assert.strictEqual(rms, 0, 'RMS of silent buffer should be 0');
  console.log('✅ PASSED: calculateRms on silence');
}

// Test 3: extractWaveformEnvelope with empty / invalid input
{
  assert.deepStrictEqual(extractWaveformEnvelope(null), [], 'Should return empty array for null');
  assert.deepStrictEqual(extractWaveformEnvelope([]), [], 'Should return empty array for empty');
  assert.deepStrictEqual(extractWaveformEnvelope(new Float32Array(0)), [], 'Should return empty array for 0 length');
  console.log('✅ PASSED: extractWaveformEnvelope on empty input');
}

// Test 4: extractWaveformEnvelope generates correct number of buckets and normalized bounds
{
  const sampleRate = 16000;
  const durationSec = 0.5;
  const numSamples = Math.floor(sampleRate * durationSec);
  const pcm = new Float32Array(numSamples);

  // Generate synthetic sine tone with burst
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    pcm[i] = Math.sin(2 * Math.PI * 220 * t) * 0.75;
  }

  const targetBuckets = 60;
  const envelope = extractWaveformEnvelope(pcm, targetBuckets);

  assert.strictEqual(envelope.length, targetBuckets, `Envelope should have exactly ${targetBuckets} buckets`);

  envelope.forEach((bucket, idx) => {
    assert(bucket.min <= 0 && bucket.min >= -1.0, `Bucket ${idx} min out of bounds: ${bucket.min}`);
    assert(bucket.max >= 0 && bucket.max <= 1.0, `Bucket ${idx} max out of bounds: ${bucket.max}`);
    assert(bucket.amp >= 0 && bucket.amp <= 1.0, `Bucket ${idx} amp out of bounds: ${bucket.amp}`);
    assert(bucket.rms >= 0 && bucket.rms <= 1.0, `Bucket ${idx} rms out of bounds: ${bucket.rms}`);
  });

  console.log('✅ PASSED: extractWaveformEnvelope bounds and normalization');
}

// Test 5: ToneScorer provides syllable alignment time bounds and durationSec
{
  const hanzi = '你好';
  const pinyin = 'nǐ hǎo';
  const syllableInfos = analyzeToneSandhi(hanzi, pinyin);
  const targetContour = generateTargetPitchContour(hanzi, pinyin, 60);

  // Create mock user frames representing two syllables
  const userFrames = [];
  for (let i = 0; i < 40; i++) {
    userFrames.push({
      time: i * 0.02,
      frequency: 180 + Math.sin(i * 0.2) * 20,
      clarity: 0.9,
      rms: 0.1,
      isVoiced: true
    });
  }

  const result = scorePitchContour(userFrames, targetContour, syllableInfos);
  assert.strictEqual(result.valid, true, 'Result should be valid');
  assert(typeof result.durationSec === 'number' && result.durationSec > 0, 'durationSec should be positive number');
  assert.strictEqual(result.toneBreakdown.length, 2, 'Should contain breakdown for 2 syllables');

  result.toneBreakdown.forEach((item, idx) => {
    assert(typeof item.startNorm === 'number', 'startNorm should be number');
    assert(typeof item.endNorm === 'number', 'endNorm should be number');
    assert(item.endNorm > item.startNorm, 'endNorm should be greater than startNorm');
  });

  console.log('✅ PASSED: ToneScorer syllable alignment bounds and duration');
}

console.log('All Waveform Extractor & Alignment tests passed successfully!');
