// Storage-compact SRS decks: only cards the learner has actually studied are persisted.
// Never-studied cards are placeholders that every reader already treats as "new" (they are
// recreated in memory by loadSrsForLevel), yet storing one per word for 5,600-word decks filled
// the 10 MB localStorage quota and broke sign-in persistence and cloud sync.

/** Matches every SRS deck key, e.g. hsk_hsk30_7_srs_v3, hsk_hsk1_srs_v3_listen. */
export const SRS_DECK_KEY_PATTERN = /^hsk_[a-z0-9_-]+?_srs_v3(?:_(?:listen|vi2zh))?$/;

/**
 * True when the card carries learning history and must be kept.
 * @param {any} card
 * @returns {boolean}
 */
export function isStudiedCard(card) {
  return Boolean(card) && ((Number(card.reps) || 0) > 0 || Boolean(card.last_review));
}

/**
 * Drop never-studied placeholder cards.
 * @param {Object<string, any>} cards
 * @returns {Object<string, any>}
 */
export function compactSrsCards(cards) {
  /** @type {Object<string, any>} */
  const kept = {};
  for (const [id, card] of Object.entries(cards || {})) {
    if (isStudiedCard(card)) kept[id] = card;
  }
  return kept;
}

/**
 * One pass over storage that rewrites every SRS deck without placeholder cards. Writing a
 * smaller value always fits, so this works even when the quota is already exhausted.
 * @param {Pick<Storage, 'length'|'key'|'getItem'|'setItem'>} storage
 * @returns {{ decks: number, freedChars: number }}
 */
export function compactStoredSrsDecks(storage) {
  let decks = 0;
  let freedChars = 0;
  const keys = [];
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (key && SRS_DECK_KEY_PATTERN.test(key)) keys.push(key);
  }
  for (const key of keys) {
    const raw = storage.getItem(key);
    if (!raw) continue;
    let record;
    try { record = JSON.parse(raw); } catch { continue; }
    if (!record || typeof record !== 'object' || !record.cards || typeof record.cards !== 'object') continue;
    const next = JSON.stringify({ ...record, cards: compactSrsCards(record.cards) });
    if (next.length >= raw.length) continue;
    try {
      storage.setItem(key, next);
      decks += 1;
      freedChars += raw.length - next.length;
    } catch { /* leave this deck as it was */ }
  }
  return { decks, freedChars };
}
