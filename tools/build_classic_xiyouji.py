#!/usr/bin/env python3
"""
tools/build_classic_xiyouji.py
Builds Journey to the West (西游记) Episode 1: 《猴王出世》 (Birth of the Monkey King)
data file with tokens, pinyin, Han-Viet, and word hotspots.
"""

import json
from pathlib import Path
import sys

REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT / "tools"))

from manga_lexicon import segment, lookup, to_traditional, sentence_pinyin

DATA_DIR = REPO_ROOT / "database" / "readings" / "manga" / "classic"
DATA_DIR.mkdir(parents=True, exist_ok=True)
MANIFEST_FILE = DATA_DIR / "manifest.json"

STORY_ID = "xiyouji_01"

PAGES_DATA = [
    {
        "page_num": 1,
        "image": f"assets/images/readings/manga/classic/{STORY_ID}/page_01.webp",
        "dialogues": [
            {
                "id": "p1_d1",
                "character": "旁白 (Người kể)",
                "bbox": {"x": 8.0, "y": 8.0, "width": 84.0, "height": 14.0},
                "zh": "海外有一座傲来国，国近大海，海中有一座名山，叫做花果山。",
                "vi": "Ngoài biển có một nước tên là Ngạo Lai, gần biển lớn, giữa biển có ngọn núi nổi danh gọi là Hoa Quả Sơn."
            },
            {
                "id": "p1_d2",
                "character": "旁白 (Người kể)",
                "bbox": {"x": 8.0, "y": 76.0, "width": 84.0, "height": 15.0},
                "zh": "那山顶上有一块仙石，自开辟以来，常受日精月华。",
                "vi": "Trên đỉnh núi ấy có một tảng đá tiên, từ thuở khai thiên lập địa đến nay, ngày ngày hấp thu tinh hoa nhật nguyệt."
            }
        ]
    },
    {
        "page_num": 2,
        "image": f"assets/images/readings/manga/classic/{STORY_ID}/page_02.webp",
        "dialogues": [
            {
                "id": "p2_d1",
                "character": "旁白 (Người kể)",
                "bbox": {"x": 8.0, "y": 8.0, "width": 84.0, "height": 13.0},
                "zh": "忽一日，仙石崩裂，产一石卵，化作一个石猴。",
                "vi": "Chợt một ngày, tảng đá tiên nứt toác, sinh ra một quả trứng đá, nở ra một con khỉ đá."
            },
            {
                "id": "p2_d2",
                "character": "石猴 (Thạch Hầu)",
                "bbox": {"x": 12.0, "y": 38.0, "width": 76.0, "height": 14.0},
                "zh": "哈哈！天地生我，这世间真奇妙！",
                "vi": "Ha ha! Trời đất sinh ra ta, thế gian này thật là kỳ diệu!"
            },
            {
                "id": "p2_d3",
                "character": "旁白 (Người kể)",
                "bbox": {"x": 8.0, "y": 78.0, "width": 84.0, "height": 14.0},
                "zh": "那石猴双眼射出两道金光，直冲云霄。",
                "vi": "Con khỉ đá ấy đôi mắt phóng ra hai luồng ánh sáng vàng, thẳng vút lên tận tầng mây."
            }
        ]
    },
    {
        "page_num": 3,
        "image": f"assets/images/readings/manga/classic/{STORY_ID}/page_03.webp",
        "dialogues": [
            {
                "id": "p3_d1",
                "character": "小猴 (Khỉ con)",
                "bbox": {"x": 10.0, "y": 8.0, "width": 80.0, "height": 13.0},
                "zh": "快看！那边新来了一只活泼的小石猴！",
                "vi": "Mau nhìn kìa! Đằng kia mới đến một chú khỉ đá nhỏ thật hoạt bát!"
            },
            {
                "id": "p3_d2",
                "character": "石猴 (Thạch Hầu)",
                "bbox": {"x": 10.0, "y": 42.0, "width": 80.0, "height": 14.0},
                "zh": "各位朋友，大家一起采花果、饮泉水吧！",
                "vi": "Các bạn ơi, chúng ta hãy cùng nhau hái hoa quả, uống nước suối nào!"
            },
            {
                "id": "p3_d3",
                "character": "旁白 (Người kể)",
                "bbox": {"x": 8.0, "y": 78.0, "width": 84.0, "height": 14.0},
                "zh": "石猴在山中行步飞奔，与猴群同游共乐，亲如一家。",
                "vi": "Khỉ đá dạo bước bay nhảy trong núi, cùng bầy khỉ nô đùa vui vẻ, thân thiết như một gia đình."
            }
        ]
    },
    {
        "page_num": 4,
        "image": f"assets/images/readings/manga/classic/{STORY_ID}/page_04.webp",
        "dialogues": [
            {
                "id": "p4_d1",
                "character": "老猴 (Khỉ già)",
                "bbox": {"x": 8.0, "y": 8.0, "width": 84.0, "height": 14.0},
                "zh": "好大的一股瀑布流水！不知这水从何处流来？",
                "vi": "Một dòng thác nước chảy xiết thật hùng vĩ! Chẳng biết dòng nước này từ đâu chảy tới nhỉ?"
            },
            {
                "id": "p4_d2",
                "character": "众猴 (Bầy khỉ)",
                "bbox": {"x": 8.0, "y": 42.0, "width": 84.0, "height": 14.0},
                "zh": "哪一个有本领钻进去寻到源头，我们便拜他为王！",
                "vi": "Ai có bản lĩnh nhảy vào trong tìm được đầu nguồn, chúng ta sẽ tôn người đó làm vua!"
            },
            {
                "id": "p4_d3",
                "character": "石猴 (Thạch Hầu)",
                "bbox": {"x": 15.0, "y": 78.0, "width": 70.0, "height": 14.0},
                "zh": "我进去！让我进去看看！",
                "vi": "Ta vào! Để ta nhảy vào xem thử!"
            }
        ]
    },
    {
        "page_num": 5,
        "image": f"assets/images/readings/manga/classic/{STORY_ID}/page_05.webp",
        "dialogues": [
            {
                "id": "p5_d1",
                "character": "旁白 (Người kể)",
                "bbox": {"x": 8.0, "y": 8.0, "width": 84.0, "height": 14.0},
                "zh": "石猴闭上眼睛，纵身一跳，径直跳入瀑布泉中。",
                "vi": "Khỉ đá nhắm nghiền mắt lại, tung mình một cú nhảy, phi thẳng vào giữa dòng thác nước."
            },
            {
                "id": "p5_d2",
                "character": "石猴 (Thạch Hầu)",
                "bbox": {"x": 6.0, "y": 42.0, "width": 88.0, "height": 15.0},
                "zh": "里面竟有一座铁板桥！桥边石碑刻着‘花果山福地，水帘洞洞天’！",
                "vi": "Bên trong vậy mà có một cây cầu sắt! Bên cầu tấm bia đá khắc chữ: 'Hoa Quả Sơn phúc địa, Thủy Liêm Động động thiên'!"
            },
            {
                "id": "p5_d3",
                "character": "石猴 (Thạch Hầu)",
                "bbox": {"x": 8.0, "y": 78.0, "width": 84.0, "height": 14.0},
                "zh": "真是天造地设的安身之处！大家快快随我进来！",
                "vi": "Đúng là nơi che mưa tránh gió do trời đất tạo tác! Mọi người mau mau theo ta vào đây!"
            }
        ]
    },
    {
        "page_num": 6,
        "image": f"assets/images/readings/manga/classic/{STORY_ID}/page_06.webp",
        "dialogues": [
            {
                "id": "p6_d1",
                "character": "众猴 (Bầy khỉ)",
                "bbox": {"x": 15.0, "y": 8.0, "width": 70.0, "height": 13.0},
                "zh": "大王！请受我们一拜！",
                "vi": "Đại vương! Xin nhận của chúng thần một lạy!"
            },
            {
                "id": "p6_d2",
                "character": "老猴 (Khỉ già)",
                "bbox": {"x": 8.0, "y": 40.0, "width": 84.0, "height": 14.0},
                "zh": "大王神勇过人，从今以后，您就是我们的‘美猴王’！",
                "vi": "Đại vương thần dũng hơn người, từ nay về sau, ngài chính là 'Mỹ Hầu Vương' của chúng ta!"
            },
            {
                "id": "p6_d3",
                "character": "美猴王 (Mỹ Hầu Vương)",
                "bbox": {"x": 6.0, "y": 78.0, "width": 88.0, "height": 15.0},
                "zh": "好！今日我们在水帘洞中尽情欢宴，长享逍遥自在！",
                "vi": "Tốt lắm! Hôm nay chúng ta cùng nhau mở tiệc vui say trong Thủy Liêm Động, đời đời tự do tự tại!"
            }
        ]
    }
]

