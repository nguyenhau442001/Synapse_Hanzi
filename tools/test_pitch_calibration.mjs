/**
 * tools/test_pitch_calibration.mjs
 * Unit tests verifying microphone calibration, noise floor thresholds,
 * electrical hum rejection, and robust ASR fallback scoring.
 */

import assert from 'node:assert';
import { MIN_SPEECH_FREQ, RMS_NOISE_FLOOR, detectPitchYin } from '../src/islands/PitchDetector.js';
import { LocalSpeechAI } from '../src/islands/LocalSpeechAI.js';
import { scorePitchContour } from '../src/islands/ToneScorer.js';
import { analyzeToneSandhi, generateTargetPitchContour } from '../src/islands/ToneSandhi.js';

console.log('Testing Pitch Calibration & Fallback Scoring...');

// Test 1: Verify MIN_SPEECH_FREQ is calibrated above 50/60Hz AC electrical hum
{
  assert.strictEqual(MIN_SPEECH_FREQ, 75, 'MIN_SPEECH_FREQ should be 75Hz to filter 50/60Hz AC hum and desk rumble');
  console.log('✅ PASSED: MIN_SPEECH_FREQ calibrated to 75Hz');
}

// Test 2: Verify RMS_NOISE_FLOOR allows natural speech amplitude
{
  assert(RMS_NOISE_FLOOR <= 0.005, 'RMS_NOISE_FLOOR should be sensitive enough for normal speech (<= 0.005)');
  console.log('✅ PASSED: RMS_NOISE_FLOOR calibrated to sensitive speech range');
}

// Test 3: detectPitchYin rejects 50Hz/60Hz low hum signals
{
  const sampleRate = 48000;
  const buffer = new Float32Array(2048);
  // Generate 60Hz hum signal
  for (let i = 0; i < buffer.length; i++) {
    buffer[i] = Math.sin(2 * Math.PI * 60 * (i / sampleRate)) * 0.1;
  }
  const res = detectPitchYin(buffer, sampleRate);
  assert.strictEqual(res.frequency, 0, '60Hz signal should be rejected as non-speech frequency');
  console.log('✅ PASSED: detectPitchYin rejects 60Hz electrical hum');
}

// Test 4: ASR Fallback Scoring prevents unfair 0/100 when word is spoken correctly
{
  // User spoke "爱" (ài), recognized phonetically by ASR as "I."
  const textMatch = LocalSpeechAI.evaluateTextMatch('I.', '爱', 'ài');
  assert.strictEqual(textMatch.exactMatch, true, 'Homophone "I." should be recognized as match for "ài"');

  // Case A: Pitch tracking was invalid (e.g. mic too quiet)
  const invalidPitch = { valid: false, score: 0, message: 'Chưa thu được đủ âm thanh' };
  const combinedA = LocalSpeechAI.combineScores(invalidPitch, textMatch, 'toneTrainer');
  assert(combinedA.overallScore >= 75, `Expected score >= 75 for correct word, got ${combinedA.overallScore}`);
  assert(combinedA.stars >= 2, 'Should grant at least 2 stars for recognized word');
  console.log('✅ PASSED: Fallback awards fair score when pitch tracking has insufficient frames');

  // Case B: Pitch tracking had low score due to flat line, but ASR confirmed exact word
  const lowPitch = { valid: true, score: 10, userChaoPitches: [3, 3, 3] };
  const combinedB = LocalSpeechAI.combineScores(lowPitch, textMatch, 'toneTrainer');
  assert(combinedB.overallScore >= 70, `Expected score >= 70 when ASR confirmed exact word, got ${combinedB.overallScore}`);
  console.log('✅ PASSED: High-confidence ASR prevents false low score on quiet microphones');
}

// Test 5: ToneScorer accepts a short but real single syllable (~250 ms of voiced audio)
{
  const syllableInfos = analyzeToneSandhi('爱', 'ài');
  const targetContour = generateTargetPitchContour('爱', 'ài', 60);

  // Short 15-frame (~250 ms at 60 fps) falling tone
  const shortFrames = Array.from({ length: 15 }, (_, i) => ({
    time: 0.05 + i / 60,
    frequency: 220 - (i / 14) * 80,
    clarity: 0.9,
    rms: 0.04,
    isVoiced: true
  }));

  const score = scorePitchContour(shortFrames, targetContour, syllableInfos);
  assert.strictEqual(score.valid, true, 'ToneScorer should accept a short real single syllable');
  assert(score.score > 70, `Expected score > 70 for falling tone on Tone 4, got ${score.score}`);
  console.log('✅ PASSED: ToneScorer validates concise single-syllable vocalizations');
}

console.log('All Pitch Calibration & Fallback Scoring tests passed successfully!');
