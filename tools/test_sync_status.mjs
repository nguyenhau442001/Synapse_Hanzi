import assert from 'node:assert/strict';
import { describeSync, relativeAge } from '../src/islands/SyncStatus.js';
import { SYNC_LABELS, MS_PER_MINUTE } from '../src/islands/SyncConstants.js';

const now = new Date('2026-11-28T12:00:00.000Z');
const signedIn = (syncStatus, lastSyncedAt = null) => ({ status: 'signed_in', user: { id: 'u' }, syncStatus, lastSyncedAt, errorMessage: null });

assert.equal(describeSync({ status: 'guest', syncStatus: 'idle' }, now), null);
assert.equal(describeSync(signedIn('idle'), now), null);
assert.deepEqual(describeSync(signedIn('syncing'), now), { tone: 'syncing', text: SYNC_LABELS.SYNCING, canRetry: false });
assert.deepEqual(describeSync(signedIn('offline'), now), { tone: 'offline', text: SYNC_LABELS.OFFLINE, canRetry: false });
assert.deepEqual(describeSync(signedIn('error'), now), { tone: 'error', text: SYNC_LABELS.ERROR, canRetry: true });
assert.equal(describeSync(signedIn('synced', '2026-11-28T11:59:40.000Z'), now).text, SYNC_LABELS.SYNCED_JUST_NOW);
assert.equal(describeSync(signedIn('synced', 'garbage'), now).text, SYNC_LABELS.SYNCED);
assert.equal(describeSync(signedIn('synced', '2026-11-28T11:55:00.000Z'), now).text, SYNC_LABELS.syncedAgo(relativeAge(5 * MS_PER_MINUTE)));
assert.match(relativeAge(5 * MS_PER_MINUTE), /5/);
assert.match(relativeAge(3 * 60 * MS_PER_MINUTE), /3/);
assert.notEqual(relativeAge(26 * 60 * MS_PER_MINUTE), relativeAge(3 * 60 * MS_PER_MINUTE));

console.log('sync status tests passed');
