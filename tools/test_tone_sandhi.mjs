import assert from 'node:assert/strict';
import { analyzeToneSandhi, generateTargetPitchContour } from '../src/islands/ToneSandhi.js';

console.log('Testing ToneSandhi engine...');

// Test 1: Third tone sandhi (3 + 3 -> 2 + 3)
{
  const result = analyzeToneSandhi('你好', 'nǐ hǎo');
  assert.equal(result.length, 2);
  assert.equal(result[0].rawTone, 3);
  assert.equal(result[0].actualTone, 2, 'First syllable of 你好 must turn to Tone 2');
  assert.equal(result[0].sandhiApplied, true);
  assert.equal(result[1].actualTone, 3, 'Second syllable of 你好 remains Tone 3');
  console.log('✅ PASSED: 3-3 sandhi (nǐ hǎo -> ní hǎo)');
}

// Test 2: "不" sandhi before Tone 4 (bu4 + 4 -> bu2 + 4)
{
  const result = analyzeToneSandhi('不是', 'bù shì');
  assert.equal(result[0].rawTone, 4);
  assert.equal(result[0].actualTone, 2, 'bù before Tone 4 must turn to Tone 2');
  assert.equal(result[0].sandhiApplied, true);
  console.log('✅ PASSED: bù before Tone 4 (bù shì -> bú shì)');
}

// Test 3: "不" before Tone 1/2/3 remains Tone 4
{
  const result = analyzeToneSandhi('不好', 'bù hǎo');
  assert.equal(result[0].rawTone, 4);
  assert.equal(result[0].actualTone, 4, 'bù before Tone 3 remains Tone 4');
  assert.equal(result[0].sandhiApplied, false);
  console.log('✅ PASSED: bù before non-Tone 4 (bù hǎo remains bù hǎo)');
}

// Test 4: "一" before Tone 4 turns to Tone 2 (yi1 + 4 -> yi2 + 4)
{
  const result = analyzeToneSandhi('一样', 'yī yàng');
  assert.equal(result[0].rawTone, 1);
  assert.equal(result[0].actualTone, 2, 'yī before Tone 4 turns to Tone 2');
  assert.equal(result[0].sandhiApplied, true);
  console.log('✅ PASSED: yī before Tone 4 (yī yàng -> yí yàng)');
}

// Test 5: "一" before Tone 1, 2, 3 turns to Tone 4
{
  const result1 = analyzeToneSandhi('一天', 'yī tiān');
  assert.equal(result1[0].actualTone, 4, 'yī before Tone 1 turns to Tone 4');

  const result3 = analyzeToneSandhi('一起', 'yī qǐ');
  assert.equal(result3[0].actualTone, 4, 'yī before Tone 3 turns to Tone 4');
  console.log('✅ PASSED: yī before Tones 1/2/3 turns to Tone 4 (yì tiān, yì qǐ)');
}

// Test 6: "一" as ordinal (第一) stays Tone 1
{
  const result = analyzeToneSandhi('第一', 'dì yī');
  assert.equal(result[1].actualTone, 1, 'yī in 第一 remains Tone 1');
  console.log('✅ PASSED: yī as ordinal remains Tone 1');
}

// Test 7: Target pitch contour generation
{
  const contour = generateTargetPitchContour('你好', 'nǐ hǎo', 20);
  assert.equal(contour.length, 40);
  assert.ok(contour[0].pitchNorm >= 1.0 && contour[0].pitchNorm <= 5.0);
  assert.equal(contour[0].tone, 2, 'First syllable tone contour corresponds to sandhi Tone 2');
  console.log('✅ PASSED: generateTargetPitchContour produces valid Chao 5-scale contour');
}

console.log('\nAll ToneSandhi tests passed successfully!');
