// tools/test_hsk30_exam.mjs
// Test suite for HSK 3.0 CBT Mock Exam catalog, datasets, and scoring engine

import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('Testing HSK 3.0 Mock Exam catalog and datasets...');

// 1. Validate index.json
const indexPath = path.join(rootDir, 'database/exams/hsk30/index.json');
assert.ok(fs.existsSync(indexPath), 'Exam index.json must exist');
const indexData = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
assert.strictEqual(indexData.version, '3.0', 'Catalog version must be 3.0');

const expectedLevels = ['hsk30_1', 'hsk30_2', 'hsk30_3'];
for (const lvl of expectedLevels) {
  assert.ok(indexData.levels && indexData.levels[lvl], `Level ${lvl} must be defined in catalog`);
  const meta = indexData.levels[lvl];
  assert.ok(meta.total_questions > 0, `${lvl} must specify total_questions`);
  assert.strictEqual(meta.max_score, 200, `${lvl} max score must be 200`);
  assert.strictEqual(meta.pass_score, 120, `${lvl} pass score must be 120`);
  assert.ok(Array.isArray(meta.exams) && meta.exams.length > 0, `${lvl} exams must not be empty`);
}
console.log('✅ PASSED: Exam catalog metadata validated for HSK 1, 2, 3.');

// 2. Validate all level papers
let totalAudioChecked = 0;

for (const lvl of expectedLevels) {
  const meta = indexData.levels[lvl];
  for (const ex of meta.exams) {
    const examFullPath = path.join(rootDir, ex.file);
    assert.ok(fs.existsSync(examFullPath), `Exam file ${ex.file} must exist`);
    const data = JSON.parse(fs.readFileSync(examFullPath, 'utf-8'));

    assert.ok(data.sections && data.sections.listening && data.sections.reading, `Sections missing in ${ex.id}`);
    const lList = data.sections.listening.questions;
    const rList = data.sections.reading.questions;
    assert.strictEqual(lList.length + rList.length, meta.total_questions, `Question count mismatch in ${ex.id}`);

    for (const q of lList) {
      assert.ok(q.id, 'Question must have id');
      assert.ok(q.type, 'Question must have type');
      assert.notStrictEqual(q.correct_answer, undefined, 'Question must have correct_answer');

      if (q.audio_clip) {
        totalAudioChecked += 1;
        const aPath = path.join(rootDir, q.audio_clip);
        assert.ok(fs.existsSync(aPath), `Audio file ${q.audio_clip} must exist`);
        assert.ok(fs.statSync(aPath).size > 1000, `Audio file ${q.audio_clip} must not be empty`);
      }
    }

    for (const q of rList) {
      assert.ok(q.id, 'Question must have id');
      assert.ok(q.type, 'Question must have type');
      assert.notStrictEqual(q.correct_answer, undefined, 'Question must have correct_answer');
    }
  }
}

console.log(`✅ PASSED: All levels validated (${totalAudioChecked} listening audios verified).`);

// 3. Validate CBT scoring calculation logic
function computeScore(userAnswers, questions) {
  let listeningCorrect = 0;
  let readingCorrect = 0;
  let listeningTotal = 0;
  let readingTotal = 0;

  questions.forEach((q) => {
    const isCorrect = userAnswers[q.id] === q.correct_answer || String(userAnswers[q.id]) === String(q.correct_answer);
    if (q.section === 'listening') {
      listeningTotal += 1;
      if (isCorrect) listeningCorrect += 1;
    } else {
      readingTotal += 1;
      if (isCorrect) readingCorrect += 1;
    }
  });

  const listeningScore = listeningTotal > 0 ? Math.round((listeningCorrect / listeningTotal) * 100) : 0;
  const readingScore = readingTotal > 0 ? Math.round((readingCorrect / readingTotal) * 100) : 0;
  const totalScore = listeningScore + readingScore;
  const isPassed = totalScore >= 120;
  return { listeningScore, readingScore, totalScore, isPassed };
}

const mockQuestions = [
  { id: 'Q1', section: 'listening', correct_answer: 'true' },
  { id: 'Q2', section: 'listening', correct_answer: 'A' },
  { id: 'Q3', section: 'reading', correct_answer: 'B' },
  { id: 'Q4', section: 'reading', correct_answer: 'true' },
];

const mockAnswersAllCorrect = { Q1: 'true', Q2: 'A', Q3: 'B', Q4: 'true' };
const resFull = computeScore(mockAnswersAllCorrect, mockQuestions);
assert.strictEqual(resFull.totalScore, 200);
assert.strictEqual(resFull.isPassed, true);

const mockAnswersHalf = { Q1: 'true', Q2: 'WRONG', Q3: 'B', Q4: 'WRONG' };
const resHalf = computeScore(mockAnswersHalf, mockQuestions);
assert.strictEqual(resHalf.totalScore, 100);
assert.strictEqual(resHalf.isPassed, false);

console.log('✅ PASSED: Scoring algorithm simulation verified.');
console.log('ALL HSK 3.0 TESTS PASSED SUCCESFULLY.');
