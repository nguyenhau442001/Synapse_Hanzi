// Tests for the FSRS scheduler wrapper (src/islands/SrsEngine.js) and the progress storage /
// migration logic (src/islands/StorageEngine.js).
// Run: node tools/test_srs_engine.mjs
import assert from 'node:assert/strict';

// StorageEngine persists to localStorage; give Node an in-memory one.
const store = new Map();
globalThis.localStorage = {
  getItem: (key) => (store.has(key) ? store.get(key) : null),
  setItem: (key, value) => store.set(key, String(value)),
  removeItem: (key) => store.delete(key),
  clear: () => store.clear(),
};

const { SRS } = await import('../src/islands/SrsEngine.js');
const storage = await import('../src/islands/StorageEngine.js');

let passed = 0;
function test(name, fn) {
  store.clear();
  fn();
  passed += 1;
  console.log('ok -', name);
}

const T0 = new Date('2026-03-01T08:00:00Z');
const MIN = 60 * 1000;
const DAY = 24 * 60 * MIN;
const at = (ms) => new Date(T0.getTime() + ms);

test('formatInterval uses compact Vietnamese units', () => {
  assert.equal(SRS.formatInterval(30 * 1000), '<1p');
  assert.equal(SRS.formatInterval(MIN), '1p');
  assert.equal(SRS.formatInterval(10 * MIN), '10p');
  assert.equal(SRS.formatInterval(3 * 60 * MIN), '3g');
  assert.equal(SRS.formatInterval(DAY), '1n');
  assert.equal(SRS.formatInterval(3 * DAY), '3n');
  assert.equal(SRS.formatInterval(60 * DAY), '2th');
  assert.equal(SRS.formatInterval(548 * DAY), '1,5 năm');
});

test('preview of a new card orders the four grades by interval', () => {
  const card = SRS.createNewCard(T0);
  const p = SRS.preview(card, T0, 0.9);
  assert.deepEqual(Object.keys(p).sort(), ['again', 'easy', 'good', 'hard']);
  assert.ok(p.again.intervalMs < p.hard.intervalMs, 'again < hard');
  assert.ok(p.hard.intervalMs < p.good.intervalMs, 'hard < good');
  assert.ok(p.good.intervalMs < p.easy.intervalMs, 'good < easy');
  assert.equal(p.again.intervalText, '1p');
  assert.equal(p.good.intervalText, '10p');
  assert.ok(p.easy.intervalMs >= DAY, 'easy graduates straight to days');
});

test('preview matches the interval review() actually schedules', () => {
  let card = SRS.createNewCard(T0);
  card = SRS.review(card, 'easy', T0, 0.9).card;
  const when = new Date(card.due);
  const p = SRS.preview(card, when, 0.9);
  const reviewed = SRS.review(card, 'good', when, 0.9).card;
  assert.equal(new Date(reviewed.due).toISOString(), p.good.due);
});

test('review returns real FSRS cards without the legacy status field', () => {
  const result = SRS.review(SRS.createNewCard(T0), 'good', T0, 0.9);
  assert.equal(result.card.last_rating, 'good');
  assert.equal('status' in result.card, false);
  assert.equal(result.stateBefore, SRS.State.New);
  assert.equal(result.card.state, SRS.State.Learning);
  assert.equal(new Date(result.card.due).getTime() - T0.getTime(), 10 * MIN);
  assert.ok(result.card.stability > 0 && result.card.difficulty > 0);
  assert.equal(result.card.reps, 1);
});

test('successful reviews grow the interval; a lapse sends the card to relearning', () => {
  let card = SRS.createNewCard(T0);
  let now = T0;
  card = SRS.review(card, 'easy', now, 0.9).card;
  const intervals = [];
  for (let i = 0; i < 3; i += 1) {
    now = new Date(card.due);
    const before = now.getTime();
    card = SRS.review(card, 'good', now, 0.9).card;
    intervals.push(new Date(card.due).getTime() - before);
  }
  assert.ok(intervals[1] > intervals[0] && intervals[2] > intervals[1], `growing: ${intervals}`);
  const lapsesBefore = card.lapses;
  now = new Date(card.due);
  card = SRS.review(card, 'again', now, 0.9).card;
  assert.equal(card.state, SRS.State.Relearning);
  assert.equal(card.lapses, lapsesBefore + 1);
  assert.ok(new Date(card.due).getTime() - now.getTime() < 60 * MIN, 'relearning step is minutes');
});

