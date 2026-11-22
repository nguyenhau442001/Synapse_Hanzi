#!/usr/bin/env python3
"""
tools/build_office_comic_complete.py
Renders authentic comic speech balloons with Chinese typography directly onto the manga page images,
converts them to optimized WebP, and generates pixel-perfect dialogue hotspots and metadata
for all episodes of 《打工人日记》 (Diary of Dagongren).
"""

import json
from pathlib import Path
import re
import sys
from PIL import Image, ImageDraw, ImageFont

REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT / "tools"))

from manga_lexicon import segment, lookup, to_traditional, sentence_pinyin

RAW_DIR = Path("/Users/haunguyen/.gemini/antigravity/brain/10406d8c-9179-4f84-9005-19024561b2b0")
OFFICE_IMG_BASE = REPO_ROOT / "assets" / "images" / "readings" / "manga" / "office"
DATA_DIR = REPO_ROOT / "database" / "readings" / "manga" / "office"
DATA_DIR.mkdir(parents=True, exist_ok=True)
MANIFEST_FILE = DATA_DIR / "manifest.json"

FONT_PATH = "/System/Library/Fonts/Hiragino Sans GB.ttc"
FONT_MAIN = ImageFont.truetype(FONT_PATH, 26)
FONT_SPEAKER = ImageFont.truetype(FONT_PATH, 16)

IMG_W, IMG_H = 1376, 768
PUNCT_RE = re.compile(r"^[\s，。？！、：；“”‘’…—（）《》·！？]+$")

