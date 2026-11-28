/**
 * CaptGopScorer.js
 * Turns frame-level CTC log-probabilities of the zipformer CTC model into per-syllable
 * initial/final assessments using forced-alignment GOP and minimal-pair competitors.
 * Tone is NOT judged here (the character model is weak on tone); it comes from ToneScorer.
 */

import { alignSyllables } from './CtcAligner.js';
import { parsePinyinTone, decomposePinyin, VIETNAMESE_CAPT_DIAGNOSTICS } from './GopScorer.js';

/**
 * GOP calibration (from tools/calibrate_capt_gop.mjs on prebuilt Xiaoxiao clips).
 * GOP >= GOP_FULL_SCORE maps to 100, GOP <= GOP_ZERO_SCORE maps to 0, linear between.
 */
export const GOP_FULL_SCORE = -1.0;
export const GOP_ZERO_SCORE = -9.0;
/** A competitor must beat the target GOP by this much to be reported as "detected". */
export const COMPETITOR_MARGIN = 1.0;
/** Upper bound for a component whose minimal-pair competitor won. */
export const FAILED_COMPONENT_CAP = 50;
export const COMPONENT_PASS_SCORE = 70;
const SCORE_MAX = 100;

/** Confusable initials for Vietnamese learners (string prefix swaps on toneless pinyin). */
export const INITIAL_SWAPS = Object.freeze({
  zh: ['z'], z: ['zh'], ch: ['c'], c: ['ch'], sh: ['s'], s: ['sh'],
  j: ['q'], q: ['j'], b: ['p'], p: ['b'], d: ['t'], t: ['d'],
  g: ['k'], k: ['g'], n: ['l'], l: ['n', 'r'], f: ['h'], h: ['f'], r: ['l'],
});
/** Confusable final endings (longest first so 'ang' wins over 'an'). */
export const FINAL_SUFFIX_SWAPS = Object.freeze([
  ['ang', 'an'], ['eng', 'en'], ['ing', 'in'],
  ['an', 'ang'], ['en', 'eng'], ['in', 'ing'],
]);
const U_UMLAUT_SWAPS = Object.freeze({ lu: 'lv', lv: 'lu', nu: 'nv', nv: 'nu' });

/**
 * @typedef {Object} CaptTokenBank  database/speech/capt_token_bank.json
 * @property {Object<string, number[]>} chars       Hanzi -> BBPE token ids
 * @property {Object<string, {c: string, t: number[]}>} syllables  'zhong1' -> representative char
 */

function initialPrefix(base) {
  const two = base.slice(0, 2);
  if (two === 'zh' || two === 'ch' || two === 'sh') return two;
  return INITIAL_SWAPS[base[0]] ? base[0] : '';
}

/**
 * Minimal-pair competitor syllables (same tone) that exist in the bank.
 * @returns {{initial: Array<{key: string, value: string}>, final: Array<{key: string, value: string}>}}
 */
export function competitorSyllables(pinyinSyllable, bank) {
  const { cleanPinyin: base, tone } = parsePinyinTone(pinyinSyllable);
  const has = (b) => Boolean(bank.syllables[`${b}${tone}`]);
  const initial = [];
  const final = [];

  const ini = initialPrefix(base);
  if (ini) {
    for (const alt of INITIAL_SWAPS[ini]) {
      const b = alt + base.slice(ini.length);
      if (has(b)) initial.push({ key: `${b}${tone}`, value: alt });
    }
  }
  const finalPart = base.slice(ini.length);
  const swap = FINAL_SUFFIX_SWAPS.find(([from]) => finalPart.endsWith(from));
  if (swap) {
    const b = base.slice(0, base.length - swap[0].length) + swap[1];
    if (has(b)) final.push({ key: `${b}${tone}`, value: decomposePinyin(b).final });
  }
  if (U_UMLAUT_SWAPS[base] && has(U_UMLAUT_SWAPS[base])) {
    final.push({ key: `${U_UMLAUT_SWAPS[base]}${tone}`, value: decomposePinyin(U_UMLAUT_SWAPS[base]).final });
  }
  return { initial, final };
}

/** Linear GOP -> 0..100 score. */
export function gopToScore(gop) {
  const ratio = (gop - GOP_ZERO_SCORE) / (GOP_FULL_SCORE - GOP_ZERO_SCORE);
  return Math.round(Math.max(0, Math.min(1, ratio)) * SCORE_MAX);
}

function assessComponent(kind, target, syllableScore, targetGop, rivals) {
  const best = rivals.reduce((a, r) => (r.gop > (a ? a.gop : -Infinity) ? r : a), null);
  const lost = Boolean(best && best.gop > targetGop + COMPETITOR_MARGIN);
  const score = lost ? Math.min(syllableScore, FAILED_COMPONENT_CAP) : syllableScore;
  const passed = score >= COMPONENT_PASS_SCORE;
  const catalog = VIETNAMESE_CAPT_DIAGNOSTICS[kind === 'initial' ? 'initials' : 'finals'];
  const label = kind === 'initial' ? 'âm đầu' : 'vần';
  const advice = passed
    ? `Phát âm ${label} [${target}] chuẩn.`
    : (catalog[target] && catalog[target].advice) || `Chú ý phát âm rõ ${label} [${target}].`;
  return { target, detected: lost ? best.value : target, score, passed, advice };
}

/**
 * @typedef {Object} SyllableAssessment
 * @property {string} hanzi
 * @property {string} targetPinyin
 * @property {number} gop
 * @property {{target:string,detected:string,score:number,passed:boolean,advice:string}} initial
 * @property {{target:string,detected:string,score:number,passed:boolean,advice:string}} final
 * @property {number|null} toneScore  Filled by the caller from ToneScorer
 */

/**
 * Scores each syllable of a word.
 * @param {Float32Array} logProbs Flat [numFrames * vocabSize]
 * @param {number} numFrames
 * @param {number} vocabSize
 * @param {string} hanzi        e.g. '中国'
 * @param {string[]} syllables  e.g. ['zhōng', 'guó']
 * @param {CaptTokenBank} bank
 * @returns {SyllableAssessment[]|null} null when the word is not covered by the bank
 */
export function assessSyllables(logProbs, numFrames, vocabSize, hanzi, syllables, bank) {
  const chars = [...hanzi].filter((c) => bank.chars[c]);
  if (!chars.length || chars.length !== syllables.length) return null;
  const groups = chars.map((c) => bank.chars[c]);
  const base = alignSyllables(logProbs, numFrames, vocabSize, groups);

  const gopWith = (index, tokens) => {
    const swapped = groups.slice();
    swapped[index] = tokens;
    return alignSyllables(logProbs, numFrames, vocabSize, swapped)[index].gop;
  };

  return chars.map((c, i) => {
    const { initial, final } = decomposePinyin(syllables[i]);
    const targetGop = base[i].gop;
    const syllableScore = gopToScore(targetGop);
    const rivals = competitorSyllables(syllables[i], bank);
    const score = (list) => list.map((r) => ({ value: r.value, gop: gopWith(i, bank.syllables[r.key].t) }));
    return {
      hanzi: c,
      targetPinyin: syllables[i],
      gop: targetGop,
      initial: initial === 'none'
        ? { target: 'none', detected: 'none', score: syllableScore, passed: true, advice: '' }
        : assessComponent('initial', initial, syllableScore, targetGop, score(rivals.initial)),
      final: assessComponent('final', final, syllableScore, targetGop, score(rivals.final)),
      toneScore: null,
    };
  });
}
