/**
 * GopScorer.js
 * Goodness of Pronunciation (GOP) and Multi-Head Neural Pronunciation Scorer.
 * Decomposes syllables into Initial (Thanh mẫu), Final (Vận mẫu), and Tone (Thanh điệu)
 * with dedicated pedagogical diagnostics for Vietnamese learners.
 */

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
 * Evaluates neural model outputs against the target syllable components.
 *
 * @param {Object} modelOutputs Output tensors from MandarinCaptConformer
 * @param {string} targetPinyin Target syllable pinyin (e.g. 'ài' or 'zhōng')
 * @returns {Object} Multi-dimensional pronunciation diagnosis
 */
export function scoreCaptPrediction(modelOutputs, targetPinyin) {
  const { initial: targetInitial, final: targetFinal, tone: targetTone } = decomposePinyin(targetPinyin);

  const initialLogits = modelOutputs.initial_logits ? Array.from(modelOutputs.initial_logits.data) : [];
  const finalLogits = modelOutputs.final_logits ? Array.from(modelOutputs.final_logits.data) : [];
  const toneLogits = modelOutputs.tone_logits ? Array.from(modelOutputs.tone_logits.data) : [];
  const rawScore = modelOutputs.quality_score ? modelOutputs.quality_score.data[0] : 75;

  // 1. Initial Assessment
  const initialProbs = softmax(initialLogits);
  const targetInitIdx = Math.max(0, INITIALS_LIST.indexOf(targetInitial));
  const targetInitProb = initialProbs[targetInitIdx] || 0.1;
  let bestInitIdx = 0;
  for (let i = 1; i < initialProbs.length; i++) {
    if (initialProbs[i] > initialProbs[bestInitIdx]) bestInitIdx = i;
  }
  const detectedInitial = INITIALS_LIST[bestInitIdx] || 'none';
  const initialScore = Math.max(0, Math.min(100, Math.round(targetInitProb * 100)));

  // 2. Final Assessment
  const finalProbs = softmax(finalLogits);
  const targetFinalIdx = Math.max(0, FINALS_LIST.indexOf(targetFinal));
  const targetFinalProb = finalProbs[targetFinalIdx] || 0.1;
  let bestFinalIdx = 0;
  for (let i = 1; i < finalProbs.length; i++) {
    if (finalProbs[i] > finalProbs[bestFinalIdx]) bestFinalIdx = i;
  }
  const detectedFinal = FINALS_LIST[bestFinalIdx] || 'a';
  const finalScore = Math.max(0, Math.min(100, Math.round(targetFinalProb * 100)));

  // 3. Tone Assessment
  const toneProbs = softmax(toneLogits);
  const targetToneIdx = Math.max(0, Math.min(4, targetTone - 1));
  const targetToneProb = toneProbs[targetToneIdx] || 0.1;
  let bestToneIdx = 0;
  for (let i = 1; i < toneProbs.length; i++) {
    if (toneProbs[i] > toneProbs[bestToneIdx]) bestToneIdx = i;
  }
  const detectedTone = bestToneIdx + 1;
  const toneScore = Math.max(0, Math.min(100, Math.round(targetToneProb * 100)));

  // Compose pedagogical diagnosis for Vietnamese learner
  const adviceList = [];
  let initAdvice = '';
  if (targetInitial !== 'none') {
    if (initialScore < 70) {
      const diag = VIETNAMESE_CAPT_DIAGNOSTICS.initials[targetInitial];
      initAdvice = diag ? diag.advice : `Cần phát âm rõ âm đầu [${targetInitial}].`;
      adviceList.push(initAdvice);
    } else {
      initAdvice = `Thanh mẫu [${targetInitial}] phát âm rất chuẩn xác!`;
    }
  }

  let finalAdvice = '';
  if (finalScore < 70) {
    const diag = VIETNAMESE_CAPT_DIAGNOSTICS.finals[targetFinal];
    finalAdvice = diag ? diag.advice : `Chú ý phát âm tròn rõ vần [${targetFinal}].`;
    adviceList.push(finalAdvice);
  } else {
    finalAdvice = `Vận mẫu [${targetFinal}] tròn vành rõ chữ!`;
  }

  let toneAdvice = '';
  if (toneScore < 70) {
    toneAdvice = VIETNAMESE_CAPT_DIAGNOSTICS.tones[targetTone] || 'Chú ý cao độ thanh điệu.';
    adviceList.push(toneAdvice);
  } else {
    toneAdvice = `Thanh ${targetTone} chuẩn âm điệu!`;
  }

  // Balanced overall score: 35% Initial + 35% Final + 30% Tone
  const weightedOverall = Math.round(
    (targetInitial !== 'none'
      ? initialScore * 0.35 + finalScore * 0.35 + toneScore * 0.30
      : finalScore * 0.55 + toneScore * 0.45)
  );

  return {
    overallScore: Math.max(0, Math.min(100, weightedOverall)),
    qualityScore: Math.round(rawScore),
    initial: {
      target: targetInitial,
      detected: detectedInitial,
      score: initialScore,
      advice: initAdvice,
      passed: initialScore >= 70
    },
    final: {
      target: targetFinal,
      detected: detectedFinal,
      score: finalScore,
      advice: finalAdvice,
      passed: finalScore >= 70
    },
    tone: {
      target: targetTone,
      detected: detectedTone,
      score: toneScore,
      advice: toneAdvice,
      passed: toneScore >= 70
    },
    adviceList
  };
}
