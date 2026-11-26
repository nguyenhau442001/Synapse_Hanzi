// src/islands/StorageEngine.js
// Local persistence for the currently selected HSK level and cross-level SRS progress.

import { SRS } from './SrsEngine.js';

export const SRS_SCHEMA_VERSION = 3;
export const SRS_RETENTION_KEY = 'hsk_srs_prefs_v1';

// Study directions, each with its own FSRS deck. The default direction keeps the original
// storage keys, so existing progress needs no migration.
//   zh2vi  : Hán -> nghĩa (default)   listen : Nghe -> nghĩa   vi2zh : Việt -> Hán/pinyin
export const STUDY_DIRECTIONS = ['zh2vi', 'listen', 'vi2zh'];
export const DEFAULT_STUDY_DIRECTION = 'zh2vi';
export const STUDY_DIRECTION_KEY = 'hsk_study_direction_v1';

export function normalizeStudyDirection(direction) {
  return STUDY_DIRECTIONS.includes(direction) ? direction : DEFAULT_STUDY_DIRECTION;
}

export function readStudyDirection() {
  try { return normalizeStudyDirection(localStorage.getItem(STUDY_DIRECTION_KEY)); } catch (e) { return DEFAULT_STUDY_DIRECTION; }
}

export function saveStudyDirection(direction) {
  const next = normalizeStudyDirection(direction);
  try { localStorage.setItem(STUDY_DIRECTION_KEY, next); } catch (e) {}
  return next;
}

function directionSuffix(direction) {
  const dir = normalizeStudyDirection(direction);
  return dir === DEFAULT_STUDY_DIRECTION ? '' : '_' + dir;
}

export function srsCardsKey(level, direction) {
  return 'hsk_' + level + '_srs_v3' + directionSuffix(direction);
}

export function reviewLogKey(level, direction) {
  return 'hsk_' + level + '_review_log_v1' + directionSuffix(direction);
}

// True when (level, direction) is the deck currently loaded on the study screen.
function isActiveDeck(level, direction) {
  const activeLevel = typeof currentLevel !== 'undefined' ? currentLevel : (typeof window !== 'undefined' ? window.currentLevel : null);
  return level === activeLevel && normalizeStudyDirection(direction) === readStudyDirection();
}

export function readSrsRecord(level, direction) {
  try {
    const record = JSON.parse(localStorage.getItem(srsCardsKey(level, direction)));
    if (record && record.schemaVersion === SRS_SCHEMA_VERSION && record.cards && typeof record.cards === 'object') return record;
  } catch (e) {}
  return null;
}

export function readSrsReviewLog(level, direction) {
  try {
    const log = JSON.parse(localStorage.getItem(reviewLogKey(level, direction)));
    return Array.isArray(log) ? log : [];
  } catch (e) { return []; }
}

export function saveSrsRecord(level, cards, migratedFromV2, direction) {
  try {
    localStorage.setItem(srsCardsKey(level, direction), JSON.stringify({
      schemaVersion: SRS_SCHEMA_VERSION,
      migratedFromV2: Boolean(migratedFromV2),
      cards,
    }));
  } catch (e) {}
}

export function appendReviewLog(level, entry, direction) {
  try {
    const current = readSrsReviewLog(level, direction);
    current.push(entry);
    localStorage.setItem(reviewLogKey(level, direction), JSON.stringify(current));
    if (isActiveDeck(level, direction)) {
      if (typeof reviewLog !== 'undefined') reviewLog = current;
      if (typeof window !== 'undefined') window.reviewLog = current;
    }
  } catch (e) {}
}

