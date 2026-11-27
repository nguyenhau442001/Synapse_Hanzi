# Kế hoạch: Đăng nhập & đồng bộ tiến trình (Auth + Cloud Sync)

> Trạng thái: **Đã chốt — pha 1 xong (v3.72.0), chờ pha 0 (tạo Firebase) + duyệt mockup UI** (2026-11-27). Ràng buộc: miễn phí, không mua domain, chỉ đăng nhập Google.

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
- Không cần thẻ/billing account. Đăng nhập Google miễn phí. (Email link bị loại: Spark chỉ gửi **5 email/ngày** — xem §10.)
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
 * Signed-in user profile (from Firebase Auth, never stored by the app itself).
 * @typedef {Object} AuthUser
 * @property {string} id                Firebase uid.
 * @property {string|null} email
 * @property {string|null} displayName
 * @property {string|null} avatarUrl
 */

/**
 * Reactive auth/sync state (Preact Signals store, like HeaderStore.js).
 * @typedef {Object} AuthState
 * @property {'guest'|'signing_in'|'signed_in'} status
 * @property {AuthUser|null} user
 * @property {'idle'|'syncing'|'synced'|'offline'|'error'} syncStatus
 * @property {string|null} lastSyncedAt  ISO time of last successful sync.
 * @property {string|null} errorMessage  User-facing message constant, never raw error text.
 */
