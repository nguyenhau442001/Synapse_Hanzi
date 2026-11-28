// Personal memory hooks ("Mẹo nhớ") for words the learner keeps forgetting.
// Stored as an id_log array in localStorage so edits from several devices merge per word
// (newer updatedAt wins). Storage is injected so the logic stays testable in Node.

export const MNEMONICS_KEY = 'hsk_mnemonics_v1';
export const MNEMONIC_MAX_LENGTH = 200;

/**
 * @typedef {Object} Mnemonic
 * @property {string} id         The word's Hanzi (e.g. '十字路口'); one note per word across all decks.
 * @property {string} text       The learner's hook sentence; '' marks a deleted note (tombstone, so deletes sync).
 * @property {string} updatedAt  ISO time of the last edit; on a sync conflict the newer entry wins.
 * @property {string} timestamp  Same as updatedAt; the id_log merge orders entries by it.
 */

/** @param {unknown} entry @returns {entry is Mnemonic} */
function isMnemonic(entry) {
  return Boolean(entry) && typeof entry === 'object'
    && typeof (/** @type {any} */ (entry).id) === 'string'
    && typeof (/** @type {any} */ (entry).text) === 'string';
}

/** @param {Pick<Storage, 'getItem'>} storage @returns {Mnemonic[]} */
export function loadMnemonics(storage) {
  try {
    const parsed = JSON.parse(storage.getItem(MNEMONICS_KEY) || '[]');
    return Array.isArray(parsed) ? parsed.filter(isMnemonic) : [];
  } catch {
    return [];
  }
}

/** @param {Pick<Storage, 'getItem'>} storage @param {string} hanzi @returns {string} '' when none */
export function getMnemonic(storage, hanzi) {
  const entry = loadMnemonics(storage).find((m) => m.id === hanzi);
  return entry ? entry.text : '';
}

/**
 * Save (or, with blank text, delete) the note for a word.
 * @param {Pick<Storage, 'getItem'|'setItem'>} storage
 * @param {string} hanzi
 * @param {string} text
 * @param {Date} [now]
 * @returns {string} the stored text
 */
export function saveMnemonic(storage, hanzi, text, now = new Date()) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim().slice(0, MNEMONIC_MAX_LENGTH);
  const stamp = now.toISOString();
  const others = loadMnemonics(storage).filter((m) => m.id !== hanzi);
  others.push({ id: hanzi, text: clean, updatedAt: stamp, timestamp: stamp });
  storage.setItem(MNEMONICS_KEY, JSON.stringify(others));
  return clean;
}

/**
 * Auto hint from the per-character columns, e.g. "十 mười + 字 chữ + 路 đường + 口 miệng → ngã tư".
 * Returns '' unless every character has a gloss (a partial formula would mislead).
 * @param {import('./HanVietSyllables.js').SyllableColumn[] | null} columns
 * @param {string} meaning
 * @returns {string}
 */
export function buildMnemonicHint(columns, meaning) {
  if (!columns || columns.length === 0 || columns.some((c) => !c.gloss)) return '';
  const firstSense = String(meaning || '').split(/[,;]/)[0].trim();
  const parts = columns.map((c) => `${c.char} ${c.gloss.split(';')[0].trim()}`).join(' + ');
  return firstSense ? `${parts} → ${firstSense}` : parts;
}
