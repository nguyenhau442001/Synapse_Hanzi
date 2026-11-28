// src/islands/SrsEnroll.js
// Shared "add this word to my review schedule" path for reading screens.
// Resolves a word to the real vocabulary deck that owns it, then schedules it through the
// standard FSRS review path so it shows up in Ôn nhanh, the 7-day forecast and the header badge.

import { SRS } from './SrsEngine.js';
import { LEVELS, fetchLevelWords } from './AppState.js';
import { readSrsRecord, reviewSrsCard, saveSrsRecord } from './StorageEngine.js';

/**
 * A vocabulary word located in a concrete deck.
 * @typedef {Object} VocabRef
 * @property {string} level  LEVELS key that owns the card (e.g. 'hsk4', 'hsk30_1').
 * @property {string} id     Word id inside that deck's vocabulary file.
 * @property {string} hanzi  The word itself.
 */

/**
 * Schedule state of a word, as shown on the add-to-review button.
 * 'untracked' : not in any deck's schedule yet (button enabled).
 * 'scheduled' : already has a reviewed card (button shows "already in schedule").
 * @typedef {'untracked' | 'scheduled'} EnrollStatus
 */

// First exposure is graded "Again": the card enters Learning and is due within minutes.
export const ENROLL_RATING = 'again';

// Graded-reading word ids (e.g. 'hsk1_535') point into the HSK 3.0 decks.
const GRADED_WORD_ID_PATTERN = /^hsk(\d+)_(\d+)$/i;
const HSK30_LEVEL_PREFIX = 'hsk30_';

/** HSK deck keys to search, HSK 2.0 first, skipping duplicate shared-vocabulary decks. */
function searchableLevels() {
  const seenGroups = new Set();
  return Object.keys(LEVELS).filter((level) => {
    const config = LEVELS[level];
    if (!config || !config.available || config.isTopic || !level.startsWith('hsk')) return false;
    if (config.sharedVocabularyGroup) {
      if (seenGroups.has(config.sharedVocabularyGroup)) return false;
      seenGroups.add(config.sharedVocabularyGroup);
    }
    return true;
  });
}

/** @param {string} level @param {string} id */
function readCard(level, id) {
  const record = readSrsRecord(level);
  return record && record.cards ? record.cards[id] : null;
}

/** @param {VocabRef | null} ref @returns {EnrollStatus} */
export function enrollStatus(ref) {
  if (!ref) return 'untracked';
  const card = readCard(ref.level, ref.id);
  return card && card.state !== SRS.State.New ? 'scheduled' : 'untracked';
}

/**
 * Map a graded-reading word id to its deck.
 * @param {string} wordId
 * @param {string} hanzi
 * @returns {VocabRef | null}
 */
export function vocabRefFromWordId(wordId, hanzi) {
  const match = GRADED_WORD_ID_PATTERN.exec(String(wordId || ''));
  if (!match) return null;
  const level = HSK30_LEVEL_PREFIX + match[1];
  return LEVELS[level] ? { level, id: match[2], hanzi } : null;
}

/**
 * Find the deck that owns `hanzi`. A deck where the word already has a reviewed card wins,
 * so the same word is never scheduled twice; otherwise the lowest level containing it is used.
 * @param {string} hanzi
 * @returns {Promise<VocabRef | null>}
 */
export async function findVocabRef(hanzi) {
  const text = String(hanzi || '').trim();
  if (!text) return null;
  let firstMatch = null;
  for (const level of searchableLevels()) {
    let words;
    try {
      words = await fetchLevelWords(level);
    } catch (_e) {
      continue;
    }
    const word = words.find((candidate) => candidate.hanzi === text);
    if (!word) continue;
    const ref = { level, id: String(word.id), hanzi: text };
    if (enrollStatus(ref) === 'scheduled') return ref;
    if (!firstMatch) firstMatch = ref;
  }
  return firstMatch;
}

/**
 * Resolve a reading token to its deck: trust its word id only when the deck word at that id
 * actually contains the token text (some generated ids are stale), else search by hanzi.
 * @param {string | undefined} wordId
 * @param {string} hanzi
 * @returns {Promise<VocabRef | null>}
 */
export async function resolveVocabRef(wordId, hanzi) {
  const ref = vocabRefFromWordId(wordId, hanzi);
  if (ref) {
    try {
      const words = await fetchLevelWords(ref.level);
      const word = words.find((candidate) => String(candidate.id) === ref.id);
      if (word && word.hanzi && word.hanzi.includes(hanzi)) return { ...ref, hanzi: word.hanzi };
    } catch (_e) {
      // Fall through to the hanzi search.
    }
  }
  return findVocabRef(hanzi);
}

/**
 * Put the word into today's review queue. No-op when it is already scheduled.
 * @param {VocabRef} ref
 * @returns {boolean} true when a card was scheduled by this call.
 */
export function enrollForReview(ref) {
  if (!ref || enrollStatus(ref) === 'scheduled') return false;
  const { card } = reviewSrsCard(ref.level, ref.id, ENROLL_RATING);
  // FSRS puts an "Again" card one learning step out; make it due now so the header badge and
  // Ôn nhanh include it the moment the learner adds it. The same card object is shared with the
  // in-memory deck when this level is open, so both stay in sync.
  card.due = card.last_review;
  const record = readSrsRecord(ref.level);
  if (record) saveSrsRecord(ref.level, { ...record.cards, [ref.id]: card }, record.migratedFromV2);
  if (typeof window !== 'undefined') {
    if (typeof window.renderLearningDashboard === 'function') window.renderLearningDashboard();
    if (typeof window.refreshHomeWidgets === 'function') window.refreshHomeWidgets();
  }
  return true;
}
