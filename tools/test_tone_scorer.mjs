import assert from 'node:assert/strict';
import { scorePitchContour, evaluateSlope, evaluateToneMetrics, evaluateToneScorePenalty } from '../src/islands/ToneScorer.js';
import { generateTargetPitchContour, analyzeToneSandhi } from '../src/islands/ToneSandhi.js';
import { LocalSpeechAI } from '../src/islands/LocalSpeechAI.js';

console.log('Testing ToneScorer & SpeechAI calibration engine...');

// Test 1: Flat line on Tone 4 (爱 - ài) must fail heavily with needs_work
{
  const syllables = analyzeToneSandhi('爱', 'ài');
  const target = generateTargetPitchContour('爱', 'ài', 30);

  // Synthesize flat user frames at 160Hz (constant frequency around median)
  const flatFrames = Array.from({ length: 30 }, (_, i) => ({
    time: i * 0.02,
    frequency: 160,
    clarity: 0.9,
    rms: 0.05,
    isVoiced: true
  }));

  const res = scorePitchContour(flatFrames, target, syllables);
  assert.equal(res.valid, true);
  assert.ok(res.score <= 35, `Flat tone on Tone 4 must score <= 35, got: ${res.score}`);
  assert.equal(res.stars, 1, 'Score <= 35 must yield 1 star');
  assert.equal(res.toneBreakdown[0].status, 'needs_work');
  assert.ok(res.toneBreakdown[0].advice.includes('Chưa đủ độ dốc chúc xuống'));
  console.log(`✅ PASSED: Flat tone on Tone 4 penalized appropriately (score: ${res.score})`);
}

// Test 2: Proper sharp falling line on Tone 4 must score high (>= 80)
{
  const syllables = analyzeToneSandhi('爱', 'ài');
  const target = generateTargetPitchContour('爱', 'ài', 30);

  // Synthesize sharp falling frames: 230Hz down to 130Hz
  const fallingFrames = Array.from({ length: 30 }, (_, i) => {
    const freq = 230 - (i / 29) * 100;
    return {
      time: i * 0.02,
      frequency: freq,
      clarity: 0.95,
      rms: 0.06,
      isVoiced: true
    };
  });

  const res = scorePitchContour(fallingFrames, target, syllables);
  assert.equal(res.valid, true);
  assert.ok(res.score >= 80, `Sharp falling tone on Tone 4 must score >= 80, got: ${res.score}`);
  assert.equal(res.stars, 3);
  assert.equal(res.toneBreakdown[0].status, 'excellent');
  console.log(`✅ PASSED: Good Tone 4 falling contour awarded high score (score: ${res.score})`);
}

// Test 3: Tone 2 rising vs falling
{
  const syllables = analyzeToneSandhi('来', 'lái');
  const target = generateTargetPitchContour('来', 'lái', 30);

  // Good rising: 140Hz up to 210Hz
  const risingFrames = Array.from({ length: 30 }, (_, i) => ({
    time: i * 0.02,
    frequency: 140 + (i / 29) * 70,
    clarity: 0.95,
    rms: 0.05,
    isVoiced: true
  }));
  const resGood = scorePitchContour(risingFrames, target, syllables);
  assert.ok(resGood.score >= 80, `Rising on Tone 2 must score >= 80, got: ${resGood.score}`);

  // Wrong falling on Tone 2: 200Hz down to 130Hz
  const wrongFrames = Array.from({ length: 30 }, (_, i) => ({
    time: i * 0.02,
    frequency: 200 - (i / 29) * 70,
    clarity: 0.95,
    rms: 0.05,
    isVoiced: true
  }));
  const resBad = scorePitchContour(wrongFrames, target, syllables);
  assert.ok(resBad.score <= 35, `Falling on Tone 2 must score <= 35, got: ${resBad.score}`);
  assert.equal(resBad.toneBreakdown[0].status, 'needs_work');
  console.log(`✅ PASSED: Tone 2 rising vs falling discriminated (good: ${resGood.score}, bad: ${resBad.score})`);
}

