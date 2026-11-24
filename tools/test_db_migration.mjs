#!/usr/bin/env node
import 'fake-indexeddb/auto';
import assert from 'node:assert';
import { HanziMindDB, migrateFromLocalStorage } from '../src/islands/db.js';

console.log('Testing HanziMindDB & localStorage Auto-Migration...');

async function runTests() {
  const db = new HanziMindDB('TestHanziMindDB_' + Date.now());

  // 1. Prepare simulated localStorage mock with legacy HSK progress
  const mockStorageData = {
    'hsk_hsk1_srs_v3': JSON.stringify({
      schemaVersion: 3,
      migratedFromV2: false,
      cards: {
        '101': {
          due: '2026-11-20T00:00:00.000Z',
          stability: 2.5,
          difficulty: 3.1,
          reps: 3,
          lapses: 0,
          state: 2,
          last_review: '2026-11-18T10:00:00.000Z'
        },
        '102': {
          due: '2026-11-25T00:00:00.000Z',
          stability: 5.0,
          difficulty: 2.0,
          reps: 5,
          lapses: 0,
          state: 2,
          last_review: '2026-11-20T10:00:00.000Z'
        }
      }
    }),
    'hsk_hsk1_review_log_v1': JSON.stringify([
      {
        wordId: 101,
        rating: 'good',
        stateBefore: 1,
        stateAfter: 2,
        timestamp: '2026-11-18T10:00:00.000Z'
      }
    ])
  };

  const mockStorage = {
    length: Object.keys(mockStorageData).length,
    key: (i) => Object.keys(mockStorageData)[i],
    getItem: (k) => mockStorageData[k] || null
  };

  // 2. Run Migration
  const result = await migrateFromLocalStorage(db, mockStorage);
  assert.strictEqual(result.migratedCards, 2, 'Must migrate exactly 2 cards');
  assert.strictEqual(result.migratedLogs, 1, 'Must migrate exactly 1 review log');
  assert.strictEqual(result.alreadyMigrated, false, 'Must indicate first-time migration');

  // 3. Verify querying cards by deck index [level+direction]
  const hsk1Cards = await db.getCardsForDeck('hsk1', 'zh2vi');
  assert.strictEqual(hsk1Cards.length, 2, 'Should find 2 cards in hsk1 zh2vi deck');
  assert.strictEqual(hsk1Cards[0].stability, 2.5);

  // 4. Verify querying due cards
  const referenceDate = new Date('2026-11-22T00:00:00.000Z');
  const dueCards = await db.getDueCards(referenceDate);
  assert.strictEqual(dueCards.length, 1, 'Only card 101 should be due before reference date');
  assert.strictEqual(dueCards[0].wordId, 101);

  // 5. Verify review logs
  const logs = await db.reviewLogs.toArray();
  assert.strictEqual(logs.length, 1);
  assert.strictEqual(logs[0].wordId, 101);
  assert.strictEqual(logs[0].rating, 'good');

  // 6. Verify idempotent migration (running second time does not duplicate)
  const secondResult = await migrateFromLocalStorage(db, mockStorage);
  assert.strictEqual(secondResult.alreadyMigrated, true, 'Subsequent runs must be skipped cleanly');

  await db.delete();
  console.log('✅ PASSED: All HanziMindDB & migration tests passed cleanly!');
}

runTests().catch(err => {
  console.error('❌ FAILED:', err);
  process.exit(1);
});
