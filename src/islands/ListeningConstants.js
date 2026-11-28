// Single source of truth for the per-question HSK listening drill (exam mode, turn markers,
// mistake reasons, attempt log).

/** localStorage key of the attempt log (synced via SyncRegistry, merge 'id_log'). */
export const LISTENING_ATTEMPTS_KEY = 'hsk_listening_attempts_v1';

/** Device preference: lock audio to a single play before answering (default on). */
export const LISTENING_EXAM_MODE_KEY = 'hsk_listening_exam_mode_v1';

/** Keep only the newest attempts; older ones are dropped on write. */
export const LISTENING_ATTEMPTS_MAX = 2000;

/** The stats panel summarises this many most recent attempts. */
export const LISTENING_STATS_WINDOW = 50;

/** Plays allowed before answering in exam mode (the HSK 3.0 computer exam plays once). */
export const LISTENING_EXAM_PLAYS = 1;

export const LISTENING_SPEED_NORMAL = 1.0;
export const LISTENING_SPEED_SLOW = 0.85;
/** Speed presets offered after answering. */
export const LISTENING_REPLAY_SPEEDS = Object.freeze([LISTENING_SPEED_NORMAL, LISTENING_SPEED_SLOW]);

/** Percent scale used by the stats panel. */
export const PERCENT_SCALE = 100;

/**
 * Discourse markers after which HSK 4 dialogues usually place the real answer.
 * Longer markers come first so '没想到' wins over a shorter overlapping marker.
 */
export const TURN_MARKERS = Object.freeze(['没想到', '但是', '不过', '其实', '结果', '可是', '原来', '却']);

/** @typedef {'unknown_word'|'misheard'|'turn_trap'|'too_fast'} MistakeReason */

/** @type {ReadonlyArray<MistakeReason>} */
export const MISTAKE_REASONS = Object.freeze(['unknown_word', 'misheard', 'turn_trap', 'too_fast']);

/** @type {Readonly<Record<MistakeReason, string>>} */
export const MISTAKE_REASON_LABELS = Object.freeze({
  unknown_word: 'Không biết từ',
  misheard: 'Nghe không ra âm',
  turn_trap: 'Dính bẫy chuyển ý',
  too_fast: 'Không kịp',
});

export const LISTENING_DRILL_LABELS = Object.freeze({
  examModeOn: 'Chế độ thi: chỉ nghe 1 lần',
  examModeToggle: 'Chế độ thi (nghe 1 lần)',
  playOnce: 'Nghe (1 lần)',
  playUsed: 'Đã nghe · trả lời để mở nghe lại',
  reasonPrompt: 'Vì sao sai?',
  reasonSaved: 'Đã ghi lý do',
  turnMarkerHint: 'Đoạn sau từ chuyển ý',
  statsTitle: 'Điểm yếu nghe',
  statsAccuracy: 'Độ chính xác',
  statsEmpty: 'Chưa có dữ liệu. Làm vài câu để xem thống kê.',
  statsOpen: 'Thống kê lỗi sai',
  statsClose: 'Đóng thống kê',
  speedLabel: 'Tốc độ',
  playStatement: 'Nghe câu nhận định',
  pauseStatement: 'Tạm dừng câu nhận định',
});
