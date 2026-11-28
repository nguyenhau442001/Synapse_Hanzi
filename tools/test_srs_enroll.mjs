import assert from 'node:assert/strict';

class MemoryStorage {
  constructor() { this.map = new Map(); }
  get length() { return this.map.size; }
  key(i) { return [...this.map.keys()][i] ?? null; }
  getItem(k) { return this.map.has(k) ? this.map.get(k) : null; }
  setItem(k, v) { this.map.set(k, String(v)); }
  removeItem(k) { this.map.delete(k); }
}
globalThis.localStorage = new MemoryStorage();
globalThis.window = globalThis;
globalThis.dispatchEvent = () => true;

const VOCAB = {
  'database/vocabs/hsk1_vocabularies.json': [{ id: 76, hanzi: '朋友' }],
  'database/vocabs/hsk4_vocabularies.json': [{ id: 300, hanzi: '领带' }],
  'database/vocabs/hsk3_0/level1_vocabularies.json': [{ id: 535, hanzi: '了' }, { id: 350, hanzi: '休息' }],
  'database/vocabs/hsk3_0/level3_vocabularies.json': [{ id: 12, hanzi: '领带' }],
};
globalThis.fetch = async (url) => ({ ok: true, status: 200, json: async () => VOCAB[url] || [] });

const { vocabRefFromWordId, findVocabRef, resolveVocabRef, enrollForReview, enrollStatus } = await import('../src/islands/SrsEnroll.js');
const { readSrsRecord } = await import('../src/islands/StorageEngine.js');
const { SRS } = await import('../src/islands/SrsEngine.js');

// Graded-reading ids point into the HSK 3.0 decks.
assert.deepEqual(vocabRefFromWordId('hsk1_535', '了'), { level: 'hsk30_1', id: '535', hanzi: '了' });
assert.equal(vocabRefFromWordId('char_abc', '了'), null);
assert.equal(vocabRefFromWordId(undefined, '了'), null);

// Lowest HSK 2.0 level wins when the word is not scheduled anywhere yet.
assert.deepEqual(await findVocabRef('领带'), { level: 'hsk4', id: '300', hanzi: '领带' });
assert.equal(await findVocabRef('玛丽'), null, 'words outside every deck have no ref');

// A valid id is trusted (compound containing the token); a stale id falls back to hanzi search.
assert.deepEqual(await resolveVocabRef('hsk1_350', '息'), { level: 'hsk30_1', id: '350', hanzi: '休息' });
assert.deepEqual(await resolveVocabRef('hsk1_535', '领带'), { level: 'hsk4', id: '300', hanzi: '领带' });

// Enrolling stores a persisted, due-soon Learning card in the real deck key.
const ref = { level: 'hsk4', id: '300', hanzi: '领带' };
assert.equal(enrollStatus(ref), 'untracked');
assert.equal(enrollForReview(ref), true);
const card = readSrsRecord('hsk4').cards['300'];
assert.ok(card, 'card is persisted (not dropped by compaction)');
assert.equal(card.state, SRS.State.Learning);
assert.equal(SRS.isDue(card, new Date()), true, 'enrolled card is due immediately');
assert.equal(enrollStatus(ref), 'scheduled');
assert.equal(enrollForReview(ref), false, 'second enroll is a no-op');

// Once scheduled in HSK 3.0 level 3 too, lookup still prefers the deck that already has the card.
assert.deepEqual(await findVocabRef('领带'), ref);

console.log('test_srs_enroll: ok');