test('statusFromCard derives Chưa học / Cần ôn / Đã nhớ from state and due', () => {
  const fresh = SRS.createNewCard(T0);
  assert.equal(storage.statusFromCard(fresh, T0), null);
  const learning = SRS.review(fresh, 'good', T0, 0.9).card;
  assert.equal(storage.statusFromCard(learning, T0), 'unknown');
  const graduated = SRS.review(fresh, 'easy', T0, 0.9).card;
  assert.equal(storage.statusFromCard(graduated, T0), 'known');
  assert.equal(storage.statusFromCard(graduated, at(400 * DAY)), 'unknown', 'overdue review card is due');
  // A stale stored status must not win over the real schedule.
  assert.equal(storage.statusFromCard({ ...graduated, status: 'unknown' }, T0), 'known');
});

test('legacy v2 progress migrates: known -> reviewed with a short interval, unknown -> due now', () => {
  const words = [{ id: 1 }, { id: 2 }, { id: 3 }];
  const cards = storage.migrateLegacyProgress('hsk1', words, { 1: 'known', 2: 'unknown' }, 0.9);
  const now = Date.now();
  assert.equal(cards[1].state, SRS.State.Review);
  assert.equal(cards[1].reps, 1);
  const knownDays = (new Date(cards[1].due).getTime() - now) / DAY;
  assert.ok(knownDays > 0.9 && knownDays < 8.1, `known due in ${knownDays} days`);
  assert.equal(storage.statusFromCard(cards[1]), 'known');
  assert.notEqual(cards[2].state, SRS.State.New);
  assert.ok(new Date(cards[2].due).getTime() <= Date.now());
  assert.equal(storage.statusFromCard(cards[2]), 'unknown');
  assert.equal(cards[3].state, SRS.State.New);
  assert.equal(storage.statusFromCard(cards[3]), null);
});

test('loadSrsForLevel migrates from the old progress key when no v3 record exists', () => {
  localStorage.setItem('hsk_hsk1_progress_v2', JSON.stringify({ 1: 'known', 2: 'unknown' }));
  const cards = storage.loadSrsForLevel('hsk1', [{ id: 1 }, { id: 2 }, { id: 3 }], storage.readSavedLevelProgressLegacy('hsk1'));
  const progress = storage.progressFromCards(cards);
  assert.deepEqual(progress, { 1: 'known', 2: 'unknown' });
  const saved = storage.readSrsRecord('hsk1');
  assert.equal(saved.schemaVersion, storage.SRS_SCHEMA_VERSION);
  assert.equal(saved.migratedFromV2, true);
  // The old key stays as a fallback.
  assert.ok(localStorage.getItem('hsk_hsk1_progress_v2'));
});

test('loadSrsForLevel keeps v3 schedules from the old two-button build and drops stored status', () => {
  const future = at(5 * DAY).toISOString();
  const oldCard = { ...SRS.review(SRS.createNewCard(T0), 'easy', T0, 0.9).card, status: 'known', due: future };
  storage.saveSrsRecord('hsk2', { 7: oldCard }, true);
  const cards = storage.loadSrsForLevel('hsk2', [{ id: 7 }, { id: 8 }], {});
  assert.equal(cards[7].due, future, 'due date preserved');
  assert.equal('status' in cards[7], false, 'status dropped');
  assert.equal(cards[8].state, SRS.State.New, 'missing word added as new');
  assert.equal('status' in storage.readSrsRecord('hsk2').cards[7], false, 'cleanup persisted');
});

test('reviewSrsCard persists the card and appends a review log entry', () => {
  storage.saveSrsRecord('hsk3', { 5: SRS.createNewCard(T0) }, false);
  const cards = storage.readSrsRecord('hsk3').cards;
  storage.reviewSrsCard('hsk3', 5, 'hard', cards);
  const saved = storage.readSrsRecord('hsk3').cards[5];
  assert.equal(saved.last_rating, 'hard');
  assert.equal(saved.state, SRS.State.Learning);
  const log = storage.readSrsReviewLog('hsk3');
  assert.equal(log.length, 1);
  assert.equal(log[0].rating, 'hard');
  assert.equal(log[0].stateBefore, SRS.State.New);
});

console.log(`\n${passed} SRS engine tests passed`);
