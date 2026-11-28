// Tests for src/islands/HanVietSyllables.js (per-character Hanzi / pinyin / Hán Việt alignment).
// Run: node tools/test_hanviet_syllables.mjs
import assert from 'node:assert/strict';
import { buildSyllableColumns } from '../src/islands/HanVietSyllables.js';

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

console.log(`\n${passed} tests passed`);
