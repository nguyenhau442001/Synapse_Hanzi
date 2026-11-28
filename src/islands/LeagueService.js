// Weekly leaderboard runtime: turns learning activity into XP, uploads it within the rules'
// limits, loads the board, and handles joining / leaving. UI state lives in signals read by
// LeagueBoard.jsx. Firebase is imported lazily (LeagueCloud.js), only for signed-in users.

import { signal } from '@preact/signals';
import { authState } from './AuthStore.js';
import { FIREBASE_CONFIG } from './FirebaseConfig.js';
import {
  LEAGUE_ACTIVITY,
  LEAGUE_ACTIVITY_EVENT,
  LEAGUE_BOARD_CACHE_MS,
  LEAGUE_LEDGER_KEY,
  LEAGUE_MIN_WRITE_INTERVAL_MS,
  LEAGUE_PROFILE_KEY,
  LEAGUE_STREAK_BONUS,
  LEAGUE_TOAST_MS,
  LEAGUE_UPLOAD_DEBOUNCE_MS,
  LEAGUE_XP,
  LEAGUE_XP_CHIP_MS,
} from './LeagueConstants.js';
import {
  addXp,
  cleanNickname,
  emptyLedger,
  emptyProfile,
  leagueWeekNo,
  markUploaded,
  nextUploadXp,
  parseLedger,
  parseProfile,
  rememberWeek,
  standing,
} from './LeagueCore.js';

/**
 * @typedef {Object} LeagueBoardState
 * @property {'idle'|'loading'|'ready'|'error'} status
 * @property {number|null} weekNo
 * @property {import('./LeagueCore.js').LeagueEntry[]} entries  Top of the week, XP desc.
 * @property {ReturnType<typeof standing>|null} me              Null when not on the board.
 * @property {number} size                                      People on the board.
 * @property {number} fetchedAt
 */

/** @typedef {'board'|'join'|'edit'|'leave'|'left'|null} LeagueView */

/** @type {import('@preact/signals').Signal<import('./LeagueCore.js').LeagueProfile>} */
export const leagueProfile = signal(emptyProfile());
/** @type {import('@preact/signals').Signal<LeagueBoardState>} */
export const leagueBoard = signal({ status: 'idle', weekNo: null, entries: [], me: null, size: 0, fetchedAt: 0 });
/** @type {import('@preact/signals').Signal<LeagueView>} */
export const leagueView = signal(null);
/** Last award, for the "+N XP" chip: { xp, id }. */
export const leagueXpFlash = signal(null);
/** Milestone toast: { kind: 'goal'|'streak', xp, days? }. */
export const leagueToast = signal(null);
/** Week shown on the board: this week (0) or last week (-1). */
export const leagueWeekOffset = signal(0);

const storage = () => (typeof localStorage !== 'undefined' ? localStorage : null);

function readStored(key) {
  try { return storage()?.getItem(key) ?? null; } catch { return null; }
}

function writeStored(key, value) {
  try { storage()?.setItem(key, value); } catch { /* storage full or blocked: XP stays in memory */ }
}

function readLedger() {
  return parseLedger(readStored(LEAGUE_LEDGER_KEY), leagueWeekNo());
}

function saveLedger(ledger) {
  writeStored(LEAGUE_LEDGER_KEY, JSON.stringify(ledger));
}

function saveProfile(profile) {
  leagueProfile.value = profile;
  writeStored(LEAGUE_PROFILE_KEY, JSON.stringify(profile));
}

const signedInUid = () => {
  const { status, user } = authState.value;
  return status === 'signed_in' && user ? user.id : null;
};

const isCounting = () => Boolean(signedInUid()) && leagueProfile.value.optedIn;

let cloudPromise = null;
let cloudUid = null;
async function cloud() {
  const uid = signedInUid();
  if (!uid) throw new Error('league: not signed in');
  if (!cloudPromise || cloudUid !== uid) {
    cloudUid = uid;
    cloudPromise = import('./LeagueCloud.js').then((mod) => mod.createLeagueCloud(FIREBASE_CONFIG, uid));
  }
  return cloudPromise;
}

// ---------- XP ----------

let flashId = 0;
let toastTimer = null;
let flashTimer = null;

function showFlash(xp) {
  flashId += 1;
  leagueXpFlash.value = { xp, id: flashId };
  clearTimeout(flashTimer);
  flashTimer = setTimeout(() => { leagueXpFlash.value = null; }, LEAGUE_XP_CHIP_MS);
}

