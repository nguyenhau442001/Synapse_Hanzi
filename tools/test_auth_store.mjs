import assert from 'node:assert/strict';
import { createAuthController, toAuthUser, authErrorMessage, INITIAL_AUTH_STATE } from '../src/islands/AuthStore.js';
import { AUTH_SESSION_FLAG_KEY, AUTH_LABELS } from '../src/islands/AuthConstants.js';
import { SYNC_STATE_KEY } from '../src/islands/SyncConstants.js';
import { isFirebaseConfigured } from '../src/islands/FirebaseConfig.js';

class MemoryStorage {
  constructor(initial = {}) { this.map = new Map(Object.entries(initial)); }
  get length() { return this.map.size; }
  key(i) { return [...this.map.keys()][i] ?? null; }
  getItem(k) { return this.map.has(k) ? this.map.get(k) : null; }
  setItem(k, v) { this.map.set(k, String(v)); }
  removeItem(k) { this.map.delete(k); }
}

const googleUser = {
  uid: 'uid-1',
  email: 'learner@example.com',
  displayName: '  Minh Anh ',
  photoURL: 'https://lh3.googleusercontent.com/a/photo',
  stsTokenManager: { accessToken: 'secret' },
};

/** Fake provider: records calls and lets the test drive onChange. */
function fakeProvider({ restored = null, signInResult = googleUser, signInError = null, deleteError = null } = {}) {
  const calls = { loads: 0, signIn: 0, signOut: 0, deleted: 0 };
  let listener = null;
  const provider = {
    onChange(cb) { listener = cb; Promise.resolve().then(() => cb(restored)); return () => {}; },
    async signIn() { calls.signIn += 1; if (signInError) throw signInError; return signInResult; },
    async signOut() { calls.signOut += 1; if (listener) listener(null); },
    async deleteAccount(beforeDelete) {
      if (deleteError) throw deleteError;
      await beforeDelete('uid-1');
      calls.deleted += 1;
      if (listener) listener(null);
    },
  };
  return { calls, load: async () => { calls.loads += 1; return provider; } };
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

// Config gate and pure helpers.
assert.equal(isFirebaseConfigured({ apiKey: '', authDomain: 'a', projectId: 'p', appId: 'x' }), false);
assert.equal(isFirebaseConfigured({ apiKey: 'k', authDomain: 'a', projectId: 'p', appId: 'x' }), true);
assert.deepEqual(toAuthUser(googleUser), {
  id: 'uid-1',
  email: 'learner@example.com',
  displayName: 'Minh Anh',
  avatarUrl: 'https://lh3.googleusercontent.com/a/photo',
});
assert.equal(toAuthUser({ ...googleUser, photoURL: 'javascript:alert(1)' }).avatarUrl, null);
assert.equal(toAuthUser({ ...googleUser, photoURL: 'https://evil.example/x.png' }).avatarUrl, null);
assert.equal(toAuthUser(null), null);
assert.equal(toAuthUser({ uid: '' }), null);
assert.equal(authErrorMessage({ code: 'auth/popup-closed-by-user' }), null);
assert.equal(authErrorMessage({ code: 'auth/popup-blocked' }), AUTH_LABELS.ERROR_POPUP_BLOCKED);
assert.equal(authErrorMessage({ code: 'toString' }), AUTH_LABELS.ERROR_GENERIC);
assert.equal(authErrorMessage(new Error('raw internal text')), AUTH_LABELS.ERROR_GENERIC);

// Not configured: nothing loads, nothing opens.
{
  const fake = fakeProvider();
  const auth = createAuthController({ loadProvider: fake.load, storage: new MemoryStorage(), isConfigured: false });
  await auth.init();
  auth.openLogin();
  assert.equal(await auth.signIn(), false);
  assert.equal(fake.calls.loads, 0);
  assert.equal(auth.dialog.value, null);
}

// Guest startup: no session flag means the SDK is never downloaded.
{
  const fake = fakeProvider();
  const auth = createAuthController({ loadProvider: fake.load, storage: new MemoryStorage(), isConfigured: true });
  await auth.init();
  assert.equal(fake.calls.loads, 0);
  assert.deepEqual(auth.state.value, INITIAL_AUTH_STATE);
}

// Login flow: opening the dialog preloads the SDK once; sign-in stores only the flag.
{
  const fake = fakeProvider();
  const storage = new MemoryStorage();
  const auth = createAuthController({ loadProvider: fake.load, storage, isConfigured: true });
  auth.openLogin();
  assert.equal(auth.dialog.value, 'login');
  await flush();
  assert.equal(await auth.signIn(), true);
  assert.equal(fake.calls.loads, 1);
  assert.equal(auth.state.value.status, 'signed_in');
  assert.equal(auth.state.value.user.displayName, 'Minh Anh');
  assert.equal(auth.dialog.value, null);
  assert.equal(storage.getItem(AUTH_SESSION_FLAG_KEY), '1');
  assert.equal([...storage.map.values()].some((v) => v.includes('secret')), false);
}

// Cancelled popup: back to guest with no error; blocked popup: friendly label.
{
  const cancelled = fakeProvider({ signInError: { code: 'auth/popup-closed-by-user' } });
  const auth = createAuthController({ loadProvider: cancelled.load, storage: new MemoryStorage(), isConfigured: true });
  assert.equal(await auth.signIn(), false);
  assert.equal(auth.state.value.status, 'guest');
  assert.equal(auth.state.value.errorMessage, null);

  const blocked = fakeProvider({ signInError: { code: 'auth/popup-blocked' } });
  const auth2 = createAuthController({ loadProvider: blocked.load, storage: new MemoryStorage(), isConfigured: true });
  await auth2.signIn();
  assert.equal(auth2.state.value.errorMessage, AUTH_LABELS.ERROR_POPUP_BLOCKED);
}

// SDK download failure is retryable.
{
  let attempts = 0;
  const good = fakeProvider();
  const loadProvider = async () => { attempts += 1; if (attempts === 1) throw new Error('offline'); return good.load(); };
  const auth = createAuthController({ loadProvider, storage: new MemoryStorage(), isConfigured: true });
  assert.equal(await auth.signIn(), false);
  assert.equal(auth.state.value.errorMessage, AUTH_LABELS.ERROR_GENERIC);
  assert.equal(await auth.signIn(), true);
}

// Session restore on startup; an expired session clears the flag.
{
  const fake = fakeProvider({ restored: googleUser });
  const storage = new MemoryStorage({ [AUTH_SESSION_FLAG_KEY]: '1' });
  const auth = createAuthController({ loadProvider: fake.load, storage, isConfigured: true });
  const pending = auth.init();
  assert.equal(auth.state.value.status, 'signing_in');
  await pending;
  await flush();
  assert.equal(auth.state.value.status, 'signed_in');

  const expired = fakeProvider({ restored: null });
  const storage2 = new MemoryStorage({ [AUTH_SESSION_FLAG_KEY]: '1' });
  const auth2 = createAuthController({ loadProvider: expired.load, storage: storage2, isConfigured: true });
  await auth2.init();
  await flush();
  assert.equal(auth2.state.value.status, 'guest');
  assert.equal(storage2.getItem(AUTH_SESSION_FLAG_KEY), null);
}

// Sign out, keep data: progress stays. Sign out, clear: only progress keys go, then reload.
{
  const progress = { hsk_hsk1_srs_v3: '{}', hsk_study_activity_v1: '{}', hsk_theme: 'dark' };
  const fake = fakeProvider({ restored: googleUser });
  const storage = new MemoryStorage({ ...progress, [AUTH_SESSION_FLAG_KEY]: '1' });
  const auth = createAuthController({ loadProvider: fake.load, storage, isConfigured: true });
  await auth.init();
  await flush();
  assert.equal(await auth.signOut({ clearLocalData: false }), true);
  assert.equal(auth.state.value.status, 'guest');
  assert.equal(storage.getItem('hsk_hsk1_srs_v3'), '{}');
  assert.equal(storage.getItem(AUTH_SESSION_FLAG_KEY), null);

  let reloaded = 0;
  let cleared = 0;
  const storage2 = new MemoryStorage({ ...progress, [AUTH_SESSION_FLAG_KEY]: '1' });
  const auth2 = createAuthController({
    loadProvider: fakeProvider({ restored: googleUser }).load,
    storage: storage2,
    isConfigured: true,
    clearDeviceData: async () => { cleared += 1; },
    reload: () => { reloaded += 1; },
  });
  await auth2.init();
  await flush();
  auth2.openLogout();
  assert.equal(auth2.dialog.value, 'logout');
  await auth2.signOut({ clearLocalData: true });
  assert.equal(storage2.getItem('hsk_hsk1_srs_v3'), null);
  assert.equal(storage2.getItem('hsk_study_activity_v1'), null);
  assert.equal(storage2.getItem('hsk_theme'), 'dark');
  assert.equal(cleared, 1);
  assert.equal(reloaded, 1);
  assert.equal(auth2.dialog.value, null);
}

// Account deletion: cloud data removed before the account, local progress kept, sync state reset.
{
  const fake = fakeProvider({ restored: googleUser });
  const storage = new MemoryStorage({ hsk_hsk1_srs_v3: '{}', [SYNC_STATE_KEY]: '{"uid":"uid-1"}', [AUTH_SESSION_FLAG_KEY]: '1' });
  const cloudDeletes = [];
  let failures = 0;
  const auth = createAuthController({
    loadProvider: fake.load,
    storage,
    isConfigured: true,
    deleteCloudData: async (uid) => { cloudDeletes.push(uid); },
    onDeleteFailed: async () => { failures += 1; },
  });
  await auth.init();
  await flush();
  auth.openDeleteAccount();
  assert.equal(auth.dialog.value, 'delete');
  assert.equal(await auth.deleteAccount(), true);
  assert.deepEqual(cloudDeletes, ['uid-1']);
  assert.equal(fake.calls.deleted, 1);
  assert.equal(auth.state.value.status, 'guest');
  assert.equal(auth.dialog.value, null);
  assert.equal(storage.getItem('hsk_hsk1_srs_v3'), '{}');
  assert.equal(storage.getItem(SYNC_STATE_KEY), null);
  assert.equal(storage.getItem(AUTH_SESSION_FLAG_KEY), null);
  assert.equal(failures, 0);
}

// Cancelled re-authentication: nothing deleted, still signed in, no error shown, sync resumed.
// Other failures show the deletion-specific message.
{
  for (const [error, expected] of [
    [{ code: 'auth/popup-closed-by-user' }, null],
    [{ code: 'auth/user-mismatch' }, AUTH_LABELS.ERROR_USER_MISMATCH],
    [new Error('permission-denied'), AUTH_LABELS.ERROR_DELETE_FAILED],
  ]) {
    const fake = fakeProvider({ restored: googleUser, deleteError: error });
    let failures = 0;
    let cloudDeleted = false;
    const auth = createAuthController({
      loadProvider: fake.load,
      storage: new MemoryStorage({ [AUTH_SESSION_FLAG_KEY]: '1' }),
      isConfigured: true,
      deleteCloudData: async () => { cloudDeleted = true; },
      onDeleteFailed: async () => { failures += 1; },
    });
    await auth.init();
    await flush();
    auth.openDeleteAccount();
    assert.equal(await auth.deleteAccount(), false);
    assert.equal(cloudDeleted, false);
    assert.equal(failures, 1);
    assert.equal(auth.state.value.status, 'signed_in');
    assert.equal(auth.dialog.value, 'delete');
    assert.equal(auth.state.value.errorMessage, expected);
  }
}

console.log('auth store tests passed');
