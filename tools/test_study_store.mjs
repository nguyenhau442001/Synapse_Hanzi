import assert from 'node:assert/strict';
import {
  studyState,
  activeStudyTab,
  activeStudyLevel,
  setStudyState,
  getStudyState,
} from '../src/islands/StudyStore.js';

// Initial defaults
assert.equal(getStudyState().primaryTab, 'vocab');
assert.equal(getStudyState().vocabSubTab, 'level');
assert.equal(getStudyState().studyMode, 'review');
assert.equal(getStudyState().currentFilter, 'all');
assert.equal(getStudyState().currentLevel, null);
assert.equal(activeStudyTab.value, 'vocab');
assert.equal(activeStudyLevel.value, null);

// Partial updates propagate to signal and computed values
setStudyState({ currentLevel: 'hsk3', primaryTab: 'listening', studyMode: 'browse' });
assert.equal(studyState.value.currentLevel, 'hsk3');
assert.equal(activeStudyLevel.value, 'hsk3');
assert.equal(activeStudyTab.value, 'listening');
assert.equal(studyState.value.studyMode, 'browse');
assert.equal(studyState.value.currentFilter, 'all');

// Reset back to defaults
setStudyState({ currentLevel: null, primaryTab: 'vocab', studyMode: 'review' });
assert.equal(activeStudyTab.value, 'vocab');
assert.equal(activeStudyLevel.value, null);

console.log('✅ StudyStore signal tests passed!');