// Test 4: Tone 1 high level vs falling (Vietnamese huyền mistake)
{
  const syllables = analyzeToneSandhi('妈', 'mā');
  const target = generateTargetPitchContour('妈', 'mā', 30);

  // Good Tone 1: high and steady around 210Hz
  const levelFrames = Array.from({ length: 30 }, (_, i) => ({
    time: i * 0.02,
    frequency: 210 + (Math.sin(i) * 2),
    clarity: 0.95,
    rms: 0.05,
    isVoiced: true
  }));
  const resGood = scorePitchContour(levelFrames, target, syllables);
  assert.ok(resGood.score >= 80, `High level on Tone 1 must score >= 80, got: ${resGood.score}`);

  // Falling Tone 1 (dấu huyền): 200Hz dropping to 140Hz
  const fallingFrames = Array.from({ length: 30 }, (_, i) => ({
    time: i * 0.02,
    frequency: 200 - (i / 29) * 60,
    clarity: 0.95,
    rms: 0.05,
    isVoiced: true
  }));
  const resBad = scorePitchContour(fallingFrames, target, syllables);
  assert.ok(resBad.score <= 50, `Falling Tone 1 must score <= 50, got: ${resBad.score}`);
  assert.ok(resBad.toneBreakdown[0].advice.includes('dấu huyền'));
  console.log(`✅ PASSED: Tone 1 level vs falling evaluated accurately (good: ${resGood.score}, bad: ${resBad.score})`);
}

// Test 5: SpeechAI combineScores mode tailoring & synchronization
{
  const mockPitchBad = { valid: true, score: 25 };
  const mockAsrMiss = { matchScore: 0, exactMatch: false };

  // In toneTrainer mode, ASR miss does NOT slash score by 35%
  const combinedTrainer = LocalSpeechAI.combineScores(mockPitchBad, mockAsrMiss, 'toneTrainer');
  assert.equal(combinedTrainer.overallScore, 25);
  assert.equal(combinedTrainer.stars, 1, '25 overallScore must have 1 star');
  assert.ok(combinedTrainer.message.includes('Chưa đạt'), '25 overallScore must give failing message');

  // When tone is good (85) in toneTrainer, score is preserved
  const mockPitchGood = { valid: true, score: 85 };
  const combinedTrainerGood = LocalSpeechAI.combineScores(mockPitchGood, mockAsrMiss, 'toneTrainer');
  assert.equal(combinedTrainerGood.overallScore, 85);
  assert.equal(combinedTrainerGood.stars, 3);
  assert.ok(combinedTrainerGood.message.includes('Rất tuyệt vời'));

  console.log('✅ PASSED: combineScores preserves tone focus and synchronizes stars/message');
}

// Test 6: evaluateTextMatch with Hanzi & Latin transliteration fallback
{
  // Exact Hanzi match
  const matchHanzi = LocalSpeechAI.evaluateTextMatch('爱', '爱', 'ài');
  assert.equal(matchHanzi.exactMatch, true);
  assert.equal(matchHanzi.matchScore, 100);

  // Browser SpeechRecognition returning English "I," for Chinese "ài"
  const matchEnglishI = LocalSpeechAI.evaluateTextMatch('I,', '爱', 'ài');
  assert.ok(matchEnglishI.matchScore >= 80, `English 'I,' for 'ài' should match phonetically, got ${matchEnglishI.matchScore}`);

  // Browser SpeechRecognition returning Latin "ai" for "ài"
  const matchLatinAi = LocalSpeechAI.evaluateTextMatch('ai', '爱', 'ài');
  assert.equal(matchLatinAi.exactMatch, true);
  assert.equal(matchLatinAi.matchScore, 95);

  // Totally unrelated word
  const matchWrong = LocalSpeechAI.evaluateTextMatch('你好', '爱', 'ài');
  assert.equal(matchWrong.matchScore, 0);

  console.log('✅ PASSED: evaluateTextMatch supports Hanzi and Latin phonetic fallback');
}

console.log('\nAll ToneScorer tests passed successfully!');
