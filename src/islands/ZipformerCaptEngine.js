/**
 * ZipformerCaptEngine.js
 * Pure (runtime-agnostic) glue for the sherpa-onnx zipformer CTC pronunciation model:
 * input preparation, output decoding and result assembly. Session management lives in
 * OnnxCaptEngine.js so this module also runs under Node for calibration/tests.
 */

import { computeKaldiFbank, FBANK_OPTIONS } from './KaldiFbank.js';
import { greedyDecode } from './CtcAligner.js';
import { assessSyllables, COMPONENT_PASS_SCORE } from './CaptGopScorer.js';

/** ONNX tensor names of zipformer2_ctc exports. */
export const MODEL_IO = Object.freeze({
  INPUT: 'x',
  INPUT_LENS: 'x_lens',
  OUTPUT: 'log_probs',
});
/** Silence added on both sides; clips starting instantly otherwise lose the first syllable. */
export const EDGE_PAD_SEC = 0.3;
/** Minimum fbank frames (10 ms each) of real audio worth scoring. */
export const MIN_AUDIO_FRAMES = 20;

const WEIGHT_INITIAL = 0.35;
const WEIGHT_FINAL = 0.35;
const WEIGHT_TONE = 0.30;
const WEIGHT_FINAL_NO_INITIAL = 0.55;
const WEIGHT_TONE_NO_INITIAL = 0.45;

/**
 * @param {Float32Array} pcm16k Mono 16 kHz samples in [-1, 1]
 * @returns {{x: {data: Float32Array, dims: number[]}, xLens: BigInt64Array, numFrames: number}}
 */
export function prepareModelInput(pcm16k) {
  const pad = Math.round(FBANK_OPTIONS.SAMPLE_RATE * EDGE_PAD_SEC);
  const padded = new Float32Array(pcm16k.length + 2 * pad);
  padded.set(pcm16k, pad);
  const frames = computeKaldiFbank(padded);
  const dim = FBANK_OPTIONS.NUM_MEL_BINS;
  const data = new Float32Array(frames.length * dim);
  frames.forEach((f, i) => data.set(f, i * dim));
  return {
    x: { data, dims: [1, frames.length, dim] },
    xLens: BigInt64Array.from([BigInt(frames.length)]),
    numFrames: frames.length,
  };
}

const decoderCache = new WeakMap();

/** Builds byte-level BPE piece -> bytes decoding from the bank's byte table. */
function byteDecoder(bank) {
  if (decoderCache.has(bank)) return decoderCache.get(bank);
  const charToByte = new Map();
  let b = 0;
  for (const [lo, hi] of bank.byteTableRanges) {
    for (let c = lo; c <= hi; c++) charToByte.set(String.fromCodePoint(c), b++);
  }
  return charToByte;
}

/**
 * Decodes token ids to text using bank.pieces (id -> BBPE piece) when available.
 * @returns {string}
 */
export function decodeTokens(ids, bank) {
  if (!bank.pieces) return '';
  const charToByte = byteDecoder(bank);
  const bytes = [];
  for (const id of ids) {
    for (const ch of bank.pieces[id] || '') {
      if (charToByte.has(ch)) bytes.push(charToByte.get(ch));
    }
  }
  return new TextDecoder('utf-8', { fatal: false }).decode(new Uint8Array(bytes)).replace(/�/g, '');
}

/**
 * Assembles the CaptEvaluationResult from model log-probs and per-syllable tone scores.
 *
 * @param {Float32Array} logProbs
 * @param {number[]} dims [1, T, V]
 * @param {string} hanzi
 * @param {string[]} syllables
 * @param {Object} bank
 * @param {Array<{score: number, tone: number, advice: string}>} [toneBreakdown] ToneScorer per-syllable entries
 */
export function buildCaptResult(logProbs, dims, hanzi, syllables, bank, toneBreakdown = []) {
  const [, T, V] = dims;
  const assessed = assessSyllables(logProbs, T, V, hanzi, syllables, bank);
  if (!assessed) return { success: false, message: 'Từ này chưa được hỗ trợ chấm chi tiết.' };

  assessed.forEach((s, i) => {
    const entry = toneBreakdown[i];
    s.toneScore = entry && Number.isFinite(entry.score) ? entry.score : null;
  });

  const sylScore = (s) => {
    const hasIni = s.initial.target !== 'none';
    if (s.toneScore === null) {
      return hasIni ? (s.initial.score + s.final.score) / 2 : s.final.score;
    }
    return hasIni
      ? s.initial.score * WEIGHT_INITIAL + s.final.score * WEIGHT_FINAL + s.toneScore * WEIGHT_TONE
      : s.final.score * WEIGHT_FINAL_NO_INITIAL + s.toneScore * WEIGHT_TONE_NO_INITIAL;
  };
  const overallScore = Math.round(assessed.reduce((a, s) => a + sylScore(s), 0) / assessed.length);
  const adviceList = assessed.flatMap((s) => [s.initial, s.final].filter((c) => !c.passed && c.advice).map((c) => c.advice));

  // Legacy single-syllable view (first weakest syllable) for the existing 3-pillar UI.
  const weakestIndex = assessed.reduce((a, s, i) => (sylScore(s) < sylScore(assessed[a]) ? i : a), 0);
  const weakest = assessed[weakestIndex];
  const toneEntry = toneBreakdown[weakestIndex];
  return {
    success: true,
    overallScore,
    recognizedText: decodeTokens(greedyDecode(logProbs, T, V), bank),
    syllables: assessed,
    initial: weakest.initial,
    final: weakest.final,
    tone: weakest.toneScore === null ? null : {
      target: toneEntry.tone,
      score: weakest.toneScore,
      passed: weakest.toneScore >= COMPONENT_PASS_SCORE,
      advice: toneEntry.advice || '',
    },
    adviceList: [...new Set(adviceList)],
  };
}