EPISODES = [
    {
        "id": "office_ep01",
        "chapter_no": 1,
        "title": {
            "zh": "第一集：你在吗？",
            "zh_trad": "第一集：你在嗎？",
            "vi": "Tập 1: Em Có Đó Không?",
            "pinyin": "dì yī jí ： nǐ zài ma ？"
        },
        "description_vi": "9 giờ 47 phút sáng, chuông thông báo công ty bỗng vang lên từ màn hình máy tính: 'Tiểu Dương, em có đó không? Qua văn phòng anh một lát nhé.' Lời nói nghe chừng vô hại, nhưng dân công sở đều biết: mỗi lần sếp bảo 'không có chuyện gì lớn', thì y như rằng việc lớn ngập đầu!",
        "difficulty": "HSK 1 - 3",
        "estimatedMinutes": 3,
        "panels": [
            {
                "page_num": 1,
                "src_file": RAW_DIR / "dagongren_ep01_p1_1795269761424.jpg",
                "dialogues": [
                    {
                        "id": "p1_d1",
                        "character": "王经理 (Sếp Vương)",
                        "speaker": "王经理",
                        "zh": "小阳，在吗？",
                        "vi": "Tiểu Dương, em có đó không?",
                        "box": (140, 50, 460, 145),
                        "tail_tip": (320, 220),
                        "tail_side": "bottom"
                    },
                    {
                        "id": "p1_d2",
                        "character": "小阳 (Tiểu Dương)",
                        "speaker": "小阳",
                        "zh": "在……王总？",
                        "vi": "Dạ có... Sếp Vương?",
                        "box": (780, 50, 1080, 145),
                        "tail_tip": (890, 190),
                        "tail_side": "bottom"
                    },
                    {
                        "id": "p1_d3",
                        "character": "王经理 (Sếp Vương)",
                        "speaker": "王经理",
                        "zh": "来我办公室一下。",
                        "vi": "Qua văn phòng anh một lát nhé.",
                        "box": (140, 540, 500, 635),
                        "tail_tip": (270, 480),
                        "tail_side": "top"
                    }
                ]
            },
            {
                "page_num": 2,
                "src_file": RAW_DIR / "dagongren_ep01_p2_1795269799371.jpg",
                "dialogues": [
                    {
                        "id": "p2_d1",
                        "character": "小铃 (Tiểu Linh)",
                        "speaker": "小铃",
                        "zh": "怎么了？",
                        "vi": "Sao thế?",
                        "box": (880, 50, 1140, 145),
                        "tail_tip": (980, 220),
                        "tail_side": "bottom"
                    },
                    {
                        "id": "p2_d2",
                        "character": "小阳 (Tiểu Dương)",
                        "speaker": "小阳",
                        "zh": "不知道，感觉要出事了。",
                        "vi": "Không biết nữa, nhưng có linh cảm sắp to chuyện rồi.",
                        "box": (180, 50, 620, 145),
                        "tail_tip": (420, 200),
                        "tail_side": "bottom"
                    }
                ]
            },
            {
                "page_num": 3,
                "src_file": RAW_DIR / "dagongren_ep01_p3_1795269821710.jpg",
                "dialogues": [
                    {
                        "id": "p3_d1",
                        "character": "王经理 (Sếp Vương)",
                        "speaker": "王经理",
                        "zh": "别紧张，没什么大事。",
                        "vi": "Đừng căng thẳng, chẳng có chuyện gì lớn đâu.",
                        "box": (60, 40, 480, 135),
                        "tail_tip": (280, 160),
                        "tail_side": "bottom"
                    },
                    {
                        "id": "p3_d2",
                        "character": "王经理 (Sếp Vương)",
                        "speaker": "王经理",
                        "zh": "这个项目，你跟一下。",
                        "vi": "Dự án này, em theo sát nhé.",
                        "box": (490, 40, 910, 135),
                        "tail_tip": None
                    }
                ]
            },
            {
                "page_num": 4,
                "src_file": RAW_DIR / "dagongren_ep01_p4_1795269855755.jpg",
                "dialogues": [
                    {
                        "id": "p4_d1",
                        "character": "小铃 (Tiểu Linh)",
                        "speaker": "小铃",
                        "zh": "所以呢？",
                        "vi": "Thế rốt cuộc sao?",
                        "box": (880, 60, 1140, 155),
                        "tail_tip": (1000, 220),
                        "tail_side": "bottom"
                    },
                    {
                        "id": "p4_d2",
                        "character": "小阳 (Tiểu Dương)",
                        "speaker": "小阳",
                        "zh": "他说没什么大事。",
                        "vi": "Sếp bảo không có chuyện gì to tát cả.",
                        "box": (180, 60, 580, 155),
                        "tail_tip": (330, 250),
                        "tail_side": "bottom"
                    }
                ]
            },
            {
                "page_num": 5,
                "src_file": RAW_DIR / "dagongren_ep01_p5_1795269892647.jpg",
                "dialogues": [
                    {
                        "id": "p5_d1",
                        "character": "小铃 (Tiểu Linh)",
                        "speaker": "小铃",
                        "zh": "那你怎么一脸绝望？",
                        "vi": "Thế sao mặt cậu trông tuyệt vọng thế?",
                        "box": (80, 50, 520, 145),
                        "tail_tip": (280, 200),
                        "tail_side": "bottom"
                    },
                    {
                        "id": "p5_d2",
                        "character": "小阳 (Tiểu Dương)",
                        "speaker": "小阳",
                        "zh": "每次他说没什么大事，最后都有大事。",
                        "vi": "Lần nào sếp bảo không có chuyện gì lớn, y như rằng cuối cùng việc lớn ngập đầu.",
                        "box": (720, 45, 1320, 145),
                        "tail_tip": (1020, 180),
                        "tail_side": "bottom"
                    }
                ]
            }
        ]
    },
    {
        "id": "office_ep02",
        "chapter_no": 2,
        "title": {
            "zh": "第二集：下班前五分钟",
            "zh_trad": "第二集：下班前五分鐘",
            "vi": "Tập 2: 5 Phút Trước Giờ Tan Làm",
            "pinyin": "dì èr jí ： xià bān qián wǔ fēn zhōng"
        },
        "description_vi": "Đúng 17:25 chiều, balo đã đeo sẵn trên vai chỉ chờ chuông reo để chuồn. Bất thình lình một bàn tay mập mạp của Sếp Vương vỗ lên vai: 'Tiểu Dương, việc này gấp, nửa tiếng là xong ngay ấy mà...'",
        "difficulty": "HSK 1 - 4",
        "estimatedMinutes": 3,
        "panels": [
            {
                "page_num": 1,
                "src_file": RAW_DIR / "dagongren_ep02_p1_1795272149865.jpg",
                "dialogues": [
                    {
                        "id": "p1_d1",
                        "character": "小阳 (Tiểu Dương)",
                        "speaker": "小阳",
                        "zh": "还有五分钟……自由了！",
                        "vi": "Còn năm phút nữa... tự do rồi!",
                        "box": (160, 45, 680, 140),
                        "tail_base_x": 580,
                        "tail_tip": (720, 220),
                        "tail_side": "bottom"
                    }
                ]
            },
            {
                "page_num": 2,
                "src_file": RAW_DIR / "dagongren_ep02_p2_1795272169882.jpg",
                "dialogues": [
                    {
                        "id": "p2_d1",
                        "character": "小铃 (Tiểu Linh)",
                        "speaker": "小铃",
                        "zh": "准备溜了？",
                        "vi": "Chuẩn bị chuồn rồi à?",
                        "box": (820, 50, 1100, 145),
                        "tail_base_x": 940,
                        "tail_tip": (920, 190),
                        "tail_side": "bottom"
                    },
                    {
                        "id": "p2_d2",
                        "character": "小阳 (Tiểu Dương)",
                        "speaker": "小阳",
                        "zh": "包都背好了，就等准点！",
                        "vi": "Balo đeo sẵn rồi, chỉ chờ đúng giờ là bắn!",
                        "box": (140, 50, 640, 145),
                        "tail_base_x": 380,
                        "tail_tip": (420, 180),
                        "tail_side": "bottom"
                    }
                ]
            },
            {
                "page_num": 3,
                "src_file": RAW_DIR / "dagongren_ep02_p3_1795312598297.jpg",
                "dialogues": [
                    {
                        "id": "p3_d1",
                        "character": "王经理 (Sếp Vương)",
                        "speaker": "王经理",
                        "zh": "小阳，手头的事忙完了吗？",
                        "vi": "Tiểu Dương, việc trong tay đã xong chưa em?",
                        "box": (720, 45, 1260, 140),
                        "tail_base_x": 820,
                        "tail_tip": (800, 210),
                        "tail_side": "bottom"
                    },
                    {
                        "id": "p3_d2",
                        "character": "小阳 (Tiểu Dương)",
                        "speaker": "小阳",
                        "zh": "王……王总？完……完了呀……",
                        "vi": "Sếp... Sếp Vương? Xong... xong rồi mà anh...",
                        "box": (60, 560, 580, 655),
                        "tail_base_x": 360,
                        "tail_tip": (380, 480),
                        "tail_side": "top"
                    }
                ]
            },
            {
                "page_num": 4,
                "src_file": RAW_DIR / "dagongren_ep02_p4_1795312634213.jpg",
                "dialogues": [
                    {
                        "id": "p4_d1",
                        "character": "王经理 (Sếp Vương)",
                        "speaker": "王经理",
                        "zh": "正好，这个紧急需求你加个班，半小时就能搞定。",
                        "vi": "Vừa hay, yêu cầu gấp này em tăng ca một chút, nửa tiếng là xong ngay ấy mà.",
                        "box": (460, 40, 1260, 135),
                        "tail_base_x": 920,
                        "tail_tip": (920, 220),
                        "tail_side": "bottom"
                    }
                ]
            },
            {
                "page_num": 5,
                "src_file": RAW_DIR / "dagongren_ep02_p5_1795312654763.jpg",
                "dialogues": [
                    {
                        "id": "p5_d1",
                        "character": "王经理 (Sếp Vương)",
                        "speaker": "王经理",
                        "zh": "我先走了，你辛苦一下！",
                        "vi": "Anh về trước đây, vất vả cho em nhé!",
                        "box": (80, 45, 540, 140),
                        "tail_base_x": 320,
                        "tail_tip": (350, 270),
                        "tail_side": "bottom"
                    },
                    {
                        "id": "p5_d2",
                        "character": "小阳 (Tiểu Dương)",
                        "speaker": "小阳",
                        "zh": "半小时……每次他说半小时，都得通宵……",
                        "vi": "Nửa tiếng... Lần nào ổng bảo nửa tiếng, cũng phải thức trắng đêm...",
                        "box": (680, 45, 1320, 140),
                        "tail_base_x": 740,
                        "tail_tip": (580, 390),
                        "tail_side": "bottom"
                    }
                ]
            }
        ]
    },
    {
        "id": "office_ep03",
        "chapter_no": 3,
        "title": {
            "zh": "第三集：开个短会",
            "zh_trad": "第三集：開個短會",
            "vi": "Tập 3: Họp Nhanh 5 Phút",
            "pinyin": "dì sān jí ： kāi gè duǎn huì"
        },
        "description_vi": "11 giờ 55 phút trưa, đồ ăn vừa bấm đặt trên app thì Sếp Vương bất ngờ vỗ tay hào hứng: 'Mọi người dừng tay chút, mình họp nhanh năm phút thôi nhé!' Và thế là một cuộc họp 'năm phút' kéo dài xuyên trưa bắt đầu...",
        "difficulty": "HSK 1 - 4",
        "estimatedMinutes": 3,
        "panels": [
            {
                "page_num": 1,
                "src_file": RAW_DIR / "dagongren_ep03_p1_1795313382831.jpg",
                "dialogues": [
                    {
                        "id": "p1_d1",
                        "character": "小阳 (Tiểu Dương)",
                        "speaker": "小阳",
                        "zh": "小铃，今天中午吃什么？",
                        "vi": "Tiểu Linh, trưa nay ăn gì?",
                        "box": (100, 50, 580, 145),
                        "tail_base_x": 350,
                        "tail_tip": (350, 200),
                        "tail_side": "bottom"
                    },
                    {
                        "id": "p1_d2",
                        "character": "小铃 (Tiểu Linh)",
                        "speaker": "小铃",
                        "zh": "点麻辣烫吧，我已经饿了。",
                        "vi": "Gọi Ma La Tang đi, tôi đói lắm rồi.",
                        "box": (780, 50, 1300, 145),
                        "tail_base_x": 820,
                        "tail_tip": (780, 230),
                        "tail_side": "bottom"
                    }
                ]
            },
            {
                "page_num": 2,
                "src_file": RAW_DIR / "dagongren_ep03_p2_1795313404595.jpg",
                "dialogues": [
                    {
                        "id": "p2_d1",
                        "character": "王经理 (Sếp Vương)",
                        "speaker": "王经理",
                        "zh": "大家手头停一下，开个短会，就五分钟！",
                        "vi": "Mọi người dừng tay chút, họp nhanh một tí, đúng năm phút thôi!",
                        "box": (60, 45, 780, 140),
                        "tail_base_x": 200,
                        "tail_tip": (200, 200),
                        "tail_side": "bottom"
                    },
                    {
                        "id": "p2_d2",
                        "character": "小阳 (Tiểu Dương)",
                        "speaker": "小阳",
                        "zh": "五……五分钟？！",
                        "vi": "Năm... năm phút á?!",
                        "box": (340, 560, 680, 655),
                        "tail_side": "top",
                        "tail_base_x": 400,
                        "tail_tip": (400, 460)
                    }
                ]
            },
            {
                "page_num": 3,
                "src_file": RAW_DIR / "dagongren_ep03_p3_1795313426411.jpg",
                "dialogues": [
                    {
                        "id": "p3_d1",
                        "character": "王经理 (Sếp Vương)",
                        "speaker": "王经理",
                        "zh": "我们要打通底层逻辑，形成业务闭环……",
                        "vi": "Chúng ta phải đả thông logic tầng dưới, tạo thành vòng lặp nghiệp vụ khép kín...",
                        "box": (280, 15, 1080, 110),
                        "tail_base_x": 380,
                        "tail_tip": (380, 210),
                        "tail_side": "bottom"
                    }
                ]
            },
            {
                "page_num": 4,
                "src_file": RAW_DIR / "dagongren_ep03_p4_1795313449602.jpg",
                "dialogues": [
                    {
                        "id": "p4_d1",
                        "character": "小阳 (Tiểu Dương)",
                        "speaker": "小阳",
                        "zh": "我快饿晕了……",
                        "vi": "Tôi sắp ngất vì đói rồi...",
                        "box": (80, 50, 440, 145),
                        "tail_base_x": 240,
                        "tail_tip": (240, 200),
                        "tail_side": "bottom"
                    },
                    {
                        "id": "p4_d2",
                        "character": "小铃 (Tiểu Linh)",
                        "speaker": "小铃",
                        "zh": "外卖到了四十分钟，已经凉透了。",
                        "vi": "Đồ ăn tới được 40 phút rồi, nguội ngắt luôn rồi.",
                        "box": (600, 50, 1220, 145),
                        "tail_base_x": 720,
                        "tail_tip": (720, 230),
                        "tail_side": "bottom"
                    }
                ]
            },
            {
                "page_num": 5,
                "src_file": RAW_DIR / "dagongren_ep03_p5_1795313495595.jpg",
                "dialogues": [
                    {
                        "id": "p5_d1",
                        "character": "王经理 (Sếp Vương)",
                        "speaker": "王经理",
                        "zh": "好了，没有问题的话，下午两点我们继续！",
                        "vi": "Được rồi, nếu không có câu hỏi gì thì hai giờ chiều chúng ta tiếp tục nhé!",
                        "box": (600, 40, 1340, 135),
                        "tail_base_x": 750,
                        "tail_tip": (750, 230),
                        "tail_side": "bottom"
                    },
                    {
                        "id": "p5_d2",
                        "character": "小阳 (Tiểu Dương)",
                        "speaker": "小阳",
                        "zh": "两点？……那还有十五分钟！",
                        "vi": "Hai giờ? ... Thế là chỉ còn mười lăm phút nữa!",
                        "box": (220, 640, 740, 735),
                        "tail_base_x": 420,
                        "tail_tip": (420, 580),
                        "tail_side": "top"
                    }
                ]
            }
        ]
    },
    {
        "id": "office_ep04",
        "chapter_no": 4,
        "title": {
            "zh": "第四集：谁的锅？",
            "zh_trad": "第四集：誰的鍋？",
            "vi": "Tập 4: Chiếc Nồi Thuộc Về Ai?",
            "pinyin": "dì sì jí ： shuí de guō ？"
        },
        "description_vi": "3 giờ rưỡi chiều, hệ thống công ty bỗng sập toàn diện. Sếp Vương tức tốc lao ra gầm thét đòi tìm 'chiếc nồi' thuộc về ai. Nào ngờ Lão Châu chỉ mở git log ra kiểm tra đúng 3 giây...",
        "difficulty": "HSK 1 - 4",
        "estimatedMinutes": 3,
        "panels": [
            {
                "page_num": 1,
                "src_file": RAW_DIR / "dagongren_ep04_p1_1795313995803.jpg",
                "dialogues": [
                    {
                        "id": "p1_d1",
                        "character": "小阳 (Tiểu Dương)",
                        "speaker": "小阳",
                        "zh": "完蛋了！线上系统崩了！",
                        "vi": "Toang rồi! Hệ thống production sập rồi!",
                        "box": (200, 40, 720, 135),
                        "tail_base_x": 380,
                        "tail_tip": (380, 200),
                        "tail_side": "bottom"
                    },
                    {
                        "id": "p1_d2",
                        "character": "小铃 (Tiểu Linh)",
                        "speaker": "小铃",
                        "zh": "你刚才碰了什么？",
                        "vi": "Cậu vừa đụng vào cái gì đấy?",
                        "box": (780, 40, 1260, 135),
                        "tail_base_x": 820,
                        "tail_tip": (760, 180),
                        "tail_side": "bottom"
                    }
                ]
            },
            {
                "page_num": 2,
                "src_file": RAW_DIR / "dagongren_ep04_p2_1795314031762.jpg",
                "dialogues": [
                    {
                        "id": "p2_d1",
                        "character": "王经理 (Sếp Vương)",
                        "speaker": "王经理",
                        "zh": "谁干的？！到底是谁的锅？！",
                        "vi": "Ai làm?! Rốt cuộc nồi này của ai?!",
                        "box": (340, 40, 1020, 135),
                        "tail_base_x": 470,
                        "tail_tip": (470, 170),
                        "tail_side": "bottom"
                    },
                    {
                        "id": "p2_d2",
                        "character": "小阳 (Tiểu Dương)",
                        "speaker": "小阳",
                        "zh": "我……我就删了一行没用的空格……",
                        "vi": "Em... em chỉ xoá đúng một dòng dấu cách vô dụng thôi mà...",
                        "box": (760, 560, 1340, 655),
                        "tail_side": "top",
                        "tail_base_x": 860,
                        "tail_tip": (860, 490)
                    }
                ]
            },
            {
                "page_num": 3,
                "src_file": RAW_DIR / "dagongren_ep04_p3_1795314059357.jpg",
                "dialogues": [
                    {
                        "id": "p3_d1",
                        "character": "王经理 (Sếp Vương)",
                        "speaker": "王经理",
                        "zh": "老周！你是主架构师，快找是谁提交的！",
                        "vi": "Lão Châu! Cậu là kiến trúc sư trưởng, mau tìm xem ai commit code!",
                        "box": (580, 40, 1320, 135),
                        "tail_base_x": 720,
                        "tail_tip": (700, 200),
                        "tail_side": "bottom"
                    }
                ]
            },
            {
                "page_num": 4,
                "src_file": RAW_DIR / "dagongren_ep04_p4_1795314085548.jpg",
                "dialogues": [
                    {
                        "id": "p4_d1",
                        "character": "老周 (Lão Châu)",
                        "speaker": "老周",
                        "zh": "查了。是王总您昨天半夜两点直接合并的代码。",
                        "vi": "Tra rồi. Là Sếp Vương đích thân merge code lúc hai giờ sáng đêm qua đấy.",
                        "box": (100, 40, 940, 135),
                        "tail_base_x": 480,
                        "tail_tip": (480, 200),
                        "tail_side": "bottom"
                    }
                ]
            },
            {
                "page_num": 5,
                "src_file": RAW_DIR / "dagongren_ep04_p5_1795314186496.jpg",
                "dialogues": [
                    {
                        "id": "p5_d1",
                        "character": "王经理 (Sếp Vương)",
                        "speaker": "王经理",
                        "zh": "咳……遇到问题不要急着追责，大家要协同复盘。",
                        "vi": "Khụ... Gặp vấn đề không nên vội quy trách nhiệm, cả team cùng nhau họp rút kinh nghiệm là được.",
                        "box": (180, 40, 1080, 135),
                        "tail_base_x": 500,
                        "tail_tip": (500, 180),
                        "tail_side": "bottom"
                    },
                    {
                        "id": "p5_d2",
                        "character": "老周 (Lão Châu)",
                        "speaker": "老周",
                        "zh": "我就知道。",
                        "vi": "Tôi biết ngay mà.",
                        "box": (880, 520, 1180, 615),
                        "tail_side": "top",
                        "tail_base_x": 900,
                        "tail_tip": (840, 480)
                    }
                ]
            }
        ]
    }
]

