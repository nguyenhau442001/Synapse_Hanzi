// Pull → merge → push of allowlisted progress between this device and a cloud store.
// Backend-agnostic: the store is a CloudAdapter (FirestoreCloudAdapter.js in the app, an
// in-memory fake in tests). All cloud data is treated as untrusted and validated per key.

import { resolveSyncKey, listSyncKeys } from './SyncRegistry.js';
import { applyBackup, isSafeKey, isValidEntry } from './SyncSnapshot.js';
import { compactSrsCards } from './SrsCompaction.js';
import {
  SYNC_STATE_KEY,
  SYNC_SCHEMA_VERSION,
  SYNC_MAX_DOC_BYTES,
  SYNC_MAX_BATCH_BYTES,
  SYNC_MAX_LOG_ENTRIES,
  SYNC_HASH_HEX_LENGTH,
  SYNC_DEVICE_ID_BYTES,
  FIRESTORE_BATCH_LIMIT,
} from './SyncConstants.js';

const utf8 = new TextEncoder();

/** @param {string} text @returns {number} UTF-8 size, which is what Firestore limits count. */
export const utf8ByteLength = (text) => utf8.encode(text).length;

/**
 * Split pushes into batches that each stay under the commit byte budget and the write limit.
 * A single item larger than the budget still gets its own batch (items are already capped at
 * SYNC_MAX_DOC_BYTES, far below the budget).
 * @template T
 * @param {Array<{ item: T, bytes: number }>} sized
 * @param {{ maxBytes?: number, maxWrites?: number }} [limits]
 * @returns {T[][]}
 */
export function planPushBatches(sized, { maxBytes = SYNC_MAX_BATCH_BYTES, maxWrites = FIRESTORE_BATCH_LIMIT } = {}) {
  const batches = [];
  let current = [];
  let currentBytes = 0;
  for (const { item, bytes } of sized) {
    if (current.length && (currentBytes + bytes > maxBytes || current.length >= maxWrites)) {
      batches.push(current);
      current = [];
      currentBytes = 0;
    }
    current.push(item);
    currentBytes += bytes;
  }
  if (current.length) batches.push(current);
  return batches;
}

/**
 * One namespace as stored in the cloud (users/{uid}/snapshots/{namespace}).
 * @typedef {Object} CloudSnapshot
 * @property {string} namespace         SyncRegistry namespace, e.g. 'srs:hsk30_1:zh2vi'.
 * @property {number} schemaVersion     SYNC_SCHEMA_VERSION of the writer.
 * @property {string} deviceId          Random id of the writing device.
 * @property {string|null} updatedAt    ISO server time of the write (null before it is known).
 * @property {Object<string, string>} entries  Raw storage values keyed by storage key.
 */

/**
 * @typedef {Object} CloudAdapter
 * @property {(sinceIso: string|null) => Promise<CloudSnapshot[]>} pullSince
 *   Snapshots written after `sinceIso` (all when null).
 * @property {(snapshots: CloudSnapshot[]) => Promise<void>} push  Writes one batch atomically,
 *   stamping server time. The engine keeps each call under SYNC_MAX_BATCH_BYTES.
 */

/**
 * Device-only bookkeeping, stored under SYNC_STATE_KEY.
 * @typedef {Object} SyncDeviceState
 * @property {string} uid                  Account the hashes belong to.
 * @property {string} deviceId
 * @property {string|null} lastPulledAt    Newest cloud `updatedAt` seen.
 * @property {Object<string, string>} hashes  Key → hash of the value at the last sync.
 * @property {Object<string, string>} pushed  Key → hash of the copy last pushed (may be trimmed).
 */

/**
 * @typedef {Object} SyncResult
 * @property {number} pulled    Cloud snapshots read.
 * @property {number} applied   Local keys changed by cloud data.
 * @property {number} pushed    Namespaces written to the cloud.
 * @property {string[]} skipped Namespaces too large to push.
 */

/** @param {string} text */
export async function hashText(text) {
  const digest = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('').slice(0, SYNC_HASH_HEX_LENGTH);
}

export function randomDeviceId() {
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(SYNC_DEVICE_ID_BYTES));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

const isPlainObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

/**
 * Group every allowlisted local key by namespace.
 * @param {Pick<Storage, 'length'|'key'|'getItem'>} storage
 * @returns {Map<string, Object<string, string>>}
 */
export function groupByNamespace(storage) {
  const groups = new Map();
  for (const key of listSyncKeys(storage)) {
    const raw = storage.getItem(key);
    if (typeof raw !== 'string') continue;
    const { namespace } = resolveSyncKey(key);
    if (!groups.has(namespace)) groups.set(namespace, {});
    groups.get(namespace)[key] = raw;
  }
  return groups;
}

/**
 * The copy of a value that goes to the cloud: unreviewed FSRS cards are dropped (every device
 * recreates them on load) and review logs keep only their newest entries.
 * @param {string} key
 * @param {string} raw
 */
export function cloudCopy(key, raw) {
  const { rule } = resolveSyncKey(key);
  if (rule.merge === 'srs_cards') {
    const record = JSON.parse(raw);
    return JSON.stringify({ ...record, cards: compactSrsCards(record.cards) });
  }
  if (rule.merge === 'append_log' || rule.merge === 'id_log') {
    const log = JSON.parse(raw);
    return Array.isArray(log) && log.length > SYNC_MAX_LOG_ENTRIES ? JSON.stringify(log.slice(-SYNC_MAX_LOG_ENTRIES)) : raw;
  }
  return raw;
}

