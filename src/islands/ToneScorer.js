/**
 * ToneScorer.js
 * Pitch contour alignment (Dynamic Time Warping) and Vietnamese-learner diagnostic scoring.
 */

import { frequencyToChaoScale } from './PitchDetector.js';

/**
 * Calculates Median of an array of numbers.
 */
export function calculateMedian(numbers) {
  if (!numbers || numbers.length === 0) return 0;
  const sorted = [...numbers].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Applies a 1D median filter to suppress transient audio spikes / octave leaps.
 */
export function applyMedianFilter(sequence, windowSize = 3) {
  if (!sequence || sequence.length <= windowSize) return sequence ? sequence.slice() : [];
  const radius = Math.floor(windowSize / 2);
  const filtered = new Array(sequence.length);
  for (let i = 0; i < sequence.length; i++) {
    const start = Math.max(0, i - radius);
    const end = Math.min(sequence.length, i + radius + 1);
    filtered[i] = calculateMedian(sequence.slice(start, end));
  }
  return filtered;
}

/**
 * Calculates Dynamic Time Warping (DTW) distance between two numerical sequences.
 *
 * @param {Array<number>} seqA First sequence
 * @param {Array<number>} seqB Second sequence
 * @returns {number} Normalized DTW distance
 */
export function calculateDtwDistance(seqA, seqB) {
  const n = seqA.length;
  const m = seqB.length;
  if (n === 0 || m === 0) return 1.0;

  // Initialize DTW cost matrix
  const cost = Array.from({ length: n + 1 }, () => new Float32Array(m + 1).fill(Infinity));
  cost[0][0] = 0;

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const dist = Math.abs(seqA[i - 1] - seqB[j - 1]);
      cost[i][j] = dist + Math.min(cost[i - 1][j], cost[i][j - 1], cost[i - 1][j - 1]);
    }
  }

  // Normalized by path length approximation (n + m)
  return cost[n][m] / (n + m);
}

/**
 * Extracts pitch contour slope, register endpoints, and directional trend.
 */
export function evaluateToneMetrics(pitchPoints) {
  if (!pitchPoints || pitchPoints.length < 3) {
    return {
      slope: 'flat',
      delta: 0,
      avgStart: 3,
      avgMid: 3,
      avgEnd: 3,
      minPitch: 3,
      maxPitch: 3,
      avgPitch: 3
    };
  }
  const n = pitchPoints.length;
  const startSlice = pitchPoints.slice(0, Math.ceil(n / 4));
  const midSlice = pitchPoints.slice(Math.floor(n / 3), Math.floor((2 * n) / 3));
  const endSlice = pitchPoints.slice(-Math.ceil(n / 4));

  const avgStart = startSlice.reduce((a, b) => a + b, 0) / startSlice.length;
  const avgMid = midSlice.length > 0 ? midSlice.reduce((a, b) => a + b, 0) / midSlice.length : avgStart;
  const avgEnd = endSlice.reduce((a, b) => a + b, 0) / endSlice.length;
  const avgPitch = pitchPoints.reduce((a, b) => a + b, 0) / n;
  const minPitch = Math.min(...pitchPoints);
  const maxPitch = Math.max(...pitchPoints);
  const delta = avgEnd - avgStart;

  let slope = 'flat';
  // Dipping (Tone 3): middle drops significantly below start and rises toward end
  if (avgMid < avgStart - 0.35 && avgMid < avgEnd - 0.25) {
    slope = 'dipping';
  } else if (delta > 0.6) {
    slope = 'rising';
  } else if (delta < -0.6) {
    slope = 'falling';
  }

  return {
    slope,
    delta,
    avgStart,
    avgMid,
    avgEnd,
    minPitch,
    maxPitch,
    avgPitch
  };
}

/**
 * Evaluates the slope / direction trend of a pitch contour segment.
 * Returns: 'flat', 'rising', 'falling', or 'dipping'.
 */
export function evaluateSlope(pitchPoints) {
  return evaluateToneMetrics(pitchPoints).slope;
}

/**
 * Calculates tone-specific contour penalty and diagnosis based on Chao scale requirements.
 */
