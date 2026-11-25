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
  extractListeningItemsFromExam,
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

// 3. Test extractListeningItemsFromExam across HSK 1-4 and HSKK Primary
const levelExpectations = [
  { key: 'hsk1', file: 'database/exams/hsk30/level1/hsk30_l1_specimen01.json', minCount: 20 },
  { key: 'hsk2', file: 'database/exams/hsk30/level2/hsk30_l2_specimen01.json', minCount: 35 },
  { key: 'hsk3', file: 'database/exams/hsk30/level3/hsk30_l3_specimen01.json', minCount: 40 },
  { key: 'hsk4', file: 'database/exams/hsk30/level4/hsk30_l4_specimen01.json', minCount: 45 },
];

for (const { key, file, minCount } of levelExpectations) {
  const raw = JSON.parse(fs.readFileSync(path.join(rootDir, file), 'utf-8'));
  const items = extractListeningItemsFromExam(raw, key, { listeningOnly: true });
  assert.ok(items.length >= minCount, `${key} expected >= ${minCount} items, got ${items.length}`);
  for (const item of items) {
    assert.ok(item.audioClip, `${key} item ${item.id} missing audioClip`);
    assert.ok(item.targetZh && !item.targetZh.includes('★'), `${key} item ${item.id} invalid targetZh: ${item.targetZh}`);
  }
}

// HSK 4 Part 1 uses transcript.full_zh and transcript.full_vi
const hsk4Items = extractListeningItemsFromExam(legacyRaw, 'hsk4', { listeningOnly: true });
assert.ok(hsk4Items[0].targetZh.includes('树林里走走'), 'HSK 4 Q1 should extract transcript.full_zh');
assert.ok(hsk4Items[0].meaningVi.includes('rừng cây'), 'HSK 4 Q1 should extract transcript.full_vi');

// HSKK Primary has repeat/answer_short/answer_open sections instead of listening
const hskkRaw = JSON.parse(fs.readFileSync(path.join(rootDir, 'database/exams/hskk/primary/hskk_primary_specimen01.json'), 'utf-8'));
const hskkItems = extractListeningItemsFromExam(hskkRaw, 'hskk_primary', { listeningOnly: false });
assert.strictEqual(hskkItems.length, 27);

// Legacy array + parts format compatibility
const legacyArraySample = {
  id: 'legacy_arr',
  sections: [
    {
      id: 'listening',
      parts: [
        { questions: [{ number: 1, audio_clip: 'a.mp3', content: { text: '你好' }, explanation_vi: 'Xin chào' }] },
      ],
    },
  ],
};
const legacyArrayItems = extractListeningItemsFromExam(legacyArraySample, 'hsk1');
assert.strictEqual(legacyArrayItems.length, 1);
assert.strictEqual(legacyArrayItems[0].targetZh, '你好');
assert.strictEqual(legacyArrayItems[0].meaningVi, 'Xin chào');

console.log('✅ PASSED: ExamSchemaAdapter normalized both new spec and legacy CTI papers.');
