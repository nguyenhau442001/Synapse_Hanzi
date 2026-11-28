import assert from 'node:assert/strict';
import {
  loadAttempts, recordAttempt, tagAttemptReason, summarizeAttempts, splitAtTurnMarker,
} from '../src/islands/ListeningAttempts.js';
import { LISTENING_ATTEMPTS_KEY, LISTENING_ATTEMPTS_MAX } from '../src/islands/ListeningConstants.js';
import { resolveSyncKey } from '../src/islands/SyncRegistry.js';
import { mergeEntry, isValidEntry } from '../src/islands/SyncSnapshot.js';

class MemoryStorage {
  constructor() { this.map = new Map(); }
  getItem(k) { return this.map.has(k) ? this.map.get(k) : null; }
  setItem(k, v) { this.map.set(k, String(v)); }
}

const t0 = new Date('2026-11-28T10:00:00.000Z');
const t1 = new Date('2026-11-28T10:01:00.000Z');
const t2 = new Date('2026-11-28T10:02:00.000Z');

// Record and tag.
const store = new MemoryStorage();
assert.deepEqual(loadAttempts(store), []);
const wrong = recordAttempt(store, { questionId: 'H41001_L_01', examId: 'H41001', correct: false, choice: true, examMode: true }, t0);
const right = recordAttempt(store, { questionId: 'H41001_L_02', examId: 'H41001', correct: true, choice: false, examMode: true }, t1);
assert.equal(wrong.id, 'H41001_L_01@2026-11-28T10:00:00.000Z');
assert.equal(wrong.reason, null);
assert.equal(loadAttempts(store).length, 2);
assert.equal(tagAttemptReason(store, wrong.id, 'turn_trap', t2), true);
assert.equal(tagAttemptReason(store, right.id, 'misheard', t2), false, 'correct answers are not tagged');
assert.equal(tagAttemptReason(store, wrong.id, 'bogus', t2), false, 'unknown reasons are ignored');
assert.equal(tagAttemptReason(store, 'missing', 'misheard', t2), false);
const tagged = loadAttempts(store)[0];
assert.equal(tagged.reason, 'turn_trap');
assert.equal(tagged.updatedAt, t2.toISOString());

// Corrupt storage is tolerated.
const broken = new MemoryStorage();
broken.setItem(LISTENING_ATTEMPTS_KEY, '{oops');
assert.deepEqual(loadAttempts(broken), []);

// Cap.
const big = new MemoryStorage();
for (let i = 0; i < LISTENING_ATTEMPTS_MAX + 5; i++) {
  recordAttempt(big, { questionId: 'Q' + i, examId: 'E', correct: true, choice: true, examMode: false }, new Date(t0.getTime() + i * 1000));
}
const capped = loadAttempts(big);
assert.equal(capped.length, LISTENING_ATTEMPTS_MAX);
assert.equal(capped[0].questionId, 'Q5');

// Stats.
const stats = summarizeAttempts(loadAttempts(store));
assert.deepEqual(stats, {
  total: 2, correct: 1, wrong: 1, untagged: 0,
  reasons: { unknown_word: 0, misheard: 0, turn_trap: 1, too_fast: 0 },
});
assert.equal(summarizeAttempts(capped, 10).total, 10);
assert.equal(summarizeAttempts([]).total, 0);

// Turn markers.
assert.deepEqual(splitAtTurnMarker('我想去，但是没时间。'), { before: '我想去，', marker: '但是', after: '没时间。' });
assert.deepEqual(splitAtTurnMarker('没想到他其实很忙。'), { before: '', marker: '没想到', after: '他其实很忙。' });
assert.deepEqual(splitAtTurnMarker('今天天气不错。'), { before: '今天天气不错。', marker: '', after: '' });
assert.deepEqual(splitAtTurnMarker(undefined), { before: '', marker: '', after: '' });

// Sync: id_log merge keeps the newer copy and unions entries.
assert.equal(resolveSyncKey(LISTENING_ATTEMPTS_KEY).namespace, 'listening');
assert.equal(isValidEntry(LISTENING_ATTEMPTS_KEY, '[]'), true);
assert.equal(isValidEntry(LISTENING_ATTEMPTS_KEY, '{}'), false);
const base = { ...wrong };
const remoteTagged = { ...wrong, reason: 'misheard', updatedAt: t2.toISOString() };
const other = { ...right };
const merged = JSON.parse(mergeEntry(LISTENING_ATTEMPTS_KEY, JSON.stringify([base]), JSON.stringify([remoteTagged, other, { junk: 1 }])));
assert.equal(merged.length, 2);
assert.equal(merged[0].reason, 'misheard', 'remote reason tag wins over the untagged local copy');
assert.equal(merged[1].id, right.id);
const mergedBack = JSON.parse(mergeEntry(LISTENING_ATTEMPTS_KEY, JSON.stringify([remoteTagged]), JSON.stringify([base])));
assert.equal(mergedBack[0].reason, 'misheard', 'an older incoming copy does not erase a local tag');
assert.equal(JSON.parse(mergeEntry(LISTENING_ATTEMPTS_KEY, null, JSON.stringify([base]))).length, 1);

console.log('listening attempts: all tests passed');