def draw_bubble(draw, box, text, speaker=None, tail_tip=None, tail_side="bottom", tail_base_x=None):
    x0, y0, x1, y1 = box
    r = 16
    
    if tail_tip:
        bx = tail_base_x if tail_base_x is not None else (x0 + x1) // 2
        if tail_side == "bottom":
            tail = [(bx - 18, y1 - 3), (bx + 18, y1 - 3), tail_tip]
        elif tail_side == "top":
            tail = [(bx - 18, y0 + 3), (bx + 18, y0 + 3), tail_tip]
        draw.polygon(tail, fill=(255, 255, 255), outline=(30, 30, 30))
    
    draw.rounded_rectangle([x0, y0, x1, y1], radius=r, fill=(255, 255, 255), outline=(30, 30, 30), width=3)
    
    if tail_tip:
        draw.polygon(tail, fill=(255, 255, 255))
        draw.line([tail[0], tail[2]], fill=(30, 30, 30), width=3)
        draw.line([tail[1], tail[2]], fill=(30, 30, 30), width=3)

    curr_y = y0 + 10
    if speaker:
        draw.text((x0 + 18, curr_y), speaker, fill=(168, 50, 45), font=FONT_SPEAKER)
        curr_y += 24

    draw.text((x0 + 18, curr_y), text, fill=(20, 20, 20), font=FONT_MAIN)

