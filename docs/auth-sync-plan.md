# Kế hoạch: Đăng nhập & đồng bộ tiến trình (Auth + Cloud Sync)

> Trạng thái: **Đề xuất — chờ chốt quyết định** (2026-11-27, app v3.71.3). Ràng buộc: miễn phí, không mua domain.

## 1. Hiện trạng (data flow)

| Lớp | Nơi lưu | Nội dung |
|---|---|---|
| `StorageEngine.js` | localStorage `hsk_<level>_srs_v3[_dir]`, `hsk_<level>_review_log_v1[_dir]` | Thẻ FSRS + review log theo level × hướng học |
| `db.js` (Dexie `HanziMindDB`) | IndexedDB `cards`, `reviewLogs`, `preferences` | Bản chuyển đổi từ localStorage, exam-mistake tag, sprint |
| Các island khác | ~50 key `hsk_*`, `hsk30_*`, `hskk_*`, `hsk4_*` | Lịch sử thi, sổ lỗi, luyện viết, giáo trình, streak/activity, bộ thủ, cài đặt |
| `BackupSync.jsx` | File JSON thủ công | Chỉ 1 level + 1 hướng + bộ thủ riêng |

Ràng buộc: site tĩnh trên GitHub Pages, PWA offline-first, không có backend riêng.

**Nguyên tắc:** đăng nhập là **tuỳ chọn**. Khách vẫn dùng 100% offline như hiện tại; đăng nhập chỉ thêm lớp sao lưu/đồng bộ trên nền dữ liệu local (local là nguồn chính, cloud là bản sao).

## 2. Phương án kiến trúc

| | A. Supabase (Auth + Postgres RLS) | B. Firebase (Auth + Firestore) | C. Dexie Cloud | D. Google Drive `appDataFolder` |
|---|---|---|---|---|
| Đăng nhập | Google, email magic link, OTP | Google, email, nhiều provider | Email OTP có sẵn | Chỉ Google |
| Lưu ở đâu | Postgres `jsonb`, RLS theo `auth.uid()` | Firestore document | Server Dexie Cloud | Drive của chính user |
| Hợp với code hiện tại | Tốt — gọi từ site tĩnh, SDK nhỏ | Tốt, có offline cache riêng (thừa vì đã có Dexie) | Rất tốt cho bảng Dexie, **nhưng không phủ ~50 key localStorage** | Trung bình — tự viết lớp file |
| Chi phí | Free tier rộng (lưu ý project free bị pause khi không dùng lâu) | Free tier rộng | Trả tiền theo user khi production (cần kiểm tra giá) | Miễn phí, không quota server |
| Lock-in / mở rộng | Thấp (Postgres chuẩn), mở rộng được: bảng xếp hạng, lớp học | Cao (NoSQL độc quyền) | Cao | Không mở rộng được tính năng xã hội |
| Riêng tư | Dữ liệu trên server của mình | Server Google | Server bên thứ 3 | Tốt nhất — dữ liệu ở Drive user |

**Yêu cầu đã chốt: miễn phí, không mua domain.** Cả 4 phương án đều dùng được domain `nguyenhau442001.github.io` (authorized domain / OAuth redirect), không cần domain riêng.

**Đề xuất (cập nhật): B — Firebase Spark**, đồng bộ theo **snapshot từng namespace**. Lý do so với Supabase Free:
- Spark **không pause project** khi ít hoạt động (Supabase Free pause sau ~1 tuần ít truy cập DB → app báo lỗi sync cho tới khi vào dashboard bật lại).
- Không cần thẻ/billing account. Auth (Google, email link) miễn phí, Firebase tự gửi email đăng nhập — không cần SMTP riêng.
- Quota Firestore Spark: ~20.000 lượt ghi / 50.000 lượt đọc mỗi ngày, 1 GiB lưu trữ → với ~10–20 lượt ghi/user/ngày đủ cho vài trăm–nghìn user hoạt động mỗi ngày. Vượt quota chỉ làm sync tạm dừng tới ngày sau; dữ liệu local không ảnh hưởng.
- Không dùng: Phone/SMS auth và Cloud Storage (cần gói Blaze trả phí).
- Lock-in thấp vì payload là snapshot JSON thuần, `SyncEngine` gọi qua 1 adapter (`CloudAdapter`) → đổi sang Supabase/Drive sau này chỉ thay adapter.

