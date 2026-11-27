import assert from 'node:assert/strict';
import { resolveSyncKey, listSyncKeys } from '../src/islands/SyncRegistry.js';
import { buildBackup, parseBackup, mergeEntry, applyBackup } from '../src/islands/SyncSnapshot.js';
import { BACKUP_TYPE, BACKUP_SCHEMA_VERSION, BACKUP_MAX_FILE_BYTES } from '../src/islands/SyncConstants.js';

class MemoryStorage {
  constructor(initial = {}) { this.map = new Map(Object.entries(initial)); }
  get length() { return this.map.size; }
  key(i) { return [...this.map.keys()][i] ?? null; }
  getItem(k) { return this.map.has(k) ? this.map.get(k) : null; }
  setItem(k, v) { this.map.set(k, String(v)); }
  removeItem(k) { this.map.delete(k); }
}

const deck = cards => JSON.stringify({ schemaVersion: 3, migratedFromV2: true, cards });
const card = (lastReview, reps) => ({ due: '2026-12-01T00:00:00.000Z', last_review: lastReview, reps, state: 2 });

// Registry: allowlist, namespaces, device-only keys excluded.
assert.equal(resolveSyncKey('hsk_hsk30_1_srs_v3').namespace, 'srs:hsk30_1:zh2vi');
assert.equal(resolveSyncKey('hsk_hsk2_srs_v3_listen').namespace, 'srs:hsk2:listen');
assert.equal(resolveSyncKey('hsk_hsk30_4_review_log_v1_vi2zh').namespace, 'review_log:hsk30_4:vi2zh');
assert.equal(resolveSyncKey('hsk_study_activity_v1').namespace, 'activity');
assert.equal(resolveSyncKey('hsk_profile_name').rule.personal, true);
for (const deviceKey of ['hsk_theme', 'hsk_theme_manual', 'hsk_sidebar_tab', 'hsk_pwa_install_dismissed_until', 'hsk_dexie_migration_v1', 'firebase:authUser', '__proto__']) {
  assert.equal(resolveSyncKey(deviceKey), null, deviceKey);
}

// Build: only allowlisted keys are exported.
const source = new MemoryStorage({
  hsk_hsk1_srs_v3: deck({ 1: card('2026-11-01T00:00:00.000Z', 3) }),
  hsk_hsk1_review_log_v1: JSON.stringify([{ wordId: 1, timestamp: '2026-11-01T00:00:00.000Z', rating: 'good' }]),
  hsk_theme: 'dark',
  hsk_study_activity_v1: JSON.stringify({ days: { '2026-11-01': { words: [1], seconds: 60 } } }),
});
assert.deepEqual(listSyncKeys(source), ['hsk_hsk1_review_log_v1', 'hsk_hsk1_srs_v3', 'hsk_study_activity_v1']);
const backup = buildBackup(source, { appVersion: '9.9.9', now: new Date('2026-11-27T00:00:00.000Z') });
assert.equal(backup.type, BACKUP_TYPE);
assert.equal(backup.schemaVersion, BACKUP_SCHEMA_VERSION);
assert.equal(backup.exportedAt, '2026-11-27T00:00:00.000Z');
assert.equal('hsk_theme' in backup.entries, false);

// Parse: round trip.
const parsed = parseBackup(JSON.stringify(backup));
assert.equal(parsed.ok, true);
assert.equal(parsed.skipped, 0);
assert.deepEqual(parsed.backup.entries, backup.entries);

// Parse: rejects wrong type, future schema, junk, oversize.
assert.equal(parseBackup('not json').ok, false);
assert.equal(parseBackup(JSON.stringify({ ...backup, type: 'other' })).ok, false);
assert.equal(parseBackup(JSON.stringify({ ...backup, schemaVersion: BACKUP_SCHEMA_VERSION + 1 })).ok, false);
assert.equal(parseBackup(JSON.stringify({ ...backup, entries: [] })).ok, false);
assert.equal(parseBackup(' '.repeat(BACKUP_MAX_FILE_BYTES + 1)).reason, 'too_large');

// Parse: a crafted file cannot write device keys, unsafe keys or malformed values.
const hostile = parseBackup(JSON.stringify({
  type: BACKUP_TYPE,
  schemaVersion: 1,
  entries: {
    hsk_theme: 'x',
    'firebase:authUser:key': '{"token":"stolen"}',
    hsk_hsk1_srs_v3: '{"schemaVersion":2,"cards":{}}',
    hsk_hsk1_review_log_v1: '{"not":"array"}',
    hsk_curriculum_v1: 'not json',
    hsk_profile_name: 42,
    hsk_writing_v1: '{"chars":{}}',
  },
}).replace('"hsk_theme"', '"__proto__"'));
assert.equal(hostile.ok, true);
assert.deepEqual(Object.keys(hostile.backup.entries), ['hsk_writing_v1']);
assert.equal(hostile.skipped, 6);
assert.equal({}.polluted, undefined);

