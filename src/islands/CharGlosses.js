// Lazy loader for database/radicals/char_glosses.json: { "<Hanzi>": "<short Vietnamese core sense>" }.
// Fetched once on first use; a failed load resolves to an empty map so the card still renders.
import { APP_VERSION } from './AppUtils.js';

const CHAR_GLOSSES_URL = 'database/radicals/char_glosses.json';

/** @type {Promise<Record<string, string>> | null} */
let loadPromise = null;
/** @type {Record<string, string> | null} */
let loaded = null;

/** @returns {Promise<Record<string, string>>} */
export function loadCharGlosses() {
  if (!loadPromise) {
    loadPromise = fetch(`${CHAR_GLOSSES_URL}?v=${APP_VERSION}`)
      .then((res) => (res.ok ? res.json() : {}))
      .catch(() => ({}))
      .then((map) => {
        loaded = map || {};
        return loaded;
      });
  }
  return loadPromise;
}

/** Synchronous access once loaded (null before the first load finishes). */
export function getLoadedCharGlosses() {
  return loaded;
}
