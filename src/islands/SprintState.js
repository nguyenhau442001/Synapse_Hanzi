// src/islands/SprintState.js
// Preact Signals store, countdown calculator, Hán Việt / Word Family helpers,
// and 4-round daily queue builders for the Exam Sprint ("Sinh tử chiến") mode.

import { signal, computed } from '@preact/signals';
import { db, HanziMindDB } from './db.js';
import { EXAM_MISTAKE_TAG } from './ExamConstants.js';
import {
  SPRINT_PREF_CONFIG_KEY,
  SPRINT_PREF_DAILY_KEY,
  DEFAULT_SPRINT_LEVELS,
  SPRINT_LEVEL_OPTIONS,
  DEFAULT_DAILY_NEW_QUOTA,
  SPRINT_AUTO_FLIP_LIMIT_MS,
  BATCH_SPLIT_RATIO,
  MS_PER_DAY,
  MS_PER_HOUR,
  WORD_FAMILY_PREVIEW_LIMIT,
  CONFUSABLE_PINYIN_PATTERNS,
  REVERSE_SRS_QUIZ_COUNT,
} from './SprintConstants.js';

const DEFAULT_DIRECTION = 'zh2vi';

/**
 * Returns local calendar date string 'YYYY-MM-DD'.
 * @param {Date} [date]
 * @returns {string}
 */
export function getLocalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Creates default SprintConfig.
 * @returns {Object}
 */
export function createDefaultSprintConfig() {
  return {
    examDate: '',
    targetLevels: [...DEFAULT_SPRINT_LEVELS],
    dailyNewQuota: DEFAULT_DAILY_NEW_QUOTA,
    sprintFlipLimitMs: SPRINT_AUTO_FLIP_LIMIT_MS,
    autoAudio: true,
  };
}

/**
 * Creates default SprintDailyProgress for a given date.
 * @param {string} [dateKey]
 * @returns {Object}
 */
export function createDefaultDailyProgress(dateKey = getLocalDateKey()) {
  return {
    date: dateKey,
    morningReviewDone: 0,
    noonNewCardKeys: [],
    eveningNewCardKeys: [],
    nightSkimDone: false,
    reverseSrsDone: false,
  };
}

export const sprintConfig = signal(createDefaultSprintConfig());
export const sprintDailyLog = signal(createDefaultDailyProgress());
export const sprintStats = signal({
  totalPool: 0,
  suspendedCount: 0,
  activeRemaining: 0,
  learnedCount: 0,
  dueCount: 0,
  mistakeDueCount: 0,
});
export const sprintLoading = signal(false);

/**
 * Computes exam countdown and recommended daily new-word pace.
 * @param {string} examDateStr - 'YYYY-MM-DD'
 * @param {number} [remainingNewWords]
 * @param {Date} [now]
 * @returns {{ status: 'unset'|'today'|'upcoming'|'passed', daysLeft: number, hoursLeft: number, recommendedQuota: number }}
 */
export function computeExamCountdown(examDateStr, remainingNewWords = 0, now = new Date()) {
  if (!examDateStr) {
    return { status: 'unset', daysLeft: 0, hoursLeft: 0, recommendedQuota: DEFAULT_DAILY_NEW_QUOTA };
  }
  const [y, m, d] = examDateStr.split('-').map(Number);
  if (!y || !m || !d) {
    return { status: 'unset', daysLeft: 0, hoursLeft: 0, recommendedQuota: DEFAULT_DAILY_NEW_QUOTA };
  }
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const examStart = new Date(y, m - 1, d).getTime();
  const diffMs = examStart - todayStart;

  if (diffMs === 0) {
    return { status: 'today', daysLeft: 0, hoursLeft: 0, recommendedQuota: remainingNewWords };
  }
  if (diffMs < 0) {
    return { status: 'passed', daysLeft: Math.ceil(diffMs / MS_PER_DAY), hoursLeft: 0, recommendedQuota: 0 };
  }

  const daysLeft = Math.floor(diffMs / MS_PER_DAY);
  const examEndOfMorning = new Date(y, m - 1, d, 9, 0, 0).getTime();
  const hoursLeft = Math.max(0, Math.floor((examEndOfMorning - now.getTime()) / MS_PER_HOUR));
  // Reserve final 3 days for pure mock exams & review
  const studyDays = Math.max(1, daysLeft - 3);
  const recommendedQuota = remainingNewWords > 0
    ? Math.ceil(remainingNewWords / studyDays)
    : DEFAULT_DAILY_NEW_QUOTA;

  return { status: 'upcoming', daysLeft, hoursLeft, recommendedQuota };
}

export const examCountdown = computed(() =>
  computeExamCountdown(sprintConfig.value.examDate, sprintStats.value.activeRemaining)
);

/**
 * Extracts Hán Việt reading for a Chinese word using HANVIET_DICT.
 * @param {string} hanzi
 * @param {Record<string, string>} [dict]
 * @returns {string}
 */
