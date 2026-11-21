#!/usr/bin/env python3
"""
tools/build_manga_doraemon_data.py
Builds Doraemon manga metadata and interactive hotspot JSON files for Synapse_Hanzi.

NOTE: the per-page `dialogues` / `word_hotspots` written here are placeholders.
The real balloon text, translations and glyph-accurate word hotspots come from
    tools/manga_ocr.py              (PP-OCRv5 glyph boxes → ocr/<id>.ocr.json)
    tools/build_manga_word_layer.py (transcripts/<id>.json + OCR → story JSON)
Always run build_manga_word_layer.py after this script.
"""

import json
import os
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
MANGA_DIR = REPO_ROOT / "database" / "readings" / "manga" / "doraemon"
MANGA_DIR.mkdir(parents=True, exist_ok=True)

# -----------------------------------------------------------------------------
# STORY 1: 没有雪也可滑雪 (Skiing Without Snow)
# -----------------------------------------------------------------------------
story1 = {
    "id": "doraemon_manga_001",
    "series": "doraemon",
    "series_title": "哆啦A梦",
    "series_title_vi": "Đô-rê-mon",
    "chapter_no": 1,
    "title": {
        "zh": "没有雪也可滑雪",
        "zh_trad": "沒有雪也可滑雪",
        "vi": "Không Có Tuyết Vẫn Có Thể Trượt Tuyết",
        "pinyin": "Méi yǒu xuě yě kě huáxuě"
    },
    "description_vi": "Mùa đông nhưng thành phố không hề có tuyết rơi. Thấy Suneo khoe khoang được đi trượt tuyết trên núi, Nobita nằng nặc đòi Doraemon đưa bảo bối để trượt tuyết ngay tại khu phố!",
    "cover_image": "assets/images/readings/manga/doraemon/skiing/page_01.webp",
    "source": "《哆啦A梦》第21卷 · 原作：藤子·F·不二雄 · 小学馆 / 香港文化传信",
    "source_credits": "Bản quyền nguyên tác thuộc Fujiko Pro & Shogakukan. Sử dụng làm tư liệu đối chiếu học tập tiếng Trung phi thương mại.",
    "page_count": 9,
    "difficulty": "HSK 2 - 3 (Hội thoại đời sống thường nhật)",
    "estimatedMinutes": 8,
    "pages": [
        {
            "page_num": 1,
            "image": "assets/images/readings/manga/doraemon/skiing/page_01.webp",
            "dialogues": [
                {
                    "id": "p1_d1",
                    "character": "大雄 (Nobita)",
                    "bbox": {"x": 69.5, "y": 5.5, "width": 5.0, "height": 14.0},
                    "zh": "春天到了。",
                    "zh_trad": "春天到了。",
                    "pinyin": "Chūntiān dào le.",
                    "vi": "Mùa xuân đã đến rồi.",
                    "tokens": [
                        {"text": "春天", "pinyin": "chūntiān", "hanviet": "Xuân Thiên", "meaning_vi": "mùa xuân", "hsk": 2},
                        {"text": "到了", "pinyin": "dào le", "hanviet": "Đáo Liễu", "meaning_vi": "đã đến rồi", "hsk": 1}
                    ]
                },
                {
                    "id": "p1_d2",
                    "character": "大雄 (Nobita)",
                    "bbox": {"x": 36.0, "y": 6.0, "width": 5.0, "height": 16.0},
                    "zh": "春天又来临了……",
                    "zh_trad": "春天又來臨了……",
                    "pinyin": "Chūntiān yòu láilín le...",
                    "vi": "Mùa xuân lại tới nữa rồi...",
                    "tokens": [
                        {"text": "春天", "pinyin": "chūntiān", "hanviet": "Xuân Thiên", "meaning_vi": "mùa xuân", "hsk": 2},
                        {"text": "又", "pinyin": "yòu", "hanviet": "Hựu", "meaning_vi": "lại", "hsk": 2},
                        {"text": "来临", "pinyin": "láilín", "hanviet": "Lai Lâm", "meaning_vi": "đến, tới", "hsk": 4}
                    ]
                },
                {
                    "id": "p1_d3",
                    "character": "大雄 (Nobita)",
                    "bbox": {"x": 76.0, "y": 48.0, "width": 16.0, "height": 22.0},
                    "zh": "本想在这个冬天学懂滑雪的，但想不到春天这么快便来临了。",
                    "zh_trad": "本想在這個冬天學懂滑雪的，但想不到春天這麼快便來臨了。",
                    "pinyin": "Běn xiǎng zài zhège dōngtiān xuédǒng huáxuě de, dàn xiǎngbudào chūntiān zhème kuài biàn láilín le.",
                    "vi": "Định bụng mùa đông này tập cho biết trượt tuyết, vậy mà chẳng ngờ mùa xuân lại tới nhanh đến thế.",
                    "tokens": [
                        {"text": "本想", "pinyin": "běn xiǎng", "hanviet": "Bản Tưởng", "meaning_vi": "định bụng, vốn nghĩ", "hsk": 3},
                        {"text": "冬天", "pinyin": "dōngtiān", "hanviet": "Đông Thiên", "meaning_vi": "mùa đông", "hsk": 2},
                        {"text": "滑雪", "pinyin": "huáxuě", "hanviet": "Hoạt Tuyết", "meaning_vi": "trượt tuyết", "hsk": 3},
                        {"text": "想不到", "pinyin": "xiǎngbudào", "hanviet": "Tưởng Bất Đáo", "meaning_vi": "chẳng ngờ, không ngờ tới", "hsk": 3},
                        {"text": "这么快", "pinyin": "zhème kuài", "hanviet": "Giá Ma Khoái", "meaning_vi": "nhanh như vậy", "hsk": 2}
                    ]
                },
                {
                    "id": "p1_d4",
                    "character": "哆啦A梦 (Doraemon)",
                    "bbox": {"x": 44.0, "y": 48.0, "width": 5.0, "height": 18.0},
                    "zh": "只怪你不好好练习。",
                    "zh_trad": "只怪你不好好練習。",
                    "pinyin": "Zhǐ guài nǐ bù hǎohǎo liànxí.",
                    "vi": "Chỉ trách cậu không chịu chăm chỉ luyện tập mà thôi.",
                    "tokens": [
                        {"text": "只怪", "pinyin": "zhǐ guài", "hanviet": "Chỉ Quái", "meaning_vi": "chỉ trách", "hsk": 3},
                        {"text": "好好", "pinyin": "hǎohǎo", "hanviet": "Hảo Hảo", "meaning_vi": "chăm chỉ, nghiêm túc", "hsk": 2},
                        {"text": "练习", "pinyin": "liànxí", "hanviet": "Luyện Tập", "meaning_vi": "luyện tập", "hsk": 3}
                    ]
                },
                {
                    "id": "p1_d5",
                    "character": "大雄 (Nobita)",
                    "bbox": {"x": 21.0, "y": 48.0, "width": 9.0, "height": 21.0},
                    "zh": "若最初肯用心练习便好了。",
                    "zh_trad": "若最初肯用心練習便好了。",
                    "pinyin": "Ruò zuìchū kěn yòngxīn liànxí biàn hǎo le.",
                    "vi": "Giá như lúc đầu mình chịu dụng tâm luyện tập thì tốt rồi.",
                    "tokens": [
                        {"text": "最初", "pinyin": "zuìchū", "hanviet": "Tối Sơ", "meaning_vi": "lúc đầu, ban đầu", "hsk": 4},
                        {"text": "肯", "pinyin": "kěn", "hanviet": "Khẳng", "meaning_vi": "chịu, bằng lòng", "hsk": 3},
                        {"text": "用心", "pinyin": "yòngxīn", "hanviet": "Dụng Tâm", "meaning_vi": "dụng tâm, chú tâm", "hsk": 3},
                        {"text": "练习", "pinyin": "liànxí", "hanviet": "Luyện Tập", "meaning_vi": "luyện tập", "hsk": 3}
                    ]
                }
            ]
        },
        {
            "page_num": 2,
            "image": "assets/images/readings/manga/doraemon/skiing/page_02.webp",
            "dialogues": [
                {
                    "id": "p2_d1",
                    "character": "小夫 (阿福)",
                    "bbox": {"x": 58.0, "y": 14.0, "width": 32.0, "height": 22.0},
                    "zh": "我们全家要去滑雪场度假，那里的雪景美极了！",
                    "zh_trad": "我們全家要去滑雪場度假，那裏的雪景美極了！",
                    "pinyin": "Wǒmen quánjiā yào qù huáxuěchǎng dùjià, nàlǐ de xuějǐng měi jí le!",
                    "vi": "Cả nhà tớ sắp đi nghỉ mát ở khu trượt tuyết, cảnh tuyết ở đấy đẹp tuyệt trần luôn!",
                    "tokens": [
                        {"text": "全家", "pinyin": "quánjiā", "hanviet": "Toàn Gia", "meaning_vi": "cả gia đình", "hsk": 2},
                        {"text": "滑雪场", "pinyin": "huáxuěchǎng", "hanviet": "Hoạt Tuyết Trường", "meaning_vi": "khu trượt tuyết", "hsk": 3},
                        {"text": "度假", "pinyin": "dùjià", "hanviet": "Độ Giả", "meaning_vi": "nghỉ mát, nghỉ lễ", "hsk": 4},
                        {"text": "美极了", "pinyin": "měi jí le", "hanviet": "Mỹ Cực Liễu", "meaning_vi": "đẹp vô cùng", "hsk": 2}
                    ]
                },
                {
                    "id": "p2_d2",
                    "character": "大雄",
                    "bbox": {"x": 16.0, "y": 68.0, "width": 28.0, "height": 20.0},
                    "zh": "真羡慕啊……要是我也能去滑雪就好了。",
                    "zh_trad": "真羨慕啊……要是我也能去滑雪就好了。",
                    "pinyin": "Zhēn xiànmù a... Yàoshi wǒ yě néng qù huáxuě jiù hǎo le.",
                    "vi": "Ghen tị thật đấy... Giá như mình cũng được đi trượt tuyết thì tốt biết mấy.",
                    "tokens": [
                        {"text": "羡慕", "pinyin": "xiànmù", "hanviet": "Tiện Mộ", "meaning_vi": "ghen tị, ngưỡng mộ", "hsk": 4},
                        {"text": "要是", "pinyin": "yàoshi", "hanviet": "Yếu Thị", "meaning_vi": "nếu như", "hsk": 3},
                        {"text": "滑雪", "pinyin": "huáxuě", "hanviet": "Hoạt Tuyết", "meaning_vi": "trượt tuyết", "hsk": 3}
                    ]
                }
            ]
        },
        {
            "page_num": 3,
            "image": "assets/images/readings/manga/doraemon/skiing/page_03.webp",
            "dialogues": [
                {
                    "id": "p3_d1",
                    "character": "哆啦A梦",
                    "bbox": {"x": 62.0, "y": 12.0, "width": 30.0, "height": 24.0},
                    "zh": "戴上这顶滑雪帽，就能随时随地体验滑雪的乐趣！",
                    "zh_trad": "戴上這頂滑雪帽，就能隨時隨地體驗滑雪的樂趣！",
                    "pinyin": "Dài shàng zhè dǐng huáxuě mào, jiù néng suíshí suídì tǐyàn huáxuě de lèqù!",
                    "vi": "Chỉ cần đội chiếc mũ trượt tuyết này vào, là có thể trải nghiệm cảm giác trượt tuyết mọi lúc mọi nơi!",
                    "tokens": [
                        {"text": "戴上", "pinyin": "dàishang", "hanviet": "Đới Thượng", "meaning_vi": "đội vào, đeo vào", "hsk": 2},
                        {"text": "随时随地", "pinyin": "suíshí suídì", "hanviet": "Tùy Thời Tùy Địa", "meaning_vi": "bất cứ lúc nào, ở đâu", "hsk": 4},
                        {"text": "体验", "pinyin": "tǐyàn", "hanviet": "Thể Nghiệm", "meaning_vi": "trải nghiệm", "hsk": 4},
                        {"text": "乐趣", "pinyin": "lèqù", "hanviet": "Lạc Thú", "meaning_vi": "niềm vui thích", "hsk": 4}
                    ]
                },
                {
                    "id": "p3_d2",
                    "character": "大雄",
                    "bbox": {"x": 18.0, "y": 66.0, "width": 30.0, "height": 22.0},
                    "zh": "哇！地面看起来真的像厚厚的白雪一样！",
                    "zh_trad": "哇！地面看起來真的像厚厚的白雪一樣！",
                    "pinyin": "Wā! Dìmiàn kàn qǐlái zhēnde xiàng hòuhòu de báixuě yíyàng!",
                    "vi": "Oa! Mặt đất trông như phủ một lớp tuyết trắng dày cộp thật này!",
                    "tokens": [
                        {"text": "地面", "pinyin": "dìmiàn", "hanviet": "Địa Diện", "meaning_vi": "mặt đất", "hsk": 3},
                        {"text": "看起来", "pinyin": "kàn qǐlái", "hanviet": "Khán Khởi Lai", "meaning_vi": "trông có vẻ", "hsk": 3},
                        {"text": "厚", "pinyin": "hòu", "hanviet": "Hậu", "meaning_vi": "dày", "hsk": 3},
                        {"text": "白雪", "pinyin": "báixuě", "hanviet": "Bạch Tuyết", "meaning_vi": "tuyết trắng", "hsk": 2}
                    ]
                }
            ]
        },
        {
            "page_num": 4,
            "image": "assets/images/readings/manga/doraemon/skiing/page_04.webp",
            "dialogues": [
                {
                    "id": "p4_d1",
                    "character": "哆啦A梦",
                    "bbox": {"x": 58.0, "y": 14.0, "width": 35.0, "height": 24.0},
                    "zh": "你完全不懂滑雪，所以先要在平地练习步行……",
                    "zh_trad": "你完全不懂滑雪，所以先要在平地練習步行……",
                    "pinyin": "Nǐ wánquán bù dǒng huáxuě, suǒyǐ xiān yào zài píngdì liànxí bùxíng...",
                    "vi": "Cậu hoàn toàn không biết trượt tuyết, cho nên trước tiên phải tập đi trên mặt đất phẳng đã...",
                    "tokens": [
                        {"text": "完全", "pinyin": "wánquán", "hanviet": "Hoàn Toàn", "meaning_vi": "hoàn toàn", "hsk": 3},
                        {"text": "平地", "pinyin": "píngdì", "hanviet": "Bình Địa", "meaning_vi": "đất bằng phẳng", "hsk": 3},
                        {"text": "练习", "pinyin": "liànxí", "hanviet": "Luyện Tập", "meaning_vi": "luyện tập", "hsk": 3},
                        {"text": "步行", "pinyin": "bùxíng", "hanviet": "Bộ Hành", "meaning_vi": "đi bộ", "hsk": 3}
                    ]
                },
                {
                    "id": "p4_d2",
                    "character": "大雄",
                    "bbox": {"x": 16.0, "y": 62.0, "width": 30.0, "height": 22.0},
                    "zh": "太没趣味了！这样我又怎会有心情练习？",
                    "zh_trad": "太沒趣味了！這樣我又怎會有心情練習？",
                    "pinyin": "Tài méi qùwèi le! Zhèyàng wǒ yòu zěn huì yǒu xīnqíng liànxí?",
                    "vi": "Chán chết đi được! Cứ như thế này thì sao tớ có hứng thú luyện tập chứ?",
                    "tokens": [
                        {"text": "趣味", "pinyin": "qùwèi", "hanviet": "Thú Vị", "meaning_vi": "sự thú vị, hứng thú", "hsk": 4},
                        {"text": "怎会", "pinyin": "zěn huì", "hanviet": "Trẫm Hội", "meaning_vi": "làm sao mà, sao có thể", "hsk": 3},
                        {"text": "心情", "pinyin": "xīnqíng", "hanviet": "Tâm Tình", "meaning_vi": "tâm trạng, hứng thú", "hsk": 3}
                    ]
                }
            ]
        },
        {
            "page_num": 5,
            "image": "assets/images/readings/manga/doraemon/skiing/page_05.webp",
            "dialogues": [
                {
                    "id": "p5_d1",
                    "character": "哆啦A梦",
                    "bbox": {"x": 62.0, "y": 10.0, "width": 32.0, "height": 24.0},
                    "zh": "你永远也是未学行先学走！小心摔倒啊！",
                    "zh_trad": "你永遠也是未學行先學走！小心摔倒啊！",
                    "pinyin": "Nǐ yǒngyuǎn yě shì wèi xué xíng xiān xué zǒu! Xiǎoxīn shuāidǎo a!",
                    "vi": "Cậu lúc nào cũng chưa học bò chớ lo học chạy! Cẩn thận ngã đấy!",
                    "tokens": [
                        {"text": "永远", "pinyin": "yǒngyuǎn", "hanviet": "Vĩnh Viễn", "meaning_vi": "mãi mãi, luôn luôn", "hsk": 3},
                        {"text": "小心", "pinyin": "xiǎoxīn", "hanviet": "Tiểu Tâm", "meaning_vi": "cẩn thận", "hsk": 2},
                        {"text": "摔倒", "pinyin": "shuāidǎo", "hanviet": "Suất Đảo", "meaning_vi": "vấp ngã", "hsk": 3}
                    ]
                },
                {
                    "id": "p5_d2",
                    "character": "大雄",
                    "bbox": {"x": 20.0, "y": 55.0, "width": 28.0, "height": 22.0},
                    "zh": "哇啊！停不下来了！救命啊！",
                    "zh_trad": "哇啊！停不下來了！救命啊！",
                    "pinyin": "Wā a! Tíng bu xiàlai le! Jiùmìng a!",
                    "vi": "Oa a! Không dừng lại được rồi! Cứu mạng với!",
                    "tokens": [
                        {"text": "停不下来", "pinyin": "tíng bu xiàlai", "hanviet": "Đình Bất Hạ Lai", "meaning_vi": "không dừng lại được", "hsk": 2},
                        {"text": "救命", "pinyin": "jiùmìng", "hanviet": "Cứu Mệnh", "meaning_vi": "cứu mạng", "hsk": 3}
                    ]
                }
            ]
        },
        {
            "page_num": 6,
            "image": "assets/images/readings/manga/doraemon/skiing/page_06.webp",
            "dialogues": [
                {
                    "id": "p6_d1",
                    "character": "胖虎 (技安)",
                    "bbox": {"x": 65.0, "y": 12.0, "width": 30.0, "height": 25.0},
                    "zh": "看！大雄竟然在屋顶上飞快地滑雪！",
                    "zh_trad": "看！大雄竟然在屋頂上飛快地滑雪！",
                    "pinyin": "Kàn! Dàxióng jìngrán zài wūdǐng shàng fēikuài de huáxuě!",
                    "vi": "Nhìn kìa! Nobita thế mà lại đang trượt tuyết vèo vèo trên mái nhà!",
                    "tokens": [
                        {"text": "竟然", "pinyin": "jìngrán", "hanviet": "Cánh Nhiên", "meaning_vi": "không ngờ, thế mà", "hsk": 4},
                        {"text": "屋顶", "pinyin": "wūdǐng", "hanviet": "Ốc Đỉnh", "meaning_vi": "nóc nhà, mái nhà", "hsk": 3},
                        {"text": "飞快", "pinyin": "fēikuài", "hanviet": "Phi Khoái", "meaning_vi": "nhanh như bay", "hsk": 3}
                    ]
                },
                {
                    "id": "p6_d2",
                    "character": "小夫",
                    "bbox": {"x": 22.0, "y": 60.0, "width": 28.0, "height": 22.0},
                    "zh": "可恶！那顶帽子到底是什么神奇道具？我也要！",
                    "zh_trad": "可惡！那頂帽子到底是什麼神奇道具？我也要！",
                    "pinyin": "Kěwù! Nà dǐng màozi dàodǐ shì shénme shénqí dàojù? Wǒ yě yào!",
                    "vi": "Đáng ghét thật! Cái mũ đó rốt cuộc là bảo bối thần kỳ gì thế? Mình cũng muốn!",
                    "tokens": [
                        {"text": "可恶", "pinyin": "kěwù", "hanviet": "Khả Ác", "meaning_vi": "đáng ghét", "hsk": 4},
                        {"text": "到底", "pinyin": "dàodǐ", "hanviet": "Đáo Để", "meaning_vi": "rốt cuộc", "hsk": 3},
                        {"text": "神奇", "pinyin": "shénqí", "hanviet": "Thần Kỳ", "meaning_vi": "thần kỳ, kỳ diệu", "hsk": 4},
                        {"text": "道具", "pinyin": "dàojù", "hanviet": "Đạo Cụ", "meaning_vi": "bảo bối, đạo cụ", "hsk": 3}
                    ]
                }
            ]
        },
        {
            "page_num": 7,
            "image": "assets/images/readings/manga/doraemon/skiing/page_07.webp",
            "dialogues": [
                {
                    "id": "p7_d1",
                    "character": "大雄",
                    "bbox": {"x": 55.0, "y": 10.0, "width": 35.0, "height": 22.0},
                    "zh": "快追上来了！大家都在抢我的滑雪帽！",
                    "zh_trad": "快追上來了！大家都在搶我的滑雪帽！",
                    "pinyin": "Kuài zhuī shànglai le! Dàjiā dōu zài qiǎng wǒ de huáxuě mào!",
                    "vi": "Sắp đuổi kịp rồi! Mọi người đều đang tranh giành chiếc mũ trượt tuyết của tớ!",
                    "tokens": [
                        {"text": "追上", "pinyin": "zhuīshàng", "hanviet": "Truy Thượng", "meaning_vi": "đuổi kịp", "hsk": 3},
                        {"text": "抢", "pinyin": "qiǎng", "hanviet": "Cướp", "meaning_vi": "giành giật, cướp", "hsk": 4}
                    ]
                },
                {
                    "id": "p7_d2",
                    "character": "哆啦A梦",
                    "bbox": {"x": 15.0, "y": 65.0, "width": 30.0, "height": 22.0},
                    "zh": "快往这边滑！转弯！快点转弯！",
                    "zh_trad": "快往這邊滑！轉彎！快點轉彎！",
                    "pinyin": "Kuài wǎng zhèbiān huá! Zhuǎnwān! Kuài diǎn zhuǎnwān!",
                    "vi": "Mau trượt về bên này! Rẽ đi! Mau rẽ nhanh lên!",
                    "tokens": [
                        {"text": "这边", "pinyin": "zhèbiān", "hanviet": "Giá Biên", "meaning_vi": "phía này, bên này", "hsk": 2},
                        {"text": "转弯", "pinyin": "zhuǎnwān", "hanviet": "Chuyển Loan", "meaning_vi": "rẽ, quẹo", "hsk": 3}
                    ]
                }
            ]
        },
        {
            "page_num": 8,
            "image": "assets/images/readings/manga/doraemon/skiing/page_08.webp",
            "dialogues": [
                {
                    "id": "p8_d1",
                    "character": "大雄",
                    "bbox": {"x": 52.0, "y": 20.0, "width": 32.0, "height": 24.0},
                    "zh": "哎哟！撞到墙壁了！好痛啊！",
                    "zh_trad": "哎喲！撞到牆壁了！好痛啊！",
                    "pinyin": "Āiyō! Zhuàng dào qiángbì le! Hǎo tòng a!",
                    "vi": "Ái chà! Đâm sầm vào tường rồi! Đau quá đi mất!",
                    "tokens": [
                        {"text": "撞到", "pinyin": "zhuàng dào", "hanviet": "Chàng Đáo", "meaning_vi": "va trúng, tông vào", "hsk": 3},
                        {"text": "墙壁", "pinyin": "qiángbì", "hanviet": "Tường Bích", "meaning_vi": "bức tường", "hsk": 3},
                        {"text": "痛", "pinyin": "tòng", "hanviet": "Thống", "meaning_vi": "đau đớn", "hsk": 3}
                    ]
                },
                {
                    "id": "p8_d2",
                    "character": "胖虎",
                    "bbox": {"x": 16.0, "y": 62.0, "width": 30.0, "height": 22.0},
                    "zh": "哈哈！原来在屋顶滑雪是这种下场！",
                    "zh_trad": "哈哈！原來在屋頂滑雪是這種下場！",
                    "pinyin": "Hāhā! Yuánlái zài wūdǐng huáxuě shì zhè zhǒng xiàchǎng!",
                    "vi": "Ha ha! Hóa ra trượt tuyết trên nóc nhà lại có kết cục thảm hại thế này!",
                    "tokens": [
                        {"text": "原来", "pinyin": "yuánlái", "hanviet": "Nguyên Lai", "meaning_vi": "hóa ra, ban đầu", "hsk": 3},
                        {"text": "下场", "pinyin": "xiàchǎng", "hanviet": "Hạ Trường", "meaning_vi": "kết cục, hậu quả", "hsk": 4}
                    ]
                }
            ]
        },
        {
            "page_num": 9,
            "image": "assets/images/readings/manga/doraemon/skiing/page_09.webp",
            "dialogues": [
                {
                    "id": "p9_d1",
                    "character": "哆啦A梦",
                    "bbox": {"x": 48.0, "y": 18.0, "width": 35.0, "height": 24.0},
                    "zh": "你看吧，叫你好好打好基础你不听，这下尝到苦头了吧！",
                    "zh_trad": "你看吧，叫你好好打好基礎你不聽，這下嚐到苦頭了吧！",
                    "pinyin": "Nǐ kàn ba, jiào nǐ hǎohǎo dǎ hǎo jīchǔ nǐ bù tīng, zhèxià cháng dào kǔtou le ba!",
                    "vi": "Cậu thấy chưa, bảo cậu phải rèn vững căn bản thì không chịu nghe, giờ thì nếm mùi khổ chưa!",
                    "tokens": [
                        {"text": "基础", "pinyin": "jīchǔ", "hanviet": "Cơ Sở", "meaning_vi": "nền tảng, căn bản", "hsk": 3},
                        {"text": "苦头", "pinyin": "kǔtou", "hanviet": "Khổ Đầu", "meaning_vi": "vị đắng, nỗi khổ", "hsk": 4}
                    ]
                },
                {
                    "id": "p9_d2",
                    "character": "大雄",
                    "bbox": {"x": 15.0, "y": 58.0, "width": 32.0, "height": 22.0},
                    "zh": "下次……我一定乖乖在平地练习……呜呜……",
                    "zh_trad": "下次……我一定乖乖在平地練習……嗚嗚……",
                    "pinyin": "Xià cì... wǒ yídìng guāiguāi zài píngdì liànxí... Wūwū...",
                    "vi": "Lần sau... tớ nhất định sẽ ngoan ngoãn tập đi trên đất bằng... hu hu...",
                    "tokens": [
                        {"text": "乖乖", "pinyin": "guāiguāi", "hanviet": "Quai Quai", "meaning_vi": "ngoan ngoãn", "hsk": 3},
                        {"text": "练习", "pinyin": "liànxí", "hanviet": "Luyện Tập", "meaning_vi": "luyện tập", "hsk": 3}
                    ]
                }
            ]
        }
    ]
}

