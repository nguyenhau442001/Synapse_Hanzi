import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  competitorSyllables, gopToScore, GOP_FULL_SCORE, GOP_ZERO_SCORE, FAILED_COMPONENT_CAP,
} from '../src/islands/CaptGopScorer.js';
import { buildCaptResult, decodeTokens, prepareModelInput, EDGE_PAD_SEC } from '../src/islands/ZipformerCaptEngine.js';
import { FBANK_OPTIONS, numFbankFrames } from '../src/islands/KaldiFbank.js';

const bank = JSON.parse(readFileSync(new URL('../database/speech/capt_token_bank.json', import.meta.url), 'utf-8'));
const V = bank.model.vocabSize;
const PEAK = Math.log(0.9);
const REST = Math.log(0.1 / (V - 1));

/** Frame-level log-probs that "say" the given token sequence (blank between tokens). */
function sayTokens(tokens) {
  const ids = [0, 0];
  for (const t of tokens) ids.push(t, t, 0);
  ids.push(0);
  const lp = new Float32Array(ids.length * V).fill(REST);
  ids.forEach((id, f) => { lp[f * V + id] = PEAK; });
  return { lp, dims: [1, ids.length, V] };
}

console.log('Testing CAPT GOP scorer...');

{
  assert.equal(gopToScore(0), 100);
  assert.equal(gopToScore(GOP_FULL_SCORE), 100);
  assert.equal(gopToScore(GOP_ZERO_SCORE), 0);
  assert.equal(gopToScore((GOP_FULL_SCORE + GOP_ZERO_SCORE) / 2), 50);
  console.log('✅ PASSED: GOP maps linearly onto 0..100');
}

{
  const zh = competitorSyllables('zhōng', bank);
  assert.ok(zh.initial.some((r) => r.key === 'zong1' && r.value === 'z'), 'zhong1 competes with zong1');
  const an = competitorSyllables('kàn', bank);
  assert.ok(an.final.some((r) => r.key === 'kang4' && r.value === 'ang'), 'kan4 competes with kang4');
  console.log('✅ PASSED: minimal-pair competitors (zh↔z, an↔ang) come from the bank');
}

{
  const { lp, dims } = sayTokens([...bank.chars['中'], ...bank.chars['国']]);
  const res = buildCaptResult(lp, dims, '中国', ['zhōng', 'guó'], bank);
  assert.equal(res.success, true);
  assert.equal(res.syllables.length, 2);
  assert.ok(res.syllables.every((s) => s.initial.passed && s.final.passed), 'Correct speech passes');
  assert.equal(res.overallScore, 100);
  assert.equal(res.recognizedText, '中国');
  console.log('✅ PASSED: correct word scores 100 and decodes back to Hanzi');
}

{
  // Learner says "zong" (宗-like) instead of "zhong": audio emits the zong1 representative.
  const rep = bank.syllables.zong1;
  const { lp, dims } = sayTokens([...rep.t, ...bank.chars['国']]);
  const tone = [{ score: 90, tone: 1, advice: '' }, { score: 90, tone: 2, advice: '' }];
  const res = buildCaptResult(lp, dims, '中国', ['zhōng', 'guó'], bank, tone);
  const first = res.syllables[0];
  assert.equal(first.initial.passed, false, 'zh→z must be flagged');
  assert.equal(first.initial.detected, 'z');
  assert.ok(first.initial.score <= FAILED_COMPONENT_CAP);
  assert.ok(res.overallScore < 70, `Mispronounced word must fail, got ${res.overallScore}`);
  assert.equal(res.initial.target, 'zh', 'Legacy pillar shows the weakest syllable');
  assert.equal(res.tone.score, 90);
  console.log('✅ PASSED: zh→z substitution is detected and lowers the score');
}

{
  assert.equal(buildCaptResult(new Float32Array(V), [1, 1, V], 'ABC', ['a'], bank).success, false);
  assert.equal(decodeTokens([], bank), '');
  const pcm = new Float32Array(FBANK_OPTIONS.SAMPLE_RATE);
  const { x, xLens } = prepareModelInput(pcm);
  const expected = numFbankFrames(pcm.length + 2 * EDGE_PAD_SEC * FBANK_OPTIONS.SAMPLE_RATE);
  assert.equal(x.dims[1], expected);
  assert.equal(Number(xLens[0]), expected);
  console.log('✅ PASSED: unsupported words are rejected and input is padded');
}

console.log('\nAll CAPT GOP scorer tests passed successfully!');