export function extractHanViet(hanzi, dict = typeof window !== 'undefined' ? window.HANVIET_DICT : null) {
  if (!hanzi || !dict) return '';
  const chars = Array.from(String(hanzi).trim());
  const parts = chars.map((ch) => dict[ch]).filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : '';
}

/**
 * Finds related Word Family items sharing a root character in the vocab pool.
 * @param {string} hanzi
 * @param {Array<Object>} vocabPool
 * @param {number} [limit]
 * @returns {Array<{ hanzi: string, pinyin: string, meaning: string }>}
 */
export function findWordFamily(hanzi, vocabPool = [], limit = WORD_FAMILY_PREVIEW_LIMIT) {
  if (!hanzi || !Array.isArray(vocabPool) || vocabPool.length === 0) return [];
  const chars = Array.from(String(hanzi).trim());
  const rootChar = chars[0];
  if (!rootChar) return [];

  const results = [];
  const seen = new Set([hanzi]);
  for (const word of vocabPool) {
    if (!word?.hanzi || seen.has(word.hanzi)) continue;
    if (word.hanzi.includes(rootChar)) {
      seen.add(word.hanzi);
      results.push({
        hanzi: word.hanzi,
        pinyin: word.pinyin || '',
        meaning: word.meaning || '',
      });
      if (results.length >= limit) break;
    }
  }
  return results;
}

/**
 * Checks whether a pinyin string contains commonly confused initials/finals.
 * @param {string} pinyin
 * @returns {boolean}
 */
export function isConfusablePinyin(pinyin) {
  if (!pinyin) return false;
  const normalized = String(pinyin)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  return CONFUSABLE_PINYIN_PATTERNS.some((pattern) => pattern.regex.test(normalized));
}

/**
 * Toggles one HSK level in the sprint target list, keeping at least one level
 * selected and preserving the canonical SPRINT_LEVEL_OPTIONS order.
 * @param {string[]} currentLevels
 * @param {string} levelId
 * @returns {string[]}
 */
export function toggleSprintLevel(currentLevels, levelId) {
  const selected = new Set(Array.isArray(currentLevels) ? currentLevels : []);
  if (selected.has(levelId)) {
    if (selected.size <= 1) return [...selected];
    selected.delete(levelId);
  } else {
    selected.add(levelId);
  }
  return SPRINT_LEVEL_OPTIONS.map((opt) => opt.id).filter((id) => selected.has(id));
}

const LEVEL_RANK = new Map(SPRINT_LEVEL_OPTIONS.map((opt, index) => [opt.id, index]));

/**
 * Lists [cardKey, item] entries with the hardest (highest) HSK level first,
 * keeping the original word order within each level (stable sort).
 * @param {Map<string, Object>} vocabByKey
 * @returns {Array<[string, Object]>}
 */
export function entriesHardestLevelFirst(vocabByKey) {
  return Array.from(vocabByKey.entries()).sort(
    ([, a], [, b]) => (LEVEL_RANK.get(b.level) ?? -1) - (LEVEL_RANK.get(a.level) ?? -1)
  );
}

/**
 * Builds the card queue for one of the 4 daily sprint rounds.
 * @param {'morning'|'noon'|'evening'|'night'} slotId
 * @param {Array<Object>} vocabPool
 * @param {Map<string, Object>} cardMap
 * @param {Object} dailyLog
 * @param {Object} config
 * @param {Date} [now]
 * @returns {Array<Object>}
 */
