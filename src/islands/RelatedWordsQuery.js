// Pure index + query for "Chữ liên quan". No DOM or globals, so Node tests import it directly.
// Relations come from each component's `role` in hanzi_decompositions.json (from makemeahanzi's
// dictionary radical and etymology), not from guessing by shared pinyin.

/**
 * @typedef {Object} RelatedWord
 * @property {number|string} id
 * @property {string} hanzi
 * @property {string} pinyin
 * @property {string} meaning
 * @property {string} levelKey
 * @property {number} levelRank
 *
 * @typedef {'polyphone'|'whole-char'|'phonetic'|'radical'} RelationType
 *
 * @typedef {Object} RelatedMatch
 * @property {RelatedWord} word
 * @property {RelationType} type
 * @property {string} typeLabel   Group heading shown in the rail.
 * @property {string} shared      Character/component the two words share.
 * @property {string} sharedName  Readable component name (e.g. "Thủ"), empty for whole chars.
 */

export const RELATION_TYPES = Object.freeze({
  POLYPHONE: 'polyphone',
  WHOLE_CHAR: 'whole-char',
  PHONETIC: 'phonetic',
  RADICAL: 'radical',
});

export const RELATION_LABELS = Object.freeze({
  [RELATION_TYPES.POLYPHONE]: 'Đa âm',
  [RELATION_TYPES.WHOLE_CHAR]: 'Cùng chữ',
  [RELATION_TYPES.PHONETIC]: 'Cùng thanh phù',
  [RELATION_TYPES.RADICAL]: 'Cùng bộ',
});

// Display order of the groups: other readings first, then words reusing the character, then
// characters sharing its sound component, then its radical.
export const RELATION_ORDER = Object.freeze([
  RELATION_TYPES.POLYPHONE,
  RELATION_TYPES.WHOLE_CHAR,
  RELATION_TYPES.PHONETIC,
  RELATION_TYPES.RADICAL,
]);

export const COMPONENT_ROLES = Object.freeze({ RADICAL: 'radical', PHONETIC: 'phonetic' });
export const RELATED_GROUP_LIMIT = 4;
export const RELATED_TOTAL_LIMIT = 10;

const HAN_CHAR_RE = /\p{Script=Han}/u;
const ANNOTATION_RE = /[（(].*?[）)]/g;

export function hanChars(hanzi) {
  const raw = String(hanzi || '').replace(ANNOTATION_RE, '').trim();
  return Array.from(new Set(Array.from(raw).filter((ch) => HAN_CHAR_RE.test(ch))));
}

const wordKey = (w) => `${w.levelKey}_${w.id}`;
const roleKey = (role, compChar) => `${role}:${compChar}`;
const normPinyin = (py) => String(py || '').toLowerCase().replace(/[\s'’·-]/g, '');

/**
 * @param {Record<string, {components?: Array<{char: string, role?: string, hanviet?: string}>}>} decompData
 * @param {RelatedWord[]} allWords
 */
export function createRelatedIndex(decompData, allWords) {
  const charToWords = new Map();
  const roleToWords = new Map(); // "radical:扌" -> [{ word, char }]
  const componentNames = new Map();

  allWords.forEach((w) => {
    hanChars(w.hanzi).forEach((ch) => {
      if (!charToWords.has(ch)) charToWords.set(ch, []);
      charToWords.get(ch).push(w);
      const components = (decompData && decompData[ch] && decompData[ch].components) || [];
      components.forEach((comp) => {
        if (!comp || !comp.char || (comp.role !== COMPONENT_ROLES.RADICAL && comp.role !== COMPONENT_ROLES.PHONETIC)) return;
        const key = roleKey(comp.role, comp.char);
        if (!roleToWords.has(key)) roleToWords.set(key, []);
        roleToWords.get(key).push({ word: w, char: ch });
        if (comp.hanviet && !componentNames.has(comp.char)) componentNames.set(comp.char, comp.hanviet);
      });
    });
  });

  return { allWords, charToWords, roleToWords, componentNames, decompData: decompData || {} };
}

/**
 * Related words for `targetWord`, grouped by relation and never above `currentRank`
 * (no spoilers from higher levels).
 * @returns {RelatedMatch[]} ordered by RELATION_ORDER, at most RELATED_TOTAL_LIMIT items.
 */
export function queryRelated(index, targetWord, targetLevelKey, currentRank) {
  if (!index || !targetWord || !targetWord.hanzi) return [];
  const targetChars = hanChars(targetWord.hanzi);
  if (targetChars.length === 0) return [];

  const seen = new Set([`${targetLevelKey}_${targetWord.id}`]);
  const seenHanzi = new Set();
  const groups = new Map(RELATION_ORDER.map((type) => [type, []]));

  const add = (type, word, shared, sharedChar) => {
    const list = groups.get(type);
    if (list.length >= RELATED_GROUP_LIMIT) return;
    // One word per sharing character, so 打, 打电话, 打算 don't fill the whole group.
    if (sharedChar && list.some((m) => m.viaChar === sharedChar)) return;
    seen.add(wordKey(word));
    seenHanzi.add(`${word.hanzi}|${normPinyin(word.pinyin)}`);
    list.push({
      word,
      type,
      typeLabel: RELATION_LABELS[type],
      shared,
      sharedName: index.componentNames.get(shared) || '',
      viaChar: sharedChar,
    });
  };
  const eligible = (w) => w.levelRank <= currentRank
    && !seen.has(wordKey(w))
    && !seenHanzi.has(`${w.hanzi}|${normPinyin(w.pinyin)}`);

  const targetPinyin = normPinyin(targetWord.pinyin);
  seenHanzi.add(`${targetWord.hanzi}|${targetPinyin}`);

  // 1. Same written word, different reading (挨 āi vs 挨 ái).
  (index.charToWords.get(targetChars[0]) || []).forEach((w) => {
    if (w.hanzi === targetWord.hanzi && normPinyin(w.pinyin) !== targetPinyin && eligible(w)) {
      add(RELATION_TYPES.POLYPHONE, w, w.hanzi, '');
    }
  });

  // 2. Other words containing one of the target's characters.
  targetChars.forEach((ch) => {
    (index.charToWords.get(ch) || []).forEach((w) => {
      if (w.hanzi !== targetWord.hanzi && eligible(w)) add(RELATION_TYPES.WHOLE_CHAR, w, ch, '');
    });
  });

  // 3 & 4. Characters sharing the target character's phonetic component or its radical.
  const byLevel = (a, b) => a.word.levelRank - b.word.levelRank || hanChars(a.word.hanzi).length - hanChars(b.word.hanzi).length;
  [[COMPONENT_ROLES.PHONETIC, RELATION_TYPES.PHONETIC], [COMPONENT_ROLES.RADICAL, RELATION_TYPES.RADICAL]].forEach(([role, type]) => {
    targetChars.forEach((ch) => {
      const components = (index.decompData[ch] && index.decompData[ch].components) || [];
      components.filter((comp) => comp && comp.role === role).forEach((comp) => {
        const candidates = (index.roleToWords.get(roleKey(role, comp.char)) || [])
          .filter((item) => !targetChars.includes(item.char) && eligible(item.word))
          .sort(byLevel);
        candidates.forEach((item) => {
          if (eligible(item.word)) add(type, item.word, comp.char, item.char);
        });
      });
    });
  });

  return RELATION_ORDER.flatMap((type) => groups.get(type)).slice(0, RELATED_TOTAL_LIMIT);
}
