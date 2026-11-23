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

const expectedLevels = ['hsk30_1', 'hsk30_2', 'hsk30_3', 'hsk30_4'];
for (const lvl of expectedLevels) {
  assert.ok(indexData.levels && indexData.levels[lvl], `Level ${lvl} must be defined in catalog`);
  const meta = indexData.levels[lvl];
  assert.ok(meta.total_questions > 0, `${lvl} must specify total_questions`);
  assert.ok(meta.max_score === 200 || meta.max_score === 300, `${lvl} max score must be 200 or 300`);
  assert.ok(meta.pass_score === 120 || meta.pass_score === 180, `${lvl} pass score must be 120 or 180`);
  assert.ok(Array.isArray(meta.exams) && meta.exams.length > 0, `${lvl} exams must not be empty`);
}
console.log('✅ PASSED: Exam catalog metadata validated for HSK 1, 2, 3, 4.');

// 2. Validate all level papers
let totalAudioChecked = 0;
let totalQuestionsChecked = 0;

for (const lvl of expectedLevels) {
  const meta = indexData.levels[lvl];
  for (const ex of meta.exams) {
    const examFullPath = path.join(rootDir, ex.file);
    assert.ok(fs.existsSync(examFullPath), `Exam file ${ex.file} must exist`);
    const data = JSON.parse(fs.readFileSync(examFullPath, 'utf-8'));

    assert.ok(data.sections && data.sections.listening && data.sections.reading, `Sections missing in ${ex.id}`);
    const lList = data.sections.listening.questions;
    const rList = data.sections.reading.questions;
    const wList = data.sections.writing ? data.sections.writing.questions : [];
    
    assert.strictEqual(lList.length + rList.length + wList.length, meta.total_questions, `Question count mismatch in ${ex.id}`);

    for (const q of lList) {
      totalQuestionsChecked += 1;
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
      totalQuestionsChecked += 1;
      assert.ok(q.id, 'Question must have id');
      assert.ok(q.type, 'Question must have type');
      assert.notStrictEqual(q.correct_answer, undefined, 'Question must have correct_answer');
    }

    for (const q of wList) {
      totalQuestionsChecked += 1;
      assert.ok(q.id, 'Writing question must have id');
      assert.ok(q.type, 'Writing question must have type');
      assert.notStrictEqual(q.correct_answer, undefined, 'Writing question must have correct_answer');
      if (q.type === 'word_reorder') {
        assert.ok(Array.isArray(q.words) && q.words.length > 0, 'word_reorder must have words array');
      }
    }
  }
}

console.log(`✅ PASSED: All levels validated (${totalQuestionsChecked} questions, ${totalAudioChecked} listening audios verified).`);

// 3. Validate CBT scoring calculation logic
function computeScore(userAnswers, questions) {
  let listeningCorrect = 0;
  let readingCorrect = 0;
  let writingCorrect = 0;
  let listeningTotal = 0;
  let readingTotal = 0;
  let writingTotal = 0;

  questions.forEach((q) => {
    let isCorrect = false;
    if (q.type === 'word_reorder') {
      const assembled = Array.isArray(userAnswers[q.id]) ? userAnswers[q.id].join('') : (userAnswers[q.id] || '');
      isCorrect = assembled.replace(/[。\.，,\s]/g, '') === q.correct_answer.replace(/[。\.，,\s]/g, '');
    } else {
      isCorrect = userAnswers[q.id] === q.correct_answer || String(userAnswers[q.id]) === String(q.correct_answer);
    }

    if (q.section === 'listening') {
      listeningTotal += 1;
      if (isCorrect) listeningCorrect += 1;
    } else if (q.section === 'writing') {
      writingTotal += 1;
      if (isCorrect) writingCorrect += 1;
    } else {
      readingTotal += 1;
      if (isCorrect) readingCorrect += 1;
    }
  });

  const listeningScore = listeningTotal > 0 ? Math.round((listeningCorrect / listeningTotal) * 100) : 0;
  const readingScore = readingTotal > 0 ? Math.round((readingCorrect / readingTotal) * 100) : 0;
  const writingScore = writingTotal > 0 ? Math.round((writingCorrect / writingTotal) * 100) : 0;
  const totalScore = listeningScore + readingScore + writingScore;
  const isPassed = writingTotal > 0 ? totalScore >= 180 : totalScore >= 120;
  return { listeningScore, readingScore, writingScore, totalScore, isPassed };
}

const mockQuestions = [
  { id: 'Q1', section: 'listening', correct_answer: 'true' },
  { id: 'Q2', section: 'listening', correct_answer: 'A' },
  { id: 'Q3', section: 'reading', correct_answer: 'B' },
  { id: 'Q4', section: 'writing', type: 'word_reorder', correct_answer: '很多人是可以成功的。' },
];

const mockAnswersAllCorrect = { Q1: 'true', Q2: 'A', Q3: 'B', Q4: ['很多人', '是', '可以成功的'] };
const resFull = computeScore(mockAnswersAllCorrect, mockQuestions);
assert.strictEqual(resFull.totalScore, 300);
assert.strictEqual(resFull.isPassed, true);

console.log('✅ PASSED: Scoring algorithm simulation verified.');
console.log('ALL HSK 3.0 TESTS PASSED SUCCESFULLY.');