export function appendImportedReviewLog(level, entries, direction) {
  if (!Array.isArray(entries)) return;
  try {
    const current = readSrsReviewLog(level, direction);
    const seen = new Set(current.map(entry => [level, entry.wordId, entry.timestamp, entry.rating, entry.stateBefore, entry.stateAfter].join('|')));
    const additions = entries.filter(entry => {
      if (!entry || typeof entry !== 'object' || !entry.timestamp || !entry.rating) return false;
      const key = [level, entry.wordId, entry.timestamp, entry.rating, entry.stateBefore, entry.stateAfter].join('|');
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    if (!additions.length) return;
    const normalized = additions.map(entry => ({ ...entry, level }));
    localStorage.setItem(reviewLogKey(level, direction), JSON.stringify(current.concat(normalized)));
    if (isActiveDeck(level, direction)) {
      const merged = current.concat(normalized);
      if (typeof reviewLog !== 'undefined') reviewLog = merged;
      if (typeof window !== 'undefined') window.reviewLog = merged;
    }
  } catch (e) {}
}

export function retentionFromPrefs() {
  try {
    const prefs = JSON.parse(localStorage.getItem(SRS_RETENTION_KEY));
    if (prefs && Number.isFinite(Number(prefs.desiredRetention))) return SRS.normalizeRetention(prefs.desiredRetention);
  } catch (e) {}
  return SRS.DEFAULT_RETENTION;
}

export function saveRetention(value) {
  const norm = SRS.normalizeRetention(value);
  if (typeof srsRetention !== 'undefined') srsRetention = norm;
  if (typeof window !== 'undefined') window.srsRetention = norm;
  try { localStorage.setItem(SRS_RETENTION_KEY, JSON.stringify({ desiredRetention: norm })); } catch (e) {}
  return norm;
}

/**
 * Derived UI mastery status for an FSRS card (never persisted).
 * - null: New / unseen card (Chưa học)
 * - 'known': Review card (even when due) or Learning card graded 'good'/'easy' (Đã nhớ)
 * - 'unknown': Relearning card or Learning card graded 'again' (Cần ôn)
 * @param {Object|null|undefined} card
 * @returns {'known'|'unknown'|null}
 */
export function statusFromCard(card) {
  if (!card || card.state === undefined || card.state === SRS.State.New) return null;
  if (card.state === SRS.State.Review) return 'known';
  if (card.state === SRS.State.Learning && card.last_rating !== 'again') return 'known';
  return 'unknown';
}

export function progressFromCards(cards) {
  const statuses = {};
  Object.keys(cards || {}).forEach(id => {
    const status = statusFromCard(cards[id]);
    if (status) statuses[id] = status;
  });
  return statuses;
}

export function migrateLegacyProgress(level, words, legacyProgress, retention) {
  const cards = {};
  const now = new Date();
  (words || []).forEach(word => {
    let card = SRS.createNewCard(now);
    const legacyStatus = legacyProgress && legacyProgress[word.id];
    if (legacyStatus === 'known') {
      // Reviewed once and graduated, due again after a short interval (1-7 days, spread out
      // so a large legacy deck does not all fall due on the same day).
      card = SRS.review(card, 'good', now, retention).card;
      card.state = SRS.State.Review;
      card.last_rating = 'good';
      const due = new Date(now.getTime());
      due.setDate(due.getDate() + 1 + Math.floor(Math.random() * 7));
      card.due = due.toISOString();
      card.scheduled_days = Math.round((due.getTime() - now.getTime()) / 86400000);
    } else if (legacyStatus === 'unknown') {
      // Forgotten: in relearning and due right now.
      card = SRS.review(card, 'again', now, retention).card;
      card.last_rating = 'again';
      card.due = now.toISOString();
    }
    card.historyStartAt = now.toISOString();
    cards[word.id] = card;
  });
  return cards;
}

export function loadSrsForLevel(level, words, legacyProgress, direction) {
  const retention = retentionFromPrefs();
  if (typeof srsRetention !== 'undefined') srsRetention = retention;
  if (typeof window !== 'undefined') window.srsRetention = retention;
  const existing = readSrsRecord(level, direction);
  const isDefaultDirection = normalizeStudyDirection(direction) === DEFAULT_STUDY_DIRECTION;
  let cards;
  let migratedFromV2;
  if (existing) {
    cards = existing.cards;
    migratedFromV2 = existing.migratedFromV2;
    (words || []).forEach(word => {
      if (!cards[word.id]) cards[word.id] = SRS.createNewCard();
    });
    // Cards saved by the old two-button scheduler are valid FSRS cards (their due dates are kept);
    // only the stored `status` field is dropped because the state is now derived from state/due.
    Object.keys(cards).forEach(id => {
      if (cards[id] && 'status' in cards[id]) delete cards[id].status;
    });
  } else if (isDefaultDirection) {
    cards = migrateLegacyProgress(level, words, legacyProgress || {}, retention);
    migratedFromV2 = true;
  } else {
    // Other directions start as a fresh deck: knowing 爸爸 -> 'bố' says little about recalling 爸爸 from 'bố'.
    cards = {};
    (words || []).forEach(word => { cards[word.id] = SRS.createNewCard(); });
    migratedFromV2 = false;
  }
  saveSrsRecord(level, cards, migratedFromV2, direction);
  return cards;
}

export function loadState() {
  const activeLevel = typeof currentLevel !== 'undefined' ? currentLevel : (typeof window !== 'undefined' ? window.currentLevel : null);
  const wordsList = typeof WORDS !== 'undefined' ? WORDS : (typeof window !== 'undefined' ? window.WORDS : []);
  const direction = readStudyDirection();
  const cards = loadSrsForLevel(activeLevel, wordsList, readSavedLevelProgressLegacy(activeLevel), direction);
  if (typeof srsCards !== 'undefined') srsCards = cards;
  if (typeof window !== 'undefined') window.srsCards = cards;

  const prog = progressFromCards(cards);
  if (typeof progress !== 'undefined') progress = prog;
  if (typeof window !== 'undefined') window.progress = prog;

  const rLog = readSrsReviewLog(activeLevel, direction);
  if (typeof reviewLog !== 'undefined') reviewLog = rLog;
  if (typeof window !== 'undefined') window.reviewLog = rLog;

  // SRS review hides pinyin on the front by default; the old showPinyin pref is ignored on purpose.
  if (typeof showPinyin !== 'undefined') showPinyin = false;
  if (typeof window !== 'undefined') window.showPinyin = false;

  const getStorageKey = typeof storageKey === 'function' ? storageKey : (typeof window !== 'undefined' ? window.storageKey : null);
  try {
    const key = getStorageKey ? getStorageKey('prefs') : ('hsk_' + activeLevel + '_prefs_v2');
    const pref = localStorage.getItem(key);
    if (pref) {
      const parsed = JSON.parse(pref);
      if (typeof parsed.frontPinyin === 'boolean') {
        if (typeof showPinyin !== 'undefined') showPinyin = parsed.frontPinyin;
        if (typeof window !== 'undefined') window.showPinyin = parsed.frontPinyin;
      }
      if (Array.isArray(parsed.order) && parsed.order.length === wordsList.length) {
        if (typeof order !== 'undefined') order = parsed.order;
        if (typeof window !== 'undefined') window.order = parsed.order;
      }
    }
  } catch (e) {}

  const currentRetention = typeof srsRetention !== 'undefined' ? srsRetention : (typeof window !== 'undefined' ? window.srsRetention : 0.9);
  const retentionSlider = document.getElementById('desiredRetentionSlider');
  const retentionLabel = document.getElementById('desiredRetentionValue');
  if (retentionSlider instanceof HTMLInputElement) retentionSlider.value = String(currentRetention);
  if (retentionLabel) retentionLabel.textContent = Math.round(currentRetention * 100) + '%';

  const currentOrder = typeof order !== 'undefined' ? order : (typeof window !== 'undefined' ? window.order : []);
  const copiedOrder = currentOrder.slice();
  if (typeof filteredOrder !== 'undefined') filteredOrder = copiedOrder;
  if (typeof window !== 'undefined') window.filteredOrder = copiedOrder;
}

export function saveProgress() {
  const activeLevel = typeof currentLevel !== 'undefined' ? currentLevel : (typeof window !== 'undefined' ? window.currentLevel : null);
  const activeCards = typeof srsCards !== 'undefined' ? srsCards : (typeof window !== 'undefined' ? window.srsCards : {});
  saveSrsRecord(activeLevel, activeCards, true, readStudyDirection());
}

// Pre-FSRS per-level progress map ({ wordId: 'known' | 'unknown' }), kept for migration.
export function readSavedLevelProgressLegacy(level) {
  try {
    const parsed = JSON.parse(localStorage.getItem('hsk_' + level + '_progress_v2'));
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch (e) { return {}; }
}

export function savePrefs() {
  const activeLevel = typeof currentLevel !== 'undefined' ? currentLevel : (typeof window !== 'undefined' ? window.currentLevel : null);
  const getStorageKey = typeof storageKey === 'function' ? storageKey : (typeof window !== 'undefined' ? window.storageKey : null);
  const currentShowPinyin = typeof showPinyin !== 'undefined' ? showPinyin : (typeof window !== 'undefined' ? window.showPinyin : false);
  const currentOrder = typeof order !== 'undefined' ? order : (typeof window !== 'undefined' ? window.order : []);
  const currentRetention = typeof srsRetention !== 'undefined' ? srsRetention : (typeof window !== 'undefined' ? window.srsRetention : 0.9);
  try {
    const key = getStorageKey ? getStorageKey('prefs') : ('hsk_' + activeLevel + '_prefs_v2');
    localStorage.setItem(key, JSON.stringify({ frontPinyin: currentShowPinyin, order: currentOrder, desiredRetention: currentRetention }));
  } catch (e) {}
}

// `direction` defaults to Hán -> nghĩa, so callers outside the study screen (Ôn hôm nay, quizzes,
// reading) keep writing to the original deck.
export function reviewSrsCard(level, wordId, rating, cardMap, direction) {
  const activeCards = typeof srsCards !== 'undefined' ? srsCards : (typeof window !== 'undefined' ? window.srsCards : {});
  const isActive = isActiveDeck(level, direction);
  const cards = cardMap || (isActive ? activeCards : readSrsRecord(level, direction)?.cards || {});
  let card = cards[wordId];
  if (!card) card = SRS.createNewCard();
  const now = new Date();
  const currentRetention = typeof srsRetention !== 'undefined' ? srsRetention : (typeof window !== 'undefined' ? window.srsRetention : 0.9);
  const result = SRS.review(card, rating, now, currentRetention);
  cards[wordId] = result.card;
  if (isActive) {
    if (typeof srsCards !== 'undefined') srsCards = cards;
    if (typeof window !== 'undefined') window.srsCards = cards;
    const prog = progressFromCards(cards);
    if (typeof progress !== 'undefined') progress = prog;
    if (typeof window !== 'undefined') window.progress = prog;
    const rLog = readSrsReviewLog(level, direction);
    if (typeof reviewLog !== 'undefined') reviewLog = rLog;
    if (typeof window !== 'undefined') window.reviewLog = rLog;
  }
  saveSrsRecord(level, cards, true, direction);
  appendReviewLog(level, {
    wordId,
    level,
    rating,
    timestamp: now.toISOString(),
    stateBefore: result.stateBefore,
    stateAfter: result.stateAfter,
    elapsedDays: result.elapsedDays,
    stabilityAfter: result.card.stability,
    difficultyAfter: result.card.difficulty,
    retrievabilityBefore: SRS.retrievability(card, now, currentRetention),
    fsrsLog: result.log,
  }, direction);
  return result;
}

// Cross-level review counters (home dashboard badge, daily new-card limit in fast review).
export function countNewReviewsToday(direction) {
  const getLocalDateKey = typeof localDateKey === 'function' ? localDateKey : (typeof window !== 'undefined' ? window.localDateKey : null);
  const today = getLocalDateKey ? getLocalDateKey(new Date()) : '';
  const reviewed = new Set();
  const levelsObj = typeof LEVELS !== 'undefined' ? LEVELS : (typeof window !== 'undefined' ? window.LEVELS : {});
  Object.keys(levelsObj).filter(level => levelsObj[level] && levelsObj[level].available).forEach(level => {
    readSrsReviewLog(level, direction).forEach(entry => {
      if (entry.stateBefore !== SRS.State.New || !entry.timestamp) return;
      const timestamp = new Date(entry.timestamp);
      if (!Number.isFinite(timestamp.getTime()) || (getLocalDateKey && getLocalDateKey(timestamp) !== today)) return;
      reviewed.add(level + ':' + entry.wordId);
    });
  });
  return reviewed.size;
}

// Regular decks are always reviewable; curriculum lesson decks only once studied.
export function isReviewableLevel(config, level) {
  if (!config) return false;
  if (config.available) return true;
  return Boolean(config.isLesson) && Boolean(readSrsRecord(level));
}

export const REVIEW_PREFS_KEY = 'hsk_review_prefs_v1';
export const DEFAULT_DAILY_REVIEW_CAP = 50;
export const DAILY_REVIEW_CAP_OPTIONS = [25, 50, 100, 150, 0];
export const REVIEW_SESSION_BATCH_SIZE = 25;
export const BACKLOG_OVERDUE_THRESHOLD_DAYS = 7;
export const MS_PER_DAY = 24 * 60 * 60 * 1000;
export const DEFAULT_REVIEW_PRIORITY_MODE = 'smart';
export const REVIEW_PRIORITY_MODES = ['smart', 'newest_due', 'oldest_due'];

const PRIORITY_TIER_LEARNING = 0;
const PRIORITY_TIER_TODAY = 1;
const PRIORITY_TIER_BACKLOG = 2;
const FALLBACK_STABILITY = 9999;

/**
 * Reads persisted daily review pacing and backlog preferences.
 * @returns {{ dailyReviewCap: number, sessionBatchSize: number, backlogThresholdDays: number, priorityMode: string }}
 */
export function readReviewPrefs() {
  const defaults = {
    dailyReviewCap: DEFAULT_DAILY_REVIEW_CAP,
    sessionBatchSize: REVIEW_SESSION_BATCH_SIZE,
    backlogThresholdDays: BACKLOG_OVERDUE_THRESHOLD_DAYS,
    priorityMode: DEFAULT_REVIEW_PRIORITY_MODE,
  };
  try {
    const raw = JSON.parse(localStorage.getItem(REVIEW_PREFS_KEY));
    if (!raw || typeof raw !== 'object') return defaults;
    const cap = Number(raw.dailyReviewCap);
    const batch = Number(raw.sessionBatchSize);
    const threshold = Number(raw.backlogThresholdDays);
    return {
      dailyReviewCap: Number.isFinite(cap) && cap >= 0 ? cap : defaults.dailyReviewCap,
      sessionBatchSize: Number.isFinite(batch) && batch > 0 ? batch : defaults.sessionBatchSize,
      backlogThresholdDays: Number.isFinite(threshold) && threshold > 0 ? threshold : defaults.backlogThresholdDays,
      priorityMode: REVIEW_PRIORITY_MODES.includes(raw.priorityMode) ? raw.priorityMode : defaults.priorityMode,
    };
  } catch (e) {
    return defaults;
  }
}

/**
 * Persists partial updates to daily review pacing preferences.
 * @param {Partial<{ dailyReviewCap: number, sessionBatchSize: number, backlogThresholdDays: number, priorityMode: string }>} partial
 */
export function saveReviewPrefs(partial) {
  const next = { ...readReviewPrefs(), ...(partial || {}) };
  try { localStorage.setItem(REVIEW_PREFS_KEY, JSON.stringify(next)); } catch (e) {}
  return next;
}

/**
 * Counts distinct non-new cards reviewed today across all reviewable levels.
 * @param {Date} [now]
 * @param {string} [direction]
 * @returns {number}
 */
export function countReviewedTodayAcrossLevels(now, direction) {
  const getLocalDateKey = typeof localDateKey === 'function' ? localDateKey : (typeof window !== 'undefined' ? window.localDateKey : null);
  const today = getLocalDateKey ? getLocalDateKey(now || new Date()) : '';
  const reviewed = new Set();
  const levelsObj = typeof LEVELS !== 'undefined' ? LEVELS : (typeof window !== 'undefined' ? window.LEVELS : {});
  Object.keys(levelsObj).filter(level => isReviewableLevel(levelsObj[level], level)).forEach(level => {
    readSrsReviewLog(level, direction).forEach(entry => {
      if (!entry || entry.stateBefore === SRS.State.New || !entry.timestamp) return;
      const timestamp = new Date(entry.timestamp);
      if (!Number.isFinite(timestamp.getTime()) || (getLocalDateKey && getLocalDateKey(timestamp) !== today)) return;
      reviewed.add(level + ':' + entry.wordId);
    });
  });
  return reviewed.size;
}

/**
 * Summarizes due cards across levels, separating recent due cards from long-overdue backlog.
 * @param {Date} [now]
 * @param {ReturnType<typeof readReviewPrefs>} [prefsOverride]
 */
export function summarizeDueCardsAcrossLevels(now, prefsOverride) {
  const currentTime = (now || new Date()).getTime();
  const prefs = prefsOverride || readReviewPrefs();
  const backlogMs = prefs.backlogThresholdDays * MS_PER_DAY;
  const levelsObj = typeof LEVELS !== 'undefined' ? LEVELS : (typeof window !== 'undefined' ? window.LEVELS : {});
  const byLevel = {};
  let totalDue = 0;
  let todayDue = 0;
  let backlogDue = 0;

  Object.keys(levelsObj).filter(level => isReviewableLevel(levelsObj[level], level)).forEach(level => {
    const record = readSrsRecord(level);
    let levelTotal = 0;
    let levelToday = 0;
    let levelBacklog = 0;
    if (record) {
      Object.values(record.cards).forEach(card => {
        if (!SRS.isDue(card, currentTime)) return;
        levelTotal += 1;
        const overdueMs = Math.max(0, currentTime - new Date(card.due).getTime());
        if (overdueMs > backlogMs) levelBacklog += 1;
        else levelToday += 1;
      });
    } else {
      const legacyCount = Object.values(readSavedLevelProgressLegacy(level)).filter(status => status === 'unknown').length;
      levelTotal = legacyCount;
      levelToday = legacyCount;
    }
    if (levelTotal > 0) {
      byLevel[level] = { total: levelTotal, today: levelToday, backlog: levelBacklog };
    }
    totalDue += levelTotal;
    todayDue += levelToday;
    backlogDue += levelBacklog;
  });

  const reviewedToday = countReviewedTodayAcrossLevels(now);
  const dailyCap = prefs.dailyReviewCap;
  const remainingTodayCap = dailyCap > 0 ? Math.max(0, dailyCap - reviewedToday) : totalDue;
  const recommendedToday = dailyCap > 0 ? Math.min(totalDue, remainingTodayCap) : totalDue;

  return {
    totalDue,
    todayDue,
    backlogDue,
    dailyCap,
    reviewedToday,
    remainingTodayCap,
    recommendedToday,
    byLevel,
  };
}

/**
 * Computes a deterministic sort comparison for prioritizing due cards in micro-sessions.
 * Lower values are reviewed earlier.
 * @param {{ due: number, card?: { state?: number, lapses?: number, stability?: number } }} a
 * @param {{ due: number, card?: { state?: number, lapses?: number, stability?: number } }} b
 * @param {number} currentTime
 * @param {string} [priorityMode]
 * @param {number} [backlogThresholdDays]
 */
export function compareDueCards(a, b, currentTime, priorityMode = DEFAULT_REVIEW_PRIORITY_MODE, backlogThresholdDays = BACKLOG_OVERDUE_THRESHOLD_DAYS) {
  if (priorityMode === 'oldest_due') return a.due - b.due;
  if (priorityMode === 'newest_due') return b.due - a.due;

  const backlogMs = backlogThresholdDays * MS_PER_DAY;
  const tierFor = (item) => {
    const state = item.card ? item.card.state : SRS.State.New;
    if (state === SRS.State.Learning || state === SRS.State.Relearning) return PRIORITY_TIER_LEARNING;
    const overdueMs = Math.max(0, currentTime - item.due);
    return overdueMs > backlogMs ? PRIORITY_TIER_BACKLOG : PRIORITY_TIER_TODAY;
  };

  const tierA = tierFor(a);
  const tierB = tierFor(b);
  if (tierA !== tierB) return tierA - tierB;

  const lapsesA = (a.card && Number.isFinite(a.card.lapses)) ? a.card.lapses : 0;
  const lapsesB = (b.card && Number.isFinite(b.card.lapses)) ? b.card.lapses : 0;
  if (lapsesA !== lapsesB) return lapsesB - lapsesA;

  const stabA = (a.card && Number.isFinite(a.card.stability)) ? a.card.stability : FALLBACK_STABILITY;
  const stabB = (b.card && Number.isFinite(b.card.stability)) ? b.card.stability : FALLBACK_STABILITY;
  if (stabA !== stabB) return stabA - stabB;

  return b.due - a.due;
}

export function countDueCardsAcrossLevels(now) {
  return summarizeDueCardsAcrossLevels(now).totalDue;
}

export function mountStorageEngine() {
  if (typeof window !== 'undefined') {
    Object.assign(window, {
      SRS_SCHEMA_VERSION,
      SRS_RETENTION_KEY,
      REVIEW_PREFS_KEY,
      DEFAULT_DAILY_REVIEW_CAP,
      DAILY_REVIEW_CAP_OPTIONS,
      REVIEW_SESSION_BATCH_SIZE,
      BACKLOG_OVERDUE_THRESHOLD_DAYS,
      DEFAULT_REVIEW_PRIORITY_MODE,
      REVIEW_PRIORITY_MODES,
      STUDY_DIRECTIONS,
      DEFAULT_STUDY_DIRECTION,
      normalizeStudyDirection,
      readStudyDirection,
      saveStudyDirection,
      srsCardsKey,
      reviewLogKey,
      readSrsRecord,
      readSrsReviewLog,
      saveSrsRecord,
      appendReviewLog,
      appendImportedReviewLog,
      retentionFromPrefs,
      saveRetention,
      readReviewPrefs,
      saveReviewPrefs,
      statusFromCard,
      progressFromCards,
      migrateLegacyProgress,
      loadSrsForLevel,
      loadState,
      saveProgress,
      readSavedLevelProgressLegacy,
      savePrefs,
      reviewSrsCard,
      countNewReviewsToday,
      countReviewedTodayAcrossLevels,
      summarizeDueCardsAcrossLevels,
      compareDueCards,
      countDueCardsAcrossLevels,
      isReviewableLevel,
    });
  }
}

if (typeof window !== 'undefined') {
  mountStorageEngine();
}
