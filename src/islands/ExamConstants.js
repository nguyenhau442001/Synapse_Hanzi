// src/islands/ExamConstants.js
// Semantic constants, keyboard bindings, timing thresholds, and UI labels
// for the HSK 3.0 3-Phase Exam Mode (Speed Drill, Reading Builder, Full CBT).

export const FLASH_DURATION_MS = 1500;
export const SPEED_DRILL_DEFAULT_COUNT = 20;
export const HOMOPHONE_CHOICE_COUNT = 4;

export const DEFAULT_WRITING_MIN_CHARS = 80;
export const DEFAULT_EXAM_DURATION_MINUTES = 105;

export const DEFAULT_SECTION_DURATIONS_SECONDS = {
  listening: 30 * 60,
  reading: 40 * 60,
  writing: 35 * 60,
};

export const SECTION_SEQUENCE = ['listening', 'reading', 'writing'];

export const EXAM_MISTAKE_TAG = 'exam_mistake';
export const NEXT_MORNING_HOUR = 6;

export const CBT_SHORTCUTS = {
  NEXT: ['Enter', 'ArrowRight'],
  PREV: ['ArrowLeft'],
  FLAG: ['f', 'F'],
  CHOICE_NUMS: ['1', '2', '3', '4'],
  CHOICE_LETTERS: ['a', 'b', 'c', 'd'],
};

export const EXAM_UI_LABELS = {
  sections: {
    listening: 'Nghe hiểu (听力)',
    reading: 'Đọc hiểu (阅读)',
    writing: 'Viết (书写)',
  },
  hubTabs: {
    speedDrill: '⚡ GĐ 1: Phản xạ & Đồng âm',
    readingBuilder: '📖 GĐ 2: Đọc hiểu & Nối câu',
    mockSimulator: '🖥️ GĐ 3: Thi thử 105 phút',
    aiLiveTutor: '🎙️ Mẹo AI Live (HSK 4 / HSKK)',
  },
  cbt: {
    strictLockBadge: '🔒 Đã khóa từ điển & gợi ý',
    flagBtn: 'Cắm cờ (F)',
    flaggedBtn: 'Đã cắm cờ (F)',
    submitBtn: 'Nộp bài',
    nextBtn: 'Câu tiếp (→)',
    prevBtn: 'Câu trước (←)',
    autoAdvanceNotice: 'Hết giờ phần thi — tự động chuyển phần tiếp theo.',
    exportWritingJson: 'Xuất JSON chấm AI',
    exportWritingMd: 'Xuất Markdown chấm AI',
  },
};
