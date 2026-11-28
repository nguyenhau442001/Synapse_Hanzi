// Runs SyncEngine for the signed-in user, reports progress into AuthStore.syncStatus and
// raises toast notices. Triggers: session start, a pull-only poll every SYNC_POLL_INTERVAL_MS
// while visible, a debounced push after local progress changes, leaving the tab (flush),
// returning to a stale tab, and reconnecting.

import { effect, signal } from '@preact/signals';
import { authController, authState } from './AuthStore.js';
import { FIREBASE_CONFIG } from './FirebaseConfig.js';
import { SRS } from './SrsEngine.js';
import { createSyncEngine } from './SyncEngine.js';
import {
  SYNC_RELOAD_GUARD_KEY,
  SYNC_PENDING_NOTICE_KEY,
  SYNC_POLL_INTERVAL_MS,
  SYNC_PUSH_DEBOUNCE_MS,
  SYNC_PUSH_MAX_WAIT_MS,
  SYNC_LOCAL_CHANGE_EVENT,
  SYNC_STALE_AFTER_MS,
} from './SyncConstants.js';

/**
 * @typedef {'merged'|'remote'} SyncNoticeKind
 *   merged : first sync after an interactive sign-in finished.
 *   remote : another device's progress arrived mid-session; a reload shows it.
 */

/** @type {import('@preact/signals').Signal<SyncNoticeKind|null>} */
export const syncNotice = signal(null);

export const dismissSyncNotice = () => { syncNotice.value = null; };

/** @type {Promise<import('./SyncEngine.js').SyncResult|null>|null} */
let running = null;
/** Whether the in-flight run pushes; a push requested during a pull-only run follows it. */
let runningPush = false;
let followUpPush = false;
/** True while the sync itself saves the active deck, so that write schedules no push. */
let flushing = false;
/** Successful syncs since this page loaded; only the first may reload automatically. */
let syncsThisPage = 0;
/** Set while the account is being deleted, so no sync can re-upload data mid-deletion. */
let paused = false;

const isOffline = () => typeof navigator !== 'undefined' && navigator.onLine === false;

/** Persist the in-memory active deck so the sync sees the latest reviews. */
function flushActiveDeck() {
  if (typeof window === 'undefined' || !window.currentLevel) return;
  if (typeof window.saveProgress !== 'function') return;
  flushing = true;
  try { window.saveProgress(); } finally { flushing = false; }
}

function sessionGet(key) {
  try { return sessionStorage.getItem(key); } catch { return null; }
}

