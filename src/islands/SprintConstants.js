// src/islands/SprintConstants.js
// Semantic constants, timing thresholds, daily sprint schedule, and UI labels
// for the Exam Sprint ("Sinh tử chiến / Khô máu") feature.

export const SPRINT_PREF_CONFIG_KEY = 'sprint_config_v1';
export const SPRINT_PREF_DAILY_KEY = 'sprint_daily_log_v1';

export const SPRINT_LEVEL_OPTIONS = [
  { id: 'hsk30_1', label: 'HSK 1' },
  { id: 'hsk30_2', label: 'HSK 2' },
  { id: 'hsk30_3', label: 'HSK 3' },
  { id: 'hsk30_4', label: 'HSK 4' },
];
export const DEFAULT_SPRINT_LEVELS = SPRINT_LEVEL_OPTIONS.map((opt) => opt.id);
export const DEFAULT_DAILY_NEW_QUOTA = 70;
export const MIN_DAILY_NEW_QUOTA = 30;
export const MAX_DAILY_NEW_QUOTA = 120;
export const BATCH_SPLIT_RATIO = 0.5;

export const SPRINT_AUTO_FLIP_LIMIT_MS = 3000;
export const COUNTDOWN_TICK_MS = 60000;
export const TIMER_TICK_MS = 100;

export const DEFAULT_EXAM_DAYS_AHEAD = 21;
export const MS_PER_DAY = 86400000;
export const MS_PER_HOUR = 3600000;
export const MS_PER_MINUTE = 60000;

export const REVERSE_SRS_QUIZ_COUNT = 12;
export const WORD_FAMILY_PREVIEW_LIMIT = 5;

export const CONFUSABLE_PINYIN_PATTERNS = [
  { id: 'z_zh', label: 'z / zh', regex: /(z|zh)[a-z]+/i },
  { id: 'c_ch', label: 'c / ch', regex: /(c|ch)[a-z]+/i },
  { id: 's_sh', label: 's / sh', regex: /(s|sh)[a-z]+/i },
  { id: 'n_l', label: 'n / l', regex: /^[nl][a-z]+|[a-z]+[nl][a-z]+/i },
  { id: 'in_ing', label: 'in / ing', regex: /ing?\b/i },
  { id: 'en_eng', label: 'en / eng', regex: /eng?\b/i },
  { id: 'an_ang', label: 'an / ang', regex: /ang?\b/i },
];

export const SPRINT_SLOTS = [
  {
    id: 'morning',
    timeLabel: 'Sáng sớm',
    durationMinutes: 20,
    title: 'Hiệp 1: Ôn thẻ đến hạn & Lỗi sai',
    description: 'Ưu tiên số 1 các từ gắn nhãn lỗi sai (exam_mistake) từ đề tối qua + thẻ FSRS đến hạn.',
  },
  {
    id: 'noon',
    timeLabel: 'Trưa',
    durationMinutes: 20,
    title: 'Hiệp 2: Nạp từ mới Đợt 1 (30–40 từ)',
    description: 'Tự lật 3s · Bắt buộc Auto-Audio · Đọc nhẩm theo tiếng + Hack não Hán Việt & Word Family.',
  },
  {
    id: 'evening',
    timeLabel: 'Chiều tối',
    durationMinutes: 20,
    title: 'Hiệp 3: Nạp từ mới Đợt 2 + Ôn nhanh Đợt 1',
    description: 'Tiếp tục nạp 30–40 từ mới và quét nhanh lại toàn bộ từ Đợt 1 buổi trưa.',
  },
  {
    id: 'night',
    timeLabel: 'Trước khi ngủ',
    durationMinutes: 15,
    title: 'Hiệp 4: Lướt 60–80 từ trong ngày & Gõ Pinyin',
    description: 'Ôn tổng kết từ mới trong ngày + gõ lại Pinyin các từ dễ nhầm (z/zh, c/ch, n/l, in/ing).',
  },
];

export const SPRINT_UI_LABELS = {
  hubTabLabel: '🔥 Sinh tử chiến (Khô máu)',
  title: 'Chiến dịch Sinh tử chiến — Luyện thi HSK 3.0',
  subtitle: 'Chọn cấp HSK cần cày · Nạp 60–80 từ/ngày (3s/thẻ, Auto-Audio) · Reverse SRS chống quên trong đề.',
  setExamDateLabel: 'Ngày thi mục tiêu',
  examDatePickerTitle: 'Bấm để chọn ngày thi trên lịch',
  dailyQuotaLabel: 'Chỉ tiêu từ mới / ngày',
  levelFilterLabel: 'Cấp HSK cần cày',
  levelFilterHint: 'Bỏ chọn các cấp đã thuộc để chỉ nạp từ khó hơn.',
  poolStatLabel: 'Tổng từ các cấp đã chọn',
  suspendedStatLabel: 'Đã ẩn',
  reverseSrsBtn: '🎯 Reverse SRS (12 câu chống quên trong đề)',
  autoFlipBadge: 'Giới hạn 3s/thẻ · Tự lật',
  autoAudioBadge: 'Auto-Audio BẮT BUỘC',
  hanVietPrefix: 'Hán Việt:',
  wordFamilyPrefix: 'Chùm gốc chữ:',
  pinyinPrompt: 'Gõ Pinyin không dấu (kiểm tra cặp dễ nhầm):',
  backToHub: 'Quay lại Lộ trình thi',
  countdownEmpty: 'Chưa đặt ngày thi',
  countdownToday: 'Hôm nay thi! Giữ vững tâm lý!',
  countdownPassed: 'Đã qua ngày thi mục tiêu',
  slotDone: 'Hoàn thành hiệp này!',
  slotStart: 'Bắt đầu hiệp này',
  slotCardsSuffix: 'thẻ',
  slotLoading: 'Đang tải...',
};

// Why a slot has nothing to study right now (shown when its queue is empty).
export const SPRINT_SLOT_EMPTY_REASONS = {
  morning: 'Không có thẻ HSK 3.0 (1–4) nào đến hạn hoặc bị gắn lỗi sai. Quay lại sau nhé!',
  noon: 'Đã đủ chỉ tiêu Đợt 1 hôm nay (hoặc đã học hết từ mới).',
  evening: 'Chưa có từ Đợt 1 để ôn và đã hết từ mới cho Đợt 2.',
  night: 'Hôm nay chưa nạp từ mới nào — hãy làm Hiệp 2 / Hiệp 3 trước.',
};
