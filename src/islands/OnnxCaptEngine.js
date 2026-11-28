/**
 * OnnxCaptEngine.js
 * In-browser inference controller for the zipformer CTC pronunciation model.
 * Kaldi fbank -> ONNX Runtime Web -> forced-alignment GOP per syllable.
 */

import { loadCachedCaptModel, downloadAndCacheCaptModel, loadCaptTokenBank } from './SpeechModelManager.js';
import { prepareModelInput, buildCaptResult, MODEL_IO, MIN_AUDIO_FRAMES } from './ZipformerCaptEngine.js';
import { numFbankFrames } from './KaldiFbank.js';

/** ORT severity 3 = errors only (hides benign graph-optimizer warnings of the export). */
const ORT_LOG_LEVEL_ERROR = 3;

let inferenceSession = null;
let isInitializing = false;
let ortInstance = null;

const ORT_CDN_URL = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.31.1/dist/ort.min.js';
const ORT_WASM_PATH = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.31.1/dist/';
/** Subresource Integrity of ort.min.js 1.31.1 (identical to node_modules/onnxruntime-web/dist). */
const ORT_CDN_INTEGRITY = 'sha384-Gcu8U60SCeoyIiwfPwFy+eRexUuRRE9UYEXcm6vLDFVkGxcB1kk/gTv9FKTgoA6h';

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
    script.integrity = ORT_CDN_INTEGRITY;
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
      executionProviders: ['wasm'],
      logSeverityLevel: ORT_LOG_LEVEL_ERROR
    });

    console.log('✅ [OnnxCaptEngine] Zipformer CTC pronunciation model loaded into WebAssembly.');
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

/**
 * Scores recorded audio against the target word with the zipformer CTC model.
 *
 * @param {Float32Array} pcm16k 16 kHz mono samples in [-1, 1]
 * @param {string} hanzi Target word, e.g. '中国'
 * @param {string[]} syllables Target pinyin syllables, e.g. ['zhōng', 'guó']
 * @param {Array} [toneBreakdown] ToneScorer per-syllable entries (tone comes from pitch)
 * @returns {Promise<Object>} CaptEvaluationResult with per-syllable assessments
 */
export async function evaluatePronunciationWithOnnx(pcm16k, hanzi, syllables, toneBreakdown = []) {
  if (!inferenceSession) {
    throw new Error('CAPT model is not loaded yet');
  }
  if (numFbankFrames(pcm16k.length) < MIN_AUDIO_FRAMES) {
    return {
      success: false,
      message: 'Âm thanh quá ngắn hoặc không rõ tiếng. Hãy nói to và gần micro hơn.'
    };
  }

  const ort = await getOrt();
  if (!ort) throw new Error('ONNX runtime unavailable');
  const bank = await loadCaptTokenBank();

  const { x, xLens } = prepareModelInput(pcm16k);
  const outputs = await inferenceSession.run({
    [MODEL_IO.INPUT]: new ort.Tensor('float32', x.data, x.dims),
    [MODEL_IO.INPUT_LENS]: new ort.Tensor('int64', xLens, [1])
  });
  const logProbs = outputs[MODEL_IO.OUTPUT];
  return buildCaptResult(logProbs.data, logProbs.dims, hanzi, syllables, bank, toneBreakdown);
}
