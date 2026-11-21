// Tests for src/islands/pinyinTones.js (tone detection and tone-colored pinyin markup).
// Run: node tools/test_pinyin_tones.mjs
import assert from 'node:assert/strict';
import { toneOfSyllable, splitPinyinSyllables, colorizePinyin, colorizePinyinHtml } from '../src/islands/pinyinTones.js';

let passed = 0;
function test(name, fn) {
  fn();
  passed += 1;
  console.log('ok -', name);
}

const tones = (text) => splitPinyinSyllables(text).map((s) => `${s}${toneOfSyllable(s)}`).join(' ');

test('tone marks map to tones 1-4 and unmarked syllables to neutral', () => {
  assert.equal(toneOfSyllable('mā'), 1);
  assert.equal(toneOfSyllable('má'), 2);
  assert.equal(toneOfSyllable('mǎ'), 3);
  assert.equal(toneOfSyllable('mà'), 4);
  assert.equal(toneOfSyllable('ma'), 5);
  assert.equal(toneOfSyllable('lǜ'), 4);
  assert.equal(toneOfSyllable('Zhōng'), 1);
});

test('multi-syllable words split at the right boundaries', () => {
  assert.equal(tones('bàba'), 'bà4 ba5');
  assert.equal(tones('xiānsheng'), 'xiān1 sheng5');
  assert.equal(tones('kěnéng'), 'kě3 néng2');
  assert.equal(tones('píngguǒ'), 'píng2 guǒ3');
  assert.equal(tones("Tiān'ānmén"), 'Tiān1 ān1 mén2');
  assert.equal(tones("nǚ'ér"), 'nǚ3 ér2');
  assert.equal(tones('yìdiǎnr'), 'yì4 diǎnr3');
});

test('colorizePinyin keeps the tone marks and wraps each syllable', () => {
  assert.equal(colorizePinyin('tài'), '<span class="tone tone-4">tài</span>');
  assert.equal(
    colorizePinyin('bàba'),
    '<span class="tone tone-4">bà</span><span class="tone tone-5">ba</span>'
  );
});

test('colorizePinyinHtml leaves existing tags intact', () => {
  assert.equal(
    colorizePinyinHtml('Zhège <u>tài</u> guì le.'),
    '<span class="tone tone-4">Zhè</span><span class="tone tone-5">ge</span> <u><span class="tone tone-4">tài</span></u> '
      + '<span class="tone tone-4">guì</span> <span class="tone tone-5">le</span>.'
  );
});

test('text is escaped', () => {
  assert.equal(colorizePinyin('a<b'), '<span class="tone tone-5">a</span>&lt;b');
});

console.log(`\n${passed} pinyin tone tests passed`);
