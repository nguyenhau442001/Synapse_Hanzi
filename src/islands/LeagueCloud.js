// Leaderboard access over Firestore Lite: upload XP deltas, read the weekly top and the user's
// rank, and delete the user's entries. Loaded lazily for signed-in users only.
// Every write is checked by firestore.rules (leagues/{weekNo}/entries/{uid}).

import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  orderBy,
  where,
  limit,
  getCount,
  increment,
  serverTimestamp,
} from 'firebase/firestore/lite';
import { getFirebaseApp } from './FirebaseApp.js';
import {
  LEAGUE_COLLECTION,
  LEAGUE_ENTRIES_COLLECTION,
  LEAGUE_SCHEMA_VERSION,
  LEAGUE_TOP_LIMIT,
} from './LeagueConstants.js';
import { cleanNickname, isAvatarId } from './LeagueCore.js';

/** Firestore data → LeagueEntry, or null for anything malformed (other users' data is untrusted). */
export function toLeagueEntry(id, data) {
  if (!data || typeof data !== 'object') return null;
  const nickname = cleanNickname(data.nickname);
  if (!nickname || !Number.isInteger(data.xp) || data.xp < 0) return null;
  return { uid: id, nickname, avatar: isAvatarId(data.avatar) ? data.avatar : 'crane', xp: data.xp };
}

/**
 * @param {import('./FirebaseConfig.js').FirebaseWebConfig} config
 * @param {string} uid
 */
export function createLeagueCloud(config, uid) {
  const firestore = getFirestore(getFirebaseApp(config));
  const entries = (weekNo) => collection(firestore, LEAGUE_COLLECTION, String(weekNo), LEAGUE_ENTRIES_COLLECTION);
  const myEntry = (weekNo) => doc(entries(weekNo), uid);

  return {
    /**
     * Add `xp` to this week's entry (creating it on the first write) and refresh name/avatar.
     * increment() lets several devices add XP without overwriting each other.
     */
    async addXp(weekNo, xp, profile) {
      await setDoc(myEntry(weekNo), {
        uid,
        nickname: profile.nickname,
        avatar: profile.avatar,
        xp: increment(xp),
        updatedAt: serverTimestamp(),
        schemaVersion: LEAGUE_SCHEMA_VERSION,
      }, { merge: true });
    },

    /** @returns {Promise<import('./LeagueCore.js').LeagueEntry[]>} sorted by XP, highest first */
    async top(weekNo) {
      const result = await getDocs(query(entries(weekNo), orderBy('xp', 'desc'), limit(LEAGUE_TOP_LIMIT)));
      return result.docs.map((item) => toLeagueEntry(item.id, item.data())).filter(Boolean);
    },

    /** @returns {Promise<import('./LeagueCore.js').LeagueEntry|null>} */
    async mine(weekNo) {
      const snapshot = await getDoc(myEntry(weekNo));
      return snapshot.exists() ? toLeagueEntry(snapshot.id, snapshot.data()) : null;
    },

    /** 1-based rank for `xp`: everyone with more XP, plus one (one aggregation read). */
    async rankFor(weekNo, xp) {
      const result = await getCount(query(entries(weekNo), where('xp', '>', xp)));
      return result.data().count + 1;
    },

    /** Total people on the board this week. */
    async size(weekNo) {
      const result = await getCount(entries(weekNo));
      return result.data().count;
    },

    /** Delete this user's entries for the given weeks (leaving, account deletion). */
    async removeWeeks(weeks) {
      await Promise.all(weeks.map((weekNo) => deleteDoc(myEntry(weekNo))));
    },
  };
}
