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
