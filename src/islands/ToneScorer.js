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
 * Evaluates the slope / direction trend of a pitch contour segment.
 * Returns: 'flat', 'rising', 'falling', or 'dipping'.
 */
export function evaluateSlope(pitchPoints) {
  if (!pitchPoints || pitchPoints.length < 3) return 'flat';
  const start = pitchPoints.slice(0, Math.ceil(pitchPoints.length / 4));
  const middle = pitchPoints.slice(Math.floor(pitchPoints.length / 3), Math.floor((2 * pitchPoints.length) / 3));
  const end = pitchPoints.slice(-Math.ceil(pitchPoints.length / 4));

  const avgStart = start.reduce((a, b) => a + b, 0) / start.length;
  const avgMid = middle.reduce((a, b) => a + b, 0) / middle.length;
  const avgEnd = end.reduce((a, b) => a + b, 0) / end.length;

  const deltaTotal = avgEnd - avgStart;

  // Check for dipping (Tone 3): middle is significantly lower than both start and end
  if (avgMid < avgStart - 0.4 && avgMid < avgEnd - 0.3) {
    return 'dipping';
  }

  if (deltaTotal > 0.6) return 'rising';
  if (deltaTotal < -0.6) return 'falling';
  return 'flat';
}

/**
 * Generates pedagogical diagnostic advice for Vietnamese learners.
 */
export function getTonePedagogicalAdvice(expectedTone, actualSlope, dtwScore) {
  if (dtwScore >= 85) {
    return {
      status: 'excellent',
      advice: 'Phát âm thanh điệu rất chuẩn xác, đường cao độ mượt mà!'
    };
  }

  switch (expectedTone) {
    case 1: // 55
      if (actualSlope === 'falling') {
        return {
          status: 'needs_work',
          advice: 'Thanh 1 (55): Bạn bị chúc giọng xuống giống dấu huyền tiếng Việt. Hãy giữ cao độ phẳng, ngân đều ở mức cao.'
        };
      }
      return {
        status: 'fair',
        advice: 'Thanh 1 (55): Cần giữ cao độ ổn định và ngân đều hơn.'
      };

    case 2: // 35
      if (actualSlope !== 'rising') {
        return {
          status: 'needs_work',
          advice: 'Thanh 2 (35): Cao độ chưa vuốt lên đủ cao. Hãy bắt đầu từ tầm trung (3) và vút lên mức cao (5).'
        };
      }
      return {
        status: 'fair',
        advice: 'Thanh 2 (35): Hướng đi lên tốt, cố gắng vuốt tự nhiên hơn.'
      };

    case 3: // 214 or half-3rd (21)
      if (actualSlope === 'rising') {
        return {
          status: 'needs_work',
          advice: 'Thanh 3 (214): Bạn đọc thành dấu sắc hoặc hỏi tiếng Việt quá sớm. Cần dìm giọng xuống đáy (1) trước.'
        };
      }
      return {
        status: 'fair',
        advice: 'Thanh 3 (214): Hãy hạ giọng xuống sâu hơn ở giữa âm tiết.'
      };

    case 4: // 51
      if (actualSlope === 'rising') {
        return {
          status: 'needs_work',
          advice: 'Thanh 4 (51): Lỗi phổ biến của người Việt là đọc thành dấu sắc (đi lên). Thanh 4 phải rơi dứt khoát từ 5 xuống 1!'
        };
      }
      if (actualSlope === 'flat') {
        return {
          status: 'needs_work',
          advice: 'Thanh 4 (51): Chưa đủ độ dốc chúc xuống. Hãy dứt khoát nhấn mạnh từ cao xuống thấp.'
        };
      }
      return {
        status: 'fair',
        advice: 'Thanh 4 (51): Hướng rơi tốt, có thể hạ giọng dứt khoát hơn một chút.'
      };

    default:
      return {
        status: 'good',
        advice: 'Thanh nhẹ: phát âm ngắn, nhẹ và tự nhiên.'
      };
  }
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

  // Convert voiced frames to Chao 5-scale
  const userChaoPitches = voicedFrames.map((f) => frequencyToChaoScale(f.frequency, medianHz));

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
    // DTW distance on a 1-5 scale typically ranges 0.0 (exact) to 3.0 (opposite).
    // Convert to percentage score: 0 dist = 100%, 1.5 dist = 50%, >= 3.0 dist = 0%
    const rawScore = Math.max(0, Math.min(100, Math.round(100 - (distance / 2.0) * 80)));

    const slope = evaluateSlope(userSlice);
    const advice = getTonePedagogicalAdvice(sylInfo.actualTone, slope, rawScore);

    breakdown.push({
      syllableIndex: s,
      char: sylInfo.char,
      syllable: sylInfo.syllable,
      tone: sylInfo.actualTone,
      rawTone: sylInfo.rawTone,
      sandhiApplied: sylInfo.sandhiApplied,
      score: rawScore,
      slope,
      status: advice.status,
      advice: advice.advice
    });

    totalScoreSum += rawScore;
  }

  const overallPitchScore = Math.round(totalScoreSum / Math.max(1, numSyllables));
  let stars = 1;
  if (overallPitchScore >= 85) stars = 3;
  else if (overallPitchScore >= 65) stars = 2;

  return {
    valid: true,
    score: overallPitchScore,
    stars,
    medianHz: Math.round(medianHz),
    userChaoPitches,
    toneBreakdown: breakdown,
    message: overallPitchScore >= 80 ? 'Rất tuyệt vời! Phát âm chuẩn âm điệu.' :
             overallPitchScore >= 60 ? 'Khá tốt! Chú ý một vài điểm thanh điệu bên dưới.' :
             'Cần cải thiện độ dốc thanh điệu để tự nhiên hơn.'
  };
}