# -----------------------------------------------------------------------------
# STORY 2: 改造植物 (Genetic Plant Breeding / Cải Tạo Thực Vật)
# -----------------------------------------------------------------------------
story2 = {
    "id": "doraemon_manga_002",
    "series": "doraemon",
    "series_title": "哆啦A梦",
    "series_title_vi": "Đô-rê-mon",
    "chapter_no": 2,
    "title": {
        "zh": "改造植物",
        "zh_trad": "改造植物",
        "vi": "Cải Tạo Thực Vật (Biến Đổi Gen Hoa Cây)",
        "pinyin": "Gǎizào zhíwù"
    },
    "description_vi": "Doraemon giới thiệu cỗ máy biến đổi gen thực vật tương lai. Nobita nghịch ngợm tạo ra những giống cây kỳ dị dở khóc dở cười!",
    "cover_image": "assets/images/readings/manga/doraemon/plant/page_01.webp",
    "source": "《哆啦A梦》第21卷 · 原作：藤子·F·不二雄 · 小学馆 / 香港文化传信",
    "source_credits": "Bản quyền nguyên tác thuộc Fujiko Pro & Shogakukan. Sử dụng làm tư liệu đối chiếu học tập tiếng Trung phi thương mại.",
    "page_count": 8,
    "difficulty": "HSK 3 - 4 (Từ vựng khoa học đời sống & thảo mộc)",
    "estimatedMinutes": 8,
    "pages": [
        {
            "page_num": 1,
            "image": "assets/images/readings/manga/doraemon/plant/page_01.webp",
            "dialogues": [
                {
                    "id": "s2_p1_d1",
                    "character": "标题",
                    "bbox": {"x": 35.0, "y": 30.0, "width": 45.0, "height": 14.0},
                    "zh": "改造植物",
                    "zh_trad": "改造植物",
                    "pinyin": "Gǎizào zhíwù",
                    "vi": "Tiêu đề: Cải tạo thực vật",
                    "tokens": [
                        {"text": "改造", "pinyin": "gǎizào", "hanviet": "Cải Tạo", "meaning_vi": "cải tạo, biến đổi", "hsk": 4},
                        {"text": "植物", "pinyin": "zhíwù", "hanviet": "Thực Vật", "meaning_vi": "thực vật, cây cỏ", "hsk": 3}
                    ]
                },
                {
                    "id": "s2_p1_d2",
                    "character": "静香 (静宜)",
                    "bbox": {"x": 58.0, "y": 55.0, "width": 30.0, "height": 22.0},
                    "zh": "我种的郁金香发芽了，真期待它开花！",
                    "zh_trad": "我種的鬱金香發芽了，真期待它開花！",
                    "pinyin": "Wǒ zhòng de yùjīnxiāng fāyá le, zhēn qīdài tā kāihuā!",
                    "vi": "Cây hoa tulip mình trồng đã nảy mầm rồi, thật mong chờ ngày nó nở hoa!",
                    "tokens": [
                        {"text": "郁金香", "pinyin": "yùjīnxiāng", "hanviet": "Uất Kim Hương", "meaning_vi": "hoa tulip", "hsk": 4},
                        {"text": "发芽", "pinyin": "fāyá", "hanviet": "Phát Nha", "meaning_vi": "nảy mầm", "hsk": 4},
                        {"text": "期待", "pinyin": "qīdài", "hanviet": "Kỳ Đãi", "meaning_vi": "mong chờ, kỳ vọng", "hsk": 4},
                        {"text": "开花", "pinyin": "kāihuā", "hanviet": "Khai Hoa", "meaning_vi": "nở hoa", "hsk": 3}
                    ]
                }
            ]
        },
        {
            "page_num": 2,
            "image": "assets/images/readings/manga/doraemon/plant/page_02.webp",
            "dialogues": [
                {
                    "id": "s2_p2_d1",
                    "character": "哆啦A梦",
                    "bbox": {"x": 55.0, "y": 15.0, "width": 38.0, "height": 26.0},
                    "zh": "只要在植物细胞的染色体中加点工夫，就能培育出新品种！",
                    "zh_trad": "只要在植物細胞的染色體中加點工夫，便能培育出新品種！",
                    "pinyin": "Zhǐyào zài zhíwù xìbāo de rǎnsètǐ zhōng jiā diǎn gōngfu, jiù néng péiyù chū xīn pǐnzhǒng!",
                    "vi": "Chỉ cần tác động một chút vào nhiễm sắc thể trong tế bào thực vật, là có thể lai tạo ra giống cây mới!",
                    "tokens": [
                        {"text": "细胞", "pinyin": "xìbāo", "hanviet": "Tế Bào", "meaning_vi": "tế bào", "hsk": 4},
                        {"text": "染色体", "pinyin": "rǎnsètǐ", "hanviet": "Nhiễm Sắc Thể", "meaning_vi": "nhiễm sắc thể", "hsk": 5},
                        {"text": "培育", "pinyin": "péiyù", "hanviet": "Bồi Dục", "meaning_vi": "bồi dưỡng, ươm mầm, lai tạo", "hsk": 4},
                        {"text": "品种", "pinyin": "pǐnzhǒng", "hanviet": "Phẩm Chủng", "meaning_vi": "chủng loại, giống loài", "hsk": 4}
                    ]
                },
                {
                    "id": "s2_p2_d2",
                    "character": "哆啦A梦",
                    "bbox": {"x": 16.0, "y": 60.0, "width": 35.0, "height": 24.0},
                    "zh": "遗传因子就像是一张制造生物的设计图一样……",
                    "zh_trad": "遺傳因子就像是一張製造生物的設計圖一樣……",
                    "pinyin": "Yíchuán yīnzǐ jiù xiàng shì yì zhāng zhìzào shēngwù de shèjìtú yíyàng...",
                    "vi": "Gen di truyền cũng giống như một bản thiết kế tạo nên sinh vật vậy...",
                    "tokens": [
                        {"text": "遗传", "pinyin": "yíchuán", "hanviet": "Di Truyền", "meaning_vi": "di truyền", "hsk": 4},
                        {"text": "设计图", "pinyin": "shèjìtú", "hanviet": "Thiết Kế Đồ", "meaning_vi": "bản vẽ thiết kế", "hsk": 4},
                        {"text": "生物", "pinyin": "shēngwù", "hanviet": "Sinh Vật", "meaning_vi": "sinh vật", "hsk": 3}
                    ]
                }
            ]
        },
        {
            "page_num": 3,
            "image": "assets/images/readings/manga/doraemon/plant/page_03.webp",
            "dialogues": [
                {
                    "id": "s2_p3_d1",
                    "character": "大雄",
                    "bbox": {"x": 58.0, "y": 15.0, "width": 32.0, "height": 24.0},
                    "zh": "我也要制造前所未见的新品种郁金香！",
                    "zh_trad": "我也要製造前所未見的新品種鬱金香！",
                    "pinyin": "Wǒ yě yào zhìzào qiánsuǒwèijiàn de xīn pǐnzhǒng yùjīnxiāng!",
                    "vi": "Tớ cũng muốn tạo ra giống hoa tulip mới chưa từng thấy trước đây!",
                    "tokens": [
                        {"text": "前所未见", "pinyin": "qiánsuǒwèijiàn", "hanviet": "Tiền Sở Vị Kiến", "meaning_vi": "chưa từng thấy bao giờ", "hsk": 5},
                        {"text": "制造", "pinyin": "zhìzào", "hanviet": "Chế Tạo", "meaning_vi": "sản xuất, chế tạo", "hsk": 3}
                    ]
                },
                {
                    "id": "s2_p3_d2",
                    "character": "哆啦A梦",
                    "bbox": {"x": 18.0, "y": 62.0, "width": 30.0, "height": 22.0},
                    "zh": "记住，千万不能乱来啊！",
                    "zh_trad": "記着，千萬不能亂來啊！",
                    "pinyin": "Jìzhu, qiānwàn bù néng luànlái a!",
                    "vi": "Nhớ kỹ đấy, tuyệt đối không được làm bậy đâu đó!",
                    "tokens": [
                        {"text": "记住", "pinyin": "jìzhu", "hanviet": "Ký Trụ", "meaning_vi": "ghi nhớ", "hsk": 2},
                        {"text": "千万", "pinyin": "qiānwàn", "hanviet": "Thiên Vạn", "meaning_vi": "nhất thiết, tuyệt đối", "hsk": 3},
                        {"text": "乱来", "pinyin": "luànlái", "hanviet": "Loạn Lai", "meaning_vi": "làm bừa, quậy phá", "hsk": 3}
                    ]
                }
            ]
        },
        {
            "page_num": 4,
            "image": "assets/images/readings/manga/doraemon/plant/page_04.webp",
            "dialogues": [
                {
                    "id": "s2_p4_d1",
                    "character": "大雄",
                    "bbox": {"x": 60.0, "y": 14.0, "width": 30.0, "height": 22.0},
                    "zh": "把这个和那个混合在一起，会变成什么样呢？",
                    "zh_trad": "把這個和那個混合在一起，會變成什麼樣呢？",
                    "pinyin": "Bǎ zhèige hé nàige hùnhé zài yìqǐ, huì biàn chéng shénmeyàng ne?",
                    "vi": "Trộn cái này với cái kia lại với nhau, sẽ biến thành cái gì nhỉ?",
                    "tokens": [
                        {"text": "混合", "pinyin": "hùnhé", "hanviet": "Hỗn Hợp", "meaning_vi": "pha trộn, hỗn hợp", "hsk": 4},
                        {"text": "变成", "pinyin": "biàn chéng", "hanviet": "Biến Thành", "meaning_vi": "trở thành, biến thành", "hsk": 3}
                    ]
                },
                {
                    "id": "s2_p4_d2",
                    "character": "大雄",
                    "bbox": {"x": 16.0, "y": 62.0, "width": 32.0, "height": 24.0},
                    "zh": "快点快点，给我长出又大又香的花朵来！",
                    "zh_trad": "快點快點，給我長出又大又香的花朵來！",
                    "pinyin": "Kuài diǎn kuài diǎn, gěi wǒ zhǎng chū yòu dà yòu xiāng de huāduǒ lái!",
                    "vi": "Mau lên mau lên, mau mọc ra bông hoa vừa to vừa thơm cho ta!",
                    "tokens": [
                        {"text": "长出", "pinyin": "zhǎng chū", "hanviet": "Trưởng Xuất", "meaning_vi": "mọc ra", "hsk": 2},
                        {"text": "花朵", "pinyin": "huāduǒ", "hanviet": "Hoa Đóa", "meaning_vi": "đóa hoa", "hsk": 3}
                    ]
                }
            ]
        },
        {
            "page_num": 5,
            "image": "assets/images/readings/manga/doraemon/plant/page_05.webp",
            "dialogues": [
                {
                    "id": "s2_p5_d1",
                    "character": "大雄",
                    "bbox": {"x": 58.0, "y": 16.0, "width": 32.0, "height": 24.0},
                    "zh": "怎么长出像南瓜一样的东西来了？！",
                    "zh_trad": "怎麼長出像南瓜一樣的東西來了？！",
                    "pinyin": "Zěnme zhǎng chū xiàng nánguā yíyàng de dōngxi lái le?!",
                    "vi": "Sao lại mọc ra thứ tròn ủng giống như quả bí ngô thế này?!",
                    "tokens": [
                        {"text": "怎么", "pinyin": "zěnme", "hanviet": "Chẩm Ma", "meaning_vi": "sao mà, thế nào", "hsk": 1},
                        {"text": "南瓜", "pinyin": "nánguā", "hanviet": "Nam Qua", "meaning_vi": "quả bí ngô, bí đỏ", "hsk": 3}
                    ]
                },
                {
                    "id": "s2_p5_d2",
                    "character": "哆啦A梦",
                    "bbox": {"x": 15.0, "y": 60.0, "width": 35.0, "height": 22.0},
                    "zh": "哎呀！你到底把什么奇怪的种子混进去了！",
                    "zh_trad": "哎呀！你到底把什麼奇怪的種子混進去了！",
                    "pinyin": "Āiyā! Nǐ dàodǐ bǎ shénme qíguài de zhǒngzǐ hùn jìnqù le!",
                    "vi": "Trời đất ơi! Rốt cuộc cậu đã trộn hạt giống kỳ quặc gì vào thế!",
                    "tokens": [
                        {"text": "奇怪", "pinyin": "qíguài", "hanviet": "Kỳ Quái", "meaning_vi": "kỳ quái, lạ lùng", "hsk": 3},
                        {"text": "种子", "pinyin": "zhǒngzǐ", "hanviet": "Chủng Tử", "meaning_vi": "hạt giống", "hsk": 3}
                    ]
                }
            ]
        },
        {
            "page_num": 6,
            "image": "assets/images/readings/manga/doraemon/plant/page_06.webp",
            "dialogues": [
                {
                    "id": "s2_p6_d1",
                    "character": "大雄",
                    "bbox": {"x": 55.0, "y": 15.0, "width": 32.0, "height": 22.0},
                    "zh": "这棵植物竟然会自己动起来抓虫子！",
                    "zh_trad": "這棵植物竟然會自己動起來抓蟲子！",
                    "pinyin": "Zhè kē zhíwù jìngrán huì zìjǐ dòng qǐlái zhuā chóngzi!",
                    "vi": "Cái cây này thế mà lại tự cử động để bắt sâu bọ kìa!",
                    "tokens": [
                        {"text": "动起来", "pinyin": "dòng qǐlái", "hanviet": "Động Khởi Lai", "meaning_vi": "cử động, bắt đầu chuyển động", "hsk": 3},
                        {"text": "虫子", "pinyin": "chóngzi", "hanviet": "Trùng Tử", "meaning_vi": "sâu bọ, côn trùng", "hsk": 3}
                    ]
                },
                {
                    "id": "s2_p6_d2",
                    "character": "哆啦A梦",
                    "bbox": {"x": 18.0, "y": 62.0, "width": 30.0, "height": 22.0},
                    "zh": "这是食虫植物的特性！别靠得太近！",
                    "zh_trad": "這是食蟲植物的特性！別靠得太近！",
                    "pinyin": "Zhè shì shíchóng zhíwù de tèxìng! Bié kào de tài jìn!",
                    "vi": "Đây là đặc tính của cây ăn thịt (bắt mồi)! Đừng có đứng quá gần!",
                    "tokens": [
                        {"text": "特性", "pinyin": "tèxìng", "hanviet": "Đặc Tính", "meaning_vi": "đặc tính", "hsk": 4},
                        {"text": "靠近", "pinyin": "kàojìn", "hanviet": "Kháo Cận", "meaning_vi": "tiến lại gần", "hsk": 3}
                    ]
                }
            ]
        },
        {
            "page_num": 7,
            "image": "assets/images/readings/manga/doraemon/plant/page_07.webp",
            "dialogues": [
                {
                    "id": "s2_p7_d1",
                    "character": "大雄",
                    "bbox": {"x": 58.0, "y": 18.0, "width": 32.0, "height": 24.0},
                    "zh": "哇！藤蔓把我的裤子咬住了！快救我！",
                    "zh_trad": "哇！藤蔓把我的褲子咬住了！快救我！",
                    "pinyin": "Wā! Téngwàn bǎ wǒ de kùzi yǎozhù le! Kuài jiù wǒ!",
                    "vi": "Oa! Dây leo cắn chặt lấy quần của tớ rồi! Mau cứu tớ với!",
                    "tokens": [
                        {"text": "藤蔓", "pinyin": "téngwàn", "hanviet": "Đằng Man", "meaning_vi": "dây leo", "hsk": 4},
                        {"text": "裤子", "pinyin": "kùzi", "hanviet": "Khố Tử", "meaning_vi": "quần", "hsk": 2},
                        {"text": "咬住", "pinyin": "yǎozhù", "hanviet": "Giao Trụ", "meaning_vi": "cắn chặt", "hsk": 3}
                    ]
                },
                {
                    "id": "s2_p7_d2",
                    "character": "妈妈",
                    "bbox": {"x": 15.0, "y": 60.0, "width": 35.0, "height": 24.0},
                    "zh": "大雄！你又在院子里搞什么鬼名堂！",
                    "zh_trad": "大雄！你又在院子裏搞什麼鬼名堂！",
                    "pinyin": "Dàxióng! Nǐ yòu zài yuànzi lǐ gǎo shénme guǐ míngtáng!",
                    "vi": "Nobita! Con lại bày trò ma mãnh gì ngoài sân thế hả!",
                    "tokens": [
                        {"text": "院子", "pinyin": "yuànzi", "hanviet": "Viện Tử", "meaning_vi": "sân vườn", "hsk": 3},
                        {"text": "鬼名堂", "pinyin": "guǐ míngtáng", "hanviet": "Quỷ Danh Đường", "meaning_vi": "trò ma mãnh, quậy phá", "hsk": 4}
                    ]
                }
            ]
        },
        {
            "page_num": 8,
            "image": "assets/images/readings/manga/doraemon/plant/page_08.webp",
            "dialogues": [
                {
                    "id": "s2_p8_d1",
                    "character": "哆啦A梦",
                    "bbox": {"x": 50.0, "y": 20.0, "width": 35.0, "height": 24.0},
                    "zh": "幸好把基因复原喷雾喷上去了，不然整个院子都要被占领了！",
                    "zh_trad": "幸好把基因復原噴霧噴上去了，不然整個院子都要被佔領了！",
                    "pinyin": "Xìnghǎo bǎ jīyīn fùyuán pēnwù pēn shàngqu le, bùrán zhěnggè yuànzi dōu yào bèi zhànlǐng le!",
                    "vi": "May mà kịp xịt bình xịt phục hồi gen lên, không thì cả cái sân vườn bị nó chiếm đóng mất rồi!",
                    "tokens": [
                        {"text": "幸好", "pinyin": "xìnghǎo", "hanviet": "Hạnh Hảo", "meaning_vi": "may mắn thay", "hsk": 4},
                        {"text": "基因", "pinyin": "jīyīn", "hanviet": "Cơ Nhân", "meaning_vi": "gen", "hsk": 4},
                        {"text": "复原", "pinyin": "fùyuán", "hanviet": "Phục Nguyên", "meaning_vi": "khôi phục ban đầu", "hsk": 4},
                        {"text": "占领", "pinyin": "zhànlǐng", "hanviet": "Chiếm Lãnh", "meaning_vi": "chiếm lĩnh, chiếm đóng", "hsk": 4}
                    ]
                },
                {
                    "id": "s2_p8_d2",
                    "character": "大雄",
                    "bbox": {"x": 15.0, "y": 62.0, "width": 32.0, "height": 22.0},
                    "zh": "我还是老老实实给普通的郁金香浇水吧……",
                    "zh_trad": "我還是老老實實給普通的鬱金香澆水吧……",
                    "pinyin": "Wǒ háishì lǎolǎoshíshí gěi pǔtōng de yùjīnxiāng jiāoshuǐ ba...",
                    "vi": "Thôi thì mình cứ ngoan ngoãn tưới nước cho cây hoa tulip bình thường vậy...",
                    "tokens": [
                        {"text": "老老实实", "pinyin": "lǎolǎoshíshí", "hanviet": "Lão Lão Thật Thật", "meaning_vi": "an phận, thật thà", "hsk": 4},
                        {"text": "普通", "pinyin": "pǔtōng", "hanviet": "Phổ Thông", "meaning_vi": "bình thường", "hsk": 3},
                        {"text": "浇水", "pinyin": "jiāoshuǐ", "hanviet": "Kiêu Thủy", "meaning_vi": "tưới nước", "hsk": 3}
                    ]
                }
            ]
        }
    ]
}

