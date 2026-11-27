// Pure build / validate / merge / apply logic for full-app progress backups.
// The same functions will back cloud sync, so everything here treats incoming data as untrusted.

import {
  BACKUP_TYPE,
  BACKUP_SCHEMA_VERSION,
  BACKUP_MAX_FILE_BYTES,
  BACKUP_MAX_VALUE_CHARS,
  BACKUP_MAX_ENTRIES,
  UNSAFE_OBJECT_KEYS,
} from './SyncConstants.js';
import { resolveSyncKey, listSyncKeys } from './SyncRegistry.js';
import { SRS_SCHEMA_VERSION } from './StorageEngine.js';

/**
 * @typedef {Object} BackupFile
 * @property {string} type                 Always BACKUP_TYPE.
 * @property {number} schemaVersion        BACKUP_SCHEMA_VERSION at export time.
 * @property {string} appVersion           App version that wrote the file (diagnostics only).
 * @property {string} exportedAt           ISO timestamp of the export.
 * @property {Object<string, string>} entries  Raw storage strings keyed by allowlisted key.
 */

/**
 * @typedef {Object} ParseResult
 * @property {boolean} ok
 * @property {BackupFile} [backup]
 * @property {'too_large'|'invalid'} [reason]
 * @property {number} [skipped]  Entries dropped because they were not allowlisted or malformed.
 */

/** @typedef {(card: unknown) => object|null} CardNormalizer */

const isPlainObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
export const isSafeKey = key => !UNSAFE_OBJECT_KEYS.includes(key);
const defaultNormalizeCard = card => (isPlainObject(card) ? card : null);

/**
 * Snapshot every allowlisted key of a Storage-like object.
 * @param {Pick<Storage, 'length'|'key'|'getItem'>} storage
 * @param {{ appVersion?: string, now?: Date }} [options]
 * @returns {BackupFile}
 */
export function buildBackup(storage, options = {}) {
  /** @type {Object<string, string>} */
  const entries = {};
  for (const key of listSyncKeys(storage)) {
    const value = storage.getItem(key);
    if (typeof value === 'string') entries[key] = value;
  }
  return {
    type: BACKUP_TYPE,
    schemaVersion: BACKUP_SCHEMA_VERSION,
    appVersion: options.appVersion || '',
    exportedAt: (options.now || new Date()).toISOString(),
    entries,
  };
}

/**
 * True when a raw value has the shape its rule expects (also used for cloud snapshots).
 * @param {string} key
 * @param {unknown} raw
 */
export function isValidEntry(key, raw) {
  const resolved = resolveSyncKey(key);
  if (!resolved || typeof raw !== 'string' || raw.length > BACKUP_MAX_VALUE_CHARS) return false;
  if (resolved.rule.format === 'text') return true;
  let parsed;
  try { parsed = JSON.parse(raw); } catch { return false; }
  if (resolved.rule.merge === 'srs_cards') {
    return isPlainObject(parsed) && parsed.schemaVersion === SRS_SCHEMA_VERSION && isPlainObject(parsed.cards);
  }
  if (resolved.rule.merge === 'append_log') return Array.isArray(parsed);
  if (resolved.rule.merge === 'day_map') return isPlainObject(parsed) && isPlainObject(parsed.days);
  return parsed !== null && typeof parsed === 'object';
}

/**
 * Parse and validate an untrusted backup file. Unknown or malformed entries are dropped,
 * so a crafted file can never write keys outside the allowlist.
 * @param {string} text
 * @returns {ParseResult}
 */
export function parseBackup(text) {
  if (typeof text !== 'string') return { ok: false, reason: 'invalid' };
  if (text.length > BACKUP_MAX_FILE_BYTES) return { ok: false, reason: 'too_large' };
  let data;
  try { data = JSON.parse(text); } catch { return { ok: false, reason: 'invalid' }; }
  if (!isPlainObject(data) || data.type !== BACKUP_TYPE) return { ok: false, reason: 'invalid' };
  if (!Number.isInteger(data.schemaVersion) || data.schemaVersion < 1 || data.schemaVersion > BACKUP_SCHEMA_VERSION) {
    return { ok: false, reason: 'invalid' };
  }
  if (!isPlainObject(data.entries)) return { ok: false, reason: 'invalid' };
  const keys = Object.keys(data.entries);
  if (keys.length > BACKUP_MAX_ENTRIES) return { ok: false, reason: 'invalid' };

  /** @type {Object<string, string>} */
  const entries = {};
  let skipped = 0;
  for (const key of keys) {
    const raw = data.entries[key];
    if (isSafeKey(key) && isValidEntry(key, raw)) entries[key] = raw;
    else skipped += 1;
  }
  return {
    ok: true,
    skipped,
    backup: {
      type: BACKUP_TYPE,
      schemaVersion: data.schemaVersion,
      appVersion: typeof data.appVersion === 'string' ? data.appVersion : '',
      exportedAt: typeof data.exportedAt === 'string' ? data.exportedAt : '',
      entries,
    },
  };
}

const reviewTime = card => {
  const time = card && card.last_review ? Date.parse(card.last_review) : NaN;
  return Number.isFinite(time) ? time : -Infinity;
};

/**
 * Pick the card with the more recent review; ties go to more reps, then to the local card,
 * so an untouched incoming card never overwrites local progress.
 */
function pickCard(local, incoming) {
  if (!local) return incoming;
  if (!incoming) return local;
  const delta = reviewTime(incoming) - reviewTime(local);
  if (delta !== 0) return delta > 0 ? incoming : local;
  return (Number(incoming.reps) || 0) > (Number(local.reps) || 0) ? incoming : local;
}

