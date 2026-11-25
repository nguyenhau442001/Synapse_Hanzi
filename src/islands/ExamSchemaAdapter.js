// src/islands/ExamSchemaAdapter.js
// Pure normalization layer that converts both legacy CTI exam papers
// and the new HSK 3.0 static JSON / Supabase schema into a single NormalizedExam contract.

import {
  DEFAULT_EXAM_DURATION_MINUTES,
  DEFAULT_SECTION_DURATIONS_SECONDS,
  DEFAULT_WRITING_MIN_CHARS,
  SECTION_SEQUENCE,
  EXAM_UI_LABELS,
} from './ExamConstants.js';

/**
 * @typedef {'listening' | 'reading' | 'writing'} ExamSectionId
 * @typedef {'true_false' | 'mcq' | 'cloze' | 'reading_passage' | 'sentence_ordering' | 'word_reorder' | 'hanzi_essay' | 'hanzi_input'} ExamQuestionType
 *
 * @typedef {Object} NormalizedQuestion
 * @property {string} id
 * @property {number} number
 * @property {ExamSectionId} section
 * @property {number} part
 * @property {ExamQuestionType} type
 * @property {string|null} audioUrl
 * @property {string|null} audioSrc
 * @property {Object|null} segments
 * @property {string|null} statementZh
 * @property {Object|string|null} transcript
 * @property {Object|null} evidence
 * @property {Array} keyExpressions
 * @property {Array} vocabularyMatches
 * @property {string|null} passage
 * @property {string} prompt
 * @property {string[]} options
 * @property {number|string|number[]} correctAnswer
 * @property {string[]} chunks
 * @property {string[]} keywords
 * @property {number} minChars
 * @property {string[]} targetWords
 * @property {string} explanation
 *
 * @typedef {Object} ExamSection
 * @property {ExamSectionId} id
 * @property {string} label
 * @property {number} durationSeconds
 * @property {NormalizedQuestion[]} questions
 *
 * @typedef {Object} NormalizedExam
 * @property {string} examId
 * @property {string} title
 * @property {number} durationMinutes
 * @property {Record<ExamSectionId, ExamSection>} sections
 * @property {ExamSectionId[]} sectionOrder
 */

/**
 * Normalize a single question from either legacy CTI or new spec format.
 * @param {Object} raw
 * @param {ExamSectionId} sectionId
 * @param {number} index
 * @returns {NormalizedQuestion}
 */
export function normalizeQuestion(raw, sectionId, index) {
  const q = raw || {};
  const inferredType = inferQuestionType(q, sectionId);
  const options = Array.isArray(q.options) ? q.options.map(String) : [];
  const chunks = Array.isArray(q.chunks)
    ? q.chunks.map(String)
    : Array.isArray(q.words)
      ? q.words.map(String)
      : [];
  const keywords = Array.isArray(q.keywords) ? q.keywords.map(String) : [];

  const correctAnswer =
    q.answer_order !== undefined
      ? q.answer_order
      : q.answer !== undefined
        ? q.answer
        : q.correct_answer !== undefined
          ? q.correct_answer
          : null;

  const targetWords = extractTargetWords(q, keywords);

  return {
    id: String(q.id || `${sectionId}_${index + 1}`),
    number: Number.isFinite(Number(q.number)) ? Number(q.number) : index + 1,
    section: sectionId,
    part: Number.isFinite(Number(q.part)) ? Number(q.part) : 1,
    type: inferredType,
    audioUrl: q.audio_url || q.audio_clip || null,
    audioSrc: q.audio_src || q.audio_url || q.audio_clip || null,
    segments: q.segments || null,
    statementZh: q.statement_zh || (q.statement && q.statement.zh) || null,
    transcript: q.transcript || q.prompt_zh || null,
    evidence: q.evidence || null,
    keyExpressions: Array.isArray(q.key_expressions) ? q.key_expressions : [],
    vocabularyMatches: Array.isArray(q.vocabulary_matches) ? q.vocabulary_matches : [],
    passage: q.passage || q.passage_zh || null,
    prompt: String(q.question || q.prompt || q.sentence_zh || q.prompt_zh || ''),
    options,
    correctAnswer,
    chunks,
    keywords,
    minChars: Number.isFinite(Number(q.min_chars))
      ? Number(q.min_chars)
      : DEFAULT_WRITING_MIN_CHARS,
    targetWords,
    explanation: String(q.explanation || ''),
  };
}

/**
 * Infer normalized question type from raw fields and parent section.
 * @param {Object} q
 * @param {ExamSectionId} sectionId
 * @returns {ExamQuestionType}
 */
function inferQuestionType(q, sectionId) {
  if (q.type) return q.type;
  if (Array.isArray(q.chunks) && Array.isArray(q.answer_order)) return 'sentence_ordering';
  if (Array.isArray(q.words)) return 'word_reorder';
  if (Array.isArray(q.keywords) || sectionId === 'writing') return 'hanzi_essay';
  if (q.passage || q.passage_zh) return 'reading_passage';
  return 'mcq';
}

