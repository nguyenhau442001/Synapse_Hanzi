// Firebase-backed AuthProvider. Imported lazily by AuthStore, so guests never download the SDK.

import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { AUTH_LANGUAGE, GOOGLE_PROMPT } from './AuthConstants.js';

/**
 * @param {import('./FirebaseConfig.js').FirebaseWebConfig} config
 * @returns {import('./AuthStore.js').AuthProvider}
 */
export function createFirebaseAuthProvider(config) {
  const app = initializeApp(config);
  // getAuth persists the session in IndexedDB and wires the popup resolver.
  const auth = getAuth(app);
  auth.languageCode = AUTH_LANGUAGE;
  const google = new GoogleAuthProvider();
  google.setCustomParameters({ prompt: GOOGLE_PROMPT });

  return {
    onChange: (callback) => onAuthStateChanged(auth, callback),
    signIn: () => signInWithPopup(auth, google).then((result) => result.user),
    signOut: () => signOut(auth),
  };
}
