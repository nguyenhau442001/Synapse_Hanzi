// Firebase web app configuration (Project settings → Your apps → Web).
// These values are public by design; access is protected by Firestore security rules and by
// restricting the browser API key to the app's domains (docs/auth-sync-plan.md §11).
// While any field is empty, sign-in stays hidden and the app runs in guest mode only.

/**
 * @typedef {Object} FirebaseWebConfig
 * @property {string} apiKey
 * @property {string} authDomain  `<project>.firebaseapp.com`, hosts the Google sign-in popup.
 * @property {string} projectId
 * @property {string} appId
 */

/** @type {Readonly<FirebaseWebConfig>} */
export const FIREBASE_CONFIG = Object.freeze({
  apiKey: '',
  authDomain: '',
  projectId: '',
  appId: '',
});

/**
 * @param {FirebaseWebConfig} [config]
 * @returns {boolean} True when every required field is filled in.
 */
export function isFirebaseConfigured(config = FIREBASE_CONFIG) {
  return Boolean(config && config.apiKey && config.authDomain && config.projectId && config.appId);
}
