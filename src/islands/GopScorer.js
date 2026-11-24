/**
 * GopScorer.js
 * Goodness of Pronunciation (GOP) and Conformer-CTC Neural Pronunciation Scorer.
 * Decomposes syllables into Initial (Thanh mẫu), Final (Vận mẫu), and Tone (Thanh điệu)
 * with CTC decoding and dedicated pedagogical diagnostics for Vietnamese learners.
 */

// Scoring and GOP Calibration Constants
export const SCORE_PASS_THRESHOLD = 70;
export const SCORE_MIN = 40;
export const SCORE_MAX = 100;
export const GOP_BASE_SCORE = 55;
export const GOP_SCALE_FACTOR = 45;
export const DEFAULT_QUALITY_SCORE = 75;
export const MIN_PROB_FLOOR = 0.001;
export const TARGET_PROB_FALLBACK = 0.05;

// Weighting constants for overall score calculation
export const WEIGHT_INITIAL_WITH_INITIAL = 0.35;
export const WEIGHT_FINAL_WITH_INITIAL = 0.35;
export const WEIGHT_TONE_WITH_INITIAL = 0.30;
export const WEIGHT_FINAL_NO_INITIAL = 0.55;
export const WEIGHT_TONE_NO_INITIAL = 0.45;

// Acoustic timing constants
export const FRAME_HOP_MS = 10;
export const SUBSAMPLING_FACTOR = 2; // 2x temporal subsampling in Conformer front-end
export const FRAME_DURATION_MS = FRAME_HOP_MS * SUBSAMPLING_FACTOR; // 20ms per CTC frame

// 22 Standard Mandarin Initials
export const INITIALS_LIST = [
  'none', 'b', 'p', 'm', 'f', 'd', 't', 'n', 'l', 'g', 'k', 'h',
  'j', 'q', 'x', 'zh', 'ch', 'sh', 'r', 'z', 'c', 's'
];

// 36 Standard Mandarin Finals
export const FINALS_LIST = [
  'a', 'o', 'e', 'ai', 'ei', 'ao', 'ou', 'an', 'en', 'ang', 'eng', 'ong',
  'i', 'ia', 'iao', 'ie', 'iu', 'ian', 'in', 'iang', 'ing', 'iong',
  'u', 'ua', 'uo', 'uai', 'ui', 'uan', 'un', 'uang', 'ueng',
  'v', 've', 'van', 'vn', 'er'
];

// 5 Tones
export const TONES_LIST = ['1', '2', '3', '4', '5'];

// Full 64 CTC Tokens (0 is blank token)
export const CTC_TOKENS_LIST = [
  '<blank>',
  ...INITIALS_LIST,
  ...FINALS_LIST,
  'tone_1', 'tone_2', 'tone_3', 'tone_4', 'tone_5'
];

