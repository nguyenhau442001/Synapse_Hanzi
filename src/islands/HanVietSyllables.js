// Per-character breakdown of a word: each Hanzi aligned with its pinyin syllable and
// Sino-Vietnamese (Hán Việt) reading, e.g. 大自然 -> 大/dà/ĐẠI · 自/zì/TỰ · 然/rán/NHIÊN.
// Returns null whenever the three sequences do not line up one-to-one, so a reading is
// never attached to the wrong character.
import { splitPinyinSyllables } from './pinyinTones.js';

// A breakdown only helps for compounds; single characters keep the plain Hán Việt label.
export const MIN_SYLLABLE_COLUMNS = 2;

const CJK_CHAR_RE = /[㐀-鿿豈-﫿]/gu;
const CLARIFIER_RE = /[（(].*?[）)]/g;

const stripClarifier = (text) => String(text || '').replace(CLARIFIER_RE, ' ').trim();

/**
 * @typedef {Object} SyllableColumn
 * @property {string} char     Single Hanzi character.
 * @property {string} pinyin   Tone-marked pinyin syllable for that character.
 * @property {string} hanviet  Hán Việt reading for that character (as stored, not uppercased).
 */

/**
 * @param {string} hanzi
 * @param {string} pinyin
 * @param {string} hanviet
 * @returns {SyllableColumn[] | null}
 */
export function buildSyllableColumns(hanzi, pinyin, hanviet) {
  const chars = stripClarifier(hanzi).match(CJK_CHAR_RE) || [];
  if (chars.length < MIN_SYLLABLE_COLUMNS) return null;
  const syllables = splitPinyinSyllables(stripClarifier(pinyin));
  const readings = stripClarifier(hanviet).split(/[\s\-–·]+/).filter(Boolean);
  if (syllables.length !== chars.length || readings.length !== chars.length) return null;
  return chars.map((char, i) => ({ char, pinyin: syllables[i], hanviet: readings[i] }));
}