def build_dialogue_hotspots(d, page_num):
    zh = d["zh"]
    zh_trad = to_traditional(zh)
    words = segment(zh)
    tokens = []
    hotspots = []
    
    x0, y0, x1, y1 = d["box"]
    d_bbox = {
        "x": round((x0 / IMG_W) * 100, 2),
        "y": round((y0 / IMG_H) * 100, 2),
        "width": round(((x1 - x0) / IMG_W) * 100, 2),
        "height": round(((y1 - y0) / IMG_H) * 100, 2)
    }
    
    text_x0 = x0 + 18
    text_y0 = y0 + 34
    char_w = 26.0
    char_h = 32.0
    
    cur_px = text_x0
    w_idx = 1
    
    for w in words:
        if PUNCT_RE.match(w):
            continue
            
        py, hv, mean, hsk, _ = lookup(w)
        trad_w = to_traditional(w)
        tokens.append({
            "text": w,
            "text_trad": trad_w,
            "pinyin": py,
            "hanviet": hv,
            "meaning_vi": mean,
            "hsk": hsk
        })
        
        w_px_width = len(w) * char_w
        w_box = {
            "x": round((cur_px / IMG_W) * 100, 3),
            "y": round((text_y0 / IMG_H) * 100, 3),
            "width": round((w_px_width / IMG_W) * 100, 3),
            "height": round((char_h / IMG_H) * 100, 3)
        }
        cur_px += w_px_width
        
        hotspots.append({
            "id": f"{d['id']}_w{w_idx}",
            "text": w,
            "text_trad": trad_w,
            "pinyin": py,
            "hanviet": hv,
            "meaning_vi": mean,
            "hsk": hsk,
            "bbox": w_box,
            "rects": [w_box],
            "sentence_zh": zh_trad,
            "sentence_zh_simplified": zh,
            "sentence_vi": d["vi"],
            "character": d["character"],
            "dialogue_id": d["id"]
        })
        w_idx += 1
        
    return {
        "id": d["id"],
        "character": d["character"],
        "bbox": d_bbox,
        "zh": zh,
        "zh_trad": zh_trad,
        "pinyin": sentence_pinyin(zh),
        "vi": d["vi"],
        "tokens": tokens
    }, hotspots

