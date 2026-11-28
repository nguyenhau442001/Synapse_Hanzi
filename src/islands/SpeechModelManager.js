/**
 * SpeechModelManager.js
 * Offline model manager for the pronunciation scorer (sherpa-onnx zipformer CTC zh, ~63 MB INT8).
 * Streams the model from Hugging Face with progress, verifies its SHA-256 and caches it in IndexedDB.
 */

const DB_NAME = 'synapse_capt_speech_v3';
/** Database of the retired untrained Conformer model; deleted to free its 8 MB. */
const LEGACY_DB_NAME = 'synapse_capt_speech_v2';
const STORE_NAME = 'models';
const MODEL_KEY = 'zipformer_ctc_small_zh_int8';
export const TOKEN_BANK_URL = './database/speech/capt_token_bank.json';
const META_URL = './assets/models/speech/capt_meta.json';
const MIN_CACHED_MODEL_BYTES = 1000000;
const HEX_RADIX = 16;
const HEX_BYTE_WIDTH = 2;
const PERCENT = 100;

let tokenBankPromise = null;

/** Loads database/speech/capt_token_bank.json (model URL, hash, token ids). */
export function loadCaptTokenBank() {
  if (!tokenBankPromise) {
    tokenBankPromise = fetch(new URL(TOKEN_BANK_URL, document.baseURI).href)
      .then((res) => {
        if (!res.ok) throw new Error(`Token bank HTTP ${res.status}`);
        return res.json();
      })
      .catch((err) => {
        tokenBankPromise = null;
        throw err;
      });
  }
  return tokenBankPromise;
}

function deleteLegacyModelDb() {
  try {
    if (typeof indexedDB !== 'undefined') indexedDB.deleteDatabase(LEGACY_DB_NAME);
  } catch {
    // Best effort cleanup only
  }
}

async function sha256Hex(buffer) {
  const digest = await crypto.subtle.digest('SHA-256', buffer);
  return [...new Uint8Array(digest)].map((b) => b.toString(HEX_RADIX).padStart(HEX_BYTE_WIDTH, '0')).join('');
}

/**
 * Opens or initializes IndexedDB database.
 */
function openModelDb() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      return reject(new Error('IndexedDB is not supported'));
    }
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Checks if the ONNX CAPT model is already cached in IndexedDB.
 */
export async function isCaptModelCached() {
  try {
    const db = await openModelDb();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(MODEL_KEY);
      req.onsuccess = () => resolve(Boolean(req.result && req.result.byteLength > MIN_CACHED_MODEL_BYTES));
      req.onerror = () => resolve(false);
    });
  } catch (err) {
    console.warn('[SpeechModelManager] Check cache failed:', err);
    return false;
  }
}

/**
 * Loads the cached ONNX model buffer from IndexedDB.
 */
export async function loadCachedCaptModel() {
  try {
    const db = await openModelDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(MODEL_KEY);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('[SpeechModelManager] Load cache failed:', err);
    return null;
  }
}

/**
 * Downloads the ONNX model from the repository with streaming progress,
 * and caches it permanently in IndexedDB.
 *
 * @param {Function} [onProgress] Callback receiving { percent, loaded, total }
 * @returns {Promise<ArrayBuffer>} The downloaded model buffer
 */
export async function downloadAndCacheCaptModel(onProgress = null) {
  deleteLegacyModelDb();
  const { model } = await loadCaptTokenBank();
  const response = await fetch(model.url);
  if (!response.ok) {
    throw new Error(`Failed to download speech model: HTTP ${response.status}`);
  }

  const contentLength = Number(response.headers.get('content-length')) || model.sizeBytes;
  const reader = response.body.getReader();
  const chunks = [];
  let receivedBytes = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    receivedBytes += value.length;
    if (onProgress) {
      const percent = Math.min(PERCENT, Math.round((receivedBytes / contentLength) * PERCENT));
      onProgress({ percent, loaded: receivedBytes, total: contentLength });
    }
  }

  // Concatenate chunks into a single ArrayBuffer
  const allBytes = new Uint8Array(receivedBytes);
  let position = 0;
  for (const chunk of chunks) {
    allBytes.set(chunk, position);
    position += chunk.length;
  }
  const modelBuffer = allBytes.buffer;
  if ((await sha256Hex(modelBuffer)) !== model.sha256) {
    throw new Error('Speech model integrity check failed (SHA-256 mismatch)');
  }

  // Persist into IndexedDB
  try {
    const db = await openModelDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(modelBuffer, MODEL_KEY);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('[SpeechModelManager] Failed to cache model in IndexedDB:', err);
  }

  return modelBuffer;
}

/**
 * Loads model metadata (initials, finals, diagnostics).
 */
export async function loadCaptMetadata() {
  try {
    const url = new URL(META_URL, document.baseURI).href;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Metadata fetch failed');
    return await res.json();
  } catch (err) {
    console.warn('[SpeechModelManager] Metadata load failed, using fallback:', err);
    return null;
  }
}

/**
 * Deletes cached model from IndexedDB.
 */
export async function deleteCachedCaptModel() {
  try {
    const db = await openModelDb();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(MODEL_KEY);
      req.onsuccess = () => resolve(true);
      req.onerror = () => resolve(false);
    });
  } catch {
    return false;
  }
}
