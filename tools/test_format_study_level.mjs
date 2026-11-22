// Test formatStudyLevelLabel for flashcard view
import assert from 'node:assert/strict';
import { formatStudyLevelLabel } from '../src/islands/AppUtils.js';

console.log('Testing formatStudyLevelLabel...');

// HSK 3.0 level labels should omit "3.0" and dash in study/flashcard view
assert.equal(formatStudyLevelLabel('HSK 3.0 – 1'), 'HSK 1');
assert.equal(formatStudyLevelLabel('HSK 3.0 – 2'), 'HSK 2');
assert.equal(formatStudyLevelLabel('HSK 3.0 - 2'), 'HSK 2');
assert.equal(formatStudyLevelLabel('HSK 3.0 – 6'), 'HSK 6');
assert.equal(formatStudyLevelLabel('HSK 3.0 – 7'), 'HSK 7');
assert.equal(formatStudyLevelLabel('HSK 3.0 – 8'), 'HSK 8');
assert.equal(formatStudyLevelLabel('HSK 3.0 – 9'), 'HSK 9');

// HSK 2.0 or other labels should remain untouched
assert.equal(formatStudyLevelLabel('HSK1'), 'HSK1');
assert.equal(formatStudyLevelLabel('HSK2'), 'HSK2');
assert.equal(formatStudyLevelLabel('Công nghệ thông tin'), 'Công nghệ thông tin');
assert.equal(formatStudyLevelLabel(''), '');
assert.equal(formatStudyLevelLabel(null), '');

console.log('✅ All formatStudyLevelLabel tests passed successfully!');