A (Supabase) là dự phòng nếu cần SQL. D (Google Drive) vẫn miễn phí tuyệt đối nhưng chỉ có Google login và phải tự viết lớp file.

### Mô hình đồng bộ (chọn trong A)
- **A1 — Snapshot theo namespace (đề xuất):** mỗi namespace (vd. `srs:hsk30_1:zh2vi`, `exam`, `writing`, `prefs`) là 1 hàng `jsonb`. Đơn giản, ít request, merge ở client. Nhược: gửi lại cả namespace khi đổi 1 thẻ (chấp nhận được, chia nhỏ theo level giữ payload nhỏ).
- **A2 — Row-level (mỗi thẻ 1 hàng):** delta nhỏ, merge ở server; nhưng hàng chục nghìn hàng/user, phải tự viết change-tracking cho mọi island → phức tạp, không xứng cho giai đoạn đầu.

## 3. Data contract (JSDoc — chốt trước khi code)

```js
/**
 * Registry entry: which local data is synced and how it merges.
 * @typedef {Object} SyncNamespaceDef
 * @property {string} id            Stable namespace id, e.g. 'srs:hsk30_1:zh2vi', 'exam_history'.
 * @property {'localStorage'|'dexie'} source
 * @property {string[]} keys        localStorage keys (or Dexie table filter) belonging to it.
 * @property {'srs_cards'|'append_log'|'lww'} merge  Merge strategy (see §4).
 */

/**
 * Payload stored in one cloud row.
 * @typedef {Object} SyncSnapshot
 * @property {number} schemaVersion  Bumped on breaking payload changes.
 * @property {string} namespace      SyncNamespaceDef.id.
 * @property {string} deviceId       Random id of the last writing device (debug/conflict UI).
 * @property {string} updatedAt      ISO time of last local change in this namespace.
 * @property {Object<string, unknown>} data  Raw values keyed by storage key.
 */

/**
 * Reactive auth/sync state (Preact Signals store, like HeaderStore.js).
 * @typedef {Object} AuthState
 * @property {'guest'|'signing_in'|'signed_in'} status
 * @property {{ id: string, email: string|null, displayName: string|null, avatarUrl: string|null }|null} user
 * @property {'idle'|'syncing'|'synced'|'offline'|'error'} syncStatus
 * @property {string|null} lastSyncedAt  ISO time of last successful sync.
 * @property {string|null} errorMessage  User-facing message constant, never raw error text.
 */
```

Firestore: `users/{uid}/snapshots/{namespace}` → 1 document = 1 `SyncSnapshot` (giới hạn 1 MiB/document → review log chia theo level, cắt log cũ khi vượt ngưỡng hằng số).

```js
// firestore.rules — each user can only read/write their own documents.
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
  }
}
```

Firebase web config (apiKey…) là public theo thiết kế; bảo mật nằm ở rules trên. Bật App Check (reCAPTCHA, miễn phí) để giảm spam quota.

**Không sync** (thuộc về thiết bị): `hsk_theme*`, `hsk_sidebar_tab`, `hsk_pwa_install_dismissed_until`, `hsk_welcome_dismissed`, `hsk_dexie_migration_v1`, model giọng nói/audio cache.

## 4. Quy tắc merge (non-trivial logic)

| Strategy | Áp dụng | Quy tắc |
|---|---|---|
| `srs_cards` | Thẻ FSRS | Theo từng `wordId`: giữ thẻ có `last_review` mới hơn; hoà → `reps` lớn hơn. Không bao giờ để thẻ đã học bị thẻ `New` ghi đè. |
| `append_log` | Review log, lịch sử thi, activity/streak | Hợp nhất + khử trùng lặp theo khoá (tái dùng logic dedupe của `appendImportedReviewLog`). |
| `lww` | Cài đặt học, giáo trình, luyện viết… | Last-write-wins theo `updatedAt` của namespace. |

`updatedAt` mỗi namespace lấy từ `hsk_sync_meta_v1` — một wrapper ghi trung tâm đánh dấu namespace "dirty" khi key thuộc registry thay đổi (không sửa từng island; hook vào `Storage.prototype.setItem` là hack → thay vào đó gom ghi qua `StorageEngine`/helper `persist(key, value)` dần dần, kèm quét diff hash lúc sync để bắt key chưa chuyển).

