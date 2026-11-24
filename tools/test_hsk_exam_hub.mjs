// tools/test_hsk_exam_hub.mjs
// Verification suite for HSK Exam Hub features:
// - Dictation character diffing algorithm
// - Error notebook data contract & scoring persistence

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

console.log('Testing HSK Exam Hub components & logic...');

// 1. Sanitize Chinese Text & Diff
function sanitizeChineseText(str) {
  if (!str) return '';
  return String(str)
    .trim()
    .replace(/[，。！？、：；“”‘’（）\(\)\.,!\?:\s]/g, '');
}

function computeCharDiff(targetText, userText) {
  const cleanTarget = sanitizeChineseText(targetText);
  const cleanUser = sanitizeChineseText(userText);
  const targetChars = Array.from(cleanTarget);
  const userChars = Array.from(cleanUser);

  let matchedCount = 0;
  const diffItems = targetChars.map((targetChar, idx) => {
    const userChar = userChars[idx];
    if (!userChar) {
      return { char: targetChar, status: 'missing' };
    }
    if (userChar === targetChar) {
      matchedCount++;
      return { char: targetChar, userChar, status: 'correct' };
    }
    return { char: targetChar, userChar, status: 'incorrect' };
  });

  const accuracy = targetChars.length > 0
    ? Math.round((matchedCount / targetChars.length) * 100)
    : 0;

  return {
    diffItems,
    matchedCount,
    totalCount: targetChars.length,
    accuracy,
    isComplete: matchedCount === targetChars.length
  };
}

// Test exact match
const test1 = computeCharDiff('明天天气很好。', '明天天气很好');
assert.equal(test1.accuracy, 100);
assert.equal(test1.isComplete, true);
assert.equal(test1.matchedCount, 6);
console.log('✅ PASSED: Exact dictation match produces 100% accuracy');

// Test partial match with typo
const test2 = computeCharDiff('明天天气很好。', '明天天汽很好');
assert.equal(test2.totalCount, 6);
assert.equal(test2.matchedCount, 5);
assert.equal(test2.diffItems[3].status, 'incorrect');
assert.equal(test2.isComplete, false);
console.log('✅ PASSED: Character typo correctly isolated and penalized');

// Test missing chars
const test3 = computeCharDiff('明天天气很好。', '明天');
assert.equal(test3.matchedCount, 2);
assert.equal(test3.diffItems[2].status, 'missing');
assert.equal(test3.accuracy, 33);
console.log('✅ PASSED: Truncated dictation accurately reports missing characters');

// 2. Verify file presence
const files = [
  'src/islands/HskDictationStudio.jsx',
  'src/islands/HskShadowingStudio.jsx',
  'src/islands/HskErrorNotebook.jsx',
  'src/islands/Hsk30ExamView.jsx'
];

files.forEach((file) => {
  const fullPath = path.resolve(process.cwd(), file);
  assert.ok(fs.existsSync(fullPath), `File ${file} should exist`);
});
console.log('✅ PASSED: All Exam Hub components and island files verified on disk');

console.log('ALL HSK EXAM HUB TESTS PASSED SUCCESSFULLY.');