def process_episode(ep_spec):
    ep_id = ep_spec["id"]
    target_img_dir = OFFICE_IMG_BASE / ep_id
    target_img_dir.mkdir(parents=True, exist_ok=True)
    
    story_pages = []
    
    for p_spec in ep_spec["panels"]:
        p_num = p_spec["page_num"]
        src_path = p_spec["src_file"]
        dest_webp = target_img_dir / f"page_{p_num:02d}.webp"
        
        with Image.open(src_path) as img:
            img = img.convert("RGB")
            draw = ImageDraw.Draw(img)
            
            page_dialogues = []
            page_hotspots = []
            
            for d in p_spec["dialogues"]:
                draw_bubble(
                    draw,
                    d["box"],
                    d["zh"],
                    speaker=d.get("speaker"),
                    tail_tip=d.get("tail_tip"),
                    tail_side=d.get("tail_side", "bottom"),
                    tail_base_x=d.get("tail_base_x")
                )
                
                dlg_obj, hs_list = build_dialogue_hotspots(d, p_num)
                page_dialogues.append(dlg_obj)
                page_hotspots.extend(hs_list)
                
            img.save(dest_webp, "WEBP", quality=90, method=6)
            print(f"[✓] {ep_id} page {p_num} -> {dest_webp}")
            
            if p_num == 1:
                cover_webp = target_img_dir / "cover.webp"
                img.save(cover_webp, "WEBP", quality=90, method=6)
                print(f"[✓] {ep_id} cover -> {cover_webp}")
                
            story_pages.append({
                "page_num": p_num,
                "image": f"assets/images/readings/manga/office/{ep_id}/page_{p_num:02d}.webp",
                "dialogues": page_dialogues,
                "word_hotspots": page_hotspots,
                "ocr": {"image_px": [IMG_W, IMG_H]}
            })

    story_obj = {
        "id": ep_id,
        "series": "office",
        "series_title": "打工人日记",
        "series_title_vi": "Nhật Ký Dân Công Sở",
        "collection": "office",
        "volume": 1,
        "chapter_in_volume": None,
        "chapter_no": ep_spec["chapter_no"],
        "title": ep_spec["title"],
        "description_vi": ep_spec["description_vi"],
        "cover_image": f"assets/images/readings/manga/office/{ep_id}/cover.webp",
        "source": "《打工人日记》原创职场情景喜剧 · Synapse Hanzi Studio",
        "source_url": "https://github.com/Synapse-Hanzi",
        "source_credits": "Kịch bản và tạo hình nhân vật độc quyền: Synapse Hanzi Studio. Tranh minh họa kết hợp hệ thống tra từ tương tác, pinyin, Hán-Việt và âm thanh đa giác quan.",
        "license": "Original / Educational",
        "page_count": len(story_pages),
        "difficulty": ep_spec["difficulty"],
        "estimatedMinutes": ep_spec["estimatedMinutes"],
        "file": f"database/readings/manga/office/{ep_id}.json",
        "proper_names": ["小阳", "小铃", "王经理", "王总", "老周"],
        "pages": story_pages
    }

    story_out = DATA_DIR / f"{ep_id}.json"
    story_out.write_text(json.dumps(story_obj, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"[✓] Saved {story_out}")
    return story_obj

def main():
    manifest_items = []
    for ep in EPISODES:
        story = process_episode(ep)
        manifest_items.append({
            "id": story["id"],
            "series": story["series"],
            "series_title": story["series_title"],
            "series_title_vi": story["series_title_vi"],
            "collection": story["collection"],
            "volume": story["volume"],
            "chapter_in_volume": story["chapter_in_volume"],
            "chapter_no": story["chapter_no"],
            "title": story["title"],
            "description_vi": story["description_vi"],
            "cover_image": story["cover_image"],
            "source": story["source"],
            "source_url": story["source_url"],
            "source_credits": story["source_credits"],
            "license": story["license"],
            "page_count": story["page_count"],
            "difficulty": story["difficulty"],
            "estimatedMinutes": story["estimatedMinutes"],
            "file": story["file"],
            "proper_names": story["proper_names"]
        })
    
    MANIFEST_FILE.write_text(json.dumps(manifest_items, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"[✓] Saved {MANIFEST_FILE} with {len(manifest_items)} episodes.")

if __name__ == "__main__":
    main()
