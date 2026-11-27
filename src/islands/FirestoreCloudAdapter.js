// CloudAdapter over Firestore Lite (REST: no offline cache or listeners, which local storage
// already covers). Loaded lazily for signed-in users only. Layout and security rules:
// docs/auth-sync-plan.md §3.

import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  doc,
  writeBatch,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore/lite';
import { getFirebaseApp } from './FirebaseApp.js';
import { SYNC_USERS_COLLECTION, SYNC_SNAPSHOTS_COLLECTION } from './SyncConstants.js';

/**
 * Convert a Firestore document to a CloudSnapshot; malformed documents become null.
 * @param {string} namespace
 * @param {Record<string, unknown>} data
 * @returns {import('./SyncEngine.js').CloudSnapshot|null}
 */
export function toCloudSnapshot(namespace, data) {
  if (!data || typeof data.data !== 'string') return null;
  let entries;
  try { entries = JSON.parse(data.data); } catch { return null; }
  const updatedAt = data.updatedAt && typeof data.updatedAt.toDate === 'function' ? data.updatedAt.toDate().toISOString() : null;
  return {
    namespace,
    schemaVersion: data.schemaVersion,
    deviceId: typeof data.deviceId === 'string' ? data.deviceId : '',
    updatedAt,
    entries,
  };
}

/**
 * @param {import('./FirebaseConfig.js').FirebaseWebConfig} config
 * @param {string} uid  The signed-in user's uid; rules reject any other path.
 * @returns {import('./SyncEngine.js').CloudAdapter}
 */
export function createFirestoreCloudAdapter(config, uid) {
  const firestore = getFirestore(getFirebaseApp(config));
  const snapshots = collection(firestore, SYNC_USERS_COLLECTION, uid, SYNC_SNAPSHOTS_COLLECTION);

  return {
    async pullSince(sinceIso) {
      const source = sinceIso ? query(snapshots, where('updatedAt', '>', Timestamp.fromDate(new Date(sinceIso)))) : snapshots;
      const result = await getDocs(source);
      return result.docs.map((item) => toCloudSnapshot(item.id, item.data())).filter(Boolean);
    },

    async push(items) {
      const batch = writeBatch(firestore);
      for (const item of items) {
        batch.set(doc(snapshots, item.namespace), {
          schemaVersion: item.schemaVersion,
          deviceId: item.deviceId,
          updatedAt: serverTimestamp(),
          data: JSON.stringify(item.entries),
        });
      }
      await batch.commit();
    },
  };
}
