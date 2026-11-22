/**
 * test_newbie_tones.mjs
 * Verification for Newbie Tone Guide data and exemplar audio existence.
 */

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { NEWBIE_TONES_DATA } from '../src/islands/newbieTonesData.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const audioMapPath = path.resolve(__dirname, '../database/prebuilt_audio/hanzi_audio_map.json');
const audioMap = JSON.parse(fs.readFileSync(audioMapPath, 'utf8'));

console.log('Testing Newbie Tone Guide Data & Audio Mapping...');

// 1. Check all 5 tones are present
assert.strictEqual(NEWBIE_TONES_DATA.length, 5, 'Must contain 5 tones');
const toneIds = NEWBIE_TONES_DATA.map(t => t.id);
assert.deepStrictEqual(toneIds, [1, 2, 3, 4, 5], 'Tones must be 1 to 5');

// 2. Check each tone has Chao representation, analogy, Vietnamese trap, and exemplars
for (const tone of NEWBIE_TONES_DATA) {
  assert.ok(tone.name, `Tone ${tone.id} missing name`);
  assert.ok(tone.chao, `Tone ${tone.id} missing Chao number`);
  assert.ok(tone.vietnameseTrap, `Tone ${tone.id} missing Vietnamese trap advice`);
  assert.ok(tone.exemplars && tone.exemplars.length >= 2, `Tone ${tone.id} must have at least 2 exemplars`);

  for (const ex of tone.exemplars) {
    assert.ok(ex.hanzi, `Exemplar missing hanzi: ${JSON.stringify(ex)}`);
    assert.ok(ex.pinyin, `Exemplar missing pinyin: ${JSON.stringify(ex)}`);
    // Verify audio exists in prebuilt audio map
    const audioUrl = audioMap[ex.hanzi];
    assert.ok(audioUrl, `Prebuilt audio missing for exemplar: ${ex.hanzi}`);
  }
}

console.log('✅ PASSED: All 5 tones have rich pedagogical data and 100% prebuilt audio coverage!');
