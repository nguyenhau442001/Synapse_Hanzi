import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

const read = (p) => JSON.parse(readFileSync(new URL(p, import.meta.url), 'utf-8'));
const BYTE_ALPHABET_SIZE = 256;

console.log('Testing CAPT token bank...');
const bank = read('../database/speech/capt_token_bank.json');
const { vocabSize } = bank.model;

const tableSize = bank.byteTableRanges.reduce((n, [lo, hi]) => n + hi - lo + 1, 0);
assert.equal(tableSize, BYTE_ALPHABET_SIZE);
console.log('✅ PASSED: byte table covers all 256 bytes');

const inRange = (ids) => ids.length > 0 && ids.every((id) => Number.isInteger(id) && id > 0 && id < vocabSize);
assert(Object.values(bank.chars).every(inRange), 'char token ids in range');
assert(Object.values(bank.syllables).every((s) => inRange(s.t) && bank.chars[s.c]), 'syllable reps valid');
console.log('✅ PASSED: all token ids are valid non-blank ids');

const vocabDir = new URL('../database/vocabs/', import.meta.url);
const missing = new Set();
for (const f of readdirSync(vocabDir).filter((n) => /^hsk\d_vocabularies\.json$/.test(n))) {
  for (const item of read(`../database/vocabs/${f}`)) {
    for (const c of item.hanzi || '') if (/[一-鿿]/.test(c) && !bank.chars[c]) missing.add(c);
  }
}
assert.equal(missing.size, 0, `Chars missing from bank: ${[...missing].join('')} — rerun tools/build_capt_tokens.py`);
console.log('✅ PASSED: every HSK vocabulary character has token ids');

console.log('\nAll CAPT token bank tests passed successfully!');
