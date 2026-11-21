// Tests for src/islands/writingInk.js against real stroke data (database/strokes/level1.json).
// Run: node tools/test_writing_ink.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  matchStroke, resample, brushPath, layoutWorksheet, charactersOfWords, sampleWidth, toDataPoint,
} from '../src/islands/writingInk.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const bundle = JSON.parse(readFileSync(join(root, 'database/strokes/level1.json'), 'utf8'));
let passed = 0;
function test(name, fn) {
  fn();
  passed += 1;
  console.log('ok -', name);
}

const jitter = (points, amount, seed = 1) => {
  let s = seed;
  const rnd = () => { s = (s * 16807) % 2147483647; return (s / 2147483647 - 0.5) * 2 * amount; };
  return resample(points, 30).map(([x, y]) => [x + rnd(), y + rnd()]);
};

test('every median of HSK 1 characters matches itself', () => {
  let strokes = 0;
  for (const [ch, data] of Object.entries(bundle.chars)) {
    data.m.forEach((median, i) => {
      assert.ok(matchStroke(median, median).ok, `${ch} stroke ${i + 1}`);
      strokes += 1;
    });
  }
  assert.ok(strokes > 1000);
});

test('a hand-drawn imitation with jitter is accepted', () => {
  const big = bundle.chars['大'];
  big.m.forEach((median, i) => assert.ok(matchStroke(jitter(median, 25, i + 3), median).ok, `大 stroke ${i + 1}`));
});

test('a stroke drawn backwards is rejected', () => {
  const horizontal = bundle.chars['大'].m[0];
  const res = matchStroke(horizontal.slice().reverse(), horizontal);
  assert.equal(res.ok, false);
});

test('a stroke drawn far from its place is rejected', () => {
  const median = bundle.chars['大'].m[0];
  const res = matchStroke(median.map(([x, y]) => [x, y - 350]), median);
  assert.equal(res.ok, false);
  assert.equal(res.reason, 'Nét lệch khỏi vị trí');
});

test('drawing the wrong stroke of 大 is rejected', () => {
  const m = bundle.chars['大'].m;
  assert.equal(matchStroke(m[1], m[0]).ok, false, 'phẩy instead of ngang');
  assert.equal(matchStroke(m[2], m[1]).ok, false, 'mác instead of phẩy');
});

test('drawing a later stroke first is reported as wrong stroke order', () => {
  const m = bundle.chars['吗'].m;
  const res = matchStroke(m[1], m[0], 1, m.slice(1));
  assert.equal(res.ok, false);
  assert.equal(res.reason, 'Sai thứ tự nét');
  assert.ok(matchStroke(m[0], m[0], 1, m.slice(1)).ok);
});

test('finger leniency accepts a sloppier stroke that a pen would fail', () => {
  const median = bundle.chars['大'].m[2];
  const sloppy = median.map(([x, y]) => [x + 115, y + 139]); // ~180 units perpendicular to the stroke
  assert.equal(matchStroke(sloppy, median, 1).ok, false);
  assert.equal(matchStroke(sloppy, median, 1.35).ok, true);
});

test('dots are graded by position, not direction', () => {
  const dot = bundle.chars['你'].m[bundle.chars['你'].m.length - 1];
  assert.ok(matchStroke(dot, dot).ok);
});

test('brush outline is a closed path with tapered tail', () => {
  const samples = resample([[100, 500], [500, 480], [900, 520]], 20).map(([x, y]) => [x, y, 1]);
  const d = brushPath(samples, true);
  assert.match(d, /^M[\d.]+ [\d.]+L/);
  assert.ok(d.endsWith('Z'));
  assert.equal(brushPath([], true), '');
  assert.match(brushPath([[10, 10, 1]], true), /a/); // single tap = round dot
});

test('pen pressure drives width; mouse/finger fall back to speed', () => {
  assert.ok(sampleWidth('pen', 1, 0) > sampleWidth('pen', 0.2, 0));
  assert.ok(sampleWidth('mouse', 0, 0) > sampleWidth('mouse', 0, 3));
  assert.ok(sampleWidth('touch', 1, 0.1) <= 1.15);
});

test('svg ↔ data coordinates flip around the 900 baseline', () => {
  assert.deepEqual(toDataPoint([100, 0]), [100, 900]);
  assert.deepEqual(toDataPoint([100, 900]), [100, 0]);
});

test('worksheet layout follows the 字帖 pattern', () => {
  const rows = layoutWorksheet({ strokeCount: 3, cols: 9, rows: 4, faded: 4, strokeRow: true });
  assert.equal(rows.length, 5);
  assert.deepEqual(rows[0].slice(0, 4).map((c) => c.kind), ['step', 'step', 'step', 'faint']);
  assert.deepEqual(rows[1].slice(0, 6).map((c) => c.kind), ['model', 'faint', 'faint', 'faint', 'faint', 'empty']);
  assert.equal(rows[2].filter((c) => c.kind === 'faint').length, 3);
  assert.ok(rows[4].every((c) => c.kind === 'empty'), 'last row is written from memory');
  rows.forEach((r) => assert.equal(r.length, 9));
  const many = layoutWorksheet({ strokeCount: 12, cols: 5, rows: 2, faded: 2, strokeRow: true });
  assert.equal(many.filter((r) => r.some((c) => c.kind === 'step')).length, 3, 'stroke steps wrap onto extra rows');
  const noSteps = layoutWorksheet({ strokeCount: 3, cols: 6, rows: 3, faded: 2, strokeRow: false });
  assert.equal(noSteps[0][0].kind, 'model');
});

test('characters of words keep first-seen order and skip non-Han', () => {
  assert.deepEqual(charactersOfWords([{ hanzi: '你好' }, { hanzi: '好的' }, { hanzi: 'A1' }]), ['你', '好', '的']);
});

console.log(`\n${passed} writing ink tests passed`);
