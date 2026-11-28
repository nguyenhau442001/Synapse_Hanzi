/**
 * CtcAligner.js
 * CTC Viterbi forced alignment and Goodness-of-Pronunciation (GOP) per syllable.
 *
 * GOP for a syllable = mean over its aligned frames of
 *   log P(target token | frame) - max_v log P(v | frame)
 * It is <= 0; 0 means the target was the network's top choice on every frame.
 */

export const CTC_BLANK_ID = 0;
/** GOP assigned to a syllable that received no frames (deleted / unspoken). */
export const GOP_MISSING = -20;
const NEG_INF = -1e30;

/**
 * @typedef {Object} SyllableAlignment
 * @property {number} gop         Mean log-posterior margin of the target (<= 0)
 * @property {number} startFrame  First aligned frame (-1 when missing)
 * @property {number} endFrame    Last aligned frame (-1 when missing)
 * @property {number} numFrames   Frames emitting this syllable's tokens
 */

/**
 * Force-aligns per-syllable token groups to frame-level CTC log-probabilities.
 *
 * @param {Float32Array} logProbs Flat [numFrames * vocabSize] log-softmax output
 * @param {number} numFrames
 * @param {number} vocabSize
 * @param {number[][]} tokenGroups Token ids per syllable, e.g. [[12, 40], [7]]
 * @returns {SyllableAlignment[]}
 */
export function alignSyllables(logProbs, numFrames, vocabSize, tokenGroups) {
  const target = [];
  const owner = [];
  tokenGroups.forEach((group, syl) => {
    for (const id of group) {
      target.push(id);
      owner.push(syl);
    }
  });

  const empty = tokenGroups.map(() => ({ gop: GOP_MISSING, startFrame: -1, endFrame: -1, numFrames: 0 }));
  if (!target.length || numFrames <= 0) return empty;

  // Extended label sequence: blank, t1, blank, t2, ..., blank
  const ext = [CTC_BLANK_ID];
  for (const id of target) ext.push(id, CTC_BLANK_ID);
  const S = ext.length;
  const lp = (t, v) => logProbs[t * vocabSize + v];

  let prev = new Float64Array(S).fill(NEG_INF);
  let cur = new Float64Array(S);
  const back = new Int32Array(numFrames * S);
  prev[0] = lp(0, ext[0]);
  if (S > 1) prev[1] = lp(0, ext[1]);

  for (let t = 1; t < numFrames; t++) {
    for (let s = 0; s < S; s++) {
      let best = prev[s];
      let src = s;
      if (s >= 1 && prev[s - 1] > best) {
        best = prev[s - 1];
        src = s - 1;
      }
      // Skip over a blank only between two different labels.
      if (s >= 2 && ext[s] !== CTC_BLANK_ID && ext[s] !== ext[s - 2] && prev[s - 2] > best) {
        best = prev[s - 2];
        src = s - 2;
      }
      cur[s] = best + lp(t, ext[s]);
      back[t * S + s] = src;
    }
    [prev, cur] = [cur, prev];
  }

  // A valid path ends on the last label or the trailing blank.
  let s = S >= 2 && prev[S - 2] > prev[S - 1] ? S - 2 : S - 1;
  if (prev[s] <= NEG_INF / 2) return empty; // Too few frames for the target sequence

  const path = new Int32Array(numFrames);
  for (let t = numFrames - 1; t >= 0; t--) {
    path[t] = s;
    if (t > 0) s = back[t * S + s];
  }

  const sums = new Float64Array(tokenGroups.length);
  const result = tokenGroups.map(() => ({ gop: GOP_MISSING, startFrame: -1, endFrame: -1, numFrames: 0 }));
  for (let t = 0; t < numFrames; t++) {
    const label = ext[path[t]];
    if (label === CTC_BLANK_ID) continue;
    let frameMax = NEG_INF;
    for (let v = 0; v < vocabSize; v++) frameMax = Math.max(frameMax, lp(t, v));
    const syl = owner[(path[t] - 1) / 2];
    const r = result[syl];
    sums[syl] += lp(t, label) - frameMax;
    if (r.startFrame < 0) r.startFrame = t;
    r.endFrame = t;
    r.numFrames++;
  }
  result.forEach((r, i) => {
    if (r.numFrames) r.gop = sums[i] / r.numFrames;
  });
  return result;
}

/**
 * Greedy CTC decode (collapse repeats, drop blanks).
 * @returns {number[]} Token ids
 */
export function greedyDecode(logProbs, numFrames, vocabSize) {
  const ids = [];
  let prevId = CTC_BLANK_ID;
  for (let t = 0; t < numFrames; t++) {
    let best = 0;
    let bestVal = NEG_INF;
    for (let v = 0; v < vocabSize; v++) {
      const val = logProbs[t * vocabSize + v];
      if (val > bestVal) {
        bestVal = val;
        best = v;
      }
    }
    if (best !== prevId && best !== CTC_BLANK_ID) ids.push(best);
    prevId = best;
  }
  return ids;
}
