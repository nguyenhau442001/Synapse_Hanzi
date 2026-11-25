import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

const audioMapPath = path.join(REPO_ROOT, 'database', 'prebuilt_audio', 'hanzi_audio_map.json');
assert.ok(fs.existsSync(audioMapPath), 'hanzi_audio_map.json must exist');

const audioMap = JSON.parse(fs.readFileSync(audioMapPath, 'utf8'));

// Test: Target sentence from user query
const targetSentence = '夜空中有无数星星。';
assert.ok(targetSentence in audioMap, `Expected "${targetSentence}" in hanzi_audio_map.json`);
assert.ok(audioMap[targetSentence].includes('database/prebuilt_audio/'), 'Audio path should point to prebuilt audio');

// Test: Target sentence without punctuation
const targetNoPunct = '夜空中有无数星星';
assert.ok(targetNoPunct in audioMap, `Expected unpunctuated "${targetNoPunct}" in hanzi_audio_map.json`);

// Test: Target answer word
assert.ok('无数' in audioMap, 'Expected "无数" in hanzi_audio_map.json');

// Test: Polyphone keys (hanzi|pinyin) resolve to distinct audio files
assert.ok('好|hǎo' in audioMap, 'Expected "好|hǎo" in hanzi_audio_map.json');
assert.ok('好|hào' in audioMap, 'Expected "好|hào" in hanzi_audio_map.json');
assert.notEqual(audioMap['好|hǎo'], audioMap['好|hào'], 'Polyphone 好|hǎo and 好|hào must map to different audio files');

console.log('✅ All sentence audio resolution tests passed successfully!');