def build_tokens_and_hotspots(dialogue, page_num):
    zh = dialogue["zh"]
    zh_trad = to_traditional(zh)
    words = segment(zh)
    tokens = []
    hotspots = []
    
    # Calculate word box horizontal positions inside the dialogue bounding box
    d_box = dialogue["bbox"]
    total_len = max(1, len(zh))
    char_w = d_box["width"] / total_len
    cur_x = d_box["x"]
    
    w_idx = 0
    for w in words:
        if not any('\u4e00' <= c <= '\u9fff' for c in w):
            # Punctuation / symbol
            tokens.append({"text": w, "text_trad": to_traditional(w), "punct": True})
            cur_x += len(w) * char_w
            continue
            
        py, hv, mean, hsk, _ = lookup(w)
        trad_w = to_traditional(w)
        token_obj = {
            "text": w,
            "text_trad": trad_w,
            "pinyin": py,
            "hanviet": hv,
            "meaning_vi": mean,
            "hsk": hsk
        }
        tokens.append(token_obj)
        
        w_box = {
            "x": round(cur_x, 3),
            "y": round(d_box["y"], 3),
            "width": round(len(w) * char_w, 3),
            "height": round(d_box["height"], 3)
        }
        cur_x += len(w) * char_w
        
        hotspot_obj = {
            "id": f"{dialogue['id']}_w{w_idx}",
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
            "sentence_vi": dialogue["vi"],
            "character": dialogue["character"],
            "dialogue_id": dialogue["id"]
        }
        hotspots.append(hotspot_obj)
        w_idx += 1
        
    dialogue["zh_trad"] = zh_trad
    dialogue["pinyin"] = sentence_pinyin(zh)
    dialogue["tokens"] = tokens
    return hotspots

