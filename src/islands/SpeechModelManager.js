/**
 * SpeechModelManager.js
 * Offline Model Manager for Mandarin CAPT Conformer-CTC ONNX model (~8.2MB INT8).
 * Manages streaming downloads with progress reporting and persistent caching via IndexedDB.
 */

const DB_NAME = 'synapse_capt_speech_v2';
const STORE_NAME = 'models';
const MODEL_KEY = 'capt_model_onnx';
const MODEL_URL = './assets/models/speech/capt_model.onnx';
const META_URL = './assets/models/speech/capt_meta.json';
const MODEL_SIZE_ESTIMATE_BYTES = 8.2 * 1024 * 1024;
const MIN_CACHED_MODEL_BYTES = 1000000;

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
  const url = new URL(MODEL_URL, document.baseURI).href;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download speech model: HTTP ${response.status}`);
  }

  const contentLength = Number(response.headers.get('content-length')) || MODEL_SIZE_ESTIMATE_BYTES;
  const reader = response.body.getReader();
  const chunks = [];
  let receivedBytes = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    receivedBytes += value.length;
    if (onProgress) {
      const percent = Math.min(100, Math.round((receivedBytes / contentLength) * 100));
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