export function evaluateToneScorePenalty(expectedTone, metrics) {
  let penalty = 0;
  let status = 'good';
  let advice = '';

  switch (expectedTone) {
    case 1: // 55 High Level
      if (metrics.slope === 'falling') {
        penalty += 40;
        status = 'needs_work';
        advice = 'Thanh 1 (55): Bạn bị chúc giọng xuống giống dấu huyền tiếng Việt. Hãy giữ cao độ phẳng, ngân đều ở mức cao.';
      } else if (metrics.avgPitch < 3.4) {
        penalty += 25;
        status = 'fair';
        advice = 'Thanh 1 (55): Cao độ hơi thấp. Hãy phát âm cao giọng và ngân dài hơn.';
      } else if (Math.abs(metrics.delta) > 0.8) {
        penalty += 20;
        status = 'fair';
        advice = 'Thanh 1 (55): Cần giữ cao độ ổn định và ngân đều hơn.';
      } else {
        status = 'excellent';
        advice = 'Thanh 1 (55): Ngân cao và bằng phẳng rất chuẩn!';
      }
      break;

    case 2: // 35 Rising
      if (metrics.slope === 'falling') {
        penalty += 50;
        status = 'needs_work';
        advice = 'Thanh 2 (35): Giọng bị rơi xuống thay vì vuốt lên. Hãy bắt đầu từ tầm trung (3) và vút lên mức cao (5).';
      } else if (metrics.slope === 'flat' || metrics.delta < 0.6) {
        penalty += 40;
        status = 'needs_work';
        advice = 'Thanh 2 (35): Cao độ chưa vuốt lên đủ cao. Hãy dứt khoát đưa giọng từ trung lên cao.';
      } else if (metrics.avgEnd < 3.8) {
        penalty += 15;
        status = 'fair';
        advice = 'Thanh 2 (35): Hướng đi lên tốt, cố gắng vuốt cao hơn về cuối âm tiết.';
      } else {
        status = 'excellent';
        advice = 'Thanh 2 (35): Đường vuốt lên rất tự nhiên và chuẩn xác!';
      }
      break;

    case 3: // 214 or 21 (Half-third)
      if (metrics.slope === 'rising' && metrics.avgMid >= metrics.avgStart - 0.2) {
        penalty += 45;
        status = 'needs_work';
        advice = 'Thanh 3 (214): Bạn đọc thành dấu sắc hoặc hỏi tiếng Việt quá sớm. Cần dìm giọng xuống đáy (1) trước.';
      } else if (metrics.minPitch > 3.0) {
        penalty += 25;
        status = 'needs_work';
        advice = 'Thanh 3 (214): Hãy hạ giọng xuống sâu hơn ở đáy âm vực (mức 1-2).';
      } else if (metrics.slope === 'falling') {
        // Half-third is acceptable for falling into low register
        status = 'good';
        advice = 'Thanh 3: Hạ giọng trầm tốt, giữ nhịp tự nhiên.';
      } else {
        status = 'excellent';
        advice = 'Thanh 3 (214): Độ uốn và dìm giọng xuống đáy âm vực rất tốt!';
      }
      break;

    case 4: // 51 High Falling
      if (metrics.slope === 'rising') {
        penalty += 50;
        status = 'needs_work';
        advice = 'Thanh 4 (51): Lỗi phổ biến của người Việt là đọc thành dấu sắc (đi lên). Thanh 4 phải rơi dứt khoát từ 5 xuống 1!';
      } else if (metrics.slope === 'flat' || Math.abs(metrics.delta) < 0.7) {
        penalty += 45;
        status = 'needs_work';
        advice = 'Thanh 4 (51): Chưa đủ độ dốc chúc xuống (đang bị đọc thành thanh ngang). Hãy dứt khoát nhấn mạnh từ cao xuống thấp.';
      } else if (metrics.delta > -1.0) {
        penalty += 15;
        status = 'fair';
        advice = 'Thanh 4 (51): Hướng rơi tốt, nhưng cần hạ dứt khoát hơn từ cao xuống thấp.';
      } else {
        status = 'excellent';
        advice = 'Thanh 4 (51): Rơi từ cao xuống thấp dứt khoát, rất chuẩn âm điệu!';
      }

      if (metrics.avgStart < 3.4) {
        penalty += 10;
        if (status === 'excellent') status = 'fair';
      }
      break;

    default: // 5 Neutral
      status = 'good';
      advice = 'Thanh nhẹ: phát âm ngắn, nhẹ và tự nhiên.';
      break;
  }

  return { penalty, status, advice };
}

/**
 * Generates pedagogical diagnostic advice for Vietnamese learners.
 */
export function getTonePedagogicalAdvice(expectedTone, actualSlope, score, metrics = null) {
  const evaluatedMetrics = metrics || {
    slope: actualSlope,
    delta: actualSlope === 'rising' ? 1.0 : actualSlope === 'falling' ? -1.0 : 0,
    avgStart: 3,
    avgMid: 3,
    avgEnd: 3,
    minPitch: 3,
    maxPitch: 3,
    avgPitch: 3
  };
  const result = evaluateToneScorePenalty(expectedTone, evaluatedMetrics);
  if (score >= 85) {
    return {
      status: 'excellent',
      advice: 'Phát âm thanh điệu rất chuẩn xác, đường cao độ mượt mà!'
    };
  }
  return result;
}