function showToast(toast) {
  leagueToast.value = toast;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { leagueToast.value = null; }, LEAGUE_TOAST_MS);
}

/** Add XP to the device ledger and schedule an upload. Returns the XP actually added. */
export function awardXp(xp, onceKey = null) {
  if (!isCounting()) return 0;
  const { ledger, added } = addXp(readLedger(), xp, onceKey);
  if (!added) return 0;
  saveLedger(ledger);
  scheduleUpload();
  return added;
}

/** Map one learning activity to XP (see LEAGUE_ACTIVITY). */
function onActivity(event) {
  const detail = event && event.detail ? event.detail : {};
  switch (detail.kind) {
    case LEAGUE_ACTIVITY.CARD: {
      const added = awardXp(LEAGUE_XP.CARD_REVIEW);
      if (added) showFlash(added);
      break;
    }
    case LEAGUE_ACTIVITY.QUIZ: {
      const added = awardXp(LEAGUE_XP.QUIZ_CORRECT);
      if (added) showFlash(added);
      break;
    }
    case LEAGUE_ACTIVITY.LESSON: {
      const added = detail.key ? awardXp(LEAGUE_XP.LESSON_DONE, 'lesson:' + detail.key) : 0;
      if (added) showFlash(added);
      break;
    }
    case LEAGUE_ACTIVITY.EXAM: {
      const added = awardXp(LEAGUE_XP.EXAM_SUBMITTED, detail.id ? 'exam:' + detail.id : null);
      if (added) showFlash(added);
      break;
    }
    case LEAGUE_ACTIVITY.DAY: {
      const { date, wordsToday, goal, streak } = detail;
      if (!date) break;
      if (goal > 0 && wordsToday >= goal) {
        const added = awardXp(LEAGUE_XP.DAILY_GOAL, 'goal:' + date);
        if (added) showToast({ kind: 'goal', xp: added });
      }
      const bonus = LEAGUE_STREAK_BONUS[streak];
      if (bonus) {
        const added = awardXp(bonus, 'streak' + streak + ':' + date);
        if (added) showToast({ kind: 'streak', xp: added, days: streak });
      }
      break;
    }
    default:
      break;
  }
}

// ---------- Upload ----------

let uploadTimer = null;
let uploading = null;

function scheduleUpload(delay = LEAGUE_UPLOAD_DEBOUNCE_MS) {
  clearTimeout(uploadTimer);
  const ledger = readLedger();
  const wait = Math.max(delay, ledger.lastWriteAt + LEAGUE_MIN_WRITE_INTERVAL_MS - Date.now());
  uploadTimer = setTimeout(() => { uploadNow(); }, wait);
}

/** Upload pending XP now if the rules' rate limit allows; otherwise reschedule. */
export function uploadNow() {
  if (uploading) return uploading;
  if (!isCounting()) return Promise.resolve();
  const ledger = readLedger();
  const xp = nextUploadXp(ledger);
  if (xp <= 0) return Promise.resolve();
  if (Date.now() - ledger.lastWriteAt < LEAGUE_MIN_WRITE_INTERVAL_MS) {
    scheduleUpload(0);
    return Promise.resolve();
  }
  uploading = (async () => {
    try {
      await (await cloud()).addXp(ledger.weekNo, xp, leagueProfile.value);
      const after = markUploaded(readLedger(), xp, Date.now());
      saveLedger(after);
      saveProfile(rememberWeek(leagueProfile.value, ledger.weekNo));
      leagueBoard.value = { ...leagueBoard.value, fetchedAt: 0 };
      if (after.pendingXp > 0) scheduleUpload(0);
    } catch (error) {
      if (error && error.code === 'permission-denied') {
        // Rejected by the rules (finished week, weekly cap): retrying would fail forever.
        console.warn('[League] upload rejected; pending XP dropped');
        saveLedger({ ...readLedger(), pendingXp: 0 });
      } else {
        console.warn('[League] upload failed:', error && error.code ? error.code : error);
      }
    } finally {
      uploading = null;
    }
  })();
  return uploading;
}

// ---------- Board ----------

