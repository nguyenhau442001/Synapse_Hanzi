// Reactive Google sign-in state (Preact Signals), mirroring the HeaderStore.js pattern.
// Guests never load the Firebase SDK: it is imported only when the login dialog opens or when
// the device flag says a session already exists.

import { signal } from '@preact/signals';
import { FIREBASE_CONFIG, isFirebaseConfigured } from './FirebaseConfig.js';
import { listSyncKeys } from './SyncRegistry.js';
import { SYNC_STATE_KEY } from './SyncConstants.js';
import {
  AUTH_SESSION_FLAG_KEY,
  AUTH_SESSION_FLAG_ON,
  AUTH_ERROR_MESSAGES,
  AUTH_LABELS,
  AVATAR_URL_PATTERN,
} from './AuthConstants.js';

/**
 * Minimal surface of an identity backend; FirebaseAuthProvider.js implements it.
 * @typedef {Object} AuthProvider
 * @property {(callback: (user: object|null) => void) => () => void} onChange  Fires once with the
 *   restored session (or null), then on every sign-in/out. Returns an unsubscribe function.
 * @property {() => Promise<object>} signIn   Opens the Google popup; resolves with the user.
 * @property {() => Promise<void>} signOut
 * @property {(beforeDelete: (uid: string) => Promise<void>) => Promise<void>} deleteAccount
 *   Re-authenticates (popup), runs `beforeDelete` (cloud data removal), then deletes the user.
 */

/**
 * Signed-in user profile, read from the identity provider and never persisted by the app.
 * @typedef {Object} AuthUser
 * @property {string} id                Firebase uid.
 * @property {string|null} email
 * @property {string|null} displayName
 * @property {string|null} avatarUrl    Only https Google avatar URLs, else null.
 */

/**
 * @typedef {Object} AuthState
 * @property {'guest'|'signing_in'|'signed_in'} status
 * @property {AuthUser|null} user
 * @property {'idle'|'syncing'|'synced'|'offline'|'error'} syncStatus  Driven by SyncEngine (phase 3).
 * @property {string|null} lastSyncedAt  ISO time of the last successful sync.
 * @property {string|null} errorMessage  A label from AUTH_LABELS, never raw error text.
 */

/** @typedef {'login'|'logout'|'delete'|null} AuthDialog */

/** @type {Readonly<AuthState>} */
export const INITIAL_AUTH_STATE = Object.freeze({
  status: 'guest',
  user: null,
  syncStatus: 'idle',
  lastSyncedAt: null,
  errorMessage: null,
});

const textOrNull = (value) => (typeof value === 'string' && value.trim() ? value.trim() : null);

/**
 * Map a provider user object to the app's AuthUser (drops every other field).
 * @param {any} providerUser
 * @returns {AuthUser|null}
 */
export function toAuthUser(providerUser) {
  if (!providerUser || typeof providerUser.uid !== 'string' || !providerUser.uid) return null;
  const avatar = textOrNull(providerUser.photoURL);
  return {
    id: providerUser.uid,
    email: textOrNull(providerUser.email),
    displayName: textOrNull(providerUser.displayName),
    avatarUrl: avatar && AVATAR_URL_PATTERN.test(avatar) ? avatar : null,
  };
}

/**
 * @param {any} error
 * @returns {string|null} A user-facing label, or null when the user cancelled on purpose.
 */
export function authErrorMessage(error) {
  const code = error && typeof error.code === 'string' ? error.code : '';
  return Object.prototype.hasOwnProperty.call(AUTH_ERROR_MESSAGES, code) ? AUTH_ERROR_MESSAGES[code] : AUTH_LABELS.ERROR_GENERIC;
}

/**
 * @typedef {Object} AuthControllerOptions
 * @property {() => Promise<AuthProvider>} loadProvider
 * @property {Pick<Storage, 'getItem'|'setItem'|'removeItem'|'length'|'key'>} storage
 * @property {boolean} isConfigured
 * @property {() => Promise<void>} [clearDeviceData]  Extra stores to wipe on "clear this device".
 * @property {(uid: string) => Promise<void>} [deleteCloudData]  Removes the user's cloud progress.
 * @property {() => Promise<void>} [onDeleteFailed]  Undo side effects of a failed deletion.
 * @property {() => void} [reload]
 */

