/**
 * ToneSandhi.js
 * Mandarin Chinese Tone Sandhi Engine and Chao 5-scale target pitch generator.
 *
 * Handles:
 * 1. Third tone sandhi (3 + 3 -> 2 + 3, including multi-character 3-tone chains).
 * 2. "不" (bu4) sandhi: bu4 + 4th tone -> bu2 + 4th tone; bu4 + 1/2/3 remains bu4.
 * 3. "一" (yi1) sandhi:
 *    - Standalone or ordinal (第一, 一月, 一楼, counting) -> yi1
 *    - Before 4th tone -> yi2 (e.g. 一样, 一定, 一下, 一块)
 *    - Before 1st, 2nd, 3rd tone -> yi4 (e.g. 一起, 一天, 一直, 一本)
 * 4. Half-third tone: 3rd tone before non-3rd tone drops from 214 to 21 (low-falling).
 * 5. Neutral tone (5) pitch target based on preceding tone.
 * 6. Generates Chao 5-level pitch contour curve points for visualization & DTW scoring.
 */

import { splitPinyinSyllables, toneOfSyllable } from './pinyinTones.js';

// Chao 5-level numerical pitch representations
export const CHAO_PITCH_MAP = {
  1: [5, 5, 5, 5],        // High level (55)
  2: [3, 3.5, 4.2, 5],    // High rising (35)
  3: [2.1, 1.4, 1.0, 2.5, 4], // Full dipping (214)
  '3_half': [2.1, 1.5, 1.0, 1.0], // Half 3rd tone (21)
  4: [5, 4.0, 2.5, 1.0],  // High falling (51)
  5: [3.0, 2.5]           // Neutral tone (default mid-low)
};

// Neutral tone pitch depending on preceding tone
export const NEUTRAL_FOLLOWING_PITCH = {
  1: [2.2, 2.0], // After tone 1: low fall (around 2)
  2: [3.2, 3.0], // After tone 2: mid level (around 3)
  3: [4.2, 4.0], // After tone 3: mid-high (around 4)
  4: [1.3, 1.0], // After tone 4: low fall (around 1)
};

/**
 * Normalizes text to characters without punctuation or spaces.
 */
export function cleanChineseCharacters(text) {
  return String(text || '').replace(/[^\u4e00-\u9fa5]/g, '');
}

/**
 * Analyzes Hanzi string alongside pinyin to apply Mandarin tone sandhi.
 * Returns an array of syllable descriptors with both raw and sandhi-adjusted tones.
 *
 * @param {string} hanzi Chinese characters (e.g. "你好", "不要", "一起")
 * @param {string} pinyin Raw pinyin (e.g. "nǐ hǎo", "bù yào", "yī qǐ")
 * @returns {Array<Object>} List of syllable data objects
 */
