// Firebase-backed AuthProvider. Imported lazily by AuthStore, so guests never download the SDK.

import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  reauthenticateWithPopup,
  deleteUser,
} from 'firebase/auth';
import { AUTH_LANGUAGE, GOOGLE_PROMPT } from './AuthConstants.js';
import { getFirebaseApp } from './FirebaseApp.js';

/**
 * @param {import('./FirebaseConfig.js').FirebaseWebConfig} config
 * @returns {import('./AuthStore.js').AuthProvider}
 */
export function createFirebaseAuthProvider(config) {
  const app = getFirebaseApp(config);
  // getAuth persists the session in IndexedDB and wires the popup resolver.
  const auth = getAuth(app);
  auth.languageCode = AUTH_LANGUAGE;
  const google = new GoogleAuthProvider();
  google.setCustomParameters({ prompt: GOOGLE_PROMPT });

  return {
    onChange: (callback) => onAuthStateChanged(auth, callback),
    signIn: () => signInWithPopup(auth, google).then((result) => result.user),
    signOut: () => signOut(auth),
    async deleteAccount(beforeDelete) {
      const user = auth.currentUser;
      if (!user) throw Object.assign(new Error('No signed-in user'), { code: 'auth/no-current-user' });
      // Firebase requires a recent sign-in to delete an account; this also confirms identity.
      await reauthenticateWithPopup(user, google);
      await beforeDelete(user.uid);
      await deleteUser(user);
    },
  };
}