export function buildSlotQueue(slotId, vocabPool, cardMap, dailyLog, config, now = new Date()) {
  const nowIso = now.toISOString();
  const vocabByKey = new Map();
  for (const item of vocabPool) {
    const key = HanziMindDB.getCardKey(item.level, DEFAULT_DIRECTION, item.id);
    vocabByKey.set(key, { ...item, cardKey: key });
  }

  if (slotId === 'morning') {
    const dueMistakes = [];
    const dueStandard = [];
    for (const [key, item] of vocabByKey.entries()) {
      const card = cardMap.get(key);
      if (!card || card.suspended) continue;
      if (card.due && card.due <= nowIso) {
        const isMistake = Array.isArray(card.tags) && card.tags.includes(EXAM_MISTAKE_TAG);
        const enriched = { ...item, card, isMistakePriority: isMistake };
        if (isMistake) dueMistakes.push(enriched);
        else dueStandard.push(enriched);
      }
    }
    return [...dueMistakes, ...dueStandard];
  }

  const quota = Number(config?.dailyNewQuota) || DEFAULT_DAILY_NEW_QUOTA;
  const noonTarget = Math.ceil(quota * BATCH_SPLIT_RATIO);
  const eveningTarget = Math.max(0, quota - noonTarget);

  if (slotId === 'noon') {
    const remainingNoon = Math.max(0, noonTarget - (dailyLog?.noonNewCardKeys?.length || 0));
    if (remainingNoon === 0) return [];
    const newWords = [];
    for (const [key, item] of entriesHardestLevelFirst(vocabByKey)) {
      const card = cardMap.get(key);
      if (card && (card.suspended || (card.reps || 0) > 0)) continue;
      newWords.push({ ...item, card: card || null, isMistakePriority: false });
      if (newWords.length >= remainingNoon) break;
    }
    return newWords;
  }

  if (slotId === 'evening') {
    const noonSet = new Set(dailyLog?.noonNewCardKeys || []);
    const remainingEvening = Math.max(0, eveningTarget - (dailyLog?.eveningNewCardKeys?.length || 0));
    const batch2 = [];
    for (const [key, item] of entriesHardestLevelFirst(vocabByKey)) {
      if (noonSet.has(key)) continue;
      const card = cardMap.get(key);
      if (card && (card.suspended || (card.reps || 0) > 0)) continue;
      batch2.push({ ...item, card: card || null, isMistakePriority: false });
      if (batch2.length >= remainingEvening) break;
    }
    const batch1Review = (dailyLog?.noonNewCardKeys || [])
      .map((key) => vocabByKey.get(key))
      .filter(Boolean)
      .map((item) => ({ ...item, card: cardMap.get(item.cardKey) || null, isMistakePriority: false }));
    return [...batch2, ...batch1Review];
  }

  if (slotId === 'night') {
    const todayKeys = Array.from(
      new Set([...(dailyLog?.noonNewCardKeys || []), ...(dailyLog?.eveningNewCardKeys || [])])
    );
    const items = todayKeys
      .map((key) => vocabByKey.get(key))
      .filter(Boolean)
      .map((item) => ({
        ...item,
        card: cardMap.get(item.cardKey) || null,
        requiresPinyinCheck: isConfusablePinyin(item.pinyin),
      }));
    // Prioritize confusable Pinyin words first for evening typing drill
    return items.sort((a, b) => Number(b.requiresPinyinCheck) - Number(a.requiresPinyinCheck));
  }

  return [];
}

/**
 * Generates a Reverse SRS mini-quiz (10-15 items) from recently learned or active pool words.
 * @param {Array<Object>} vocabPool
 * @param {Map<string, Object>} cardMap
 * @param {number} [count]
 * @returns {Array<Object>}
 */
export function buildReverseSrsQuiz(vocabPool, cardMap, count = REVERSE_SRS_QUIZ_COUNT) {
  const learned = vocabPool.filter((item) => {
    const key = HanziMindDB.getCardKey(item.level, DEFAULT_DIRECTION, item.id);
    const card = cardMap.get(key);
    return card && !card.suspended && (card.reps || 0) > 0;
  });
  const source = learned.length >= 4 ? learned : vocabPool.slice(0, Math.max(count * 2, 20));
  if (source.length === 0) return [];

  const shuffled = [...source].sort(() => Math.random() - 0.5).slice(0, count);
  return shuffled.map((target) => {
    const distractors = vocabPool
      .filter((w) => w.hanzi !== target.hanzi)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3)
      .map((w) => w.meaning);
    const choices = [target.meaning, ...distractors].sort(() => Math.random() - 0.5);
    return {
      level: target.level,
      wordId: target.id,
      hanzi: target.hanzi,
      pinyin: target.pinyin,
      correctMeaning: target.meaning,
      hanViet: extractHanViet(target.hanzi),
      choices,
    };
  });
}

/**
 * Loads SprintConfig and today's SprintDailyProgress from IndexedDB preferences.
 * @param {Object} [database]
 */
export async function loadSprintPreferences(database = db) {
  if (!database) return;
  const [cfgRow, logRow] = await Promise.all([
    database.preferences.get(SPRINT_PREF_CONFIG_KEY),
    database.preferences.get(SPRINT_PREF_DAILY_KEY),
  ]);
  if (cfgRow?.value) {
    sprintConfig.value = { ...createDefaultSprintConfig(), ...cfgRow.value };
  }
  const todayKey = getLocalDateKey();
  if (logRow?.value && logRow.value.date === todayKey) {
    sprintDailyLog.value = { ...createDefaultDailyProgress(todayKey), ...logRow.value };
  } else {
    sprintDailyLog.value = createDefaultDailyProgress(todayKey);
  }
}

/**
 * Persists SprintConfig updates into IndexedDB.
 * @param {Partial<Object>} patch
 * @param {Object} [database]
 */
export async function updateSprintConfig(patch, database = db) {
  const next = { ...sprintConfig.value, ...patch };
  sprintConfig.value = next;
  if (database) {
    await database.preferences.put({ key: SPRINT_PREF_CONFIG_KEY, value: next });
  }
}

/**
 * Persists SprintDailyProgress updates into IndexedDB.
 * @param {Partial<Object>} patch
 * @param {Object} [database]
 */
export async function updateSprintDailyLog(patch, database = db) {
  const todayKey = getLocalDateKey();
  const base = sprintDailyLog.value.date === todayKey
    ? sprintDailyLog.value
    : createDefaultDailyProgress(todayKey);
  const next = { ...base, ...patch, date: todayKey };
  sprintDailyLog.value = next;
  if (database) {
    await database.preferences.put({ key: SPRINT_PREF_DAILY_KEY, value: next });
  }
}
