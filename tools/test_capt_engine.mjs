import assert from 'node:assert/strict';
import { decomposePinyin, scoreCaptPrediction, parsePinyinTone } from '../src/islands/GopScorer.js';
import { extractLogMelSpectrogram, melFramesToFlatTensor } from '../src/islands/AudioFeatureExtractor.js';

console.log('Testing GOP & Conformer CAPT Engine...');

// Test 1: Pinyin Tone extraction
{
  assert.deepEqual(parsePinyinTone('mā'), { rawPinyin: 'mā', cleanPinyin: 'ma', tone: 1 });
  assert.deepEqual(parsePinyinTone('lái'), { rawPinyin: 'lái', cleanPinyin: 'lai', tone: 2 });
  assert.deepEqual(parsePinyinTone('nǐ'), { rawPinyin: 'nǐ', cleanPinyin: 'ni', tone: 3 });
  assert.deepEqual(parsePinyinTone('ài'), { rawPinyin: 'ài', cleanPinyin: 'ai', tone: 4 });
  assert.deepEqual(parsePinyinTone('ma'), { rawPinyin: 'ma', cleanPinyin: 'ma', tone: 5 });
  console.log('✅ PASSED: Pinyin tone parser handles tones 1-5 and clean base form');
}

// Test 2: Pinyin Initial & Final Decomposition
{
  assert.deepEqual(decomposePinyin('ài'), { initial: 'none', final: 'ai', tone: 4 });
  assert.deepEqual(decomposePinyin('zhōng'), { initial: 'zh', final: 'ong', tone: 1 });
  assert.deepEqual(decomposePinyin('chī'), { initial: 'ch', final: 'i', tone: 1 });
  assert.deepEqual(decomposePinyin('shàng'), { initial: 'sh', final: 'ang', tone: 4 });
  assert.deepEqual(decomposePinyin('xué'), { initial: 'x', final: 've', tone: 2 });
  assert.deepEqual(decomposePinyin('rén'), { initial: 'r', final: 'en', tone: 2 });
  console.log('✅ PASSED: Pinyin decomposition separates Initial, Final, and Tone accurately');
}

// Test 3: AudioFeatureExtractor (80-channel Log-Mel Spectrogram)
{
  // Synthesize 0.5s of 440Hz sine wave at 16000Hz (8000 samples)
  const sampleRate = 16000;
  const pcm = new Float32Array(8000);
  for (let i = 0; i < pcm.length; i++) {
    pcm[i] = 0.5 * Math.sin((2 * Math.PI * 440 * i) / sampleRate);
  }

  const frames = extractLogMelSpectrogram(pcm);
  assert.ok(frames.length > 20, `Should produce > 20 frames, got: ${frames.length}`);
  assert.equal(frames[0].length, 80, 'Each frame must have 80 Mel bins');

  // Verify no NaNs or Infinities
  for (const frame of frames) {
    for (let m = 0; m < 80; m++) {
      assert.ok(Number.isFinite(frame[m]), 'Mel energy must be finite');
    }
  }

  const { data, shape } = melFramesToFlatTensor(frames);
  assert.equal(shape[0], 1);
  assert.equal(shape[1], frames.length);
  assert.equal(shape[2], 80);
  assert.equal(data.length, frames.length * 80);
  console.log('✅ PASSED: Log-Mel feature extractor generates clean 80-dim spectrogram');
}

// Test 4: GOP & Multi-Head CAPT Prediction Scoring
{
  // Mock model outputs for 'zhōng' (initial: zh, final: ong, tone: 1)
  // Matching logits (high probability for target)
  const mockInitialLogits = new Float32Array(22).fill(-5);
  mockInitialLogits[15] = 5.0; // Index 15 = 'zh'

  const mockFinalLogits = new Float32Array(36).fill(-5);
  mockFinalLogits[11] = 5.0; // Index 11 = 'ong'

  const mockToneLogits = new Float32Array(5).fill(-5);
  mockToneLogits[0] = 5.0; // Index 0 = Tone 1

  const mockOutputs = {
    initial_logits: { data: mockInitialLogits },
    final_logits: { data: mockFinalLogits },
    tone_logits: { data: mockToneLogits },
    quality_score: { data: [92.0] }
  };

  const res = scoreCaptPrediction(mockOutputs, 'zhōng');
  assert.ok(res.overallScore >= 85, `Overall score should be high, got: ${res.overallScore}`);
  assert.equal(res.initial.target, 'zh');
  assert.equal(res.initial.detected, 'zh');
  assert.ok(res.initial.passed);
  assert.equal(res.final.target, 'ong');
  assert.equal(res.final.detected, 'ong');
  assert.ok(res.final.passed);
  assert.equal(res.tone.target, 1);
  assert.equal(res.tone.detected, 1);
  assert.ok(res.tone.passed);
  console.log(`✅ PASSED: Perfect pronunciation scored accurately (score: ${res.overallScore})`);
}

// Test 5: Detection of Vietnamese Learner Errors (e.g. confusing 'zh' with 'z')
{
  // User says 'z' instead of 'zh' for 'zhōng'
  const mockInitialLogits = new Float32Array(22).fill(-5);
  mockInitialLogits[19] = 5.0; // Index 19 = 'z'

  const mockFinalLogits = new Float32Array(36).fill(-5);
  mockFinalLogits[11] = 5.0; // Index 11 = 'ong'

  const mockToneLogits = new Float32Array(5).fill(-5);
  mockToneLogits[0] = 5.0; // Index 0 = Tone 1

  const mockOutputs = {
    initial_logits: { data: mockInitialLogits },
    final_logits: { data: mockFinalLogits },
    tone_logits: { data: mockToneLogits },
    quality_score: { data: [65.0] }
  };

  const res = scoreCaptPrediction(mockOutputs, 'zhōng');
  assert.ok(!res.initial.passed, 'Initial should not pass when confusing zh with z');
  assert.ok(res.initial.advice.includes('uốn cong đầu lưỡi'), 'Must include Vietnamese learner diagnosis advice');
  console.log(`✅ PASSED: Vietnamese learner error correctly diagnosed: "${res.initial.advice}"`);
}

console.log('\nAll CAPT Engine tests passed successfully!');