def main():
    story_pages = []
    for p in PAGES_DATA:
        p_num = p["page_num"]
        page_hotspots = []
        for d in p["dialogues"]:
            hs = build_tokens_and_hotspots(d, p_num)
            page_hotspots.extend(hs)
            
        story_pages.append({
            "page_num": p_num,
            "image": p["image"],
            "dialogues": p["dialogues"],
            "word_hotspots": page_hotspots,
            "ocr": {"image_px": [848, 1264]}
        })

    story_obj = {
        "id": STORY_ID,
        "series": "xiyouji",
        "series_title": "西游记",
        "series_title_vi": "Tây Du Ký",
        "collection": "classic",
        "volume": 1,
        "chapter_in_volume": None,
        "chapter_no": 1,
        "title": {
            "zh": "第一回：猴王出世",
            "zh_trad": "第一回：猴王出世",
            "vi": "Hồi 1: Mỹ Hầu Vương Xuất Thế",
            "pinyin": "dì yī huí ： hóu wáng chū shì"
        },
        "description_vi": "Trời đất tạo hóa, tảng đá tiên trên đỉnh núi Hoa Quả hấp thu linh khí nhật nguyệt bỗng nứt toác sinh ra một con khỉ đá. Thạch Hầu dũng cảm nhảy qua thác nước tìm thấy Thủy Liêm Động, được vạn khỉ tôn xưng làm Mỹ Hầu Vương!",
        "cover_image": f"assets/images/readings/manga/classic/{STORY_ID}/page_01.webp",
        "source": "《西游记》原著：吴承恩 · 经典国风水墨连环画改编 · 公有领域 (Public Domain)",
        "source_url": "https://zh.wikipedia.org/wiki/西游记",
        "source_credits": "Nguyên tác văn học: Ngô Thừa Ân (Minh đại - Public Domain). Bộ tranh chuyển thể liên hoàn họa cổ phong và hệ thống tra từ tương tác được phát triển cho mục đích giáo dục phi lợi nhuận của Synapse Hanzi.",
        "license": "Public Domain / Educational",
        "page_count": len(story_pages),
        "difficulty": "HSK 3 - 4",
        "estimatedMinutes": 6,
        "file": f"database/readings/manga/classic/{STORY_ID}.json",
        "proper_names": ["花果山", "水帘洞", "美猴王", "石猴", "傲来国"],
        "pages": story_pages
    }

    # Save story JSON
    story_out = DATA_DIR / f"{STORY_ID}.json"
    story_out.write_text(json.dumps(story_obj, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"[✓] Saved {story_out} ({len(story_pages)} pages)")

    # Update manifest.json
    manifest_items = [
        {
            "id": story_obj["id"],
            "series": story_obj["series"],
            "series_title": story_obj["series_title"],
            "series_title_vi": story_obj["series_title_vi"],
            "collection": story_obj["collection"],
            "volume": story_obj["volume"],
            "chapter_in_volume": story_obj["chapter_in_volume"],
            "chapter_no": story_obj["chapter_no"],
            "title": story_obj["title"],
            "description_vi": story_obj["description_vi"],
            "cover_image": story_obj["cover_image"],
            "source": story_obj["source"],
            "source_url": story_obj["source_url"],
            "source_credits": story_obj["source_credits"],
            "license": story_obj["license"],
            "page_count": story_obj["page_count"],
            "difficulty": story_obj["difficulty"],
            "estimatedMinutes": story_obj["estimatedMinutes"],
            "file": story_obj["file"],
            "proper_names": story_obj["proper_names"]
        }
    ]
    MANIFEST_FILE.write_text(json.dumps(manifest_items, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"[✓] Saved {MANIFEST_FILE}")

if __name__ == "__main__":
    main()