/**
 * Merge two FSRS deck records card by card.
 * @param {string|null} localRaw
 * @param {string} incomingRaw
 * @param {CardNormalizer} normalizeCard
 */
function mergeSrsRecords(localRaw, incomingRaw, normalizeCard) {
  const incoming = JSON.parse(incomingRaw);
  let local = null;
  try { local = localRaw ? JSON.parse(localRaw) : null; } catch { local = null; }
  const localCards = isPlainObject(local) && isPlainObject(local.cards) ? local.cards : {};
  /** @type {Object<string, object>} */
  const cards = {};
  const ids = new Set([...Object.keys(localCards), ...Object.keys(incoming.cards)]);
  for (const id of ids) {
    if (!isSafeKey(id)) continue;
    const incomingCard = id in incoming.cards ? normalizeCard(incoming.cards[id]) : null;
    const chosen = pickCard(localCards[id] || null, incomingCard);
    if (chosen) cards[id] = chosen;
  }
  return JSON.stringify({
    schemaVersion: SRS_SCHEMA_VERSION,
    migratedFromV2: Boolean((local && local.migratedFromV2) || incoming.migratedFromV2),
    cards,
  });
}

const logEntryKey = entry => [entry.wordId, entry.timestamp, entry.rating, entry.stateBefore, entry.stateAfter].join('|');
const isLogEntry = entry => isPlainObject(entry) && Boolean(entry.timestamp) && Boolean(entry.rating);

/**
 * Union two review logs, de-duplicated and ordered by timestamp.
 * @param {string|null} localRaw
 * @param {string} incomingRaw
 */
function mergeLogs(localRaw, incomingRaw) {
  let local = [];
  try { local = localRaw ? JSON.parse(localRaw) : []; } catch { local = []; }
  if (!Array.isArray(local)) local = [];
  const seen = new Set();
  const merged = [];
  for (const entry of [...local, ...JSON.parse(incomingRaw)]) {
    if (!isLogEntry(entry)) continue;
    const id = logEntryKey(entry);
    if (seen.has(id)) continue;
    seen.add(id);
    merged.push(entry);
  }
  merged.sort((a, b) => String(a.timestamp).localeCompare(String(b.timestamp)));
  return JSON.stringify(merged);
}

/**
 * Merge two days of study activity: words are unioned, time takes the larger value (each device
 * measures its own session, so the max never double counts), `active` is true if either says so.
 */
function mergeDay(local, incoming) {
  const normalize = (day) => (Array.isArray(day) ? { words: day, seconds: 0 } : (isPlainObject(day) ? day : {}));
  const a = normalize(local);
  const b = normalize(incoming);
  const words = [...new Set([...(Array.isArray(a.words) ? a.words : []), ...(Array.isArray(b.words) ? b.words : [])])];
  const seconds = Math.max(Number(a.seconds) || 0, Number(b.seconds) || 0);
  const merged = { ...b, ...a, words, seconds };
  if (a.active === true || b.active === true) merged.active = true;
  return merged;
}

/**
 * Merge two study-activity records day by day.
 * @param {string|null} localRaw
 * @param {string} incomingRaw
 */
function mergeActivity(localRaw, incomingRaw) {
  const incoming = JSON.parse(incomingRaw);
  let local = null;
  try { local = localRaw ? JSON.parse(localRaw) : null; } catch { local = null; }
  const localDays = isPlainObject(local) && isPlainObject(local.days) ? local.days : {};
  /** @type {Object<string, object>} */
  const days = {};
  for (const date of new Set([...Object.keys(localDays), ...Object.keys(incoming.days)])) {
    if (!isSafeKey(date)) continue;
    days[date] = date in localDays && date in incoming.days
      ? mergeDay(localDays[date], incoming.days[date])
      : (date in localDays ? localDays[date] : mergeDay(null, incoming.days[date]));
  }
  return JSON.stringify({ ...(isPlainObject(local) ? local : {}), days });
}

/**
 * Merge one validated incoming entry with the local raw value.
 * @param {string} key
 * @param {string|null} localRaw
 * @param {string} incomingRaw
 * @param {CardNormalizer} [normalizeCard]
 * @returns {string}
 */
export function mergeEntry(key, localRaw, incomingRaw, normalizeCard = defaultNormalizeCard) {
  const resolved = resolveSyncKey(key);
  if (!resolved) throw new Error('Key is not syncable: ' + key);
  if (resolved.rule.merge === 'srs_cards') return mergeSrsRecords(localRaw, incomingRaw, normalizeCard);
  if (resolved.rule.merge === 'append_log') return mergeLogs(localRaw, incomingRaw);
  if (resolved.rule.merge === 'day_map') return mergeActivity(localRaw, incomingRaw);
  return incomingRaw;
}

/**
 * Merge a validated backup into storage. All values are computed before writing, and any
 * write failure (e.g. quota exceeded) rolls every key back, so storage is never half-restored.
 * @param {Pick<Storage, 'getItem'|'setItem'|'removeItem'>} storage
 * @param {BackupFile} backup  Must come from parseBackup.
 * @param {{ normalizeCard?: CardNormalizer }} [options]
 * @returns {{ written: number }}
 */
export function applyBackup(storage, backup, options = {}) {
  const pending = Object.keys(backup.entries).map(key => {
    const previous = storage.getItem(key);
    return { key, previous, next: mergeEntry(key, previous, backup.entries[key], options.normalizeCard) };
  });
  const done = [];
  try {
    for (const item of pending) {
      storage.setItem(item.key, item.next);
      done.push(item);
    }
  } catch (error) {
    for (const item of done) {
      if (item.previous === null) storage.removeItem(item.key);
      else storage.setItem(item.key, item.previous);
    }
    throw error;
  }
  return { written: done.length };
}
