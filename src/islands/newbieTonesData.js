/**
 * newbieTonesData.js
 * Structured pedagogical data for Mandarin tones, Chao scale notation,
 * Vietnamese learner traps, and verified prebuilt audio exemplars.
 */

export const NEWBIE_TONES_DATA = [
  {
    id: 1,
    name: 'Thanh 1 (Âm Bình / 阴平)',
    chao: '55',
    pitchName: 'Cao & Bằng Phẳng',
    color: '#2563eb',
    bgLight: 'rgba(37, 99, 235, 0.08)',
    borderLight: 'rgba(37, 99, 235, 0.25)',
    summary: 'Bắt đầu ở cao độ 5 (đỉnh cao) và giữ thẳng băng suốt âm tiết, không lên cũng không xuống.',
    analogy: 'Như đang ngân một nốt nhạc cao trong dàn hợp xướng. Hơi thở đều, giọng trong trẻo và ngân dài.',
    vietnameseTrap: 'Người Việt hay vô thức thả lỏng hơi ở cuối từ khiến cao độ rơi xuống thành dấu huyền (bā → bà). Hãy giữ vững cao độ đến giây cuối cùng!',
    exemplars: [
      { hanzi: '八', pinyin: 'bā', hanviet: 'Bát', meaning: 'số 8' },
      { hanzi: '天', pinyin: 'tiān', hanviet: 'Thiên', meaning: 'bầu trời / ngày' },
      { hanzi: '妈妈', pinyin: 'māma', hanviet: 'Ma ma', meaning: 'mẹ' }
    ]
  },
  {
    id: 2,
    name: 'Thanh 2 (Dương Bình / 阳平)',
    chao: '35',
    pitchName: 'Vuốt Lên Cao',
    color: '#0d9488',
    bgLight: 'rgba(13, 148, 136, 0.08)',
    borderLight: 'rgba(13, 148, 136, 0.25)',
    summary: 'Bắt đầu ở cao độ 3 (giọng nói bình thường) rồi vuốt vút lên mức 5 (đỉnh cao nhất).',
    analogy: 'Giống như khi bạn ngạc nhiên hỏi: "Hả?", "Gì cơ?". Cao độ đi dốc đều từ lưng chừng lên tới đỉnh.',
    vietnameseTrap: 'Khác dấu sắc tiếng Việt! Dấu sắc tiếng Việt sắc lẹm và ngắn giật; thanh 2 tiếng Trung vuốt dài và đều đặn hơn nhiều.',
    exemplars: [
      { hanzi: '白', pinyin: 'bái', hanviet: 'Bạch', meaning: 'màu trắng' },
      { hanzi: '十', pinyin: 'shí', hanviet: 'Thập', meaning: 'số 10' },
      { hanzi: '时', pinyin: 'shí', hanviet: 'Thời', meaning: 'thời gian / lúc' }
    ]
  },
  {
    id: 3,
    name: 'Thanh 3 (Thượng Thanh / 上声)',
    chao: '214',
    pitchName: 'Hạ Sâu Xuống Đáy Cổ',
    color: '#d97706',
    bgLight: 'rgba(217, 119, 6, 0.08)',
    borderLight: 'rgba(217, 119, 6, 0.25)',
    summary: 'Bắt đầu ở mức 2, dìm giọng thật sâu xuống đáy cổ họng ở mức 1, rồi hơi hất nhẹ lên mức 4.',
    analogy: 'Âm trầm nhất trong tiếng Trung. Chìa khóa vàng là: PHẢI DÌM GIỌNG XUỐNG ĐÁY CỔ HỌNG (mức 1).',
    vietnameseTrap: 'Người Việt hay đọc thành dấu hỏi cộc cằn ("bải"). Trong thực tế đàm thoại, chỉ cần phát âm phần hạ xuống (2→1), không cần luyến đuôi quá gượng.',
    exemplars: [
      { hanzi: '百', pinyin: 'bǎi', hanviet: 'Bách', meaning: 'một trăm' },
      { hanzi: '雨', pinyin: 'yǔ', hanviet: 'Vũ', meaning: 'cơn mưa' },
      { hanzi: '买', pinyin: 'mǎi', hanviet: 'Mãi', meaning: 'mua sắm' }
    ]
  },
  {
    id: 4,
    name: 'Thanh 4 (Khứ Thanh / 去声)',
    chao: '51',
    pitchName: 'Rơi Dốc Thẳng Đứng',
    color: '#dc2626',
    bgLight: 'rgba(220, 38, 38, 0.08)',
    borderLight: 'rgba(220, 38, 38, 0.25)',
    summary: 'Bắt đầu từ đỉnh cao vút 5 và rơi dốc tự do cắm thẳng xuống đáy 1 cực kỳ dứt khoát!',
    analogy: 'Giống như khi gật đầu dứt khoát ra lệnh: "Đi!", hoặc quả táo rơi cắm thẳng từ cành cao xuống đất.',
    vietnameseTrap: '⚠️ BẪY TỬ HUYỆT! 90% người Việt đọc nhầm thành dấu sắc ("bán", "xí"). Tuyệt đối KHÔNG ĐƯỢC LÊN GIỌNG, hãy chém dứt khoát từ trên xuống!',
    exemplars: [
      { hanzi: '半', pinyin: 'bàn', hanviet: 'Bán', meaning: 'một nửa' },
      { hanzi: '电', pinyin: 'diàn', hanviet: 'Điện', meaning: 'điện / tia chớp' },
      { hanzi: '卖', pinyin: 'mài', hanviet: 'Mại', meaning: 'bán hàng' },
      { hanzi: '是', pinyin: 'shì', hanviet: 'Thị', meaning: 'là / phải' }
    ]
  },
  {
    id: 5,
    name: 'Thanh Nhẹ (Khinh Thanh / 轻声)',
    chao: 'Neutral',
    pitchName: 'Nhẹ & Ngắn Buông Lỏng',
    color: '#7c3aed',
    bgLight: 'rgba(124, 58, 237, 0.08)',
    borderLight: 'rgba(124, 58, 237, 0.25)',
    summary: 'Phát âm cực ngắn, thanh thoát và buông lỏng, không nhấn trọng âm.',
    analogy: 'Như một giọt nước rơi nhẹ khẽ chạm mặt hồ.',
    vietnameseTrap: 'Không kéo dài âm tiết. Luôn đọc lướt nhanh như âm đệm phía sau từ chính.',
    exemplars: [
      { hanzi: '吗', pinyin: 'ma', hanviet: 'Ma', meaning: 'chăng / không (hỏi)' },
      { hanzi: '爸爸', pinyin: 'bàba', hanviet: 'Bá bá', meaning: 'bố / cha' }
    ]
  }
];
