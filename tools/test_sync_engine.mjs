import assert from 'node:assert/strict';
import { createSyncEngine, cloudCopy, groupByNamespace, hashText, utf8ByteLength, planPushBatches } from '../src/islands/SyncEngine.js';
import { SYNC_STATE_KEY, SYNC_SCHEMA_VERSION, SYNC_MAX_LOG_ENTRIES } from '../src/islands/SyncConstants.js';
import { toCloudSnapshot } from '../src/islands/FirestoreCloudAdapter.js';

class MemoryStorage {
  constructor(initial = {}) { this.map = new Map(Object.entries(initial)); }
  get length() { return this.map.size; }
  key(i) { return [...this.map.keys()][i] ?? null; }
  getItem(k) { return this.map.has(k) ? this.map.get(k) : null; }
  setItem(k, v) { this.map.set(k, String(v)); }
  removeItem(k) { this.map.delete(k); }
}

/** In-memory cloud with server-assigned, strictly increasing timestamps. */
function memoryCloud() {
  const docs = new Map();
  let clock = Date.parse('2026-11-28T00:00:00.000Z');
  const stats = { reads: 0, writes: 0 };
  return {
    docs,
    stats,
    adapter: {
      async pullSince(since) {
        const out = [...docs.values()].filter((d) => !since || d.updatedAt > since).map((d) => structuredClone(d));
        stats.reads += out.length;
        return out;
      },
      async push(items) {
        for (const item of items) {
          clock += 1000;
          docs.set(item.namespace, { ...structuredClone(item), updatedAt: new Date(clock).toISOString() });
          stats.writes += 1;
        }
      },
    },
  };
}

const DECK = 'hsk_hsk1_srs_v3';
const LOG = 'hsk_hsk1_review_log_v1';
const CURRICULUM = 'hsk_curriculum_v1';
const reviewed = (lastReview, reps) => ({ due: '2026-12-10T00:00:00.000Z', last_review: lastReview, reps, state: 2 });
const fresh = () => ({ due: '2026-11-28T00:00:00.000Z', last_review: null, reps: 0, state: 0 });
const deck = (cards) => JSON.stringify({ schemaVersion: 3, migratedFromV2: true, cards });
const cardsOf = (storage) => JSON.parse(storage.getItem(DECK)).cards;
let idCounter = 0;
const engineFor = (storage, adapter, uid = 'u1') => createSyncEngine({ storage, adapter, uid, newDeviceId: () => 'device-' + (++idCounter) });

// cloudCopy: unreviewed cards dropped, long logs trimmed, other values untouched.
{
  const copy = JSON.parse(cloudCopy(DECK, deck({ 1: reviewed('2026-11-20T00:00:00.000Z', 2), 2: fresh() })));
  assert.deepEqual(Object.keys(copy.cards), ['1']);
  const longLog = Array.from({ length: SYNC_MAX_LOG_ENTRIES + 5 }, (_, i) => ({ wordId: i, timestamp: String(i), rating: 'good' }));
  const trimmed = JSON.parse(cloudCopy(LOG, JSON.stringify(longLog)));
  assert.equal(trimmed.length, SYNC_MAX_LOG_ENTRIES);
  assert.equal(trimmed[0].wordId, 5);
  assert.equal(cloudCopy(CURRICULUM, '{"a":1}'), '{"a":1}');
}

// Firestore document conversion rejects malformed data.
{
  assert.equal(toCloudSnapshot('activity', { data: 'not json' }), null);
  assert.equal(toCloudSnapshot('activity', {}), null);
  const ok = toCloudSnapshot('activity', { schemaVersion: 1, deviceId: 'd', data: '{"hsk_study_activity_v1":"{}"}', updatedAt: { toDate: () => new Date(0) } });
  assert.equal(ok.updatedAt, '1970-01-01T00:00:00.000Z');
}

const cloud = memoryCloud();
const deviceA = new MemoryStorage({
  [DECK]: deck({ 1: reviewed('2026-11-20T00:00:00.000Z', 2), 2: fresh() }),
  [LOG]: JSON.stringify([{ wordId: 1, timestamp: '2026-11-20T00:00:00.000Z', rating: 'good' }]),
  [CURRICULUM]: '{"lessons":{"l1":true}}',
  hsk_theme: 'dark',
});
const deviceB = new MemoryStorage({ hsk_theme: 'light' });

// 1. First sync on A pushes every namespace, without device-only keys or unreviewed cards.
{
  const result = await engineFor(deviceA, cloud.adapter).sync();
  assert.equal(result.applied, 0);
  assert.deepEqual([...cloud.docs.keys()].sort(), ['courses', 'review_log:hsk1:zh2vi', 'srs:hsk1:zh2vi']);
  const pushedDeck = JSON.parse(cloud.docs.get('srs:hsk1:zh2vi').entries[DECK]);
  assert.deepEqual(Object.keys(pushedDeck.cards), ['1']);
  assert.equal(JSON.stringify([...cloud.docs.values()]).includes('hsk_theme'), false);
  assert.equal(cloud.docs.get('courses').schemaVersion, SYNC_SCHEMA_VERSION);
}