/**
 * Collect vocabulary tokens linked to a question for Reverse SRS tagging.
 * @param {Object} q
 * @param {string[]} keywords
 * @returns {string[]}
 */
function extractTargetWords(q, keywords) {
  if (Array.isArray(q.target_words) && q.target_words.length > 0) {
    return q.target_words.map(String);
  }
  if (keywords.length > 0) return keywords;
  return [];
}

/**
 * Normalize a raw section (either an Array of questions or `{ questions: [], time_minutes }`).
 * @param {Array|Object|undefined} rawSection
 * @param {ExamSectionId} sectionId
 * @returns {ExamSection}
 */
export function normalizeSection(rawSection, sectionId) {
  const isArray = Array.isArray(rawSection);
  const rawQuestions = isArray
    ? rawSection
    : Array.isArray(rawSection?.questions)
      ? rawSection.questions
      : [];

  const durationSeconds =
    !isArray && Number.isFinite(Number(rawSection?.time_minutes))
      ? Number(rawSection.time_minutes) * 60
      : DEFAULT_SECTION_DURATIONS_SECONDS[sectionId];

  return {
    id: sectionId,
    label: EXAM_UI_LABELS.sections[sectionId] || sectionId,
    durationSeconds,
    questions: rawQuestions.map((item, idx) => normalizeQuestion(item, sectionId, idx)),
  };
}

/**
 * Normalize an entire exam payload (legacy CTI or new spec JSON) into NormalizedExam.
 * @param {Object} rawExam
 * @returns {NormalizedExam}
 */
export function normalizeExamPayload(rawExam) {
  const raw = rawExam || {};
  const rawSections = raw.sections || {};

  const sections = {
    listening: normalizeSection(rawSections.listening, 'listening'),
    reading: normalizeSection(rawSections.reading, 'reading'),
    writing: normalizeSection(rawSections.writing, 'writing'),
  };

  return {
    examId: String(raw.exam_id || raw.id || 'UNKNOWN_EXAM'),
    title: String(raw.title || raw.exam_id || raw.id || 'HSK 3.0 Mock Exam'),
    durationMinutes: Number.isFinite(Number(raw.duration_minutes))
      ? Number(raw.duration_minutes)
      : Number.isFinite(Number(raw.time_minutes))
        ? Number(raw.time_minutes)
        : DEFAULT_EXAM_DURATION_MINUTES,
    sections,
    sectionOrder: SECTION_SEQUENCE.filter((id) => sections[id].questions.length > 0),
  };
}

/**
 * Grade an individual question against the user's answer.
 * Returns null for open-ended writing essays (which are exported for AI grading).
 * @param {NormalizedQuestion} question
 * @param {any} userAnswer
 * @returns {boolean|null}
 */
export function gradeQuestion(question, userAnswer) {
  if (!question) return null;
  if (question.type === 'hanzi_essay') return null;

  if (question.type === 'sentence_ordering' && Array.isArray(question.correctAnswer)) {
    if (!Array.isArray(userAnswer) || userAnswer.length !== question.correctAnswer.length) {
      return false;
    }
    return question.correctAnswer.every((val, idx) => Number(userAnswer[idx]) === Number(val));
  }

  if (question.type === 'word_reorder') {
    const assembled = Array.isArray(userAnswer) ? userAnswer.join('') : String(userAnswer || '');
    const expected = String(question.correctAnswer || '');
    const stripPunct = (s) => s.replace(/[。\.，,！!\?？\s]/g, '');
    return stripPunct(assembled) === stripPunct(expected);
  }

  if (userAnswer === undefined || userAnswer === null || userAnswer === '') return false;
  return userAnswer === question.correctAnswer || String(userAnswer) === String(question.correctAnswer);
}

/**
 * Build a structured WritingExportPayload and Markdown string for AI grading.
 * @param {NormalizedExam} exam
 * @param {Record<string, string>} answers
 * @returns {{ jsonPayload: Object, markdown: string }}
 */
export function buildWritingExport(exam, answers) {
  const writingQuestions = exam?.sections?.writing?.questions || [];
  const responses = writingQuestions.map((q) => {
    const response = String(answers?.[q.id] || '').trim();
    return {
      id: q.id,
      prompt: q.prompt,
      keywords: q.keywords,
      minChars: q.minChars,
      response,
      charCount: Array.from(response).length,
    };
  });

  const jsonPayload = {
    examId: exam?.examId || 'UNKNOWN_EXAM',
    submittedAt: new Date().toISOString(),
    responses,
  };

  const mdLines = [
    `# HSK 3.0 Writing Export — ${jsonPayload.examId}`,
    `Submitted: ${jsonPayload.submittedAt}`,
    '',
  ];
  for (const item of responses) {
    mdLines.push(`## ${item.id} (${item.charCount}/${item.minChars} chars)`);
    if (item.keywords.length > 0) {
      mdLines.push(`**Keywords:** ${item.keywords.join(', ')}`);
    }
    mdLines.push(`**Prompt:** ${item.prompt}`);
    mdLines.push('');
    mdLines.push(item.response || '*(No response)*');
    mdLines.push('');
  }

  return { jsonPayload, markdown: mdLines.join('\n') };
}
