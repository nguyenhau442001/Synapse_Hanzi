// Tests for src/islands/MnemonicStore.js (personal "Mẹo nhớ" notes and the auto hint).
// Run: node tools/test_mnemonic_store.mjs
import assert from 'node:assert/strict';
import {
  MNEMONICS_KEY,
  MNEMONIC_MAX_LENGTH,
  loadMnemonics,
  getMnemonic,
  saveMnemonic,
  buildMnemonicHint,
} from '../src/islands/MnemonicStore.js';
import { resolveSyncKey } from '../src/islands/SyncRegistry.js';

let passed = 0;
function test(name, fn) {
  fn();
  passed += 1;
  console.log('ok -', name);
}

function memoryStorage() {
  const data = new Map();
  return {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => data.set(k, String(v)),
  };
}

test('save, read, overwrite and delete (tombstone) a note', () => {
  const s = memoryStorage();
  assert.equal(getMnemonic(s, '大自然'), '');
  saveMnemonic(s, '大自然', '  Tự nó   như vậy ', new Date('2026-11-28T00:00:00Z'));
  assert.equal(getMnemonic(s, '大自然'), 'Tự nó như vậy');
  saveMnemonic(s, '大自然', 'Cái tự nhiên to lớn', new Date('2026-11-29T00:00:00Z'));
  assert.equal(loadMnemonics(s).length, 1);
  assert.equal(getMnemonic(s, '大自然'), 'Cái tự nhiên to lớn');
  saveMnemonic(s, '大自然', '   ');
  const [entry] = loadMnemonics(s);
  assert.equal(entry.text, '');
  assert.ok(entry.updatedAt && entry.timestamp === entry.updatedAt);
});

test('caps note length and survives corrupt storage', () => {
  const s = memoryStorage();
  assert.equal(saveMnemonic(s, '啊', 'x'.repeat(MNEMONIC_MAX_LENGTH + 50)).length, MNEMONIC_MAX_LENGTH);
  s.setItem(MNEMONICS_KEY, '{oops');
  assert.deepEqual(loadMnemonics(s), []);
});

test('hint joins first gloss senses and the first meaning', () => {
  const cols = [
    { char: '十', gloss: 'mười' }, { char: '字', gloss: 'chữ' },
    { char: '路', gloss: 'đường' }, { char: '口', gloss: 'miệng' },
  ];
  assert.equal(buildMnemonicHint(cols, 'ngã tư, giao lộ'), '十 mười + 字 chữ + 路 đường + 口 miệng → ngã tư');
  assert.equal(buildMnemonicHint([{ char: '餐', gloss: 'bữa ăn' }, { char: '厅', gloss: 'sảnh; phòng' }], ''), '餐 bữa ăn + 厅 sảnh');
});

test('no hint when any character lacks a gloss', () => {
  assert.equal(buildMnemonicHint([{ char: '蝴' }, { char: '蝶', gloss: 'bướm' }], 'con bướm'), '');
  assert.equal(buildMnemonicHint(null, 'x'), '');
});

test('notes are synced with the id_log merge', () => {
  const resolved = resolveSyncKey(MNEMONICS_KEY);
  assert.ok(resolved);
  assert.equal(resolved.rule.merge, 'id_log');
});

console.log(`\n${passed} tests passed`);
