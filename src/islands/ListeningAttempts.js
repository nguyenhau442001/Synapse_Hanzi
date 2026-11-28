// Pure helpers for the listening attempt log: record, tag a mistake reason, summarise,
// and split transcript text at discourse (turn) markers. Storage access is injected so the
// logic stays testable in Node.
import {
  LISTENING_ATTEMPTS_KEY,
  LISTENING_ATTEMPTS_MAX,
  LISTENING_STATS_WINDOW,
  MISTAKE_REASONS,
  TURN_MARKERS,
} from './ListeningConstants.js';

/** @typedef {import('./ListeningConstants.js').MistakeReason} MistakeReason */

/**
 * @typedef {Object} ListeningAttempt
 * @property {string}  id          `${questionId}@${timestamp}`, de-duplication key when syncing.
 * @property {string}  questionId  e.g. 'H41001_L_01'.
 * @property {string}  examId      e.g. 'H41001'.
 * @property {string}  timestamp   ISO time of the answer.
 * @property {string}  updatedAt   ISO time of the last change (answer or reason tag); sync keeps the newer copy.
 * @property {boolean} correct
 * @property {boolean} choice      The answer the learner picked (true = Đúng).
 * @property {boolean} examMode    True when the audio was locked to a single play.
 * @property {MistakeReason|null} reason  One-tap reason after a wrong answer, null until tagged.
 */

/**
 * @typedef {Object} ListeningStats
 * @property {number} total      Attempts in the window.
 * @property {number} correct
 * @property {number} wrong
 * @property {Record<MistakeReason, number>} reasons  Wrong answers per tagged reason.
 * @property {number} untagged   Wrong answers without a reason.
 */

/** @param {Pick<Storage, 'getItem'>} storage @returns {ListeningAttempt[]} */
export function loadAttempts(storage) {
  try {
    const parsed = JSON.parse(storage.getItem(LISTENING_ATTEMPTS_KEY) || '[]');
    return Array.isArray(parsed) ? parsed.filter(isAttempt) : [];
  } catch {
    return [];
  }
}

/** @param {Pick<Storage, 'setItem'>} storage @param {ListeningAttempt[]} attempts */
export function saveAttempts(storage, attempts) {
  storage.setItem(LISTENING_ATTEMPTS_KEY, JSON.stringify(attempts.slice(-LISTENING_ATTEMPTS_MAX)));
}

/** @param {unknown} entry @returns {entry is ListeningAttempt} */
export function isAttempt(entry) {
  return Boolean(entry) && typeof entry === 'object'
    && typeof (/** @type {any} */ (entry).id) === 'string'
    && typeof (/** @type {any} */ (entry).questionId) === 'string'
    && typeof (/** @type {any} */ (entry).correct) === 'boolean';
}

/**
 * Build a new attempt record.
 * @param {{ questionId: string, examId: string, correct: boolean, choice: boolean, examMode: boolean }} input
 * @param {Date} [now]
 * @returns {ListeningAttempt}
 */
export function createAttempt(input, now = new Date()) {
  const timestamp = now.toISOString();
  return {
    id: input.questionId + '@' + timestamp,
    questionId: input.questionId,
    examId: input.examId,
    timestamp,
    updatedAt: timestamp,
    correct: input.correct,
    choice: input.choice,
    examMode: input.examMode,
    reason: null,
  };
}

/** Append an attempt and persist. @returns {ListeningAttempt} */
export function recordAttempt(storage, input, now = new Date()) {
  const attempt = createAttempt(input, now);
  saveAttempts(storage, [...loadAttempts(storage), attempt]);
  return attempt;
}

/**
 * Tag a wrong attempt with a reason and persist. Unknown ids or reasons are ignored.
 * @param {Pick<Storage, 'getItem'|'setItem'>} storage
 * @param {string} attemptId
 * @param {MistakeReason} reason
 * @param {Date} [now]
 * @returns {boolean} True when the attempt was updated.
 */
export function tagAttemptReason(storage, attemptId, reason, now = new Date()) {
  if (!MISTAKE_REASONS.includes(reason)) return false;
  const attempts = loadAttempts(storage);
  const target = attempts.find(a => a.id === attemptId);
  if (!target || target.correct) return false;
  target.reason = reason;
  target.updatedAt = now.toISOString();
  saveAttempts(storage, attempts);
  return true;
}

/**
 * Summarise the most recent attempts.
 * @param {ListeningAttempt[]} attempts  Oldest first.
 * @param {number} [windowSize]
 * @returns {ListeningStats}
 */
export function summarizeAttempts(attempts, windowSize = LISTENING_STATS_WINDOW) {
  const recent = attempts.slice(-windowSize);
  /** @type {Record<MistakeReason, number>} */
  const reasons = /** @type {any} */ (Object.fromEntries(MISTAKE_REASONS.map(r => [r, 0])));
  let correct = 0;
  let untagged = 0;
  for (const a of recent) {
    if (a.correct) correct++;
    else if (a.reason && a.reason in reasons) reasons[a.reason]++;
    else untagged++;
  }
  return { total: recent.length, correct, wrong: recent.length - correct, reasons, untagged };
}

/**
 * @typedef {Object} TurnSplit
 * @property {string} before  Text before the marker (may be empty).
 * @property {string} marker  The matched marker, '' when none.
 * @property {string} after   Text from after the marker to the end.
 */

/**
 * Split a sentence at its first turn marker so the UI can highlight the clause that follows.
 * @param {string} zh
 * @returns {TurnSplit}
 */
export function splitAtTurnMarker(zh) {
  const text = typeof zh === 'string' ? zh : '';
  let bestIndex = -1;
  let bestMarker = '';
  for (const marker of TURN_MARKERS) {
    const index = text.indexOf(marker);
    if (index === -1) continue;
    // Earliest marker wins; on a tie the longer marker (listed first) is kept.
    if (bestIndex === -1 || index < bestIndex) {
      bestIndex = index;
      bestMarker = marker;
    }
  }
  if (bestIndex === -1) return { before: text, marker: '', after: '' };
  return {
    before: text.slice(0, bestIndex),
    marker: bestMarker,
    after: text.slice(bestIndex + bestMarker.length),
  };
}
