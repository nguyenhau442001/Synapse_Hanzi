/**
 * OnnxCaptEngine.js
 * In-browser inference controller for the 14MB Conformer CAPT Neural Network.
 * Integrates WebAudio, Log-Mel Feature Extraction, and GOP Pronunciation Scoring.
 */

import { loadCachedCaptModel, downloadAndCacheCaptModel } from './SpeechModelManager.js';
import { extractLogMelSpectrogram, melFramesToFlatTensor } from './AudioFeatureExtractor.js';
import { scoreCaptPrediction } from './GopScorer.js';

let inferenceSession = null;
let isInitializing = false;
let ortInstance = null;

const ORT_CDN_URL = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.31.1/dist/ort.min.js';
const ORT_WASM_PATH = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.31.1/dist/';

/**
 * Dynamically loads the lightweight onnxruntime-web script (~360KB)
 * without inflating the main bundle size.
 */
async function getOrt() {
  if (ortInstance) return ortInstance;
  if (typeof window !== 'undefined' && window.ort) {
    ortInstance = window.ort;
    return ortInstance;
  }
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = ORT_CDN_URL;
    script.crossOrigin = 'anonymous';
    script.onload = () => {
      ortInstance = window.ort;
      if (ortInstance && ortInstance.env && ortInstance.env.wasm) {
        // Multi-threading requires SharedArrayBuffer which only exists in cross-origin isolated contexts
        const hasSharedMemory = typeof window !== 'undefined' && Boolean(window.crossOriginIsolated);
        ortInstance.env.wasm.numThreads = hasSharedMemory ? 2 : 1;
        ortInstance.env.wasm.simd = true;
        ortInstance.env.wasm.wasmPaths = ORT_WASM_PATH;
      }
      resolve(ortInstance);
    };
    script.onerror = (e) => reject(new Error('Failed to load onnxruntime-web script: ' + e));
    document.head.appendChild(script);
  });
}

/**
 * Initializes or restores the ONNX InferenceSession from IndexedDB cache.
 *
 * @param {Function} [onDownloadProgress] Optional progress callback for initial download
 * @returns {Promise<boolean>} True if model is loaded and ready
 */
export async function ensureCaptModelReady(onDownloadProgress = null) {
  if (inferenceSession) return true;
  if (isInitializing) return false;

  isInitializing = true;
  try {
    const ort = await getOrt();
    if (!ort) throw new Error('ONNX runtime is unavailable');

    let modelBuffer = await loadCachedCaptModel();
    if (!modelBuffer) {
      // Model not yet in IndexedDB, fetch from repository
      modelBuffer = await downloadAndCacheCaptModel(onDownloadProgress);
    }

    if (!modelBuffer) {
      throw new Error('Model buffer is empty');
    }

    inferenceSession = await ort.InferenceSession.create(modelBuffer, {
      executionProviders: ['wasm']
    });

    console.log('✅ [OnnxCaptEngine] Mandarin CAPT Conformer loaded successfully into WebAssembly.');
    isInitializing = false;
    return true;
  } catch (err) {
    console.warn('[OnnxCaptEngine] Failed to initialize inference session:', err);
    isInitializing = false;
    return false;
  }
}

/**
 * Checks whether the CAPT model is currently loaded in memory.
 */
export function isCaptModelLoaded() {
  return Boolean(inferenceSession);
}

const MIN_SPEECH_MEL_FRAMES = 5;

/**
 * Evaluates recorded audio PCM against the target pinyin using the neural Conformer.
 *
 * @param {Float32Array} pcm16k 16kHz mono audio samples
 * @param {string} targetPinyin Expected pinyin (e.g. 'ài' or 'nǐ')
 * @returns {Promise<Object>} Diagnostic result with Initial, Final, Tone, and overall score
 */
export async function evaluatePronunciationWithOnnx(pcm16k, targetPinyin) {
  if (!inferenceSession) {
    throw new Error('CAPT model is not loaded yet');
  }

  const ort = await getOrt();
  if (!ort) throw new Error('ONNX runtime unavailable');

  // 1. Extract 80-channel Log-Mel spectrogram
  const melFrames = extractLogMelSpectrogram(pcm16k);
  if (melFrames.length < MIN_SPEECH_MEL_FRAMES) {
    return {
      success: false,
      message: 'Âm thanh quá ngắn hoặc không rõ tiếng. Hãy nói to và gần micro hơn.'
    };
  }

  // 2. Prepare ONNX Input Tensor: shape [1, numFrames, 80]
  const { data, shape } = melFramesToFlatTensor(melFrames);
  const inputTensor = new ort.Tensor('float32', data, shape);

  // 3. Execute Neural Inference
  const feeds = { mel: inputTensor };
  const outputs = await inferenceSession.run(feeds);

  // 4. Score outputs with GOP and Vietnamese learner diagnostics
  const result = scoreCaptPrediction(outputs, targetPinyin);
  return {
    success: true,
    ...result
  };
}