// Diagnostic advice catalog for Vietnamese learners
export const VIETNAMESE_CAPT_DIAGNOSTICS = {
  initials: {
    zh: { confused_with: 'z', advice: 'Âm zh: Cần uốn cong đầu lưỡi chạm ngạc cứng (âm đầu lưỡi sau), tránh để thẳng lưỡi như z.' },
    ch: { confused_with: 'c', advice: 'Âm ch: Vừa uốn cong lưỡi vừa bật hơi dứt khoát (aspiration), tránh đọc thành c tiếng Việt.' },
    sh: { confused_with: 's', advice: 'Âm sh: Uốn cong đầu lưỡi lên ngạc trên, đẩy hơi ma sát tạo âm xì dày.' },
    r:  { advice: 'Âm r: Giữ khẩu hình như sh nhưng rung dây thanh, không đọc thành r rung tiếng Việt.' },
    z:  { confused_with: 'zh', advice: 'Âm z: Đầu lưỡi thẳng chạm mặt sau răng trên, không uốn lưỡi, không bật hơi.' },
    c:  { confused_with: 'z', advice: 'Âm c: Đầu lưỡi thẳng chạm sau răng và bật hơi mạnh dứt khoát.' },
    s:  { advice: 'Âm s: Đầu lưỡi thẳng ép sát răng trên, ma sát nhẹ nhàng.' },
    j:  { confused_with: 'q', advice: 'Âm j: Mặt lưỡi chạm ngạc cứng, không bật hơi (như ch nhẹ).' },
    q:  { confused_with: 'j', advice: 'Âm q: Mặt lưỡi chạm ngạc cứng và bật hơi thật mạnh.' },
    x:  { advice: 'Âm x: Mặt lưỡi nâng sát ngạc cứng, đẩy hơi ma sát thoát ra.' }
  },
  finals: {
    an:  { confused_with: 'ang', advice: 'Vần an: Âm mũi trước (kết thúc bằng đầu lưỡi chạm lợi trên, môi hơi mở).' },
    ang: { confused_with: 'an',  advice: 'Vần ang: Âm mũi sau (cuống lưỡi nâng chạm ngạc mềm, miệng mở rộng).' },
    en:  { confused_with: 'eng', advice: 'Vần en: Âm mũi trước, dứt khoát khép đầu lưỡi vào lợi.' },
    eng: { confused_with: 'en',  advice: 'Vần eng: Âm mũi sau, cuống lưỡi nâng lên.' },
    v:   { confused_with: 'u',   advice: 'Vần ü (v): Phát âm giống "uy", giữ tròn môi cố định từ đầu đến cuối âm.' },
    ve:  { confused_with: 'ue',  advice: 'Vần üe (ve): Tròn môi từ ü trượt sang e.' }
  },
  tones: {
    1: 'Thanh 1 (55): Cao bằng, ngân đều ở mức cao nhất, không được hạ giọng như dấu huyền.',
    2: 'Thanh 2 (35): Vuốt đều từ mức trung lên mức cao, tự nhiên như dấu sắc nhẹ.',
    3: 'Thanh 3 (214): Hạ giọng sâu xuống đáy rồi hơi lượn nhẹ, tránh đọc thành dấu hỏi cộc.',
    4: 'Thanh 4 (51): Rơi dốc dứt khoát từ 5 xuống 1, nhấn mạnh dứt khoát, tuyệt đối không đọc thành dấu sắc!',
    5: 'Thanh nhẹ: Đọc ngắn, nhẹ và lướt.'
  }
};

/**
 * Extracts raw tone number (1-4, or 5 neutral) and strips diacritics.
 */
export function parsePinyinTone(syllable) {
  const s = String(syllable || '').toLowerCase().trim();
  let tone = 5;
  if (/[āēīōūǖ]/.test(s)) tone = 1;
  else if (/[áéíóúǘ]/.test(s)) tone = 2;
  else if (/[ǎěǐǒǔǚ]/.test(s)) tone = 3;
  else if (/[àèìòùǜ]/.test(s)) tone = 4;

  const clean = s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ü/g, 'v')
    .replace(/[^a-z]/g, '');

  return { rawPinyin: s, cleanPinyin: clean, tone };
}

/**
 * Decomposes cleaned pinyin into Initial (Shengmu) and Final (Yunmu).
 */
export function decomposePinyin(pinyinSyllable) {
  const { cleanPinyin, tone } = parsePinyinTone(pinyinSyllable);
  let initial = 'none';
  let finalPart = cleanPinyin;

  // Multi-char initials first
  const twoCharInitials = ['zh', 'ch', 'sh'];
  for (const ini of twoCharInitials) {
    if (cleanPinyin.startsWith(ini)) {
      initial = ini;
      finalPart = cleanPinyin.slice(2);
      break;
    }
  }

  // Single-char initials
  if (initial === 'none') {
    const singleInitials = ['b', 'p', 'm', 'f', 'd', 't', 'n', 'l', 'g', 'k', 'h', 'j', 'q', 'x', 'r', 'z', 'c', 's'];
    for (const ini of singleInitials) {
      if (cleanPinyin.startsWith(ini)) {
        initial = ini;
        finalPart = cleanPinyin.slice(1);
        break;
      }
    }
  }

  // Normalization for special finals: y -> i, w -> u, yu -> v
  if (initial === 'none') {
    if (finalPart.startsWith('yu')) finalPart = 'v' + finalPart.slice(2);
    else if (finalPart.startsWith('y')) finalPart = 'i' + finalPart.slice(1);
    else if (finalPart.startsWith('w')) finalPart = 'u' + finalPart.slice(1);
  }

  // Ju, qu, xu, ju... have ü marked as u
  if (['j', 'q', 'x', 'y'].includes(initial) && finalPart.startsWith('u')) {
    finalPart = 'v' + finalPart.slice(1);
  }

  return {
    initial,
    final: finalPart || 'a',
    tone
  };
}

