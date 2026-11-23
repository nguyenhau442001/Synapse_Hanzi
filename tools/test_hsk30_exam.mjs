// tools/test_hsk30_exam.mjs
// Test suite for HSK 3.0 CBT Mock Exam dataset and scoring engine

import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('Testing HSK 3.0 Mock Exam catalog and dataset...');

// 1. Validate index.json
const indexPath = path.join(rootDir, 'database/exams/hsk30/index.json');
assert.ok(fs.existsSync(indexPath), 'Exam index.json must exist');
const indexData = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
assert.strictEqual(indexData.version, '3.0', 'Catalog version must be 3.0');
assert.ok(indexData.levels && indexData.levels.hsk30_1, 'HSK 1 level must be defined in catalog');

const hsk1Meta = indexData.levels.hsk30_1;
assert.strictEqual(hsk1Meta.total_questions, 40, 'HSK 1 total questions must be 40');
assert.strictEqual(hsk1Meta.max_score, 200, 'Max score must be 200');
assert.strictEqual(hsk1Meta.pass_score, 120, 'Pass score must be 120');
assert.ok(Array.isArray(hsk1Meta.exams) && hsk1Meta.exams.length > 0, 'Exams array must not be empty');

console.log('✅ PASSED: Exam catalog metadata validated.');

// 2. Validate specimen paper H10901
const examRelPath = hsk1Meta.exams[0].file;
const examFullPath = path.join(rootDir, examRelPath);
assert.ok(fs.existsSync(examFullPath), `Exam file ${examRelPath} must exist on disk`);

const examData = JSON.parse(fs.readFileSync(examFullPath, 'utf-8'));
assert.strictEqual(examData.id, 'hsk30_l1_specimen01');
assert.strictEqual(examData.code, 'H10901');
assert.strictEqual(examData.level, 'hsk30_1');
assert.strictEqual(examData.time_minutes, 35);
assert.ok(examData.sections && examData.sections.listening && examData.sections.reading);

const listeningQuestions = examData.sections.listening.questions;
const readingQuestions = examData.sections.reading.questions;
assert.strictEqual(listeningQuestions.length, 20, 'Listening section must have 20 questions');
assert.strictEqual(readingQuestions.length, 20, 'Reading section must have 20 questions');
assert.strictEqual(listeningQuestions.length + readingQuestions.length, 40, 'Total questions must be 40');

// 3. Validate questions, audio files, and illustrations
let audioCount = 0;
for (const q of listeningQuestions) {
  assert.ok(q.id, 'Question must have id');
  assert.ok(q.number >= 1 && q.number <= 20, 'Question number must be in range 1-20');
  assert.ok(q.type, 'Question must have type');
  assert.notStrictEqual(q.correct_answer, undefined, 'Question must have correct_answer');
  assert.ok(q.explanation_vi, 'Question must have Vietnamese explanation');

  if (q.audio_clip) {
    audioCount += 1;
    const audioPath = path.join(rootDir, q.audio_clip);
    assert.ok(fs.existsSync(audioPath), `Audio file ${q.audio_clip} must exist on disk`);
    const stat = fs.statSync(audioPath);
    assert.ok(stat.size > 1000, `Audio file ${q.audio_clip} must not be empty`);
  }

  if (q.image) {
    const imgPath = path.join(rootDir, q.image);
    assert.ok(fs.existsSync(imgPath), `Illustration ${q.image} must exist on disk`);
  }
}
assert.strictEqual(audioCount, 20, 'All 20 listening questions must have verified audio files');
console.log('✅ PASSED: All 20 listening questions and audio files verified.');

for (const q of readingQuestions) {
  assert.ok(q.id, 'Question must have id');
  assert.ok(q.number >= 21 && q.number <= 40, 'Reading question number must be in range 21-40');
  assert.ok(q.type, 'Question must have type');
  assert.notStrictEqual(q.correct_answer, undefined, 'Question must have correct_answer');
  assert.ok(q.explanation_vi, 'Question must have Vietnamese explanation');

  if (q.image) {
    const imgPath = path.join(rootDir, q.image);
    assert.ok(fs.existsSync(imgPath), `Illustration ${q.image} must exist on disk`);
  }
}
console.log('✅ PASSED: All 20 reading questions and illustrations verified.');

// 4. Validate CBT scoring calculation logic
function computeScore(userAnswers, questions) {
  let listeningCorrect = 0;
  let readingCorrect = 0;
  questions.forEach((q) => {
    const isCorrect = userAnswers[q.id] === q.correct_answer;
    if (q.number <= 20 && isCorrect) listeningCorrect += 1;
    if (q.number > 20 && isCorrect) readingCorrect += 1;
  });
  const listeningScore = Math.round((listeningCorrect / 20) * 100);
  const readingScore = Math.round((readingCorrect / 20) * 100);
  const totalScore = listeningScore + readingScore;
  const isPassed = totalScore >= 120;
  return { listeningScore, readingScore, totalScore, isPassed };
}

const allQuestions = [...listeningQuestions, ...readingQuestions];

// Test case A: Perfect score
const perfectAnswers = {};
allQuestions.forEach((q) => {
  perfectAnswers[q.id] = q.correct_answer;
});
const perfectResult = computeScore(perfectAnswers, allQuestions);
assert.strictEqual(perfectResult.listeningScore, 100);
assert.strictEqual(perfectResult.readingScore, 100);
assert.strictEqual(perfectResult.totalScore, 200);
assert.strictEqual(perfectResult.isPassed, true);

// Test case B: Bare minimum passing score (12/20 listening, 12/20 reading = 60 + 60 = 120)
const passingAnswers = {};
listeningQuestions.slice(0, 12).forEach((q) => { passingAnswers[q.id] = q.correct_answer; });
readingQuestions.slice(0, 12).forEach((q) => { passingAnswers[q.id] = q.correct_answer; });
const passResult = computeScore(passingAnswers, allQuestions);
assert.strictEqual(passResult.listeningScore, 60);
assert.strictEqual(passResult.readingScore, 60);
assert.strictEqual(passResult.totalScore, 120);
assert.strictEqual(passResult.isPassed, true);

// Test case C: Failing score (11/20 listening, 11/20 reading = 55 + 55 = 110)
const failingAnswers = {};
listeningQuestions.slice(0, 11).forEach((q) => { failingAnswers[q.id] = q.correct_answer; });
readingQuestions.slice(0, 11).forEach((q) => { failingAnswers[q.id] = q.correct_answer; });
const failResult = computeScore(failingAnswers, allQuestions);
assert.strictEqual(failResult.totalScore, 110);
assert.strictEqual(failResult.isPassed, false);

console.log('✅ PASSED: CBT exam scoring rules and pass/fail thresholds verified.');
console.log('All HSK 3.0 Mock Exam tests passed successfully!');
