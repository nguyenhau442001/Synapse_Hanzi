// Allowlist of local data that belongs to the user's learning progress.
// Only keys matched here are exported, restored, or (later) synced to the cloud; every other
// key (theme, UI layout, install prompts, auth tokens, caches) stays on the device.

/**
 * @typedef {'srs_cards'|'append_log'|'lww'} MergeStrategy
 *   srs_cards  : per-word FSRS card merge, the more recently reviewed card wins.
 *   append_log : array union with de-duplication (review history).
 *   lww        : the incoming value replaces the local value (last write wins).
 */

/**
 * @typedef {Object} SyncRule
 * @property {string} group          Human-readable data group, used for namespacing.
 * @property {MergeStrategy} merge
 * @property {'json'|'text'} format  json values must parse; text values are stored verbatim.
 * @property {boolean} [personal]    Personal data (e.g. a display name); never leaves the device
 *                                   unless the user is signed in and syncing their own account.
 * @property {string[]} [keys]       Exact localStorage keys.
 * @property {RegExp} [pattern]      Key pattern; capture 1 = deck/level id, capture 2 = direction.
 */

const LEVEL_ID = '([a-z0-9_-]+?)';
const DIRECTION_SUFFIX = '(?:_(listen|vi2zh))?';

/** @type {ReadonlyArray<SyncRule>} */
export const SYNC_RULES = Object.freeze([
  { group: 'srs', merge: 'srs_cards', format: 'json', pattern: new RegExp('^hsk_' + LEVEL_ID + '_srs_v3' + DIRECTION_SUFFIX + '$') },
  { group: 'review_log', merge: 'append_log', format: 'json', pattern: new RegExp('^hsk_' + LEVEL_ID + '_review_log_v1' + DIRECTION_SUFFIX + '$') },
  { group: 'level', merge: 'lww', format: 'json', pattern: new RegExp('^hsk_' + LEVEL_ID + '_(?:progress|prefs)_v2$') },
  { group: 'level', merge: 'lww', format: 'text', pattern: new RegExp('^hsk_' + LEVEL_ID + '_milestone_(?:mastered|learned)$') },
  { group: 'radicals', merge: 'lww', format: 'json', keys: ['hsk_radical_progress_v1', 'hsk_radical_prefs_v1'] },
  {
    group: 'study_settings',
    merge: 'lww',
    format: 'text',
    keys: ['hsk_srs_prefs_v1', 'hsk_study_direction_v1', 'hsk_review_prefs_v1', 'hsk_daily_study_goal_v1', 'hsk_last_level_v1', 'hsk_fast_review_level'],
  },
  { group: 'activity', merge: 'lww', format: 'json', keys: ['hsk_study_activity_v1'] },
  { group: 'exams', merge: 'lww', format: 'json', keys: ['hsk30_exam_history_v1', 'hskk_exam_history_v1', 'hsk30_error_notebook_v1', 'hsk_weak_words_v1'] },
  { group: 'courses', merge: 'lww', format: 'json', keys: ['hsk_curriculum_v1', 'hsk_writing_v1', 'hsk4_sentence_solved'] },
  { group: 'courses', merge: 'lww', format: 'text', keys: ['hsk_speed_quiz_best'] },
  { group: 'profile', merge: 'lww', format: 'text', personal: true, keys: ['hsk_profile_name'] },
]);

/**
 * @typedef {Object} ResolvedKey
 * @property {string} namespace   e.g. 'srs:hsk30_1:zh2vi', 'activity'.
 * @property {SyncRule} rule
 */

/**
 * Resolve a storage key to its sync rule, or null when the key is device-only.
 * @param {string} key
 * @returns {ResolvedKey|null}
 */
export function resolveSyncKey(key) {
  if (typeof key !== 'string') return null;
  for (const rule of SYNC_RULES) {
    if (rule.keys && rule.keys.includes(key)) return { namespace: rule.group, rule };
    const match = rule.pattern ? rule.pattern.exec(key) : null;
    if (match) {
      const parts = [rule.group, match[1]];
      if (rule.group === 'srs' || rule.group === 'review_log') parts.push(match[2] || 'zh2vi');
      return { namespace: parts.join(':'), rule };
    }
  }
  return null;
}

/**
 * List every syncable key currently present in a Storage-like object.
 * @param {Pick<Storage, 'length'|'key'>} storage
 * @returns {string[]}
 */
export function listSyncKeys(storage) {
  const keys = [];
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (key && resolveSyncKey(key)) keys.push(key);
  }
  return keys.sort();
}
