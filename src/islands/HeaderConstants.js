// Single source of truth for the app header island (AppHeader.jsx):
// user-facing labels, DOM ids that other modules and CSS rely on, nav items and sizing.

/** @typedef {'vocab'|'curriculum'|'skills'|'exam'|'review'} NavSectionId */
/** @typedef {'light'|'dark'} ThemeName */
/** @typedef {'saved'|'urgent'|null} DrawerBadgeTab */

export const HEADER_LABELS = Object.freeze({
  BRAND_TITLE: '汉字思维',
  BRAND_SUBTITLE: 'Hanzi Mind',
  BRAND_LOGO_ALT: '汉字思维 Logo',
  HOME_BTN_ARIA: 'Trở về trang chủ 汉字思维',
  HOME_BTN_TITLE: 'Trở về trang chủ (Home)',
  HOME_TEXT_ARIA: 'Trang chủ 汉字思维',
  BACK_TEXT: 'Trở về',
  BACK_ARIA: 'Quay lại trang trước',
  BACK_TITLE: 'Quay lại trang trước (Alt+Left)',
  NAV_ARIA: 'Chế độ học chính',
  SEARCH_ARIA: 'Tìm kiếm từ vựng (Ctrl+K)',
  SEARCH_TITLE: 'Tìm kiếm từ vựng (⌘K)',
  SEARCH_PLACEHOLDER: 'Tìm từ, pinyin...',
  SEARCH_KBD_KEY: 'K',
  SEARCH_MOD_MAC: '⌘',
  SEARCH_MOD_OTHER: 'Ctrl+',
  STREAK_DEFAULT: 'Chuỗi ngày học liên tiếp',
  streakLabel: (days) => `Chuỗi ${days} ngày học liên tiếp`,
  URGENT_LABEL: 'Ôn gấp',
  URGENT_TITLE: 'Từ cần ôn gấp',
  ACCOUNT_BTN_TITLE: 'Menu tài khoản & tiện ích',
  ACCOUNT_BTN_ARIA: 'Menu tài khoản và tiện ích',
  ACCOUNT_MENU_ARIA: 'Tiện ích tài khoản',
  MENU_PROFILE: 'Hồ sơ & Thống kê',
  MENU_SAVED: 'Sổ từ',
  MENU_SAVED_ARIA: 'Từ khó đã đánh dấu',
  MENU_HELP: 'Hướng dẫn & Phím tắt',
  MENU_HELP_ARIA: 'Hướng dẫn học tập và phím tắt',
  MENU_SHARE: 'Chia sẻ ứng dụng',
  MENU_SHARE_ARIA: 'Chia sẻ với bạn bè',
  MENU_INSTALL: 'Cài đặt ứng dụng',
  MENU_INSTALL_ARIA: 'Cài đặt ứng dụng về máy',
  MENU_VERSION: 'Phiên bản',
  THEME_ARIA_DEFAULT: 'Đổi giao diện Sáng / Tối',
  THEME_TITLE_LIGHT: 'Chế độ sáng (Bấm để chuyển tối)',
  THEME_TITLE_DARK: 'Chế độ tối (Bấm để chuyển sáng)',
  THEME_ARIA_LIGHT: 'Chuyển sang giao diện tối',
  THEME_ARIA_DARK: 'Chuyển sang giao diện sáng',
});

/** DOM ids kept stable for CSS, tests, deep links and legacy callers. */
export const HEADER_IDS = Object.freeze({
  ROOT: 'appHeader',
  BACK_BTN: 'globalBackBtn',
  HOME_BTN: 'appBrandHomeBtn',
  BRAND_TEXT: 'appBrandTextBlock',
  TITLE: 'appTitle',
  SUBTITLE: 'appSubtitle',
  NAV: 'headerPrimaryNav',
  SEARCH_BTN: 'headerQuickSearchBtn',
  STREAK_BTN: 'headerStreakBadge',
  STREAK_TEXT: 'headerStreakText',
  URGENT_BTN: 'headerUrgentReviewBtn',
  URGENT_COUNT: 'headerUrgentCount',
  PROFILE_BTN: 'headerProfileBtn',
  AVATAR: 'headerAvatarInitial',
  ACCOUNT_MENU: 'headerAccountMenu',
  MENU_PROFILE: 'headerMenuProfileItem',
  MENU_SAVED: 'headerSavedWordsBtn',
  SAVED_COUNT: 'headerSavedCount',
  MENU_HELP: 'headerHelpBtn',
  MENU_SHARE: 'headerShareBtn',
  MENU_INSTALL: 'headerInstallBtn',
  THEME_TOGGLE: 'themeToggle',
});

/** Primary nav sections, in display order. `domId` must match NavSections.js. */
export const HEADER_NAV_ITEMS = Object.freeze([
  { section: 'vocab', domId: 'primaryTabVocab', label: 'Từ vựng' },
  { section: 'curriculum', domId: 'primaryTabCurriculum', label: 'Giáo trình' },
  { section: 'skills', domId: 'primaryNavSkills', label: 'Kỹ năng' },
  { section: 'exam', domId: 'primaryNavExam', label: 'Luyện thi' },
  { section: 'review', domId: 'primaryTabReview', label: 'Ôn nhanh' },
]);

export const HEADER_DEFAULT_SECTION = 'vocab';
export const HEADER_LOGO_SRC = 'assets/images/logo.svg';
export const HEADER_LOGO_SIZE_PX = 36;
export const HEADER_ICON_SIZE_PX = 15;
export const HEADER_BACK_ICON_SIZE_PX = 16;
export const HEADER_BACK_ICON_STROKE = 2.2;
export const HEADER_THEME_ICON_SIZE_PX = 17;
export const HEADER_ICON_STROKE = 2;

export const PROFILE_NAME_STORAGE_KEY = 'hsk_profile_name';
export const DEFAULT_AVATAR_INITIAL = 'H';
export const MAC_PLATFORM_PATTERN = /(Mac|iPhone|iPod|iPad)/i;
