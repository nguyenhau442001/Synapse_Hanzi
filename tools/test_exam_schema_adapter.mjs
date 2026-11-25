// tools/test_exam_schema_adapter.mjs
// Unit tests for ExamSchemaAdapter normalizing both legacy CTI papers and new spec JSON.

import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert';
import { fileURLToPath } from 'node:url';
import {
  normalizeExamPayload,
  gradeQuestion,
  buildWritingExport,
} from '../src/islands/ExamSchemaAdapter.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('Testing ExamSchemaAdapter...');

// 1. Test new spec JSON schema
const specSample = {
  exam_id: 'HSK3_LV4_MOCK_01',
  duration_minutes: 105,
  sections: {
    listening: [
      {
        id: 'L1',
        part: 1,
        audio_url: 'assets/audio/mock01_l1.mp3',
        transcript: '他虽然刚来公司不久，但工作能力很强。',
        question: '关于他，可以知道什么？',
        options: ['A. 刚换工作', 'B. 能力很强', 'C. 不喜欢公司', 'D. 经验不足'],
        answer: 1,
        explanation: "Key phrase '但工作能力很强'.",
      },
    ],
    reading: [
      {
        id: 'R1',
        part: 2,
        type: 'sentence_ordering',
        chunks: ['对身体健康', '每天坚持运动', '有很大的好处'],
        answer_order: [1, 0, 2],
        full_sentence: '每天坚持运动对身体健康有很大的好处。',
      },
    ],
    writing: [
      {
        id: 'W1',
        part: 1,
        keywords: ['不仅', '而且', '环境', '保护', '责任'],
        min_chars: 80,
        prompt: 'Write a short paragraph on environmental protection.',
      },
    ],
  },
};

const normalizedSpec = normalizeExamPayload(specSample);
assert.strictEqual(normalizedSpec.examId, 'HSK3_LV4_MOCK_01');
assert.strictEqual(normalizedSpec.durationMinutes, 105);
assert.deepStrictEqual(normalizedSpec.sectionOrder, ['listening', 'reading', 'writing']);

const l1 = normalizedSpec.sections.listening.questions[0];
assert.strictEqual(l1.audioUrl, 'assets/audio/mock01_l1.mp3');
assert.strictEqual(l1.correctAnswer, 1);
assert.strictEqual(gradeQuestion(l1, 1), true);
assert.strictEqual(gradeQuestion(l1, 0), false);

const r1 = normalizedSpec.sections.reading.questions[0];
assert.strictEqual(r1.type, 'sentence_ordering');
assert.strictEqual(gradeQuestion(r1, [1, 0, 2]), true);
assert.strictEqual(gradeQuestion(r1, [0, 1, 2]), false);

const w1 = normalizedSpec.sections.writing.questions[0];
assert.strictEqual(w1.type, 'hanzi_essay');
assert.strictEqual(w1.minChars, 80);
assert.strictEqual(gradeQuestion(w1, '不仅如此，而且保护环境是每个人的责任。'), null);

const exported = buildWritingExport(normalizedSpec, { W1: '不仅如此，而且保护环境是每个人的责任。' });
assert.strictEqual(exported.jsonPayload.responses[0].charCount, 19);
assert.ok(exported.markdown.includes('## W1 (19/80 chars)'));

// 2. Test legacy CTI JSON paper (hsk30_l4_specimen01.json)
const legacyPath = path.join(rootDir, 'database/exams/hsk30/level4/hsk30_l4_specimen01.json');
const legacyRaw = JSON.parse(fs.readFileSync(legacyPath, 'utf-8'));
const normalizedLegacy = normalizeExamPayload(legacyRaw);

assert.strictEqual(normalizedLegacy.examId, 'hsk30_l4_specimen01');
assert.strictEqual(normalizedLegacy.durationMinutes, 105);
assert.ok(normalizedLegacy.sections.listening.questions.length > 0);
assert.ok(normalizedLegacy.sections.reading.questions.length > 0);
assert.strictEqual(normalizedLegacy.sections.listening.questions[0].type, 'true_false');
assert.strictEqual(normalizedLegacy.sections.listening.questions[0].audioUrl, 'assets/audio/exams/hsk30/level4/h41001_l01.mp3');

console.log('✅ PASSED: ExamSchemaAdapter normalized both new spec and legacy CTI papers.');
