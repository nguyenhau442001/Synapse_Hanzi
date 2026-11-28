import assert from 'node:assert/strict';
import { alignSyllables, greedyDecode, GOP_MISSING, CTC_BLANK_ID } from '../src/islands/CtcAligner.js';

const VOCAB = 5;
const PEAK = Math.log(0.9);
const REST = Math.log(0.1 / (VOCAB - 1));

/** Builds flat log-probs where frame t peaks on topIds[t]. */
function spikes(topIds) {
  const lp = new Float32Array(topIds.length * VOCAB).fill(REST);
  topIds.forEach((id, t) => { lp[t * VOCAB + id] = PEAK; });
  return lp;
}

console.log('Testing CTC forced alignment & GOP...');

const B = CTC_BLANK_ID;
const frames = [B, B, 1, 1, B, 2, 2, B, B, B];
const lp = spikes(frames);

{
  const [a, b] = alignSyllables(lp, frames.length, VOCAB, [[1], [2]]);
  assert(Math.abs(a.gop) < 1e-6 && Math.abs(b.gop) < 1e-6, 'Spoken targets have GOP 0');
  assert.deepEqual([a.startFrame, a.endFrame, b.startFrame, b.endFrame], [2, 3, 5, 6]);
  console.log('✅ PASSED: correct syllables align to their frames with GOP 0');
}

{
  const [a, b] = alignSyllables(lp, frames.length, VOCAB, [[1], [3]]);
  assert(Math.abs(a.gop) < 1e-6);
  assert(b.gop < PEAK - REST + 1e-6 && b.gop < -2, `Mispronounced syllable must get negative GOP, got ${b.gop}`);
  console.log('✅ PASSED: substituted syllable gets a clearly negative GOP');
}

{
  const rep = [B, 1, B, 1, B];
  const [a, b] = alignSyllables(spikes(rep), rep.length, VOCAB, [[1], [1]]);
  assert(Math.abs(a.gop) < 1e-6 && Math.abs(b.gop) < 1e-6, 'Repeated token needs a blank between');
  console.log('✅ PASSED: repeated tokens are separated by a blank');
}

{
  const res = alignSyllables(spikes([B, 1]), 2, VOCAB, [[1], [2], [3]]);
  assert(res.every((r) => r.gop === GOP_MISSING), 'Too few frames → all missing');
  console.log('✅ PASSED: impossible alignments report missing syllables');
}

{
  assert.deepEqual(greedyDecode(lp, frames.length, VOCAB), [1, 2]);
  console.log('✅ PASSED: greedy decode collapses repeats and drops blanks');
}

console.log('\nAll CTC aligner tests passed successfully!');
