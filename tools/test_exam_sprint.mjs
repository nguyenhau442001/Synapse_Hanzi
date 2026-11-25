// tools/test_exam_sprint.mjs
import assert from 'node:assert/strict';
import 'fake-indexeddb/auto';
import { HanziMindDB } from '../src/islands/db.js';
import {
  computeExamCountdown,
  extractHanViet,
  findWordFamily,
  isConfusablePinyin,
  toggleSprintLevel,
  buildSlotQueue,
  buildReverseSrsQuiz,
  loadSprintPreferences,
  updateSprintConfig,
  sprintConfig,
} from '../src/islands/SprintState.js';

async function runTests() {
  // 1. Test countdown calculations
  const now = new Date(2026, 10, 25, 10, 0, 0); // Nov 25, 2026
  const unset = computeExamCountdown('', 1200, now);
  assert.equal(unset.status, 'unset');

  const today = computeExamCountdown('2026-11-25', 50, now);
  assert.equal(today.status, 'today');

  const upcoming = computeExamCountdown('2026-12-15', 1000, now);
  assert.equal(upcoming.status, 'upcoming');
  assert.equal(upcoming.daysLeft, 20);
  assert.equal(upcoming.recommendedQuota, Math.ceil(1000 / 17));

  const passed = computeExamCountdown('2026-11-20', 500, now);
  assert.equal(passed.status, 'passed');

  // 2. Test Hán Việt, Word Family, and Confusable Pinyin detection
  const mockDict = { '效': 'hiệu', '率': 'suất' };
  assert.equal(extractHanViet('效率', mockDict), 'hiệu suất');

  const pool = [
    { id: 1, level: 'hsk30_4', hanzi: '交流', pinyin: 'jiāoliú', meaning: 'giao lưu' },
    { id: 2, level: 'hsk30_4', hanzi: '交通', pinyin: 'jiāotōng', meaning: 'giao thông' },
    { id: 3, level: 'hsk30_4', hanzi: '交朋友', pinyin: 'jiāo péngyou', meaning: 'kết bạn' },
    { id: 4, level: 'hsk30_4', hanzi: '责任', pinyin: 'zérèn', meaning: 'trách nhiệm' },
    { id: 5, level: 'hsk30_4', hanzi: '克服', pinyin: 'kèfú', meaning: 'khắc phục' },
  ];

  const family = findWordFamily('交流', pool);
  assert.equal(family.length, 2);
  assert.ok(family.some((w) => w.hanzi === '交通'));
  assert.ok(family.some((w) => w.hanzi === '交朋友'));

  assert.equal(isConfusablePinyin('zérèn'), true);
  assert.equal(isConfusablePinyin('kèfú'), false);
  assert.equal(isConfusablePinyin('jīngyàn'), true);

  // 3. Test IndexedDB v3 suspend & due queue exclusion
  const testDb = new HanziMindDB(`TestSprintDB_${Date.now()}`);
  await testDb.open();

  await testDb.setCardSuspended('hsk30_4', 'zh2vi', 1, true);
  await testDb.saveCard('hsk30_4', 'zh2vi', 4, {
    due: new Date(Date.now() - 10000).toISOString(),
    state: 2,
    reps: 2,
    tags: ['exam_mistake'],
  });

  const dueCards = await testDb.getDueCards(new Date());
  assert.equal(dueCards.length, 1);
  assert.equal(dueCards[0].wordId, 4);

  const cards = await testDb.cards.toArray();
  const cardMap = new Map(cards.map((c) => [c.id, c]));

  // 4. Test HSK level toggle & Slot Queue builders
  assert.deepEqual(toggleSprintLevel(['hsk30_1', 'hsk30_2'], 'hsk30_1'), ['hsk30_2']);
  assert.deepEqual(toggleSprintLevel(['hsk30_4'], 'hsk30_2'), ['hsk30_2', 'hsk30_4']);
  assert.deepEqual(toggleSprintLevel(['hsk30_3'], 'hsk30_3'), ['hsk30_3']); // keeps at least one level

  const morningQueue = buildSlotQueue('morning', pool, cardMap, {}, { dailyNewQuota: 4 }, new Date());
  assert.equal(morningQueue.length, 1);
  assert.equal(morningQueue[0].isMistakePriority, true);

  const noonQueue = buildSlotQueue('noon', pool, cardMap, { noonNewCardKeys: [] }, { dailyNewQuota: 4 }, new Date());
  assert.equal(noonQueue.length, 2);

  const nightQueue = buildSlotQueue(
    'night',
    pool,
    cardMap,
    { noonNewCardKeys: ['hsk30_4_zh2vi_5', 'hsk30_4_zh2vi_4'], eveningNewCardKeys: [] },
    { dailyNewQuota: 4 },
    new Date()
  );
  assert.equal(nightQueue.length, 2);
  // Confusable pinyin (zérèn) should be prioritized first
  assert.equal(nightQueue[0].hanzi, '责任');

  // 5. Test Reverse SRS Quiz builder & preferences persistence
  const quiz = buildReverseSrsQuiz(pool, cardMap, 3);
  assert.equal(quiz.length, 3);
  assert.ok(quiz[0].choices.includes(quiz[0].correctMeaning));

  await updateSprintConfig({ examDate: '2026-12-20', dailyNewQuota: 80 }, testDb);
  await loadSprintPreferences(testDb);
  assert.equal(sprintConfig.value.examDate, '2026-12-20');
  assert.equal(sprintConfig.value.dailyNewQuota, 80);

  await testDb.delete();
  console.log('test_exam_sprint.mjs: all assertions passed!');
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
