import assert from 'node:assert/strict';
import { isStudiedCard, compactSrsCards, compactStoredSrsDecks, SRS_DECK_KEY_PATTERN } from '../src/islands/SrsCompaction.js';

class MemoryStorage {
  constructor(entries = {}) { this.map = new Map(Object.entries(entries)); }
  get length() { return this.map.size; }
  key(i) { return [...this.map.keys()][i] ?? null; }
  getItem(k) { return this.map.has(k) ? this.map.get(k) : null; }
  setItem(k, v) { this.map.set(k, String(v)); }
}

const fresh = { due: '2026-11-28T00:00:00.000Z', state: 0, reps: 0, last_review: null };
const studied = { due: '2026-12-01T00:00:00.000Z', state: 2, reps: 3, last_review: '2026-11-27T00:00:00.000Z' };
const relearnNoReps = { due: '2026-11-28T00:00:00.000Z', state: 3, reps: 0, last_review: '2026-11-27T00:00:00.000Z' };

assert.equal(isStudiedCard(fresh), false);
assert.equal(isStudiedCard(null), false);
assert.equal(isStudiedCard(studied), true);
assert.equal(isStudiedCard(relearnNoReps), true, 'a reviewed card is kept even without reps');

assert.deepEqual(compactSrsCards({ a: fresh, b: studied, c: relearnNoReps }), { b: studied, c: relearnNoReps });
assert.deepEqual(compactSrsCards(undefined), {});

for (const key of ['hsk_hsk1_srs_v3', 'hsk_hsk30_7_srs_v3', 'hsk_hsk2_srs_v3_listen', 'hsk_hsk3_srs_v3_vi2zh']) {
  assert.ok(SRS_DECK_KEY_PATTERN.test(key), key);
}
for (const key of ['hsk_hsk1_review_log_v1', 'hsk_auth_session_v1', 'hsk_hsk1_srs_v3_other']) {
  assert.ok(!SRS_DECK_KEY_PATTERN.test(key), key);
}

{
  const cards = { w1: studied };
  for (let i = 0; i < 100; i++) cards['n' + i] = fresh;
  const deck = JSON.stringify({ schemaVersion: 3, migratedFromV2: true, cards });
  const storage = new MemoryStorage({ hsk_hsk30_7_srs_v3: deck, hsk_hsk1_review_log_v1: '[]', other: 'x' });
  const result = compactStoredSrsDecks(storage);
  assert.equal(result.decks, 1);
  assert.ok(result.freedChars > 0);
  const saved = JSON.parse(storage.getItem('hsk_hsk30_7_srs_v3'));
  assert.deepEqual(saved, { schemaVersion: 3, migratedFromV2: true, cards: { w1: studied } });
  assert.equal(storage.getItem('other'), 'x');
  assert.equal(compactStoredSrsDecks(storage).decks, 0, 'already compact decks are not rewritten');
}

{
  // Malformed values are left untouched; a failing write keeps the original deck.
  const storage = new MemoryStorage({ hsk_hsk1_srs_v3: '{not json', hsk_hsk2_srs_v3: JSON.stringify({ schemaVersion: 3, cards: { a: fresh } }) });
  storage.setItem = () => { throw new Error('QuotaExceededError'); };
  assert.equal(compactStoredSrsDecks(storage).decks, 0);
  assert.equal(storage.getItem('hsk_hsk1_srs_v3'), '{not json');
}

console.log('srs compaction tests passed');
