// src/islands/ExamState.js
// Centralized Preact Signals store for the 3-Phase HSK 3.0 CBT Simulator.

import { signal, computed } from '@preact/signals';
import { SECTION_SEQUENCE, DEFAULT_SECTION_DURATIONS_SECONDS } from './ExamConstants.js';

export const examData = signal(null);
export const sessionStatus = signal('idle'); // 'idle' | 'active' | 'submitted'
export const strictMode = signal(true);
export const activeSection = signal('listening');
export const sectionTimeLeft = signal(DEFAULT_SECTION_DURATIONS_SECONDS.listening);
export const currentQuestionIdx = signal(0);
export const answers = signal({});
export const flagged = signal({});
export const sectionNotice = signal('');

export const activeSectionObj = computed(() => {
  const data = examData.value;
  if (!data) return null;
  return data.sections?.[activeSection.value] || null;
});

export const activeQuestions = computed(() => activeSectionObj.value?.questions || []);

export const activeQuestion = computed(
  () => activeQuestions.value[currentQuestionIdx.value] || null
);

/**
 * Initialize a new CBT exam session from a NormalizedExam payload.
 * @param {import('./ExamSchemaAdapter.js').NormalizedExam} normalizedExam
 * @param {boolean} [isStrict]
 */
export function startExamSession(normalizedExam, isStrict = true) {
  const firstSection = normalizedExam.sectionOrder?.[0] || SECTION_SEQUENCE[0];
  examData.value = normalizedExam;
  strictMode.value = Boolean(isStrict);
  activeSection.value = firstSection;
  sectionTimeLeft.value =
    normalizedExam.sections?.[firstSection]?.durationSeconds ||
    DEFAULT_SECTION_DURATIONS_SECONDS[firstSection];
  currentQuestionIdx.value = 0;
  answers.value = {};
  flagged.value = {};
  sectionNotice.value = '';
  sessionStatus.value = 'active';
}

/**
 * Set user answer for a question ID.
 * @param {string} questionId
 * @param {any} value
 */
export function setQuestionAnswer(questionId, value) {
  if (sessionStatus.value !== 'active') return;
  answers.value = { ...answers.value, [questionId]: value };
}

/**
 * Toggle flag status for a question ID.
 * @param {string} questionId
 */
export function toggleQuestionFlag(questionId) {
  if (sessionStatus.value !== 'active' || !questionId) return;
  flagged.value = { ...flagged.value, [questionId]: !flagged.value[questionId] };
}

/**
 * Move to next question within the current section (bounded).
 */
export function goToNextQuestion() {
  const total = activeQuestions.value.length;
  if (currentQuestionIdx.value + 1 < total) {
    currentQuestionIdx.value += 1;
  }
}

/**
 * Move to previous question within the current section (bounded).
 */
export function goToPrevQuestion() {
  if (currentQuestionIdx.value > 0) {
    currentQuestionIdx.value -= 1;
  }
}

/**
 * Advance to the next section in `sectionOrder`, or submit if at the final section.
 * @returns {'advanced' | 'submitted'}
 */
export function advanceToNextSection() {
  const data = examData.value;
  const order = data?.sectionOrder || SECTION_SEQUENCE;
  const currentIdx = order.indexOf(activeSection.value);

  if (currentIdx >= 0 && currentIdx + 1 < order.length) {
    const nextSec = order[currentIdx + 1];
    activeSection.value = nextSec;
    sectionTimeLeft.value =
      data?.sections?.[nextSec]?.durationSeconds ||
      DEFAULT_SECTION_DURATIONS_SECONDS[nextSec];
    currentQuestionIdx.value = 0;
    return 'advanced';
  }

  sessionStatus.value = 'submitted';
  return 'submitted';
}

/**
 * Decrement the active section timer by 1 second; auto-advances on 0.
 * @returns {'tick' | 'advanced' | 'submitted' | 'idle'}
 */
export function tickSectionTimer() {
  if (sessionStatus.value !== 'active') return 'idle';
  if (sectionTimeLeft.value > 1) {
    sectionTimeLeft.value -= 1;
    return 'tick';
  }
  sectionTimeLeft.value = 0;
  return advanceToNextSection();
}

export function submitExamSession() {
  sessionStatus.value = 'submitted';
}