// Merge SRS: newer review wins per card, local-only and incoming-only cards are kept,
// a never-reviewed incoming card does not overwrite local progress, unsafe ids are dropped.
const localDeck = deck({
  1: card('2026-11-10T00:00:00.000Z', 5),
  2: card('2026-11-01T00:00:00.000Z', 2),
  3: card('2026-11-05T00:00:00.000Z', 4),
});
const incomingDeck = JSON.stringify({
  schemaVersion: 3,
  cards: {
    1: card('2026-11-02T00:00:00.000Z', 3),
    2: card('2026-11-20T00:00:00.000Z', 6),
    3: card(null, 0),
    4: card('2026-11-03T00:00:00.000Z', 1),
    constructor: card('2026-11-30T00:00:00.000Z', 9),
  },
});
const mergedDeck = JSON.parse(mergeEntry('hsk_hsk1_srs_v3', localDeck, incomingDeck));
assert.equal(mergedDeck.schemaVersion, 3);
assert.equal(mergedDeck.cards[1].reps, 5);
assert.equal(mergedDeck.cards[2].reps, 6);
assert.equal(mergedDeck.cards[3].reps, 4);
assert.equal(mergedDeck.cards[4].reps, 1);
assert.equal(Object.prototype.hasOwnProperty.call(mergedDeck.cards, 'constructor'), false);

// Merge SRS: invalid incoming cards are rejected by the normalizer.
const rejectAll = JSON.parse(mergeEntry('hsk_hsk1_srs_v3', null, incomingDeck, () => null));
assert.deepEqual(rejectAll.cards, {});

// Merge logs: union, de-duplicated, sorted, junk entries dropped.
const logA = { wordId: 1, timestamp: '2026-11-02T00:00:00.000Z', rating: 'good' };
const logB = { wordId: 2, timestamp: '2026-11-01T00:00:00.000Z', rating: 'again' };
const mergedLog = JSON.parse(mergeEntry('hsk_hsk1_review_log_v1', JSON.stringify([logA]), JSON.stringify([logA, logB, null, { wordId: 3 }])));
assert.deepEqual(mergedLog, [logB, logA]);

// Merge lww: incoming value replaces local.
assert.equal(mergeEntry('hsk_curriculum_v1', '{"a":1}', '{"b":2}'), '{"b":2}');
assert.throws(() => mergeEntry('hsk_theme', null, 'x'));

// Apply: writes merged values and leaves device keys untouched.
const target = new MemoryStorage({ hsk_theme: 'light', hsk_hsk1_srs_v3: localDeck });
const applied = applyBackup(target, parseBackup(JSON.stringify(backup)).backup);
assert.equal(applied.written, 3);
assert.equal(target.getItem('hsk_theme'), 'light');
assert.equal(JSON.parse(target.getItem('hsk_hsk1_srs_v3')).cards[1].reps, 5);

// Apply: a failing write rolls back every key already written.
class QuotaStorage extends MemoryStorage {
  setItem(k, v) {
    if (k === 'hsk_study_activity_v1') throw new Error('QuotaExceededError');
    super.setItem(k, v);
  }
}
const quota = new QuotaStorage({ hsk_hsk1_srs_v3: localDeck });
assert.throws(() => applyBackup(quota, parseBackup(JSON.stringify(backup)).backup));
assert.equal(quota.getItem('hsk_hsk1_srs_v3'), localDeck);
assert.equal(quota.getItem('hsk_hsk1_review_log_v1'), null);

// Merge activity: days unioned; same day -> words unioned, max seconds, active kept.
{
  const local = JSON.stringify({ days: { '2026-11-26': { words: [1, 2], seconds: 300 }, '2026-11-27': { words: [5], seconds: 60 } } });
  const incoming = JSON.stringify({ days: { '2026-11-27': { words: [5, 6], seconds: 120, active: true }, '2026-11-28': [7], constructor: { words: [] } } });
  const merged = JSON.parse(mergeEntry('hsk_study_activity_v1', local, incoming)).days;
  assert.deepEqual(Object.keys(merged).sort(), ['2026-11-26', '2026-11-27', '2026-11-28']);
  assert.deepEqual(merged['2026-11-26'], { words: [1, 2], seconds: 300 });
  assert.deepEqual(merged['2026-11-27'], { words: [5, 6], seconds: 120, active: true });
  assert.deepEqual(merged['2026-11-28'], { words: [7], seconds: 0 });
  assert.equal(parseBackup(JSON.stringify({ type: BACKUP_TYPE, schemaVersion: 1, entries: { hsk_study_activity_v1: '{"days":[]}' } })).skipped, 1);
}

console.log('sync snapshot tests passed');
