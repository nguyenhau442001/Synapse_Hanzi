// Reactive study & navigation state store (single source of truth via Preact Signals).
// Mirrors the HeaderStore.js pattern so islands can subscribe reactively instead of
// mutating or polling raw window.* globals.
import { signal, computed } from '@preact/signals';

/**
 * @typedef {'review'|'browse'} StudyMode
 * @typedef {'all'|'due'|'new'|'learning'|'mastered'|'weak'} CardFilter
 *
 * @typedef {Object} StudyState
 * @property {string|null} currentLevel
 * @property {string} primaryTab
 * @property {'level'|'topic'} vocabSubTab
 * @property {StudyMode} studyMode
 * @property {CardFilter} currentFilter
 * @property {boolean} showPinyin
 * @property {boolean} showHanViet
 * @property {boolean} showIllustration
 * @property {number} srsRetention
 * @property {Object|null} activeStudyWord
 */

function readBooleanPref(key, fallback) {
  try {
    if (typeof localStorage === 'undefined') return fallback;
    const saved = localStorage.getItem(key);
    return saved !== null ? saved === 'true' : fallback;
  } catch {
    return fallback;
  }
}

/** @type {import('@preact/signals').Signal<StudyState>} */
export const studyState = signal({
  currentLevel: null,
  primaryTab: 'vocab',
  vocabSubTab: 'level',
  studyMode: 'review',
  currentFilter: 'all',
  showPinyin: true,
  showHanViet: readBooleanPref('hsk_show_hanviet', true),
  showIllustration: readBooleanPref('hsk_show_illustrations_v2', true),
  srsRetention: 0.9,
  activeStudyWord: null,
});

export const activeStudyTab = computed(() => studyState.value.primaryTab);
export const activeStudyLevel = computed(() => studyState.value.currentLevel);

/** @param {Partial<StudyState>} patch */
export function setStudyState(patch) {
  studyState.value = { ...studyState.value, ...patch };
  if (typeof window !== 'undefined') {
    for (const key of Object.keys(patch)) {
      window[key] = studyState.value[key];
    }
  }
}

/** @returns {StudyState} */
export function getStudyState() {
  return studyState.value;
}
