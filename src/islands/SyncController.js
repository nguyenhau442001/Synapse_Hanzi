// Runs SyncEngine for the signed-in user and reports progress into AuthStore.syncStatus.
// Phase 3: one sync whenever a session starts (sign-in or restored session).
// Automatic triggers and the status UI come in phase 4 (docs/auth-sync-plan.md §7).

import { effect } from '@preact/signals';
import { authController, authState } from './AuthStore.js';
import { FIREBASE_CONFIG } from './FirebaseConfig.js';
import { SRS } from './SrsEngine.js';
import { createSyncEngine } from './SyncEngine.js';
import { SYNC_RELOAD_GUARD_KEY } from './SyncConstants.js';

/** @type {Promise<import('./SyncEngine.js').SyncResult|null>|null} */
let running = null;

/** Persist the in-memory active deck so the sync sees the latest reviews. */
function flushActiveDeck() {
  if (typeof window === 'undefined' || !window.currentLevel) return;
  if (typeof window.saveProgress === 'function') window.saveProgress();
}

/**
 * Islands read storage when they mount, so new data from another device needs a reload.
 * The session guard prevents a reload loop if a value keeps changing.
 */
function reloadOnce() {
  try {
    if (sessionStorage.getItem(SYNC_RELOAD_GUARD_KEY)) return;
    sessionStorage.setItem(SYNC_RELOAD_GUARD_KEY, '1');
  } catch {
    return;
  }
  window.location.reload();
}

/**
 * Sync now for the signed-in user. Concurrent calls share one run.
 * @returns {Promise<import('./SyncEngine.js').SyncResult|null>}
 */
export function runSync() {
  if (running) return running;
  const { status, user } = authState.value;
  if (status !== 'signed_in' || !user) return Promise.resolve(null);
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    authController.setSyncStatus({ syncStatus: 'offline' });
    return Promise.resolve(null);
  }

  authController.setSyncStatus({ syncStatus: 'syncing' });
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
      const result = await engine.sync();
      // The user may have signed out while the request was in flight.
      if (authState.value.user?.id !== user.id) return result;
      authController.setSyncStatus({ syncStatus: 'synced', lastSyncedAt: new Date().toISOString() });
      if (result.applied > 0) reloadOnce();
      return result;
    } catch (error) {
      console.warn('[Sync] failed:', error && error.code ? error.code : error);
      const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
      authController.setSyncStatus({ syncStatus: offline ? 'offline' : 'error' });
      return null;
    } finally {
      running = null;
    }
  })();
  return running;
}

/** Start syncing whenever a different account becomes signed in. */
export function mountSync() {
  if (!authController.isConfigured) return;
  let syncedUid = null;
  effect(() => {
    const { status, user } = authState.value;
    if (status === 'signed_in' && user && user.id !== syncedUid) {
      syncedUid = user.id;
      // Run outside the effect: runSync writes the same signal this effect reads.
      queueMicrotask(runSync);
    } else if (status === 'guest') {
      syncedUid = null;
    }
  });
}