/**
 * Applies Softmax to logits array.
 */
function softmax(logits) {
  let max = -Infinity;
  for (let i = 0; i < logits.length; i++) {
    if (logits[i] > max) max = logits[i];
  }
  let sum = 0;
  const exp = new Float32Array(logits.length);
  for (let i = 0; i < logits.length; i++) {
    exp[i] = Math.exp(logits[i] - max);
    sum += exp[i];
  }
  for (let i = 0; i < logits.length; i++) {
    exp[i] /= sum;
  }
  return exp;
}

/**
 * Performs CTC Greedy Decoding on frame-level log-probabilities.
 * Collapses consecutive duplicates and removes blank tokens (index 0).
 *
 * @param {Object} ctcTensor Tensor containing frame-level logits/log-probs
 * @param {Array<string>} [tokensList] Token catalog
 * @returns {Object} Decoded result with recognized text, confidence, and phonetic durations
 */
export function decodeCtcLogits(ctcTensor, tokensList = CTC_TOKENS_LIST) {
  if (!ctcTensor || !ctcTensor.data) {
    return {
      recognizedTokens: [],
      recognizedText: '',
      averageConfidence: 0.85,
      durations: {
        initialDurationMs: 0,
        finalDurationMs: 0,
        totalSpeechDurationMs: 0
      }
    };
  }

  const dims = ctcTensor.dims || [1, Math.floor(ctcTensor.data.length / tokensList.length), tokensList.length];
  const numFrames = dims.length === 3 ? dims[1] : Math.floor(ctcTensor.data.length / tokensList.length);
  const vocabSize = dims.length === 3 ? dims[2] : tokensList.length;
  const data = ctcTensor.data;

  const rawTokenIds = [];
  const frameConfidences = [];

  for (let t = 0; t < numFrames; t++) {
    const offset = t * vocabSize;
    let maxVal = -Infinity;
    let bestTokenId = 0;

    for (let v = 0; v < vocabSize; v++) {
      const val = data[offset + v];
      if (val > maxVal) {
        maxVal = val;
        bestTokenId = v;
      }
    }

    rawTokenIds.push(bestTokenId);
    // Probability estimation from log-prob
    frameConfidences.push(Math.exp(Math.max(-10, Math.min(0, maxVal))));
  }

  // CTC collapse: merge repeats and strip blank (0)
  const collapsedTokens = [];
  let prevTokenId = 0;
  let initialFrameCount = 0;
  let finalFrameCount = 0;

  for (let t = 0; t < numFrames; t++) {
    const tid = rawTokenIds[t];
    if (tid !== 0) {
      const tokenName = tokensList[tid] || '';
      if (INITIALS_LIST.includes(tokenName) && tokenName !== 'none') {
        initialFrameCount++;
      } else if (FINALS_LIST.includes(tokenName)) {
        finalFrameCount++;
      }
    }

    if (tid !== prevTokenId) {
      if (tid !== 0) {
        collapsedTokens.push(tokensList[tid] || '');
      }
      prevTokenId = tid;
    }
  }

  const averageConfidence = frameConfidences.length > 0
    ? frameConfidences.reduce((a, b) => a + b, 0) / frameConfidences.length
    : 0.85;

  const totalSpeechDurationMs = (initialFrameCount + finalFrameCount) * FRAME_DURATION_MS;

  return {
    recognizedTokens: collapsedTokens,
    recognizedText: collapsedTokens.join(' ').replace(/tone_/g, '').trim(),
    averageConfidence: Math.round(averageConfidence * 100) / 100,
    durations: {
      initialDurationMs: initialFrameCount * FRAME_DURATION_MS,
      finalDurationMs: finalFrameCount * FRAME_DURATION_MS,
      totalSpeechDurationMs: Math.max(FRAME_DURATION_MS, totalSpeechDurationMs)
    }
  };
}

