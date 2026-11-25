// src/islands/ExamSrsBridge.js
// Bridges exam/drill mistakes into HanziMindDB (exam_mistake tag + next-morning priority)
// and keeps the localStorage HskErrorNotebook synchronized.

import { db } from './db.js';
import { EXAM_MISTAKE_TAG, NEXT_MORNING_HOUR } from './ExamConstants.js';

export const HSK30_ERROR_NOTEBOOK_KEY = 'hsk30_error_notebook_v1';

/**
 * Compute the ISO timestamp for next morning at 06:00 local time.
 * @param {Date} [referenceDate]
 * @returns {string}
 */
export function getNextMorningIso(referenceDate = new Date()) {
  const next = new Date(referenceDate.getTime());
  next.setDate(next.getDate() + 1);
  next.setHours(NEXT_MORNING_HOUR, 0, 0, 0);
  return next.toISOString();
}

/**
 * Record failed exam words into Dexie SRS with `exam_mistake` priority
 * and optionally append diagnostic entries to HskErrorNotebook localStorage.
 * @param {Object} params
 * @param {string[]} params.wordIds
 * @param {string} [params.level]
 * @param {string} [params.direction]
 * @param {Array<Object>} [params.notebookEntries]
 * @param {Object} [params.database]
 * @param {Storage|null} [params.storage]
 * @returns {Promise<{ taggedCount: number, notebookAdded: number }>}
 */
export async function recordExamMistakesToSrs({
  wordIds = [],
  level = 'hsk4',
  direction = 'zh2vi',
  notebookEntries = [],
  database = db,
  storage = typeof localStorage !== 'undefined' ? localStorage : null,
}) {
  const uniqueWords = Array.from(new Set(wordIds.filter(Boolean)));
  let taggedCount = 0;

  if (database && uniqueWords.length > 0) {
    const nextMorningIso = getNextMorningIso();
    taggedCount = await database.markExamMistakes(
      uniqueWords,
      level,
      direction,
      nextMorningIso,
      EXAM_MISTAKE_TAG
    );
  }

  let notebookAdded = 0;
  if (storage && Array.isArray(notebookEntries) && notebookEntries.length > 0) {
    try {
      const raw = storage.getItem(HSK30_ERROR_NOTEBOOK_KEY);
      const existing = raw ? JSON.parse(raw) : [];
      const list = Array.isArray(existing) ? existing : [];
      const seenIds = new Set(list.map((item) => item.id));

      for (const entry of notebookEntries) {
        if (entry?.id && !seenIds.has(entry.id)) {
          list.unshift({ ...entry, resolved: false, savedAt: new Date().toISOString() });
          seenIds.add(entry.id);
          notebookAdded += 1;
        }
      }
      storage.setItem(HSK30_ERROR_NOTEBOOK_KEY, JSON.stringify(list));
    } catch (err) {
      console.error('Failed to sync HskErrorNotebook:', err);
    }
  }

  return { taggedCount, notebookAdded };
}
