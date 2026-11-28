# Bảng xếp hạng tuần (League)

Trạng thái: pha 1 (lõi, luật, cloud) và pha 2 (giao diện, nguồn XP) đã xong. Mockup đã duyệt (bản 3): https://claude.ai/artifact/K7VARiANKzq1efHY6qgcqt

## Quyết định

- Firebase Spark, không có Cloud Functions: XP do client ghi lên, chặn gian lận bằng `firestore.rules`.
- Bảng toàn cầu theo tuần (top 50 + hạng của bạn). Bảng bạn bè để sau.
- Mặc định tắt (opt-in). Chỉ công khai biệt danh, ấn triện chữ Hán và XP tuần. Không bao giờ hiện email hay ảnh Google.

## Dữ liệu

Firestore `leagues/{weekNo}/entries/{uid}`:

| Trường | Ý nghĩa |
|---|---|
| `uid` | Bằng id trong đường dẫn và `request.auth.uid` |
| `nickname` | 2–20 ký tự: chữ (mọi hệ chữ), số, khoảng trắng, `_ . -` |
| `avatar` | Id ấn triện: crane, dragon, tiger, bear, bamboo, plum, pine, rabbit |
| `xp` | XP tuần, chỉ tăng (ghi bằng `increment()`, nhiều máy không ghi đè nhau) |
| `updatedAt` | Giờ server, dùng để giới hạn tốc độ ghi |
| `schemaVersion` | 1 |

`weekNo = floor((ms + 7 giờ + 3 ngày) / 7 ngày)`: tuần đổi lúc 00:00 thứ Hai giờ Việt Nam. Luật Firestore tính lại cùng công thức nên chỉ tuần hiện tại ghi được.

Trên máy:
- `hsk_league_profile_v1` (đồng bộ, namespace `league`): `{ optedIn, nickname, avatar, weeks }`. `weeks` là danh sách tuần đã ghi, dùng để xoá khi rời bảng hoặc xoá tài khoản.
- `hsk_league_ledger_v1` (chỉ máy này): XP chưa tải lên, thời điểm ghi gần nhất, các phần thưởng một lần.

## Luật chống gian lận

Ghi tối đa 300 XP mỗi lần, cách nhau ít nhất 20 giây, tối đa 25.000 XP mỗi tuần. Chỉ chủ tài khoản ghi hoặc xoá được dòng của mình. Đọc: mọi người đã đăng nhập.

Luật nằm ở `firestore.rules`. Sau mỗi lần sửa phải dán lại vào Firebase Console → Firestore Database → Rules → Publish.

## Nguồn XP

Các tính năng học chỉ phát sự kiện `hanzi:learning-activity` qua `LeagueActivity.js`; `LeagueService.js` đổi thành XP khi người dùng đã tham gia.

| Hoạt động | XP | Nơi phát |
|---|---|---|
| Chấm một thẻ (mọi chế độ, kể cả Ôn nhanh) | 2 | `StorageEngine.reviewSrsCard` |
| Câu đúng ở Speed Quiz | 1 | `SpeedQuizGame.pickSpeedQuizOption` |
| Lần đầu xong một bài giáo trình | 15 | `Curriculum.recordQuizResult` |
| Nộp đề thi HSK / HSKK | 30 | `Hsk30ExamView` |
| Đạt mục tiêu ngày (1 lần/ngày) | 20 | `Levels.recordDailyStudy` |
| Chuỗi 7 / 30 / 100 ngày | 50 / 150 / 500 | `Levels.recordDailyStudy` |

## Số liệu hiển thị

- XP cần để vượt = XP người ngay trên − XP của bạn + 1.
- Số thẻ gợi ý = làm tròn lên (XP cần ÷ 2).
- Hạng ngoài top 50 = số người có XP lớn hơn + 1 (truy vấn đếm).
- Mỗi lần mở bảng tốn khoảng 53 lượt đọc, có cache 5 phút.
