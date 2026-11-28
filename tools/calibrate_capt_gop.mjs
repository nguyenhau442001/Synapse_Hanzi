/**
 * Calibrates and validates the zipformer CTC pronunciation scorer end to end
 * (ffmpeg decode -> KaldiFbank.js -> onnxruntime-web -> CaptGopScorer.js) on prebuilt
 * Xiaoxiao clips. Correct audio vs. a minimal-pair target simulates a learner error.
 *
 * Usage: node tools/calibrate_capt_gop.mjs [numWords]
 * Requires tools/.capt_model_cache/model.int8.onnx (run tools/build_capt_tokens.py) and ffmpeg.
 */
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import * as ort from 'onnxruntime-web';
import { prepareModelInput, MODEL_IO } from '../src/islands/ZipformerCaptEngine.js';
import { assessSyllables, competitorSyllables, gopToScore, COMPONENT_PASS_SCORE } from '../src/islands/CaptGopScorer.js';
import { splitPinyinSyllables } from '../src/islands/pinyinTones.js';

const SAMPLE_RATE = 16000;
const DEFAULT_WORDS = 150;
const RANDOM_SEED = 20261128;
const PERCENTILES = [5, 10, 50, 90, 95];
const root = new URL('../', import.meta.url);
const read = (p) => JSON.parse(readFileSync(new URL(p, root), 'utf-8'));

let seed = RANDOM_SEED;
const rand = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);

function decode(path) {
  const raw = execFileSync('ffmpeg', ['-v', 'quiet', '-i', path, '-ac', '1', '-ar', String(SAMPLE_RATE), '-f', 'f32le', '-']);
  return new Float32Array(raw.buffer, raw.byteOffset, raw.byteLength / 4);
}

const pct = (arr, p) => {
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))];
};

const bank = read('database/speech/capt_token_bank.json');
const audioMap = read('database/prebuilt_audio/hanzi_audio_map.json');
const words = [1, 2, 3, 4, 5, 6].flatMap((l) => read(`database/vocabs/hsk${l}_vocabularies.json`))
  .filter((w) => audioMap[w.hanzi] && [...w.hanzi].length <= 3 && /^[一-鿿]+$/.test(w.hanzi));

ort.env.wasm.numThreads = 1;
const session = await ort.InferenceSession.create(new URL('tools/.capt_model_cache/model.int8.onnx', root).pathname);

const n = Number(process.argv[2]) || DEFAULT_WORDS;
const correctGop = [];
const wrongGop = [];
let falseAlarms = 0, components = 0, errorsCaught = 0, errorsTried = 0;

for (let k = 0; k < n; k++) {
  const w = words[Math.floor(rand() * words.length)];
  const syl = splitPinyinSyllables(w.pinyin);
  const pcm = decode(new URL(audioMap[w.hanzi].split('?')[0], root).pathname);
  const { x, xLens } = prepareModelInput(pcm);
  const out = await session.run({ [MODEL_IO.INPUT]: new ort.Tensor('float32', x.data, x.dims), [MODEL_IO.INPUT_LENS]: new ort.Tensor('int64', xLens, [1]) });
  const lp = out[MODEL_IO.OUTPUT];
  const [, T, V] = lp.dims;

  const res = assessSyllables(lp.data, T, V, w.hanzi, syl, bank);
  if (!res) continue;
  for (const r of res) {
    correctGop.push(r.gop);
    for (const c of [r.initial, r.final]) {
      if (c.target === 'none') continue;
      components++;
      if (!c.passed) falseAlarms++;
    }
  }

  // Simulated learner error: the audio says the word, the target asks for a minimal pair.
  const i = Math.floor(rand() * syl.length);
  const rivals = competitorSyllables(syl[i], bank);
  const pool = [...rivals.initial, ...rivals.final];
  if (!pool.length) continue;
  const rival = pool[Math.floor(rand() * pool.length)];
  const rep = bank.syllables[rival.key];
  const wrongHanzi = [...w.hanzi].map((c, j) => (j === i ? rep.c : c)).join('');
  const wrongSyl = syl.map((s, j) => (j === i ? rival.key : s));
  const wrong = assessSyllables(lp.data, T, V, wrongHanzi, wrongSyl.map((s) => s.replace(/\d$/, '')), bank);
  if (!wrong) continue;
  wrongGop.push(wrong[i].gop);
  errorsTried++;
  if (gopToScore(wrong[i].gop) < COMPONENT_PASS_SCORE) errorsCaught++;
}

console.log(`words=${n} syllables=${correctGop.length}`);
console.log('correct GOP pct', PERCENTILES.map((p) => `p${p}=${pct(correctGop, p).toFixed(2)}`).join(' '));
console.log('wrong   GOP pct', PERCENTILES.map((p) => `p${p}=${pct(wrongGop, p).toFixed(2)}`).join(' '));
let wins = 0;
for (const a of correctGop) for (const b of wrongGop) wins += a > b ? 1 : 0;
console.log(`AUC=${(wins / (correctGop.length * wrongGop.length)).toFixed(3)}`);
console.log(`false alarms on correct audio: ${falseAlarms}/${components} (${((100 * falseAlarms) / components).toFixed(1)}%)`);
console.log(`minimal-pair errors caught: ${errorsCaught}/${errorsTried} (${((100 * errorsCaught) / errorsTried).toFixed(1)}%)`);