```

Firestore: `users/{uid}/snapshots/{namespace}` → 1 document = 1 `SyncSnapshot`. Trường `data` lưu dưới dạng **chuỗi JSON** để rules kiểm tra được kích thước (giới hạn 1 MiB/document → review log chia theo level, cắt log cũ khi vượt ngưỡng hằng số).

```js
// firestore.rules — each user can only read/write their own documents.
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Owner-only access; strict shape and size checks on every write; everything else denied.
    match /users/{uid}/snapshots/{namespace} {
      allow read, delete: if request.auth != null && request.auth.uid == uid;
      allow create, update: if request.auth != null && request.auth.uid == uid
        && namespace.matches('^[a-z_]+(:[a-z0-9_-]+){0,2}$')
        && request.resource.data.keys().hasOnly(['schemaVersion', 'deviceId', 'updatedAt', 'data'])
        && request.resource.data.schemaVersion is int
        && request.resource.data.deviceId is string && request.resource.data.deviceId.size() <= 64
        && request.resource.data.updatedAt == request.time
        && request.resource.data.data is string && request.resource.data.data.size() <= 900000;
    }
  }
}
```

Firebase web config (apiKey…) là public theo thiết kế; bảo mật nằm ở rules trên + khoá API key theo domain (§11). App Check (reCAPTCHA v3) là tuỳ chọn, bật sau khi có người dùng thật.

**Không sync** (thuộc về thiết bị): `hsk_theme*`, `hsk_sidebar_tab`, `hsk_pwa_install_dismissed_until`, `hsk_welcome_dismissed`, `hsk_dexie_migration_v1`, model giọng nói/audio cache.

## 4. Quy tắc merge (non-trivial logic)

| Strategy | Áp dụng | Quy tắc |
|---|---|---|
| `srs_cards` | Thẻ FSRS | Theo từng `wordId`: giữ thẻ có `last_review` mới hơn; hoà → `reps` lớn hơn. Không bao giờ để thẻ đã học bị thẻ `New` ghi đè. |
| `append_log` | Review log, lịch sử thi, activity/streak | Hợp nhất + khử trùng lặp theo khoá (tái dùng logic dedupe của `appendImportedReviewLog`). |
| `lww` | Cài đặt học, giáo trình, luyện viết… | Last-write-wins theo `updatedAt` của namespace. |

`updatedAt` mỗi namespace lấy từ `hsk_sync_meta_v1` — một wrapper ghi trung tâm đánh dấu namespace "dirty" khi key thuộc registry thay đổi (không sửa từng island; hook vào `Storage.prototype.setItem` là hack → thay vào đó gom ghi qua `StorageEngine`/helper `persist(key, value)` dần dần, kèm quét diff hash lúc sync để bắt key chưa chuyển).

Lần đăng nhập đầu trên máy đã có dữ liệu: cloud trống → upload; cả hai có dữ liệu → **merge tự động** theo bảng trên (không bắt user chọn "giữ máy/giữ cloud", tránh mất tiến trình).

## 4b. Thuật toán SyncEngine (pha 3)

- State thiết bị `hsk_sync_state_v1` (theo uid): `deviceId`, `lastPulledAt`, `hashes` (SHA-256 từng key lúc sync gần nhất), `pushed` (hash bản đã đẩy).
- Pull: chỉ document có `updatedAt > lastPulledAt` (giờ server, rules bắt `updatedAt == request.time` → lệch đồng hồ máy không làm sót).
- Chọn dữ liệu nhận: bỏ key ngoài namespace/không hợp lệ/schema mới hơn; bỏ nếu hash trùng lần sync trước hoặc trùng bản mình đã đẩy; nếu cả hai phía cùng sửa: thẻ FSRS & log → gộp, `lww` → giữ bản máy này rồi đẩy lên.
- Push: chỉ namespace có key đổi hash; bản đẩy bỏ thẻ chưa học, log giữ 3.000 mục mới nhất; namespace vượt 900 KB → bỏ qua và báo `skipped`.
- State chỉ lưu sau khi push thành công → lỗi mạng thì lần sau thử lại.
- Có dữ liệu mới áp vào máy → tải lại trang 1 lần/phiên để các island đọc lại.
- Hạn chế đã biết: `hsk_study_activity_v1` (streak) là `lww` → hai máy học cùng ngày thì một máy thắng; pha 4 cân nhắc gộp theo ngày.

## 5. Luồng & trigger

1. App khởi động → nếu cờ thiết bị `hsk_auth_session_v1` bật thì lazy-load Firebase SDK, khôi phục phiên → nếu online: **pull → merge → push**. Khách không tải SDK.
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
| `src/islands/AuthModal.jsx` | Đăng nhập Google (popup), icon `lucide-preact` — UI theo mockup đã duyệt |
| `AppHeader.jsx` (sửa) | Nút avatar + chấm trạng thái sync |
| `BackupSync.jsx` (sửa) | Thêm "Sao lưu toàn bộ" (dùng `SyncSnapshot`) — có ích cả khi không đăng nhập |
| `sw.js` | Không cache request tới `*.googleapis.com` / `*.firebaseapp.com` |

## 7. Lộ trình (mỗi bước = 1 commit, chạy `npm run check`)

| Pha | Nội dung | Release |
|---|---|---|
| 0 | Người dùng làm theo checklist §11 (Firebase Spark, Google sign-in, Firestore, rules, khoá API key) | — |
| 1 ✅ | `SyncRegistry` + `SyncSnapshot` + test merge; nâng cấp export/import thành **backup toàn app** (giá trị ngay, không cần server) | minor (v3.72.0) |
| 2 ✅ | `AuthStore` + `AuthModal` + nút header (đăng nhập/đăng xuất, chưa sync) | minor (v3.73.0) |
| 3 ✅ | `FirestoreCloudAdapter` (Firestore Lite) + `SyncEngine` pull/merge/push + `SyncController` (sync khi bắt đầu phiên) + test 2 thiết bị | — |
| 4 | Trigger tự động, trạng thái sync trên UI, offline, SW exclude | minor |
| 5 | Xoá tài khoản & dữ liệu cloud, ghi chú quyền riêng tư trong README, cập nhật HANDOFF | patch |

Rủi ro chính: (1) review log phình to → chia namespace theo level, cắt log cũ khi vượt ngưỡng hằng số; (2) đổi schema key → `schemaVersion` + migration khi apply; (3) chạm quota ngày của Spark → sync báo "tạm dừng", tự thử lại hôm sau, dữ liệu local không ảnh hưởng.

## 8. Bảo mật & quyền riêng tư (chống bị hack)

| Mối đe doạ | Biện pháp | Pha |
|---|---|---|
| File sao lưu/cloud bị sửa để ghi key tuỳ ý (XSS lưu trữ, ghi đè token) | Allowlist `SyncRegistry`: chỉ ghi key tiến trình; key lạ, `__proto__`/`constructor`, giá trị sai kiểu đều bị bỏ | 1 ✅ |
| File khổng lồ làm treo app | Giới hạn kích thước file, số entry, độ dài mỗi giá trị (`SyncConstants.js`) | 1 ✅ |
| Thẻ FSRS độc hại / hỏng | Chuẩn hoá qua `SRS.serializeCard`; thẻ lỗi bị loại; merge không để thẻ chưa học ghi đè thẻ đã học | 1 ✅ |
| Ghi dở dang khi đầy bộ nhớ | Tính toàn bộ trước, ghi sau, lỗi thì rollback mọi key | 1 ✅ |
| Đọc/ghi dữ liệu người khác trên cloud | Firestore rules `request.auth.uid == uid`; test rules bằng Firebase emulator trước khi deploy | 3 |
| Lạm dụng quota/API key public | Giới hạn API key theo HTTP referrer `nguyenhau442001.github.io/*` + `localhost`; App Check tuỳ chọn | 0 |
| Ghi rác/quá cỡ vào Firestore | Rules kiểm tra tên namespace, đúng 4 trường, kiểu dữ liệu, `data` ≤ 900 KB | 0/3 |
| Chiếm phiên đăng nhập qua redirect giả | Chỉ để authorized domains là github.io + localhost; xoá domain mặc định không dùng | 0 |
| XSS đánh cắp phiên | Không render dữ liệu người dùng bằng `innerHTML`; thêm Content-Security-Policy (`<meta>`) giới hạn script/connect tới self + Google/Firebase | 2 |
| Thu thập dữ liệu quá mức | Chỉ lưu tiến trình học + uid/email do Firebase quản lý; tên hiển thị (`personal`) chỉ sync khi đã đăng nhập; không analytics theo user | 2–3 |
| Quyền được xoá dữ liệu | Nút "Xoá tài khoản & dữ liệu cloud" (xoá `users/{uid}` rồi `deleteUser`) | 5 |

Không có mật khẩu: chỉ Google OAuth → không có kho mật khẩu để bị lộ, không phải gửi email. App chỉ yêu cầu scope cơ bản (`openid email profile`) → không cần Google xét duyệt OAuth.

## 9. Quyết định đã chốt (2026-11-27)

1. **Nhà cung cấp:** Firebase Spark (miễn phí, không mua domain, không pause).
2. **Cách đăng nhập:** chỉ Google (popup). Email link loại vì Spark chỉ gửi 5 email/ngày; email/mật khẩu không chọn.
3. **Phạm vi sync:** chỉ tiến trình học (theo `SyncRegistry`); cài đặt giao diện ở lại từng thiết bị.
4. **Chế độ khách offline:** giữ nguyên.
5. **Mã hoá:** dùng mã hoá của Google (TLS khi truyền, AES-256 khi lưu) + rules chủ sở hữu; **không** mã hoá đầu-cuối (tránh rủi ro mất mã khôi phục).
6. **UI:** mockup trên Design canvas, duyệt trước khi code.

## 10. Chi phí, quy mô & định dạng dữ liệu

Giới hạn Spark (trang Firebase Auth limits / Firestore pricing, 2026-11):

| Hạng mục | Spark (miễn phí) | Blaze (trả theo mức dùng) |
|---|---|---|
| Người dùng Google hoạt động/ngày (không gắn thẻ) | 3.000 | Theo bảng giá Identity Platform |
| Tổng tài khoản | Không giới hạn | Không giới hạn |
| Firestore ghi / đọc mỗi ngày | 20.000 / 50.000 | ~$0,09 / 100k ghi, ~$0,03 / 100k đọc |
| Lưu trữ Firestore | 1 GiB | Theo GB |
| Email link sign-in | 5 email/ngày → **không dùng** | 25.000/ngày |

Ước tính: mỗi người dùng ~3 lượt ghi/ngày (gộp theo phiên) → nghẽn đầu tiên là 3.000 người dùng/ngày. Vượt mức → gắn thẻ lên Blaze; 10.000 người dùng/ngày ước khoảng vài USD/tháng cho Firestore. Lối thoát không tốn tiền ở mọi quy mô: thay `CloudAdapter` bằng Google Drive `appDataFolder` (dữ liệu trong Drive của từng người dùng).

Định dạng & mã hoá:
- Trên máy: localStorage, chuỗi JSON, không mã hoá (trình duyệt cô lập theo origin). File sao lưu: `.json`.
- Trên cloud: document Firestore `{ schemaVersion, deviceId, updatedAt, data: "<JSON>" }`; TLS khi truyền, AES-256 do Google quản lý khi lưu; chỉ chủ tài khoản truy cập qua rules. Chủ project vẫn xem được trong Firebase Console (không phải E2E).

## 11. Pha 0 — Checklist tạo Firebase (người dùng làm, ~15 phút, không cần thẻ)

1. Vào https://console.firebase.google.com → **Create a project** → tên `hanzi-mind` → **tắt Google Analytics** (không cần, ít thu thập dữ liệu hơn).
2. **Project settings → General → Your apps → Web (`</>`)**: đặt nickname `hanzi-mind-web`, **không** tick Firebase Hosting → Register → copy khối `firebaseConfig`.
3. **Build → Authentication → Get started → Sign-in method → Google → Enable**: chọn support email → Save. Không bật provider nào khác.
4. **Authentication → Settings → Authorized domains**: thêm `nguyenhau442001.github.io`; giữ `localhost` và `<project>.firebaseapp.com` (cần cho popup Google).
5. **Build → Firestore Database → Create database**: Standard edition, location `asia-southeast1` (Singapore, gần Việt Nam), chọn **production mode** (mặc định từ chối mọi truy cập).
6. **Firestore → Rules**: dán rules ở §3 → **Publish**.
7. **Google Cloud Console → APIs & Services → Credentials** (cùng project) → mở key *Browser key (auto created by Firebase)* → *Application restrictions: Websites* → thêm `https://nguyenhau442001.github.io/*`, `http://localhost:*/*`, `http://127.0.0.1:*/*` → Save.
8. **Google Cloud Console → Google Auth Platform → Branding**: tên app `Hanzi Mind`, logo, link trang chủ `https://nguyenhau442001.github.io/Synapse_Hanzi/`, support email. Audience: *External*, **Publish app** (scope cơ bản nên không cần xét duyệt).
9. **Không** gắn billing (giữ Spark).
10. Gửi lại khối `firebaseConfig` (apiKey, authDomain, projectId, appId) — thông tin public, sẽ nằm trong `src/islands/FirebaseConfig.js`.

