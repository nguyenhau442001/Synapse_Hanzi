// tools/test_exam_srs_and_state.mjs
// Unit tests for Dexie v2 exam_mistake priority sorting, ExamSrsBridge, and ExamState transitions.

import 'fake-indexeddb/auto';
import assert from 'node:assert';
import { HanziMindDB } from '../src/islands/db.js';
import { recordExamMistakesToSrs, getNextMorningIso } from '../src/islands/ExamSrsBridge.js';
import {
  startExamSession,
  tickSectionTimer,
  setQuestionAnswer,
  toggleQuestionFlag,
  sessionStatus,
  activeSection,
  sectionTimeLeft,
  answers,
  flagged,
} from '../src/islands/ExamState.js';
import { normalizeExamPayload } from '../src/islands/ExamSchemaAdapter.js';

console.log('Testing Dexie v2 Reverse SRS & ExamState...');

// 1. Test Dexie v2 markExamMistakes + getPrioritizedDueCards
const testDb = new HanziMindDB('HanziMindExamTestDB_' + Date.now());
const pastDue = new Date(Date.now() - 3600_000).toISOString();

await testDb.saveCard('hsk4', 'zh2vi', 'normal_word', { due: pastDue, state: 2, reps: 3 });
await testDb.saveCard('hsk4', 'zh2vi', 'missed_word', { due: pastDue, state: 2, reps: 2 });

const result = await recordExamMistakesToSrs({
  wordIds: ['missed_word', 'new_missed_word'],
  level: 'hsk4',
  direction: 'zh2vi',
  database: testDb,
  storage: null,
});

assert.strictEqual(result.taggedCount, 2);

const tomorrow = new Date(getNextMorningIso());
tomorrow.setHours(8, 0, 0, 0);
const prioritized = await testDb.getPrioritizedDueCards(tomorrow);

assert.strictEqual(prioritized[0].tags.includes('exam_mistake'), true);
assert.strictEqual(prioritized[1].tags.includes('exam_mistake'), true);
assert.strictEqual(prioritized[2].wordId, 'normal_word');

await testDb.delete();

// 2. Test ExamState auto-section-advance (Listening -> Reading -> Writing -> Submitted)
const mockExam = normalizeExamPayload({
  exam_id: 'TEST_SIM',
  duration_minutes: 105,
  sections: {
    listening: [{ id: 'L1', question: 'Q1', options: ['A', 'B'], answer: 0 }],
    reading: [{ id: 'R1', question: 'Q2', options: ['A', 'B'], answer: 1 }],
    writing: [{ id: 'W1', keywords: ['保护'], min_chars: 80, prompt: 'Write' }],
  },
});

startExamSession(mockExam, true);
assert.strictEqual(sessionStatus.value, 'active');
assert.strictEqual(activeSection.value, 'listening');

setQuestionAnswer('L1', 0);
toggleQuestionFlag('L1');
assert.strictEqual(answers.value.L1, 0);
assert.strictEqual(flagged.value.L1, true);

sectionTimeLeft.value = 1;
assert.strictEqual(tickSectionTimer(), 'advanced');
assert.strictEqual(activeSection.value, 'reading');

sectionTimeLeft.value = 1;
assert.strictEqual(tickSectionTimer(), 'advanced');
assert.strictEqual(activeSection.value, 'writing');

sectionTimeLeft.value = 1;
assert.strictEqual(tickSectionTimer(), 'submitted');
assert.strictEqual(sessionStatus.value, 'submitted');

console.log('✅ PASSED: Dexie v2 Reverse SRS & ExamState auto-advance verified.');
