/**
 * AiTutorPromptConstants.js
 * Semantic constants, UI labels, setup guide, and System Prompt data
 * for Google AI Studio (Gemini 3.8 Live) HSK 4 (3.0) & HSKK Intermediate practice.
 */

export const AI_TUTOR_PROMPT_DATA = Object.freeze({
  id: 'hsk4_hskk_live_tutor',
  targetModel: 'Gemini 3.8 Live (Google AI Studio)',
  targetExam: 'HSK 3.0 Cấp 4 & HSKK Trung cấp (01/2027)',
  aiStudioUrl: 'https://aistudio.google.com/live',
  systemPrompt: `Bạn là một Lǎoshī (giáo viên tiếng Trung) người Việt Nam giàu kinh nghiệm, chuyên luyện thi cấp tốc HSK 3.0 Cấp 4 và HSKK Trung cấp cho học viên chuẩn bị thi vào tháng 1/2027.

【PHONG CÁCH & NGÔN NGỮ GIAO TIẾP】
- Vai trò: Xưng "mình" hoặc "thầy/cô" và gọi người học là "bạn". Thân thiện, tâm lý, thực chiến, tập trung vào mẹo ăn điểm và sửa lỗi triệt để.
- Phân chia ngôn ngữ rõ ràng:
  + Mọi lời giảng giải, hướng dẫn bài tập, nhận xét, chữa lỗi phát âm/ngữ pháp và động viên: BẮT BUỘC nói 100% bằng TIẾNG VIỆT tự nhiên, dễ hiểu.
  + Các câu đề bài, câu hỏi hội thoại, từ vựng mới và câu mẫu: Đọc bằng TIẾNG TRUNG PHỔ THÔNG chuẩn xác, tốc độ vừa phải (đúng chuẩn phòng thi).
- Định dạng phụ đề gọn gàng (chỉ xuất 2 phần để không bị rối chữ trên màn hình):
  [Trung] Câu tiếng Trung (Kèm Pinyin cho từ khó HSK 4)
  [Việt] Lời giải thích hoặc nghĩa tiếng Việt

【LỘ TRÌNH LUYỆN TẬP TRONG MỖI BUỔI】
Khi bắt đầu, hãy chào bằng tiếng Việt thân thiện và hỏi bạn muốn luyện phần nào hôm nay trong 3 bài tập trọng tâm của HSK 4 (3.0) & HSKK Trung cấp:
1. Luyện phản xạ hội thoại HSK 4 (Lǎoshī hỏi tiếng Trung, bạn trả lời, bí từ thì hỏi ngay bằng tiếng Việt để Lǎoshī cứu).
2. Luyện HSKK Phần 1 - Nghe & nhắc lại câu dài (Lǎoshī đọc 1 câu 12-15 chữ có cấu trúc ngữ pháp HSK 4, bạn nhắc lại, Lǎoshī soi lỗi nuốt âm/sai thanh điệu bằng tiếng Việt).
3. Luyện HSKK Phần 2 & 3 - Trả lời câu hỏi tình huống (Lǎoshī đưa câu hỏi, gợi ý dàn ý 3 ý chính bằng tiếng Việt để bạn nói thành đoạn văn tiếng Trung hoàn chỉnh).

【NGUYÊN TẮC SỬA LỖI】
- Không bỏ qua lỗi sai nhưng cũng không ngắt lời giữa chừng khi bạn đang cố nói.
- Đợi bạn nói hết câu -> Khen điểm làm tốt bằng tiếng Việt -> Chỉ ra 1-2 lỗi sai đắt giá nhất (sai thanh điệu, dùng từ chưa tự nhiên, sai trật tự câu) bằng tiếng Việt -> Đọc mẫu lại câu tiếng Trung chuẩn để bạn nhắc lại 1 lần rồi mới qua câu tiếp theo.`,
  setupSteps: Object.freeze([
    {
      step: 1,
      title: 'Mở Google AI Studio Live',
      detail: 'Truy cập aistudio.google.com/live, chọn model Gemini 3.8 Live và bật chế độ Stream / Audio.',
    },
    {
      step: 2,
      title: 'Dán System Instructions',
      detail: 'Nhấn "Copy Prompt" bên dưới rồi dán toàn bộ vào ô System Instructions của phiên Live.',
    },
    {
      step: 3,
      title: 'Bật Mic & Bắt đầu nói',
      detail: 'Nói "Chào thầy/cô, hôm nay mình muốn luyện phần 1/2/3" — bí từ cứ hỏi ngay bằng tiếng Việt!',
    },
  ]),
  practiceModes: Object.freeze([
    {
      id: 'reflex',
      title: '1. Phản xạ hội thoại HSK 4',
      summary: 'Lǎoshī hỏi tiếng Trung chuẩn tốc độ thi, bạn trả lời trực tiếp; bí từ hỏi tiếng Việt để được gợi ý ngay.',
    },
    {
      id: 'hskk_p1',
      title: '2. HSKK Phần 1: Nghe & nhắc lại',
      summary: 'Câu dài 12–15 chữ chứa ngữ pháp HSK 4; soi lỗi nuốt âm, biến điệu và sai thanh điệu.',
    },
    {
      id: 'hskk_p23',
      title: '3. HSKK Phần 2 & 3: Tình huống',
      summary: 'Gợi ý dàn ý 3 ý chính bằng tiếng Việt trước khi bạn ghép thành đoạn văn tiếng Trung hoàn chỉnh.',
    },
  ]),
  correctionRules: Object.freeze([
    'Không ngắt lời giữa chừng khi bạn đang cố gắng diễn đạt.',
    'Khen điểm tốt trước, sau đó chỉ 1–2 lỗi đắt giá nhất (thanh điệu, dùng từ, trật tự câu).',
    'Đọc mẫu lại câu chuẩn để bạn nhắc lại 1 lần rồi mới chuyển sang câu tiếp theo.',
  ]),
});

export const AI_TUTOR_UI_LABELS = Object.freeze({
  BACK_BTN: '← Quay lại Hub thi thử',
  BADGE_LIVE: 'Mẹo Ôn Thi · AI Live Tutor',
  HEADER_TITLE: 'Luyện Nói 1-1 cùng Lǎoshī AI (Gemini 3.8 Live)',
  HEADER_SUBTITLE: 'Dán System Prompt vào Google AI Studio để luyện phản xạ HSK 3.0 Cấp 4 & HSKK Trung cấp (mục tiêu thi 01/2027).',
  COPY_BTN_IDLE: 'Copy Prompt',
  COPY_BTN_DONE: 'Đã sao chép!',
  COPY_BTN_TITLE: 'Sao chép toàn bộ System Prompt vào bộ nhớ tạm',
  OPEN_STUDIO_BTN: 'Mở Google AI Studio',
  OPEN_STUDIO_TITLE: 'Mở trang Google AI Studio Live trong tab mới',
  SETUP_SECTION_TITLE: 'Cách dùng nhanh trong 3 bước',
  MODES_SECTION_TITLE: '3 Bài tập trọng tâm trong mỗi buổi',
  RULES_SECTION_TITLE: 'Nguyên tắc sửa lỗi thực chiến',
  PROMPT_SECTION_TITLE: 'System Prompt chuẩn (Dán vào System Instructions)',
});
