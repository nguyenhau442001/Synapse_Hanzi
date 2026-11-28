// Single source of truth for full-app backup and (later) cloud sync limits and labels.

/** Payload discriminator: files without it are legacy per-level backups. */
export const BACKUP_TYPE = 'hanzi_mind_backup';

/** Bump on breaking payload changes; older files are migrated or rejected in validateBackup. */
export const BACKUP_SCHEMA_VERSION = 1;

/** Reject backup files above this size before reading them (protects against memory abuse). */
export const BACKUP_MAX_FILE_BYTES = 20 * 1024 * 1024;

/** Reject a single stored value above this many characters. */
export const BACKUP_MAX_VALUE_CHARS = 8 * 1024 * 1024;

/** Upper bound on the number of entries a backup may contain. */
export const BACKUP_MAX_ENTRIES = 2000;

/** Safety cap on entries kept after merging an id_log value (newest kept). */
export const ID_LOG_MAX_ENTRIES = 5000;

/** Keys that must never be copied from untrusted objects (prototype pollution guard). */
export const UNSAFE_OBJECT_KEYS = Object.freeze(['__proto__', 'constructor', 'prototype']);

export const BACKUP_FILE_PREFIX = 'hanzi_mind_backup_';
export const BACKUP_FILE_EXTENSION = '.json';
export const BACKUP_MIME_TYPE = 'application/json';
export const BACKUP_JSON_INDENT = 0;

/** Delay before closing the transfer panel after a download starts. */
export const BACKUP_PANEL_CLOSE_DELAY_MS = 400;

export const BACKUP_LABELS = Object.freeze({
  confirmRestore: 'Khôi phục toàn bộ tiến trình từ bản sao này? Thẻ ôn tập và lịch sử ôn sẽ được gộp (giữ bản mới hơn), các mục khác lấy theo bản sao.',
  restoreDone: 'Đã khôi phục tiến trình. Ứng dụng sẽ tải lại.',
  invalidFile: 'Bản sao tiến trình không hợp lệ.',
  fileTooLarge: 'Tệp sao lưu quá lớn.',
});

// ---- Cloud sync (SyncEngine / FirestoreCloudAdapter) ----

/** Device-only sync bookkeeping (per signed-in uid). Not in SyncRegistry, never synced. */
export const SYNC_STATE_KEY = 'hsk_sync_state_v1';

/** Bump on breaking cloud document changes; newer documents are ignored by older apps. */
export const SYNC_SCHEMA_VERSION = 1;

/**
 * Max UTF-8 bytes of a document's `data` string. Firestore caps a document at 1 MiB in bytes, and
 * hanzi keys take 3 bytes each, so a character count is not enough. Bytes >= characters, so this
 * also satisfies the rules' `data.size() <= 900000` character bound.
 */
export const SYNC_MAX_DOC_BYTES = 900000;

/** UTF-8 byte budget of one batched push, safely below Firestore's 10 MiB commit request limit. */
export const SYNC_MAX_BATCH_BYTES = 4 * 1024 * 1024;

/** Newest review-log entries kept in a pushed copy (the full log stays on each device). */
export const SYNC_MAX_LOG_ENTRIES = 3000;

/** Hex characters kept from each SHA-256 digest in the sync state. */
export const SYNC_HASH_HEX_LENGTH = 32;

/** Random bytes in a device id (rules cap deviceId at 64 characters). */
export const SYNC_DEVICE_ID_BYTES = 12;

/** Firestore allows at most this many writes or deletes per batch. */
export const FIRESTORE_BATCH_LIMIT = 500;

/** Firestore path: users/{uid}/snapshots/{namespace}. */
export const SYNC_USERS_COLLECTION = 'users';
export const SYNC_SNAPSHOTS_COLLECTION = 'snapshots';

/** sessionStorage guard so a sync that changed local data reloads the page at most once. */
export const SYNC_RELOAD_GUARD_KEY = 'hsk_sync_reloaded_v1';

/** Pull-only poll cadence while the app is visible and signed in. */
export const SYNC_POLL_INTERVAL_MS = 60 * 1000;

/** Push this long after the last local progress change (trailing debounce). */
export const SYNC_PUSH_DEBOUNCE_MS = 30 * 1000;

/** While changes keep coming (non-stop study), push at least this often. */
export const SYNC_PUSH_MAX_WAIT_MS = 2 * 60 * 1000;

/** window event fired when allowlisted progress is written locally. */
export const SYNC_LOCAL_CHANGE_EVENT = 'hanzi:progress-changed';

/** On returning to the app, sync if the last sync is older than this. */
export const SYNC_STALE_AFTER_MS = 60 * 1000;

/** "Vừa xong" below this age; relative minutes/hours/days above it. */
export const SYNC_JUST_NOW_MS = 60 * 1000;
export const MS_PER_MINUTE = 60 * 1000;
export const MINUTES_PER_HOUR = 60;
export const HOURS_PER_DAY = 24;

/** How long the sync toast stays on screen. */
export const SYNC_TOAST_MS = 6000;

/** sessionStorage: notice to show after the post-sync reload. */
export const SYNC_PENDING_NOTICE_KEY = 'hsk_sync_notice_v1';

export const SYNC_LOCALE = 'vi';

export const SYNC_LABELS = Object.freeze({
  SYNCED: 'Đã đồng bộ',
  SYNCED_JUST_NOW: 'Đã đồng bộ · vừa xong',
  syncedAgo: (relative) => `Đã đồng bộ · ${relative}`,
  SYNCING: 'Đang đồng bộ…',
  OFFLINE: 'Ngoại tuyến · sẽ đồng bộ khi có mạng',
  ERROR: 'Chưa đồng bộ được · dữ liệu vẫn an toàn trên máy',
  RETRY: 'Thử lại',
  SYNC_NOW: 'Đồng bộ ngay',
  NOTICE_MERGED: 'Đã gộp tiến trình trên máy này vào tài khoản của bạn.',
  NOTICE_REMOTE: 'Có tiến trình mới từ thiết bị khác.',
  NOTICE_RELOAD: 'Tải lại',
  NOTICE_CLOSE_ARIA: 'Đóng thông báo',
});
