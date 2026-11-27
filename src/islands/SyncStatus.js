// Pure presentation of the sync state for the account menu and avatar dot.

import {
  SYNC_LABELS,
  SYNC_LOCALE,
  SYNC_JUST_NOW_MS,
  MS_PER_MINUTE,
  MINUTES_PER_HOUR,
  HOURS_PER_DAY,
} from './SyncConstants.js';

/**
 * @typedef {Object} SyncStatusView
 * @property {'synced'|'syncing'|'offline'|'error'} tone  Also the CSS modifier.
 * @property {string} text
 * @property {boolean} canRetry   Show the inline "Thử lại" action.
 */

const relativeFormat = new Intl.RelativeTimeFormat(SYNC_LOCALE, { numeric: 'auto' });

/**
 * "5 phút trước", "2 giờ trước", "hôm qua".
 * @param {number} ageMs
 */
export function relativeAge(ageMs) {
  const minutes = Math.round(ageMs / MS_PER_MINUTE);
  if (minutes < MINUTES_PER_HOUR) return relativeFormat.format(-minutes, 'minute');
  const hours = Math.round(minutes / MINUTES_PER_HOUR);
  if (hours < HOURS_PER_DAY) return relativeFormat.format(-hours, 'hour');
  return relativeFormat.format(-Math.round(hours / HOURS_PER_DAY), 'day');
}

/**
 * @param {import('./AuthStore.js').AuthState} state
 * @param {Date} [now]
 * @returns {SyncStatusView|null} null for guests and before the first sync.
 */
export function describeSync(state, now = new Date()) {
  if (!state || state.status !== 'signed_in') return null;
  switch (state.syncStatus) {
    case 'syncing':
      return { tone: 'syncing', text: SYNC_LABELS.SYNCING, canRetry: false };
    case 'offline':
      return { tone: 'offline', text: SYNC_LABELS.OFFLINE, canRetry: false };
    case 'error':
      return { tone: 'error', text: SYNC_LABELS.ERROR, canRetry: true };
    case 'synced': {
      const at = state.lastSyncedAt ? Date.parse(state.lastSyncedAt) : NaN;
      if (!Number.isFinite(at)) return { tone: 'synced', text: SYNC_LABELS.SYNCED, canRetry: false };
      const age = Math.max(0, now.getTime() - at);
      const text = age < SYNC_JUST_NOW_MS ? SYNC_LABELS.SYNCED_JUST_NOW : SYNC_LABELS.syncedAgo(relativeAge(age));
      return { tone: 'synced', text, canRetry: false };
    }
    default:
      return null;
  }
}
