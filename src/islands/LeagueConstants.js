// Single source of truth for the weekly leaderboard: XP table, Firestore limits (mirrored in
// firestore.rules), week math, avatars, storage keys and labels. Plan: docs/league-plan.md.

export const LEAGUE_SCHEMA_VERSION = 1;

/** Firestore path: leagues/{weekNo}/entries/{uid}. */
export const LEAGUE_COLLECTION = 'leagues';
export const LEAGUE_ENTRIES_COLLECTION = 'entries';

/** XP per activity. Keep in sync with the rules table in docs/league-plan.md. */
export const LEAGUE_XP = Object.freeze({
  CARD_REVIEW: 2,
  QUIZ_CORRECT: 1,
  LESSON_DONE: 15,
  EXAM_SUBMITTED: 30,
  DAILY_GOAL: 20,
});

/** Streak length (days) → one-time bonus XP when the streak reaches it. */
export const LEAGUE_STREAK_BONUS = Object.freeze({ 7: 50, 30: 150, 100: 500 });

/** Limits enforced by firestore.rules; the client stays inside them. */
export const LEAGUE_MAX_XP_PER_WRITE = 300;
export const LEAGUE_MIN_WRITE_INTERVAL_MS = 20 * 1000;
export const LEAGUE_WEEKLY_XP_CAP = 25000;

/** Board size and how long a fetched board is reused before reading Firestore again. */
export const LEAGUE_TOP_LIMIT = 50;
export const LEAGUE_BOARD_CACHE_MS = 5 * 60 * 1000;

/** Weeks start Monday 00:00 in Vietnam (UTC+7, no daylight saving). */
export const MS_PER_DAY = 24 * 60 * 60 * 1000;
export const LEAGUE_WEEK_MS = 7 * MS_PER_DAY;
export const LEAGUE_TZ_OFFSET_MS = 7 * 60 * 60 * 1000;
/** The Unix epoch is a Thursday; shifting by 3 days puts week boundaries on Mondays. */
export const LEAGUE_WEEK_SHIFT_MS = 3 * MS_PER_DAY;

/** Join history kept so leaving / deleting the account can remove every entry. */
export const LEAGUE_MAX_REMEMBERED_WEEKS = 520;

export const LEAGUE_NICKNAME_MIN = 2;
export const LEAGUE_NICKNAME_MAX = 20;
/** Letters (any script), digits, space, underscore, dot, hyphen. Same pattern in firestore.rules. */
export const LEAGUE_NICKNAME_PATTERN = /^[\p{L}\p{N} _.-]{2,20}$/u;

/** Hanzi seal avatars. Ids are stored in Firestore and allowlisted in firestore.rules. */
export const LEAGUE_AVATARS = Object.freeze([
  Object.freeze({ id: 'crane', glyph: '鹤', name: 'Hạc' }),
  Object.freeze({ id: 'dragon', glyph: '龙', name: 'Rồng' }),
  Object.freeze({ id: 'tiger', glyph: '虎', name: 'Hổ' }),
  Object.freeze({ id: 'bear', glyph: '熊', name: 'Gấu' }),
  Object.freeze({ id: 'bamboo', glyph: '竹', name: 'Trúc' }),
  Object.freeze({ id: 'plum', glyph: '梅', name: 'Mai' }),
  Object.freeze({ id: 'pine', glyph: '松', name: 'Tùng' }),
  Object.freeze({ id: 'rabbit', glyph: '兔', name: 'Thỏ' }),
]);
export const LEAGUE_DEFAULT_AVATAR = 'crane';

/** Synced (profile namespace): { optedIn, nickname, avatar, weeks }. */
export const LEAGUE_PROFILE_KEY = 'hsk_league_profile_v1';
/** Device-only: XP earned here and not yet uploaded, plus one-time award keys. */
export const LEAGUE_LEDGER_KEY = 'hsk_league_ledger_v1';