// 2. Idempotent: a second sync with no changes writes nothing.
{
  const writes = cloud.stats.writes;
  const result = await engineFor(deviceA, cloud.adapter).sync();
  assert.equal(result.pushed, 0);
  assert.equal(result.applied, 0);
  assert.equal(cloud.stats.writes, writes);
}

// 3. A new empty device receives everything and does not echo it back.
{
  const writes = cloud.stats.writes;
  const result = await engineFor(deviceB, cloud.adapter).sync();
  assert.equal(result.applied, 3);
  assert.equal(result.pushed, 0);
  assert.equal(cloud.stats.writes, writes);
  assert.equal(cardsOf(deviceB)[1].reps, 2);
  assert.equal(deviceB.getItem(CURRICULUM), '{"lessons":{"l1":true}}');
  assert.equal(deviceB.getItem('hsk_theme'), 'light');
}

// 4. Both devices review different cards: after A then B then A sync, both hold both reviews.
{
  const a = cardsOf(deviceA);
  a[2] = reviewed('2026-11-27T00:00:00.000Z', 1);
  deviceA.setItem(DECK, deck(a));
  const b = cardsOf(deviceB);
  b[3] = reviewed('2026-11-27T12:00:00.000Z', 1);
  deviceB.setItem(DECK, deck(b));

  await engineFor(deviceA, cloud.adapter).sync();
  await engineFor(deviceB, cloud.adapter).sync();
  await engineFor(deviceA, cloud.adapter).sync();
  for (const device of [deviceA, deviceB]) {
    const cards = cardsOf(device);
    assert.equal(cards[1].reps, 2);
    assert.equal(cards[2].reps, 1);
    assert.equal(cards[3].reps, 1);
  }
  // Converged: one more round on each side changes nothing.
  const writes = cloud.stats.writes;
  assert.equal((await engineFor(deviceA, cloud.adapter).sync()).applied, 0);
  assert.equal((await engineFor(deviceB, cloud.adapter).sync()).applied, 0);
  assert.equal(cloud.stats.writes, writes);
}

// 5. Last-write-wins value edited on both devices: the device syncing second keeps its copy,
//    pushes it, and the other device converges on the next sync.
{
  deviceA.setItem(CURRICULUM, '{"lessons":{"from":"A"}}');
  deviceB.setItem(CURRICULUM, '{"lessons":{"from":"B"}}');
  await engineFor(deviceA, cloud.adapter).sync();
  await engineFor(deviceB, cloud.adapter).sync();
  assert.equal(deviceB.getItem(CURRICULUM), '{"lessons":{"from":"B"}}');
  await engineFor(deviceA, cloud.adapter).sync();
  assert.equal(deviceA.getItem(CURRICULUM), '{"lessons":{"from":"B"}}');
}

// 6. Review logs from both devices are unioned.
{
  const logA = JSON.parse(deviceA.getItem(LOG));
  deviceA.setItem(LOG, JSON.stringify([...logA, { wordId: 2, timestamp: '2026-11-27T01:00:00.000Z', rating: 'good' }]));
  const logB = JSON.parse(deviceB.getItem(LOG));
  deviceB.setItem(LOG, JSON.stringify([...logB, { wordId: 3, timestamp: '2026-11-27T02:00:00.000Z', rating: 'hard' }]));
  await engineFor(deviceA, cloud.adapter).sync();
  await engineFor(deviceB, cloud.adapter).sync();
  await engineFor(deviceA, cloud.adapter).sync();
  for (const device of [deviceA, deviceB]) {
    assert.deepEqual(JSON.parse(device.getItem(LOG)).map((e) => e.wordId), [1, 2, 3]);
  }
}

// 7. Untrusted cloud data: keys outside the namespace, device keys, bad shapes and newer
//    schema versions are all ignored.
{
  const target = new MemoryStorage({ hsk_theme: 'light' });
  const hostile = memoryCloud();
  hostile.docs.set('courses', {
    namespace: 'courses',
    schemaVersion: 1,
    deviceId: 'x',
    updatedAt: '2026-11-28T00:00:01.000Z',
    entries: {
      hsk_theme: 'pwned',
      [DECK]: deck({ 1: reviewed('2026-11-20T00:00:00.000Z', 9) }),
      hsk_curriculum_v1: 'not json',
      __proto__: 'x',
      hsk_writing_v1: '{"chars":{}}',
    },
  });
  hostile.docs.set('activity', {
    namespace: 'activity',
    schemaVersion: SYNC_SCHEMA_VERSION + 1,
    deviceId: 'x',
    updatedAt: '2026-11-28T00:00:02.000Z',
    entries: { hsk_study_activity_v1: '{"days":{}}' },
  });
  const result = await engineFor(target, hostile.adapter, 'u9').sync();
  assert.equal(result.applied, 1);
  assert.equal(target.getItem('hsk_theme'), 'light');
  assert.equal(target.getItem(DECK), null);
  assert.equal(target.getItem('hsk_study_activity_v1'), null);
  assert.equal(target.getItem('hsk_writing_v1'), '{"chars":{}}');
}

