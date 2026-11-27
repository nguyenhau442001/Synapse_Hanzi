// Single Firebase app instance shared by the lazily loaded auth provider and cloud adapter.

import { getApp, getApps, initializeApp } from 'firebase/app';

/**
 * @param {import('./FirebaseConfig.js').FirebaseWebConfig} config
 * @returns {import('firebase/app').FirebaseApp}
 */
export function getFirebaseApp(config) {
  return getApps().length ? getApp() : initializeApp(config);
}
