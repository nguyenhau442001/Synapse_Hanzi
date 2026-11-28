// Tests for src/islands/HanVietSyllables.js (per-character Hanzi / pinyin / Hán Việt alignment).
// Run: node tools/test_hanviet_syllables.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildSyllableColumns, attachGlosses } from '../src/islands/HanVietSyllables.js';

let passed = 0;
function test(name, fn) {
  fn();
  passed += 1;
  console.log('ok -', name);
}

test('aligns each character with its pinyin syllable and Hán Việt reading', () => {
  assert.deepEqual(buildSyllableColumns('大自然', 'dàzìrán', 'Đại Tự Nhiên'), [
    { char: '大', pinyin: 'dà', hanviet: 'Đại' },
    { char: '自', pinyin: 'zì', hanviet: 'Tự' },
    { char: '然', pinyin: 'rán', hanviet: 'Nhiên' },
  ]);
});

test('accepts spaced pinyin and ignores clarifiers', () => {
  const cols = buildSyllableColumns('餐厅（饭馆）', 'cān tīng', 'Xan Sảnh (Phạn Quán)');
  assert.deepEqual(cols.map((c) => c.char + c.pinyin + c.hanviet), ['餐cānXan', '厅tīngSảnh']);
});

test('returns null for single characters', () => {
  assert.equal(buildSyllableColumns('按', 'àn', 'Án'), null);
});

test('returns null when counts do not line up (erhua, missing reading)', () => {
  assert.equal(buildSyllableColumns('一会儿', 'yíhuìr', 'Nhất Hội Nhi'), null);
  assert.equal(buildSyllableColumns('大自然', 'dàzìrán', 'Đại Tự'), null);
  assert.equal(buildSyllableColumns('大自然', 'dàzìrán', ''), null);
});

test('attaches glosses only where the map has one', () => {
  const cols = attachGlosses(buildSyllableColumns('大自然', 'dàzìrán', 'Đại Tự Nhiên'), { 大: 'to, lớn', 然: 'như thế' });
  assert.deepEqual(cols.map((c) => c.gloss), ['to, lớn', undefined, 'như thế']);
  assert.equal(attachGlosses(null, {}), null);
});

test('char_glosses.json is a flat map of single Hanzi to short non-empty glosses', () => {
  const map = JSON.parse(readFileSync(new URL('../database/radicals/char_glosses.json', import.meta.url), 'utf8'));
  const entries = Object.entries(map);
  assert.ok(entries.length > 2000);
  for (const [ch, gloss] of entries) {
    assert.equal([...ch].length, 1, ch);
    assert.ok(typeof gloss === 'string' && gloss.trim().length > 0 && gloss.length <= 24, ch);
  }
});

console.log(`\n${passed} tests passed`);