Lần đăng nhập đầu trên máy đã có dữ liệu: cloud trống → upload; cả hai có dữ liệu → **merge tự động** theo bảng trên (không bắt user chọn "giữ máy/giữ cloud", tránh mất tiến trình).

## 5. Luồng & trigger

1. App khởi động → đọc session Supabase (localStorage của SDK) → nếu online: **pull → merge → push**.
2. Sau mỗi phiên ôn tập kết thúc / mỗi `SYNC_DEBOUNCE_MS` khi có thay đổi → push namespace dirty.
3. `visibilitychange: hidden` và sự kiện `online` → flush.
4. Offline → `syncStatus = 'offline'`, giữ cờ dirty, đồng bộ khi có mạng.
5. Đăng xuất → hỏi: giữ dữ liệu trên máy (mặc định) hay xoá khỏi máy này.

Tất cả hằng số (`SYNC_DEBOUNCE_MS`, retry backoff, schema version) đặt trong `SyncConstants.js`; nhãn UI trong `AuthConstants.js`.

## 6. Module mới

| File | Vai trò |
|---|---|
| `src/islands/SyncRegistry.js` | Danh sách `SyncNamespaceDef` — single source of truth key nào được sync |
| `src/islands/SyncSnapshot.js` | Pure: build/apply/merge snapshot (test được bằng node + fake-indexeddb) |
| `src/islands/AuthStore.js` | Signals `AuthState` + Firebase Auth (modular SDK, lazy-load, không làm nặng first paint) |
| `src/islands/CloudAdapter.js` | Interface `pull(namespaces)` / `push(snapshots)` — bản Firestore; thay được bằng provider khác |
| `src/islands/SyncEngine.js` | pull/merge/push, debounce, retry, offline |
| `src/islands/AuthModal.jsx` | Đăng nhập Google / email magic link, icon `lucide-preact` |
| `AppHeader.jsx` (sửa) | Nút avatar + chấm trạng thái sync |
| `BackupSync.jsx` (sửa) | Thêm "Sao lưu toàn bộ" (dùng `SyncSnapshot`) — có ích cả khi không đăng nhập |
| `sw.js` | Không cache request tới `*.googleapis.com` / `*.firebaseapp.com` |

## 7. Lộ trình (mỗi bước = 1 commit, chạy `npm run check`)

| Pha | Nội dung | Release |
|---|---|---|
| 0 | Tạo project Firebase (gói Spark, không thẻ); bật Auth Google + Email link; thêm authorized domain `nguyenhau442001.github.io` + `localhost`; tạo Firestore + deploy rules | — |
| 1 | `SyncRegistry` + `SyncSnapshot` + test merge; nâng cấp export/import thành **backup toàn app** (giá trị ngay, không cần server) | minor |
| 2 | `AuthStore` + `AuthModal` + nút header (đăng nhập/đăng xuất, chưa sync) | minor |
| 3 | `CloudAdapter` (Firestore) + `SyncEngine` pull/merge/push + test (adapter giả trong node) | — |
| 4 | Trigger tự động, trạng thái sync trên UI, offline, SW exclude | minor |
| 5 | Xoá tài khoản & dữ liệu cloud, ghi chú quyền riêng tư trong README, cập nhật HANDOFF | patch |

Rủi ro chính: (1) review log phình to → chia namespace theo level, cắt log cũ khi vượt ngưỡng hằng số; (2) đổi schema key → `schemaVersion` + migration khi apply; (3) chạm quota ngày của Spark → sync báo "tạm dừng", tự thử lại hôm sau, dữ liệu local không ảnh hưởng.

## 8. Quyết định cần chốt

1. **Nhà cung cấp:** ~~chờ chốt~~ → Firebase Spark (miễn phí, không domain, không pause) — chờ xác nhận.
2. **Cách đăng nhập:** Google + email magic link (đề xuất) / chỉ Google.
3. **Phạm vi sync:** chỉ tiến trình học (đề xuất) / cả cài đặt hiển thị (pinyin, Hán Việt, tone colors).
4. **Giữ chế độ khách offline:** có (đề xuất).