export function analyzeToneSandhi(hanzi, pinyin) {
  const chars = cleanChineseCharacters(hanzi);
  const syllables = splitPinyinSyllables(pinyin);
  const len = Math.max(chars.length, syllables.length);

  const items = [];
  for (let i = 0; i < len; i++) {
    const char = chars[i] || '';
    const syl = syllables[i] || '';
    const rawTone = toneOfSyllable(syl);
    items.push({
      index: i,
      char,
      syllable: syl,
      rawTone,
      actualTone: rawTone,
      sandhiApplied: false,
      sandhiRule: null,
      isHalfThird: false
    });
  }

  // Pass 1: "一" (yi1) sandhi
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.char === '一' || item.syllable.toLowerCase().startsWith('yi')) {
      // Check if standalone or part of ordinal / numbers
      const isStandalone = items.length === 1;
      const prevItem = items[i - 1];
      const nextItem = items[i + 1];

      // Ordinal indicators (第, 序)
      const isOrdinal = prevItem && (prevItem.char === '第' || prevItem.char === '初');

      if (!isStandalone && !isOrdinal && nextItem) {
        if (nextItem.rawTone === 4) {
          // Before 4th tone -> 2nd tone (e.g. 一样 yí yàng, 一下 yí xià)
          item.actualTone = 2;
          item.sandhiApplied = true;
          item.sandhiRule = 'yi_before_tone_4';
        } else if ([1, 2, 3].includes(nextItem.rawTone)) {
          // Before 1st, 2nd, 3rd tone -> 4th tone (e.g. 一起 yì qǐ, 一天 yì tiān)
          item.actualTone = 4;
          item.sandhiApplied = true;
          item.sandhiRule = 'yi_before_tone_123';
        }
      }
    }
  }

  // Pass 2: "不" (bu4) sandhi
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.char === '不' || item.syllable.toLowerCase().startsWith('bu')) {
      const nextItem = items[i + 1];
      if (nextItem && nextItem.actualTone === 4) {
        // Before 4th tone -> 2nd tone (e.g. 不是 bú shì, 不对 bú duì)
        item.actualTone = 2;
        item.sandhiApplied = true;
        item.sandhiRule = 'bu_before_tone_4';
      }
    }
  }

  // Pass 3: 3rd tone sandhi (3 + 3 -> 2 + 3)
  // For consecutive 3rd tones, change the preceding one to 2nd tone.
  // Evaluate from right to left for right-branching structures, or left to right.
  // In standard 2-syllable words (nǐ hǎo), the first becomes 2nd tone.
  for (let i = 0; i < items.length - 1; i++) {
    const curr = items[i];
    const next = items[i + 1];
    if (curr.actualTone === 3 && next.actualTone === 3) {
      curr.actualTone = 2;
      curr.sandhiApplied = true;
      curr.sandhiRule = 'third_tone_sandhi';
    } else if (curr.actualTone === 3 && [1, 2, 4, 5].includes(next.actualTone)) {
      // Half-third tone: drops and stays low without rising at the end
      curr.isHalfThird = true;
    }
  }

  return items;
}

/**
 * Generates an idealized Chao pitch contour (array of normalized pitch values between 1 and 5)
 * for the given word and syllables, accounting for duration and tone sandhi.
 *
 * @param {string} hanzi Chinese word
 * @param {string} pinyin Corresponding pinyin
 * @param {number} pointsPerSyllable Number of sample points per syllable (default 50)
 * @returns {Array<{ timeNorm: number, pitchNorm: number, syllableIndex: number, tone: number }>}
 */
export function generateTargetPitchContour(hanzi, pinyin, pointsPerSyllable = 50) {
  const syllables = analyzeToneSandhi(hanzi, pinyin);
  const contour = [];
  const totalPoints = syllables.length * pointsPerSyllable;

  syllables.forEach((item, sylIdx) => {
    let key = item.actualTone;
    if (item.actualTone === 3 && item.isHalfThird) {
      key = '3_half';
    }

    let basePoints = CHAO_PITCH_MAP[key] || CHAO_PITCH_MAP[1];

    // Handle neutral tone relative to previous tone
    if (item.actualTone === 5 && sylIdx > 0) {
      const prevTone = syllables[sylIdx - 1].actualTone;
      basePoints = NEUTRAL_FOLLOWING_PITCH[prevTone] || CHAO_PITCH_MAP[5];
    }

    // Interpolate basePoints into pointsPerSyllable values (Catmull-Rom or linear interpolation)
    for (let p = 0; p < pointsPerSyllable; p++) {
      const t = p / (pointsPerSyllable - 1);
      const scaledIdx = t * (basePoints.length - 1);
      const low = Math.floor(scaledIdx);
      const high = Math.min(basePoints.length - 1, low + 1);
      const frac = scaledIdx - low;
      const pitchVal = basePoints[low] + (basePoints[high] - basePoints[low]) * frac;

      const globalIndex = sylIdx * pointsPerSyllable + p;
      const globalTimeNorm = globalIndex / Math.max(1, totalPoints - 1);

      contour.push({
        timeNorm: globalTimeNorm,
        pitchNorm: pitchVal, // 1.0 (lowest) to 5.0 (highest) in Chao 5-scale
        syllableIndex: sylIdx,
        char: item.char,
        syllable: item.syllable,
        tone: item.actualTone,
        rawTone: item.rawTone,
        sandhiApplied: item.sandhiApplied
      });
    }
  });

  return contour;
}
