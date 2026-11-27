// Firebase web app configuration (Project settings → Your apps → Web).
// These values are public by design; access is protected by Firestore security rules and by
// restricting the browser API key to the app's domains (docs/auth-sync-plan.md §11).
// Clearing any field hides sign-in and returns the app to guest-only mode.

/**
 * @typedef {Object} FirebaseWebConfig
 * @property {string} apiKey
 * @property {string} authDomain  `<project>.firebaseapp.com`, hosts the Google sign-in popup.
 * @property {string} projectId
 * @property {string} appId
 */

/** Build-time variables (Vite). Undefined under plain Node, e.g. in unit tests. */
const BUILD_ENV = (typeof import.meta !== 'undefined' && import.meta.env) || {};

/**
 * The API key is injected at build time from VITE_FIREBASE_API_KEY: `.env` locally (git-ignored,
 * see `.env.example`) and the repository secret of the same name in the deploy workflow.
 * It still ships to every browser by design; protection comes from Firestore rules and the
 * key's HTTP-referrer restriction, not from secrecy.
 * @type {Readonly<FirebaseWebConfig>}
 */
export const FIREBASE_CONFIG = Object.freeze({
  apiKey: BUILD_ENV.VITE_FIREBASE_API_KEY || '',
  authDomain: 'hanzi-mind-dd34c.firebaseapp.com',
  projectId: 'hanzi-mind-dd34c',
  appId: '1:586898345523:web:56bef101cb9fa7f3261d46',
});

/**
 * @param {FirebaseWebConfig} [config]
 * @returns {boolean} True when every required field is filled in.
 */
export function isFirebaseConfigured(config = FIREBASE_CONFIG) {
  return Boolean(config && config.apiKey && config.authDomain && config.projectId && config.appId);
}