def generate_word_hotspots(dialogues):
    """
    Computes precise character/word-level bounding boxes aligned along the vertical
    manga dialogue text columns. Prevents oversized bounding boxes covering artwork.
    """
    hotspots = []
    for d in dialogues:
        tokens = d.get("tokens", [])
        bbox = d.get("bbox", {"x": 50, "y": 50, "width": 6.0, "height": 18.0})
        full_zh = d.get("zh_trad", d.get("zh", ""))
        col_x = bbox["x"]
        col_y = bbox["y"]
        col_w = bbox["width"]
        col_h = bbox["height"]
        
        total_chars = max(len(full_zh), 1)
        for idx, t in enumerate(tokens):
            w_text = t["text"]
            offset = full_zh.find(w_text)
            if offset == -1:
                offset = d.get("zh", "").find(w_text)
            if offset == -1:
                offset = idx * 2
            
            char_len = max(len(w_text), 1)
            # Calculate vertical bbox aligned with the text column
            wy = round(col_y + (offset / total_chars) * col_h, 2)
            wh = round(max(3.5, (char_len / total_chars) * col_h), 2)
            wx = col_x
            ww = col_w
            
            hotspot = {
                "id": f"{d['id']}_w{idx}",
                "text": t["text"],
                "pinyin": t["pinyin"],
                "hanviet": t.get("hanviet", ""),
                "meaning_vi": t.get("meaning_vi", ""),
                "hsk": t.get("hsk", 2),
                "bbox": {"x": wx, "y": wy, "width": ww, "height": wh},
                "sentence_zh": d.get("zh", ""),
                "sentence_vi": d.get("vi", ""),
                "character": d.get("character", "")
            }
            hotspots.append(hotspot)
            t["bbox"] = {"x": wx, "y": wy, "width": ww, "height": wh}
    return hotspots