/**
 * Scores user pitch frames against the expected target contour.
 *
 * @param {Array<{ frequency: number, clarity: number, isVoiced: boolean }>} userFrames Captured audio frames
 * @param {Array<{ timeNorm: number, pitchNorm: number, syllableIndex: number, tone: number }>} targetContour
 * @param {Array<Object>} syllableInfos Analyzed syllables from ToneSandhi
 * @returns {Object} Score summary with detailed diagnostics
 */
export function scorePitchContour(userFrames, targetContour, syllableInfos) {
  // Filter voiced frames
  const voicedFrames = userFrames.filter((f) => f.isVoiced && f.frequency >= 65 && f.frequency <= 480);

  if (voicedFrames.length < 5) {
    return {
      valid: false,
      score: 0,
      message: 'Chưa thu được đủ âm thanh giọng nói rõ ràng. Hãy thử nói to và rõ hơn gần micro.',
      toneBreakdown: []
    };
  }

  // Calculate user's median pitch for register normalization
  const frequencies = voicedFrames.map((f) => f.frequency);
  const medianHz = calculateMedian(frequencies);

  // Convert voiced frames to Chao 5-scale and apply 3-point median filter to remove noise spikes
  const rawChaoPitches = voicedFrames.map((f) => frequencyToChaoScale(f.frequency, medianHz));
  const userChaoPitches = applyMedianFilter(rawChaoPitches, 3);

  // Partition target contour and user frames by syllable
  const numSyllables = syllableInfos.length;
  const breakdown = [];
  let totalScoreSum = 0;

  for (let s = 0; s < numSyllables; s++) {
    const sylInfo = syllableInfos[s];
    const targetPointsForSyl = targetContour
      .filter((pt) => pt.syllableIndex === s)
      .map((pt) => pt.pitchNorm);

    // Approximate user slice for this syllable
    const sliceStart = Math.floor((s * userChaoPitches.length) / numSyllables);
    const sliceEnd = Math.floor(((s + 1) * userChaoPitches.length) / numSyllables);
    const userSlice = userChaoPitches.slice(sliceStart, Math.max(sliceStart + 3, sliceEnd));

    const distance = calculateDtwDistance(userSlice, targetPointsForSyl);
    // DTW base score: 0 dist = 100%, 1.5 dist = 40%, >= 2.5 dist = 0%
    const dtwBaseScore = Math.max(0, Math.min(100, Math.round(100 - (distance / 2.0) * 80)));

    // Evaluate tone contour direction and slope requirements
    const metrics = evaluateToneMetrics(userSlice);
    const { penalty, status, advice } = evaluateToneScorePenalty(sylInfo.actualTone, metrics);

    // Deduct directional penalty from DTW base score
    const finalSylScore = Math.max(0, Math.min(100, dtwBaseScore - penalty));

    const resolvedStatus = finalSylScore >= 80 ? 'excellent' : finalSylScore >= 60 ? 'fair' : 'needs_work';

    breakdown.push({
      syllableIndex: s,
      char: sylInfo.char,
      syllable: sylInfo.syllable,
      tone: sylInfo.actualTone,
      rawTone: sylInfo.rawTone,
      sandhiApplied: sylInfo.sandhiApplied,
      score: finalSylScore,
      dtwScore: dtwBaseScore,
      slope: metrics.slope,
      status: resolvedStatus,
      advice: finalSylScore >= 85 ? 'Phát âm thanh điệu rất chuẩn xác, đường cao độ mượt mà!' : advice
    });

    totalScoreSum += finalSylScore;
  }

  const overallPitchScore = Math.round(totalScoreSum / Math.max(1, numSyllables));
  let stars = 1;
  if (overallPitchScore >= 80) stars = 3;
  else if (overallPitchScore >= 60) stars = 2;

  let message = 'Chưa đạt. Cần cải thiện độ dốc thanh điệu để tự nhiên hơn.';
  if (overallPitchScore >= 80) {
    message = 'Rất tuyệt vời! Phát âm chuẩn âm điệu.';
  } else if (overallPitchScore >= 60) {
    message = 'Khá tốt! Chú ý một vài điểm thanh điệu bên dưới.';
  }

  return {
    valid: true,
    score: overallPitchScore,
    stars,
    medianHz: Math.round(medianHz),
    userChaoPitches,
    toneBreakdown: breakdown,
    message
  };
}
