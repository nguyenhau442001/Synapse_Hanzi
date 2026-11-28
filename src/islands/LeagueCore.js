// Pure leaderboard logic: week numbers, the device XP ledger, profile parsing and the
// "XP needed to overtake" maths. No Firebase or DOM here, so everything is unit-tested
// (tools/test_league_core.mjs).

import {
  LEAGUE_WEEK_MS,
  LEAGUE_TZ_OFFSET_MS,
  LEAGUE_WEEK_SHIFT_MS,
  LEAGUE_MAX_XP_PER_WRITE,
  LEAGUE_WEEKLY_XP_CAP,
  LEAGUE_XP,
  LEAGUE_NICKNAME_PATTERN,
  LEAGUE_AVATARS,
  LEAGUE_DEFAULT_AVATAR,
  LEAGUE_MAX_REMEMBERED_WEEKS,
  MS_PER_DAY,
} from './LeagueConstants.js';

/**
 * Synced league settings (LEAGUE_PROFILE_KEY).
 * @typedef {Object} LeagueProfile
 * @property {boolean} optedIn   Whether XP is counted and the user is shown on the board.
 * @property {string} nickname   Public name; never the email.
 * @property {string} avatar     LEAGUE_AVATARS id.
 * @property {number[]} weeks    Week numbers this account wrote to (for leaving / deletion).
 */

/**
 * Device-only XP ledger (LEAGUE_LEDGER_KEY).
 * @typedef {Object} LeagueLedger
 * @property {number} weekNo                  Week the pending XP belongs to.
 * @property {number} pendingXp               Earned on this device, not yet uploaded.
 * @property {number} lastWriteAt             Epoch ms of the last successful upload.
 * @property {Object<string, number>} awarded One-time award key → week number.
 */

/**
 * One row of the board as read from Firestore.
 * @typedef {Object} LeagueEntry
 * @property {string} uid
 * @property {string} nickname
 * @property {string} avatar
 * @property {number} xp
 */

/** Week number in Vietnam time; changes at Monday 00:00 (UTC+7). Same formula as the rules. */
export function leagueWeekNo(timeMs = Date.now()) {
  return Math.floor((timeMs + LEAGUE_TZ_OFFSET_MS + LEAGUE_WEEK_SHIFT_MS) / LEAGUE_WEEK_MS);
}

/** Epoch ms of the Monday 00:00 (Vietnam) that starts `weekNo`. */
export function leagueWeekStartMs(weekNo) {
  return weekNo * LEAGUE_WEEK_MS - LEAGUE_TZ_OFFSET_MS - LEAGUE_WEEK_SHIFT_MS;
}

/** ISO-like week-of-year label (1–53) for display, computed from the week's Thursday. */
export function leagueWeekOfYear(weekNo) {
  const THURSDAY_OFFSET_DAYS = 3;
  const thursday = new Date(leagueWeekStartMs(weekNo) + LEAGUE_TZ_OFFSET_MS + THURSDAY_OFFSET_DAYS * MS_PER_DAY);
  const yearStart = Date.UTC(thursday.getUTCFullYear(), 0, 1);
  const DAYS_PER_WEEK = 7;
  return Math.floor((thursday.getTime() - yearStart) / MS_PER_DAY / DAYS_PER_WEEK) + 1;
}