# Compute word hotspots for all pages in both stories
for p in story1["pages"]:
    p["word_hotspots"] = generate_word_hotspots(p.get("dialogues", []))

for p in story2["pages"]:
    p["word_hotspots"] = generate_word_hotspots(p.get("dialogues", []))

# Write individual story JSONs
with open(MANGA_DIR / "doraemon_manga_001.json", "w", encoding="utf-8") as f:
    json.dump(story1, f, ensure_ascii=False, indent=2)
print("Saved doraemon_manga_001.json with word hotspots")

with open(MANGA_DIR / "doraemon_manga_002.json", "w", encoding="utf-8") as f:
    json.dump(story2, f, ensure_ascii=False, indent=2)
print("Saved doraemon_manga_002.json with word hotspots")

# Build manga manifest
manifest = [
    {
        "id": story1["id"],
        "series": story1["series"],
        "series_title": story1["series_title"],
        "series_title_vi": story1["series_title_vi"],
        "chapter_no": story1["chapter_no"],
        "title": story1["title"],
        "description_vi": story1["description_vi"],
        "cover_image": story1["cover_image"],
        "source": story1["source"],
        "source_credits": story1["source_credits"],
        "page_count": story1["page_count"],
        "difficulty": story1["difficulty"],
        "estimatedMinutes": story1["estimatedMinutes"],
        "file": f"database/readings/manga/doraemon/{story1['id']}.json"
    },
    {
        "id": story2["id"],
        "series": story2["series"],
        "series_title": story2["series_title"],
        "series_title_vi": story2["series_title_vi"],
        "chapter_no": story2["chapter_no"],
        "title": story2["title"],
        "description_vi": story2["description_vi"],
        "cover_image": story2["cover_image"],
        "source": story2["source"],
        "source_credits": story2["source_credits"],
        "page_count": story2["page_count"],
        "difficulty": story2["difficulty"],
        "estimatedMinutes": story2["estimatedMinutes"],
        "file": f"database/readings/manga/doraemon/{story2['id']}.json"
    }
]

# Merge into the existing manifest so chapters added by tools/import_manga_chapter.py survive.
import sys
sys.path.insert(0, str(REPO_ROOT / "tools"))
from import_manga_chapter import upsert_manifest  # noqa: E402

manifest_path = MANGA_DIR / "manifest.json"
merged = json.loads(manifest_path.read_text(encoding="utf-8")) if manifest_path.exists() else []
for entry in manifest:
    entry.update({"collection": "short", "volume": 21, "chapter_in_volume": None})
    entry["proper_names"] = next((m.get("proper_names") for m in merged if m["id"] == entry["id"]), None) \
        or ["大雄", "靜兒", "叮噹", "技安", "小夫"]
    merged = upsert_manifest(merged, entry)
manifest_path.write_text(json.dumps(merged, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print("Merged entries into manga manifest.json")