/**
 * window event the learning features fire (they never import the league code):
 * detail = { kind: LEAGUE_ACTIVITY.*, ...context }. LeagueService turns it into XP.
 */
export const LEAGUE_ACTIVITY_EVENT = 'hanzi:learning-activity';
export const LEAGUE_ACTIVITY = Object.freeze({
  CARD: 'card', // a flashcard was graded (any study mode, fast review included)
  QUIZ: 'quiz', // a correct answer in a speed game
  LESSON: 'lesson', // detail.key: curriculum lesson key, first completion only
  EXAM: 'exam', // detail.id: submitted exam session id
  DAY: 'day', // detail: { date, wordsToday, goal, streak } after today's activity changed
});

/** Upload XP this long after the last award (trailing debounce; never faster than the rules allow). */
export const LEAGUE_UPLOAD_DEBOUNCE_MS = 30 * 1000;

/** How long the "+N XP" chip and milestone toasts stay visible. */
export const LEAGUE_XP_CHIP_MS = 1200;
export const LEAGUE_TOAST_MS = 5000;

/** Top-3 medal order. */
export const LEAGUE_PODIUM_SIZE = 3;

export const LEAGUE_LABELS = Object.freeze({
  TITLE: 'Bảng xếp hạng tuần',
  TITLE_SHORT: 'Bảng xếp hạng',
  MENU_JOIN: 'Tham gia bảng xếp hạng',
  MENU_BOARD: 'Bảng xếp hạng tuần',
  MENU_NEW_BADGE: 'Mới',
  THIS_WEEK: 'Tuần này',
  LAST_WEEK: 'Tuần trước',
  weekEyebrow: (weekLabel, range) => `Tuần ${weekLabel} · ${range}`,
  resetIn: (text) => `Làm mới sau ${text}`,
  daysHours: (days, hours) => (days > 0 ? `${days} ngày ${hours} giờ` : `${hours} giờ`),
  COL_RANK: 'Hạng',
  COL_LEARNER: 'Người học',
  COL_XP: 'XP',
  YOU_SUFFIX: ' · Bạn',
  YOUR_RANK: 'Hạng của bạn',
  rankLine: (rank, xp) => `Hạng #${rank} · ${xp} XP`,
  ONLY_NEED: 'Chỉ cần thêm',
  xpAmount: (xp) => `${xp} XP`,
  toOvertake: (name, rank) => `để vượt ${name} lên #${rank}`,
  overtakeShort: (name) => `để vượt ${name}`,
  studyToOvertake: (cards, name) => `Ôn ${cards} thẻ để vượt ${name}`,
  LEADING: 'Bạn đang dẫn đầu',
  leadBy: (name, xp) => `Hơn ${name} ${xp} XP`,
  NO_XP_YET: 'Chưa có XP tuần này',
  START_WITH_ONE: 'Ôn 1 thẻ để vào bảng',
  STUDY_NOW: 'Ôn ngay',
  START: 'Bắt đầu',
  KEEP_RANK: 'Giữ hạng',
  XP_RULES: 'Cách nhận XP',
  XP_RULES_SUMMARY: 'Chấm thẻ +2 · Bài học +15 · Đề thi +30 · và 3 cách khác',
  XP_RULE_ROWS: Object.freeze([
    ['Chấm một thẻ flashcard', '+2'],
    ['Câu đúng ở trò chơi tốc độ', '+1'],
    ['Xong một bài giáo trình', '+15'],
    ['Nộp một đề thi', '+30'],
    ['Đạt mục tiêu ngày', '+20'],
    ['Chuỗi 7 / 30 / 100 ngày', '+50 / 150 / 500'],
  ]),
  PRIVACY_FOOTER: 'Chỉ biệt danh, ấn triện và XP tuần được công khai. Email không bao giờ hiển thị.',
  CHANGE_NICKNAME: 'Đổi biệt danh',
  LEAVE: 'Rời bảng',
  EMPTY_BOARD: 'Chưa ai có XP tuần này. Hãy là người đầu tiên!',
  LOADING: 'Đang tải bảng xếp hạng…',
  ERROR_LOAD: 'Chưa tải được bảng xếp hạng. Hãy thử lại sau.',
  RETRY: 'Thử lại',
  CLOSE_ARIA: 'Đóng',
  BACK_ARIA: 'Quay lại',
  // Not joined / guest
  NOT_ON_BOARD: 'Bạn chưa có trên bảng',
  NOT_ON_BOARD_HINT: 'Tham gia để XP từ giờ được tính vào bảng tuần.',
  JOIN: 'Tham gia',
  SIGN_IN_TO_JOIN: 'Đăng nhập để tham gia',
  GUEST_HINT: 'Đăng nhập Google để có hạng tuần. Chế độ khách vẫn học bình thường.',
  // Join flow
  stepOf: (step, total) => `Bước ${step} / ${total}`,
  JOIN_TITLE: 'Tham gia bảng xếp hạng',
  STEP_BENEFITS: 'Lợi ích và quy tắc',
  STEP_BENEFITS_SUMMARY: 'Hạng mới mỗi thứ Hai · ai cũng từ 0 XP',
  BENEFITS: Object.freeze([
    ['Hạng mới mỗi tuần.', 'Làm mới 00:00 thứ Hai, ai cũng bắt đầu từ 0.'],
    ['Giữ chuỗi dễ hơn.', 'Mục tiêu ngày và chuỗi ngày được cộng thưởng.'],
    ['Riêng tư.', 'Chỉ biệt danh, ấn triện và XP tuần.'],
  ]),
  REVIEW_AGAIN: 'Xem lại',
  STEP_PROFILE: 'Biệt danh và ấn triện',
  NICKNAME_LABEL: 'Biệt danh công khai',
  NICKNAME_HINT: '2–20 ký tự: chữ, số, khoảng trắng, _ . -',
  NICKNAME_INVALID: 'Biệt danh cần 2–20 ký tự: chữ, số, khoảng trắng, _ . -',
  AVATAR_LABEL: 'Ấn triện',
  avatarAria: (name) => `Ấn ${name}`,
  PREVIEW_LABEL: 'Mọi người sẽ thấy',
  STEP_CONFIRM: 'Xác nhận tham gia',
  CONFIRM_BODY: 'Biệt danh, ấn triện và XP tuần của bạn sẽ hiện trên bảng xếp hạng công khai. Bạn có thể rời bảng bất cứ lúc nào.',
  EMAIL_NEVER_SHOWN: 'Email và ảnh Google không bao giờ hiển thị.',
  CONTINUE: 'Tiếp tục',
  CONFIRM_JOIN: 'Tham gia bảng xếp hạng',
  SAVE: 'Lưu',
  JOINING: 'Đang tham gia…',
  ERROR_JOIN: 'Chưa tham gia được. Hãy thử lại sau ít phút.',
  // Leave
  LEAVE_TITLE: 'Rời bảng xếp hạng?',
  LEAVE_BODY: 'Biệt danh và XP của bạn ở mọi tuần sẽ bị xoá khỏi bảng. Tiến trình học vẫn giữ nguyên.',
  LEAVE_CANCEL: 'Ở lại',
  LEAVE_CONFIRM: 'Rời bảng',
  LEFT_TITLE: 'Bạn đã rời bảng',
  LEFT_BODY: 'Không còn dòng nào của bạn trên bảng. Tham gia lại bất cứ lúc nào, XP tính từ lúc tham gia lại.',
  REJOIN: 'Tham gia lại',
  ERROR_LEAVE: 'Chưa rời bảng được. Hãy thử lại sau.',
  // XP feedback
  xpChip: (xp) => `+${xp} XP`,
  DAILY_GOAL_TOAST: 'Đạt mục tiêu ngày.',
  streakToast: (days) => `Chuỗi ${days} ngày.`,
  VIEW: 'Xem',
});