/** @param {AuthControllerOptions} options */
export function createAuthController(options) {
  const { loadProvider, storage, isConfigured } = options;
  const clearDeviceData = options.clearDeviceData || (async () => {});
  const reload = options.reload || (() => {});
  const deleteCloudData = options.deleteCloudData || (async () => {});
  const onDeleteFailed = options.onDeleteFailed || (async () => {});

  const state = signal(INITIAL_AUTH_STATE);
  /** @type {import('@preact/signals').Signal<AuthDialog>} */
  const dialog = signal(null);
  /** @type {AuthProvider|null} */
  let provider = null;
  /** @type {Promise<AuthProvider>|null} */
  let providerPromise = null;
  /** True between an interactive sign-in and the first sync that follows it. */
  let freshSignIn = false;

  const patch = (next) => { state.value = { ...state.value, ...next }; };

  const setSessionFlag = (on) => {
    try {
      if (on) storage.setItem(AUTH_SESSION_FLAG_KEY, AUTH_SESSION_FLAG_ON);
      else storage.removeItem(AUTH_SESSION_FLAG_KEY);
    } catch { /* storage unavailable: the session still works for this page load */ }
  };

  const hasSessionFlag = () => {
    try { return storage.getItem(AUTH_SESSION_FLAG_KEY) === AUTH_SESSION_FLAG_ON; } catch { return false; }
  };

  function applyUser(providerUser) {
    const user = toAuthUser(providerUser);
    setSessionFlag(Boolean(user));
    patch(user
      ? { status: 'signed_in', user, errorMessage: null }
      : { status: 'guest', user: null, syncStatus: 'idle', lastSyncedAt: null });
  }

  /** Load the SDK once; concurrent callers share the same promise, failures allow a retry. */
  function ensureProvider() {
    if (!providerPromise) {
      providerPromise = loadProvider()
        .then((loaded) => {
          provider = loaded;
          loaded.onChange(applyUser);
          return loaded;
        })
        .catch((error) => {
          providerPromise = null;
          throw error;
        });
    }
    return providerPromise;
  }

  /** Restore an existing session on startup. Guests return immediately without network. */
  async function init() {
    if (!isConfigured || !hasSessionFlag()) return;
    patch({ status: 'signing_in' });
    try {
      await ensureProvider();
    } catch (error) {
      patch({ status: 'guest', errorMessage: authErrorMessage(error) });
    }
  }

  /** Open the login dialog and preload the SDK so the popup can open inside the next click. */
  function openLogin() {
    if (!isConfigured) return;
    patch({ errorMessage: null });
    dialog.value = 'login';
    ensureProvider().catch(() => { /* reported when the user presses the Google button */ });
  }

  async function signIn() {
    if (!isConfigured) return false;
    patch({ status: 'signing_in', errorMessage: null });
    try {
      // Browsers only allow a popup during a user gesture, so call signIn synchronously when the
      // SDK is already loaded; awaiting a download first may get the popup blocked.
      const active = provider || await ensureProvider();
      const signedInUser = await active.signIn();
      freshSignIn = true;
      applyUser(signedInUser);
      dialog.value = null;
      return true;
    } catch (error) {
      patch({ status: state.value.user ? 'signed_in' : 'guest', errorMessage: authErrorMessage(error) });
      return false;
    }
  }

  /** @param {{ clearLocalData: boolean }} choice */
  async function signOut({ clearLocalData }) {
    try {
      const active = provider || await ensureProvider();
      await active.signOut();
    } catch (error) {
      patch({ errorMessage: authErrorMessage(error) });
      return false;
    }
    applyUser(null);
    dialog.value = null;
    if (clearLocalData) {
      for (const key of listSyncKeys(storage)) storage.removeItem(key);
      await clearDeviceData();
      reload();
    }
    return true;
  }

  /**
   * Delete the cloud progress and the account; local progress stays for guest use.
   * The provider opens the re-authentication popup first, so this must run from a click.
   */
  async function deleteAccount() {
    try {
      // The SDK is always loaded while signed in, so the popup opens inside the click gesture.
      const active = provider || await ensureProvider();
      await active.deleteAccount(deleteCloudData);
    } catch (error) {
      await onDeleteFailed();
      const message = authErrorMessage(error);
      patch({ errorMessage: message === AUTH_LABELS.ERROR_GENERIC ? AUTH_LABELS.ERROR_DELETE_FAILED : message });
      return false;
    }
    try { storage.removeItem(SYNC_STATE_KEY); } catch { /* nothing left to reset */ }
    applyUser(null);
    dialog.value = null;
    return true;
  }

  return {
    state,
    dialog,
    deleteAccount,
    openDeleteAccount: () => {
      patch({ errorMessage: null });
      dialog.value = 'delete';
    },
    isConfigured,
    init,
    openLogin,
    openLogout: () => { dialog.value = 'logout'; },
    /** True once after an interactive sign-in (not a restored session). */
    consumeFreshSignIn: () => {
      const value = freshSignIn;
      freshSignIn = false;
      return value;
    },
    /** Sync progress reported by SyncController. @param {Pick<AuthState, 'syncStatus'> & Partial<Pick<AuthState, 'lastSyncedAt'>>} next */
    setSyncStatus: (next) => patch({
      syncStatus: next.syncStatus,
      ...(next.lastSyncedAt !== undefined ? { lastSyncedAt: next.lastSyncedAt } : {}),
    }),
    closeDialog: () => { dialog.value = null; },
    signIn,
    signOut,
  };
}

/** In-memory Storage stand-in for environments without localStorage. */
function memoryStorage() {
  const map = new Map();
  return {
    get length() { return map.size; },
    key: (i) => [...map.keys()][i] ?? null,
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => { map.set(k, String(v)); },
    removeItem: (k) => { map.delete(k); },
  };
}

export const authController = createAuthController({
  loadProvider: () => import('./FirebaseAuthProvider.js').then((mod) => mod.createFirebaseAuthProvider(FIREBASE_CONFIG)),
  storage: typeof localStorage !== 'undefined' ? localStorage : memoryStorage(),
  isConfigured: isFirebaseConfigured(),
  // SyncController owns cloud access (imported lazily to avoid a circular import).
  deleteCloudData: async (uid) => (await import('./SyncController.js')).deleteCloudProgress(uid),
  onDeleteFailed: async () => (await import('./SyncController.js')).resumeSync(),
  clearDeviceData: async () => {
    const { db } = await import('./db.js');
    if (db) await Promise.all([db.cards.clear(), db.reviewLogs.clear()]);
  },
  reload: () => window.location.reload(),
});

export const authState = authController.state;
export const authDialog = authController.dialog;