/** Load (or reuse) the board for this or last week. */
export async function loadBoard({ force = false } = {}) {
  const uid = signedInUid();
  if (!uid) return;
  const weekNo = leagueWeekNo() + leagueWeekOffset.value;
  const current = leagueBoard.value;
  const fresh = current.status === 'ready' && current.weekNo === weekNo && Date.now() - current.fetchedAt < LEAGUE_BOARD_CACHE_MS;
  if (fresh && !force) return;
  leagueBoard.value = { ...current, status: 'loading', weekNo };
  try {
    if (leagueWeekOffset.value === 0) await uploadNow();
    const api = await cloud();
    const [entries, size] = await Promise.all([api.top(weekNo), api.size(weekNo)]);
    let me = null;
    const onBoard = entries.findIndex((entry) => entry.uid === uid);
    if (onBoard >= 0) {
      me = standing(entries, uid, entries[onBoard].xp, onBoard + 1);
    } else if (leagueProfile.value.optedIn) {
      const mine = await api.mine(weekNo);
      if (mine) me = standing(entries, uid, mine.xp, await api.rankFor(weekNo, mine.xp));
    }
    leagueBoard.value = { status: 'ready', weekNo, entries, me, size, fetchedAt: Date.now() };
  } catch (error) {
    console.warn('[League] board failed:', error && error.code ? error.code : error);
    leagueBoard.value = { ...leagueBoard.value, status: 'error' };
  }
}

// ---------- Join / profile / leave ----------

/**
 * Join (or update the public profile). Writes a 0-XP entry so the user appears right away.
 * @returns {Promise<boolean>}
 */
export async function saveLeagueProfile(nicknameInput, avatar) {
  const nickname = cleanNickname(nicknameInput);
  if (!nickname || !signedInUid()) return false;
  const weekNo = leagueWeekNo();
  const profile = rememberWeek({ ...leagueProfile.value, optedIn: true, nickname, avatar }, weekNo);
  try {
    await (await cloud()).addXp(weekNo, 0, profile);
  } catch (error) {
    // An existing entry written in the last 20 s is rate-limited; the next upload carries the new name.
    if (!(error && error.code === 'permission-denied' && leagueProfile.value.optedIn)) {
      console.warn('[League] join failed:', error && error.code ? error.code : error);
      return false;
    }
  }
  saveProfile(profile);
  saveLedger({ ...readLedger(), lastWriteAt: Date.now() });
  leagueBoard.value = { ...leagueBoard.value, fetchedAt: 0 };
  return true;
}

/** Remove every entry this account wrote and stop counting XP. */
export async function leaveLeague() {
  const profile = leagueProfile.value;
  const weeks = [...new Set([...profile.weeks, leagueWeekNo()])];
  try {
    await (await cloud()).removeWeeks(weeks);
  } catch (error) {
    console.warn('[League] leave failed:', error && error.code ? error.code : error);
    return false;
  }
  saveProfile({ ...profile, optedIn: false, weeks: [] });
  saveLedger(emptyLedger(leagueWeekNo()));
  leagueBoard.value = { ...leagueBoard.value, fetchedAt: 0 };
  return true;
}

/** Account deletion: remove all league entries of `uid` (called before the account is deleted). */
export async function deleteLeagueData(uid) {
  const profile = parseProfile(readStored(LEAGUE_PROFILE_KEY));
  const weeks = [...new Set([...profile.weeks, leagueWeekNo()])];
  const { createLeagueCloud } = await import('./LeagueCloud.js');
  await createLeagueCloud(FIREBASE_CONFIG, uid).removeWeeks(weeks);
  saveProfile({ ...profile, optedIn: false, weeks: [] });
  saveLedger(emptyLedger(leagueWeekNo()));
}

// ---------- Mount ----------

export function mountLeague() {
  if (typeof window === 'undefined') return;
  leagueProfile.value = parseProfile(readStored(LEAGUE_PROFILE_KEY));
  window.addEventListener(LEAGUE_ACTIVITY_EVENT, onActivity);
  // Another tab or a cloud sync may change the synced profile.
  window.addEventListener('storage', (event) => {
    if (event.key === LEAGUE_PROFILE_KEY) leagueProfile.value = parseProfile(event.newValue);
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') uploadNow();
  });
  // Upload XP left over from an earlier visit once the session is restored.
  authState.subscribe((state) => {
    if (state.status === 'signed_in' && leagueProfile.value.optedIn && readLedger().pendingXp > 0) scheduleUpload(0);
  });
}

/** Open the leaderboard (board view; the board itself offers joining). */
export function openLeague() {
  leagueView.value = 'board';
  loadBoard();
}

export function closeLeague() {
  leagueView.value = null;
}

/** Switch between this week (0) and last week (-1). */
export function setLeagueWeekOffset(offset) {
  leagueWeekOffset.value = offset;
  loadBoard();
}