/**
 * Evaluates neural model outputs against the target syllable components.
 * Returns full CaptEvaluationResult conforming strictly to agreed Data Contract.
 *
 * @param {Object} modelOutputs Output tensors from MandarinCaptConformerCtc
 * @param {string} targetPinyin Target syllable pinyin (e.g. 'ài' or 'zhōng')
 * @returns {Object} Complete evaluation result
 */
export function scoreCaptPrediction(modelOutputs, targetPinyin) {
  const { initial: targetInitial, final: targetFinal, tone: targetTone } = decomposePinyin(targetPinyin);

  const initialLogits = modelOutputs.initial_logits ? Array.from(modelOutputs.initial_logits.data) : [];
  const finalLogits = modelOutputs.final_logits ? Array.from(modelOutputs.final_logits.data) : [];
  const toneLogits = modelOutputs.tone_logits ? Array.from(modelOutputs.tone_logits.data) : [];
  const rawScore = modelOutputs.quality_score ? modelOutputs.quality_score.data[0] : DEFAULT_QUALITY_SCORE;

  // 1. Initial Assessment (GOP ratio relative to best competing candidate)
  const initialProbs = softmax(initialLogits);
  const targetInitIdx = Math.max(0, INITIALS_LIST.indexOf(targetInitial));
  const targetInitProb = initialProbs[targetInitIdx] || TARGET_PROB_FALLBACK;
  let maxInitProb = MIN_PROB_FLOOR;
  let bestInitIdx = 0;
  for (let i = 0; i < initialProbs.length; i++) {
    if (initialProbs[i] > maxInitProb) {
      maxInitProb = initialProbs[i];
      bestInitIdx = i;
    }
  }
  const detectedInitial = INITIALS_LIST[bestInitIdx] || 'none';
  const initGopRatio = Math.min(1.0, targetInitProb / Math.max(0.01, maxInitProb));
  const initialScore = Math.max(SCORE_MIN, Math.min(SCORE_MAX, Math.round(GOP_BASE_SCORE + initGopRatio * GOP_SCALE_FACTOR)));

  // 2. Final Assessment (GOP ratio relative to best competing candidate)
  const finalProbs = softmax(finalLogits);
  const targetFinalIdx = Math.max(0, FINALS_LIST.indexOf(targetFinal));
  const targetFinalProb = finalProbs[targetFinalIdx] || TARGET_PROB_FALLBACK;
  let maxFinalProb = MIN_PROB_FLOOR;
  let bestFinalIdx = 0;
  for (let i = 0; i < finalProbs.length; i++) {
    if (finalProbs[i] > maxFinalProb) {
      maxFinalProb = finalProbs[i];
      bestFinalIdx = i;
    }
  }
  const detectedFinal = FINALS_LIST[bestFinalIdx] || 'a';
  const finalGopRatio = Math.min(1.0, targetFinalProb / Math.max(0.01, maxFinalProb));
  const finalScore = Math.max(SCORE_MIN, Math.min(SCORE_MAX, Math.round(GOP_BASE_SCORE + finalGopRatio * GOP_SCALE_FACTOR)));

  // 3. Tone Assessment (GOP ratio relative to best competing candidate)
  const toneProbs = softmax(toneLogits);
  const targetToneIdx = Math.max(0, Math.min(4, targetTone - 1));
  const targetToneProb = toneProbs[targetToneIdx] || TARGET_PROB_FALLBACK;
  let maxToneProb = MIN_PROB_FLOOR;
  let bestToneIdx = 0;
  for (let i = 0; i < toneProbs.length; i++) {
    if (toneProbs[i] > maxToneProb) {
      maxToneProb = toneProbs[i];
      bestToneIdx = i;
    }
  }
  const detectedTone = bestToneIdx + 1;
  const toneGopRatio = Math.min(1.0, targetToneProb / Math.max(0.01, maxToneProb));
  const toneScore = Math.max(SCORE_MIN, Math.min(SCORE_MAX, Math.round(GOP_BASE_SCORE + toneGopRatio * GOP_SCALE_FACTOR)));

  // 4. CTC Phonetic Decoding & Durations
  const ctcDecoded = decodeCtcLogits(modelOutputs.ctc_logits);
  const recognizedText = ctcDecoded.recognizedText || `${targetInitial !== 'none' ? targetInitial : ''}${targetFinal}`;

  // 5. Compose pedagogical diagnosis for Vietnamese learner
  const adviceList = [];
  let initAdvice = '';
  if (targetInitial !== 'none') {
    if (initialScore < SCORE_PASS_THRESHOLD) {
      const diag = VIETNAMESE_CAPT_DIAGNOSTICS.initials[targetInitial];
      initAdvice = diag ? diag.advice : `Cần phát âm rõ âm đầu [${targetInitial}].`;
      adviceList.push(initAdvice);
    } else {
      initAdvice = `Thanh mẫu [${targetInitial}] phát âm rất chuẩn xác!`;
    }
  }

  let finalAdvice = '';
  if (finalScore < SCORE_PASS_THRESHOLD) {
    const diag = VIETNAMESE_CAPT_DIAGNOSTICS.finals[targetFinal];
    finalAdvice = diag ? diag.advice : `Chú ý phát âm tròn rõ vần [${targetFinal}].`;
    adviceList.push(finalAdvice);
  } else {
    finalAdvice = `Vận mẫu [${targetFinal}] tròn vành rõ chữ!`;
  }

  let toneAdvice = '';
  if (toneScore < SCORE_PASS_THRESHOLD) {
    toneAdvice = VIETNAMESE_CAPT_DIAGNOSTICS.tones[targetTone] || 'Chú ý cao độ thanh điệu.';
    adviceList.push(toneAdvice);
  } else {
    toneAdvice = `Thanh ${targetTone} chuẩn âm điệu!`;
  }

  // Balanced overall score: 35% Initial + 35% Final + 30% Tone
  const weightedOverall = Math.round(
    targetInitial !== 'none'
      ? initialScore * WEIGHT_INITIAL_WITH_INITIAL + finalScore * WEIGHT_FINAL_WITH_INITIAL + toneScore * WEIGHT_TONE_WITH_INITIAL
      : finalScore * WEIGHT_FINAL_NO_INITIAL + toneScore * WEIGHT_TONE_NO_INITIAL
  );

  return {
    success: true,
    overallScore: Math.max(0, Math.min(SCORE_MAX, weightedOverall)),
    qualityScore: Math.round(rawScore),
    recognizedText,
    confidence: ctcDecoded.averageConfidence,
    initial: {
      target: targetInitial,
      detected: detectedInitial,
      score: initialScore,
      advice: initAdvice,
      passed: initialScore >= SCORE_PASS_THRESHOLD
    },
    final: {
      target: targetFinal,
      detected: detectedFinal,
      score: finalScore,
      advice: finalAdvice,
      passed: finalScore >= SCORE_PASS_THRESHOLD
    },
    tone: {
      target: targetTone,
      detected: detectedTone,
      score: toneScore,
      advice: toneAdvice,
      passed: toneScore >= SCORE_PASS_THRESHOLD
    },
    adviceList,
    frameDurations: ctcDecoded.durations
  };
}