/**
 * @param {Object} options
 * @param {Pick<Storage, 'length'|'key'|'getItem'|'setItem'|'removeItem'>} options.storage
 * @param {CloudAdapter} options.adapter
 * @param {string} options.uid
 * @param {(card: unknown) => object|null} [options.normalizeCard]
 * @param {() => string} [options.newDeviceId]
 */
export function createSyncEngine({ storage, adapter, uid, normalizeCard, newDeviceId = randomDeviceId }) {
  /** @returns {SyncDeviceState} */
  function readState() {
    let saved = null;
    try { saved = JSON.parse(storage.getItem(SYNC_STATE_KEY)); } catch { saved = null; }
    const deviceId = isPlainObject(saved) && typeof saved.deviceId === 'string' ? saved.deviceId : newDeviceId();
    if (!isPlainObject(saved) || saved.uid !== uid) {
      // New device or another account: nothing is known to be in sync yet.
      return { uid, deviceId, lastPulledAt: null, hashes: {}, pushed: {} };
    }
    return {
      uid,
      deviceId,
      lastPulledAt: typeof saved.lastPulledAt === 'string' ? saved.lastPulledAt : null,
      hashes: isPlainObject(saved.hashes) ? saved.hashes : {},
      pushed: isPlainObject(saved.pushed) ? saved.pushed : {},
    };
  }

  /**
   * Pick the cloud values to apply locally.
   * - unchanged since our last sync (or our own pushed copy) → ignored;
   * - changed only in the cloud → applied (FSRS decks and logs are merged, others replaced);
   * - changed on both sides → decks and logs merged; other values keep this device's copy,
   *   which is pushed right after, so every device converges.
   */
  async function selectIncoming(snapshots, state) {
    const incoming = {};
    let newest = state.lastPulledAt;
    for (const snapshot of snapshots) {
      if (!isPlainObject(snapshot) || !isPlainObject(snapshot.entries)) continue;
      if (!Number.isInteger(snapshot.schemaVersion) || snapshot.schemaVersion > SYNC_SCHEMA_VERSION) continue;
      if (typeof snapshot.updatedAt === 'string' && (!newest || snapshot.updatedAt > newest)) newest = snapshot.updatedAt;
      for (const [key, raw] of Object.entries(snapshot.entries)) {
        const resolved = isSafeKey(key) ? resolveSyncKey(key) : null;
        if (!resolved || resolved.namespace !== snapshot.namespace || !isValidEntry(key, raw)) continue;
        const remoteHash = await hashText(raw);
        if (remoteHash === state.hashes[key] || remoteHash === state.pushed[key]) continue;
        const local = storage.getItem(key);
        const localChanged = local !== null && (await hashText(local)) !== state.hashes[key];
        if (localChanged && resolved.rule.merge === 'lww') continue;
        incoming[key] = raw;
      }
    }
    return { incoming, newest };
  }

  /**
   * @param {{ push?: boolean }} [options]  push:false pulls and merges only (background polls),
   *   leaving local changes for the next full sync.
   * @returns {Promise<SyncResult>}
   */
  async function sync({ push = true } = {}) {
    const state = readState();
    const snapshots = await adapter.pullSince(state.lastPulledAt);
    const { incoming, newest } = await selectIncoming(snapshots, state);

    const before = {};
    for (const key of Object.keys(incoming)) before[key] = storage.getItem(key);
    if (Object.keys(incoming).length) applyBackup(storage, { entries: incoming }, { normalizeCard });
    let applied = 0;
    for (const key of Object.keys(incoming)) {
      const now = storage.getItem(key);
      if (now !== before[key]) applied += 1;
      // A value now identical to the cloud copy is in sync and must not be pushed back.
      if (now === incoming[key]) state.hashes[key] = await hashText(now);
    }

    if (!push) {
      storage.setItem(SYNC_STATE_KEY, JSON.stringify({ ...state, lastPulledAt: newest }));
      return { pulled: snapshots.length, applied, pushed: 0, skipped: [] };
    }

    const toPush = [];
    const skipped = [];
    const nextHashes = {};
    const nextPushed = { ...state.pushed };
    for (const [namespace, entries] of groupByNamespace(storage)) {
      let changed = false;
      for (const [key, raw] of Object.entries(entries)) {
        nextHashes[key] = await hashText(raw);
        if (nextHashes[key] !== state.hashes[key]) changed = true;
      }
      if (!changed) continue;
      const copies = {};
      for (const [key, raw] of Object.entries(entries)) copies[key] = cloudCopy(key, raw);
      const bytes = utf8ByteLength(JSON.stringify(copies));
      if (bytes > SYNC_MAX_DOC_BYTES) {
        skipped.push(namespace);
        for (const key of Object.keys(entries)) nextHashes[key] = state.hashes[key];
        continue;
      }
      for (const [key, copy] of Object.entries(copies)) nextPushed[key] = await hashText(copy);
      toPush.push({ bytes, item: { namespace, schemaVersion: SYNC_SCHEMA_VERSION, deviceId: state.deviceId, updatedAt: null, entries: copies } });
    }

    // Batches commit in order; if one fails the state is not saved, so the next sync re-pushes
    // everything (rewriting an identical snapshot is harmless).
    for (const batch of planPushBatches(toPush)) await adapter.push(batch);

    // Saved only after a successful push, so a failed sync is simply retried next time.
    const saved = { uid, deviceId: state.deviceId, lastPulledAt: newest, hashes: nextHashes, pushed: nextPushed };
    storage.setItem(SYNC_STATE_KEY, JSON.stringify(saved));
    return { pulled: snapshots.length, applied, pushed: toPush.length, skipped };
  }

  return { sync, readState };
}