// 8. Switching accounts on a device resets what is considered in sync.
{
  const state = JSON.parse(deviceA.getItem(SYNC_STATE_KEY));
  assert.equal(state.uid, 'u1');
  assert.ok(Object.keys(state.hashes).length > 0);
  const other = memoryCloud();
  const result = await engineFor(deviceA, other.adapter, 'u2').sync();
  assert.equal(result.pushed, groupByNamespace(deviceA).size);
  const next = JSON.parse(deviceA.getItem(SYNC_STATE_KEY));
  assert.equal(next.uid, 'u2');
  assert.equal(next.deviceId, state.deviceId);
}

// 9. A failed push leaves the state untouched, so the next sync retries.
{
  const target = new MemoryStorage({ [CURRICULUM]: '{"x":1}' });
  const failing = { pullSince: async () => [], push: async () => { throw new Error('network'); } };
  await assert.rejects(() => engineFor(target, failing, 'u3').sync());
  assert.equal(target.getItem(SYNC_STATE_KEY), null);
}

// Pull-only polls receive other devices' changes but never write; the next full sync pushes.
{
  const pollCloud = memoryCloud();
  const writer = new MemoryStorage({ [CURRICULUM]: '{"lessons":{"l1":true}}' });
  const reader = new MemoryStorage({});
  await engineFor(writer, pollCloud.adapter).sync();
  reader.setItem(CURRICULUM, '{"lessons":{"l2":true}}');
  const writes = pollCloud.stats.writes;
  const polled = await engineFor(reader, pollCloud.adapter).sync({ push: false });
  assert.equal(polled.pushed, 0);
  assert.equal(pollCloud.stats.writes, writes);
  assert.equal(reader.getItem(CURRICULUM), '{"lessons":{"l2":true}}', 'lww keeps the local edit');
  const again = await engineFor(reader, pollCloud.adapter).sync({ push: false });
  assert.equal(again.pulled, 0, 'a poll only reads snapshots newer than the last one');
  const full = await engineFor(reader, pollCloud.adapter).sync();
  assert.equal(full.pushed, 1);
  await engineFor(writer, pollCloud.adapter).sync({ push: false });
  assert.equal(writer.getItem(CURRICULUM), '{"lessons":{"l2":true}}');
}

// Firestore limits are in UTF-8 bytes: hanzi are 3 bytes each.
assert.equal(utf8ByteLength('学'), 3);
assert.equal(utf8ByteLength('ab'), 2);

{
  const sized = (sizes) => sizes.map((bytes, i) => ({ item: i, bytes }));
  assert.deepEqual(planPushBatches(sized([4, 4, 4]), { maxBytes: 10, maxWrites: 500 }), [[0, 1], [2]], 'byte budget splits');
  assert.deepEqual(planPushBatches(sized([1, 1, 1]), { maxBytes: 10, maxWrites: 2 }), [[0, 1], [2]], 'write limit splits');
  assert.deepEqual(planPushBatches(sized([20, 1]), { maxBytes: 10, maxWrites: 500 }), [[0], [1]], 'oversized item stands alone');
  assert.deepEqual(planPushBatches([]), []);
}

{
  // A namespace under the character cap but over the byte cap is skipped, not sent to Firestore.
  const cloud = memoryCloud();
  const hanziHeavy = JSON.stringify({ lessons: { ['学'.repeat(400000)]: true } });
  const storage = new MemoryStorage({ [CURRICULUM]: hanziHeavy });
  const result = await engineFor(storage, cloud.adapter).sync();
  assert.deepEqual(result.skipped, ['courses']);
  assert.equal(result.pushed, 0);
}

{
  // Large first sync is split into several commits instead of one oversized batch.
  const cloud = memoryCloud();
  let calls = 0;
  const adapter = { ...cloud.adapter, async push(items) { calls += 1; return cloud.adapter.push(items); } };
  const big = JSON.stringify({ pad: 'x'.repeat(800000) });
  const storage = new MemoryStorage({});
  for (let i = 1; i <= 7; i++) storage.setItem(`hsk_hsk${i}_progress_v2`, big);
  const result = await engineFor(storage, adapter).sync();
  assert.equal(result.pushed, 7);
  assert.ok(calls >= 2, 'pushes are split into multiple batches');
  assert.equal(cloud.docs.size, 7);
}

assert.equal((await hashText('abc')).length, 32);
console.log('sync engine tests passed');
