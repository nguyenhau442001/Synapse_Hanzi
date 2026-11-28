// Shared constants for the curriculum lesson workspace (Curriculum.jsx and
// CurriculumLessonAside.jsx): labels, thresholds and layout numbers.

/** Words shown before "show all"; divisible by both 4 and 5 grid columns. */
export const WORD_PREVIEW_COUNT = 20;

/** Quiz score (percent) needed to complete a lesson. */
export const PASS_PERCENT = 80;

/** Fraction of a section that must be visible to mark it active in the outline. */
export const OUTLINE_VISIBLE_THRESHOLD = 0;

/** Top offset (px) of the scrollspy band, matching the sticky header height. */
export const OUTLINE_ROOT_MARGIN_TOP_PX = 96;

/** Bottom part of the viewport (percent) ignored by the scrollspy band. */
export const OUTLINE_ROOT_MARGIN_BOTTOM_PERCENT = 60;

/** Progress-learning statuses written by the flashcard pipeline. */
export const WORD_STATUS = Object.freeze({
  KNOWN: 'known',
  UNKNOWN: 'unknown',
});

/**
 * @typedef {Object} LessonWordStats
 * @property {number} total    Words in the lesson deck.
 * @property {number} known    Words rated "known" in flashcards/SRS.
 * @property {number} learning Words seen but not yet known.
 * @property {number} fresh    Words never studied.
 */

/**
 * @typedef {Object} LessonRecord
 * @property {number}  best Best quiz score in percent.
 * @property {boolean} done Whether the lesson quiz has been passed.
 * @property {number}  at   Timestamp of the last attempt.
 */

export const CUR_LABELS = Object.freeze({
  ASIDE: 'Bảng học tập của bài',
  PROGRESS_TITLE: 'Tiến độ bài học',
  STATUS_DONE: 'Đã hoàn thành',
  STATUS_TODO: 'Chưa hoàn thành',
  VOCAB_PROGRESS: 'Từ vựng đã nhớ',
  QUIZ_PROGRESS: 'Luyện tập · điểm cao nhất',
  QUIZ_NOT_TAKEN: 'Chưa làm',
  QUIZ_PASS_HINT: `Cần ${PASS_PERCENT}% để hoàn thành bài`,
  STATS_TITLE: 'Thống kê từ vựng',
  STAT_KNOWN: 'Đã nhớ',
  STAT_LEARNING: 'Đang học',
  STAT_NEW: 'Chưa học',
  OUTLINE_TITLE: 'Nội dung bài',
  OUTLINE_NAV: 'Mục lục bài học',
  ACTIONS_TITLE: 'Học nhanh',
  ACTION_FLASHCARD: 'Học flashcard bài này',
  ACTION_WRITING: 'Tập viết bài này',
  ACTION_LISTEN: 'Nghe cả bài đọc',
  PREV_LESSON: 'Bài trước',
  NEXT_LESSON: 'Bài sau',
  LESSON_NAV: 'Chuyển bài',
  LEVEL_DONE: (done, total) => `${done}/${total} bài đã xong`,
  LEVEL_CHIP_META: (lessons, cumulativeWords) => `${lessons} bài · ${cumulativeWords} từ`,
  LEVEL_CHIP_TITLE: (newWords, cumulativeWords) => `+${newWords} từ mới · tổng ${cumulativeWords} từ tích lũy đến cấp này`,
  LEVEL_LIST_META: (newWords, cumulativeWords, grammar) =>
    `+${newWords} từ mới (tổng ${cumulativeWords} từ) · ${grammar} điểm ngữ pháp trọng tâm`,
  WORDS_UNIT: 'từ',
  LINES_UNIT: 'câu',
  POINTS_UNIT: 'điểm',
});
