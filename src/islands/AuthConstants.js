// Single source of truth for Google sign-in: storage keys, error mapping, labels, ids and sizes.

/**
 * Device-only flag: set while a Firebase session exists, so the SDK is only downloaded for
 * signed-in users. Not in SyncRegistry, so it is never exported or synced.
 */
export const AUTH_SESSION_FLAG_KEY = 'hsk_auth_session_v1';
export const AUTH_SESSION_FLAG_ON = '1';

/** UI language for the Google consent popup. */
export const AUTH_LANGUAGE = 'vi';

/** Google account chooser is always shown, so shared devices never sign in silently. */
export const GOOGLE_PROMPT = 'select_account';

/** Only https avatars from Google are rendered. */
export const AVATAR_URL_PATTERN = /^https:\/\/[a-z0-9.-]+\.googleusercontent\.com\//i;

export const AUTH_ICON_SIZE_PX = 18;
export const AUTH_CLOSE_ICON_SIZE_PX = 18;
export const GOOGLE_LOGO_SRC = 'assets/images/google-g.svg';
export const GOOGLE_LOGO_SIZE_PX = 20;

/** Public privacy policy page (also the OAuth consent screen's privacy link). */
export const PRIVACY_POLICY_URL = 'privacy.html';

export const AUTH_IDS = Object.freeze({
  ROOT: 'authDialogRoot',
  LOGIN_TITLE: 'authLoginTitle',
  LOGOUT_TITLE: 'authLogoutTitle',
  DELETE_TITLE: 'authDeleteTitle',
  DELETE_ACK: 'authDeleteAck',
  LOGOUT_KEEP: 'authLogoutKeep',
  LOGOUT_CLEAR: 'authLogoutClear',
});

export const AUTH_LABELS = Object.freeze({
  GUEST_CARD_TITLE: 'Lưu tiến trình lên đám mây',
  GUEST_CARD_BODY: 'Học tiếp trên mọi thiết bị, không lo mất dữ liệu khi đổi máy.',
  GUEST_CARD_BUTTON: 'Đăng nhập bằng Google',
  LOGIN_HANZI: '云端',
  LOGIN_TITLE: 'Lưu tiến trình lên đám mây',
  LOGIN_BODY: 'Đăng nhập để học tiếp trên điện thoại, máy tính bảng và máy tính mà không mất thẻ ôn tập.',
  LOGIN_BENEFITS: Object.freeze([
    'Thẻ FSRS, lịch sử ôn, bài thi và chuỗi ngày học được đồng bộ.',
    'Tiến trình đang có trên máy này được gộp vào tài khoản, không bị ghi đè.',
    'Vẫn học offline bình thường; đồng bộ khi có mạng.',
  ]),
  GOOGLE_BUTTON: 'Tiếp tục với Google',
  GOOGLE_BUTTON_BUSY: 'Đang mở cửa sổ Google…',
  LATER_BUTTON: 'Để sau, tiếp tục học không cần tài khoản',
  PRIVACY_NOTE: 'Chỉ dùng tên, email và ảnh đại diện Google. Không đọc Gmail, Drive hay danh bạ.',
  PRIVACY_LINK: 'Chính sách quyền riêng tư',
  CLOSE_ARIA: 'Đóng',
  MENU_SIGN_OUT: 'Đăng xuất',
  SIGNED_IN_FALLBACK_NAME: 'Tài khoản Google',
  SIGNING_IN: 'Đang đăng nhập…',
  AVATAR_ALT: 'Ảnh đại diện Google',
  LOGOUT_TITLE: 'Đăng xuất khỏi tài khoản?',
  LOGOUT_BODY: 'Tiến trình đã được lưu trên đám mây. Bạn muốn làm gì với dữ liệu trên máy này?',
  LOGOUT_KEEP: 'Giữ trên máy này',
  LOGOUT_KEEP_HINT: 'Tiếp tục học như khách.',
  LOGOUT_CLEAR: 'Xoá khỏi máy này',
  LOGOUT_CLEAR_HINT: 'Dùng khi đây là máy dùng chung.',
  LOGOUT_CANCEL: 'Huỷ',
  LOGOUT_CONFIRM: 'Đăng xuất',
  MENU_DELETE_ACCOUNT: 'Xoá tài khoản',
  DELETE_TITLE: 'Xoá tài khoản và dữ liệu đám mây?',
  DELETE_BODY: 'Toàn bộ tiến trình đã lưu trên đám mây sẽ bị xoá vĩnh viễn và không thể khôi phục. Tiến trình trên máy này vẫn được giữ lại để bạn học tiếp như khách.',
  DELETE_REAUTH_NOTE: 'Để xác nhận, Google sẽ yêu cầu bạn chọn lại tài khoản.',
  DELETE_ACK: 'Tôi hiểu dữ liệu đám mây không thể khôi phục.',
  DELETE_CANCEL: 'Huỷ',
  DELETE_CONFIRM: 'Xoá vĩnh viễn',
  DELETE_BUSY: 'Đang xoá…',
  ERROR_DELETE_FAILED: 'Chưa xoá được tài khoản. Hãy thử lại sau ít phút.',
  ERROR_USER_MISMATCH: 'Hãy chọn đúng tài khoản Google đang đăng nhập.',
  ERROR_POPUP_BLOCKED: 'Trình duyệt đã chặn cửa sổ đăng nhập. Hãy bấm lại nút Google.',
  ERROR_NETWORK: 'Không có mạng. Hãy kết nối Internet rồi thử lại.',
  ERROR_DOMAIN: 'Trang này chưa được phép đăng nhập. Hãy mở ứng dụng từ địa chỉ chính thức.',
  ERROR_GENERIC: 'Chưa đăng nhập được. Hãy thử lại sau ít phút.',
});

/**
 * Firebase Auth error codes mapped to user-facing labels. `null` means the user cancelled on
 * purpose and nothing should be shown. Raw error text is never displayed.
 * @type {Readonly<Record<string, string|null>>}
 */
export const AUTH_ERROR_MESSAGES = Object.freeze({
  'auth/popup-closed-by-user': null,
  'auth/cancelled-popup-request': null,
  'auth/user-cancelled': null,
  'auth/popup-blocked': AUTH_LABELS.ERROR_POPUP_BLOCKED,
  'auth/network-request-failed': AUTH_LABELS.ERROR_NETWORK,
  'auth/unauthorized-domain': AUTH_LABELS.ERROR_DOMAIN,
  'auth/user-mismatch': AUTH_LABELS.ERROR_USER_MISMATCH,
});