/** "24/11 – 30/11" for the week, in Vietnam dates. */
export function leagueWeekRange(weekNo) {
  const fmt = (ms) => {
    const d = new Date(ms + LEAGUE_TZ_OFFSET_MS);
    return `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
  };
  const start = leagueWeekStartMs(weekNo);
  return `${fmt(start)} – ${fmt(start + LEAGUE_WEEK_MS - MS_PER_DAY)}`;
}

/** Days and hours left until the next weekly reset. */
export function leagueTimeUntilReset(timeMs = Date.now()) {
  const MS_PER_HOUR = 60 * 60 * 1000;
  const HOURS_PER_DAY = 24;
  const left = Math.max(0, leagueWeekStartMs(leagueWeekNo(timeMs) + 1) - timeMs);
  const totalHours = Math.floor(left / MS_PER_HOUR);
  return { days: Math.floor(totalHours / HOURS_PER_DAY), hours: totalHours % HOURS_PER_DAY };
}

// ---------- Profile ----------

/** Trim and collapse spaces; returns the cleaned nickname or null when invalid. */
export function cleanNickname(raw) {
  if (typeof raw !== 'string') return null;
  const nickname = raw.trim().replace(/\s+/g, ' ');
  return LEAGUE_NICKNAME_PATTERN.test(nickname) ? nickname : null;
}

export function isAvatarId(id) {
  return LEAGUE_AVATARS.some((avatar) => avatar.id === id);
}

export function avatarById(id) {
  return LEAGUE_AVATARS.find((avatar) => avatar.id === id) || LEAGUE_AVATARS[0];
}

/** @returns {LeagueProfile} */
export function emptyProfile() {
  return { optedIn: false, nickname: '', avatar: LEAGUE_DEFAULT_AVATAR, weeks: [] };
}

/** Parse stored JSON defensively (it may come from another device via sync). */
export function parseProfile(raw) {
  let value = null;
  try { value = JSON.parse(raw); } catch { value = null; }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return emptyProfile();
  const nickname = cleanNickname(value.nickname) || '';
  const weeks = Array.isArray(value.weeks) ? value.weeks.filter(Number.isInteger).slice(-LEAGUE_MAX_REMEMBERED_WEEKS) : [];
  return {
    optedIn: value.optedIn === true && Boolean(nickname),
    nickname,
    avatar: isAvatarId(value.avatar) ? value.avatar : LEAGUE_DEFAULT_AVATAR,
    weeks,
  };
}

/** Add a week to the join history (unique, capped). */
export function rememberWeek(profile, weekNo) {
  if (profile.weeks.includes(weekNo)) return profile;
  return { ...profile, weeks: [...profile.weeks, weekNo].slice(-LEAGUE_MAX_REMEMBERED_WEEKS) };
}

// ---------- Ledger ----------

/** @returns {LeagueLedger} */
export function emptyLedger(weekNo) {
  return { weekNo, pendingXp: 0, lastWriteAt: 0, awarded: {} };
}

/**
 * Parse the ledger and roll it over to `weekNo`: XP pending for a finished week can no longer be
 * uploaded (the rules only accept the current week), so it is dropped with that week's awards.
 * @returns {LeagueLedger}
 */
export function parseLedger(raw, weekNo) {
  let value = null;
  try { value = JSON.parse(raw); } catch { value = null; }
  if (!value || typeof value !== 'object' || !Number.isInteger(value.weekNo)) return emptyLedger(weekNo);
  const awarded = {};
  if (value.awarded && typeof value.awarded === 'object') {
    for (const [key, week] of Object.entries(value.awarded)) {
      if (week === weekNo) awarded[key] = week;
    }
  }
  const sameWeek = value.weekNo === weekNo;
  const pendingXp = sameWeek && Number.isInteger(value.pendingXp) && value.pendingXp > 0 ? value.pendingXp : 0;
  const lastWriteAt = Number.isFinite(value.lastWriteAt) ? value.lastWriteAt : 0;
  return { weekNo, pendingXp: Math.min(pendingXp, LEAGUE_WEEKLY_XP_CAP), lastWriteAt, awarded };
}

/**
 * Add XP to the ledger. `onceKey` makes an award one-time per week (daily goal, streak bonus).
 * @returns {{ ledger: LeagueLedger, added: number }}
 */
export function addXp(ledger, xp, onceKey = null) {
  if (!Number.isInteger(xp) || xp <= 0) return { ledger, added: 0 };
  if (onceKey && Object.hasOwn(ledger.awarded, onceKey)) return { ledger, added: 0 };
  const room = Math.max(0, LEAGUE_WEEKLY_XP_CAP - ledger.pendingXp);
  const added = Math.min(xp, room);
  const awarded = onceKey ? { ...ledger.awarded, [onceKey]: ledger.weekNo } : ledger.awarded;
  return { ledger: { ...ledger, pendingXp: ledger.pendingXp + added, awarded }, added };
}

/** XP to upload in the next write, within the per-write limit. */
export function nextUploadXp(ledger) {
  return Math.min(ledger.pendingXp, LEAGUE_MAX_XP_PER_WRITE);
}

/** Ledger after `xp` was uploaded successfully at `timeMs`. */
export function markUploaded(ledger, xp, timeMs) {
  return { ...ledger, pendingXp: Math.max(0, ledger.pendingXp - xp), lastWriteAt: timeMs };
}

// ---------- Board maths ----------

/** Cards to review to earn `xp`. */
export function cardsForXp(xp) {
  return Math.ceil(Math.max(0, xp) / LEAGUE_XP.CARD_REVIEW);
}

/**
 * Where the user stands relative to their neighbours on a sorted board.
 * @param {LeagueEntry[]} board  Sorted by xp desc.
 * @param {string} uid
 * @param {number} myXp
 * @param {number} myRank  1-based rank (from the count query when outside the board).
 * @returns {{ rank: number, xp: number, above: LeagueEntry|null, needToOvertake: number,
 *   below: LeagueEntry|null, leadBy: number }}
 */
export function standing(board, uid, myXp, myRank) {
  const others = board.filter((entry) => entry.uid !== uid);
  const above = [...others].reverse().find((entry) => entry.xp >= myXp && entry.xp > 0) || null;
  const below = others.find((entry) => entry.xp < myXp) || null;
  return {
    rank: myRank,
    xp: myXp,
    above: myRank > 1 ? above : null,
    // Overtaking means strictly more XP than the person above.
    needToOvertake: myRank > 1 && above ? above.xp - myXp + 1 : 0,
    below,
    leadBy: below ? myXp - below.xp : 0,
  };
}