function sessionSet(key, value) {
  try {
    if (value === null) sessionStorage.removeItem(key);
    else sessionStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Islands read storage when they mount, so new data needs a reload. Right after startup or
 * sign-in the reload is automatic (at most once per tab session, so it can never loop);
 * mid-session the user is asked instead, so an open study session is never interrupted.
 * @param {import('./SyncEngine.js').SyncResult} result
 * @param {boolean} firstOfPage
 * @param {boolean} freshSignIn
 */
function announce(result, firstOfPage, freshSignIn) {
  if (result.applied === 0) {
    if (freshSignIn) syncNotice.value = 'merged';
    return;
  }
  const mayAutoReload = firstOfPage && !sessionGet(SYNC_RELOAD_GUARD_KEY) && sessionSet(SYNC_RELOAD_GUARD_KEY, '1');
  if (!mayAutoReload) {
    syncNotice.value = 'remote';
    return;
  }
  if (freshSignIn) sessionSet(SYNC_PENDING_NOTICE_KEY, 'merged');
  window.location.reload();
}

/**
 * Sync now for the signed-in user. Concurrent calls share one run.
 * @param {{ push?: boolean }} [options]  push:false = quiet pull-only poll.
 * @returns {Promise<import('./SyncEngine.js').SyncResult|null>}
 */
export function runSync({ push = true } = {}) {
  if (running) {
    if (push && !runningPush) followUpPush = true;
    return running;
  }
  if (paused) return Promise.resolve(null);
  const { status, user } = authState.value;
  if (status !== 'signed_in' || !user) return Promise.resolve(null);
  if (isOffline()) {
    authController.setSyncStatus({ syncStatus: 'offline' });
    return Promise.resolve(null);
  }

  const freshSignIn = authController.consumeFreshSignIn();
  // Polls stay quiet: the header only shows "syncing" for runs that may upload.
  if (push) authController.setSyncStatus({ syncStatus: 'syncing' });
  runningPush = push;
  running = (async () => {
    try {
      flushActiveDeck();
      const { createFirestoreCloudAdapter } = await import('./FirestoreCloudAdapter.js');
      const engine = createSyncEngine({
        storage: localStorage,
        adapter: createFirestoreCloudAdapter(FIREBASE_CONFIG, user.id),
        uid: user.id,
        normalizeCard: (card) => SRS.serializeCard(card),
      });
      const result = await engine.sync({ push });
      // The user may have signed out while the request was in flight.
      if (authState.value.user?.id !== user.id) return result;
      if (result.skipped.length) console.warn('[Sync] namespaces too large to upload:', result.skipped);
      authController.setSyncStatus({ syncStatus: 'synced', lastSyncedAt: new Date().toISOString() });
      syncsThisPage += 1;
      announce(result, syncsThisPage === 1, freshSignIn);
      return result;
    } catch (error) {
      console.warn('[Sync] failed:', error && error.code ? `${error.code}: ${error.message}` : error);
      authController.setSyncStatus({ syncStatus: isOffline() ? 'offline' : 'error' });
      return null;
    } finally {
      running = null;
      if (followUpPush) {
        followUpPush = false;
        queueMicrotask(() => runSync());
      }
    }
  })();
  return running;
}

/**
 * Account deletion step: wait for any in-flight sync, block new ones, then remove every cloud
 * snapshot. Sync stays paused until the session ends (or resumeSync after a failed deletion).
 * @param {string} uid
 */
export async function deleteCloudProgress(uid) {
  paused = true;
  if (running) await running;
  const { createFirestoreCloudAdapter } = await import('./FirestoreCloudAdapter.js');
  await createFirestoreCloudAdapter(FIREBASE_CONFIG, uid).deleteAll();
}

/** Re-enable syncing after an account deletion was cancelled or failed. */
export function resumeSync() {
  paused = false;
}

function isStale() {
  const last = Date.parse(authState.value.lastSyncedAt || '');
  return !Number.isFinite(last) || Date.now() - last > SYNC_STALE_AFTER_MS;
}

/** Install background triggers; returns a cleanup function. */
function startTriggers() {
  /** @type {ReturnType<typeof setTimeout>|null} */
  let pushTimer = null;
  /** When the oldest change not yet pushed was made (0 = nothing pending). */
  let pendingSince = 0;

  const cancelPendingPush = () => {
    if (pushTimer) clearTimeout(pushTimer);
    pushTimer = null;
    pendingSince = 0;
  };
  const pushNow = () => {
    cancelPendingPush();
    runSync();
  };
  // Trailing debounce, capped so non-stop study still uploads every SYNC_PUSH_MAX_WAIT_MS.
  const onLocalChange = () => {
    if (flushing) return;
    const now = Date.now();
    if (!pendingSince) pendingSince = now;
    const untilCap = Math.max(0, pendingSince + SYNC_PUSH_MAX_WAIT_MS - now);
    if (pushTimer) clearTimeout(pushTimer);
    pushTimer = setTimeout(pushNow, Math.min(SYNC_PUSH_DEBOUNCE_MS, untilCap));
  };
  const onVisibility = () => {
    // Leaving the tab flushes changes; coming back syncs if the data may be outdated.
    if (document.visibilityState === 'hidden' || isStale()) pushNow();
  };
  const onOnline = () => pushNow();
  const onOffline = () => authController.setSyncStatus({ syncStatus: 'offline' });
  const pollTimer = setInterval(() => {
    if (document.visibilityState === 'visible') runSync({ push: false });
  }, SYNC_POLL_INTERVAL_MS);

  window.addEventListener(SYNC_LOCAL_CHANGE_EVENT, onLocalChange);
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('online', onOnline);
  window.addEventListener('offline', onOffline);
  return () => {
    clearInterval(pollTimer);
    cancelPendingPush();
    window.removeEventListener(SYNC_LOCAL_CHANGE_EVENT, onLocalChange);
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('online', onOnline);
    window.removeEventListener('offline', onOffline);
  };
}

/** Start syncing whenever an account becomes signed in; stop on sign-out. */
export function mountSync() {
  if (!authController.isConfigured) return;

  const pending = sessionGet(SYNC_PENDING_NOTICE_KEY);
  if (pending === 'merged') syncNotice.value = 'merged';
  sessionSet(SYNC_PENDING_NOTICE_KEY, null);

  let activeUid = null;
  let stopTriggers = null;
  effect(() => {
    const { status, user } = authState.value;
    if (status === 'signed_in' && user && user.id !== activeUid) {
      activeUid = user.id;
      if (stopTriggers) stopTriggers();
      stopTriggers = startTriggers();
      // Run outside the effect: runSync writes the same signal this effect reads.
      queueMicrotask(runSync);
    } else if (status === 'guest' && activeUid) {
      activeUid = null;
      paused = false;
      if (stopTriggers) stopTriggers();
      stopTriggers = null;
      syncNotice.value = null;
    }
  });
}
